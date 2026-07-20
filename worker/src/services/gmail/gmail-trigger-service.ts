import { createPublicKey, timingSafeEqual, verify as verifySignature } from 'crypto';
import type { Request } from 'express';
import { config } from '../../core/config';
import { getDbClient } from '../../core/database/aws-db-client';
import { logger } from '../../core/logger';
import { connectionService } from '../../credentials-system/connection-service';
import { getGoogleAccessToken } from '../../shared/google-sheets';
import { getRedisClient } from '../../shared/redis-client';

export type GmailEventType = 'message_added' | 'label_added' | 'label_removed' | 'message_deleted';

export type NormalizedGmailEvent = {
  eventId: string;
  eventType: GmailEventType;
  source: 'gmail';
  userId: string | null;
  username: string;
  text: string;
  timestamp: string;
  emailAddress: string;
  historyId: string;
  messageId: string | null;
  threadId: string | null;
  subject: string;
  from: string;
  to: string;
  snippet: string;
  labelIds: string[];
  raw: unknown;
};

export type GmailTriggerConfig = {
  connectionId?: string;
  pubsubTopic?: string;
  eventTypes?: string[] | string;
  labelIds?: string[] | string;
  query?: string;
  validateAuth?: boolean;
  audience?: string;
  validationSecret?: string;
};

export type GmailWatchRegistrationStatus = {
  nodeId: string;
  success: boolean;
  webhookUrl?: string;
  connectionId?: string;
  historyId?: string;
  expiration?: string;
  manualSetupRequired?: boolean;
  error?: string;
};

type GmailWatchState = {
  historyId: string;
  expiration: string;
  topicName: string;
  labelIds: string[];
  userId: string;
  connectionId?: string;
  workflowId: string;
  nodeId: string;
};

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';
const DEFAULT_EVENT_TYPES: GmailEventType[] = ['message_added'];
const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_TOKEN_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const WATCH_STATE_TTL_SECONDS = 9 * 24 * 60 * 60; // watches expire after 7 days; keep a 2-day buffer

let googleCertsCache: { value: any[]; expiresAt: number } | null = null;

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

function base64UrlDecode(value: string): Buffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64');
}

function decodeJwt(token: string): { header: any; payload: any; signingInput: Buffer; signature: Buffer } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return {
      header: JSON.parse(base64UrlDecode(parts[0]).toString('utf8')),
      payload: JSON.parse(base64UrlDecode(parts[1]).toString('utf8')),
      signingInput: Buffer.from(`${parts[0]}.${parts[1]}`),
      signature: base64UrlDecode(parts[2]),
    };
  } catch {
    return null;
  }
}

async function googleCerts(): Promise<any[]> {
  if (googleCertsCache && googleCertsCache.expiresAt > Date.now()) return googleCertsCache.value;
  const response = await fetch(GOOGLE_CERTS_URL);
  if (!response.ok) throw new Error(`Unable to load Google signing keys (${response.status})`);
  const json: any = await response.json();
  const keys = Array.isArray(json.keys) ? json.keys : [];
  googleCertsCache = { value: keys, expiresAt: Date.now() + 60 * 60 * 1000 };
  return keys;
}

async function validateGooglePushJwt(token: string, audience: string): Promise<boolean> {
  const decoded = decodeJwt(token);
  if (!decoded || decoded.header?.alg !== 'RS256' || !decoded.header?.kid) return false;
  const keys = await googleCerts();
  const key = keys.find((candidate) => candidate.kid === decoded.header.kid);
  if (!key) return false;
  const verified = verifySignature(
    'RSA-SHA256',
    decoded.signingInput,
    createPublicKey({ key, format: 'jwk' }),
    decoded.signature,
  );
  if (!verified) return false;

  const now = Math.floor(Date.now() / 1000);
  const exp = Number(decoded.payload?.exp || 0);
  if (exp && exp < now) return false;
  if (!GOOGLE_TOKEN_ISSUERS.includes(asString(decoded.payload?.iss))) return false;
  if (audience && decoded.payload?.aud !== audience) return false;
  return true;
}

function watchStateKey(workflowId: string, nodeId: string): string {
  return `gmail:watch:${workflowId}:${nodeId}`;
}

async function getWatchState(workflowId: string, nodeId: string): Promise<GmailWatchState | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  const raw = await redis.get(watchStateKey(workflowId, nodeId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GmailWatchState;
  } catch {
    return null;
  }
}

