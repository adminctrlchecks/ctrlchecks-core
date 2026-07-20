import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { config } from '../../core/config';
import { logger } from '../../core/logger';
import { retrieveCredential } from '../../core/utils/credential-retriever';
import { getRedisClient } from '../../shared/redis-client';

/**
 * Linear data-change webhook trigger.
 *
 * Auth model: reuses the existing `linear_api_key` credential used by the Linear
 * action node, with `linear_oauth2` accepted as a fallback for OAuth users. Linear
 * requires a workspace admin or OAuth app with admin scope to create/read webhooks.
 *
 * Webhook registration model: Linear's GraphQL API exposes `webhookCreate` and
 * `webhookDelete`. CtrlChecks generates a per-node webhook secret, passes it to
 * Linear during creation, stores it in Redis, and uses it to validate deliveries.
 *
 * Signature model: Linear sends `Linear-Signature`, a hex HMAC-SHA256 digest of
 * the exact raw request body signed with the webhook signing secret. Linear also
 * recommends rejecting requests whose webhook timestamp is more than one minute
 * away from local system time.
 */

export type LinearTriggerConfig = {
  connectionId?: string;
  teamId?: string;
  allPublicTeams?: boolean;
  resourceTypes?: string | string[];
  eventTypes?: string | string[];
  issueId?: string;
  projectId?: string;
  actorId?: string;
  query?: string;
};

export type NormalizedLinearEvent = {
  eventId: string;
  eventType: string;
  source: 'linear';
  userId: string | null;
  username: string | null;
  text: string;
  timestamp: string;
  deliveryId: string | null;
  linearEvent: string | null;
  action: string | null;
  entityType: string | null;
  entityId: string | null;
  organizationId: string | null;
  webhookId: string | null;
  webhookTimestamp: number | null;
  url: string | null;
  teamId: string | null;
  teamKey: string | null;
  teamName: string | null;
  issueId: string | null;
  issueIdentifier: string | null;
  issueTitle: string | null;
  issueUrl: string | null;
  stateId: string | null;
  stateName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  commentId: string | null;
  commentBody: string | null;
  projectId: string | null;
  projectName: string | null;
  raw: unknown;
};

export type LinearWebhookRegistrationStatus = {
  nodeId: string;
  success: boolean;
  webhookUrl?: string;
  teamId?: string;
  allPublicTeams?: boolean;
  resourceTypes?: string[];
  webhookId?: string;
  error?: string;
};

type LinearWebhookState = {
  webhookId: string;
  webhookSecret: string;
  webhookUrl: string;
  teamId: string | null;
  allPublicTeams: boolean;
  resourceTypes: string[];
  userId: string;
  workflowId: string;
  nodeId: string;
};

export type ResolvedLinearCredential = {
  token: string;
  authHeader: string;
};

type LinearWebhookHeaders = {
  deliveryId?: string;
  linearEvent?: string;
  timestamp?: string;
};

const LINEAR_API_URL = 'https://api.linear.app/graphql';
const STATE_TTL_SECONDS = 365 * 24 * 60 * 60;
const DEFAULT_RESOURCE_TYPES = ['Issue', 'Comment'];
const TIMESTAMP_TOLERANCE_MS = 60 * 1000;

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 'true';
}

function header(req: Request, name: string): string {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || '' : asString(value);
}

