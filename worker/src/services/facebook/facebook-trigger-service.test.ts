import { createHmac } from 'crypto';
import { config } from '../../core/config';
import { connectionService } from '../../credentials-system/connection-service';
import {
  autoRegisterFacebookWebhooksForWorkflow,
  buildFacebookExecutionInput,
  normalizeFacebookWebhookPayload,
  registerFacebookWebhook,
  shouldAcceptFacebookEvent,
  validateFacebookSignature,
  validateFacebookVerifyToken,
} from './facebook-trigger-service';

jest.mock('../../credentials-system/connection-service', () => ({
  connectionService: {
    findCanonicalConnection: jest.fn(),
    findCanonicalConnectionByProvider: jest.fn(),
    getDecryptedConnection: jest.fn(),
  },
}));

const messagePayload = {
  object: 'page',
  entry: [
    {
      id: 'page-1',
      time: 1784260800,
      messaging: [
        {
          sender: { id: 'psid-1' },
          recipient: { id: 'page-1' },
          timestamp: 1784260800000,
          message: {
            mid: 'mid-1',
            text: 'Hello from Messenger',
          },
        },
      ],
    },
  ],
};

const feedCommentPayload = {
  object: 'page',
  entry: [
    {
      id: 'page-1',
      changes: [
        {
          field: 'feed',
          value: {
            item: 'comment',
            verb: 'add',
            comment_id: 'comment-1',
            post_id: 'post-1',
            sender_id: 'user-2',
            sender_name: 'Alice',
            message: 'Nice post',
            created_time: 1784260800,
          },
        },
      ],
    },
  ],
};

const leadgenPayload = {
  object: 'page',
  entry: [
    {
      id: 'page-1',
      changes: [
        {
          field: 'leadgen',
          value: {
            leadgen_id: 'lead-1',
            form_id: 'form-1',
            page_id: 'page-1',
            created_time: 1784260800,
          },
        },
      ],
    },
  ],
};

describe('facebook-trigger-service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).fetch = jest.fn();
    config.publicBaseUrl = 'https://ctrlchecks.example';
    process.env.META_APP_SECRET = 'meta-secret';
  });

  afterEach(() => {
    delete process.env.META_APP_SECRET;
  });

  it('normalizes Messenger messages into reply-friendly fields', () => {
    const [normalized] = normalizeFacebookWebhookPayload(messagePayload);

    expect(normalized).toMatchObject({
      eventId: 'mid-1',
      eventType: 'message.text',
      source: 'facebook',
      chatId: 'psid-1',
      senderId: 'psid-1',
      recipientId: 'page-1',
      pageId: 'page-1',
      text: 'Hello from Messenger',
      messageId: 'mid-1',
    });
  });

  it('normalizes Page feed comments with post and comment identifiers', () => {
    const [normalized] = normalizeFacebookWebhookPayload(feedCommentPayload);

    expect(normalized).toMatchObject({
      eventType: 'feed.comment',
      senderId: 'user-2',
      username: 'Alice',
      text: 'Nice post',
      commentId: 'comment-1',
      postId: 'post-1',
      pageId: 'page-1',
      verb: 'add',
      item: 'comment',
    });
  });

  it('normalizes leadgen webhooks with lead and form identifiers', () => {
    const [normalized] = normalizeFacebookWebhookPayload(leadgenPayload);

    expect(normalized).toMatchObject({
      eventType: 'leadgen',
      leadgenId: 'lead-1',
      formId: 'form-1',
      pageId: 'page-1',
    });
  });

  it('filters by event type, Page ID, and sender allowlist', () => {
    const [normalized] = normalizeFacebookWebhookPayload(messagePayload);

    expect(shouldAcceptFacebookEvent(normalized, { eventTypes: ['message'], pageId: 'page-1' })).toEqual({
      accepted: true,
    });
    expect(shouldAcceptFacebookEvent(normalized, { eventTypes: ['leadgen'] })).toMatchObject({
      accepted: false,
    });
    expect(shouldAcceptFacebookEvent(normalized, { eventTypes: ['message'], allowedSenderIds: 'someone-else' })).toMatchObject({
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

    expect(validateFacebookVerifyToken(challengeReq, { verifyToken: 'verify-1' })).toBe('challenge-123');

    const rawBody = Buffer.from(JSON.stringify(messagePayload));
    const signature = `sha256=${createHmac('sha256', 'meta-secret').update(rawBody).digest('hex')}`;
    const req: any = {
      rawBody,
      body: messagePayload,
      headers: { 'x-hub-signature-256': signature },
    };

    expect(validateFacebookSignature(req, { validateSignature: true })).toBe(true);
    expect(validateFacebookSignature({ ...req, headers: { 'x-hub-signature-256': 'sha256=bad' } }, { validateSignature: true })).toBe(false);
  });

  it('builds workflow execution input with normalized Facebook fields', () => {
    const [normalized] = normalizeFacebookWebhookPayload(messagePayload);
    expect(buildFacebookExecutionInput({ workflowId: 'wf1', nodeId: 'fb-node', normalized })).toMatchObject({
      trigger: 'facebook',
      workflow_id: 'wf1',
      node_id: 'fb-node',
      chatId: 'psid-1',
      text: 'Hello from Messenger',
      _facebook: true,
    });
  });

  it('returns webhook URL and attempts Page app subscription when registering', async () => {
    (connectionService.getDecryptedConnection as jest.Mock).mockResolvedValue({
      id: 'conn-1',
      userId: 'user-1',
      credentialTypeId: 'facebook_oauth2',
      provider: 'facebook',
      metadata: { pageId: 'page-1' },
      credentials: { accessToken: 'user-token' },
    });
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 'page-1', access_token: 'page-token' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });

    const result = await registerFacebookWebhook({
      userId: 'user-1',
      workflowId: 'wf1',
      nodeId: 'fb-node',
      connectionId: 'conn-1',
      eventTypes: ['message', 'comment', 'leadgen'],
    });

    expect(result).toMatchObject({
      success: true,
      webhookUrl: 'https://ctrlchecks.example/api/facebook/webhook/wf1/fb-node',
      connectionId: 'conn-1',
      pageId: 'page-1',
      subscribedFields: ['messages', 'feed', 'leadgen'],
      manualSetupRequired: true,
      subscribed: true,
    });
    expect(global.fetch).toHaveBeenLastCalledWith(
      'https://graph.facebook.com/v19.0/page-1/subscribed_apps',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('auto-registers saved React Flow Facebook trigger nodes using connectionRefs', async () => {
    (connectionService.getDecryptedConnection as jest.Mock).mockResolvedValue({
      id: 'conn-facebook',
      userId: 'user-1',
      credentialTypeId: 'facebook_oauth2',
      provider: 'facebook',
      metadata: { pageId: 'page-1' },
      credentials: { accessToken: 'user-token' },
    });
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 'page-1', access_token: 'page-token' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });

    const result = await autoRegisterFacebookWebhooksForWorkflow({
      userId: 'user-1',
      workflow: {
        id: 'wf1',
        status: 'active',
        nodes: [
          {
            id: 'fb-node',
            type: 'custom',
            data: {
              type: 'facebook_trigger',
              config: { eventTypes: ['message'] },
              connectionRefs: { facebook_oauth2: 'conn-facebook' },
            },
          },
        ],
      },
    });

    expect(result).toEqual([
      expect.objectContaining({
        nodeId: 'fb-node',
        success: true,
        webhookUrl: 'https://ctrlchecks.example/api/facebook/webhook/wf1/fb-node',
        connectionId: 'conn-facebook',
      }),
    ]);
  });
});
