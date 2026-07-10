"use strict";
// AI Performance Monitor
// Metrics tracking and optimization suggestions
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiPerformanceMonitor = exports.AIPerformanceMonitor = void 0;
class AIPerformanceMonitor {
    constructor() {
        this.metrics = {
            requestCount: 0,
            successCount: 0,
            failureCount: 0,
            averageResponseTime: 0,
            modelUsage: new Map(),
            cacheHitRate: 0,
            tokenUsage: 0,
            requestsByType: new Map(),
        };
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }
    trackRequest(type, model, startTime, success, tokens) {
        const duration = Date.now() - startTime;
        this.metrics.requestCount++;
        // Update type-based metrics
        const typeCount = this.metrics.requestsByType.get(type) || 0;
        this.metrics.requestsByType.set(type, typeCount + 1);
        if (success) {
            this.metrics.successCount++;
            // Update model-specific metrics
            const modelMetrics = this.metrics.modelUsage.get(model) || {
                count: 0,
                totalTime: 0,
                avgTime: 0,
                successCount: 0,
                failureCount: 0,
                successRate: 100,
            };
            modelMetrics.count++;
            modelMetrics.totalTime += duration;
            modelMetrics.avgTime = modelMetrics.totalTime / modelMetrics.count;
            modelMetrics.successCount++;
            modelMetrics.successRate =
                (modelMetrics.successCount / modelMetrics.count) * 100;
            this.metrics.modelUsage.set(model, modelMetrics);
            // Update average response time
            this.metrics.averageResponseTime =
                (this.metrics.averageResponseTime * (this.metrics.successCount - 1) + duration) /
                    this.metrics.successCount;
            if (tokens) {
                this.metrics.tokenUsage += tokens;
            }
        }
        else {
            this.metrics.failureCount++;
            // Update model failure metrics
            const modelMetrics = this.metrics.modelUsage.get(model) || {
                count: 0,
                totalTime: 0,
                avgTime: 0,
                successCount: 0,
                failureCount: 0,
                successRate: 100,
            };
            modelMetrics.count++;
            modelMetrics.failureCount++;
            modelMetrics.successRate =
                (modelMetrics.successCount / modelMetrics.count) * 100;
            this.metrics.modelUsage.set(model, modelMetrics);
        }
        // Log every 100 requests
        if (this.metrics.requestCount % 100 === 0) {
            this.logMetrics();
        }
    }
    trackCacheHit() {
        this.cacheHits++;
        this.updateCacheHitRate();
    }
    trackCacheMiss() {
        this.cacheMisses++;
        this.updateCacheHitRate();
    }
    updateCacheHitRate() {
        const total = this.cacheHits + this.cacheMisses;
        if (total > 0) {
            this.metrics.cacheHitRate = (this.cacheHits / total) * 100;
        }
    }
    getStats() {
        return {
            ...this.metrics,
            // Create a copy of maps to avoid mutation
            modelUsage: new Map(this.metrics.modelUsage),
            requestsByType: new Map(this.metrics.requestsByType),
        };
    }
    getOptimizationSuggestions() {
        const suggestions = [];
        // Analyze model performance
        this.metrics.modelUsage.forEach((metrics, model) => {
            if (metrics.avgTime > 5000) { // > 5 seconds
                suggestions.push({
                    type: 'performance',
                    model,
                    issue: `Slow response time: ${metrics.avgTime.toFixed(0)}ms`,
                    suggestion: 'Consider using lighter model or implementing caching',
                    priority: 'high',
                });
            }
            if (metrics.count > 1000) {
                suggestions.push({
                    type: 'popularity',
                    model,
                    issue: `High usage: ${metrics.count} requests`,
                    suggestion: 'Keep this model pre-loaded for better performance',
                    priority: 'medium',
                });
            }
            if (metrics.successRate < 95) {
                suggestions.push({
                    type: 'reliability',
                    model,
                    issue: `Low success rate: ${metrics.successRate.toFixed(1)}%`,
                    suggestion: 'Investigate error patterns and improve error handling',
                    priority: 'high',
                });
            }
        });
        // Cache suggestions
        if (this.metrics.cacheHitRate < 30) {
            suggestions.push({
                type: 'caching',
                issue: `Low cache hit rate: ${this.metrics.cacheHitRate.toFixed(1)}%`,
                suggestion: 'Consider expanding cache scope or increasing TTL',
                priority: 'medium',
            });
        }
        // Response time suggestions
        if (this.metrics.averageResponseTime > 3000) {
            suggestions.push({
                type: 'overall_performance',
                issue: `High average response time: ${this.metrics.averageResponseTime.toFixed(0)}ms`,
                suggestion: 'Review slowest models and consider optimizations',
                priority: 'high',
            });
        }
        return suggestions;
    }
    logMetrics() {
        console.log('\n📊 AI Performance Metrics:');
        console.log(`  Total Requests: ${this.metrics.requestCount}`);
        console.log(`  Success Rate: ${((this.metrics.successCount / this.metrics.requestCount) * 100).toFixed(1)}%`);
        console.log(`  Avg Response Time: ${this.metrics.averageResponseTime.toFixed(0)}ms`);
        console.log(`  Cache Hit Rate: ${this.metrics.cacheHitRate.toFixed(1)}%`);
        console.log('\n  Model Performance:');
        this.metrics.modelUsage.forEach((stats, model) => {
            if (stats.count > 0) {
                console.log(`    ${model}: ${stats.count} requests, ${stats.avgTime.toFixed(0)}ms avg, ${stats.successRate.toFixed(1)}% success`);
            }
        });
    }
    reset() {
        this.metrics = {
            requestCount: 0,
            successCount: 0,
            failureCount: 0,
            averageResponseTime: 0,
            modelUsage: new Map(),
            cacheHitRate: 0,
            tokenUsage: 0,
            requestsByType: new Map(),
        };
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }
}
exports.AIPerformanceMonitor = AIPerformanceMonitor;
// Export singleton instance
exports.aiPerformanceMonitor = new AIPerformanceMonitor();
