"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRateLimited = isRateLimited;
exports.withRateLimitRetry = withRateLimitRetry;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const defaultConfig = {
    maxAttempts: 5,
    initialDelayMs: 500,
    maxDelayMs: 15000,
};
function isRateLimited(errorCode, statusCode) {
    return statusCode === 429 || errorCode === 4 || errorCode === 17;
}
async function withRateLimitRetry(fn, config = {}) {
    const merged = { ...defaultConfig, ...config };
    let attempt = 0;
    let delay = merged.initialDelayMs;
    while (attempt < merged.maxAttempts) {
        attempt += 1;
        try {
            return await fn();
        }
        catch (error) {
            const errorCode = error?.response?.data?.error?.code;
            const statusCode = error?.response?.status;
            if (!isRateLimited(errorCode, statusCode) || attempt >= merged.maxAttempts) {
                throw error;
            }
            await sleep(delay);
            delay = Math.min(merged.maxDelayMs, delay * 2);
        }
    }
    throw new Error('Rate limit retry exhausted');
}
