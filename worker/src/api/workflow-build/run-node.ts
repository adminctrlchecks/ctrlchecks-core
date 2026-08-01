/**
 * POST /api/workflow-build/run-node — execute ONE node during wizard setup.
 *
 * ⚠️ **This is the first code in the project that performs real external operations.**
 * A `write` node here sends a real email or posts a real Slack message. That is the
 * design (plan §1: the first run is the deliverable, not a rehearsal), which is exactly
 * why every guard below is load-bearing.
 *
 * Safety, in order of application:
 *   1. authenticated user required                                      (G5)
 *   2. build ownership — 403 on userId mismatch                         (G5)
 *   3. per-build execution ceiling                                      (G5)
 *   4. idempotency — an unchanged, already-passed node is NOT re-run    (G3)
 *   5. `firstRunClass` consent gate — write/destructive need consent    (§2.1, Phase 6)
 *   6. fan-out cap — a collection is sampled to 1 record                (§2.3, Phase 6)
 *
 * Execution goes through the shared `executeNode()` **unmodified** (§2.5). All policy
 * lives here, in the caller. Nothing in `execute-workflow.ts` changes.
 *
 * Status vocabulary is `passed | awaiting_consent | needs_attention` — never `failed`.
 */

import { Response } from 'express';
import { executeNode } from '../execute-workflow';
import { LRUNodeOutputsCache } from '../../core/cache/lru-node-outputs-cache';
import { getDbClient } from '../../core/database/db-client';
import { resolveNodeType } from '../../core/registry/node-type-resolution';
import {
  ConsentRequiredError,
  assertConsent,
  requiresStrongConfirmation,
  resolveFirstRunClass,
} from '../../core/execution/first-run-policy';
import {
  describeSampling,
  sampleCollectionForFirstRun,
} from '../../core/execution/fanout-sampler';
import {
  MAX_EXECUTIONS_PER_BUILD,
  assertOwnership,
  computeIdempotencyKey,
  createBuildRunState,
  hashValue,
  invalidateFrom,
  loadBuildRunState,
  saveBuildRunState,
  type BuildRunState,
} from '../../core/execution/build-run-state';
import { guidanceFromOutput, hasError } from '../../core/guidance/provider-error-interpreter';
import type { Guidance } from '../../core/guidance/types';
import type { AuthenticatedRequest } from '../../core/middleware/subscription-auth';
import { logger } from '../../core/logger';

export type RunNodeStatus = 'passed' | 'awaiting_consent' | 'needs_attention';

export interface RunNodeResponse {
  buildId: string;
  nodeId: string;
  status: RunNodeStatus;
  firstRunClass: string;
  /** Copy naming the real effect, shown before the user consents (§2.1). */
  consentPrompt?: string;
  requiresStrongConfirmation?: boolean;
  output?: unknown;
  guidance?: Guidance;
  executionMs?: number;
  samplingNote?: string;
  /** True when a stored result was returned instead of re-executing (G3). */
  deduped?: boolean;
  executionCount: number;
}

interface GraphNode {
  id: string;
  type?: string;
  data?: { type?: string; label?: string; config?: Record<string, unknown> };
}

/** Canonical type — see core/registry/node-type-resolution.ts for why this is not inline. */
function nodeTypeOf(node: GraphNode): string {
  return resolveNodeType(node).nodeType;
}

function nodeLabelOf(node: GraphNode): string {
  return String(node?.data?.label ?? nodeTypeOf(node) ?? node?.id ?? 'this step');
}

/**
 * Copy that names the real effect and target before it happens (§2.1).
 * "Checks your Slack connection works, then posts the message to #alerts."
 */
