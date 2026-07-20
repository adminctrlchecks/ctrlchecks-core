import { createPublicKey, randomUUID, verify as verifySignature } from 'crypto';
import type { Request } from 'express';
import { config } from '../../core/config';
import { logger } from '../../core/logger';
import { connectionService } from '../../credentials-system/connection-service';
import type { DecryptedConnection } from '../../credentials-system/types';

export type DiscordEventType =
  | 'message'
  | 'slash_command'
  | 'interaction'
  | 'interaction.application_command'
  | 'interaction.component'
  | 'interaction.modal_submit'
  | 'interaction.autocomplete'
  | 'webhook_event'
  | 'ping'
  | 'unknown';

export type NormalizedDiscordEvent = {
  eventId: string;
  eventType: DiscordEventType;
  source: 'discord';
  userId: string | null;
  username: string;
  text: string;
  timestamp: string;
  applicationId: string | null;
  guildId: string | null;
  channelId: string | null;
  threadId: string | null;
  chatId: string | null;
  messageId: string | null;
  command: string;
  customId: string;
  interactionId: string;
  interactionToken: string;
  interactionType: string;
  responseUrl: string;
  rawEventType: string;
  raw: unknown;
};

export type DiscordTriggerConfig = {
  connectionId?: string;
  event?: string;
  eventTypes?: string[] | string;
  guildIds?: string[] | string;
  channelIds?: string[] | string;
  allowedUserIds?: string[] | string;
  commandFilter?: string;
  applicationId?: string;
  publicKey?: string;
  validateSignature?: boolean;
};

export type DiscordWebhookRegistrationStatus = {
  nodeId: string;
  success: boolean;
  webhookUrl?: string;
  connectionId?: string;
  applicationId?: string;
  manualSetupRequired?: boolean;
  verifiedConnection?: boolean;
  error?: string;
};

const DEFAULT_EVENT_TYPES = ['message', 'slash_command', 'interaction'];
const MAX_SIGNATURE_AGE_SECONDS = 300;
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

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
  return credentialString(credentials, ['token', 'botToken', 'bot_token', 'accessToken', 'access_token']);
}

function extractPublicKey(connection: DecryptedConnection): string {
  const credentials = connection.credentials || {};
  const metadata = connection.metadata || {};
  return credentialString(credentials, ['publicKey', 'public_key', 'applicationPublicKey'])
    || credentialString(metadata as Record<string, unknown>, ['publicKey', 'public_key']);
}

function extractApplicationId(connection: DecryptedConnection): string {
  const credentials = connection.credentials || {};
  const metadata = connection.metadata || {};
  return credentialString(credentials, ['applicationId', 'application_id', 'clientId', 'client_id'])
    || credentialString(metadata as Record<string, unknown>, ['applicationId', 'application_id'])
    || asString(connection.externalAccountId);
}

function rawRequestBody(req: Request): Buffer {
  const raw = (req as any).rawBody;
  if (Buffer.isBuffer(raw)) return raw;
  if (raw !== undefined && raw !== null) return Buffer.from(String(raw));
  return Buffer.from(JSON.stringify(req.body || {}));
}

function discordHeader(req: Request, name: string): string {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || '' : asString(value);
}

function timestampFromDiscord(value: unknown): string {
  const raw = asString(value);
  if (!raw) return new Date().toISOString();
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) {
    return new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric).toISOString();
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function discordUser(payload: any): any {
  return payload?.user || payload?.member?.user || payload?.author || payload?.data?.user || null;
}

function usernameOf(user: any): string {
  return asString(user?.global_name) || asString(user?.username) || asString(user?.name);
}

function commandOptionsText(options: any): string {
  if (!Array.isArray(options)) return '';
  return options
    .map((option) => {
      const nested = commandOptionsText(option?.options);
      const value = asString(option?.value) || nested;
      return value ? `${asString(option?.name)}:${value}` : asString(option?.name);
    })
    .filter(Boolean)
    .join(' ');
}

