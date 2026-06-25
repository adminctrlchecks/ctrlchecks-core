/**
 * trigger-service-client.ts
 *
 * Worker-side client for the trigger microservice (:3006).
 *
 * Feature flag: TRIGGER_SERVICE_ENABLED=true activates delegation.
 * Default: false — all triggers handled by worker's own route handlers.
 *
 * Canary: TRIGGER_SERVICE_CANARY_PERCENT (default 0 — must opt in).
 *   0   = disabled (worker handles all triggers)
 *   50  = 50% of workflowIds routed to trigger-service (Phase 2 staging)
 *   100 = all traffic routed to trigger-service
 *
 * Routing formula: fnv1a(workflowId) % 100 < pct  (same as other service canaries)
 *
 * Phase 1: All remote methods return null (service returns 501).
 *          No wiring to worker trigger routes — this client is scaffolded only.
 *
 * Phase 2: Wire dispatchWebhookRemote / dispatchFormRemote / dispatchChatRemote
 *          into the respective worker route handlers.
 *
 * See: docs/engineering/trigger-service-contract.md
 */

import { incTriggerServiceDelegation } from '../middleware/highScaleMetrics';
import { CircuitBreaker } from './circuit-breaker';
import { logger } from '../core/logger';

const triggerBreaker = new CircuitBreaker('trigger-service', 5, 3, 60_000);

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

export function isTriggerServiceEnabled(): boolean {
  return process.env.TRIGGER_SERVICE_ENABLED === 'true';
}

export function getTriggerCanaryPercent(): number {
  const raw = process.env.TRIGGER_SERVICE_CANARY_PERCENT;
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
}

/**
 * Canary routing is keyed on workflowId (not userId) — triggers are per-workflow,
 * not per-user, so fnv1a(workflowId) gives deterministic per-workflow routing.
 */
export function shouldUseTriggerService(workflowId: string): boolean {
  if (!isTriggerServiceEnabled()) return false;
  const pct = getTriggerCanaryPercent();
  if (pct <= 0) return false;
  if (pct >= 100) return true;
  return fnv1a(workflowId) % 100 < pct;
}

export function getBaseUrl(): string {
  return process.env.TRIGGER_SERVICE_URL?.replace(/\/$/, '') ?? 'http://localhost:3006';
}

function getServiceKey(): string {
  return process.env.TRIGGER_SERVICE_KEY ?? '';
}

function serviceHeaders(workflowId?: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const k = getServiceKey();
  if (k) h['x-service-key'] = k;
  if (workflowId) h['x-workflow-id'] = workflowId;
  return h;
}

// ── Shared request helper ─────────────────────────────────────────────────────

async function servicePost<T>(path: string, workflowId: string, body: unknown): Promise<T | null> {
  if (!isTriggerServiceEnabled()) return null;
  if (!triggerBreaker.canAttempt()) {
    logger.warnObj({ path, workflowId }, 'trigger-service circuit OPEN — monolith fallback');
    return null;
  }
  try {
    const res = await fetch(`${getBaseUrl()}${path}`, {
      method: 'POST',
      headers: serviceHeaders(workflowId),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      triggerBreaker.recordFailure();
      incTriggerServiceDelegation('miss');
      return null;
    }
    triggerBreaker.recordSuccess();
    incTriggerServiceDelegation('hit');
    return (await res.json()) as T;
  } catch {
    triggerBreaker.recordFailure();
    incTriggerServiceDelegation('error');
    return null;
  }
}

// ── Result types ──────────────────────────────────────────────────────────────

export interface TriggerDispatchResult {
  executionId: string;
  status: 'queued' | 'running';
  workflowId: string;
}

// ── Remote methods (Phase 1: all return null — service stubs 501) ─────────────

/**
 * Dispatch a webhook trigger via trigger-service.
 * Phase 1: always returns null (service stubs 501).
 * Phase 2: wire into worker/src/api/webhook-trigger.ts when canary routes the workflowId.
 */
export async function dispatchWebhookRemote(
  workflowId: string,
  payload: { headers: Record<string, string>; body: unknown; method: string },
): Promise<TriggerDispatchResult | null> {
  return servicePost<TriggerDispatchResult>(
    `/triggers/webhook/${workflowId}`,
    workflowId,
    payload,
  );
}

/**
 * Dispatch a form submission trigger via trigger-service.
 * Phase 1: always returns null.
 * Phase 2: wire into worker/src/api/form-trigger.ts.
 */
export async function dispatchFormRemote(
  workflowId: string,
  nodeId: string,
  payload: { fields: Record<string, unknown> },
): Promise<TriggerDispatchResult | null> {
  return servicePost<TriggerDispatchResult>(
    `/triggers/form/${workflowId}/${nodeId}/submit`,
    workflowId,
    payload,
  );
}

/**
 * Dispatch a chat trigger message via trigger-service.
 * Phase 1: always returns null.
 * Phase 2: wire into worker/src/api/chat-trigger.ts.
 */
export async function dispatchChatRemote(
  workflowId: string,
  nodeId: string,
  payload: { message: string; sessionId?: string; metadata?: Record<string, unknown> },
): Promise<TriggerDispatchResult | null> {
  return servicePost<TriggerDispatchResult>(
    `/triggers/chat/${workflowId}/${nodeId}/message`,
    workflowId,
    payload,
  );
}

/**
 * Dispatch a scheduled trigger via trigger-service.
 * Phase 1: always returns null.
 * Phase 3: wire into worker/src/services/scheduler/.
 */
export async function dispatchScheduleRemote(
  workflowId: string,
  payload: { scheduledAt: string; cron?: string },
): Promise<TriggerDispatchResult | null> {
  return servicePost<TriggerDispatchResult>(
    `/triggers/schedule/${workflowId}`,
    workflowId,
    payload,
  );
}
