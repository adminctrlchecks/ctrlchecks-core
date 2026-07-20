import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { config } from '../../core/config';
import { logger } from '../../core/logger';
import { retrieveCredential } from '../../core/utils/credential-retriever';
import { getRedisClient } from '../../shared/redis-client';

/**
 * Shopify event webhook trigger.
 *
 * Auth model: reuses the existing `shopify_api_key` credential used by the
 * Shopify action node. Legacy `shopify` vault entries are accepted for older
 * saved connections.
 *
 * Registration model: CtrlChecks creates one shop-scoped Admin API webhook for
 * each configured topic and stores webhook IDs plus the app/client secret in
 * Redis. Shopify signs each delivery with X-Shopify-Hmac-Sha256 over the raw
 * request body using that app/client secret.
 */

export type ShopifyTriggerConfig = {
  connectionId?: string;
  shopDomain?: string;
  topics?: string | string[];
  eventTypes?: string | string[];
  financialStatus?: string;
  fulfillmentStatus?: string;
  customerId?: string;
  productId?: string;
  minTotalPrice?: number | string;
  currency?: string;
  query?: string;
};

export type NormalizedShopifyEvent = {
  eventId: string;
  eventType: string;
  source: 'shopify';
  userId: string | null;
  username: string | null;
  text: string;
  timestamp: string;
  topic: string;
  shopDomain: string | null;
  webhookId: string | null;
  apiVersion: string | null;
  objectId: string | null;
  adminGraphqlApiId: string | null;
  orderId: string | null;
  orderName: string | null;
  orderNumber: string | null;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  totalPrice: number | null;
  subtotalPrice: number | null;
  totalTax: number | null;
  currency: string | null;
  customerId: string | null;
  customerEmail: string | null;
  customerName: string | null;
  productId: string | null;
  productTitle: string | null;
  variantId: string | null;
  inventoryItemId: string | null;
  checkoutId: string | null;
  cartToken: string | null;
  refundId: string | null;
  lineItems: unknown[] | null;
  raw: unknown;
};

export type ShopifyWebhookRegistrationStatus = {
  nodeId: string;
  success: boolean;
  webhookUrl?: string;
  webhookIds?: string[];
  topics?: string[];
  shopDomain?: string;
  apiVersion?: string;
  error?: string;
};

type ShopifyWebhookState = {
  webhookIds: string[];
  topics: string[];
  webhookSecret: string;
  webhookUrl: string;
  shopDomain: string;
  apiVersion: string;
  userId: string;
  workflowId: string;
  nodeId: string;
};

export type ResolvedShopifyCredential = {
  shopDomain: string;
  adminAccessToken: string;
  webhookSecret: string;
  apiVersion: string;
};

const STATE_TTL_SECONDS = 365 * 24 * 60 * 60;
const DEFAULT_API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-10';
const DEFAULT_TOPICS = [
  'orders/create',
  'orders/paid',
  'orders/updated',
  'orders/cancelled',
  'orders/fulfilled',
  'customers/create',
  'customers/update',
  'products/create',
  'products/update',
  'products/delete',
  'refunds/create',
  'checkouts/create',
  'checkouts/update',
  'app/uninstalled',
];

function asString(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown): number | null {
  const numberValue = typeof value === 'number' ? value : Number(asString(value));
  return Number.isFinite(numberValue) ? numberValue : null;
}

function headerValue(value: unknown): string {
  if (Array.isArray(value)) return asString(value[0]);
  return asString(value);
}

function header(req: Request, name: string): string {
  return headerValue(req.headers[name.toLowerCase()]);
}

function stateKey(workflowId: string, nodeId: string): string {
  return `shopify:webhook:${workflowId}:${nodeId}`;
}

async function getWebhookState(workflowId: string, nodeId: string): Promise<ShopifyWebhookState | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  const raw = await redis.get(stateKey(workflowId, nodeId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ShopifyWebhookState;
  } catch {
    return null;
  }
}

async function setWebhookState(state: ShopifyWebhookState): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.set(stateKey(state.workflowId, state.nodeId), JSON.stringify(state), 'EX', STATE_TTL_SECONDS);
}

async function deleteWebhookState(workflowId: string, nodeId: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.del(stateKey(workflowId, nodeId));
}

