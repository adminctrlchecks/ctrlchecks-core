"use strict";
/**
 * notification-service-client.ts
 *
 * Worker-side client for the notification microservice (:3005).
 *
 * Feature flag: NOTIFICATION_SERVICE_ENABLED=true activates delegation.
 * Default: false — all notifications handled by worker's email-service.ts.
 *
 * Canary: NOTIFICATION_SERVICE_CANARY_PERCENT (default 0 — must opt in).
 *   0   = disabled (worker email-service only)
 *   50  = 50% of userIds routed to notification-service (Phase 2 staging)
 *   100 = all traffic routed to notification-service
 *
 * Routing formula: fnv1a(userId) % 100 < pct  (same as other service canaries)
 *
 * Phase 1: All remote methods return null (service returns 501).
 *          No wiring to email-service.ts — this client is scaffolded only.
 *
 * Phase 2: Wire sendEmailRemote into email-service.ts callers in worker.
 *
 * See: docs/engineering/notification-service-contract.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNotificationServiceEnabled = isNotificationServiceEnabled;
exports.getNotificationCanaryPercent = getNotificationCanaryPercent;
exports.shouldUseNotificationService = shouldUseNotificationService;
exports.getBaseUrl = getBaseUrl;
exports.sendEmailRemote = sendEmailRemote;
exports.sendInAppRemote = sendInAppRemote;
exports.sendWebhookRemote = sendWebhookRemote;
exports.sendNotificationRemote = sendNotificationRemote;
const highScaleMetrics_1 = require("../middleware/highScaleMetrics");
const circuit_breaker_1 = require("./circuit-breaker");
const logger_1 = require("../core/logger");
const notificationBreaker = new circuit_breaker_1.CircuitBreaker('notification-service', 5, 3, 60000);
// ── FNV-1a 32-bit hash — deterministic canary routing ────────────────────────
function fnv1a(str) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = (hash * 0x01000193) >>> 0;
    }
    return hash;
}
// ── Feature flag helpers — read env at call time for hot-reload ───────────────
function isNotificationServiceEnabled() {
    return process.env.NOTIFICATION_SERVICE_ENABLED === 'true';
}
function getNotificationCanaryPercent() {
    const raw = process.env.NOTIFICATION_SERVICE_CANARY_PERCENT;
    if (!raw)
        return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
}
function shouldUseNotificationService(userId) {
    if (!isNotificationServiceEnabled())
        return false;
    const pct = getNotificationCanaryPercent();
    if (pct <= 0)
        return false;
    if (pct >= 100)
        return true;
    return fnv1a(userId) % 100 < pct;
}
function getBaseUrl() {
    return process.env.NOTIFICATION_SERVICE_URL?.replace(/\/$/, '') ?? 'http://localhost:3005';
}
function getServiceKey() {
    return process.env.NOTIFICATION_SERVICE_KEY ?? '';
}
function serviceHeaders() {
    const h = { 'Content-Type': 'application/json' };
    const k = getServiceKey();
    if (k)
        h['x-service-key'] = k;
    return h;
}
// ── Shared request helpers ────────────────────────────────────────────────────
async function servicePost(path, userId, body) {
    if (!isNotificationServiceEnabled())
        return null;
    if (!notificationBreaker.canAttempt()) {
        logger_1.logger.warnObj({ path, userId }, 'notification-service circuit OPEN — monolith fallback');
        return null;
    }
    try {
        const res = await fetch(`${getBaseUrl()}${path}`, {
            method: 'POST',
            headers: { ...serviceHeaders(), 'x-user-id': userId },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) {
            notificationBreaker.recordFailure();
            (0, highScaleMetrics_1.incNotificationDelegation)('miss');
            return null;
        }
        notificationBreaker.recordSuccess();
        (0, highScaleMetrics_1.incNotificationDelegation)('hit');
        return (await res.json());
    }
    catch {
        notificationBreaker.recordFailure();
        (0, highScaleMetrics_1.incNotificationDelegation)('error');
        return null;
    }
}
// ── Remote methods (Phase 1: all return null — service stubs 501) ─────────────
/**
 * Send an email notification via notification-service.
 * Phase 1: always returns null (service stubs 501).
 * Phase 2: wire into email-service.ts sendExecutionCompleted / sendExecutionFailed.
 */
async function sendEmailRemote(userId, payload) {
    return servicePost('/notifications/email', userId, payload);
}
/**
 * Send an in-app notification via notification-service.
 * Phase 1: always returns null.
 * Phase 3: wire into execution-job-runner.ts via in-app-service.ts.
 */
async function sendInAppRemote(userId, payload) {
    return servicePost('/notifications/in-app', userId, payload);
}
/**
 * Deliver a webhook to a user-configured URL via notification-service.
 * Phase 4: service handles SSRF guard, 256KB limit, 3× backoff.
 * Returns null when service is disabled or on error — caller falls through.
 */
async function sendWebhookRemote(userId, payload) {
    return servicePost('/notifications/webhook', userId, payload);
}
/**
 * Generic send dispatch — notification-service decides the channel.
 * Phase 1: always returns null.
 */
async function sendNotificationRemote(userId, type, channel, data) {
    return servicePost('/notifications/send', userId, { type, channel, data });
}
