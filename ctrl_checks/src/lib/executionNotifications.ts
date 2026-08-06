/**
 * Core utility functions and types for the execution result notification system.
 * All functions are pure with no side effects.
 */

import { extractOutcome, isAttentionOutcome, type ExecutionOutcome } from './executionOutcome';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The five possible execution outcome categories. */
export type ExecutionClassification =
  | 'full_success'
  | 'partial_success'
  | 'acknowledgement_warning'
 | 'status_sync_issue'
  | 'stopped_expected'
  | 'needs_connection'
  | 'needs_configuration'
  | 'provider_unavailable'
  | 'auth_failure'
  | 'node_error'
  | 'stuck';

/** Severity maps to visual style and persistence behavior. */
export type NotificationSeverity = 'success' | 'warning' | 'error';

/** Render mode: toast floats in the corner; banner renders inline above the console. */
export type NotificationRenderMode = 'toast' | 'banner';

export interface NotificationActionButton {
  label: string;
  /** Called when the button is clicked. The notification is dismissed after this runs. */
  onClick: () => void;
}

export interface NotificationConfig {
  id: string;                          // stable key for React rendering
  classification: ExecutionClassification;
  severity: NotificationSeverity;
  renderMode: NotificationRenderMode;
  title: string;
  message: string;
  resolution?: string;                 // optional second-line instruction
  /** Duration in ms before auto-dismiss. Undefined = no auto-dismiss. */
  autoDismissMs?: number;
  actions: NotificationActionButton[];
}

export interface ExecutionNodeLog {
  nodeId: string;
  nodeName: string;
  nodeType?: string;
  status: 'success' | 'failed' | 'skipped' | 'running' | 'pending' | 'stopped';
  error?: string | null;
  outcome?: ExecutionOutcome;
  metadata?: {
    operationStatus?: 'succeeded' | 'failed' | 'unknown';
    acknowledgementStatus?: 'parsed' | 'empty_success' | 'parse_failed' | 'not_required';
    persistenceStatus?: 'saved' | 'delayed' | 'failed';
    [key: string]: unknown;
  };
}

export interface ExecutionResult {
  id: string;
  status: string;           // backend terminal status: 'success' | 'failed' | 'running' | ...
  logs: ExecutionNodeLog[] | null;
  error?: string | null;
  outcome?: ExecutionOutcome | null;
  output?: unknown;
  /** Node statuses currently displayed in the UI (used to detect stale RUNNING state). */
  uiNodeStatuses?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Auth error detection
// ---------------------------------------------------------------------------

export const AUTH_ERROR_PATTERNS = [
  'authentication failed',
  'token invalid',
  'token expired',
  'oauth',
  'credentials not configured',
  're-authenticate',
] as const;

/**
 * Returns true when the lowercased error string matches any auth error pattern.
 */
export function isAuthError(errorString: string | null | undefined): boolean {
  if (!errorString) return false;
  const lower = errorString.toLowerCase();
  return AUTH_ERROR_PATTERNS.some((pattern) => lower.includes(pattern));
}

export function isAcknowledgementIssue(log: ExecutionNodeLog): boolean {
  const lower = String(log.error || '').toLowerCase();
  return (
    log.metadata?.acknowledgementStatus === 'parse_failed' ||
    lower.includes('acknowledgement') ||
    lower.includes('could not be read') ||
    lower.includes('unexpected end of json input')
  );
}

export function isStatusSyncIssue(errorString: string | null | undefined): boolean {
  if (!errorString) return false;
  const lower = errorString.toLowerCase();
  return (
    lower.includes('db circuit') ||
    lower.includes('database unreachable') ||
    lower.includes('failed to get execution status') ||
    lower.includes('status sync') ||
    lower.includes('execution status')
  );
}

// ---------------------------------------------------------------------------
// classifyExecutionResult
// ---------------------------------------------------------------------------

const TERMINAL_STATUSES = new Set(['success', 'failed', 'completed', 'error']);

/**
 * Classifies an execution result into one of five categories.
 * Applies checks in priority order: stuck → auth_failure → node_error → partial_success → full_success.
 * Never throws. Handles null/empty logs gracefully.
 */
export function classifyExecutionResult(result: ExecutionResult): ExecutionClassification {
  try {
    const { status, logs, uiNodeStatuses } = result;

    // 1. Stuck — backend is terminal but UI still shows a running node
    if (TERMINAL_STATUSES.has(status) && uiNodeStatuses) {
      const hasRunningUiNode = Object.values(uiNodeStatuses).some(
        (s) => s === 'running',
      );
      if (hasRunningUiNode) return 'stuck';
    }

    const safeLogs = logs ?? [];
    const outcome =
      result.outcome ||
      extractOutcome(result.output) ||
      safeLogs.map((log) => log.outcome || extractOutcome(log)).find(Boolean) ||
      null;

    if (isAttentionOutcome(outcome)) {
      if (outcome.kind === 'stopped_expected') return 'stopped_expected';
      if (outcome.kind === 'needs_connection') return 'needs_connection';
      if (outcome.kind === 'needs_configuration') return 'needs_configuration';
      if (outcome.kind === 'provider_unavailable') return 'provider_unavailable';
      if (outcome.kind === 'acknowledgement_uncertain') return 'acknowledgement_warning';
    }

    if (isStatusSyncIssue(result.error)) {
      return 'status_sync_issue';
    }

    // 2. Auth failure — any failed node whose error matches an auth pattern
    const hasAuthFailure = safeLogs.some(
      (log) => log.status === 'failed' && isAuthError(log.error),
    );
    if (hasAuthFailure) return 'auth_failure';

    const failedLogs = safeLogs.filter((log) => log.status === 'failed');
    if (failedLogs.length > 0 && failedLogs.every(isAcknowledgementIssue)) {
      return 'acknowledgement_warning';
    }

    // 3. Node error — any failed node (no auth error matched)
    if (failedLogs.length > 0) return 'node_error';

    // If logs were null/empty but backend status indicates failure, treat as node_error
    if (!logs && TERMINAL_STATUSES.has(status) && status !== 'success') {
      return 'node_error';
    }

    // 4. Partial success — at least one skipped, none failed
    const hasSkipped = safeLogs.some((log) => log.status === 'skipped');
    if (hasSkipped) return 'partial_success';

    // 5. Full success — all success (or no logs and backend status is success)
    return 'full_success';
  } catch {
    // Never throw — fall back to node_error
    return 'node_error';
  }
}

// ---------------------------------------------------------------------------
// friendlyErrorMessage
// ---------------------------------------------------------------------------

/**
 * Converts a raw error string into a user-friendly message.
 * Never exposes stack traces, error codes, or internal identifiers.
 * Applies pattern matching in order; first match wins.
 */
export function friendlyErrorMessage(rawError: string | null | undefined): string {
  if (!rawError) {
    return 'Something went wrong in this step. Check the node configuration and try again.';
  }

  const lower = rawError.toLowerCase();

  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'The step took too long to complete. Try again or check the service status.';
  }

