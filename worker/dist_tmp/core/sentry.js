"use strict";
/**
 * Sentry error tracking initialization for the worker service.
 *
 * Call initSentry() once at startup, immediately after env-loader.
 * If SENTRY_DSN is not set the function is a no-op so dev/test environments
 * are unaffected.
 *
 * Secret scrubbing: beforeSend strips Authorization headers and any key that
 * looks like a credential before the event leaves the process.
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
exports.Sentry = void 0;
exports.initSentry = initSentry;
const Sentry = __importStar(require("@sentry/node"));
exports.Sentry = Sentry;
const SCRUBBED_KEYS = new Set([
    'authorization',
    'x-service-key',
    'x-api-key',
    'cookie',
    'password',
    'secret',
    'token',
    'access_token',
    'refresh_token',
    'api_key',
    'apikey',
    'gemini_api_key',
    'aws_secret_access_key',
    'aws_access_key_id',
    'database_url',
    'redis_url',
]);
function scrubObject(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        out[k] = SCRUBBED_KEYS.has(k.toLowerCase()) ? '[Filtered]' : v;
    }
    return out;
}
function initSentry() {
    const dsn = process.env.SENTRY_DSN?.trim();
    if (!dsn)
        return;
    Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        release: process.env.npm_package_version,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
        beforeSend(event) {
            if (event.request?.headers) {
                event.request.headers = scrubObject(event.request.headers);
            }
            if (event.request?.data && typeof event.request.data === 'object') {
                event.request.data = scrubObject(event.request.data);
            }
            return event;
        },
    });
    console.log('[Sentry] ✅ Error tracking initialized');
}
