import { randomUUID, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { config } from '../../core/config';
import { logger } from '../../core/logger';
import { connectionService } from '../../credentials-system/connection-service';
import type { DecryptedConnection } from '../../credentials-system/types';
import { getInstagramBusinessAccountId } from '../../shared/instagram-token-manager';
import { verifyMetaWebhookSignature } from '../social/meta-webhook-verifier';

export type InstagramEventType =
  | 'message'
  | 'message.text'
  | 'message.media'
  | 'message.story_reply'
  | 'comment'
  | 'mention'
  | 'postback'
  | 'unknown';

export type NormalizedInstagramEvent = {
  eventId: string;
  eventType: InstagramEventType;
  source: 'instagram';
  userId: string | null;
  username: string;
  text: string;
  timestamp: string;
  chatId: string | null;
  senderId: string | null;
  recipientId: string | null;
  instagramBusinessAccountId: string | null;
  pageId: string | null;
  messageId: string | null;
  messageType: string;
  commentId: string | null;
  mediaId: string | null;
  mentionId: string | null;
  postbackPayload: string;
  isStoryReply: boolean;
  raw: unknown;
};

export type InstagramTriggerConfig = {
  connectionId?: string;
  event?: string;
  eventTypes?: string[] | string;
  instagramBusinessAccountId?: string;
  pageId?: string;
  allowedSenderIds?: string[] | string;
  verifyToken?: string;
  validateSignature?: boolean;
};

export type InstagramWebhookRegistrationStatus = {
  nodeId: string;
  success: boolean;
  webhookUrl?: string;
  connectionId?: string;
  instagramBusinessAccountId?: string;
  subscribedFields?: string[];
  manualSetupRequired?: boolean;
  subscribed?: boolean;
  error?: string;
};

const GRAPH_VERSION = 'v19.0';
const DEFAULT_EVENT_TYPES = ['message', 'comment', 'mention', 'message.story_reply'];
const DEFAULT_SUBSCRIBED_FIELDS = ['messages', 'comments', 'mentions'];

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

function envMetaAppSecret(): string {
  return asString(process.env.META_APP_SECRET)
    || asString(process.env.INSTAGRAM_APP_SECRET)
    || asString(process.env.FACEBOOK_APP_SECRET);
}

function rawRequestBody(req: Request): Buffer {
  const raw = (req as any).rawBody;
  if (Buffer.isBuffer(raw)) return raw;
  if (raw !== undefined && raw !== null) return Buffer.from(String(raw));
  return Buffer.from(JSON.stringify(req.body || {}));
}

function getSignatureHeader(req: Request): string {
  const value = req.headers['x-hub-signature-256'];
  return Array.isArray(value) ? value[0] || '' : asString(value);
}

function credentialString(credentials: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = asString(credentials[key]);
    if (value) return value;
  }
  return '';
}

function extractToken(connection: DecryptedConnection): string {
  const credentials = connection.credentials || {};
  const token = credentialString(credentials, ['accessToken', 'access_token', 'token']);
  if (!token) throw new Error('Instagram access token is missing from the selected connection.');
  return token;
}

function extractInstagramBusinessAccountId(connection: DecryptedConnection): string {
  const credentials = connection.credentials || {};
  const metadata = connection.metadata || {};
  return credentialString(credentials, ['instagramBusinessAccountId', 'instagram_business_account_id', 'igUserId', 'accountId'])
    || credentialString(metadata as Record<string, unknown>, ['instagramBusinessAccountId', 'instagram_business_account_id', 'igUserId', 'accountId'])
    || asString(connection.externalAccountId);
}

function extractPageId(connection: DecryptedConnection): string {
  const credentials = connection.credentials || {};
  const metadata = connection.metadata || {};
  return credentialString(credentials, ['pageId', 'facebookPageId', 'page_id'])
    || credentialString(metadata as Record<string, unknown>, ['pageId', 'facebookPageId', 'page_id']);
}

export function getInstagramWebhookUrl(workflowId: string, nodeId: string): string {
  const baseUrl = String(config.publicBaseUrl || '').replace(/\/+$/, '');
  if (!baseUrl) throw new Error('PUBLIC_BASE_URL is required to register Instagram webhooks.');
  return `${baseUrl}/api/instagram/webhook/${encodeURIComponent(workflowId)}/${encodeURIComponent(nodeId)}`;
}

