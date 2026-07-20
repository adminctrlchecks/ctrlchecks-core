import { randomUUID, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { config } from '../../core/config';
import { getDbClient } from '../../core/database/aws-db-client';
import { logger } from '../../core/logger';
import { connectionService } from '../../credentials-system/connection-service';
import { getGoogleAccessToken } from '../../shared/google-sheets';
import { getRedisClient } from '../../shared/redis-client';

export type GoogleCalendarEventType = 'event_changed' | 'event_cancelled';

export type NormalizedGoogleCalendarEvent = {
  eventId: string;
  eventType: GoogleCalendarEventType;
  source: 'google_calendar';
  userId: string | null;
  username: string;
  text: string;
  timestamp: string;
  calendarId: string;
  eventIdRaw: string;
  subject: string;
  organizer: string;
  start: string | null;
  end: string | null;
  attendees: string[];
  htmlLink: string;
  raw: unknown;
};

export type GoogleCalendarTriggerConfig = {
  connectionId?: string;
  calendarId?: string;
  eventTypes?: string[] | string;
  query?: string;
  channelToken?: string;
};

export type GoogleCalendarWatchRegistrationStatus = {
  nodeId: string;
  success: boolean;
  webhookUrl?: string;
  connectionId?: string;
  channelId?: string;
  expiration?: string;
  error?: string;
};

type GoogleCalendarWatchState = {
  channelId: string;
  resourceId: string;
  channelToken: string;
  calendarId: string;
  syncToken: string;
  expiration: string;
  userId: string;
  connectionId?: string;
  workflowId: string;
  nodeId: string;
};

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const DEFAULT_EVENT_TYPES: GoogleCalendarEventType[] = ['event_changed', 'event_cancelled'];
const CHANNEL_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const STATE_TTL_SECONDS = 9 * 24 * 60 * 60; // lifetime + 2-day buffer

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
  return `gcal:channel:${workflowId}:${nodeId}`;
}

async function getWatchState(workflowId: string, nodeId: string): Promise<GoogleCalendarWatchState | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  const raw = await redis.get(stateKey(workflowId, nodeId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GoogleCalendarWatchState;
  } catch {
    return null;
  }
}

async function setWatchState(state: GoogleCalendarWatchState): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.set(stateKey(state.workflowId, state.nodeId), JSON.stringify(state), 'EX', STATE_TTL_SECONDS);
}

async function deleteWatchState(workflowId: string, nodeId: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.del(stateKey(workflowId, nodeId));
}

export async function updateGoogleCalendarSyncToken(workflowId: string, nodeId: string, syncToken: string): Promise<void> {
  const state = await getWatchState(workflowId, nodeId);
  if (!state || !syncToken) return;
  await setWatchState({ ...state, syncToken });
}

export function getGoogleCalendarWebhookUrl(workflowId: string, nodeId: string): string {
  const baseUrl = String(config.publicBaseUrl || '').replace(/\/+$/, '');
  if (!baseUrl) throw new Error('PUBLIC_BASE_URL is required to register Google Calendar watch channels.');
  return `${baseUrl}/api/google-calendar/webhook/${encodeURIComponent(workflowId)}/${encodeURIComponent(nodeId)}`;
}

async function resolveAccessToken(userId: string): Promise<string> {
  const db = getDbClient();
  const token = await getGoogleAccessToken(db, userId, ['https://www.googleapis.com/auth/calendar.events']);
  if (!token) throw new Error('No active Google connection found. Connect Google (Calendar) in Connections first.');
  return token;
}

async function resolveConnectionId(userId: string, connectionId?: string): Promise<string> {
  if (asString(connectionId)) return asString(connectionId);
  const canonical = await connectionService.findCanonicalConnectionByProvider(userId, 'google').catch(() => null);
  return canonical?.id || '';
}

