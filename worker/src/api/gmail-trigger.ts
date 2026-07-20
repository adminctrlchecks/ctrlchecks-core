import { Request, Response } from 'express';
import { config } from '../core/config';
import { getDbClient } from '../core/database/aws-db-client';
import { normalizeExecutionStatus, normalizeExecutionTrigger } from '../core/execution/execution-db-enums';
import { logger } from '../core/logger';
import {
  buildGmailExecutionInput,
  fetchNewGmailEvents,
  getGmailWatchState,
  getGmailWebhookUrl,
  normalizeGmailPushEnvelope,
  registerGmailWatch,
  seedGmailWatchState,
  shouldAcceptGmailEvent,
  unregisterGmailWatch,
  updateGmailWatchHistoryId,
  validateGmailPushRequest,
  type GmailTriggerConfig,
} from '../services/gmail/gmail-trigger-service';
import { getGoogleAccessToken } from '../shared/google-sheets';

function getAuthenticatedUserId(req: Request): string {
  const id = (req as any).user?.id || req.body?.userId || req.query.user_id;
  if (!id || typeof id !== 'string') throw Object.assign(new Error('Authenticated user is required'), { statusCode: 401 });
  return id;
}

function nodeTypeOf(node: any): string {
  return String(node?.data?.type || node?.type || '').trim();
}

function nodeConfigOf(node: any): GmailTriggerConfig {
  return (node?.data?.config || node?.config || {}) as GmailTriggerConfig;
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

function findGmailTriggerNode(workflow: any, nodeId: string): any {
  const node = workflowNodes(workflow).find((candidate) => String(candidate?.id || '') === nodeId);
  if (!node || nodeTypeOf(node) !== 'gmail_trigger') {
    throw Object.assign(new Error('Gmail Trigger node not found in this workflow.'), { statusCode: 404 });
  }
  return node;
}

function connectionIdOf(node: any, triggerConfig: GmailTriggerConfig): string {
  const refs = {
    ...((node?.data?.connectionRefs || {}) as Record<string, unknown>),
    ...((node?.connectionRefs || {}) as Record<string, unknown>),
  };
  return String(triggerConfig.connectionId || (node?.data as any)?.connectionId || node?.connectionId || refs.google || refs.google_oauth2 || '');
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
      trigger: normalizeExecutionTrigger('gmail', 'webhook'),
      input: input.executionInput,
      logs: [],
      started_at: new Date().toISOString(),
      metadata: {
        originalTrigger: 'gmail',
        triggerNodeId: input.nodeId,
      },
    })
    .select()
    .single();

  if (error || !execution) {
    logger.error('[Gmail Trigger] Execution creation error:', error);
    throw Object.assign(new Error('Failed to create workflow execution.'), { statusCode: 500 });
  }

  const executeUrl = config.publicBaseUrl
    ? `${String(config.publicBaseUrl).replace(/\/+$/, '')}/api/execute-workflow`
    : null;

  if (!executeUrl) {
    const message = 'PUBLIC_BASE_URL is required to execute Gmail-triggered workflows.';
    await markExecutionFailed(db, execution.id, message);
    throw Object.assign(new Error(message), { statusCode: 500 });
  }

  fetch(executeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Gmail-Execution': 'true',
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
    const message = `Gmail trigger handoff failed (${response.status}): ${details || response.statusText}`;
    logger.error('[Gmail Trigger] Error triggering workflow execution:', message);
    await markExecutionFailed(db, execution.id, message);
  }).catch(async (err) => {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('[Gmail Trigger] Error triggering workflow execution:', err);
    await markExecutionFailed(db, execution.id, `Gmail trigger handoff failed: ${message}`);
  });

  return execution;
}

export async function gmailWebhookInfoHandler(req: Request, res: Response) {
  try {
    const workflowId = String(req.params.workflowId || '');
    const nodeId = String(req.params.nodeId || '');
    if (!workflowId || !nodeId) {
      return res.status(400).json({ error: 'workflowId and nodeId are required.' });
    }
    await loadWorkflow(workflowId).then((workflow) => findGmailTriggerNode(workflow, nodeId));
    return res.json({
      success: true,
      webhookUrl: getGmailWebhookUrl(workflowId, nodeId),
      message: 'Use this URL as the push endpoint of a Google Cloud Pub/Sub subscription on the topic configured on this node.',
    });
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    return res.status(statusCode).json({ error: message });
  }
}