export function validateInstagramVerifyToken(req: Request, triggerConfig: InstagramTriggerConfig): string | null {
  const mode = asString(req.query['hub.mode']);
  const token = asString(req.query['hub.verify_token']);
  const challenge = asString(req.query['hub.challenge']);
  const expected = asString(triggerConfig.verifyToken);
  if (mode !== 'subscribe' || !challenge || !expected) return null;
  const received = Buffer.from(token);
  const configured = Buffer.from(expected);
  if (received.length !== configured.length || !timingSafeEqual(received, configured)) return null;
  return challenge;
}

export function validateInstagramSignature(req: Request, triggerConfig: InstagramTriggerConfig): boolean {
  if (triggerConfig.validateSignature === false) return true;
  const appSecret = envMetaAppSecret();
  if (!appSecret) return false;
  return verifyMetaWebhookSignature(appSecret, rawRequestBody(req), getSignatureHeader(req));
}

function timestampFromMeta(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value < 10_000_000_000 ? value * 1000 : value).toISOString();
  const raw = asString(value);
  if (!raw) return new Date().toISOString();
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) return new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric).toISOString();
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function textFromMessage(message: any): string {
  return asString(message?.text)
    || asString(message?.quick_reply?.payload)
    || asString(message?.reply_to?.story?.url)
    || asString(message?.attachments?.[0]?.payload?.url)
    || asString(message?.attachment?.payload?.url);
}

function messageType(message: any): string {
  if (asString(message?.text)) return 'text';
  const attachmentType = asString(message?.attachments?.[0]?.type) || asString(message?.attachment?.type);
  if (attachmentType) return attachmentType;
  if (message?.reply_to?.story) return 'story_reply';
  return 'unknown';
}

function messageEventType(message: any): InstagramEventType {
  if (message?.reply_to?.story) return 'message.story_reply';
  const type = messageType(message);
  if (type === 'text') return 'message.text';
  if (type !== 'unknown') return 'message.media';
  return 'message';
}

function normalizeMessagingEvent(entry: any, messaging: any): NormalizedInstagramEvent | null {
  const senderId = asString(messaging?.sender?.id) || null;
  const recipientId = asString(messaging?.recipient?.id) || asString(entry?.id) || null;
  const message = messaging?.message || null;
  const postback = messaging?.postback || null;
  const eventType: InstagramEventType = postback ? 'postback' : message ? messageEventType(message) : 'unknown';
  if (eventType === 'unknown') return null;
  const text = message ? textFromMessage(message) : asString(postback?.title) || asString(postback?.payload);
  const isStoryReply = Boolean(message?.reply_to?.story);
  return {
    eventId: asString(message?.mid) || asString(postback?.mid) || randomUUID(),
    eventType,
    source: 'instagram',
    userId: senderId,
    username: asString(messaging?.sender?.username),
    text,
    timestamp: timestampFromMeta(messaging?.timestamp || entry?.time),
    chatId: senderId,
    senderId,
    recipientId,
    instagramBusinessAccountId: recipientId,
    pageId: asString(entry?.id) || null,
    messageId: asString(message?.mid) || null,
    messageType: message ? messageType(message) : 'postback',
    commentId: null,
    mediaId: null,
    mentionId: null,
    postbackPayload: asString(postback?.payload),
    isStoryReply,
    raw: { entry, messaging },
  };
}

