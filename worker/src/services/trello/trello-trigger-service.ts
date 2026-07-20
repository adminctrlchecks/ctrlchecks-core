import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { config } from '../../core/config';
import { logger } from '../../core/logger';
import { retrieveCredential } from '../../core/utils/credential-retriever';
import { getRedisClient } from '../../shared/redis-client';

/**
 * Trello model-event trigger (cards, lists, boards, checklists, comments, members).
 *
 * Auth model: reuses the existing `trello_api_key` credential used by the Trello
 * action node: Trello API key + user token. Webhook delivery verification also needs
 * the Trello app secret from the same API key page. The app secret is not needed for
 * ordinary Trello action calls, but Trello signs webhook deliveries with it.
 *
 * Webhook registration model: Trello webhooks belong to a token and watch one
 * `idModel` (board, card, member, organization, etc.) via `POST /1/webhooks`.
 * Trello validates the callback URL by issuing an HTTP HEAD request during creation;
 * the API refuses creation unless that callback returns 200.
 *
 * Signature model: Trello sends `X-Trello-Webhook`, a base64 HMAC-SHA1 digest of the
 * exact raw request body concatenated with the exact callbackURL used at registration,
 * signed with the Trello app secret.
 */

export type NormalizedTrelloEvent = {
  eventId: string;
  eventType: string;
  source: 'trello';
  userId: string | null;
  username: string | null;
  text: string;
  timestamp: string;
  actionId: string | null;
  actionType: string | null;
  boardId: string | null;
  boardName: string | null;
  boardUrl: string | null;
  listId: string | null;
  listName: string | null;
  listBeforeId: string | null;
  listBeforeName: string | null;
  listAfterId: string | null;
  listAfterName: string | null;
  cardId: string | null;
  cardName: string | null;
  cardUrl: string | null;
  cardShortLink: string | null;
  commentText: string | null;
  checklistId: string | null;
  checklistName: string | null;
  checkItemId: string | null;
  checkItemName: string | null;
  memberId: string | null;
  memberName: string | null;
  raw: unknown;
};

export type TrelloTriggerConfig = {
  connectionId?: string;
  modelId?: string;
  boardId?: string;
  listId?: string;
  cardId?: string;
  memberId?: string;
  eventTypes?: string | string[];
  query?: string;
};

export type TrelloWebhookRegistrationStatus = {
  nodeId: string;
  success: boolean;
  webhookUrl?: string;
  modelId?: string;
  hookId?: string;
  error?: string;
};

type TrelloWebhookState = {
  modelId: string;
  hookId: string;
  callbackUrl: string;
  appSecret: string;
  userId: string;
  workflowId: string;
  nodeId: string;
};

export type ResolvedTrelloCredential = {
  apiKey: string;
  token: string;
  appSecret: string;
};

const TRELLO_API_BASE = 'https://api.trello.com/1';
const STATE_TTL_SECONDS = 365 * 24 * 60 * 60;
const DEFAULT_EVENT_TYPES = ['card_created', 'card_updated', 'card_moved', 'card_commented', 'list_activity', 'checklist_activity'];

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
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
  return `trello:webhook:${workflowId}:${nodeId}`;
}

async function getWebhookState(workflowId: string, nodeId: string): Promise<TrelloWebhookState | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  const raw = await redis.get(stateKey(workflowId, nodeId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TrelloWebhookState;
  } catch {
    return null;
  }
}

async function setWebhookState(state: TrelloWebhookState): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.set(stateKey(state.workflowId, state.nodeId), JSON.stringify(state), 'EX', STATE_TTL_SECONDS);
}

async function deleteWebhookState(workflowId: string, nodeId: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.del(stateKey(workflowId, nodeId));
}

export function getTrelloWebhookUrl(workflowId: string, nodeId: string): string {
  const baseUrl = String(config.publicBaseUrl || '').replace(/\/+$/, '');
  if (!baseUrl) throw new Error('PUBLIC_BASE_URL is required to register Trello webhooks.');
  return `${baseUrl}/api/trello/webhook/${encodeURIComponent(workflowId)}/${encodeURIComponent(nodeId)}`;
}

function parseCredentialValue(value: string | null): Record<string, any> {
  if (!value) return {};
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return { value: trimmed };
  try {
    return JSON.parse(trimmed);
  } catch {
    return { value: trimmed };
  }
}

