import { createHmac } from 'crypto';
import { config } from '../../core/config';
import { retrieveCredential } from '../../core/utils/credential-retriever';
import { getRedisClient } from '../../shared/redis-client';
import {
  autoRegisterShopifyWebhooksForWorkflow,
  buildShopifyExecutionInput,
  normalizeShopifyEvent,
  normalizeShopifyShopDomain,
  registerShopifyWebhooks,
  resolveShopifyCredential,
  shouldAcceptShopifyEvent,
  unregisterShopifyWebhooks,
  validateShopifyHmac,
  validateShopifyWebhookSecret,
} from './shopify-trigger-service';

jest.mock('../../core/utils/credential-retriever', () => ({
  retrieveCredential: jest.fn(),
}));

jest.mock('../../shared/redis-client', () => ({
  getRedisClient: jest.fn(),
}));

function makeFakeRedis() {
  const store = new Map<string, string>();
  return {
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    set: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
      return 'OK';
    }),
    del: jest.fn(async (key: string) => {
      store.delete(key);
      return 1;
    }),
  };
}

const orderPayload = {
  id: 450789469,
  admin_graphql_api_id: 'gid://shopify/Order/450789469',
  name: '#1001',
  order_number: 1001,
  email: 'buyer@example.com',
  financial_status: 'paid',
  fulfillment_status: 'fulfilled',
  total_price: '125.50',
  subtotal_price: '100.00',
  total_tax: '25.50',
  currency: 'USD',
  created_at: '2026-07-18T07:00:00Z',
  customer: {
    id: 207119551,
    email: 'buyer@example.com',
    first_name: 'Ada',
    last_name: 'Lovelace',
  },
  line_items: [
    { id: 1, product_id: 632910392, variant_id: 808950810, title: 'T-Shirt', quantity: 2 },
  ],
};

function shopifyHmac(rawBody: Buffer, secret: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('base64');
}