function interactionEventType(payload: any): DiscordEventType {
  const type = Number(payload?.type);
  if (type === 2) {
    return Number(payload?.data?.type) === 1 || !payload?.data?.type ? 'slash_command' : 'interaction.application_command';
  }
  if (type === 3) return 'interaction.component';
  if (type === 4) return 'interaction.autocomplete';
  if (type === 5) return 'interaction.modal_submit';
  return 'interaction';
}

function isDiscordInteraction(payload: any): boolean {
  const type = Number(payload?.type);
  return type >= 1 && type <= 5 && Boolean(payload?.id || type === 1);
}

export function isDiscordInteractionPing(payload: any): boolean {
  return Number(payload?.type) === 1;
}

export function isDiscordWebhookEventPing(payload: any): boolean {
  return Number(payload?.type) === 0 && payload?.version !== undefined;
}

export function isDiscordWebhookEventPayload(payload: any): boolean {
  return Number(payload?.type) === 1 && payload?.event && payload?.version !== undefined;
}

function normalizeInteraction(payload: any): NormalizedDiscordEvent | null {
  if (isDiscordInteractionPing(payload)) {
    return {
      eventId: asString(payload?.id) || randomUUID(),
      eventType: 'ping',
      source: 'discord',
      userId: null,
      username: '',
      text: '',
      timestamp: new Date().toISOString(),
      applicationId: asString(payload?.application_id) || null,
      guildId: null,
      channelId: null,
      threadId: null,
      chatId: null,
      messageId: null,
      command: '',
      customId: '',
      interactionId: asString(payload?.id),
      interactionToken: '',
      interactionType: 'ping',
      responseUrl: '',
      rawEventType: 'PING',
      raw: payload,
    };
  }

  if (!isDiscordInteraction(payload)) return null;
  const user = discordUser(payload);
  const applicationId = asString(payload?.application_id) || null;
  const token = asString(payload?.token);
  const channelId = asString(payload?.channel_id) || asString(payload?.channel?.id) || null;
  const messageId = asString(payload?.message?.id) || null;
  const eventType = interactionEventType(payload);
  const commandName = asString(payload?.data?.name);
  const optionText = commandOptionsText(payload?.data?.options);
  const customId = asString(payload?.data?.custom_id);
  const text = optionText || asString(payload?.data?.value) || asString(payload?.message?.content) || commandName;

  return {
    eventId: asString(payload?.id) || randomUUID(),
    eventType,
    source: 'discord',
    userId: asString(user?.id) || null,
    username: usernameOf(user),
    text,
    timestamp: new Date().toISOString(),
    applicationId,
    guildId: asString(payload?.guild_id) || null,
    channelId,
    threadId: channelId,
    chatId: channelId,
    messageId,
    command: commandName ? `/${commandName}` : '',
    customId,
    interactionId: asString(payload?.id),
    interactionToken: token,
    interactionType: String(payload?.type || ''),
    responseUrl: applicationId && token ? `https://discord.com/api/v10/webhooks/${applicationId}/${token}` : '',
    rawEventType: eventType,
    raw: payload,
  };
}

function normalizeDiscordMessage(data: any, raw: any, rawEventType: string): NormalizedDiscordEvent | null {
  const channelId = asString(data?.channel_id) || asString(data?.channel?.id) || asString(data?.lobby_id) || null;
  const user = discordUser(data);
  const messageId = asString(data?.id) || null;
  if (!messageId && !channelId && !asString(data?.content)) return null;

  return {
    eventId: messageId || randomUUID(),
    eventType: 'message',
    source: 'discord',
    userId: asString(user?.id) || asString(data?.user_id) || null,
    username: usernameOf(user),
    text: asString(data?.content) || asString(data?.text),
    timestamp: timestampFromDiscord(data?.timestamp || raw?.event?.timestamp),
    applicationId: asString(raw?.application_id) || asString(data?.application_id) || null,
    guildId: asString(data?.guild_id) || asString(raw?.guild_id) || null,
    channelId,
    threadId: asString(data?.thread_id) || channelId,
    chatId: channelId,
    messageId,
    command: '',
    customId: '',
    interactionId: '',
    interactionToken: '',
    interactionType: '',
    responseUrl: '',
    rawEventType,
    raw,
  };
}

