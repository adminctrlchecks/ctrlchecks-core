# AI Editor: Execution-Aware Analyzer + Runtime Intelligence Plan

Status: **analysis/design only - no application source code changed.**

This document was re-verified against the current repo on 2026-07-14. It maps the
existing AI Editor, corrects stale claims from the earlier draft, answers the open
questions from code, and proposes a flagship execution-aware analyzer for the
`Properties` / `AI Editor` panel.

The target is not "chat over a JSON blob." The target is a workflow-runtime copilot:
it can inspect real executions, explain what data actually moved through the graph,
compare runs against historical baselines, find root-cause chains, and close the loop by
turning recurring failures into concrete AI Editor operations.

---

## 1. Product Goal

Today's AI Editor panel has two tabs, **Analyze** and **Suggest edits**. Both are
currently static-workflow tools: they receive the current nodes/edges/config from the
browser and reason over graph shape plus registry schemas. They do not automatically
read past runs.

Target capability:

1. **Execution-aware analysis.** For a workflow, the analyzer can list prior
   executions and inspect a selected run's node sequence, inputs, resolved runtime
   fields, outputs, errors, retries, approvals, and overall result.
2. **Plain-English data narration.** It explains what the output data means in the
   user's domain, not just "field X is a string."
3. **Workflow-scoped conversation memory.** The panel resumes a persisted conversation
   for this workflow/user and can remember which execution/node was discussed.
4. **History-informed edit suggestions.** "Suggest edits" still returns whitelisted
   graph operations, but the prompt includes recurring failures, regressions, latency
   spikes, empty-output patterns, and concrete node-level evidence.
5. **Differentiating runtime intelligence.** The feature should proactively surface
   anomalies and root causes, compare a run with baselines, and propose remediations
   such as `insert_safety_node` or `update_node_config` when patterns justify it.

---

## 2. Current State - Verified Findings

### 2.1 Frontend: `ctrl_checks/src/components/workflow/PropertiesPanel.tsx`

This is the live AI Editor implementation in the node/canvas properties panel.

Verified facts:

- The panel uses a `Properties` / `AI Editor` `ToggleGroup` in the live properties UI.
- AI Editor state is local React state:
  `aiMessages`, `aiInput`, `aiChatMode`, `pendingAiOperations`, `pendingAiDiff`,
  `pendingAiPrompt`, `pendingPreviewValid`.
- `aiMessages` starts with a welcome assistant bubble and is **not persisted** to
  localStorage or backend storage.
- Every send builds `conversationHistory` from the last 24 local turns, truncating each
  turn to roughly 14k chars, and sends that history to the backend. The backend does not
  store this transcript.
- `Analyze` posts to `/api/ai/editor/analyze` and appends only `result.message`.
- `Suggest edits` posts to `/api/ai/editor/suggest`, stores returned `operations` and
  `diff` in pending state, and shows a pending changes card. Applying calls
  `/api/ai/editor/apply`.
- Access is gated through `/api/ai/editor/capabilities` plus client-side hints from
  `ctrl_checks/src/lib/aiEditorPermissions.ts`.
- No execution list, execution detail, or run-history API is called from this component.

Dead/unused adjacent code:

- `ctrl_checks/src/components/workflow/AIAssistant.tsx` is present but unimported in the
  current source search. It directly queries the `executions` table for the last 3
  failed runs and calls `/api/generate-workflow` in edit mode. Do not build the new
  feature on this component; it is stale, parallel AI-editor UX.

Stale claim corrected:

- The earlier draft said `Chatbot.tsx` / `useChatbot.ts` had real server-side session
  persistence and could be used as a persisted-chat template. That is **not true for
  the visible marketing chatbot path**. `useChatbot.ts` creates a new random session ID
  for each call, and `ChichuChatbot` stores history in an in-process `Map`.

### 2.2 Backend: AI Editor routes in `worker/src/api/ai-gateway.ts`

All routes are mounted under `/api/ai`. Relevant AI Editor routes:

