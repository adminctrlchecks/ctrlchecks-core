import {
  autoRegisterTelegramWebhooksForWorkflow,
  buildTelegramExecutionInput,
  normalizeTelegramUpdate,
  registerTelegramWebhook,
  shouldAcceptTelegramUpdate,
} from './telegram-trigger-service';
import { config } from '../../core/config';
import { connectionService } from '../../credentials-system/connection-service';

jest.mock('../../credentials-system/connection-service', () => ({
  connectionService: {
    findCanonicalConnection: jest.fn(),
    getDecryptedConnection: jest.fn(),
  },
}));

describe('telegram-trigger-service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).fetch = jest.fn();
    config.publicBaseUrl = 'https://ctrlchecks.example';
  });

  it('normalizes incoming Telegram message updates', () => {
    const normalized = normalizeTelegramUpdate({
      update_id: 1000,
      message: {
        message_id: 42,
        text: 'Hello bot',
        chat: { id: 123456789 },
        from: {
          id: 987,
          username: 'alice',
          first_name: 'Alice',
          last_name: 'Ng',
        },
      },
    });

    expect(normalized).toMatchObject({
      chatId: '123456789',
      messageId: 42,
      text: 'Hello bot',
      username: 'alice',
      firstName: 'Alice',
      lastName: 'Ng',
      userId: '987',
      updateType: 'message',
    });
  });

  it('filters by update type, chat id, and command', () => {
    const normalized = normalizeTelegramUpdate({
      callback_query: {
        data: 'clicked',
        from: { id: 1 },
        message: { message_id: 9, chat: { id: -1001 } },
      },
    });

    expect(shouldAcceptTelegramUpdate(normalized, { updateTypes: ['message'] })).toEqual({
      accepted: false,
      reason: 'Ignored Telegram update type "callback_query".',
    });
    expect(shouldAcceptTelegramUpdate(normalized, { updateTypes: ['callback_query'], allowedChatIds: '-1001' })).toEqual({
      accepted: true,
    });
    expect(shouldAcceptTelegramUpdate({ ...normalized, text: 'hello' }, { updateTypes: ['callback_query'], commandFilter: '/start' })).toMatchObject({
      accepted: false,
    });
  });

  it('builds workflow execution input with normalized Telegram fields', () => {
    const normalized = normalizeTelegramUpdate({
      update_id: 1000,
      message: { message_id: 42, text: 'Hello', chat: { id: 123 }, from: { id: 99 } },
    });
    expect(buildTelegramExecutionInput({ workflowId: 'wf1', nodeId: 'n1', normalized })).toMatchObject({
      chatId: '123',
      messageId: 42,
      text: 'Hello',
      trigger: 'telegram',
      workflow_id: 'wf1',
      node_id: 'n1',
      updateId: 1000,
      _telegram: true,
    });
  });

  it('forms setWebhook request with allowed updates and secret token', async () => {
    (connectionService.getDecryptedConnection as jest.Mock).mockResolvedValue({
      id: 'conn-1',
      userId: 'user-1',
      credentialTypeId: 'telegram_bot_token',
      provider: 'telegram',
      credentials: { botToken: '123:abc' },
    });
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, result: { url: '' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, result: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, result: { username: 'my_bot' } }) });

    const result = await registerTelegramWebhook({
      userId: 'user-1',
      workflowId: 'wf1',
      nodeId: 'tg1',
      connectionId: 'conn-1',
      updateTypes: ['message', 'callback_query'],
      secretToken: 'secret-1',
    });

    expect(result.webhookUrl).toBe('https://ctrlchecks.example/api/telegram/webhook/wf1/tg1');
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://api.telegram.org/bot123:abc/setWebhook',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          url: 'https://ctrlchecks.example/api/telegram/webhook/wf1/tg1',
          allowed_updates: ['message', 'callback_query'],
          drop_pending_updates: false,
          secret_token: 'secret-1',
        }),
      }),
    );
  });

  it('auto-registers saved React Flow Telegram trigger nodes using connectionRefs', async () => {
    (connectionService.getDecryptedConnection as jest.Mock).mockResolvedValue({
      id: 'conn-telegram',
      userId: 'user-1',
      credentialTypeId: 'telegram_bot_token',
      provider: 'telegram',
      credentials: { botToken: '123:abc' },
    });
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, result: { url: '' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, result: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, result: { username: 'my_bot' } }) });

    const result = await autoRegisterTelegramWebhooksForWorkflow({
      userId: 'user-1',
      workflow: {
        id: 'wf1',
        status: 'active',
        nodes: [
          {
            id: 'tg1',
            type: 'custom',
            data: {
              type: 'telegram_trigger',
              config: { updateTypes: ['message'] },
              connectionRefs: { telegram_bot_token: 'conn-telegram' },
            },
          },
        ],
      },
    });

    expect(result).toEqual([
      expect.objectContaining({
        nodeId: 'tg1',
        success: true,
        webhookUrl: 'https://ctrlchecks.example/api/telegram/webhook/wf1/tg1',
        connectionId: 'conn-telegram',
      }),
    ]);
    expect(connectionService.getDecryptedConnection).toHaveBeenCalledWith('user-1', 'conn-telegram');
  });
});
