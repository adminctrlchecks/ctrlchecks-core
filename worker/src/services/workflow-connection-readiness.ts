/**
 * Workflow Connection Readiness Service
 *
 * Single authoritative, scope-aware answer to "can every credential-bearing
 * node in this workflow actually run?". The Connections page shows saved
 * `connections` rows, but runtime execution resolves through
 * `unified_credentials` with node-specific scopes (e.g. Gmail needs
 * `gmail.send`). This service reconciles both stores per node and returns
 * one readiness envelope that the workflow gate, run button, and execution
 * preflight can all consume.
 *
 * Security: never log or return secrets, access/refresh tokens, encrypted
 * credentials, or raw OAuth payloads — only ids, providers, scopes, statuses.
 */

import {
  credentialRequirementForNode,
  normalizeProvider,
} from './credential-scope-registry';
import { resolveCredentialDryRun } from './credential-resolver';
import {
  CredentialExpiredError,
  CredentialMissingScopeError,
  CredentialNotFoundError,
  CredentialRefreshError,
  credentialFixMessage,
} from './credential-errors';
import { connectionService } from '../credentials-system/connection-service';
import { credentialTypeDefinitions } from '../credentials-system/credential-type-registry';
import type { ConnectionRecord } from '../credentials-system/types';
import { logger } from '../core/logger';

export type ConnectionReadinessStatus =
  | 'ready'
  | 'missing'
  | 'expired'
  | 'missing_scope'
  | 'error';

export type ConnectionReadinessAuthType =
  | 'oauth2'
  | 'api_key'
  | 'bearer_token'
  | 'basic_auth'
  | 'custom_header'
  | 'query_auth';

export interface WorkflowConnectionRequirement {
  workflowId: string;
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  /** Canonical provider (google, linkedin, notion, …) */
  provider: string;
  /** Canonical credential type id (google_oauth2, …) */
  credentialTypeId: string;
  authType: ConnectionReadinessAuthType;
  requiredScopes: string[];
}

export interface ConnectionReadinessRow extends WorkflowConnectionRequirement {
  status: ConnectionReadinessStatus;
  connectionId?: string;
  credentialId?: string;
  source: 'connections' | 'unified_credentials' | 'legacy_token_table' | 'credential_service';
  availableScopes?: string[];
  reason?: string;
  checkedAt: string;
}

export interface WorkflowConnectionReadinessResponse {
  workflowId: string;
  ready: boolean;
  rows: ConnectionReadinessRow[];
  missing: ConnectionReadinessRow[];
  summary: {
    requiredCount: number;
    readyCount: number;
    missingCount: number;
    missingScopeCount: number;
    expiredCount: number;
  };
}

export interface ReadinessNode {
  id?: string;
  type?: string;
  data?: {
    type?: string;
    label?: string;
    name?: string;
  };
}

/**
 * Aliases seen across the codebase / stored workflow JSON for provider and
 * credential-type identifiers. Normalized once here — never in the UI,
 * wizard, preflight, or execution individually.
 */
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

/** Find the canonical OAuth2 credential-type id for a provider (google -> google_oauth2). */
function credentialTypeIdForProvider(provider: string): { credentialTypeId: string; authType: ConnectionReadinessAuthType } {
  const canonical = canonicalProvider(provider);
  const oauthDef = credentialTypeDefinitions.find(
    (definition) => definition.provider === canonical && definition.authType === 'oauth2',
  );
  if (oauthDef) return { credentialTypeId: canonicalCredentialTypeId(oauthDef.id), authType: 'oauth2' };

  const anyDef = credentialTypeDefinitions.find((definition) => definition.provider === canonical);
  if (anyDef) {
    return {
      credentialTypeId: canonicalCredentialTypeId(anyDef.id),
      authType: anyDef.authType as ConnectionReadinessAuthType,
    };
  }
  return { credentialTypeId: `${canonical}_oauth2`, authType: 'oauth2' };
}

/** "https://www.googleapis.com/auth/gmail.send" -> "gmail.send" for display. */
function shortScopeLabel(scope: string): string {
  const trimmed = scope.replace(/\/+$/, '');
  const lastSegment = trimmed.slice(trimmed.lastIndexOf('/') + 1);
  return lastSegment || scope;
}

interface DryRunOutcome {
  status: ConnectionReadinessStatus;
  credentialId?: string;
  availableScopes?: string[];
  reason?: string;
}