async function setWatchState(state: GmailWatchState): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.set(
    watchStateKey(state.workflowId, state.nodeId),
    JSON.stringify(state),
    'EX',
    WATCH_STATE_TTL_SECONDS,
  );
}

async function deleteWatchState(workflowId: string, nodeId: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.del(watchStateKey(workflowId, nodeId));
}

export async function updateGmailWatchHistoryId(workflowId: string, nodeId: string, historyId: string): Promise<void> {
  const state = await getWatchState(workflowId, nodeId);
  if (!state || !historyId) return;
  await setWatchState({ ...state, historyId });
}

export async function seedGmailWatchState(input: {
  workflowId: string;
  nodeId: string;
  userId: string;
  historyId: string;
  topicName: string;
  labelIds: string[];
  connectionId?: string;
}): Promise<void> {
  const existing = await getWatchState(input.workflowId, input.nodeId);
  if (existing) return;
  await setWatchState({
    historyId: input.historyId,
    expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000),
    topicName: input.topicName,
    labelIds: input.labelIds,
    userId: input.userId,
    connectionId: input.connectionId,
    workflowId: input.workflowId,
    nodeId: input.nodeId,
  });
}

export function getGmailWebhookUrl(workflowId: string, nodeId: string): string {
  const baseUrl = String(config.publicBaseUrl || '').replace(/\/+$/, '');
  if (!baseUrl) throw new Error('PUBLIC_BASE_URL is required to register Gmail push webhooks.');
  return `${baseUrl}/api/gmail/webhook/${encodeURIComponent(workflowId)}/${encodeURIComponent(nodeId)}`;
}

async function resolveGmailAccessToken(userId: string): Promise<string> {
  const db = getDbClient();
  const token = await getGoogleAccessToken(db, userId, ['https://www.googleapis.com/auth/gmail.readonly']);
  if (!token) throw new Error('No active Google connection found. Connect Google (Gmail) in Connections first.');
  return token;
}

async function resolveGmailConnectionId(userId: string, connectionId?: string): Promise<string> {
  if (asString(connectionId)) return asString(connectionId);
  const canonical = await connectionService.findCanonicalConnectionByProvider(userId, 'google').catch(() => null);
  return canonical?.id || '';
}