function normalizeWebhookEvent(payload: any): NormalizedDiscordEvent | null {
  if (!isDiscordWebhookEventPayload(payload)) return null;
  const eventType = asString(payload?.event?.type);
  const data = payload?.event?.data || {};
  if (eventType.includes('MESSAGE_CREATE') || eventType.includes('MESSAGE_UPDATE')) {
    return normalizeDiscordMessage(data, payload, eventType);
  }

  const user = discordUser(data);
  return {
    eventId: asString(data?.id) || `${eventType}:${asString(payload?.event?.timestamp) || randomUUID()}`,
    eventType: 'webhook_event',
    source: 'discord',
    userId: asString(user?.id) || asString(data?.user_id) || null,
    username: usernameOf(user),
    text: asString(data?.content) || asString(data?.name) || eventType,
    timestamp: timestampFromDiscord(payload?.event?.timestamp),
    applicationId: asString(payload?.application_id) || asString(data?.application_id) || null,
    guildId: asString(data?.guild_id) || asString(data?.guild?.id) || null,
    channelId: asString(data?.channel_id) || null,
    threadId: asString(data?.thread_id) || asString(data?.channel_id) || null,
    chatId: asString(data?.channel_id) || null,
    messageId: asString(data?.message_id) || asString(data?.id) || null,
    command: '',
    customId: '',
    interactionId: '',
    interactionToken: '',
    interactionType: '',
    responseUrl: '',
    rawEventType: eventType,
    raw: payload,
  };
}

function normalizeGatewayLikeEvent(payload: any): NormalizedDiscordEvent | null {
  const rawEventType = asString(payload?.t) || asString(payload?.type);
  const data = payload?.d || payload?.data || payload;
  if (rawEventType === 'MESSAGE_CREATE' || rawEventType === 'MESSAGE_UPDATE' || asString(data?.content)) {
    return normalizeDiscordMessage(data, payload, rawEventType || 'MESSAGE_CREATE');
  }
  return null;
}

export function normalizeDiscordWebhookPayload(payload: any): NormalizedDiscordEvent[] {
  if (isDiscordWebhookEventPing(payload) || isDiscordInteractionPing(payload)) {
    const ping = normalizeInteraction(payload);
    return ping ? [ping] : [];
  }

  const interaction = normalizeInteraction(payload);
  if (interaction) return [interaction];

  const webhookEvent = normalizeWebhookEvent(payload);
  if (webhookEvent) return [webhookEvent];

  const gatewayLike = normalizeGatewayLikeEvent(payload);
  return gatewayLike ? [gatewayLike] : [];
}

function acceptedEventAliases(value: string): string[] {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return [];
  if (['message', 'messages', 'message_create', 'game_direct_message_create', 'lobby_message_create'].includes(normalized)) return ['message'];
  if (['slash', 'slash_command', 'command', 'application_command'].includes(normalized)) return ['slash_command', 'interaction.application_command'];
  if (['interaction', 'component', 'button', 'select', 'modal'].includes(normalized)) {
    return ['interaction', 'interaction.component', 'interaction.modal_submit', 'interaction.autocomplete'];
  }
  if (['webhook', 'webhook_event', 'event'].includes(normalized)) return ['webhook_event'];
  return [normalized];
}

