/**
 * Fan-out sampler (Phase 6).
 *
 * PROOF 3 of the plan's three mandated safety proofs: a 500-row read must feed exactly
 * ONE record downstream, so "read customers → email each" cannot send 500 real emails
 * during setup.
 */

import {
  describeSampling,
  isCollectionOutput,
  sampleCollectionForFirstRun,
} from '../fanout-sampler';

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i, email: `u${i}@x.test` }));

describe('PROOF 3 — a 500-row read feeds exactly one record downstream', () => {
  it('truncates a bare 500-item array to exactly 1', () => {
    const result = sampleCollectionForFirstRun(rows(500));
    expect((result.sampled as unknown[]).length).toBe(1);
    expect(result.originalCount).toBe(500);
    expect(result.wasSampled).toBe(true);
  });

  it('truncates a 500-row collection nested under `rows` to exactly 1', () => {
    const result = sampleCollectionForFirstRun({ rows: rows(500), sheet: 'Leads' });
    const sampled = result.sampled as { rows: unknown[]; sheet: string };
    expect(sampled.rows.length).toBe(1);
    expect(result.originalCount).toBe(500);
    expect(result.collectionKey).toBe('rows');
  });

  it('keeps the rest of the payload intact while truncating', () => {
    const result = sampleCollectionForFirstRun({ rows: rows(50), sheet: 'Leads', range: 'A1:D50' });
    const sampled = result.sampled as Record<string, unknown>;
    expect(sampled.sheet).toBe('Leads');
    expect(sampled.range).toBe('A1:D50');
    expect((sampled.rows as unknown[]).length).toBe(1);
  });

  it('preserves the FIRST record, not an arbitrary one', () => {
    const result = sampleCollectionForFirstRun(rows(500));
    expect((result.sampled as Array<{ id: number }>)[0].id).toBe(0);
  });
});

describe('collection detection', () => {
  it.each(['rows', 'items', 'records', 'results', 'data', 'values', 'messages', 'files'])(
    'recognises a collection under `%s`',
    (key) => {
      expect(isCollectionOutput({ [key]: rows(3) })).toBe(true);
      const result = sampleCollectionForFirstRun({ [key]: rows(3) });
      expect(result.collectionKey).toBe(key);
    }
  );

  it('recognises a bare array', () => {
    expect(isCollectionOutput(rows(3))).toBe(true);
  });

  it('does not treat a scalar or plain record as a collection', () => {
    expect(isCollectionOutput('hello')).toBe(false);
    expect(isCollectionOutput(42)).toBe(false);
    expect(isCollectionOutput(null)).toBe(false);
    expect(isCollectionOutput({ id: 1, name: 'x' })).toBe(false);
  });
});

describe('leaves non-collections untouched', () => {
  it('returns a scalar unchanged', () => {
    const result = sampleCollectionForFirstRun('a string');
    expect(result.sampled).toBe('a string');
    expect(result.wasSampled).toBe(false);
    expect(result.originalCount).toBe(0);
  });

  it('returns a plain record unchanged, without corrupting it', () => {
    const value = { id: 1, name: 'x' };
    const result = sampleCollectionForFirstRun(value);
    expect(result.sampled).toEqual(value);
    expect(result.wasSampled).toBe(false);
  });

  it('handles null and undefined', () => {
    expect(sampleCollectionForFirstRun(null).sampled).toBeNull();
    expect(sampleCollectionForFirstRun(undefined).sampled).toBeUndefined();
  });
});

describe('edge cases', () => {
  it('reports an empty collection as not sampled', () => {
    const result = sampleCollectionForFirstRun([]);
    expect((result.sampled as unknown[]).length).toBe(0);
    expect(result.originalCount).toBe(0);
    expect(result.wasSampled).toBe(false);
  });

  it('reports a single-record collection as not sampled', () => {
    const result = sampleCollectionForFirstRun(rows(1));
    expect(result.wasSampled).toBe(false);
    expect(result.originalCount).toBe(1);
  });

  it('honours an explicit limit and clamps it to at least 1', () => {
    expect((sampleCollectionForFirstRun(rows(10), { limit: 3 }).sampled as unknown[]).length).toBe(3);
    expect((sampleCollectionForFirstRun(rows(10), { limit: 0 }).sampled as unknown[]).length).toBe(1);
    expect((sampleCollectionForFirstRun(rows(10), { limit: -5 }).sampled as unknown[]).length).toBe(1);
  });
});

describe('user-facing copy', () => {
  it('uses the settled wording when truncation happened', () => {
    const result = sampleCollectionForFirstRun(rows(24));
    expect(describeSampling(result)).toBe(
      'Ran with 1 of 24 — the full set runs when you execute the workflow.'
    );
  });

  it('says nothing when nothing was capped, rather than "1 of 1"', () => {
    expect(describeSampling(sampleCollectionForFirstRun(rows(1)))).toBeNull();
    expect(describeSampling(sampleCollectionForFirstRun('scalar'))).toBeNull();
  });
});
