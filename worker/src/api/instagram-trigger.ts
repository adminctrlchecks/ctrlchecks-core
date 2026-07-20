import { Request, Response } from 'express';
import { config } from '../core/config';
import { getDbClient } from '../core/database/aws-db-client';
import { normalizeExecutionStatus, normalizeExecutionTrigger } from '../core/execution/execution-db-enums';
import { logger } from '../core/logger';
import {
  buildInstagramExecutionInput,
  normalizeInstagramWebhookPayload,
  registerInstagramWebhook,
  shouldAcceptInstagramEvent,
  unregisterInstagramWebhook,
  validateInstagramSignature,
  validateInstagramVerifyToken,
  type InstagramTriggerConfig,
} from '../services/instagram/instagram-trigger-service';

function getAuthenticatedUserId(req: Request): string {
  const id = (req as any).user?.id || req.body?.userId || req.query.user_id;
  if (!id || typeof id !== 'string') throw Object.assign(new Error('Authenticated user is required'), { statusCode: 401 });
  return id;
}

function nodeTypeOf(node: any): string {
  return String(node?.data?.type || node?.type || '').trim();
}

function nodeConfigOf(node: any): Record<string, unknown> {
  return (node?.data?.config || node?.config || {}) as Record<string, unknown>;
}

function workflowNodes(workflow: any): any[] {
  const candidates = [
    workflow?.nodes,
    workflow?.graph?.nodes,
    workflow?.definition?.nodes,
    workflow?.definition?.graph?.nodes,
  ];
  for (const value of candidates) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

async function loadWorkflow(workflowId: string) {
  const db = getDbClient();
  const { data: workflow, error } = await db
    .from('workflows')
    .select('*')
    .eq('id', workflowId)
    .single();
  if (error || !workflow) {
    throw Object.assign(new Error('Workflow not found'), { statusCode: 404 });
  }
  const { isSetupPending } = await import('./workflow-setup-lifecycle');
  if (isSetupPending(workflow)) {
    throw Object.assign(new Error('Workflow not found'), { statusCode: 404 });
  }
  return workflow;
}

function findInstagramTriggerNode(workflow: any, nodeId: string): any {
  const node = workflowNodes(workflow).find((candidate) => String(candidate?.id || '') === nodeId);
  if (!node || nodeTypeOf(node) !== 'instagram_trigger') {
    throw Object.assign(new Error('Instagram Trigger node not found in this workflow.'), { statusCode: 404 });
  }
  return node;
}

async function markExecutionFailed(db: any, executionId: string, message: string) {
  await db.from('executions').update({
    status: normalizeExecutionStatus('failed'),
    finished_at: new Date().toISOString(),
    error: message.slice(0, 1000),
  }).eq('id', executionId);
}

async function startWorkflowExecution(input: {
  workflow: any;
  workflowId: string;
  nodeId: string;
  executionInput: Record<string, unknown>;
}) {
  const db = getDbClient();
  const startedAt = new Date().toISOString();
  const { data: execution, error } = await db
    .from('executions')
    .insert({
      workflow_id: input.workflowId,
      user_id: input.workflow.user_id,
      status: normalizeExecutionStatus('running'),
      trigger: normalizeExecutionTrigger('instagram', 'webhook'),
      input: input.executionInput,
      logs: [],
      started_at: startedAt,
      metadata: {
        originalTrigger: 'instagram',
        triggerNodeId: input.nodeId,
      },
    })
    .select()
    .single();

  if (error || !execution) {
    logger.error('[Instagram Trigger] Execution creation error:', error);
    throw Object.assign(new Error('Failed to create workflow execution.'), { statusCode: 500 });
  }

  const executeUrl = config.publicBaseUrl
    ? `${String(config.publicBaseUrl).replace(/\/+$/, '')}/api/execute-workflow`
    : null;

  if (!executeUrl) {
    const message = 'PUBLIC_BASE_URL is required to execute Instagram-triggered workflows.';
    await markExecutionFailed(db, execution.id, message);
    throw Object.assign(new Error(message), { statusCode: 500 });
  }

  fetch(executeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Instagram-Execution': 'true',
      'X-Internal-Trigger-Execution': 'true',
    },
    body: JSON.stringify({
      workflowId: input.workflowId,
      executionId: execution.id,
      input: input.executionInput,
    }),
  }).then(async (response) => {
    if (response.ok) return;
    const details = await response.text().catch(() => '');
    const message = `Instagram trigger handoff failed (${response.status}): ${details || response.statusText}`;
    logger.error('[Instagram Trigger] Error triggering workflow execution:', message);
    await markExecutionFailed(db, execution.id, message);
  }).catch(async (err) => {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('[Instagram Trigger] Error triggering workflow execution:', err);
    await markExecutionFailed(db, execution.id, `Instagram trigger handoff failed: ${message}`);
  });

  return execution;
}

