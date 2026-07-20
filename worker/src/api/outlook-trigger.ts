import { Request, Response } from 'express';
import { config } from '../core/config';
import { getDbClient } from '../core/database/aws-db-client';
import { normalizeExecutionStatus, normalizeExecutionTrigger } from '../core/execution/execution-db-enums';
import { logger } from '../core/logger';
import { resolveCredential } from '../services/credential-resolver';
import {
  buildOutlookExecutionInput,
  fetchOutlookResource,
  getOutlookWebhookUrl,
  isOutlookValidationRequest,
  normalizeOutlookNotifications,
  registerOutlookSubscription,
  shouldAcceptOutlookEvent,
  unregisterOutlookSubscription,
  validateOutlookClientState,
  type OutlookResourceKind,
  type OutlookTriggerConfig,
} from '../services/outlook/outlook-trigger-service';

function getAuthenticatedUserId(req: Request): string {
  const id = (req as any).user?.id || req.body?.userId || req.query.user_id;
  if (!id || typeof id !== 'string') throw Object.assign(new Error('Authenticated user is required'), { statusCode: 401 });
  return id;
}

function nodeTypeOf(node: any): string {
  return String(node?.data?.type || node?.type || '').trim();
}

function nodeConfigOf(node: any): OutlookTriggerConfig {
  return (node?.data?.config || node?.config || {}) as OutlookTriggerConfig;
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

function findOutlookTriggerNode(workflow: any, nodeId: string): any {
  const node = workflowNodes(workflow).find((candidate) => String(candidate?.id || '') === nodeId);
  if (!node || nodeTypeOf(node) !== 'outlook_trigger') {
    throw Object.assign(new Error('Outlook Trigger node not found in this workflow.'), { statusCode: 404 });
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
      trigger: normalizeExecutionTrigger('outlook', 'webhook'),
      input: input.executionInput,
      logs: [],
      started_at: new Date().toISOString(),
      metadata: {
        originalTrigger: 'outlook',
        triggerNodeId: input.nodeId,
      },
    })
    .select()
    .single();

  if (error || !execution) {
    logger.error('[Outlook Trigger] Execution creation error:', error);
    throw Object.assign(new Error('Failed to create workflow execution.'), { statusCode: 500 });
  }

  const executeUrl = config.publicBaseUrl
    ? `${String(config.publicBaseUrl).replace(/\/+$/, '')}/api/execute-workflow`
    : null;

  if (!executeUrl) {
    const message = 'PUBLIC_BASE_URL is required to execute Outlook-triggered workflows.';
    await markExecutionFailed(db, execution.id, message);
    throw Object.assign(new Error(message), { statusCode: 500 });
  }

  fetch(executeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Outlook-Execution': 'true',
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
    const message = `Outlook trigger handoff failed (${response.status}): ${details || response.statusText}`;
    logger.error('[Outlook Trigger] Error triggering workflow execution:', message);
    await markExecutionFailed(db, execution.id, message);
  }).catch(async (err) => {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('[Outlook Trigger] Error triggering workflow execution:', err);
    await markExecutionFailed(db, execution.id, `Outlook trigger handoff failed: ${message}`);
  });

  return execution;
}

export async function outlookWebhookInfoHandler(req: Request, res: Response) {
  try {
    const workflowId = String(req.params.workflowId || '');
    const nodeId = String(req.params.nodeId || '');
    if (!workflowId || !nodeId) {
      return res.status(400).json({ error: 'workflowId and nodeId are required.' });
    }
    await loadWorkflow(workflowId).then((workflow) => findOutlookTriggerNode(workflow, nodeId));
    return res.json({
      success: true,
      webhookUrl: getOutlookWebhookUrl(workflowId, nodeId),
      message: 'This URL is registered automatically as a Microsoft Graph subscription notificationUrl when the workflow is active.',
    });
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    return res.status(statusCode).json({ error: message });
  }
}

