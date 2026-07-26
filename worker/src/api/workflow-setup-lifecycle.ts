import { Request, Response } from 'express';
import { getDbClient } from '../core/database/aws-db-client';
import {
  normalizeWorkflowForSave,
  validateEditorOpenReadiness,
  validateWorkflowForSave,
} from '../core/validation/workflow-save-validator';
import { buildSyncedGraphPayload, resolveWorkflowGraphState } from './workflow-graph-state';
import { workflowLifecycleManager } from '../services/workflow-lifecycle-manager';
import { subscriptionService } from '../services/subscription-service';
import { geminiWalletService } from '../services/ai/gemini-wallet-service';
import { getCacheRedisClient, invalidateWorkflowDbCache } from '../middleware/redisGetCache';

export function isSetupPending(workflow: any): boolean {
  if (!workflow) return false;
  if (workflow.setup_completed === false) return true;
  const metadata = workflow.metadata && typeof workflow.metadata === 'object' ? workflow.metadata : {};
  return Boolean((metadata as any)?.aiSetup?.pending === true);
}

export function setupPendingResponse(workflowId?: string) {
  return {
    code: 'WORKFLOW_SETUP_PENDING',
    error: 'Workflow setup is not complete',
    message: 'Finish the workflow setup before opening or running this workflow.',
    workflowId,
  };
}

export function assertVisibleWorkflow(workflow: any): void {
  if (isSetupPending(workflow)) {
    const err: any = new Error('Workflow setup is not complete');
    err.statusCode = 409;
    err.body = setupPendingResponse(workflow?.id);
    throw err;
  }
}

async function requireUserId(req: Request): Promise<string> {
  const { requireAuthenticatedUser } = await import('../core/utils/check-google-auth');
  return requireAuthenticatedUser(req);
}

function metadataWithAiSetupState(
  metadata: unknown,
  pending: boolean,
  stage?: string,
  readiness?: Record<string, unknown>
): Record<string, unknown> {
  const base = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? { ...(metadata as Record<string, unknown>) }
    : {};
  const aiSetup = base.aiSetup && typeof base.aiSetup === 'object' && !Array.isArray(base.aiSetup)
    ? { ...(base.aiSetup as Record<string, unknown>) }
    : {};
  base.aiSetup = {
    ...aiSetup,
    pending,
    stage: stage || (pending ? 'ai_setup_pending' : 'complete'),
    ...(readiness ? { readiness } : {}),
    updatedAt: new Date().toISOString(),
  };
  return base;
}

function metadataWithPendingMarker(metadata: unknown, pending: boolean): Record<string, unknown> {
  return metadataWithAiSetupState(metadata, pending);
}

