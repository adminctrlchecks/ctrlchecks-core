import { createHmac } from 'crypto';
import { config } from '../../core/config';
import { retrieveCredential } from '../../core/utils/credential-retriever';
import { getRedisClient } from '../../shared/redis-client';
import {
  autoRegisterLinearWebhooksForWorkflow,
  buildLinearExecutionInput,
  isLinearTimestampFresh,
  normalizeLinearEvent,
  registerLinearWebhook,
  resolveLinearCredential,
  shouldAcceptLinearEvent,
  unregisterLinearWebhook,
  validateLinearSignature,
  validateLinearWebhookSecret,
} from './linear-trigger-service';

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

const issuePayload = {
  action: 'create',
  type: 'Issue',
  createdAt: '2026-07-18T10:00:00.000Z',
  organizationId: 'org-1',
  webhookId: 'webhook-1',
  webhookTimestamp: Date.now(),
  url: 'https://linear.app/acme/issue/ENG-123/fix-billing',
  actor: { id: 'user-1', name: 'Jane Doe', email: 'jane@example.com' },
  data: {
    id: 'issue-1',
    identifier: 'ENG-123',
    title: 'Fix billing retry',
    url: 'https://linear.app/acme/issue/ENG-123/fix-billing',
    team: { id: 'team-1', key: 'ENG', name: 'Engineering' },
    state: { id: 'state-1', name: 'Todo' },
    assignee: { id: 'user-2', name: 'Sam Dev' },
  },
};

