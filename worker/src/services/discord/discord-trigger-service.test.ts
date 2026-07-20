import { generateKeyPairSync, sign } from 'crypto';
import { config } from '../../core/config';
import { connectionService } from '../../credentials-system/connection-service';
import {
  autoRegisterDiscordWebhooksForWorkflow,
  buildDiscordExecutionInput,
  normalizeDiscordWebhookPayload,
  registerDiscordWebhook,
  shouldAcceptDiscordEvent,
  validateDiscordSignature,
} from './discord-trigger-service';

jest.mock('../../credentials-system/connection-service', () => ({
  connectionService: {
    findCanonicalConnection: jest.fn(),
    findCanonicalConnectionByProvider: jest.fn(),
    getDecryptedConnection: jest.fn(),
  },
}));

const slashCommandPayload = {
  id: 'interaction-1',
  application_id: 'app-123',
  type: 2,
  token: 'interaction-token',
  guild_id: 'guild-123',
  channel_id: 'channel-123',
  member: { user: { id: 'user-123', username: 'alice' } },
  data: {
    id: 'cmd-1',
    type: 1,
    name: 'support',
    options: [{ name: 'topic', value: 'billing' }],
  },
};

const componentPayload = {
  id: 'interaction-2',
  application_id: 'app-123',
  type: 3,
  token: 'interaction-token-2',
  guild_id: 'guild-123',
  channel_id: 'channel-123',
  user: { id: 'user-123', username: 'alice' },
  message: { id: 'message-123', content: 'Approve?' },
  data: { custom_id: 'approve_ticket' },
};

const messagePayload = {
  t: 'MESSAGE_CREATE',
  d: {
    id: 'message-123',
    channel_id: 'channel-123',
    guild_id: 'guild-123',
    content: 'hello bot',
    timestamp: '2026-07-17T12:00:00.000Z',
    author: { id: 'user-123', username: 'alice' },
  },
};

function signedReq(rawBody: string, privateKey: any, timestamp = Math.floor(Date.now() / 1000)): any {
  const signature = sign(null, Buffer.from(`${timestamp}${rawBody}`), privateKey).toString('hex');
  return {
    rawBody: Buffer.from(rawBody),
    body: {},
    headers: {
      'x-signature-timestamp': String(timestamp),
      'x-signature-ed25519': signature,
    },
  };
}

