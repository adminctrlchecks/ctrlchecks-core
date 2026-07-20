import { createHmac } from 'crypto';
import { config } from '../../core/config';
import { retrieveCredential } from '../../core/utils/credential-retriever';
import { getRedisClient } from '../../shared/redis-client';
import {
  autoRegisterStripeWebhooksForWorkflow,
  buildStripeExecutionInput,
  normalizeStripeEvent,
  parseStripeSignatureHeader,
  registerStripeWebhook,
  resolveStripeCredential,
  shouldAcceptStripeEvent,
  unregisterStripeWebhook,
  validateStripeSignature,
  validateStripeWebhookSecret,
} from './stripe-trigger-service';

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

const paymentIntentPayload = {
  id: 'evt_1',
  type: 'payment_intent.succeeded',
  created: 1784370000,
  livemode: false,
  api_version: '2025-10-29',
  data: {
    object: {
      id: 'pi_123',
      object: 'payment_intent',
      amount: 2500,
      amount_received: 2500,
      currency: 'usd',
      status: 'succeeded',
      customer: 'cus_123',
      receipt_email: 'buyer@example.com',
      payment_method: 'pm_123',
      description: 'Annual plan',
      metadata: { plan: 'annual' },
    },
  },
};

function stripeSignature(rawBody: Buffer, secret: string, timestamp: number): string {
  const signature = createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

describe('stripe-trigger-service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).fetch = jest.fn();
    config.publicBaseUrl = 'https://ctrlchecks.example';
  });

  it('returns null when payload is missing a Stripe event type or data object type', () => {
    expect(normalizeStripeEvent({})).toBeNull();
    expect(normalizeStripeEvent({ type: 'payment_intent.succeeded', data: { object: {} } })).toBeNull();
  });

  it('normalizes payment events with customer, payment, amount, and metadata fields', () => {
    const normalized = normalizeStripeEvent(paymentIntentPayload);
    expect(normalized).toMatchObject({
      eventId: 'evt_1',
      eventType: 'payment_intent.succeeded',
      source: 'stripe',
      livemode: false,
      apiVersion: '2025-10-29',
      objectId: 'pi_123',
      objectType: 'payment_intent',
      customerId: 'cus_123',
      customerEmail: 'buyer@example.com',
      amount: 2500,
      amountReceived: 2500,
      currency: 'usd',
      status: 'succeeded',
      paymentMethodId: 'pm_123',
      description: 'Annual plan',
      metadata: { plan: 'annual' },
      text: 'Annual plan',
    });
  });

  it('normalizes checkout, invoice, subscription, and charge identifiers', () => {
    expect(normalizeStripeEvent({
      id: 'evt_checkout',
      type: 'checkout.session.completed',
      created: 1784370000,
      data: { object: { id: 'cs_123', object: 'checkout.session', amount_total: 5000, currency: 'usd', customer: 'cus_123', payment_intent: 'pi_123' } },
    })).toMatchObject({ checkoutSessionId: 'cs_123', paymentIntentId: 'pi_123', amount: 5000 });

    expect(normalizeStripeEvent({
      id: 'evt_invoice',
      type: 'invoice.payment_succeeded',
      created: 1784370000,
      data: { object: { id: 'in_123', object: 'invoice', amount_paid: 7000, customer_email: 'billing@example.com', subscription: 'sub_123' } },
    })).toMatchObject({ invoiceId: 'in_123', subscriptionId: 'sub_123', amount: 7000 });

    expect(normalizeStripeEvent({
      id: 'evt_sub',
      type: 'customer.subscription.updated',
      created: 1784370000,
      data: { object: { id: 'sub_123', object: 'subscription', customer: 'cus_123', status: 'active' } },
    })).toMatchObject({ subscriptionId: 'sub_123', status: 'active' });

    expect(normalizeStripeEvent({
      id: 'evt_charge',
      type: 'charge.refunded',
      created: 1784370000,
      data: { object: { id: 'ch_123', object: 'charge', amount: 1200, receipt_url: 'https://pay.stripe.com/receipts/test' } },
    })).toMatchObject({ chargeId: 'ch_123', receiptUrl: 'https://pay.stripe.com/receipts/test' });
  });

  it('parses and validates Stripe HMAC-SHA256 signatures using the raw body and tolerance window', () => {
    const rawBody = Buffer.from(JSON.stringify({ hello: 'world' }));
    const secret = 'whsec_test_secret';
    const timestamp = 1784370000;
    const header = stripeSignature(rawBody, secret, timestamp);
    expect(parseStripeSignatureHeader(header)).toEqual({
      timestamp,
      signatures: [expect.any(String)],
    });
    expect(validateStripeSignature(rawBody, header, secret, timestamp)).toBe(true);
    expect(validateStripeSignature(rawBody, header, 'wrong-secret', timestamp)).toBe(false);
    expect(validateStripeSignature(rawBody, header, secret, timestamp + 301)).toBe(false);
    expect(validateStripeSignature(rawBody, 't=1784370000,v0=old', secret, timestamp)).toBe(false);
  });

  it('filters events by event type, livemode, customer, currency, amount, and query', () => {
    const normalized = normalizeStripeEvent(paymentIntentPayload)!;
    expect(shouldAcceptStripeEvent(normalized, {})).toEqual({ accepted: true });
    expect(shouldAcceptStripeEvent(normalized, { eventTypes: 'payment_intent.succeeded' })).toEqual({ accepted: true });
    expect(shouldAcceptStripeEvent(normalized, { eventTypes: 'invoice.payment_succeeded' })).toMatchObject({ accepted: false });
    expect(shouldAcceptStripeEvent(normalized, { livemode: false, customerId: 'cus_123', currency: 'usd', minAmount: 2000, query: 'annual' })).toEqual({ accepted: true });
    expect(shouldAcceptStripeEvent(normalized, { livemode: true })).toMatchObject({ accepted: false });
    expect(shouldAcceptStripeEvent(normalized, { customerId: 'cus_other' })).toMatchObject({ accepted: false });
    expect(shouldAcceptStripeEvent(normalized, { currency: 'eur' })).toMatchObject({ accepted: false });
    expect(shouldAcceptStripeEvent(normalized, { minAmount: 3000 })).toMatchObject({ accepted: false });
    expect(shouldAcceptStripeEvent(normalized, { query: 'missing' })).toMatchObject({ accepted: false });
  });

  it('builds workflow execution input with normalized Stripe fields', () => {
    const normalized = normalizeStripeEvent(paymentIntentPayload)!;
    expect(buildStripeExecutionInput({ workflowId: 'wf1', nodeId: 'stripe-node', normalized })).toMatchObject({
      trigger: 'stripe',
      workflow_id: 'wf1',
      node_id: 'stripe-node',
      paymentIntentId: 'pi_123',
      _stripe: true,
    });
  });

  it('resolves Stripe secret key credentials from the existing stripe_api_key credential type', async () => {
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ token: 'sk_test_123' }));
    await expect(resolveStripeCredential('user-1')).resolves.toEqual({
      secretKey: 'sk_test_123',
      authHeader: 'Bearer sk_test_123',
    });
  });

  it('falls back to legacy stripe credential entries', async () => {
    (retrieveCredential as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify({ apiKey: 'sk_live_legacy' }));
    await expect(resolveStripeCredential('user-1')).resolves.toEqual({
      secretKey: 'sk_live_legacy',
      authHeader: 'Bearer sk_live_legacy',
    });
  });

  it('registers a Stripe webhook endpoint, stores the returned signing secret, and validates deliveries', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ token: 'sk_test_123' }));
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        id: 'we_123',
        url: 'https://ctrlchecks.example/api/stripe/webhook/wf1/stripe-node',
        secret: 'whsec_123',
      }),
    });

    const result = await registerStripeWebhook({
      userId: 'user-1',
      workflowId: 'wf1',
      nodeId: 'stripe-node',
      eventTypes: 'payment_intent.succeeded, invoice.payment_succeeded',
      connect: true,
    });
    expect(result).toMatchObject({
      success: true,
      webhookUrl: 'https://ctrlchecks.example/api/stripe/webhook/wf1/stripe-node',
      endpointId: 'we_123',
      signingSecret: 'whsec_123',
      enabledEvents: ['payment_intent.succeeded', 'invoice.payment_succeeded'],
      connect: true,
    });

    const [url, requestInit] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://api.stripe.com/v1/webhook_endpoints');
    expect(requestInit.headers.Authorization).toBe('Bearer sk_test_123');
    const body = requestInit.body as URLSearchParams;
    expect(body.get('url')).toBe('https://ctrlchecks.example/api/stripe/webhook/wf1/stripe-node');
    expect(body.getAll('enabled_events[]')).toEqual(['payment_intent.succeeded', 'invoice.payment_succeeded']);
    expect(body.get('connect')).toBe('true');

    const rawBody = Buffer.from(JSON.stringify(paymentIntentPayload));
    const signature = stripeSignature(rawBody, 'whsec_123', Math.floor(Date.now() / 1000));
    await expect(validateStripeWebhookSecret({
      workflowId: 'wf1',
      nodeId: 'stripe-node',
      rawBody,
      signatureHeader: signature,
    })).resolves.toBe(true);
  });

  it('auto-registers active Stripe trigger nodes with default events', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ token: 'sk_test_123' }));
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ id: 'we_123', secret: 'whsec_123' }),
    });

    const result = await autoRegisterStripeWebhooksForWorkflow({
      userId: 'user-1',
      workflow: {
        id: 'wf1',
        status: 'active',
        nodes: [
          { id: 'stripe-node', type: 'custom', data: { type: 'stripe_trigger', config: {} } },
        ],
      },
    });

    expect(result).toEqual([
      expect.objectContaining({ nodeId: 'stripe-node', success: true, endpointId: 'we_123' }),
    ]);
    const body = (global.fetch as jest.Mock).mock.calls[0][1].body as URLSearchParams;
    expect(body.getAll('enabled_events[]')).toEqual(expect.arrayContaining(['checkout.session.completed', 'payment_intent.succeeded']));
  });

  it('unregisters a webhook endpoint and clears local state', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ token: 'sk_test_123' }));
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ id: 'we_123', secret: 'whsec_123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ id: 'we_123', deleted: true }),
      });

    await registerStripeWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'stripe-node' });
    const result = await unregisterStripeWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'stripe-node' });
    expect(result).toEqual({ success: true });
    expect((global.fetch as jest.Mock).mock.calls[1][0]).toBe('https://api.stripe.com/v1/webhook_endpoints/we_123');
    expect(fakeRedis.del).toHaveBeenCalled();
  });
});
