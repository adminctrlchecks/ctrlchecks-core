import { Request, Response } from 'express';
import { getDbClient } from '../core/database/aws-db-client';
import {
  getGoogleSheetsPollState,
  registerGoogleSheetsPolling,
  unregisterGoogleSheetsPolling,
  type GoogleSheetsTriggerConfig,
} from '../services/google-sheets/google-sheets-trigger-service';

function getAuthenticatedUserId(req: Request): string {
  const id = (req as any).user?.id || req.body?.userId || req.query.user_id;
  if (!id || typeof id !== 'string') throw Object.assign(new Error('Authenticated user is required'), { statusCode: 401 });
  return id;
}

function nodeTypeOf(node: any): string {
  return String(node?.data?.type || node?.type || '').trim();
}

function nodeConfigOf(node: any): GoogleSheetsTriggerConfig {
  return (node?.data?.config || node?.config || {}) as GoogleSheetsTriggerConfig;
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

function findGoogleSheetsTriggerNode(workflow: any, nodeId: string): any {
  const node = workflowNodes(workflow).find((candidate) => String(candidate?.id || '') === nodeId);
  if (!node || nodeTypeOf(node) !== 'google_sheets_trigger') {
    throw Object.assign(new Error('Google Sheets Trigger node not found in this workflow.'), { statusCode: 404 });
  }
  return node;
}

export async function googleSheetsPollingInfoHandler(req: Request, res: Response) {
  try {
    const workflowId = String(req.params.workflowId || '');
    const nodeId = String(req.params.nodeId || '');
    if (!workflowId || !nodeId) {
      return res.status(400).json({ error: 'workflowId and nodeId are required.' });
    }
    await loadWorkflow(workflowId).then((workflow) => findGoogleSheetsTriggerNode(workflow, nodeId));
    const state = await getGoogleSheetsPollState(workflowId, nodeId);
    return res.json({
      success: true,
      polling: true,
      baselineCaptured: Boolean(state),
      rowCount: state?.rowCount ?? null,
      message: 'Google Sheets does not support real-time push notifications for cell changes. CtrlChecks polls this sheet every ~2 minutes for new or updated rows.',
    });
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    return res.status(statusCode).json({ error: message });
  }
}

export async function googleSheetsRegisterPollingHandler(req: Request, res: Response) {
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

    const node = findGoogleSheetsTriggerNode(workflow, nodeId);
    const triggerConfig = nodeConfigOf(node) as GoogleSheetsTriggerConfig;

    const result = await registerGoogleSheetsPolling({
      userId,
      workflowId,
      nodeId,
      connectionId: String(req.body?.connectionId || triggerConfig.connectionId || ''),
      spreadsheetId: String(req.body?.spreadsheetId || triggerConfig.spreadsheetId || ''),
      sheetName: String(req.body?.sheetName || triggerConfig.sheetName || ''),
    });
    return res.json(result);
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    return res.status(statusCode).json({ error: message });
  }
}

export async function googleSheetsUnregisterPollingHandler(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req);
    const workflowId = String(req.body?.workflowId || '');
    const nodeId = String(req.body?.nodeId || '');
    if (!workflowId || !nodeId) {
      return res.status(400).json({ error: 'workflowId and nodeId are required.' });
    }
    const result = await unregisterGoogleSheetsPolling({
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
