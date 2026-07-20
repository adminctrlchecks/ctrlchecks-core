import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { config } from '../../core/config';
import { logger } from '../../core/logger';
import { retrieveCredential } from '../../core/utils/credential-retriever';
import { getRedisClient } from '../../shared/redis-client';

/**
 * Stripe event webhook trigger.
 *
 * Auth model: reuses the existing `stripe_api_key` credential used by the
 * Stripe action node. Legacy `stripe` vault entries are accepted for older
 * saved connections.
 *
 * Webhook registration model: CtrlChecks creates one Stripe webhook endpoint
 * per active Stripe Trigger node and stores the endpoint id plus `whsec_...`
 * signing secret in Redis. Stripe only returns the signing secret when the
 * endpoint is created.
 *
 * Signature model: Stripe sends `Stripe-Signature`, which contains a timestamp
 * and one or more HMAC-SHA256 signatures over `${timestamp}.${rawBody}`. We
 * verify against the stored endpoint signing secret with Stripe's default
 * five-minute tolerance window.
 */

export type StripeTriggerConfig = {
  connectionId?: string;
  eventTypes?: string | string[];
  connect?: boolean;
  livemode?: boolean | string;
  customerId?: string;
  currency?: string;
  minAmount?: number | string;
  query?: string;
};

export type NormalizedStripeEvent = {
  eventId: string;
  eventType: string;
  source: 'stripe';
  userId: string | null;
  username: string | null;
  text: string;
  timestamp: string;
  livemode: boolean | null;
  apiVersion: string | null;
  accountId: string | null;
  objectId: string | null;
  objectType: string | null;
  customerId: string | null;
  customerEmail: string | null;
  amount: number | null;
  amountReceived: number | null;
  amountPaid: number | null;
  amountTotal: number | null;
  currency: string | null;
  status: string | null;
  paymentIntentId: string | null;
  chargeId: string | null;
  checkoutSessionId: string | null;
  invoiceId: string | null;
  subscriptionId: string | null;
  paymentMethodId: string | null;
  receiptUrl: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  raw: unknown;
};

export type StripeWebhookRegistrationStatus = {
  nodeId: string;
  success: boolean;
  webhookUrl?: string;
  endpointId?: string;
  enabledEvents?: string[];
  connect?: boolean;
  error?: string;
};

type StripeWebhookState = {
  endpointId: string;
  signingSecret: string;
  webhookUrl: string;
  enabledEvents: string[];
  connect: boolean;
  userId: string;
  workflowId: string;
  nodeId: string;
};

export type ResolvedStripeCredential = {
  secretKey: string;
  authHeader: string;
};

type StripeSignatureParts = {
  timestamp: number;
  signatures: string[];
};

const STRIPE_API_BASE = 'https://api.stripe.com/v1';
const STATE_TTL_SECONDS = 365 * 24 * 60 * 60;
const SIGNATURE_TOLERANCE_SECONDS = 300;
const DEFAULT_EVENT_TYPES = [
  'checkout.session.completed',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'invoice.payment_succeeded',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'charge.refunded',
];

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 'true';
}

function asNumber(value: unknown): number | null {
  const numberValue = typeof value === 'number' ? value : Number(asString(value));
  return Number.isFinite(numberValue) ? numberValue : null;
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
  return `stripe:webhook:${workflowId}:${nodeId}`;
}

async function getWebhookState(workflowId: string, nodeId: string): Promise<StripeWebhookState | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  const raw = await redis.get(stateKey(workflowId, nodeId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StripeWebhookState;
  } catch {
    return null;
  }
}

async function setWebhookState(state: StripeWebhookState): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.set(stateKey(state.workflowId, state.nodeId), JSON.stringify(state), 'EX', STATE_TTL_SECONDS);
}

async function deleteWebhookState(workflowId: string, nodeId: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.del(stateKey(workflowId, nodeId));
}