export function buildConsentPrompt(node: GraphNode, firstRunClass: string): string {
  const label = nodeLabelOf(node);
  const config = node?.data?.config ?? {};
  const target =
    (config.channel as string) ||
    (config.to as string) ||
    (config.spreadsheetId as string) ||
    (config.databaseId as string) ||
    '';
  const targetPhrase = target ? ` to ${String(target)}` : '';

  if (firstRunClass === 'destructive') {
    return `Runs ${label} for real${targetPhrase}. This permanently changes or removes data and cannot be undone.`;
  }
  return `Runs ${label} for real${targetPhrase}. This is not a rehearsal — the result actually happens.`;
}

/** Collect upstream outputs already stored on the build, for template resolution. */
function upstreamOutputsFor(state: BuildRunState, nodeId: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const edge of state.edges as Array<{ source?: string; target?: string }>) {
    if (edge?.target !== nodeId || !edge?.source) continue;
    const record = state.nodeRuns[edge.source];
    if (record?.output !== undefined) out[edge.source] = record.output;
  }
  return out;
}

export default async function runNode(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const body = req.body as {
    buildId?: string;
    nodes?: unknown[];
    edges?: unknown[];
    nodeId?: string;
    consented?: unknown;
    sampleLimit?: number;
  };

  const nodeId = String(body?.nodeId ?? '').trim();
  if (!nodeId) {
    res.status(400).json({ error: 'nodeId is required' });
    return;
  }

  // ── Load or create the build, then bind ownership (G4, G5, G6) ──────────────
  let state = body.buildId ? await loadBuildRunState(body.buildId) : null;
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

  // A resumed build keeps its stored graph unless the client sends a newer one, in which
  // case config changes cascade-invalidate downstream results (G2).
  if (Array.isArray(body.nodes) && body.nodes.length > 0) {
    state.nodes = body.nodes;
    if (Array.isArray(body.edges)) state.edges = body.edges;
  }

  const node = (state.nodes as GraphNode[]).find((n) => n?.id === nodeId);
  if (!node) {
    res.status(404).json({ error: `Node ${nodeId} is not part of this build.` });
    return;
  }

  // One lookup: a second strict `get()` on an alias would miss what the helper just resolved.
  const { nodeType, definition } = resolveNodeType(node);
  if (!definition) {
    res.status(400).json({ error: `Unknown node type "${nodeType}".` });
    return;
  }

  const config = node.data?.config ?? {};
  const operation = typeof config.operation === 'string' ? config.operation : undefined;
  const firstRunClass = resolveFirstRunClass(nodeType, operation);

  // ── Hashes + cascade invalidation (G2) ──────────────────────────────────────
  const upstreamOutputs = upstreamOutputsFor(state, nodeId);
  const configHash = hashValue(config);
  const upstreamHash = hashValue(upstreamOutputs);
  const idempotencyKey = computeIdempotencyKey({
    buildId: state.buildId,
    nodeId,
    configHash,
    upstreamHash,
  });

  const previous = state.nodeRuns[nodeId];
  if (previous && previous.configHash !== configHash) {
    // Config changed since the last run: this node and everything downstream are no
    // longer verified, so their stored results are dropped.
    invalidateFrom(state, nodeId);
  }

  // ── Idempotency (G3) — do not re-run an unchanged, already-passed node ──────
  const current = state.nodeRuns[nodeId];
  if (current?.status === 'passed' && current.idempotencyKey === idempotencyKey) {
    await saveBuildRunState(state);
    res.json({
      buildId: state.buildId,
      nodeId,
      status: 'passed',
      firstRunClass,
      output: current.output,
      executionMs: current.executionMs,
      samplingNote: current.samplingNote,
      deduped: true,
      executionCount: state.executionCount,
    } satisfies RunNodeResponse);
    return;
  }

  // ── Consent gate (§2.1) — before anything can reach a provider ──────────────
  try {
    assertConsent(nodeType, operation, firstRunClass, body.consented);
  } catch (error) {
    if (!(error instanceof ConsentRequiredError)) throw error;
    state.nodeRuns[nodeId] = {
      status: 'ready',
      configHash,
      upstreamHash,
      idempotencyKey,
    };
    await saveBuildRunState(state);
    res.json({
      buildId: state.buildId,
      nodeId,
      status: 'awaiting_consent',
      firstRunClass,
      consentPrompt: buildConsentPrompt(node, firstRunClass),
      requiresStrongConfirmation: requiresStrongConfirmation(firstRunClass),
      executionCount: state.executionCount,
    } satisfies RunNodeResponse);
    return;
  }

  // ── Per-build ceiling (G5) — guidance, never an error dialog ────────────────
  if (state.executionCount >= MAX_EXECUTIONS_PER_BUILD) {
    res.status(429).json({
      buildId: state.buildId,
      nodeId,
      status: 'needs_attention',
      firstRunClass,
      guidance: {
        headline: 'This build has run a lot of steps already.',
        why: `We cap a single setup session at ${MAX_EXECUTIONS_PER_BUILD} step runs so a loop cannot keep contacting your services.`,
        nextSteps: [
          'Open the workflow and run it from the canvas instead.',
          'Or start a fresh build if you want to keep testing here.',
        ],
        field: { nodeId },
        severity: 'needs_attention',
        source: 'fallback',
      },
      executionCount: state.executionCount,
    } satisfies RunNodeResponse);
    return;
  }

  // ── Execute for real, via the shared executeNode (never modified) ───────────
  const startedAt = Date.now();
  state.nodeRuns[nodeId] = { status: 'running', configHash, upstreamHash, idempotencyKey };
  await saveBuildRunState(state);

  let output: unknown;
  try {
    const cache = new LRUNodeOutputsCache(100);
    for (const [sourceId, value] of Object.entries(upstreamOutputs)) cache.set(sourceId, value);

    // A single upstream output is the node's input; nothing upstream means no input.
    const inputValues = Object.values(upstreamOutputs);
    const input = inputValues.length === 1 ? inputValues[0] : inputValues.length === 0 ? {} : inputValues;

    output = await executeNode(
      node as never,
      input,
      cache,
      getDbClient() as never,
      // dynamic-node-executor performs zero DB writes, so a synthetic id is safe here
      // (verified in the plan's "Resolved while checking" note).
      `wfbuild-${state.buildId}`,
      userId,
      userId
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output = { _error: message, _nodeType: nodeType };
  }

  const executionMs = Date.now() - startedAt;
  state.executionCount += 1;

  // ── Failure → guidance, never a raw error (§2.2, Phase 7a) ──────────────────
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
      configHash,
      upstreamHash,
      idempotencyKey,
      guidance,
      executionMs,
      ranAt: new Date().toISOString(),
    };
    await saveBuildRunState(state);
    res.json({
      buildId: state.buildId,
      nodeId,
      status: 'needs_attention',
      firstRunClass,
      guidance,
      executionMs,
      executionCount: state.executionCount,
    } satisfies RunNodeResponse);
    return;
  }

  // ── Fan-out cap (§2.3) — a collection feeds exactly ONE record downstream ───
  const sample = sampleCollectionForFirstRun(output, { limit: body.sampleLimit ?? 1 });
  const samplingNote = describeSampling(sample) ?? undefined;

  state.nodeRuns[nodeId] = {
    status: 'passed',
    configHash,
    upstreamHash,
    idempotencyKey,
    output: sample.sampled,
    executionMs,
    samplingNote,
    ranAt: new Date().toISOString(),
  };
  await saveBuildRunState(state);

  logger.info('[workflow-build/run-node] executed', {
    buildId: state.buildId,
    nodeId,
    nodeType,
    firstRunClass,
    executionMs,
    sampled: sample.wasSampled,
  });

  res.json({
    buildId: state.buildId,
    nodeId,
    status: 'passed',
    firstRunClass,
    output: sample.sampled,
    executionMs,
    samplingNote,
    executionCount: state.executionCount,
  } satisfies RunNodeResponse);
}
