import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { ENDPOINTS } from '@/config/endpoints';
import { awsClient } from '@/integrations/aws/client';
import { QUERY_KEYS } from '@/lib/queryKeys';

export type ConnectionReadinessStatus = 'ready' | 'missing' | 'expired' | 'missing_scope' | 'error';

export interface WorkflowMissingConnection {
  provider: string;
  displayName: string;
  nodes: string[];
  /** Present when the backend returned the scope-aware readiness envelope. */
  status?: ConnectionReadinessStatus;
  /** Human-readable explanation (e.g. "missing Gmail send permission"). */
  reason?: string;
}

interface ConnectionReadinessRow {
  nodeId: string;
  provider: string;
  status: ConnectionReadinessStatus;
  reason?: string;
}

const PROVIDER_DISPLAY: Record<string, string> = {
  google: 'Google',
  microsoft: 'Microsoft',
  slack: 'Slack',
  github: 'GitHub',
  notion: 'Notion',
  twitter: 'Twitter / X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  whatsapp: 'WhatsApp',
  salesforce: 'Salesforce',
  zoho: 'Zoho',
  youtube: 'YouTube',
  calendly: 'Calendly',
  linear: 'Linear',
  trello: 'Trello',
  typeform: 'Typeform',
};

function providerDisplayName(provider: string): string {
  return PROVIDER_DISPLAY[provider.toLowerCase()] ?? provider.charAt(0).toUpperCase() + provider.slice(1);
}

export function missingConnectionsFromResponse(body: {
  connectionReadiness?: { missing?: ConnectionReadinessRow[] };
  credentials?: Array<{ provider: string; displayName?: string; nodes?: string[]; satisfied?: boolean }>;
}): WorkflowMissingConnection[] {
  // Prefer the scope-aware readiness envelope when the backend provides it —
  // it distinguishes missing / missing_scope / expired instead of a generic
  // not-connected state.
  const missingRows = body.connectionReadiness?.missing;
  if (Array.isArray(missingRows)) {
    const byProvider = new Map<string, WorkflowMissingConnection>();
    for (const row of missingRows) {
      const existing = byProvider.get(row.provider);
      if (existing) {
        if (!existing.nodes.includes(row.nodeId)) existing.nodes.push(row.nodeId);
        if (!existing.reason && row.reason) existing.reason = row.reason;
      } else {
        byProvider.set(row.provider, {
          provider: row.provider,
          displayName: providerDisplayName(row.provider),
          nodes: [row.nodeId],
          status: row.status,
          reason: row.reason,
        });
      }
    }

    // The readiness envelope only covers OAuth providers it knows about;
    // legacy credentials may still report other missing items (api keys etc.).
    for (const c of body.credentials || []) {
      if (c.satisfied !== false || byProvider.has(c.provider)) continue;
      byProvider.set(c.provider, {
        provider: c.provider,
        displayName: c.displayName || providerDisplayName(c.provider),
        nodes: c.nodes || [],
      });
    }

    return Array.from(byProvider.values());
  }

  // Legacy fallback: only credentials that are explicitly missing
  return (body.credentials || [])
    .filter((c) => c.satisfied === false)
    .map((c) => ({
      provider: c.provider,
      displayName: c.displayName || providerDisplayName(c.provider),
      nodes: c.nodes || [],
    }));
}

async function fetchWorkflowMissingConnections(workflowId: string): Promise<WorkflowMissingConnection[]> {
  const { data: { session } } = await awsClient.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${ENDPOINTS.itemBackend}/api/workflows/${workflowId}/missing-items`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) return [];

  const body = await res.json();
  return missingConnectionsFromResponse(body);
}

export function useWorkflowConnectionStatus(workflowId: string | null | undefined) {
  const [queryEnabled, setQueryEnabled] = useState(false);
  const queryClient = useQueryClient();
  const location = useLocation();
  const wasOnConnections = useRef(false);

  // 7-second delay before first check — gives the workflow time to fully render
  // Resets whenever workflowId changes (new workflow opened)
  useEffect(() => {
    setQueryEnabled(false);
    if (!workflowId || workflowId === 'new') return;
    const timer = setTimeout(() => setQueryEnabled(true), 7000);
    return () => clearTimeout(timer);
  }, [workflowId]);

  const { data, isFetching, refetch } = useQuery({
    queryKey: QUERY_KEYS.workflowConnectionStatus(workflowId ?? 'unknown'),
    queryFn: () => fetchWorkflowMissingConnections(workflowId!),
    enabled: queryEnabled && !!workflowId && workflowId !== 'new',
    staleTime: 30_000,
    retry: 1,
  });

  // Auto-recheck when user navigates back from /connections while this hook
  // stays mounted. (The Connections page also invalidates the query on exit,
  // which covers the case where the workflow page unmounted in between.)
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/connections')) {
      wasOnConnections.current = true;
    } else if (wasOnConnections.current && workflowId && workflowId !== 'new') {
      wasOnConnections.current = false;
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workflowConnectionStatus(workflowId) });
    }
  }, [location.pathname, workflowId, queryClient]);

  // isLoading = true only when the API call is actually in flight (not during the 7s delay)
  const isLoading = queryEnabled && isFetching && data === undefined;

  return {
    missingConnections: data ?? [],
    isLoading,
    recheck: refetch,
  };
}
