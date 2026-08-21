const SECRET_KEY_PARTS = [
  'secret',
  'token',
  'apikey',
  'api_key',
  'password',
  'authorization',
  'privatekey',
  'private_key',
  'refresh_token',
  'access_token',
] as const;

function isSensitiveKey(key: string): boolean {
  const compact = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
  return SECRET_KEY_PARTS.some((part) => compact.includes(part));
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth > 8) return '[Max depth exceeded]';
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeValue(item, depth + 1));
  }
  if (!value || typeof value !== 'object') return value;

  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      out[key] = '[REDACTED]';
      continue;
    }
    out[key] = sanitizeValue(nested, depth + 1);
  }
  return out;
}

export function sanitizeToolResult(
  value: unknown,
  maxChars: number
): { sanitized: unknown; text: string; truncated: boolean } {
  const sanitized = sanitizeValue(value, 0);
  let text: string;
  try {
    text = typeof sanitized === 'string' ? sanitized : JSON.stringify(sanitized);
  } catch {
    text = String(sanitized);
  }

  const limit = Math.max(256, maxChars || 8000);
  if (text.length <= limit) {
    return { sanitized, text, truncated: false };
  }
  return {
    sanitized,
    text: `${text.slice(0, limit)}\n...[tool result truncated]`,
    truncated: true,
  };
}

export function sanitizeErrorMessage(message: unknown): string {
  const raw = message instanceof Error ? message.message : String(message || 'Unknown error');
  return raw
    .replace(/(api[_-]?key|token|secret|password|authorization)(["':=\s]+)[^,\s"}]+/gi, '$1$2[REDACTED]')
    .slice(0, 1000);
}
