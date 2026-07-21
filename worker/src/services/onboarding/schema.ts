import { z } from 'zod';

/**
 * Scoped shape the LLM is allowed to produce for the fixed onboarding
 * prompt — matches the exact requested JSON contract (title, description,
 * why_it_matters, action_label, action_target, status, priority).
 *
 * This validates SHAPE only. Enforcing "never invent a route" happens
 * afterward in onboarding-path-engine.ts, which drops any step whose
 * action_target doesn't exactly match one of the deterministic candidate
 * steps we handed the model, and overwrites status/priority with the
 * server-computed values rather than trusting the model's guess — so a
 * hallucinated route or a wrong "completed" claim can never reach the user.
 */
export const OnboardingStepSchema = z.object({
  title: z.string().min(1).max(60),
  description: z.string().min(1).max(160),
  why_it_matters: z.string().max(160).default(''),
  action_label: z.string().min(1).max(40),
  action_target: z.string().min(1),
  status: z.enum(['not_started', 'in_progress', 'completed']).default('not_started'),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
});

export const OnboardingPrimaryCtaSchema = z.object({
  label: z.string().min(1).max(40),
  action: z.string().min(1),
});

export const OnboardingGeneratedSliceSchema = z.object({
  welcome_message: z.string().min(1).max(120),
  summary: z.string().min(1).max(200),
  steps: z.array(OnboardingStepSchema).min(1).max(5),
  primary_cta: OnboardingPrimaryCtaSchema.nullable().optional().default(null),
  fallback_message: z.string().max(200).nullable().optional().default(null),
});

export type OnboardingGeneratedSlice = z.infer<typeof OnboardingGeneratedSliceSchema>;

export function parseOnboardingSlice(raw: unknown): OnboardingGeneratedSlice | null {
  const result = OnboardingGeneratedSliceSchema.safeParse(raw);
  return result.success ? result.data : null;
}
