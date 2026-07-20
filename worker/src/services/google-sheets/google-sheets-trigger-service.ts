import { createHash } from 'crypto';
import { config } from '../../core/config';
import { getDbClient } from '../../core/database/aws-db-client';
import { normalizeExecutionStatus, normalizeExecutionTrigger } from '../../core/execution/execution-db-enums';
import { logger } from '../../core/logger';
import { connectionService } from '../../credentials-system/connection-service';
import { getGoogleAccessToken } from '../../shared/google-sheets';
import { getRedisClient } from '../../shared/redis-client';

export type GoogleSheetsEventType = 'row_added' | 'row_updated';

export type NormalizedGoogleSheetsEvent = {
  eventId: string;
  eventType: GoogleSheetsEventType;
  source: 'google_sheets';
  userId: string | null;
  username: string;
  text: string;
  timestamp: string;
  spreadsheetId: string;
  sheetName: string;
  rowNumber: number;
  values: string[];
  row: Record<string, string>;
  raw: unknown;
};

export type GoogleSheetsTriggerConfig = {
  connectionId?: string;
  spreadsheetId?: string;
  sheetName?: string;
  hasHeaderRow?: boolean;
  eventTypes?: string[] | string;
  query?: string;
};

export type GoogleSheetsPollRegistrationStatus = {
  nodeId: string;
  success: boolean;
  rowCount?: number;
  error?: string;
};

type GoogleSheetsPollState = {
  rowCount: number;
  rowHashes: Record<number, string>;
  spreadsheetId: string;
  sheetName: string;
  userId: string;
  connectionId?: string;
  workflowId: string;
  nodeId: string;
};

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const DEFAULT_EVENT_TYPES: GoogleSheetsEventType[] = ['row_added'];
const STATE_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days — polling state has no external expiry to mirror
const MAX_TRACKED_ROW_HASHES = 5000;

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function hashRow(values: unknown[]): string {
  return createHash('sha1').update(JSON.stringify(values)).digest('hex');
}

function stateKey(workflowId: string, nodeId: string): string {
  return `gsheet:poll:${workflowId}:${nodeId}`;
}

async function getPollState(workflowId: string, nodeId: string): Promise<GoogleSheetsPollState | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  const raw = await redis.get(stateKey(workflowId, nodeId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GoogleSheetsPollState;
  } catch {
    return null;
  }
}

async function setPollState(state: GoogleSheetsPollState): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.set(stateKey(state.workflowId, state.nodeId), JSON.stringify(state), 'EX', STATE_TTL_SECONDS);
}

async function deletePollState(workflowId: string, nodeId: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.del(stateKey(workflowId, nodeId));
}

async function resolveAccessToken(userId: string): Promise<string> {
  const db = getDbClient();
  const token = await getGoogleAccessToken(db, userId, ['https://www.googleapis.com/auth/spreadsheets.readonly']);
  if (!token) throw new Error('No active Google connection found. Connect Google (Sheets) in Connections first.');
  return token;
}

async function resolveConnectionId(userId: string, connectionId?: string): Promise<string> {
  if (asString(connectionId)) return asString(connectionId);
  const canonical = await connectionService.findCanonicalConnectionByProvider(userId, 'google').catch(() => null);
  return canonical?.id || '';
}

