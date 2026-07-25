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

export interface ConnectionReadinessRow {
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

export interface WorkflowReadinessIssue {
  kind?: string;
  nodeId?: string;
  nodeLabel?: string;
  nodeType?: string;
  operation?: string;
  operationLabel?: string;
  fieldKey?: string;
  fieldName?: string;
  fieldLabel?: string;
  label?: string;
  reason?: string;
  message?: string;
  description?: string;
  expectedType?: string;
  actualType?: string;
  provider?: string;
  displayName?: string;
  action?: ConnectionReadinessAction;
  status?: ConnectionReadinessStatus;
  [key: string]: unknown;
}

export interface WorkflowSetupStatus {
  ready: boolean;
  workflowId?: string;
  summary?: Record<string, unknown>;
  readinessIssues: WorkflowReadinessIssue[];
  missingInputs: WorkflowReadinessIssue[];
  missingCredentials: WorkflowReadinessIssue[];
  invalidInputs: WorkflowReadinessIssue[];
  runtimeValidationIssues: WorkflowReadinessIssue[];
  issues?: WorkflowReadinessIssue[];
  groupedIssues?: WorkflowReadinessIssue[];
  connectionReadiness?: {
    ready?: boolean;
    rows?: ConnectionReadinessRow[];
    missing?: ConnectionReadinessRow[];
    summary?: Record<string, unknown>;
  };
  missingConnections: WorkflowMissingConnection[];
  raw: Record<string, unknown>;
}

export interface WorkflowConnectionGroup {
  key: string;
  provider: string;
  displayName: string;
  credentialTypeId?: string;
  credentialLabel?: string;
  connectionId?: string;
  connectionName?: string;
  requiredScopes: string[];
  availableScopes: string[];
  candidateConnectionIds: string[];
  statuses: ConnectionReadinessStatus[];
  action: ConnectionReadinessAction;
  issues: WorkflowMissingConnection[];
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

function arrayFromBody<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

export function workflowSetupStatusFromResponse(body: Record<string, unknown>): WorkflowSetupStatus {
  const missingConnections = missingConnectionsFromResponse(body as Parameters<typeof missingConnectionsFromResponse>[0]);
  const connectionReadiness = body.connectionReadiness as WorkflowSetupStatus['connectionReadiness'];
  const readinessIssues = arrayFromBody<WorkflowReadinessIssue>(body.readinessIssues);
  const missingInputs = arrayFromBody<WorkflowReadinessIssue>(body.missingInputs);
  const missingCredentials = arrayFromBody<WorkflowReadinessIssue>(body.missingCredentials);
  const invalidInputs = arrayFromBody<WorkflowReadinessIssue>(body.invalidInputs);
  const runtimeValidationIssues = arrayFromBody<WorkflowReadinessIssue>(body.runtimeValidationIssues);
  const ready = typeof body.ready === 'boolean'
    ? body.ready
    : missingConnections.length === 0 &&
      missingInputs.length === 0 &&
      invalidInputs.length === 0 &&
      runtimeValidationIssues.length === 0 &&
      missingCredentials.length === 0;

  return {
    ready,
    workflowId: typeof body.workflowId === 'string' ? body.workflowId : undefined,
    summary: typeof body.summary === 'object' && body.summary !== null ? body.summary as Record<string, unknown> : undefined,
    readinessIssues,
    missingInputs,
    missingCredentials,
    invalidInputs,
    runtimeValidationIssues,
    issues: arrayFromBody<WorkflowReadinessIssue>(body.issues),
    groupedIssues: arrayFromBody<WorkflowReadinessIssue>(body.groupedIssues),
    connectionReadiness,
    missingConnections,
    raw: body,
  };
}

function actionRank(action: ConnectionReadinessAction): number {
  switch (action) {
    case 'select_connection': return 5;
    case 'reconnect': return 4;
    case 'repair': return 3;
    case 'connect': return 2;
    case 'none': return 1;
    default: return 0;
  }
}

export function groupWorkflowConnectionIssues(issues: WorkflowMissingConnection[]): WorkflowConnectionGroup[] {
  const groups = new Map<string, WorkflowConnectionGroup>();
  for (const issue of issues) {
    const candidateKey = (issue.candidateConnectionIds || []).slice().sort().join(',');
    const ambiguityKey = issue.action === 'select_connection' || candidateKey ? `ambiguous:${candidateKey}` : '';
    const key = [
      issue.provider,
      issue.credentialTypeId || '',
      issue.connectionId || '',
      ambiguityKey,
    ].join(':');
    const existing = groups.get(key) || {
      key,
      provider: issue.provider,
      displayName: issue.displayName,
      credentialTypeId: issue.credentialTypeId,
      credentialLabel: issue.credentialLabel,
      connectionId: issue.connectionId,
      connectionName: issue.connectionName,
      requiredScopes: [],
      availableScopes: [],
      candidateConnectionIds: [],
      statuses: [],
      action: issue.action || 'connect',
      issues: [],
    };

    existing.issues.push(issue);
    if (issue.status && !existing.statuses.includes(issue.status)) existing.statuses.push(issue.status);
    if (issue.action && actionRank(issue.action) > actionRank(existing.action)) existing.action = issue.action;
    for (const scope of issue.requiredScopes || []) {
      if (!existing.requiredScopes.includes(scope)) existing.requiredScopes.push(scope);
    }
    for (const scope of issue.availableScopes || []) {
      if (!existing.availableScopes.includes(scope)) existing.availableScopes.push(scope);
    }
    for (const connectionId of issue.candidateConnectionIds || []) {
      if (!existing.candidateConnectionIds.includes(connectionId)) existing.candidateConnectionIds.push(connectionId);
    }
    groups.set(key, existing);
  }
  return Array.from(groups.values());
}

export async function fetchWorkflowSetupStatus(workflowId: string): Promise<WorkflowSetupStatus> {
  const { data: { session } } = await awsClient.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${ENDPOINTS.itemBackend}/api/workflows/${workflowId}/missing-items`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });

  if (!res.ok) {
    return workflowSetupStatusFromResponse({
      ready: false,
      readinessIssues: [{ kind: 'readiness_check', message: 'Setup check could not be completed.' }],
      connectionReadiness: { missing: [] },
    });
  }

  const body = await res.json();
  return workflowSetupStatusFromResponse(body);
}

export async function fetchWorkflowMissingConnections(workflowId: string): Promise<WorkflowMissingConnection[]> {
  const status = await fetchWorkflowSetupStatus(workflowId);
  return status.missingConnections;
}

export function useWorkflowConnectionStatus(workflowId: string | null | undefined) {
  const queryClient = useQueryClient();
  const location = useLocation();
  const wasOnConnections = useRef(false);

  const { data, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: QUERY_KEYS.workflowConnectionStatus(workflowId ?? 'unknown'),
    queryFn: () => fetchWorkflowSetupStatus(workflowId!),
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
    readiness: data,
    missingConnections: data?.missingConnections ?? [],
    isReady: data?.ready ?? false,
    isLoading: isFetching && data === undefined,
    isFetching,
    checkedAt: dataUpdatedAt,
    recheck: refetch,
  };
}
