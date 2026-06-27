/**
 * Credential Retriever Utility
 * 
 * Helper functions for nodes to retrieve credentials from the vault during execution.
 * 
 * Features:
 * - Automatic decryption
 * - Access control validation
 * - Never logs secrets
 * - Supports workflow-specific and user-level credentials
 */

import { getCredentialVault, CredentialAccessContext } from '../../services/credential-vault';
import { connectionService } from '../../credentials-system/connection-service';
import { getCredentialType } from '../../credentials-system/credential-type-registry';
import type { AuthType, DecryptedConnection } from '../../credentials-system/types';

const CONNECTION_SECRET_AUTH_TYPES: AuthType[] = [
  'api_key',
  'bearer_token',
  'basic_auth',
  'custom_header',
  'query_auth',
];

const PROVIDER_ALIASES_BY_KEY: Record<string, string[]> = {
  discord_webhook: ['discord'],
  microsoft_teams: ['microsoft'],
  supabase: ['db'],
  api_key: ['generic'],
  bearer_token: ['generic'],
  basic_auth: ['generic'],
};

const CREDENTIAL_TYPE_SUFFIXES = [
  'api_key',
  'api_token',
  'bot_token',
  'app_password',
  'webhook',
  'credentials',
  'connection',
  'token',
  'pat',
  'api',
];

const SECRET_VALUE_KEYS = [
  'apiToken',
  'apiKey',
  'token',
  'secretKey',
  'accessToken',
  'authToken',
  'botToken',
  'appPassword',
  'password',
  'url',
  'value',
];

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function stripCredentialSuffix(key: string): string {
  for (const suffix of CREDENTIAL_TYPE_SUFFIXES) {
    const marker = `_${suffix}`;
    if (key.endsWith(marker) && key.length > marker.length) {
      return key.slice(0, -marker.length);
    }
  }
  return key;
}

function credentialTypeCandidatesForKey(key: string): string[] {
  const normalized = key.trim().toLowerCase();
  const base = stripCredentialSuffix(normalized);
  const bases = unique([normalized, base]);
  const candidates = bases.flatMap((item) => [
    item,
    `${item}_api_key`,
    `${item}_api_token`,
    `${item}_bot_token`,
    `${item}_app_password`,
    `${item}_webhook`,
    `${item}_credentials`,
    `${item}_connection`,
    `${item}_token`,
    `${item}_pat`,
    `${item}_api`,
  ]);
  return unique(candidates).filter((credentialTypeId) => {
    const definition = getCredentialType(credentialTypeId);
    return !!definition && CONNECTION_SECRET_AUTH_TYPES.includes(definition.authType);
  });
}

function providerCandidatesForKey(key: string): string[] {
  const normalized = key.trim().toLowerCase();
  const base = stripCredentialSuffix(normalized);
  return unique([
    ...(PROVIDER_ALIASES_BY_KEY[normalized] || []),
    ...(PROVIDER_ALIASES_BY_KEY[base] || []),
    normalized,
    base,
  ]);
}

function legacyCredentialValueFromConnection(connection: DecryptedConnection): string {
  const credentials = connection.credentials || {};
  const stringEntries = Object.entries(credentials)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim().length > 0);

  if (stringEntries.length === 1) {
    return stringEntries[0][1].trim();
  }

  const secretEntries = SECRET_VALUE_KEYS
    .map((key) => [key, credentials[key]] as const)
    .filter((entry): entry is readonly [string, string] => typeof entry[1] === 'string' && entry[1].trim().length > 0);

  if (secretEntries.length === 1 && stringEntries.length === 1) {
    return secretEntries[0][1].trim();
  }

  return JSON.stringify(credentials);
}

async function retrieveConnectionCredential(
  context: CredentialAccessContext,
  key: string,
): Promise<{ value: string; metadata: Record<string, unknown> } | null> {
  const userId = typeof context.userId === 'string' ? context.userId.trim() : '';
  if (!userId) return null;

  for (const credentialTypeId of credentialTypeCandidatesForKey(key)) {
    const record = await connectionService.findCanonicalConnection(userId, credentialTypeId);
    if (!record) continue;
    const connection = await connectionService.getDecryptedConnection(userId, record.id);
    return {
      value: legacyCredentialValueFromConnection(connection),
      metadata: {
        source: 'connections',
        connectionId: connection.id,
        credentialTypeId: connection.credentialTypeId,
        provider: connection.provider,
      },
    };
  }

  for (const provider of providerCandidatesForKey(key)) {
    const record = await connectionService.findCanonicalConnectionByProvider(
      userId,
      provider,
      CONNECTION_SECRET_AUTH_TYPES,
    );
    if (!record) continue;
    const connection = await connectionService.getDecryptedConnection(userId, record.id);
    return {
      value: legacyCredentialValueFromConnection(connection),
      metadata: {
        source: 'connections',
        connectionId: connection.id,
        credentialTypeId: connection.credentialTypeId,
        provider: connection.provider,
      },
    };
  }

  return null;
}

/**
 * Retrieve credential for node execution
 * 
 * @param context - Access context (userId, workflowId, nodeId, nodeType)
 * @param key - Credential key (e.g., 'google_oauth_gmail', 'openai_api_key')
 * @returns Decrypted credential value or null if not found
 */
export async function retrieveCredential(
  context: CredentialAccessContext,
  key: string
): Promise<string | null> {
  try {
    const vault = getCredentialVault();
    const value = await vault.retrieve(context, key);
    if (value) return value;

    const connectionCredential = await retrieveConnectionCredential(context, key);
    return connectionCredential?.value || null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[CredentialRetriever] Failed to retrieve credential ${key}:`, errorMessage);
    try {
      const connectionCredential = await retrieveConnectionCredential(context, key);
      return connectionCredential?.value || null;
    } catch {
      return null;
    }
  }
}

/**
 * Retrieve credential with metadata
 * 
 * @param context - Access context
 * @param key - Credential key
 * @returns Credential value and metadata or null if not found
 */
export async function retrieveCredentialWithMetadata(
  context: CredentialAccessContext,
  key: string
): Promise<{ value: string; metadata?: any } | null> {
  try {
    const vault = getCredentialVault();
    const result = await vault.retrieveWithMetadata(context, key);
    if (result) return result;

    return await retrieveConnectionCredential(context, key);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[CredentialRetriever] Failed to retrieve credential ${key}:`, errorMessage);
    try {
      return await retrieveConnectionCredential(context, key);
    } catch {
      return null;
    }
  }
}

/**
 * Check if credential exists
 * 
 * @param context - Access context
 * @param key - Credential key
 * @returns True if credential exists
 */
export async function credentialExists(
  context: CredentialAccessContext,
  key: string
): Promise<boolean> {
  try {
    const vault = getCredentialVault();
    const exists = await vault.exists(context, key);
    if (exists) return true;

    return !!(await retrieveConnectionCredential(context, key));
  } catch (error) {
    console.error(`[CredentialRetriever] Failed to check credential ${key}:`, error);
    try {
      return !!(await retrieveConnectionCredential(context, key));
    } catch {
      return false;
    }
  }
}
