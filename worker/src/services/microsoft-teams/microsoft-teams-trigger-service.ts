import { createPublicKey, randomUUID, timingSafeEqual, verify as verifySignature } from 'crypto';
import type { Request } from 'express';
import { config } from '../../core/config';
import { logger } from '../../core/logger';
import { connectionService } from '../../credentials-system/connection-service';
import type { DecryptedConnection } from '../../credentials-system/types';

export type MicrosoftTeamsEventType =
  | 'message'
  | 'conversation_update'
  | 'message_reaction'
  | 'invoke'
  | 'installation_update'
  | 'unknown';

export type NormalizedMicrosoftTeamsEvent = {
  eventId: string;
  eventType: MicrosoftTeamsEventType;
  source: 'microsoft_teams';
  userId: string | null;
  username: string;
  text: string;
  timestamp: string;
  tenantId: string | null;
  teamId: string | null;
  channelId: string | null;
  chatId: string | null;
  conversationId: string | null;
  serviceUrl: string;
  activityId: string | null;
  replyToId: string | null;
  locale: string;
  channelData: unknown;
  raw: unknown;
};

export type MicrosoftTeamsTriggerConfig = {
  connectionId?: string;
  event?: string;
  eventTypes?: string[] | string;
  teamIds?: string[] | string;
  channelIds?: string[] | string;
  allowedUserIds?: string[] | string;
  tenantId?: string;
  appId?: string;
  validationSecret?: string;
  validateJwt?: boolean;
};

export type MicrosoftTeamsWebhookRegistrationStatus = {
  nodeId: string;
  success: boolean;
  webhookUrl?: string;
  connectionId?: string;
  appId?: string;
  manualSetupRequired?: boolean;
  verifiedConnection?: boolean;
  error?: string;
};

type BotFrameworkMetadata = {
  issuer: string;
  jwks_uri: string;
};

const DEFAULT_EVENT_TYPES = ['message', 'conversation_update', 'invoke'];
const MAX_TOKEN_AGE_SECONDS = 3600;
const BOT_FRAMEWORK_OPENID_CONFIG = process.env.BOT_FRAMEWORK_OPENID_CONFIG
  || 'https://login.botframework.com/v1/.well-known/openidconfiguration';

let metadataCache: { value: BotFrameworkMetadata; expiresAt: number } | null = null;
let jwksCache: { value: any[]; expiresAt: number } | null = null;

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

function extractAppId(connection: DecryptedConnection): string {
  const credentials = connection.credentials || {};
  const metadata = connection.metadata || {};
  return credentialString(credentials, ['appId', 'clientId', 'microsoftAppId', 'applicationId'])
    || credentialString(metadata as Record<string, unknown>, ['appId', 'clientId', 'microsoftAppId', 'applicationId'])
    || asString(connection.externalAccountId);
}

function extractAppPassword(connection: DecryptedConnection): string {
  const credentials = connection.credentials || {};
  return credentialString(credentials, ['appPassword', 'clientSecret', 'microsoftAppPassword', 'secret']);
}

function extractValidationSecret(connection: DecryptedConnection): string {
  const credentials = connection.credentials || {};
  const metadata = connection.metadata || {};
  return credentialString(credentials, ['validationSecret', 'webhookSecret', 'secret'])
    || credentialString(metadata as Record<string, unknown>, ['validationSecret', 'webhookSecret']);
}

