"use strict";
/**
 * Workflow Execution Queue Service
 *
 * Manages workflow execution queue with:
 * - FIFO execution order
 * - Concurrent execution limits
 * - Worker pool model
 * - System overload prevention
 * - Retry failed jobs
 * - Job status tracking
 *
 * Uses Redis queue if available, otherwise in-memory queue.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionQueue = void 0;
exports.getExecutionQueue = getExecutionQueue;
const redis_client_1 = require("../shared/redis-client");
const events_1 = require("events");
/**
 * Redis queue backend
 */
class RedisQueueBackend {
    constructor(redis) {
        this.queueKey = 'workflow:execution:queue';
        this.jobKeyPrefix = 'workflow:execution:job:';
        this.processingKey = 'workflow:execution:processing';
        this.redis = redis;
    }
    async enqueue(job) {
        const jobKey = `${this.jobKeyPrefix}${job.id}`;
        await this.redis.setex(jobKey, 3600, JSON.stringify(job)); // Store for 1 hour
        await this.redis.zadd(this.queueKey, job.priority || 0, job.id);
    }
    async dequeue() {
        // Get highest priority job (FIFO for same priority)
        const result = await this.redis.zrange(this.queueKey, 0, 0);
        if (!result || result.length === 0) {
            return null;
        }
        const jobId = result[0];
        const jobKey = `${this.jobKeyPrefix}${jobId}`;
        const jobData = await this.redis.get(jobKey);
        if (!jobData) {
            // Job expired or missing, remove from queue
            await this.redis.zrem(this.queueKey, jobId);
            return null;
        }
        // Move to processing set
        await this.redis.zrem(this.queueKey, jobId);
        await this.redis.zadd(this.processingKey, Date.now(), jobId);
        return JSON.parse(jobData);
    }
    async getJob(jobId) {
        const jobKey = `${this.jobKeyPrefix}${jobId}`;
        const jobData = await this.redis.get(jobKey);
        return jobData ? JSON.parse(jobData) : null;
    }
    async updateJob(job) {
        const jobKey = `${this.jobKeyPrefix}${job.id}`;
        await this.redis.setex(jobKey, 3600, JSON.stringify(job));
    }
    async getQueueSize() {
        return await this.redis.zcard(this.queueKey);
    }
    async clear() {
        const keys = await this.redis.keys(`${this.jobKeyPrefix}*`);
        if (keys.length > 0) {
            await this.redis.del(...keys);
        }
        await this.redis.del(this.queueKey);
        await this.redis.del(this.processingKey);
    }
}
/**
 * In-memory queue backend
 */
class InMemoryQueueBackend {
    constructor() {
        this.queue = [];
        this.jobs = new Map();
        this.processing = new Set();
    }
    async enqueue(job) {
        this.jobs.set(job.id, job);
        // Insert in priority order (FIFO for same priority)
        const priority = job.priority || 0;
        let inserted = false;
        for (let i = 0; i < this.queue.length; i++) {
            if ((this.queue[i].priority || 0) < priority) {
                this.queue.splice(i, 0, job);
                inserted = true;
                break;
            }
        }
        if (!inserted) {
            this.queue.push(job);
        }
    }
    async dequeue() {
        if (this.queue.length === 0) {
            return null;
        }
        const job = this.queue.shift();
        this.processing.add(job.id);
        return job;
    }
    async getJob(jobId) {
        return this.jobs.get(jobId) || null;
    }
    async updateJob(job) {
        this.jobs.set(job.id, job);
    }
    async getQueueSize() {
        return this.queue.length;
    }
    async clear() {
        this.queue = [];
        this.jobs.clear();
        this.processing.clear();
    }
}
/**
 * Execution Queue Manager
 */
