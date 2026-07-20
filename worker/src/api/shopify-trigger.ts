import { Request, Response } from 'express';
import { config } from '../core/config';
import { getDbClient } from '../core/database/aws-db-client';
import { normalizeExecutionStatus, normalizeExecutionTrigger } from '../core/execution/execution-db-enums';
import { logger } from '../core/logger';
import {
  buildShopifyExecutionInput,
  getShopifyDeliveryHeaders,
  getShopifyHmacHeader,
  getShopifyWebhookUrl,
  normalizeShopifyEvent,
  registerShopifyWebhooks,
  shouldAcceptShopifyEvent,
  unregisterShopifyWebhooks,
  validateShopifyWebhookSecret,
  type ShopifyTriggerConfig,
} from '../services/shopify/shopify-trigger-service';

function getAuthenticatedUserId(req: Request): string {
  const id = (req as any).user?.id || req.body?.userId || req.query.user_id;
  if (!id || typeof id !== 'string') throw Object.assign(new Error('Authenticated user is required'), { statusCode: 401 });
  return id;
}

function nodeTypeOf(node: any): string {
  return String(node?.data?.type || node?.type || '').trim();
}

function nodeConfigOf(node: any): ShopifyTriggerConfig {
  return (node?.data?.config || node?.config || {}) as ShopifyTriggerConfig;
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

function findShopifyTriggerNode(workflow: any, nodeId: string): any {
  const node = workflowNodes(workflow).find((candidate) => String(candidate?.id || '') === nodeId);
  if (!node || nodeTypeOf(node) !== 'shopify_trigger') {
    throw Object.assign(new Error('Shopify Trigger node not found in this workflow.'), { statusCode: 404 });
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
      trigger: normalizeExecutionTrigger('shopify', 'webhook'),
      input: input.executionInput,
      logs: [],
      started_at: new Date().toISOString(),
      metadata: {
        originalTrigger: 'shopify',
        triggerNodeId: input.nodeId,
      },
    })
    .select()
    .single();

  if (error || !execution) {
    logger.error('[Shopify Trigger] Execution creation error:', error);
    throw Object.assign(new Error('Failed to create workflow execution.'), { statusCode: 500 });
  }

  const executeUrl = config.publicBaseUrl
    ? `${String(config.publicBaseUrl).replace(/\/+$/, '')}/api/execute-workflow`
    : null;

  if (!executeUrl) {
    const message = 'PUBLIC_BASE_URL is required to execute Shopify-triggered workflows.';
    await markExecutionFailed(db, execution.id, message);
    throw Object.assign(new Error(message), { statusCode: 500 });
  }

  fetch(executeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Shopify-Execution': 'true',
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
    const message = `Shopify trigger handoff failed (${response.status}): ${details || response.statusText}`;
    logger.error('[Shopify Trigger] Error triggering workflow execution:', message);
    await markExecutionFailed(db, execution.id, message);
  }).catch(async (err) => {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('[Shopify Trigger] Error triggering workflow execution:', err);
    await markExecutionFailed(db, execution.id, `Shopify trigger handoff failed: ${message}`);
  });

  return execution;
}

export async function shopifyWebhookInfoHandler(req: Request, res: Response) {
  try {
    const workflowId = String(req.params.workflowId || '');
    const nodeId = String(req.params.nodeId || '');
    if (!workflowId || !nodeId) {
      return res.status(400).json({ error: 'workflowId and nodeId are required.' });
    }
    await loadWorkflow(workflowId).then((workflow) => findShopifyTriggerNode(workflow, nodeId));
    return res.json({
      success: true,
      webhookUrl: getShopifyWebhookUrl(workflowId, nodeId),
      message: 'This URL is registered automatically as a Shopify Admin API webhook when the workflow is active. Shopify signs POST bodies with X-Shopify-Hmac-Sha256.',
    });
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    return res.status(statusCode).json({ error: message });
  }
}

export async function shopifyWebhookHandler(req: Request, res: Response) {
  try {
    const workflowId = String(req.params.workflowId || '');
    const nodeId = String(req.params.nodeId || '');
    if (!workflowId || !nodeId) {
      return res.status(400).json({ error: 'workflowId and nodeId are required.' });
    }

    const deliveryHeaders = getShopifyDeliveryHeaders(req);
    const rawBody: Buffer = Buffer.isBuffer((req as any).rawBody) ? (req as any).rawBody : Buffer.from(JSON.stringify(req.body || {}));
    if (!await validateShopifyWebhookSecret({
      workflowId,
      nodeId,
      rawBody,
      hmacHeader: getShopifyHmacHeader(req),
      topic: deliveryHeaders.topic,
      shopDomain: deliveryHeaders.shopDomain,
    })) {
      return res.status(401).json({ error: 'Invalid Shopify webhook signature.' });
    }

    const workflow = await loadWorkflow(workflowId);
    if (workflow.status !== 'active') {
      return res.status(200).json({ message: 'Workflow is not active.' });
    }

    const node = findShopifyTriggerNode(workflow, nodeId);
    const triggerConfig = nodeConfigOf(node) as ShopifyTriggerConfig;

    const normalized = normalizeShopifyEvent(req.body || {}, deliveryHeaders);
    if (!normalized) {
      return res.status(200).json({ message: 'Ignored non-actionable Shopify payload.' });
    }

    if (!shouldAcceptShopifyEvent(normalized, triggerConfig).accepted) {
      return res.status(200).json({ message: 'Ignored Shopify event not matching this trigger.' });
    }

    const executionInput = buildShopifyExecutionInput({ workflowId, nodeId, normalized });
    const execution = await startWorkflowExecution({ workflow, workflowId, nodeId, executionInput });

    return res.status(202).json({ success: true, executionId: execution.id, status: 'running' });
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[Shopify Trigger] Webhook error:', error);
    return res.status(statusCode).json({ error: message });
  }
}

export async function shopifyRegisterWebhookHandler(req: Request, res: Response) {
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

    const node = findShopifyTriggerNode(workflow, nodeId);
    const triggerConfig = {
      ...nodeConfigOf(node),
      ...(req.body?.shopDomain ? { shopDomain: req.body.shopDomain } : {}),
      ...(req.body?.topics ? { topics: req.body.topics } : {}),
    } as ShopifyTriggerConfig;

    const result = await registerShopifyWebhooks({
      userId,
      workflowId,
      nodeId,
      triggerConfig,
    });
    return res.json(result);
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    return res.status(statusCode).json({ error: message });
  }
}

export async function shopifyUnregisterWebhookHandler(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req);
    const workflowId = String(req.body?.workflowId || '');
    const nodeId = String(req.body?.nodeId || '');
    if (!workflowId || !nodeId) {
      return res.status(400).json({ error: 'workflowId and nodeId are required.' });
    }
    const result = await unregisterShopifyWebhooks({ userId, workflowId, nodeId });
    return res.json(result);
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    return res.status(statusCode).json({ error: message });
  }
}