function timingEqualHex(leftHex: string, right: Buffer): boolean {
  if (!/^[a-f0-9]+$/i.test(leftHex) || leftHex.length % 2 !== 0) return false;
  const left = Buffer.from(leftHex, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

function stateKey(workflowId: string, nodeId: string): string {
  return `linear:webhook:${workflowId}:${nodeId}`;
}

async function getWebhookState(workflowId: string, nodeId: string): Promise<LinearWebhookState | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  const raw = await redis.get(stateKey(workflowId, nodeId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LinearWebhookState;
  } catch {
    return null;
  }
}

async function setWebhookState(state: LinearWebhookState): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.set(stateKey(state.workflowId, state.nodeId), JSON.stringify(state), 'EX', STATE_TTL_SECONDS);
}

async function deleteWebhookState(workflowId: string, nodeId: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.del(stateKey(workflowId, nodeId));
}

export function getLinearWebhookUrl(workflowId: string, nodeId: string): string {
  const baseUrl = String(config.publicBaseUrl || '').replace(/\/+$/, '');
  if (!baseUrl) throw new Error('PUBLIC_BASE_URL is required to register Linear webhooks.');
  return `${baseUrl}/api/linear/webhook/${encodeURIComponent(workflowId)}/${encodeURIComponent(nodeId)}`;
}

function parseCredentialValue(value: string | null): Record<string, any> {
  if (!value) return {};
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return { token: trimmed };
  try {
    return JSON.parse(trimmed);
  } catch {
    return { token: trimmed };
  }
}

function buildLinearAuthHeader(token: string): string {
  if (token.startsWith('lin_api_') || token.startsWith('Bearer ')) return token;
  return `Bearer ${token}`;
}

export async function resolveLinearCredential(userId: string): Promise<ResolvedLinearCredential> {
  for (const key of ['linear_api_key', 'linear', 'linear_oauth2']) {
    const stored = await retrieveCredential({ userId }, key).catch(() => null);
    if (!stored) continue;
    const parsed = parseCredentialValue(stored);
    const token = asString(parsed.token) || asString(parsed.apiKey) || asString(parsed.access_token) || asString(parsed.accessToken);
    if (token) return { token, authHeader: buildLinearAuthHeader(token) };
  }
  throw new Error('No active Linear connection found. Save a Linear Personal API Key connection first.');
}

async function linearGraphql(credential: ResolvedLinearCredential, query: string, variables?: Record<string, unknown>): Promise<any> {
  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      Authorization: credential.authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const text = await response.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!response.ok) {
    const message = json?.errors?.[0]?.message || json?.message || text || response.statusText;
    throw Object.assign(new Error(`Linear API error (${response.status}): ${message}`), { statusCode: response.status });
  }
  if (json?.errors?.length) {
    throw new Error(`Linear API error: ${json.errors.map((error: any) => error?.message || String(error)).join('; ')}`);
  }
  return json.data || {};
}

export function getLinearWebhookHeaders(req: Request): LinearWebhookHeaders {
  return {
    deliveryId: header(req, 'linear-delivery'),
    linearEvent: header(req, 'linear-event'),
    timestamp: header(req, 'linear-timestamp'),
  };
}

export function getLinearSignatureHeader(req: Request): string {
  return header(req, 'linear-signature');
}

export function validateLinearSignature(rawBody: Buffer, signatureHeader: string, webhookSecret: string): boolean {
  if (!rawBody?.length || !signatureHeader || !webhookSecret) return false;
  const computed = createHmac('sha256', webhookSecret).update(rawBody).digest();
  return timingEqualHex(signatureHeader, computed);
}

export function isLinearTimestampFresh(timestampValue: unknown, nowMs = Date.now()): boolean {
  const raw = typeof timestampValue === 'number' ? timestampValue : Number(asString(timestampValue));
  if (!Number.isFinite(raw) || raw <= 0) return false;
  const timestampMs = raw < 10_000_000_000 ? raw * 1000 : raw;
  return Math.abs(nowMs - timestampMs) <= TIMESTAMP_TOLERANCE_MS;
}

export async function validateLinearWebhookSecret(input: {
  workflowId: string;
  nodeId: string;
  rawBody: Buffer;
  signatureHeader: string;
  timestampValue?: unknown;
}): Promise<boolean> {
  const state = await getWebhookState(input.workflowId, input.nodeId);
  if (!state) return false;
  if (!validateLinearSignature(input.rawBody, input.signatureHeader, state.webhookSecret)) return false;
  if (!isLinearTimestampFresh(input.timestampValue)) return false;
  return true;
}

