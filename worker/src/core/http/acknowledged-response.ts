export type OperationStatus = 'succeeded' | 'failed' | 'unknown';
export type AcknowledgementStatus = 'parsed' | 'empty_success' | 'parse_failed' | 'not_required';
export type PersistenceStatus = 'saved' | 'delayed' | 'failed';

export interface AcknowledgedHttpResponse<T = any> {
  ok: boolean;
  status: number;
  statusText: string;
  contentType: string;
  operationStatus: OperationStatus;
  acknowledgementStatus: AcknowledgementStatus;
  data: T | null;
  rawText?: string;
  parseError?: string;
  empty: boolean;
}

export interface ReadAcknowledgedResponseOptions {
  /**
   * Keep binary success bodies compatible with older helpers that returned
   * base64 data for non-JSON responses.
   */
  binaryForNonText?: boolean;
  maxRawTextLength?: number;
}

function isTextLikeContentType(contentType: string): boolean {
  const normalized = contentType.toLowerCase();
  return (
    normalized.includes('application/json') ||
    normalized.includes('+json') ||
    normalized.startsWith('text/') ||
    normalized.includes('application/xml') ||
    normalized.includes('application/x-www-form-urlencoded')
  );
}

function isJsonContentType(contentType: string): boolean {
  const normalized = contentType.toLowerCase();
  return normalized.includes('application/json') || normalized.includes('+json');
}

function truncateRawText(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

export async function readAcknowledgedHttpResponse<T = any>(
  response: Response,
  options: ReadAcknowledgedResponseOptions = {},
): Promise<AcknowledgedHttpResponse<T>> {
  const contentType = response.headers.get('content-type') || '';
  const contentLength = response.headers.get('content-length');
  const maxRawTextLength = options.maxRawTextLength ?? 2000;
  const operationStatus: OperationStatus = response.ok ? 'succeeded' : 'failed';

  const emptyResult = (): AcknowledgedHttpResponse<T> => ({
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    contentType,
    operationStatus,
    acknowledgementStatus: response.ok ? 'empty_success' : 'not_required',
    data: null,
    empty: true,
  });

  if (response.status === 204 || response.status === 205 || contentLength === '0') {
    return emptyResult();
  }

  if (options.binaryForNonText && contentType && !isTextLikeContentType(contentType)) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) return emptyResult();
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      contentType,
      operationStatus,
      acknowledgementStatus: 'not_required',
      data: {
        contentType,
        dataBase64: buffer.toString('base64'),
        size: buffer.length,
      } as T,
      empty: false,
    };
  }

  const text = await response.text();
  if (!text.trim()) {
    return emptyResult();
  }

  if (isJsonContentType(contentType)) {
    try {
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        contentType,
        operationStatus,
        acknowledgementStatus: 'parsed',
        data: JSON.parse(text) as T,
        rawText: truncateRawText(text, maxRawTextLength),
        empty: false,
      };
    } catch (error: any) {
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        contentType,
        operationStatus: response.ok ? 'unknown' : 'failed',
        acknowledgementStatus: 'parse_failed',
        data: text as T,
        rawText: truncateRawText(text, maxRawTextLength),
        parseError: error?.message || 'Failed to parse JSON response',
        empty: false,
      };
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    contentType,
    operationStatus,
    acknowledgementStatus: 'not_required',
    data: text as T,
    rawText: truncateRawText(text, maxRawTextLength),
    empty: false,
  };
}

/**
 * Pulls a specific, human-readable message out of a failed API response body.
 *
 * Providers disagree on error shape, so this checks the conventions actually seen in
 * production across our integrations: plain `message`/`detail` fields, an `error` field
 * that's either a string or an object with `.message`, OAuth2's `error_description`, and
 * JSON:API/RFC-7807-style `errors[]` arrays (ActiveCampaign, Mailchimp, and others) whose
 * entries carry per-field detail via `field`/`title`/`detail` rather than a flat `message`.
 *
 * The per-field errors[] array is checked FIRST, ahead of a top-level `message`/`detail`,
 * because providers following RFC 7807 (Mailchimp included) pair a deliberately generic
 * top-level `detail` — literally "...see the errors array" — with the actually useful
 * specifics inside errors[]. Checking the generic field first meant every such failure
 * surfaced as "see the errors array" instead of what was actually wrong. When an errors[]
 * array has multiple entries, all of them are joined so nothing is lost.
 */
export function extractProviderErrorMessage(
  parsed: AcknowledgedHttpResponse,
  fallbackPrefix = 'HTTP',
): string {
  const payload = parsed.data as any;

  const errorsArray = Array.isArray(payload?.errors) ? payload.errors : undefined;
  const errorsArrayMessage = errorsArray
    ?.map((entry: any) => {
      if (typeof entry === 'string') return entry;
      const detail = entry?.message || entry?.title || entry?.detail;
      return entry?.field && detail ? `${entry.field}: ${detail}` : detail;
    })
    .filter(Boolean)
    .join('; ');

  return (
    (errorsArrayMessage || undefined) ||
    (typeof payload?.error === 'string' ? payload.error : payload?.error?.message) ||
    payload?.message ||
    payload?.detail ||
    payload?.error_description ||
    (typeof payload === 'string' ? payload : '') ||
    `${fallbackPrefix} ${parsed.status}`
  );
}
