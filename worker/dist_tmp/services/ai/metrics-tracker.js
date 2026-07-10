"use strict";
// Metrics Tracker - Monitor AI performance and usage
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsTracker = exports.MetricsTracker = void 0;
/**
 * Metrics Tracker
 * Tracks AI request metrics for monitoring
 */
class MetricsTracker {
    constructor() {
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            modelUsage: {},
            responseTimes: [],
            errorTypes: {},
        };
        this.maxResponseTimes = 1000; // Keep last 1000 response times
    }
    /**
     * Track a request
     */
    trackRequest(model, success, duration, errorType) {
        this.metrics.totalRequests++;
        if (success) {
            this.metrics.successfulRequests++;
            this.metrics.modelUsage[model] = (this.metrics.modelUsage[model] || 0) + 1;
            this.metrics.responseTimes.push(duration);
            // Keep only recent response times
            if (this.metrics.responseTimes.length > this.maxResponseTimes) {
                this.metrics.responseTimes.shift();
            }
        }
        else {
            this.metrics.failedRequests++;
            if (errorType) {
                this.metrics.errorTypes[errorType] = (this.metrics.errorTypes[errorType] || 0) + 1;
            }
        }
        // Log every 100 requests
        if (this.metrics.totalRequests % 100 === 0) {
            this.logMetrics();
        }
    }
    /**
     * Track cache hit/miss
     */
    trackCache(cacheHit) {
        if (cacheHit) {
            this.metrics.cacheHits++;
        }
        else {
            this.metrics.cacheMisses++;
        }
    }
    /**
     * Get current statistics
     */
    getStats() {
        const avgResponseTime = this.metrics.responseTimes.length > 0
            ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length
            : 0;
        const successRate = this.metrics.totalRequests > 0
            ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100
            : 0;
        const totalCacheRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
        const cacheHitRate = totalCacheRequests > 0
            ? (this.metrics.cacheHits / totalCacheRequests) * 100
            : 0;
        const topModels = Object.entries(this.metrics.modelUsage)
            .map(([model, count]) => ({ model, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        return {
            ...this.metrics,
            successRate,
            averageResponseTime: avgResponseTime,
            cacheHitRate,
            topModels,
        };
    }
    /**
     * Log metrics summary
     */
    logMetrics() {
        const stats = this.getStats();
        console.log('📊 AI Metrics:', {
            total: stats.totalRequests,
            successRate: `${stats.successRate.toFixed(1)}%`,
            avgResponseTime: `${stats.averageResponseTime.toFixed(0)}ms`,
            cacheHitRate: `${stats.cacheHitRate.toFixed(1)}%`,
            topModels: stats.topModels,
        });
    }
    /**
     * Reset metrics
     */
    reset() {
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            modelUsage: {},
            responseTimes: [],
            errorTypes: {},
        };
    }
}
exports.MetricsTracker = MetricsTracker;
// Export singleton
exports.metricsTracker = new MetricsTracker();
