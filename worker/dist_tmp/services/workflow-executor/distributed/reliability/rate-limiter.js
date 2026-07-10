"use strict";
/**
 * Rate Limiter
 *
 * Protects against rate limits by throttling requests per provider.
 * Features:
 * - Token bucket algorithm
 * - Per-provider rate limits
 * - Burst support
 * - Redis-backed for distributed systems
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitManager = exports.RateLimitManager = exports.RateLimiter = void 0;
const redis_1 = require("redis");
/**
 * Rate Limiter
 * Implements token bucket algorithm
 */
class RateLimiter {
    constructor() {
        this.redis = null;
        this.isConnected = false;
        this.limitKeyPrefix = 'rate_limit:';
        this.inMemoryLimits = new Map();
    }
    /**
     * Initialize Redis connection
     */
    async initialize(redisUrl) {
        try {
            const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
            this.redis = (0, redis_1.createClient)({ url });
            this.redis.on('error', (err) => {
                console.error('[RateLimiter] Redis error:', err);
                this.isConnected = false;
            });
            this.redis.on('connect', () => {
                console.log('[RateLimiter] ✅ Connected to Redis');
                this.isConnected = true;
            });
            await this.redis.connect();
            console.log('[RateLimiter] ✅ Rate limiter initialized');
        }
        catch (error) {
            console.warn('[RateLimiter] ⚠️  Redis not available, using in-memory rate limiting');
            this.isConnected = false;
        }
    }
    /**
     * Check if request is allowed
     */
    async checkLimit(provider, config) {
        if (this.isConnected && this.redis) {
            return this.checkLimitRedis(provider, config);
        }
        else {
            return this.checkLimitInMemory(provider, config);
        }
    }
    /**
     * Check limit using Redis (distributed)
     */
    async checkLimitRedis(provider, config) {
        const key = `${this.limitKeyPrefix}${provider}`;
        const now = Date.now();
        const windowStart = now - config.windowMs;
        // Use sliding window log
        const pipeline = this.redis.multi();
        // Remove old entries
        pipeline.zRemRangeByScore(key, 0, windowStart);
        // Count current requests
        pipeline.zCard(key);
        // Add current request
        pipeline.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
        // Set expiry
        pipeline.expire(key, Math.ceil(config.windowMs / 1000));
        const results = await pipeline.exec();
        const count = results?.[1] || 0;
        const maxRequests = config.burst || config.maxRequests;
        const allowed = count < maxRequests;
        const remaining = Math.max(0, maxRequests - count - 1);
        // Calculate reset time (oldest request + window)
        let resetAt = now + config.windowMs;
        if (count > 0) {
            const oldest = await this.redis.zRange(key, 0, 0);
            if (oldest.length > 0) {
                // Get score of oldest entry
                const oldestScores = await this.redis.zRangeWithScores(key, 0, 0);
                if (oldestScores.length > 0) {
                    resetAt = oldestScores[0].score + config.windowMs;
                }
            }
        }
        if (!allowed) {
            const retryAfter = Math.ceil((resetAt - now) / 1000);
            return {
                allowed: false,
                remaining: 0,
                resetAt,
                retryAfter,
            };
        }
        return {
            allowed: true,
            remaining,
            resetAt,
        };
    }
    /**
     * Check limit using in-memory (fallback)
     */
    checkLimitInMemory(provider, config) {
        const key = provider;
        const now = Date.now();
        if (!this.inMemoryLimits.has(key)) {
            this.inMemoryLimits.set(key, {
                tokens: config.maxRequests,
                lastRefill: now,
            });
        }
        const limit = this.inMemoryLimits.get(key);
        const timeSinceRefill = now - limit.lastRefill;
        const refillAmount = Math.floor((timeSinceRefill / config.windowMs) * config.maxRequests);
        if (refillAmount > 0) {
            limit.tokens = Math.min(config.maxRequests, limit.tokens + refillAmount);
            limit.lastRefill = now;
        }
        const maxRequests = config.burst || config.maxRequests;
        const allowed = limit.tokens > 0;
        if (allowed) {
            limit.tokens--;
        }
        const resetAt = limit.lastRefill + config.windowMs;
        const retryAfter = allowed ? undefined : Math.ceil((resetAt - now) / 1000);
        return {
            allowed,
            remaining: Math.max(0, limit.tokens),
            resetAt,
            retryAfter,
        };
    }
    /**
     * Wait until rate limit allows request
     */
    async waitForLimit(provider, config) {
        while (true) {
            const result = await this.checkLimit(provider, config);
            if (result.allowed) {
                return;
            }
            const waitTime = (result.retryAfter || 1) * 1000;
            console.log(`[RateLimiter] ⏳ Rate limit exceeded for ${provider}, waiting ${waitTime}ms`);
            await this.sleep(waitTime);
        }
    }
    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Close Redis connection
     */
    async close() {
        if (this.redis) {
            await this.redis.quit();
            this.isConnected = false;
            console.log('[RateLimiter] ✅ Redis connection closed');
        }
    }
}
exports.RateLimiter = RateLimiter;
/**
 * Rate Limit Manager
 * Manages rate limits for all providers
 */
class RateLimitManager {
    constructor() {
        this.configs = new Map();
        this.limiter = new RateLimiter();
    }
    /**
     * Initialize rate limiter
     */
    async initialize(redisUrl) {
        await this.limiter.initialize(redisUrl);
    }
    /**
     * Configure rate limit for provider
     */
    configure(provider, config) {
        this.configs.set(provider, config);
        console.log(`[RateLimitManager] ✅ Configured rate limit for ${provider}: ${config.maxRequests} requests per ${config.windowMs}ms`);
    }
    /**
     * Check if request is allowed
     */
    async checkLimit(provider) {
        const config = this.configs.get(provider);
        if (!config) {
            // No rate limit configured, allow
            return {
                allowed: true,
                remaining: Infinity,
                resetAt: Date.now(),
            };
        }
        return this.limiter.checkLimit(provider, config);
    }
    /**
     * Wait until rate limit allows request
     */
    async waitForLimit(provider) {
        const config = this.configs.get(provider);
        if (!config) {
            return; // No rate limit, proceed
        }
        await this.limiter.waitForLimit(provider, config);
    }
    /**
     * Close rate limiter
     */
    async close() {
        await this.limiter.close();
    }
}
exports.RateLimitManager = RateLimitManager;
// Export singleton instance
exports.rateLimitManager = new RateLimitManager();
