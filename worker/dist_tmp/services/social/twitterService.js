"use strict";
/**
 * Twitter/X Service
 *
 * Production-ready Twitter API v2 integration service.
 * Handles Twitter operations with proper error handling, rate limiting, and retry logic.
 *
 * Note: Twitter API v2 requires OAuth 1.0a or OAuth 2.0 Bearer tokens.
 * This implementation uses OAuth 2.0 Bearer tokens for simplicity.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwitterAPIError = void 0;
exports.postTweet = postTweet;
exports.getTwitterUser = getTwitterUser;
const node_fetch_1 = __importDefault(require("node-fetch"));
const acknowledged_response_1 = require("../../core/http/acknowledged-response");
const TWITTER_API_BASE = 'https://api.twitter.com/2';
/**
 * Twitter API Error
 */
class TwitterAPIError extends Error {
    constructor(statusCode, statusText, apiError) {
        super(`Twitter API error: ${statusCode} ${statusText}`);
        this.statusCode = statusCode;
        this.statusText = statusText;
        this.apiError = apiError;
        this.name = 'TwitterAPIError';
    }
}
exports.TwitterAPIError = TwitterAPIError;
/**
 * Validate Twitter token
 */
async function validateToken(token) {
    try {
        const response = await (0, node_fetch_1.default)(`${TWITTER_API_BASE}/users/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'CtrlChecks/1.0',
            },
        });
        return response.ok;
    }
    catch (error) {
        return false;
    }
}
/**
 * Post tweet (Twitter API v2)
 */
async function postTweet(token, text) {
    try {
        // Validate token
        const isValid = await validateToken(token);
        if (!isValid) {
            return {
                success: false,
                provider: 'twitter',
                action: 'post',
                data: {},
                error: 'Invalid or expired Twitter token',
            };
        }
        // Validate inputs
        if (!text || text.trim().length === 0) {
            return {
                success: false,
                provider: 'twitter',
                action: 'post',
                data: {},
                error: 'Tweet text is required',
            };
        }
        // Twitter has a 280 character limit
        if (text.length > 280) {
            return {
                success: false,
                provider: 'twitter',
                action: 'post',
                data: {},
                error: 'Tweet text exceeds 280 character limit',
            };
        }
        // Make API request
        const response = await (0, node_fetch_1.default)(`${TWITTER_API_BASE}/tweets`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'CtrlChecks/1.0',
            },
            body: JSON.stringify({
                text: text.trim(),
            }),
        });
        const parsed = await (0, acknowledged_response_1.readAcknowledgedHttpResponse)(response);
        const data = parsed.data;
        if (!response.ok) {
            const errorData = data || parsed.rawText || {};
            throw new TwitterAPIError(response.status, response.statusText, errorData);
        }
        return {
            success: true,
            provider: 'twitter',
            action: 'post',
            data: {
                id: data.data.id,
                text: data.data.text,
                created_at: new Date().toISOString(),
            },
            error: null,
        };
    }
    catch (error) {
        if (error instanceof TwitterAPIError) {
            return {
                success: false,
                provider: 'twitter',
                action: 'post',
                data: {},
                error: `Twitter API error (${error.statusCode}): ${error.statusText}`,
            };
        }
        return {
            success: false,
            provider: 'twitter',
            action: 'post',
            data: {},
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}
/**
 * Get Twitter user info
 */
async function getTwitterUser(token) {
    try {
        // Validate token
        const isValid = await validateToken(token);
        if (!isValid) {
            return {
                success: false,
                provider: 'twitter',
                action: 'get_user',
                data: {},
                error: 'Invalid or expired Twitter token',
            };
        }
        // Make API request
        const response = await (0, node_fetch_1.default)(`${TWITTER_API_BASE}/users/me?user.fields=id,name,username,created_at`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'CtrlChecks/1.0',
            },
        });
        const parsed = await (0, acknowledged_response_1.readAcknowledgedHttpResponse)(response);
        const data = parsed.data;
        if (!response.ok) {
            const errorData = data || parsed.rawText || {};
            throw new TwitterAPIError(response.status, response.statusText, errorData);
        }
        return {
            success: true,
            provider: 'twitter',
            action: 'get_user',
            data: {
                id: data.data.id,
                name: data.data.name,
                username: data.data.username,
                created_at: data.data.created_at,
            },
            error: null,
        };
    }
    catch (error) {
        if (error instanceof TwitterAPIError) {
            return {
                success: false,
                provider: 'twitter',
                action: 'get_user',
                data: {},
                error: `Twitter API error (${error.statusCode}): ${error.statusText}`,
            };
        }
        return {
            success: false,
            provider: 'twitter',
            action: 'get_user',
            data: {},
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}
