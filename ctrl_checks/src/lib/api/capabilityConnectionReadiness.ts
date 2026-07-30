import { awsClient } from '@/integrations/aws/client';
import { getBackendUrl } from './getBackendUrl';

/**
 * Scope-aware connection readiness for the node types the user has selected in the
 * capability stage.
 *
 * The candidate badge's `hasCredentials` is a cheap provider-level check computed for
 * every candidate on screen. This is the authoritative second pass, and is deliberately
 * only ever called for *selected* nodes — the backend path behind it can refresh OAuth
 * tokens as a side effect, so it must not run across the whole candidate catalogue.
 */

export interface CapabilityConnectionReadinessNode {
  nodeType: string;
  nodeLabel: string;
  connected: boolean;
  /**
   * Whether this node needs a credential at all. `connected: true` alone is ambiguous —
   * it means both "verified" and "nothing to verify", which would render a credential-free
   * node like manual_trigger as green "Connected".
   *
   * Optional so a frontend deployed ahead of the worker still parses: callers treat an
   * absent value as "required" only when a provider is present.
   */
  credentialRequired?: boolean;
  provider?: string;
  providerLabel?: string;
  credentialTypeId?: string;
  authType?: string;
  status?: string;
  action?: string;
  requiredScopes?: string[];
  availableScopes?: string[];
  reason?: string;
}

export interface CapabilityConnectionReadiness {
  ready: boolean;
  nodes: CapabilityConnectionReadinessNode[];
  /** Node types still needing a connection — what Continue gates on. */
  blocking: string[];
}

const EMPTY: CapabilityConnectionReadiness = { ready: true, nodes: [], blocking: [] };

export async function fetchCapabilityConnectionReadiness(
  nodeTypes: string[],
): Promise<CapabilityConnectionReadiness> {
  if (!nodeTypes || nodeTypes.length === 0) return EMPTY;

  const token = (await awsClient.auth.getSession()).data.session?.access_token;
  // Without a session there is nothing to check against; the workflow-page gate still
  // catches missing connections later, so degrade open rather than blocking the wizard.
  if (!token) return EMPTY;

  let response: Response;
  try {
    response = await fetch(`${getBackendUrl()}/api/capability-selection/connection-readiness`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ nodeTypes }),
    });
  } catch {
    return EMPTY;
  }

  if (!response.ok) return EMPTY;

  try {
    return (await response.json()) as CapabilityConnectionReadiness;
  } catch {
    return EMPTY;
  }
}
