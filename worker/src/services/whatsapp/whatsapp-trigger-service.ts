import { randomUUID, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { config } from '../../core/config';
import { logger } from '../../core/logger';
import { connectionService } from '../../credentials-system/connection-service';
import type { DecryptedConnection } from '../../credentials-system/types';
import { verifyMetaWebhookSignature } from '../social/meta-webhook-verifier';

export type WhatsAppEventType =
  | 'message'
  | 'message.text'
  | 'message.media'
  | 'status'
  | 'status.sent'
  | 'status.delivered'
  | 'status.read'
  | 'status.failed'
  | 'unknown';

export type NormalizedWhatsAppEvent = {
  eventId: string;
  eventType: WhatsAppEventType;
  source: 'whatsapp';
  userId: string | null;
  username: string;
  text: string;
  timestamp: string;
  chatId: string | null;
  from: string | null;
  waId: string | null;
  contactName: string;
  profileName: string;
  messageId: string | null;
  messageType: string;
  mediaId: string | null;
  status: string;
  recipientId: string | null;
  phoneNumberId: string | null;
  displayPhoneNumber: string;
  businessAccountId: string | null;
  raw: unknown;
};

export type WhatsAppTriggerConfig = {
  connectionId?: string;
  event?: string;
  eventTypes?: string[] | string;
  phoneNumberId?: string;
  allowedWaIds?: string[] | string;
  verifyToken?: string;
  validateSignature?: boolean;
};

export type WhatsAppWebhookRegistrationStatus = {
  nodeId: string;
  success: boolean;
  webhookUrl?: string;
  connectionId?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  manualSetupRequired?: boolean;
  subscribed?: boolean;
  error?: string;
};

const GRAPH_VERSION = 'v19.0';
const DEFAULT_EVENT_TYPES = ['message'];

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
    || asString(process.env.WHATSAPP_APP_SECRET);
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
  const token = credentialString(credentials, ['accessToken', 'access_token', 'token', 'apiKey', 'api_key']);
  if (!token) throw new Error('WhatsApp access token is missing from the selected connection.');
  return token;
}

function extractPhoneNumberId(connection: DecryptedConnection): string {
  const credentials = connection.credentials || {};
  const metadata = connection.metadata || {};
  return credentialString(credentials, ['phoneNumberId', 'phone_number_id'])
    || credentialString(metadata as Record<string, unknown>, ['phoneNumberId', 'phone_number_id']);
}

function extractBusinessAccountId(connection: DecryptedConnection): string {
  const credentials = connection.credentials || {};
  const metadata = connection.metadata || {};
  return credentialString(credentials, ['businessAccountId', 'business_account_id'])
    || credentialString(metadata as Record<string, unknown>, ['businessAccountId', 'business_account_id']);
}

export function getWhatsAppWebhookUrl(workflowId: string, nodeId: string): string {
  const baseUrl = String(config.publicBaseUrl || '').replace(/\/+$/, '');
  if (!baseUrl) throw new Error('PUBLIC_BASE_URL is required to register WhatsApp webhooks.');
  return `${baseUrl}/api/whatsapp/webhook/${encodeURIComponent(workflowId)}/${encodeURIComponent(nodeId)}`;
}