export function getStripeWebhookUrl(workflowId: string, nodeId: string): string {
  const baseUrl = String(config.publicBaseUrl || '').replace(/\/+$/, '');
  if (!baseUrl) throw new Error('PUBLIC_BASE_URL is required to register Stripe webhooks.');
  return `${baseUrl}/api/stripe/webhook/${encodeURIComponent(workflowId)}/${encodeURIComponent(nodeId)}`;
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

function normalizeSecretKey(value: string): string {
  return value.replace(/^Bearer\s+/i, '').trim();
}

export async function resolveStripeCredential(userId: string): Promise<ResolvedStripeCredential> {
  for (const key of ['stripe_api_key', 'stripe']) {
    const stored = await retrieveCredential({ userId }, key).catch(() => null);
    if (!stored) continue;
    const parsed = parseCredentialValue(stored);
    const secretKey = normalizeSecretKey(
      asString(parsed.token) ||
      asString(parsed.secretKey) ||
      asString(parsed.apiKey) ||
      asString(parsed.key) ||
      asString(parsed.value),
    );
    if (secretKey) return { secretKey, authHeader: `Bearer ${secretKey}` };
  }
  throw new Error('No active Stripe connection found. Save a Stripe Secret Key connection first.');
}

function eventTypesList(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value.map((item) => asString(item)).filter(Boolean);
  const str = asString(value);
  if (!str) return [];
  return str.split(',').map((item) => item.trim()).filter(Boolean);
}

function enabledEvents(value: string | string[] | undefined): string[] {
  const configured = eventTypesList(value);
  return configured.length ? configured : DEFAULT_EVENT_TYPES;
}

async function stripeApiFetch(credential: ResolvedStripeCredential, path: string, init?: RequestInit): Promise<any> {
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: credential.authHeader,
      ...(init?.headers || {}),
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
    const message = json?.error?.message || json?.message || text || response.statusText;
    throw Object.assign(new Error(`Stripe API error (${response.status}): ${message}`), { statusCode: response.status });
  }
  return json;
}

export function getStripeSignatureHeader(req: Request): string {
  return header(req, 'stripe-signature');
}

export function parseStripeSignatureHeader(signatureHeader: string): StripeSignatureParts | null {
  if (!signatureHeader) return null;
  const parts = signatureHeader.split(',').map((part) => part.trim()).filter(Boolean);
  const timestampPart = parts.find((part) => part.startsWith('t='));
  const timestamp = Number(timestampPart?.slice(2));
  const signatures = parts
    .filter((part) => part.startsWith('v1='))
    .map((part) => part.slice(3))
    .filter(Boolean);
  if (!Number.isFinite(timestamp) || timestamp <= 0 || signatures.length === 0) return null;
  return { timestamp, signatures };
}

export function validateStripeSignature(
  rawBody: Buffer,
  signatureHeader: string,
  signingSecret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!rawBody?.length || !signatureHeader || !signingSecret) return false;
  const parts = parseStripeSignatureHeader(signatureHeader);
  if (!parts) return false;
  if (Math.abs(nowSeconds - parts.timestamp) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const computed = createHmac('sha256', signingSecret)
    .update(`${parts.timestamp}.`)
    .update(rawBody)
    .digest();
  return parts.signatures.some((signature) => timingEqualHex(signature, computed));
}

export async function validateStripeWebhookSecret(input: {
  workflowId: string;
  nodeId: string;
  rawBody: Buffer;
  signatureHeader: string;
}): Promise<boolean> {
  const state = await getWebhookState(input.workflowId, input.nodeId);
  if (!state) return false;
  return validateStripeSignature(input.rawBody, input.signatureHeader, state.signingSecret);
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const str = asString(value);
    if (str) return str;
  }
  return '';
}

function objectId(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return asString((value as any).id);
  return '';
}

