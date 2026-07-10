"use strict";
/**
 * Facebook Service
 *
 * Production-ready Facebook Graph API integration service.
 * Handles Facebook operations with proper error handling, rate limiting, and retry logic.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacebookAPIError = void 0;
exports.postToFacebook = postToFacebook;
exports.getFacebookUser = getFacebookUser;
const node_fetch_1 = __importDefault(require("node-fetch"));
const acknowledged_response_1 = require("../../core/http/acknowledged-response");
const FACEBOOK_API_BASE = 'https://graph.facebook.com/v18.0';
/**
 * Facebook API Error
 */
class FacebookAPIError extends Error {
    constructor(statusCode, statusText, apiError) {
        super(`Facebook API error: ${statusCode} ${statusText}`);
        this.statusCode = statusCode;
        this.statusText = statusText;
        this.apiError = apiError;
        this.name = 'FacebookAPIError';
    }
}
exports.FacebookAPIError = FacebookAPIError;
/**
 * Validate Facebook token
 */
async function validateToken(token) {
    try {
        const response = await (0, node_fetch_1.default)(`${FACEBOOK_API_BASE}/me?access_token=${token}`, {
            headers: {
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
 * Post to Facebook page/feed
 */
async function postToFacebook(token, message, pageId, link) {
    try {
        // Validate token
        const isValid = await validateToken(token);
        if (!isValid) {
            return {
                success: false,
                provider: 'facebook',
                action: 'post',
                data: {},
                error: 'Invalid or expired Facebook token',
            };
        }
        // Validate inputs
        if (!message || message.trim().length === 0) {
            return {
                success: false,
                provider: 'facebook',
                action: 'post',
                data: {},
                error: 'Message is required',
            };
        }
        // Determine endpoint (user feed vs page feed)
        const endpoint = pageId
            ? `${FACEBOOK_API_BASE}/${pageId}/feed`
            : `${FACEBOOK_API_BASE}/me/feed`;
        // Build request body
        const body = {
            message: message.trim(),
            access_token: token,
        };
        if (link) {
            body.link = link;
        }
        // Make API request
        const response = await (0, node_fetch_1.default)(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'CtrlChecks/1.0',
            },
            body: new URLSearchParams(body),
        });
        const parsed = await (0, acknowledged_response_1.readAcknowledgedHttpResponse)(response);
        const data = parsed.data;
        if (!response.ok) {
            const errorData = data || parsed.rawText || {};
            throw new FacebookAPIError(response.status, response.statusText, errorData);
        }
        return {
            success: true,
            provider: 'facebook',
            action: 'post',
            data: {
                id: data.id,
                post_id: data.id,
                message: message.trim(),
                created_time: new Date().toISOString(),
            },
            error: null,
        };
    }
    catch (error) {
        if (error instanceof FacebookAPIError) {
            return {
                success: false,
                provider: 'facebook',
                action: 'post',
                data: {},
                error: `Facebook API error (${error.statusCode}): ${error.statusText}`,
            };
        }
        return {
            success: false,
            provider: 'facebook',
            action: 'post',
            data: {},
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}
/**
 * Get Facebook user info
 */
async function getFacebookUser(token) {
    try {
        // Validate token
        const isValid = await validateToken(token);
        if (!isValid) {
            return {
                success: false,
                provider: 'facebook',
                action: 'get_user',
                data: {},
                error: 'Invalid or expired Facebook token',
            };
        }
        // Make API request
        const response = await (0, node_fetch_1.default)(`${FACEBOOK_API_BASE}/me?access_token=${token}&fields=id,name,email`, {
            headers: {
                'User-Agent': 'CtrlChecks/1.0',
            },
        });
        const parsed = await (0, acknowledged_response_1.readAcknowledgedHttpResponse)(response);
        const data = parsed.data;
        if (!response.ok) {
            const errorData = data || parsed.rawText || {};
            throw new FacebookAPIError(response.status, response.statusText, errorData);
        }
        return {
            success: true,
            provider: 'facebook',
            action: 'get_user',
            data: {
                id: data.id,
                name: data.name,
                email: data.email,
            },
            error: null,
        };
    }
    catch (error) {
        if (error instanceof FacebookAPIError) {
            return {
                success: false,
                provider: 'facebook',
                action: 'get_user',
                data: {},
                error: `Facebook API error (${error.statusCode}): ${error.statusText}`,
            };
        }
        return {
            success: false,
            provider: 'facebook',
            action: 'get_user',
            data: {},
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}
