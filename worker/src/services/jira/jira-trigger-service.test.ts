import { config } from '../../core/config';
import { retrieveCredential } from '../../core/utils/credential-retriever';
import { getRedisClient } from '../../shared/redis-client';
import {
  autoRegisterJiraWebhooksForWorkflow,
  buildJiraExecutionInput,
  normalizeJiraEvent,
  registerJiraWebhook,
  resolveJiraCredential,
  shouldAcceptJiraEvent,
  unregisterJiraWebhook,
  validateJiraSecret,
  validateJiraWebhookSecret,
} from './jira-trigger-service';

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
  id: '10002',
  key: 'PROJ-123',
  self: 'https://yourcompany.atlassian.net/rest/api/2/issue/10002',
  fields: {
    summary: 'Bug: something broke',
    issuetype: { name: 'Bug' },
    status: { name: 'To Do' },
    project: { key: 'PROJ' },
  },
};

const userPayload = { accountId: 'acc-1', displayName: 'Jane Doe', emailAddress: 'jane@example.com' };

describe('jira-trigger-service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).fetch = jest.fn();
    config.publicBaseUrl = 'https://ctrlchecks.example';
  });

  it('returns null when webhookEvent is missing', () => {
    expect(normalizeJiraEvent({})).toBeNull();
    expect(normalizeJiraEvent({ webhookEvent: '' })).toBeNull();
  });

  it('normalizes a jira:issue_created event', () => {
    const normalized = normalizeJiraEvent({
      webhookEvent: 'jira:issue_created',
      timestamp: 1700000000000,
      issue: issuePayload,
      user: userPayload,
    });
    expect(normalized).toMatchObject({
      eventId: '10002',
      eventType: 'jira:issue_created',
      source: 'jira',
      issueKey: 'PROJ-123',
      issueId: '10002',
      issueSummary: 'Bug: something broke',
      issueType: 'Bug',
      issueStatus: 'To Do',
      projectKey: 'PROJ',
      siteUrl: 'https://yourcompany.atlassian.net',
      issueUrl: 'https://yourcompany.atlassian.net/browse/PROJ-123',
      userId: 'acc-1',
      username: 'Jane Doe',
      text: 'Bug: something broke',
    });
  });

  it('normalizes jira:issue_updated and jira:issue_deleted events', () => {
    const updated = normalizeJiraEvent({ webhookEvent: 'jira:issue_updated', issue: issuePayload });
    expect(updated).toMatchObject({ eventType: 'jira:issue_updated', issueKey: 'PROJ-123' });

    const deleted = normalizeJiraEvent({ webhookEvent: 'jira:issue_deleted', issue: issuePayload });
    expect(deleted).toMatchObject({ eventType: 'jira:issue_deleted', issueKey: 'PROJ-123' });
  });

  it('normalizes comment_created/updated/deleted events with commentBody and commentUrl', () => {
    const comment = {
      id: '5001',
      body: 'Can you clarify?',
      self: 'https://yourcompany.atlassian.net/rest/api/2/issue/10002/comment/5001',
      author: userPayload,
    };
    const created = normalizeJiraEvent({ webhookEvent: 'comment_created', issue: issuePayload, comment });
    expect(created).toMatchObject({
      eventType: 'comment_created',
      eventId: '5001',
      commentBody: 'Can you clarify?',
      commentUrl: comment.self,
      issueKey: 'PROJ-123',
      userId: 'acc-1',
    });

    const updated = normalizeJiraEvent({ webhookEvent: 'comment_updated', issue: issuePayload, comment });
    expect(updated).toMatchObject({ eventType: 'comment_updated', commentBody: 'Can you clarify?' });

    const deleted = normalizeJiraEvent({ webhookEvent: 'comment_deleted', issue: issuePayload, comment });
    expect(deleted).toMatchObject({ eventType: 'comment_deleted', commentBody: 'Can you clarify?' });
  });

  it('falls back to a generic envelope for unhandled webhookEvent values', () => {
    const normalized = normalizeJiraEvent({ webhookEvent: 'worklog_created', issue: issuePayload });
    expect(normalized).toMatchObject({ eventType: 'worklog_created', projectKey: 'PROJ' });
  });

  it('validates the webhook secret with a plain constant-time compare (not HMAC/JWT)', () => {
    expect(validateJiraSecret('my-secret', 'my-secret')).toBe(true);
    expect(validateJiraSecret('my-secret', 'wrong-secret')).toBe(false);
    expect(validateJiraSecret('', 'my-secret')).toBe(false);
    expect(validateJiraSecret('my-secret', '')).toBe(false);
  });

  it('filters events by configured event types, project key, and keyword query', () => {
    const normalized = normalizeJiraEvent({
      webhookEvent: 'jira:issue_created',
      issue: issuePayload,
    })!;
    expect(shouldAcceptJiraEvent(normalized, {})).toEqual({ accepted: true });
    expect(shouldAcceptJiraEvent(normalized, { eventTypes: 'jira:issue_created' })).toEqual({ accepted: true });
    expect(shouldAcceptJiraEvent(normalized, { eventTypes: 'comment_created' })).toMatchObject({ accepted: false });
    expect(shouldAcceptJiraEvent(normalized, { projectKey: 'PROJ' })).toEqual({ accepted: true });
    expect(shouldAcceptJiraEvent(normalized, { projectKey: 'OTHER' })).toMatchObject({ accepted: false });
    expect(shouldAcceptJiraEvent(normalized, { query: 'broke' })).toEqual({ accepted: true });
    expect(shouldAcceptJiraEvent(normalized, { query: 'unrelated-keyword' })).toMatchObject({ accepted: false });
  });

  it('builds workflow execution input with normalized Jira fields', () => {
    const normalized = normalizeJiraEvent({ webhookEvent: 'jira:issue_created', issue: issuePayload })!;
    expect(buildJiraExecutionInput({ workflowId: 'wf1', nodeId: 'jira-node', normalized })).toMatchObject({
      trigger: 'jira',
      workflow_id: 'wf1',
      node_id: 'jira-node',
      issueKey: 'PROJ-123',
      _jira: true,
    });
  });

  it('resolves the jira_api_key Basic Auth credential (email + apiToken + domain), not a bearer token', async () => {
    (retrieveCredential as jest.Mock).mockResolvedValue(
      JSON.stringify({ username: 'jane@example.com', password: 'api-token-123', domain: 'yourcompany.atlassian.net' }),
    );
    const credential = await resolveJiraCredential('user-1');
    expect(credential).toEqual({
      email: 'jane@example.com',
      apiToken: 'api-token-123',
      siteUrl: 'https://yourcompany.atlassian.net',
    });
  });

  it('throws a clear error when no Jira credential is saved', async () => {
    (retrieveCredential as jest.Mock).mockResolvedValue(null);
    await expect(resolveJiraCredential('user-1')).rejects.toThrow('No active Jira connection found');
  });

  it('registers a webhook without calling any Jira API — manual setup only', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(
      JSON.stringify({ username: 'jane@example.com', password: 'api-token-123', domain: 'yourcompany.atlassian.net' }),
    );
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

    const result = await registerJiraWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'jira-node', projectKey: 'proj' });

    expect(result).toMatchObject({
      success: true,
      siteUrl: 'https://yourcompany.atlassian.net',
      projectKey: 'PROJ',
      manualSetupRequired: true,
      verifiedConnection: true,
    });
    expect(result.webhookUrl).toContain('https://ctrlchecks.example/api/jira/webhook/wf1/jira-node?secret=');

    // Only the credential-verification call (GET .../myself) is made — no webhook
    // registration API call, since Jira restricts that endpoint to Connect/OAuth apps.
    expect((global.fetch as jest.Mock).mock.calls).toHaveLength(1);
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://yourcompany.atlassian.net/rest/api/3/myself');

    const secret = new URL(result.webhookUrl).searchParams.get('secret')!;
    await expect(validateJiraWebhookSecret('wf1', 'jira-node', secret)).resolves.toBe(true);
    await expect(validateJiraWebhookSecret('wf1', 'jira-node', 'wrong-secret')).resolves.toBe(false);
  });

  it('still registers (with verifiedConnection false) when the credential verification call fails', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(
      JSON.stringify({ username: 'jane@example.com', password: 'bad-token', domain: 'yourcompany.atlassian.net' }),
    );
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' });

    const result = await registerJiraWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'jira-node' });
    expect(result).toMatchObject({ success: true, manualSetupRequired: true, verifiedConnection: false });
  });

  it('auto-registers saved Jira trigger nodes for an active workflow', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(
      JSON.stringify({ username: 'jane@example.com', password: 'api-token-123', domain: 'yourcompany.atlassian.net' }),
    );
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

    const result = await autoRegisterJiraWebhooksForWorkflow({
      userId: 'user-1',
      workflow: {
        id: 'wf1',
        status: 'active',
        nodes: [
          { id: 'jira-node', type: 'custom', data: { type: 'jira_trigger', config: { projectKey: 'PROJ' } } },
        ],
      },
    });

    expect(result).toEqual([
      expect.objectContaining({ nodeId: 'jira-node', success: true, projectKey: 'PROJ', manualSetupRequired: true }),
    ]);
  });

  it('does not auto-register for inactive workflows or workflows with no Jira trigger nodes', async () => {
    const inactive = await autoRegisterJiraWebhooksForWorkflow({
      userId: 'user-1',
      workflow: { id: 'wf1', status: 'draft', nodes: [{ id: 'n1', data: { type: 'jira_trigger', config: {} } }] },
    });
    expect(inactive).toEqual([]);

    const noTrigger = await autoRegisterJiraWebhooksForWorkflow({
      userId: 'user-1',
      workflow: { id: 'wf1', status: 'active', nodes: [{ id: 'n1', data: { type: 'slack_trigger', config: {} } }] },
    });
    expect(noTrigger).toEqual([]);
  });

  it('unregisters by clearing local state only (nothing was ever registered against a Jira API)', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(
      JSON.stringify({ username: 'jane@example.com', password: 'api-token-123', domain: 'yourcompany.atlassian.net' }),
    );
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

    await registerJiraWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'jira-node' });
    const result = await unregisterJiraWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'jira-node' });
    expect(result).toEqual({ success: true, manualSetupRequired: true });
    expect(fakeRedis.del).toHaveBeenCalled();
  });
});
