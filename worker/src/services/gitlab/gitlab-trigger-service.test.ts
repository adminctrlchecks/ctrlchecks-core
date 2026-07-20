import { config } from '../../core/config';
import { retrieveCredential } from '../../core/utils/credential-retriever';
import { getRedisClient } from '../../shared/redis-client';
import {
  autoRegisterGitlabWebhooksForWorkflow,
  buildGitlabExecutionInput,
  normalizeGitlabEvent,
  registerGitlabWebhook,
  shouldAcceptGitlabEvent,
  unregisterGitlabWebhook,
  validateGitlabToken,
  validateGitlabWebhookSecret,
} from './gitlab-trigger-service';

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

const projectPayload = { id: 12345, path_with_namespace: 'mygroup/myproject', name: 'myproject' };
const userPayload = { id: 583231, username: 'octocat' };

describe('gitlab-trigger-service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).fetch = jest.fn();
    config.publicBaseUrl = 'https://ctrlchecks.example';
  });

  it('returns null when object_kind is missing', () => {
    expect(normalizeGitlabEvent({})).toBeNull();
    expect(normalizeGitlabEvent({ object_kind: '' })).toBeNull();
  });

  it('normalizes a push event', () => {
    const normalized = normalizeGitlabEvent({
      object_kind: 'push',
      ref: 'refs/heads/main',
      after: 'sha-after-1',
      project: projectPayload,
      user_id: 583231,
      user_name: 'octocat',
      commits: [{ id: 'sha1', message: 'first commit' }, { id: 'sha2', message: 'second commit' }],
    });
    expect(normalized).toMatchObject({
      eventId: 'sha-after-1',
      eventType: 'push',
      source: 'gitlab',
      projectId: '12345',
      projectName: 'mygroup/myproject',
      ref: 'refs/heads/main',
      username: 'octocat',
      userId: '583231',
      text: 'second commit',
    });
    expect(normalized?.commits).toHaveLength(2);
  });

  it('normalizes an issue event with action and iid', () => {
    const normalized = normalizeGitlabEvent({
      object_kind: 'issue',
      project: projectPayload,
      user: userPayload,
      object_attributes: {
        id: 999,
        iid: 42,
        title: 'Bug: something broke',
        url: 'https://gitlab.com/mygroup/myproject/-/issues/42',
        action: 'open',
      },
    });
    expect(normalized).toMatchObject({
      eventType: 'issue',
      action: 'open',
      issueIid: 42,
      issueTitle: 'Bug: something broke',
      issueUrl: 'https://gitlab.com/mygroup/myproject/-/issues/42',
    });
  });

  it('normalizes a merge_request event, including state', () => {
    const normalized = normalizeGitlabEvent({
      object_kind: 'merge_request',
      project: projectPayload,
      user: userPayload,
      object_attributes: {
        id: 7,
        iid: 7,
        title: 'Add feature',
        url: 'https://gitlab.com/mygroup/myproject/-/merge_requests/7',
        state: 'opened',
        action: 'open',
        source_branch: 'feature-branch',
      },
    });
    expect(normalized).toMatchObject({
      eventType: 'merge_request',
      mrIid: 7,
      mrTitle: 'Add feature',
      mrState: 'opened',
      action: 'open',
      ref: 'feature-branch',
    });
  });

  it('normalizes a note (comment) event on an issue', () => {
    const normalized = normalizeGitlabEvent({
      object_kind: 'note',
      project: projectPayload,
      user: userPayload,
      object_attributes: {
        id: 55,
        note: 'Can you clarify?',
        url: 'https://gitlab.com/mygroup/myproject/-/issues/3#note_55',
        noteable_type: 'Issue',
      },
      issue: { iid: 3, title: 'Question' },
    });
    expect(normalized).toMatchObject({
      eventType: 'note',
      noteBody: 'Can you clarify?',
      noteUrl: 'https://gitlab.com/mygroup/myproject/-/issues/3#note_55',
      issueIid: 3,
      issueTitle: 'Question',
    });
  });

  it('normalizes tag_push, pipeline, and release events', () => {
    const tagPush = normalizeGitlabEvent({ object_kind: 'tag_push', ref: 'refs/tags/v1.0.0', after: 'sha-2', project: projectPayload, commits: [] });
    expect(tagPush).toMatchObject({ eventType: 'tag_push', ref: 'refs/tags/v1.0.0' });

    const pipeline = normalizeGitlabEvent({ object_kind: 'pipeline', project: projectPayload, object_attributes: { id: 1, ref: 'main', status: 'success' } });
    expect(pipeline).toMatchObject({ eventType: 'pipeline', action: 'success', ref: 'main' });

    const release = normalizeGitlabEvent({ object_kind: 'release', id: 5, action: 'create', tag: 'v1.0.0', name: 'Release v1.0.0', project: projectPayload });
    expect(release).toMatchObject({ eventType: 'release', action: 'create', eventId: '5' });
  });

  it('falls back to a generic envelope for unhandled object_kind values', () => {
    const normalized = normalizeGitlabEvent({ object_kind: 'wiki_page', project: projectPayload });
    expect(normalized).toMatchObject({ eventType: 'wiki_page', projectId: '12345' });
  });

  it('validates the X-Gitlab-Token shared secret with a plain constant-time compare (not HMAC)', () => {
    expect(validateGitlabToken('my-secret', 'my-secret')).toBe(true);
    expect(validateGitlabToken('my-secret', 'wrong-secret')).toBe(false);
    expect(validateGitlabToken('', 'my-secret')).toBe(false);
    expect(validateGitlabToken('my-secret', '')).toBe(false);
  });

  it('filters events by configured event types and keyword query', () => {
    const normalized = normalizeGitlabEvent({
      object_kind: 'issue',
      project: projectPayload,
      object_attributes: { id: 1, iid: 1, title: 'Urgent bug', url: 'https://x', action: 'open' },
    })!;
    expect(shouldAcceptGitlabEvent(normalized, {})).toEqual({ accepted: true });
    expect(shouldAcceptGitlabEvent(normalized, { eventTypes: 'issue' })).toEqual({ accepted: true });
    expect(shouldAcceptGitlabEvent(normalized, { eventTypes: 'push' })).toMatchObject({ accepted: false });
    expect(shouldAcceptGitlabEvent(normalized, { query: 'urgent' })).toEqual({ accepted: true });
    expect(shouldAcceptGitlabEvent(normalized, { query: 'unrelated-keyword' })).toMatchObject({ accepted: false });
  });

  it('builds workflow execution input with normalized GitLab fields', () => {
    const normalized = normalizeGitlabEvent({ object_kind: 'push', ref: 'refs/heads/main', after: 'sha-x', project: projectPayload, commits: [] })!;
    expect(buildGitlabExecutionInput({ workflowId: 'wf1', nodeId: 'gitlab-node', normalized })).toMatchObject({
      trigger: 'gitlab',
      workflow_id: 'wf1',
      node_id: 'gitlab-node',
      projectId: '12345',
      _gitlab: true,
    });
  });

  it('registers a webhook and validates its issued secret', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ token: 'glpat-1' }));
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, text: async () => JSON.stringify({ id: 999 }) });

    const result = await registerGitlabWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'gitlab-node', projectId: '12345' });
    expect(result).toMatchObject({
      success: true,
      webhookUrl: 'https://ctrlchecks.example/api/gitlab/webhook/wf1/gitlab-node',
      projectId: '12345',
      hookId: '999',
      baseUrl: 'https://gitlab.com',
    });

    const [url, requestInit] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/api/v4/projects/12345/hooks');
    expect(requestInit.method).toBe('POST');
    expect(requestInit.headers.Authorization).toBe('Bearer glpat-1');
    const requestBody = JSON.parse(requestInit.body);
    expect(requestBody.token).toBeTruthy();
    expect(requestBody.push_events).toBe(true);
    expect(requestBody.issues_events).toBe(true);
    expect(requestBody.merge_requests_events).toBe(true);
    expect(requestBody.note_events).toBe(true);
    expect(requestBody.tag_push_events).toBe(false);
    expect(requestBody.pipeline_events).toBe(false);
    expect(requestBody.releases_events).toBe(false);

    await expect(validateGitlabWebhookSecret('wf1', 'gitlab-node', requestBody.token)).resolves.toBe(true);
    await expect(validateGitlabWebhookSecret('wf1', 'gitlab-node', 'wrong-token')).resolves.toBe(false);
  });

  it('respects configured event types and a custom base URL on registration', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ token: 'glpat-1' }));
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, text: async () => JSON.stringify({ id: 1 }) });

    await registerGitlabWebhook({
      userId: 'user-1',
      workflowId: 'wf1',
      nodeId: 'gitlab-node',
      projectId: '12345',
      baseUrl: 'https://gitlab.mycompany.com/',
      eventTypes: 'pipeline, release',
    });
    const [url, requestInit] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://gitlab.mycompany.com/api/v4/projects/12345/hooks');
    const body = JSON.parse(requestInit.body);
    expect(body.pipeline_events).toBe(true);
    expect(body.releases_events).toBe(true);
    expect(body.push_events).toBe(false);
  });

  it('rejects registration without a project ID', async () => {
    (getRedisClient as jest.Mock).mockResolvedValue(makeFakeRedis());
    await expect(registerGitlabWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'gitlab-node', projectId: '' })).rejects.toThrow('project ID');
  });

  it('auto-registers saved GitLab trigger nodes and reports missing project ID errors', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ token: 'glpat-1' }));
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, text: async () => JSON.stringify({ id: 1 }) });

    const result = await autoRegisterGitlabWebhooksForWorkflow({
      userId: 'user-1',
      workflow: {
        id: 'wf1',
        status: 'active',
        nodes: [
          { id: 'gitlab-node', type: 'custom', data: { type: 'gitlab_trigger', config: { projectId: '12345' } } },
          { id: 'gitlab-node-2', type: 'custom', data: { type: 'gitlab_trigger', config: {} } },
        ],
      },
    });

    expect(result).toEqual([
      expect.objectContaining({ nodeId: 'gitlab-node', success: true, projectId: '12345' }),
      expect.objectContaining({ nodeId: 'gitlab-node-2', success: false, error: expect.stringContaining('Project ID') }),
    ]);
  });

  it('unregisters a webhook and clears local state', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ token: 'glpat-1' }));
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, text: async () => JSON.stringify({ id: 1 }) });

    await registerGitlabWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'gitlab-node', projectId: '12345' });
    const result = await unregisterGitlabWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'gitlab-node' });
    expect(result).toEqual({ success: true });
    expect(fakeRedis.del).toHaveBeenCalled();
  });
});
