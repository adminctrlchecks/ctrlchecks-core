                                                                                                                                                                                                                                                                                                                                                                                                                                                                  /**
 * Shared rules for "credential satisfied by node config" (no vault).
 * Used by CredentialResolver and CredentialDiscoveryPhase — single source of truth.
 */

import type { WorkflowNode } from '../../core/types/ai-types';

export type CredentialContractForSatisfaction = {
  provider: string;
  type: 'oauth' | 'api_key' | 'webhook' | 'token' | 'basic_auth' | 'runtime';
  credentialFieldName?: string;
};

function isNonPlaceholderString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const t = value.trim();
  if (!t) return false;
  if (t.includes('{{ENV.') || t.includes('{{$json')) return false;
  return true;
}

/** Valid webhook URL in node config (mirrors credential-discovery-phase Slack checks). */
export function isValidWebhookUrlInConfig(value: unknown): boolean {
  if (!isNonPlaceholderString(value)) return false;
  return value.startsWith('http');
}

/** OAuth: credentialId / credentialRef present and non-placeholder (mirrors discovery). */
export function isOAuthRefSatisfiedInConfig(config: Record<string, unknown>): boolean {
  const cid = String(config.credentialId ?? '').trim();
  const cref = String(config.credentialRef ?? '').trim();
  const ref = cid || cref;
  const lower = ref.toLowerCase();
  if (!ref || lower === 'none') return false;
  if (ref.includes('{{') || lower.includes('placeholder')) return false;
  return true;
}

/**
 * True if the node links a saved Connection (Properties Panel "Connect" flow) for this
 * provider instead of typing credentials inline — node.data.connectionRefs[<provider>|…].
 */
export function isConnectionLinkedInConfig(node: WorkflowNode, provider: string): boolean {
  const connectionRefs = (node.data?.connectionRefs || {}) as Record<string, unknown>;
  const candidateKeys = [
    provider,
    `${provider}_connection`,
    `${provider}_api_key`,
    `${provider}_oauth2`,
    `${provider}_token`,
  ];
  return candidateKeys.some((key) => isNonPlaceholderString(connectionRefs[key]));
}

/**
 * Returns true if the node's config satisfies the credential contract without vault access.
 */
export function isCredentialSatisfiedByNodeConfig(
  node: WorkflowNode,
  contract: CredentialContractForSatisfaction
): boolean {
  const config = (node.data?.config || {}) as Record<string, unknown>;

  if (contract.type === 'oauth') {
    return isOAuthRefSatisfiedInConfig(config) || isConnectionLinkedInConfig(node, contract.provider);
  }

  if (contract.type === 'webhook') {
    const field = contract.credentialFieldName || 'webhookUrl';
    if (isValidWebhookUrlInConfig(config[field])) return true;
    if (field !== 'webhook_url' && isValidWebhookUrlInConfig(config.webhook_url)) return true;
    if (field !== 'webhookUrl' && isValidWebhookUrlInConfig(config.webhookUrl)) return true;
    return false;
  }

  if (contract.type === 'api_key' || contract.type === 'token') {
    const field = contract.credentialFieldName;
    if (field && isNonPlaceholderString(config[field])) return true;
    // A linked saved Connection (e.g. Supabase, Firebase) satisfies the requirement even
    // though no inline api-key field is typed into the node — the secret lives in the
    // Connection and is injected at execution time.
    return isConnectionLinkedInConfig(node, contract.provider);
  }

  if (contract.type === 'runtime') {
    const field = contract.credentialFieldName;
    if (field && isNonPlaceholderString(config[field])) return true;
    // Discrete-field database connections (mysql, postgresql, redis, etc.) don't
    // populate a single connectionString field — host/username/password are typed
    // directly into the node, so satisfaction has to be checked against those.
    if (
      isNonPlaceholderString(config.host) &&
      isNonPlaceholderString(config.username) &&
      isNonPlaceholderString(config.password)
    ) {
      return true;
    }
    return isConnectionLinkedInConfig(node, contract.provider);
  }

  return false;
}
