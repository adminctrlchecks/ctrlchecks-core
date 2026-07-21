/**
 * Onboarding Agent — Shared Type Contracts
 *
 * Extends the Adaptive UI Engine (worker/src/services/adaptive-ui/) rather
 * than duplicating it: reuses buildNodeCatalogText/runIntentAnalysis/
 * runCapabilityGrouping for goal -> capability matching, and the same
 * Zod-scoped-LLM pattern from adaptive-ui/help-generator.ts — the model is
 * only ever allowed to phrase/prioritize/select from a deterministic
 * candidate-step list built from real routes and real credential state,
 * never to invent an action_target itself.
 */

export type OnboardingStepStatus = 'not_started' | 'in_progress' | 'completed';
export type OnboardingStepPriority = 'high' | 'medium' | 'low';

/** A real, deterministically-computed step the model may select/phrase — never invented. */
export interface CandidateStep {
  candidateStepId: string;
  defaultTitle: string;
  actionLabel: string;
  actionTarget: string; // a real, existing route/feature
  status: OnboardingStepStatus;
  priority: OnboardingStepPriority;
}

export interface OnboardingStep {
  title: string;
  description: string;
  why_it_matters: string;
  action_label: string;
  action_target: string;
  status: OnboardingStepStatus;
  priority: OnboardingStepPriority;
}

export interface OnboardingPrimaryCta {
  label: string;
  action: string;
}

export interface OnboardingPathResponse {
  welcome_message: string;
  summary: string;
  steps: OnboardingStep[];
  primary_cta: OnboardingPrimaryCta | null;
  fallback_message: string | null;
  needsGoal: boolean;
  generatedAt: string;
}

export interface OnboardingState {
  goal: string | null;
  dismissed: boolean;
  completedStepIds: string[];
  skippedStepIds: string[];
  lastGeneratedAt: string | null;
  lastPath: OnboardingPathResponse | null;
}

export interface AccountState {
  workflowCount: number;
}

export interface OnboardingUserContext {
  userId: string;
  role: string;
  subscriptionPlan: string;
}
