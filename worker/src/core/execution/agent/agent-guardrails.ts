import type { AgentErrorCode, AgentLimits, AgentToolCallRecord, RequireApprovalPolicy } from './agent-types';

export function resolveAgentLimits(config: Record<string, unknown>): AgentLimits {
  const maxIterations = clampInt(config.maxIterations, 10, 1, 25);
  const timeoutMs = clampInt(config.timeoutMs ?? config.timeoutLimit, 60000, 1000, 300000);
  const maxToolResultChars = clampInt(config.maxToolResultChars, 8000, 1000, 50000);
  const maxRepeatedToolCalls = clampInt(config.maxRepeatedToolCalls, 3, 2, 10);
  return { maxIterations, timeoutMs, maxToolResultChars, maxRepeatedToolCalls };
}

export function resolveApprovalPolicy(value: unknown): RequireApprovalPolicy {
  if (value === 'none' || value === 'destructive' || value === 'write_and_destructive') return value;
  return 'destructive';
}

export function shouldBlockForApproval(
  firstRunClass: 'none' | 'read' | 'write' | 'destructive',
  policy: RequireApprovalPolicy
): boolean {
  if (policy === 'none') return false;
  if (policy === 'destructive') return firstRunClass === 'destructive';
  return firstRunClass === 'write' || firstRunClass === 'destructive';
}

export function assertWithinTime(startedAtMs: number, timeoutMs: number): void {
  if (Date.now() - startedAtMs > timeoutMs) {
    const error = new Error('AI Agent timed out');
    (error as Error & { code?: AgentErrorCode }).code = 'TIMEOUT';
    throw error;
  }
}

export function isRepeatingToolCall(
  records: AgentToolCallRecord[],
  functionName: string,
  args: Record<string, unknown>,
  maxRepeated: number
): boolean {
  const signature = `${functionName}:${stableJson(args)}`;
  let count = 0;
  for (let i = records.length - 1; i >= 0; i--) {
    const record = records[i];
    const current = `${record.functionName}:${stableJson(record.args)}`;
    if (current !== signature) break;
    count += 1;
    if (count >= maxRepeated) return true;
  }
  return false;
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function stableJson(value: unknown): string {
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${stableJson(obj[key])}`).join(',')}}`;
}
