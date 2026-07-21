/**
 * Pure-function coverage for the Onboarding Agent's deterministic and
 * safety-critical pieces: candidate-step building and route reconciliation
 * (the mechanism that guarantees a model-hallucinated route can never reach
 * the user). No Gemini calls here.
 *
 * Run:
 *   cd worker && npx jest src/services/onboarding/__tests__/onboarding-agent.test.ts --runInBand
 */

import { describe, it, expect } from '@jest/globals';
import { buildCandidateSteps } from '../candidate-steps';
import { reconcileSteps } from '../onboarding-generator';
import type { CapabilityContainer } from '../../ai/stages/capability-types';
import type { CandidateStep, OnboardingStep } from '../types';

function makeContainer(overrides: Partial<CapabilityContainer> = {}): CapabilityContainer {
  return {
    containerId: 'container-1',
    label: 'Send a message',
    useCaseUnit: {
      unitId: 'unit-1',
      label: 'Notify the team',
      semanticRole: 'communication',
      description: 'Send a Slack message',
      orderIndex: 0,
    },
    candidates: [
      { nodeType: 'slack_message', label: 'Slack Message', description: '', credentialRequirements: ['slack'], hasCredentials: false },
    ],
    ...overrides,
  };
}

describe('buildCandidateSteps', () => {
  it('suggests connecting a credential the user is missing', () => {
    const steps = buildCandidateSteps([makeContainer()], { workflowCount: 0 });
    expect(steps.some((step) => step.candidateStepId === 'connect:slack_message')).toBe(true);
  });

  it('does not suggest connecting a credential the user already has', () => {
    const container = makeContainer({
      candidates: [
        { nodeType: 'slack_message', label: 'Slack Message', description: '', credentialRequirements: [], hasCredentials: true },
      ],
    });
    const steps = buildCandidateSteps([container], { workflowCount: 0 });
    expect(steps.some((step) => step.candidateStepId.startsWith('connect:'))).toBe(false);
  });

  it('suggests building a first workflow when the account has none', () => {
    const steps = buildCandidateSteps([], { workflowCount: 0 });
    expect(steps.some((step) => step.candidateStepId === 'create_first_workflow')).toBe(true);
    expect(steps.some((step) => step.candidateStepId === 'view_workflows')).toBe(false);
  });

  it('suggests checking on the existing workflow once one exists', () => {
    const steps = buildCandidateSteps([], { workflowCount: 1 });
    expect(steps.some((step) => step.candidateStepId === 'view_workflows')).toBe(true);
    expect(steps.some((step) => step.candidateStepId === 'create_first_workflow')).toBe(false);
  });

  it('every candidate step points at a route that is a plain, non-empty path', () => {
    const steps = buildCandidateSteps([makeContainer()], { workflowCount: 0 });
    for (const step of steps) {
      expect(step.actionTarget.startsWith('/')).toBe(true);
    }
  });
});

describe('reconcileSteps — route hallucination guard', () => {
  const candidates: CandidateStep[] = [
    {
      candidateStepId: 'create_first_workflow',
      defaultTitle: 'Build your first workflow',
      actionLabel: 'Start building',
      actionTarget: '/workflow/ai',
      status: 'not_started',
      priority: 'high',
    },
  ];

  function makeModelStep(overrides: Partial<OnboardingStep> = {}): OnboardingStep {
    return {
      title: 'Build your first workflow',
      description: 'Get started fast',
      why_it_matters: 'This is the core action',
      action_label: 'Start building',
      action_target: '/workflow/ai',
      status: 'completed', // deliberately wrong — model should never control this
      priority: 'high',
      ...overrides,
    };
  }

  it('keeps a step whose action_target matches a real candidate', () => {
    const result = reconcileSteps([makeModelStep()], candidates);
    expect(result).toHaveLength(1);
    expect(result[0].action_target).toBe('/workflow/ai');
  });

  it('overwrites the model-claimed status with the server-computed one', () => {
    const result = reconcileSteps([makeModelStep({ status: 'completed' })], candidates);
    expect(result[0].status).toBe('not_started'); // the real, deterministic status
  });

  it('drops a step whose action_target does not match any real candidate (hallucinated route)', () => {
    const result = reconcileSteps([makeModelStep({ action_target: '/admin/delete-everything' })], candidates);
    expect(result).toHaveLength(0);
  });

  it('drops only the hallucinated step, keeping valid ones', () => {
    const result = reconcileSteps(
      [makeModelStep(), makeModelStep({ action_target: '/fake/route' })],
      candidates,
    );
    expect(result).toHaveLength(1);
    expect(result[0].action_target).toBe('/workflow/ai');
  });
});
