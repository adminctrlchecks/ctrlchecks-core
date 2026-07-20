import { randomUUID, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { config } from '../../core/config';
import { getDbClient } from '../../core/database/aws-db-client';
import { logger } from '../../core/logger';
import { connectionService } from '../../credentials-system/connection-service';
import { getGoogleAccessToken } from '../../shared/google-sheets';
import { getRedisClient } from '../../shared/redis-client';

export type GoogleDriveEventType = 'file_changed' | 'file_deleted';

export type NormalizedGoogleDriveEvent = {
  eventId: string;
  eventType: GoogleDriveEventType;
  source: 'google_drive';
  userId: string | null;
  username: string;
  text: string;
  timestamp: string;
  fileId: string;
  name: string;
  mimeType: string;
  parents: string[];
  modifiedTime: string | null;
  webViewLink: string;
  raw: unknown;
};

export type GoogleDriveTriggerConfig = {
  connectionId?: string;
  folderId?: string;
  eventTypes?: string[] | string;
  query?: string;
};

export type GoogleDriveWatchRegistrationStatus = {
  nodeId: string;
  success: boolean;
  webhookUrl?: string;
  connectionId?: string;
  channelId?: string;
  expiration?: string;
  error?: string;
};

type GoogleDriveWatchState = {
  channelId: string;
  resourceId: string;
  channelToken: string;
  folderId: string;
  pageToken: string;
  expiration: string;
  userId: string;
  connectionId?: string;
  workflowId: string;
  nodeId: string;
};

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DEFAULT_EVENT_TYPES: GoogleDriveEventType[] = ['file_changed', 'file_deleted'];
const CHANNEL_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const STATE_TTL_SECONDS = 9 * 24 * 60 * 60;

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

function header(req: Request, name: string): string {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || '' : asString(value);
}

function timingEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function stateKey(workflowId: string, nodeId: string): string {
  return `gdrive:channel:${workflowId}:${nodeId}`;
}

async function getWatchState(workflowId: string, nodeId: string): Promise<GoogleDriveWatchState | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  const raw = await redis.get(stateKey(workflowId, nodeId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GoogleDriveWatchState;
  } catch {
    return null;
  }
}

async function setWatchState(state: GoogleDriveWatchState): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.set(stateKey(state.workflowId, state.nodeId), JSON.stringify(state), 'EX', STATE_TTL_SECONDS);
}

async function deleteWatchState(workflowId: string, nodeId: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.del(stateKey(workflowId, nodeId));
}

export async function updateGoogleDrivePageToken(workflowId: string, nodeId: string, pageToken: string): Promise<void> {
  const state = await getWatchState(workflowId, nodeId);
  if (!state || !pageToken) return;
  await setWatchState({ ...state, pageToken });
}

export function getGoogleDriveWebhookUrl(workflowId: string, nodeId: string): string {
  const baseUrl = String(config.publicBaseUrl || '').replace(/\/+$/, '');
  if (!baseUrl) throw new Error('PUBLIC_BASE_URL is required to register Google Drive watch channels.');
  return `${baseUrl}/api/google-drive/webhook/${encodeURIComponent(workflowId)}/${encodeURIComponent(nodeId)}`;
}

async function resolveAccessToken(userId: string): Promise<string> {
  const db = getDbClient();
  const token = await getGoogleAccessToken(db, userId, ['https://www.googleapis.com/auth/drive.readonly']);
  if (!token) throw new Error('No active Google connection found. Connect Google (Drive) in Connections first.');
  return token;
}

async function resolveConnectionId(userId: string, connectionId?: string): Promise<string> {
  if (asString(connectionId)) return asString(connectionId);
  const canonical = await connectionService.findCanonicalConnectionByProvider(userId, 'google').catch(() => null);
  return canonical?.id || '';
}

