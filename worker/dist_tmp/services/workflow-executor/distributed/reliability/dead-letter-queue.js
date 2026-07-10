"use strict";
/**
 * Dead Letter Queue
 *
 * Stores failed jobs that cannot be retried.
 * Features:
 * - Persistent storage in Redis
 * - Job metadata and error details
 * - Query and replay support
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeadLetterQueue = void 0;
exports.getDeadLetterQueue = getDeadLetterQueue;
const redis_1 = require("redis");
/**
 * Dead Letter Queue
 * Stores permanently failed jobs
 */
class DeadLetterQueue {
    constructor() {
        this.redis = null;
        this.isConnected = false;
        this.dlqKeyPrefix = 'dlq:job:';
        this.dlqIndexKey = 'dlq:index';
        this.dlqByReasonKey = 'dlq:by_reason:';
    }
    /**
     * Initialize Redis connection
     */
    async initialize(redisUrl) {
        try {
            const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
            this.redis = (0, redis_1.createClient)({ url });
            this.redis.on('error', (err) => {
                console.error('[DeadLetterQueue] Redis error:', err);
                this.isConnected = false;
            });
            this.redis.on('connect', () => {
                console.log('[DeadLetterQueue] ✅ Connected to Redis');
                this.isConnected = true;
            });
            await this.redis.connect();
            console.log('[DeadLetterQueue] ✅ Dead letter queue initialized');
        }
        catch (error) {
            console.error('[DeadLetterQueue] ❌ Failed to connect to Redis:', error);
            this.isConnected = false;
            throw error;
        }
    }
    /**
     * Check if Redis is available
     */
    isAvailable() {
        return this.isConnected && this.redis !== null;
    }
    /**
     * Add job to dead letter queue
     */
    async addJob(job, error, reason = 'unknown') {
        if (!this.isAvailable()) {
            throw new Error('Dead letter queue not available');
        }
        const errorMessage = error instanceof Error ? error.message : error;
        const errorStack = error instanceof Error ? error.stack : undefined;
        const dlqJob = {
            id: job.id,
            originalJob: job,
            error: errorMessage,
            errorStack,
            failedAt: Date.now(),
            retryCount: job.retryCount,
            reason,
            metadata: job.metadata,
        };
        const jobKey = `${this.dlqKeyPrefix}${job.id}`;
        const jobData = JSON.stringify(dlqJob);
        // Store job
        await this.redis.setEx(jobKey, 2592000, jobData); // 30 days TTL
        // Add to index
        await this.redis.sAdd(this.dlqIndexKey, job.id);
        // Add to reason index
        await this.redis.sAdd(`${this.dlqByReasonKey}${reason}`, job.id);
        console.log(`[DeadLetterQueue] ✅ Added job ${job.id} to DLQ (reason: ${reason})`);
    }
    /**
     * Get job from dead letter queue
     */
    async getJob(jobId) {
        if (!this.isAvailable()) {
            return null;
        }
        const jobKey = `${this.dlqKeyPrefix}${jobId}`;
        const jobData = await this.redis.get(jobKey);
        if (!jobData) {
            return null;
        }
        return JSON.parse(jobData);
    }
    /**
     * Get all jobs in dead letter queue
     */
    async getAllJobs(limit = 100) {
        if (!this.isAvailable()) {
            return [];
        }
        const jobIds = await this.redis.sMembers(this.dlqIndexKey);
        const jobs = [];
        for (const jobId of jobIds.slice(0, limit)) {
            const job = await this.getJob(jobId);
            if (job) {
                jobs.push(job);
            }
        }
        return jobs.sort((a, b) => b.failedAt - a.failedAt); // Most recent first
    }
    /**
     * Get jobs by reason
     */
    async getJobsByReason(reason, limit = 100) {
        if (!this.isAvailable()) {
            return [];
        }
        const jobIds = await this.redis.sMembers(`${this.dlqByReasonKey}${reason}`);
        const jobs = [];
        for (const jobId of jobIds.slice(0, limit)) {
            const job = await this.getJob(jobId);
            if (job) {
                jobs.push(job);
            }
        }
        return jobs.sort((a, b) => b.failedAt - a.failedAt);
    }
    /**
     * Remove job from dead letter queue
     */
    async removeJob(jobId) {
        if (!this.isAvailable()) {
            return;
        }
        const job = await this.getJob(jobId);
        if (!job) {
            return;
        }
        const jobKey = `${this.dlqKeyPrefix}${jobId}`;
        await this.redis.del(jobKey);
        await this.redis.sRem(this.dlqIndexKey, jobId);
        await this.redis.sRem(`${this.dlqByReasonKey}${job.reason}`, jobId);
        console.log(`[DeadLetterQueue] ✅ Removed job ${jobId} from DLQ`);
    }
    /**
     * Get dead letter queue statistics
     */
    async getStats() {
        if (!this.isAvailable()) {
            return { total: 0, byReason: {} };
        }
        const total = await this.redis.sCard(this.dlqIndexKey);
        const reasons = ['max_retries', 'circuit_open', 'timeout', 'rate_limit', 'unknown'];
        const byReason = {};
        for (const reason of reasons) {
            const count = await this.redis.sCard(`${this.dlqByReasonKey}${reason}`);
            byReason[reason] = count;
        }
        return { total, byReason };
    }
    /**
     * Close Redis connection
     */
    async close() {
        if (this.redis) {
            await this.redis.quit();
            this.isConnected = false;
            console.log('[DeadLetterQueue] ✅ Redis connection closed');
        }
    }
}
exports.DeadLetterQueue = DeadLetterQueue;
// Export singleton instance
let dlqInstance = null;
function getDeadLetterQueue() {
    if (!dlqInstance) {
        dlqInstance = new DeadLetterQueue();
    }
    return dlqInstance;
}
