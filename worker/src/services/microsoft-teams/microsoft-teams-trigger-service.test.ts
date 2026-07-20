import { config } from '../../core/config';
import { connectionService } from '../../credentials-system/connection-service';
import {
  autoRegisterMicrosoftTeamsWebhooksForWorkflow,
  buildMicrosoftTeamsExecutionInput,
  normalizeMicrosoftTeamsActivity,
  registerMicrosoftTeamsWebhook,
  shouldAcceptMicrosoftTeamsEvent,
  validateMicrosoftTeamsRequest,
} from './microsoft-teams-trigger-service';

jest.mock('../../credentials-system/connection-service', () => ({
  connectionService: {
    findCanonicalConnection: jest.fn(),
    findCanonicalConnectionByProvider: jest.fn(),
    getDecryptedConnection: jest.fn(),
  },
}));

const teamsMessageActivity = {
  type: 'message',
  id: 'activity-1',
  timestamp: '2026-07-17T12:00:00.000Z',
  serviceUrl: 'https://smba.trafficmanager.net/amer/',
  channelId: 'msteams',
  from: { id: '29:user', aadObjectId: 'user-aad-1', name: 'Alice' },
  conversation: { id: 'conversation-1' },
  text: 'hello teams bot',
  channelData: {
    tenant: { id: 'tenant-1' },
    team: { id: 'team-1' },
    channel: { id: 'channel-1' },
  },
};

describe('microsoft-teams-trigger-service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).fetch = jest.fn();
    config.publicBaseUrl = 'https://ctrlchecks.example';
  });

  it('normalizes Teams message activities into reply-friendly fields', () => {
    const [normalized] = normalizeMicrosoftTeamsActivity(teamsMessageActivity);

    expect(normalized).toMatchObject({
      eventId: 'activity-1',
      eventType: 'message',
      source: 'microsoft_teams',
      userId: 'user-aad-1',
      username: 'Alice',
      text: 'hello teams bot',
      tenantId: 'tenant-1',
      teamId: 'team-1',
      channelId: 'channel-1',
      chatId: 'channel-1',
      conversationId: 'conversation-1',
      serviceUrl: 'https://smba.trafficmanager.net/amer/',
      replyToId: 'activity-1',
    });
  });

  it('filters by event type, tenant, team, channel, and user', () => {
    const [normalized] = normalizeMicrosoftTeamsActivity(teamsMessageActivity);

    expect(shouldAcceptMicrosoftTeamsEvent(normalized, {
      eventTypes: 'message',
      tenantId: 'tenant-1',
      teamIds: 'team-1',
      channelIds: 'channel-1',
      allowedUserIds: 'user-aad-1',
    })).toEqual({ accepted: true });
    expect(shouldAcceptMicrosoftTeamsEvent(normalized, { eventTypes: 'invoke' })).toMatchObject({ accepted: false });
    expect(shouldAcceptMicrosoftTeamsEvent(normalized, { eventTypes: 'message', tenantId: 'other' })).toMatchObject({ accepted: false });
  });

  it('validates configured shared secret for simulations', async () => {
    const req: any = {
      body: teamsMessageActivity,
      headers: { 'x-ms-teams-secret': 'secret-1' },
      query: {},
    };

    await expect(validateMicrosoftTeamsRequest(req, {
      userId: 'user-1',
      triggerConfig: { validationSecret: 'secret-1' },
    })).resolves.toBe(true);

    await expect(validateMicrosoftTeamsRequest({
      ...req,
      headers: { 'x-ms-teams-secret': 'wrong' },
    }, {
      userId: 'user-1',
      triggerConfig: { validationSecret: 'secret-1' },
    })).resolves.toBe(false);
  });

  it('builds workflow execution input with normalized Teams fields', () => {
    const [normalized] = normalizeMicrosoftTeamsActivity(teamsMessageActivity);
    expect(buildMicrosoftTeamsExecutionInput({ workflowId: 'wf1', nodeId: 'teams-node', normalized })).toMatchObject({
      trigger: 'microsoft_teams',
      workflow_id: 'wf1',
      node_id: 'teams-node',
      conversationId: 'conversation-1',
      serviceUrl: 'https://smba.trafficmanager.net/amer/',
      _microsoftTeams: true,
    });
  });

  it('returns webhook URL when registering a Teams bot trigger', async () => {
    (connectionService.getDecryptedConnection as jest.Mock).mockResolvedValue({
      id: 'conn-1',
      userId: 'user-1',
      credentialTypeId: 'microsoft_teams_bot',
      provider: 'microsoft_teams',
      metadata: {},
      credentials: { appId: 'app-1', appPassword: 'password', validationSecret: 'secret-1' },
    });

    const result = await registerMicrosoftTeamsWebhook({
      userId: 'user-1',
      workflowId: 'wf1',
      nodeId: 'teams-node',
      connectionId: 'conn-1',
    });

    expect(result).toMatchObject({
      success: true,
      webhookUrl: 'https://ctrlchecks.example/api/microsoft-teams/webhook/wf1/teams-node',
      connectionId: 'conn-1',
      appId: 'app-1',
      manualSetupRequired: true,
      verifiedConnection: true,
    });
  });

  it('auto-registers saved React Flow Teams trigger nodes using connectionRefs', async () => {
    (connectionService.getDecryptedConnection as jest.Mock).mockResolvedValue({
      id: 'conn-teams',
      userId: 'user-1',
      credentialTypeId: 'microsoft_teams_bot',
      provider: 'microsoft_teams',
      metadata: {},
      credentials: { appId: 'app-1' },
    });

    const result = await autoRegisterMicrosoftTeamsWebhooksForWorkflow({
      userId: 'user-1',
      workflow: {
        id: 'wf1',
        status: 'active',
        nodes: [
          {
            id: 'teams-node',
            type: 'custom',
            data: {
              type: 'microsoft_teams_trigger',
              config: { eventTypes: ['message'] },
              connectionRefs: { microsoft_teams_bot: 'conn-teams' },
            },
          },
        ],
      },
    });

    expect(result).toEqual([
      expect.objectContaining({
        nodeId: 'teams-node',
        success: true,
        webhookUrl: 'https://ctrlchecks.example/api/microsoft-teams/webhook/wf1/teams-node',
        connectionId: 'conn-teams',
      }),
    ]);
  });
});
