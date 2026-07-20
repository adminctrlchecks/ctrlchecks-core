export const EXECUTION_TRIGGER_VALUES = ['manual', 'webhook', 'schedule', 'form', 'chat'] as const;
export type ExecutionTriggerValue = typeof EXECUTION_TRIGGER_VALUES[number];

export const EXECUTION_STATUS_VALUES = ['pending', 'running', 'success', 'failed', 'cancelled', 'waiting'] as const;
export type ExecutionStatusValue = typeof EXECUTION_STATUS_VALUES[number];

const EXECUTION_TRIGGERS = new Set<string>(EXECUTION_TRIGGER_VALUES);
const EXECUTION_STATUSES = new Set<string>(EXECUTION_STATUS_VALUES);

function normalizeToken(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

export function normalizeExecutionTrigger(
  value: unknown,
  fallback: ExecutionTriggerValue = 'manual',
): ExecutionTriggerValue {
  const normalized = normalizeToken(value);
  if (EXECUTION_TRIGGERS.has(normalized)) return normalized as ExecutionTriggerValue;

  if (!normalized) return fallback;
  if (normalized.includes('chat') || normalized.includes('conversation') || normalized.includes('message_thread')) {
    return 'chat';
  }
  if (normalized.includes('form') || normalized.includes('submission')) {
    return 'form';
  }
  if (
    normalized.includes('schedule') ||
    normalized.includes('cron') ||
    normalized.includes('interval') ||
    normalized.includes('timer')
  ) {
    return 'schedule';
  }
  if (
    normalized.includes('webhook') ||
    normalized.includes('http') ||
    normalized.includes('callback') ||
    normalized.includes('event') ||
    normalized.includes('trigger') ||
    normalized.includes('telegram') ||
    normalized.includes('whatsapp') ||
    normalized.includes('instagram') ||
    normalized.includes('facebook') ||
    normalized.includes('messenger') ||
    normalized.includes('slack') ||
    normalized.includes('discord') ||
    normalized.includes('microsoft') ||
    normalized.includes('teams') ||
    normalized.includes('outlook') ||
    normalized.includes('github') ||
    normalized.includes('typeform') ||
    normalized.includes('tally') ||
    normalized.includes('trello') ||
    normalized.includes('linear') ||
    normalized.includes('stripe') ||
    normalized.includes('shopify')
  ) {
    return 'webhook';
  }
  if (normalized.includes('manual') || normalized.includes('debug') || normalized.includes('test')) {
    return 'manual';
  }

  return fallback;
}

export function normalizeExecutionStatus(
  value: unknown,
  fallback: ExecutionStatusValue = 'pending',
): ExecutionStatusValue {
  const normalized = normalizeToken(value);
  if (EXECUTION_STATUSES.has(normalized)) return normalized as ExecutionStatusValue;

  if (!normalized) return fallback;
  if (normalized === 'queued' || normalized === 'queue' || normalized === 'created' || normalized === 'new') {
    return 'pending';
  }
  if (normalized === 'completed' || normalized === 'complete' || normalized === 'succeeded' || normalized === 'done') {
    return 'success';
  }
  if (normalized === 'error' || normalized === 'errored' || normalized === 'failure') {
    return 'failed';
  }
  if (normalized === 'canceled') {
    return 'cancelled';
  }
  if (normalized === 'paused' || normalized === 'approval' || normalized === 'awaiting_approval') {
    return 'waiting';
  }

  return fallback;
}

export function executionSourceMetadata(source: unknown): Record<string, unknown> {
  const raw = String(source ?? '').trim();
  return raw ? { originalTrigger: raw, normalizedTrigger: normalizeExecutionTrigger(raw) } : {};
}
