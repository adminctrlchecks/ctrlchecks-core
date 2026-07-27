import { queryAsService } from '../core/database/db-pool';
import { logger } from '../core/logger';

/**
 * System-wide runtime settings backed by public.system_settings.
 *
 * The first (and currently only) setting is `unlimited_mode`: when enabled,
 * every subscription/plan limit in the system is bypassed for every user.
 * It exists so an admin can run demos or hand out temporary free access
 * without touching individual subscriptions.
 *
 * Reads are cached in-process for a few seconds because the flag is consulted
 * on nearly every gated request; the TTL is short enough that flipping the
 * toggle takes effect almost immediately.
 */

export const UNLIMITED_MODE_KEY = 'unlimited_mode';

const CACHE_TTL_MS = 5_000;

export interface UnlimitedModeSetting {
  enabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

interface CacheEntry {
  enabled: boolean;
  expiresAt: number;
}

let unlimitedModeCache: CacheEntry | null = null;

function invalidateUnlimitedModeCache(): void {
  unlimitedModeCache = null;
}

async function readUnlimitedModeRow(): Promise<UnlimitedModeSetting> {
  const rows = await queryAsService<{ value: any; updated_at: string | null; updated_by: string | null }>(
    `SELECT value, updated_at, updated_by
     FROM public.system_settings
     WHERE key = $1
     LIMIT 1`,
    [UNLIMITED_MODE_KEY]
  );

  const row = rows[0];
  if (!row) {
    return { enabled: false, updatedAt: null, updatedBy: null };
  }

  const value = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
  return {
    enabled: Boolean(value?.enabled),
    updatedAt: row.updated_at || null,
    updatedBy: row.updated_by || null,
  };
}

/**
 * Whether system-wide unlimited access is currently on.
 *
 * Fails closed (returns false) on any error so that a database hiccup can
 * never silently hand out unlimited access.
 */
export async function isUnlimitedModeEnabled(): Promise<boolean> {
  const now = Date.now();
  if (unlimitedModeCache && now < unlimitedModeCache.expiresAt) {
    return unlimitedModeCache.enabled;
  }

  try {
    const setting = await readUnlimitedModeRow();
    unlimitedModeCache = { enabled: setting.enabled, expiresAt: now + CACHE_TTL_MS };
    return setting.enabled;
  } catch (error: any) {
    logger.warn('[SystemSettings] isUnlimitedModeEnabled read failed, defaulting to disabled:', error?.message || error);
    return false;
  }
}

/**
 * Full unlimited-mode setting including audit metadata (admin UI read path).
 * Bypasses the cache so the admin always sees committed state.
 */
export async function getUnlimitedMode(): Promise<UnlimitedModeSetting> {
  const setting = await readUnlimitedModeRow();
  unlimitedModeCache = { enabled: setting.enabled, expiresAt: Date.now() + CACHE_TTL_MS };
  return setting;
}

/**
 * Flip system-wide unlimited access. Caller is responsible for admin auth
 * and for writing the admin_actions audit row.
 */
export async function setUnlimitedMode(enabled: boolean, adminUserId: string | null): Promise<UnlimitedModeSetting> {
  const rows = await queryAsService<{ value: any; updated_at: string | null; updated_by: string | null }>(
    `INSERT INTO public.system_settings (key, value, updated_at, updated_by)
     VALUES ($1, $2::jsonb, now(), $3)
     ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value,
           updated_at = now(),
           updated_by = EXCLUDED.updated_by
     RETURNING value, updated_at, updated_by`,
    [UNLIMITED_MODE_KEY, JSON.stringify({ enabled: Boolean(enabled) }), adminUserId]
  );

  invalidateUnlimitedModeCache();

  const row = rows[0];
  const value = row && typeof row.value === 'string' ? JSON.parse(row.value) : row?.value;
  return {
    enabled: Boolean(value?.enabled),
    updatedAt: row?.updated_at || null,
    updatedBy: row?.updated_by || null,
  };
}

/** Exposed for tests and for callers that mutate the row out-of-band. */
export function clearSystemSettingsCache(): void {
  invalidateUnlimitedModeCache();
}
