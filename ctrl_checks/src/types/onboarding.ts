/**
 * Frontend-facing type contracts for the Onboarding Agent.
 * Mirrors worker/src/services/onboarding/types.ts (see types/adaptive-ui.ts
 * and types/capability-selection.ts for the established mirroring pattern).
 */

export type OnboardingStepStatus = 'not_started' | 'in_progress' | 'completed';
export type OnboardingStepPriority = 'high' | 'medium' | 'low';

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
  dismissed: boolean;
  completedStepIds: string[];
  skippedStepIds: string[];
}

export interface OnboardingState {
  goal: string | null;
  dismissed: boolean;
  completedStepIds: string[];
  skippedStepIds: string[];
  lastGeneratedAt: string | null;
  lastPath: OnboardingPathResponse | null;
}

export interface OnboardingStatePatch {
  goal?: string | null;
  dismissed?: boolean;
  completedStepIds?: string[];
  skippedStepIds?: string[];
}