  if (lower.includes('rate limit') || lower.includes('429')) {
    return 'The service is temporarily rate-limited. Wait a moment and try again.';
  }

  if (lower.includes('not found') || lower.includes('404')) {
    return 'A required resource was not found. Check the node configuration.';
  }

  if (
    lower.includes('permission') ||
    lower.includes('403') ||
    lower.includes('forbidden')
  ) {
    return "The connected account doesn't have permission for this action.";
  }

  if (
    lower.includes('acknowledgement') ||
    lower.includes('could not be read') ||
    lower.includes('unexpected end of json input')
  ) {
    return 'The action may have completed, but the response could not be read.';
  }

  if (isStatusSyncIssue(rawError)) {
    return 'The action may have completed; status sync failed.';
  }

  if (
    lower.includes('network') ||
    lower.includes('econnrefused') ||
    lower.includes('fetch failed')
  ) {
    return 'Could not reach the service. Check your internet connection and try again.';
  }

  if (lower.includes('invalid')) {
    return 'The node received unexpected data. Check the input configuration.';
  }

  return 'Something went wrong in this step. Check the node configuration and try again.';
}

// ---------------------------------------------------------------------------
// extractServiceName
// ---------------------------------------------------------------------------

const SERVICE_PREFIX_MAP: Array<[string, string]> = [
  ['google_', 'Google'],
  ['slack_', 'Slack'],
  ['hubspot_', 'HubSpot'],
  ['salesforce_', 'Salesforce'],
  ['notion_', 'Notion'],
  ['github_', 'GitHub'],
  ['linkedin_', 'LinkedIn'],
  ['twitter_', 'Twitter'],
  ['facebook_', 'Facebook'],
  ['instagram_', 'Instagram'],
  ['whatsapp_', 'WhatsApp'],
  ['zoho_', 'Zoho'],
  ['stripe_', 'Stripe'],
  ['airtable_', 'Airtable'],
];

/**
 * Derives a human-readable service name from a node type string.
 * Uses prefix-based matching; falls back to capitalising the first segment.
 */
export function extractServiceName(nodeType: string | undefined): string {
  if (!nodeType) return 'Unknown';

  const lower = nodeType.toLowerCase();

  for (const [prefix, name] of SERVICE_PREFIX_MAP) {
    if (lower.startsWith(prefix)) return name;
  }

  // Fallback: capitalize the first segment (split on _ or -)
  const firstSegment = nodeType.split(/[_-]/)[0] ?? nodeType;
  return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1);
}
