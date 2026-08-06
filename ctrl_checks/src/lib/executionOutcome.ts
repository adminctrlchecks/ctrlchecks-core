export type ExecutionOutcomeKind =
  | 'completed'
  | 'stopped_expected'
  | 'needs_connection'
  | 'needs_configuration'
  | 'provider_unavailable'
  | 'system_error'
  | 'acknowledgement_uncertain';

export type ExecutionOutcomeSeverity = 'success' | 'info' | 'warning' | 'error';

export interface ExecutionOutcome {
  kind: ExecutionOutcomeKind;
  reason: string;
  source: string;
  severity: ExecutionOutcomeSeverity;
  retryable: boolean;
  userMessage: string;
  developerMessage?: string;
  nextSteps: string[];
  technical?: Record<string, unknown>;
}

export function isExecutionOutcome(value: unknown): value is ExecutionOutcome {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).kind === 'string' &&
    typeof (value as Record<string, unknown>).userMessage === 'string',
  );
}

export function extractOutcome(value: unknown): ExecutionOutcome | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (isExecutionOutcome(record.outcome)) return record.outcome;
  const output = record.output;
  if (output && typeof output === 'object' && !Array.isArray(output)) {
    const nested = output as Record<string, unknown>;
    if (isExecutionOutcome(nested.outcome)) return nested.outcome;
  }
  return null;
}

export function isAttentionOutcome(outcome: ExecutionOutcome | null | undefined): boolean {
  return Boolean(outcome && outcome.kind !== 'completed' && outcome.kind !== 'system_error');
}

export function outcomeLabel(outcome: ExecutionOutcome): string {
  switch (outcome.kind) {
    case 'stopped_expected':
      return 'Stopped';
    case 'needs_connection':
      return 'Needs connection';
    case 'needs_configuration':
      return 'Needs configuration';
    case 'provider_unavailable':
      return 'Provider unavailable';
    case 'acknowledgement_uncertain':
      return 'Check status';
    case 'system_error':
      return 'Failed';
    case 'completed':
    default:
      return 'Success';
  }
}

export function outcomeTone(outcome: ExecutionOutcome | null | undefined): 'success' | 'attention' | 'connection' | 'configuration' | 'error' {
  if (!outcome) return 'success';
  if (outcome.kind === 'system_error') return 'error';
  if (outcome.kind === 'needs_connection') return 'connection';
  if (outcome.kind === 'needs_configuration') return 'configuration';
  if (outcome.kind === 'completed') return 'success';
  return 'attention';
}
