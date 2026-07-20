import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { config } from '../../core/config';
import { logger } from '../../core/logger';
import { retrieveCredential } from '../../core/utils/credential-retriever';
import { getRedisClient } from '../../shared/redis-client';

export type NormalizedTypeformEvent = {
  eventId: string;
  eventType: 'form_response';
  source: 'typeform';
  userId: string | null;
  username: string;
  text: string;
  timestamp: string;
  formId: string;
  responseId: string;
  answers: Record<string, unknown>;
  hidden: Record<string, unknown>;
  raw: unknown;
};

export type TypeformTriggerConfig = {
  connectionId?: string;
  formId?: string;
  query?: string;
};

export type TypeformWebhookRegistrationStatus = {
  nodeId: string;
  success: boolean;
  webhookUrl?: string;
  formId?: string;
  error?: string;
};

type TypeformWebhookState = {
  formId: string;
  tag: string;
  secret: string;
  userId: string;
  workflowId: string;
  nodeId: string;
};

const TYPEFORM_API_BASE = 'https://api.typeform.com';
const STATE_TTL_SECONDS = 365 * 24 * 60 * 60; // Typeform webhooks don't expire; keep state indefinitely

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

function tagFor(nodeId: string): string {
  return `ctrlchecks-${nodeId}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 64);
}

function stateKey(workflowId: string, nodeId: string): string {
  return `typeform:webhook:${workflowId}:${nodeId}`;
}

async function getWebhookState(workflowId: string, nodeId: string): Promise<TypeformWebhookState | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  const raw = await redis.get(stateKey(workflowId, nodeId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TypeformWebhookState;
  } catch {
    return null;
  }
}

async function setWebhookState(state: TypeformWebhookState): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.set(stateKey(state.workflowId, state.nodeId), JSON.stringify(state), 'EX', STATE_TTL_SECONDS);
}

async function deleteWebhookState(workflowId: string, nodeId: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.del(stateKey(workflowId, nodeId));
}

export function getTypeformWebhookUrl(workflowId: string, nodeId: string): string {
  const baseUrl = String(config.publicBaseUrl || '').replace(/\/+$/, '');
  if (!baseUrl) throw new Error('PUBLIC_BASE_URL is required to register Typeform webhooks.');
  return `${baseUrl}/api/typeform/webhook/${encodeURIComponent(workflowId)}/${encodeURIComponent(nodeId)}`;
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

async function resolveTypeformToken(userId: string): Promise<string> {
  for (const key of ['typeform_token', 'typeform']) {
    const stored = await retrieveCredential({ userId }, key).catch(() => null);
    if (!stored) continue;
    const parsed = parseCredentialValue(stored);
    const token = asString(parsed.token) || asString(parsed.apiKey) || asString(parsed.value) || asString(stored);
    if (token) return token;
  }
  throw new Error('No active Typeform connection found. Save a Typeform Personal Access Token in Connections first.');
}

async function typeformApiFetch(token: string, path: string, init?: RequestInit): Promise<any> {
  const response = await fetch(`${TYPEFORM_API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = json?.description || json?.message || response.statusText;
    throw Object.assign(new Error(`Typeform API error (${response.status}): ${message}`), { statusCode: response.status });
  }
  return json;
}

export function validateTypeformSignature(rawBody: Buffer, signatureHeader: string, secret: string): boolean {
  if (!signatureHeader.startsWith('sha256=')) return false;
  const provided = signatureHeader.slice('sha256='.length);
  const computed = createHmac('sha256', secret).update(rawBody).digest('base64');
  return timingEqualString(provided, computed);
}

export function getTypeformSignatureHeader(req: Request): string {
  return header(req, 'typeform-signature');
}

export function normalizeTypeformResponse(payload: any): NormalizedTypeformEvent | null {
  const formResponse = payload?.form_response;
  if (!formResponse) return null;

  const answers: Record<string, unknown> = {};
  for (const answer of Array.isArray(formResponse?.answers) ? formResponse.answers : []) {
    const field = answer?.field || {};
    const key = asString(field?.ref) || asString(field?.id) || asString(field?.title);
    if (!key) continue;
    const type = asString(answer?.type);
    answers[key] = answer?.[type] ?? answer?.text ?? answer?.email ?? answer?.url ?? answer?.number ?? answer?.boolean ?? answer?.choice ?? answer?.choices;
  }

  const hidden: Record<string, unknown> = formResponse?.hidden && typeof formResponse.hidden === 'object' ? formResponse.hidden : {};

  return {
    eventId: asString(payload?.event_id),
    eventType: 'form_response',
    source: 'typeform',
    userId: null,
    username: '',
    text: JSON.stringify(answers),
    timestamp: asString(formResponse?.submitted_at) || new Date().toISOString(),
    formId: asString(formResponse?.form_id),
    responseId: asString(formResponse?.token),
    answers,
    hidden,
    raw: payload,
  };
}

