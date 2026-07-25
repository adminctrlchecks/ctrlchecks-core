import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { ENDPOINTS } from '@/config/endpoints';
import { awsClient } from '@/integrations/aws/client';
import { QUERY_KEYS } from '@/lib/queryKeys';

export type ConnectionReadinessStatus =
  | 'ready'
  | 'missing'
  | 'invalid_ref'
  | 'runtime_missing'
  | 'missing_scope'
  | 'expired'
  | 'revoked'
  | 'error';

export type ConnectionReadinessAction =
  | 'connect'
  | 'select_connection'
  | 'reconnect'
  | 'repair'
  | 'none';

export interface WorkflowMissingConnection {
  provider: string;
  displayName: string;
  nodes: string[];
  nodeId?: string;
  nodeLabel?: string;
  nodeType?: string;
  operation?: string;
  operationLabel?: string;
  credentialTypeId?: string;
  credentialLabel?: string;
  connectionId?: string;
  connectionName?: string;
  requiredScopes?: string[];
  availableScopes?: string[];
  candidateConnectionIds?: string[];
  status?: ConnectionReadinessStatus;
  action?: ConnectionReadinessAction;
  reason?: string;
}

interface ConnectionReadinessRow {
  nodeId: string;
  nodeLabel?: string;
  nodeType?: string;
  provider: string;
  providerLabel?: string;
  credentialTypeId?: string;
  credentialLabel?: string;
  operation?: string;
  operationLabel?: string;
  connectionId?: string;
  connectionName?: string;
  requiredScopes?: string[];
  availableScopes?: string[];
  candidateConnectionIds?: string[];
  status: ConnectionReadinessStatus;
  action?: ConnectionReadinessAction;
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
  const missingRows = body.connectionReadiness?.missing;
  if (Array.isArray(missingRows)) {
    const rows: WorkflowMissingConnection[] = missingRows.map((row) => ({
      provider: row.provider,
      displayName: row.providerLabel || providerDisplayName(row.provider),
      nodes: [row.nodeId],
      nodeId: row.nodeId,
      nodeLabel: row.nodeLabel,
      nodeType: row.nodeType,
      operation: row.operation,
      operationLabel: row.operationLabel,
      credentialTypeId: row.credentialTypeId,
      credentialLabel: row.credentialLabel,
      connectionId: row.connectionId,
      connectionName: row.connectionName,
      requiredScopes: row.requiredScopes,
      availableScopes: row.availableScopes,
      candidateConnectionIds: row.candidateConnectionIds,
      status: row.status,
      action: row.action,
      reason: row.reason,
    }));

    const coveredProviders = new Set(missingRows.map((row) => row.provider));
    for (const credential of body.credentials || []) {
      if (credential.satisfied !== false || coveredProviders.has(credential.provider)) continue;
      rows.push({
        provider: credential.provider,
        displayName: credential.displayName || providerDisplayName(credential.provider),
        nodes: credential.nodes || [],
      });
    }

    return rows;
  }

  return (body.credentials || [])
    .filter((credential) => credential.satisfied === false)
    .map((credential) => ({
      provider: credential.provider,
      displayName: credential.displayName || providerDisplayName(credential.provider),
      nodes: credential.nodes || [],
    }));
}

export async function fetchWorkflowMissingConnections(workflowId: string): Promise<WorkflowMissingConnection[]> {
  const { data: { session } } = await awsClient.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${ENDPOINTS.itemBackend}/api/workflows/${workflowId}/missing-items`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });

  if (!res.ok) return [];

  const body = await res.json();
  return missingConnectionsFromResponse(body);
}

export function useWorkflowConnectionStatus(workflowId: string | null | undefined) {
  const queryClient = useQueryClient();
  const location = useLocation();
  const wasOnConnections = useRef(false);

  const { data, isFetching, refetch } = useQuery({
    queryKey: QUERY_KEYS.workflowConnectionStatus(workflowId ?? 'unknown'),
    queryFn: () => fetchWorkflowMissingConnections(workflowId!),
    enabled: !!workflowId && workflowId !== 'new',
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 1,
  });

  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/connections')) {
      wasOnConnections.current = true;
    } else if (wasOnConnections.current && workflowId && workflowId !== 'new') {
      wasOnConnections.current = false;
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workflowConnectionStatus(workflowId) });
      refetch();
    }
  }, [location.pathname, workflowId, queryClient, refetch]);

  useEffect(() => {
    if (!workflowId || workflowId === 'new') return;
    const params = new URLSearchParams(location.search);
    if (params.has('connectionId') || params.has('oauth') || params.has('connected') || params.has('returnTo')) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workflowConnectionStatus(workflowId) });
      refetch();
    }
  }, [location.search, workflowId, queryClient, refetch]);

  return {
    missingConnections: data ?? [],
    isLoading: isFetching && data === undefined,
    recheck: refetch,
  };
}
