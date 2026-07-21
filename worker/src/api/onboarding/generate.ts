/**
 * POST /api/onboarding/generate
 *
 * Body: { goal?: string }
 * Generates (or regenerates) the personalized onboarding path and persists
 * it to profiles.onboarding_state so the next dashboard load doesn't need
 * another Gemini call.
 */

import { Response } from 'express';
import { runOnboardingPathEngine } from '../../services/onboarding/onboarding-path-engine';
import { loadAccountState } from '../../services/onboarding/account-state';
import { getOnboardingState, patchOnboardingState } from '../../services/onboarding/onboarding-state-repository';
import type { AuthenticatedRequest } from '../../core/middleware/subscription-auth';
import { logger } from '../../core/logger';

const MAX_GOAL_LENGTH = 200;

export default async function generateOnboardingPathHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const goalInput = typeof body.goal === 'string' ? body.goal.trim().slice(0, MAX_GOAL_LENGTH) : undefined;

  try {
    const [state, account] = await Promise.all([
      getOnboardingState(req.user.id),
      loadAccountState(req.user.id),
    ]);

    const goal = goalInput || state.goal;

    const result = await runOnboardingPathEngine({
      goal,
      account,
      state,
      user: {
        userId: req.user.id,
        role: req.user.role || 'user',
        subscriptionPlan: req.user.subscriptionPlan || 'Free',
      },
    });

    const nextState = await patchOnboardingState(req.user.id, {
      goal: goal || null,
      lastPath: result.needsGoal ? state.lastPath : result,
      lastGeneratedAt: result.needsGoal ? state.lastGeneratedAt : result.generatedAt,
      dismissed: false, // a fresh generate always makes the path visible again
    });

    res.json({ ...result, dismissed: nextState.dismissed, completedStepIds: nextState.completedStepIds, skippedStepIds: nextState.skippedStepIds });
  } catch (error) {
    logger.error('[Onboarding] generate failed:', error);
    res.status(500).json({
      welcome_message: 'Welcome!',
      summary: '',
      steps: [],
      primary_cta: null,
      fallback_message: 'Something went wrong building your path. Try again in a moment.',
      needsGoal: false,
      generatedAt: new Date().toISOString(),
      dismissed: false,
      completedStepIds: [],
      skippedStepIds: [],
    });
  }
}
