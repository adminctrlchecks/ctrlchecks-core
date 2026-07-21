-- Migration 0008: Onboarding state
-- Adds a single jsonb column to profiles for the Onboarding Agent —
-- goal, dismissed flag, completed/skipped step ids, and the last generated
-- path (so we don't re-call Gemini on every dashboard visit). No new table
-- needed; profiles already exists (see core/database/ensure-user.ts).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_state JSONB DEFAULT NULL;

-- ROLLBACK (run manually if needed)
-- ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_state;
