/**
 * Capability Selection — Connection Readiness for selected nodes
 *
 * POST /api/capability-selection/connection-readiness
 *
 * Answers "is every node the user selected actually connected?" with the same
 * scope-aware service the workflow canvas gate uses, so the node-selection screen
 * cannot report Connected for something the downstream gate will reject.
 *
 * Why this exists rather than reusing GET /api/workflows/:id/missing-items:
 * at node-selection time no workflow has been generated yet, so there is no id.
 * `getWorkflowConnectionReadiness` itself takes nodes inline and never loads a
 * workflow from the database — only the *route* needed an id — so this endpoint
 * hands it synthetic nodes built from the selected node types. No DB write, and
 * /missing-items is left completely untouched.
 *
 * ⚠️ Why this is scoped to SELECTED nodes only:
 * `getWorkflowConnectionReadiness` → `dryRunCredential` → `resolveCredentialDryRun`
 * → `resolveCredential`, and `resolveCredential` ignores its `dryRun` flag: it calls
 * `refreshCredential()` when a token is near expiry. A "dry run" can therefore perform
 * a real OAuth refresh plus a token write. Running that across every candidate on the
 * screen would touch providers the user never chose. The cheap, provider-level
 * `candidate.hasCredentials` from capability-grouper-stage stays the badge's first
 * pass; this endpoint is the authoritative second pass over the user's actual picks.
 */

import { Response } from 'express';
import { unifiedNodeRegistry } from '../../core/registry/unified-node-registry';
import {
  getWorkflowConnectionReadiness,
  type ConnectionReadinessRow,
  type ReadinessNode,
} from '../../services/workflow-connection-readiness';
import type { AuthenticatedRequest } from '../../core/middleware/subscription-auth';
import { logger } from '../../core/logger';

/** Synthetic workflow id — never persisted, only stamped onto the returned rows. */
const SYNTHETIC_WORKFLOW_ID = 'capability-selection-preview';

/** Hard ceiling so a malformed client cannot fan out credential resolution. */
const MAX_NODE_TYPES = 40;

export interface CapabilityConnectionReadinessNode {
  nodeType: string;
  nodeLabel: string;
  connected: boolean;
  provider?: string;
  providerLabel?: string;
  credentialTypeId?: string;
  authType?: string;
  status?: ConnectionReadinessRow['status'];
  action?: ConnectionReadinessRow['action'];
  requiredScopes?: string[];
  availableScopes?: string[];
  reason?: string;
}

export interface CapabilityConnectionReadinessResponse {
  ready: boolean;
  nodes: CapabilityConnectionReadinessNode[];
  /** Node types still needing a connection — what Continue gates on. */
  blocking: string[];
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

export default async function capabilityConnectionReadiness(
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
    const empty: CapabilityConnectionReadinessResponse = { ready: true, nodes: [], blocking: [] };
    res.json(empty);
    return;
  }

  // Synthetic nodes: one per selected type, shaped as the readiness service expects.
  const nodes: ReadinessNode[] = nodeTypes.map((nodeType) => ({
    id: nodeType,
    type: nodeType,
    data: {
      type: nodeType,
      label: unifiedNodeRegistry.get(nodeType)?.label ?? nodeType,
      config: {},
    },
  }));

  try {
    const readiness = await getWorkflowConnectionReadiness({
      workflowId: SYNTHETIC_WORKFLOW_ID,
      userId,
      nodes,
      includeSatisfied: true,
    });

    const rowsByNodeId = new Map<string, ConnectionReadinessRow>();
    for (const row of readiness.rows) {
      // One row per node here, since each synthetic node id is its node type.
      if (!rowsByNodeId.has(row.nodeId)) rowsByNodeId.set(row.nodeId, row);
    }

    const resultNodes: CapabilityConnectionReadinessNode[] = nodeTypes.map((nodeType) => {
      const row = rowsByNodeId.get(nodeType);
      if (!row) {
        // No credential requirement for this node type — nothing to connect.
        return {
          nodeType,
          nodeLabel: unifiedNodeRegistry.get(nodeType)?.label ?? nodeType,
          connected: true,
        };
      }
      return {
        nodeType,
        nodeLabel: row.nodeLabel,
        connected: row.status === 'ready',
        provider: row.provider,
        providerLabel: row.providerLabel,
        credentialTypeId: row.credentialTypeId,
        authType: row.authType,
        status: row.status,
        action: row.action,
        requiredScopes: row.requiredScopes,
        availableScopes: row.availableScopes,
        reason: row.reason,
      };
    });

    const blocking = resultNodes.filter((n) => !n.connected).map((n) => n.nodeType);
    const response: CapabilityConnectionReadinessResponse = {
      ready: blocking.length === 0,
      nodes: resultNodes,
      blocking,
    };
    res.json(response);
  } catch (error) {
    logger.error('[capability-connection-readiness] failed', {
      error: error instanceof Error ? error.message : String(error),
      nodeTypeCount: nodeTypes.length,
    });
    // Never block the wizard on this check failing — the downstream readiness gate on
    // the workflow page still catches anything missed here.
    const degraded: CapabilityConnectionReadinessResponse = {
      ready: true,
      nodes: nodeTypes.map((nodeType) => ({
        nodeType,
        nodeLabel: unifiedNodeRegistry.get(nodeType)?.label ?? nodeType,
        connected: true,
      })),
      blocking: [],
    };
    res.json(degraded);
  }
}
