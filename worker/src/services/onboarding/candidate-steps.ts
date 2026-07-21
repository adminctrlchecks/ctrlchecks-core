/**
 * Deterministic candidate-step builder for the Onboarding Agent.
 *
 * Every candidate here points at a route that already exists in
 * ctrl_checks/src/App.tsx, and credential-readiness comes straight from the
 * `hasCredentials` flag the capability grouper already computed via the
 * credential vault — nothing here re-checks credentials or invents a route.
 * The LLM only ever selects/orders/phrases from this list (see schema.ts).
 */

import type { CapabilityContainer } from '../ai/stages/capability-types';
import type { AccountState, CandidateStep } from './types';

const MAX_CANDIDATES = 8;

export function buildCandidateSteps(containers: CapabilityContainer[], account: AccountState): CandidateStep[] {
  const steps: CandidateStep[] = [];
  const seenConnect = new Set<string>();

  containers.forEach((container, index) => {
    const needsCredential = container.candidates.find((candidate) => !candidate.hasCredentials);
    if (needsCredential && !seenConnect.has(needsCredential.nodeType)) {
      seenConnect.add(needsCredential.nodeType);
      steps.push({
        candidateStepId: `connect:${needsCredential.nodeType}`,
        defaultTitle: `Connect ${needsCredential.label}`,
        actionLabel: 'Connect',
        actionTarget: '/connections',
        status: 'not_started',
        priority: index < 2 ? 'high' : 'medium',
      });
    }
  });

  if (account.workflowCount === 0) {
    steps.push({
      candidateStepId: 'create_first_workflow',
      defaultTitle: 'Build your first workflow',
      actionLabel: 'Start building',
      actionTarget: '/workflow/ai',
      status: 'not_started',
      priority: 'high',
    });
    steps.push({
      candidateStepId: 'explore_templates',
      defaultTitle: 'Start from a template',
      actionLabel: 'Browse templates',
      actionTarget: '/templates',
      status: 'not_started',
      priority: 'medium',
    });
  } else {
    steps.push({
      candidateStepId: 'view_workflows',
      defaultTitle: 'Check on your workflow',
      actionLabel: 'View workflows',
      actionTarget: '/workflows',
      status: 'in_progress',
      priority: 'medium',
    });
    steps.push({
      candidateStepId: 'view_executions',
      defaultTitle: 'See it run',
      actionLabel: 'View runs',
      actionTarget: '/executions',
      status: 'not_started',
      priority: 'low',
    });
  }

  return steps.slice(0, MAX_CANDIDATES);
}
