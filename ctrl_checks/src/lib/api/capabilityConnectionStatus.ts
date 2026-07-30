import { awsClient } from '@/integrations/aws/client';
import { getBackendUrl } from './getBackendUrl';

/**
 * Fast, presence-only connection status for EVERY candidate on the node-selection screen.
 *
 * Safe to call across the whole candidate list — unlike
 * `fetchCapabilityConnectionReadiness`, this never resolves or refreshes a token. It answers
 * from a single read of the user's connections, so the screen can paint the correct chip
 * immediately instead of showing "Connect" for a service connected weeks ago.
 *
 * Not scope-aware: it can report `connected` for a credential whose scopes are insufficient.
 * That is intentional — it is only the first paint. The scope-aware readiness answer runs for
 * SELECTED nodes and overrides this, including downgrading back to "needs connection".
 */

export interface CapabilityConnectionStatusNode {
  nodeType: string;
  nodeLabel: string;
  credentialRequired: boolean;
  connected: boolean;
  provider?: string;
}

export interface CapabilityConnectionStatus {
  nodes: CapabilityConnectionStatusNode[];
}

const EMPTY: CapabilityConnectionStatus = { nodes: [] };

export async function fetchCapabilityConnectionStatus(
  nodeTypes: string[],
): Promise<CapabilityConnectionStatus> {
  if (!nodeTypes || nodeTypes.length === 0) return EMPTY;

  const token = (await awsClient.auth.getSession()).data.session?.access_token;
  // Without a session there is nothing to check against. Returning empty leaves the chips on
  // the worker-supplied `hasCredentials`, which is the same behaviour as before this existed.
  if (!token) return EMPTY;

  let response: Response;
  try {
    response = await fetch(`${getBackendUrl()}/api/capability-selection/connection-status`, {
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
    return (await response.json()) as CapabilityConnectionStatus;
  } catch {
    return EMPTY;
  }
}