async function sheetsApiFetch(accessToken: string, path: string): Promise<any> {
  const response = await fetch(`${SHEETS_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = json?.error?.message || response.statusText;
    throw Object.assign(new Error(`Google Sheets API error (${response.status}): ${message}`), { statusCode: response.status });
  }
  return json;
}

async function fetchSheetValues(accessToken: string, spreadsheetId: string, sheetName: string): Promise<string[][]> {
  const range = sheetName ? `${encodeURIComponent(sheetName)}` : 'A:ZZ';
  const result = await sheetsApiFetch(accessToken, `/${encodeURIComponent(spreadsheetId)}/values/${range}`);
  return Array.isArray(result?.values) ? result.values : [];
}

function normalizeRow(input: {
  spreadsheetId: string;
  sheetName: string;
  rowNumber: number;
  values: string[];
  header: string[];
  eventType: GoogleSheetsEventType;
}): NormalizedGoogleSheetsEvent {
  const row: Record<string, string> = {};
  input.header.forEach((key, index) => {
    if (key) row[key] = asString(input.values[index]);
  });
  return {
    eventId: `${input.spreadsheetId}-${input.sheetName}-${input.rowNumber}-${input.eventType}-${Date.now()}`,
    eventType: input.eventType,
    source: 'google_sheets',
    userId: null,
    username: '',
    text: input.values.join(' '),
    timestamp: new Date().toISOString(),
    spreadsheetId: input.spreadsheetId,
    sheetName: input.sheetName,
    rowNumber: input.rowNumber,
    values: input.values,
    row,
    raw: { values: input.values },
  };
}

export function shouldAcceptGoogleSheetsEvent(
  normalized: NormalizedGoogleSheetsEvent,
  triggerConfig: GoogleSheetsTriggerConfig,
): { accepted: true } | { accepted: false; reason: string } {
  const allowed = asStringList(triggerConfig.eventTypes);
  const normalizedAllowed = (allowed.length ? allowed : DEFAULT_EVENT_TYPES).map((v) => v.trim().toLowerCase().replace(/[\s-]+/g, '_'));
  if (!normalizedAllowed.includes(normalized.eventType)) {
    return { accepted: false, reason: `Ignored Google Sheets event type "${normalized.eventType}".` };
  }

  const query = asString(triggerConfig.query).toLowerCase();
  if (query && !normalized.text.toLowerCase().includes(query)) {
    return { accepted: false, reason: 'Ignored Google Sheets row not matching the configured query filter.' };
  }

  return { accepted: true };
}

export function buildGoogleSheetsExecutionInput(input: {
  workflowId: string;
  nodeId: string;
  normalized: NormalizedGoogleSheetsEvent;
}): Record<string, unknown> {
  return {
    ...input.normalized,
    trigger: 'google_sheets',
    workflow_id: input.workflowId,
    node_id: input.nodeId,
    sessionId: `gsheet_${input.workflowId}_${input.normalized.spreadsheetId}_${input.normalized.rowNumber}`,
    _googleSheets: true,
  };
}

export async function registerGoogleSheetsPolling(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
  connectionId?: string;
  spreadsheetId: string;
  sheetName?: string;
}): Promise<{ success: true; connectionId: string; rowCount: number }> {
  const spreadsheetId = asString(input.spreadsheetId);
  if (!spreadsheetId) {
    throw Object.assign(new Error('A Google Sheets spreadsheet ID is required.'), { statusCode: 400 });
  }
  const sheetName = asString(input.sheetName);
  const accessToken = await resolveAccessToken(input.userId);
  const connectionId = await resolveConnectionId(input.userId, input.connectionId);

  const existing = await getPollState(input.workflowId, input.nodeId);
  if (existing) {
    return { success: true, connectionId, rowCount: existing.rowCount };
  }

  const values = await fetchSheetValues(accessToken, spreadsheetId, sheetName);
  const rowHashes: Record<number, string> = {};
  values.slice(0, MAX_TRACKED_ROW_HASHES).forEach((row, index) => {
    rowHashes[index] = hashRow(row);
  });

  await setPollState({
    rowCount: values.length,
    rowHashes,
    spreadsheetId,
    sheetName,
    userId: input.userId,
    connectionId,
    workflowId: input.workflowId,
    nodeId: input.nodeId,
  });

  return { success: true, connectionId, rowCount: values.length };
}

export async function unregisterGoogleSheetsPolling(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
  connectionId?: string;
}): Promise<{ success: true; connectionId: string }> {
  const connectionId = await resolveConnectionId(input.userId, input.connectionId);
  await deletePollState(input.workflowId, input.nodeId);
  return { success: true, connectionId };
}

function workflowNodes(workflow: any): any[] {
  const candidates = [workflow?.nodes, workflow?.graph?.nodes, workflow?.definition?.nodes, workflow?.definition?.graph?.nodes];
  for (const value of candidates) if (Array.isArray(value)) return value;
  return [];
}

function nodeTypeOf(node: any): string {
  return String(node?.data?.type || node?.type || '').trim();
}

function nodeConfigOf(node: any): GoogleSheetsTriggerConfig {
  return (node?.data?.config || node?.config || {}) as GoogleSheetsTriggerConfig;
}

function connectionIdOf(node: any, triggerConfig: GoogleSheetsTriggerConfig): string {
  const refs = {
    ...((node?.data?.connectionRefs || {}) as Record<string, unknown>),
    ...((node?.connectionRefs || {}) as Record<string, unknown>),
  };
  const candidates = [triggerConfig.connectionId, (node?.data as any)?.connectionId, node?.connectionId, refs.google, refs.google_oauth2];
  for (const value of candidates) if (typeof value === 'string' && value.trim()) return value.trim();
  return '';
}

export async function autoRegisterGoogleSheetsPollingForWorkflow(input: {
  userId: string;
  workflow: any;
}): Promise<GoogleSheetsPollRegistrationStatus[]> {
  if (!input.workflow || input.workflow.status !== 'active') return [];
  const workflowId = asString(input.workflow.id);
  if (!workflowId) return [];
  const triggers = workflowNodes(input.workflow).filter((node) => nodeTypeOf(node) === 'google_sheets_trigger');
  const results: GoogleSheetsPollRegistrationStatus[] = [];

  for (const node of triggers) {
    const nodeId = asString(node?.id);
    if (!nodeId) continue;
    const triggerConfig = nodeConfigOf(node);
    const spreadsheetId = asString(triggerConfig.spreadsheetId);
    if (!spreadsheetId) {
      results.push({ nodeId, success: false, error: 'Spreadsheet ID is required (set it on the Google Sheets Trigger node).' });
      continue;
    }
    try {
      const result = await registerGoogleSheetsPolling({
        userId: input.userId,
        workflowId,
        nodeId,
        connectionId: connectionIdOf(node, triggerConfig),
        spreadsheetId,
        sheetName: triggerConfig.sheetName,
      });
      results.push({ nodeId, success: true, rowCount: result.rowCount });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[Google Sheets Trigger] Auto polling registration failed:', { workflowId, nodeId, error: message });
      results.push({ nodeId, success: false, error: message });
    }
  }

  return results;
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
}): Promise<void> {
  const db = getDbClient();
  const { data: execution, error } = await db
    .from('executions')
    .insert({
      workflow_id: input.workflowId,
      user_id: input.workflow.user_id,
      status: normalizeExecutionStatus('running'),
      trigger: normalizeExecutionTrigger('google_sheets', 'webhook'),
      input: input.executionInput,
      logs: [],
      started_at: new Date().toISOString(),
      metadata: {
        originalTrigger: 'google_sheets',
        triggerNodeId: input.nodeId,
      },
    })
    .select()
    .single();

  if (error || !execution) {
    logger.error('[Google Sheets Trigger] Execution creation error:', error);
    return;
  }

  const executeUrl = config.publicBaseUrl
    ? `${String(config.publicBaseUrl).replace(/\/+$/, '')}/api/execute-workflow`
    : null;

  if (!executeUrl) {
    await markExecutionFailed(db, execution.id, 'PUBLIC_BASE_URL is required to execute Google Sheets-triggered workflows.');
    return;
  }

  try {
    const response = await fetch(executeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Google-Sheets-Execution': 'true',
        'X-Internal-Trigger-Execution': 'true',
      },
      body: JSON.stringify({
        workflowId: input.workflowId,
        executionId: execution.id,
        input: input.executionInput,
      }),
    });
    if (!response.ok) {
      const details = await response.text().catch(() => '');
      await markExecutionFailed(db, execution.id, `Google Sheets trigger handoff failed (${response.status}): ${details || response.statusText}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markExecutionFailed(db, execution.id, `Google Sheets trigger handoff failed: ${message}`);
  }
}

