/**
 * Workflow Connection Readiness Service
 *
 * Canonical, registry-driven answer to whether every credential-capable node
 * has a usable connection. This is the single backend contract consumed by
 * workflow open/save/run/debug readiness paths.
 */

import {
  credentialRequirementForNode,
} from './credential-scope-registry';
import { resolveCredentialDryRun } from './credential-resolver';
import {
  CredentialExpiredError,
  CredentialMissingScopeError,
  CredentialNotFoundError,
  CredentialRefreshError,
  credentialFixMessage,
} from './credential-errors';
import { credentialTypeDefinitions } from '../credentials-system/credential-type-registry';
import type { AuthType, ConnectionRecord } from '../credentials-system/types';
import { logger } from '../core/logger';
import {
  canonicalCredentialTypeId,
  canonicalProvider,
  getDecryptedConnection,
  listCanonicalConnectionsByProvider,
} from './canonical-credential-lookup';
import { connectorRegistry } from './connectors/connector-registry';
import { hydrateWorkflowNodeConnectionBindings } from './workflow-node-connections';

export { canonicalCredentialTypeId, canonicalProvider } from './canonical-credential-lookup';

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
  operation?: string;
  operationLabel?: string;
  provider: string;
  providerLabel: string;
  credentialTypeId: string;
  credentialLabel: string;
  authType: ConnectionReadinessAuthType;
  requiredScopes: string[];
}

export interface ConnectionReadinessRow extends WorkflowConnectionRequirement {
  status: ConnectionReadinessStatus;
  action: ConnectionReadinessAction;
  connectionId?: string;
  connectionName?: string;
  credentialId?: string;
  source: 'connections' | 'unified_credentials' | 'legacy_token_table' | 'credential_service' | 'none';
  availableScopes?: string[];
  explicitRef?: string;
  explicitRefKey?: string;
  legacyRef?: string;
  candidateConnectionIds?: string[];
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
    invalidRefCount: number;
    runtimeMissingCount: number;
    missingScopeCount: number;
    expiredCount: number;
    revokedCount: number;
    errorCount: number;
  };
}

