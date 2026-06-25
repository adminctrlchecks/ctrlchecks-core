/**
 * execution-engine-client.ts
 *
 * Feature-flagged client for the execution-engine microservice.
 *
 * When EXECUTION_ENGINE_ENABLED=false (default), all methods return null immediately
 * so the caller falls back to the monolith executor. No network call is made.
 *
 * Canary rollout path (controlled via EXECUTION_ENGINE_CANARY_PERCENT, default 33):
 *   Phase 1  — flag disabled (stub only)
 *   Phase 2  — ENABLED=true, CANARY_PERCENT=33 (default)
 *   Phase 3  — ENABLED=true, CANARY_PERCENT=33, consumer active
 *   Phase 4  — ENABLED=true, CANARY_PERCENT=66 (set on server, no redeploy)
 *   Phase 5  — CANARY_PERCENT=100 then remove monolith fallback
 *   See: docs/engineering/execution-engine-contract.md
 */

import { incExecutionEngineDelegation } from '../middleware/highScaleMetrics';
import { CircuitBreaker } from './circuit-breaker';
import { logger } from '../core/logger';

// Module-level singleton — resets naturally on process restart or jest.resetModules()
const executionEngineBreaker = new CircuitBreaker(
  'execution-engine',
  5,   // windowSize
  3,   // failureThreshold
  60_000, // cooldownMs
);

export interface ExecuteRequest {
  workflowId: string;
  executionId: string;
  input?: Record<string, unknown>;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface ExecuteResponse {
  queued: true;
  executionId: string;
  jobId?: string;
  statusUrl: string;
}

// FNV-1a 32-bit hash — fast, deterministic, no deps
function fnv1a(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/**
 * Returns true when this executionId should be routed to the execution-engine canary.
 * Routing is deterministic (fnv1a hash) so a given executionId always routes the same way.
 * Phase 4: CANARY_PERCENT defaults to 33; set EXECUTION_ENGINE_CANARY_PERCENT=50 on server.
 * Phase 5: set to 100 and remove monolith fallback.
 */
export function isCanaryTarget(executionId: string): boolean {
  if (!isEnabled()) return false;
  const pct = getCanaryPercent();
  if (pct <= 0) return false;
  if (pct >= 100) return true;
  return fnv1a(executionId) % 100 < pct;
}

export function getCanaryPercent(): number {
  const raw = process.env.EXECUTION_ENGINE_CANARY_PERCENT;
  if (!raw) return 33;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 33;
}

function isEnabled(): boolean {
  return process.env.EXECUTION_ENGINE_ENABLED === 'true';
}

function getBaseUrl(): string {
  return (process.env.EXECUTION_ENGINE_URL ?? 'http://localhost:3003').replace(/\/$/, '');
}

function getServiceKey(): string {
  return process.env.EXECUTION_ENGINE_SERVICE_KEY ?? '';
}

/**
 * Delegate an execution to the execution-engine service.
 *
 * Returns null (monolith fallback) when:
 *   - EXECUTION_ENGINE_ENABLED is false
 *   - executionId is not in the canary cohort (fnv1a % 100 >= CANARY_PERCENT)
 *   - The circuit breaker is OPEN (too many recent failures)
 *   - The remote service returns a non-2xx response
 *   - Any network error occurs
 *
 * Caller MUST check for null and fall back to the monolith executor.
 */
export async function delegateExecution(
  req: ExecuteRequest,
): Promise<ExecuteResponse | null> {
  if (!isEnabled()) return null;
  if (!isCanaryTarget(req.executionId)) return null;
  if (!executionEngineBreaker.canAttempt()) {
    logger.warnObj({ executionId: req.executionId }, 'execution-engine circuit OPEN — monolith fallback');
    return null;
  }

  const url = `${getBaseUrl()}/execute`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': getServiceKey(),
      },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      logger.warn(`[execution-engine-client] Remote returned ${response.status} — falling back to monolith`);
      executionEngineBreaker.recordFailure();
      incExecutionEngineDelegation('miss');
      return null;
    }

    executionEngineBreaker.recordSuccess();
    incExecutionEngineDelegation('hit');
    return (await response.json()) as ExecuteResponse;
  } catch (err) {
    logger.warn('[execution-engine-client] Request failed — falling back to monolith:', (err as Error).message);
    executionEngineBreaker.recordFailure();
    incExecutionEngineDelegation('error');
    return null;
  }
}

/**
 * Probe the execution-engine health endpoint.
 * Returns true if the service is reachable and healthy.
 */
export async function isExecutionEngineHealthy(): Promise<boolean> {
  if (!isEnabled()) return false;
  try {
    const res = await fetch(`${getBaseUrl()}/health/ready`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
