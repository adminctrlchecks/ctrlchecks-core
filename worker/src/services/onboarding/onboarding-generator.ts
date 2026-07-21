/**
 * Onboarding Agent — LLM call using the exact fixed runtime prompt.
 *
 * The model only ever phrases/prioritizes/selects steps; it never controls
 * which routes exist. After parsing, every returned step is checked against
 * the deterministic candidate list (candidate-steps.ts) by exact
 * action_target match — anything that doesn't match a real candidate is
 * dropped, and status is always overwritten with the server-computed value.
 * This is the same enforcement pattern as adaptive-ui/help-generator.ts.
 */

import { geminiOrchestrator } from '../ai/gemini-orchestrator';
import { logger } from '../../core/logger';
import { parseOnboardingSlice } from './schema';
import type { CapabilityContainerSummary } from '../adaptive-ui/types';
import type { AccountState, CandidateStep, OnboardingPathResponse, OnboardingState, OnboardingStep } from './types';

const FIXED_PROMPT = `You are an onboarding agent inside a digital product.
Create a personalized path that gets the user to their first meaningful outcome as fast as possible.
Use only the provided context, features, routes, and user state.
Do not invent features, pages, integrations, pricing, claims, or actions.
Return only valid JSON.

Context: {{AUTO_CONTEXT}}
User goal: {{USER_GOAL}}
Available capabilities: {{AVAILABLE_PRODUCT_CAPABILITIES}}
Current user state: {{CURRENT_USER_STATE}}

Return this JSON:
{
  "welcome_message": "Short personalized welcome",
  "summary": "One sentence explaining the path",
  "steps": [
    {
      "title": "Step title",
      "description": "Short explanation",
      "why_it_matters": "Why this helps",
      "action_label": "Button label",
      "action_target": "Existing route, feature, section, or action",
      "status": "not_started | in_progress | completed",
      "priority": "high | medium | low"
    }
  ],
  "primary_cta": { "label": "CTA label", "action": "CTA action" },
  "fallback_message": "Message if there is not enough context"
}

Rules:
- 3 to 5 steps maximum. Prioritize the fastest path to value.
- Plain language. Do not mention AI. Do not sound like documentation.
- Only recommend features that exist.
- If context is limited, build a useful default path from existing routes and features.
- Every step's action_target MUST be copied exactly from one of the candidateSteps in Context — never write a new one.`;

function buildPrompt(params: {
  candidateSteps: CandidateStep[];
  goal: string;
  capabilities: CapabilityContainerSummary[];
  account: AccountState;
  state: OnboardingState;
  role: string;
  subscriptionPlan: string;
}): string {
  const autoContext = JSON.stringify({
    candidateSteps: params.candidateSteps,
    account: params.account,
    user: { role: params.role, subscriptionPlan: params.subscriptionPlan },
  });
  const currentUserState = JSON.stringify({
    completedStepIds: params.state.completedStepIds,
    skippedStepIds: params.state.skippedStepIds,
    hasGeneratedBefore: Boolean(params.state.lastGeneratedAt),
  });

  return FIXED_PROMPT.replace('{{AUTO_CONTEXT}}', autoContext)
    .replace('{{USER_GOAL}}', params.goal)
    .replace('{{AVAILABLE_PRODUCT_CAPABILITIES}}', JSON.stringify(params.capabilities))
    .replace('{{CURRENT_USER_STATE}}', currentUserState);
}

export function reconcileSteps(rawSteps: OnboardingStep[], candidateSteps: CandidateStep[]): OnboardingStep[] {
  const byTarget = new Map(candidateSteps.map((candidate) => [candidate.actionTarget, candidate]));

  return rawSteps
    .map((step) => {
      const candidate = byTarget.get(step.action_target);
      if (!candidate) return null; // hallucinated route — drop, never expose
      return {
        ...step,
        action_target: candidate.actionTarget,
        status: candidate.status, // server-computed fact, never trust the model's guess
      };
    })
    .filter((step): step is OnboardingStep => step !== null);
}

function deterministicPath(candidateSteps: CandidateStep[]): Pick<OnboardingPathResponse, 'welcome_message' | 'summary' | 'steps' | 'primary_cta' | 'fallback_message'> {
  const top = candidateSteps.slice(0, 4);
  return {
    welcome_message: "Let's get you to your first result.",
    summary: 'A quick path based on what you have connected and built so far.',
    steps: top.map((candidate) => ({
      title: candidate.defaultTitle,
      description: `Recommended next step.`,
      why_it_matters: 'This keeps you moving toward a working automation.',
      action_label: candidate.actionLabel,
      action_target: candidate.actionTarget,
      status: candidate.status,
      priority: candidate.priority,
    })),
    primary_cta: top[0] ? { label: top[0].actionLabel, action: top[0].actionTarget } : null,
    fallback_message: null,
  };
}

export interface GenerateOnboardingPathParams {
  goal: string;
  candidateSteps: CandidateStep[];
  capabilities: CapabilityContainerSummary[];
  account: AccountState;
  state: OnboardingState;
  role: string;
  subscriptionPlan: string;
}

export async function generateOnboardingPath(
  params: GenerateOnboardingPathParams,
): Promise<Pick<OnboardingPathResponse, 'welcome_message' | 'summary' | 'steps' | 'primary_cta' | 'fallback_message'>> {
  if (params.candidateSteps.length === 0) {
    return {
      welcome_message: 'Welcome!',
      summary: 'Not enough is set up yet to build a path.',
      steps: [],
      primary_cta: null,
      fallback_message: 'Connect an account or describe what you want to automate to get a personalized path.',
    };
  }

  try {
    const prompt = buildPrompt(params);
    const raw = await geminiOrchestrator.processRequest(
      'text-completion',
      { prompt },
      { temperature: 0.4, max_tokens: 500, cache: false, structuredOutput: { mimeType: 'application/json' } },
    );

    const text = typeof raw === 'string' ? raw : raw?.text || raw?.content || JSON.stringify(raw);
    const jsonMatch = typeof text === 'string' ? text.match(/\{[\s\S]*\}/) : null;
    if (!jsonMatch) throw new Error('No JSON object in model response');

    const candidate = JSON.parse(jsonMatch[0]);
    const parsed = parseOnboardingSlice(candidate);
    if (!parsed) throw new Error('Model response failed schema validation');

    const reconciledSteps = reconcileSteps(parsed.steps as OnboardingStep[], params.candidateSteps);
    if (reconciledSteps.length === 0) throw new Error('No valid steps survived route reconciliation');

    const primaryCandidate = parsed.primary_cta
      ? params.candidateSteps.find((c) => c.actionTarget === parsed.primary_cta?.action)
      : undefined;

    return {
      welcome_message: parsed.welcome_message,
      summary: parsed.summary,
      steps: reconciledSteps,
      primary_cta: primaryCandidate
        ? { label: parsed.primary_cta!.label, action: primaryCandidate.actionTarget }
        : reconciledSteps[0]
          ? { label: reconciledSteps[0].action_label, action: reconciledSteps[0].action_target }
          : null,
      fallback_message: parsed.fallback_message ?? null,
    };
  } catch (error) {
    logger.warn('[Onboarding] Path generation failed, using deterministic fallback:', error);
    return deterministicPath(params.candidateSteps);
  }
}
