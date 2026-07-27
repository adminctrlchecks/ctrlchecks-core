-- ============================================
-- System Settings
-- Generic key/value store for system-wide runtime flags that an admin can
-- flip without a redeploy. First consumer: 'unlimited_mode', which bypasses
-- all subscription/plan enforcement for every user (demo / free-access mode).
-- ============================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Seed the unlimited-mode flag in the OFF position so existing plan
-- enforcement keeps behaving exactly as it does today.
INSERT INTO public.system_settings (key, value)
VALUES ('unlimited_mode', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;
