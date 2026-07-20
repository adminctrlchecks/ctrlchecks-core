import { createHmac } from 'crypto';
import { config } from '../../core/config';
import { retrieveCredential } from '../../core/utils/credential-retriever';
import { getRedisClient } from '../../shared/redis-client';
import {
  autoRegisterTrelloWebhooksForWorkflow,
  buildTrelloExecutionInput,
  normalizeTrelloEvent,
  registerTrelloWebhook,
  resolveTrelloCredential,
  shouldAcceptTrelloEvent,
  unregisterTrelloWebhook,
  validateTrelloSignature,
  validateTrelloWebhookSecret,
} from './trello-trigger-service';

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

const cardPayload = {
  action: {
    id: 'act-1',
    type: 'createCard',
    date: '2026-07-18T10:00:00.000Z',
    data: {
      board: { id: 'board-1', name: 'Launch Board' },
      list: { id: 'list-1', name: 'Inbox' },
      card: { id: 'card-1', name: 'Qualify lead', shortLink: 'abc123', url: 'https://trello.com/c/abc123' },
    },
    memberCreator: { id: 'member-1', username: 'jane', fullName: 'Jane Doe' },
  },
  model: { id: 'board-1', name: 'Launch Board', url: 'https://trello.com/b/board' },
};

describe('trello-trigger-service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).fetch = jest.fn();
    config.publicBaseUrl = 'https://ctrlchecks.example';
  });

  it('returns null when action type is missing', () => {
    expect(normalizeTrelloEvent({})).toBeNull();
    expect(normalizeTrelloEvent({ action: { type: '' } })).toBeNull();
  });

  it('normalizes card creation events with card/list/board/member fields', () => {
    const normalized = normalizeTrelloEvent(cardPayload);
    expect(normalized).toMatchObject({
      eventId: 'act-1',
      eventType: 'card_created',
      source: 'trello',
      boardId: 'board-1',
      boardName: 'Launch Board',
      listId: 'list-1',
      listName: 'Inbox',
      cardId: 'card-1',
      cardName: 'Qualify lead',
      cardUrl: 'https://trello.com/c/abc123',
      userId: 'member-1',
      username: 'jane',
      text: 'Qualify lead',
    });
  });

  it('normalizes card move and comment events', () => {
    const moved = normalizeTrelloEvent({
      action: {
        id: 'act-2',
        type: 'updateCard',
        data: {
          board: { id: 'board-1', name: 'Launch Board' },
          card: { id: 'card-1', name: 'Qualify lead' },
          listBefore: { id: 'list-1', name: 'Inbox' },
          listAfter: { id: 'list-2', name: 'Doing' },
        },
      },
    });
    expect(moved).toMatchObject({ eventType: 'card_moved', listBeforeId: 'list-1', listAfterId: 'list-2' });

    const commented = normalizeTrelloEvent({
      action: {
        id: 'act-3',
        type: 'commentCard',
        data: { text: 'Looks ready', card: { id: 'card-1', name: 'Qualify lead' }, board: { id: 'board-1' } },
      },
    });
    expect(commented).toMatchObject({ eventType: 'card_commented', commentText: 'Looks ready', text: 'Looks ready' });
  });

  it('normalizes checklist activity events', () => {
    const normalized = normalizeTrelloEvent({
      action: {
        id: 'act-4',
        type: 'updateCheckItemStateOnCard',
        data: {
          card: { id: 'card-1', name: 'Qualify lead' },
          checklist: { id: 'checklist-1', name: 'Tasks' },
          checkItem: { id: 'item-1', name: 'Call customer' },
        },
      },
    });
    expect(normalized).toMatchObject({
      eventType: 'checklist_activity',
      checklistId: 'checklist-1',
      checkItemId: 'item-1',
      checkItemName: 'Call customer',
    });
  });

  it('validates Trello HMAC-SHA1 base64 signatures using raw body plus callback URL', () => {
    const rawBody = Buffer.from(JSON.stringify({ hello: 'world' }));
    const callbackUrl = 'https://ctrlchecks.example/api/trello/webhook/wf1/node1';
    const appSecret = 'trello-app-secret';
    const signature = createHmac('sha1', appSecret)
      .update(Buffer.concat([rawBody, Buffer.from(callbackUrl)]))
      .digest('base64');
    expect(validateTrelloSignature(rawBody, signature, appSecret, callbackUrl)).toBe(true);
    expect(validateTrelloSignature(rawBody, signature, 'wrong-secret', callbackUrl)).toBe(false);
    expect(validateTrelloSignature(rawBody, '', appSecret, callbackUrl)).toBe(false);
  });

  it('filters events by type, board, list, card, member, and query', () => {
    const normalized = normalizeTrelloEvent(cardPayload)!;
    expect(shouldAcceptTrelloEvent(normalized, {})).toEqual({ accepted: true });
    expect(shouldAcceptTrelloEvent(normalized, { eventTypes: 'card_created' })).toEqual({ accepted: true });
    expect(shouldAcceptTrelloEvent(normalized, { eventTypes: 'card_moved' })).toMatchObject({ accepted: false });
    expect(shouldAcceptTrelloEvent(normalized, { boardId: 'board-1', listId: 'list-1', cardId: 'card-1', memberId: 'member-1' })).toEqual({ accepted: true });
    expect(shouldAcceptTrelloEvent(normalized, { boardId: 'other-board' })).toMatchObject({ accepted: false });
    expect(shouldAcceptTrelloEvent(normalized, { query: 'qualify' })).toEqual({ accepted: true });
    expect(shouldAcceptTrelloEvent(normalized, { query: 'unrelated-keyword' })).toMatchObject({ accepted: false });
  });

  it('builds workflow execution input with normalized Trello fields', () => {
    const normalized = normalizeTrelloEvent(cardPayload)!;
    expect(buildTrelloExecutionInput({ workflowId: 'wf1', nodeId: 'trello-node', normalized })).toMatchObject({
      trigger: 'trello',
      workflow_id: 'wf1',
      node_id: 'trello-node',
      cardId: 'card-1',
      _trello: true,
    });
  });

  it('resolves the trello_api_key credential with API key, token, and app secret', async () => {
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ apiKey: 'key-1', token: 'token-1', appSecret: 'secret-1' }));
    await expect(resolveTrelloCredential('user-1')).resolves.toEqual({ apiKey: 'key-1', token: 'token-1', appSecret: 'secret-1' });
  });

  it('requires app secret for webhook validation rather than accepting API key/token alone', async () => {
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ apiKey: 'key-1', token: 'token-1' }));
    await expect(resolveTrelloCredential('user-1')).rejects.toThrow('app secret');
  });

  it('registers a Trello webhook and validates its signature', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ apiKey: 'key-1', token: 'token-1', appSecret: 'secret-1' }));
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, text: async () => JSON.stringify({ id: 'hook-1' }) });

    const result = await registerTrelloWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'trello-node', modelId: 'board-1' });
    expect(result).toEqual({
      success: true,
      webhookUrl: 'https://ctrlchecks.example/api/trello/webhook/wf1/trello-node',
      modelId: 'board-1',
      hookId: 'hook-1',
    });

    const [url, requestInit] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/tokens/token-1/webhooks/?key=key-1');
    expect(requestInit.method).toBe('POST');
    expect(JSON.parse(requestInit.body)).toMatchObject({
      callbackURL: 'https://ctrlchecks.example/api/trello/webhook/wf1/trello-node',
      idModel: 'board-1',
    });

    const rawBody = Buffer.from(JSON.stringify({ any: 'payload' }));
    const signature = createHmac('sha1', 'secret-1')
      .update(Buffer.concat([rawBody, Buffer.from(result.webhookUrl)]))
      .digest('base64');
    await expect(validateTrelloWebhookSecret('wf1', 'trello-node', rawBody, signature)).resolves.toBe(true);
    await expect(validateTrelloWebhookSecret('wf1', 'trello-node', rawBody, 'wrong')).resolves.toBe(false);
  });

  it('rejects registration without a model ID', async () => {
    (getRedisClient as jest.Mock).mockResolvedValue(makeFakeRedis());
    await expect(registerTrelloWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'trello-node', modelId: '' })).rejects.toThrow('model ID');
  });

  it('auto-registers active Trello trigger nodes and reports missing model IDs', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ apiKey: 'key-1', token: 'token-1', appSecret: 'secret-1' }));
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, text: async () => JSON.stringify({ id: 'hook-1' }) });

    const result = await autoRegisterTrelloWebhooksForWorkflow({
      userId: 'user-1',
      workflow: {
        id: 'wf1',
        status: 'active',
        nodes: [
          { id: 'trello-node', type: 'custom', data: { type: 'trello_trigger', config: { modelId: 'board-1' } } },
          { id: 'trello-node-2', type: 'custom', data: { type: 'trello_trigger', config: {} } },
        ],
      },
    });

    expect(result).toEqual([
      expect.objectContaining({ nodeId: 'trello-node', success: true, modelId: 'board-1', hookId: 'hook-1' }),
      expect.objectContaining({ nodeId: 'trello-node-2', success: false, error: expect.stringContaining('Model ID') }),
    ]);
  });

  it('unregisters a webhook and clears local state', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ apiKey: 'key-1', token: 'token-1', appSecret: 'secret-1' }));
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, text: async () => JSON.stringify({ id: 'hook-1' }) });

    await registerTrelloWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'trello-node', modelId: 'board-1' });
    const result = await unregisterTrelloWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'trello-node' });
    expect(result).toEqual({ success: true });
    expect(fakeRedis.del).toHaveBeenCalled();
  });
});