export interface ReadinessNode {
  id?: string;
  type?: string;
  data?: {
    type?: string;
    label?: string;
    name?: string;
    config?: Record<string, unknown>;
    connectionRefs?: Record<string, unknown>;
    connectionId?: string;
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface PreparedConnectionRequirement {
  node: ReadinessNode;
  base: WorkflowConnectionRequirement;
  provider: string;
  listKey: string;
  credentialType: {
    credentialTypeId: string;
    authType: ConnectionReadinessAuthType;
    label: string;
  };
  vaultKey?: string;
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

function nodeConfig(node: ReadinessNode): Record<string, unknown> {
  return (node.data?.config || {}) as Record<string, unknown>;
}

function nodeOperation(node: ReadinessNode): string | undefined {
  const op = nodeConfig(node).operation;
  return typeof op === 'string' && op.trim() ? op.trim() : undefined;
}

function humanizeKey(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function providerDisplayName(provider: string): string {
  return humanizeKey(provider || 'connection');
}

function credentialTypeForProvider(provider: string): { credentialTypeId: string; authType: ConnectionReadinessAuthType; label: string } {
  const canonical = canonicalProvider(provider);
  // Prefer a non-OAuth credential type when a provider has more than one registered (e.g.
  // Mailchimp has both mailchimp_api_key and mailchimp_oauth2): a plain API-key/basic-auth type
  // only needs the user's own credentials, while OAuth needs a CtrlChecks-side app registration
  // (CLIENT_ID/CLIENT_SECRET) that may not be configured. Picking OAuth by default here caused
  // a working, correctly-connected API-key connection to be permanently reported as mismatched
  // against a requirement for an unconfigured OAuth type. Falls back to OAuth only when it's the
  // sole credential type registered for the provider.
  const nonOauthDef = credentialTypeDefinitions.find(
    (definition) => definition.provider === canonical && definition.authType !== 'oauth2',
  );
  const anyDef = nonOauthDef || credentialTypeDefinitions.find((definition) => definition.provider === canonical);
  if (anyDef) {
    return {
      credentialTypeId: canonicalCredentialTypeId(anyDef.id),
      authType: anyDef.authType as ConnectionReadinessAuthType,
      label: anyDef.displayName || providerDisplayName(canonical),
    };
  }
  return {
    credentialTypeId: `${canonical}_oauth2`,
    authType: 'oauth2',
    label: providerDisplayName(canonical),
  };
}

function credentialTypeForContract(provider: string, contractType?: string) {
  const byProvider = credentialTypeDefinitions.filter((definition) => definition.provider === canonicalProvider(provider));
  const preferredAuthType: AuthType | undefined =
    contractType === 'oauth' ? 'oauth2' :
    contractType === 'api_key' ? 'api_key' :
    contractType === 'token' ? 'bearer_token' :
    contractType === 'basic_auth' ? 'basic_auth' :
    undefined;
  const exactMatch = preferredAuthType
    ? byProvider.find((definition) => definition.authType === preferredAuthType)
    : undefined;
  // The connector registry's contract "type" is a loose category (api_key/token/basic_auth all
  // just mean "not OAuth"), not always the literal authType string a credential definition uses —
  // e.g. Mailchimp's connector contract says 'api_key' but its real non-OAuth definition uses
  // authType 'basic_auth'. When the exact string doesn't match but the contract is clearly
  // non-OAuth, prefer any non-OAuth definition for the provider before ever falling through to
  // credentialTypeForProvider's OAuth-preferring default — this fixes the match at its root
  // instead of depending on providers happening to have exactly one non-OAuth type each.
  const looseMatch = !exactMatch && preferredAuthType && preferredAuthType !== 'oauth2'
    ? byProvider.find((definition) => definition.authType !== 'oauth2')
    : undefined;
  const match = exactMatch || looseMatch;
  if (match) {
    return {
      credentialTypeId: canonicalCredentialTypeId(match.id),
      authType: match.authType as ConnectionReadinessAuthType,
      label: match.displayName || providerDisplayName(provider),
    };
  }
  return credentialTypeForProvider(provider);
}

function shortScopeLabel(scope: string): string {
  const trimmed = scope.replace(/\/+$/, '');
  const lastSegment = trimmed.slice(trimmed.lastIndexOf('/') + 1);
  return lastSegment || scope;
}

function connectionIsUsable(connection: ConnectionRecord | null | undefined): boolean {
  if (!connection) return false;
  if (connection.status !== 'active') return false;
  if (!connection.expiresAt) return true;
  return new Date(connection.expiresAt).getTime() > Date.now();
}

function connectionStatusIssue(connection: ConnectionRecord): Pick<ConnectionReadinessRow, 'status' | 'action' | 'reason'> | null {
  if (connection.status === 'revoked') {
    return { status: 'revoked', action: 'reconnect', reason: `${connection.provider} connection was revoked. Reconnect it before running this node.` };
  }
  if (connection.status === 'expired' || (connection.expiresAt && new Date(connection.expiresAt).getTime() <= Date.now())) {
    return { status: 'expired', action: 'reconnect', reason: `${connection.provider} connection expired. Reconnect it before running this node.` };
  }
  if (connection.status !== 'active') {
    return { status: 'invalid_ref', action: 'repair', reason: `${connection.provider} connection is ${connection.status}. Select an active connection.` };
  }
  return null;
}

function collectRefCandidates(input: {
  node: ReadinessNode;
  provider: string;
  credentialTypeId: string;
  vaultKey?: string;
}): Array<{ key: string; value: string; legacyOnly?: boolean }> {
  const config = nodeConfig(input.node) as Record<string, unknown>;
  const refs = {
    ...((config.connectionRefs || {}) as Record<string, unknown>),
    ...((input.node.data?.connectionRefs || {}) as Record<string, unknown>),
  };
  const keys = Array.from(new Set([
    input.provider,
    input.credentialTypeId,
    input.vaultKey,
    `${input.provider}_connection`,
    `${input.provider}_oauth2`,
    `${input.provider}_api_key`,
  ].filter(Boolean) as string[]));

  const out: Array<{ key: string; value: string; legacyOnly?: boolean }> = [];
  for (const key of keys) {
    const value = refs[key];
    if (typeof value === 'string' && value.trim()) out.push({ key, value: value.trim() });
  }
  const direct = config.connectionId || input.node.data?.connectionId;
  if (typeof direct === 'string' && direct.trim()) out.push({ key: 'connectionId', value: direct.trim() });

  const legacyCredentialId = config.credentialId;
  if (typeof legacyCredentialId === 'string' && legacyCredentialId.trim()) {
    out.push({ key: 'credentialId', value: legacyCredentialId.trim(), legacyOnly: true });
  }

  return out;
}

function valueLooksLikeProviderAlias(value: string, provider: string, credentialTypeId: string, vaultKey?: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    canonicalProvider(normalized) === canonicalProvider(provider) ||
    canonicalCredentialTypeId(normalized) === canonicalCredentialTypeId(credentialTypeId) ||
    (!!vaultKey && normalized === vaultKey.trim().toLowerCase())
  );
}

async function resolveExplicitConnection(input: {
  userId: string;
  provider: string;
  credentialTypeId: string;
  authType: ConnectionReadinessAuthType;
  refs: Array<{ key: string; value: string; legacyOnly?: boolean }>;
}): Promise<{
  connection?: ConnectionRecord;
  source?: ConnectionReadinessRow['source'];
  invalid?: ConnectionReadinessRow;
  canFallbackFromInvalidRef?: boolean;
  legacyRef?: string;
}> {
  for (const ref of input.refs) {
    if (!isUuid(ref.value)) {
      if (valueLooksLikeProviderAlias(ref.value, input.provider, input.credentialTypeId)) {
        return { legacyRef: ref.value };
      }
      return {
        invalid: {
          workflowId: '',
          nodeId: '',
          nodeType: '',
          nodeLabel: '',
          provider: input.provider,
          providerLabel: providerDisplayName(input.provider),
          credentialTypeId: input.credentialTypeId,
          credentialLabel: providerDisplayName(input.provider),
          authType: input.authType,
          requiredScopes: [],
          status: 'invalid_ref',
          action: 'repair',
          source: 'none',
          explicitRef: ref.value,
          explicitRefKey: ref.key,
          reason: `"${ref.value}" is not a saved connection id. Select an active ${input.provider} connection.`,
          checkedAt: new Date().toISOString(),
        },
      };
    }

    try {
      const found = await getDecryptedConnection(input.userId, ref.value);
      const connection = found?.connection;
      if (!connection) {
        return {
          canFallbackFromInvalidRef: true,
          invalid: {
            workflowId: '',
            nodeId: '',
            nodeType: '',
            nodeLabel: '',
            provider: input.provider,
            providerLabel: providerDisplayName(input.provider),
            credentialTypeId: input.credentialTypeId,
            credentialLabel: providerDisplayName(input.provider),
            authType: input.authType,
            requiredScopes: [],
            status: 'invalid_ref',
            action: 'repair',
            source: 'none',
            explicitRef: ref.value,
            explicitRefKey: ref.key,
            reason: `Selected connection was not found. Select an active ${input.provider} connection.`,
            checkedAt: new Date().toISOString(),
          },
        };
      }
      // Validate an explicitly-selected connection on PROVIDER ONLY — never on a derived
      // authType. A provider legitimately supports more than one auth method (e.g. HubSpot:
      // OAuth2 or a Private App token), the user deliberately picked this one, and execution
      // matches connections by provider only (resolveCredential + withFreshOAuthCredentials,
      // which inject based on the connection's own authType). Vetoing a user's explicit,
      // active, right-provider selection because its authType differs from a single guessed
      // requirement is a false positive with no runtime counterpart. Active/expired/revoked is
      // still enforced downstream (connectionStatusIssue) and scopes via the dry-run.
      if (canonicalProvider(connection.provider) !== canonicalProvider(input.provider)) {
        return {
          invalid: {
            workflowId: '',
            nodeId: '',
            nodeType: '',
            nodeLabel: '',
            provider: input.provider,
            providerLabel: providerDisplayName(input.provider),
            credentialTypeId: input.credentialTypeId,
            credentialLabel: providerDisplayName(input.provider),
            authType: input.authType,
            requiredScopes: [],
            status: 'invalid_ref',
            action: 'select_connection',
            source: found.source,
            explicitRef: ref.value,
            explicitRefKey: ref.key,
            reason: `Selected connection is for ${connection.provider}, but this node needs ${input.provider}.`,
            checkedAt: new Date().toISOString(),
          },
        };
      }
      return { connection, source: found.source };
    } catch (error) {
      return {
        canFallbackFromInvalidRef: true,
        invalid: {
          workflowId: '',
          nodeId: '',
          nodeType: '',
          nodeLabel: '',
          provider: input.provider,
          providerLabel: providerDisplayName(input.provider),
          credentialTypeId: input.credentialTypeId,
          credentialLabel: providerDisplayName(input.provider),
          authType: input.authType,
          requiredScopes: [],
          status: 'invalid_ref',
          action: 'repair',
          source: 'none',
          explicitRef: ref.value,
          explicitRefKey: ref.key,
          reason: `Selected connection could not be loaded. Select or reconnect ${input.provider}.`,
          checkedAt: new Date().toISOString(),
        },
      };
    }
  }
  return {};
}

interface DryRunOutcome {
  status: ConnectionReadinessStatus;
  action: ConnectionReadinessAction;
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
      action: 'none',
      credentialId: credential.id,
      availableScopes: credential.scopes,
    };
  } catch (error) {
    if (error instanceof CredentialMissingScopeError) {
      const scopeLabels = requiredScopes.map(shortScopeLabel).join(', ');
      return {
        status: 'missing_scope',
        action: 'reconnect',
        availableScopes: error.availableScopes,
        reason: `Connected ${provider} account is missing ${scopeLabels}. Reconnect ${provider} to grant the required permission.`,
      };
    }
    if (error instanceof CredentialExpiredError || error instanceof CredentialRefreshError) {
      return {
        status: 'expired',
        action: 'reconnect',
        reason: `${provider} credential expired and could not be refreshed. ${credentialFixMessage(provider, requiredScopes)}`,
      };
    }
    if (error instanceof CredentialNotFoundError) {
      return {
        status: 'runtime_missing',
        action: 'reconnect',
        reason: `A saved ${provider} connection exists, but the runtime token is missing. Reconnect ${provider} to restore access.`,
      };
    }
    return {
      status: 'error',
      action: 'repair',
      reason: `Credential check failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function rowWithBase(base: WorkflowConnectionRequirement, patch: Partial<ConnectionReadinessRow>, checkedAt: string): ConnectionReadinessRow {
  const {
    workflowId: _workflowId,
    nodeId: _nodeId,
    nodeType: _nodeType,
    nodeLabel: _nodeLabel,
    operation: _operation,
    operationLabel: _operationLabel,
    provider: _provider,
    providerLabel: _providerLabel,
    credentialTypeId: _credentialTypeId,
    credentialLabel: _credentialLabel,
    authType: _authType,
    requiredScopes: _requiredScopes,
    ...rowPatch
  } = patch;
  return {
    ...base,
    status: 'error',
    action: 'repair',
    source: 'none',
    checkedAt,
    ...rowPatch,
  };
}

export async function getWorkflowConnectionReadiness(input: {
  workflowId: string;
  userId: string;
  nodes: ReadinessNode[];
  includeSatisfied?: boolean;
  preferNodeConnectionRefs?: boolean;
}): Promise<WorkflowConnectionReadinessResponse> {
  const { workflowId, userId, nodes } = input;
  const includeSatisfied = input.includeSatisfied !== false;
  const checkedAt = new Date().toISOString();
  const dryRunCache = new Map<string, Promise<DryRunOutcome>>();
  const connectionListCache = new Map<string, Promise<{ connections: ConnectionRecord[]; source: ConnectionReadinessRow['source'] }>>();
  const preparedRequirements: PreparedConnectionRequirement[] = [];
  const unionScopesByListKey = new Map<string, string[]>();
  const rows: ConnectionReadinessRow[] = [];

  const hydratedNodes = await hydrateWorkflowNodeConnectionBindings({
    workflowId,
    userId,
    nodes: nodes || [],
    overrideExisting: input.preferNodeConnectionRefs !== true,
  });

  for (const node of hydratedNodes || []) {
    const nodeType = (node.data?.type || node.type || '').trim();
    if (!nodeType) continue;

    const operation = nodeOperation(node);
    const connector = connectorRegistry.getConnectorByNodeType(nodeType.toLowerCase());
    const requirement = credentialRequirementForNode(nodeType, operation);
    if (!requirement || connector?.credentialContract.required === false) continue;

    const provider = canonicalProvider(requirement.provider);
    const requiredScopes = Array.from(new Set(requirement.requiredScopes || []));
    const credentialType = credentialTypeForContract(provider, connector?.credentialContract.type);
    const nodeLabel = node.data?.label || node.data?.name || nodeType;
    const nodeId = node.id || nodeType;
    const base: WorkflowConnectionRequirement = {
      workflowId,
      nodeId,
      nodeType,
      nodeLabel,
      operation,
      operationLabel: operation ? humanizeKey(operation) : undefined,
      provider,
      providerLabel: providerDisplayName(provider),
      credentialTypeId: credentialType.credentialTypeId,
      credentialLabel: connector?.credentialContract.displayName || credentialType.label,
      authType: credentialType.authType,
      requiredScopes,
    };

    // Key the connection-list cache and scope-union by PROVIDER only. authType no longer
    // partitions connections (the gate accepts any auth method the user connected with, to
    // match how execution resolves credentials), so a single provider must map to a single
    // list/scope bucket regardless of the authType this node's contract happens to derive.
    const listKey = provider;
    preparedRequirements.push({
      node,
      base,
      provider,
      listKey,
      credentialType,
      vaultKey: connector?.credentialContract.vaultKey,
    });

    const unionScopes = unionScopesByListKey.get(listKey) || [];
    for (const scope of requiredScopes) {
      if (!unionScopes.includes(scope)) unionScopes.push(scope);
    }
    unionScopesByListKey.set(listKey, unionScopes);
  }

  for (const prepared of preparedRequirements) {
    const {
      node,
      base,
      provider,
      listKey,
      credentialType,
      vaultKey,
    } = prepared;
    if (!connectionListCache.has(listKey)) {
      connectionListCache.set(
        listKey,
        // No authType filter: return every active connection for the provider, whatever auth
        // method it uses. Matches execution, which selects a connection by provider only.
        listCanonicalConnectionsByProvider(userId, provider)
          .catch(() => ({ connections: [], source: 'none' as const })),
      );
    }

    const refs = collectRefCandidates({
      node,
      provider,
      credentialTypeId: credentialType.credentialTypeId,
      vaultKey,
    });
    const explicit = await resolveExplicitConnection({
      userId,
      provider,
      credentialTypeId: credentialType.credentialTypeId,
      authType: credentialType.authType,
      refs,
    });

    const listResult = await connectionListCache.get(listKey)!;
    const invalidLegacyRef = explicit.invalid
      ? refs.find((ref) => (
          ref.legacyOnly &&
          ref.key === explicit.invalid?.explicitRefKey &&
          ref.value === explicit.invalid?.explicitRef
        ))
      : undefined;

    if (explicit.invalid && !invalidLegacyRef && !explicit.canFallbackFromInvalidRef) {
      rows.push(rowWithBase(base, explicit.invalid, checkedAt));
      continue;
    }

    let connection = explicit.connection;
    let source = explicit.source || listResult.source;
    let legacyRef = explicit.legacyRef || invalidLegacyRef?.value;

    if (!connection) {
      // Stale saved refs can survive reconnects; recover through provider-level readiness when unambiguous.
      if (explicit.invalid && listResult.connections.length === 0) {
        rows.push(rowWithBase(base, explicit.invalid, checkedAt));
        continue;
      }
      if (listResult.connections.length > 1) {
        rows.push(rowWithBase(base, {
          status: 'invalid_ref',
          action: 'select_connection',
          source,
          legacyRef,
          candidateConnectionIds: listResult.connections.map((item) => item.id),
          reason: `Multiple active ${provider} connections exist. Select the one this node should use.`,
        }, checkedAt));
        continue;
      }
      connection = listResult.connections[0];
    }

    if (!connection) {
      rows.push(rowWithBase(base, {
        status: 'missing',
        action: 'connect',
        source: 'none',
        legacyRef,
        reason: `No active ${provider} connection found. Connect ${provider} before running ${base.nodeLabel}.`,
      }, checkedAt));
      continue;
    }

    const connectionIssue = connectionStatusIssue(connection);
    if (connectionIssue) {
      rows.push(rowWithBase(base, {
        ...connectionIssue,
        connectionId: connection.id,
        connectionName: connection.name,
        source,
        legacyRef,
      }, checkedAt));
      continue;
    }

    const requiredScopes = base.requiredScopes;
    const unionRequiredScopes = unionScopesByListKey.get(listKey) || requiredScopes;

    if (unionRequiredScopes.length === 0 && connectionIsUsable(connection)) {
      rows.push(rowWithBase(base, {
        status: 'ready',
        action: 'none',
        connectionId: connection.id,
        connectionName: connection.name,
        credentialId: connection.id,
        source,
        legacyRef,
        availableScopes: [],
      }, checkedAt));
      continue;
    }

    const dryRunKey = `${provider}::${[...unionRequiredScopes].sort().join('+')}`;
    if (!dryRunCache.has(dryRunKey)) {
      dryRunCache.set(dryRunKey, dryRunCredential(userId, provider, unionRequiredScopes, base.nodeLabel));
    }
    const outcome = await dryRunCache.get(dryRunKey)!;

    rows.push(rowWithBase(base, {
      status: outcome.status,
      action: outcome.action,
      connectionId: connection.id,
      connectionName: connection.name,
      credentialId: outcome.credentialId,
      source: outcome.status === 'ready' ? 'unified_credentials' : source,
      legacyRef,
      availableScopes: outcome.availableScopes,
      reason: outcome.reason,
    }, checkedAt));
  }

  const missing = rows.filter((row) => row.status !== 'ready');
  const summary = {
    requiredCount: rows.length,
    readyCount: rows.filter((row) => row.status === 'ready').length,
    missingCount: rows.filter((row) => row.status === 'missing').length,
    invalidRefCount: rows.filter((row) => row.status === 'invalid_ref').length,
    runtimeMissingCount: rows.filter((row) => row.status === 'runtime_missing').length,
    missingScopeCount: rows.filter((row) => row.status === 'missing_scope').length,
    expiredCount: rows.filter((row) => row.status === 'expired').length,
    revokedCount: rows.filter((row) => row.status === 'revoked').length,
    errorCount: rows.filter((row) => row.status === 'error').length,
  };

  logger.info('[ConnectionReadiness] summary', {
    workflowId,
    nodeCount: nodes?.length || 0,
    providerNames: Array.from(new Set(rows.map((row) => row.provider))),
    ...summary,
  });

  for (const row of missing) {
    logger.info('[ConnectionReadiness] issue', {
      workflowId,
      nodeId: row.nodeId,
      nodeType: row.nodeType,
      provider: row.provider,
      operation: row.operation,
      status: row.status,
      action: row.action,
      hasConnectionRow: Boolean(row.connectionId),
      requiredScopes: row.requiredScopes,
      availableScopes: row.availableScopes || [],
    });
  }

  return {
    workflowId,
    ready: missing.length === 0,
    rows: includeSatisfied ? rows : missing,
    missing,
    summary,
  };
}