function normalizeChangeEvent(entry: any, change: any): NormalizedInstagramEvent | null {
  const field = asString(change?.field).toLowerCase();
  const value = change?.value || {};
  const senderId = asString(value?.sender?.id) || asString(value?.from?.id) || asString(value?.user_id) || null;
  const recipientId = asString(value?.recipient?.id) || asString(value?.to?.id) || asString(entry?.id) || null;
  const igUserId = asString(value?.ig_id) || asString(value?.instagram_business_account_id) || asString(entry?.id) || null;

  if (field === 'messages' || field === 'messaging') {
    const event = normalizeMessagingEvent(entry, value);
    if (event) return event;
    const message = value?.message || value;
    return {
      eventId: asString(message?.mid) || asString(message?.id) || randomUUID(),
      eventType: messageEventType(message),
      source: 'instagram',
      userId: senderId,
      username: asString(value?.sender?.username) || asString(value?.from?.username),
      text: textFromMessage(message),
      timestamp: timestampFromMeta(value?.timestamp || entry?.time),
      chatId: senderId,
      senderId,
      recipientId,
      instagramBusinessAccountId: igUserId,
      pageId: asString(entry?.id) || null,
      messageId: asString(message?.mid) || asString(message?.id) || null,
      messageType: messageType(message),
      commentId: null,
      mediaId: null,
      mentionId: null,
      postbackPayload: '',
      isStoryReply: Boolean(message?.reply_to?.story),
      raw: { entry, change },
    };
  }

  if (field === 'comments' || field === 'comment') {
    return {
      eventId: asString(value?.id) || asString(value?.comment_id) || randomUUID(),
      eventType: 'comment',
      source: 'instagram',
      userId: senderId,
      username: asString(value?.from?.username) || asString(value?.username),
      text: asString(value?.text) || asString(value?.message),
      timestamp: timestampFromMeta(value?.created_time || value?.timestamp || entry?.time),
      chatId: senderId,
      senderId,
      recipientId,
      instagramBusinessAccountId: igUserId,
      pageId: asString(entry?.id) || null,
      messageId: null,
      messageType: 'comment',
      commentId: asString(value?.id) || asString(value?.comment_id) || null,
      mediaId: asString(value?.media?.id) || asString(value?.media_id) || null,
      mentionId: null,
      postbackPayload: '',
      isStoryReply: false,
      raw: { entry, change },
    };
  }

  if (field === 'mentions' || field === 'mention' || field === 'story_mentions') {
    return {
      eventId: asString(value?.id) || asString(value?.mention_id) || randomUUID(),
      eventType: 'mention',
      source: 'instagram',
      userId: senderId,
      username: asString(value?.from?.username) || asString(value?.username),
      text: asString(value?.text) || asString(value?.message) || asString(value?.caption),
      timestamp: timestampFromMeta(value?.created_time || value?.timestamp || entry?.time),
      chatId: senderId,
      senderId,
      recipientId,
      instagramBusinessAccountId: igUserId,
      pageId: asString(entry?.id) || null,
      messageId: null,
      messageType: 'mention',
      commentId: asString(value?.comment_id) || null,
      mediaId: asString(value?.media?.id) || asString(value?.media_id) || null,
      mentionId: asString(value?.id) || asString(value?.mention_id) || null,
      postbackPayload: '',
      isStoryReply: field === 'story_mentions',
      raw: { entry, change },
    };
  }

  return null;
}

export function normalizeInstagramWebhookPayload(payload: any): NormalizedInstagramEvent[] {
  const events: NormalizedInstagramEvent[] = [];
  for (const entry of Array.isArray(payload?.entry) ? payload.entry : []) {
    for (const messaging of Array.isArray(entry?.messaging) ? entry.messaging : []) {
      const normalized = normalizeMessagingEvent(entry, messaging);
      if (normalized) events.push(normalized);
    }
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      const normalized = normalizeChangeEvent(entry, change);
      if (normalized) events.push(normalized);
    }
  }
  return events;
}

function acceptedEventAliases(value: string): string[] {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return [];
  if (['dm', 'direct_message', 'message.received', 'messages'].includes(normalized)) return ['message', 'message.text', 'message.media', 'message.story_reply'];
  if (['story_reply', 'story.reply'].includes(normalized)) return ['message.story_reply'];
  if (['comments', 'comment.created'].includes(normalized)) return ['comment'];
  if (['mentions', 'mention.created'].includes(normalized)) return ['mention'];
  if (['postbacks', 'postback.received'].includes(normalized)) return ['postback'];
  return [normalized];
}

