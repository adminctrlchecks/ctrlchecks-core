"use strict";
// Training System Monitor
// Tracks training effectiveness and usage metrics
Object.defineProperty(exports, "__esModule", { value: true });
exports.trainingMonitor = exports.TrainingMonitor = void 0;
class TrainingMonitor {
    constructor() {
        this.usageHistory = [];
        this.maxHistorySize = 1000;
    }
    /**
     * Record training usage
     */
    recordUsage(type, prompt, examplesUsed, success = true) {
        const usage = {
            timestamp: new Date().toISOString(),
            type,
            prompt: prompt.substring(0, 200), // Truncate for storage
            examplesUsed,
            success,
        };
        this.usageHistory.push(usage);
        // Keep history size manageable
        if (this.usageHistory.length > this.maxHistorySize) {
            this.usageHistory = this.usageHistory.slice(-this.maxHistorySize);
        }
    }
    /**
     * Get training metrics
     */
    getMetrics() {
        const totalUsage = this.usageHistory.length;
        const usageByType = {};
        let successCount = 0;
        let totalExamples = 0;
        this.usageHistory.forEach(usage => {
            usageByType[usage.type] = (usageByType[usage.type] || 0) + 1;
            if (usage.success) {
                successCount++;
            }
            totalExamples += usage.examplesUsed;
        });
        return {
            totalUsage,
            usageByType,
            successRate: totalUsage > 0 ? successCount / totalUsage : 0,
            averageExamplesUsed: totalUsage > 0 ? totalExamples / totalUsage : 0,
            recentUsage: this.usageHistory.slice(-10), // Last 10 usages
        };
    }
    /**
     * Get usage statistics for a specific type
     */
    getTypeStats(type) {
        const typeUsage = this.usageHistory.filter(u => u.type === type);
        const successCount = typeUsage.filter(u => u.success).length;
        const totalExamples = typeUsage.reduce((sum, u) => sum + u.examplesUsed, 0);
        return {
            count: typeUsage.length,
            successRate: typeUsage.length > 0 ? successCount / typeUsage.length : 0,
            averageExamples: typeUsage.length > 0 ? totalExamples / typeUsage.length : 0,
        };
    }
    /**
     * Clear usage history
     */
    clearHistory() {
        this.usageHistory = [];
    }
    /**
     * Get recent usage (last N entries)
     */
    getRecentUsage(limit = 10) {
        return this.usageHistory.slice(-limit);
    }
    /**
     * Export usage data for analysis
     */
    exportData() {
        return [...this.usageHistory];
    }
}
exports.TrainingMonitor = TrainingMonitor;
// Export singleton instance
exports.trainingMonitor = new TrainingMonitor();