export async function resolveTrelloCredential(userId: string): Promise<ResolvedTrelloCredential> {
  for (const key of ['trello_api_key', 'trello']) {
    const stored = await retrieveCredential({ userId }, key).catch(() => null);
    if (!stored) continue;
    const parsed = parseCredentialValue(stored);
    const apiKey = asString(parsed.apiKey) || asString(parsed.key);
    const token = asString(parsed.token) || asString(parsed.apiToken);
    const appSecret = asString(parsed.appSecret) || asString(parsed.secret) || asString(parsed.applicationSecret);
    if (apiKey && token) {
      if (!appSecret) {
        throw new Error('Trello Trigger requires the Trello app secret for X-Trello-Webhook signature validation. Add App Secret to your Trello connection.');
      }
      return { apiKey, token, appSecret };
    }
  }
  throw new Error('No active Trello connection found. Save a Trello API Key & Token connection first.');
}

async function trelloApiFetch(credential: Pick<ResolvedTrelloCredential, 'apiKey' | 'token'>, path: string, init?: RequestInit): Promise<any> {
  const separator = path.includes('?') ? '&' : '?';
  const url = `${TRELLO_API_BASE}${path}${separator}key=${encodeURIComponent(credential.apiKey)}&token=${encodeURIComponent(credential.token)}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  const text = await response.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!response.ok) {
    const message = json?.message || json?.error || text || response.statusText;
    throw Object.assign(new Error(`Trello API error (${response.status}): ${message}`), { statusCode: response.status });
  }
  return json;
}

export function validateTrelloSignature(rawBody: Buffer, signatureHeader: string, appSecret: string, callbackUrl: string): boolean {
  if (!signatureHeader || !appSecret || !callbackUrl) return false;
  const computed = createHmac('sha1', appSecret)
    .update(Buffer.concat([rawBody, Buffer.from(callbackUrl)]))
    .digest('base64');
  return timingEqualString(signatureHeader, computed);
}

export function getTrelloSignatureHeader(req: Request): string {
  return header(req, 'x-trello-webhook');
}

function eventTypesList(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value.map((v) => asString(v).toLowerCase()).filter(Boolean);
  const str = asString(value);
  if (!str) return [];
  return str
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

function mapTrelloActionType(actionType: string, data: any): string {
  switch (actionType) {
    case 'createCard':
      return 'card_created';
    case 'commentCard':
      return 'card_commented';
    case 'updateCard':
      return data?.listBefore || data?.listAfter ? 'card_moved' : 'card_updated';
    case 'deleteCard':
      return 'card_deleted';
    case 'addMemberToCard':
    case 'removeMemberFromCard':
      return 'card_member_changed';
    case 'addLabelToCard':
    case 'removeLabelFromCard':
      return 'card_label_changed';
    case 'createList':
    case 'updateList':
    case 'moveListToBoard':
      return 'list_activity';
    case 'addChecklistToCard':
    case 'removeChecklistFromCard':
    case 'createCheckItem':
    case 'updateCheckItemStateOnCard':
    case 'updateCheckItem':
    case 'deleteCheckItem':
      return 'checklist_activity';
    default:
      return actionType.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).replace(/^_/, '');
  }
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const str = asString(value);
    if (str) return str;
  }
  return '';
}

export function normalizeTrelloEvent(payload: any): NormalizedTrelloEvent | null {
  const action = payload?.action || {};
  const actionType = asString(action?.type);
  if (!actionType) return null;

  const data = action?.data || {};
  const board = data?.board || payload?.model || {};
  const card = data?.card || {};
  const list = data?.list || {};
  const listBefore = data?.listBefore || {};
  const listAfter = data?.listAfter || {};
  const checklist = data?.checklist || {};
  const checkItem = data?.checkItem || {};
  const memberCreator = action?.memberCreator || {};
  const member = data?.member || memberCreator || {};
  const eventType = mapTrelloActionType(actionType, data);
  const timestamp = firstText(action?.date) || new Date().toISOString();
  const commentText = firstText(data?.text, data?.comment?.text) || null;
  const cardName = firstText(card?.name, data?.cardSource?.name) || null;
  const boardName = firstText(board?.name) || null;
  const listName = firstText(list?.name, listAfter?.name, listBefore?.name) || null;

  return {
    eventId: firstText(action?.id) || randomUUID(),
    eventType,
    source: 'trello',
    userId: firstText(memberCreator?.id, member?.id) || null,
    username: firstText(memberCreator?.username, member?.username, memberCreator?.fullName, member?.fullName) || null,
    text: commentText || cardName || `${eventType} on Trello`,
    timestamp,
    actionId: firstText(action?.id) || null,
    actionType,
    boardId: firstText(board?.id) || null,
    boardName,
    boardUrl: firstText(board?.url, payload?.model?.url) || null,
    listId: firstText(list?.id, listAfter?.id, listBefore?.id, card?.idList) || null,
    listName,
    listBeforeId: firstText(listBefore?.id) || null,
    listBeforeName: firstText(listBefore?.name) || null,
    listAfterId: firstText(listAfter?.id) || null,
    listAfterName: firstText(listAfter?.name) || null,
    cardId: firstText(card?.id) || null,
    cardName,
    cardUrl: firstText(card?.url) || null,
    cardShortLink: firstText(card?.shortLink) || null,
    commentText,
    checklistId: firstText(checklist?.id) || null,
    checklistName: firstText(checklist?.name) || null,
    checkItemId: firstText(checkItem?.id) || null,
    checkItemName: firstText(checkItem?.name) || null,
    memberId: firstText(member?.id) || null,
    memberName: firstText(member?.fullName, member?.username) || null,
    raw: payload,
  };
}

export function shouldAcceptTrelloEvent(
  normalized: NormalizedTrelloEvent,
  triggerConfig: TrelloTriggerConfig,
): { accepted: true } | { accepted: false; reason: string } {
  const configuredEventTypes = eventTypesList(triggerConfig.eventTypes);
  if (configuredEventTypes.length) {
    const normalizedType = normalized.eventType.toLowerCase();
    const rawActionType = asString(normalized.actionType).toLowerCase();
    if (!configuredEventTypes.includes(normalizedType) && !configuredEventTypes.includes(rawActionType)) {
      return { accepted: false, reason: `Ignored Trello event type "${normalized.eventType}" not in the configured event types.` };
    }
  }

  const boardId = asString(triggerConfig.boardId);
  if (boardId && normalized.boardId && normalized.boardId !== boardId) {
    return { accepted: false, reason: `Ignored Trello event for board "${normalized.boardId}", trigger is scoped to "${boardId}".` };
  }

  const listId = asString(triggerConfig.listId);
  if (listId && ![normalized.listId, normalized.listBeforeId, normalized.listAfterId].includes(listId)) {
    return { accepted: false, reason: `Ignored Trello event outside list "${listId}".` };
  }

  const cardId = asString(triggerConfig.cardId);
  if (cardId && normalized.cardId && normalized.cardId !== cardId) {
    return { accepted: false, reason: `Ignored Trello event for card "${normalized.cardId}", trigger is scoped to "${cardId}".` };
  }

  const memberId = asString(triggerConfig.memberId);
  if (memberId && ![normalized.userId, normalized.memberId].includes(memberId)) {
    return { accepted: false, reason: `Ignored Trello event not involving member "${memberId}".` };
  }

  const query = asString(triggerConfig.query).toLowerCase();
  if (query && !normalized.text.toLowerCase().includes(query)) {
    return { accepted: false, reason: 'Ignored Trello event not matching the configured query filter.' };
  }

  return { accepted: true };
}

export function buildTrelloExecutionInput(input: {
  workflowId: string;
  nodeId: string;
  normalized: NormalizedTrelloEvent;
}): Record<string, unknown> {
  return {
    ...input.normalized,
    trigger: 'trello',
    workflow_id: input.workflowId,
    node_id: input.nodeId,
    sessionId: `trello_${input.workflowId}_${input.normalized.eventId}`,
    _trello: true,
  };
}

export async function validateTrelloWebhookSecret(
  workflowId: string,
  nodeId: string,
  rawBody: Buffer,
  signatureHeader: string,
): Promise<boolean> {
  const state = await getWebhookState(workflowId, nodeId);
  if (!state) return false;
  return validateTrelloSignature(rawBody, signatureHeader, state.appSecret, state.callbackUrl);
}

export async function registerTrelloWebhook(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
  modelId: string;
  eventTypes?: string | string[];
}): Promise<{ success: true; webhookUrl: string; modelId: string; hookId: string }> {
  const modelId = asString(input.modelId);
  if (!modelId) {
    throw Object.assign(new Error('A Trello model ID is required. Use a board ID for board/list/card activity, or a card/member ID for narrower events.'), { statusCode: 400 });
  }

  const credential = await resolveTrelloCredential(input.userId);
  const webhookUrl = getTrelloWebhookUrl(input.workflowId, input.nodeId);
  const existing = await getWebhookState(input.workflowId, input.nodeId);

  if (existing?.hookId && existing.modelId === modelId) {
    await trelloApiFetch(credential, `/webhooks/${encodeURIComponent(existing.hookId)}`, { method: 'DELETE' }).catch((error) => {
      logger.warn('[Trello Trigger] Failed to remove previous webhook before re-registering (continuing):', error);
    });
  }

  const response = await fetch(
    `${TRELLO_API_BASE}/tokens/${encodeURIComponent(credential.token)}/webhooks/?key=${encodeURIComponent(credential.apiKey)}`,
    {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callbackURL: webhookUrl,
        idModel: modelId,
        description: `CtrlChecks workflow ${input.workflowId} node ${input.nodeId}`,
      }),
    },
  ).then(async (response) => {
    const text = await response.text();
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    if (!response.ok) {
      const message = json?.message || json?.error || text || response.statusText;
      throw Object.assign(new Error(`Trello API error (${response.status}): ${message}`), { statusCode: response.status });
    }
    return json;
  });

  const hookId = response?.id !== undefined && response?.id !== null ? String(response.id) : '';
  await setWebhookState({
    modelId,
    hookId,
    callbackUrl: webhookUrl,
    appSecret: credential.appSecret,
    userId: input.userId,
    workflowId: input.workflowId,
    nodeId: input.nodeId,
  });

  return { success: true, webhookUrl, modelId, hookId };
}

export async function unregisterTrelloWebhook(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
}): Promise<{ success: true }> {
  const state = await getWebhookState(input.workflowId, input.nodeId);
  if (state?.hookId) {
    const credential = await resolveTrelloCredential(input.userId).catch(() => null);
    if (credential) {
      await trelloApiFetch(credential, `/webhooks/${encodeURIComponent(state.hookId)}`, { method: 'DELETE' }).catch((error) => {
        logger.warn('[Trello Trigger] Webhook delete failed (continuing to clear local state):', error);
      });
    }
  }

  await deleteWebhookState(input.workflowId, input.nodeId);
  return { success: true };
}

function workflowNodes(workflow: any): any[] {
  const candidates = [workflow?.nodes, workflow?.graph?.nodes, workflow?.definition?.nodes, workflow?.definition?.graph?.nodes];
  for (const value of candidates) if (Array.isArray(value)) return value;
  return [];
}

function nodeTypeOf(node: any): string {
  return String(node?.data?.type || node?.type || '').trim();
}

function nodeConfigOf(node: any): TrelloTriggerConfig {
  return (node?.data?.config || node?.config || {}) as TrelloTriggerConfig;
}

export async function autoRegisterTrelloWebhooksForWorkflow(input: {
  userId: string;
  workflow: any;
}): Promise<TrelloWebhookRegistrationStatus[]> {
  if (!input.workflow || input.workflow.status !== 'active') return [];
  const workflowId = asString(input.workflow.id);
  if (!workflowId) return [];
  const triggers = workflowNodes(input.workflow).filter((node) => nodeTypeOf(node) === 'trello_trigger');
  const results: TrelloWebhookRegistrationStatus[] = [];

  for (const node of triggers) {
    const nodeId = asString(node?.id);
    if (!nodeId) continue;
    const triggerConfig = nodeConfigOf(node);
    const modelId = asString(triggerConfig.modelId) || asString(triggerConfig.boardId);
    if (!modelId) {
      results.push({ nodeId, success: false, error: 'A Trello Model ID or Board ID is required (set it on the Trello Trigger node).' });
      continue;
    }
    try {
      const result = await registerTrelloWebhook({
        userId: input.userId,
        workflowId,
        nodeId,
        modelId,
        eventTypes: triggerConfig.eventTypes,
      });
      results.push({ nodeId, success: true, webhookUrl: result.webhookUrl, modelId: result.modelId, hookId: result.hookId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[Trello Trigger] Auto webhook registration failed:', { workflowId, nodeId, error: message });
      results.push({ nodeId, success: false, error: message });
    }
  }

  return results;
}

export { getWebhookState as getTrelloWebhookState };
