import { createHmac } from 'crypto';
import { config } from '../../core/config';
import { connectionService } from '../../credentials-system/connection-service';
import {
  autoRegisterWhatsAppWebhooksForWorkflow,
  buildWhatsAppExecutionInput,
  normalizeWhatsAppWebhookPayload,
  registerWhatsAppWebhook,
  shouldAcceptWhatsAppEvent,
  validateWhatsAppSignature,
  validateWhatsAppVerifyToken,
} from './whatsapp-trigger-service';

jest.mock('../../credentials-system/connection-service', () => ({
  connectionService: {
    findCanonicalConnection: jest.fn(),
    findCanonicalConnectionByProvider: jest.fn(),
    getDecryptedConnection: jest.fn(),
  },
}));

const samplePayload = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'waba-1',
      changes: [
        {
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '15550001111',
              phone_number_id: 'phone-1',
            },
            contacts: [
              {
                profile: { name: 'Alice Ng' },
                wa_id: '15551234567',
              },
            ],
            messages: [
              {
                from: '15551234567',
                id: 'wamid-1',
                timestamp: '1784260800',
                type: 'text',
                text: { body: 'Hello bot' },
              },
            ],
          },
        },
      ],
    },
  ],
};

describe('whatsapp-trigger-service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).fetch = jest.fn();
    config.publicBaseUrl = 'https://ctrlchecks.example';
    process.env.META_APP_SECRET = 'meta-secret';
  });

  afterEach(() => {
    delete process.env.META_APP_SECRET;
  });

  it('normalizes incoming WhatsApp text messages into reply-friendly fields', () => {
    const [normalized] = normalizeWhatsAppWebhookPayload(samplePayload);

    expect(normalized).toMatchObject({
      eventId: 'wamid-1',
      eventType: 'message.text',
      source: 'whatsapp',
      chatId: '15551234567',
      from: '15551234567',
      waId: '15551234567',
      username: 'Alice Ng',
      text: 'Hello bot',
      messageId: 'wamid-1',
      phoneNumberId: 'phone-1',
      businessAccountId: 'waba-1',
    });
  });

  it('filters by event type, phone number id, and sender allowlist', () => {
    const [normalized] = normalizeWhatsAppWebhookPayload(samplePayload);

    expect(shouldAcceptWhatsAppEvent(normalized, { eventTypes: ['message'], phoneNumberId: 'phone-1' })).toEqual({
      accepted: true,
    });
    expect(shouldAcceptWhatsAppEvent(normalized, { eventTypes: ['status'] })).toMatchObject({
      accepted: false,
    });
    expect(shouldAcceptWhatsAppEvent(normalized, { eventTypes: ['message'], allowedWaIds: '999' })).toMatchObject({
      accepted: false,
    });
  });

  it('validates Meta verification challenge and HMAC signature', () => {
    const challengeReq: any = {
      query: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'verify-1',
        'hub.challenge': 'challenge-123',
      },
    };

    expect(validateWhatsAppVerifyToken(challengeReq, { verifyToken: 'verify-1' })).toBe('challenge-123');

    const rawBody = Buffer.from(JSON.stringify(samplePayload));
    const signature = `sha256=${createHmac('sha256', 'meta-secret').update(rawBody).digest('hex')}`;
    const req: any = {
      rawBody,
      body: samplePayload,
      headers: { 'x-hub-signature-256': signature },
    };

    expect(validateWhatsAppSignature(req, { validateSignature: true })).toBe(true);
    expect(validateWhatsAppSignature({ ...req, headers: { 'x-hub-signature-256': 'sha256=bad' } }, { validateSignature: true })).toBe(false);
  });

  it('builds workflow execution input with normalized WhatsApp fields', () => {
    const [normalized] = normalizeWhatsAppWebhookPayload(samplePayload);
    expect(buildWhatsAppExecutionInput({ workflowId: 'wf1', nodeId: 'wa1', normalized })).toMatchObject({
      trigger: 'whatsapp',
      workflow_id: 'wf1',
      node_id: 'wa1',
      chatId: '15551234567',
      text: 'Hello bot',
      _whatsapp: true,
    });
  });

  it('returns webhook URL and subscribes WABA app when registering', async () => {
    (connectionService.getDecryptedConnection as jest.Mock).mockResolvedValue({
      id: 'conn-1',
      userId: 'user-1',
      credentialTypeId: 'whatsapp_api_key',
      provider: 'whatsapp',
      metadata: {},
      credentials: {
        accessToken: 'token-1',
        phoneNumberId: 'phone-1',
        businessAccountId: 'waba-1',
      },
    });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ success: true }) });

    const result = await registerWhatsAppWebhook({
      userId: 'user-1',
      workflowId: 'wf1',
      nodeId: 'wa1',
      connectionId: 'conn-1',
    });

    expect(result).toMatchObject({
      success: true,
      webhookUrl: 'https://ctrlchecks.example/api/whatsapp/webhook/wf1/wa1',
      connectionId: 'conn-1',
      phoneNumberId: 'phone-1',
      businessAccountId: 'waba-1',
      manualSetupRequired: true,
      subscribed: true,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://graph.facebook.com/v19.0/waba-1/subscribed_apps',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('auto-registers saved React Flow WhatsApp trigger nodes using connectionRefs', async () => {
    (connectionService.getDecryptedConnection as jest.Mock).mockResolvedValue({
      id: 'conn-whatsapp',
      userId: 'user-1',
      credentialTypeId: 'whatsapp_api_key',
      provider: 'whatsapp',
      metadata: {},
      credentials: { accessToken: 'token-1', phoneNumberId: 'phone-1', businessAccountId: 'waba-1' },
    });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ success: true }) });

    const result = await autoRegisterWhatsAppWebhooksForWorkflow({
      userId: 'user-1',
      workflow: {
        id: 'wf1',
        status: 'active',
        nodes: [
          {
            id: 'wa1',
            type: 'custom',
            data: {
              type: 'whatsapp_trigger',
              config: { eventTypes: ['message'] },
              connectionRefs: { whatsapp_api_key: 'conn-whatsapp' },
            },
          },
        ],
      },
    });

    expect(result).toEqual([
      expect.objectContaining({
        nodeId: 'wa1',
        success: true,
        webhookUrl: 'https://ctrlchecks.example/api/whatsapp/webhook/wf1/wa1',
        connectionId: 'conn-whatsapp',
      }),
    ]);
  });
});