function list(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value.map((item) => asString(item)).filter(Boolean);
  const str = asString(value);
  if (!str) return [];
  return str.split(',').map((item) => item.trim()).filter(Boolean);
}

function eventTypesList(value: string | string[] | undefined): string[] {
  return list(value).map((item) => item.toLowerCase());
}

function resourceTypesList(value: string | string[] | undefined): string[] {
  const configured = list(value);
  return configured.length ? configured : DEFAULT_RESOURCE_TYPES;
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const str = asString(value);
    if (str) return str;
  }
  return '';
}

function eventTypeFor(type: string, action: string): string {
  const entity = type.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/\s+/g, '_').toLowerCase();
  const verb = action === 'create' ? 'created' : action === 'update' ? 'updated' : action === 'remove' ? 'removed' : action.toLowerCase();
  return entity && verb ? `${entity}_${verb}` : entity || verb || 'linear_event';
}

function toIsoTimestamp(payload: any, headers?: LinearWebhookHeaders): string {
  const fromString = firstText(payload?.createdAt);
  if (fromString) return fromString;
  const timestampValue = payload?.webhookTimestamp ?? headers?.timestamp;
  const numeric = Number(timestampValue);
  if (Number.isFinite(numeric) && numeric > 0) {
    const timestampMs = numeric < 10_000_000_000 ? numeric * 1000 : numeric;
    return new Date(timestampMs).toISOString();
  }
  return new Date().toISOString();
}

export function normalizeLinearEvent(payload: any, headers: LinearWebhookHeaders = {}): NormalizedLinearEvent | null {
  const action = firstText(payload?.action);
  const entityType = firstText(payload?.type, headers.linearEvent);
  if (!action && !entityType) return null;

  const data = payload?.data || payload?.issueData || {};
  const actor = payload?.actor || {};
  const team = data?.team || payload?.team || {};
  const state = data?.state || {};
  const assignee = data?.assignee || {};
  const project = data?.project || payload?.project || {};
  const issue = data?.issue || payload?.issue || {};
  const eventType = eventTypeFor(entityType, action || 'event');
  const deliveryId = firstText(headers.deliveryId);
  const webhookId = firstText(payload?.webhookId);
  const dataId = firstText(data?.id, issue?.id);
  const timestamp = toIsoTimestamp(payload, headers);

  const issueId = firstText(
    entityType.toLowerCase() === 'issue' ? data?.id : undefined,
    data?.issueId,
    issue?.id,
  ) || null;
  const issueTitle = firstText(data?.title, issue?.title) || null;
  const commentBody = firstText(data?.body, data?.comment?.body) || null;
  const projectId = firstText(
    entityType.toLowerCase() === 'project' ? data?.id : undefined,
    data?.projectId,
    project?.id,
  ) || null;
  const projectName = firstText(data?.name, project?.name) || null;

  return {
    eventId: deliveryId || webhookId || dataId || randomUUID(),
    eventType,
    source: 'linear',
    userId: firstText(actor?.id, data?.creatorId, data?.userId) || null,
    username: firstText(actor?.name, actor?.email) || null,
    text: firstText(issueTitle, commentBody, projectName, data?.name, payload?.url, eventType),
    timestamp,
    deliveryId: deliveryId || null,
    linearEvent: firstText(headers.linearEvent) || null,
    action: action || null,
    entityType: entityType || null,
    entityId: dataId || null,
    organizationId: firstText(payload?.organizationId, data?.organizationId) || null,
    webhookId: webhookId || null,
    webhookTimestamp: Number.isFinite(Number(payload?.webhookTimestamp)) ? Number(payload.webhookTimestamp) : null,
    url: firstText(payload?.url, data?.url) || null,
    teamId: firstText(team?.id, data?.teamId) || null,
    teamKey: firstText(team?.key) || null,
    teamName: firstText(team?.name) || null,
    issueId,
    issueIdentifier: firstText(data?.identifier, issue?.identifier) || null,
    issueTitle,
    issueUrl: firstText(data?.url, issue?.url, payload?.url) || null,
    stateId: firstText(state?.id, data?.stateId) || null,
    stateName: firstText(state?.name) || null,
    assigneeId: firstText(assignee?.id, data?.assigneeId) || null,
    assigneeName: firstText(assignee?.name, assignee?.email) || null,
    commentId: entityType.toLowerCase() === 'comment' ? (dataId || null) : firstText(data?.commentId) || null,
    commentBody,
    projectId,
    projectName,
    raw: payload,
  };
}