async function calendarApiFetch(accessToken: string, path: string, init?: RequestInit): Promise<any> {
  const response = await fetch(`${CALENDAR_API_BASE}${path}`, {
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
    throw Object.assign(new Error(`Google Calendar API error (${response.status}): ${message}`), { statusCode: response.status });
  }
  return json;
}

export type CalendarNotificationHeaders = {
  channelId: string;
  resourceId: string;
  resourceState: string;
  channelToken: string;
};

export function parseGoogleCalendarNotification(req: Request): CalendarNotificationHeaders {
  return {
    channelId: header(req, 'x-goog-channel-id'),
    resourceId: header(req, 'x-goog-resource-id'),
    resourceState: header(req, 'x-goog-resource-state'),
    channelToken: header(req, 'x-goog-channel-token'),
  };
}

export async function validateGoogleCalendarNotification(
  workflowId: string,
  nodeId: string,
  notification: CalendarNotificationHeaders,
): Promise<boolean> {
  const state = await getWatchState(workflowId, nodeId);
  if (!state) return false;
  if (state.channelId !== notification.channelId) return false;
  if (state.channelToken && !timingEqualString(state.channelToken, notification.channelToken || '')) return false;
  return true;
}

function eventTypeFor(status: string): GoogleCalendarEventType {
  return status === 'cancelled' ? 'event_cancelled' : 'event_changed';
}

export async function fetchChangedCalendarEvents(input: {
  accessToken: string;
  calendarId: string;
  syncToken: string;
}): Promise<{ events: NormalizedGoogleCalendarEvent[]; nextSyncToken: string }> {
  const events: NormalizedGoogleCalendarEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken = input.syncToken;

  do {
    const params = new URLSearchParams({ singleEvents: 'true' });
    if (input.syncToken) params.set('syncToken', input.syncToken);
    if (pageToken) params.set('pageToken', pageToken);

    let page: any;
    try {
      page = await calendarApiFetch(input.accessToken, `/calendars/${encodeURIComponent(input.calendarId)}/events?${params.toString()}`);
    } catch (error) {
      if ((error as any)?.statusCode === 410) {
        // Sync token expired/invalid — reseed with a fresh full sync instead of replaying everything.
        const fresh = await calendarApiFetch(input.accessToken, `/calendars/${encodeURIComponent(input.calendarId)}/events?singleEvents=true`);
        return { events: [], nextSyncToken: asString(fresh?.nextSyncToken) };
      }
      throw error;
    }

    for (const item of Array.isArray(page?.items) ? page.items : []) {
      const start = asString(item?.start?.dateTime) || asString(item?.start?.date) || null;
      const end = asString(item?.end?.dateTime) || asString(item?.end?.date) || null;
      events.push({
        eventId: `${asString(item?.id)}-${asString(item?.updated) || Date.now()}`,
        eventType: eventTypeFor(asString(item?.status)),
        source: 'google_calendar',
        userId: asString(item?.organizer?.email) || null,
        username: asString(item?.organizer?.displayName) || asString(item?.organizer?.email),
        text: asString(item?.description),
        timestamp: asString(item?.updated) || new Date().toISOString(),
        calendarId: input.calendarId,
        eventIdRaw: asString(item?.id),
        subject: asString(item?.summary),
        organizer: asString(item?.organizer?.email),
        start,
        end,
        attendees: (Array.isArray(item?.attendees) ? item.attendees : []).map((a: any) => asString(a?.email)).filter(Boolean),
        htmlLink: asString(item?.htmlLink),
        raw: item,
      });
    }

    pageToken = asString(page?.nextPageToken) || undefined;
    if (asString(page?.nextSyncToken)) nextSyncToken = asString(page.nextSyncToken);
  } while (pageToken);

  return { events, nextSyncToken };
}

export function shouldAcceptGoogleCalendarEvent(
  normalized: NormalizedGoogleCalendarEvent,
  triggerConfig: GoogleCalendarTriggerConfig,
): { accepted: true } | { accepted: false; reason: string } {
  const allowed = asStringList(triggerConfig.eventTypes);
  const normalizedAllowed = (allowed.length ? allowed : DEFAULT_EVENT_TYPES).map((v) => v.trim().toLowerCase().replace(/[\s-]+/g, '_'));
  if (!normalizedAllowed.includes(normalized.eventType)) {
    return { accepted: false, reason: `Ignored Google Calendar event type "${normalized.eventType}".` };
  }

  const query = asString(triggerConfig.query).toLowerCase();
  if (query) {
    const haystack = `${normalized.subject} ${normalized.text}`.toLowerCase();
    if (!haystack.includes(query)) {
      return { accepted: false, reason: 'Ignored Google Calendar event not matching the configured query filter.' };
    }
  }

  return { accepted: true };
}

export function buildGoogleCalendarExecutionInput(input: {
  workflowId: string;
  nodeId: string;
  normalized: NormalizedGoogleCalendarEvent;
}): Record<string, unknown> {
  return {
    ...input.normalized,
    trigger: 'google_calendar',
    workflow_id: input.workflowId,
    node_id: input.nodeId,
    sessionId: `gcal_${input.workflowId}_${input.normalized.eventIdRaw}`,
    _googleCalendar: true,
  };
}

export async function registerGoogleCalendarWatch(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
  connectionId?: string;
  calendarId?: string;
}): Promise<{
  success: true;
  webhookUrl: string;
  connectionId: string;
  channelId: string;
  expiration: string;
}> {
  const calendarId = asString(input.calendarId) || 'primary';
  const accessToken = await resolveAccessToken(input.userId);
  const connectionId = await resolveConnectionId(input.userId, input.connectionId);
  const webhookUrl = getGoogleCalendarWebhookUrl(input.workflowId, input.nodeId);

  const existing = await getWatchState(input.workflowId, input.nodeId);
  if (existing?.channelId) {
    await calendarApiFetch(accessToken, '/channels/stop', {
      method: 'POST',
      body: JSON.stringify({ id: existing.channelId, resourceId: existing.resourceId }),
    }).catch(() => null);
  }

  const channelId = randomUUID();
  const channelToken = randomUUID();
  const expirationMs = Date.now() + CHANNEL_LIFETIME_MS;

  const watchResult = await calendarApiFetch(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events/watch`, {
    method: 'POST',
    body: JSON.stringify({
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
      token: channelToken,
      expiration: String(expirationMs),
    }),
  });

  const initialSync = await calendarApiFetch(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events?singleEvents=true`);
  const syncToken = asString(initialSync?.nextSyncToken);
  const expiration = asString(watchResult?.expiration) || String(expirationMs);

  await setWatchState({
    channelId,
    resourceId: asString(watchResult?.resourceId),
    channelToken,
    calendarId,
    syncToken,
    expiration,
    userId: input.userId,
    connectionId,
    workflowId: input.workflowId,
    nodeId: input.nodeId,
  });

  return { success: true, webhookUrl, connectionId, channelId, expiration };
}

