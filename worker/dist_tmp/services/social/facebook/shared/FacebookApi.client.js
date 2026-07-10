"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacebookApiClient = void 0;
const axios_1 = __importDefault(require("axios"));
const RateLimiter_helper_1 = require("./RateLimiter.helper");
class FacebookApiClient {
    constructor(config) {
        this.pageTokenCache = new Map();
        this.apiCallCount = 0;
        this.accessToken = config.accessToken;
        const apiVersion = config.apiVersion || 'v20.0';
        this.client = axios_1.default.create({
            baseURL: `https://graph.facebook.com/${apiVersion}`,
            timeout: 60000,
            headers: {
                'User-Agent': 'CtrlChecks-Facebook/1.0',
            },
        });
    }
    getApiCallCount() {
        return this.apiCallCount;
    }
    async validateToken() {
        await this.get('/me', { fields: 'id,name' }, this.accessToken);
    }
    async getPageAccessToken(pageId) {
        if (this.pageTokenCache.has(pageId)) {
            return this.pageTokenCache.get(pageId);
        }
        const resp = await this.get('/me/accounts', {
            fields: 'id,name,access_token,perms',
            limit: 500,
        });
        const page = (resp.data || []).find((p) => p.id === pageId);
        if (!page?.access_token) {
            throw new Error(`No page access token found for page ${pageId}`);
        }
        this.pageTokenCache.set(pageId, page.access_token);
        return page.access_token;
    }
    async get(path, params = {}, token) {
        return (0, RateLimiter_helper_1.withRateLimitRetry)(async () => {
            this.apiCallCount += 1;
            const response = await this.client.get(path, {
                params: {
                    ...params,
                    access_token: token || this.accessToken,
                },
            });
            return response.data;
        });
    }
    async post(path, params = {}, token) {
        return (0, RateLimiter_helper_1.withRateLimitRetry)(async () => {
            this.apiCallCount += 1;
            const response = await this.client.post(path, null, {
                params: {
                    ...params,
                    access_token: token || this.accessToken,
                },
            });
            return response.data;
        });
    }
    async delete(path, params = {}, token) {
        return (0, RateLimiter_helper_1.withRateLimitRetry)(async () => {
            this.apiCallCount += 1;
            const response = await this.client.delete(path, {
                params: {
                    ...params,
                    access_token: token || this.accessToken,
                },
            });
            return response.data;
        });
    }
}
exports.FacebookApiClient = FacebookApiClient;