| Route | Current behavior |
|---|---|
| `GET /editor/capabilities` | Resolves the AI Editor principal and returns capability/lifecycle info. |
| `GET /editor/audit/:workflowId` | Returns AI Editor audit events, not chat memory. |
| `POST /editor/suggest` | Calls `aiWorkflowEditor.suggestWorkflowEdits(workflow, prompt, { focusedNodeId, conversationHistory })`, dry-runs operations, returns message, operations, diff, and preview validity. It does not read executions. |
| `POST /editor/apply` | Applies whitelisted operations, validates the DAG, versions/audits the change. It does not read executions. |
| `POST /editor/analyze` | Builds registry context, validates the submitted workflow, builds a static summary context, appends client-provided conversation history, and calls `geminiOrchestrator.processRequest('chat-generation', ...)`. It performs **no DB read** and is execution-blind. |
| `POST /editor/suggest-improvements`, `/editor/replace-node`, `/editor/registry-context`, `/editor/code-assist` | Helper endpoints, also execution-blind. |

Operation vocabulary is already constrained in both frontend and backend contracts:

- `add_node`
- `remove_node`
- `replace_node`
- `update_node_config`
- `insert_safety_node`
- `refactor_linearize`

Any automated fix proposal from runtime analysis must compile into this vocabulary.
The LLM must not emit raw edges.

### 2.3 LLM facade: `worker/src/services/ai/gemini-orchestrator.ts`

`geminiOrchestrator.processRequest(...)` already supports request types such as
`workflow-analysis` and `summarization`, plus `structuredOutput` options. The current AI
Editor uses `chat-generation`; the new analyzer should use structured `workflow-analysis`
or `summarization` calls for deterministic runtime reports.

### 2.4 Execution storage: current live tables and writers

There are multiple execution-related schemas in the repo. The analyzer should treat the
raw SQL/live execution tables as authoritative for real runs.

Live execution tables from worker migrations:

- `executions`
  - Core run record: `id`, `workflow_id`, `status`, `current_node`, `metadata`,
    `started_at`, `finished_at`/`completed_at`, `updated_at`, `error`, `logs`,
    `duration_ms`, `last_heartbeat`, and environment-dependent extra columns such as
    `input`, `output`, `result_data`.
- `execution_steps`
  - Per-node run records: `execution_id`, `node_id`, `node_type`, `node_name`,
    `status`, `input_json`, `output_json`, `error`, `sequence`, `started_at`,
    `completed_at`, `input_refs`, `output_refs`, `result_data`, retry/checkpoint fields,
    `state_snapshot`, and `checkpoint_data`.
- `workflow_execution_events`
  - Runtime timeline/audit table written by `execution-event-logger.ts`.
- `workflow_execution_logs`
  - A structured log table created by migration 007 and also duplicated in the
    credentials migration. It is not the main runtime event writer used by
    `logExecutionEvent`.
- `execution_artifacts`
  - A table intended to track large files/results, but current code search found no
    writer inserting rows into this table.
- `workflow_definitions`
  - A distributed-engine definition table with `definition JSONB`. It is not enough by
    itself to reconstruct the exact app workflow for the background path, which refetches
    from `workflows`.
- `execution_node_approvals`
  - Per-node human approval checkpoints.

Legacy/optional execution memory:

- Prisma models map to `memory_executions`, `memory_node_executions`, and
  `memory_references`.
- `execute-workflow.ts` writes this archive only when `ENABLE_MEMORY_ARCHIVE === 'true'`.
  Do not rely on these tables for the analyzer's primary execution history.

Writers/readers verified:

- `worker/src/api/distributed-execute-workflow.ts`
  - Creates an execution through the distributed orchestrator, then currently starts the
    proven synchronous `execute-workflow.ts` path in the background.
  - Exposes `GET /api/execution-status/:executionId` through `getExecutionStatus`.
- `worker/src/api/execute-workflow.ts`
  - Builds `nodeInput` from upstream outputs using `buildNodeInput(...)`.
  - Upserts a running `execution_steps` row before node execution.
  - Upserts the final `execution_steps` row after node execution.
  - Writes execution logs to the `executions.logs` JSON field.
  - Writes timeline events to `workflow_execution_events`.
