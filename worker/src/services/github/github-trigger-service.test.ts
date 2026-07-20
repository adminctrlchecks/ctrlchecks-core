import { createHmac } from 'crypto';
import { config } from '../../core/config';
import { retrieveCredential } from '../../core/utils/credential-retriever';
import { getRedisClient } from '../../shared/redis-client';
import {
  autoRegisterGithubWebhooksForWorkflow,
  buildGithubExecutionInput,
  normalizeGithubEvent,
  registerGithubWebhook,
  shouldAcceptGithubEvent,
  unregisterGithubWebhook,
  validateGithubSignature,
  validateGithubWebhookSecret,
} from './github-trigger-service';

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

const repoPayload = { full_name: 'octocat/Hello-World' };
const senderPayload = { login: 'octocat', id: 583231 };

describe('github-trigger-service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).fetch = jest.fn();
    config.publicBaseUrl = 'https://ctrlchecks.example';
  });

  it('returns null for the ping event', () => {
    expect(normalizeGithubEvent('ping', 'delivery-1', { zen: 'Keep it logically awesome.' })).toBeNull();
    expect(normalizeGithubEvent('', 'delivery-1', {})).toBeNull();
  });

  it('normalizes a push event', () => {
    const normalized = normalizeGithubEvent('push', 'delivery-1', {
      ref: 'refs/heads/main',
      repository: repoPayload,
      sender: senderPayload,
      commits: [{ id: 'sha1', message: 'first commit' }, { id: 'sha2', message: 'second commit' }],
    });
    expect(normalized).toMatchObject({
      eventId: 'delivery-1',
      eventType: 'push',
      source: 'github',
      repository: 'octocat/Hello-World',
      ref: 'refs/heads/main',
      username: 'octocat',
      userId: '583231',
      text: 'second commit',
    });
    expect(normalized?.commits).toHaveLength(2);
  });

  it('normalizes an issues event with action-qualified eventType', () => {
    const normalized = normalizeGithubEvent('issues', 'delivery-2', {
      action: 'opened',
      repository: repoPayload,
      sender: senderPayload,
      issue: { number: 42, title: 'Bug: something broke', html_url: 'https://github.com/octocat/Hello-World/issues/42' },
    });
    expect(normalized).toMatchObject({
      eventType: 'issues.opened',
      action: 'opened',
      issueNumber: 42,
      issueTitle: 'Bug: something broke',
      issueUrl: 'https://github.com/octocat/Hello-World/issues/42',
    });
  });

  it('normalizes a pull_request event, including merged state', () => {
    const normalized = normalizeGithubEvent('pull_request', 'delivery-3', {
      action: 'closed',
      repository: repoPayload,
      sender: senderPayload,
      pull_request: { number: 7, title: 'Add feature', html_url: 'https://github.com/octocat/Hello-World/pull/7', merged: true, head: { ref: 'feature-branch' } },
    });
    expect(normalized).toMatchObject({
      eventType: 'pull_request.closed',
      prNumber: 7,
      prTitle: 'Add feature',
      merged: true,
      ref: 'feature-branch',
    });
  });

  it('normalizes a release event', () => {
    const normalized = normalizeGithubEvent('release', 'delivery-4', {
      action: 'published',
      repository: repoPayload,
      sender: senderPayload,
      release: { tag_name: 'v1.0.0', name: 'Release v1.0.0' },
    });
    expect(normalized).toMatchObject({
      eventType: 'release.published',
      releaseTag: 'v1.0.0',
      releaseName: 'Release v1.0.0',
    });
  });

  it('normalizes an issue_comment event', () => {
    const normalized = normalizeGithubEvent('issue_comment', 'delivery-5', {
      action: 'created',
      repository: repoPayload,
      sender: senderPayload,
      issue: { number: 3, title: 'Question', html_url: 'https://github.com/octocat/Hello-World/issues/3' },
      comment: { body: 'Can you clarify?', html_url: 'https://github.com/octocat/Hello-World/issues/3#issuecomment-1' },
    });
    expect(normalized).toMatchObject({
      eventType: 'issue_comment.created',
      issueNumber: 3,
      commentBody: 'Can you clarify?',
      commentUrl: 'https://github.com/octocat/Hello-World/issues/3#issuecomment-1',
    });
  });

  it('validates the HMAC-SHA256 hex signature with the sha256= prefix', () => {
    const rawBody = Buffer.from(JSON.stringify({ hello: 'world' }));
    const secret = 'shhh';
    const computed = createHmac('sha256', secret).update(rawBody).digest('hex');
    expect(validateGithubSignature(rawBody, `sha256=${computed}`, secret)).toBe(true);
    expect(validateGithubSignature(rawBody, computed, secret)).toBe(false); // missing prefix must be rejected
    expect(validateGithubSignature(rawBody, `sha256=${computed}`, 'wrong-secret')).toBe(false);
    expect(validateGithubSignature(rawBody, '', secret)).toBe(false);
  });

  it('filters events by configured event types and keyword query', () => {
    const normalized = normalizeGithubEvent('issues', 'delivery-6', {
      action: 'opened',
      repository: repoPayload,
      sender: senderPayload,
      issue: { number: 1, title: 'Urgent bug', html_url: 'https://x' },
    })!;
    expect(shouldAcceptGithubEvent(normalized, {})).toEqual({ accepted: true });
    expect(shouldAcceptGithubEvent(normalized, { eventTypes: 'issues' })).toEqual({ accepted: true });
    expect(shouldAcceptGithubEvent(normalized, { eventTypes: 'push' })).toMatchObject({ accepted: false });
    expect(shouldAcceptGithubEvent(normalized, { query: 'urgent' })).toEqual({ accepted: true });
    expect(shouldAcceptGithubEvent(normalized, { query: 'unrelated-keyword' })).toMatchObject({ accepted: false });
  });

  it('builds workflow execution input with normalized GitHub fields', () => {
    const normalized = normalizeGithubEvent('push', 'delivery-7', { ref: 'refs/heads/main', repository: repoPayload, sender: senderPayload, commits: [] })!;
    expect(buildGithubExecutionInput({ workflowId: 'wf1', nodeId: 'github-node', normalized })).toMatchObject({
      trigger: 'github',
      workflow_id: 'wf1',
      node_id: 'github-node',
      repository: 'octocat/Hello-World',
      _github: true,
    });
  });

  it('registers a webhook and validates its issued secret', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ token: 'ghp-1' }));
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, text: async () => JSON.stringify({ id: 12345 }) });

    const result = await registerGithubWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'github-node', owner: 'octocat', repo: 'Hello-World' });
    expect(result).toMatchObject({
      success: true,
      webhookUrl: 'https://ctrlchecks.example/api/github/webhook/wf1/github-node',
      owner: 'octocat',
      repo: 'Hello-World',
      hookId: '12345',
    });

    const [url, requestInit] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/repos/octocat/Hello-World/hooks');
    expect(requestInit.method).toBe('POST');
    const requestBody = JSON.parse(requestInit.body);
    expect(requestBody.config.secret).toBeTruthy();
    expect(requestBody.events).toEqual(['push', 'issues', 'pull_request', 'release', 'issue_comment']);

    const rawBody = Buffer.from(JSON.stringify({ any: 'payload' }));
    const validSignature = `sha256=${createHmac('sha256', requestBody.config.secret).update(rawBody).digest('hex')}`;
    await expect(validateGithubWebhookSecret('wf1', 'github-node', rawBody, validSignature)).resolves.toBe(true);
    await expect(validateGithubWebhookSecret('wf1', 'github-node', rawBody, 'sha256=wrong')).resolves.toBe(false);
  });

  it('respects configured event types on registration', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ token: 'ghp-1' }));
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, text: async () => JSON.stringify({ id: 1 }) });

    await registerGithubWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'github-node', owner: 'octocat', repo: 'Hello-World', eventTypes: 'issues, pull_request' });
    const [, requestInit] = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(requestInit.body).events).toEqual(['issues', 'pull_request']);
  });

  it('rejects registration without owner/repo', async () => {
    (getRedisClient as jest.Mock).mockResolvedValue(makeFakeRedis());
    await expect(registerGithubWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'github-node', owner: '', repo: '' })).rejects.toThrow('owner and name');
  });

  it('auto-registers saved GitHub trigger nodes and reports missing owner/repo errors', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ token: 'ghp-1' }));
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, text: async () => JSON.stringify({ id: 1 }) });

    const result = await autoRegisterGithubWebhooksForWorkflow({
      userId: 'user-1',
      workflow: {
        id: 'wf1',
        status: 'active',
        nodes: [
          { id: 'github-node', type: 'custom', data: { type: 'github_trigger', config: { owner: 'octocat', repo: 'Hello-World' } } },
          { id: 'github-node-2', type: 'custom', data: { type: 'github_trigger', config: {} } },
        ],
      },
    });

    expect(result).toEqual([
      expect.objectContaining({ nodeId: 'github-node', success: true, owner: 'octocat', repo: 'Hello-World' }),
      expect.objectContaining({ nodeId: 'github-node-2', success: false, error: expect.stringContaining('owner and name') }),
    ]);
  });

  it('unregisters a webhook and clears local state', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ token: 'ghp-1' }));
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, text: async () => JSON.stringify({ id: 1 }) });

    await registerGithubWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'github-node', owner: 'octocat', repo: 'Hello-World' });
    const result = await unregisterGithubWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'github-node' });
    expect(result).toEqual({ success: true });
    expect(fakeRedis.del).toHaveBeenCalled();
  });
});
