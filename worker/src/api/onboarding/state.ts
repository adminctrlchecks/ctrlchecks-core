/**
 * GET  /api/onboarding/state  — read persisted onboarding state (no Gemini call, cheap).
 * PATCH /api/onboarding/state — complete/skip/dismiss/reset, persisted server-side.
 */

import { Response } from 'express';
import { getOnboardingState, patchOnboardingState } from '../../services/onboarding/onboarding-state-repository';
import type { AuthenticatedRequest } from '../../core/middleware/subscription-auth';
import { logger } from '../../core/logger';

export async function getOnboardingStateHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    return;
  }

  try {
    const state = await getOnboardingState(req.user.id);
    res.json(state);
  } catch (error) {
    logger.error('[Onboarding] get state failed:', error);
    res.status(500).json({ error: 'Failed to load onboarding state' });
  }
}

const PATCHABLE_KEYS = ['dismissed', 'completedStepIds', 'skippedStepIds', 'goal'] as const;

export async function patchOnboardingStateHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const key of PATCHABLE_KEYS) {
    if (key in body) patch[key] = body[key];
  }

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }

  try {
    const state = await patchOnboardingState(req.user.id, patch);
    res.json(state);
  } catch (error) {
    logger.error('[Onboarding] patch state failed:', error);
    res.status(500).json({ error: 'Failed to update onboarding state' });
  }
}
