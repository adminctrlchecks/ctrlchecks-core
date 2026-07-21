/**
 * Zod validation for the Adaptive UI Engine.
 *
 * Only the LLM-boundary output (contextual help text) is untrusted and needs
 * runtime validation — capabilities/setupGuide/missingItems come from
 * existing internal services and are already typed. This mirrors the one
 * established Zod pattern in this codebase (core/validation/node-schemas.ts):
 * validate at the boundary where AI output enters the system, not everywhere.
 */

import { z } from 'zod';
import type { AdaptiveUIFallback, ContextualHelpItem } from './types';

export const ContextualHelpItemSchema = z.object({
  title: z.string().min(1).max(80),
  tooltip: z.string().min(1).max(160),
  expanded_help: z.string().max(280).default(''),
  suggested_action: z.string().min(1).max(160),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
});

export const ContextualHelpListSchema = z.array(ContextualHelpItemSchema).max(5);

export const FallbackSchema = z.object({
  reason: z.enum(['no_intent', 'intent_analysis_failed', 'grouping_failed', 'no_data']),
  message: z.string().min(1).max(200),
});

/**
 * Scoped shape the LLM is allowed to produce for the fixed adaptive-UI
 * prompt. Deliberately does NOT include capabilities/recommendedNodes/
 * setupGuide/missingItems — those are always the deterministically computed
 * values from existing services and are never overwritten by model output,
 * even if the model hallucinates them.
 */
export const AdaptiveUIGeneratedSliceSchema = z.object({
  contextualHelp: ContextualHelpListSchema.optional().default([]),
  fallback: FallbackSchema.nullable().optional().default(null),
});

export function parseContextualHelpResponse(raw: unknown): ContextualHelpItem[] | null {
  const result = ContextualHelpListSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function parseGeneratedSlice(
  raw: unknown,
): { contextualHelp: ContextualHelpItem[]; fallback: AdaptiveUIFallback | null } | null {
  const result = AdaptiveUIGeneratedSliceSchema.safeParse(raw);
  return result.success ? result.data : null;
}
