import { createHmac } from 'crypto';
import { config } from '../../core/config';
import { connectionService } from '../../credentials-system/connection-service';
import {
  autoRegisterSlackWebhooksForWorkflow,
  buildSlackExecutionInput,
  normalizeSlackWebhookPayload,
  registerSlackWebhook,
  shouldAcceptSlackEvent,
  validateSlackSignature,
} from './slack-trigger-service';

jest.mock('../../credentials-system/connection-service', () => ({
  connectionService: {
    findCanonicalConnection: jest.fn(),
    findCanonicalConnectionByProvider: jest.fn(),
    getDecryptedConnection: jest.fn(),
  },
}));

const eventCallbackPayload = {
  token: 'verification-token',
  team_id: 'T123',
  api_app_id: 'A123',
  event: {
    type: 'app_mention',
    user: 'U123',
    text: '<@UAPP> hello there',
    ts: '1784260800.000100',
    channel: 'C123',
    event_ts: '1784260800.000100',
  },
  type: 'event_callback',
  event_id: 'Ev123',
  event_time: 1784260800,
};

const slashCommandPayload = {
  token: 'legacy-token',
  team_id: 'T123',
  team_domain: 'example',
  channel_id: 'C123',
  channel_name: 'general',
  user_id: 'U123',
  user_name: 'alice',
  command: '/support',
  text: 'need help',
  response_url: 'https://hooks.slack.com/commands/123',
  trigger_id: 'trigger-1',
};

const interactionPayload = {
  payload: JSON.stringify({
    type: 'block_actions',
    team: { id: 'T123' },
    user: { id: 'U123', username: 'alice' },
    channel: { id: 'C123', name: 'general' },
    message: { ts: '1784260800.000100', thread_ts: '1784260800.000100', text: 'Approve?' },
    trigger_id: 'trigger-2',
    response_url: 'https://hooks.slack.com/actions/123',
    actions: [{ action_id: 'approve', value: 'yes' }],
  }),
};

function signedReq(rawBody: string, signingSecret = 'signing-secret', timestamp = Math.floor(Date.now() / 1000)): any {
  const base = `v0:${timestamp}:${rawBody}`;
  const signature = `v0=${createHmac('sha256', signingSecret).update(base).digest('hex')}`;
  return {
    rawBody: Buffer.from(rawBody),
    body: {},
    headers: {
      'x-slack-request-timestamp': String(timestamp),
      'x-slack-signature': signature,
    },
  };
}