export async function gmailWebhookHandler(req: Request, res: Response) {
  try {
    const workflowId = String(req.params.workflowId || '');
    const nodeId = String(req.params.nodeId || '');
    if (!workflowId || !nodeId) {
      return res.status(400).json({ error: 'workflowId and nodeId are required.' });
    }

    const workflow = await loadWorkflow(workflowId);
    const node = findGmailTriggerNode(workflow, nodeId);
    const triggerConfig = nodeConfigOf(node) as GmailTriggerConfig;

    if (!await validateGmailPushRequest(req, { workflowId, nodeId, triggerConfig })) {
      return res.status(401).json({ error: 'Invalid Gmail Pub/Sub push request.' });
    }

    if (workflow.status !== 'active') {
      return res.status(200).json({ message: 'Workflow is not active.' });
    }

    const envelope = normalizeGmailPushEnvelope(req.body || {});
    if (!envelope || !envelope.emailAddress || !envelope.historyId) {
      return res.status(200).json({ message: 'Ignored non-Gmail-shaped Pub/Sub push.' });
    }

    const userId = String(workflow.user_id);
    const state = await getGmailWatchState(workflowId, nodeId);
    if (!state) {
      // No baseline yet — seed one and skip diffing until the next push to avoid replaying full history.
      await seedGmailWatchState({
        workflowId,
        nodeId,
        userId,
        historyId: envelope.historyId,
        topicName: String(triggerConfig.pubsubTopic || ''),
        labelIds: Array.isArray(triggerConfig.labelIds) ? triggerConfig.labelIds : String(triggerConfig.labelIds || '').split(',').map((v) => v.trim()).filter(Boolean),
        connectionId: connectionIdOf(node, triggerConfig),
      });
      return res.status(200).json({ message: 'No watch baseline yet; seeded from this notification.' });
    }

    const accessToken = await getGoogleAccessToken(getDbClient(), userId, ['https://www.googleapis.com/auth/gmail.readonly']);
    if (!accessToken) {
      return res.status(200).json({ message: 'No active Google connection for this workflow owner.' });
    }

    const { events, latestHistoryId } = await fetchNewGmailEvents({
      accessToken,
      emailAddress: envelope.emailAddress,
      startHistoryId: state.historyId,
      eventTypes: (Array.isArray(triggerConfig.eventTypes) ? triggerConfig.eventTypes : [triggerConfig.eventTypes]).filter(Boolean) as any,
    });

    await updateGmailWatchHistoryId(workflowId, nodeId, latestHistoryId || envelope.historyId);

    const acceptedEvents = events.filter((event) => shouldAcceptGmailEvent(event, triggerConfig).accepted);

    const executions = [];
    for (const normalized of acceptedEvents) {
      const executionInput = buildGmailExecutionInput({ workflowId, nodeId, normalized });
      const execution = await startWorkflowExecution({ workflow, workflowId, nodeId, executionInput });
      executions.push(execution);
    }

    return res.status(202).json({
      success: true,
      executionIds: executions.map((execution) => execution.id),
      status: executions.length ? 'running' : 'no-op',
    });
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[Gmail Trigger] Webhook error:', error);
    return res.status(statusCode).json({ error: message });
  }
}

export async function gmailRegisterWebhookHandler(req: Request, res: Response) {
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

    const node = findGmailTriggerNode(workflow, nodeId);
    const triggerConfig = nodeConfigOf(node) as GmailTriggerConfig;
    const topicName = String(req.body?.pubsubTopic || triggerConfig.pubsubTopic || '');
    const labelIds = Array.isArray(triggerConfig.labelIds) ? triggerConfig.labelIds : String(triggerConfig.labelIds || '').split(',').map((v) => v.trim()).filter(Boolean);

    const result = await registerGmailWatch({
      userId,
      workflowId,
      nodeId,
      connectionId: String(req.body?.connectionId || triggerConfig.connectionId || ''),
      topicName,
      labelIds,
    });
    return res.json(result);
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    return res.status(statusCode).json({ error: message });
  }
}

export async function gmailUnregisterWebhookHandler(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req);
    const result = await unregisterGmailWatch({
      userId,
      workflowId: String(req.body?.workflowId || ''),
      nodeId: String(req.body?.nodeId || ''),
      connectionId: String(req.body?.connectionId || ''),
    });
    return res.json(result);
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    return res.status(statusCode).json({ error: message });
  }
}