export function validateWhatsAppVerifyToken(req: Request, triggerConfig: WhatsAppTriggerConfig): string | null {
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

export function validateWhatsAppSignature(req: Request, triggerConfig: WhatsAppTriggerConfig): boolean {
  if (triggerConfig.validateSignature === false) return true;
  const appSecret = envMetaAppSecret();
  if (!appSecret) return false;
  return verifyMetaWebhookSignature(appSecret, rawRequestBody(req), getSignatureHeader(req));
}

function statusEventType(status: string): WhatsAppEventType {
  const normalized = status.toLowerCase();
  if (['sent', 'delivered', 'read', 'failed'].includes(normalized)) {
    return `status.${normalized}` as WhatsAppEventType;
  }
  return 'status';
}

function messageEventType(messageType: string): WhatsAppEventType {
  return messageType === 'text' ? 'message.text' : 'message.media';
}

function textFromMessage(message: any): string {
  return asString(message?.text?.body)
    || asString(message?.button?.text)
    || asString(message?.interactive?.button_reply?.title)
    || asString(message?.interactive?.list_reply?.title)
    || asString(message?.image?.caption)
    || asString(message?.video?.caption)
    || asString(message?.document?.caption);
}

function mediaIdFromMessage(message: any): string | null {
  const type = asString(message?.type);
  const media = type ? message?.[type] : null;
  return asString(media?.id) || null;
}

function timestampFromMeta(value: unknown): string {
  const raw = asString(value);
  if (!raw) return new Date().toISOString();
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds > 0) return new Date(seconds * 1000).toISOString();
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export function normalizeWhatsAppWebhookPayload(payload: any): NormalizedWhatsAppEvent[] {
  const events: NormalizedWhatsAppEvent[] = [];
  for (const entry of Array.isArray(payload?.entry) ? payload.entry : []) {
    const businessAccountId = asString(entry?.id) || null;
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      const value = change?.value || {};
      const metadata = value?.metadata || {};
      const phoneNumberId = asString(metadata?.phone_number_id) || null;
      const displayPhoneNumber = asString(metadata?.display_phone_number);
      const contacts = Array.isArray(value?.contacts) ? value.contacts : [];

      for (const message of Array.isArray(value?.messages) ? value.messages : []) {
        const from = asString(message?.from) || null;
        const contact = contacts.find((item: any) => asString(item?.wa_id) === from) || contacts[0] || {};
        const messageType = asString(message?.type) || 'unknown';
        const text = textFromMessage(message);
        events.push({
          eventId: asString(message?.id) || randomUUID(),
          eventType: messageEventType(messageType),
          source: 'whatsapp',
          userId: from,
          username: asString(contact?.profile?.name),
          text,
          timestamp: timestampFromMeta(message?.timestamp),
          chatId: from,
          from,
          waId: asString(contact?.wa_id) || from,
          contactName: asString(contact?.profile?.name),
          profileName: asString(contact?.profile?.name),
          messageId: asString(message?.id) || null,
          messageType,
          mediaId: mediaIdFromMessage(message),
          status: '',
          recipientId: null,
          phoneNumberId,
          displayPhoneNumber,
          businessAccountId,
          raw: { entry, change, value, message, contact },
        });
      }

      for (const statusEvent of Array.isArray(value?.statuses) ? value.statuses : []) {
        const status = asString(statusEvent?.status);
        const recipientId = asString(statusEvent?.recipient_id) || null;
        events.push({
          eventId: asString(statusEvent?.id) || randomUUID(),
          eventType: statusEventType(status),
          source: 'whatsapp',
          userId: recipientId,
          username: '',
          text: '',
          timestamp: timestampFromMeta(statusEvent?.timestamp),
          chatId: recipientId,
          from: null,
          waId: recipientId,
          contactName: '',
          profileName: '',
          messageId: asString(statusEvent?.id) || null,
          messageType: '',
          mediaId: null,
          status,
          recipientId,
          phoneNumberId,
          displayPhoneNumber,
          businessAccountId,
          raw: { entry, change, value, status: statusEvent },
        });
      }
    }
  }
  return events;
}

function acceptedEventAliases(value: string): string[] {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return [];
  if (normalized === 'message.received' || normalized === 'messages') return ['message', 'message.text', 'message.media'];
  if (normalized === 'media') return ['message.media'];
  if (normalized === 'text') return ['message.text'];
  if (normalized === 'statuses') return ['status', 'status.sent', 'status.delivered', 'status.read', 'status.failed'];
  return [normalized];
}

