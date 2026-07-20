# AI Editor Panel Implementation Handover

Last updated: 2026-07-14

This document summarizes the current AI Editor panel implementation and gives a ready-to-copy prompt for Claude or another coding agent to continue future work without losing context.

## Current Product Direction

The AI Editor is no longer a split "Analyze" and "Suggest edits" tool. It is now moving toward a single workflow assistant that can:

- Discuss the current workflow.
- Inspect real execution history when a saved workflow/run is selected.
- Explain outputs, failures, and data flow in plain English.
- Persist a per-workflow conversation.
- Suggest safe workflow edits.
- Preview those edits as structured operations.
- Apply only after explicit user approval.

The intended standard is an execution-aware workflow copilot, not a generic JSON-reading chatbot.

## Main User Experience Now

The right-side `PropertiesPanel.tsx` has an AI Editor mode with a workflow assistant chat.

Current behavior:

- The user can ask normal workflow questions.
- The user can select an execution/run context.
- Analyzer responses are rendered as readable chat cards instead of raw JSON.
- Runtime remediation candidates can appear when execution evidence supports a concrete fix.
- The user can preview a fix, then apply it through the existing safe apply path.
- The AI can ask the user to choose an implementation option when the request is genuinely ambiguous.
- The AI should not auto-apply changes. Preview and Apply remain separate.

Important frontend file:

- `ctrl_checks/src/components/workflow/PropertiesPanel.tsx`

## Backend Routes And Services

Important backend files:

- `worker/src/api/ai-gateway.ts`
- `worker/src/services/ai/execution-runtime-analyzer.ts`
- `worker/src/services/ai/workflow-editor.ts`
- `worker/src/services/ai/ai-editor-rbac.ts`
- `worker/src/core/types/ai-editor-contracts.ts`
- `worker/migrations/034_ai_analyzer_memory.sql`

Important routes:

- `GET /api/ai/editor/executions/:workflowId`
- `GET /api/ai/editor/executions/:workflowId/:executionId`
- `GET /api/ai/editor/analyze/session/:workflowId`
- `POST /api/ai/editor/analyze/chat`
- `POST /api/ai/editor/analyze`
- `POST /api/ai/editor/suggest`
- `POST /api/ai/editor/chat`

The newest unified route is:

- `POST /api/ai/editor/chat`

That route decides whether a turn is workflow explanation, execution explanation, edit proposal, or mixed intent.

## Database Memory

Migration:

- `worker/migrations/034_ai_analyzer_memory.sql`

Tables:

- `ai_analyzer_sessions`
- `ai_analyzer_messages`

Purpose:

- One durable analyzer/chat session per workflow/user.
- Persist user and assistant turns.
- Optionally reference an execution id or node id.

The migration still needs to exist in production databases where it has not already been applied. This repo historically does not have a single automatic SQL migration runner for these `worker/migrations/*.sql` files.

## Execution-Aware Analyzer

Service:

- `worker/src/services/ai/execution-runtime-analyzer.ts`

Implemented capabilities:

- Lists recent workflow executions.
- Loads normalized execution detail from execution storage.
- Reads execution steps, execution events, and node approval data where available.
- Builds deterministic compact profiles instead of forwarding raw payloads to the LLM.
- Detects first-pass runtime patterns:
  - recurring failures
  - empty outputs
  - high retries
- Explains a full run.
- Explains a node output.
- Supports persisted chat.
- Can return `remediationCandidates` when runtime evidence points to a concrete workflow fix.

Important safety behavior:

- Raw execution payloads should not be blindly forwarded to the LLM.
- Analyzer should use compact profiles, samples, field summaries, sizes, statuses, error text, and evidence references.

Known limitation:

- Root-cause chains and historical baselines are still first-pass. There is not yet a full causal graph engine comparing run-vs-baseline or "why this failed differently than last Tuesday" in a deep way.

## Safe Edit System

Core editor service:

- `worker/src/services/ai/workflow-editor.ts`

Allowed mutation operations are centralized in:

- `worker/src/core/types/ai-editor-contracts.ts`
- `AI_EDITOR_MUTATION_OPERATION_KINDS`

