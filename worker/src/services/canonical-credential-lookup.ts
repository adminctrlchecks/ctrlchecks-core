import { connectionService } from '../credentials-system/connection-service';
import type { AuthType, ConnectionRecord, DecryptedConnection } from '../credentials-system/types';
import {
  getDecryptedConnectionRemote,
  listConnectionsRemote,
  shouldUseCredentialService,
} from './credential-service-client';
import { normalizeProvider } from './credential-scope-registry';

type CredentialLookupSource = 'connections' | 'credential_service';

export interface CanonicalConnectionLookupResult {
  connection: ConnectionRecord;
  source: CredentialLookupSource;
}

export interface DecryptedConnectionLookupResult {
  connection: DecryptedConnection;
  source: CredentialLookupSource;
}

const PROVIDER_ALIASES: Record<string, string> = {
  gmail: 'google',
  google_gmail: 'google',
};

const CREDENTIAL_TYPE_ALIASES: Record<string, string> = {
  google_oauth: 'google_oauth2',
  'google oauth': 'google_oauth2',
};

export function canonicalProvider(provider: string): string {
  const key = provider.trim().toLowerCase();
  return normalizeProvider(PROVIDER_ALIASES[key] || key);
}

export function canonicalCredentialTypeId(value: string): string {
  const key = value.trim().toLowerCase().replace(/\s+/g, ' ');
  return CREDENTIAL_TYPE_ALIASES[key] || key.replace(/\s+/g, '_');
}

function isActive(connection: ConnectionRecord): boolean {
  if (connection.status !== 'active') return false;
  if (!connection.expiresAt) return true;
  return new Date(connection.expiresAt).getTime() > Date.now();
}

function byMostRecentlyUsed(a: ConnectionRecord, b: ConnectionRecord): number {
  const aTime = new Date(a.lastUsedAt || a.updatedAt || a.createdAt || 0).getTime();
  const bTime = new Date(b.lastUsedAt || b.updatedAt || b.createdAt || 0).getTime();
  return bTime - aTime;
}

async function listRemoteActiveConnections(userId: string): Promise<ConnectionRecord[] | null> {
  if (!shouldUseCredentialService(userId)) return null;
  const rows = await listConnectionsRemote(userId);
  return rows?.filter(isActive).sort(byMostRecentlyUsed) ?? null;
}

export async function listCanonicalConnections(userId: string): Promise<{
  connections: ConnectionRecord[];
  source: CredentialLookupSource;
}> {
  const remote = await listRemoteActiveConnections(userId);
  if (remote !== null) return { connections: remote, source: 'credential_service' };
  return { connections: await connectionService.listConnections(userId), source: 'connections' };
}

export async function findCanonicalConnection(
  userId: string,
  credentialTypeId: string,
): Promise<CanonicalConnectionLookupResult | null> {
  const canonicalTypeId = canonicalCredentialTypeId(credentialTypeId);
  const remote = await listRemoteActiveConnections(userId);
  const remoteMatch = remote?.find((connection) => (
    canonicalCredentialTypeId(connection.credentialTypeId) === canonicalTypeId
  ));
  if (remoteMatch) return { connection: remoteMatch, source: 'credential_service' };

  const local = await connectionService.findCanonicalConnection(userId, canonicalTypeId);
  return local ? { connection: local, source: 'connections' } : null;
}

export async function findCanonicalConnectionByProvider(
  userId: string,
  provider: string,
  authTypes?: AuthType[],
): Promise<CanonicalConnectionLookupResult | null> {
  const canonical = canonicalProvider(provider);
  const authTypeSet = authTypes?.length ? new Set<AuthType>(authTypes) : null;
  const remote = await listRemoteActiveConnections(userId);
  const remoteMatch = remote?.find((connection) => (
    canonicalProvider(connection.provider) === canonical &&
    (!authTypeSet || authTypeSet.has(connection.authType))
  ));
  if (remoteMatch) return { connection: remoteMatch, source: 'credential_service' };

  const local = await connectionService.findCanonicalConnectionByProvider(userId, canonical, authTypes);
  return local ? { connection: local, source: 'connections' } : null;
}

export async function listCanonicalConnectionsByProvider(
  userId: string,
  provider: string,
  authTypes?: AuthType[],
): Promise<{ connections: ConnectionRecord[]; source: CredentialLookupSource }> {
  const canonical = canonicalProvider(provider);
  const authTypeSet = authTypes?.length ? new Set<AuthType>(authTypes) : null;
  const all = await listCanonicalConnections(userId);
  const now = Date.now();
  const connections = all.connections
    .filter((connection) => (
      canonicalProvider(connection.provider) === canonical &&
      (!authTypeSet || authTypeSet.has(connection.authType)) &&
      connection.status === 'active' &&
      (!connection.expiresAt || new Date(connection.expiresAt).getTime() > now)
    ))
    .sort(byMostRecentlyUsed);
  return { connections, source: all.source };
}

export async function getDecryptedConnection(
  userId: string,
  connectionId: string,
): Promise<DecryptedConnectionLookupResult | null> {
  if (shouldUseCredentialService(userId)) {
    const remote = await getDecryptedConnectionRemote(userId, connectionId);
    if (remote) return { connection: remote, source: 'credential_service' };
  }

  const local = await connectionService.getDecryptedConnection(userId, connectionId);
  return { connection: local, source: 'connections' };
}

export async function findDecryptedCanonicalConnection(
  userId: string,
  credentialTypeId: string,
): Promise<DecryptedConnectionLookupResult | null> {
  const found = await findCanonicalConnection(userId, credentialTypeId);
  if (!found) return null;
  return getDecryptedConnection(userId, found.connection.id);
}

export async function markConnectionUsed(userId: string, connectionId: string, source: CredentialLookupSource): Promise<void> {
  if (source === 'connections') {
    await connectionService.markUsed(userId, connectionId);
  }
}
