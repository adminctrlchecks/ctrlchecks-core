import { getBackendUrl } from './getBackendUrl';
import { awsClient } from '@/integrations/aws/client';

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await awsClient.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchMysqlTablesForConnection(connectionId: string): Promise<string[]> {
  const headers = await authHeaders();
  const res = await fetch(`${getBackendUrl()}/api/database-explorer/mysql/tables`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ connectionId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return json.tables as string[];
}

export interface MysqlTablePreview {
  columns: string[];
  rows: Record<string, unknown>[];
}

export async function fetchMysqlTablePreview(connectionId: string, table: string): Promise<MysqlTablePreview> {
  const headers = await authHeaders();
  const res = await fetch(`${getBackendUrl()}/api/database-explorer/mysql/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ connectionId, table }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return { columns: json.columns as string[], rows: json.rows as Record<string, unknown>[] };
}

export async function fetchPostgresTablesForConnection(connectionId: string): Promise<string[]> {
  const headers = await authHeaders();
  const res = await fetch(`${getBackendUrl()}/api/database-explorer/postgres/tables`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ connectionId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return json.tables as string[];
}

export interface PostgresTablePreview {
  columns: string[];
  rows: Record<string, unknown>[];
}

export async function fetchPostgresTablePreview(connectionId: string, table: string): Promise<PostgresTablePreview> {
  const headers = await authHeaders();
  const res = await fetch(`${getBackendUrl()}/api/database-explorer/postgres/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ connectionId, table }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return { columns: json.columns as string[], rows: json.rows as Record<string, unknown>[] };
}

export async function fetchMongoCollectionsForConnection(connectionId: string): Promise<string[]> {
  const headers = await authHeaders();
  const res = await fetch(`${getBackendUrl()}/api/database-explorer/mongo/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ connectionId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return json.collections as string[];
}

export interface MongoCollectionPreview {
  columns: string[];
  rows: Record<string, unknown>[];
}

export async function fetchMongoCollectionPreview(connectionId: string, collection: string): Promise<MongoCollectionPreview> {
  const headers = await authHeaders();
  const res = await fetch(`${getBackendUrl()}/api/database-explorer/mongo/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ connectionId, collection }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return { columns: json.columns as string[], rows: json.rows as Record<string, unknown>[] };
}

export async function fetchFirebaseCollectionsForConnection(connectionId: string): Promise<string[]> {
  const headers = await authHeaders();
  const res = await fetch(`${getBackendUrl()}/api/database-explorer/firebase/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ connectionId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return json.collections as string[];
}

export interface FirebaseCollectionPreview {
  columns: string[];
  rows: Record<string, unknown>[];
}

export async function fetchFirebaseCollectionPreview(connectionId: string, collection: string): Promise<FirebaseCollectionPreview> {
  const headers = await authHeaders();
  const res = await fetch(`${getBackendUrl()}/api/database-explorer/firebase/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ connectionId, collection }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return { columns: json.columns as string[], rows: json.rows as Record<string, unknown>[] };
}

export async function fetchSupabaseTablesForConnection(connectionId: string): Promise<string[]> {
  const headers = await authHeaders();
  const res = await fetch(`${getBackendUrl()}/api/database-explorer/supabase/tables`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ connectionId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return json.tables as string[];
}

export interface SupabaseTablePreview {
  columns: string[];
  rows: Record<string, unknown>[];
}

export async function fetchSupabaseTablePreview(connectionId: string, table: string): Promise<SupabaseTablePreview> {
  const headers = await authHeaders();
  const res = await fetch(`${getBackendUrl()}/api/database-explorer/supabase/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ connectionId, table }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return { columns: json.columns as string[], rows: json.rows as Record<string, unknown>[] };
}