export function shouldAcceptInstagramEvent(
  normalized: NormalizedInstagramEvent,
  triggerConfig: InstagramTriggerConfig,
): { accepted: true } | { accepted: false; reason: string } {
  const rawEventTypes = [
    ...asStringList(triggerConfig.eventTypes),
    ...asStringList(triggerConfig.event),
  ];
  const allowed = (rawEventTypes.length ? rawEventTypes : DEFAULT_EVENT_TYPES).flatMap(acceptedEventAliases);
  if (!allowed.includes(normalized.eventType) && !(allowed.includes('message') && normalized.eventType.startsWith('message.'))) {
    return { accepted: false, reason: `Ignored Instagram event type "${normalized.eventType}".` };
  }

  const instagramBusinessAccountId = asString(triggerConfig.instagramBusinessAccountId) || asString(triggerConfig.pageId);
  if (instagramBusinessAccountId && normalized.instagramBusinessAccountId !== instagramBusinessAccountId && normalized.pageId !== instagramBusinessAccountId) {
    return { accepted: false, reason: 'Ignored Instagram event for a different business account.' };
  }

  const allowedSenderIds = asStringList(triggerConfig.allowedSenderIds);
  if (allowedSenderIds.length > 0 && (!normalized.senderId || !allowedSenderIds.includes(normalized.senderId))) {
    return { accepted: false, reason: 'Ignored Instagram event from a sender that is not allowed.' };
  }

  return { accepted: true };
}

export async function resolveInstagramConnection(input: {
  userId: string;
  connectionId?: string;
}): Promise<{
  token: string;
  connectionId: string;
  instagramBusinessAccountId: string;
  pageId: string;
}> {
  let connectionId = asString(input.connectionId);
  if (!connectionId) {
    const canonical =
      await connectionService.findCanonicalConnection(input.userId, 'instagram_oauth2')
      || await connectionService.findCanonicalConnectionByProvider(input.userId, 'instagram');
    connectionId = canonical?.id || '';
  }
  if (!connectionId) {
    throw new Error('No active Instagram connection found. Create one in Connections first.');
  }

  const connection = await connectionService.getDecryptedConnection(input.userId, connectionId);
  if (connection.provider !== 'instagram' && connection.credentialTypeId !== 'instagram_oauth2') {
    throw new Error('Selected connection is not an Instagram connection.');
  }

  const token = extractToken(connection);
  const pageId = extractPageId(connection);
  const instagramBusinessAccountId = extractInstagramBusinessAccountId(connection)
    || await getInstagramBusinessAccountId(token, pageId)
    || '';
  return { token, connectionId: connection.id, instagramBusinessAccountId, pageId };
}

async function callMetaApi<T>(token: string, path: string, method = 'GET', body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data: any = await response.json().catch(() => null);
  if (!response.ok || data?.error) {
    throw new Error(data?.error?.message || response.statusText || 'Meta Graph API request failed');
  }
  return data as T;
}

export async function registerInstagramWebhook(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
  connectionId?: string;
  instagramBusinessAccountId?: string;
  eventTypes?: string[] | string;
}): Promise<{
  success: true;
  webhookUrl: string;
  connectionId: string;
  instagramBusinessAccountId: string;
  subscribedFields: string[];
  manualSetupRequired: boolean;
  subscribed: boolean;
}> {
  const connection = await resolveInstagramConnection({ userId: input.userId, connectionId: input.connectionId });
  const instagramBusinessAccountId = asString(input.instagramBusinessAccountId) || connection.instagramBusinessAccountId;
  const eventTypes = asStringList(input.eventTypes);
  const subscribedFields = eventTypes.length
    ? Array.from(new Set(eventTypes.flatMap((value) => {
        const aliases = acceptedEventAliases(value);
        if (aliases.some((alias) => alias.startsWith('message') || alias === 'postback')) return ['messages'];
        if (aliases.includes('comment')) return ['comments'];
        if (aliases.includes('mention')) return ['mentions'];
        return [];
      }))).filter(Boolean)
    : DEFAULT_SUBSCRIBED_FIELDS;

  let subscribed = false;
  if (instagramBusinessAccountId) {
    await callMetaApi(
      connection.token,
      `/${encodeURIComponent(instagramBusinessAccountId)}/subscribed_apps`,
      'POST',
      { subscribed_fields: subscribedFields.join(',') },
    ).then(() => {
      subscribed = true;
    }).catch((error) => {
      logger.warn('[Instagram Trigger] Unable to subscribe Instagram app automatically:', error);
    });
  }

  return {
    success: true,
    webhookUrl: getInstagramWebhookUrl(input.workflowId, input.nodeId),
    connectionId: connection.connectionId,
    instagramBusinessAccountId,
    subscribedFields,
    manualSetupRequired: true,
    subscribed,
  };
}

