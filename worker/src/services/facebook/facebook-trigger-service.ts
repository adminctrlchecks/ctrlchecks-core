import { randomUUID, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { config } from '../../core/config';
import { logger } from '../../core/logger';
import { connectionService } from '../../credentials-system/connection-service';
import type { DecryptedConnection } from '../../credentials-system/types';
import { verifyMetaWebhookSignature } from '../social/meta-webhook-verifier';

export type FacebookEventType =
  | 'message'
  | 'message.text'
  | 'message.media'
  | 'comment'
  | 'mention'
  | 'postback'
  | 'leadgen'
  | 'feed'
  | 'feed.post'
  | 'feed.comment'
  | 'unknown';

export type NormalizedFacebookEvent = {
  eventId: string;
  eventType: FacebookEventType;
  source: 'facebook';
  userId: string | null;
  username: string;
  text: string;
  timestamp: string;
  chatId: string | null;
  senderId: string | null;
  recipientId: string | null;
  pageId: string | null;
  messageId: string | null;
  messageType: string;
  commentId: string | null;
  postId: string | null;
  parentId: string | null;
  leadgenId: string | null;
  formId: string | null;
  postbackPayload: string;
  field: string;
  verb: string;
  item: string;
  raw: unknown;
};

export type FacebookTriggerConfig = {
  connectionId?: string;
  event?: string;
  eventTypes?: string[] | string;
  pageId?: string;
  allowedSenderIds?: string[] | string;
  verifyToken?: string;
  validateSignature?: boolean;
};

export type FacebookWebhookRegistrationStatus = {
  nodeId: string;
  success: boolean;
  webhookUrl?: string;
  connectionId?: string;
  pageId?: string;
  subscribedFields?: string[];
  manualSetupRequired?: boolean;
  subscribed?: boolean;
  error?: string;
};

const GRAPH_VERSION = 'v19.0';
const DEFAULT_EVENT_TYPES = ['message', 'comment', 'mention', 'postback', 'leadgen', 'feed'];
const DEFAULT_SUBSCRIBED_FIELDS = ['messages', 'feed', 'mention', 'leadgen'];

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
    || asString(process.env.FACEBOOK_APP_SECRET)
    || asString(process.env.INSTAGRAM_APP_SECRET);
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
  if (!token) throw new Error('Facebook access token is missing from the selected connection.');
  return token;
}

function extractPageId(connection: DecryptedConnection): string {
  const credentials = connection.credentials || {};
  const metadata = connection.metadata || {};
  return credentialString(credentials, ['pageId', 'facebookPageId', 'page_id'])
    || credentialString(metadata as Record<string, unknown>, ['pageId', 'facebookPageId', 'page_id'])
    || asString(connection.externalAccountId);
}

export function getFacebookWebhookUrl(workflowId: string, nodeId: string): string {
  const baseUrl = String(config.publicBaseUrl || '').replace(/\/+$/, '');
  if (!baseUrl) throw new Error('PUBLIC_BASE_URL is required to register Facebook webhooks.');
  return `${baseUrl}/api/facebook/webhook/${encodeURIComponent(workflowId)}/${encodeURIComponent(nodeId)}`;
}

