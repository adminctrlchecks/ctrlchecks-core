/**
 * One way to answer "which node is this?".
 *
 * A node arrives in two shapes and both are legitimate:
 *
 *   - **Server-built** (`capability-selection/generate.ts`, `plan-driven-workflow-builder.ts`):
 *     the canonical business type is in `node.type`.
 *   - **Canvas / stored** (`ctrl_checks/src/lib/node-type-normalizer.ts`): `node.type` is the
 *     React Flow RENDERER type — `'custom'` for nearly every node — and the business type is
 *     in `node.data.type`.
 *
 * On top of that, workflows legitimately carry aliases (`gmail` for `google_gmail`), and
 * `unifiedNodeRegistry.get()` is deliberately strict: canonical names only, no translation.
 *
 * Reading `node.type ?? node.data?.type` therefore yields `'custom'` for every canvas node,
 * and every caller's registry lookup misses. Each site failed silently in its own way — no
 * upstream fields, a skipped node, five empty groups, an "Unknown node type" error — so the
 * same three lines were fixed once, in one place, and drifted everywhere else.
 *
 * This is that one place. Business type first, alias translation on each candidate, and the
 * first candidate that actually resolves against the registry wins.
 *
 * No node-type branching lives here — only registry lookups (CLAUDE.md single-source-of-truth
 * rule).
 */

import { unifiedNodeRegistry } from './unified-node-registry';
import type { UnifiedNodeDefinition } from '../types/unified-node-contract';

/** The minimum shape every caller's node type satisfies — graph nodes, stored nodes, DTOs. */
export interface NodeTypeSource {
  type?: string;
  data?: { type?: string; [key: string]: unknown } | null;
}

export interface ResolvedNodeType {
  /**
   * The canonical registry type when it resolved; otherwise the type **as it arrived**, which
   * is what a diagnostic should name. Never `'custom'` for a node whose business type resolves.
   */
  nodeType: string;
  /** The registry definition, or undefined when nothing resolved. */
  definition: UnifiedNodeDefinition | undefined;
  /** The type as it arrived (business type preferred) — for messages the user can act on. */
  rawNodeType: string;
  resolved: boolean;
}

/**
 * Resolve a node to its canonical registry type.
 *
 * Candidates are tried business-type-first; each is alias-translated before the strict
 * registry lookup. Callers that need the definition should use the one returned here rather
 * than calling `get()` again — a second strict lookup on an alias would miss.
 */
export function resolveNodeType(node: NodeTypeSource | null | undefined): ResolvedNodeType {
  const candidates = [node?.data?.type, node?.type]
    .map((candidate) => String(candidate ?? '').trim())
    .filter(Boolean);

  const rawNodeType = candidates[0] ?? '';

  for (const candidate of candidates) {
    const canonical = unifiedNodeRegistry.resolveAlias(candidate) ?? candidate;
    const definition = unifiedNodeRegistry.get(canonical);
    if (definition) {
      return { nodeType: canonical, definition, rawNodeType, resolved: true };
    }
  }

  return { nodeType: rawNodeType, definition: undefined, rawNodeType, resolved: false };
}

/**
 * The canonical type string, or the type as it arrived when nothing resolved.
 *
 * Drop-in replacement for the `String(node?.type ?? node?.data?.type ?? '').trim()` idiom
 * this module exists to retire.
 */
export function nodeTypeOf(node: NodeTypeSource | null | undefined): string {
  return resolveNodeType(node).nodeType;
}
