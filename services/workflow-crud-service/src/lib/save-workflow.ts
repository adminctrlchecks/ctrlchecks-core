/**
 * save-workflow.ts — core save logic for workflow-crud-service.
 *
 * Ported from worker/src/api/save-workflow.ts.
 *
 * The worker already runs full registry-aware validation before delegating via canary.
 * This module adds a lite structural validation as a backstop, then persists.
 */

import { randomUUID } from 'crypto';
import { buildSyncedGraphPayload } from './workflow-graph-state';
import { normalizeWorkflowForSaveLite, validateWorkflowForSaveLite } from './workflow-validator-lite';
import {
  getWorkflowById,
  getWorkflowByIdForOwnerCheck,
  insertWorkflow,
  updateWorkflow,
  insertVersionSnapshot,
  ensureFreeSubscription,
  checkWorkflowLimit,
  WorkflowRow,
} from './workflow-repo';

export interface SaveWorkflowInput {
  workflowId?: string;
  name: string;
  nodes: unknown[];
  edges: unknown[];
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  userId: string;
}

export interface SaveWorkflowResponse {
  success: true;
  workflowId: string;
  workflow: WorkflowRow;
  validation: {
    valid: boolean;
    warnings: string[];
    migrationsApplied: string[];
  };
}

export type SaveWorkflowError =
  | { type: 'bad_input'; message: string }
  | { type: 'validation_failed'; errors: string[]; warnings: string[]; migrationsApplied: string[] }
  | { type: 'not_found'; message: string }
  | { type: 'forbidden'; message: string }
  | { type: 'quota_exceeded'; message: string; details: Record<string, unknown> }
  | { type: 'db_error'; message: string };

export type SaveResult =
  | { ok: true; data: SaveWorkflowResponse }
  | { ok: false; httpStatus: number; error: SaveWorkflowError };

export async function saveWorkflow(input: SaveWorkflowInput): Promise<SaveResult> {
  const { workflowId, name, nodes, edges, settings, metadata, userId } = input;

  // ── Input validation ──────────────────────────────────────────────────────
  if (!name || typeof name !== 'string' || !name.trim()) {
    return { ok: false, httpStatus: 400, error: { type: 'bad_input', message: 'Workflow name is required' } };
  }
  if (!Array.isArray(nodes)) {
    return { ok: false, httpStatus: 400, error: { type: 'bad_input', message: 'Nodes must be an array' } };
  }
  if (!Array.isArray(edges)) {
    return { ok: false, httpStatus: 400, error: { type: 'bad_input', message: 'Edges must be an array' } };
  }

  // ── Lite normalize + validate ─────────────────────────────────────────────
  const normalized = normalizeWorkflowForSaveLite(nodes as any[], edges as any[]);
  const validation = validateWorkflowForSaveLite(normalized.nodes, normalized.edges);

  if (!validation.canSave) {
    return {
      ok: false,
      httpStatus: 400,
      error: {
        type: 'validation_failed',
        errors: validation.errors,
        warnings: validation.warnings,
        migrationsApplied: normalized.migrationsApplied,
      },
    };
  }

  // ── Subscription limit check (CREATE only) ────────────────────────────────
  let previousWorkflow: WorkflowRow | null = null;

  if (workflowId) {
    // UPDATE — verify ownership
    const existing = await getWorkflowByIdForOwnerCheck(workflowId).catch(() => null);
    if (!existing) {
      return { ok: false, httpStatus: 404, error: { type: 'not_found', message: 'Workflow not found' } };
    }
    if (existing.user_id !== userId) {
      return { ok: false, httpStatus: 403, error: { type: 'forbidden', message: 'Forbidden' } };
    }
    previousWorkflow = await getWorkflowById(workflowId, userId).catch(() => null);
  } else {
    // CREATE — ensure subscription exists, then check quota via DB RPCs (same as worker)
    await ensureFreeSubscription(userId);
    const quota = await checkWorkflowLimit(userId);
    if (!quota.canCreate) {
      return {
        ok: false,
        httpStatus: 403,
        error: {
          type: 'quota_exceeded',
          message: `You've reached your workflow limit (${quota.limitCount}). Upgrade your plan to create more workflows.`,
          details: {
            workflowsUsed: quota.currentCount,
            workflowLimit: quota.limitCount,
            planName: quota.planName,
            upgradeUrl: '/subscriptions',
          },
        },
      };
    }
  }

  // ── Merge metadata (don't wipe previousWorkflow metadata) ─────────────────
  const prevMeta = (previousWorkflow?.metadata ?? {}) as Record<string, unknown>;
  const incomingMeta = metadata ?? {};
  const mergedMetadata: Record<string, unknown> = { ...prevMeta, ...incomingMeta };

  // ── Build row ──────────────────────────────────────────────────────────────
  const now = new Date().toISOString();
  const graphPayload = buildSyncedGraphPayload(normalized.nodes, normalized.edges, mergedMetadata);

  const baseData: Record<string, unknown> = {
    name: name.trim(),
    nodes: JSON.stringify(normalized.nodes),
    edges: JSON.stringify(normalized.edges),
    updated_at: now,
    schema_version: 2,
    settings: JSON.stringify(settings ?? {}),
    graph: JSON.stringify(graphPayload),
    metadata: JSON.stringify(mergedMetadata),
    user_id: userId,
  };

  // ── Persist ────────────────────────────────────────────────────────────────
  let savedWorkflow: WorkflowRow;

  if (workflowId) {
    const updated = await updateWorkflow(workflowId, userId, baseData).catch((err) => {
      throw new Error(`Update failed: ${err instanceof Error ? err.message : err}`);
    });
    if (!updated) {
      return { ok: false, httpStatus: 404, error: { type: 'not_found', message: 'Workflow not found or already deleted' } };
    }
    savedWorkflow = updated;
  } else {
    const newData: Record<string, unknown> = {
      ...baseData,
      id: randomUUID(),
      created_at: now,
      confirmed: true,
      setup_completed: true,
      setup_stage: 'complete',
      setup_completed_at: now,
      quota_source: 'subscription',
    };
    savedWorkflow = await insertWorkflow(newData).catch((err) => {
      throw new Error(`Insert failed: ${err instanceof Error ? err.message : err}`);
    });
  }

  // ── Version snapshot (non-critical) ───────────────────────────────────────
  void insertVersionSnapshot({
    workflowId: savedWorkflow.id,
    nodes: normalized.nodes,
    edges: normalized.edges,
    settings: settings ?? {},
    metadata: mergedMetadata,
    userId,
    description: workflowId ? 'Workflow updated' : 'Workflow created',
  });

  return {
    ok: true,
    data: {
      success: true,
      workflowId: savedWorkflow.id,
      workflow: savedWorkflow,
      validation: {
        valid: validation.valid,
        warnings: validation.warnings,
        migrationsApplied: normalized.migrationsApplied,
      },
    },
  };
}
