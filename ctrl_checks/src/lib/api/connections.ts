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
    let parsedMessage = '';
    try {
      const parsed = JSON.parse(body) as { error?: string; message?: string };
      parsedMessage = parsed.error || parsed.message || '';
    } catch {
      // Body was not JSON; use the raw response text below.
    }
    const err = new Error(parsedMessage || body || `Request failed: ${res.status}`) as Error & { statusCode?: number };
    err.statusCode = res.status;
    throw err;
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

// ─── Types (mirrors backend ConnectionRecord) ─────────────────────────────────
export type ConnectionStatus = 'active' | 'error' | 'revoked';
export type AuthType = 'oauth2' | 'api_key' | 'bearer_token' | 'basic_auth' | 'custom_header' | 'query_auth';

export interface ConnectionRecord {
  id: string;
  userId: string;
  name: string;
  credentialTypeId: string;
  provider: string;
  authType: AuthType;
  status: ConnectionStatus;
  metadata: Record<string, unknown>;
  expiresAt: string | null;
  revokedAt?: string | null;
  replacedByConnectionId?: string | null;
  externalAccountId?: string | null;
  externalAccountEmail?: string | null;
  lastTestedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialFieldSchema {
  name: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'number' | 'select' | 'textarea';
  required: boolean;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  options?: Array<{ label: string; value: string }>;
  helpText?: string;
  guide?: CredentialFieldGuide;
  secret?: boolean;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    url?: boolean;
  };
}

export interface CredentialFieldGuide {
  label: string;
  description: string;
  whereToFind: string;
  example?: string;
  notes?: string[];
}

export interface CredentialGuide {
  summary: string;
  prerequisites: string[];
  steps: string[];
  fieldGuides: Record<string, CredentialFieldGuide>;
  securityNotes: string[];
  docsUrl?: string;
  troubleshooting?: string[];
}

export interface CredentialTypeDefinition {
  id: string;
  provider: string;
  displayName: string;
  authType: AuthType;
  inputFields: CredentialFieldSchema[];
  guide?: CredentialGuide;
  form: {
    layout: 'stacked' | 'sections';
    submitLabel?: string;
    oauthButtonLabel?: string;
    testLabel?: string;
  };
  maskFields: string[];
}

export interface ConnectionTestResult {
  ok: boolean;
  status: number;
  message: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function listConnections(): Promise<ConnectionRecord[]> {
  const data = await apiFetch<{ connections: ConnectionRecord[] }>(
    '/api/credential-connections/connections',
  );
  return data.connections;
}

export async function createConnection(input: {
  name: string;
  credentialTypeId: string;
  provider?: string;
  authType?: AuthType;
  credentials: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): Promise<ConnectionRecord> {
  const data = await apiFetch<{ connection: ConnectionRecord }>(
    '/api/credential-connections/connections',
    { method: 'POST', body: JSON.stringify(input) },
  );
  return data.connection;
}

export async function updateConnection(
  id: string,
  patch: { name?: string; credentials?: Record<string, unknown>; metadata?: Record<string, unknown> },
): Promise<ConnectionRecord> {
  const data = await apiFetch<{ connection: ConnectionRecord }>(
    `/api/credential-connections/connections/${id}`,
    { method: 'PUT', body: JSON.stringify(patch) },
  );
  return data.connection;
}

export async function deleteConnection(id: string): Promise<void> {
  await apiFetch<void>(`/api/credential-connections/connections/${id}`, { method: 'DELETE' });
}

export async function testConnection(id: string): Promise<ConnectionTestResult> {
  return apiFetch<ConnectionTestResult>(
    `/api/credential-connections/connections/${id}/test`,
    { method: 'POST', body: '{}' },
  );
}

export async function startOAuth(
  credentialTypeId: string,
  opts?: { connectionId?: string; scopes?: string[]; returnTo?: string },
): Promise<{ authorizationUrl: string; state: string }> {
  return apiFetch<{ authorizationUrl: string; state: string }>(
    '/api/credential-connections/oauth/start',
    {
      method: 'POST',
      body: JSON.stringify({ credentialTypeId, ...opts }),
    },
  );
}

export async function reconnectOAuth(
  connectionId: string,
  opts?: { returnTo?: string },
): Promise<{ authorizationUrl: string; state: string }> {
  return apiFetch<{ authorizationUrl: string; state: string }>(
    `/api/credential-connections/connections/${connectionId}/reconnect`,
    { method: 'POST', body: JSON.stringify(opts || {}) },
  );
}

export async function listCredentialTypes(): Promise<CredentialTypeDefinition[]> {
  const data = await apiFetch<{ credentialTypes: CredentialTypeDefinition[] }>(
    '/api/credential-connections/credential-types',
  );
  return data.credentialTypes;
}