export function shouldAcceptLinearEvent(
  normalized: NormalizedLinearEvent,
  triggerConfig: LinearTriggerConfig,
): { accepted: true } | { accepted: false; reason: string } {
  const configuredEventTypes = eventTypesList(triggerConfig.eventTypes);
  if (configuredEventTypes.length) {
    const rawEvent = firstText(normalized.entityType).toLowerCase();
    const rawAction = firstText(normalized.action).toLowerCase();
    if (!configuredEventTypes.includes(normalized.eventType.toLowerCase()) && !configuredEventTypes.includes(rawEvent) && !configuredEventTypes.includes(rawAction)) {
      return { accepted: false, reason: `Ignored Linear event type "${normalized.eventType}" not in the configured event types.` };
    }
  }

  const teamId = asString(triggerConfig.teamId);
  if (teamId && normalized.teamId && normalized.teamId !== teamId) {
    return { accepted: false, reason: `Ignored Linear event for team "${normalized.teamId}", trigger is scoped to "${teamId}".` };
  }

  const issueId = asString(triggerConfig.issueId);
  if (issueId && normalized.issueId && normalized.issueId !== issueId && normalized.issueIdentifier !== issueId) {
    return { accepted: false, reason: `Ignored Linear event for issue "${normalized.issueId || normalized.issueIdentifier}", trigger is scoped to "${issueId}".` };
  }

  const projectId = asString(triggerConfig.projectId);
  if (projectId && normalized.projectId && normalized.projectId !== projectId) {
    return { accepted: false, reason: `Ignored Linear event for project "${normalized.projectId}", trigger is scoped to "${projectId}".` };
  }

  const actorId = asString(triggerConfig.actorId);
  if (actorId && normalized.userId && normalized.userId !== actorId) {
    return { accepted: false, reason: `Ignored Linear event from actor "${normalized.userId}", trigger is scoped to "${actorId}".` };
  }

  const query = asString(triggerConfig.query).toLowerCase();
  if (query && !normalized.text.toLowerCase().includes(query)) {
    return { accepted: false, reason: 'Ignored Linear event not matching the configured query filter.' };
  }

  return { accepted: true };
}

export function buildLinearExecutionInput(input: {
  workflowId: string;
  nodeId: string;
  normalized: NormalizedLinearEvent;
}): Record<string, unknown> {
  return {
    ...input.normalized,
    trigger: 'linear',
    workflow_id: input.workflowId,
    node_id: input.nodeId,
    sessionId: `linear_${input.workflowId}_${input.normalized.eventId}`,
    _linear: true,
  };
}