describe('slack-trigger-service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).fetch = jest.fn();
    config.publicBaseUrl = 'https://ctrlchecks.example';
  });

  it('normalizes Slack app mentions into reply-friendly fields', () => {
    const [normalized] = normalizeSlackWebhookPayload(eventCallbackPayload);

    expect(normalized).toMatchObject({
      eventId: 'Ev123',
      eventType: 'app_mention',
      source: 'slack',
      userId: 'U123',
      teamId: 'T123',
      channelId: 'C123',
      chatId: 'C123',
      threadTs: '1784260800.000100',
      messageTs: '1784260800.000100',
      text: '<@UAPP> hello there',
    });
  });

  it('normalizes slash commands and interactions', () => {
    const [slash] = normalizeSlackWebhookPayload(slashCommandPayload);
    expect(slash).toMatchObject({
      eventType: 'slash_command',
      command: '/support',
      text: 'need help',
      channelId: 'C123',
      userId: 'U123',
      responseUrl: 'https://hooks.slack.com/commands/123',
    });

    const [interaction] = normalizeSlackWebhookPayload(interactionPayload);
    expect(interaction).toMatchObject({
      eventType: 'interaction.block_actions',
      actionId: 'approve',
      text: 'yes',
      channelId: 'C123',
      threadTs: '1784260800.000100',
    });
  });

  it('filters by event type, channel, user, team, and slash command', () => {
    const [normalized] = normalizeSlackWebhookPayload(slashCommandPayload);

    expect(shouldAcceptSlackEvent(normalized, {
      eventTypes: ['slash_command'],
      channelIds: 'C123',
      allowedUserIds: 'U123',
      teamId: 'T123',
      commandFilter: '/support',
    })).toEqual({ accepted: true });
    expect(shouldAcceptSlackEvent(normalized, { eventTypes: ['app_mention'] })).toMatchObject({ accepted: false });
    expect(shouldAcceptSlackEvent(normalized, { eventTypes: ['slash_command'], commandFilter: '/other' })).toMatchObject({ accepted: false });
  });

  it('validates Slack HMAC signatures and rejects stale timestamps', async () => {
    const rawBody = JSON.stringify(eventCallbackPayload);
    const req = signedReq(rawBody);

    await expect(validateSlackSignature(req, {
      userId: 'user-1',
      triggerConfig: { signingSecret: 'signing-secret' },
    })).resolves.toBe(true);

    await expect(validateSlackSignature(signedReq(rawBody, 'wrong-secret'), {
      userId: 'user-1',
      triggerConfig: { signingSecret: 'signing-secret' },
    })).resolves.toBe(false);

    await expect(validateSlackSignature(signedReq(rawBody, 'signing-secret', 1), {
      userId: 'user-1',
      triggerConfig: { signingSecret: 'signing-secret' },
    })).resolves.toBe(false);
  });

  it('builds workflow execution input with normalized Slack fields', () => {
    const [normalized] = normalizeSlackWebhookPayload(eventCallbackPayload);
    expect(buildSlackExecutionInput({ workflowId: 'wf1', nodeId: 'slack-node', normalized })).toMatchObject({
      trigger: 'slack',
      workflow_id: 'wf1',
      node_id: 'slack-node',
      channelId: 'C123',
      threadTs: '1784260800.000100',
      _slack: true,
    });
  });

  it('returns webhook URL and verifies Slack connection when registering', async () => {
    (connectionService.getDecryptedConnection as jest.Mock).mockResolvedValue({
      id: 'conn-1',
      userId: 'user-1',
      credentialTypeId: 'slack_oauth2',
      provider: 'slack',
      metadata: { teamId: 'T123' },
      credentials: { accessToken: 'xoxb-token', signingSecret: 'signing-secret' },
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    const result = await registerSlackWebhook({
      userId: 'user-1',
      workflowId: 'wf1',
      nodeId: 'slack-node',
      connectionId: 'conn-1',
    });

    expect(result).toMatchObject({
      success: true,
      webhookUrl: 'https://ctrlchecks.example/api/slack/webhook/wf1/slack-node',
      connectionId: 'conn-1',
      teamId: 'T123',
      manualSetupRequired: true,
      verifiedConnection: true,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://slack.com/api/auth.test',
      expect.objectContaining({ headers: { Authorization: 'Bearer xoxb-token' } }),
    );
  });

  it('auto-registers saved React Flow Slack trigger nodes using connectionRefs', async () => {
    (connectionService.getDecryptedConnection as jest.Mock).mockResolvedValue({
      id: 'conn-slack',
      userId: 'user-1',
      credentialTypeId: 'slack_oauth2',
      provider: 'slack',
      metadata: { teamId: 'T123' },
      credentials: { accessToken: 'xoxb-token', signingSecret: 'signing-secret' },
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    const result = await autoRegisterSlackWebhooksForWorkflow({
      userId: 'user-1',
      workflow: {
        id: 'wf1',
        status: 'active',
        nodes: [
          {
            id: 'slack-node',
            type: 'custom',
            data: {
              type: 'slack_trigger',
              config: { eventTypes: ['app_mention'] },
              connectionRefs: { slack_oauth2: 'conn-slack' },
            },
          },
        ],
      },
    });

    expect(result).toEqual([
      expect.objectContaining({
        nodeId: 'slack-node',
        success: true,
        webhookUrl: 'https://ctrlchecks.example/api/slack/webhook/wf1/slack-node',
        connectionId: 'conn-slack',
      }),
    ]);
  });
});