Allowed operation kinds:

- `add_node`
- `remove_node`
- `replace_node`
- `update_node_config`
- `insert_safety_node`
- `refactor_linearize`

Important rule:

- The AI must not output arbitrary graph mutations. It must output only the whitelisted operation objects.
- The backend sanitizes operations.
- The backend dry-runs operations and returns a diff.
- The frontend Apply button is the only commit path.

## Recently Implemented Fixes

### 1. Unified AI Editor Chat

Commit:

- `31b9efb Unify AI editor chat workflow`

Effect:

- AI Editor moved toward one assistant chat instead of forcing users to think in separate Analyze/Suggest modes.
- Chat can combine explanation and edit proposal behavior.

### 2. Analyzer Response UI

Commit:

- `2388b54 Render analyzer responses as chat cards`

Effect:

- Analyzer JSON responses are converted into readable chat UI content.
- This fixed the issue where users saw raw JSON blocks such as `summary`, `dataNarration`, `evidence`, and `remediationCandidates`.

### 3. Properties Panel Layout Hardening

Commit:

- `037746d Harden properties panel layout`

Effect:

- Improved AI Editor/Properties panel layout.
- Reduced overflow from chat text, pending changes, operation JSON, and fixed-width content.

### 4. Implementation Choice Cards

Commit:

- `5cfab90 Add AI editor implementation choices`

Effect:

- When a user asks for a change that could map to several node types, the backend can return `candidateOptions`.
- The frontend renders implementation choice cards.
- User can choose one option, and the AI continues with that selected node type.

Important intended behavior:

- Candidate choice cards are useful for ambiguous new-node requests like "notify someone" or "send a message."
- They should not be used when the user already gave a graph rewrite instruction like "replace Gmail with Slack" or "remove this node."

### 5. Graph Rewrite Handling

Commit:

- `befd792 Improve AI editor graph rewrite handling`
- `bf9f6d5 Validate AI editor mutation operations`

Effect:

- Backend no longer routes replace/remove/delete/branch-specific prompts into the generic candidate-choice flow.
- `workflow-editor.ts` now gives Gemini richer graph context:
  - node id
  - type
  - label
  - position
  - config keys
  - compact redacted config summary
  - edge source/target
  - `sourceHandle`
  - `targetHandle`
- Prompt rules now explicitly tell the model:
  - use `replace_node` for replacement
  - use `remove_node` for deletion
  - inspect branch handles/config before branch-specific edits
  - return multiple operations for multi-part requests
  - ask clarification only when target node/branch/service cannot be inferred
- Gemini structured JSON mode is requested.
- If the response is malformed JSON, backend retries once with a JSON repair prompt.
- Raw parser errors should no longer appear directly in chat.
- Backend now validates generated mutation operations before dry-run.
- Incomplete operations like `{ "kind": "replace_node" }` are rejected/retried instead of being shown as preview-ready changes.

This specifically targets failures like:

> "when status is success and condition is false remove Gmail and update it with Slack, and when status is pending replace Slack with Gmail"

Expected behavior after this fix:

- The assistant should reason over the existing graph.
- It should identify existing Gmail/Slack nodes and branch paths.
- It should produce `replace_node` / `remove_node` / `update_node_config` operations as needed.
- It should preview safe operations, not ask the user to choose generic Slack again.

Current reality from manual testing:

- The first failure mode was fixed: raw malformed JSON and incomplete `replace_node` objects should no longer reach the UI as valid pending changes.
- A second failure mode remains: for branch-specific graph rewrite prompts, the backend now often returns the safe fallback:

  > I could not safely convert that request into a validated workflow edit. Please name the exact node or branch you want changed, or split the request into one replacement/removal at a time.

- This means the operation validator is doing its safety job, but the edit-generation system still does not reliably resolve ambiguous natural language like "status is success and condition is false" into concrete workflow node ids and branch paths.
- The next implementation should not loosen validation. It should improve graph/branch resolution before or during suggestion generation.

Active bug example:

> in the workflow when the status id sucess and condition is false then can you remove the gmail node and update it with the slack node and when start is pending replace slack with gmail with proper node properties