describe('discord-trigger-service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).fetch = jest.fn();
    config.publicBaseUrl = 'https://ctrlchecks.example';
  });

  it('normalizes Discord slash commands into reply-friendly fields', () => {
    const [normalized] = normalizeDiscordWebhookPayload(slashCommandPayload);

    expect(normalized).toMatchObject({
      eventId: 'interaction-1',
      eventType: 'slash_command',
      source: 'discord',
      applicationId: 'app-123',
      guildId: 'guild-123',
      channelId: 'channel-123',
      chatId: 'channel-123',
      command: '/support',
      text: 'topic:billing',
      userId: 'user-123',
      interactionToken: 'interaction-token',
    });
  });

  it('normalizes components and message-shaped events', () => {
    const [component] = normalizeDiscordWebhookPayload(componentPayload);
    expect(component).toMatchObject({
      eventType: 'interaction.component',
      customId: 'approve_ticket',
      messageId: 'message-123',
      text: 'Approve?',
    });

    const [message] = normalizeDiscordWebhookPayload(messagePayload);
    expect(message).toMatchObject({
      eventType: 'message',
      rawEventType: 'MESSAGE_CREATE',
      text: 'hello bot',
      channelId: 'channel-123',
      userId: 'user-123',
    });
  });

  it('filters by event type, guild, channel, user, app, and command', () => {
    const [normalized] = normalizeDiscordWebhookPayload(slashCommandPayload);

    expect(shouldAcceptDiscordEvent(normalized, {
      eventTypes: 'slash_command',
      guildIds: 'guild-123',
      channelIds: 'channel-123',
      allowedUserIds: 'user-123',
      applicationId: 'app-123',
      commandFilter: '/support',
    })).toEqual({ accepted: true });
    expect(shouldAcceptDiscordEvent(normalized, { eventTypes: 'message' })).toMatchObject({ accepted: false });
    expect(shouldAcceptDiscordEvent(normalized, { eventTypes: 'slash_command', commandFilter: '/other' })).toMatchObject({ accepted: false });
  });

  it('validates Discord Ed25519 signatures and rejects stale timestamps', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const publicKeyHex = Buffer.from(publicKey.export({ format: 'der', type: 'spki' }) as Buffer).subarray(-32).toString('hex');
    const rawBody = JSON.stringify(slashCommandPayload);

    await expect(validateDiscordSignature(signedReq(rawBody, privateKey), {
      userId: 'user-1',
      triggerConfig: { publicKey: publicKeyHex },
    })).resolves.toBe(true);

    const badReq = signedReq(rawBody, privateKey);
    badReq.headers['x-signature-ed25519'] = '00'.repeat(64);
    await expect(validateDiscordSignature(badReq, {
      userId: 'user-1',
      triggerConfig: { publicKey: publicKeyHex },
    })).resolves.toBe(false);

    await expect(validateDiscordSignature(signedReq(rawBody, privateKey, 1), {
      userId: 'user-1',
      triggerConfig: { publicKey: publicKeyHex },
    })).resolves.toBe(false);
  });

  it('builds workflow execution input with normalized Discord fields', () => {
    const [normalized] = normalizeDiscordWebhookPayload(slashCommandPayload);
    expect(buildDiscordExecutionInput({ workflowId: 'wf1', nodeId: 'discord-node', normalized })).toMatchObject({
      trigger: 'discord',
      workflow_id: 'wf1',
      node_id: 'discord-node',
      channelId: 'channel-123',
      command: '/support',
      _discord: true,
    });
  });

  it('returns webhook URL and verifies Discord connection when registering', async () => {
    (connectionService.getDecryptedConnection as jest.Mock).mockResolvedValue({
      id: 'conn-1',
      userId: 'user-1',
      credentialTypeId: 'discord_bot_token',
      provider: 'discord',
      metadata: { applicationId: 'app-123' },
      credentials: { token: 'bot-token', publicKey: 'a'.repeat(64) },
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'bot-1' }) });

    const result = await registerDiscordWebhook({
      userId: 'user-1',
      workflowId: 'wf1',
      nodeId: 'discord-node',
      connectionId: 'conn-1',
    });

    expect(result).toMatchObject({
      success: true,
      webhookUrl: 'https://ctrlchecks.example/api/discord/webhook/wf1/discord-node',
      connectionId: 'conn-1',
      applicationId: 'app-123',
      manualSetupRequired: true,
      verifiedConnection: true,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://discord.com/api/v10/users/@me',
      expect.objectContaining({ headers: { Authorization: 'Bot bot-token' } }),
    );
  });

  it('auto-registers saved React Flow Discord trigger nodes using connectionRefs', async () => {
    (connectionService.getDecryptedConnection as jest.Mock).mockResolvedValue({
      id: 'conn-discord',
      userId: 'user-1',
      credentialTypeId: 'discord_bot_token',
      provider: 'discord',
      metadata: { applicationId: 'app-123' },
      credentials: { token: 'bot-token', publicKey: 'a'.repeat(64) },
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'bot-1' }) });

    const result = await autoRegisterDiscordWebhooksForWorkflow({
      userId: 'user-1',
      workflow: {
        id: 'wf1',
        status: 'active',
        nodes: [
          {
            id: 'discord-node',
            type: 'custom',
            data: {
              type: 'discord_trigger',
              config: { eventTypes: ['slash_command'] },
              connectionRefs: { discord_bot_token: 'conn-discord' },
            },
          },
        ],
      },
    });

    expect(result).toEqual([
      expect.objectContaining({
        nodeId: 'discord-node',
        success: true,
        webhookUrl: 'https://ctrlchecks.example/api/discord/webhook/wf1/discord-node',
        connectionId: 'conn-discord',
      }),
    ]);
  });
});