async function gmailApiFetch(accessToken: string, path: string, init?: RequestInit): Promise<any> {
  const response = await fetch(`${GMAIL_API_BASE}${path}`, {
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
    throw Object.assign(new Error(`Gmail API error (${response.status}): ${message}`), { statusCode: response.status });
  }
  return json;
}

function decodePubSubData(data: string): { emailAddress: string; historyId: string } {
  const decoded = Buffer.from(data, 'base64').toString('utf8');
  const parsed = JSON.parse(decoded);
  return {
    emailAddress: asString(parsed?.emailAddress),
    historyId: asString(parsed?.historyId),
  };
}

export function normalizeGmailPushEnvelope(body: any): { emailAddress: string; historyId: string } | null {
  const data = asString(body?.message?.data);
  if (!data) return null;
  try {
    return decodePubSubData(data);
  } catch {
    return null;
  }
}

function historyTypesFor(eventTypes: GmailEventType[]): string[] {
  const mapped = new Set<string>();
  for (const type of eventTypes) {
    if (type === 'message_added') mapped.add('messageAdded');
    else if (type === 'message_deleted') mapped.add('messageDeleted');
    else if (type === 'label_added') mapped.add('labelAdded');
    else if (type === 'label_removed') mapped.add('labelRemoved');
  }
  return mapped.size ? Array.from(mapped) : ['messageAdded'];
}

function headerValue(headers: Array<{ name?: string; value?: string }>, name: string): string {
  const match = headers.find((entry) => asString(entry?.name).toLowerCase() === name.toLowerCase());
  return asString(match?.value);
}

async function fetchMessageSummary(accessToken: string, messageId: string): Promise<any> {
  return gmailApiFetch(
    accessToken,
    `/users/me/messages/${encodeURIComponent(messageId)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
  );
}

export async function fetchNewGmailEvents(input: {
  accessToken: string;
  emailAddress: string;
  startHistoryId: string;
  eventTypes: GmailEventType[];
  labelId?: string;
}): Promise<{ events: NormalizedGmailEvent[]; latestHistoryId: string }> {
  const historyTypes = historyTypesFor(input.eventTypes);
  const messageIds = new Map<string, { messageId: string; threadId: string; labelIds: string[]; kind: GmailEventType }>();
  let latestHistoryId = input.startHistoryId;
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({ startHistoryId: input.startHistoryId });
    for (const type of historyTypes) params.append('historyTypes', type);
    if (input.labelId) params.set('labelId', input.labelId);
    if (pageToken) params.set('pageToken', pageToken);

    let page: any;
    try {
      page = await gmailApiFetch(input.accessToken, `/users/me/history?${params.toString()}`);
    } catch (error) {
      if ((error as any)?.statusCode === 404) {
        // startHistoryId too old / mailbox history truncated — nothing more we can recover.
        return { events: [], latestHistoryId: input.startHistoryId };
      }
      throw error;
    }

    if (asString(page?.historyId)) latestHistoryId = asString(page.historyId);

    for (const entry of Array.isArray(page?.history) ? page.history : []) {
      for (const added of Array.isArray(entry.messagesAdded) ? entry.messagesAdded : []) {
        const id = asString(added?.message?.id);
        if (id) messageIds.set(id, { messageId: id, threadId: asString(added?.message?.threadId), labelIds: added?.message?.labelIds || [], kind: 'message_added' });
      }
      for (const removed of Array.isArray(entry.messagesDeleted) ? entry.messagesDeleted : []) {
        const id = asString(removed?.message?.id);
        if (id && !messageIds.has(id)) messageIds.set(id, { messageId: id, threadId: asString(removed?.message?.threadId), labelIds: [], kind: 'message_deleted' });
      }
      for (const labelAdded of Array.isArray(entry.labelsAdded) ? entry.labelsAdded : []) {
        const id = asString(labelAdded?.message?.id);
        if (id && !messageIds.has(id)) messageIds.set(id, { messageId: id, threadId: asString(labelAdded?.message?.threadId), labelIds: labelAdded?.message?.labelIds || [], kind: 'label_added' });
      }
      for (const labelRemoved of Array.isArray(entry.labelsRemoved) ? entry.labelsRemoved : []) {
        const id = asString(labelRemoved?.message?.id);
        if (id && !messageIds.has(id)) messageIds.set(id, { messageId: id, threadId: asString(labelRemoved?.message?.threadId), labelIds: labelRemoved?.message?.labelIds || [], kind: 'label_removed' });
      }
    }

    pageToken = asString(page?.nextPageToken) || undefined;
  } while (pageToken);

  const events: NormalizedGmailEvent[] = [];
  for (const item of messageIds.values()) {
    let summary: any = null;
    if (item.kind !== 'message_deleted') {
      summary = await fetchMessageSummary(input.accessToken, item.messageId).catch(() => null);
    }
    const headers = Array.isArray(summary?.payload?.headers) ? summary.payload.headers : [];
    events.push({
      eventId: `${item.messageId}-${item.kind}`,
      eventType: item.kind,
      source: 'gmail',
      userId: input.emailAddress || null,
      username: input.emailAddress,
      text: asString(summary?.snippet),
      timestamp: summary?.internalDate
        ? new Date(Number(summary.internalDate)).toISOString()
        : new Date().toISOString(),
      emailAddress: input.emailAddress,
      historyId: latestHistoryId,
      messageId: item.messageId,
      threadId: item.threadId || asString(summary?.threadId) || null,
      subject: headerValue(headers, 'Subject'),
      from: headerValue(headers, 'From'),
      to: headerValue(headers, 'To'),
      snippet: asString(summary?.snippet),
      labelIds: summary?.labelIds || item.labelIds || [],
      raw: summary || { messageId: item.messageId, kind: item.kind },
    });
  }

  return { events, latestHistoryId };
}

export function shouldAcceptGmailEvent(
  normalized: NormalizedGmailEvent,
  triggerConfig: GmailTriggerConfig,
): { accepted: true } | { accepted: false; reason: string } {
  const allowedTypes = asStringList(triggerConfig.eventTypes);
  const normalizedAllowed = (allowedTypes.length ? allowedTypes : DEFAULT_EVENT_TYPES).map((value) =>
    value.trim().toLowerCase().replace(/[\s-]+/g, '_'),
  );
  if (!normalizedAllowed.includes(normalized.eventType)) {
    return { accepted: false, reason: `Ignored Gmail event type "${normalized.eventType}".` };
  }

  const labelIds = asStringList(triggerConfig.labelIds);
  if (labelIds.length > 0 && !normalized.labelIds.some((label) => labelIds.includes(label))) {
    return { accepted: false, reason: 'Ignored Gmail event not matching the configured label filter.' };
  }

  const query = asString(triggerConfig.query).toLowerCase();
  if (query) {
    const haystack = `${normalized.subject} ${normalized.from} ${normalized.snippet}`.toLowerCase();
    if (!haystack.includes(query)) {
      return { accepted: false, reason: 'Ignored Gmail event not matching the configured query filter.' };
    }
  }

  return { accepted: true };
}

export function buildGmailExecutionInput(input: {
  workflowId: string;
  nodeId: string;
  normalized: NormalizedGmailEvent;
}): Record<string, unknown> {
  return {
    ...input.normalized,
    trigger: 'gmail',
    workflow_id: input.workflowId,
    node_id: input.nodeId,
    sessionId: `gmail_${input.workflowId}_${input.normalized.threadId || input.normalized.messageId || input.normalized.eventId}`,
    _gmail: true,
  };
}

export async function validateGmailPushRequest(
  req: Request,
  input: { workflowId: string; nodeId: string; triggerConfig: GmailTriggerConfig },
): Promise<boolean> {
  if (input.triggerConfig.validateAuth === false) return true;

  const configuredSecret = asString(input.triggerConfig.validationSecret) || asString(process.env.GMAIL_PUBSUB_TOKEN);
  if (configuredSecret) {
    const received = asString((req.query as any)?.token) || header(req, 'x-goog-pubsub-token');
    if (received && timingEqualString(received, configuredSecret)) return true;
  }

  const authorization = header(req, 'authorization');
  const token = authorization.toLowerCase().startsWith('bearer ') ? authorization.slice(7).trim() : '';
  if (!token) return false;

  const audience = asString(input.triggerConfig.audience) || getGmailWebhookUrl(input.workflowId, input.nodeId);
  return validateGooglePushJwt(token, audience).catch((error) => {
    logger.warn('[Gmail Trigger] Push JWT validation failed:', error);
    return false;
  });
}

export async function registerGmailWatch(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
  connectionId?: string;
  topicName: string;
  labelIds?: string[];
}): Promise<{
  success: true;
  webhookUrl: string;
  connectionId: string;
  historyId: string;
  expiration: string;
  manualSetupRequired: boolean;
}> {
  const topicName = asString(input.topicName);
  if (!topicName) {
    throw Object.assign(new Error('A Google Cloud Pub/Sub topic name is required to watch a Gmail mailbox.'), { statusCode: 400 });
  }

  const accessToken = await resolveGmailAccessToken(input.userId);
  const connectionId = await resolveGmailConnectionId(input.userId, input.connectionId);

  const body: Record<string, unknown> = { topicName };
  if (input.labelIds?.length) body.labelIds = input.labelIds;

  const result = await gmailApiFetch(accessToken, '/users/me/watch', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const historyId = asString(result?.historyId);
  const expiration = asString(result?.expiration);

  await setWatchState({
    historyId,
    expiration,
    topicName,
    labelIds: input.labelIds || [],
    userId: input.userId,
    connectionId,
    workflowId: input.workflowId,
    nodeId: input.nodeId,
  });

  return {
    success: true,
    webhookUrl: getGmailWebhookUrl(input.workflowId, input.nodeId),
    connectionId,
    historyId,
    expiration,
    manualSetupRequired: true,
  };
}

export async function unregisterGmailWatch(input: {
  userId: string;
  workflowId?: string;
  nodeId?: string;
  connectionId?: string;
}): Promise<{ success: true; connectionId: string; manualSetupRequired: boolean }> {
  const accessToken = await resolveGmailAccessToken(input.userId);
  const connectionId = await resolveGmailConnectionId(input.userId, input.connectionId);

  await gmailApiFetch(accessToken, '/users/me/stop', { method: 'POST' }).catch((error) => {
    logger.warn('[Gmail Trigger] users.stop failed (continuing to clear local state):', error);
  });

  if (input.workflowId && input.nodeId) {
    await deleteWatchState(input.workflowId, input.nodeId);
  }

  return { success: true, connectionId, manualSetupRequired: true };
}

function workflowNodes(workflow: any): any[] {
  const candidates = [workflow?.nodes, workflow?.graph?.nodes, workflow?.definition?.nodes, workflow?.definition?.graph?.nodes];
  for (const value of candidates) if (Array.isArray(value)) return value;
  return [];
}

function nodeTypeOf(node: any): string {
  return String(node?.data?.type || node?.type || '').trim();
}

function nodeConfigOf(node: any): GmailTriggerConfig {
  return (node?.data?.config || node?.config || {}) as GmailTriggerConfig;
}

function connectionIdOf(node: any, triggerConfig: GmailTriggerConfig): string {
  const refs = {
    ...((node?.data?.connectionRefs || {}) as Record<string, unknown>),
    ...((node?.connectionRefs || {}) as Record<string, unknown>),
  };
  const candidates = [triggerConfig.connectionId, (node?.data as any)?.connectionId, node?.connectionId, refs.google, refs.google_oauth2];
  for (const value of candidates) if (typeof value === 'string' && value.trim()) return value.trim();
  return '';
}

export async function autoRegisterGmailWatchesForWorkflow(input: {
  userId: string;
  workflow: any;
}): Promise<GmailWatchRegistrationStatus[]> {
  if (!input.workflow || input.workflow.status !== 'active') return [];
  const workflowId = asString(input.workflow.id);
  if (!workflowId) return [];
  const triggers = workflowNodes(input.workflow).filter((node) => nodeTypeOf(node) === 'gmail_trigger');
  const results: GmailWatchRegistrationStatus[] = [];

  for (const node of triggers) {
    const nodeId = asString(node?.id);
    if (!nodeId) continue;
    const triggerConfig = nodeConfigOf(node);
    const topicName = asString(triggerConfig.pubsubTopic);
    if (!topicName) {
      results.push({ nodeId, success: false, error: 'Pub/Sub topic name is required (set it on the Gmail Trigger node).' });
      continue;
    }
    try {
      const result = await registerGmailWatch({
        userId: input.userId,
        workflowId,
        nodeId,
        connectionId: connectionIdOf(node, triggerConfig),
        topicName,
        labelIds: asStringList(triggerConfig.labelIds),
      });
      results.push({
        nodeId,
        success: true,
        webhookUrl: result.webhookUrl,
        connectionId: result.connectionId,
        historyId: result.historyId,
        expiration: result.expiration,
        manualSetupRequired: result.manualSetupRequired,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[Gmail Trigger] Auto watch registration failed:', { workflowId, nodeId, error: message });
      results.push({ nodeId, success: false, error: message });
    }
  }

  return results;
}

export { getWatchState as getGmailWatchState };

export async function renewExpiringGmailWatches(): Promise<void> {
  const db = getDbClient();
  const { data: workflows, error } = await db
    .from('workflows')
    .select('id, user_id, nodes, graph, definition, status')
    .eq('status', 'active');

  if (error || !Array.isArray(workflows)) return;

  const renewBeforeMs = Date.now() + 2 * 24 * 60 * 60 * 1000; // renew if expiring within 2 days

  for (const workflow of workflows) {
    const triggers = workflowNodes(workflow).filter((node) => nodeTypeOf(node) === 'gmail_trigger');
    for (const node of triggers) {
      const nodeId = asString(node?.id);
      const workflowId = asString(workflow?.id);
      if (!nodeId || !workflowId) continue;
      const triggerConfig = nodeConfigOf(node);
      const topicName = asString(triggerConfig.pubsubTopic);
      if (!topicName) continue;

      try {
        const state = await getWatchState(workflowId, nodeId);
        const expirationMs = state?.expiration ? Number(state.expiration) : 0;
        if (state && expirationMs > renewBeforeMs) continue; // still fresh

        await registerGmailWatch({
          userId: asString(workflow.user_id),
          workflowId,
          nodeId,
          connectionId: connectionIdOf(node, triggerConfig),
          topicName,
          labelIds: asStringList(triggerConfig.labelIds),
        });
        logger.info('[Gmail Trigger] Renewed Gmail watch', { workflowId, nodeId });
      } catch (renewError) {
        const message = renewError instanceof Error ? renewError.message : String(renewError);
        logger.warn('[Gmail Trigger] Failed to renew Gmail watch', { workflowId, nodeId, error: message });
      }
    }
  }
}

export function startGmailWatchRenewalScheduler(): void {
  import('node-cron').then(({ default: cron }) => {
    cron.schedule('0 */6 * * *', () => {
      renewExpiringGmailWatches().catch((error) => {
        logger.warn('[Gmail Trigger] Watch renewal sweep failed:', error);
      });
    });
    logger.info('[Gmail Trigger] Watch renewal scheduler started (every 6 hours)');
  }).catch((error) => {
    logger.warn('[Gmail Trigger] Failed to start watch renewal scheduler:', error);
  });
}