- `worker/src/services/workflow-executor/persistent-layer.ts`
  - `checkpointNodeExecution(...)` upserts `execution_steps.input_json` and
    `execution_steps.output_json`.
  - `updateExecutionStatus(...)` updates the `executions` row.
- `worker/src/services/workflow-executor/central-execution-state.ts`
  - Stores large outputs in object storage when configured and writes the reference to
    `output_json` via `PersistentLayer`.
- `worker/src/services/workflow-executor/distributed/storage-manager.ts`
  - Routes distributed input/output values to inline refs or object-storage refs in
    `input_refs`/`output_refs`.

Current single-execution reader:

- `getExecutionStatus()` joins one `executions` row with ordered `execution_steps` and
  returns `steps` plus progress counts. In lite mode it still includes `input_json` and
  `output_json`.

Missing reader:

- There is no AI Editor endpoint that lists executions for a workflow, and no analyzer
  service that normalizes a run into an LLM-safe runtime view.

### 2.5 Chat/session persistence tables

Stale claim corrected:

- It is wrong to say no chat/session persistence table exists anywhere in the repo.

Tables do exist in frontend Supabase migrations:

- `ctrl_checks/supabase/migrations/20250118000000_add_agent_memory_tables.sql`
- `ctrl_checks/sql_migrations/02_agent_memory_tables.sql`

These create:

- `memory_sessions(workflow_id, session_id, user_id, created_at, updated_at)`
- `memory_messages(session_id, workflow_id, role, content, metadata, embedding, created_at)`

`worker/src/shared/memory.ts` uses these tables via `HybridMemoryService` for chatbot/agent
workflow memory, with Redis as an optional short-term layer.

Why this still does not solve AI Editor memory as-is:

- No AI Editor route uses `HybridMemoryService`.
- The existing memory tables are for workflow chatbots/agents, not editor-side analysis.
- They lack first-class columns for `referenced_execution_id`, `referenced_node_id`,
  `analysis_artifact_id`, `message_kind`, or AI Editor audit/version links.

Recommendation:

- Either create dedicated `ai_analyzer_sessions` / `ai_analyzer_messages` tables for
  clear product boundaries, or intentionally reuse `memory_sessions` / `memory_messages`
  with `metadata` carrying analyzer-specific refs. For a flagship feature, dedicated
  tables are cleaner and easier to govern.

### 2.6 Node registry field descriptions

The registry often has useful output descriptions, but there is a caveat:

- Flat `outputSchema` definitions preserve `{ type, description }`.
- `NodeOutputSchema` definitions with `structure.fields` are currently flattened as
  `{ type }`, which drops richer field metadata if it exists outside that shape.

Before relying on field-level narration at scale, preserve descriptions consistently in
`extractProperties()` or in a new analyzer-side schema normalizer.

---

## 3. Answers to the Previous Open Questions

### 3.1 Does `execution_steps.input_json` contain fully resolved node config?

**No.**

Verified from code:

- `execute-workflow.ts` sets `nodeInput = buildNodeInput(node, edges, nodeOutputs, input)`.
- `buildNodeInput(...)` returns upstream output data, merged upstream data, or the default
  workflow input.
- `execution_steps.input_json` is written from `nodeInput`.

So `input_json` is the runtime payload entering the node, not the full resolved node
configuration.

What exists today:

- `execution_steps.state_snapshot.config` is written during the post-node upsert with
  `node.data?.config || {}`. This is the raw node config snapshot, not guaranteed to be
  fully template-substituted.
- `dynamic-node-executor.ts` computes `resolvedInputs` after template resolution,
  deterministic fallbacks, runtime AI filling, aliases, and runtime contracts.
- Those sanitized resolved inputs are captured in the in-memory `nodeOutputs` cache under
  `EXECUTION_OBSERVABILITY_KEYS.resolvedInputs(node.id)`.
- At the end of `execute-workflow.ts`, the code enriches `executions.logs[]` with:
  `resolvedInputs`, `resolvedInputSources`, `runtimeInputAudit`,
  `runtimeInputHandoffAudit`, and `runtimeResolutionAudit`.

Analyzer implication:

- The first analyzer version must build a per-node view from:
  `execution_steps.input_json` for upstream payload,
  `execution_steps.output_json` or `output_refs` for output,
  `execution_steps.state_snapshot.config` for raw config,
  `executions.logs[].resolvedInputs` for fully resolved runtime fields,
  and `workflow_execution_events.event_data` for timeline/error evidence.
- For long-term correctness, add a first-class `resolved_input_json JSONB` or
  `resolved_config_json JSONB` column to `execution_steps` and write it when
  `dynamic-node-executor.ts` captures resolved inputs.

### 3.2 Which DB client should new analyzer persistence use?

Use raw SQL/Supabase-style access through `getDbClient()` for analyzer tables and
execution joins. That matches the live `executions` / `execution_steps` stack. Prisma
memory models are optional/legacy and not the primary execution path.

### 3.3 What should session lifetime/scope be?

Default to one durable analyzer session per `(workflow_id, user_id)` and allow optional
topic/session branching later.

Reasoning:

- AI Editor permissions are per user and workflow/lifecycle-aware.
- A workflow owner expects the analyzer conversation to resume across page reloads.
- Team features can later add shared threads, but private per-user memory is the safest
  default.

### 3.4 How should large outputs and artifacts be handled?

Current storage behavior is split:

- `CentralExecutionState.setNodeOutput(...)` stores payloads over 1MB in object storage
  when configured, and writes the object storage reference into `execution_steps.output_json`.
- `StorageManager` stores distributed values over smaller thresholds as `_storage: 's3'`
  refs in `input_refs` / `output_refs`.
- The `execution_artifacts` table exists but current code search found no writer that
  inserts artifact rows.

Analyzer behavior:

1. Detect storage refs in `output_json`, `input_refs`, and `output_refs`:
   `{ _storage: 's3', _key, _url }` or `{ _storage: 'db', _data }`.
2. Resolve object-storage refs through `ObjectStorageService.load(...)` only when:
   the user explicitly asks about that output, the run is selected, or the summary budget
   permits it.
3. Never send full large payloads to the LLM by default. Generate a deterministic profile:
   type, size, top-level keys, record count, sample records, null/empty ratios, error-like
   fields, and truncation markers.
4. Persist the analyzer profile/summarization artifact so repeated questions do not reload
   or resend the same large blob.
5. Treat `execution_artifacts` as optional metadata until writers exist. If artifact rows
   are later populated, join them by `execution_id` and `step_id`; otherwise rely on refs
   embedded in `output_json` / `output_refs`.

### 3.5 Cost/latency strategy

Do not make one Gemini call per node by default.

Recommended budget:

- Fast deterministic profiling for every selected run, no LLM.
- One structured `workflow-analysis` call for a run summary using compact node profiles.
- Optional focused `summarization` calls for large individual outputs when the user drills in.
- Cache analyzer artifacts by `(execution_id, node_id, artifact_type, source_hash,
  prompt_strategy_version)`.

---

## 4. Flagship Product Direction

A best-in-class workflow analyzer should feel closer to Datadog plus a senior automation
engineer than a chat box.

### 4.1 Runtime Intelligence Layer

Create a deterministic service that normalizes runs before LLM involvement:

```ts
type AnalyzerNodeRun = {
  executionId: string;
  workflowId: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  sequence: number;
  status: 'running' | 'success' | 'completed' | 'failed' | 'skipped' | 'waiting';
  rawConfig?: Record<string, unknown>;
  resolvedInputs?: Record<string, unknown>;
  resolvedInputSources?: Record<string, string>;
  upstreamInputProfile: DataProfile;
  outputProfile: DataProfile;
  error?: string;
  retries?: { retryCount?: number; maxRetries?: number; lastError?: string };
  timings?: { startedAt?: string; completedAt?: string; durationMs?: number };
  storageRefs?: Array<{ fieldPath: string; storage: 's3' | 'db'; key?: string; url?: string }>;
};
```

`DataProfile` should be deterministic and cheap:

```ts
type DataProfile = {
  kind: 'null' | 'scalar' | 'object' | 'array' | 'storage_ref' | 'unavailable';
  bytesApprox: number;
  itemCount?: number;
  topLevelKeys?: string[];
  schemaSketch?: Record<string, { type: string; nullRate?: number; examples?: unknown[] }>;
  sample?: unknown;
  truncated: boolean;
  notes?: string[];
};
```

