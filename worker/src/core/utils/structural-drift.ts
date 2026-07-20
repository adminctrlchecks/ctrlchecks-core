import { unifiedNodeRegistry } from '../registry/unified-node-registry';
import { isStructuralOwnership } from './field-ownership';

export interface StructuralDriftEntry {
  field: string;
  changedKeys?: string[];
}

function pick(item: unknown, keys: string[]): Record<string, unknown> {
  if (!item || typeof item !== 'object') return { __value: item };
  const out: Record<string, unknown> = {};
  for (const key of keys) out[key] = (item as Record<string, unknown>)[key];
  return out;
}

/** Order-independent signature over only the declared shape keys of each array item. */
function shapeSignature(value: unknown, shapeKeys: string[]): string {
  if (!Array.isArray(value)) return JSON.stringify(value);
  const slices = value.map((item) => JSON.stringify(pick(item, shapeKeys))).sort();
  return JSON.stringify(slices);
}

function wholeValueChanged(before: unknown, after: unknown): boolean {
  if (before === after) return false;
  try {
    return JSON.stringify(before) !== JSON.stringify(after);
  } catch {
    return true;
  }
}

/**
 * Detects post-freeze structural drift for a node by comparing only the fields the
 * registry marks `ownership: 'structural'` — driven entirely by registry metadata, so
 * it applies to every node type automatically (not a hardcoded per-node-type list).
 *
 * Fields that declare `structuralShapeKeys` are compared on only those sub-keys (shape:
 * identity/type/wiring), so editing other properties of the same array items (label,
 * placeholder, options text, defaults) is never reported as drift. Structural fields
 * without declared shape keys fall back to a whole-value comparison.
 */
export function detectStructuralDrift(
  nodeType: string,
  beforeConfig: Record<string, unknown>,
  afterConfig: Record<string, unknown>
): StructuralDriftEntry[] {
  const definition = unifiedNodeRegistry.get(nodeType);
  if (!definition) return [];

  const drifts: StructuralDriftEntry[] = [];

  for (const [fieldName, fieldDef] of Object.entries(definition.inputSchema || {})) {
    if (!isStructuralOwnership(fieldName, fieldDef as any)) continue;

    const before = beforeConfig?.[fieldName];
    const after = afterConfig?.[fieldName];
    const shapeKeys = (fieldDef as any)?.structuralShapeKeys as string[] | undefined;

    if (Array.isArray(shapeKeys) && shapeKeys.length > 0) {
      const beforeArray = Array.isArray(before) ? before : [];
      const afterArray = Array.isArray(after) ? after : [];
      const lengthChanged = beforeArray.length !== afterArray.length;
      const shapeChanged = shapeSignature(before, shapeKeys) !== shapeSignature(after, shapeKeys);
      if (lengthChanged || shapeChanged) {
        drifts.push({ field: fieldName, changedKeys: [...shapeKeys] });
      }
      continue;
    }

    if (wholeValueChanged(before, after)) {
      drifts.push({ field: fieldName });
    }
  }

  return drifts;
}