export function shouldAcceptDiscordEvent(
  normalized: NormalizedDiscordEvent,
  triggerConfig: DiscordTriggerConfig,
): { accepted: true } | { accepted: false; reason: string } {
  const rawEventTypes = [
    ...asStringList(triggerConfig.eventTypes),
    ...asStringList(triggerConfig.event),
  ];
  const allowed = (rawEventTypes.length ? rawEventTypes : DEFAULT_EVENT_TYPES).flatMap(acceptedEventAliases);
  if (
    !allowed.includes(normalized.eventType)
    && !(allowed.includes('interaction') && normalized.eventType.startsWith('interaction.'))
    && !allowed.includes(String(normalized.rawEventType || '').toLowerCase())
  ) {
    return { accepted: false, reason: `Ignored Discord event type "${normalized.eventType}".` };
  }

  const applicationId = asString(triggerConfig.applicationId);
  if (applicationId && normalized.applicationId !== applicationId) {
    return { accepted: false, reason: 'Ignored Discord event for a different application.' };
  }

  const guildIds = asStringList(triggerConfig.guildIds);
  if (guildIds.length > 0 && (!normalized.guildId || !guildIds.includes(normalized.guildId))) {
    return { accepted: false, reason: 'Ignored Discord event from a guild that is not allowed.' };
  }

  const channelIds = asStringList(triggerConfig.channelIds);
  if (channelIds.length > 0 && (!normalized.channelId || !channelIds.includes(normalized.channelId))) {
    return { accepted: false, reason: 'Ignored Discord event from a channel that is not allowed.' };
  }

  const allowedUserIds = asStringList(triggerConfig.allowedUserIds);
  if (allowedUserIds.length > 0 && (!normalized.userId || !allowedUserIds.includes(normalized.userId))) {
    return { accepted: false, reason: 'Ignored Discord event from a user that is not allowed.' };
  }

  const commandFilter = asString(triggerConfig.commandFilter);
  if (commandFilter && normalized.command && normalized.command !== commandFilter) {
    return { accepted: false, reason: 'Ignored Discord command because it did not match the configured command.' };
  }

  return { accepted: true };
}

export function getDiscordWebhookUrl(workflowId: string, nodeId: string): string {
  const baseUrl = String(config.publicBaseUrl || '').replace(/\/+$/, '');
  if (!baseUrl) throw new Error('PUBLIC_BASE_URL is required to register Discord webhooks.');
  return `${baseUrl}/api/discord/webhook/${encodeURIComponent(workflowId)}/${encodeURIComponent(nodeId)}`;
}

export async function resolveDiscordConnection(input: {
  userId: string;
  connectionId?: string;
}): Promise<{
  token: string;
  publicKey: string;
  applicationId: string;
  connectionId: string;
}> {
  let connectionId = asString(input.connectionId);
  if (!connectionId) {
    const canonical =
      await connectionService.findCanonicalConnection(input.userId, 'discord_bot_token')
      || await connectionService.findCanonicalConnectionByProvider(input.userId, 'discord');
    connectionId = canonical?.id || '';
  }
  if (!connectionId) {
    throw new Error('No active Discord connection found. Create one in Connections first.');
  }

  const connection = await connectionService.getDecryptedConnection(input.userId, connectionId);
  if (connection.provider !== 'discord' && connection.credentialTypeId !== 'discord_bot_token') {
    throw new Error('Selected connection is not a Discord Bot Token connection.');
  }

  return {
    token: extractToken(connection),
    publicKey: extractPublicKey(connection),
    applicationId: extractApplicationId(connection),
    connectionId: connection.id,
  };
}

async function publicKeyFor(input: {
  userId: string;
  connectionId?: string;
  triggerConfig: DiscordTriggerConfig;
}): Promise<string> {
  return asString(input.triggerConfig.publicKey)
    || (input.userId
      ? await resolveDiscordConnection({ userId: input.userId, connectionId: input.connectionId })
          .then((connection) => connection.publicKey)
          .catch(() => '')
      : '')
    || asString(process.env.DISCORD_PUBLIC_KEY);
}

function ed25519PublicKeyFromHex(publicKeyHex: string) {
  const clean = publicKeyHex.replace(/^0x/i, '').replace(/\s+/g, '');
  if (!/^[a-fA-F0-9]{64}$/.test(clean)) {
    throw new Error('Discord public key must be a 32-byte hex string.');
  }
  return createPublicKey({
    key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(clean, 'hex')]),
    format: 'der',
    type: 'spki',
  });
}

export async function validateDiscordSignature(
  req: Request,
  input: {
    userId: string;
    connectionId?: string;
    triggerConfig: DiscordTriggerConfig;
  },
): Promise<boolean> {
  if (input.triggerConfig.validateSignature === false) return true;
  const publicKey = await publicKeyFor(input);
  if (!publicKey) return false;

  const timestamp = discordHeader(req, 'x-signature-timestamp');
  const signature = discordHeader(req, 'x-signature-ed25519');
  if (!timestamp || !signature || !/^[a-fA-F0-9]+$/.test(signature)) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) > MAX_SIGNATURE_AGE_SECONDS) return false;

  try {
    return verifySignature(
      null,
      Buffer.from(`${timestamp}${rawRequestBody(req).toString('utf8')}`),
      ed25519PublicKeyFromHex(publicKey),
      Buffer.from(signature, 'hex'),
    );
  } catch {
    return false;
  }
}