export function shouldAcceptWhatsAppEvent(
  normalized: NormalizedWhatsAppEvent,
  triggerConfig: WhatsAppTriggerConfig,
): { accepted: true } | { accepted: false; reason: string } {
  const rawEventTypes = [
    ...asStringList(triggerConfig.eventTypes),
    ...asStringList(triggerConfig.event),
  ];
  const allowed = (rawEventTypes.length ? rawEventTypes : DEFAULT_EVENT_TYPES).flatMap(acceptedEventAliases);
  if (!allowed.includes(normalized.eventType) && !(allowed.includes('message') && normalized.eventType.startsWith('message.')) && !(allowed.includes('status') && normalized.eventType.startsWith('status.'))) {
    return { accepted: false, reason: `Ignored WhatsApp event type "${normalized.eventType}".` };
  }

  const phoneNumberId = asString(triggerConfig.phoneNumberId);
  if (phoneNumberId && normalized.phoneNumberId !== phoneNumberId) {
    return { accepted: false, reason: 'Ignored WhatsApp event for a different phone number ID.' };
  }

  const allowedWaIds = asStringList(triggerConfig.allowedWaIds);
  if (allowedWaIds.length > 0 && (!normalized.waId || !allowedWaIds.includes(normalized.waId))) {
    return { accepted: false, reason: 'Ignored WhatsApp event from a sender that is not allowed.' };
  }

  return { accepted: true };
}

export async function resolveWhatsAppConnection(input: {
  userId: string;
  connectionId?: string;
}): Promise<{
  token: string;
  connectionId: string;
  phoneNumberId: string;
  businessAccountId: string;
}> {
  let connectionId = asString(input.connectionId);
  if (!connectionId) {
    const canonical =
      await connectionService.findCanonicalConnection(input.userId, 'whatsapp_api_key')
      || await connectionService.findCanonicalConnectionByProvider(input.userId, 'whatsapp');
    connectionId = canonical?.id || '';
  }
  if (!connectionId) {
    throw new Error('No active WhatsApp connection found. Create one in Connections first.');
  }

  const connection = await connectionService.getDecryptedConnection(input.userId, connectionId);
  if (connection.provider !== 'whatsapp' && connection.credentialTypeId !== 'whatsapp_api_key') {
    throw new Error('Selected connection is not a WhatsApp connection.');
  }

  const token = extractToken(connection);
  const phoneNumberId = extractPhoneNumberId(connection);
  const businessAccountId = extractBusinessAccountId(connection);
  return { token, connectionId: connection.id, phoneNumberId, businessAccountId };
}

async function callMetaApi<T>(token: string, path: string, method: string = 'GET', body?: Record<string, unknown>): Promise<T> {
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

async function resolveBusinessAccountId(token: string, phoneNumberId: string, provided?: string): Promise<string> {
  if (asString(provided)) return asString(provided);
  if (!phoneNumberId) return '';
  const data: any = await callMetaApi(token, `/${encodeURIComponent(phoneNumberId)}?fields=whatsapp_business_account`);
  return asString(data?.whatsapp_business_account?.id);
}

export async function registerWhatsAppWebhook(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
  connectionId?: string;
  phoneNumberId?: string;
}): Promise<{
  success: true;
  webhookUrl: string;
  connectionId: string;
  phoneNumberId: string;
  businessAccountId: string;
  manualSetupRequired: boolean;
  subscribed: boolean;
}> {
  const connection = await resolveWhatsAppConnection({ userId: input.userId, connectionId: input.connectionId });
  const phoneNumberId = asString(input.phoneNumberId) || connection.phoneNumberId;
  const businessAccountId = await resolveBusinessAccountId(connection.token, phoneNumberId, connection.businessAccountId);
  if (businessAccountId) {
    await callMetaApi(connection.token, `/${encodeURIComponent(businessAccountId)}/subscribed_apps`, 'POST').catch((error) => {
      logger.warn('[WhatsApp Trigger] Unable to subscribe WABA app automatically:', error);
    });
  }

  return {
    success: true,
    webhookUrl: getWhatsAppWebhookUrl(input.workflowId, input.nodeId),
    connectionId: connection.connectionId,
    phoneNumberId,
    businessAccountId,
    manualSetupRequired: true,
    subscribed: !!businessAccountId,
  };
}

