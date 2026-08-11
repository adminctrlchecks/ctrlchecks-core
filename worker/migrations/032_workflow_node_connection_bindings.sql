-- Store explicit per-workflow-node connection choices.
-- Secrets stay in public.connections.encrypted_credentials; this table stores pointers only.

CREATE TABLE IF NOT EXISTS public.workflow_node_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  credential_type_id TEXT,
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'primary',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workflow_id, node_id, provider, role)
);

CREATE INDEX IF NOT EXISTS idx_workflow_node_connections_workflow
  ON public.workflow_node_connections(workflow_id, node_id);

CREATE INDEX IF NOT EXISTS idx_workflow_node_connections_user_provider
  ON public.workflow_node_connections(user_id, provider, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_node_connections_connection
  ON public.workflow_node_connections(connection_id);

COMMENT ON TABLE public.workflow_node_connections IS
  'Per-workflow-node binding to a saved connection row. Contains no secrets.';

COMMENT ON COLUMN public.workflow_node_connections.connection_id IS
  'Pointer to public.connections.id; the encrypted credentials remain only in public.connections.';
