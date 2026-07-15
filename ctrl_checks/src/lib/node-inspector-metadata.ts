/**
 * Node Inspector Metadata
 *
 * Universal lookup/fallback helpers for the Properties panel so every node —
 * not just a hand-picked few — resolves a canonical type, a meaningful
 * description, and its usage guide from the best available source.
 *
 * Description precedence (first meaningful wins):
 *   1. backend schema / node registry description
 *   2. docs-content manifest description (boilerplate suffix stripped)
 *   3. usage guide overview
 *   4. legacy nodeTypes.ts description
 *   5. "No description available"
 */

import { NODE_USAGE_GUIDES } from '@/components/workflow/nodeUsageGuides';
import type { NodeUsageGuide } from '@/components/workflow/nodeTypes';
import { nodeManifestBySlug } from '@/docs-content/manifest';

/**
 * Aliases for node types that were renamed but may still exist in persisted
 * workflows. Lookups (schema fetch, usage guides, legacy definitions, docs)
 * must go through the canonical name.
 */
export const LEGACY_NODE_TYPE_ALIASES: Record<string, string> = {
  csv_processor: 'csv',
};

/** Resolve the canonical node type used for all registry/docs/guide lookups. */
export function normalizeNodeTypeForLookup(rawType: unknown): string {
  const type = typeof rawType === 'string' ? rawType.trim() : '';
  if (!type) return '';
  return LEGACY_NODE_TYPE_ALIASES[type] || type;
}

/** Usage guide lookup that tolerates alias/non-canonical stored types. */
export function getUsageGuideForType(rawType: unknown): NodeUsageGuide | undefined {
  const type = normalizeNodeTypeForLookup(rawType);
  return type ? NODE_USAGE_GUIDES[type] : undefined;
}

const normalizeForComparison = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '');

/**
 * A description is "weak" when it adds nothing over the node's own name —
 * e.g. `description: 'Gmail'` on the Gmail node — or is empty.
 */
export function isMeaningfulNodeDescription(
  description: string | undefined | null,
  context: { nodeType?: string; displayName?: string },
): description is string {
  const text = typeof description === 'string' ? description.trim() : '';
  if (!text) return false;
  const normalized = normalizeForComparison(text);
  if (!normalized) return false;
  const nameCandidates = [context.nodeType, context.displayName]
    .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    .map(normalizeForComparison);
  return !nameCandidates.includes(normalized);
}

/**
 * docs-content manifest descriptions carry a generated marketing suffix
 * ("Use this node when a workflow needs … registry.") that is noise inside
 * the compact Properties panel — strip it, keep the real sentence(s).
 */
export function stripDocDescriptionBoilerplate(description: string): string {
  return description
    .replace(/\s*Use this node when a workflow needs [\s\S]*?registry\.?\s*$/i, '')
    .trim();
}

export const NODE_DESCRIPTION_FALLBACK = 'No description available';

export interface ResolveNodeDescriptionArgs {
  /** Raw node type as stored on the canvas node (aliases tolerated). */
  nodeType: string;
  /** Canonical display name shown as "Type" in the panel. */
  displayName?: string;
  /** Description from the backend schema (UnifiedNodeRegistry). */
  backendDescription?: string;
  /** Description from the legacy nodeTypes.ts definition. */
  legacyDescription?: string;
}

/** Pick the richest available description for a node (see file header for order). */
export function resolveNodeDescription(args: ResolveNodeDescriptionArgs): string {
  const type = normalizeNodeTypeForLookup(args.nodeType);
  const context = { nodeType: type, displayName: args.displayName };

  const docDescription = nodeManifestBySlug[type]?.description;
  const candidates: Array<string | undefined> = [
    args.backendDescription,
    docDescription ? stripDocDescriptionBoilerplate(docDescription) : undefined,
    NODE_USAGE_GUIDES[type]?.overview,
    args.legacyDescription,
  ];

  for (const candidate of candidates) {
    if (isMeaningfulNodeDescription(candidate, context)) {
      return candidate.trim();
    }
  }
  return NODE_DESCRIPTION_FALLBACK;
}
