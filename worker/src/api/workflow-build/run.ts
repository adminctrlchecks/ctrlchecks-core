/**
 * POST /api/workflow-build/run — the chained first run (plan Phase 8).
 *
 * ⚠️ Performs REAL external operations, one node at a time, in topological order.
 *
 * **G1 is the reason this is not a naive walk.** A topological sweep that ignores branch
 * results fires *both* sides of every `if_else` — a real email AND a real Slack message
 * when only one should have gone. This reuses `shouldSkipNode()` from the live engine,
 * fed the `ifElseResults` / `switchResults` captured as we go, exactly as
 * `execute-workflow.ts` does. Untaken branches get `not_exercised`, never `passed`.
 *
 * Halts at the first node needing consent and streams progress as NDJSON, so the client
 * can render each node's result as it lands rather than waiting for the whole graph.
 */

import { Response } from 'express';
import { executeNode } from '../execute-workflow';
import { shouldSkipNode } from '../../core/execution/unified-execution-engine';
import { LRUNodeOutputsCache } from '../../core/cache/lru-node-outputs-cache';
import { getDbClient } from '../../core/database/db-client';
import { resolveNodeType } from '../../core/registry/node-type-resolution';
import { requiresStrongConfirmation, resolveFirstRunClass, requiresConsent } from '../../core/execution/first-run-policy';
import { describeSampling, sampleCollectionForFirstRun } from '../../core/execution/fanout-sampler';
import {
  MAX_EXECUTIONS_PER_BUILD,
  assertOwnership,
  computeIdempotencyKey,
  createBuildRunState,
  hashValue,
  loadBuildRunState,
  saveBuildRunState,
  type BuildRunState,
} from '../../core/execution/build-run-state';
import { guidanceFromOutput, hasError } from '../../core/guidance/provider-error-interpreter';
import { buildConsentPrompt } from './run-node';
import type { AuthenticatedRequest } from '../../core/middleware/subscription-auth';
import { logger } from '../../core/logger';

interface GraphNode {
  id: string;
  type?: string;
  data?: { type?: string; label?: string; config?: Record<string, unknown> };
}
interface GraphEdge {
  source: string;
  target: string;
  sourceHandle?: string;
}

/** Canonical type — see core/registry/node-type-resolution.ts for why this is not inline. */
export const nodeTypeOf = (n: GraphNode) => resolveNodeType(n).nodeType;
const nodeLabelOf = (n: GraphNode) => String(n?.data?.label ?? nodeTypeOf(n) ?? n?.id ?? 'this step');

/**
 * Kahn topological order. Nodes in a cycle are appended at the end rather than dropped —
 * the DAG compiler forbids cycles, but a malformed draft must not silently lose nodes.
 */
export function topologicalOrder(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] {
  const indegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    indegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    if (!indegree.has(edge.target) || !adjacency.has(edge.source)) continue;
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    adjacency.get(edge.source)!.push(edge.target);
  }

  const queue = nodes.filter((n) => (indegree.get(n.id) ?? 0) === 0).map((n) => n.id);
  const ordered: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    ordered.push(id);
    for (const next of adjacency.get(id) ?? []) {
      const remaining = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, remaining);
      if (remaining === 0) queue.push(next);
    }
  }

  const seen = new Set(ordered);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return [...ordered, ...nodes.filter((n) => !seen.has(n.id)).map((n) => n.id)]
    .map((id) => byId.get(id))
    .filter((n): n is GraphNode => Boolean(n));
}