function objectMetadata(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function eventTimestamp(payload: any): string {
  const created = Number(payload?.created);
  return Number.isFinite(created) && created > 0
    ? new Date(created * 1000).toISOString()
    : new Date().toISOString();
}

function normalizedAmount(dataObject: any): number | null {
  return asNumber(
    dataObject?.amount ??
    dataObject?.amount_received ??
    dataObject?.amount_paid ??
    dataObject?.amount_total ??
    dataObject?.total,
  );
}

export function normalizeStripeEvent(payload: any): NormalizedStripeEvent | null {
  const eventType = asString(payload?.type);
  const dataObject = payload?.data?.object || {};
  const objectType = firstText(dataObject?.object);
  if (!eventType || !objectType) return null;

  const objectIdValue = firstText(dataObject?.id);
  const customerId = firstText(objectId(dataObject?.customer), dataObject?.customer_id) || null;
  const customerEmail = firstText(dataObject?.customer_email, dataObject?.receipt_email, dataObject?.email, dataObject?.billing_details?.email) || null;
  const paymentIntentId = firstText(objectType === 'payment_intent' ? dataObject?.id : undefined, objectId(dataObject?.payment_intent), dataObject?.payment_intent_id) || null;
  const chargeId = firstText(objectType === 'charge' ? dataObject?.id : undefined, objectId(dataObject?.charge), dataObject?.latest_charge) || null;
  const invoiceId = firstText(objectType === 'invoice' ? dataObject?.id : undefined, objectId(dataObject?.invoice)) || null;
  const subscriptionId = firstText(objectType === 'subscription' ? dataObject?.id : undefined, objectId(dataObject?.subscription)) || null;
  const checkoutSessionId = objectType === 'checkout.session' ? objectIdValue : null;
  const amount = normalizedAmount(dataObject);
  const currency = firstText(dataObject?.currency).toLowerCase() || null;
  const status = firstText(dataObject?.status, dataObject?.payment_status) || null;
  const description = firstText(dataObject?.description, dataObject?.statement_descriptor) || null;
  const metadata = objectMetadata(dataObject?.metadata);
  const text = firstText(
    dataObject?.description,
    customerEmail,
    objectIdValue,
    status ? `${eventType} ${status}` : eventType,
  );

  return {
    eventId: firstText(payload?.id) || randomUUID(),
    eventType,
    source: 'stripe',
    userId: customerId,
    username: customerEmail,
    text,
    timestamp: eventTimestamp(payload),
    livemode: typeof payload?.livemode === 'boolean' ? payload.livemode : null,
    apiVersion: firstText(payload?.api_version) || null,
    accountId: firstText(payload?.account) || null,
    objectId: objectIdValue || null,
    objectType,
    customerId,
    customerEmail,
    amount,
    amountReceived: asNumber(dataObject?.amount_received),
    amountPaid: asNumber(dataObject?.amount_paid),
    amountTotal: asNumber(dataObject?.amount_total),
    currency,
    status,
    paymentIntentId,
    chargeId,
    checkoutSessionId,
    invoiceId,
    subscriptionId,
    paymentMethodId: firstText(objectId(dataObject?.payment_method), dataObject?.payment_method_id) || null,
    receiptUrl: firstText(dataObject?.receipt_url, dataObject?.hosted_invoice_url, dataObject?.url) || null,
    description,
    metadata,
    raw: payload,
  };
}

export function shouldAcceptStripeEvent(
  normalized: NormalizedStripeEvent,
  triggerConfig: StripeTriggerConfig,
): { accepted: true } | { accepted: false; reason: string } {
  const configuredEventTypes = eventTypesList(triggerConfig.eventTypes).map((item) => item.toLowerCase());
  if (configuredEventTypes.length) {
    const eventType = normalized.eventType.toLowerCase();
    const objectType = firstText(normalized.objectType).toLowerCase();
    if (!configuredEventTypes.includes('*') && !configuredEventTypes.includes(eventType) && !configuredEventTypes.includes(objectType)) {
      return { accepted: false, reason: `Ignored Stripe event type "${normalized.eventType}" not in the configured event types.` };
    }
  }

  if (triggerConfig.livemode !== undefined && triggerConfig.livemode !== '') {
    const liveFilter = asBoolean(triggerConfig.livemode);
    if (normalized.livemode !== null && normalized.livemode !== liveFilter) {
      return { accepted: false, reason: `Ignored Stripe event livemode=${normalized.livemode}; trigger expects ${liveFilter}.` };
    }
  }

  const customerId = asString(triggerConfig.customerId);
  if (customerId && normalized.customerId && normalized.customerId !== customerId) {
    return { accepted: false, reason: `Ignored Stripe event for customer "${normalized.customerId}", trigger is scoped to "${customerId}".` };
  }

  const currency = asString(triggerConfig.currency).toLowerCase();
  if (currency && normalized.currency && normalized.currency !== currency) {
    return { accepted: false, reason: `Ignored Stripe event currency "${normalized.currency}", trigger is scoped to "${currency}".` };
  }

  const minAmount = asNumber(triggerConfig.minAmount);
  if (minAmount !== null && normalized.amount !== null && normalized.amount < minAmount) {
    return { accepted: false, reason: `Ignored Stripe event amount ${normalized.amount}, below configured minimum ${minAmount}.` };
  }

  const query = asString(triggerConfig.query).toLowerCase();
  if (query) {
    const haystack = [
      normalized.text,
      normalized.customerEmail,
      normalized.customerId,
      normalized.objectId,
      normalized.status,
      normalized.description,
    ].map((value) => asString(value).toLowerCase()).join(' ');
    if (!haystack.includes(query)) {
      return { accepted: false, reason: 'Ignored Stripe event not matching the configured query filter.' };
    }
  }

  return { accepted: true };
}

export function buildStripeExecutionInput(input: {
  workflowId: string;
  nodeId: string;
  normalized: NormalizedStripeEvent;
}): Record<string, unknown> {
  return {
    ...input.normalized,
    trigger: 'stripe',
    workflow_id: input.workflowId,
    node_id: input.nodeId,
    sessionId: `stripe_${input.workflowId}_${input.normalized.eventId}`,
    _stripe: true,
  };
}

export async function registerStripeWebhook(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
  eventTypes?: string | string[];
  connect?: boolean;
}): Promise<{ success: true; webhookUrl: string; endpointId: string; signingSecret: string; enabledEvents: string[]; connect: boolean }> {
  const credential = await resolveStripeCredential(input.userId);
  const webhookUrl = getStripeWebhookUrl(input.workflowId, input.nodeId);
  const selectedEvents = enabledEvents(input.eventTypes);
  const connect = asBoolean(input.connect);

  const existing = await getWebhookState(input.workflowId, input.nodeId);
  if (existing?.endpointId) {
    await unregisterStripeWebhook({
      userId: input.userId,
      workflowId: input.workflowId,
      nodeId: input.nodeId,
    }).catch((error) => {
      logger.warn('[Stripe Trigger] Failed to remove previous webhook before re-registering (continuing):', error);
    });
  }

  const body = new URLSearchParams();
  body.set('url', webhookUrl);
  body.set('description', `CtrlChecks workflow ${input.workflowId} node ${input.nodeId}`);
  for (const eventType of selectedEvents) {
    body.append('enabled_events[]', eventType);
  }
  if (connect) body.set('connect', 'true');

  const endpoint = await stripeApiFetch(credential, '/webhook_endpoints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const endpointId = firstText(endpoint?.id);
  const signingSecret = firstText(endpoint?.secret);
  if (!endpointId || !signingSecret) {
    throw new Error('Stripe webhook endpoint creation did not return an endpoint id and signing secret.');
  }

  await setWebhookState({
    endpointId,
    signingSecret,
    webhookUrl,
    enabledEvents: selectedEvents,
    connect,
    userId: input.userId,
    workflowId: input.workflowId,
    nodeId: input.nodeId,
  });

  return { success: true, webhookUrl, endpointId, signingSecret, enabledEvents: selectedEvents, connect };
}

export async function unregisterStripeWebhook(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
}): Promise<{ success: true }> {
  const state = await getWebhookState(input.workflowId, input.nodeId);
  if (state?.endpointId) {
    const credential = await resolveStripeCredential(input.userId).catch(() => null);
    if (credential) {
      await stripeApiFetch(credential, `/webhook_endpoints/${encodeURIComponent(state.endpointId)}`, { method: 'DELETE' }).catch((error) => {
        logger.warn('[Stripe Trigger] Webhook delete failed (continuing to clear local state):', error);
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

function nodeConfigOf(node: any): StripeTriggerConfig {
  return (node?.data?.config || node?.config || {}) as StripeTriggerConfig;
}

export async function autoRegisterStripeWebhooksForWorkflow(input: {
  userId: string;
  workflow: any;
}): Promise<StripeWebhookRegistrationStatus[]> {
  if (!input.workflow || input.workflow.status !== 'active') return [];
  const workflowId = asString(input.workflow.id);
  if (!workflowId) return [];
  const triggers = workflowNodes(input.workflow).filter((node) => nodeTypeOf(node) === 'stripe_trigger');
  const results: StripeWebhookRegistrationStatus[] = [];

  for (const node of triggers) {
    const nodeId = asString(node?.id);
    if (!nodeId) continue;
    const triggerConfig = nodeConfigOf(node);
    try {
      const result = await registerStripeWebhook({
        userId: input.userId,
        workflowId,
        nodeId,
        eventTypes: triggerConfig.eventTypes,
        connect: triggerConfig.connect,
      });
      results.push({
        nodeId,
        success: true,
        webhookUrl: result.webhookUrl,
        endpointId: result.endpointId,
        enabledEvents: result.enabledEvents,
        connect: result.connect,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[Stripe Trigger] Auto webhook registration failed:', { workflowId, nodeId, error: message });
      results.push({ nodeId, success: false, error: message });
    }
  }

  return results;
}

export { getWebhookState as getStripeWebhookState };