class ExecutionQueue extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.workers = new Set(); // Active worker IDs
        this.running = new Map(); // Running job promises
        this.stats = {
            pending: 0,
            running: 0,
            completed: 0,
            failed: 0,
            totalProcessed: 0,
            waitTimes: [],
            executionTimes: [],
        };
        this.isProcessing = false;
        this.config = {
            maxConcurrent: config?.maxConcurrent || 5,
            maxQueueSize: config?.maxQueueSize || 1000,
            retryDelay: config?.retryDelay || 5000,
            maxRetries: config?.maxRetries || 3,
            pollInterval: config?.pollInterval || 1000,
        };
    }
    /**
     * Initialize queue backend
     */
    async initialize() {
        const redisAvailable = await (0, redis_client_1.isRedisAvailable)();
        if (redisAvailable) {
            const redis = await (0, redis_client_1.getRedisClient)();
            if (redis) {
                this.backend = new RedisQueueBackend(redis);
                console.log('[ExecutionQueue] ✅ Using Redis queue backend');
                return;
            }
        }
        // Fallback to in-memory queue
        this.backend = new InMemoryQueueBackend();
        console.log('[ExecutionQueue] ⚠️  Using in-memory queue backend (Redis not available)');
        // Start polling for in-memory queue
        this.startPolling();
    }
    /**
     * Start polling for jobs (in-memory queue only)
     */
    startPolling() {
        if (this.pollInterval) {
            return;
        }
        this.pollInterval = setInterval(async () => {
            if (!this.isProcessing && this.running.size < this.config.maxConcurrent) {
                await this.processNextJob();
            }
        }, this.config.pollInterval);
    }
    /**
     * Stop polling
     */
    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = undefined;
        }
    }
    /**
     * Start the polling loop. Call this from a dedicated worker process.
     * Works for both Redis and in-memory backends (in-memory auto-starts via initialize()).
     */
    startWorker() {
        this.startPolling();
        console.log(`[ExecutionQueue] Worker started (poll interval: ${this.config.pollInterval}ms, max concurrent: ${this.config.maxConcurrent})`);
    }
    /**
     * Add job to queue
     */
    async enqueue(workflowId, executionId, input, options) {
        const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // Check queue size
        const queueSize = await this.backend.getQueueSize();
        if (queueSize >= this.config.maxQueueSize) {
            throw new Error(`Queue is full (max size: ${this.config.maxQueueSize})`);
        }
        const job = {
            id: jobId,
            workflowId,
            executionId,
            input,
            userId: options?.userId,
            priority: options?.priority || 0,
            maxRetries: options?.maxRetries || this.config.maxRetries,
            retryDelay: options?.retryDelay || this.config.retryDelay,
            createdAt: Date.now(),
            status: 'queued',
            retryCount: 0,
            metadata: options?.metadata,
        };
        await this.backend.enqueue(job);
        this.stats.pending++;
        this.emit('job:queued', job);
        console.log(`[ExecutionQueue] Job queued: ${jobId} (workflow: ${workflowId})`);
        // Trigger processing if not already running
        if (!this.isProcessing && this.running.size < this.config.maxConcurrent) {
            this.processNextJob();
        }
        return jobId;
    }
    /**
     * Process next job from queue
     */
    async processNextJob() {
        if (this.isProcessing) {
            return;
        }
        if (this.running.size >= this.config.maxConcurrent) {
            return;
        }
        this.isProcessing = true;
        try {
            const job = await this.backend.dequeue();
            if (!job) {
                this.isProcessing = false;
                return;
            }
            // Update job status
            job.status = 'running';
            job.startedAt = Date.now();
            const waitTime = job.startedAt - job.createdAt;
            this.stats.waitTimes.push(waitTime);
            this.stats.pending--;
            this.stats.running++;
            await this.backend.updateJob(job);
            this.emit('job:started', job);
            // Execute job
            const executionPromise = this.executeJob(job);
            this.running.set(job.id, executionPromise);
            executionPromise.finally(() => {
                this.running.delete(job.id);
                this.stats.running--;
                this.isProcessing = false;
                // Process next job
                if (this.running.size < this.config.maxConcurrent) {
                    this.processNextJob();
                }
            });
        }
        catch (error) {
            console.error('[ExecutionQueue] Error processing job:', error);
            this.isProcessing = false;
        }
    }
    /**
     * Execute job — delegates lifecycle to execution-job-runner.ts
     */
    async executeJob(job) {
        // Defensive guard: engine-tagged jobs belong to workflow:execution:engine-queue.
        // They should never reach this worker consumer, but if they do (misconfiguration),
        // fail fast rather than double-running.
        if (job.metadata?.source === 'execution-engine') {
            console.warn(`[ExecutionQueue] Skipping engine-tagged job ${job.id} — belongs to execution-engine consumer`);
            job.status = 'failed';
            job.error = 'Misrouted: engine-tagged job arrived in worker queue';
            await this.backend.updateJob(job);
            this.emit('job:failed', job);
            return;
        }
        const startTime = Date.now();
        try {
            console.log(`[ExecutionQueue] Executing job: ${job.id} (workflow: ${job.workflowId})`);
            const { runExecutionJob } = await Promise.resolve().then(() => __importStar(require('./execution-job-runner')));
            const runResult = await runExecutionJob(job);
            job.completedAt = Date.now();
            const executionTime = job.completedAt - (job.startedAt || startTime);
            this.stats.executionTimes.push(executionTime);
            if (runResult.status === 'success') {
                job.status = 'completed';
                job.result = runResult.result;
                this.stats.completed++;
                this.stats.totalProcessed++;
                await this.backend.updateJob(job);
                this.emit('job:completed', job);
                console.log(`[ExecutionQueue] Job completed: ${job.id} (${executionTime}ms)`);
            }
            else {
                job.error = runResult.error;
                throw new Error(runResult.error || 'Execution failed');
            }
        }
        catch (error) {
            console.error(`[ExecutionQueue] Job failed: ${job.id}`, error);
            job.error = error.message || String(error);
            job.retryCount++;
            if (job.retryCount <= (job.maxRetries || this.config.maxRetries)) {
                job.status = 'retrying';
                this.emit('job:retrying', job);
                setTimeout(async () => {
                    job.status = 'queued';
                    job.createdAt = Date.now();
                    await this.backend.enqueue(job);
                    this.stats.pending++;
                    if (!this.isProcessing && this.running.size < this.config.maxConcurrent) {
                        this.processNextJob();
                    }
                }, job.retryDelay || this.config.retryDelay);
            }
            else {
                job.status = 'failed';
                job.completedAt = Date.now();
                this.stats.failed++;
                this.stats.totalProcessed++;
                this.emit('job:failed', job);
            }
            await this.backend.updateJob(job);
        }
    }
    /**
     * Get job status
     */
    async getJobStatus(jobId) {
        return await this.backend.getJob(jobId);
    }
    /**
     * Cancel job
     */
    async cancelJob(jobId) {
        const job = await this.backend.getJob(jobId);
        if (!job) {
            return false;
        }
        if (job.status === 'running') {
            // Cannot cancel running job
            return false;
        }
        job.status = 'cancelled';
        await this.backend.updateJob(job);
        this.emit('job:cancelled', job);
        return true;
    }
    /**
     * Get queue statistics
     */
    async getStats() {
        const queueSize = await this.backend.getQueueSize();
        const averageWaitTime = this.stats.waitTimes.length > 0
            ? this.stats.waitTimes.reduce((a, b) => a + b, 0) / this.stats.waitTimes.length
            : 0;
        const averageExecutionTime = this.stats.executionTimes.length > 0
            ? this.stats.executionTimes.reduce((a, b) => a + b, 0) / this.stats.executionTimes.length
            : 0;
        return {
            pending: queueSize,
            running: this.stats.running,
            completed: this.stats.completed,
            failed: this.stats.failed,
            totalProcessed: this.stats.totalProcessed,
            averageWaitTime,
            averageExecutionTime,
        };
    }
    /**
     * Clear queue
     */
    async clear() {
        await this.backend.clear();
        this.stats = {
            pending: 0,
            running: 0,
            completed: 0,
            failed: 0,
            totalProcessed: 0,
            waitTimes: [],
            executionTimes: [],
        };
        this.emit('queue:cleared');
    }
    /**
     * Shutdown queue
     */
    async shutdown() {
        this.stopPolling();
        // Wait for running jobs to complete (with timeout)
        const timeout = 30000; // 30 seconds
        const startTime = Date.now();
        while (this.running.size > 0 && (Date.now() - startTime) < timeout) {
            await Promise.race(Array.from(this.running.values()));
        }
        console.log('[ExecutionQueue] Queue shutdown complete');
    }
}
exports.ExecutionQueue = ExecutionQueue;
// Export singleton instance
let executionQueueInstance = null;
async function getExecutionQueue(config) {
    if (!executionQueueInstance) {
        executionQueueInstance = new ExecutionQueue(config);
        await executionQueueInstance.initialize();
    }
    return executionQueueInstance;
}
// Types are already exported above, no need to re-export