export async function registerLinearWebhook(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
  teamId?: string;
  allPublicTeams?: boolean;
  resourceTypes?: string | string[];
}): Promise<{ success: true; webhookUrl: string; webhookId: string; webhookSecret: string; teamId: string | null; allPublicTeams: boolean; resourceTypes: string[] }> {
  const credential = await resolveLinearCredential(input.userId);
  const webhookUrl = getLinearWebhookUrl(input.workflowId, input.nodeId);
  const resourceTypes = resourceTypesList(input.resourceTypes);
  const teamId = asString(input.teamId);
  const allPublicTeams = !teamId || asBoolean(input.allPublicTeams);
  const webhookSecret = randomBytes(32).toString('hex');

  const existing = await getWebhookState(input.workflowId, input.nodeId);
  if (existing?.webhookId) {
    await unregisterLinearWebhook({
      userId: input.userId,
      workflowId: input.workflowId,
      nodeId: input.nodeId,
    }).catch((error) => {
      logger.warn('[Linear Trigger] Failed to remove previous webhook before re-registering (continuing):', error);
    });
  }

  const mutation = `
    mutation CreateCtrlChecksWebhook($input: WebhookCreateInput!) {
      webhookCreate(input: $input) {
        success
        webhook {
          id
          enabled
          secret
          url
          team { id name key }
        }
      }
    }
  `;
  const createInput: Record<string, unknown> = {
    label: `CtrlChecks workflow ${input.workflowId} node ${input.nodeId}`,
    url: webhookUrl,
    secret: webhookSecret,
    resourceTypes,
  };
  if (teamId && !allPublicTeams) {
    createInput.teamId = teamId;
  } else {
    createInput.allPublicTeams = true;
  }

  const data = await linearGraphql(credential, mutation, { input: createInput });
  const result = data?.webhookCreate;
  const webhook = result?.webhook;
  if (!result?.success || !webhook?.id) {
    throw new Error('Linear webhookCreate did not return a webhook id.');
  }

  await setWebhookState({
    webhookId: String(webhook.id),
    webhookSecret,
    webhookUrl,
    teamId: webhook?.team?.id ? String(webhook.team.id) : teamId || null,
    allPublicTeams,
    resourceTypes,
    userId: input.userId,
    workflowId: input.workflowId,
    nodeId: input.nodeId,
  });

  return {
    success: true,
    webhookUrl,
    webhookId: String(webhook.id),
    webhookSecret,
    teamId: webhook?.team?.id ? String(webhook.team.id) : teamId || null,
    allPublicTeams,
    resourceTypes,
  };
}

export async function unregisterLinearWebhook(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
}): Promise<{ success: true }> {
  const state = await getWebhookState(input.workflowId, input.nodeId);
  if (state?.webhookId) {
    const credential = await resolveLinearCredential(input.userId).catch(() => null);
    if (credential) {
      const mutation = `
        mutation DeleteCtrlChecksWebhook($id: String!) {
          webhookDelete(id: $id) { success }
        }
      `;
      await linearGraphql(credential, mutation, { id: state.webhookId }).catch((error) => {
        logger.warn('[Linear Trigger] Webhook delete failed (continuing to clear local state):', error);
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

function nodeConfigOf(node: any): LinearTriggerConfig {
  return (node?.data?.config || node?.config || {}) as LinearTriggerConfig;
}

export async function autoRegisterLinearWebhooksForWorkflow(input: {
  userId: string;
  workflow: any;
}): Promise<LinearWebhookRegistrationStatus[]> {
  if (!input.workflow || input.workflow.status !== 'active') return [];
  const workflowId = asString(input.workflow.id);
  if (!workflowId) return [];
  const triggers = workflowNodes(input.workflow).filter((node) => nodeTypeOf(node) === 'linear_trigger');
  const results: LinearWebhookRegistrationStatus[] = [];

  for (const node of triggers) {
    const nodeId = asString(node?.id);
    if (!nodeId) continue;
    const triggerConfig = nodeConfigOf(node);
    try {
      const result = await registerLinearWebhook({
        userId: input.userId,
        workflowId,
        nodeId,
        teamId: triggerConfig.teamId,
        allPublicTeams: triggerConfig.allPublicTeams,
        resourceTypes: triggerConfig.resourceTypes,
      });
      results.push({
        nodeId,
        success: true,
        webhookUrl: result.webhookUrl,
        webhookId: result.webhookId,
        teamId: result.teamId || undefined,
        allPublicTeams: result.allPublicTeams,
        resourceTypes: result.resourceTypes,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[Linear Trigger] Auto webhook registration failed:', { workflowId, nodeId, error: message });
      results.push({ nodeId, success: false, error: message });
    }
  }

  return results;
}

export { getWebhookState as getLinearWebhookState };
