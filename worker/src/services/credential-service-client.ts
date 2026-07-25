/**
 * credential-service-client.ts
 *
 * Worker-side client for the credential microservice (:3004).
 *
 * Feature flag: CREDENTIAL_SERVICE_ENABLED=true activates delegation.
 * Canary: CREDENTIAL_SERVICE_CANARY_PERCENT (default 0 — must opt in).
 *   0   = disabled (worker vault only)
 *   50  = 50% of userIds routed to credential-service (Phase 2 staging)
 *   100 = all traffic routed to credential-service
 *
 * Routing formula: fnv1a(userId) % 100 < pct  (same as execution-engine canary)
 *
 * Rollback: CREDENTIAL_SERVICE_ENABLED=false + restart worker.
 *
 * See: docs/engineering/credential-service-contract.md
 */

import type { ConnectionRecord, DecryptedConnection } from '../credentials-system/types';
import { incCredentialDelegation } from '../middleware/highScaleMetrics';

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

export function isCredentialServiceEnabled(): boolean {
  return process.env.CREDENTIAL_SERVICE_ENABLED === 'true';
}

/**
 * @returns Canary percent 0–100. Default 0 (must opt in via env).
 */
export function getCanaryPercent(): number {
  const raw = process.env.CREDENTIAL_SERVICE_CANARY_PERCENT;
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
}

/**
 * Returns true if this userId should be routed to the credential service.
 * Deterministic: same userId always maps to the same side of the split.
 */
export function shouldUseCredentialService(userId: string): boolean {
  if (!isCredentialServiceEnabled()) return false;
  const pct = getCanaryPercent();
  if (pct <= 0) return false;
  if (pct >= 100) return true;
  return fnv1a(userId) % 100 < pct;
}

// ── Phase 4 — vault-writes retirement gate ───────────────────────────────────

/**
 * When true: canary users whose remote write returns null get 503 instead of
 * falling back to local vault writes. Prevents double-write during retirement soak.
 * Default: false — set true only after stable soak at CANARY=100.
 */
export function isCredentialVaultWritesDisabled(): boolean {
  return process.env.CREDENTIAL_SERVICE_VAULT_WRITES_DISABLED === 'true';
}

export function getBaseUrl(): string {
  return (process.env.CREDENTIAL_SERVICE_URL ?? 'http://localhost:3004').replace(/\/$/, '');
}

export function getServiceKey(): string {
  return process.env.CREDENTIAL_SERVICE_KEY ?? '';
}

// ── Shared fetch helpers ──────────────────────────────────────────────────────

async function serviceGet<T>(
  path: string,
  userId: string,
  timeout = 5000,
): Promise<T | null> {
  if (!isCredentialServiceEnabled()) return null;
  try {
    const resp = await fetch(`${getBaseUrl()}${path}`, {
      method: 'GET',
      headers: { 'x-service-key': getServiceKey(), 'x-user-id': userId },
      signal: AbortSignal.timeout(timeout),
    });
    if (!resp.ok) {
      console.warn(`[CredentialServiceClient] GET ${path} → ${resp.status}`);
      incCredentialDelegation('miss');
      return null;
    }
    incCredentialDelegation('hit');
    return resp.json() as Promise<T>;
  } catch (err: any) {
    console.warn(`[CredentialServiceClient] GET ${path} error:`, err?.message);
    incCredentialDelegation('error');
    return null;
  }
}

