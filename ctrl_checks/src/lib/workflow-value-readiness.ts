function looksLikeInstructionalPlaceholder(trimmed: string): boolean {
  return (
    /^(enter|type|add|paste|insert|provide|select|fill|choose)\s+(your|the|a)\b/i.test(trimmed) ||
    /^fill\s+this\b/i.test(trimmed) ||
    /^\s*todo\s*$/i.test(trimmed)
  );
}

export function isPlaceholderLikeValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value !== 'string') return false;

  const trimmed = value.trim();
  if (!trimmed) return true;

  const lower = trimmed.toLowerCase();
  if (/^your_[a-z0-9_]+$/i.test(trimmed)) return true;
  if (/_[a-z0-9_]*placeholder$/i.test(trimmed)) return true;
  if (/^enter_your_[a-z0-9_]+$/i.test(trimmed)) return true;
  if (looksLikeInstructionalPlaceholder(trimmed)) return true;
  if (/^https?:\/\/example\.com(\/|$|\?|#)/i.test(trimmed)) return true;
  if (/^https?:\/\/example(\/|$|\?|#)/i.test(trimmed)) return true;
  if (trimmed.startsWith('{{ENV.')) return true;
  if (trimmed.startsWith('{{') && trimmed.endsWith('}}') && trimmed.includes('ENV.')) return true;
  if (trimmed.startsWith('{{') && trimmed.endsWith('}}') && trimmed.includes('$json') && !trimmed.includes('.')) return true;
  if (/^ai[-\s]?built\b/i.test(trimmed)) return true;
  if (/^ai\s+filled\s+once\b/i.test(trimmed)) return true;
  if (/^not\s+configured$/i.test(trimmed)) return true;

  if (lower.includes('placeholder') || lower.includes('example')) {
    const hasValidTld =
      /\.(com|org|net|io|co|dev|app|xyz|info|edu|gov|mil|int|biz|name|pro|test|localhost)(\/|$|\s|$)/i.test(
        trimmed
      );
    const isInstruction = /^(enter|your|add|paste|insert|provide|select|fill|use|set)\s+(your\s+)?(placeholder|example)/i.test(
      trimmed
    );
    return (!hasValidTld && isInstruction) || trimmed === 'placeholder' || trimmed === 'example';
  }

  return false;
}

export function isEffectivelyEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return isPlaceholderLikeValue(value);
  if (Array.isArray(value)) return value.length === 0 || value.every((item) => isEffectivelyEmptyValue(item));
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).filter((key) => !key.startsWith('_'));
    return keys.length === 0 || keys.every((key) => isEffectivelyEmptyValue((value as Record<string, unknown>)[key]));
  }
  return false;
}