function rawRequestBody(req: Request): Buffer {
  const raw = (req as any).rawBody;
  if (Buffer.isBuffer(raw)) return raw;
  if (raw !== undefined && raw !== null) return Buffer.from(String(raw));
  return Buffer.from(JSON.stringify(req.body || {}));
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
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
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

async function botFrameworkMetadata(): Promise<BotFrameworkMetadata> {
  if (metadataCache && metadataCache.expiresAt > Date.now()) return metadataCache.value;
  const response = await fetch(BOT_FRAMEWORK_OPENID_CONFIG);
  if (!response.ok) throw new Error(`Unable to load Bot Framework OpenID metadata (${response.status})`);
  const json: any = await response.json();
  const value = { issuer: asString(json.issuer), jwks_uri: asString(json.jwks_uri) };
  if (!value.issuer || !value.jwks_uri) throw new Error('Bot Framework OpenID metadata is missing issuer or jwks_uri.');
  metadataCache = { value, expiresAt: Date.now() + 60 * 60 * 1000 };
  return value;
}

async function botFrameworkJwks(): Promise<any[]> {
  if (jwksCache && jwksCache.expiresAt > Date.now()) return jwksCache.value;
  const metadata = await botFrameworkMetadata();
  const response = await fetch(metadata.jwks_uri);
  if (!response.ok) throw new Error(`Unable to load Bot Framework signing keys (${response.status})`);
  const json: any = await response.json();
  const keys = Array.isArray(json.keys) ? json.keys : [];
  jwksCache = { value: keys, expiresAt: Date.now() + 60 * 60 * 1000 };
  return keys;
}

async function validateBotFrameworkJwt(token: string, appId: string): Promise<boolean> {
  const decoded = decodeJwt(token);
  if (!decoded || decoded.header?.alg !== 'RS256' || !decoded.header?.kid) return false;
  const [metadata, keys] = await Promise.all([botFrameworkMetadata(), botFrameworkJwks()]);
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
  const nbf = Number(decoded.payload?.nbf || 0);
  const iat = Number(decoded.payload?.iat || now);
  if (exp && exp < now) return false;
  if (nbf && nbf > now) return false;
  if (Math.abs(now - iat) > MAX_TOKEN_AGE_SECONDS && !exp) return false;
  if (metadata.issuer && decoded.payload?.iss !== metadata.issuer) return false;
  if (appId && decoded.payload?.aud !== appId) return false;
  return true;
}

function timestampFromActivity(value: unknown): string {
  const raw = asString(value);
  if (!raw) return new Date().toISOString();
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function eventTypeForActivity(type: string): MicrosoftTeamsEventType {
  const normalized = type.trim().toLowerCase();
  if (normalized === 'message') return 'message';
  if (normalized === 'conversationupdate' || normalized === 'conversation_update') return 'conversation_update';
  if (normalized === 'messagereaction' || normalized === 'message_reaction') return 'message_reaction';
  if (normalized === 'invoke') return 'invoke';
  if (normalized === 'installationupdate' || normalized === 'installation_update') return 'installation_update';
  return 'unknown';
}

export function normalizeMicrosoftTeamsActivity(activity: any): NormalizedMicrosoftTeamsEvent[] {
  if (!activity || typeof activity !== 'object') return [];
  const channelData = activity.channelData || {};
  const teamId = asString(channelData?.team?.id) || asString(activity?.team?.id) || null;
  const channelId = asString(channelData?.channel?.id) || asString(activity?.channelData?.channelId) || null;
  const conversationId = asString(activity?.conversation?.id) || null;
  const from = activity?.from || {};
  const eventType = eventTypeForActivity(asString(activity?.type));

  return [{
    eventId: asString(activity?.id) || randomUUID(),
    eventType,
    source: 'microsoft_teams',
    userId: asString(from?.aadObjectId) || asString(from?.id) || null,
    username: asString(from?.name),
    text: asString(activity?.text) || asString(activity?.value?.text),
    timestamp: timestampFromActivity(activity?.timestamp || activity?.localTimestamp),
    tenantId: asString(channelData?.tenant?.id) || asString(activity?.tenantId) || null,
    teamId,
    channelId,
    chatId: channelId || conversationId,
    conversationId,
    serviceUrl: asString(activity?.serviceUrl),
    activityId: asString(activity?.id) || null,
    replyToId: asString(activity?.replyToId) || asString(activity?.id) || null,
    locale: asString(activity?.locale),
    channelData,
    raw: activity,
  }];
}

function acceptedEventAliases(value: string): string[] {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return [];
  if (['message', 'channel_message', 'personal_message', 'dm'].includes(normalized)) return ['message'];
  if (['conversation_update', 'conversationupdate', 'member_added', 'member_removed'].includes(normalized)) return ['conversation_update'];
  if (['reaction', 'message_reaction', 'messagereaction'].includes(normalized)) return ['message_reaction'];
  if (['invoke', 'task_module', 'adaptive_card_action'].includes(normalized)) return ['invoke'];
  return [normalized];
}

export function shouldAcceptMicrosoftTeamsEvent(
  normalized: NormalizedMicrosoftTeamsEvent,
  triggerConfig: MicrosoftTeamsTriggerConfig,
): { accepted: true } | { accepted: false; reason: string } {
  const rawEventTypes = [
    ...asStringList(triggerConfig.eventTypes),
    ...asStringList(triggerConfig.event),
  ];
  const allowed = (rawEventTypes.length ? rawEventTypes : DEFAULT_EVENT_TYPES).flatMap(acceptedEventAliases);
  if (!allowed.includes(normalized.eventType)) {
    return { accepted: false, reason: `Ignored Microsoft Teams event type "${normalized.eventType}".` };
  }

  const tenantId = asString(triggerConfig.tenantId);
  if (tenantId && normalized.tenantId !== tenantId) {
    return { accepted: false, reason: 'Ignored Teams event for a different tenant.' };
  }

  const teamIds = asStringList(triggerConfig.teamIds);
  if (teamIds.length > 0 && (!normalized.teamId || !teamIds.includes(normalized.teamId))) {
    return { accepted: false, reason: 'Ignored Teams event from a team that is not allowed.' };
  }

  const channelIds = asStringList(triggerConfig.channelIds);
  if (channelIds.length > 0 && (!normalized.channelId || !channelIds.includes(normalized.channelId))) {
    return { accepted: false, reason: 'Ignored Teams event from a channel that is not allowed.' };
  }

  const allowedUserIds = asStringList(triggerConfig.allowedUserIds);
  if (allowedUserIds.length > 0 && (!normalized.userId || !allowedUserIds.includes(normalized.userId))) {
    return { accepted: false, reason: 'Ignored Teams event from a user that is not allowed.' };
  }

  return { accepted: true };
}

export function getMicrosoftTeamsWebhookUrl(workflowId: string, nodeId: string): string {
  const baseUrl = String(config.publicBaseUrl || '').replace(/\/+$/, '');
  if (!baseUrl) throw new Error('PUBLIC_BASE_URL is required to register Microsoft Teams webhooks.');
  return `${baseUrl}/api/microsoft-teams/webhook/${encodeURIComponent(workflowId)}/${encodeURIComponent(nodeId)}`;
}

export async function resolveMicrosoftTeamsConnection(input: {
  userId: string;
  connectionId?: string;
}): Promise<{
  appId: string;
  appPassword: string;
  validationSecret: string;
  connectionId: string;
}> {
  let connectionId = asString(input.connectionId);
  if (!connectionId) {
    const canonical =
      await connectionService.findCanonicalConnection(input.userId, 'microsoft_teams_bot')
      || await connectionService.findCanonicalConnectionByProvider(input.userId, 'microsoft_teams');
    connectionId = canonical?.id || '';
  }
  if (!connectionId) {
    throw new Error('No active Microsoft Teams Bot connection found. Create one in Connections first.');
  }

  const connection = await connectionService.getDecryptedConnection(input.userId, connectionId);
  if (connection.provider !== 'microsoft_teams' && connection.credentialTypeId !== 'microsoft_teams_bot') {
    throw new Error('Selected connection is not a Microsoft Teams Bot connection.');
  }

  return {
    appId: extractAppId(connection),
    appPassword: extractAppPassword(connection),
    validationSecret: extractValidationSecret(connection),
    connectionId: connection.id,
  };
}

async function validationMaterialFor(input: {
  userId: string;
  connectionId?: string;
  triggerConfig: MicrosoftTeamsTriggerConfig;
}): Promise<{ appId: string; validationSecret: string }> {
  const configSecret = asString(input.triggerConfig.validationSecret);
  const configAppId = asString(input.triggerConfig.appId);
  const connection = input.userId
    ? await resolveMicrosoftTeamsConnection({ userId: input.userId, connectionId: input.connectionId }).catch(() => null)
    : null;
  return {
    appId: configAppId || connection?.appId || asString(process.env.MICROSOFT_TEAMS_APP_ID),
    validationSecret: configSecret || connection?.validationSecret || asString(process.env.MICROSOFT_TEAMS_WEBHOOK_SECRET),
  };
}

export async function validateMicrosoftTeamsRequest(
  req: Request,
  input: {
    userId: string;
    connectionId?: string;
    triggerConfig: MicrosoftTeamsTriggerConfig;
  },
): Promise<boolean> {
  if (input.triggerConfig.validateJwt === false) return true;
  const { appId, validationSecret } = await validationMaterialFor(input);

  if (validationSecret) {
    const received = header(req, 'x-ms-teams-secret')
      || header(req, 'x-teams-secret')
      || header(req, 'x-ctrlchecks-teams-secret')
      || asString((req.query as any)?.secret);
    if (received && timingEqualString(received, validationSecret)) return true;
  }

  const authorization = header(req, 'authorization');
  const token = authorization.toLowerCase().startsWith('bearer ') ? authorization.slice(7).trim() : '';
  if (!token || !appId) return false;
  return validateBotFrameworkJwt(token, appId).catch((error) => {
    logger.warn('[Microsoft Teams Trigger] Bot Framework JWT validation failed:', error);
    return false;
  });
}

export async function registerMicrosoftTeamsWebhook(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
  connectionId?: string;
}): Promise<{
  success: true;
  webhookUrl: string;
  connectionId: string;
  appId: string;
  manualSetupRequired: boolean;
  verifiedConnection: boolean;
}> {
  const connection = await resolveMicrosoftTeamsConnection({ userId: input.userId, connectionId: input.connectionId });
  return {
    success: true,
    webhookUrl: getMicrosoftTeamsWebhookUrl(input.workflowId, input.nodeId),
    connectionId: connection.connectionId,
    appId: connection.appId,
    manualSetupRequired: true,
    verifiedConnection: Boolean(connection.appId),
  };
}

export async function unregisterMicrosoftTeamsWebhook(input: {
  userId: string;
  connectionId?: string;
}): Promise<{ success: true; connectionId: string; appId: string; manualSetupRequired: boolean }> {
  const connection = await resolveMicrosoftTeamsConnection({ userId: input.userId, connectionId: input.connectionId });
  return {
    success: true,
    connectionId: connection.connectionId,
    appId: connection.appId,
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

function nodeConfigOf(node: any): MicrosoftTeamsTriggerConfig {
  return (node?.data?.config || node?.config || {}) as MicrosoftTeamsTriggerConfig;
}

function connectionIdOf(node: any, triggerConfig: MicrosoftTeamsTriggerConfig): string {
  const refs = {
    ...((node?.data?.connectionRefs || {}) as Record<string, unknown>),
    ...((node?.connectionRefs || {}) as Record<string, unknown>),
    ...(((triggerConfig as any).connectionRefs || {}) as Record<string, unknown>),
  };
  const candidates = [
    triggerConfig.connectionId,
    (node?.data as any)?.connectionId,
    node?.connectionId,
    refs.microsoft_teams_bot,
    refs.microsoft_teams,
  ];
  for (const value of candidates) if (typeof value === 'string' && value.trim()) return value.trim();
  return '';
}

export async function autoRegisterMicrosoftTeamsWebhooksForWorkflow(input: {
  userId: string;
  workflow: any;
}): Promise<MicrosoftTeamsWebhookRegistrationStatus[]> {
  if (!input.workflow || input.workflow.status !== 'active') return [];
  const workflowId = asString(input.workflow.id);
  if (!workflowId) return [];
  const triggers = workflowNodes(input.workflow).filter((node) => nodeTypeOf(node) === 'microsoft_teams_trigger');
  const results: MicrosoftTeamsWebhookRegistrationStatus[] = [];

  for (const node of triggers) {
    const nodeId = asString(node?.id);
    if (!nodeId) continue;
    const triggerConfig = nodeConfigOf(node);
    try {
      const result = await registerMicrosoftTeamsWebhook({
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
        appId: result.appId,
        manualSetupRequired: result.manualSetupRequired,
        verifiedConnection: result.verifiedConnection,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[Microsoft Teams Trigger] Auto webhook registration failed:', { workflowId, nodeId, error: message });
      results.push({ nodeId, success: false, error: message });
    }
  }

  return results;
}

export function buildMicrosoftTeamsExecutionInput(input: {
  workflowId: string;
  nodeId: string;
  normalized: NormalizedMicrosoftTeamsEvent;
}): Record<string, unknown> {
  const thread = input.normalized.conversationId || input.normalized.channelId || input.normalized.userId || input.normalized.eventId;
  return {
    ...input.normalized,
    trigger: 'microsoft_teams',
    workflow_id: input.workflowId,
    node_id: input.nodeId,
    sessionId: `teams_${input.workflowId}_${input.normalized.tenantId || 'tenant'}_${thread}`,
    _microsoftTeams: true,
  };
}