async function dryRunCredential(
  userId: string,
  provider: string,
  requiredScopes: string[],
  action: string,
): Promise<DryRunOutcome> {
  try {
    const credential = await resolveCredentialDryRun({
      userId,
      provider,
      requiredScopes,
      action,
    });
    return {
      status: 'ready',
      credentialId: credential.id,
      availableScopes: credential.scopes,
    };
  } catch (error) {
    if (error instanceof CredentialMissingScopeError) {
      const scopeLabels = requiredScopes.map(shortScopeLabel).join(', ');
      return {
        status: 'missing_scope',
        availableScopes: error.availableScopes,
        reason: `Connected ${provider} account is missing the ${scopeLabels} permission. Reconnect ${provider} to grant it.`,
      };
    }
    if (error instanceof CredentialExpiredError || error instanceof CredentialRefreshError) {
      return {
        status: 'expired',
        reason: `${provider} credential expired and could not be refreshed. ${credentialFixMessage(provider, requiredScopes)}`,
      };
    }
    if (error instanceof CredentialNotFoundError) {
      return {
        status: 'missing',
        reason: `No active ${provider} credential found for the required permission(s).`,
      };
    }
    return {
      status: 'error',
      reason: `Credential check failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function getWorkflowConnectionReadiness(input: {
  workflowId: string;
  userId: string;
  nodes: ReadinessNode[];
  includeSatisfied?: boolean;
}): Promise<WorkflowConnectionReadinessResponse> {
  const { workflowId, userId, nodes } = input;
  const includeSatisfied = input.includeSatisfied !== false;
  const checkedAt = new Date().toISOString();

  // Memoize per provider+scopes so N nodes sharing a requirement hit the
  // credential store once.
  const dryRunCache = new Map<string, Promise<DryRunOutcome>>();
  const connectionCache = new Map<string, Promise<ConnectionRecord | null>>();

  const rows: ConnectionReadinessRow[] = [];

  for (const node of nodes || []) {
    const nodeType = (node.data?.type || node.type || '').trim();
    if (!nodeType) continue;

    const requirement = credentialRequirementForNode(nodeType);
    if (!requirement) continue;

    const provider = canonicalProvider(requirement.provider);
    const requiredScopes = requirement.requiredScopes;
    const { credentialTypeId, authType } = credentialTypeIdForProvider(provider);
    const nodeLabel = node.data?.label || node.data?.name || nodeType;
    const nodeId = node.id || nodeType;

    const dryRunKey = `${provider}::${[...requiredScopes].sort().join('+')}`;
    if (!dryRunCache.has(dryRunKey)) {
      dryRunCache.set(dryRunKey, dryRunCredential(userId, provider, requiredScopes, nodeLabel));
    }
    if (!connectionCache.has(provider)) {
      connectionCache.set(
        provider,
        connectionService.findCanonicalConnectionByProvider(userId, provider).catch(() => null),
      );
    }

    const [dryRunOutcome, connection] = await Promise.all([
      dryRunCache.get(dryRunKey)!,
      connectionCache.get(provider)!,
    ]);

    const outcome: DryRunOutcome =
      requiredScopes.length === 0 && connection
        ? {
            status: 'ready',
            credentialId: connection.id,
            availableScopes: [],
          }
        : dryRunOutcome;

    let reason = outcome.reason;
    if (outcome.status === 'missing' && connection) {
      // The exact "Active but Not connected" contradiction: a saved
      // connections row exists but no runtime credential backs it.
      reason = `A saved ${provider} connection exists but its runtime credential is missing. Reconnect ${provider} to restore access.`;
    }

    rows.push({
      workflowId,
      nodeId,
      nodeType,
      nodeLabel,
      provider,
      credentialTypeId,
      authType,
      requiredScopes,
      status: outcome.status,
      connectionId: connection?.id,
      credentialId: outcome.credentialId,
      source: outcome.status === 'ready' ? 'unified_credentials' : connection ? 'connections' : 'unified_credentials',
      availableScopes: outcome.availableScopes,
      reason,
      checkedAt,
    });
  }

  const missing = rows.filter((row) => row.status !== 'ready');
  const summary = {
    requiredCount: rows.length,
    readyCount: rows.filter((row) => row.status === 'ready').length,
    missingCount: missing.length,
    missingScopeCount: rows.filter((row) => row.status === 'missing_scope').length,
    expiredCount: rows.filter((row) => row.status === 'expired').length,
  };

  for (const row of missing) {
    logger.info(
      `[ConnectionReadiness] workflow=${workflowId} node=${row.nodeId} type=${row.nodeType} provider=${row.provider} status=${row.status} connectionRow=${row.connectionId ? 'found' : 'none'} requiredScopes=${row.requiredScopes.join(',')} availableScopes=${(row.availableScopes || []).join(',') || 'n/a'}`,
    );
  }

  return {
    workflowId,
    ready: missing.length === 0,
    rows: includeSatisfied ? rows : missing,
    missing,
    summary,
  };
}