This makes answers reproducible and keeps LLM prompts small.

### 4.2 Historical Baselines and Regression Detection

Add a baseline builder that can answer:

- "Is this output unusually small compared with successful runs?"
- "Did this node start failing after a config change?"
- "Why did this fail differently than last Tuesday?"
- "Which node first diverged from the normal path?"

Minimum baseline metrics per workflow/node:

- Success rate over last 7/30/100 runs.
- Common error signatures with counts and first/last seen timestamps.
- Output shape fingerprints: top-level keys, array lengths, empty/null rates.
- Duration p50/p95 and latest-run delta.
- Retry frequency and approval wait frequency.
- Config fingerprint at run time, excluding secrets.

Persist these as analyzer snapshots, not as chat messages.

Suggested table:

```sql
CREATE TABLE IF NOT EXISTS public.ai_analyzer_run_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL,
  execution_id UUID NOT NULL,
  status TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  summary_version INTEGER NOT NULL DEFAULT 1,
  deterministic_profile JSONB NOT NULL,
  llm_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (execution_id, summary_version, source_hash)
);
```

### 4.3 Root-Cause Chains

The analyzer should not stop at "node 4 failed."

Root-cause chain example:

1. Google Sheets returned `rows: []` for the selected range.
2. AI summarizer received an empty array and produced placeholder text.
3. Gmail node sent the placeholder because no guard existed.
4. This happened in 6 of the last 10 runs, always when the sheet range resolves to
   `A2:D500`.

Implementation:

- Build a dataflow graph from execution order plus edges.
- For failed/skipped/suspicious nodes, walk upstream until the first anomaly is found:
  empty output, missing required resolved input, schema mismatch, changed config
  fingerprint, or provider error.
- Present both a plain-English explanation and machine-readable evidence.

### 4.4 Closing the Loop with Suggestions

History-aware suggestion flow:

1. Analyzer detects recurring failure pattern.
2. It emits a `remediationCandidate`:

```ts
type RemediationCandidate = {
  confidence: number;
  pattern: string;
  evidence: Array<{ executionId: string; nodeId: string; message: string }>;
  proposedOperations: AiEditorMutationOperation[];
  userFacingSummary: string;
  risk: 'low' | 'medium' | 'high';
};
```

3. `POST /editor/suggest` receives this context and still returns normal operations.
4. User previews diff and applies through the existing `/editor/apply` path.

Examples:

- Empty array before an output node -> `insert_safety_node` before the output node.
- Repeated required-field failure -> `update_node_config` to switch a field from
  `runtime_ai` to static/manual guidance or add a deterministic template.
- API 429/timeout pattern -> insert/configure retry/backoff node if available, or update
  timeout/retry config on the failing node.
- Branch frequently unmatched -> update switch/if_else config based on observed values.

### 4.5 Cost and Latency Guardrails

At scale, runtime narration can get expensive.

Rules:

- List executions and build deterministic profiles without LLM calls.
- Default to summaries for the last 20 runs and full detail only for a selected run.
- Use one run-level structured LLM call for the selected execution.
- Use focused node-level LLM calls only on demand.
- Store summary artifacts with source hashes.
- Limit prompt input to schema/profile/sample data; never blindly include full
  `executions.logs`, full arrays, secrets, or object-storage blobs.
- Track token/cost metadata per analyzer call in the summary table or audit table.

---

## 5. Proposed Backend Design

### 5.1 New service

Add `worker/src/services/ai/workflow-analyzer.ts`.

Suggested public methods:

```ts
class WorkflowAnalyzer {
  async listExecutions(workflowId: string, userId: string, limit?: number): Promise<ExecutionSummary[]>;
  async getExecutionDetail(executionId: string, userId: string): Promise<ExecutionDetail>;
  async buildRunProfile(executionId: string, options?: ProfileOptions): Promise<AnalyzerRunProfile>;
  async explainExecution(args: ExplainExecutionArgs): Promise<StructuredRunExplanation>;
  async explainNodeOutput(args: ExplainNodeOutputArgs): Promise<StructuredNodeExplanation>;
  async compareExecutions(args: CompareExecutionsArgs): Promise<StructuredComparison>;
  async detectPatterns(workflowId: string, options?: PatternOptions): Promise<RuntimePattern[]>;
  async chat(args: AnalyzerChatArgs): Promise<AnalyzerChatResponse>;
}
```

