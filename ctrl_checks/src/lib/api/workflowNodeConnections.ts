import { getBackendUrl } from './getBackendUrl';
import { awsClient } from '@/integrations/aws/client';

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await awsClient.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${getBackendUrl()}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...headers, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let message = body;
    try {
      const parsed = JSON.parse(body) as { error?: string; message?: string };
      message = parsed.error || parsed.message || body;
    } catch {
      // Keep raw body.
    }
    throw new Error(message || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface WorkflowNodeConnectionBinding {
  id: string;
  workflowId: string;
  userId: string;
  nodeId: string;
  nodeType: string;
  provider: string;
  credentialTypeId: string | null;
  connectionId: string;
  role: string;
  metadata: Record<string, unknown>;
  connectionName?: string;
  connectionStatus?: string;
  authType?: string;
  createdAt: string;
  updatedAt: string;
}

export async function listWorkflowNodeConnections(
  workflowId: string,
): Promise<WorkflowNodeConnectionBinding[]> {
  const data = await apiFetch<{ bindings: WorkflowNodeConnectionBinding[] }>(
    `/api/workflows/${workflowId}/node-connections`,
  );
  return data.bindings;
}

export async function upsertWorkflowNodeConnection(input: {
  workflowId: string;
  nodeId: string;
  nodeType: string;
  provider: string;
  credentialTypeId?: string | null;
  connectionId: string;
  role?: string;
  metadata?: Record<string, unknown>;
}): Promise<WorkflowNodeConnectionBinding> {
  const data = await apiFetch<{ binding: WorkflowNodeConnectionBinding }>(
    `/api/workflows/${input.workflowId}/nodes/${input.nodeId}/connections`,
    {
      method: 'PUT',
      body: JSON.stringify({
        nodeType: input.nodeType,
        provider: input.provider,
        credentialTypeId: input.credentialTypeId,
        connectionId: input.connectionId,
        role: input.role || 'primary',
        metadata: input.metadata || {},
      }),
    },
  );
  return data.binding;
}
