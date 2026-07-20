import { Request, Response } from 'express';
import { config } from '../core/config';
import { getDbClient } from '../core/database/aws-db-client';
import { normalizeExecutionStatus, normalizeExecutionTrigger } from '../core/execution/execution-db-enums';
import { logger } from '../core/logger';
import {
  buildTelegramExecutionInput,
  normalizeTelegramUpdate,
  registerTelegramWebhook,
  shouldAcceptTelegramUpdate,
  unregisterTelegramWebhook,
  validateTelegramSecret,
  type TelegramTriggerConfig,
} from '../services/telegram/telegram-trigger-service';

function getAuthenticatedUserId(req: Request): string {
  const id = (req as any).user?.id || req.body?.userId || req.query.user_id;
  if (!id || typeof id !== 'string') throw Object.assign(new Error('Authenticated user is required'), { statusCode: 401 });
  return id;
}

function nodeTypeOf(node: any): string {
  const dataType = String(node?.data?.type || '').trim();
  const rawType = String(node?.type || '').trim();
  return dataType || rawType;
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

function findTelegramTriggerNode(workflow: any, nodeId: string): any {
  const node = workflowNodes(workflow).find((candidate) => String(candidate?.id || '') === nodeId);
  if (!node || nodeTypeOf(node) !== 'telegram_trigger') {
    throw Object.assign(new Error('Telegram Trigger node not found in this workflow.'), { statusCode: 404 });
  }
  return node;
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
      trigger: normalizeExecutionTrigger('telegram', 'webhook'),
      input: input.executionInput,
      logs: [],
      started_at: startedAt,
      metadata: {
        originalTrigger: 'telegram',
        triggerNodeId: input.nodeId,
      },
    })
    .select()
    .single();

  if (error || !execution) {
    logger.error('[Telegram Trigger] Execution creation error:', error);
    throw Object.assign(new Error('Failed to create workflow execution.'), { statusCode: 500 });
  }

  const executeUrl = config.publicBaseUrl
    ? `${String(config.publicBaseUrl).replace(/\/+$/, '')}/api/execute-workflow`
    : null;
  if (!executeUrl) {
    throw Object.assign(new Error('PUBLIC_BASE_URL is required to execute Telegram-triggered workflows.'), { statusCode: 500 });
  }

  fetch(executeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Telegram-Execution': 'true',
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
    const message = `Telegram trigger handoff failed (${response.status}): ${details || response.statusText}`;
    logger.error('[Telegram Trigger] Error triggering workflow execution:', message);
    await db.from('executions').update({
      status: normalizeExecutionStatus('failed'),
      finished_at: new Date().toISOString(),
      error: message.slice(0, 1000),
    }).eq('id', execution.id);
  }).catch(async (err) => {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('[Telegram Trigger] Error triggering workflow execution:', err);
    await db.from('executions').update({
      status: normalizeExecutionStatus('failed'),
      finished_at: new Date().toISOString(),
      error: `Telegram trigger handoff failed: ${message}`.slice(0, 1000),
    }).eq('id', execution.id);
  });

  return execution;
}

export async function telegramWebhookHandler(req: Request, res: Response) {
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

    const node = findTelegramTriggerNode(workflow, nodeId);
    const triggerConfig = nodeConfigOf(node) as TelegramTriggerConfig;
    if (!validateTelegramSecret(req, triggerConfig)) {
      return res.status(401).json({ error: 'Invalid Telegram webhook secret token.' });
    }

    const normalized = normalizeTelegramUpdate(req.body || {});
    const acceptance = shouldAcceptTelegramUpdate(normalized, triggerConfig);
    if (!acceptance.accepted) {
      return res.json({ success: true, ignored: true, reason: acceptance.reason });
    }

    const executionInput = buildTelegramExecutionInput({ workflowId, nodeId, normalized });
    const execution = await startWorkflowExecution({ workflow, workflowId, nodeId, executionInput });
    return res.json({
      success: true,
      executionId: execution.id,
      status: 'running',
      message: 'Telegram update received, workflow execution started.',
    });
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[Telegram Trigger] Webhook error:', error);
    return res.status(statusCode).json({ error: message });
  }
}

export async function telegramRegisterWebhookHandler(req: Request, res: Response) {
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
    const node = findTelegramTriggerNode(workflow, nodeId);
    const triggerConfig = nodeConfigOf(node) as TelegramTriggerConfig;
    const result = await registerTelegramWebhook({
      userId,
      workflowId,
      nodeId,
      connectionId: String(req.body?.connectionId || triggerConfig.connectionId || ''),
      updateTypes: req.body?.updateTypes || triggerConfig.updateTypes,
      secretToken: String(req.body?.secretToken || triggerConfig.secretToken || ''),
      force: req.body?.force === true,
    });
    return res.json(result);
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    return res.status(statusCode).json({ error: message });
  }
}

export async function telegramUnregisterWebhookHandler(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req);
    const result = await unregisterTelegramWebhook({
      userId,
      connectionId: String(req.body?.connectionId || ''),
      dropPendingUpdates: req.body?.dropPendingUpdates === true,
    });
    return res.json(result);
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    return res.status(statusCode).json({ error: message });
  }
}