export function validateFacebookVerifyToken(req: Request, triggerConfig: FacebookTriggerConfig): string | null {
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

export function validateFacebookSignature(req: Request, triggerConfig: FacebookTriggerConfig): boolean {
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
    || asString(message?.attachments?.[0]?.payload?.url)
    || asString(message?.attachment?.payload?.url);
}

function messageType(message: any): string {
  if (asString(message?.text)) return 'text';
  const attachmentType = asString(message?.attachments?.[0]?.type) || asString(message?.attachment?.type);
  if (attachmentType) return attachmentType;
  return 'unknown';
}

function messageEventType(message: any): FacebookEventType {
  const type = messageType(message);
  if (type === 'text') return 'message.text';
  if (type !== 'unknown') return 'message.media';
  return 'message';
}

function normalizeMessagingEvent(entry: any, messaging: any): NormalizedFacebookEvent | null {
  const senderId = asString(messaging?.sender?.id) || null;
  const recipientId = asString(messaging?.recipient?.id) || asString(entry?.id) || null;
  const message = messaging?.message || null;
  const postback = messaging?.postback || null;
  const eventType: FacebookEventType = postback ? 'postback' : message ? messageEventType(message) : 'unknown';
  if (eventType === 'unknown') return null;
  return {
    eventId: asString(message?.mid) || asString(postback?.mid) || randomUUID(),
    eventType,
    source: 'facebook',
    userId: senderId,
    username: asString(messaging?.sender?.name),
    text: message ? textFromMessage(message) : asString(postback?.title) || asString(postback?.payload),
    timestamp: timestampFromMeta(messaging?.timestamp || entry?.time),
    chatId: senderId,
    senderId,
    recipientId,
    pageId: recipientId || asString(entry?.id) || null,
    messageId: asString(message?.mid) || null,
    messageType: message ? messageType(message) : 'postback',
    commentId: null,
    postId: null,
    parentId: null,
    leadgenId: null,
    formId: null,
    postbackPayload: asString(postback?.payload),
    field: 'messages',
    verb: '',
    item: '',
    raw: { entry, messaging },
  };
}

function normalizeFeedEvent(entry: any, change: any): NormalizedFacebookEvent {
  const value = change?.value || {};
  const item = asString(value?.item).toLowerCase();
  const eventType: FacebookEventType = item === 'comment'
    ? 'feed.comment'
    : item === 'post'
      ? 'feed.post'
      : 'feed';
  const senderId = asString(value?.sender_id) || asString(value?.from?.id) || null;
  const postId = asString(value?.post_id) || asString(value?.parent_id) || null;
  const commentId = asString(value?.comment_id) || (item === 'comment' ? asString(value?.id) : '') || null;
  return {
    eventId: asString(value?.id) || commentId || postId || randomUUID(),
    eventType,
    source: 'facebook',
    userId: senderId,
    username: asString(value?.sender_name) || asString(value?.from?.name),
    text: asString(value?.message) || asString(value?.description),
    timestamp: timestampFromMeta(value?.created_time || entry?.time),
    chatId: senderId,
    senderId,
    recipientId: asString(entry?.id) || null,
    pageId: asString(value?.page_id) || asString(entry?.id) || null,
    messageId: null,
    messageType: 'feed',
    commentId,
    postId,
    parentId: asString(value?.parent_id) || null,
    leadgenId: null,
    formId: null,
    postbackPayload: '',
    field: asString(change?.field),
    verb: asString(value?.verb),
    item,
    raw: { entry, change },
  };
}

function normalizeChangeEvent(entry: any, change: any): NormalizedFacebookEvent | null {
  const field = asString(change?.field).toLowerCase();
  const value = change?.value || {};
  const senderId = asString(value?.sender?.id) || asString(value?.from?.id) || asString(value?.sender_id) || null;

  if (field === 'messages' || field === 'messaging') {
    const event = normalizeMessagingEvent(entry, value);
    if (event) return event;
    const message = value?.message || value;
    return {
      eventId: asString(message?.mid) || asString(message?.id) || randomUUID(),
      eventType: messageEventType(message),
      source: 'facebook',
      userId: senderId,
      username: asString(value?.sender?.name) || asString(value?.from?.name),
      text: textFromMessage(message),
      timestamp: timestampFromMeta(value?.timestamp || entry?.time),
      chatId: senderId,
      senderId,
      recipientId: asString(value?.recipient?.id) || asString(entry?.id) || null,
      pageId: asString(entry?.id) || null,
      messageId: asString(message?.mid) || asString(message?.id) || null,
      messageType: messageType(message),
      commentId: null,
      postId: null,
      parentId: null,
      leadgenId: null,
      formId: null,
      postbackPayload: '',
      field,
      verb: '',
      item: '',
      raw: { entry, change },
    };
  }

  if (field === 'feed') {
    return normalizeFeedEvent(entry, change);
  }

  if (field === 'comments' || field === 'comment') {
    return {
      eventId: asString(value?.id) || asString(value?.comment_id) || randomUUID(),
      eventType: 'comment',
      source: 'facebook',
      userId: senderId,
      username: asString(value?.from?.name) || asString(value?.sender_name),
      text: asString(value?.message) || asString(value?.text),
      timestamp: timestampFromMeta(value?.created_time || value?.timestamp || entry?.time),
      chatId: senderId,
      senderId,
      recipientId: asString(entry?.id) || null,
      pageId: asString(value?.page_id) || asString(entry?.id) || null,
      messageId: null,
      messageType: 'comment',
      commentId: asString(value?.id) || asString(value?.comment_id) || null,
      postId: asString(value?.post_id) || asString(value?.parent_id) || null,
      parentId: asString(value?.parent_id) || null,
      leadgenId: null,
      formId: null,
      postbackPayload: '',
      field,
      verb: asString(value?.verb),
      item: 'comment',
      raw: { entry, change },
    };
  }

  if (field === 'mention' || field === 'mentions') {
    return {
      eventId: asString(value?.id) || asString(value?.post_id) || randomUUID(),
      eventType: 'mention',
      source: 'facebook',
      userId: senderId,
      username: asString(value?.from?.name) || asString(value?.sender_name),
      text: asString(value?.message) || asString(value?.text),
      timestamp: timestampFromMeta(value?.created_time || value?.timestamp || entry?.time),
      chatId: senderId,
      senderId,
      recipientId: asString(entry?.id) || null,
      pageId: asString(value?.page_id) || asString(entry?.id) || null,
      messageId: null,
      messageType: 'mention',
      commentId: asString(value?.comment_id) || null,
      postId: asString(value?.post_id) || asString(value?.id) || null,
      parentId: asString(value?.parent_id) || null,
      leadgenId: null,
      formId: null,
      postbackPayload: '',
      field,
      verb: asString(value?.verb),
      item: asString(value?.item),
      raw: { entry, change },
    };
  }

  if (field === 'leadgen') {
    return {
      eventId: asString(value?.leadgen_id) || randomUUID(),
      eventType: 'leadgen',
      source: 'facebook',
      userId: asString(value?.user_id) || null,
      username: '',
      text: '',
      timestamp: timestampFromMeta(value?.created_time || entry?.time),
      chatId: asString(value?.user_id) || null,
      senderId: asString(value?.user_id) || null,
      recipientId: asString(entry?.id) || null,
      pageId: asString(value?.page_id) || asString(entry?.id) || null,
      messageId: null,
      messageType: 'leadgen',
      commentId: null,
      postId: null,
      parentId: null,
      leadgenId: asString(value?.leadgen_id) || null,
      formId: asString(value?.form_id) || null,
      postbackPayload: '',
      field,
      verb: '',
      item: 'leadgen',
      raw: { entry, change },
    };
  }

  return null;
}

export function normalizeFacebookWebhookPayload(payload: any): NormalizedFacebookEvent[] {
  const events: NormalizedFacebookEvent[] = [];
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
  if (['messenger', 'dm', 'page_message', 'message.received', 'messages'].includes(normalized)) return ['message', 'message.text', 'message.media'];
  if (['comments', 'comment.created', 'page_comment'].includes(normalized)) return ['comment', 'feed.comment'];
  if (['mentions', 'page_mention', 'mention.created'].includes(normalized)) return ['mention'];
  if (['postbacks', 'postback.received'].includes(normalized)) return ['postback'];
  if (['leads', 'lead', 'leadgen.created'].includes(normalized)) return ['leadgen'];
  if (['feed_event', 'page_feed'].includes(normalized)) return ['feed', 'feed.post', 'feed.comment'];
  return [normalized];
}

export function shouldAcceptFacebookEvent(
  normalized: NormalizedFacebookEvent,
  triggerConfig: FacebookTriggerConfig,
): { accepted: true } | { accepted: false; reason: string } {
  const rawEventTypes = [
    ...asStringList(triggerConfig.eventTypes),
    ...asStringList(triggerConfig.event),
  ];
  const allowed = (rawEventTypes.length ? rawEventTypes : DEFAULT_EVENT_TYPES).flatMap(acceptedEventAliases);
  if (!allowed.includes(normalized.eventType) && !(allowed.includes('message') && normalized.eventType.startsWith('message.')) && !(allowed.includes('feed') && normalized.eventType.startsWith('feed.'))) {
    return { accepted: false, reason: `Ignored Facebook event type "${normalized.eventType}".` };
  }

  const pageId = asString(triggerConfig.pageId);
  if (pageId && normalized.pageId !== pageId && normalized.recipientId !== pageId) {
    return { accepted: false, reason: 'Ignored Facebook event for a different Page.' };
  }

  const allowedSenderIds = asStringList(triggerConfig.allowedSenderIds);
  if (allowedSenderIds.length > 0 && (!normalized.senderId || !allowedSenderIds.includes(normalized.senderId))) {
    return { accepted: false, reason: 'Ignored Facebook event from a sender that is not allowed.' };
  }

  return { accepted: true };
}

export async function resolveFacebookConnection(input: {
  userId: string;
  connectionId?: string;
}): Promise<{
  token: string;
  connectionId: string;
  pageId: string;
}> {
  let connectionId = asString(input.connectionId);
  if (!connectionId) {
    const canonical =
      await connectionService.findCanonicalConnection(input.userId, 'facebook_oauth2')
      || await connectionService.findCanonicalConnectionByProvider(input.userId, 'facebook');
    connectionId = canonical?.id || '';
  }
  if (!connectionId) {
    throw new Error('No active Facebook connection found. Create one in Connections first.');
  }

  const connection = await connectionService.getDecryptedConnection(input.userId, connectionId);
  if (connection.provider !== 'facebook' && connection.credentialTypeId !== 'facebook_oauth2') {
    throw new Error('Selected connection is not a Facebook connection.');
  }

  return {
    token: extractToken(connection),
    connectionId: connection.id,
    pageId: extractPageId(connection),
  };
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

async function getPageAccessToken(userToken: string, pageId: string): Promise<string> {
  if (!pageId) return userToken;
  const accounts = await callMetaApi<{ data?: Array<{ id?: string; access_token?: string }> }>(
    userToken,
    '/me/accounts?fields=id,name,access_token&limit=500',
  );
  const page = (accounts.data || []).find((candidate) => String(candidate.id || '') === pageId);
  return page?.access_token || userToken;
}

function subscribedFieldsForEvents(eventTypes: unknown): string[] {
  const raw = asStringList(eventTypes);
  if (raw.length === 0) return DEFAULT_SUBSCRIBED_FIELDS;
  return Array.from(new Set(raw.flatMap((value) => {
    const aliases = acceptedEventAliases(value);
    const fields: string[] = [];
    if (aliases.some((alias) => alias.startsWith('message') || alias === 'postback')) fields.push('messages');
    if (aliases.some((alias) => alias === 'comment' || alias.startsWith('feed'))) fields.push('feed');
    if (aliases.includes('mention')) fields.push('mention');
    if (aliases.includes('leadgen')) fields.push('leadgen');
    return fields;
  }))).filter(Boolean);
}

export async function registerFacebookWebhook(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
  connectionId?: string;
  pageId?: string;
  eventTypes?: string[] | string;
}): Promise<{
  success: true;
  webhookUrl: string;
  connectionId: string;
  pageId: string;
  subscribedFields: string[];
  manualSetupRequired: boolean;
  subscribed: boolean;
}> {
  const connection = await resolveFacebookConnection({ userId: input.userId, connectionId: input.connectionId });
  const pageId = asString(input.pageId) || connection.pageId;
  const subscribedFields = subscribedFieldsForEvents(input.eventTypes);
  let subscribed = false;

  if (pageId) {
    await getPageAccessToken(connection.token, pageId)
      .then((pageToken) => callMetaApi(
        pageToken,
        `/${encodeURIComponent(pageId)}/subscribed_apps`,
        'POST',
        { subscribed_fields: subscribedFields.join(',') },
      ))
      .then(() => {
        subscribed = true;
      })
      .catch((error) => {
        logger.warn('[Facebook Trigger] Unable to subscribe Page app automatically:', error);
      });
  }

  return {
    success: true,
    webhookUrl: getFacebookWebhookUrl(input.workflowId, input.nodeId),
    connectionId: connection.connectionId,
    pageId,
    subscribedFields,
    manualSetupRequired: true,
    subscribed,
  };
}

export async function unregisterFacebookWebhook(input: {
  userId: string;
  connectionId?: string;
  pageId?: string;
}): Promise<{ success: true; connectionId: string; pageId: string; unsubscribed: boolean }> {
  const connection = await resolveFacebookConnection({ userId: input.userId, connectionId: input.connectionId });
  const pageId = asString(input.pageId) || connection.pageId;
  let unsubscribed = false;
  if (pageId) {
    await getPageAccessToken(connection.token, pageId)
      .then((pageToken) => callMetaApi(pageToken, `/${encodeURIComponent(pageId)}/subscribed_apps`, 'DELETE'))
      .then(() => {
        unsubscribed = true;
      })
      .catch((error) => {
        logger.warn('[Facebook Trigger] Unable to unsubscribe Page app automatically:', error);
      });
  }
  return { success: true, connectionId: connection.connectionId, pageId, unsubscribed };
}

function workflowNodes(workflow: any): any[] {
  const candidates = [workflow?.nodes, workflow?.graph?.nodes, workflow?.definition?.nodes, workflow?.definition?.graph?.nodes];
  for (const value of candidates) if (Array.isArray(value)) return value;
  return [];
}

function nodeTypeOf(node: any): string {
  return String(node?.data?.type || node?.type || '').trim();
}

function nodeConfigOf(node: any): FacebookTriggerConfig {
  return (node?.data?.config || node?.config || {}) as FacebookTriggerConfig;
}

function connectionIdOf(node: any, triggerConfig: FacebookTriggerConfig): string {
  const refs = {
    ...((node?.data?.connectionRefs || {}) as Record<string, unknown>),
    ...((node?.connectionRefs || {}) as Record<string, unknown>),
    ...(((triggerConfig as any).connectionRefs || {}) as Record<string, unknown>),
  };
  const candidates = [
    triggerConfig.connectionId,
    (node?.data as any)?.connectionId,
    node?.connectionId,
    refs.facebook_oauth2,
    refs.facebook,
    refs.meta,
  ];
  for (const value of candidates) if (typeof value === 'string' && value.trim()) return value.trim();
  return '';
}

export async function autoRegisterFacebookWebhooksForWorkflow(input: {
  userId: string;
  workflow: any;
}): Promise<FacebookWebhookRegistrationStatus[]> {
  if (!input.workflow || input.workflow.status !== 'active') return [];
  const workflowId = asString(input.workflow.id);
  if (!workflowId) return [];
  const triggers = workflowNodes(input.workflow).filter((node) => nodeTypeOf(node) === 'facebook_trigger');
  const results: FacebookWebhookRegistrationStatus[] = [];

  for (const node of triggers) {
    const nodeId = asString(node?.id);
    if (!nodeId) continue;
    const triggerConfig = nodeConfigOf(node);
    try {
      const result = await registerFacebookWebhook({
        userId: input.userId,
        workflowId,
        nodeId,
        connectionId: connectionIdOf(node, triggerConfig),
        pageId: triggerConfig.pageId,
        eventTypes: triggerConfig.eventTypes || triggerConfig.event,
      });
      results.push({
        nodeId,
        success: true,
        webhookUrl: result.webhookUrl,
        connectionId: result.connectionId,
        pageId: result.pageId,
        subscribedFields: result.subscribedFields,
        manualSetupRequired: result.manualSetupRequired,
        subscribed: result.subscribed,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[Facebook Trigger] Auto webhook registration failed:', { workflowId, nodeId, error: message });
      results.push({ nodeId, success: false, error: message });
    }
  }

  return results;
}

export function buildFacebookExecutionInput(input: {
  workflowId: string;
  nodeId: string;
  normalized: NormalizedFacebookEvent;
}): Record<string, unknown> {
  return {
    ...input.normalized,
    trigger: 'facebook',
    workflow_id: input.workflowId,
    node_id: input.nodeId,
    sessionId: input.normalized.chatId
      ? `facebook_${input.workflowId}_${input.normalized.chatId}`
      : `facebook_${input.workflowId}_${randomUUID()}`,
    _facebook: true,
  };
}