export async function setupDraftWorkflowHandler(req: Request, res: Response) {
  const db = getDbClient();
  let userId: string;
  try {
    userId = await requireUserId(req);
  } catch (authError: any) {
    return res.status(401).json(authError);
  }

  const { workflowId, name, nodes, edges, metadata } = req.body || {};
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    return res.status(400).json({
      code: 'INVALID_WORKFLOW_SETUP_DRAFT',
      error: 'Invalid workflow structure',
      message: 'nodes and edges must be arrays',
    });
  }

  const normalized = normalizeWorkflowForSave(nodes, edges);
  const editorOpenReadiness = validateEditorOpenReadiness(normalized.nodes, normalized.edges);
  const validation = validateWorkflowForSave(normalized.nodes, normalized.edges, {
    freezeBoundary: { frozen: false },
  });

  if (!editorOpenReadiness.ready) {
    return res.status(400).json({
      code: 'WORKFLOW_SETUP_DRAFT_INVALID',
      error: 'Workflow graph is not safe to open',
      message: `Cannot create setup draft: ${editorOpenReadiness.errors.join('; ')}`,
      details: {
        editorOpenReadiness,
        legacyValidation: {
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
        },
      },
    });
  }

  const mergedMetadata = metadataWithPendingMarker(metadata, true);
  const workflowData = {
    name: typeof name === 'string' && name.trim() ? name.trim() : 'AI Generated Workflow',
    nodes: normalized.nodes,
    edges: normalized.edges,
    graph: buildSyncedGraphPayload(normalized.nodes, normalized.edges, mergedMetadata),
    metadata: mergedMetadata,
    user_id: userId,
    status: 'draft',
    phase: 'draft',
    confirmed: false,
    setup_completed: false,
    setup_stage: 'ai_setup_pending',
    setup_completed_at: null,
    updated_at: new Date().toISOString(),
    schema_version: 2,
  };

  if (workflowId) {
    const { data: existing, error: existingError } = await db
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (existingError || !existing) {
      const { data, error } = await db
        .from('workflows')
        .insert({ id: workflowId, ...workflowData } as any)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: 'Failed to create setup draft', message: error.message });
      }

      return res.json({
        success: true,
        workflowId: data.id,
        workflow: data,
        validation: {
          valid: editorOpenReadiness.ready,
          errors: editorOpenReadiness.errors,
          warnings: [
            ...editorOpenReadiness.warnings,
            ...validation.errors,
            ...validation.warnings,
          ],
        },
        editorOpenReadiness,
        diagnostics: {
          legacyValidation: validation,
        },
      });
    }
    if ((existing as any).user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden', workflowId });
    }
    if (!isSetupPending(existing)) {
      return res.status(409).json({
        code: 'WORKFLOW_ALREADY_COMMITTED',
        error: 'Workflow setup is already complete',
        workflowId,
      });
    }

    const { data, error } = await db
      .from('workflows')
      .update(workflowData as any)
      .eq('id', workflowId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update setup draft', message: error.message });
    }

    return res.json({
      success: true,
      workflowId: data.id,
      workflow: data,
      validation: {
        valid: editorOpenReadiness.ready,
        errors: editorOpenReadiness.errors,
        warnings: [
          ...editorOpenReadiness.warnings,
          ...validation.errors,
          ...validation.warnings,
        ],
      },
      editorOpenReadiness,
      diagnostics: {
        legacyValidation: validation,
      },
    });
  }

  const { data, error } = await db
    .from('workflows')
    .insert(workflowData as any)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: 'Failed to create setup draft', message: error.message });
  }

  return res.json({
    success: true,
    workflowId: data.id,
    workflow: data,
    validation: {
      valid: editorOpenReadiness.ready,
      errors: editorOpenReadiness.errors,
      warnings: [
        ...editorOpenReadiness.warnings,
        ...validation.errors,
        ...validation.warnings,
      ],
    },
    editorOpenReadiness,
    diagnostics: {
      legacyValidation: validation,
    },
  });
}

// Deduplicate concurrent commit-setup calls for the same workflow.
// Each workflowId maps to the promise of the in-progress handler so that later
// concurrent callers wait for the first one and return the same result instead of
// all racing to write conflicting DB snapshots.
const commitSetupInFlight = new Map<string, Promise<{ statusCode: number; body: unknown }>>();

