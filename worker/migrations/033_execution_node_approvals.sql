-- ============================================
-- Per-Action Human Approval on Sensitive Workflow Steps
-- Tracks pending/approved/rejected approval decisions for individual
-- nodes flagged with an opt-in approvalGate in their config.
-- ============================================

CREATE TABLE IF NOT EXISTS public.execution_node_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL,
  workflow_id UUID NOT NULL,
  node_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  preview JSONB DEFAULT '{}'::jsonb,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolved_reason TEXT,
  UNIQUE (execution_id, node_id)
);

CREATE INDEX IF NOT EXISTS execution_node_approvals_user_status_idx ON public.execution_node_approvals(user_id, status);
CREATE INDEX IF NOT EXISTS execution_node_approvals_execution_idx ON public.execution_node_approvals(execution_id);

COMMENT ON TABLE public.execution_node_approvals IS 'Pending/approved/rejected human-approval checkpoints for individual sensitive nodes during workflow execution.';
