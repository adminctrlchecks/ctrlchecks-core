import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { config } from '../../core/config';
import { logger } from '../../core/logger';
import { connectionService } from '../../credentials-system/connection-service';
import type { DecryptedConnection } from '../../credentials-system/types';

export type SlackEventType =
  | 'app_mention'
  | 'message'
  | 'slash_command'
  | 'interaction'
  | 'interaction.block_actions'
  | 'interaction.message_action'
  | 'interaction.shortcut'
  | 'interaction.view_submission'
  | 'url_verification'
  | 'unknown';

export type NormalizedSlackEvent = {
  eventId: string;
  eventType: SlackEventType;
  source: 'slack';
  userId: string | null;
  username: string;
  text: string;
  timestamp: string;
  teamId: string | null;
  enterpriseId: string | null;
  channelId: string | null;
  channelName: string;
  chatId: string | null;
  threadTs: string | null;
  messageTs: string | null;
  command: string;
  triggerId: string;
  responseUrl: string;
  callbackId: string;
  actionId: string;
  interactionType: string;
  raw: unknown;
};

export type SlackTriggerConfig = {
  connectionId?: string;
  event?: string;
  eventTypes?: string[] | string;
  channelIds?: string[] | string;
  allowedUserIds?: string[] | string;
  commandFilter?: string;
  teamId?: string;
  signingSecret?: string;
  validateSignature?: boolean;
};

export type SlackWebhookRegistrationStatus = {
  nodeId: string;
  success: boolean;
  webhookUrl?: string;
  connectionId?: string;
  teamId?: string;
  manualSetupRequired?: boolean;
  verifiedConnection?: boolean;
  error?: string;
};

const DEFAULT_EVENT_TYPES = ['app_mention', 'message', 'slash_command', 'interaction'];
const SIGNATURE_VERSION = 'v0';
const MAX_SIGNATURE_AGE_SECONDS = 300;

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

function credentialString(credentials: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = asString(credentials[key]);
    if (value) return value;
  }
  return '';
}

function extractToken(connection: DecryptedConnection): string {
  const credentials = connection.credentials || {};
  return credentialString(credentials, ['accessToken', 'access_token', 'botToken', 'bot_token', 'token']);
}

function extractSigningSecret(connection: DecryptedConnection): string {
  const credentials = connection.credentials || {};
  const metadata = connection.metadata || {};
  return credentialString(credentials, ['signingSecret', 'signing_secret', 'clientSigningSecret'])
    || credentialString(metadata as Record<string, unknown>, ['signingSecret', 'signing_secret']);
}

function extractTeamId(connection: DecryptedConnection): string {
  const credentials = connection.credentials || {};
  const metadata = connection.metadata || {};
  return credentialString(credentials, ['teamId', 'team_id'])
    || credentialString(metadata as Record<string, unknown>, ['teamId', 'team_id'])
    || asString(connection.externalAccountId);
}

function rawRequestBody(req: Request): Buffer {
  const raw = (req as any).rawBody;
  if (Buffer.isBuffer(raw)) return raw;
  if (raw !== undefined && raw !== null) return Buffer.from(String(raw));
  return Buffer.from(JSON.stringify(req.body || {}));
}

function slackHeader(req: Request, name: string): string {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || '' : asString(value);
}

