import { z } from 'zod';

/**
 * Scoped shape the LLM is allowed to produce for the fixed search prompt —
 * matches the exact requested JSON contract. Shape only; "never invent a
 * url" is enforced afterward in search-generator.ts, which drops any
 * result/suggested_action whose url/target doesn't exactly match one of the
 * deterministic candidates we handed the model.
 */
const RESULT_TYPE = z.enum(['page', 'feature', 'product', 'article', 'template', 'setting', 'action', 'other']);

export const SearchResultItemSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(200),
  type: RESULT_TYPE,
  url: z.string().min(1),
  reason: z.string().min(1).max(160),
  action_label: z.string().min(1).max(40),
});

export const SearchSuggestedActionSchema = z.object({
  label: z.string().min(1).max(40),
  target: z.string().min(1),
});

export const SearchResponseSchema = z.object({
  interpreted_intent: z.string().min(1).max(160),
  answer: z.string().min(1).max(300),
  results: z.array(SearchResultItemSchema).max(8).default([]),
  suggested_actions: z.array(SearchSuggestedActionSchema).max(5).default([]),
  related_searches: z.array(z.string().min(1).max(80)).max(3).default([]),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
});

export type ParsedSearchResponse = z.infer<typeof SearchResponseSchema>;

export function parseSearchResponse(raw: unknown): ParsedSearchResponse | null {
  const result = SearchResponseSchema.safeParse(raw);
  return result.success ? result.data : null;
}