export async function unregisterGoogleCalendarWatch(input: {
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
      await calendarApiFetch(accessToken, '/channels/stop', {
        method: 'POST',
        body: JSON.stringify({ id: state.channelId, resourceId: state.resourceId }),
      }).catch((error) => {
        logger.warn('[Google Calendar Trigger] Channel stop failed (continuing to clear local state):', error);
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

function nodeConfigOf(node: any): GoogleCalendarTriggerConfig {
  return (node?.data?.config || node?.config || {}) as GoogleCalendarTriggerConfig;
}

function connectionIdOf(node: any, triggerConfig: GoogleCalendarTriggerConfig): string {
  const refs = {
    ...((node?.data?.connectionRefs || {}) as Record<string, unknown>),
    ...((node?.connectionRefs || {}) as Record<string, unknown>),
  };
  const candidates = [triggerConfig.connectionId, (node?.data as any)?.connectionId, node?.connectionId, refs.google, refs.google_oauth2];
  for (const value of candidates) if (typeof value === 'string' && value.trim()) return value.trim();
  return '';
}

export async function autoRegisterGoogleCalendarWatchesForWorkflow(input: {
  userId: string;
  workflow: any;
}): Promise<GoogleCalendarWatchRegistrationStatus[]> {
  if (!input.workflow || input.workflow.status !== 'active') return [];
  const workflowId = asString(input.workflow.id);
  if (!workflowId) return [];
  const triggers = workflowNodes(input.workflow).filter((node) => nodeTypeOf(node) === 'google_calendar_trigger');
  const results: GoogleCalendarWatchRegistrationStatus[] = [];

  for (const node of triggers) {
    const nodeId = asString(node?.id);
    if (!nodeId) continue;
    const triggerConfig = nodeConfigOf(node);
    try {
      const result = await registerGoogleCalendarWatch({
        userId: input.userId,
        workflowId,
        nodeId,
        connectionId: connectionIdOf(node, triggerConfig),
        calendarId: triggerConfig.calendarId,
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
      logger.error('[Google Calendar Trigger] Auto watch registration failed:', { workflowId, nodeId, error: message });
      results.push({ nodeId, success: false, error: message });
    }
  }

  return results;
}

export async function renewExpiringGoogleCalendarWatches(): Promise<void> {
  const db = getDbClient();
  const { data: workflows, error } = await db
    .from('workflows')
    .select('id, user_id, nodes, graph, definition, status')
    .eq('status', 'active');

  if (error || !Array.isArray(workflows)) return;

  const renewBeforeMs = Date.now() + 2 * 24 * 60 * 60 * 1000;

  for (const workflow of workflows) {
    const triggers = workflowNodes(workflow).filter((node) => nodeTypeOf(node) === 'google_calendar_trigger');
    for (const node of triggers) {
      const nodeId = asString(node?.id);
      const workflowId = asString(workflow?.id);
      if (!nodeId || !workflowId) continue;
      const triggerConfig = nodeConfigOf(node);

      try {
        const state = await getWatchState(workflowId, nodeId);
        const expirationMs = state?.expiration ? Number(state.expiration) : 0;
        if (state && expirationMs > renewBeforeMs) continue;

        await registerGoogleCalendarWatch({
          userId: asString(workflow.user_id),
          workflowId,
          nodeId,
          connectionId: connectionIdOf(node, triggerConfig),
          calendarId: triggerConfig.calendarId,
        });
        logger.info('[Google Calendar Trigger] Renewed watch channel', { workflowId, nodeId });
      } catch (renewError) {
        const message = renewError instanceof Error ? renewError.message : String(renewError);
        logger.warn('[Google Calendar Trigger] Failed to renew watch channel', { workflowId, nodeId, error: message });
      }
    }
  }
}

export function startGoogleCalendarWatchRenewalScheduler(): void {
  import('node-cron').then(({ default: cron }) => {
    cron.schedule('0 */6 * * *', () => {
      renewExpiringGoogleCalendarWatches().catch((error) => {
        logger.warn('[Google Calendar Trigger] Watch renewal sweep failed:', error);
      });
    });
    logger.info('[Google Calendar Trigger] Watch renewal scheduler started (every 6 hours)');
  }).catch((error) => {
    logger.warn('[Google Calendar Trigger] Failed to start watch renewal scheduler:', error);
  });
}

export { getWatchState as getGoogleCalendarWatchState };