export async function instagramWebhookVerifyHandler(req: Request, res: Response) {
  try {
    const workflowId = String(req.params.workflowId || '');
    const nodeId = String(req.params.nodeId || '');
    if (!workflowId || !nodeId) {
      return res.status(400).json({ error: 'workflowId and nodeId are required.' });
    }

    const workflow = await loadWorkflow(workflowId);
    const node = findInstagramTriggerNode(workflow, nodeId);
    const triggerConfig = nodeConfigOf(node) as InstagramTriggerConfig;
    const challenge = validateInstagramVerifyToken(req, triggerConfig);
    if (!challenge) return res.status(403).send('Invalid verify token.');
    return res.status(200).send(challenge);
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[Instagram Trigger] Verification error:', error);
    return res.status(statusCode).json({ error: message });
  }
}

export async function instagramWebhookHandler(req: Request, res: Response) {
  try {
    const workflowId = String(req.params.workflowId || '');
    const nodeId = String(req.params.nodeId || '');
    if (!workflowId || !nodeId) {
      return res.status(400).json({ error: 'workflowId and nodeId are required.' });
    }

    const workflow = await loadWorkflow(workflowId);
    if (workflow.status !== 'active') {
      return res.status(400).json({ error: 'Workflow is not active.' });
    }

    const node = findInstagramTriggerNode(workflow, nodeId);
    const triggerConfig = nodeConfigOf(node) as InstagramTriggerConfig;
    if (!validateInstagramSignature(req, triggerConfig)) {
      return res.status(401).json({ error: 'Invalid Instagram webhook signature.' });
    }

    const normalizedEvents = normalizeInstagramWebhookPayload(req.body || {});
    const acceptedEvents = normalizedEvents.filter((event) => shouldAcceptInstagramEvent(event, triggerConfig).accepted);

    if (acceptedEvents.length === 0) {
      return res.json({
        success: true,
        ignored: true,
        receivedEvents: normalizedEvents.length,
        message: 'Instagram webhook received, no events matched this trigger.',
      });
    }

    const executions = [];
    for (const normalized of acceptedEvents) {
      const executionInput = buildInstagramExecutionInput({ workflowId, nodeId, normalized });
      const execution = await startWorkflowExecution({ workflow, workflowId, nodeId, executionInput });
      executions.push(execution);
    }

    return res.json({
      success: true,
      executionIds: executions.map((execution) => execution.id),
      status: 'running',
      message: 'Instagram webhook received, workflow execution started.',
    });
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[Instagram Trigger] Webhook error:', error);
    return res.status(statusCode).json({ error: message });
  }
}

export async function instagramRegisterWebhookHandler(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req);
    const workflowId = String(req.body?.workflowId || '');
    const nodeId = String(req.body?.nodeId || '');
    if (!workflowId || !nodeId) {
      return res.status(400).json({ error: 'workflowId and nodeId are required.' });
    }

    const workflow = await loadWorkflow(workflowId);
    if (workflow.user_id && workflow.user_id !== userId) {
      return res.status(403).json({ error: 'You do not have access to this workflow.' });
    }

    const node = findInstagramTriggerNode(workflow, nodeId);
    const triggerConfig = nodeConfigOf(node) as InstagramTriggerConfig;
    const result = await registerInstagramWebhook({
      userId,
      workflowId,
      nodeId,
      connectionId: String(req.body?.connectionId || triggerConfig.connectionId || ''),
      instagramBusinessAccountId: String(req.body?.instagramBusinessAccountId || triggerConfig.instagramBusinessAccountId || triggerConfig.pageId || ''),
      eventTypes: req.body?.eventTypes || triggerConfig.eventTypes || triggerConfig.event,
    });
    return res.json(result);
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    return res.status(statusCode).json({ error: message });
  }
}

export async function instagramUnregisterWebhookHandler(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req);
    const result = await unregisterInstagramWebhook({
      userId,
      connectionId: String(req.body?.connectionId || ''),
      instagramBusinessAccountId: String(req.body?.instagramBusinessAccountId || ''),
    });
    return res.json(result);
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    return res.status(statusCode).json({ error: message });
  }
}
