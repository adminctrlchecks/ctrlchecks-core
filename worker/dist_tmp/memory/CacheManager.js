"use strict";
/**
 * Cache Manager - LRU Cache for active workflows
 * Tier 1: In-memory cache for fast access
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const lru_cache_1 = require("lru-cache");
/**
 * Cache Manager for workflow memory
 * Implements LRU (Least Recently Used) eviction policy
 */
class CacheManager {
    constructor(config) {
        // Workflow cache - stores full workflow memory
        this.cache = new lru_cache_1.LRUCache({
            max: config.maxSize || 100,
            ttl: config.ttl || 5 * 60 * 1000, // 5 minutes default
            updateAgeOnGet: true, // Refresh TTL on access
        });
        // Execution results cache - shorter TTL
        this.executionCache = new lru_cache_1.LRUCache({
            max: 50,
            ttl: 5 * 60 * 1000, // 5 minutes
        });
        // Analysis results cache
        this.analysisCache = new lru_cache_1.LRUCache({
            max: 100,
            ttl: 10 * 60 * 1000, // 10 minutes
        });
    }
    /**
     * Get workflow from cache
     */
    get(workflowId) {
        return this.cache.get(workflowId);
    }
    /**
     * Store workflow in cache
     */
    set(workflowId, workflow) {
        this.cache.set(workflowId, workflow);
    }
    /**
     * Check if workflow exists in cache
     */
    has(workflowId) {
        return this.cache.has(workflowId);
    }
    /**
     * Remove workflow from cache
     */
    delete(workflowId) {
        return this.cache.delete(workflowId);
    }
    /**
     * Clear all cache entries
     */
    clear() {
        this.cache.clear();
        this.executionCache.clear();
        this.analysisCache.clear();
    }
    /**
     * Get execution result from cache
     */
    getExecution(executionId) {
        return this.executionCache.get(executionId);
    }
    /**
     * Store execution result in cache
     */
    setExecution(executionId, result) {
        this.executionCache.set(executionId, result);
    }
    /**
     * Get analysis result from cache
     */
    getAnalysis(workflowId) {
        return this.analysisCache.get(workflowId);
    }
    /**
     * Store analysis result in cache
     */
    setAnalysis(workflowId, analysis) {
        this.analysisCache.set(workflowId, analysis);
    }
    /**
     * Get cache statistics
     */
    getStats() {
        // Get a sample key to check TTL (if cache has entries)
        const sampleKey = this.cache.keys().next().value;
        return {
            workflowCache: {
                size: this.cache.size,
                maxSize: this.cache.max,
                remainingTTL: sampleKey ? this.cache.getRemainingTTL(sampleKey) : undefined,
            },
            executionCache: {
                size: this.executionCache.size,
                maxSize: this.executionCache.max,
            },
            analysisCache: {
                size: this.analysisCache.size,
                maxSize: this.analysisCache.max,
            },
        };
    }
    /**
     * Invalidate cache for a workflow (e.g., on update)
     */
    invalidateWorkflow(workflowId) {
        this.delete(workflowId);
        this.analysisCache.delete(workflowId);
    }
}
exports.CacheManager = CacheManager;