function timestampFromSlack(value: unknown): string {
  const raw = asString(value);
  if (!raw) return new Date().toISOString();
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) {
    return new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric).toISOString();
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function parseInteractionPayload(payload: any): any | null {
  if (!payload) return null;
  if (typeof payload === 'object') return payload;
  if (typeof payload !== 'string') return null;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function eventTypeForInteraction(type: string): SlackEventType {
  const normalized = type.trim().toLowerCase();
  if (normalized === 'block_actions') return 'interaction.block_actions';
  if (normalized === 'message_action') return 'interaction.message_action';
  if (normalized === 'shortcut' || normalized === 'global_shortcut') return 'interaction.shortcut';
  if (normalized === 'view_submission') return 'interaction.view_submission';
  return 'interaction';
}

function normalizeSlackEventCallback(payload: any): NormalizedSlackEvent | null {
  const event = payload?.event || {};
  const type = asString(event?.type).toLowerCase();
  if (!type) return null;
  const eventType: SlackEventType = type === 'app_mention' ? 'app_mention' : type === 'message' ? 'message' : 'unknown';
  if (eventType === 'unknown') return null;
  const messageTs = asString(event?.ts) || asString(event?.event_ts) || null;
  const threadTs = asString(event?.thread_ts) || messageTs;
  const channelId = asString(event?.channel) || null;
  return {
    eventId: asString(payload?.event_id) || messageTs || randomUUID(),
    eventType,
    source: 'slack',
    userId: asString(event?.user) || asString(event?.bot_id) || null,
    username: asString(event?.username),
    text: asString(event?.text),
    timestamp: timestampFromSlack(messageTs || payload?.event_time),
    teamId: asString(payload?.team_id) || asString(event?.team) || null,
    enterpriseId: asString(payload?.enterprise_id) || asString(event?.enterprise_id) || null,
    channelId,
    channelName: asString(event?.channel_name),
    chatId: channelId,
    threadTs,
    messageTs,
    command: '',
    triggerId: '',
    responseUrl: '',
    callbackId: '',
    actionId: '',
    interactionType: '',
    raw: payload,
  };
}

function normalizeSlashCommand(payload: any): NormalizedSlackEvent {
  const channelId = asString(payload?.channel_id) || null;
  const ts = asString(payload?.trigger_id) || randomUUID();
  return {
    eventId: `${asString(payload?.team_id) || 'team'}:${asString(payload?.command) || 'command'}:${ts}`,
    eventType: 'slash_command',
    source: 'slack',
    userId: asString(payload?.user_id) || null,
    username: asString(payload?.user_name),
    text: asString(payload?.text),
    timestamp: new Date().toISOString(),
    teamId: asString(payload?.team_id) || null,
    enterpriseId: asString(payload?.enterprise_id) || null,
    channelId,
    channelName: asString(payload?.channel_name),
    chatId: channelId,
    threadTs: null,
    messageTs: null,
    command: asString(payload?.command),
    triggerId: asString(payload?.trigger_id),
    responseUrl: asString(payload?.response_url),
    callbackId: '',
    actionId: '',
    interactionType: 'slash_command',
    raw: payload,
  };
}

function normalizeInteraction(payload: any): NormalizedSlackEvent | null {
  const interaction = parseInteractionPayload(payload?.payload ?? payload);
  if (!interaction) return null;
  const eventType = eventTypeForInteraction(asString(interaction?.type));
  const channelId = asString(interaction?.channel?.id) || asString(interaction?.container?.channel_id) || null;
  const messageTs = asString(interaction?.message?.ts) || asString(interaction?.container?.message_ts) || null;
  const threadTs = asString(interaction?.message?.thread_ts) || messageTs;
  const action = Array.isArray(interaction?.actions) ? interaction.actions[0] : null;
  return {
    eventId: asString(interaction?.trigger_id) || asString(interaction?.callback_id) || randomUUID(),
    eventType,
    source: 'slack',
    userId: asString(interaction?.user?.id) || null,
    username: asString(interaction?.user?.username) || asString(interaction?.user?.name),
    text: asString(action?.value) || asString(interaction?.message?.text) || asString(interaction?.view?.title?.text),
    timestamp: new Date().toISOString(),
    teamId: asString(interaction?.team?.id) || null,
    enterpriseId: asString(interaction?.enterprise?.id) || null,
    channelId,
    channelName: asString(interaction?.channel?.name),
    chatId: channelId,
    threadTs,
    messageTs,
    command: '',
    triggerId: asString(interaction?.trigger_id),
    responseUrl: asString(interaction?.response_url),
    callbackId: asString(interaction?.callback_id) || asString(interaction?.view?.callback_id),
    actionId: asString(action?.action_id),
    interactionType: asString(interaction?.type),
    raw: interaction,
  };
}

export function normalizeSlackWebhookPayload(payload: any): NormalizedSlackEvent[] {
  if (asString(payload?.type) === 'url_verification' && asString(payload?.challenge)) {
    return [{
      eventId: asString(payload?.token) || randomUUID(),
      eventType: 'url_verification',
      source: 'slack',
      userId: null,
      username: '',
      text: asString(payload?.challenge),
      timestamp: new Date().toISOString(),
      teamId: null,
      enterpriseId: null,
      channelId: null,
      channelName: '',
      chatId: null,
      threadTs: null,
      messageTs: null,
      command: '',
      triggerId: '',
      responseUrl: '',
      callbackId: '',
      actionId: '',
      interactionType: 'url_verification',
      raw: payload,
    }];
  }

  if (asString(payload?.type) === 'event_callback') {
    const normalized = normalizeSlackEventCallback(payload);
    return normalized ? [normalized] : [];
  }

  if (asString(payload?.command).startsWith('/')) {
    return [normalizeSlashCommand(payload)];
  }

  if (payload?.payload || ['block_actions', 'message_action', 'shortcut', 'global_shortcut', 'view_submission'].includes(asString(payload?.type))) {
    const normalized = normalizeInteraction(payload);
    return normalized ? [normalized] : [];
  }

  return [];
}

function acceptedEventAliases(value: string): string[] {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return [];
  if (['mention', 'app mention', 'app_mention'].includes(normalized)) return ['app_mention'];
  if (['message', 'channel_message', 'direct_message', 'dm'].includes(normalized)) return ['message'];
  if (['slash', 'command', 'slash_command'].includes(normalized)) return ['slash_command'];
  if (['interaction', 'interactive', 'block_action', 'block_actions'].includes(normalized)) return ['interaction', 'interaction.block_actions'];
  if (['shortcut', 'message_action', 'view_submission'].includes(normalized)) return [`interaction.${normalized}`];
  return [normalized];
}

export function shouldAcceptSlackEvent(
  normalized: NormalizedSlackEvent,
  triggerConfig: SlackTriggerConfig,
): { accepted: true } | { accepted: false; reason: string } {
  const rawEventTypes = [
    ...asStringList(triggerConfig.eventTypes),
    ...asStringList(triggerConfig.event),
  ];
  const allowed = (rawEventTypes.length ? rawEventTypes : DEFAULT_EVENT_TYPES).flatMap(acceptedEventAliases);
  if (
    !allowed.includes(normalized.eventType) &&
    !(allowed.includes('interaction') && normalized.eventType.startsWith('interaction.'))
  ) {
    return { accepted: false, reason: `Ignored Slack event type "${normalized.eventType}".` };
  }

  const teamId = asString(triggerConfig.teamId);
  if (teamId && normalized.teamId !== teamId) {
    return { accepted: false, reason: 'Ignored Slack event for a different workspace.' };
  }

  const channelIds = asStringList(triggerConfig.channelIds);
  if (channelIds.length > 0 && (!normalized.channelId || !channelIds.includes(normalized.channelId))) {
    return { accepted: false, reason: 'Ignored Slack event from a channel that is not allowed.' };
  }

  const allowedUserIds = asStringList(triggerConfig.allowedUserIds);
  if (allowedUserIds.length > 0 && (!normalized.userId || !allowedUserIds.includes(normalized.userId))) {
    return { accepted: false, reason: 'Ignored Slack event from a user that is not allowed.' };
  }

  const commandFilter = asString(triggerConfig.commandFilter);
  if (commandFilter && normalized.eventType === 'slash_command' && normalized.command !== commandFilter) {
    return { accepted: false, reason: 'Ignored Slack slash command because it did not match the configured command.' };
  }

  return { accepted: true };
}

export function getSlackWebhookUrl(workflowId: string, nodeId: string): string {
  const baseUrl = String(config.publicBaseUrl || '').replace(/\/+$/, '');
  if (!baseUrl) throw new Error('PUBLIC_BASE_URL is required to register Slack webhooks.');
  return `${baseUrl}/api/slack/webhook/${encodeURIComponent(workflowId)}/${encodeURIComponent(nodeId)}`;
}

export async function resolveSlackConnection(input: {
  userId: string;
  connectionId?: string;
}): Promise<{
  token: string;
  signingSecret: string;
  connectionId: string;
  teamId: string;
}> {
  let connectionId = asString(input.connectionId);
  if (!connectionId) {
    const canonical =
      await connectionService.findCanonicalConnection(input.userId, 'slack_oauth2')
      || await connectionService.findCanonicalConnectionByProvider(input.userId, 'slack');
    connectionId = canonical?.id || '';
  }
  if (!connectionId) {
    throw new Error('No active Slack connection found. Create one in Connections first.');
  }

  const connection = await connectionService.getDecryptedConnection(input.userId, connectionId);
  if (connection.provider !== 'slack' && connection.credentialTypeId !== 'slack_oauth2') {
    throw new Error('Selected connection is not a Slack connection.');
  }

  return {
    token: extractToken(connection),
    signingSecret: extractSigningSecret(connection),
    connectionId: connection.id,
    teamId: extractTeamId(connection),
  };
}

async function signingSecretFor(input: {
  userId: string;
  connectionId?: string;
  triggerConfig: SlackTriggerConfig;
}): Promise<string> {
  return asString(input.triggerConfig.signingSecret)
    || (input.userId
      ? await resolveSlackConnection({ userId: input.userId, connectionId: input.connectionId })
          .then((connection) => connection.signingSecret)
          .catch(() => '')
      : '')
    || asString(process.env.SLACK_SIGNING_SECRET);
}

export async function validateSlackSignature(
  req: Request,
  input: {
    userId: string;
    connectionId?: string;
    triggerConfig: SlackTriggerConfig;
  },
): Promise<boolean> {
  if (input.triggerConfig.validateSignature === false) return true;
  const signingSecret = await signingSecretFor(input);
  if (!signingSecret) return false;

  const timestamp = slackHeader(req, 'x-slack-request-timestamp');
  const signature = slackHeader(req, 'x-slack-signature');
  if (!timestamp || !signature) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) > MAX_SIGNATURE_AGE_SECONDS) return false;

  const base = `${SIGNATURE_VERSION}:${timestamp}:${rawRequestBody(req).toString('utf8')}`;
  const expected = `${SIGNATURE_VERSION}=${createHmac('sha256', signingSecret).update(base).digest('hex')}`;
  const received = Buffer.from(signature);
  const configured = Buffer.from(expected);
  return received.length === configured.length && timingSafeEqual(received, configured);
}

