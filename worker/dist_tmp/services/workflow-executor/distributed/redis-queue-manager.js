"use strict";
/**
 * Redis Queue Manager
 *
 * Manages workflow execution queue using Redis.
 * Provides:
 * - Priority queue support
 * - Job scheduling
 * - Retry management
 * - State persistence
 * - Horizontal scaling support
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisQueueManager = void 0;
exports.getRedisQueueManager = getRedisQueueManager;
const redis_1 = require("redis");
/**
 * Redis Queue Manager
 * Manages distributed workflow execution queue
 */
class RedisQueueManager {
    constructor() {
        this.redis = null;
        this.isConnected = false;
        this.queueKey = 'workflow:queue:pending';
        this.scheduledKey = 'workflow:queue:scheduled';
        this.processingKey = 'workflow:queue:processing';
        this.jobKeyPrefix = 'workflow:job:';
        this.statsKey = 'workflow:queue:stats';
    }
    /**
     * Initialize Redis connection
     */
    async initialize(redisUrl) {
        try {
            const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
            this.redis = (0, redis_1.createClient)({ url });
            this.redis.on('error', (err) => {
                console.error('[RedisQueueManager] Redis error:', err);
                this.isConnected = false;
            });
            this.redis.on('connect', () => {
                console.log('[RedisQueueManager] ✅ Connected to Redis');
                this.isConnected = true;
            });
            await this.redis.connect();
            console.log('[RedisQueueManager] ✅ Redis queue manager initialized');
        }
        catch (error) {
            console.error('[RedisQueueManager] ❌ Failed to connect to Redis:', error);
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
     * Enqueue job
     */
    async enqueue(job) {
        if (!this.isAvailable()) {
            throw new Error('Redis queue not available');
        }
        const jobKey = `${this.jobKeyPrefix}${job.id}`;
        const jobData = JSON.stringify(job);
        // Store job data
        await this.redis.setEx(jobKey, 86400, jobData); // 24 hours TTL
        // Add to priority queue (sorted set)
        // Score = priority (higher = first) + timestamp (for FIFO within same priority)
        const score = job.priority * 1000000000000 + (Date.now() - 1640995200000); // Epoch offset
        await this.redis.zAdd(this.queueKey, { score, value: job.id });
        // Update stats
        await this.incrementStat('pending');
        console.log(`[RedisQueueManager] ✅ Enqueued job ${job.id} (priority: ${job.priority})`);
    }
    /**
     * Dequeue job (get next job from queue)
     */
    async dequeue(workerId) {
        if (!this.isAvailable()) {
            return null;
        }
        // Get highest priority job (last in sorted set)
        const result = await this.redis.zPopMax(this.queueKey);
        if (!result || (Array.isArray(result) && result.length === 0)) {
            return null;
        }
        // Handle both single result and array result
        const jobId = Array.isArray(result) ? result[0]?.value : result?.value;
        if (!jobId) {
            return null;
        }
        const jobKey = `${this.jobKeyPrefix}${jobId}`;
        const jobData = await this.redis.get(jobKey);
        if (!jobData) {
            console.warn(`[RedisQueueManager] ⚠️  Job ${jobId} not found in storage`);
            return null;
        }
        const job = JSON.parse(jobData);
        job.status = 'running';
        job.workerId = workerId;
        // Move to processing set
        await this.redis.sAdd(this.processingKey, jobId);
        await this.redis.setEx(jobKey, 86400, JSON.stringify(job));
        // Update stats
        await this.decrementStat('pending');
        await this.incrementStat('running');
        console.log(`[RedisQueueManager] ✅ Dequeued job ${jobId} (assigned to worker ${workerId})`);
        return job;
    }
    /**
     * Schedule job for future execution
     */
    async schedule(job, delayMs) {
        if (!this.isAvailable()) {
            throw new Error('Redis queue not available');
        }
        const scheduledAt = Date.now() + delayMs;
        job.scheduledAt = scheduledAt;
        job.status = 'pending';
        const jobKey = `${this.jobKeyPrefix}${job.id}`;
        const jobData = JSON.stringify(job);
        // Store job data
        await this.redis.setEx(jobKey, 86400, jobData);
        // Add to scheduled set (sorted by scheduled time)
        await this.redis.zAdd(this.scheduledKey, { score: scheduledAt, value: job.id });
        console.log(`[RedisQueueManager] ✅ Scheduled job ${job.id} for ${new Date(scheduledAt).toISOString()}`);
    }
    /**
     * Move scheduled jobs to queue when ready
     */
    async processScheduledJobs() {
        if (!this.isAvailable()) {
            return 0;
        }
        const now = Date.now();
        const readyJobs = await this.redis.zRangeByScore(this.scheduledKey, 0, now);
        if (readyJobs.length === 0) {
            return 0;
        }
        let moved = 0;
        for (const jobId of readyJobs) {
            const jobKey = `${this.jobKeyPrefix}${jobId}`;
            const jobData = await this.redis.get(jobKey);
            if (jobData) {
                const job = JSON.parse(jobData);
                job.status = 'queued';
                delete job.scheduledAt;
                // Update job data
                await this.redis.setEx(jobKey, 86400, JSON.stringify(job));
                // Move to queue
                const score = job.priority * 1000000000000 + (Date.now() - 1640995200000);
                await this.redis.zAdd(this.queueKey, { score, value: jobId });
                await this.redis.zRem(this.scheduledKey, jobId);
                await this.incrementStat('queued');
                moved++;
            }
        }
        if (moved > 0) {
            console.log(`[RedisQueueManager] ✅ Moved ${moved} scheduled job(s) to queue`);
        }
        return moved;
    }
    /**
     * Update job status
     */
    async updateJob(job) {
        if (!this.isAvailable()) {
            return;
        }
        const jobKey = `${this.jobKeyPrefix}${job.id}`;
        await this.redis.setEx(jobKey, 86400, JSON.stringify(job));
        // Update processing set
        if (job.status === 'running') {
            await this.redis.sAdd(this.processingKey, job.id);
        }
        else {
            await this.redis.sRem(this.processingKey, job.id);
        }
        // Update stats
        if (job.status === 'completed') {
            await this.decrementStat('running');
            await this.incrementStat('completed');
        }
        else if (job.status === 'failed') {
            await this.decrementStat('running');
            await this.incrementStat('failed');
        }
    }
    /**
     * Get job by ID
     */
    async getJob(jobId) {
        if (!this.isAvailable()) {
            return null;
        }
        const jobKey = `${this.jobKeyPrefix}${jobId}`;
        const jobData = await this.redis.get(jobKey);
        if (!jobData) {
            return null;
        }
        return JSON.parse(jobData);
    }
    /**
     * Retry failed job
     */
    async retryJob(jobId, delayMs = 5000) {
        const job = await this.getJob(jobId);
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }
        if (job.retryCount >= job.maxRetries) {
            job.status = 'failed';
            await this.updateJob(job);
            throw new Error(`Job ${jobId} exceeded max retries (${job.maxRetries})`);
        }
        job.retryCount++;
        job.status = 'retrying';
        job.error = undefined;
        // Schedule retry
        await this.schedule(job, delayMs);
        console.log(`[RedisQueueManager] ✅ Scheduled retry ${job.retryCount}/${job.maxRetries} for job ${jobId}`);
    }
    /**
     * Get queue statistics
     */
    async getStats() {
        if (!this.isAvailable()) {
            return {
                pending: 0,
                queued: 0,
                running: 0,
                completed: 0,
                failed: 0,
                totalProcessed: 0,
            };
        }
        const pending = await this.redis.zCard(this.queueKey);
        const scheduled = await this.redis.zCard(this.scheduledKey);
        const running = await this.redis.sCard(this.processingKey);
        // Get stats from Redis
        const statsData = await this.redis.hGetAll(this.statsKey);
        const completed = parseInt(statsData.completed || '0', 10);
        const failed = parseInt(statsData.failed || '0', 10);
        const totalProcessed = parseInt(statsData.totalProcessed || '0', 10);
        return {
            pending: pending + scheduled,
            queued: pending,
            running,
            completed,
            failed,
            totalProcessed,
        };
    }
    /**
     * Increment statistic
     */
    async incrementStat(stat) {
        if (!this.isAvailable()) {
            return;
        }
        await this.redis.hIncrBy(this.statsKey, stat, 1);
        if (stat === 'completed' || stat === 'failed') {
            await this.redis.hIncrBy(this.statsKey, 'totalProcessed', 1);
        }
    }
    /**
     * Decrement statistic
     */
    async decrementStat(stat) {
        if (!this.isAvailable()) {
            return;
        }
        await this.redis.hIncrBy(this.statsKey, stat, -1);
    }
    /**
     * Clear queue (for testing)
     */
    async clear() {
        if (!this.isAvailable()) {
            return;
        }
        await this.redis.del(this.queueKey);
        await this.redis.del(this.scheduledKey);
        await this.redis.del(this.processingKey);
        await this.redis.del(this.statsKey);
        // Clear all job keys
        const keys = await this.redis.keys(`${this.jobKeyPrefix}*`);
        if (keys.length > 0) {
            await this.redis.del(keys);
        }
        console.log('[RedisQueueManager] ✅ Queue cleared');
    }
    /**
     * Close Redis connection
     */
    async close() {
        if (this.redis) {
            await this.redis.quit();
            this.isConnected = false;
            console.log('[RedisQueueManager] ✅ Redis connection closed');
        }
    }
}
exports.RedisQueueManager = RedisQueueManager;
// Export singleton instance
let queueManagerInstance = null;
function getRedisQueueManager() {
    if (!queueManagerInstance) {
        queueManagerInstance = new RedisQueueManager();
    }
    return queueManagerInstance;
}
