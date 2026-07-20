import { createHmac } from 'crypto';
import { config } from '../../core/config';
import { connectionService } from '../../credentials-system/connection-service';
import {
  autoRegisterInstagramWebhooksForWorkflow,
  buildInstagramExecutionInput,
  normalizeInstagramWebhookPayload,
  registerInstagramWebhook,
  shouldAcceptInstagramEvent,
  validateInstagramSignature,
  validateInstagramVerifyToken,
} from './instagram-trigger-service';

jest.mock('../../credentials-system/connection-service', () => ({
  connectionService: {
    findCanonicalConnection: jest.fn(),
    findCanonicalConnectionByProvider: jest.fn(),
    getDecryptedConnection: jest.fn(),
  },
}));

const dmPayload = {
  object: 'instagram',
  entry: [
    {
      id: 'ig-1',
      time: 1784260800,
      messaging: [
        {
          sender: { id: 'sender-1' },
          recipient: { id: 'ig-1' },
          timestamp: 1784260800000,
          message: {
            mid: 'mid-1',
            text: 'Hello from Instagram',
          },
        },
      ],
    },
  ],
};

const commentPayload = {
  object: 'instagram',
  entry: [
    {
      id: 'ig-1',
      changes: [
        {
          field: 'comments',
          value: {
            id: 'comment-1',
            text: 'Nice post',
            media_id: 'media-1',
            from: { id: 'sender-2', username: 'alice' },
            timestamp: 1784260800,
          },
        },
      ],
    },
  ],
};

describe('instagram-trigger-service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).fetch = jest.fn();
    config.publicBaseUrl = 'https://ctrlchecks.example';
    process.env.META_APP_SECRET = 'meta-secret';
  });

  afterEach(() => {
    delete process.env.META_APP_SECRET;
  });

  it('normalizes incoming Instagram DMs into reply-friendly fields', () => {
    const [normalized] = normalizeInstagramWebhookPayload(dmPayload);

    expect(normalized).toMatchObject({
      eventId: 'mid-1',
      eventType: 'message.text',
      source: 'instagram',
      chatId: 'sender-1',
      senderId: 'sender-1',
      recipientId: 'ig-1',
      instagramBusinessAccountId: 'ig-1',
      text: 'Hello from Instagram',
      messageId: 'mid-1',
    });
  });

  it('normalizes comment webhooks with comment and media identifiers', () => {
    const [normalized] = normalizeInstagramWebhookPayload(commentPayload);

    expect(normalized).toMatchObject({
      eventType: 'comment',
      senderId: 'sender-2',
      username: 'alice',
      text: 'Nice post',
      commentId: 'comment-1',
      mediaId: 'media-1',
      instagramBusinessAccountId: 'ig-1',
    });
  });

  it('filters by event type, business account id, and sender allowlist', () => {
    const [normalized] = normalizeInstagramWebhookPayload(dmPayload);

    expect(shouldAcceptInstagramEvent(normalized, { eventTypes: ['message'], instagramBusinessAccountId: 'ig-1' })).toEqual({
      accepted: true,
    });
    expect(shouldAcceptInstagramEvent(normalized, { eventTypes: ['comment'] })).toMatchObject({
      accepted: false,
    });
    expect(shouldAcceptInstagramEvent(normalized, { eventTypes: ['message'], allowedSenderIds: 'someone-else' })).toMatchObject({
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

    expect(validateInstagramVerifyToken(challengeReq, { verifyToken: 'verify-1' })).toBe('challenge-123');

    const rawBody = Buffer.from(JSON.stringify(dmPayload));
    const signature = `sha256=${createHmac('sha256', 'meta-secret').update(rawBody).digest('hex')}`;
    const req: any = {
      rawBody,
      body: dmPayload,
      headers: { 'x-hub-signature-256': signature },
    };

    expect(validateInstagramSignature(req, { validateSignature: true })).toBe(true);
    expect(validateInstagramSignature({ ...req, headers: { 'x-hub-signature-256': 'sha256=bad' } }, { validateSignature: true })).toBe(false);
  });

  it('builds workflow execution input with normalized Instagram fields', () => {
    const [normalized] = normalizeInstagramWebhookPayload(dmPayload);
    expect(buildInstagramExecutionInput({ workflowId: 'wf1', nodeId: 'ig-node', normalized })).toMatchObject({
      trigger: 'instagram',
      workflow_id: 'wf1',
      node_id: 'ig-node',
      chatId: 'sender-1',
      text: 'Hello from Instagram',
      _instagram: true,
    });
  });

  it('returns webhook URL and attempts Instagram app subscription when registering', async () => {
    (connectionService.getDecryptedConnection as jest.Mock).mockResolvedValue({
      id: 'conn-1',
      userId: 'user-1',
      credentialTypeId: 'instagram_oauth2',
      provider: 'instagram',
      metadata: { instagramBusinessAccountId: 'ig-1' },
      credentials: { accessToken: 'token-1' },
    });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ success: true }) });

    const result = await registerInstagramWebhook({
      userId: 'user-1',
      workflowId: 'wf1',
      nodeId: 'ig-node',
      connectionId: 'conn-1',
      eventTypes: ['message', 'comment'],
    });

    expect(result).toMatchObject({
      success: true,
      webhookUrl: 'https://ctrlchecks.example/api/instagram/webhook/wf1/ig-node',
      connectionId: 'conn-1',
      instagramBusinessAccountId: 'ig-1',
      subscribedFields: ['messages', 'comments'],
      manualSetupRequired: true,
      subscribed: true,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://graph.facebook.com/v19.0/ig-1/subscribed_apps',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('auto-registers saved React Flow Instagram trigger nodes using connectionRefs', async () => {
    (connectionService.getDecryptedConnection as jest.Mock).mockResolvedValue({
      id: 'conn-instagram',
      userId: 'user-1',
      credentialTypeId: 'instagram_oauth2',
      provider: 'instagram',
      metadata: { instagramBusinessAccountId: 'ig-1' },
      credentials: { accessToken: 'token-1' },
    });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ success: true }) });

    const result = await autoRegisterInstagramWebhooksForWorkflow({
      userId: 'user-1',
      workflow: {
        id: 'wf1',
        status: 'active',
        nodes: [
          {
            id: 'ig-node',
            type: 'custom',
            data: {
              type: 'instagram_trigger',
              config: { eventTypes: ['message'] },
              connectionRefs: { instagram_oauth2: 'conn-instagram' },
            },
          },
        ],
      },
    });

    expect(result).toEqual([
      expect.objectContaining({
        nodeId: 'ig-node',
        success: true,
        webhookUrl: 'https://ctrlchecks.example/api/instagram/webhook/wf1/ig-node',
        connectionId: 'conn-instagram',
      }),
    ]);
  });
});