export async function unregisterInstagramWebhook(input: {
  userId: string;
  connectionId?: string;
  instagramBusinessAccountId?: string;
}): Promise<{ success: true; connectionId: string; instagramBusinessAccountId: string; unsubscribed: boolean }> {
  const connection = await resolveInstagramConnection({ userId: input.userId, connectionId: input.connectionId });
  const instagramBusinessAccountId = asString(input.instagramBusinessAccountId) || connection.instagramBusinessAccountId;
  let unsubscribed = false;
  if (instagramBusinessAccountId) {
    await callMetaApi(connection.token, `/${encodeURIComponent(instagramBusinessAccountId)}/subscribed_apps`, 'DELETE').then(() => {
      unsubscribed = true;
    }).catch((error) => {
      logger.warn('[Instagram Trigger] Unable to unsubscribe Instagram app automatically:', error);
    });
  }
  return { success: true, connectionId: connection.connectionId, instagramBusinessAccountId, unsubscribed };
}

function workflowNodes(workflow: any): any[] {
  const candidates = [workflow?.nodes, workflow?.graph?.nodes, workflow?.definition?.nodes, workflow?.definition?.graph?.nodes];
  for (const value of candidates) if (Array.isArray(value)) return value;
  return [];
}

function nodeTypeOf(node: any): string {
  return String(node?.data?.type || node?.type || '').trim();
}

function nodeConfigOf(node: any): InstagramTriggerConfig {
  return (node?.data?.config || node?.config || {}) as InstagramTriggerConfig;
}

function connectionIdOf(node: any, triggerConfig: InstagramTriggerConfig): string {
  const refs = {
    ...((node?.data?.connectionRefs || {}) as Record<string, unknown>),
    ...((node?.connectionRefs || {}) as Record<string, unknown>),
    ...(((triggerConfig as any).connectionRefs || {}) as Record<string, unknown>),
  };
  const candidates = [
    triggerConfig.connectionId,
    (node?.data as any)?.connectionId,
    node?.connectionId,
    refs.instagram_oauth2,
    refs.instagram,
    refs.facebook,
  ];
  for (const value of candidates) if (typeof value === 'string' && value.trim()) return value.trim();
  return '';
}

export async function autoRegisterInstagramWebhooksForWorkflow(input: {
  userId: string;
  workflow: any;
}): Promise<InstagramWebhookRegistrationStatus[]> {
  if (!input.workflow || input.workflow.status !== 'active') return [];
  const workflowId = asString(input.workflow.id);
  if (!workflowId) return [];
  const triggers = workflowNodes(input.workflow).filter((node) => nodeTypeOf(node) === 'instagram_trigger');
  const results: InstagramWebhookRegistrationStatus[] = [];

  for (const node of triggers) {
    const nodeId = asString(node?.id);
    if (!nodeId) continue;
    const triggerConfig = nodeConfigOf(node);
    try {
      const result = await registerInstagramWebhook({
        userId: input.userId,
        workflowId,
        nodeId,
        connectionId: connectionIdOf(node, triggerConfig),
        instagramBusinessAccountId: triggerConfig.instagramBusinessAccountId || triggerConfig.pageId,
        eventTypes: triggerConfig.eventTypes || triggerConfig.event,
      });
      results.push({
        nodeId,
        success: true,
        webhookUrl: result.webhookUrl,
        connectionId: result.connectionId,
        instagramBusinessAccountId: result.instagramBusinessAccountId,
        subscribedFields: result.subscribedFields,
        manualSetupRequired: result.manualSetupRequired,
        subscribed: result.subscribed,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[Instagram Trigger] Auto webhook registration failed:', { workflowId, nodeId, error: message });
      results.push({ nodeId, success: false, error: message });
    }
  }

  return results;
}

export function buildInstagramExecutionInput(input: {
  workflowId: string;
  nodeId: string;
  normalized: NormalizedInstagramEvent;
}): Record<string, unknown> {
  return {
    ...input.normalized,
    trigger: 'instagram',
    workflow_id: input.workflowId,
    node_id: input.nodeId,
    sessionId: input.normalized.chatId
      ? `instagram_${input.workflowId}_${input.normalized.chatId}`
      : `instagram_${input.workflowId}_${randomUUID()}`,
    _instagram: true,
  };
}
