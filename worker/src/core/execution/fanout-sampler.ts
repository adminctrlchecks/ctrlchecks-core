/**
 * Fan-out sampler (plan §2.3).
 *
 * Uncapped, *"read customers → email each"* on a 500-row sheet would send **500 real
 * emails** during setup. A collection output is therefore sampled to exactly one record
 * before it feeds a downstream fan-out.
 *
 * The settled decision is a fixed sample of **1**, surfaced to the user as
 * *"Ran with 1 of N — the full set runs when you execute the workflow."*
 *
 * Pure: no execution, no I/O.
 */

/** Property names that conventionally carry the collection in a node's output. */
const COLLECTION_KEYS = ['rows', 'items', 'records', 'results', 'data', 'values', 'messages', 'files'];

export interface SampleResult<T = unknown> {
  /** The value to pass downstream — truncated when it was a collection. */
  sampled: T;
  /** How many records the original held. 0 when it was not a collection. */
  originalCount: number;
  /** True when truncation actually happened, i.e. there was more than the limit. */
  wasSampled: boolean;
  /** Which property held the collection, when it was nested. */
  collectionKey?: string;
}

export interface SampleOptions {
  /** Records to keep. Defaults to 1 and is clamped to at least 1. */
  limit?: number;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Truncate a collection output to `limit` records (default 1).
 *
 * Handles a bare array, and an object whose single meaningful payload is an array under
 * a conventional key (`rows`, `items`, …). Anything else is returned untouched — a scalar
 * or a plain record is not a fan-out, and guessing would corrupt it.
 */
export function sampleCollectionForFirstRun<T = unknown>(
  value: T,
  options: SampleOptions = {}
): SampleResult<T> {
  const limit = Math.max(1, Math.floor(options.limit ?? 1));

  if (Array.isArray(value)) {
    const originalCount = value.length;
    return {
      sampled: value.slice(0, limit) as unknown as T,
      originalCount,
      wasSampled: originalCount > limit,
    };
  }

  if (isPlainObject(value)) {
    for (const key of COLLECTION_KEYS) {
      const inner = value[key];
      if (Array.isArray(inner)) {
        const originalCount = inner.length;
        return {
          sampled: { ...value, [key]: inner.slice(0, limit) } as unknown as T,
          originalCount,
          wasSampled: originalCount > limit,
          collectionKey: key,
        };
      }
    }
  }

  // Not a collection — nothing to cap.
  return { sampled: value, originalCount: 0, wasSampled: false };
}

/** True when this output would fan a downstream node out over multiple records. */
export function isCollectionOutput(value: unknown): boolean {
  if (Array.isArray(value)) return true;
  if (!isPlainObject(value)) return false;
  return COLLECTION_KEYS.some((key) => Array.isArray(value[key]));
}

/**
 * User-facing note for a sampled run. Returns null when nothing was capped, so the UI
 * shows no message rather than a misleading "1 of 1".
 */
export function describeSampling(result: SampleResult): string | null {
  if (!result.wasSampled) return null;
  return `Ran with 1 of ${result.originalCount} — the full set runs when you execute the workflow.`;
}
