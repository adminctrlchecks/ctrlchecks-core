import { config } from '../../core/config';
import { connectionService } from '../../credentials-system/connection-service';
import { resolveCredential } from '../credential-resolver';
import { getRedisClient } from '../../shared/redis-client';
import {
  buildOutlookExecutionInput,
  fetchOutlookResource,
  isOutlookValidationRequest,
  normalizeOutlookNotifications,
  registerOutlookSubscription,
  shouldAcceptOutlookEvent,
  unregisterOutlookSubscription,
  validateOutlookClientState,
  type NormalizedOutlookEvent,
} from './outlook-trigger-service';

jest.mock('../../credentials-system/connection-service', () => ({
  connectionService: {
    findCanonicalConnectionByProvider: jest.fn(),
  },
}));

jest.mock('../credential-resolver', () => ({
  resolveCredential: jest.fn(),
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

function makeEvent(overrides: Partial<NormalizedOutlookEvent> = {}): NormalizedOutlookEvent {
  return {
    eventId: 'msg-1-created',
    eventType: 'message_created',
    source: 'outlook',
    userId: 'billing@example.com',
    username: 'Billing',
    text: 'Your invoice is ready',
    timestamp: '2026-07-17T12:00:00.000Z',
    resourceId: 'msg-1',
    subject: 'Invoice #123',
    from: 'billing@example.com',
    to: 'user@example.com',
    snippet: 'Your invoice is ready',
    conversationId: 'conversation-1',
    start: null,
    end: null,
    attendees: [],
    raw: {},
    ...overrides,
  };
}

describe('outlook-trigger-service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).fetch = jest.fn();
    config.publicBaseUrl = 'https://ctrlchecks.example';
  });

  it('decodes the Graph validation handshake query parameter', () => {
    const req: any = { query: { validationToken: 'abc123' } };
    expect(isOutlookValidationRequest(req)).toBe('abc123');
    expect(isOutlookValidationRequest({ query: {} } as any)).toBeNull();
  });

  it('normalizes Graph change notifications', () => {
    const body = {
      value: [
        { subscriptionId: 'sub-1', changeType: 'created', resourceData: { id: 'msg-1' }, clientState: 'secret-1' },
        { subscriptionId: '', changeType: 'created', resourceData: {}, clientState: '' },
      ],
    };
    expect(normalizeOutlookNotifications(body)).toEqual([
      { subscriptionId: 'sub-1', changeType: 'created', resourceId: 'msg-1', clientState: 'secret-1' },
    ]);
  });

  it('filters events by keyword query', () => {
    const event = makeEvent();
    expect(shouldAcceptOutlookEvent(event, {})).toEqual({ accepted: true });
    expect(shouldAcceptOutlookEvent(event, { query: 'invoice' })).toEqual({ accepted: true });
    expect(shouldAcceptOutlookEvent(event, { query: 'unrelated-keyword' })).toMatchObject({ accepted: false });
  });

  it('builds workflow execution input with normalized Outlook fields', () => {
    const event = makeEvent();
    expect(buildOutlookExecutionInput({ workflowId: 'wf1', nodeId: 'outlook-node', normalized: event })).toMatchObject({
      trigger: 'outlook',
      workflow_id: 'wf1',
      node_id: 'outlook-node',
      subject: 'Invoice #123',
      _outlook: true,
    });
  });

  it('fetches and normalizes a mail message resource', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        subject: 'Invoice #123',
        from: { emailAddress: { address: 'billing@example.com', name: 'Billing' } },
        toRecipients: [{ emailAddress: { address: 'user@example.com' } }],
        bodyPreview: 'Your invoice is ready',
        receivedDateTime: '2026-07-17T12:00:00.000Z',
        conversationId: 'conversation-1',
      }),
    });

    const normalized = await fetchOutlookResource({
      accessToken: 'token-1',
      resourceKind: 'mail',
      resourceId: 'msg-1',
      changeType: 'created',
    });

    expect(normalized).toMatchObject({
      eventType: 'message_created',
      subject: 'Invoice #123',
      from: 'billing@example.com',
      to: 'user@example.com',
      conversationId: 'conversation-1',
    });
  });

  it('registers a new Graph subscription and validates its clientState', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (resolveCredential as jest.Mock).mockResolvedValue({ accessToken: 'token-1' });
    (connectionService.findCanonicalConnectionByProvider as jest.Mock).mockResolvedValue({ id: 'conn-1' });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ id: 'sub-1', expirationDateTime: '2026-07-20T12:00:00.000Z' }),
    });

    const result = await registerOutlookSubscription({
      userId: 'user-1',
      workflowId: 'wf1',
      nodeId: 'outlook-node',
      resourceKind: 'mail',
      changeTypes: ['created'],
    });

    expect(result).toMatchObject({
      success: true,
      webhookUrl: 'https://ctrlchecks.example/api/outlook/webhook/wf1/outlook-node',
      connectionId: 'conn-1',
      subscriptionId: 'sub-1',
    });

    const [, requestInit] = (global.fetch as jest.Mock).mock.calls[0];
    const requestBody = JSON.parse(requestInit.body);
    expect(requestBody.clientState).toBeTruthy();

    await expect(validateOutlookClientState('wf1', 'outlook-node', requestBody.clientState)).resolves.toBe(true);
    await expect(validateOutlookClientState('wf1', 'outlook-node', 'wrong-secret')).resolves.toBe(false);
  });

  it('unregisters a subscription and clears local state', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (resolveCredential as jest.Mock).mockResolvedValue({ accessToken: 'token-1' });
    (connectionService.findCanonicalConnectionByProvider as jest.Mock).mockResolvedValue({ id: 'conn-1' });
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ id: 'sub-1', expirationDateTime: '2026-07-20T12:00:00.000Z' }) })
      .mockResolvedValueOnce({ ok: true, text: async () => '' });

    await registerOutlookSubscription({
      userId: 'user-1',
      workflowId: 'wf1',
      nodeId: 'outlook-node',
      resourceKind: 'mail',
      changeTypes: ['created'],
    });

    const result = await unregisterOutlookSubscription({ userId: 'user-1', workflowId: 'wf1', nodeId: 'outlook-node' });
    expect(result).toMatchObject({ success: true, connectionId: 'conn-1' });
    expect(fakeRedis.del).toHaveBeenCalled();
  });
});