export async function unregisterWhatsAppWebhook(input: {
  userId: string;
  connectionId?: string;
  phoneNumberId?: string;
}): Promise<{ success: true; connectionId: string; businessAccountId: string; unsubscribed: boolean }> {
  const connection = await resolveWhatsAppConnection({ userId: input.userId, connectionId: input.connectionId });
  const phoneNumberId = asString(input.phoneNumberId) || connection.phoneNumberId;
  const businessAccountId = await resolveBusinessAccountId(connection.token, phoneNumberId, connection.businessAccountId);
  if (businessAccountId) {
    await callMetaApi(connection.token, `/${encodeURIComponent(businessAccountId)}/subscribed_apps`, 'DELETE').catch((error) => {
      logger.warn('[WhatsApp Trigger] Unable to unsubscribe WABA app automatically:', error);
    });
  }
  return { success: true, connectionId: connection.connectionId, businessAccountId, unsubscribed: !!businessAccountId };
}

function workflowNodes(workflow: any): any[] {
  const candidates = [workflow?.nodes, workflow?.graph?.nodes, workflow?.definition?.nodes, workflow?.definition?.graph?.nodes];
  for (const value of candidates) if (Array.isArray(value)) return value;
  return [];
}

function nodeTypeOf(node: any): string {
  return String(node?.data?.type || node?.type || '').trim();
}

function nodeConfigOf(node: any): WhatsAppTriggerConfig {
  return (node?.data?.config || node?.config || {}) as WhatsAppTriggerConfig;
}

function connectionIdOf(node: any, triggerConfig: WhatsAppTriggerConfig): string {
  const refs = {
    ...((node?.data?.connectionRefs || {}) as Record<string, unknown>),
    ...((node?.connectionRefs || {}) as Record<string, unknown>),
    ...(((triggerConfig as any).connectionRefs || {}) as Record<string, unknown>),
  };
  const candidates = [
    triggerConfig.connectionId,
    (node?.data as any)?.connectionId,
    node?.connectionId,
    refs.whatsapp_api_key,
    refs.whatsapp,
    refs.whatsapp_oauth2,
    refs.whatsapp_cloud,
  ];
  for (const value of candidates) if (typeof value === 'string' && value.trim()) return value.trim();
  return '';
}

export async function autoRegisterWhatsAppWebhooksForWorkflow(input: {
  userId: string;
  workflow: any;
}): Promise<WhatsAppWebhookRegistrationStatus[]> {
  if (!input.workflow || input.workflow.status !== 'active') return [];
  const workflowId = asString(input.workflow.id);
  if (!workflowId) return [];
  const triggers = workflowNodes(input.workflow).filter((node) => nodeTypeOf(node) === 'whatsapp_trigger');
  const results: WhatsAppWebhookRegistrationStatus[] = [];

  for (const node of triggers) {
    const nodeId = asString(node?.id);
    if (!nodeId) continue;
    const triggerConfig = nodeConfigOf(node);
    try {
      const result = await registerWhatsAppWebhook({
        userId: input.userId,
        workflowId,
        nodeId,
        connectionId: connectionIdOf(node, triggerConfig),
        phoneNumberId: triggerConfig.phoneNumberId,
      });
      results.push({
        nodeId,
        success: true,
        webhookUrl: result.webhookUrl,
        connectionId: result.connectionId,
        phoneNumberId: result.phoneNumberId,
        businessAccountId: result.businessAccountId,
        manualSetupRequired: result.manualSetupRequired,
        subscribed: result.subscribed,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[WhatsApp Trigger] Auto webhook registration failed:', { workflowId, nodeId, error: message });
      results.push({ nodeId, success: false, error: message });
    }
  }

  return results;
}

export function buildWhatsAppExecutionInput(input: {
  workflowId: string;
  nodeId: string;
  normalized: NormalizedWhatsAppEvent;
}): Record<string, unknown> {
  return {
    ...input.normalized,
    trigger: 'whatsapp',
    workflow_id: input.workflowId,
    node_id: input.nodeId,
    sessionId: input.normalized.chatId
      ? `whatsapp_${input.workflowId}_${input.normalized.chatId}`
      : `whatsapp_${input.workflowId}_${randomUUID()}`,
    _whatsapp: true,
  };
}
