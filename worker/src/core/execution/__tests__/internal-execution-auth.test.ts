import {
  collectInternalExecutionHeaders,
  getInternalExecutionSource,
  isInternalExecutionRequest,
} from '../internal-execution-auth';

describe('internal execution auth header detection', () => {
  it('recognizes existing internal execution headers', () => {
    expect(getInternalExecutionSource({ 'x-internal-form-execution': 'true' })).toBe('form');
    expect(getInternalExecutionSource({ 'x-internal-chat-execution': 'true' })).toBe('chat');
    expect(getInternalExecutionSource({ 'x-internal-webhook-execution': 'true' })).toBe('webhook');
    expect(getInternalExecutionSource({ 'x-internal-approval-execution': 'true' })).toBe('approval');
  });

  it('recognizes provider-specific internal trigger headers without code changes per provider', () => {
    expect(getInternalExecutionSource({ 'x-internal-telegram-execution': 'true' })).toBe('telegram');
    expect(getInternalExecutionSource({ 'x-internal-whatsapp-execution': 'true' })).toBe('whatsapp');
    expect(getInternalExecutionSource({ 'x-internal-instagram-execution': 'true' })).toBe('instagram');
  });

  it('requires a pre-created execution id for route auth bypass when requested', () => {
    expect(isInternalExecutionRequest({
      headers: { 'x-internal-telegram-execution': 'true' },
      body: { executionId: 'exec_1' },
      requireExecutionId: true,
    })).toBe(true);

    expect(isInternalExecutionRequest({
      headers: { 'x-internal-telegram-execution': 'true' },
      body: {},
      requireExecutionId: true,
    })).toBe(false);
  });

  it('collects only enabled internal execution headers for queue propagation', () => {
    expect(collectInternalExecutionHeaders({
      'x-internal-telegram-execution': 'true',
      'x-internal-webhook-execution': 'false',
      authorization: 'Bearer token',
    })).toEqual({ 'x-internal-telegram-execution': 'true' });
  });
});
