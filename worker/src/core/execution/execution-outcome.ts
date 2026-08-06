export type ExecutionOutcomeKind =
  | 'completed'
  | 'stopped_expected'
  | 'needs_connection'
  | 'needs_configuration'
  | 'provider_unavailable'
  | 'system_error'
  | 'acknowledgement_uncertain';

export type ExecutionOutcomeReason =
  | 'not_found'
  | 'empty_result'
  | 'invalid_input'
  | 'missing_required_input'
  | 'auth_expired'
  | 'permission_denied'
  | 'rate_limit'
  | 'timeout'
  | 'provider_5xx'
  | 'internal_error'
  | 'unknown';

export type ExecutionOutcomeSource =
  | 'user_data'
  | 'user_config'
  | 'connection'
  | 'provider'
  | 'ctrlchecks';

export type ExecutionOutcomeSeverity = 'success' | 'info' | 'warning' | 'error';

export interface ExecutionOutcome {
  kind: ExecutionOutcomeKind;
  reason: ExecutionOutcomeReason;
  source: ExecutionOutcomeSource;
  severity: ExecutionOutcomeSeverity;
  retryable: boolean;
  userMessage: string;
  developerMessage?: string;
  nextSteps: string[];
  technical?: Record<string, unknown>;
}

export interface ExecutionOutcomeContext {
  nodeId?: string;
  nodeType?: string;
  nodeName?: string;
  config?: Record<string, unknown>;
  input?: unknown;
  output?: unknown;
  error?: unknown;
}

