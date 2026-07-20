import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { config } from '../../core/config';
import { logger } from '../../core/logger';
import { retrieveCredential } from '../../core/utils/credential-retriever';
import { getRedisClient } from '../../shared/redis-client';

/**
 * Tally (tally.so) form-submission trigger.
 *
 * IMPORTANT — signature scheme assumption:
 * Tally documents signing webhook payloads with a `Tally-Signature` header
 * containing the base64-encoded HMAC-SHA256 digest of the raw request body,
 * computed using the webhook's signing secret. Unlike Typeform (which prefixes
 * the header value with `sha256=`), Tally's documented examples show the raw
 * base64 digest with no algorithm prefix. This implementation accepts both
 * forms defensively (with or without a `sha256=` prefix) since the exact
 * wire format could not be verified against a live Tally webhook in this
 * session — treat this as best-effort matching Tally's documented behavior,
 * not a confirmed-against-production contract.
 *
 * IMPORTANT — webhook registration assumption:
 * Tally's public API (https://api.tally.so) exposes `POST /forms/{formId}/webhooks`
 * to create a webhook and `DELETE /webhooks/{webhookId}` to remove one. Some
 * Tally API versions auto-generate the signing secret server-side and return
 * it in the response instead of accepting a client-supplied one. This
 * implementation sends a client-generated secret on the request (mirroring
 * the Typeform pattern) but always prefers whatever `signingSecret` value
 * comes back in the API response, so it works either way.
 */

export type NormalizedTallyEvent = {
  eventId: string;
  eventType: 'form_response';
  source: 'tally';
  userId: string | null;
  username: string;
  text: string;
  timestamp: string;
  formId: string;
  formName: string;
  responseId: string;
  answers: Record<string, unknown>;
  raw: unknown;
};

export type TallyTriggerConfig = {
  connectionId?: string;
  formId?: string;
  query?: string;
};

export type TallyWebhookRegistrationStatus = {
  nodeId: string;
  success: boolean;
  webhookUrl?: string;
  formId?: string;
  error?: string;
};

type TallyWebhookState = {
  formId: string;
  webhookId: string;
  secret: string;
  userId: string;
  workflowId: string;
  nodeId: string;
};

const TALLY_API_BASE = 'https://api.tally.so';
// Tally webhooks (like Typeform's) do not appear to expire on a schedule, so
// no renewal scheduler is registered — state is kept indefinitely until the
// webhook is explicitly unregistered or the workflow's trigger is removed.
const STATE_TTL_SECONDS = 365 * 24 * 60 * 60;

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
  return `tally:webhook:${workflowId}:${nodeId}`;
}

async function getWebhookState(workflowId: string, nodeId: string): Promise<TallyWebhookState | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  const raw = await redis.get(stateKey(workflowId, nodeId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TallyWebhookState;
  } catch {
    return null;
  }
}

async function setWebhookState(state: TallyWebhookState): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.set(stateKey(state.workflowId, state.nodeId), JSON.stringify(state), 'EX', STATE_TTL_SECONDS);
}

async function deleteWebhookState(workflowId: string, nodeId: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.del(stateKey(workflowId, nodeId));
}

