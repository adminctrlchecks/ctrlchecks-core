import { stripRoutingMeta, stripSystemKeys } from './system-key-filter';

const ROUTING_CONTEXT_KEYS = [
  '_chat',
  'sessionId',
  'workflow_id',
  'workflowId',
  'node_id',
  'trigger',
  'channel',
  'timestamp',
  'executionId',
] as const;

const SENSITIVE_KEY_PATTERN =
  /(?:password|passwd|secret|token|api[_-]?key|authorization|credential|private[_-]?key)/i;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

function isMeaningful(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function removeSensitiveContextKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) continue;
    result[key] = value;
  }
  return result;
}

function getPreservableInputContext(input: unknown): Record<string, unknown> {
  if (!isPlainRecord(input)) return {};
  return removeSensitiveContextKeys(stripRoutingMeta(stripSystemKeys(input)));
}

function isErrorOutput(output: Record<string, unknown>): boolean {
  return typeof output._error === 'string' && output._error.trim().length > 0;
}

/**
 * Preserve upstream business/routing context at the engine handoff boundary.
 *
 * Node definitions should return only their own result. The executor stores this
 * merged payload for downstream nodes so routing fields such as chat sessionId
 * survive through transformer/AI/API nodes without every node reimplementing it.
 */
export function preserveOutputContextForDownstream(input: unknown, output: unknown): unknown {
  if (!isPlainRecord(output) || isErrorOutput(output)) return output;

  const preservedInput = getPreservableInputContext(input);
  if (Object.keys(preservedInput).length === 0) return output;

  const merged: Record<string, unknown> = {
    ...preservedInput,
    ...output,
  };

  for (const key of ROUTING_CONTEXT_KEYS) {
    const upstreamValue = preservedInput[key];
    if (isMeaningful(upstreamValue) && !isMeaningful(merged[key])) {
      merged[key] = upstreamValue;
    }
  }

  return merged;
}
