/**
 * Persistence for the Onboarding Agent's per-user state.
 *
 * Lives in profiles.onboarding_state (added by prisma/migrations/0008) —
 * no new table. Reads use the same getDbClient() builder the rest of the
 * codebase uses; writes use queryAsService for a jsonb shallow-merge
 * (`||`), which is correct here because every field in OnboardingState is a
 * top-level key the caller replaces wholesale (e.g. the frontend computes
 * the next completedStepIds array itself before patching).
 */

import { getDbClient } from '../../core/database/aws-db-client';
import { queryAsService } from '../../core/database/db-pool';
import { logger } from '../../core/logger';
import type { OnboardingState } from './types';

const DEFAULT_STATE: OnboardingState = {
  goal: null,
  dismissed: false,
  completedStepIds: [],
  skippedStepIds: [],
  lastGeneratedAt: null,
  lastPath: null,
};

function normalize(raw: unknown): OnboardingState {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_STATE };
  const value = raw as Partial<OnboardingState>;
  return {
    goal: typeof value.goal === 'string' ? value.goal : null,
    dismissed: Boolean(value.dismissed),
    completedStepIds: Array.isArray(value.completedStepIds) ? value.completedStepIds : [],
    skippedStepIds: Array.isArray(value.skippedStepIds) ? value.skippedStepIds : [],
    lastGeneratedAt: typeof value.lastGeneratedAt === 'string' ? value.lastGeneratedAt : null,
    lastPath: value.lastPath ?? null,
  };
}

export async function getOnboardingState(userId: string): Promise<OnboardingState> {
  try {
    const db = getDbClient();
    const { data } = await db.from('profiles').select('onboarding_state').eq('user_id', userId).maybeSingle();
    return normalize(data?.onboarding_state);
  } catch (error) {
    logger.warn('[Onboarding] Failed to load onboarding state (non-fatal):', error);
    return { ...DEFAULT_STATE };
  }
}

/** Postgres: undefined_table, undefined_column, undefined_object — the migration hasn't run yet. */
function isMissingSchemaError(err: any): boolean {
  return ['42P01', '42703', '42704'].includes(err?.code);
}

export async function patchOnboardingState(
  userId: string,
  patch: Partial<OnboardingState>,
): Promise<OnboardingState> {
  try {
    const rows = await queryAsService<{ onboarding_state: unknown }>(
      `UPDATE profiles
       SET onboarding_state = COALESCE(onboarding_state, '{}'::jsonb) || $2::jsonb,
           updated_at = NOW()
       WHERE user_id = $1
       RETURNING onboarding_state`,
      [userId, JSON.stringify(patch)],
    );

    if (rows.length === 0) {
      logger.warn(`[Onboarding] patchOnboardingState found no profile row for user ${userId}`);
      return normalize(patch);
    }

    return normalize(rows[0].onboarding_state);
  } catch (error) {
    if (isMissingSchemaError(error)) {
      logger.warn('[Onboarding] profiles.onboarding_state column is missing — run prisma/migrations/0008_onboarding_state.sql. Degrading to in-memory state for this request.');
    } else {
      logger.warn('[Onboarding] Failed to persist onboarding state (non-fatal):', error);
    }
    return normalize(patch);
  }
}
