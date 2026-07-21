/**
 * Adaptive UI Engine — Recommendation Engine
 *
 * Deterministically re-ranks the candidate nodes already produced by the
 * capability grouper (`runCapabilityGrouping`) instead of issuing a fourth
 * `'node-suggestion'` Gemini call site. Every candidate here already came
 * from `unifiedNodeRegistry` via the grouper's `hydrateCandidateNode`, so
 * nothing here can recommend a node that doesn't exist or lacks a real
 * credential check.
 *
 * NOTE on subscription plan: there is no node-level plan-gating field
 * anywhere in `unified-node-registry.ts` or the subscription-plans schema
 * (verified before writing this) — "tier" elsewhere in the codebase refers
 * to execution-order fallback tiers, not billing tiers. So this engine does
 * NOT filter recommendations by plan; inventing that restriction would
 * violate the "never invent data" rule. Plan/role are still passed in for
 * future use and so this stays consistent if that changes.
 */

import { unifiedNodeRegistry } from '../../core/registry/unified-node-registry';
import type { CapabilityContainer } from '../ai/stages/capability-types';
import type { RecommendedNodeItem } from './types';

const MAX_RECOMMENDATIONS = 8;

export function rankRecommendedNodes(
  containers: CapabilityContainer[],
  existingNodeTypes: Set<string>,
): RecommendedNodeItem[] {
  const byNodeType = new Map<string, RecommendedNodeItem>();

  containers.forEach((container, containerIndex) => {
    const positionWeight = Math.max(0, 0.2 - containerIndex * 0.03);

    container.candidates.forEach((candidate) => {
      const alreadyInWorkflow = existingNodeTypes.has(candidate.nodeType);
      const credentialWeight = candidate.hasCredentials ? 0.5 : 0;
      const availabilityWeight = alreadyInWorkflow ? 0 : 0.15;
      const score = Math.min(1, credentialWeight + positionWeight + availabilityWeight);

      const existing = byNodeType.get(candidate.nodeType);
      if (existing && existing.score >= score) return;

      const registryEntry = unifiedNodeRegistry.get(candidate.nodeType);
      const reason = candidate.hasCredentials
        ? `Ready to use for "${container.useCaseUnit.label}"`
        : `Fits "${container.useCaseUnit.label}" — needs a connection first`;

      byNodeType.set(candidate.nodeType, {
        nodeType: candidate.nodeType,
        label: candidate.label,
        category: registryEntry?.category || 'utility',
        reason,
        score,
        hasCredentials: candidate.hasCredentials,
        alreadyInWorkflow,
      });
    });
  });

  return Array.from(byNodeType.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RECOMMENDATIONS);
}
