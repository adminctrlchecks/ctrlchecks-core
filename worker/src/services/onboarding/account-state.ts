import { getDbClient } from '../../core/database/aws-db-client';
import { logger } from '../../core/logger';
import type { AccountState } from './types';

export async function loadAccountState(userId: string): Promise<AccountState> {
  try {
    const db = getDbClient();
    const { count, error } = await db
      .from('workflows')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .limit(0);

    if (error) throw error;
    return { workflowCount: count ?? 0 };
  } catch (error) {
    logger.warn('[Onboarding] Failed to load account state (non-fatal):', error);
    return { workflowCount: 0 };
  }
}