export function shouldAcceptTypeformEvent(
  normalized: NormalizedTypeformEvent,
  triggerConfig: TypeformTriggerConfig,
): { accepted: true } | { accepted: false; reason: string } {
  const configuredFormId = asString(triggerConfig.formId);
  if (configuredFormId && configuredFormId !== normalized.formId) {
    return { accepted: false, reason: 'Ignored Typeform response for a different form.' };
  }

  const query = asString(triggerConfig.query).toLowerCase();
  if (query && !normalized.text.toLowerCase().includes(query)) {
    return { accepted: false, reason: 'Ignored Typeform response not matching the configured query filter.' };
  }

  return { accepted: true };
}

export function buildTypeformExecutionInput(input: {
  workflowId: string;
  nodeId: string;
  normalized: NormalizedTypeformEvent;
}): Record<string, unknown> {
  return {
    ...input.normalized,
    trigger: 'typeform',
    workflow_id: input.workflowId,
    node_id: input.nodeId,
    sessionId: `typeform_${input.workflowId}_${input.normalized.responseId}`,
    _typeform: true,
  };
}

export async function validateTypeformWebhookSecret(
  workflowId: string,
  nodeId: string,
  rawBody: Buffer,
  signatureHeader: string,
): Promise<boolean> {
  const state = await getWebhookState(workflowId, nodeId);
  if (!state) return false;
  return validateTypeformSignature(rawBody, signatureHeader, state.secret);
}

export async function registerTypeformWebhook(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
  formId: string;
}): Promise<{ success: true; webhookUrl: string; formId: string; tag: string }> {
  const formId = asString(input.formId);
  if (!formId) {
    throw Object.assign(new Error('A Typeform form ID is required.'), { statusCode: 400 });
  }
  const token = await resolveTypeformToken(input.userId);
  const webhookUrl = getTypeformWebhookUrl(input.workflowId, input.nodeId);
  const tag = tagFor(input.nodeId);

  const existing = await getWebhookState(input.workflowId, input.nodeId);
  const secret = existing?.secret || randomUUID();

  await typeformApiFetch(token, `/forms/${encodeURIComponent(formId)}/webhooks/${encodeURIComponent(tag)}`, {
    method: 'PUT',
    body: JSON.stringify({
      url: webhookUrl,
      enabled: true,
      secret,
      verify_ssl: true,
    }),
  });

  await setWebhookState({
    formId,
    tag,
    secret,
    userId: input.userId,
    workflowId: input.workflowId,
    nodeId: input.nodeId,
  });

  return { success: true, webhookUrl, formId, tag };
}

export async function unregisterTypeformWebhook(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
}): Promise<{ success: true }> {
  const state = await getWebhookState(input.workflowId, input.nodeId);
  if (state) {
    const token = await resolveTypeformToken(input.userId).catch(() => null);
    if (token) {
      await typeformApiFetch(token, `/forms/${encodeURIComponent(state.formId)}/webhooks/${encodeURIComponent(state.tag)}`, {
        method: 'DELETE',
      }).catch((error) => {
        logger.warn('[Typeform Trigger] Webhook delete failed (continuing to clear local state):', error);
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

function nodeConfigOf(node: any): TypeformTriggerConfig {
  return (node?.data?.config || node?.config || {}) as TypeformTriggerConfig;
}

export async function autoRegisterTypeformWebhooksForWorkflow(input: {
  userId: string;
  workflow: any;
}): Promise<TypeformWebhookRegistrationStatus[]> {
  if (!input.workflow || input.workflow.status !== 'active') return [];
  const workflowId = asString(input.workflow.id);
  if (!workflowId) return [];
  const triggers = workflowNodes(input.workflow).filter((node) => nodeTypeOf(node) === 'typeform_trigger');
  const results: TypeformWebhookRegistrationStatus[] = [];

  for (const node of triggers) {
    const nodeId = asString(node?.id);
    if (!nodeId) continue;
    const triggerConfig = nodeConfigOf(node);
    const formId = asString(triggerConfig.formId);
    if (!formId) {
      results.push({ nodeId, success: false, error: 'Form ID is required (set it on the Typeform Trigger node).' });
      continue;
    }
    try {
      const result = await registerTypeformWebhook({ userId: input.userId, workflowId, nodeId, formId });
      results.push({ nodeId, success: true, webhookUrl: result.webhookUrl, formId: result.formId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[Typeform Trigger] Auto webhook registration failed:', { workflowId, nodeId, error: message });
      results.push({ nodeId, success: false, error: message });
    }
  }

  return results;
}

export { getWebhookState as getTypeformWebhookState };
