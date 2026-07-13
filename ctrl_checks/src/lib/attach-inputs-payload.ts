/**
 * Shared helpers for POST /api/workflows/:id/attach-inputs body shape.
 * Worker accepts flat keys (`config_<nodeId>_<field>`) or nested `{ [nodeId]: { field: value } }`.
 */

import { isEffectivelyEmptyValue } from '@/lib/workflow-value-readiness';

/** Meta keys under `node.data.config` that must persist with attach-inputs (ownership / fill mode). */
export const ATTACH_INPUTS_PERSISTABLE_META_KEYS = new Set([
  '_fillMode',
  '_ownershipUnlock',
  '_fieldEnabled',
]);

export function extractNodeConfigForAttachInputs(
  nodeConfig: Record<string, unknown>,
  options?: { includeOwnershipMeta?: boolean }
): Record<string, unknown> {
  const includeMeta = options?.includeOwnershipMeta !== false;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(nodeConfig)) {
    if (value === undefined || value === null) continue;
    if (key.startsWith('_')) {
      if (includeMeta && ATTACH_INPUTS_PERSISTABLE_META_KEYS.has(key)) {
        out[key] = value;
      }
      continue;
    }
    if (isEffectivelyEmptyValue(value)) continue;
    out[key] = value;
  }
  return out;
}

/**
 * Build nested `inputs` object: `{ [nodeId]: { ...configFields } }` for all nodes that have payload.
 */
export function buildNestedAttachInputsFromNodes(
  nodes: Array<{ id: string; data?: { config?: Record<string, unknown> } }>,
  options?: { includeOwnershipMeta?: boolean }
): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const node of nodes) {
    const cfg = node.data?.config || {};
    const extracted = extractNodeConfigForAttachInputs(cfg as Record<string, unknown>, options);
    if (Object.keys(extracted).length > 0) {
      out[node.id] = extracted;
    }
  }
  return out;
}

export function stableStringifyForAttachInputs(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort();
  const sorted: Record<string, unknown> = {};
  for (const k of keys) {
    const value = obj[k];
    sorted[k] =
      value && typeof value === 'object' && !Array.isArray(value)
        ? JSON.parse(stableStringifyForAttachInputs(value as Record<string, unknown>))
        : value;
  }
  return JSON.stringify(sorted);
}

export function attachInputsPayloadKey(inputs: Record<string, Record<string, unknown>>): string {
  return stableStringifyForAttachInputs(inputs as unknown as Record<string, unknown>);
}

function recentStorageKey(workflowId: string): string {
  return `attach-inputs:last:${workflowId}`;
}

export function wasAttachInputsPayloadRecentlyPersisted(
  workflowId: string,
  inputs: Record<string, Record<string, unknown>>,
  maxAgeMs = 30_000
): boolean {
  try {
    const raw = sessionStorage.getItem(recentStorageKey(workflowId));
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { key?: string; savedAt?: number };
    return parsed.key === attachInputsPayloadKey(inputs) && Date.now() - Number(parsed.savedAt || 0) <= maxAgeMs;
  } catch {
    return false;
  }
}

export function markAttachInputsPayloadPersisted(
  workflowId: string,
  inputs: Record<string, Record<string, unknown>>
): void {
  try {
    sessionStorage.setItem(
      recentStorageKey(workflowId),
      JSON.stringify({ key: attachInputsPayloadKey(inputs), savedAt: Date.now() })
    );
  } catch {
    // Browser storage can be unavailable; dedupe is an optimization only.
  }
}
