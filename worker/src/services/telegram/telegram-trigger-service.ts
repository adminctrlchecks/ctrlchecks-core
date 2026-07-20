import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { config } from '../../core/config';
import { logger } from '../../core/logger';
import { connectionService } from '../../credentials-system/connection-service';
import type { DecryptedConnection } from '../../credentials-system/types';

export type TelegramUpdateType =
  | 'message'
  | 'edited_message'
  | 'channel_post'
  | 'edited_channel_post'
  | 'callback_query'
  | 'inline_query'
  | 'unknown';

export type NormalizedTelegramUpdate = {
  chatId: string | null;
  messageId: number | null;
  text: string;
  username: string;
  firstName: string;
  lastName: string;
  userId: string | null;
  updateType: TelegramUpdateType;
  raw: unknown;
};

export type TelegramTriggerConfig = {
  connectionId?: string;
  updateTypes?: string[] | string;
  allowedChatIds?: string[] | string;
  commandFilter?: string;
  secretToken?: string;
};

export type TelegramWebhookRegistrationStatus = {
  nodeId: string;
  success: boolean;
  webhookUrl?: string;
  connectionId?: string;
  previousUrl?: string;
  error?: string;
};

const DEFAULT_ALLOWED_UPDATES = ['message'];

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeCommand(command: string): string {
  const trimmed = command.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function getTelegramWebhookUrl(workflowId: string, nodeId: string): string {
  const baseUrl = String(config.publicBaseUrl || '').replace(/\/+$/, '');
  if (!baseUrl) {
    throw new Error('PUBLIC_BASE_URL is required to register Telegram webhooks.');
  }
  return `${baseUrl}/api/telegram/webhook/${encodeURIComponent(workflowId)}/${encodeURIComponent(nodeId)}`;
}

export function detectTelegramUpdateType(update: any): TelegramUpdateType {
  if (update?.message) return 'message';
  if (update?.edited_message) return 'edited_message';
  if (update?.channel_post) return 'channel_post';
  if (update?.edited_channel_post) return 'edited_channel_post';
  if (update?.callback_query) return 'callback_query';
  if (update?.inline_query) return 'inline_query';
  return 'unknown';
}

export function normalizeTelegramUpdate(update: any): NormalizedTelegramUpdate {
  const updateType = detectTelegramUpdateType(update);
  const event =
    update?.message ||
    update?.edited_message ||
    update?.channel_post ||
    update?.edited_channel_post ||
    update?.callback_query?.message ||
    update?.inline_query ||
    {};
  const from = update?.callback_query?.from || update?.inline_query?.from || event.from || {};
  const chat = event.chat || {};
  const text =
    asString(event.text) ||
    asString(event.caption) ||
    asString(update?.callback_query?.data) ||
    asString(update?.inline_query?.query);

  return {
    chatId: chat.id !== undefined && chat.id !== null ? String(chat.id) : null,
    messageId: typeof event.message_id === 'number' ? event.message_id : null,
    text,
    username: asString(from.username),
    firstName: asString(from.first_name),
    lastName: asString(from.last_name),
    userId: from.id !== undefined && from.id !== null ? String(from.id) : null,
    updateType,
    raw: update,
  };
}

export function shouldAcceptTelegramUpdate(
  normalized: NormalizedTelegramUpdate,
  triggerConfig: TelegramTriggerConfig,
): { accepted: true } | { accepted: false; reason: string } {
  const updateTypes = asStringList(triggerConfig.updateTypes);
  const allowedUpdateTypes = updateTypes.length > 0 ? updateTypes : DEFAULT_ALLOWED_UPDATES;
  if (!allowedUpdateTypes.includes(normalized.updateType)) {
    return { accepted: false, reason: `Ignored Telegram update type "${normalized.updateType}".` };
  }

  const allowedChatIds = asStringList(triggerConfig.allowedChatIds);
  if (allowedChatIds.length > 0 && (!normalized.chatId || !allowedChatIds.includes(normalized.chatId))) {
    return { accepted: false, reason: 'Ignored Telegram update from a chat that is not allowed.' };
  }

  const command = normalizeCommand(asString(triggerConfig.commandFilter));
  if (command && !normalized.text.startsWith(command)) {
    return { accepted: false, reason: `Ignored Telegram message because it does not start with ${command}.` };
  }

  return { accepted: true };
}

export function validateTelegramSecret(req: Request, triggerConfig: TelegramTriggerConfig): boolean {
  const expected = asString(triggerConfig.secretToken);
  if (!expected) return true;
  const headerValue = req.headers['x-telegram-bot-api-secret-token'];
  const received = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return typeof received === 'string' && received === expected;
}

function extractToken(connection: DecryptedConnection): string {
  const credentials = connection.credentials || {};
  const token =
    asString(credentials.botToken) ||
    asString(credentials.apiKey) ||
    asString(credentials.token) ||
    asString(credentials.value);
  if (!token) {
    throw new Error('Telegram Bot Token is missing from the selected connection.');
  }
  return token;
}

export async function resolveTelegramBotToken(input: {
  userId: string;
  connectionId?: string;
}): Promise<{ token: string; connectionId: string }> {
  let connectionId = asString(input.connectionId);
  if (!connectionId) {
    const canonical = await connectionService.findCanonicalConnection(input.userId, 'telegram_bot_token');
    connectionId = canonical?.id || '';
  }
  if (!connectionId) {
    throw new Error('No active Telegram Bot Token connection found. Create one in Connections first.');
  }
  const connection = await connectionService.getDecryptedConnection(input.userId, connectionId);
  if (connection.credentialTypeId !== 'telegram_bot_token' && connection.provider !== 'telegram') {
    throw new Error('Selected connection is not a Telegram Bot Token connection.');
  }
  return { token: extractToken(connection), connectionId: connection.id };
}

async function callTelegramApi<T>(
  token: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data: any = await response.json().catch(() => null);
  if (!response.ok || data?.ok === false) {
    const description = data?.description || response.statusText || 'Telegram API request failed';
    throw new Error(`Telegram ${method} failed (${response.status}): ${description}`);
  }
  return data as T;
}

export async function registerTelegramWebhook(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
  connectionId?: string;
  updateTypes?: string[] | string;
  secretToken?: string;
  force?: boolean;
}): Promise<{
  success: true;
  webhookUrl: string;
  connectionId: string;
  bot?: unknown;
  previousUrl?: string;
}> {
  const { token, connectionId } = await resolveTelegramBotToken({
    userId: input.userId,
    connectionId: input.connectionId,
  });
  const webhookUrl = getTelegramWebhookUrl(input.workflowId, input.nodeId);
  const info: any = await callTelegramApi(token, 'getWebhookInfo');
  const previousUrl = asString(info?.result?.url);
  if (previousUrl && previousUrl !== webhookUrl && !input.force) {
    throw Object.assign(
      new Error(`This Telegram bot already has a webhook registered at ${previousUrl}. Telegram allows one webhook per bot token. Re-register with force=true only if this workflow should own that bot.`),
      { statusCode: 409 },
    );
  }

  const allowedUpdates = asStringList(input.updateTypes);
  const payload: Record<string, unknown> = {
    url: webhookUrl,
    allowed_updates: allowedUpdates.length > 0 ? allowedUpdates : DEFAULT_ALLOWED_UPDATES,
    drop_pending_updates: false,
  };
  const secretToken = asString(input.secretToken);
  if (secretToken) payload.secret_token = secretToken;

  await callTelegramApi(token, 'setWebhook', payload);
  const bot = await callTelegramApi(token, 'getMe').catch((error) => {
    logger.warn('[Telegram Trigger] getMe after setWebhook failed:', error);
    return undefined;
  });

  return { success: true, webhookUrl, connectionId, previousUrl, bot };
}

