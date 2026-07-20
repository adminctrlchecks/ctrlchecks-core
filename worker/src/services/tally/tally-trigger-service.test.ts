import { createHmac } from 'crypto';
import { config } from '../../core/config';
import { retrieveCredential } from '../../core/utils/credential-retriever';
import { getRedisClient } from '../../shared/redis-client';
import {
  autoRegisterTallyWebhooksForWorkflow,
  buildTallyExecutionInput,
  normalizeTallyResponse,
  registerTallyWebhook,
  shouldAcceptTallyEvent,
  unregisterTallyWebhook,
  validateTallySignature,
  validateTallyWebhookSecret,
} from './tally-trigger-service';

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

const samplePayload = {
  eventId: 'evt-1',
  createdAt: '2026-07-18T12:00:00Z',
  data: {
    responseId: 'resp-1',
    submissionId: 'sub-1',
    respondentId: 'respondent-1',
    formId: 'form-1',
    formName: 'Contact Us',
    fields: [
      { key: 'email_field', label: 'Email', type: 'INPUT_EMAIL', value: 'user@example.com' },
      { key: 'message_field', label: 'Message', type: 'INPUT_TEXT', value: 'Please contact me urgently' },
      {
        key: 'plan_field',
        label: 'Plan',
        type: 'MULTIPLE_CHOICE',
        value: 'opt-2',
        options: [
          { id: 'opt-1', text: 'Basic' },
          { id: 'opt-2', text: 'Pro' },
        ],
      },
    ],
  },
};

describe('tally-trigger-service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).fetch = jest.fn();
    config.publicBaseUrl = 'https://ctrlchecks.example';
  });

  it('normalizes a Tally form submission payload into keyed answers, resolving choice options', () => {
    const normalized = normalizeTallyResponse(samplePayload);
    expect(normalized).toMatchObject({
      eventId: 'evt-1',
      eventType: 'form_response',
      source: 'tally',
      formId: 'form-1',
      formName: 'Contact Us',
      responseId: 'resp-1',
      userId: 'respondent-1',
      answers: {
        email_field: 'user@example.com',
        message_field: 'Please contact me urgently',
        plan_field: 'Pro',
      },
    });
    expect(normalizeTallyResponse({})).toBeNull();
  });

  it('falls back to submissionId when responseId is absent', () => {
    const normalized = normalizeTallyResponse({
      eventId: 'evt-2',
      data: { submissionId: 'sub-only', formId: 'form-1', fields: [] },
    });
    expect(normalized?.responseId).toBe('sub-only');
  });

  it('validates the HMAC-SHA256 signature, accepting a raw or sha256= prefixed digest', () => {
    const rawBody = Buffer.from(JSON.stringify(samplePayload));
    const secret = 'shhh';
    const computed = createHmac('sha256', secret).update(rawBody).digest('base64');
    expect(validateTallySignature(rawBody, computed, secret)).toBe(true);
    expect(validateTallySignature(rawBody, `sha256=${computed}`, secret)).toBe(true);
    expect(validateTallySignature(rawBody, computed, 'wrong-secret')).toBe(false);
    expect(validateTallySignature(rawBody, '', secret)).toBe(false);
  });

  it('filters events by form ID and keyword query', () => {
    const normalized = normalizeTallyResponse(samplePayload)!;
    expect(shouldAcceptTallyEvent(normalized, {})).toEqual({ accepted: true });
    expect(shouldAcceptTallyEvent(normalized, { formId: 'other-form' })).toMatchObject({ accepted: false });
    expect(shouldAcceptTallyEvent(normalized, { query: 'urgently' })).toEqual({ accepted: true });
    expect(shouldAcceptTallyEvent(normalized, { query: 'unrelated-keyword' })).toMatchObject({ accepted: false });
  });

  it('builds workflow execution input with normalized Tally fields', () => {
    const normalized = normalizeTallyResponse(samplePayload)!;
    expect(buildTallyExecutionInput({ workflowId: 'wf1', nodeId: 'tally-node', normalized })).toMatchObject({
      trigger: 'tally',
      workflow_id: 'wf1',
      node_id: 'tally-node',
      formId: 'form-1',
      _tally: true,
    });
  });

  it('registers a webhook and validates its issued secret', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ token: 'pat-1' }));
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, text: async () => JSON.stringify({ id: 'webhook-1' }) });

    const result = await registerTallyWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'tally-node', formId: 'form-1' });
    expect(result).toMatchObject({
      success: true,
      webhookUrl: 'https://ctrlchecks.example/api/tally/webhook/wf1/tally-node',
      formId: 'form-1',
      webhookId: 'webhook-1',
    });

    const [url, requestInit] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/forms/form-1/webhooks');
    expect(requestInit.method).toBe('POST');
    const requestBody = JSON.parse(requestInit.body);
    expect(requestBody.signingSecret).toBeTruthy();

    const rawBody = Buffer.from(JSON.stringify(samplePayload));
    const validSignature = createHmac('sha256', requestBody.signingSecret).update(rawBody).digest('base64');
    await expect(validateTallyWebhookSecret('wf1', 'tally-node', rawBody, validSignature)).resolves.toBe(true);
    await expect(validateTallyWebhookSecret('wf1', 'tally-node', rawBody, 'wrong')).resolves.toBe(false);
  });

  it('prefers a server-issued signingSecret when the API returns one', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ token: 'pat-1' }));
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ id: 'webhook-1', signingSecret: 'server-secret' }),
    });

    await registerTallyWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'tally-node', formId: 'form-1' });

    const rawBody = Buffer.from(JSON.stringify(samplePayload));
    const serverSignature = createHmac('sha256', 'server-secret').update(rawBody).digest('base64');
    await expect(validateTallyWebhookSecret('wf1', 'tally-node', rawBody, serverSignature)).resolves.toBe(true);
  });

  it('rejects registration without a form ID', async () => {
    (getRedisClient as jest.Mock).mockResolvedValue(makeFakeRedis());
    await expect(registerTallyWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'tally-node', formId: '' })).rejects.toThrow('form ID');
  });

  it('auto-registers saved Tally trigger nodes and reports missing form ID errors', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ token: 'pat-1' }));
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, text: async () => JSON.stringify({ id: 'webhook-1' }) });

    const result = await autoRegisterTallyWebhooksForWorkflow({
      userId: 'user-1',
      workflow: {
        id: 'wf1',
        status: 'active',
        nodes: [
          { id: 'tally-node', type: 'custom', data: { type: 'tally_trigger', config: { formId: 'form-1' } } },
          { id: 'tally-node-2', type: 'custom', data: { type: 'tally_trigger', config: {} } },
        ],
      },
    });

    expect(result).toEqual([
      expect.objectContaining({ nodeId: 'tally-node', success: true, formId: 'form-1' }),
      expect.objectContaining({ nodeId: 'tally-node-2', success: false, error: expect.stringContaining('Form ID') }),
    ]);
  });

  it('unregisters a webhook and clears local state', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ token: 'pat-1' }));
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, text: async () => JSON.stringify({ id: 'webhook-1' }) });

    await registerTallyWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'tally-node', formId: 'form-1' });
    const result = await unregisterTallyWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'tally-node' });
    expect(result).toEqual({ success: true });
    expect(fakeRedis.del).toHaveBeenCalled();
  });
});
