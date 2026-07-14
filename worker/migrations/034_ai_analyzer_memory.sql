-- ============================================
-- AI Editor Analyzer: persisted, workflow-scoped conversation memory
-- One durable session per (workflow_id, user_id). Messages optionally
-- reference the execution/node they discussed so the UI can render
-- "referenced run" chips and the analyzer can resume with context.
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_analyzer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.ai_analyzer_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.ai_analyzer_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  message_kind TEXT NOT NULL DEFAULT 'chat',
  referenced_execution_id UUID,
  referenced_node_id TEXT,
  runtime_context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_analyzer_sessions_workflow_user_idx
  ON public.ai_analyzer_sessions(workflow_id, user_id);

CREATE INDEX IF NOT EXISTS ai_analyzer_messages_session_created_idx
  ON public.ai_analyzer_messages(session_id, created_at);

CREATE INDEX IF NOT EXISTS ai_analyzer_messages_execution_idx
  ON public.ai_analyzer_messages(referenced_execution_id);

COMMENT ON TABLE public.ai_analyzer_sessions IS 'One durable AI Editor analyzer chat session per (workflow_id, user_id).';
COMMENT ON TABLE public.ai_analyzer_messages IS 'Persisted AI Editor analyzer chat turns, optionally scoped to a specific execution/node.';
