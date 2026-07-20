import type { IncomingHttpHeaders } from 'http';

export const INTERNAL_EXECUTION_HEADER_PREFIX = 'x-internal-';
export const INTERNAL_EXECUTION_HEADER_SUFFIX = '-execution';

function headerValueIsTrue(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(headerValueIsTrue);
  return String(value ?? '').trim().toLowerCase() === 'true';
}

function normalizeHeaderName(name: string): string {
  return String(name || '').trim().toLowerCase();
}

function sourceFromHeaderName(name: string): string | null {
  const normalized = normalizeHeaderName(name);
  if (!normalized.startsWith(INTERNAL_EXECUTION_HEADER_PREFIX)) return null;
  if (!normalized.endsWith(INTERNAL_EXECUTION_HEADER_SUFFIX)) return null;

  const source = normalized.slice(
    INTERNAL_EXECUTION_HEADER_PREFIX.length,
    -INTERNAL_EXECUTION_HEADER_SUFFIX.length,
  );

  if (!source) return null;
  return source === 'trigger' ? 'trigger-service' : source;
}

export function getInternalExecutionSource(headers: IncomingHttpHeaders | Record<string, unknown>): string | null {
  for (const [name, value] of Object.entries(headers || {})) {
    if (!headerValueIsTrue(value)) continue;
    const source = sourceFromHeaderName(name);
    if (source) return source;
  }
  return null;
}

export function collectInternalExecutionHeaders(
  headers: IncomingHttpHeaders | Record<string, unknown>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers || {})) {
    const normalized = normalizeHeaderName(name);
    if (!sourceFromHeaderName(normalized)) continue;
    if (!headerValueIsTrue(value)) continue;
    result[normalized] = 'true';
  }
  return result;
}

export function hasResumeExecutionId(body: unknown): boolean {
  const executionId = (body as any)?.executionId;
  return typeof executionId === 'string' && executionId.trim().length > 0;
}

export function isInternalExecutionRequest(input: {
  headers: IncomingHttpHeaders | Record<string, unknown>;
  body?: unknown;
  requireExecutionId?: boolean;
}): boolean {
  const source = getInternalExecutionSource(input.headers);
  if (!source) return false;
  if (!input.requireExecutionId) return true;
  return hasResumeExecutionId(input.body);
}
