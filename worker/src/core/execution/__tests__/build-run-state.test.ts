/**
 * BuildRunState (Phase 7b) — the model behind gaps G2, G3, G5, G6.
 *
 * These guard the properties that stop the wizard telling a user something is verified
 * when it no longer is, and stop a node being executed twice for one click.
 */

import {
  __resetMemoryStore,
  assertOwnership,
  computeIdempotencyKey,
  createBuildRunState,
  descendantsOf,
  hashValue,
  invalidateFrom,
  loadBuildRunState,
  saveBuildRunState,
  type BuildRunState,
} from '../build-run-state';

beforeEach(() => __resetMemoryStore());

function state(): BuildRunState {
  const s = createBuildRunState({
    userId: 'user-1',
    nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    edges: [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
    ],
  });
  for (const id of ['a', 'b', 'c']) {
    s.nodeRuns[id] = {
      status: 'passed',
      configHash: `cfg-${id}`,
      upstreamHash: `up-${id}`,
      idempotencyKey: `key-${id}`,
      output: { value: id },
      executionMs: 10,
      ranAt: '2026-07-28T00:00:00.000Z',
    };
  }
  return s;
}

describe('hashing — stable and order-independent', () => {
  it('gives the same hash regardless of key order', () => {
    expect(hashValue({ a: 1, b: 2 })).toBe(hashValue({ b: 2, a: 1 }));
  });

  it('changes when a value changes', () => {
    expect(hashValue({ a: 1 })).not.toBe(hashValue({ a: 2 }));
  });

  it('distinguishes nested differences', () => {
    expect(hashValue({ a: { b: 1 } })).not.toBe(hashValue({ a: { b: 2 } }));
  });

  it('ignores undefined properties, which JSON would drop anyway', () => {
    expect(hashValue({ a: 1, b: undefined })).toBe(hashValue({ a: 1 }));
  });
});

describe('G3 — idempotency key', () => {
  const base = { buildId: 'b1', nodeId: 'n1', configHash: 'c1', upstreamHash: 'u1' };

  it('is stable for identical inputs', () => {
    expect(computeIdempotencyKey(base)).toBe(computeIdempotencyKey({ ...base }));
  });

  it('changes when the config changes', () => {
    expect(computeIdempotencyKey(base)).not.toBe(
      computeIdempotencyKey({ ...base, configHash: 'c2' })
    );
  });

  it('changes when upstream data changes', () => {
    expect(computeIdempotencyKey(base)).not.toBe(
      computeIdempotencyKey({ ...base, upstreamHash: 'u2' })
    );
  });

  it('differs across builds, so one build cannot dedupe against another', () => {
    expect(computeIdempotencyKey(base)).not.toBe(
      computeIdempotencyKey({ ...base, buildId: 'b2' })
    );
  });
});

describe('G2 — cascade invalidation', () => {
  it('finds every downstream node', () => {
    expect(descendantsOf('a', [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
    ])).toEqual(new Set(['b', 'c']));
  });

  it('returns nothing for a terminal node', () => {
    expect(descendantsOf('c', [{ source: 'a', target: 'b' }]).size).toBe(0);
  });

  it('terminates on a cycle', () => {
    expect(() =>
      descendantsOf('a', [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'a' },
      ])
    ).not.toThrow();
  });

  it('resets the edited node AND everything downstream to ready', () => {
    const s = state();
    invalidateFrom(s, 'a');
    for (const id of ['a', 'b', 'c']) expect(s.nodeRuns[id].status).toBe('ready');
  });

  it('DROPS stored output and guidance, so stale verification is impossible', () => {
    const s = state();
    invalidateFrom(s, 'a');
    for (const id of ['a', 'b', 'c']) {
      expect(s.nodeRuns[id].output).toBeUndefined();
      expect(s.nodeRuns[id].executionMs).toBeUndefined();
      expect(s.nodeRuns[id].ranAt).toBeUndefined();
    }
  });

  it('leaves upstream nodes verified — only downstream is affected', () => {
    const s = state();
    invalidateFrom(s, 'b');
    expect(s.nodeRuns.a.status).toBe('passed');
    expect(s.nodeRuns.a.output).toEqual({ value: 'a' });
    expect(s.nodeRuns.b.status).toBe('ready');
    expect(s.nodeRuns.c.status).toBe('ready');
  });
});

describe('G5 — ownership', () => {
  it('accepts the creating user', () => {
    expect(() => assertOwnership(state(), 'user-1')).not.toThrow();
  });

  it('rejects a different user with a 403', () => {
    try {
      assertOwnership(state(), 'user-2');
      throw new Error('should have thrown');
    } catch (err) {
      expect((err as Error & { statusCode?: number }).statusCode).toBe(403);
    }
  });
});

describe('G4/G6 — persistence and resume', () => {
  it('round-trips a build', async () => {
    const s = state();
    await saveBuildRunState(s);
    const loaded = await loadBuildRunState(s.buildId);
    expect(loaded?.buildId).toBe(s.buildId);
    expect(loaded?.nodeRuns.a.status).toBe('passed');
  });

  it('returns null for an unknown build', async () => {
    expect(await loadBuildRunState('does-not-exist')).toBeNull();
  });

  it('preserves prior results on resume rather than clearing them (never auto re-runs)', async () => {
    const s = state();
    await saveBuildRunState(s);
    const loaded = await loadBuildRunState(s.buildId);
    expect(loaded?.nodeRuns.a.output).toEqual({ value: 'a' });
    expect(loaded?.executionCount).toBe(0);
  });

  it('binds userId at creation', () => {
    expect(createBuildRunState({ userId: 'u9', nodes: [], edges: [] }).userId).toBe('u9');
  });
});
