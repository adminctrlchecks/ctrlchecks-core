import {
  normalizeExecutionStatus,
  normalizeExecutionTrigger,
} from '../execution-db-enums';

describe('execution DB enum normalization', () => {
  it('keeps supported execution triggers unchanged', () => {
    expect(normalizeExecutionTrigger('manual')).toBe('manual');
    expect(normalizeExecutionTrigger('webhook')).toBe('webhook');
    expect(normalizeExecutionTrigger('schedule')).toBe('schedule');
    expect(normalizeExecutionTrigger('form')).toBe('form');
    expect(normalizeExecutionTrigger('chat')).toBe('chat');
  });

  it('maps provider and event trigger names to webhook', () => {
    expect(normalizeExecutionTrigger('telegram')).toBe('webhook');
    expect(normalizeExecutionTrigger('telegram_trigger')).toBe('webhook');
    expect(normalizeExecutionTrigger('whatsapp-message')).toBe('webhook');
    expect(normalizeExecutionTrigger('github event')).toBe('webhook');
    expect(normalizeExecutionTrigger('trello')).toBe('webhook');
    expect(normalizeExecutionTrigger('linear_trigger')).toBe('webhook');
    expect(normalizeExecutionTrigger('stripe event')).toBe('webhook');
    expect(normalizeExecutionTrigger('shopify webhook')).toBe('webhook');
  });

  it('maps approval and unknown trigger names to the caller fallback', () => {
    expect(normalizeExecutionTrigger('approval', 'manual')).toBe('manual');
    expect(normalizeExecutionTrigger('custom_ai_trigger', 'webhook')).toBe('webhook');
  });

  it('keeps supported execution statuses unchanged', () => {
    expect(normalizeExecutionStatus('pending')).toBe('pending');
    expect(normalizeExecutionStatus('running')).toBe('running');
    expect(normalizeExecutionStatus('success')).toBe('success');
    expect(normalizeExecutionStatus('failed')).toBe('failed');
    expect(normalizeExecutionStatus('cancelled')).toBe('cancelled');
    expect(normalizeExecutionStatus('waiting')).toBe('waiting');
  });

  it('maps queue and terminal aliases to supported statuses', () => {
    expect(normalizeExecutionStatus('queued')).toBe('pending');
    expect(normalizeExecutionStatus('completed')).toBe('success');
    expect(normalizeExecutionStatus('succeeded')).toBe('success');
    expect(normalizeExecutionStatus('error')).toBe('failed');
    expect(normalizeExecutionStatus('paused')).toBe('waiting');
  });
});
