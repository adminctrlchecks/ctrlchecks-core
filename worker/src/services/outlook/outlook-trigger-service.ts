import { randomUUID, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { config } from '../../core/config';
import { getDbClient } from '../../core/database/aws-db-client';
import { logger } from '../../core/logger';
import { connectionService } from '../../credentials-system/connection-service';
import { resolveCredential } from '../credential-resolver';
import { getRedisClient } from '../../shared/redis-client';

export type OutlookResourceKind = 'mail' | 'calendar';
export type OutlookEventType = 'message_created' | 'event_created' | 'event_updated' | 'event_deleted';

export type NormalizedOutlookEvent = {
  eventId: string;
  eventType: OutlookEventType;
  source: 'outlook';
  userId: string | null;
  username: string;
  text: string;
  timestamp: string;
  resourceId: string;
  subject: string;
  from: string;
  to: string;
  snippet: string;
  conversationId: string | null;
  start: string | null;
  end: string | null;
  attendees: string[];
  raw: unknown;
};

export type OutlookTriggerConfig = {
  connectionId?: string;
  resource?: OutlookResourceKind;
  changeTypes?: string[] | string;
  folderName?: string;
  query?: string;
};

export type OutlookSubscriptionRegistrationStatus = {
  nodeId: string;
  success: boolean;
  webhookUrl?: string;
  connectionId?: string;
  subscriptionId?: string;
  expirationDateTime?: string;
  error?: string;
};

type OutlookSubscriptionState = {
  subscriptionId: string;
  clientState: string;
  resource: string;
  resourceKind: OutlookResourceKind;
  expirationDateTime: string;
  userId: string;
  connectionId?: string;
  workflowId: string;
  nodeId: string;
};

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const DEFAULT_CHANGE_TYPES = ['created'];
const SUBSCRIPTION_LIFETIME_MINUTES = 4230; // Graph max for mail/event resources (~2.9 days)
const STATE_TTL_SECONDS = (SUBSCRIPTION_LIFETIME_MINUTES + 2 * 24 * 60) * 60; // lifetime + 2-day buffer

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

function timingEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function resourcePathFor(resourceKind: OutlookResourceKind, folderName?: string): string {
  if (resourceKind === 'calendar') return 'me/events';
  const folder = asString(folderName) || 'Inbox';
  return `me/mailFolders('${folder}')/messages`;
}

function stateKey(workflowId: string, nodeId: string): string {
  return `outlook:sub:${workflowId}:${nodeId}`;
}

async function getSubscriptionState(workflowId: string, nodeId: string): Promise<OutlookSubscriptionState | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  const raw = await redis.get(stateKey(workflowId, nodeId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OutlookSubscriptionState;
  } catch {
    return null;
  }
}

async function setSubscriptionState(state: OutlookSubscriptionState): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.set(stateKey(state.workflowId, state.nodeId), JSON.stringify(state), 'EX', STATE_TTL_SECONDS);
}

async function deleteSubscriptionState(workflowId: string, nodeId: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.del(stateKey(workflowId, nodeId));
}

export function getOutlookWebhookUrl(workflowId: string, nodeId: string): string {
  const baseUrl = String(config.publicBaseUrl || '').replace(/\/+$/, '');
  if (!baseUrl) throw new Error('PUBLIC_BASE_URL is required to register Outlook subscriptions.');
  return `${baseUrl}/api/outlook/webhook/${encodeURIComponent(workflowId)}/${encodeURIComponent(nodeId)}`;
}

async function resolveOutlookAccessToken(userId: string): Promise<string> {
  const credential = await resolveCredential({
    userId,
    provider: 'microsoft',
    requiredScopes: ['https://graph.microsoft.com/Mail.Read', 'https://graph.microsoft.com/Calendars.Read'],
  });
  return credential.accessToken;
}

async function resolveOutlookConnectionId(userId: string, connectionId?: string): Promise<string> {
  if (asString(connectionId)) return asString(connectionId);
  const canonical = await connectionService.findCanonicalConnectionByProvider(userId, 'microsoft').catch(() => null);
  return canonical?.id || '';
}