export function getTallyWebhookUrl(workflowId: string, nodeId: string): string {
  const baseUrl = String(config.publicBaseUrl || '').replace(/\/+$/, '');
  if (!baseUrl) throw new Error('PUBLIC_BASE_URL is required to register Tally webhooks.');
  return `${baseUrl}/api/tally/webhook/${encodeURIComponent(workflowId)}/${encodeURIComponent(nodeId)}`;
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

async function resolveTallyToken(userId: string): Promise<string> {
  for (const key of ['tally_token', 'tally']) {
    const stored = await retrieveCredential({ userId }, key).catch(() => null);
    if (!stored) continue;
    const parsed = parseCredentialValue(stored);
    const token = asString(parsed.token) || asString(parsed.apiKey) || asString(parsed.value) || asString(stored);
    if (token) return token;
  }
  throw new Error('No active Tally connection found. Save a Tally Personal Access Token in Connections first.');
}

async function tallyApiFetch(token: string, path: string, init?: RequestInit): Promise<any> {
  const response = await fetch(`${TALLY_API_BASE}${path}`, {
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
    const message = json?.message || json?.error || response.statusText;
    throw Object.assign(new Error(`Tally API error (${response.status}): ${message}`), { statusCode: response.status });
  }
  return json;
}

export function validateTallySignature(rawBody: Buffer, signatureHeader: string, secret: string): boolean {
  if (!signatureHeader) return false;
  const provided = signatureHeader.startsWith('sha256=') ? signatureHeader.slice('sha256='.length) : signatureHeader;
  const computed = createHmac('sha256', secret).update(rawBody).digest('base64');
  return timingEqualString(provided, computed);
}

export function getTallySignatureHeader(req: Request): string {
  return header(req, 'tally-signature');
}

function resolveFieldValue(field: any): unknown {
  const value = field?.value;
  const options = Array.isArray(field?.options) ? field.options : null;

  if (!options) return value;

  const optionText = (optionId: unknown): unknown => {
    const match = options.find((opt: any) => opt?.id === optionId);
    return match ? (match.text ?? match.label ?? optionId) : optionId;
  };

  if (Array.isArray(value)) {
    return value.map(optionText);
  }
  if (value !== null && value !== undefined) {
    return optionText(value);
  }
  return value;
}

export function normalizeTallyResponse(payload: any): NormalizedTallyEvent | null {
  const data = payload?.data;
  if (!data) return null;

  const answers: Record<string, unknown> = {};
  for (const field of Array.isArray(data?.fields) ? data.fields : []) {
    const key = asString(field?.key) || asString(field?.label);
    if (!key) continue;
    answers[key] = resolveFieldValue(field);
  }

  return {
    eventId: asString(payload?.eventId) || randomUUID(),
    eventType: 'form_response',
    source: 'tally',
    userId: asString(data?.respondentId) || null,
    username: '',
    text: JSON.stringify(answers),
    timestamp: asString(payload?.createdAt) || new Date().toISOString(),
    formId: asString(data?.formId),
    formName: asString(data?.formName),
    responseId: asString(data?.responseId) || asString(data?.submissionId),
    answers,
    raw: payload,
  };
}

export function shouldAcceptTallyEvent(
  normalized: NormalizedTallyEvent,
  triggerConfig: TallyTriggerConfig,
): { accepted: true } | { accepted: false; reason: string } {
  const configuredFormId = asString(triggerConfig.formId);
  if (configuredFormId && configuredFormId !== normalized.formId) {
    return { accepted: false, reason: 'Ignored Tally response for a different form.' };
  }

  const query = asString(triggerConfig.query).toLowerCase();
  if (query && !normalized.text.toLowerCase().includes(query)) {
    return { accepted: false, reason: 'Ignored Tally response not matching the configured query filter.' };
  }

  return { accepted: true };
}

export function buildTallyExecutionInput(input: {
  workflowId: string;
  nodeId: string;
  normalized: NormalizedTallyEvent;
}): Record<string, unknown> {
  return {
    ...input.normalized,
    trigger: 'tally',
    workflow_id: input.workflowId,
    node_id: input.nodeId,
    sessionId: `tally_${input.workflowId}_${input.normalized.responseId}`,
    _tally: true,
  };
}

export async function validateTallyWebhookSecret(
  workflowId: string,
  nodeId: string,
  rawBody: Buffer,
  signatureHeader: string,
): Promise<boolean> {
  const state = await getWebhookState(workflowId, nodeId);
  if (!state) return false;
  return validateTallySignature(rawBody, signatureHeader, state.secret);
}

export async function registerTallyWebhook(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
  formId: string;
}): Promise<{ success: true; webhookUrl: string; formId: string; webhookId: string }> {
  const formId = asString(input.formId);
  if (!formId) {
    throw Object.assign(new Error('A Tally form ID is required.'), { statusCode: 400 });
  }
  const token = await resolveTallyToken(input.userId);
  const webhookUrl = getTallyWebhookUrl(input.workflowId, input.nodeId);

  const existing = await getWebhookState(input.workflowId, input.nodeId);
  const secret = existing?.secret || randomUUID();

  // If a webhook already exists for this node, remove it first so re-saving
  // the workflow doesn't leave duplicate Tally webhooks on the same form.
  if (existing?.webhookId) {
    await tallyApiFetch(token, `/webhooks/${encodeURIComponent(existing.webhookId)}`, { method: 'DELETE' }).catch((error) => {
      logger.warn('[Tally Trigger] Failed to remove previous webhook before re-registering (continuing):', error);
    });
  }

  const response = await tallyApiFetch(token, `/forms/${encodeURIComponent(formId)}/webhooks`, {
    method: 'POST',
    body: JSON.stringify({
      url: webhookUrl,
      eventTypes: ['FORM_RESPONSE'],
      signingSecret: secret,
    }),
  });

  const webhookId = asString(response?.id) || asString(response?.webhookId);
  // Prefer the secret Tally reports back, in case the API generates its own
  // rather than honoring the client-supplied value.
  const resolvedSecret = asString(response?.signingSecret) || secret;

  await setWebhookState({
    formId,
    webhookId,
    secret: resolvedSecret,
    userId: input.userId,
    workflowId: input.workflowId,
    nodeId: input.nodeId,
  });

  return { success: true, webhookUrl, formId, webhookId };
}

export async function unregisterTallyWebhook(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
}): Promise<{ success: true }> {
  const state = await getWebhookState(input.workflowId, input.nodeId);
  if (state?.webhookId) {
    const token = await resolveTallyToken(input.userId).catch(() => null);
    if (token) {
      await tallyApiFetch(token, `/webhooks/${encodeURIComponent(state.webhookId)}`, {
        method: 'DELETE',
      }).catch((error) => {
        logger.warn('[Tally Trigger] Webhook delete failed (continuing to clear local state):', error);
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

function nodeConfigOf(node: any): TallyTriggerConfig {
  return (node?.data?.config || node?.config || {}) as TallyTriggerConfig;
}

export async function autoRegisterTallyWebhooksForWorkflow(input: {
  userId: string;
  workflow: any;
}): Promise<TallyWebhookRegistrationStatus[]> {
  if (!input.workflow || input.workflow.status !== 'active') return [];
  const workflowId = asString(input.workflow.id);
  if (!workflowId) return [];
  const triggers = workflowNodes(input.workflow).filter((node) => nodeTypeOf(node) === 'tally_trigger');
  const results: TallyWebhookRegistrationStatus[] = [];

  for (const node of triggers) {
    const nodeId = asString(node?.id);
    if (!nodeId) continue;
    const triggerConfig = nodeConfigOf(node);
    const formId = asString(triggerConfig.formId);
    if (!formId) {
      results.push({ nodeId, success: false, error: 'Form ID is required (set it on the Tally Trigger node).' });
      continue;
    }
    try {
      const result = await registerTallyWebhook({ userId: input.userId, workflowId, nodeId, formId });
      results.push({ nodeId, success: true, webhookUrl: result.webhookUrl, formId: result.formId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[Tally Trigger] Auto webhook registration failed:', { workflowId, nodeId, error: message });
      results.push({ nodeId, success: false, error: message });
    }
  }

  return results;
}

export { getWebhookState as getTallyWebhookState };