Important: factor the query behind `getExecutionStatus()` into a shared helper so the
existing status endpoint and the analyzer do not drift.

### 5.2 Execution detail query contract

Run detail must include more than `getExecutionStatus()` currently exposes:

```ts
type ExecutionDetail = {
  execution: {
    id: string;
    workflowId: string;
    status: string;
    startedAt?: string;
    finishedAt?: string;
    durationMs?: number;
    error?: string;
    logs?: unknown[];
  };
  steps: Array<{
    id: string;
    nodeId: string;
    nodeName?: string;
    nodeType: string;
    status: string;
    sequence: number;
    inputJson?: unknown;
    outputJson?: unknown;
    inputRefs?: unknown;
    outputRefs?: unknown;
    resultData?: unknown;
    stateSnapshot?: unknown;
    checkpointData?: unknown;
    retryCount?: number;
    maxRetries?: number;
    error?: string;
    startedAt?: string;
    completedAt?: string;
  }>;
  events: Array<{
    eventType: string;
    eventData: unknown;
    nodeId?: string;
    nodeName?: string;
    sequence?: number;
    createdAt: string;
  }>;
  approvals: Array<{
    nodeId: string;
    status: string;
    preview?: unknown;
    requestedAt: string;
    resolvedAt?: string;
  }>;
};
```

### 5.3 New/extended routes

Keep existing contracts backward compatible.

| Route | Purpose |
|---|---|
| `GET /api/ai/editor/executions/:workflowId?limit=20` | List recent runs with status, timings, duration, error, anomaly summary. |
| `GET /api/ai/editor/executions/:workflowId/:executionId` | Full normalized execution detail for the analyzer UI. |
| `GET /api/ai/editor/analyze/session/:workflowId` | Resume or create the user's analyzer session and return recent messages. |
| `POST /api/ai/editor/analyze/chat` | Persisted analyzer chat turn; accepts optional `executionId`, `nodeId`, and `intent`. |
| `POST /api/ai/editor/analyze` | Backward-compatible: if no execution context is supplied, keep today's static analysis; if `executionId` is supplied, use `WorkflowAnalyzer.explainExecution`. |
| `GET /api/ai/editor/runtime-patterns/:workflowId` | Proactive patterns: recurring failures, regressions, empty outputs, slow nodes. |
| `POST /api/ai/editor/suggest` | Existing route, extended with optional runtime pattern context before calling `suggestWorkflowEdits`. |

Example chat request:

```json
{
  "workflowId": "uuid",
  "prompt": "Why did this fail differently than last Tuesday?",
  "executionId": "uuid",
  "nodeId": "node_123",
  "intent": "compare_run_to_history"
}
```

Example structured answer:

```json
{
  "message": "This run failed earlier than usual because the Sheets node returned zero rows...",
  "references": [
    { "executionId": "uuid", "nodeId": "sheets_1", "kind": "output_profile" }
  ],
  "patterns": [
    { "name": "empty_upstream_output", "count": 6, "window": "last_10_runs" }
  ],
  "remediationCandidates": [
    {
      "confidence": 0.82,
      "userFacingSummary": "Add an empty-result guard before Gmail.",
      "proposedOperations": [
        {
          "kind": "insert_safety_node",
          "nodeType": "if_else",
          "position": { "relation": "after", "referenceNodeId": "sheets_1" },
          "configOverrides": { "conditions": [] }
        }
      ],
      "risk": "medium"
    }
  ]
}
```

### 5.4 Conversation persistence schema

Dedicated analyzer tables are recommended even though generic `memory_sessions` and
`memory_messages` exist.

```sql
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
```

