"use strict";
// Redis Client for CtrlChecks AI
// Provides connection to Redis for short-term memory storage
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = getRedisClient;
exports.closeRedisClient = closeRedisClient;
exports.isRedisAvailable = isRedisAvailable;
const ioredis_1 = __importDefault(require("ioredis"));
let redisClient = null;
let redisConnectionPromise = null;
/**
 * Get or create Redis client connection
 * Uses connection pooling to avoid creating multiple connections
 */
async function getRedisClient() {
    if (redisClient) {
        return redisClient;
    }
    // If connection is in progress, wait for it
    if (redisConnectionPromise) {
        return redisConnectionPromise;
    }
    // Start new connection
    redisConnectionPromise = connectRedis();
    redisClient = await redisConnectionPromise;
    redisConnectionPromise = null;
    return redisClient;
}
/**
 * Connect to Redis server
 */
async function connectRedis() {
    const REDIS_URL = process.env.REDIS_URL;
    if (!REDIS_URL) {
        console.warn("REDIS_URL not set. Redis features will be disabled.");
        return null;
    }
    try {
        const client = new ioredis_1.default(REDIS_URL, {
            retryStrategy: (times) => {
                if (times > 20)
                    return null; // stop retrying after ~20 attempts (~40s total)
                return Math.min(times * 50, 2000);
            },
            reconnectOnError: (err) => {
                // Reconnect on socket-level errors (ECONNRESET, EPIPE) so a dropped
                // TCP connection is healed without a process restart.
                const msg = err.message.toUpperCase();
                return msg.includes('ECONNRESET') || msg.includes('EPIPE');
            },
            maxRetriesPerRequest: 3,
            enableOfflineQueue: true, // queue commands during reconnect (default)
            lazyConnect: false,
        });
        client.on('error', (err) => {
            console.error('Redis Client Error:', err);
        });
        client.on('connect', () => {
            console.log('Redis Client Connected');
        });
        // Test connection
        await client.ping();
        console.log(`Connected to Redis at ${REDIS_URL}`);
        return client;
    }
    catch (error) {
        console.error("Failed to connect to Redis:", error);
        return null;
    }
}
/**
 * Close Redis connection
 */
async function closeRedisClient() {
    if (redisClient) {
        try {
            await redisClient.quit();
        }
        catch (error) {
            console.error("Error closing Redis connection:", error);
        }
        redisClient = null;
    }
    redisConnectionPromise = null;
}
/**
 * Check if Redis is available
 */
async function isRedisAvailable() {
    try {
        const client = await getRedisClient();
        if (!client)
            return false;
        await client.ping();
        return true;
    }
    catch {
        return false;
    }
}