export async function unregisterTelegramWebhook(input: {
  userId: string;
  connectionId?: string;
  dropPendingUpdates?: boolean;
}): Promise<{ success: true; connectionId: string }> {
  const { token, connectionId } = await resolveTelegramBotToken({
    userId: input.userId,
    connectionId: input.connectionId,
  });
  await callTelegramApi(token, 'deleteWebhook', {
    drop_pending_updates: !!input.dropPendingUpdates,
  });
  return { success: true, connectionId };
}

function workflowNodes(workflow: any): any[] {
  const candidates = [
    workflow?.nodes,
    workflow?.graph?.nodes,
    workflow?.definition?.nodes,
    workflow?.definition?.graph?.nodes,
  ];
  for (const value of candidates) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

function nodeTypeOf(node: any): string {
  const dataType = String(node?.data?.type || '').trim();
  const rawType = String(node?.type || '').trim();
  return dataType || rawType;
}

function nodeConfigOf(node: any): TelegramTriggerConfig {
  return (node?.data?.config || node?.config || {}) as TelegramTriggerConfig;
}

function connectionIdOf(node: any, triggerConfig: TelegramTriggerConfig): string {
  const refs = {
    ...((node?.data?.connectionRefs || {}) as Record<string, unknown>),
    ...((node?.connectionRefs || {}) as Record<string, unknown>),
    ...(((triggerConfig as any).connectionRefs || {}) as Record<string, unknown>),
  };
  const candidates = [
    triggerConfig.connectionId,
    (node?.data as any)?.connectionId,
    node?.connectionId,
    refs.telegram_bot_token,
    refs.telegram,
    refs.telegram_token,
    refs.telegram_api_key,
    refs.telegram_oauth2,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

export async function autoRegisterTelegramWebhooksForWorkflow(input: {
  userId: string;
  workflow: any;
  force?: boolean;
}): Promise<TelegramWebhookRegistrationStatus[]> {
  if (!input.workflow || input.workflow.status !== 'active') return [];

  const workflowId = asString(input.workflow.id);
  if (!workflowId) return [];

  const telegramTriggers = workflowNodes(input.workflow).filter((node) => nodeTypeOf(node) === 'telegram_trigger');
  const results: TelegramWebhookRegistrationStatus[] = [];

  for (const node of telegramTriggers) {
    const nodeId = asString(node?.id);
    if (!nodeId) continue;

    const triggerConfig = nodeConfigOf(node);
    try {
      const result = await registerTelegramWebhook({
        userId: input.userId,
        workflowId,
        nodeId,
        connectionId: connectionIdOf(node, triggerConfig),
        updateTypes: triggerConfig.updateTypes,
        secretToken: triggerConfig.secretToken,
        force: input.force ?? true,
      });
      results.push({
        nodeId,
        success: true,
        webhookUrl: result.webhookUrl,
        connectionId: result.connectionId,
        previousUrl: result.previousUrl,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[Telegram Trigger] Auto webhook registration failed:', {
        workflowId,
        nodeId,
        error: message,
      });
      results.push({ nodeId, success: false, error: message });
    }
  }

  return results;
}

export function buildTelegramExecutionInput(input: {
  workflowId: string;
  nodeId: string;
  normalized: NormalizedTelegramUpdate;
}): Record<string, unknown> {
  return {
    ...input.normalized,
    trigger: 'telegram',
    workflow_id: input.workflowId,
    node_id: input.nodeId,
    updateId: (input.normalized.raw as any)?.update_id ?? null,
    sessionId: input.normalized.chatId
      ? `telegram_${input.workflowId}_${input.normalized.chatId}`
      : `telegram_${input.workflowId}_${randomUUID()}`,
    timestamp: new Date().toISOString(),
    _telegram: true,
  };
}