async function servicePost<T>(
  path: string,
  userId: string,
  body: unknown,
  timeout = 5000,
): Promise<T | null> {
  if (!isCredentialServiceEnabled()) return null;
  try {
    const resp = await fetch(`${getBaseUrl()}${path}`, {
      method: 'POST',
      headers: {
        'x-service-key': getServiceKey(),
        'x-user-id': userId,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });
    if (!resp.ok) {
      console.warn(`[CredentialServiceClient] POST ${path} → ${resp.status}`);
      incCredentialDelegation('miss');
      return null;
    }
    incCredentialDelegation('hit');
    return resp.json() as Promise<T>;
  } catch (err: any) {
    console.warn(`[CredentialServiceClient] POST ${path} error:`, err?.message);
    incCredentialDelegation('error');
    return null;
  }
}

async function servicePatch<T>(
  path: string,
  userId: string,
  body: unknown,
  timeout = 5000,
): Promise<T | null> {
  if (!isCredentialServiceEnabled()) return null;
  try {
    const resp = await fetch(`${getBaseUrl()}${path}`, {
      method: 'PATCH',
      headers: {
        'x-service-key': getServiceKey(),
        'x-user-id': userId,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });
    if (!resp.ok) {
      console.warn(`[CredentialServiceClient] PATCH ${path} → ${resp.status}`);
      return null;
    }
    return resp.json() as Promise<T>;
  } catch (err: any) {
    console.warn(`[CredentialServiceClient] PATCH ${path} error:`, err?.message);
    return null;
  }
}

async function serviceDelete(
  path: string,
  userId: string,
  timeout = 5000,
): Promise<boolean> {
  if (!isCredentialServiceEnabled()) return false;
  try {
    const resp = await fetch(`${getBaseUrl()}${path}`, {
      method: 'DELETE',
      headers: { 'x-service-key': getServiceKey(), 'x-user-id': userId },
      signal: AbortSignal.timeout(timeout),
    });
    if (resp.status === 404) return true; // idempotent — already gone
    if (!resp.ok) {
      console.warn(`[CredentialServiceClient] DELETE ${path} → ${resp.status}`);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn(`[CredentialServiceClient] DELETE ${path} error:`, err?.message);
    return false;
  }
}

// ── Remote API calls ──────────────────────────────────────────────────────────

/**
 * List all active connections for a user from the credential service.
 * Returns null when disabled or on any error (caller falls back to worker vault).
 */
export async function listConnectionsRemote(userId: string): Promise<ConnectionRecord[] | null> {
  if (!isCredentialServiceEnabled()) return null;
  try {
    const url = `${getBaseUrl()}/connections`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'x-service-key': getServiceKey(),
        'x-user-id': userId,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) {
      console.warn(`[CredentialServiceClient] GET /connections → ${resp.status}`);
      return null;
    }
    const data = await resp.json() as { connections?: ConnectionRecord[] };
    return data.connections ?? null;
  } catch (err: any) {
    console.warn('[CredentialServiceClient] listConnectionsRemote error:', err?.message);
    return null;
  }
}

/**
 * Create a new connection in the credential service.
 * Returns the created ConnectionRecord on success, null on error/disabled.
 */
export async function createConnectionRemote(
  userId: string,
  data: {
    name: string;
    credentialTypeId: string;
    provider: string;
    authType: string;
    credentials?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    expiresAt?: string | null;
  },
): Promise<ConnectionRecord | null> {
  const result = await servicePost<{ connection: ConnectionRecord }>(
    '/connections',
    userId,
    data,
  );
  return result?.connection ?? null;
}

/**
 * Get most recent active connection by provider from the credential service.
 * Returns null when disabled, not found, or on any error.
 */
export async function getConnectionByProviderRemote(
  userId: string,
  provider: string,
): Promise<ConnectionRecord | null> {
  const result = await serviceGet<{ connection: ConnectionRecord }>(
    `/connections/${encodeURIComponent(provider)}`,
    userId,
  );
  return result?.connection ?? null;
}

/**
 * Get a decrypted connection by UUID for worker runtime use.
 * This endpoint is internal-only in the credential service and protected by
 * the service key. Returns null when disabled, not found, or on any error.
 */
export async function getDecryptedConnectionRemote(
  userId: string,
  id: string,
): Promise<DecryptedConnection | null> {
  const result = await serviceGet<{ connection: DecryptedConnection }>(
    `/connections/${encodeURIComponent(id)}/decrypted`,
    userId,
  );
  return result?.connection ?? null;
}

/**
 * Update a connection by UUID in the credential service.
 * Returns the updated ConnectionRecord on success, null on error/disabled.
 */
export async function updateConnectionRemote(
  userId: string,
  id: string,
  data: {
    name?: string;
    credentials?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  },
): Promise<ConnectionRecord | null> {
  const result = await servicePatch<{ connection: ConnectionRecord }>(
    `/connections/${encodeURIComponent(id)}`,
    userId,
    data,
  );
  return result?.connection ?? null;
}

/**
 * Delete a connection by UUID in the credential service.
 * Returns true on success (or 404), false on error/disabled.
 */
export async function deleteConnectionByIdRemote(
  userId: string,
  id: string,
): Promise<boolean> {
  return serviceDelete(`/connections/${encodeURIComponent(id)}`, userId);
}

/**
 * Delete a connection by provider name in the credential service.
 * Returns true on success (or 404), false on error/disabled.
 */
export async function deleteConnectionByProviderRemote(
  userId: string,
  provider: string,
): Promise<boolean> {
  return serviceDelete(`/connections/${encodeURIComponent(provider)}`, userId);
}

/**
 * Test a connection by UUID in the credential service.
 * Returns test result on success, null on error/disabled.
 */
export async function testConnectionRemote(
  userId: string,
  id: string,
): Promise<{ success: boolean; connectionId: string; status: string; expired: boolean; testedAt: string } | null> {
  return servicePost(
    `/connections/${encodeURIComponent(id)}/test`,
    userId,
    {},
  );
}

/**
 * Health-check the credential service.
 * Returns false when disabled or unreachable.
 */
export async function isCredentialServiceHealthy(): Promise<boolean> {
  if (!isCredentialServiceEnabled()) return false;
  try {
    const url = `${getBaseUrl()}/health/live`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return resp.ok;
  } catch {
    return false;
  }
}