export async function pollAllGoogleSheetsTriggers(): Promise<void> {
  const db = getDbClient();
  const { data: workflows, error } = await db
    .from('workflows')
    .select('id, user_id, nodes, graph, definition, status')
    .eq('status', 'active');

  if (error || !Array.isArray(workflows)) return;

  for (const workflow of workflows) {
    const triggers = workflowNodes(workflow).filter((node) => nodeTypeOf(node) === 'google_sheets_trigger');
    for (const node of triggers) {
      const nodeId = asString(node?.id);
      const workflowId = asString(workflow?.id);
      if (!nodeId || !workflowId) continue;
      const triggerConfig = nodeConfigOf(node);
      const spreadsheetId = asString(triggerConfig.spreadsheetId);
      if (!spreadsheetId) continue;

      try {
        const state = await getPollState(workflowId, nodeId);
        if (!state) continue; // not yet baselined — auto-register handles seeding on activate

        const userId = asString(workflow.user_id);
        const accessToken = await resolveAccessToken(userId).catch(() => null);
        if (!accessToken) continue;

        const sheetName = asString(triggerConfig.sheetName) || state.sheetName;
        const values = await fetchSheetValues(accessToken, spreadsheetId, sheetName);
        const header = triggerConfig.hasHeaderRow !== false ? (values[0] || []).map((v) => asString(v)) : [];

        const newRowHashes: Record<number, string> = { ...state.rowHashes };
        const acceptedEvents: NormalizedGoogleSheetsEvent[] = [];

        values.forEach((rowValues, index) => {
          const hash = hashRow(rowValues);
          const isNew = index >= state.rowCount;
          const previousHash = state.rowHashes[index];
          const isUpdated = !isNew && previousHash !== undefined && previousHash !== hash;

          if (isNew) {
            const normalized = normalizeRow({
              spreadsheetId, sheetName, rowNumber: index + 1, values: rowValues.map((v) => asString(v)), header, eventType: 'row_added',
            });
            if (shouldAcceptGoogleSheetsEvent(normalized, triggerConfig).accepted) acceptedEvents.push(normalized);
          } else if (isUpdated) {
            const normalized = normalizeRow({
              spreadsheetId, sheetName, rowNumber: index + 1, values: rowValues.map((v) => asString(v)), header, eventType: 'row_updated',
            });
            if (shouldAcceptGoogleSheetsEvent(normalized, triggerConfig).accepted) acceptedEvents.push(normalized);
          }

          if (index < MAX_TRACKED_ROW_HASHES) newRowHashes[index] = hash;
        });

        await setPollState({ ...state, rowCount: values.length, rowHashes: newRowHashes });

        for (const normalized of acceptedEvents) {
          const executionInput = buildGoogleSheetsExecutionInput({ workflowId, nodeId, normalized });
          await startWorkflowExecution({ workflow, workflowId, nodeId, executionInput });
        }
      } catch (pollError) {
        const message = pollError instanceof Error ? pollError.message : String(pollError);
        logger.warn('[Google Sheets Trigger] Poll failed', { workflowId, nodeId, error: message });
      }
    }
  }
}

export function startGoogleSheetsPollingScheduler(): void {
  import('node-cron').then(({ default: cron }) => {
    cron.schedule('*/2 * * * *', () => {
      pollAllGoogleSheetsTriggers().catch((error) => {
        logger.warn('[Google Sheets Trigger] Polling sweep failed:', error);
      });
    });
    logger.info('[Google Sheets Trigger] Polling scheduler started (every 2 minutes)');
  }).catch((error) => {
    logger.warn('[Google Sheets Trigger] Failed to start polling scheduler:', error);
  });
}

export { getPollState as getGoogleSheetsPollState };
