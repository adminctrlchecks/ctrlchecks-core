/**
 * Capability Selection — fast connection status for EVERY candidate on screen
 *
 * POST /api/capability-selection/connection-status
 *
 * Answers "does this user already have a connection for each of these nodes?" for the whole
 * candidate list, so the selection screen renders the right chip on first paint instead of
 * showing "Connect" for services the user connected weeks ago.
 *
 * ── Why this is a separate endpoint from connection-readiness ──
 *
 * `/connection-readiness` is authoritative and scope-aware, but it runs
 * `getWorkflowConnectionReadiness` → `dryRunCredential` → `resolveCredential`, and
 * `resolveCredential` ignores its dryRun flag: it calls `refreshCredential()` when a token is
 * near expiry. Running that across every candidate would perform real OAuth refreshes on
 * providers the user never picked, so it stays restricted to selected nodes.
 *
 * This endpoint deliberately does none of that. It performs a single
 * `listCanonicalConnections(userId)` — one read, already filtered to the user — and answers
 * purely from connection *presence*:
 *
 *   - no token decryption
 *   - no token refresh
 *   - no per-provider queries (one read regardless of how many nodes are asked about)
 *   - no scope checking
 *
 * The trade-off is deliberate: this can report `connected: true` for a credential whose
 * scopes are insufficient. That is fine, because it is only the first paint. Once the user
 * selects a node, `/connection-readiness` runs for that node and its answer overrides this
 * one — including downgrading it back to "needs connection".
 *
 * Universality: node → provider comes from `credentialRequirementForNode`, the single
 * resolver the gate itself uses, so every registered node — and every node added later —
 * is covered with no per-node entries here.
 */

import { Response } from 'express';
import { unifiedNodeRegistry } from '../../core/registry/unified-node-registry';
import { credentialRequirementForNode } from '../../services/credential-scope-registry';
import {
  listCanonicalConnections,
  canonicalProvider,
} from '../../services/canonical-credential-lookup';
import type { AuthenticatedRequest } from '../../core/middleware/subscription-auth';
import { logger } from '../../core/logger';

/** Hard ceiling so a malformed client cannot ask about an unbounded list. */
const MAX_NODE_TYPES = 200;

export interface CapabilityConnectionStatusNode {
  nodeType: string;
  nodeLabel: string;
  /** Whether this node needs a credential at all. */
  credentialRequired: boolean;
  /** True when a credential is required and an active connection exists for its provider. */
  connected: boolean;
  provider?: string;
}

export interface CapabilityConnectionStatusResponse {
  nodes: CapabilityConnectionStatusNode[];
}

function parseNodeTypes(body: unknown): string[] {
  const raw = (body as { nodeTypes?: unknown })?.nodeTypes;
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const value = String(entry ?? '').trim();
    if (value) seen.add(value);
  }
  return Array.from(seen).slice(0, MAX_NODE_TYPES);
}

export default async function capabilityConnectionStatus(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const nodeTypes = parseNodeTypes(req.body);
  if (nodeTypes.length === 0) {
    res.json({ nodes: [] } satisfies CapabilityConnectionStatusResponse);
    return;
  }

  try {
    // One read for the whole screen, then answered in memory.
    const { connections } = await listCanonicalConnections(userId);
    const now = Date.now();
    const connectedProviders = new Set(
      connections
        .filter(
          (connection) =>
            connection.status === 'active' &&
            (!connection.expiresAt || new Date(connection.expiresAt).getTime() > now),
        )
        .map((connection) => canonicalProvider(connection.provider)),
    );

    const nodes: CapabilityConnectionStatusNode[] = nodeTypes.map((nodeType) => {
      const requirement = credentialRequirementForNode(nodeType);
      const nodeLabel = unifiedNodeRegistry.get(nodeType)?.label ?? nodeType;

      if (!requirement) {
        // Nothing to connect — never render this as a green "Connected".
        return { nodeType, nodeLabel, credentialRequired: false, connected: true };
      }

      const provider = canonicalProvider(requirement.provider);
      return {
        nodeType,
        nodeLabel,
        credentialRequired: true,
        connected: connectedProviders.has(provider),
        provider: requirement.provider,
      };
    });

    res.json({ nodes } satisfies CapabilityConnectionStatusResponse);
  } catch (error) {
    logger.error('[capability-connection-status] failed', {
      error: error instanceof Error ? error.message : String(error),
      nodeTypeCount: nodeTypes.length,
    });
    // Fail closed on the optimistic side only: report what is required, but never claim a
    // connection we could not verify. The chip then offers Connect, which is recoverable —
    // whereas a false "Connected" is not.
    const nodes: CapabilityConnectionStatusNode[] = nodeTypes.map((nodeType) => {
      const requirement = credentialRequirementForNode(nodeType);
      return {
        nodeType,
        nodeLabel: unifiedNodeRegistry.get(nodeType)?.label ?? nodeType,
        credentialRequired: requirement !== null,
        connected: requirement === null,
        provider: requirement?.provider,
      };
    });
    res.json({ nodes } satisfies CapabilityConnectionStatusResponse);
  }
}
