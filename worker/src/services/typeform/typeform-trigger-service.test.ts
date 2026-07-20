import { createHmac } from 'crypto';
import { config } from '../../core/config';
import { retrieveCredential } from '../../core/utils/credential-retriever';
import { getRedisClient } from '../../shared/redis-client';
import {
  autoRegisterTypeformWebhooksForWorkflow,
  buildTypeformExecutionInput,
  normalizeTypeformResponse,
  registerTypeformWebhook,
  shouldAcceptTypeformEvent,
  unregisterTypeformWebhook,
  validateTypeformSignature,
  validateTypeformWebhookSecret,
} from './typeform-trigger-service';

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
  event_id: 'evt-1',
  event_type: 'form_response',
  form_response: {
    form_id: 'form-1',
    token: 'resp-1',
    submitted_at: '2026-07-18T12:00:00Z',
    hidden: { source: 'landing_page' },
    answers: [
      { field: { ref: 'email_field' }, type: 'email', email: 'user@example.com' },
      { field: { ref: 'message_field' }, type: 'text', text: 'Please contact me urgently' },
    ],
  },
};

describe('typeform-trigger-service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).fetch = jest.fn();
    config.publicBaseUrl = 'https://ctrlchecks.example';
  });

  it('normalizes a Typeform form_response payload into keyed answers', () => {
    const normalized = normalizeTypeformResponse(samplePayload);
    expect(normalized).toMatchObject({
      eventId: 'evt-1',
      eventType: 'form_response',
      source: 'typeform',
      formId: 'form-1',
      responseId: 'resp-1',
      answers: { email_field: 'user@example.com', message_field: 'Please contact me urgently' },
      hidden: { source: 'landing_page' },
    });
    expect(normalizeTypeformResponse({})).toBeNull();
  });

  it('validates the HMAC-SHA256 signature', () => {
    const rawBody = Buffer.from(JSON.stringify(samplePayload));
    const secret = 'shhh';
    const computed = createHmac('sha256', secret).update(rawBody).digest('base64');
    expect(validateTypeformSignature(rawBody, `sha256=${computed}`, secret)).toBe(true);
    expect(validateTypeformSignature(rawBody, `sha256=${computed}`, 'wrong-secret')).toBe(false);
    expect(validateTypeformSignature(rawBody, 'not-prefixed', secret)).toBe(false);
  });

  it('filters events by form ID and keyword query', () => {
    const normalized = normalizeTypeformResponse(samplePayload)!;
    expect(shouldAcceptTypeformEvent(normalized, {})).toEqual({ accepted: true });
    expect(shouldAcceptTypeformEvent(normalized, { formId: 'other-form' })).toMatchObject({ accepted: false });
    expect(shouldAcceptTypeformEvent(normalized, { query: 'urgently' })).toEqual({ accepted: true });
    expect(shouldAcceptTypeformEvent(normalized, { query: 'unrelated-keyword' })).toMatchObject({ accepted: false });
  });

  it('builds workflow execution input with normalized Typeform fields', () => {
    const normalized = normalizeTypeformResponse(samplePayload)!;
    expect(buildTypeformExecutionInput({ workflowId: 'wf1', nodeId: 'tf-node', normalized })).toMatchObject({
      trigger: 'typeform',
      workflow_id: 'wf1',
      node_id: 'tf-node',
      formId: 'form-1',
      _typeform: true,
    });
  });

  it('registers a webhook and validates its issued secret', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ token: 'pat-1' }));
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, text: async () => JSON.stringify({}) });

    const result = await registerTypeformWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'tf-node', formId: 'form-1' });
    expect(result).toMatchObject({
      success: true,
      webhookUrl: 'https://ctrlchecks.example/api/typeform/webhook/wf1/tf-node',
      formId: 'form-1',
    });

    const [url, requestInit] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/webhooks/');
    expect(requestInit.method).toBe('PUT');
    const requestBody = JSON.parse(requestInit.body);
    expect(requestBody.secret).toBeTruthy();

    const rawBody = Buffer.from(JSON.stringify(samplePayload));
    const validSignature = `sha256=${createHmac('sha256', requestBody.secret).update(rawBody).digest('base64')}`;
    await expect(validateTypeformWebhookSecret('wf1', 'tf-node', rawBody, validSignature)).resolves.toBe(true);
    await expect(validateTypeformWebhookSecret('wf1', 'tf-node', rawBody, 'sha256=wrong')).resolves.toBe(false);
  });

  it('rejects registration without a form ID', async () => {
    (getRedisClient as jest.Mock).mockResolvedValue(makeFakeRedis());
    await expect(registerTypeformWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'tf-node', formId: '' })).rejects.toThrow('form ID');
  });

  it('auto-registers saved Typeform trigger nodes and reports missing form ID errors', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ token: 'pat-1' }));
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, text: async () => JSON.stringify({}) });

    const result = await autoRegisterTypeformWebhooksForWorkflow({
      userId: 'user-1',
      workflow: {
        id: 'wf1',
        status: 'active',
        nodes: [
          { id: 'tf-node', type: 'custom', data: { type: 'typeform_trigger', config: { formId: 'form-1' } } },
          { id: 'tf-node-2', type: 'custom', data: { type: 'typeform_trigger', config: {} } },
        ],
      },
    });

    expect(result).toEqual([
      expect.objectContaining({ nodeId: 'tf-node', success: true, formId: 'form-1' }),
      expect.objectContaining({ nodeId: 'tf-node-2', success: false, error: expect.stringContaining('Form ID') }),
    ]);
  });

  it('unregisters a webhook and clears local state', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (retrieveCredential as jest.Mock).mockResolvedValue(JSON.stringify({ token: 'pat-1' }));
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, text: async () => JSON.stringify({}) });

    await registerTypeformWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'tf-node', formId: 'form-1' });
    const result = await unregisterTypeformWebhook({ userId: 'user-1', workflowId: 'wf1', nodeId: 'tf-node' });
    expect(result).toEqual({ success: true });
    expect(fakeRedis.del).toHaveBeenCalled();
  });
});
