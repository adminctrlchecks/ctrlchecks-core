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

import { incNotificationDelegation } from '../middleware/highScaleMetrics';
import { CircuitBreaker } from './circuit-breaker';
import { logger } from '../core/logger';

const notificationBreaker = new CircuitBreaker('notification-service', 5, 3, 60_000);

// ── FNV-1a 32-bit hash — deterministic canary routing ────────────────────────

function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash;
}

// ── Feature flag helpers — read env at call time for hot-reload ───────────────

export function isNotificationServiceEnabled(): boolean {
  return process.env.NOTIFICATION_SERVICE_ENABLED === 'true';
}

export function getNotificationCanaryPercent(): number {
  const raw = process.env.NOTIFICATION_SERVICE_CANARY_PERCENT;
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
}

export function shouldUseNotificationService(userId: string): boolean {
  if (!isNotificationServiceEnabled()) return false;
  const pct = getNotificationCanaryPercent();
  if (pct <= 0) return false;
  if (pct >= 100) return true;
  return fnv1a(userId) % 100 < pct;
}

export function getBaseUrl(): string {
  return process.env.NOTIFICATION_SERVICE_URL?.replace(/\/$/, '') ?? 'http://localhost:3005';
}

function getServiceKey(): string {
  return process.env.NOTIFICATION_SERVICE_KEY ?? '';
}

function serviceHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const k = getServiceKey();
  if (k) h['x-service-key'] = k;
  return h;
}

// ── Shared request helpers ────────────────────────────────────────────────────

async function servicePost<T>(path: string, userId: string, body: unknown): Promise<T | null> {
  if (!isNotificationServiceEnabled()) return null;
  if (!notificationBreaker.canAttempt()) {
    logger.warnObj({ path, userId }, 'notification-service circuit OPEN — monolith fallback');
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
      incNotificationDelegation('miss');
      return null;
    }
    notificationBreaker.recordSuccess();
    incNotificationDelegation('hit');
    return (await res.json()) as T;
  } catch {
    notificationBreaker.recordFailure();
    incNotificationDelegation('error');
    return null;
  }
}

// ── Notification payload types ────────────────────────────────────────────────

export interface EmailNotificationPayload {
  templateId: 'execution_completed' | 'execution_failed' | 'welcome' | 'approval_needed';
  data: Record<string, string>;
  to?: string;
}

export interface NotificationResult {
  notificationId: string;
  status: 'queued' | 'sent' | 'failed';
  channel: string;
}

// ── Remote methods (Phase 1: all return null — service stubs 501) ─────────────

/**
 * Send an email notification via notification-service.
 * Phase 1: always returns null (service stubs 501).
 * Phase 2: wire into email-service.ts sendExecutionCompleted / sendExecutionFailed.
 */
export async function sendEmailRemote(
  userId: string,
  payload: EmailNotificationPayload,
): Promise<NotificationResult | null> {
  return servicePost<NotificationResult>('/notifications/email', userId, payload);
}

/**
 * Send an in-app notification via notification-service.
 * Phase 1: always returns null.
 * Phase 3: wire into execution-job-runner.ts via in-app-service.ts.
 */
export async function sendInAppRemote(
  userId: string,
  payload: { title: string; message: string; type: string; link?: string | null; metadata?: Record<string, unknown> },
): Promise<NotificationResult | null> {
  return servicePost<NotificationResult>('/notifications/in-app', userId, payload);
}

/**
 * Deliver a webhook to a user-configured URL via notification-service.
 * Phase 4: service handles SSRF guard, 256KB limit, 3× backoff.
 * Returns null when service is disabled or on error — caller falls through.
 */
export async function sendWebhookRemote(
  userId: string,
  payload: { url: string; event: string; payload?: Record<string, unknown> },
): Promise<NotificationResult | null> {
  return servicePost<NotificationResult>('/notifications/webhook', userId, payload);
}

/**
 * Generic send dispatch — notification-service decides the channel.
 * Phase 1: always returns null.
 */
export async function sendNotificationRemote(
  userId: string,
  type: string,
  channel: string,
  data: Record<string, unknown>,
): Promise<NotificationResult | null> {
  return servicePost<NotificationResult>('/notifications/send', userId, { type, channel, data });
}