async function verifyDiscordBot(token: string): Promise<boolean> {
  if (!token) return false;
  const cleanToken = token.startsWith('Bot ') ? token.slice(4).trim() : token.trim();
  const response = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bot ${cleanToken}` },
  });
  const data: any = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || response.statusText || 'Discord bot token verification failed');
  }
  return true;
}

export async function registerDiscordWebhook(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
  connectionId?: string;
}): Promise<{
  success: true;
  webhookUrl: string;
  connectionId: string;
  applicationId: string;
  manualSetupRequired: boolean;
  verifiedConnection: boolean;
}> {
  const connection = await resolveDiscordConnection({ userId: input.userId, connectionId: input.connectionId });
  const verifiedConnection = await verifyDiscordBot(connection.token).catch((error) => {
    logger.warn('[Discord Trigger] Unable to verify Discord bot token during registration:', error);
    return false;
  });

  return {
    success: true,
    webhookUrl: getDiscordWebhookUrl(input.workflowId, input.nodeId),
    connectionId: connection.connectionId,
    applicationId: connection.applicationId,
    manualSetupRequired: true,
    verifiedConnection,
  };
}

export async function unregisterDiscordWebhook(input: {
  userId: string;
  connectionId?: string;
}): Promise<{ success: true; connectionId: string; applicationId: string; manualSetupRequired: boolean }> {
  const connection = await resolveDiscordConnection({ userId: input.userId, connectionId: input.connectionId });
  return {
    success: true,
    connectionId: connection.connectionId,
    applicationId: connection.applicationId,
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

function nodeConfigOf(node: any): DiscordTriggerConfig {
  return (node?.data?.config || node?.config || {}) as DiscordTriggerConfig;
}

function connectionIdOf(node: any, triggerConfig: DiscordTriggerConfig): string {
  const refs = {
    ...((node?.data?.connectionRefs || {}) as Record<string, unknown>),
    ...((node?.connectionRefs || {}) as Record<string, unknown>),
    ...(((triggerConfig as any).connectionRefs || {}) as Record<string, unknown>),
  };
  const candidates = [
    triggerConfig.connectionId,
    (node?.data as any)?.connectionId,
    node?.connectionId,
    refs.discord_bot_token,
    refs.discord,
  ];
  for (const value of candidates) if (typeof value === 'string' && value.trim()) return value.trim();
  return '';
}

export async function autoRegisterDiscordWebhooksForWorkflow(input: {
  userId: string;
  workflow: any;
}): Promise<DiscordWebhookRegistrationStatus[]> {
  if (!input.workflow || input.workflow.status !== 'active') return [];
  const workflowId = asString(input.workflow.id);
  if (!workflowId) return [];
  const triggers = workflowNodes(input.workflow).filter((node) => nodeTypeOf(node) === 'discord_trigger');
  const results: DiscordWebhookRegistrationStatus[] = [];

  for (const node of triggers) {
    const nodeId = asString(node?.id);
    if (!nodeId) continue;
    const triggerConfig = nodeConfigOf(node);
    try {
      const result = await registerDiscordWebhook({
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
        applicationId: result.applicationId,
        manualSetupRequired: result.manualSetupRequired,
        verifiedConnection: result.verifiedConnection,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[Discord Trigger] Auto webhook registration failed:', { workflowId, nodeId, error: message });
      results.push({ nodeId, success: false, error: message });
    }
  }

  return results;
}

export function buildDiscordExecutionInput(input: {
  workflowId: string;
  nodeId: string;
  normalized: NormalizedDiscordEvent;
}): Record<string, unknown> {
  const thread = input.normalized.threadId || input.normalized.channelId || input.normalized.userId || input.normalized.eventId || randomUUID();
  return {
    ...input.normalized,
    trigger: 'discord',
    workflow_id: input.workflowId,
    node_id: input.nodeId,
    sessionId: `discord_${input.workflowId}_${input.normalized.guildId || 'dm'}_${thread}`,
    _discord: true,
  };
}