async function driveApiFetch(accessToken: string, path: string, init?: RequestInit): Promise<any> {
  const response = await fetch(`${DRIVE_API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = json?.error?.message || response.statusText;
    throw Object.assign(new Error(`Google Drive API error (${response.status}): ${message}`), { statusCode: response.status });
  }
  return json;
}

export type DriveNotificationHeaders = {
  channelId: string;
  resourceId: string;
  resourceState: string;
  channelToken: string;
};

export function parseGoogleDriveNotification(req: Request): DriveNotificationHeaders {
  return {
    channelId: header(req, 'x-goog-channel-id'),
    resourceId: header(req, 'x-goog-resource-id'),
    resourceState: header(req, 'x-goog-resource-state'),
    channelToken: header(req, 'x-goog-channel-token'),
  };
}

export async function validateGoogleDriveNotification(
  workflowId: string,
  nodeId: string,
  notification: DriveNotificationHeaders,
): Promise<boolean> {
  const state = await getWatchState(workflowId, nodeId);
  if (!state) return false;
  if (state.channelId !== notification.channelId) return false;
  if (state.channelToken && !timingEqualString(state.channelToken, notification.channelToken || '')) return false;
  return true;
}

function eventTypeFor(change: any): GoogleDriveEventType {
  if (change?.removed) return 'file_deleted';
  if (change?.file?.trashed) return 'file_deleted';
  return 'file_changed';
}

export async function fetchChangedDriveFiles(input: {
  accessToken: string;
  pageToken: string;
  folderId?: string;
}): Promise<{ events: NormalizedGoogleDriveEvent[]; nextPageToken: string }> {
  const events: NormalizedGoogleDriveEvent[] = [];
  let pageToken = input.pageToken;
  let nextPageToken = input.pageToken;

  do {
    const params = new URLSearchParams({
      pageToken,
      fields: 'nextPageToken,newStartPageToken,changes(fileId,removed,file(id,name,mimeType,parents,modifiedTime,webViewLink,trashed,owners))',
    });

    let page: any;
    try {
      page = await driveApiFetch(input.accessToken, `/changes?${params.toString()}`);
    } catch (error) {
      if ((error as any)?.statusCode === 404) {
        // Page token expired — reseed with a fresh start token instead of replaying full history.
        const fresh = await driveApiFetch(input.accessToken, '/changes/startPageToken');
        return { events: [], nextPageToken: asString(fresh?.startPageToken) };
      }
      throw error;
    }

    for (const change of Array.isArray(page?.changes) ? page.changes : []) {
      const file = change?.file || {};
      const parents: string[] = Array.isArray(file?.parents) ? file.parents : [];
      if (input.folderId && !parents.includes(input.folderId)) continue;

      events.push({
        eventId: `${asString(change?.fileId)}-${Date.now()}`,
        eventType: eventTypeFor(change),
        source: 'google_drive',
        userId: asString(file?.owners?.[0]?.emailAddress) || null,
        username: asString(file?.owners?.[0]?.displayName),
        text: asString(file?.name),
        timestamp: asString(file?.modifiedTime) || new Date().toISOString(),
        fileId: asString(change?.fileId),
        name: asString(file?.name),
        mimeType: asString(file?.mimeType),
        parents,
        modifiedTime: asString(file?.modifiedTime) || null,
        webViewLink: asString(file?.webViewLink),
        raw: change,
      });
    }

    if (asString(page?.nextPageToken)) {
      pageToken = asString(page.nextPageToken);
      nextPageToken = pageToken;
    } else {
      pageToken = '';
      if (asString(page?.newStartPageToken)) nextPageToken = asString(page.newStartPageToken);
    }
  } while (pageToken);

  return { events, nextPageToken };
}

export function shouldAcceptGoogleDriveEvent(
  normalized: NormalizedGoogleDriveEvent,
  triggerConfig: GoogleDriveTriggerConfig,
): { accepted: true } | { accepted: false; reason: string } {
  const allowed = asStringList(triggerConfig.eventTypes);
  const normalizedAllowed = (allowed.length ? allowed : DEFAULT_EVENT_TYPES).map((v) => v.trim().toLowerCase().replace(/[\s-]+/g, '_'));
  if (!normalizedAllowed.includes(normalized.eventType)) {
    return { accepted: false, reason: `Ignored Google Drive event type "${normalized.eventType}".` };
  }

  const query = asString(triggerConfig.query).toLowerCase();
  if (query && !normalized.name.toLowerCase().includes(query)) {
    return { accepted: false, reason: 'Ignored Google Drive file not matching the configured query filter.' };
  }

  return { accepted: true };
}

export function buildGoogleDriveExecutionInput(input: {
  workflowId: string;
  nodeId: string;
  normalized: NormalizedGoogleDriveEvent;
}): Record<string, unknown> {
  return {
    ...input.normalized,
    trigger: 'google_drive',
    workflow_id: input.workflowId,
    node_id: input.nodeId,
    sessionId: `gdrive_${input.workflowId}_${input.normalized.fileId}`,
    _googleDrive: true,
  };
}

export async function registerGoogleDriveWatch(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
  connectionId?: string;
  folderId?: string;
}): Promise<{
  success: true;
  webhookUrl: string;
  connectionId: string;
  channelId: string;
  expiration: string;
}> {
  const accessToken = await resolveAccessToken(input.userId);
  const connectionId = await resolveConnectionId(input.userId, input.connectionId);
  const webhookUrl = getGoogleDriveWebhookUrl(input.workflowId, input.nodeId);
  const folderId = asString(input.folderId);

  const existing = await getWatchState(input.workflowId, input.nodeId);
  if (existing?.channelId) {
    await driveApiFetch(accessToken, '/channels/stop', {
      method: 'POST',
      body: JSON.stringify({ id: existing.channelId, resourceId: existing.resourceId }),
    }).catch(() => null);
  }

  const startTokenResult = await driveApiFetch(accessToken, '/changes/startPageToken');
  const startPageToken = asString(startTokenResult?.startPageToken);

  const channelId = randomUUID();
  const channelToken = randomUUID();
  const expirationMs = Date.now() + CHANNEL_LIFETIME_MS;

  const watchResult = await driveApiFetch(accessToken, `/changes/watch?pageToken=${encodeURIComponent(startPageToken)}`, {
    method: 'POST',
    body: JSON.stringify({
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
      token: channelToken,
      expiration: String(expirationMs),
    }),
  });

  const expiration = asString(watchResult?.expiration) || String(expirationMs);

  await setWatchState({
    channelId,
    resourceId: asString(watchResult?.resourceId),
    channelToken,
    folderId,
    pageToken: startPageToken,
    expiration,
    userId: input.userId,
    connectionId,
    workflowId: input.workflowId,
    nodeId: input.nodeId,
  });

  return { success: true, webhookUrl, connectionId, channelId, expiration };
}

export async function unregisterGoogleDriveWatch(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
  connectionId?: string;
}): Promise<{ success: true; connectionId: string }> {
  const connectionId = await resolveConnectionId(input.userId, input.connectionId);
  const state = await getWatchState(input.workflowId, input.nodeId);

  if (state?.channelId) {
    const accessToken = await resolveAccessToken(input.userId).catch(() => null);
    if (accessToken) {
      await driveApiFetch(accessToken, '/channels/stop', {
        method: 'POST',
        body: JSON.stringify({ id: state.channelId, resourceId: state.resourceId }),
      }).catch((error) => {
        logger.warn('[Google Drive Trigger] Channel stop failed (continuing to clear local state):', error);
      });
    }
  }

  await deleteWatchState(input.workflowId, input.nodeId);
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

function nodeConfigOf(node: any): GoogleDriveTriggerConfig {
  return (node?.data?.config || node?.config || {}) as GoogleDriveTriggerConfig;
}

function connectionIdOf(node: any, triggerConfig: GoogleDriveTriggerConfig): string {
  const refs = {
    ...((node?.data?.connectionRefs || {}) as Record<string, unknown>),
    ...((node?.connectionRefs || {}) as Record<string, unknown>),
  };
  const candidates = [triggerConfig.connectionId, (node?.data as any)?.connectionId, node?.connectionId, refs.google, refs.google_oauth2];
  for (const value of candidates) if (typeof value === 'string' && value.trim()) return value.trim();
  return '';
}

export async function autoRegisterGoogleDriveWatchesForWorkflow(input: {
  userId: string;
  workflow: any;
}): Promise<GoogleDriveWatchRegistrationStatus[]> {
  if (!input.workflow || input.workflow.status !== 'active') return [];
  const workflowId = asString(input.workflow.id);
  if (!workflowId) return [];
  const triggers = workflowNodes(input.workflow).filter((node) => nodeTypeOf(node) === 'google_drive_trigger');
  const results: GoogleDriveWatchRegistrationStatus[] = [];

  for (const node of triggers) {
    const nodeId = asString(node?.id);
    if (!nodeId) continue;
    const triggerConfig = nodeConfigOf(node);
    try {
      const result = await registerGoogleDriveWatch({
        userId: input.userId,
        workflowId,
        nodeId,
        connectionId: connectionIdOf(node, triggerConfig),
        folderId: triggerConfig.folderId,
      });
      results.push({
        nodeId,
        success: true,
        webhookUrl: result.webhookUrl,
        connectionId: result.connectionId,
        channelId: result.channelId,
        expiration: result.expiration,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[Google Drive Trigger] Auto watch registration failed:', { workflowId, nodeId, error: message });
      results.push({ nodeId, success: false, error: message });
    }
  }

  return results;
}

export async function renewExpiringGoogleDriveWatches(): Promise<void> {
  const db = getDbClient();
  const { data: workflows, error } = await db
    .from('workflows')
    .select('id, user_id, nodes, graph, definition, status')
    .eq('status', 'active');

  if (error || !Array.isArray(workflows)) return;

  const renewBeforeMs = Date.now() + 2 * 24 * 60 * 60 * 1000;

  for (const workflow of workflows) {
    const triggers = workflowNodes(workflow).filter((node) => nodeTypeOf(node) === 'google_drive_trigger');
    for (const node of triggers) {
      const nodeId = asString(node?.id);
      const workflowId = asString(workflow?.id);
      if (!nodeId || !workflowId) continue;
      const triggerConfig = nodeConfigOf(node);

      try {
        const state = await getWatchState(workflowId, nodeId);
        const expirationMs = state?.expiration ? Number(state.expiration) : 0;
        if (state && expirationMs > renewBeforeMs) continue;

        await registerGoogleDriveWatch({
          userId: asString(workflow.user_id),
          workflowId,
          nodeId,
          connectionId: connectionIdOf(node, triggerConfig),
          folderId: triggerConfig.folderId,
        });
        logger.info('[Google Drive Trigger] Renewed watch channel', { workflowId, nodeId });
      } catch (renewError) {
        const message = renewError instanceof Error ? renewError.message : String(renewError);
        logger.warn('[Google Drive Trigger] Failed to renew watch channel', { workflowId, nodeId, error: message });
      }
    }
  }
}

export function startGoogleDriveWatchRenewalScheduler(): void {
  import('node-cron').then(({ default: cron }) => {
    cron.schedule('0 */6 * * *', () => {
      renewExpiringGoogleDriveWatches().catch((error) => {
        logger.warn('[Google Drive Trigger] Watch renewal sweep failed:', error);
      });
    });
    logger.info('[Google Drive Trigger] Watch renewal scheduler started (every 6 hours)');
  }).catch((error) => {
    logger.warn('[Google Drive Trigger] Failed to start watch renewal scheduler:', error);
  });
}

export { getWatchState as getGoogleDriveWatchState };
