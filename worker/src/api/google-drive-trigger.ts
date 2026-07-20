import { Request, Response } from 'express';
import { config } from '../core/config';
import { getDbClient } from '../core/database/aws-db-client';
import { normalizeExecutionStatus, normalizeExecutionTrigger } from '../core/execution/execution-db-enums';
import { logger } from '../core/logger';
import {
  buildGoogleDriveExecutionInput,
  fetchChangedDriveFiles,
  getGoogleDriveWatchState,
  getGoogleDriveWebhookUrl,
  parseGoogleDriveNotification,
  registerGoogleDriveWatch,
  shouldAcceptGoogleDriveEvent,
  unregisterGoogleDriveWatch,
  updateGoogleDrivePageToken,
  validateGoogleDriveNotification,
  type GoogleDriveTriggerConfig,
} from '../services/google-drive/google-drive-trigger-service';
import { getGoogleAccessToken } from '../shared/google-sheets';

function getAuthenticatedUserId(req: Request): string {
  const id = (req as any).user?.id || req.body?.userId || req.query.user_id;
  if (!id || typeof id !== 'string') throw Object.assign(new Error('Authenticated user is required'), { statusCode: 401 });
  return id;
}

function nodeTypeOf(node: any): string {
  return String(node?.data?.type || node?.type || '').trim();
}

function nodeConfigOf(node: any): GoogleDriveTriggerConfig {
  return (node?.data?.config || node?.config || {}) as GoogleDriveTriggerConfig;
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

function findGoogleDriveTriggerNode(workflow: any, nodeId: string): any {
  const node = workflowNodes(workflow).find((candidate) => String(candidate?.id || '') === nodeId);
  if (!node || nodeTypeOf(node) !== 'google_drive_trigger') {
    throw Object.assign(new Error('Google Drive Trigger node not found in this workflow.'), { statusCode: 404 });
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
      trigger: normalizeExecutionTrigger('google_drive', 'webhook'),
      input: input.executionInput,
      logs: [],
      started_at: new Date().toISOString(),
      metadata: {
        originalTrigger: 'google_drive',
        triggerNodeId: input.nodeId,
      },
    })
    .select()
    .single();

  if (error || !execution) {
    logger.error('[Google Drive Trigger] Execution creation error:', error);
    throw Object.assign(new Error('Failed to create workflow execution.'), { statusCode: 500 });
  }

  const executeUrl = config.publicBaseUrl
    ? `${String(config.publicBaseUrl).replace(/\/+$/, '')}/api/execute-workflow`
    : null;

  if (!executeUrl) {
    const message = 'PUBLIC_BASE_URL is required to execute Google Drive-triggered workflows.';
    await markExecutionFailed(db, execution.id, message);
    throw Object.assign(new Error(message), { statusCode: 500 });
  }

  fetch(executeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Google-Drive-Execution': 'true',
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
    const message = `Google Drive trigger handoff failed (${response.status}): ${details || response.statusText}`;
    logger.error('[Google Drive Trigger] Error triggering workflow execution:', message);
    await markExecutionFailed(db, execution.id, message);
  }).catch(async (err) => {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('[Google Drive Trigger] Error triggering workflow execution:', err);
    await markExecutionFailed(db, execution.id, `Google Drive trigger handoff failed: ${message}`);
  });

  return execution;
}

export async function googleDriveWebhookInfoHandler(req: Request, res: Response) {
  try {
    const workflowId = String(req.params.workflowId || '');
    const nodeId = String(req.params.nodeId || '');
    if (!workflowId || !nodeId) {
      return res.status(400).json({ error: 'workflowId and nodeId are required.' });
    }
    await loadWorkflow(workflowId).then((workflow) => findGoogleDriveTriggerNode(workflow, nodeId));
    return res.json({
      success: true,
      webhookUrl: getGoogleDriveWebhookUrl(workflowId, nodeId),
      message: 'This URL is registered automatically as a Google Drive push notification channel when the workflow is active.',
    });
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    return res.status(statusCode).json({ error: message });
  }
}

export async function googleDriveWebhookHandler(req: Request, res: Response) {
  const workflowId = String(req.params.workflowId || '');
  const nodeId = String(req.params.nodeId || '');
  if (!workflowId || !nodeId) {
    return res.status(400).json({ error: 'workflowId and nodeId are required.' });
  }

  const notification = parseGoogleDriveNotification(req);

  // Ack fast — Google expects a 200 quickly or it will retry/back off.
  res.status(200).json({ success: true });

  try {
    if (!await validateGoogleDriveNotification(workflowId, nodeId, notification)) {
      logger.warn('[Google Drive Trigger] Ignored notification with invalid channel/token', { workflowId, nodeId });
      return;
    }

    // 'sync' is the initial handshake ping sent when a channel is created — nothing changed yet.
    if (notification.resourceState === 'sync') return;

    const workflow = await loadWorkflow(workflowId).catch(() => null);
    if (!workflow || workflow.status !== 'active') return;

    const node = findGoogleDriveTriggerNode(workflow, nodeId);
    const triggerConfig = nodeConfigOf(node) as GoogleDriveTriggerConfig;

    const state = await getGoogleDriveWatchState(workflowId, nodeId);
    if (!state) return;

    const userId = String(workflow.user_id);
    const accessToken = await getGoogleAccessToken(getDbClient(), userId, ['https://www.googleapis.com/auth/drive.readonly']);
    if (!accessToken) return;

    const { events, nextPageToken } = await fetchChangedDriveFiles({
      accessToken,
      pageToken: state.pageToken,
      folderId: triggerConfig.folderId || state.folderId,
    });

    await updateGoogleDrivePageToken(workflowId, nodeId, nextPageToken || state.pageToken);

    const acceptedEvents = events.filter((event) => shouldAcceptGoogleDriveEvent(event, triggerConfig).accepted);

    for (const normalized of acceptedEvents) {
      const executionInput = buildGoogleDriveExecutionInput({ workflowId, nodeId, normalized });
      await startWorkflowExecution({ workflow, workflowId, nodeId, executionInput }).catch((error) => {
        logger.error('[Google Drive Trigger] Failed to start workflow execution:', error);
      });
    }
  } catch (error) {
    logger.error('[Google Drive Trigger] Webhook error:', error);
  }
}

export async function googleDriveRegisterWatchHandler(req: Request, res: Response) {
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

    const node = findGoogleDriveTriggerNode(workflow, nodeId);
    const triggerConfig = nodeConfigOf(node) as GoogleDriveTriggerConfig;

    const result = await registerGoogleDriveWatch({
      userId,
      workflowId,
      nodeId,
      connectionId: String(req.body?.connectionId || triggerConfig.connectionId || ''),
      folderId: String(req.body?.folderId || triggerConfig.folderId || ''),
    });
    return res.json(result);
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    return res.status(statusCode).json({ error: message });
  }
}

export async function googleDriveUnregisterWatchHandler(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req);
    const workflowId = String(req.body?.workflowId || '');
    const nodeId = String(req.body?.nodeId || '');
    if (!workflowId || !nodeId) {
      return res.status(400).json({ error: 'workflowId and nodeId are required.' });
    }
    const result = await unregisterGoogleDriveWatch({
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
