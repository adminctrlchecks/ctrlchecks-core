"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCacheRedisClient = getCacheRedisClient;
exports.buildCacheKey = buildCacheKey;
exports.invalidateExecutionStatusCache = invalidateExecutionStatusCache;
exports.invalidateWorkflowDbCache = invalidateWorkflowDbCache;
exports.invalidateMissingItemsCache = invalidateMissingItemsCache;
exports.invalidateAllMissingItemsCaches = invalidateAllMissingItemsCaches;
exports.redisGetCache = redisGetCache;
const crypto_1 = __importDefault(require("crypto"));
const redis_1 = require("redis");
let cacheClient = null;
let cacheConnecting = null;
/**
 * Returns a singleton Redis client for cache-aside GET responses.
 */
async function getCacheRedisClient(redisUrl) {
    if (cacheClient?.isOpen)
        return cacheClient;
    if (cacheConnecting)
        return cacheConnecting;
    cacheConnecting = (async () => {
        try {
            const client = (0, redis_1.createClient)({ url: redisUrl });
            client.on('error', (error) => console.error('[RedisGetCache] Redis error:', error));
            await client.connect();
            cacheClient = client;
            return client;
        }
        catch (error) {
            console.error('[RedisGetCache] Redis unavailable:', error);
            cacheClient = null;
            return null;
        }
        finally {
            cacheConnecting = null;
        }
    })();
    return cacheConnecting;
}
/**
 * Builds a stable cache key using the route path and a hash of params/query/auth context.
 */
function buildCacheKey(req) {
    const auth = req.headers.authorization ? crypto_1.default.createHash('sha256').update(req.headers.authorization).digest('hex').slice(0, 16) : 'anon';
    const source = JSON.stringify({ params: req.params, query: req.query, body: req.body, auth });
    const paramsHash = crypto_1.default.createHash('sha256').update(source).digest('hex');
    return `${req.path}:${paramsHash}`;
}
/**
 * Invalidates all Redis cache keys for a given executionId.
 *
 * Uses SCAN with a pattern match on the path prefix so all key variants
 * (?lite=1, ?lite=true, no-query, different auth-hash suffixes) are covered
 * without needing to reconstruct the exact buildCacheKey hash.
 */
async function invalidateExecutionStatusCache(executionId, client) {
    const pattern = `/api/execution-status/${executionId}:*`;
    const keysToDelete = [];
    // Use scanIterator if available (real Redis client), otherwise fall back to
    // iterative scan (used by in-memory test mocks that expose a scan() method).
    if (typeof client.scanIterator === 'function') {
        for await (const key of client.scanIterator({ MATCH: pattern })) {
            keysToDelete.push(key);
        }
    }
    else {
        // Fallback: manual SCAN loop compatible with test mocks
        let cursor = 0;
        do {
            const result = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
            cursor = result.cursor;
            keysToDelete.push(...result.keys);
        } while (cursor !== 0);
    }
    for (const key of keysToDelete) {
        await client.del(key);
    }
    console.warn(`[RedisGetCache] invalidated ${keysToDelete.length} key(s) for execution ${executionId}`);
}
/**
 * Invalidates all Redis cache keys for the /api/db/workflows path.
 *
 * The workflowId lives in query params (not the path), so the cache key hash
 * is not predictable from the workflowId alone. Scanning and deleting all
 * /api/db/workflows:* entries is safe — the TTL is short (60 s) and commit is
 * a rare user-triggered operation, so the cache rebuilds quickly on next read.
 */
async function invalidateWorkflowDbCache(client) {
    const pattern = `/api/db/workflows:*`;
    const keysToDelete = [];
    if (typeof client.scanIterator === 'function') {
        for await (const key of client.scanIterator({ MATCH: pattern })) {
            keysToDelete.push(key);
        }
    }
    else {
        let cursor = 0;
        do {
            const result = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
            cursor = result.cursor;
            keysToDelete.push(...result.keys);
        } while (cursor !== 0);
    }
    for (const key of keysToDelete) {
        await client.del(key);
    }
    console.log(`[RedisGetCache] invalidated ${keysToDelete.length} workflow cache key(s)`);
}
/**
 * Invalidates all Redis cache keys for a specific workflow's missing-items endpoint.
 * Call this after saving credentials so the frontend sees the updated connection status immediately.
 */
async function invalidateMissingItemsCache(workflowId, client) {
    const pattern = `/api/workflows/${workflowId}/missing-items:*`;
    const keysToDelete = [];
    if (typeof client.scanIterator === 'function') {
        for await (const key of client.scanIterator({ MATCH: pattern })) {
            keysToDelete.push(key);
        }
    }
    else {
        let cursor = 0;
        do {
            const result = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
            cursor = result.cursor;
            keysToDelete.push(...result.keys);
        } while (cursor !== 0);
    }
    for (const key of keysToDelete) {
        await client.del(key);
    }
    console.log(`[RedisGetCache] invalidated ${keysToDelete.length} missing-items cache key(s) for workflow ${workflowId}`);
}
/**
 * Invalidates ALL missing-items cache keys across all workflows.
 * Use this after API-key credential saves where the specific workflowId is not available.
 * Safe to call — missing-items is now fast (< 300ms) so cache rebuilds quickly.
 */
async function invalidateAllMissingItemsCaches(client) {
    const pattern = `/api/workflows/*/missing-items:*`;
    const keysToDelete = [];
    if (typeof client.scanIterator === 'function') {
        for await (const key of client.scanIterator({ MATCH: pattern })) {
            keysToDelete.push(key);
        }
    }
    else {
        let cursor = 0;
        do {
            const result = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
            cursor = result.cursor;
            keysToDelete.push(...result.keys);
        } while (cursor !== 0);
    }
    for (const key of keysToDelete) {
        await client.del(key);
    }
    console.log(`[RedisGetCache] invalidated ${keysToDelete.length} missing-items cache key(s) across all workflows`);
}
/**
 * Caches successful JSON GET responses with a cache-aside Redis pattern.
 */
function redisGetCache(options = {}) {
    const redisUrl = options.redisUrl || process.env.REDIS_URL || 'redis://redis:6379';
    const ttlSeconds = options.ttlSeconds || Number(process.env.GET_CACHE_TTL_SECONDS || 60);
    const skipPaths = new Set(options.skipPaths || ['/health', '/metrics']);
    return async (req, res, next) => {
        if (req.method !== 'GET' || skipPaths.has(req.path))
            return next();
        const client = await getCacheRedisClient(redisUrl);
        if (!client)
            return next();
        const key = buildCacheKey(req);
        const cached = await client.get(key);
        if (cached) {
            console.log(`[RedisGetCache] hit ${key}`);
            res.setHeader('X-Cache', 'HIT');
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.send(cached);
            return;
        }
        console.log(`[RedisGetCache] miss ${key}`);
        res.setHeader('X-Cache', 'MISS');
        const originalJson = res.json.bind(res);
        res.json = ((body) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                client.setEx(key, ttlSeconds, JSON.stringify(body)).catch((error) => {
                    console.error('[RedisGetCache] write failed:', error);
                });
            }
            return originalJson(body);
        });
        next();
    };
}
