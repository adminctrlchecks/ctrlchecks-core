import { useMemo, useRef } from 'react';
import {
  classifyExecutionResult,
  extractServiceName,
  friendlyErrorMessage,
  type ExecutionResult,
  type NotificationConfig,
} from '../lib/executionNotifications';
import { extractOutcome, outcomeLabel } from '../lib/executionOutcome';

// ---------------------------------------------------------------------------
// Callbacks interface
// ---------------------------------------------------------------------------

export interface ExecutionNotificationCallbacks {
  /** Open the execution console, optionally scrolled to a specific node. */
  onViewLogs: (nodeId?: string) => void;
  /** Navigate to the Connections page for the given service. */
  onReconnect: (service: string) => void;
  /** Reload the execution console data. */
  onRefresh: () => void;
  /** Dismiss the notification with the given id. */
  onDismiss: (notificationId: string) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Derives a `NotificationConfig[]` from an `ExecutionResult`.
 *
 * Uses `useMemo` so the config array is only recomputed when `result` changes.
 * IDs are generated once per result change via a `useRef`-backed cache keyed on
 * `result.id`, ensuring stable React keys across re-renders that don't change
 * the underlying execution.
 */
export function useExecutionNotifications(
  result: ExecutionResult | null,
  callbacks: ExecutionNotificationCallbacks,
): NotificationConfig[] {
  // Cache generated IDs so they remain stable across renders that don't change
  // the execution result. Key: `${resultId}-${classification}-${index}`.
  const idCacheRef = useRef<Map<string, string>>(new Map());

  return useMemo(() => {
    if (!result) return [];

    const classification = classifyExecutionResult(result);
    const safeLogs = result.logs ?? [];
    const outcome =
      result.outcome ||
      extractOutcome(result.output) ||
      safeLogs.map((log) => log.outcome || extractOutcome(log)).find(Boolean) ||
      null;

    /** Returns a stable ID for a given cache key, generating one on first call. */
    const stableId = (cacheKey: string): string => {
      if (!idCacheRef.current.has(cacheKey)) {
        idCacheRef.current.set(
          cacheKey,
          `exec-notification-${classification}-${Date.now()}-${cacheKey}`,
        );
      }
      return idCacheRef.current.get(cacheKey)!;
    };

    // ------------------------------------------------------------------
    // full_success
    // ------------------------------------------------------------------
    if (classification === 'full_success') {
      const id = stableId(`${result.id}-full_success-0`);
      const config: NotificationConfig = {
        id,
        classification,
        severity: 'success',
        renderMode: 'toast',
        title: 'Workflow completed successfully! 🎉',
        message: 'All steps ran as expected.',
        autoDismissMs: 5000,
        actions: [
          {
            label: 'View Logs',
            onClick: () => {
              callbacks.onViewLogs();
              callbacks.onDismiss(id);
            },
          },
        ],
      };
      return [config];
    }

    // ------------------------------------------------------------------
    // partial_success
    // ------------------------------------------------------------------
    if (classification === 'partial_success') {
      const id = stableId(`${result.id}-partial_success-0`);

      const successfulNames = safeLogs
        .filter((l) => l.status === 'success')
        .map((l) => l.nodeName || l.nodeId || 'Unknown node');

      const skippedNames = safeLogs
        .filter((l) => l.status === 'skipped')
        .map((l) => l.nodeName || l.nodeId || 'Unknown node');

      const successPart =
        successfulNames.length > 0
          ? `Completed: ${successfulNames.join(', ')}.`
          : '';
      const skippedPart =
        skippedNames.length > 0
          ? `Skipped: ${skippedNames.join(', ')}.`
          : '';
      const message = [
        successPart,
        skippedPart,
        'Skipped steps were bypassed due to conditional routing.',
      ]
        .filter(Boolean)
        .join(' ');

      const config: NotificationConfig = {
        id,
        classification,
        severity: 'warning',
        renderMode: 'toast',
        title: 'Workflow completed with skipped steps',
        message,
        actions: [
          {
            label: 'View Logs',
            onClick: () => {
              callbacks.onViewLogs();
              callbacks.onDismiss(id);
            },
          },
        ],
      };
      return [config];
    }

    // ------------------------------------------------------------------
    // auth_failure — one config per unique service
    // ------------------------------------------------------------------
    if (classification === 'acknowledgement_warning') {
      const id = stableId(`${result.id}-acknowledgement_warning-0`);
      const failedLogs = safeLogs.filter((l) => l.status === 'failed');
      const firstFailedNodeId = failedLogs[0]?.nodeId;
      const nodeName =
        failedLogs[0]?.nodeName ||
        (firstFailedNodeId ? firstFailedNodeId.slice(0, 8) : 'This step');

      const config: NotificationConfig = {
        id,
        classification,
        severity: 'warning',
        renderMode: 'banner',
        title: 'Action may have completed',
        message: `${nodeName}: The action may have completed, but the response could not be read.`,
        resolution: 'View logs before retrying, especially for create, update, or delete actions.',
        actions: [
          {
            label: 'View Logs',
            onClick: () => {
              callbacks.onViewLogs(firstFailedNodeId);
              callbacks.onDismiss(id);
            },
          },
        ],
      };
      return [config];
    }

    if (classification === 'status_sync_issue') {
      const id = stableId(`${result.id}-status_sync_issue-0`);
      const config: NotificationConfig = {
        id,
        classification,
        severity: 'warning',
        renderMode: 'banner',
        title: 'Status sync needs attention',
        message: 'The action may have completed; status sync failed.',
        resolution: 'Refresh the execution details before running the workflow again.',
        actions: [
          {
            label: 'Refresh',
            onClick: () => {
              callbacks.onRefresh();
              callbacks.onDismiss(id);
            },
          },
        ],
      };
      return [config];
    }

    if (
      classification === 'stopped_expected' ||
      classification === 'needs_connection' ||
      classification === 'needs_configuration' ||
      classification === 'provider_unavailable'
    ) {
      const id = stableId(`${result.id}-${classification}-0`);
      const firstOutcomeLog = safeLogs.find((l) => l.outcome || extractOutcome(l));
      const nodeId = firstOutcomeLog?.nodeId;
      const title = outcome ? outcomeLabel(outcome) : 'Execution needs attention';
      const config: NotificationConfig = {
        id,
        classification,
        severity: 'warning',
        renderMode: 'banner',
        title,
        message: outcome?.userMessage || 'The workflow stopped before downstream steps ran.',
        resolution: outcome?.nextSteps?.join(' ') || 'Open the logs and review the suggested next step.',
        actions: [
          {
            label: 'View Logs',
            onClick: () => {
              callbacks.onViewLogs(nodeId);
              callbacks.onDismiss(id);
            },
          },
          ...(classification === 'provider_unavailable'
            ? [{
                label: 'Refresh',
                onClick: () => {
                  callbacks.onRefresh();
                  callbacks.onDismiss(id);
                },
              }]
            : []),
        ],
      };
      return [config];
    }

    if (classification === 'auth_failure') {
      const failedAuthLogs = safeLogs.filter(
        (l) =>
          l.status === 'failed' &&
          l.error &&
          l.error.toLowerCase().match(
            /authentication failed|token invalid|token expired|oauth|credentials not configured|re-authenticate/,
          ),
      );

      // Group by service name
      const byService = new Map<string, typeof failedAuthLogs>();
      for (const log of failedAuthLogs) {
        const service = extractServiceName(log.nodeType);
        if (!byService.has(service)) {
          byService.set(service, []);
        }
        byService.get(service)!.push(log);
      }

      const configs: NotificationConfig[] = [];
      let serviceIndex = 0;

      for (const [service, logs] of byService) {
        const id = stableId(`${result.id}-auth_failure-${serviceIndex}`);
        const firstLog = logs[0];
        const nodeName =
          firstLog.nodeName ||
          (firstLog.nodeId ? firstLog.nodeId.slice(0, 8) : 'Unknown node');

        const config: NotificationConfig = {
          id,
          classification,
          severity: 'error',
          renderMode: 'banner',
          title: `Action needed: Reconnect ${service}`,
          message: `Your ${service} connection needs to be refreshed. ${nodeName} couldn't complete because the account credentials expired.`,
          resolution: 'Reconnect your account to continue running this workflow.',
          actions: [
            {
              label: `Reconnect ${service}`,
              onClick: () => {
                callbacks.onReconnect(service);
                callbacks.onDismiss(id);
              },
            },
          ],
        };
        configs.push(config);
        serviceIndex++;
      }

      return configs;
    }

    // ------------------------------------------------------------------
    // node_error — single consolidated config
    // ------------------------------------------------------------------
    if (classification === 'node_error') {
      const id = stableId(`${result.id}-node_error-0`);

      const failedLogs = safeLogs.filter((l) => l.status === 'failed');
      const firstFailedNodeId = failedLogs[0]?.nodeId;

      const failedDescriptions = failedLogs.map((l) => {
        const name =
          l.nodeName ||
          (l.nodeId ? l.nodeId.slice(0, 8) : 'Unknown node');
        const friendly = friendlyErrorMessage(l.error);
        return `${name}: ${friendly}`;
      });

      const message =
        failedDescriptions.length > 0
          ? failedDescriptions.join(' | ')
          : 'One or more steps failed. Check the node configuration and try again.';

      const config: NotificationConfig = {
        id,
        classification,
        severity: 'error',
        renderMode: 'banner',
        title: "A step didn't complete",
        message,
        resolution: 'Check the node configuration and try again.',
        actions: [
          {
            label: 'View Logs',
            onClick: () => {
              callbacks.onViewLogs(firstFailedNodeId);
              callbacks.onDismiss(id);
            },
          },
        ],
      };
      return [config];
    }

    // ------------------------------------------------------------------
    // stuck
    // ------------------------------------------------------------------
    if (classification === 'stuck') {
      const id = stableId(`${result.id}-stuck-0`);
      const config: NotificationConfig = {
        id,
        classification,
        severity: 'warning',
        renderMode: 'banner',
        title: 'Your workflow finished running',
        message:
          'The results are ready — refresh to see the full execution details.',
        actions: [
          {
            label: 'Refresh',
            onClick: () => {
              callbacks.onRefresh();
              callbacks.onDismiss(id);
            },
          },
        ],
      };
      return [config];
    }

    // Exhaustive fallback (TypeScript should never reach here)
    return [];
  }, [result, callbacks]);
}
