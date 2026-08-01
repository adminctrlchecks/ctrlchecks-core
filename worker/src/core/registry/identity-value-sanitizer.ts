/**
 * Identity keys inside object VALUES — the hole the per-field guard cannot see (plan RC-3).
 *
 * `identity-field-policy.ts` withdraws build-time AI from identity *fields*. But the guard is
 * per field, and `manual_trigger.inputData` is a single field of `role: 'raw_json'` that the
 * AI may legitimately fill. It filled it with an object *containing* a `spreadsheetId` —
 * Google's own documentation sample — which then disagreed with a different invented ID on
 * the Sheets node one hop away. Blocking `spreadsheetId` as a field just moves the fabrication
 * into a JSON key.
 *
 * Telling the model not to invent identifiers is not sufficient: a model told that will still
 * sometimes invent one. This pass is structural, so the guarantee does not depend on model
 * compliance.
 *
 * **It clears values; it never deletes keys.** Whether a trigger should carry these keys at
 * all is an open product question (plan §5.2) — clearing is safe under either answer, deleting
 * would pre-empt it.
 */

import { isIdentityField } from './identity-field-policy';

/** Depth and node budgets. The field-plan endpoint is called on a wizard debounce. */
const MAX_DEPTH = 8;
const MAX_NODES = 5000;

export interface SanitizeResult {
  value: unknown;
  changed: boolean;
  /** Key names whose fabricated value was cleared, for logging and for the UI to explain. */
  strippedKeys: string[];
}

/** A value that is mapped from upstream rather than invented — `{{$json.x}}` or `$json.x`. */
function isTemplateReference(value: unknown): boolean {
  return typeof value === 'string' && /\$json\./.test(value);
}

/** Only a non-empty scalar can be a fabricated identifier; objects/arrays are walked instead. */
function isFabricatableScalar(value: unknown): boolean {
  if (typeof value === 'string') return value.trim() !== '';
  return typeof value === 'number' || typeof value === 'bigint';
}

/**
 * Returns a copy of `value` with every identity-looking key's invented value cleared.
 *
 * Bounded by depth, node count and a cycle guard: an unbounded walk over a large generated
 * JSON blob would hurt every caller on the generation path.
 */
export function sanitizeIdentityValues(value: unknown): SanitizeResult {
  const strippedKeys: string[] = [];
  let changed = false;
  let visitedCount = 0;
  const seen = new WeakSet<object>();

  const walk = (current: unknown, depth: number): unknown => {
    if (current === null || typeof current !== 'object') return current;
    if (depth >= MAX_DEPTH || visitedCount >= MAX_NODES) return current;
    if (seen.has(current as object)) return current;
    seen.add(current as object);
    visitedCount++;

    if (Array.isArray(current)) {
      return current.map((item) => walk(item, depth + 1));
    }

    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(current as Record<string, unknown>)) {
      if (child !== null && typeof child === 'object') {
        out[key] = walk(child, depth + 1);
        continue;
      }

      // `role` is unknown for a bare JSON key, so the name rule alone decides here.
      if (isIdentityField(key) && isFabricatableScalar(child) && !isTemplateReference(child)) {
        out[key] = '';
        strippedKeys.push(key);
        changed = true;
        continue;
      }

      out[key] = child;
    }
    return out;
  };

  const sanitized = walk(value, 0);
  return { value: changed ? sanitized : value, changed, strippedKeys };
}
