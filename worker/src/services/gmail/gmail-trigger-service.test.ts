import { config } from '../../core/config';
import { connectionService } from '../../credentials-system/connection-service';
import { getGoogleAccessToken } from '../../shared/google-sheets';
import { getRedisClient } from '../../shared/redis-client';
import {
  autoRegisterGmailWatchesForWorkflow,
  buildGmailExecutionInput,
  normalizeGmailPushEnvelope,
  registerGmailWatch,
  shouldAcceptGmailEvent,
  validateGmailPushRequest,
  type NormalizedGmailEvent,
} from './gmail-trigger-service';

jest.mock('../../credentials-system/connection-service', () => ({
  connectionService: {
    findCanonicalConnectionByProvider: jest.fn(),
  },
}));

jest.mock('../../shared/google-sheets', () => ({
  getGoogleAccessToken: jest.fn(),
}));

jest.mock('../../shared/redis-client', () => ({
  getRedisClient: jest.fn(),
}));

function makeEvent(overrides: Partial<NormalizedGmailEvent> = {}): NormalizedGmailEvent {
  return {
    eventId: 'msg-1-message_added',
    eventType: 'message_added',
    source: 'gmail',
    userId: 'user@example.com',
    username: 'user@example.com',
    text: 'Your invoice is ready',
    timestamp: '2026-07-17T12:00:00.000Z',
    emailAddress: 'user@example.com',
    historyId: '1000',
    messageId: 'msg-1',
    threadId: 'thread-1',
    subject: 'Invoice #123',
    from: 'billing@example.com',
    to: 'user@example.com',
    snippet: 'Your invoice is ready',
    labelIds: ['INBOX'],
    raw: {},
    ...overrides,
  };
}

describe('gmail-trigger-service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).fetch = jest.fn();
    config.publicBaseUrl = 'https://ctrlchecks.example';
    (getRedisClient as jest.Mock).mockResolvedValue(null);
  });

  it('decodes a Pub/Sub push envelope into emailAddress and historyId', () => {
    const payload = { emailAddress: 'user@example.com', historyId: '1234' };
    const data = Buffer.from(JSON.stringify(payload)).toString('base64');

    expect(normalizeGmailPushEnvelope({ message: { data, messageId: 'm1' }, subscription: 'sub-1' })).toEqual({
      emailAddress: 'user@example.com',
      historyId: '1234',
    });

    expect(normalizeGmailPushEnvelope({})).toBeNull();
  });

  it('filters events by type, label, and keyword query', () => {
    const event = makeEvent();

    expect(shouldAcceptGmailEvent(event, { eventTypes: 'message_added', labelIds: 'INBOX' })).toEqual({ accepted: true });
    expect(shouldAcceptGmailEvent(event, { eventTypes: 'label_added' })).toMatchObject({ accepted: false });
    expect(shouldAcceptGmailEvent(event, { labelIds: 'SENT' })).toMatchObject({ accepted: false });
    expect(shouldAcceptGmailEvent(event, { query: 'invoice' })).toEqual({ accepted: true });
    expect(shouldAcceptGmailEvent(event, { query: 'unrelated-keyword' })).toMatchObject({ accepted: false });
  });

  it('builds workflow execution input with normalized Gmail fields', () => {
    const event = makeEvent();
    expect(buildGmailExecutionInput({ workflowId: 'wf1', nodeId: 'gmail-node', normalized: event })).toMatchObject({
      trigger: 'gmail',
      workflow_id: 'wf1',
      node_id: 'gmail-node',
      messageId: 'msg-1',
      threadId: 'thread-1',
      _gmail: true,
    });
  });

  it('validates a configured shared secret for simulations', async () => {
    const req: any = { query: { token: 'secret-1' }, headers: {} };
    await expect(validateGmailPushRequest(req, {
      workflowId: 'wf1',
      nodeId: 'gmail-node',
      triggerConfig: { validationSecret: 'secret-1' },
    })).resolves.toBe(true);

    const wrongReq: any = { query: { token: 'wrong' }, headers: {} };
    await expect(validateGmailPushRequest(wrongReq, {
      workflowId: 'wf1',
      nodeId: 'gmail-node',
      triggerConfig: { validationSecret: 'secret-1' },
    })).resolves.toBe(false);
  });

  it('skips validation entirely when validateAuth is false', async () => {
    const req: any = { query: {}, headers: {} };
    await expect(validateGmailPushRequest(req, {
      workflowId: 'wf1',
      nodeId: 'gmail-node',
      triggerConfig: { validateAuth: false },
    })).resolves.toBe(true);
  });

  it('registers a Gmail watch and returns the webhook URL', async () => {
    (getGoogleAccessToken as jest.Mock).mockResolvedValue('access-token-1');
    (connectionService.findCanonicalConnectionByProvider as jest.Mock).mockResolvedValue({ id: 'conn-1' });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ historyId: '5000', expiration: '1799999999000' }),
    });

    const result = await registerGmailWatch({
      userId: 'user-1',
      workflowId: 'wf1',
      nodeId: 'gmail-node',
      topicName: 'projects/p/topics/gmail-notifications',
    });

    expect(result).toMatchObject({
      success: true,
      webhookUrl: 'https://ctrlchecks.example/api/gmail/webhook/wf1/gmail-node',
      connectionId: 'conn-1',
      historyId: '5000',
      expiration: '1799999999000',
      manualSetupRequired: true,
    });
  });

  it('rejects registration without a Pub/Sub topic', async () => {
    await expect(registerGmailWatch({
      userId: 'user-1',
      workflowId: 'wf1',
      nodeId: 'gmail-node',
      topicName: '',
    })).rejects.toThrow('Pub/Sub topic');
  });

  it('auto-registers saved Gmail trigger nodes and reports missing topic errors', async () => {
    (getGoogleAccessToken as jest.Mock).mockResolvedValue('access-token-1');
    (connectionService.findCanonicalConnectionByProvider as jest.Mock).mockResolvedValue({ id: 'conn-1' });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ historyId: '5000', expiration: '1799999999000' }),
    });

    const result = await autoRegisterGmailWatchesForWorkflow({
      userId: 'user-1',
      workflow: {
        id: 'wf1',
        status: 'active',
        nodes: [
          {
            id: 'gmail-node',
            type: 'custom',
            data: { type: 'gmail_trigger', config: { pubsubTopic: 'projects/p/topics/gmail-notifications' } },
          },
          {
            id: 'gmail-node-2',
            type: 'custom',
            data: { type: 'gmail_trigger', config: {} },
          },
        ],
      },
    });

    expect(result).toEqual([
      expect.objectContaining({ nodeId: 'gmail-node', success: true, webhookUrl: 'https://ctrlchecks.example/api/gmail/webhook/wf1/gmail-node' }),
      expect.objectContaining({ nodeId: 'gmail-node-2', success: false, error: expect.stringContaining('Pub/Sub topic') }),
    ]);
  });
});
