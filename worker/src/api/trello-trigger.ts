import { Request, Response } from 'express';
import { config } from '../core/config';
import { getDbClient } from '../core/database/aws-db-client';
import { normalizeExecutionStatus, normalizeExecutionTrigger } from '../core/execution/execution-db-enums';
import { logger } from '../core/logger';
import {
  buildTrelloExecutionInput,
  getTrelloSignatureHeader,
  getTrelloWebhookUrl,
  normalizeTrelloEvent,
  registerTrelloWebhook,
  shouldAcceptTrelloEvent,
  unregisterTrelloWebhook,
  validateTrelloWebhookSecret,
  type TrelloTriggerConfig,
} from '../services/trello/trello-trigger-service';

function getAuthenticatedUserId(req: Request): string {
  const id = (req as any).user?.id || req.body?.userId || req.query.user_id;
  if (!id || typeof id !== 'string') throw Object.assign(new Error('Authenticated user is required'), { statusCode: 401 });
  return id;
}

function nodeTypeOf(node: any): string {
  return String(node?.data?.type || node?.type || '').trim();
}

function nodeConfigOf(node: any): TrelloTriggerConfig {
  return (node?.data?.config || node?.config || {}) as TrelloTriggerConfig;
}

function workflowNodes(workflow: any): any[] {
  const candidates = [workflow?.nodes, workflow?.graph?.nodes, workflow?.definition?.nodes, workflow?.definition?.graph?.nodes];
  for (const value of candidates) if (Array.isArray(value)) return value;
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

function findTrelloTriggerNode(workflow: any, nodeId: string): any {
  const node = workflowNodes(workflow).find((candidate) => String(candidate?.id || '') === nodeId);
  if (!node || nodeTypeOf(node) !== 'trello_trigger') {
    throw Object.assign(new Error('Trello Trigger node not found in this workflow.'), { statusCode: 404 });
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
  const { data: execution, error } = await db
    .from('executions')
    .insert({
      workflow_id: input.workflowId,
      user_id: input.workflow.user_id,
      status: normalizeExecutionStatus('running'),
      trigger: normalizeExecutionTrigger('trello', 'webhook'),
      input: input.executionInput,
      logs: [],
      started_at: new Date().toISOString(),
      metadata: {
        originalTrigger: 'trello',
        triggerNodeId: input.nodeId,
      },
    })
    .select()
    .single();

  if (error || !execution) {
    logger.error('[Trello Trigger] Execution creation error:', error);
    throw Object.assign(new Error('Failed to create workflow execution.'), { statusCode: 500 });
  }

  const executeUrl = config.publicBaseUrl
    ? `${String(config.publicBaseUrl).replace(/\/+$/, '')}/api/execute-workflow`
    : null;

  if (!executeUrl) {
    const message = 'PUBLIC_BASE_URL is required to execute Trello-triggered workflows.';
    await markExecutionFailed(db, execution.id, message);
    throw Object.assign(new Error(message), { statusCode: 500 });
  }

  fetch(executeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Trello-Execution': 'true',
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
    const message = `Trello trigger handoff failed (${response.status}): ${details || response.statusText}`;
    logger.error('[Trello Trigger] Error triggering workflow execution:', message);
    await markExecutionFailed(db, execution.id, message);
  }).catch(async (err) => {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('[Trello Trigger] Error triggering workflow execution:', err);
    await markExecutionFailed(db, execution.id, `Trello trigger handoff failed: ${message}`);
  });

  return execution;
}

export async function trelloWebhookValidationHandler(req: Request, res: Response) {
  const workflowId = String(req.params.workflowId || '');
  const nodeId = String(req.params.nodeId || '');
  if (!workflowId || !nodeId) return res.status(400).end();
  return res.status(200).end();
}

export async function trelloWebhookInfoHandler(req: Request, res: Response) {
  try {
    const workflowId = String(req.params.workflowId || '');
    const nodeId = String(req.params.nodeId || '');
    if (!workflowId || !nodeId) {
      return res.status(400).json({ error: 'workflowId and nodeId are required.' });
    }
    await loadWorkflow(workflowId).then((workflow) => findTrelloTriggerNode(workflow, nodeId));
    return res.json({
      success: true,
      webhookUrl: getTrelloWebhookUrl(workflowId, nodeId),
      message: 'This URL is registered automatically as a Trello webhook for the configured model ID when the workflow is active. Trello will validate it with an HTTP HEAD request before accepting registration.',
    });
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    return res.status(statusCode).json({ error: message });
  }
}

export async function trelloWebhookHandler(req: Request, res: Response) {
  try {
    const workflowId = String(req.params.workflowId || '');
    const nodeId = String(req.params.nodeId || '');
    if (!workflowId || !nodeId) {
      return res.status(400).json({ error: 'workflowId and nodeId are required.' });
    }

    const rawBody: Buffer = Buffer.isBuffer((req as any).rawBody) ? (req as any).rawBody : Buffer.from(JSON.stringify(req.body || {}));
    const signature = getTrelloSignatureHeader(req);
    if (!await validateTrelloWebhookSecret(workflowId, nodeId, rawBody, signature)) {
      return res.status(401).json({ error: 'Invalid Trello webhook signature.' });
    }

    const workflow = await loadWorkflow(workflowId);
    if (workflow.status !== 'active') {
      return res.status(200).json({ message: 'Workflow is not active.' });
    }

    const node = findTrelloTriggerNode(workflow, nodeId);
    const triggerConfig = nodeConfigOf(node) as TrelloTriggerConfig;

    const normalized = normalizeTrelloEvent(req.body || {});
    if (!normalized) {
      return res.status(200).json({ message: 'Ignored non-actionable Trello payload.' });
    }

    if (!shouldAcceptTrelloEvent(normalized, triggerConfig).accepted) {
      return res.status(200).json({ message: 'Ignored Trello event not matching this trigger.' });
    }

    const executionInput = buildTrelloExecutionInput({ workflowId, nodeId, normalized });
    const execution = await startWorkflowExecution({ workflow, workflowId, nodeId, executionInput });

    return res.status(202).json({ success: true, executionId: execution.id, status: 'running' });
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[Trello Trigger] Webhook error:', error);
    return res.status(statusCode).json({ error: message });
  }
}

export async function trelloRegisterWebhookHandler(req: Request, res: Response) {
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

    const node = findTrelloTriggerNode(workflow, nodeId);
    const triggerConfig = nodeConfigOf(node) as TrelloTriggerConfig;

    const result = await registerTrelloWebhook({
      userId,
      workflowId,
      nodeId,
      modelId: String(req.body?.modelId || triggerConfig.modelId || triggerConfig.boardId || ''),
      eventTypes: req.body?.eventTypes || triggerConfig.eventTypes,
    });
    return res.json(result);
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    return res.status(statusCode).json({ error: message });
  }
}

export async function trelloUnregisterWebhookHandler(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req);
    const workflowId = String(req.body?.workflowId || '');
    const nodeId = String(req.body?.nodeId || '');
    if (!workflowId || !nodeId) {
      return res.status(400).json({ error: 'workflowId and nodeId are required.' });
    }
    const result = await unregisterTrelloWebhook({ userId, workflowId, nodeId });
    return res.json(result);
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    return res.status(statusCode).json({ error: message });
  }
}
