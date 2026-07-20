import type { QueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from './queryKeys';

/**
 * Invalidates every query that depends on connection state.
 * Call this after any OAuth callback success or credential save so that
 * the Connections list, credential dropdowns, status badges, and the
 * workflow connection gate all refresh automatically — whether the change
 * happened in this tab, a popup window, or a redirect flow.
 *
 * Pass `workflowId` when the change happened in a specific workflow's
 * context; otherwise every workflow's connection-status query is
 * invalidated (inactive queries are marked stale and refetch on remount).
 */
export function invalidateAfterConnectionChange(qc: QueryClient, workflowId?: string): void {
  qc.invalidateQueries({ queryKey: QUERY_KEYS.connections });
  qc.invalidateQueries({ queryKey: QUERY_KEYS.credentialTypes });
  if (workflowId) {
    qc.invalidateQueries({ queryKey: QUERY_KEYS.workflowConnectionStatus(workflowId) });
  } else {
    qc.invalidateQueries({ queryKey: QUERY_KEYS.workflowConnectionStatusRoot });
  }
}
