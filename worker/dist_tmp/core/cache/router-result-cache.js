"use strict";
/**
 * Router Result Cache (L1 In-Memory)
 *
 * Caches IntentDrivenJsonRouter results to avoid recomputing
 * semantic matching and extraction for the same (source, target, schema, intent).
 *
 * Design:
 * - Simple LRU cache backed by Map
 * - Bounded size (default: 1000 entries)
 * - TTL-based expiration (default: 5 minutes)
 *
 * NOTE: This is a best-effort optimization layer.
 * - If cache lookups fail or entries expire, routing still works correctly.
 * - Cache is per-process and NOT shared across instances.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouterResultCache = void 0;
class RouterResultCache {
    constructor(maxSize = 1000, ttl = 5 * 60 * 1000) {
        // Observability counters
        this.hits = 0;
        this.misses = 0;
        this.evictions = 0;
        this.ttlExpired = 0;
        // Latency tracking
        this.hitLatencies = [];
        this.missLatencies = [];
        this.maxLatencySamples = 100; // Keep last 100 samples
        // Periodic logging
        this.lastLogTime = Date.now();
        this.logInterval = 5 * 60 * 1000; // Log every 5 minutes
        this.operationCount = 0;
        this.logEveryN = 100; // Log every 100 operations
        if (maxSize < 1) {
            throw new Error('RouterResultCache size must be at least 1');
        }
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
    }
    get(key, startTime) {
        const cacheKey = this.serializeKey(key);
        const entry = this.cache.get(cacheKey);
        if (!entry) {
            this.misses++;
            this.operationCount++;
            this.maybeLogStats();
            return null;
        }
        // TTL expiration
        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(cacheKey);
            this.ttlExpired++;
            this.misses++;
            this.operationCount++;
            this.maybeLogStats();
            return null;
        }
        // Cache hit
        this.hits++;
        this.operationCount++;
        // Track latency if provided
        if (startTime !== undefined) {
            const latency = Date.now() - startTime;
            this.hitLatencies.push(latency);
            if (this.hitLatencies.length > this.maxLatencySamples) {
                this.hitLatencies.shift();
            }
        }
        // Touch entry (move to end to approximate LRU)
        this.cache.delete(cacheKey);
        this.cache.set(cacheKey, entry);
        this.maybeLogStats();
        return entry;
    }
    set(key, value, startTime) {
        const cacheKey = this.serializeKey(key);
        // Evict LRU if at capacity and new key
        if (this.cache.size >= this.maxSize && !this.cache.has(cacheKey)) {
            const lruKey = this.cache.keys().next().value;
            if (lruKey) {
                this.cache.delete(lruKey);
                this.evictions++;
                if (process.env.ENABLE_MEMORY_LOGGING === 'true') {
                    console.log(`[RouterCache] 🗑️  Evicted LRU entry: ${lruKey} (size=${this.maxSize})`);
                }
            }
        }
        this.cache.set(cacheKey, {
            ...value,
            timestamp: Date.now(),
        });
        // Track latency for cache miss (set operation means it was a miss)
        if (startTime !== undefined) {
            const latency = Date.now() - startTime;
            this.missLatencies.push(latency);
            if (this.missLatencies.length > this.maxLatencySamples) {
                this.missLatencies.shift();
            }
        }
    }
    /**
     * Get cache statistics for observability
     */
    getStats() {
        const total = this.hits + this.misses;
        const hitRate = total > 0 ? this.hits / total : 0;
        const avgLatencyHit = this.hitLatencies.length > 0
            ? this.hitLatencies.reduce((a, b) => a + b, 0) / this.hitLatencies.length
            : 0;
        const avgLatencyMiss = this.missLatencies.length > 0
            ? this.missLatencies.reduce((a, b) => a + b, 0) / this.missLatencies.length
            : 0;
        return {
            hits: this.hits,
            misses: this.misses,
            evictions: this.evictions,
            ttlExpired: this.ttlExpired,
            currentSize: this.cache.size,
            maxSize: this.maxSize,
            hitRate,
            avgLatencyHit,
            avgLatencyMiss,
        };
    }
    /**
     * Reset statistics (useful for testing or periodic resets)
     */
    resetStats() {
        this.hits = 0;
        this.misses = 0;
        this.evictions = 0;
        this.ttlExpired = 0;
        this.hitLatencies = [];
        this.missLatencies = [];
        this.operationCount = 0;
        this.lastLogTime = Date.now();
    }
    /**
     * Periodic logging of cache statistics
     */
    maybeLogStats() {
        const now = Date.now();
        const timeSinceLastLog = now - this.lastLogTime;
        const shouldLogByTime = timeSinceLastLog >= this.logInterval;
        const shouldLogByCount = this.operationCount >= this.logEveryN;
        if (shouldLogByTime || shouldLogByCount) {
            const stats = this.getStats();
            console.log(`[RouterCache] 📊 Stats: hits=${stats.hits}, misses=${stats.misses}, hitRate=${(stats.hitRate * 100).toFixed(1)}%, size=${stats.currentSize}/${stats.maxSize}, evictions=${stats.evictions}, ttlExpired=${stats.ttlExpired}`);
            if (this.hitLatencies.length > 0 || this.missLatencies.length > 0) {
                console.log(`[RouterCache] ⏱️  Latency: hit=${stats.avgLatencyHit.toFixed(2)}ms, miss=${stats.avgLatencyMiss.toFixed(2)}ms`);
            }
            this.lastLogTime = now;
            this.operationCount = 0;
        }
    }
    /**
     * Clear all cache entries (useful for testing or memory management)
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        if (process.env.ENABLE_MEMORY_LOGGING === 'true') {
            console.log(`[RouterCache] 🗑️  Cleared cache (freed ${size} entries)`);
        }
    }
    serializeKey(key) {
        return `${key.sourceNodeId}:${key.targetNodeId}:${key.sourceSchemaHash}:${key.intentHash}`;
    }
}
exports.RouterResultCache = RouterResultCache;