async function graphApiFetch(accessToken: string, path: string, init?: RequestInit): Promise<any> {
  const response = await fetch(`${GRAPH_BASE}${path}`, {
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
    throw Object.assign(new Error(`Microsoft Graph API error (${response.status}): ${message}`), { statusCode: response.status });
  }
  return json;
}

export function isOutlookValidationRequest(req: Request): string | null {
  const token = asString((req.query as any)?.validationToken);
  return token || null;
}

export function normalizeOutlookNotifications(body: any): Array<{ subscriptionId: string; changeType: string; resourceId: string; clientState: string }> {
  const items = Array.isArray(body?.value) ? body.value : [];
  return items.map((item: any) => ({
    subscriptionId: asString(item?.subscriptionId),
    changeType: asString(item?.changeType),
    resourceId: asString(item?.resourceData?.id),
    clientState: asString(item?.clientState),
  })).filter((item: any) => item.subscriptionId && item.resourceId);
}

function eventTypeFor(resourceKind: OutlookResourceKind, changeType: string): OutlookEventType {
  const normalized = changeType.trim().toLowerCase();
  if (resourceKind === 'mail') return 'message_created';
  if (normalized === 'deleted') return 'event_deleted';
  if (normalized === 'updated') return 'event_updated';
  return 'event_created';
}

export async function fetchOutlookResource(input: {
  accessToken: string;
  resourceKind: OutlookResourceKind;
  resourceId: string;
  changeType: string;
}): Promise<NormalizedOutlookEvent | null> {
  if (input.resourceKind === 'mail') {
    const message = await graphApiFetch(
      input.accessToken,
      `/me/messages/${encodeURIComponent(input.resourceId)}?$select=subject,from,toRecipients,bodyPreview,receivedDateTime,conversationId`,
    ).catch(() => null);
    if (!message) return null;
    return {
      eventId: `${input.resourceId}-${input.changeType}`,
      eventType: 'message_created',
      source: 'outlook',
      userId: asString(message?.from?.emailAddress?.address) || null,
      username: asString(message?.from?.emailAddress?.name),
      text: asString(message?.bodyPreview),
      timestamp: asString(message?.receivedDateTime) || new Date().toISOString(),
      resourceId: input.resourceId,
      subject: asString(message?.subject),
      from: asString(message?.from?.emailAddress?.address),
      to: (Array.isArray(message?.toRecipients) ? message.toRecipients : [])
        .map((r: any) => asString(r?.emailAddress?.address))
        .filter(Boolean)
        .join(', '),
      snippet: asString(message?.bodyPreview),
      conversationId: asString(message?.conversationId) || null,
      start: null,
      end: null,
      attendees: [],
      raw: message,
    };
  }

  const event = await graphApiFetch(
    input.accessToken,
    `/me/events/${encodeURIComponent(input.resourceId)}?$select=subject,organizer,start,end,bodyPreview,attendees`,
  ).catch(() => null);
  if (!event) return null;
  return {
    eventId: `${input.resourceId}-${input.changeType}`,
    eventType: eventTypeFor('calendar', input.changeType),
    source: 'outlook',
    userId: asString(event?.organizer?.emailAddress?.address) || null,
    username: asString(event?.organizer?.emailAddress?.name),
    text: asString(event?.bodyPreview),
    timestamp: asString(event?.start?.dateTime) || new Date().toISOString(),
    resourceId: input.resourceId,
    subject: asString(event?.subject),
    from: asString(event?.organizer?.emailAddress?.address),
    to: '',
    snippet: asString(event?.bodyPreview),
    conversationId: null,
    start: asString(event?.start?.dateTime) || null,
    end: asString(event?.end?.dateTime) || null,
    attendees: (Array.isArray(event?.attendees) ? event.attendees : [])
      .map((a: any) => asString(a?.emailAddress?.address))
      .filter(Boolean),
    raw: event,
  };
}

export function shouldAcceptOutlookEvent(
  normalized: NormalizedOutlookEvent,
  triggerConfig: OutlookTriggerConfig,
): { accepted: true } | { accepted: false; reason: string } {
  const query = asString(triggerConfig.query).toLowerCase();
  if (query) {
    const haystack = `${normalized.subject} ${normalized.from} ${normalized.snippet}`.toLowerCase();
    if (!haystack.includes(query)) {
      return { accepted: false, reason: 'Ignored Outlook event not matching the configured query filter.' };
    }
  }
  return { accepted: true };
}

export function buildOutlookExecutionInput(input: {
  workflowId: string;
  nodeId: string;
  normalized: NormalizedOutlookEvent;
}): Record<string, unknown> {
  return {
    ...input.normalized,
    trigger: 'outlook',
    workflow_id: input.workflowId,
    node_id: input.nodeId,
    sessionId: `outlook_${input.workflowId}_${input.normalized.conversationId || input.normalized.resourceId}`,
    _outlook: true,
  };
}

export async function validateOutlookClientState(
  workflowId: string,
  nodeId: string,
  clientState: string,
): Promise<boolean> {
  const state = await getSubscriptionState(workflowId, nodeId);
  if (!state) return false;
  return timingEqualString(clientState, state.clientState);
}

export async function registerOutlookSubscription(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
  connectionId?: string;
  resourceKind: OutlookResourceKind;
  changeTypes: string[];
  folderName?: string;
}): Promise<{
  success: true;
  webhookUrl: string;
  connectionId: string;
  subscriptionId: string;
  expirationDateTime: string;
}> {
  const accessToken = await resolveOutlookAccessToken(input.userId);
  const connectionId = await resolveOutlookConnectionId(input.userId, input.connectionId);
  const resource = resourcePathFor(input.resourceKind, input.folderName);
  const changeType = (input.changeTypes.length ? input.changeTypes : DEFAULT_CHANGE_TYPES).join(',');
  const clientState = randomUUID();
  const expirationDateTime = new Date(Date.now() + SUBSCRIPTION_LIFETIME_MINUTES * 60 * 1000).toISOString();
  const webhookUrl = getOutlookWebhookUrl(input.workflowId, input.nodeId);

  const existing = await getSubscriptionState(input.workflowId, input.nodeId);
  if (existing?.subscriptionId) {
    await graphApiFetch(accessToken, `/subscriptions/${encodeURIComponent(existing.subscriptionId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ expirationDateTime }),
    }).then(async (result) => {
      await setSubscriptionState({ ...existing, expirationDateTime: asString(result?.expirationDateTime) || expirationDateTime });
    }).catch(async () => {
      // Renewal failed (e.g. subscription no longer exists on Graph) — fall through to create a fresh one.
      await deleteSubscriptionState(input.workflowId, input.nodeId);
    });
    const refreshed = await getSubscriptionState(input.workflowId, input.nodeId);
    if (refreshed) {
      return {
        success: true,
        webhookUrl,
        connectionId,
        subscriptionId: refreshed.subscriptionId,
        expirationDateTime: refreshed.expirationDateTime,
      };
    }
  }

  const result = await graphApiFetch(accessToken, '/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      changeType,
      notificationUrl: webhookUrl,
      resource,
      expirationDateTime,
      clientState,
    }),
  });

  const subscriptionId = asString(result?.id);
  const finalExpiration = asString(result?.expirationDateTime) || expirationDateTime;

  await setSubscriptionState({
    subscriptionId,
    clientState,
    resource,
    resourceKind: input.resourceKind,
    expirationDateTime: finalExpiration,
    userId: input.userId,
    connectionId,
    workflowId: input.workflowId,
    nodeId: input.nodeId,
  });

  return { success: true, webhookUrl, connectionId, subscriptionId, expirationDateTime: finalExpiration };
}

export async function unregisterOutlookSubscription(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
  connectionId?: string;
}): Promise<{ success: true; connectionId: string }> {
  const connectionId = await resolveOutlookConnectionId(input.userId, input.connectionId);
  const state = await getSubscriptionState(input.workflowId, input.nodeId);

  if (state?.subscriptionId) {
    const accessToken = await resolveOutlookAccessToken(input.userId).catch(() => null);
    if (accessToken) {
      await graphApiFetch(accessToken, `/subscriptions/${encodeURIComponent(state.subscriptionId)}`, { method: 'DELETE' }).catch((error) => {
        logger.warn('[Outlook Trigger] Subscription delete failed (continuing to clear local state):', error);
      });
    }
  }

  await deleteSubscriptionState(input.workflowId, input.nodeId);
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

function nodeConfigOf(node: any): OutlookTriggerConfig {
  return (node?.data?.config || node?.config || {}) as OutlookTriggerConfig;
}

function connectionIdOf(node: any, triggerConfig: OutlookTriggerConfig): string {
  const refs = {
    ...((node?.data?.connectionRefs || {}) as Record<string, unknown>),
    ...((node?.connectionRefs || {}) as Record<string, unknown>),
  };
  const candidates = [triggerConfig.connectionId, (node?.data as any)?.connectionId, node?.connectionId, refs.microsoft, refs.outlook_oauth];
  for (const value of candidates) if (typeof value === 'string' && value.trim()) return value.trim();
  return '';
}

export async function autoRegisterOutlookSubscriptionsForWorkflow(input: {
  userId: string;
  workflow: any;
}): Promise<OutlookSubscriptionRegistrationStatus[]> {
  if (!input.workflow || input.workflow.status !== 'active') return [];
  const workflowId = asString(input.workflow.id);
  if (!workflowId) return [];
  const triggers = workflowNodes(input.workflow).filter((node) => nodeTypeOf(node) === 'outlook_trigger');
  const results: OutlookSubscriptionRegistrationStatus[] = [];

  for (const node of triggers) {
    const nodeId = asString(node?.id);
    if (!nodeId) continue;
    const triggerConfig = nodeConfigOf(node);
    try {
      const result = await registerOutlookSubscription({
        userId: input.userId,
        workflowId,
        nodeId,
        connectionId: connectionIdOf(node, triggerConfig),
        resourceKind: (triggerConfig.resource === 'calendar' ? 'calendar' : 'mail'),
        changeTypes: asStringList(triggerConfig.changeTypes),
        folderName: triggerConfig.folderName,
      });
      results.push({
        nodeId,
        success: true,
        webhookUrl: result.webhookUrl,
        connectionId: result.connectionId,
        subscriptionId: result.subscriptionId,
        expirationDateTime: result.expirationDateTime,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[Outlook Trigger] Auto subscription registration failed:', { workflowId, nodeId, error: message });
      results.push({ nodeId, success: false, error: message });
    }
  }

  return results;
}

export async function renewExpiringOutlookSubscriptions(): Promise<void> {
  const db = getDbClient();
  const { data: workflows, error } = await db
    .from('workflows')
    .select('id, user_id, nodes, graph, definition, status')
    .eq('status', 'active');

  if (error || !Array.isArray(workflows)) return;

  const renewBeforeMs = Date.now() + 24 * 60 * 60 * 1000; // renew if expiring within 24h

  for (const workflow of workflows) {
    const triggers = workflowNodes(workflow).filter((node) => nodeTypeOf(node) === 'outlook_trigger');
    for (const node of triggers) {
      const nodeId = asString(node?.id);
      const workflowId = asString(workflow?.id);
      if (!nodeId || !workflowId) continue;
      const triggerConfig = nodeConfigOf(node);

      try {
        const state = await getSubscriptionState(workflowId, nodeId);
        const expirationMs = state?.expirationDateTime ? new Date(state.expirationDateTime).getTime() : 0;
        if (state && expirationMs > renewBeforeMs) continue;

        await registerOutlookSubscription({
          userId: asString(workflow.user_id),
          workflowId,
          nodeId,
          connectionId: connectionIdOf(node, triggerConfig),
          resourceKind: (triggerConfig.resource === 'calendar' ? 'calendar' : 'mail'),
          changeTypes: asStringList(triggerConfig.changeTypes),
          folderName: triggerConfig.folderName,
        });
        logger.info('[Outlook Trigger] Renewed Outlook subscription', { workflowId, nodeId });
      } catch (renewError) {
        const message = renewError instanceof Error ? renewError.message : String(renewError);
        logger.warn('[Outlook Trigger] Failed to renew Outlook subscription', { workflowId, nodeId, error: message });
      }
    }
  }
}

export function startOutlookSubscriptionRenewalScheduler(): void {
  import('node-cron').then(({ default: cron }) => {
    cron.schedule('0 */6 * * *', () => {
      renewExpiringOutlookSubscriptions().catch((error) => {
        logger.warn('[Outlook Trigger] Subscription renewal sweep failed:', error);
      });
    });
    logger.info('[Outlook Trigger] Subscription renewal scheduler started (every 6 hours)');
  }).catch((error) => {
    logger.warn('[Outlook Trigger] Failed to start subscription renewal scheduler:', error);
  });
}

export { getSubscriptionState as getOutlookSubscriptionState };