Observed progression:

- Before `befd792`: AI showed generic candidate choices: Gmail, Slack, Notion, ScheduleWise.
- Before `bf9f6d5`: AI produced incomplete operations: `[{"kind":"replace_node"},{"kind":"replace_node"}]`, causing dry-run errors `replace_node: node undefined not found`.
- After `bf9f6d5`: AI safely refuses with fallback instead of broken preview, but still does not complete the edit.

What still needs fixing:

- The workflow editor needs a deterministic graph interpretation layer for branch-targeted replacement/deletion requests.
- It should extract current workflow graph facts before calling Gemini:
  - all nodes by id/type/label
  - incoming/outgoing edges per node
  - branch source handles such as true/false/case handles
  - condition/switch config summaries
  - candidate downstream action nodes per branch
- It should let the LLM choose from concrete candidates, not free-form invent node ids.
- If branch mapping is still ambiguous, it should ask a precise question like:

  > I found two Gmail nodes downstream of If/Else. Do you mean the Gmail on the true branch or false branch?

- It should not ask generic implementation-choice questions when the user already names Gmail/Slack and is asking for replacement.

Recommended implementation direction:

- Add a `buildGraphRewriteContext(workflow)` helper in `worker/src/services/ai/workflow-editor.ts`.
- Include candidate branch paths in the LLM prompt as structured facts, for example:

  ```json
  {
    "branchNodes": [
      {
        "id": "node_if_else",
        "type": "if_else",
        "label": "If/Else",
        "outgoingBranches": [
          {
            "sourceHandle": "true",
            "targets": [{ "id": "node_gmail_1", "type": "google_gmail", "label": "Gmail" }]
          },
          {
            "sourceHandle": "false",
            "targets": [{ "id": "node_gmail_2", "type": "google_gmail", "label": "Gmail" }]
          }
        ]
      }
    ]
  }
  ```

- Consider a two-step generation flow for graph rewrites:
  1. Interpret target edits: map user language to `{ action, targetNodeId, newNodeType, branchEvidence }`.
  2. Convert interpreted edits to whitelisted mutation operations.
- Keep the final operation validator from `bf9f6d5`; it is the safety net.

## RBAC And Ownership

File:

- `worker/src/services/ai/ai-editor-rbac.ts`

Implemented:

- `assertWorkflowAccess()`
- Admin bypass.
- 403 on ownership mismatch.
- 404 if workflow does not exist.

Applied to execution-aware analyzer endpoints where workflow ids come from the client.

Purpose:

- Prevent IDOR issues where one authenticated user could read another user's workflow execution history.

## Current Deploy And Verification State

Latest pushed commit:

- `bf9f6d5 Validate AI editor mutation operations`

Local verification run:

- Worker `npx tsc --noEmit`: passed
- Frontend `npx tsc --noEmit`: passed
- Worker `npm run lint`: passed
- Worker `npm run build`: passed

Deployment:

- GitHub `Deploy Worker`: success for commit `bf9f6d5`
- Production worker health: `https://worker.ctrlchecks.ai/health/live` returned live
- Frontend/Vercel did not redeploy for `bf9f6d5` because only backend worker files changed.

CI note:

- The broad CI run had unrelated failures in integration/openapi/microservice jobs.
- Worker type-check, worker build, worker lint, frontend checks, and actual worker deploy passed.

## Known Limitations

1. Deep causal analysis is not complete.

The analyzer has first-pass runtime patterns, but not a full baseline/regression engine.

Still needed:

- Compare current run to historical successful baseline.
- Detect "failed differently than last Tuesday."
- Walk root-cause chains across upstream/downstream nodes.
- Detect data shape drift between runs.
- Rank likely root causes with evidence confidence.

2. Some node schemas still lack rich field descriptions.

The AI can only fill "proper node properties" when node registry schemas/defaults provide enough guidance. Poor schema metadata leads to weaker configuration.

Future work:

- Add richer field descriptions, examples, operation-specific defaults, and runtime guidance for important node types.

3. Replace/delete graph edits depend on orchestrator support.

