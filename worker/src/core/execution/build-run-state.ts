/**
 * BuildRunState — the server-authoritative record of a wizard build run (plan §6a).
 *
 * One object resolves five of the gaps the plan identified:
 *   G2 cascade invalidation — `configHash` / `upstreamHash` per node
 *   G3 idempotency          — `idempotencyKey` derived from those hashes
 *   G4 lifecycle            — Redis, `wfbuild:{buildId}`, 2h TTL refreshed on activity
 *   G5 auth + abuse         — `userId` bound at creation, per-build `executionCount`
 *   G6 resume               — restore and display, never auto re-run
 *
 * **Server-authoritative on purpose.** Upstream outputs live here, not in the client's
 * request, so a caller cannot hand us fabricated data and have it fed to a real provider.
 */

import { createHash, randomUUID } from 'crypto';
import { createClient, type RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from '../logger';
import type { Guidance } from '../guidance/types';

export type NodeRunStatus =
  | 'waiting'
  | 'needs_input'
  | 'ready'
  | 'running'
  | 'passed'
  | 'not_exercised'
  | 'needs_attention';

export interface NodeRunRecord {
  status: NodeRunStatus;
  /** Hash of this node's resolved config (G2). */
  configHash: string;
  /** Hash of the inputs it consumed (G2). */
  upstreamHash: string;
  /** hash(buildId, nodeId, configHash, upstreamHash) — dedupe key (G3). */
  idempotencyKey: string;
  output?: unknown;
  guidance?: Guidance;
  executionMs?: number;
  /** Set when a collection was capped for the first run (§2.3). */
  samplingNote?: string;
  ranAt?: string;
}

export interface BuildRunState {
  buildId: string;
  /** Bound at creation; a mismatch is a 403 (G5). */
  userId: string;
  nodes: unknown[];
  edges: unknown[];
  nodeRuns: Record<string, NodeRunRecord>;
  /** Mirrors the real engine so only one branch fires (G1). */
  branchResults: {
    ifElseResults: Record<string, boolean>;
    switchResults: Record<string, string | null>;
  };
  /** Per-build ceiling (G5). */
  executionCount: number;
  createdAt: string;
  updatedAt: string;
}

const KEY_PREFIX = 'wfbuild:';
const TTL_SECONDS = 2 * 60 * 60; // 2h, refreshed on activity (G4)

/** Per-build execution ceiling (G5). Exceeding it returns guidance, never an error dialog. */
export const MAX_EXECUTIONS_PER_BUILD = 50;

export function buildKey(buildId: string): string {
  return `${KEY_PREFIX}${buildId}`;
}

/* -------------------------------------------------------------------------- */
/* Hashing (G2 / G3)                                                           */
/* -------------------------------------------------------------------------- */

/** Stable stringify: key order must not change the hash. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
}

export function hashValue(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex').slice(0, 32);
}

export function computeIdempotencyKey(args: {
  buildId: string;
  nodeId: string;
  configHash: string;
  upstreamHash: string;
}): string {
  return hashValue([args.buildId, args.nodeId, args.configHash, args.upstreamHash]);
}

/* -------------------------------------------------------------------------- */
/* Cascade invalidation (G2)                                                   */
/* -------------------------------------------------------------------------- */

interface EdgeLike {
  source?: string;
  target?: string;
}

/** Every node reachable downstream of `nodeId`. Cycle-safe. */
export function descendantsOf(nodeId: string, edges: unknown[]): Set<string> {
  const out = new Set<string>();
  const queue = [nodeId];
  const seen = new Set<string>([nodeId]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges as EdgeLike[]) {
      if (edge?.source !== current || !edge?.target) continue;
      if (seen.has(edge.target)) continue;
      seen.add(edge.target);
      out.add(edge.target);
      queue.push(edge.target);
    }
  }
  return out;
}

/**
 * A node's config changed, so it and everything downstream stop being verified.
 *
 * Dropping `output` and `guidance` is the point: a chip can only read `passed` while its
 * stored hashes still match, which makes stale verification structurally impossible.
 */
export function invalidateFrom(state: BuildRunState, nodeId: string): void {
  const affected = [nodeId, ...descendantsOf(nodeId, state.edges)];
  for (const id of affected) {
    const record = state.nodeRuns[id];
    if (!record) continue;
    record.status = 'ready';
    delete record.output;
    delete record.guidance;
    delete record.executionMs;
    delete record.samplingNote;
    delete record.ranAt;
  }
}

/* -------------------------------------------------------------------------- */
/* Redis store (G4)                                                            */
/* -------------------------------------------------------------------------- */

let client: RedisClientType | null = null;
let connected = false;
let initPromise: Promise<void> | null = null;

/** In-memory fallback so a missing Redis degrades to single-process rather than 500s. */
const memoryStore = new Map<string, { value: BuildRunState; expiresAt: number }>();

async function getClient(): Promise<RedisClientType | null> {
  const url = (config as { redisUrl?: string })?.redisUrl || process.env.REDIS_URL;
  if (!url) return null;
  if (client && connected) return client;
  if (initPromise) {
    await initPromise;
    return client && connected ? client : null;
  }
  initPromise = (async () => {
    try {
      const next = createClient({ url }) as RedisClientType;
      next.on('error', () => {
        connected = false;
      });
      await next.connect();
      client = next;
      connected = true;
    } catch (error) {
      logger.warn('[build-run-state] Redis unavailable, using in-memory store', {
        error: error instanceof Error ? error.message : String(error),
      });
      client = null;
      connected = false;
    }
  })();
  await initPromise;
  initPromise = null;
  return client && connected ? client : null;
}

function memoryGet(buildId: string): BuildRunState | null {
  const hit = memoryStore.get(buildKey(buildId));
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    memoryStore.delete(buildKey(buildId));
    return null;
  }
  return hit.value;
}

export async function saveBuildRunState(state: BuildRunState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  const redis = await getClient();
  if (redis) {
    // TTL refreshed on every write — an active build never expires under the user.
    await redis.set(buildKey(state.buildId), JSON.stringify(state), { EX: TTL_SECONDS });
    return;
  }
  memoryStore.set(buildKey(state.buildId), {
    value: state,
    expiresAt: Date.now() + TTL_SECONDS * 1000,
  });
}

export async function loadBuildRunState(buildId: string): Promise<BuildRunState | null> {
  const redis = await getClient();
  if (redis) {
    const raw = await redis.get(buildKey(buildId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as BuildRunState;
    } catch {
      return null;
    }
  }
  return memoryGet(buildId);
}

export function createBuildRunState(args: {
  userId: string;
  nodes: unknown[];
  edges: unknown[];
  buildId?: string;
}): BuildRunState {
  const now = new Date().toISOString();
  return {
    buildId: args.buildId || randomUUID(),
    userId: args.userId,
    nodes: args.nodes,
    edges: args.edges,
    nodeRuns: {},
    branchResults: { ifElseResults: {}, switchResults: {} },
    executionCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/** 403 on a userId mismatch (G5) — a build belongs to the user who created it. */
export function assertOwnership(state: BuildRunState, userId: string): void {
  if (state.userId !== userId) {
    const error = new Error('This build belongs to a different account.');
    (error as Error & { statusCode?: number }).statusCode = 403;
    throw error;
  }
}

/** Only for tests: clears the in-memory fallback between cases. */
export function __resetMemoryStore(): void {
  memoryStore.clear();
}