const ID_OPERATIONS = new Set(['get', 'update', 'delete', 'read', 'retrieve', 'get_by_id', 'fetch']);
const INTERNAL_PATTERNS = [
  'integrity error',
  'not found in registry',
  'not registered',
  'registry-only mode',
  'malformed node contract',
  'output validation failed',
  'system initialization failure',
  'unhandled execution error',
];

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function humanize(value: unknown, fallback = 'item'): string {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  return raw
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function deriveProvider(context: ExecutionOutcomeContext): string {
  const label = getString(context.nodeName);
  if (label && !/^node\s/i.test(label)) return label;
  const nodeType = getString(context.nodeType);
  const firstSegment = nodeType.split(/[_-]/)[0] || 'Provider';
  return humanize(firstSegment, 'Provider');
}

function deriveOperation(context: ExecutionOutcomeContext): string {
  const output = toRecord(context.output);
  const details = toRecord(output._errorDetails);
  const config = context.config || {};
  return String(
    output.operation ||
    details.operation ||
    config.operation ||
    config.action ||
    ''
  ).trim();
}

function deriveResource(context: ExecutionOutcomeContext): string {
  const output = toRecord(context.output);
  const details = toRecord(output._errorDetails);
  const config = context.config || {};
  const direct = output.resource || details.resource || config.resource || config.object || config.entity;
  return humanize(direct, 'record');
}

function collectValidationMessages(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') return [prefix ? `${prefix}: ${value}` : value];
  if (typeof value === 'number' || typeof value === 'boolean') {
    return [prefix ? `${prefix}: ${String(value)}` : String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectValidationMessages(item, prefix));
  }
  const record = toRecord(value);
  return Object.entries(record).flatMap(([key, nested]) => {
    const nextPrefix = prefix ? `${prefix}.${humanize(key, key)}` : humanize(key, key);
    return collectValidationMessages(nested, nextPrefix);
  });
}

function valueForField(record: Record<string, unknown>, field: string): unknown {
  if (Object.prototype.hasOwnProperty.call(record, field)) return record[field];
  const normalized = field.toLowerCase().replace(/\s+/g, '');
  const match = Object.keys(record).find((key) => key.toLowerCase().replace(/[_\s-]+/g, '') === normalized);
  return match ? record[match] : undefined;
}

function providerValidationDetails(context: ExecutionOutcomeContext): {
  field?: string;
  summary?: string;
  configuredValue?: unknown;
} {
  const output = toRecord(context.output);
  const details = toRecord(output._errorDetails);
  const errors = details.errors ?? details.error ?? details.message ?? output.errors;
  const messages = collectValidationMessages(errors);
  const summary = messages[0] || '';
  const rawField = summary.includes(':') ? summary.split(':')[0].trim() : '';
  const field = rawField ? rawField.split('.').pop() : undefined;
  const config = context.config || {};
  const data = toRecord(config.data);
  const configuredValue = field ? (valueForField(data, field) ?? valueForField(config, field)) : undefined;
  return { field, summary, configuredValue };
}

function extractErrorMessage(context: ExecutionOutcomeContext): string {
  const output = toRecord(context.output);
  const errorRecord = toRecord(context.error);
  const nestedError = toRecord(output.error);
  return (
    getString(output._error) ||
    getString(output.error) ||
    getString(nestedError.message) ||
    getString(errorRecord.message) ||
    (context.error instanceof Error ? context.error.message : '') ||
    String(context.error || '')
  ).trim();
}

function extractHttpStatus(context: ExecutionOutcomeContext): number | undefined {
  const output = toRecord(context.output);
  const details = toRecord(output._errorDetails);
  const nestedError = toRecord(output.error);
  const candidates = [
    output.status,
    output.statusCode,
    output.httpStatus,
    details.status,
    details.statusCode,
    details.httpStatus,
    nestedError.status,
    nestedError.statusCode,
    nestedError.httpStatus,
  ];
  for (const candidate of candidates) {
    const num = typeof candidate === 'number' ? candidate : Number(candidate);
    if (Number.isFinite(num) && num > 0) return num;
  }

  const message = extractErrorMessage(context);
  const match = message.match(/\b(4\d\d|5\d\d)\b/);
  return match ? Number(match[1]) : undefined;
}

function hasConfiguredId(context: ExecutionOutcomeContext): boolean {
  const config = context.config || {};
  const input = toRecord(context.input);
  return ['id', 'recordId', 'objectId', 'itemId', 'resourceId']
    .some((key) => Boolean(config[key] || input[key]));
}

function isIdOperation(operation: string, context: ExecutionOutcomeContext): boolean {
  const normalized = operation.trim().toLowerCase();
  return ID_OPERATIONS.has(normalized) || hasConfiguredId(context);
}

function technical(context: ExecutionOutcomeContext, message: string, httpStatus?: number): Record<string, unknown> {
  return {
    nodeId: context.nodeId,
    nodeType: context.nodeType,
    nodeName: context.nodeName,
    httpStatus,
    error: message,
    output: context.output,
  };
}

function buildOutcome(
  context: ExecutionOutcomeContext,
  partial: Omit<ExecutionOutcome, 'technical'> & { technical?: Record<string, unknown> },
): ExecutionOutcome {
  const message = extractErrorMessage(context);
  const httpStatus = extractHttpStatus(context);
  return {
    ...partial,
    developerMessage: partial.developerMessage || message || partial.userMessage,
    technical: {
      ...technical(context, message, httpStatus),
      ...(partial.technical || {}),
    },
  };
}

export function classifyExecutionOutcome(context: ExecutionOutcomeContext): ExecutionOutcome {
  const message = extractErrorMessage(context);
  const lower = message.toLowerCase();
  const httpStatus = extractHttpStatus(context);
  const provider = deriveProvider(context);
  const operation = deriveOperation(context);
  const resource = deriveResource(context);
  const config = context.config || {};
  const output = toRecord(context.output);

  if (!message && output._error === undefined && output.error === undefined) {
    const hasEmptyItems = Array.isArray(output.items) && output.items.length === 0;
    const hasEmptyData = Array.isArray(output.data) && output.data.length === 0;
    const hasEmptyResults = Array.isArray(output.results) && output.results.length === 0;
    const hasEmptyRecords = Array.isArray(output.records) && output.records.length === 0;

    return {
      kind: 'completed',
      reason: hasEmptyItems || hasEmptyData || hasEmptyResults || hasEmptyRecords ? 'empty_result' : 'unknown',
      source: hasEmptyItems || hasEmptyData || hasEmptyResults || hasEmptyRecords ? 'provider' : 'ctrlchecks',
      severity: 'success',
      retryable: false,
      userMessage: hasEmptyItems || hasEmptyData || hasEmptyResults || hasEmptyRecords
        ? `${provider} returned no matching ${resource === 'record' ? 'items' : `${resource} items`}.`
        : 'Workflow completed successfully.',
      nextSteps: [],
      technical: technical(context, '', httpStatus),
    };
  }

  if (
    lower.includes('acknowledgement') ||
    lower.includes('could not be read') ||
    lower.includes('unexpected end of json input')
  ) {
    return buildOutcome(context, {
      kind: 'acknowledgement_uncertain',
      reason: 'unknown',
      source: 'provider',
      severity: 'warning',
      retryable: false,
      userMessage: `${provider} accepted the request, but CtrlChecks could not confirm the final response.`,
      nextSteps: [
        `Check ${provider} before retrying this step.`,
        'Review the technical response in the execution log.',
      ],
    });
  }

  if (
    httpStatus === 401 ||
    /expired token|invalid token|token expired|unauthorized|invalid oauth|oauth token|session expired|invalid session|invalid_session_id/i.test(message)
  ) {
    return buildOutcome(context, {
      kind: 'needs_connection',
      reason: 'auth_expired',
      source: 'connection',
      severity: 'warning',
      retryable: false,
      userMessage: `${provider} needs a refreshed connection before this step can run.`,
      nextSteps: [
        `Reconnect ${provider} in Connections.`,
        'Run the workflow again after the connection is active.',
      ],
    });
  }

  if (httpStatus === 403 || /permission denied|missing scope|insufficient scope|forbidden|not authorized/i.test(message)) {
    return buildOutcome(context, {
      kind: 'needs_connection',
      reason: 'permission_denied',
      source: 'connection',
      severity: 'warning',
      retryable: false,
      userMessage: `${provider} blocked this step because the connected account lacks permission.`,
      nextSteps: [
        `Check the ${provider} account permissions and OAuth scopes.`,
        'Reconnect with an account that can access this resource.',
      ],
    });
  }

  if (
    output._connectionError === true ||
    /connection.*not available|connection not found|not active|connect .*account|access token not found|api key not found|credentials not found|credential.*required/i.test(message)
  ) {
    return buildOutcome(context, {
      kind: 'needs_connection',
      reason: 'auth_expired',
      source: 'connection',
      severity: 'warning',
      retryable: false,
      userMessage: `${provider} needs a valid connection before this step can run.`,
      nextSteps: [
        `Connect or reconnect ${provider}.`,
        'Save the workflow, then run it again.',
      ],
    });
  }

  if (httpStatus === 429 || /rate limit|too many requests/i.test(message)) {
    return buildOutcome(context, {
      kind: 'provider_unavailable',
      reason: 'rate_limit',
      source: 'provider',
      severity: 'warning',
      retryable: true,
      userMessage: `${provider} is rate-limiting this workflow right now.`,
      nextSteps: [
        'Wait a moment, then retry the workflow.',
        'Reduce polling or batch size if this happens often.',
      ],
    });
  }

  if (httpStatus && httpStatus >= 500) {
    return buildOutcome(context, {
      kind: 'provider_unavailable',
      reason: 'provider_5xx',
      source: 'provider',
      severity: 'warning',
      retryable: true,
      userMessage: `${provider} is temporarily unavailable.`,
      nextSteps: [
        `Check ${provider} service status.`,
        'Retry the workflow after the provider recovers.',
      ],
    });
  }

  if (/timeout|timed out|econnreset|econnrefused|enotfound|fetch failed|network error|socket hang up/i.test(message)) {
    return buildOutcome(context, {
      kind: 'provider_unavailable',
      reason: 'timeout',
      source: 'provider',
      severity: 'warning',
      retryable: true,
      userMessage: `${provider} could not be reached in time.`,
      nextSteps: [
        'Retry the workflow.',
        `Check whether ${provider} is reachable from your network.`,
      ],
    });
  }

  if (
    httpStatus === 400 ||
    httpStatus === 422 ||
    output._validationErrors ||
    /configuration validation failed|runtime input.*failed|required field|required for|is required|missing required|must be provided|invalid input|invalid value|validation failed|isn't valid|is not valid/i.test(message)
  ) {
    const validation = providerValidationDetails(context);
    const fieldLabel = validation.field ? humanize(validation.field, validation.field).toLowerCase() : '';
    const valueText = validation.configuredValue !== undefined && validation.configuredValue !== null && validation.configuredValue !== ''
      ? ` "${String(validation.configuredValue)}"`
      : '';
    return buildOutcome(context, {
      kind: 'needs_configuration',
      reason: /required|missing|must be provided/i.test(`${message} ${validation.summary || ''}`) ? 'missing_required_input' : 'invalid_input',
      source: 'user_config',
      severity: 'warning',
      retryable: false,
      userMessage: fieldLabel
        ? `${provider} rejected the ${resource} ${fieldLabel}${valueText}.`
        : `${provider} rejected this ${resource} configuration.`,
      developerMessage: validation.summary || message,
      nextSteps: [
        validation.summary
          ? validation.summary
          : 'Review the provider validation details in the execution log.',
        fieldLabel
          ? `Update the ${fieldLabel} field to a value accepted by ${provider}.`
          : `Update this node with values accepted by ${provider}.`,
        'Save the workflow, then run it again.',
      ],
    });
  }

  if (INTERNAL_PATTERNS.some((pattern) => lower.includes(pattern))) {
    return buildOutcome(context, {
      kind: 'system_error',
      reason: 'internal_error',
      source: 'ctrlchecks',
      severity: 'error',
      retryable: false,
      userMessage: 'CtrlChecks hit an internal execution error.',
      nextSteps: [
        'Open the execution logs and share the technical details with support.',
        'Retry after the issue is fixed.',
      ],
    });
  }

  if (
    httpStatus === 404 ||
    /not found|resource does not exist|requested resource does not exist|no such|does not exist/i.test(message)
  ) {
    const hasIdContext = isIdOperation(operation, context);
    return buildOutcome(context, {
      kind: 'stopped_expected',
      reason: 'not_found',
      source: 'user_data',
      severity: 'warning',
      retryable: false,
      userMessage: hasIdContext
        ? `${provider} could not find this ${resource} record.`
        : `${provider} could not find the requested ${resource}.`,
      nextSteps: [
        hasIdContext
          ? `Verify the ${resource} ID exists in the connected ${provider} account.`
          : `Check that the ${resource} exists in ${provider}.`,
        'Use a Query/List operation first if the ID may change.',
        `Map the returned ${String(config.idField || 'Id')} into this node.`,
      ],
    });
  }

  return buildOutcome(context, {
    kind: 'system_error',
    reason: 'unknown',
    source: 'ctrlchecks',
    severity: 'error',
    retryable: false,
    userMessage: 'CtrlChecks could not safely classify this execution error.',
    nextSteps: [
      'Review the technical details in the execution log.',
      'Retry only after confirming the node configuration and provider status.',
    ],
  });
}

export function isNonFailureOutcome(outcome: ExecutionOutcome): boolean {
  return outcome.kind !== 'system_error';
}