describe('linear-trigger-service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).fetch = jest.fn();
    config.publicBaseUrl = 'https://ctrlchecks.example';
  });

  it('returns null when payload has no action or entity type', () => {
    expect(normalizeLinearEvent({})).toBeNull();
  });

  it('normalizes issue creation events with issue/team/actor fields', () => {
    const normalized = normalizeLinearEvent(issuePayload, {
      deliveryId: 'delivery-1',
      linearEvent: 'Issue',
      timestamp: String(issuePayload.webhookTimestamp),
    });
    expect(normalized).toMatchObject({
      eventId: 'delivery-1',
      eventType: 'issue_created',
      source: 'linear',
      userId: 'user-1',
      username: 'Jane Doe',
      issueId: 'issue-1',
      issueIdentifier: 'ENG-123',
      issueTitle: 'Fix billing retry',
      teamId: 'team-1',
      teamKey: 'ENG',
      stateId: 'state-1',
      assigneeId: 'user-2',
      text: 'Fix billing retry',
    });
  });

  it('normalizes comment and project update events', () => {
    const comment = normalizeLinearEvent({
      action: 'create',
      type: 'Comment',
      webhookTimestamp: Date.now(),
      actor: { id: 'user-1', name: 'Jane Doe' },
      data: {
        id: 'comment-1',
        body: 'Needs QA',
        issueId: 'issue-1',
        issue: { id: 'issue-1', identifier: 'ENG-123', title: 'Fix billing retry' },
      },
    });
    expect(comment).toMatchObject({ eventType: 'comment_created', commentId: 'comment-1', commentBody: 'Needs QA', issueId: 'issue-1' });

    const project = normalizeLinearEvent({
      action: 'update',
      type: 'Project',
      webhookTimestamp: Date.now(),
      data: { id: 'project-1', name: 'Billing hardening' },
    });
    expect(project).toMatchObject({ eventType: 'project_updated', projectId: 'project-1', projectName: 'Billing hardening' });
  });

  it('validates Linear HMAC-SHA256 hex signatures using the raw body', () => {
    const rawBody = Buffer.from(JSON.stringify({ hello: 'world' }));
    const secret = 'linear-webhook-secret';
    const signature = createHmac('sha256', secret).update(rawBody).digest('hex');
    expect(validateLinearSignature(rawBody, signature, secret)).toBe(true);
    expect(validateLinearSignature(rawBody, signature, 'wrong-secret')).toBe(false);
    expect(validateLinearSignature(rawBody, 'not-hex', secret)).toBe(false);
  });

  it('enforces the Linear one-minute webhook timestamp freshness window', () => {
    const now = Date.now();
    expect(isLinearTimestampFresh(now, now)).toBe(true);
    expect(isLinearTimestampFresh(now - 59_000, now)).toBe(true);
    expect(isLinearTimestampFresh(now - 61_000, now)).toBe(false);
    expect(isLinearTimestampFresh('', now)).toBe(false);
  });

  it('filters events by type, team, issue, project, actor, and query', () => {
    const normalized = normalizeLinearEvent(issuePayload)!;
    expect(shouldAcceptLinearEvent(normalized, {})).toEqual({ accepted: true });
    expect(shouldAcceptLinearEvent(normalized, { eventTypes: 'issue_created' })).toEqual({ accepted: true });
    expect(shouldAcceptLinearEvent(normalized, { eventTypes: 'comment_created' })).toMatchObject({ accepted: false });
    expect(shouldAcceptLinearEvent(normalized, { teamId: 'team-1', issueId: 'ENG-123', actorId: 'user-1' })).toEqual({ accepted: true });
    expect(shouldAcceptLinearEvent(normalized, { teamId: 'other-team' })).toMatchObject({ accepted: false });
    expect(shouldAcceptLinearEvent(normalized, { projectId: 'project-1' })).toEqual({ accepted: true });
    expect(shouldAcceptLinearEvent(normalized, { query: 'billing' })).toEqual({ accepted: true });
    expect(shouldAcceptLinearEvent(normalized, { query: 'unrelated-keyword' })).toMatchObject({ accepted: false });
  });

  it('builds workflow execution input with normalized Linear fields', () => {
    const normalized = normalizeLinearEvent(issuePayload)!;
    expect(buildLinearExecutionInput({ workflowId: 'wf1', nodeId: 'linear-node', normalized })).toMatchObject({
      trigger: 'linear',
      workflow_id: 'wf1',
      node_id: 'linear-node',
      issueId: 'issue-1',
      _linear: true,
    });
  });

  it('resolves personal API key credentials and preserves raw lin_api authorization format', async () => {
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ token: 'lin_api_key-1' }));
    await expect(resolveLinearCredential('user-1')).resolves.toEqual({ token: 'lin_api_key-1', authHeader: 'lin_api_key-1' });
  });

  it('resolves OAuth credentials as Bearer tokens', async () => {
    (retrieveCredential as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify({ access_token: 'oauth-token-1' }));
    await expect(resolveLinearCredential('user-1')).resolves.toEqual({ token: 'oauth-token-1', authHeader: 'Bearer oauth-token-1' });
  });

  it('registers a Linear webhook, stores the returned signing secret, and validates deliveries', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ token: 'lin_api_key-1' }));
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        data: {
          webhookCreate: {
            success: true,
            webhook: {
              id: 'linear-hook-1',
              enabled: true,
              url: 'https://ctrlchecks.example/api/linear/webhook/wf1/linear-node',
              team: { id: 'team-1', name: 'Engineering', key: 'ENG' },
            },
          },
        },
      }),
    });

    const result = await registerLinearWebhook({
      userId: 'user-1',
      workflowId: 'wf1',
      nodeId: 'linear-node',
      teamId: 'team-1',
      resourceTypes: 'Issue, Comment',
    });
    expect(result).toMatchObject({
      success: true,
      webhookUrl: 'https://ctrlchecks.example/api/linear/webhook/wf1/linear-node',
      webhookId: 'linear-hook-1',
      webhookSecret: expect.any(String),
      teamId: 'team-1',
      resourceTypes: ['Issue', 'Comment'],
    });

    const [url, requestInit] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://api.linear.app/graphql');
    expect(requestInit.headers.Authorization).toBe('lin_api_key-1');
    const body = JSON.parse(requestInit.body);
    expect(body.variables.input).toMatchObject({
      label: 'CtrlChecks workflow wf1 node linear-node',
      url: 'https://ctrlchecks.example/api/linear/webhook/wf1/linear-node',
      secret: result.webhookSecret,
      teamId: 'team-1',
      resourceTypes: ['Issue', 'Comment'],
    });

    const rawBody = Buffer.from(JSON.stringify({ webhookTimestamp: Date.now(), data: { id: 'issue-1' } }));
    const signature = createHmac('sha256', result.webhookSecret).update(rawBody).digest('hex');
    await expect(validateLinearWebhookSecret({
      workflowId: 'wf1',
      nodeId: 'linear-node',
      rawBody,
      signatureHeader: signature,
      timestampValue: Date.now(),
    })).resolves.toBe(true);
  });

  it('auto-registers active Linear trigger nodes for all public teams by default', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ token: 'lin_api_key-1' }));
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        data: { webhookCreate: { success: true, webhook: { id: 'linear-hook-1', secret: 'secret-1', enabled: true } } },
      }),
    });

    const result = await autoRegisterLinearWebhooksForWorkflow({
      userId: 'user-1',
      workflow: {
        id: 'wf1',
        status: 'active',
        nodes: [
          { id: 'linear-node', type: 'custom', data: { type: 'linear_trigger', config: { resourceTypes: 'Issue' } } },
        ],
      },
    });

    expect(result).toEqual([
      expect.objectContaining({ nodeId: 'linear-node', success: true, webhookId: 'linear-hook-1', allPublicTeams: true }),
    ]);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.variables.input).toMatchObject({ allPublicTeams: true, resourceTypes: ['Issue'] });
  });

  it('unregisters a webhook and clears local state', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ token: 'lin_api_key-1' }));
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          data: { webhookCreate: { success: true, webhook: { id: 'linear-hook-1', secret: 'secret-1', enabled: true } } },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ data: { webhookDelete: { success: true } } }),
      });

    await registerLinearWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'linear-node' });
    const result = await unregisterLinearWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'linear-node' });
    expect(result).toEqual({ success: true });
    expect(fakeRedis.del).toHaveBeenCalled();
  });
});