export async function outlookWebhookHandler(req: Request, res: Response) {
  // Microsoft Graph subscription validation handshake: must be answered fast, before any DB access.
  const validationToken = isOutlookValidationRequest(req);
  if (validationToken) {
    res.status(200).type('text/plain').send(validationToken);
    return;
  }

  try {
    const workflowId = String(req.params.workflowId || '');
    const nodeId = String(req.params.nodeId || '');
    if (!workflowId || !nodeId) {
      return res.status(400).json({ error: 'workflowId and nodeId are required.' });
    }

    // Ack fast — Graph expects a 202 within ~10 seconds or it backs off and eventually removes the subscription.
    res.status(202).json({ success: true });

    const workflow = await loadWorkflow(workflowId).catch(() => null);
    if (!workflow || workflow.status !== 'active') return;

    const node = findOutlookTriggerNode(workflow, nodeId);
    const triggerConfig = nodeConfigOf(node) as OutlookTriggerConfig;
    const notifications = normalizeOutlookNotifications(req.body || {});
    if (!notifications.length) return;

    const userId = String(workflow.user_id);
    const resourceKind: OutlookResourceKind = triggerConfig.resource === 'calendar' ? 'calendar' : 'mail';

    for (const notification of notifications) {
      const validClientState = await validateOutlookClientState(workflowId, nodeId, notification.clientState);
      if (!validClientState) {
        logger.warn('[Outlook Trigger] Ignored notification with invalid clientState', { workflowId, nodeId });
        continue;
      }

      const credential = await resolveCredential({
        userId,
        provider: 'microsoft',
        requiredScopes: ['https://graph.microsoft.com/Mail.Read', 'https://graph.microsoft.com/Calendars.Read'],
      }).catch(() => null);
      if (!credential) continue;

      const normalized = await fetchOutlookResource({
        accessToken: credential.accessToken,
        resourceKind,
        resourceId: notification.resourceId,
        changeType: notification.changeType,
      }).catch(() => null);
      if (!normalized) continue;

      if (!shouldAcceptOutlookEvent(normalized, triggerConfig).accepted) continue;

      const executionInput = buildOutlookExecutionInput({ workflowId, nodeId, normalized });
      await startWorkflowExecution({ workflow, workflowId, nodeId, executionInput }).catch((error) => {
        logger.error('[Outlook Trigger] Failed to start workflow execution:', error);
      });
    }
  } catch (error) {
    logger.error('[Outlook Trigger] Webhook error:', error);
  }
}

export async function outlookRegisterSubscriptionHandler(req: Request, res: Response) {
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

    const node = findOutlookTriggerNode(workflow, nodeId);
    const triggerConfig = nodeConfigOf(node) as OutlookTriggerConfig;
    const changeTypes = Array.isArray(triggerConfig.changeTypes)
      ? triggerConfig.changeTypes
      : String(triggerConfig.changeTypes || '').split(',').map((v) => v.trim()).filter(Boolean);

    const result = await registerOutlookSubscription({
      userId,
      workflowId,
      nodeId,
      connectionId: String(req.body?.connectionId || triggerConfig.connectionId || ''),
      resourceKind: triggerConfig.resource === 'calendar' ? 'calendar' : 'mail',
      changeTypes,
      folderName: triggerConfig.folderName,
    });
    return res.json(result);
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    return res.status(statusCode).json({ error: message });
  }
}

export async function outlookUnregisterSubscriptionHandler(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req);
    const workflowId = String(req.body?.workflowId || '');
    const nodeId = String(req.body?.nodeId || '');
    if (!workflowId || !nodeId) {
      return res.status(400).json({ error: 'workflowId and nodeId are required.' });
    }
    const result = await unregisterOutlookSubscription({
      userId,
      workflowId,
      nodeId,
      connectionId: String(req.body?.connectionId || ''),
    });
    return res.json(result);
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    return res.status(statusCode).json({ error: message });
  }
}