describe('shopify-trigger-service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    delete process.env.SHOPIFY_CLIENT_SECRET;
    delete process.env.SHOPIFY_WEBHOOK_SECRET;
    (global as any).fetch = jest.fn();
    config.publicBaseUrl = 'https://ctrlchecks.example';
  });

  it('normalizes shop domains from admin URLs, bare shop names, and myshopify domains', () => {
    expect(normalizeShopifyShopDomain('https://demo.myshopify.com/admin')).toBe('demo.myshopify.com');
    expect(normalizeShopifyShopDomain('demo')).toBe('demo.myshopify.com');
    expect(normalizeShopifyShopDomain('admin.shopify.com/store/demo')).toBe('demo.myshopify.com');
  });

  it('returns null when the Shopify topic header is missing', () => {
    expect(normalizeShopifyEvent(orderPayload, {})).toBeNull();
  });

  it('normalizes order webhook payloads with customer, totals, statuses, and line item fields', () => {
    const normalized = normalizeShopifyEvent(orderPayload, {
      topic: 'orders/paid',
      shopDomain: 'demo.myshopify.com',
      webhookId: 'wh_123',
      apiVersion: '2025-10',
      triggeredAt: '2026-07-18T07:01:00Z',
    });
    expect(normalized).toMatchObject({
      eventId: 'wh_123',
      eventType: 'orders_paid',
      source: 'shopify',
      topic: 'orders/paid',
      shopDomain: 'demo.myshopify.com',
      orderId: '450789469',
      orderName: '#1001',
      orderNumber: '1001',
      financialStatus: 'paid',
      fulfillmentStatus: 'fulfilled',
      totalPrice: 125.5,
      subtotalPrice: 100,
      totalTax: 25.5,
      currency: 'usd',
      customerId: '207119551',
      customerEmail: 'buyer@example.com',
      customerName: 'Ada Lovelace',
      productId: '632910392',
      productTitle: 'T-Shirt',
      variantId: '808950810',
      username: 'buyer@example.com',
      text: '#1001',
    });
    expect(normalized?.lineItems).toHaveLength(1);
  });

  it('normalizes product, customer, checkout, and refund identifiers', () => {
    expect(normalizeShopifyEvent({ id: 11, title: 'Hat', admin_graphql_api_id: 'gid://shopify/Product/11' }, { topic: 'products/update' }))
      .toMatchObject({ eventType: 'products_update', productId: '11', productTitle: 'Hat' });
    expect(normalizeShopifyEvent({ id: 22, email: 'new@example.com', first_name: 'New', last_name: 'Buyer' }, { topic: 'customers/create' }))
      .toMatchObject({ customerId: '22', customerEmail: 'new@example.com', customerName: 'New Buyer' });
    expect(normalizeShopifyEvent({ id: 33, cart_token: 'cart_123', total_price: '9.99' }, { topic: 'checkouts/create' }))
      .toMatchObject({ checkoutId: '33', cartToken: 'cart_123', totalPrice: 9.99 });
    expect(normalizeShopifyEvent({ id: 44, order_id: 450789469 }, { topic: 'refunds/create' }))
      .toMatchObject({ refundId: '44' });
  });

  it('validates Shopify HMAC-SHA256 signatures over the raw body', () => {
    const rawBody = Buffer.from(JSON.stringify({ hello: 'world' }));
    const secret = 'client_secret';
    const signature = shopifyHmac(rawBody, secret);
    expect(validateShopifyHmac(rawBody, signature, secret)).toBe(true);
    expect(validateShopifyHmac(rawBody, signature, 'wrong')).toBe(false);
    expect(validateShopifyHmac(Buffer.from('changed'), signature, secret)).toBe(false);
  });

  it('filters events by topic, shop, statuses, customer, product, total, currency, and query', () => {
    const normalized = normalizeShopifyEvent(orderPayload, { topic: 'orders/paid', shopDomain: 'demo.myshopify.com' })!;
    expect(shouldAcceptShopifyEvent(normalized, {})).toEqual({ accepted: true });
    expect(shouldAcceptShopifyEvent(normalized, { topics: 'orders/paid' })).toEqual({ accepted: true });
    expect(shouldAcceptShopifyEvent(normalized, { topics: 'customers/create' })).toMatchObject({ accepted: false });
    expect(shouldAcceptShopifyEvent(normalized, { shopDomain: 'demo.myshopify.com', financialStatus: 'paid', fulfillmentStatus: 'fulfilled', customerId: '207119551', productId: '632910392', minTotalPrice: 100, currency: 'usd', query: 'lovelace' })).toEqual({ accepted: true });
    expect(shouldAcceptShopifyEvent(normalized, { shopDomain: 'other.myshopify.com' })).toMatchObject({ accepted: false });
    expect(shouldAcceptShopifyEvent(normalized, { financialStatus: 'pending' })).toMatchObject({ accepted: false });
    expect(shouldAcceptShopifyEvent(normalized, { minTotalPrice: 200 })).toMatchObject({ accepted: false });
    expect(shouldAcceptShopifyEvent(normalized, { query: 'missing' })).toMatchObject({ accepted: false });
  });

  it('builds workflow execution input with normalized Shopify fields', () => {
    const normalized = normalizeShopifyEvent(orderPayload, { topic: 'orders/paid', webhookId: 'wh_123' })!;
    expect(buildShopifyExecutionInput({ workflowId: 'wf1', nodeId: 'shopify-node', normalized })).toMatchObject({
      trigger: 'shopify',
      workflow_id: 'wf1',
      node_id: 'shopify-node',
      orderId: '450789469',
      _shopify: true,
    });
  });

  it('resolves Shopify Admin API credentials from shopify_api_key and requires a webhook secret', async () => {
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({
      storeUrl: 'demo.myshopify.com',
      token: 'shpat_123',
      clientSecret: 'client_secret',
    }));
    await expect(resolveShopifyCredential('user-1')).resolves.toMatchObject({
      shopDomain: 'demo.myshopify.com',
      adminAccessToken: 'shpat_123',
      webhookSecret: 'client_secret',
      apiVersion: expect.any(String),
    });
  });

  it('falls back to env webhook secret for older Shopify credentials', async () => {
    process.env.SHOPIFY_CLIENT_SECRET = 'env_secret';
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({
      shopDomain: 'demo',
      apiKey: 'shpat_legacy',
    }));
    await expect(resolveShopifyCredential('user-1')).resolves.toMatchObject({
      shopDomain: 'demo.myshopify.com',
      adminAccessToken: 'shpat_legacy',
      webhookSecret: 'env_secret',
    });
  });

  it('registers Shopify webhooks, stores state, and validates deliveries', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({
      storeUrl: 'demo.myshopify.com',
      token: 'shpat_123',
      clientSecret: 'client_secret',
    }));
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ webhook: { id: 101 } }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ webhook: { id: 102 } }) });

    const result = await registerShopifyWebhooks({
      userId: 'user-1',
      workflowId: 'wf1',
      nodeId: 'shopify-node',
      triggerConfig: { topics: 'orders/create, orders/paid' },
    });
    expect(result).toMatchObject({
      success: true,
      webhookUrl: 'https://ctrlchecks.example/api/shopify/webhook/wf1/shopify-node',
      webhookIds: ['101', '102'],
      topics: ['orders/create', 'orders/paid'],
      shopDomain: 'demo.myshopify.com',
    });

    const [url, requestInit] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://demo.myshopify.com/admin/api/2025-10/webhooks.json');
    expect(requestInit.headers['X-Shopify-Access-Token']).toBe('shpat_123');
    expect(JSON.parse(requestInit.body)).toEqual({
      webhook: {
        topic: 'orders/create',
        address: 'https://ctrlchecks.example/api/shopify/webhook/wf1/shopify-node',
        format: 'json',
      },
    });

    const rawBody = Buffer.from(JSON.stringify(orderPayload));
    await expect(validateShopifyWebhookSecret({
      workflowId: 'wf1',
      nodeId: 'shopify-node',
      rawBody,
      hmacHeader: shopifyHmac(rawBody, 'client_secret'),
      topic: 'orders/create',
      shopDomain: 'demo.myshopify.com',
    })).resolves.toBe(true);
    await expect(validateShopifyWebhookSecret({
      workflowId: 'wf1',
      nodeId: 'shopify-node',
      rawBody,
      hmacHeader: shopifyHmac(rawBody, 'client_secret'),
      topic: 'customers/create',
    })).resolves.toBe(false);
  });

  it('auto-registers active Shopify trigger nodes', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({
      storeUrl: 'demo.myshopify.com',
      token: 'shpat_123',
      clientSecret: 'client_secret',
    }));
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ webhook: { id: 101 } }),
    });

    const result = await autoRegisterShopifyWebhooksForWorkflow({
      userId: 'user-1',
      workflow: {
        id: 'wf1',
        status: 'active',
        nodes: [
          { id: 'shopify-node', type: 'custom', data: { type: 'shopify_trigger', config: { topics: 'orders/paid' } } },
        ],
      },
    });

    expect(result).toEqual([
      expect.objectContaining({ nodeId: 'shopify-node', success: true, webhookIds: ['101'], topics: ['orders/paid'] }),
    ]);
  });

  it('unregisters Shopify webhooks and clears local state', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({
      storeUrl: 'demo.myshopify.com',
      token: 'shpat_123',
      clientSecret: 'client_secret',
    }));
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ webhook: { id: 101 } }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ deleted: true }) });

    await registerShopifyWebhooks({
      userId: 'user-1',
      workflowId: 'wf1',
      nodeId: 'shopify-node',
      triggerConfig: { topics: 'orders/paid' },
    });
    const result = await unregisterShopifyWebhooks({ userId: 'user-1', workflowId: 'wf1', nodeId: 'shopify-node' });
    expect(result).toEqual({ success: true });
    expect((global.fetch as jest.Mock).mock.calls[1][0]).toBe('https://demo.myshopify.com/admin/api/2025-10/webhooks/101.json');
    expect(fakeRedis.del).toHaveBeenCalled();
  });
});
