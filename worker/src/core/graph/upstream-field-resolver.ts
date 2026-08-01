/**
 * Upstream data-shape resolution for a node in a workflow graph.
 *
 * Extracted verbatim from `services/ai/stages/property-population-stage.ts` (Phase 3 of
 * the field-ownership redesign) so the field-plan API and the generation pipeline share
 * one implementation instead of two that can drift. The walk is unchanged; the only
 * addition is recording **which node** contributed each field, which the field-plan API
 * needs to explain a value's origin ("uses the spreadsheet ID from Manual Trigger").
 *
 * No node-type checks live here — only the registry's declarative schema
 * (CLAUDE.md single-source-of-truth rule).
 */

import { unifiedNodeRegistry } from '../registry/unified-node-registry';
import { resolveNodeType } from '../registry/node-type-resolution';

export interface UpstreamGraphNode {
  id: string;
  type?: string;
  data?: {
    type?: string;
    label?: string;
    config?: Record<string, unknown>;
  };
}

export interface UpstreamGraphEdge {
  source: string;
  target: string;
}

export interface UpstreamGraph {
  nodes: UpstreamGraphNode[];
  edges: UpstreamGraphEdge[];
}

export interface UpstreamField {
  name: string;
  type: string;
  description?: string;
  /** The node whose output schema declared this field. */
  producedByNodeId: string;
  producedByNodeType: string;
  producedByNodeLabel: string;
}

export interface UpstreamFieldContext {
  fields: UpstreamField[];
  names: Set<string>;
}

/**
 * Walks the graph backward from nodeId to find the REAL data shape flowing into it —
 * not a per-type guess.
 *
 * At each upstream hop, asks the registry for that node's effective output schema
 * (grounded in the node's actual instance config for dynamic nodes like `form`). When a
 * node declares no properties and isn't marked `dynamic` (e.g. switch/if_else, which
 * don't transform the payload), the walk continues further upstream through it. When a
 * node IS marked `dynamic` (e.g. a code node whose output shape can't be known
 * statically), the walk stops there and contributes no fields from that branch —
 * attributing whatever fed the code node would be a guess, not grounding.
 *
 * First writer wins for a given field name, matching the original: the nearest upstream
 * node that declares a real shape owns it, and the walk does not attribute it further back.
 */
/**
 * How far into a nested object value to descend. The field-plan endpoint is called on a
 * wizard debounce, so an unbounded walk over a large generated JSON blob would be felt on
 * every keystroke.
 */
const MAX_NESTED_DEPTH = 3;

/** Runtime type of a config value, in the vocabulary the output schema already uses. */
function runtimeTypeOf(value: unknown): string {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'string';
  return typeof value;
}

/**
 * Emits `parent.child` paths for the plain-object values inside an upstream node's config.
 *
 * Arrays are offered whole (`inputData.rows`) and not descended into: an index-addressed
 * reference would be attributing a shape to data that has not run yet.
 */
function collectNestedFields(params: {
  value: unknown;
  path: string;
  depth: number;
  seen: WeakSet<object>;
  onField: (fieldName: string, type: string) => void;
}): void {
  const { value, path, depth, seen, onField } = params;
  if (depth > MAX_NESTED_DEPTH) return;
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return;
  if (seen.has(value as object)) return;
  seen.add(value as object);

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const childPath = `${path}.${key}`;
    onField(childPath, runtimeTypeOf(child));
    collectNestedFields({ value: child, path: childPath, depth: depth + 1, seen, onField });
  }
}

export function resolveUpstreamFields(graph: UpstreamGraph, nodeId: string): UpstreamFieldContext {
  const fields: UpstreamField[] = [];
  const names = new Set<string>();
  const visited = new Set<string>();
  const queue: string[] = [nodeId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    for (const edge of graph.edges) {
      if (edge.target !== currentId || visited.has(edge.source)) continue;
      const upNode = graph.nodes.find((n) => n.id === edge.source);
      if (!upNode) continue;
      /*
       * The canonical type, not `upNode.type` — a stored/canvas node carries `'custom'`
       * there, which resolves to no schema, so every field went unattributed and the wizard
       * asked the user for a value the upstream node already had.
       */
      const upType = resolveNodeType(upNode).nodeType;
      const upLabel = String(upNode.data?.label ?? upType ?? upNode.id);
      const effective = unifiedNodeRegistry.getEffectiveOutputSchema(
        upType,
        upNode.data?.config as Record<string, any> | undefined,
      );

      if (effective?.properties && Object.keys(effective.properties).length > 0) {
        for (const [name, meta] of Object.entries(effective.properties)) {
          if (!names.has(name)) {
            names.add(name);
            fields.push({
              name,
              type: meta.type,
              description: meta.description,
              producedByNodeId: upNode.id,
              producedByNodeType: upType,
              producedByNodeLabel: upLabel,
            });
          }
        }
        /*
         * Nested values are addressable too (RC-4).
         *
         * The walk used to stop at the top level, so a `spreadsheetId` living inside
         * `manual_trigger.inputData` was invisible: the best reference downstream could ever
         * be offered was `{{$json.inputData}}`, never `{{$json.inputData.spreadsheetId}}`.
         * With no usable reference the next node had nothing to link to and asked the user
         * for a value the node above already carried.
         *
         * The nested shape comes from the upstream node's INSTANCE config, exactly as a form
         * node's output shape already comes from `config.fields` — no node-type branching
         * here, only "this declared output property currently holds an object".
         */
        const config = upNode.data?.config as Record<string, unknown> | undefined;
        if (config) {
          for (const name of Object.keys(effective.properties)) {
            collectNestedFields({
              value: config[name],
              path: name,
              depth: 1,
              seen: new WeakSet<object>(),
              onField: (fieldName, type) => {
                if (names.has(fieldName)) return;
                names.add(fieldName);
                fields.push({
                  name: fieldName,
                  type,
                  producedByNodeId: upNode.id,
                  producedByNodeType: upType,
                  producedByNodeLabel: upLabel,
                });
              },
            });
          }
        }

        continue; // Real shape found here — don't attribute it to nodes further back.
      }

      if (effective?.dynamic === true) {
        continue; // Shape is unknowable statically (e.g. code) — don't guess past it.
      }

      queue.push(edge.source); // No declared shape at all (passthrough/routing) — keep walking.
    }
  }

  return { fields, names };
}

/** Recursively collects every `$json.<name>` reference (bare or `{{...}}`) inside a JSON value. */
export function extractJsonFieldRefs(value: unknown): string[] {
  const refs: string[] = [];
  const visit = (v: unknown): void => {
    if (typeof v === 'string') {
      const matches = v.matchAll(/\$json\.([A-Za-z_][A-Za-z0-9_]*)/g);
      for (const m of matches) refs.push(m[1]);
    } else if (Array.isArray(v)) {
      for (const item of v) visit(item);
    } else if (v && typeof v === 'object') {
      for (const val of Object.values(v)) visit(val);
    }
  };
  visit(value);
  return refs;
}