export default async function runWorkflowBuild(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const body = req.body as {
    buildId?: string;
    nodes?: unknown[];
    edges?: unknown[];
    consentedNodeIds?: string[];
  };

  let state: BuildRunState | null = body.buildId ? await loadBuildRunState(body.buildId) : null;
  if (!state) {
    if (!Array.isArray(body.nodes) || body.nodes.length === 0) {
      res.status(400).json({ error: 'nodes are required to start a build' });
      return;
    }
    state = createBuildRunState({
      userId,
      nodes: body.nodes,
      edges: Array.isArray(body.edges) ? body.edges : [],
      buildId: body.buildId,
    });
  }

  try {
    assertOwnership(state, userId);
  } catch (error) {
    res.status(403).json({ error: (error as Error).message });
    return;
  }

  if (Array.isArray(body.nodes) && body.nodes.length > 0) {
    state.nodes = body.nodes;
    if (Array.isArray(body.edges)) state.edges = body.edges;
  }

  const nodes = state.nodes as GraphNode[];
  const edges = state.edges as GraphEdge[];
  const consented = new Set(body.consentedNodeIds ?? []);

  // NDJSON, matching the pattern /api/generate-workflow already uses.
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('x-stream-progress', 'true');
  const emit = (event: Record<string, unknown>) => {
    res.write(`${JSON.stringify(event)}\n`);
  };

  const cache = new LRUNodeOutputsCache(200);
  const skippedNodeIds = new Set<string>();
  const ifElseResults: Record<string, boolean> = { ...state.branchResults.ifElseResults };
  const switchResults: Record<string, string | null> = { ...state.branchResults.switchResults };

  emit({ type: 'start', buildId: state.buildId, nodeCount: nodes.length });

  try {
    for (const node of topologicalOrder(nodes, edges)) {
      const nodeId = node.id;
      const incoming = edges.filter((e) => e.target === nodeId);

      // ── G1: only the branch the condition actually chose runs ──────────────
      const skip = shouldSkipNode(
        node as never,
        incoming as never,
        nodes as never,
        edges as never,
        ifElseResults,
        switchResults,
        skippedNodeIds,
      );
      if (skip) {
        skippedNodeIds.add(nodeId);
        state.nodeRuns[nodeId] = {
          status: 'not_exercised',
          configHash: hashValue(node.data?.config ?? {}),
          upstreamHash: '',
          idempotencyKey: '',
        };
        emit({
          type: 'node',
          nodeId,
          status: 'not_exercised',
          message: "Not exercised — this path didn't run with your test data.",
        });
        continue;
      }

      // One lookup: a second strict `get()` on an alias would miss what the helper resolved.
      const { nodeType, definition } = resolveNodeType(node);
      if (!definition) {
        emit({ type: 'node', nodeId, status: 'needs_attention', message: `Unknown node type "${nodeType}".` });
        continue;
      }

      const config = node.data?.config ?? {};
      const operation = typeof config.operation === 'string' ? config.operation : undefined;
      const firstRunClass = resolveFirstRunClass(nodeType, operation);

      // ── Consent: halt here rather than running past it ─────────────────────
      if (requiresConsent(firstRunClass) && !consented.has(nodeId)) {
        state.nodeRuns[nodeId] = {
          status: 'ready',
          configHash: hashValue(config),
          upstreamHash: '',
          idempotencyKey: '',
        };
        await saveBuildRunState(state);
        emit({
          type: 'awaiting_consent',
          nodeId,
          firstRunClass,
          consentPrompt: buildConsentPrompt(node, firstRunClass),
          requiresStrongConfirmation: requiresStrongConfirmation(firstRunClass),
        });
        emit({ type: 'halted', reason: 'awaiting_consent', nodeId });
        res.end();
        return;
      }

      if (state.executionCount >= MAX_EXECUTIONS_PER_BUILD) {
        emit({ type: 'halted', reason: 'execution_ceiling', nodeId });
        res.end();
        return;
      }

      emit({ type: 'node', nodeId, status: 'running' });

      const upstreamOutputs: Record<string, unknown> = {};
      for (const edge of incoming) {
        const value = cache.get(edge.source);
        if (value !== undefined) upstreamOutputs[edge.source] = value;
      }
      const inputValues = Object.values(upstreamOutputs);
      const input = inputValues.length === 1 ? inputValues[0] : inputValues.length === 0 ? {} : inputValues;

      const startedAt = Date.now();
      let output: unknown;
      try {
        output = await executeNode(
          node as never,
          input,
          cache,
          getDbClient() as never,
          `wfbuild-${state.buildId}`,
          userId,
          userId,
        );
      } catch (error) {
        output = {
          _error: error instanceof Error ? error.message : String(error),
          _nodeType: nodeType,
        };
      }
      const executionMs = Date.now() - startedAt;
      state.executionCount += 1;

      if (hasError(output)) {
        const guidance = guidanceFromOutput({
          nodeId,
          nodeType,
          nodeLabel: nodeLabelOf(node),
          config,
          output,
        });
        state.nodeRuns[nodeId] = {
          status: 'needs_attention',
          configHash: hashValue(config),
          upstreamHash: hashValue(upstreamOutputs),
          idempotencyKey: '',
          guidance,
          executionMs,
          ranAt: new Date().toISOString(),
        };
        await saveBuildRunState(state);
        emit({ type: 'node', nodeId, status: 'needs_attention', guidance, executionMs });
        // Downstream nodes have nothing real to consume, so stop rather than feeding
        // them a broken payload and producing a second, misleading failure.
        emit({ type: 'halted', reason: 'needs_attention', nodeId });
        res.end();
        return;
      }

      // Capture branch results so the NEXT iteration's shouldSkipNode is accurate (G1).
      const outputObj = (output ?? {}) as Record<string, unknown>;
      if (typeof outputObj.condition === 'boolean') ifElseResults[nodeId] = outputObj.condition;
      const routing = outputObj.__routing as Record<string, unknown> | undefined;
      const matchedCase = routing?.matchedCase ?? outputObj.matchedCase;
      if (matchedCase !== undefined) switchResults[nodeId] = matchedCase as string | null;

      // Fan-out cap before the value reaches anything downstream (§2.3).
      const sample = sampleCollectionForFirstRun(output, { limit: 1 });
      const samplingNote = describeSampling(sample) ?? undefined;
      cache.set(nodeId, sample.sampled);

      state.nodeRuns[nodeId] = {
        status: 'passed',
        configHash: hashValue(config),
        upstreamHash: hashValue(upstreamOutputs),
        idempotencyKey: computeIdempotencyKey({
          buildId: state.buildId,
          nodeId,
          configHash: hashValue(config),
          upstreamHash: hashValue(upstreamOutputs),
        }),
        output: sample.sampled,
        executionMs,
        samplingNote,
        ranAt: new Date().toISOString(),
      };
      await saveBuildRunState(state);
      emit({ type: 'node', nodeId, status: 'passed', executionMs, samplingNote });
    }

    state.branchResults = { ifElseResults, switchResults };
    await saveBuildRunState(state);

    // Continue gates on needs_attention only — not_exercised must never block (G1).
    const blocking = Object.entries(state.nodeRuns)
      .filter(([, record]) => record.status === 'needs_attention')
      .map(([id]) => id);

    emit({
      type: 'complete',
      buildId: state.buildId,
      canContinue: blocking.length === 0,
      blocking,
      executionCount: state.executionCount,
    });
    res.end();
  } catch (error) {
    logger.error('[workflow-build/run] failed', {
      error: error instanceof Error ? error.message : String(error),
      buildId: state.buildId,
    });
    emit({ type: 'halted', reason: 'unexpected' });
    res.end();
  }
}