export function getShopifyWebhookUrl(workflowId: string, nodeId: string): string {
  const baseUrl = String(config.publicBaseUrl || '').replace(/\/+$/, '');
  if (!baseUrl) throw new Error('PUBLIC_BASE_URL is required to register Shopify webhooks.');
  return `${baseUrl}/api/shopify/webhook/${encodeURIComponent(workflowId)}/${encodeURIComponent(nodeId)}`;
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

export function normalizeShopifyShopDomain(value: unknown): string {
  const raw = asString(value)
    .replace(/^https?:\/\//i, '')
    .replace(/^admin\.shopify\.com\/store\//i, '')
    .replace(/\/admin.*$/i, '')
    .replace(/\/+$/g, '')
    .toLowerCase();
  if (!raw) return '';
  return raw.includes('.') ? raw : `${raw}.myshopify.com`;
}

function normalizeToken(value: unknown): string {
  return asString(value).replace(/^Bearer\s+/i, '');
}

function resolveWebhookSecret(parsed: Record<string, any>): string {
  return asString(parsed.webhookSecret) ||
    asString(parsed.clientSecret) ||
    asString(parsed.client_secret) ||
    asString(parsed.sharedSecret) ||
    asString(parsed.signingSecret) ||
    asString(parsed.secret) ||
    asString(process.env.SHOPIFY_CLIENT_SECRET) ||
    asString(process.env.SHOPIFY_WEBHOOK_SECRET);
}

export async function resolveShopifyCredential(
  userId: string,
  triggerConfig: ShopifyTriggerConfig = {},
): Promise<ResolvedShopifyCredential> {
  let lastShopDomain = normalizeShopifyShopDomain(triggerConfig.shopDomain);
  for (const key of ['shopify_api_key', 'shopify_oauth2', 'shopify']) {
    const stored = await retrieveCredential({ userId }, key).catch(() => null);
    if (!stored) continue;
    const parsed = parseCredentialValue(stored);
    const shopDomain = normalizeShopifyShopDomain(
      triggerConfig.shopDomain ||
      parsed.storeUrl ||
      parsed.shopDomain ||
      parsed.shop ||
      parsed.domain,
    );
    lastShopDomain = shopDomain || lastShopDomain;
    const adminAccessToken = normalizeToken(
      parsed.token ||
      parsed.apiKey ||
      parsed.accessToken ||
      parsed.access_token ||
      parsed.value,
    );
    const webhookSecret = resolveWebhookSecret(parsed);
    if (shopDomain && adminAccessToken && webhookSecret) {
      return {
        shopDomain,
        adminAccessToken,
        webhookSecret,
        apiVersion: asString(parsed.apiVersion) || DEFAULT_API_VERSION,
      };
    }
  }

  if (!lastShopDomain) {
    throw new Error('No Shopify shop domain found. Save a Shopify Admin API connection with Store URL first.');
  }
  throw new Error('No complete Shopify Trigger connection found. Save a Shopify Admin API connection with Admin API token and app client secret/webhook signing secret.');
}

function configuredList(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value.map((item) => asString(item)).filter(Boolean);
  const str = asString(value);
  if (!str) return [];
  return str.split(',').map((item) => item.trim()).filter(Boolean);
}

function normalizeTopic(topic: string): string {
  return asString(topic).toLowerCase().replace(/_/g, '/');
}

function selectedTopics(config: ShopifyTriggerConfig = {}): string[] {
  const configured = configuredList(config.topics || config.eventTypes).map(normalizeTopic).filter(Boolean);
  const unique = Array.from(new Set(configured.length ? configured : DEFAULT_TOPICS));
  return unique;
}

async function shopifyApiFetch(
  credential: ResolvedShopifyCredential,
  path: string,
  init?: RequestInit,
): Promise<any> {
  const response = await fetch(`https://${credential.shopDomain}/admin/api/${credential.apiVersion}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': credential.adminAccessToken,
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
    const message = json?.errors || json?.error || json?.message || text || response.statusText;
    throw Object.assign(new Error(`Shopify API error (${response.status}): ${typeof message === 'string' ? message : JSON.stringify(message)}`), { statusCode: response.status });
  }
  return json;
}

export function getShopifyHmacHeader(req: Request): string {
  return header(req, 'x-shopify-hmac-sha256');
}

export function getShopifyDeliveryHeaders(req: Request): Record<string, string> {
  return {
    topic: header(req, 'x-shopify-topic'),
    shopDomain: header(req, 'x-shopify-shop-domain'),
    webhookId: header(req, 'x-shopify-webhook-id'),
    triggeredAt: header(req, 'x-shopify-triggered-at'),
    apiVersion: header(req, 'x-shopify-api-version'),
  };
}

export function validateShopifyHmac(rawBody: Buffer, hmacHeader: string, webhookSecret: string): boolean {
  if (!rawBody?.length || !hmacHeader || !webhookSecret) return false;
  let received: Buffer;
  try {
    received = Buffer.from(hmacHeader, 'base64');
  } catch {
    return false;
  }
  const computed = createHmac('sha256', webhookSecret).update(rawBody).digest();
  return received.length === computed.length && timingSafeEqual(received, computed);
}

export async function validateShopifyWebhookSecret(input: {
  workflowId: string;
  nodeId: string;
  rawBody: Buffer;
  hmacHeader: string;
  topic?: string;
  shopDomain?: string;
}): Promise<boolean> {
  const state = await getWebhookState(input.workflowId, input.nodeId);
  if (!state) return false;
  const topic = normalizeTopic(input.topic || '');
  if (topic && !state.topics.includes(topic)) return false;
  const shopDomain = normalizeShopifyShopDomain(input.shopDomain);
  if (shopDomain && shopDomain !== state.shopDomain) return false;
  return validateShopifyHmac(input.rawBody, input.hmacHeader, state.webhookSecret);
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const str = asString(value);
    if (str) return str;
  }
  return '';
}

function idText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (value && typeof value === 'object') return firstText((value as any).id, (value as any).admin_graphql_api_id);
  return '';
}

function customerName(customer: any): string {
  return firstText(
    customer?.name,
    [customer?.first_name, customer?.last_name].map(asString).filter(Boolean).join(' '),
    customer?.email,
  );
}

function timestamp(payload: any, headers: Record<string, string>): string {
  return firstText(headers.triggeredAt, payload?.updated_at, payload?.created_at, payload?.processed_at, payload?.closed_at) || new Date().toISOString();
}

export function normalizeShopifyEvent(
  payload: any,
  headers: Record<string, string | string[] | undefined> = {},
): NormalizedShopifyEvent | null {
  const topic = normalizeTopic(headerValue(headers.topic) || headerValue(headers['x-shopify-topic']));
  if (!topic) return null;

  const shopDomain = normalizeShopifyShopDomain(headerValue(headers.shopDomain) || headerValue(headers['x-shopify-shop-domain'])) || null;
  const webhookId = firstText(headers.webhookId, headers['x-shopify-webhook-id']) || null;
  const apiVersion = firstText(headers.apiVersion, headers['x-shopify-api-version']) || null;
  const customer = payload?.customer || {};
  const firstLineItem = Array.isArray(payload?.line_items) ? payload.line_items[0] : null;
  const orderId = topic.startsWith('orders/') ? idText(payload?.id) : null;
  const productId = topic.startsWith('products/') ? idText(payload?.id) : firstText(firstLineItem?.product_id) || null;
  const refundId = topic.startsWith('refunds/') ? idText(payload?.id) : null;
  const checkoutId = topic.startsWith('checkouts/') ? idText(payload?.id) : null;
  const customerId = firstText(
    topic.startsWith('customers/') ? payload?.id : undefined,
    customer?.id,
    payload?.customer_id,
  ) || null;
  const customerEmail = firstText(payload?.email, customer?.email, payload?.contact_email) || null;
  const customerDisplayName = customerName(topic.startsWith('customers/') ? payload : customer) || null;
  const objectId = firstText(orderId, productId, refundId, checkoutId, customerId, payload?.id) || randomUUID();
  const text = firstText(
    payload?.name,
    payload?.title,
    customerDisplayName,
    customerEmail,
    payload?.admin_graphql_api_id,
    `${topic} ${objectId}`,
  );

  return {
    eventId: webhookId || firstText(payload?.admin_graphql_api_id, payload?.id) || randomUUID(),
    eventType: topic.replace(/\//g, '_'),
    source: 'shopify',
    userId: customerId,
    username: customerEmail || customerDisplayName,
    text,
    timestamp: timestamp(payload, {
      triggeredAt: headerValue(headers.triggeredAt) || headerValue(headers['x-shopify-triggered-at']),
    }),
    topic,
    shopDomain,
    webhookId,
    apiVersion,
    objectId,
    adminGraphqlApiId: firstText(payload?.admin_graphql_api_id) || null,
    orderId,
    orderName: firstText(payload?.name) || null,
    orderNumber: firstText(payload?.order_number, payload?.number) || null,
    financialStatus: firstText(payload?.financial_status) || null,
    fulfillmentStatus: firstText(payload?.fulfillment_status) || null,
    totalPrice: asNumber(payload?.total_price),
    subtotalPrice: asNumber(payload?.subtotal_price),
    totalTax: asNumber(payload?.total_tax),
    currency: firstText(payload?.currency, payload?.presentment_currency).toLowerCase() || null,
    customerId,
    customerEmail,
    customerName: customerDisplayName,
    productId,
    productTitle: firstText(payload?.title, firstLineItem?.title, firstLineItem?.name) || null,
    variantId: firstText(payload?.variant_id, firstLineItem?.variant_id) || null,
    inventoryItemId: firstText(payload?.inventory_item_id) || null,
    checkoutId,
    cartToken: firstText(payload?.cart_token) || null,
    refundId,
    lineItems: Array.isArray(payload?.line_items) ? payload.line_items : null,
    raw: payload,
  };
}

export function shouldAcceptShopifyEvent(
  normalized: NormalizedShopifyEvent,
  triggerConfig: ShopifyTriggerConfig,
): { accepted: true } | { accepted: false; reason: string } {
  const configuredTopics = configuredList(triggerConfig.topics || triggerConfig.eventTypes).map(normalizeTopic);
  if (configuredTopics.length) {
    const eventTypeAsTopic = normalizeTopic(normalized.eventType);
    if (!configuredTopics.includes('*') && !configuredTopics.includes(normalized.topic) && !configuredTopics.includes(eventTypeAsTopic)) {
      return { accepted: false, reason: `Ignored Shopify topic "${normalized.topic}" not in the configured topics.` };
    }
  }

  const shopDomain = normalizeShopifyShopDomain(triggerConfig.shopDomain);
  if (shopDomain && normalized.shopDomain && normalized.shopDomain !== shopDomain) {
    return { accepted: false, reason: `Ignored Shopify shop "${normalized.shopDomain}", trigger is scoped to "${shopDomain}".` };
  }

  const financialStatus = asString(triggerConfig.financialStatus).toLowerCase();
  if (financialStatus && normalized.financialStatus && normalized.financialStatus.toLowerCase() !== financialStatus) {
    return { accepted: false, reason: `Ignored Shopify financial status "${normalized.financialStatus}".` };
  }

  const fulfillmentStatus = asString(triggerConfig.fulfillmentStatus).toLowerCase();
  if (fulfillmentStatus && normalized.fulfillmentStatus && normalized.fulfillmentStatus.toLowerCase() !== fulfillmentStatus) {
    return { accepted: false, reason: `Ignored Shopify fulfillment status "${normalized.fulfillmentStatus}".` };
  }

  const customerId = asString(triggerConfig.customerId);
  if (customerId && normalized.customerId && normalized.customerId !== customerId) {
    return { accepted: false, reason: `Ignored Shopify customer "${normalized.customerId}".` };
  }

  const productId = asString(triggerConfig.productId);
  if (productId && normalized.productId && normalized.productId !== productId) {
    return { accepted: false, reason: `Ignored Shopify product "${normalized.productId}".` };
  }

  const currency = asString(triggerConfig.currency).toLowerCase();
  if (currency && normalized.currency && normalized.currency !== currency) {
    return { accepted: false, reason: `Ignored Shopify currency "${normalized.currency}".` };
  }

  const minTotalPrice = asNumber(triggerConfig.minTotalPrice);
  if (minTotalPrice !== null && normalized.totalPrice !== null && normalized.totalPrice < minTotalPrice) {
    return { accepted: false, reason: `Ignored Shopify total ${normalized.totalPrice}, below configured minimum ${minTotalPrice}.` };
  }

  const query = asString(triggerConfig.query).toLowerCase();
  if (query) {
    const haystack = [
      normalized.text,
      normalized.orderName,
      normalized.customerEmail,
      normalized.customerName,
      normalized.productTitle,
      normalized.objectId,
      normalized.financialStatus,
      normalized.fulfillmentStatus,
    ].map((value) => asString(value).toLowerCase()).join(' ');
    if (!haystack.includes(query)) {
      return { accepted: false, reason: 'Ignored Shopify event not matching the configured query filter.' };
    }
  }

  return { accepted: true };
}

export function buildShopifyExecutionInput(input: {
  workflowId: string;
  nodeId: string;
  normalized: NormalizedShopifyEvent;
}): Record<string, unknown> {
  return {
    ...input.normalized,
    trigger: 'shopify',
    workflow_id: input.workflowId,
    node_id: input.nodeId,
    sessionId: `shopify_${input.workflowId}_${input.normalized.eventId}`,
    _shopify: true,
  };
}

export async function registerShopifyWebhooks(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
  triggerConfig?: ShopifyTriggerConfig;
}): Promise<{ success: true; webhookUrl: string; webhookIds: string[]; topics: string[]; shopDomain: string; apiVersion: string }> {
  const triggerConfig = input.triggerConfig || {};
  const credential = await resolveShopifyCredential(input.userId, triggerConfig);
  const webhookUrl = getShopifyWebhookUrl(input.workflowId, input.nodeId);
  const topics = selectedTopics(triggerConfig);

  const existing = await getWebhookState(input.workflowId, input.nodeId);
  if (existing?.webhookIds?.length) {
    await unregisterShopifyWebhooks({
      userId: input.userId,
      workflowId: input.workflowId,
      nodeId: input.nodeId,
    }).catch((error) => {
      logger.warn('[Shopify Trigger] Failed to remove previous webhooks before re-registering (continuing):', error);
    });
  }

  const webhookIds: string[] = [];
  for (const topic of topics) {
    const response = await shopifyApiFetch(credential, '/webhooks.json', {
      method: 'POST',
      body: JSON.stringify({
        webhook: {
          topic,
          address: webhookUrl,
          format: 'json',
        },
      }),
    });
    const webhookId = firstText(response?.webhook?.id, response?.id);
    if (!webhookId) {
      throw new Error(`Shopify webhook creation for topic "${topic}" did not return a webhook id.`);
    }
    webhookIds.push(webhookId);
  }

  await setWebhookState({
    webhookIds,
    topics,
    webhookSecret: credential.webhookSecret,
    webhookUrl,
    shopDomain: credential.shopDomain,
    apiVersion: credential.apiVersion,
    userId: input.userId,
    workflowId: input.workflowId,
    nodeId: input.nodeId,
  });

  return { success: true, webhookUrl, webhookIds, topics, shopDomain: credential.shopDomain, apiVersion: credential.apiVersion };
}

export async function unregisterShopifyWebhooks(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
}): Promise<{ success: true }> {
  const state = await getWebhookState(input.workflowId, input.nodeId);
  if (state?.webhookIds?.length) {
    const credential = await resolveShopifyCredential(input.userId, { shopDomain: state.shopDomain }).catch(() => null);
    if (credential) {
      for (const webhookId of state.webhookIds) {
        await shopifyApiFetch(credential, `/webhooks/${encodeURIComponent(webhookId)}.json`, { method: 'DELETE' }).catch((error) => {
          logger.warn('[Shopify Trigger] Webhook delete failed (continuing to clear local state):', { webhookId, error });
        });
      }
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

function nodeConfigOf(node: any): ShopifyTriggerConfig {
  return (node?.data?.config || node?.config || {}) as ShopifyTriggerConfig;
}

export async function autoRegisterShopifyWebhooksForWorkflow(input: {
  userId: string;
  workflow: any;
}): Promise<ShopifyWebhookRegistrationStatus[]> {
  if (!input.workflow || input.workflow.status !== 'active') return [];
  const workflowId = asString(input.workflow.id);
  if (!workflowId) return [];
  const triggers = workflowNodes(input.workflow).filter((node) => nodeTypeOf(node) === 'shopify_trigger');
  const results: ShopifyWebhookRegistrationStatus[] = [];

  for (const node of triggers) {
    const nodeId = asString(node?.id);
    if (!nodeId) continue;
    try {
      const result = await registerShopifyWebhooks({
        userId: input.userId,
        workflowId,
        nodeId,
        triggerConfig: nodeConfigOf(node),
      });
      results.push({
        nodeId,
        success: true,
        webhookUrl: result.webhookUrl,
        webhookIds: result.webhookIds,
        topics: result.topics,
        shopDomain: result.shopDomain,
        apiVersion: result.apiVersion,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[Shopify Trigger] Auto webhook registration failed:', { workflowId, nodeId, error: message });
      results.push({ nodeId, success: false, error: message });
    }
  }

  return results;
}

export { getWebhookState as getShopifyWebhookState };
