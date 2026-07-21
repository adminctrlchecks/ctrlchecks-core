/**
 * Onboarding Agent — Orchestrator
 *
 * Reuses the exact same intent-analysis/capability-grouping calls as
 * worker/src/services/adaptive-ui/adaptive-ui-engine.ts and
 * /api/capability-selection/analyze — does not re-implement them. Pure
 * function of its inputs; the API handler owns reading/writing persisted
 * onboarding state.
 */

import { randomUUID } from 'crypto';
import { buildNodeCatalogText } from '../ai/node-catalog-builder';
import { runIntentAnalysis } from '../ai/stages/capability-intent-analyzer';
import { runCapabilityGrouping } from '../ai/stages/capability-grouper-stage';
import type { CapabilityContainer } from '../ai/stages/capability-types';
import type { CapabilityContainerSummary } from '../adaptive-ui/types';
import { buildCandidateSteps } from './candidate-steps';
import { generateOnboardingPath } from './onboarding-generator';
import type { AccountState, OnboardingPathResponse, OnboardingState, OnboardingUserContext } from './types';

export interface RunOnboardingPathParams {
  goal: string | null;
  account: AccountState;
  state: OnboardingState;
  user: OnboardingUserContext;
}

async function resolveCapabilityContainers(
  goal: string,
  userId: string,
): Promise<CapabilityContainer[]> {
  const nodeCatalog = buildNodeCatalogText();
  const correlationId = randomUUID();

  const intentResult = await runIntentAnalysis(goal, nodeCatalog, correlationId);
  if (!intentResult.ok) return [];

  const groupingResult = await runCapabilityGrouping(intentResult.units, nodeCatalog, userId, correlationId);
  return groupingResult.ok ? groupingResult.containers : [];
}

export async function runOnboardingPathEngine(params: RunOnboardingPathParams): Promise<OnboardingPathResponse> {
  const goal = (params.goal || '').trim();

  if (!goal) {
    return {
      welcome_message: 'Welcome!',
      summary: '',
      steps: [],
      primary_cta: null,
      fallback_message: 'Tell us what you want to accomplish to get a personalized path.',
      needsGoal: true,
      generatedAt: new Date().toISOString(),
    };
  }

  const capabilityContainers = await resolveCapabilityContainers(goal, params.user.userId);
  const candidateSteps = buildCandidateSteps(capabilityContainers, params.account);

  const capabilitiesSummary: CapabilityContainerSummary[] = capabilityContainers.map((container) => ({
    containerId: container.containerId,
    label: container.label,
    candidateLabels: container.candidates.map((candidate) => candidate.label),
  }));

  const generated = await generateOnboardingPath({
    goal,
    candidateSteps,
    capabilities: capabilitiesSummary,
    account: params.account,
    state: params.state,
    role: params.user.role,
    subscriptionPlan: params.user.subscriptionPlan,
  });

  return {
    ...generated,
    needsGoal: false,
    generatedAt: new Date().toISOString(),
  };
}