async function verifySlackAuth(token: string): Promise<boolean> {
  if (!token) return false;
  const response = await fetch('https://slack.com/api/auth.test', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data: any = await response.json().catch(() => null);
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error || response.statusText || 'Slack auth.test failed');
  }
  return true;
}

export async function registerSlackWebhook(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
  connectionId?: string;
}): Promise<{
  success: true;
  webhookUrl: string;
  connectionId: string;
  teamId: string;
  manualSetupRequired: boolean;
  verifiedConnection: boolean;
}> {
  const connection = await resolveSlackConnection({ userId: input.userId, connectionId: input.connectionId });
  const verifiedConnection = await verifySlackAuth(connection.token).catch((error) => {
    logger.warn('[Slack Trigger] Unable to verify Slack connection during registration:', error);
    return false;
  });

  return {
    success: true,
    webhookUrl: getSlackWebhookUrl(input.workflowId, input.nodeId),
    connectionId: connection.connectionId,
    teamId: connection.teamId,
    manualSetupRequired: true,
    verifiedConnection,
  };
}

export async function unregisterSlackWebhook(input: {
  userId: string;
  connectionId?: string;
}): Promise<{ success: true; connectionId: string; teamId: string; manualSetupRequired: boolean }> {
  const connection = await resolveSlackConnection({ userId: input.userId, connectionId: input.connectionId });
  return {
    success: true,
    connectionId: connection.connectionId,
    teamId: connection.teamId,
    manualSetupRequired: true,
  };
}