The AI now has safer operation validation, but complex replacement/deletion is still not launch-ready. Final correctness depends on:

- a graph rewrite context that maps natural language branch references to concrete node ids
- `unifiedGraphOrchestrator.replace/reconcile/remove` behavior.
- Branch handles being preserved correctly.
- Node schemas accepting required configs.
- LLM output being constrained to concrete candidates from the graph context.

Current symptom:

- The backend may safely refuse branch replacement prompts instead of generating valid operations, because it cannot confidently map the requested branch/action to node ids.

4. Candidate clarification should stay narrow.

Choice cards are good for ambiguous new-node requests. They should not interrupt clear graph rewrites.

5. End-to-end browser testing is still required before major launches.

Recommended manual path:

- Open saved workflow.
- Open AI Editor.
- Ask an execution question.
- Select failed run.
- Confirm readable explanation.
- Ask for fix.
- Confirm remediation card or safe preview.
- Apply.
- Save.
- Run workflow.
- Confirm execution history reflects improved behavior.

## Product Standard To Maintain

The AI Editor should behave like a careful workflow engineer:

- Ask clarification only when needed.
- Prefer concrete previews over vague advice.
- Use real run evidence when available.
- Explain cause and effect in plain language.
- Never expose raw JSON to normal users unless they explicitly request it.
- Never auto-apply.
- Never invent node config keys.
- Never create fake credentials or secret values.
- Prefer schema/default guided properties.
- Preserve graph structure unless the user asked to change it.
- For destructive edits, be extra explicit in the preview message.

## Copy-Paste Prompt For Claude

Use this prompt when switching to Claude for the next AI Editor implementation task:

```text
You are working in the CtrlChecks repo at:
C:\Users\user\Desktop\ctrlchecks-hostinger

Read this handover first:
docs/AI_EDITOR_PANEL_IMPLEMENTATION_HANDOVER.md

Then inspect the actual current code before editing. Do not trust the handover blindly.

Important files:
- worker/src/api/ai-gateway.ts
- worker/src/services/ai/execution-runtime-analyzer.ts
- worker/src/services/ai/workflow-editor.ts
- worker/src/services/ai/ai-editor-rbac.ts
- worker/src/core/types/ai-editor-contracts.ts
- worker/migrations/034_ai_analyzer_memory.sql
- ctrl_checks/src/components/workflow/PropertiesPanel.tsx

Current product goal:
Make the AI Editor a single professional workflow assistant that can discuss the workflow, inspect execution history, explain data/failures, propose safe edits, preview diffs, and apply only after user approval.

Hard requirements:
1. Do not auto-apply workflow changes. Always preview first.
2. Only use whitelisted mutation operations from AI_EDITOR_MUTATION_OPERATION_KINDS.
3. Never invent config keys. Use node registry schemas/defaults.
4. Do not show raw JSON to normal users unless explicitly requested.
5. For execution-aware analysis, use compact runtime profiles, not raw payload dumps.
6. Keep RBAC/ownership checks for any workflowId or executionId from the client.
7. Candidate choice cards should only appear for genuinely ambiguous new-node requests. Do not show them for clear replace/remove/delete/branch rewrite requests.
8. For replace/delete/multi-branch edits, reason over the existing graph, node ids, config, and edge handles, then return structured operations.
9. Preserve existing unrelated files and user changes. Do not revert dirty worktree noise.

Before coding:
- Verify current behavior in the relevant files.
- Identify whether the issue is frontend rendering, backend routing, prompt/schema, operation sanitization, or graph orchestrator application.
- Make the smallest productive change that improves universal behavior, not a node-specific hack.

After coding:
- Run worker type-check.
- Run frontend type-check if frontend changed.
- Run worker lint/build when backend changed.
- Commit only intentional files.
- Push only after checks pass if deployment is requested.

When implementing future AI Editor work, prefer universal mechanisms:
- better node registry metadata
- better graph summaries
- better operation schema validation
- better clarification rules
- better analyzer evidence profiles
- better UI rendering of structured assistant responses

Do not hardcode special behavior for one node type unless the task is explicitly about that connector's schema.
```