export async function runCommitSetupWorkflow(
  req: Request
): Promise<{ statusCode: number; body: unknown }> {
  const db = getDbClient();
  let userId: string;
  try {
    userId = await requireUserId(req);
  } catch (authError: any) {
    return { statusCode: 401, body: authError };
  }

  const { workflowId } = req.params;
  const { data: workflow, error } = await db
    .from('workflows')
    .select('*')
    .eq('id', workflowId)
    .single();

  if (error || !workflow) {
    return { statusCode: 404, body: { error: 'Workflow not found', workflowId } };
  }
  if ((workflow as any).user_id !== userId) {
    return { statusCode: 403, body: { error: 'Forbidden', workflowId } };
  }

  const graph = resolveWorkflowGraphState(workflow as any);
  const candidate = {
    nodes: Array.isArray(graph.nodes) ? graph.nodes : [],
    edges: Array.isArray(graph.edges) ? graph.edges : [],
    metadata: (workflow as any).metadata || {},
  };
  const editorOpenReadiness = validateEditorOpenReadiness(candidate.nodes as any, candidate.edges as any);
  if (!editorOpenReadiness.ready) {
    const errorSummary = editorOpenReadiness.errors.length
      ? editorOpenReadiness.errors.join(' | ')
      : 'Workflow graph is not safe to open in the editor';
    return { statusCode: 409, body: {
      code: 'WORKFLOW_EDITOR_OPEN_BLOCKED',
      error: 'Workflow graph is not safe to open',
      message: errorSummary,
      workflowId,
      details: { editorOpenReadiness },
    }};
  }

  const readiness = await workflowLifecycleManager.validateExecutionReady(candidate as any, userId);
  const missingInputs = workflowLifecycleManager.discoverNodeInputs(candidate as any).inputs;
  const existingMigrationsForCommit: string[] = (workflow as any)?.metadata?.appliedMigrations ?? [];
  const normalizedForCommit = normalizeWorkflowForSave(candidate.nodes, candidate.edges, {
    structuralMode: 'configOnly',
    alreadyApplied: existingMigrationsForCommit,
  });
  const allMigrationsAfterCommit = Array.from(new Set([
    ...existingMigrationsForCommit,
    ...normalizedForCommit.migrationsApplied,
  ]));

  if (!readiness.ready) {
    const wasSetupPendingSoft = isSetupPending(workflow);
    const walletActiveSoft = await geminiWalletService.isActive(userId).catch(() => false);
    if (wasSetupPendingSoft) {
      await subscriptionService.ensureFreeSubscription(userId);
      const canCreateWorkflow = walletActiveSoft || await subscriptionService.canCreateWorkflow(userId);
      if (!canCreateWorkflow) {
        const usage = await subscriptionService.getSubscriptionUsage(userId);
        return { statusCode: 403, body: {
          code: 'WORKFLOW_LIMIT_EXCEEDED',
          error: 'Workflow Limit Exceeded',
          message: `You've reached your workflow limit (${usage.workflowLimit}). Upgrade your plan to create more workflows.`,
          details: usage,
        }};
      }
    }

    const missingCredentialCount = readiness.missingCredentials?.length ?? 0;
    const setupStage =
      missingInputs.length > 0 && missingCredentialCount > 0
        ? 'setup_pending'
        : missingInputs.length > 0
          ? 'inputs_pending'
          : 'credentials_pending';
    const softPhase = missingInputs.length > 0 ? 'configuring_inputs' : 'ready_for_ownership';
    const softMetadata = {
      ...metadataWithAiSetupState((workflow as any).metadata, false, setupStage, {
        editorOpenReadiness,
        setupReadiness: {
          ready: false,
          missingInputs,
          missingCredentials: readiness.missingCredentials || [],
        },
        executionReadiness: readiness,
      }),
      appliedMigrations: allMigrationsAfterCommit,
    };
    const { error: softUpdateError } = await db
      .from('workflows')
      .update({
        status: 'active',
        phase: softPhase,
        confirmed: true,
        setup_completed: true,
        setup_stage: setupStage,
        setup_completed_at: new Date().toISOString(),
        metadata: softMetadata,
        graph: buildSyncedGraphPayload(normalizedForCommit.nodes, normalizedForCommit.edges, softMetadata),
        nodes: normalizedForCommit.nodes,
        edges: normalizedForCommit.edges,
        quota_source: walletActiveSoft ? 'gemini_wallet' : 'subscription',
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', workflowId);

    if (softUpdateError) {
      return { statusCode: 500, body: { error: 'Failed to commit workflow setup', message: softUpdateError.message } };
    }

    const cacheClientSoft = await getCacheRedisClient(process.env.REDIS_URL || 'redis://redis:6379');
    if (cacheClientSoft) {
      await invalidateWorkflowDbCache(cacheClientSoft).catch(() => {});
    }

    if (wasSetupPendingSoft && !walletActiveSoft) {
      await subscriptionService.incrementWorkflowCount(userId);
    }

    return { statusCode: 200, body: {
      success: true,
      workflowId,
      ready: false,
      setupPending: true,
      credentialsPending: missingCredentialCount > 0,
      inputsPending: missingInputs.length > 0,
      missingInputs,
      missingCredentials: readiness.missingCredentials,
      editorOpenReadiness,
      executionReadiness: readiness,
      phase: softPhase,
    }};
  }

  const wasSetupPending = isSetupPending(workflow);
  const walletActive = await geminiWalletService.isActive(userId).catch(() => false);

  if (wasSetupPending) {
    await subscriptionService.ensureFreeSubscription(userId);
    const canCreateWorkflow = walletActive || await subscriptionService.canCreateWorkflow(userId);
    if (!canCreateWorkflow) {
      const usage = await subscriptionService.getSubscriptionUsage(userId);
      return { statusCode: 403, body: {
        code: 'WORKFLOW_LIMIT_EXCEEDED',
        error: 'Workflow Limit Exceeded',
        message: `You've reached your workflow limit (${usage.workflowLimit}). Upgrade your plan to create more workflows.`,
        details: usage,
      }};
    }
  }

  const metadata = {
    ...metadataWithAiSetupState((workflow as any).metadata, false, 'complete', {
      editorOpenReadiness,
      setupReadiness: {
        ready: true,
        missingInputs: [],
        missingCredentials: [],
      },
      executionReadiness: readiness,
    }),
    appliedMigrations: allMigrationsAfterCommit,
  };
  const { data: updated, error: updateError } = await db
    .from('workflows')
    .update({
      status: 'active',
      phase: 'ready_for_execution',
      confirmed: true,
      setup_completed: true,
      setup_stage: 'complete',
      setup_completed_at: new Date().toISOString(),
      metadata,
      quota_source: walletActive ? 'gemini_wallet' : 'subscription',
      graph: buildSyncedGraphPayload(normalizedForCommit.nodes, normalizedForCommit.edges, metadata),
      nodes: normalizedForCommit.nodes,
      edges: normalizedForCommit.edges,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', workflowId)
    .select()
    .single();

  if (updateError) {
    return { statusCode: 500, body: { error: 'Failed to commit workflow setup', message: updateError.message } };
  }

  const cacheClient = await getCacheRedisClient(process.env.REDIS_URL || 'redis://redis:6379');
  if (cacheClient) {
    await invalidateWorkflowDbCache(cacheClient).catch(() => {});
  }

  if (wasSetupPending && !walletActive) {
    await subscriptionService.incrementWorkflowCount(userId);
  }

  return { statusCode: 200, body: {
    success: true,
    workflowId,
    workflow: updated,
    status: (updated as any).status,
    phase: (updated as any).phase,
    ready: true,
  }};
}

export async function commitSetupWorkflowHandler(req: Request, res: Response) {
  const { workflowId } = req.params;

  if (!workflowId) {
    return res.status(400).json({ error: 'Missing workflowId' });
  }

  if (commitSetupInFlight.has(workflowId)) {
    const result = await commitSetupInFlight.get(workflowId)!;
    return res.status(result.statusCode as number).json(result.body);
  }

  let resolveDedup!: (v: { statusCode: number; body: unknown }) => void;
  const dedupPromise = new Promise<{ statusCode: number; body: unknown }>(
    (r) => (resolveDedup = r)
  );
  commitSetupInFlight.set(workflowId, dedupPromise);

  try {
    const result = await runCommitSetupWorkflow(req);
    resolveDedup(result);
    return res.status(result.statusCode as number).json(result.body);
  } catch (err: any) {
    const errResult = { statusCode: 500, body: { error: 'commit-setup failed', message: err?.message } };
    resolveDedup(errResult);
    return res.status(500).json(errResult.body);
  } finally {
    commitSetupInFlight.delete(workflowId);
  }
}