function workflowNodes(workflow: any): any[] {
  const candidates = [workflow?.nodes, workflow?.graph?.nodes, workflow?.definition?.nodes, workflow?.definition?.graph?.nodes];
  for (const value of candidates) if (Array.isArray(value)) return value;
  return [];
}

function nodeTypeOf(node: any): string {
  return String(node?.data?.type || node?.type || '').trim();
}

function nodeConfigOf(node: any): SlackTriggerConfig {
  return (node?.data?.config || node?.config || {}) as SlackTriggerConfig;
}

function connectionIdOf(node: any, triggerConfig: SlackTriggerConfig): string {
  const refs = {
    ...((node?.data?.connectionRefs || {}) as Record<string, unknown>),
    ...((node?.connectionRefs || {}) as Record<string, unknown>),
    ...(((triggerConfig as any).connectionRefs || {}) as Record<string, unknown>),
  };
  const candidates = [
    triggerConfig.connectionId,
    (node?.data as any)?.connectionId,
    node?.connectionId,
    refs.slack_oauth2,
    refs.slack_oauth,
    refs.slack,
  ];
  for (const value of candidates) if (typeof value === 'string' && value.trim()) return value.trim();
  return '';
}

export async function autoRegisterSlackWebhooksForWorkflow(input: {
  userId: string;
  workflow: any;
}): Promise<SlackWebhookRegistrationStatus[]> {
  if (!input.workflow || input.workflow.status !== 'active') return [];
  const workflowId = asString(input.workflow.id);
  if (!workflowId) return [];
  const triggers = workflowNodes(input.workflow).filter((node) => nodeTypeOf(node) === 'slack_trigger');
  const results: SlackWebhookRegistrationStatus[] = [];

  for (const node of triggers) {
    const nodeId = asString(node?.id);
    if (!nodeId) continue;
    const triggerConfig = nodeConfigOf(node);
    try {
      const result = await registerSlackWebhook({
        userId: input.userId,
        workflowId,
        nodeId,
        connectionId: connectionIdOf(node, triggerConfig),
      });
      results.push({
        nodeId,
        success: true,
        webhookUrl: result.webhookUrl,
        connectionId: result.connectionId,
        teamId: result.teamId,
        manualSetupRequired: result.manualSetupRequired,
        verifiedConnection: result.verifiedConnection,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[Slack Trigger] Auto webhook registration failed:', { workflowId, nodeId, error: message });
      results.push({ nodeId, success: false, error: message });
    }
  }

  return results;
}

export function buildSlackExecutionInput(input: {
  workflowId: string;
  nodeId: string;
  normalized: NormalizedSlackEvent;
}): Record<string, unknown> {
  const thread = input.normalized.threadTs || input.normalized.messageTs || input.normalized.channelId || input.normalized.userId || randomUUID();
  return {
    ...input.normalized,
    trigger: 'slack',
    workflow_id: input.workflowId,
    node_id: input.nodeId,
    sessionId: `slack_${input.workflowId}_${input.normalized.teamId || 'team'}_${thread}`,
    _slack: true,
  };
}
