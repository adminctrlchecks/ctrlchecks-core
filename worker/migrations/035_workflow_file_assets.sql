-- ============================================
-- Workflow File Assets
-- Stores metadata for binary files created/read by workflow file nodes.
-- File bytes live in storage; the DB stores only lookup metadata.
-- ============================================

CREATE TABLE IF NOT EXISTS public.workflow_file_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  workflow_id UUID,
  execution_id UUID,
  node_id TEXT,

  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  checksum_sha256 TEXT NOT NULL,

  storage_provider TEXT NOT NULL DEFAULT 'local' CHECK (storage_provider IN ('local', 's3', 'gcs', 'supabase_storage')),
  storage_key TEXT NOT NULL,

  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workflow_file_assets_user_created_idx
  ON public.workflow_file_assets(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS workflow_file_assets_workflow_created_idx
  ON public.workflow_file_assets(workflow_id, created_at DESC);

CREATE INDEX IF NOT EXISTS workflow_file_assets_execution_idx
  ON public.workflow_file_assets(execution_id);

CREATE INDEX IF NOT EXISTS workflow_file_assets_storage_key_idx
  ON public.workflow_file_assets(storage_provider, storage_key);

COMMENT ON TABLE public.workflow_file_assets IS 'Private workflow file metadata. File bytes are stored outside DB and addressed by storage_key.';
COMMENT ON COLUMN public.workflow_file_assets.storage_key IS 'Path/key inside the configured binary file storage provider.';

ALTER TABLE public.workflow_file_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own workflow file assets" ON public.workflow_file_assets;
DROP POLICY IF EXISTS "Users can insert own workflow file assets" ON public.workflow_file_assets;
DROP POLICY IF EXISTS "Users can update own workflow file assets" ON public.workflow_file_assets;
DROP POLICY IF EXISTS "Users can delete own workflow file assets" ON public.workflow_file_assets;
DROP POLICY IF EXISTS "Service role can manage workflow file assets" ON public.workflow_file_assets;

CREATE POLICY "Users can view own workflow file assets" ON public.workflow_file_assets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workflow file assets" ON public.workflow_file_assets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workflow file assets" ON public.workflow_file_assets
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workflow file assets" ON public.workflow_file_assets
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage workflow file assets" ON public.workflow_file_assets
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_workflow_file_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_workflow_file_assets_updated_at ON public.workflow_file_assets;
CREATE TRIGGER update_workflow_file_assets_updated_at
  BEFORE UPDATE ON public.workflow_file_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_workflow_file_assets_updated_at();
