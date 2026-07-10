"use strict";
/**
 * Resolution Learning Cache
 *
 * Caches successful node type resolutions and learns from usage.
 * Improves confidence over time based on user acceptance.
 *
 * This enables the system to self-improve and handle variations
 * more accurately as it learns from successful resolutions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolutionLearningCache = exports.ResolutionLearningCache = void 0;
class ResolutionLearningCache {
    constructor() {
        this.cache = new Map();
        this.maxCacheSize = 10000; // Maximum cache entries
    }
    /**
     * Get cached resolution
     *
     * @param input - User input
     * @returns Cached entry or null
     */
    get(input) {
        if (!input)
            return null;
        const normalized = this.normalizeInput(input);
        return this.cache.get(normalized) || null;
    }
    /**
     * Store resolution in cache
     *
     * @param entry - Resolution cache entry
     */
    store(entry) {
        if (!entry.input || !entry.resolvedType)
            return;
        const normalized = this.normalizeInput(entry.input);
        // Check if entry exists
        const existing = this.cache.get(normalized);
        if (existing) {
            // Update existing entry
            existing.usageCount++;
            existing.timestamp = new Date();
            existing.confidence = this.calculateUpdatedConfidence(existing, entry);
            existing.success = entry.success; // Update success status
        }
        else {
            // Add new entry
            if (this.cache.size >= this.maxCacheSize) {
                this.evictOldest();
            }
            this.cache.set(normalized, {
                ...entry,
                timestamp: new Date(),
                usageCount: 1
            });
        }
    }
    /**
     * Learn from successful resolution
     *
     * @param input - User input
     * @param resolvedType - Resolved node type
     * @param success - Whether user accepted
     */
    learn(input, resolvedType, success) {
        if (!input || !resolvedType)
            return;
        const normalized = this.normalizeInput(input);
        const existing = this.cache.get(normalized);
        if (existing) {
            // Update learning
            existing.usageCount++;
            existing.success = success;
            existing.timestamp = new Date();
            // Increase confidence if successful
            if (success) {
                existing.confidence = Math.min(existing.confidence + 0.05, 1.0);
            }
            else {
                // Decrease confidence if failed
                existing.confidence = Math.max(existing.confidence - 0.1, 0.0);
            }
        }
        else {
            // Store new learning
            this.store({
                input: normalized,
                resolvedType,
                confidence: success ? 0.8 : 0.5,
                success,
                timestamp: new Date(),
                usageCount: 1
            });
        }
    }
    /**
     * Get confidence for input-type pair
     *
     * @param input - User input
     * @param resolvedType - Node type
     * @returns Confidence score (0.0 - 1.0)
     */
    getConfidence(input, resolvedType) {
        if (!input || !resolvedType)
            return 0;
        const normalized = this.normalizeInput(input);
        const entry = this.cache.get(normalized);
        if (entry && entry.resolvedType === resolvedType) {
            return entry.confidence;
        }
        return 0;
    }
    /**
     * Get all entries for a node type
     *
     * @param nodeType - Node type
     * @returns Array of cache entries
     */
    getEntriesForType(nodeType) {
        const entries = [];
        for (const entry of this.cache.values()) {
            if (entry.resolvedType === nodeType) {
                entries.push(entry);
            }
        }
        return entries;
    }
    /**
     * Get statistics
     */
    getStats() {
        const entries = Array.from(this.cache.values());
        const successful = entries.filter(e => e.success).length;
        const avgConfidence = entries.length > 0
            ? entries.reduce((sum, e) => sum + e.confidence, 0) / entries.length
            : 0;
        // Count by type
        const typeCounts = new Map();
        entries.forEach(e => {
            const count = typeCounts.get(e.resolvedType) || 0;
            typeCounts.set(e.resolvedType, count + e.usageCount);
        });
        const mostUsed = Array.from(typeCounts.entries())
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        return {
            totalEntries: entries.length,
            successfulResolutions: successful,
            averageConfidence: avgConfidence,
            mostUsedTypes: mostUsed
        };
    }
    /**
     * Clear cache
     */
    clear() {
        this.cache.clear();
    }
    /**
     * Normalize input for caching
     */
    normalizeInput(input) {
        return input.toLowerCase().trim().replace(/\s+/g, ' ');
    }
    /**
     * Calculate updated confidence based on learning
     */
    calculateUpdatedConfidence(existing, newEntry) {
        // Weighted average: existing confidence weighted by usage count
        const totalUsage = existing.usageCount + 1;
        const existingWeight = existing.usageCount / totalUsage;
        const newWeight = 1 / totalUsage;
        return (existing.confidence * existingWeight) + (newEntry.confidence * newWeight);
    }
    /**
     * Evict oldest entries when cache is full
     */
    evictOldest() {
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());
        // Remove 10% of oldest entries
        const toRemove = Math.max(1, Math.floor(entries.length * 0.1));
        for (let i = 0; i < toRemove; i++) {
            this.cache.delete(entries[i][0]);
        }
    }
}
exports.ResolutionLearningCache = ResolutionLearningCache;
// Export singleton instance
exports.resolutionLearningCache = new ResolutionLearningCache();