If the team chooses to reuse `memory_sessions` / `memory_messages`, store analyzer refs in
`metadata`, but add a clear `metadata.kind = 'ai_editor_analyzer'` convention and indexes
for `workflow_id`, `session_id`, and `created_at`.

### 5.5 Prompt strategy

Use a two-layer prompt:

1. Deterministic context builder:
   - Workflow summary.
   - Selected execution profile.
   - Per-node profile table.
   - Registry field descriptions.
   - Historical baseline deltas.
   - Redacted config/resolved inputs.
2. Structured LLM instruction:
   - Explain actual data and failure chain.
   - Cite execution/node references.
   - Separate facts from inferences.
   - Output JSON with `summary`, `dataNarration`, `rootCause`, `evidence`,
     `risks`, `suggestedQuestions`, and `remediationCandidates`.

Do not ask the model to inspect raw credentials, full logs, or full payloads.

---

## 6. Frontend Design

Keep the current AI Editor mental model, but make Analyze materially more useful.

Analyze tab:

- Hydrate persisted analyzer session when the user opens AI Editor.
- Show a compact execution selector:
  - latest run
  - latest failed run
  - compare with previous successful run
  - custom recent run list
- Show referenced run/node chips in chat messages.
- Add node-level affordances:
  - "Explain this node output"
  - "Compare with previous run"
  - "Why did this node fail?"
- Render structured answer sections:
  - What happened
  - Data observed
  - Root cause chain
  - Evidence
  - Suggested fix

Suggest edits tab:

- Keep the existing pending diff/apply flow.
- Add an optional "Use run history" toggle that is on by default when recent failures
  exist.
- If analyzer patterns exist, show a compact "Detected from runs" preface before the
  returned operations.

Do not resurrect `AIAssistant.tsx`. Either delete it later or migrate any useful copy into
the live `PropertiesPanel.tsx` implementation.

---

## 7. Implementation Sequence

1. **Shared execution detail helper**
   - Extract the `getExecutionStatus()` query into a reusable helper.
   - Add events and approvals joins.

2. **Analyzer list/detail endpoints**
   - `GET /editor/executions/:workflowId`
   - `GET /editor/executions/:workflowId/:executionId`
   - Enforce the same auth/RBAC posture as current AI Editor routes.

3. **Conversation persistence**
   - Add dedicated analyzer tables or formalize reuse of `memory_sessions` /
     `memory_messages`.
   - Implement session hydrate and chat append endpoints.

4. **Deterministic run profiler**
   - Build profiles from `execution_steps`, `executions.logs`,
     `workflow_execution_events`, approvals, and storage refs.
   - Implement output ref detection and safe sampling.

5. **Structured narration**
   - Add `WorkflowAnalyzer.explainExecution` and `explainNodeOutput`.
   - Use `workflow-analysis` / `summarization` with structured output.
   - Cache summaries by source hash.

6. **Historical pattern detector**
   - Build recent-run baselines and recurring failure signatures.
   - Surface patterns in Analyze.

7. **Suggestion loop**
   - Pass pattern/remediation context into `/editor/suggest`.
   - Keep operations whitelisted and diff/apply unchanged.

8. **Frontend**
   - Hydrate persisted messages.
   - Add execution picker and run/node reference chips.
   - Render structured analysis and suggested remediation candidates.

9. **Cleanup**
   - Remove or explicitly deprecate `AIAssistant.tsx`.
   - Fix output-schema description preservation if analyzer narration needs broader
     coverage.

---

## 8. Verification Checklist for Implementers

- `POST /api/ai/editor/analyze` without execution context behaves exactly as it does
  today.
- Selecting a run uses real `executions` / `execution_steps` data, not client-supplied
  workflow JSON only.
- Analyzer can answer from `executions.logs[].resolvedInputs` when a node used runtime
  AI or template resolution.
- Large object-storage refs are detected and summarized safely.
- No secrets are sent to Gemini.
- Repeated questions about the same run reuse cached analyzer summaries.
- Suggested fixes only use the existing AI Editor operation vocabulary.
- Apply still routes through `/editor/apply` with validation/versioning/audit.
- Conversation survives refresh for the same workflow/user.
- The UI clearly distinguishes verified facts from inferred root cause.
