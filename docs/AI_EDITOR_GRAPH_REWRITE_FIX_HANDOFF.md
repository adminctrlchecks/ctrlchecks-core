# AI Editor Graph Rewrite Fix Handoff

Last updated: 2026-07-14

## Problem We Are Fixing Now

The AI Editor analyzer/chat works well for explanation, but editing the current workflow is still not reliable for branch-specific replacement/deletion requests.

The user prompt that still fails:

```text
in the workflow when the status id sucess and condition is false then can you remove the gmail node and update it with the slack node and when start is pending replace slack with gmail with proper node properties
```

Simplified failing prompt:

```text
in the workflow when the status id sucess and condition is false then can you remove the gmail node and update it with the slack node
```

Latest observed behavior after commit `bf9f6d5`:

```text
I could not safely convert that request into a validated workflow edit. Please name the exact node or branch you want changed, or split the request into one replacement/removal at a time.

(No structured operations returned. Try naming the exact node or field you want changed.)
```

This is safer than before, but not good enough. The product goal is that the AI Editor should understand the current workflow graph and prepare a safe preview for this kind of request.

## Previous Failure Modes Already Addressed

Before recent fixes:

1. The backend incorrectly treated graph rewrite prompts as generic node-choice prompts.

It showed:

```text
I found a few valid ways to implement that. Choose the one you want...
1. Gmail
2. Slack
3. Notion
4. ScheduleWise
```

That was wrong because the user was not asking "which node type should I use?" The user already named Gmail and Slack and asked for branch-specific replacement.

2. Gemini returned malformed JSON.

The UI showed:

```text
Could not produce structured suggestions: Expected ',' or ']' after array element in JSON...
```

3. Gemini then returned incomplete operations.

Example:

```json
[
  { "kind": "replace_node" },
  { "kind": "replace_node" }
]
```

Dry-run failed:

```text
replace_node: node undefined not found
replace_node: node undefined not found
```

Recent commits fixed the safety layer:

- `befd792 Improve AI editor graph rewrite handling`
- `bf9f6d5 Validate AI editor mutation operations`

The backend now rejects incomplete operations and retries, so broken `{ "kind": "replace_node" }` previews should not appear anymore.

## Actual Remaining Root Cause

The current system still depends too much on the LLM to infer exact node ids and branch targets from natural language.

For prompts like:

```text
when status is success and condition is false, replace Gmail with Slack
```

the editor needs to know:

- Which node is the `status`/`start`/`condition` node?
- Which downstream branch is `false`?
- Which Gmail node is on that branch?
- Which Slack/Gmail node should be replaced?
- What `sourceHandle` or case handle corresponds to `false`, `pending`, `success`, etc.?
- Whether there are multiple Gmail or Slack nodes that require clarification.

Right now `workflow-editor.ts` passes node summaries and edge summaries to Gemini, but it does not build a deterministic branch/path map. When Gemini cannot confidently resolve exact ids, validation rejects the result and the user gets the fallback.

Do not fix this by weakening validation. The validator is correct. Fix the graph understanding.

## Important Files To Inspect

Start here:

- `worker/src/services/ai/workflow-editor.ts`
- `worker/src/api/ai-gateway.ts`
- `worker/src/core/types/ai-editor-contracts.ts`
- `worker/src/core/orchestration/unified-graph-orchestrator.ts`
- `ctrl_checks/src/components/workflow/PropertiesPanel.tsx`

Useful recent context:

- `docs/AI_EDITOR_PANEL_IMPLEMENTATION_HANDOVER.md`
- `docs/AI_EDITOR_EXECUTION_ANALYZER_PLAN.md`

## Required Product Behavior

For clear graph rewrite prompts, the AI Editor should:

1. Read the current workflow graph.
2. Identify candidate target nodes and branch paths.
3. Generate complete whitelisted operations only.
4. Preview the diff.
5. Apply only after user clicks Apply.

It should not:

- show generic node choices for clear replace/delete requests
- output incomplete operation objects
- invent node ids
- invent config keys
- auto-apply changes
- loosen backend validation

If ambiguous, it should ask a precise graph-aware clarification.

Good clarification:

```text
I found two Gmail nodes downstream of the If/Else node. One is on the true branch and one is on the false branch. Which one should be replaced with Slack?
```

Bad clarification:

```text
Choose a node type: Gmail, Slack, Notion, ScheduleWise.
```

## Recommended Implementation Plan

### 1. Add Graph Rewrite Context

In `worker/src/services/ai/workflow-editor.ts`, add a helper like:

```ts
private buildGraphRewriteContext(workflow: Workflow): GraphRewriteContext
```

It should produce structured facts such as:

- `nodesById`
- `nodesByType`
- `incomingEdgesByNodeId`
- `outgoingEdgesByNodeId`
- `branchNodes`
- `branchPaths`
- action nodes downstream of each branch

Example shape:

```json
{
  "branchNodes": [
    {
      "id": "node_switch",
      "type": "switch",
      "label": "Switch",
      "config": { "field": "status", "cases": ["success", "pending"] },
      "outgoingBranches": [
        {
          "sourceHandle": "success",
          "directTargets": [
            { "id": "node_if_else", "type": "if_else", "label": "If/Else" }
          ],
          "downstreamActionNodes": [
            { "id": "node_gmail_false", "type": "google_gmail", "label": "Gmail" }
          ]
        },
        {
          "sourceHandle": "pending",
          "directTargets": [
            { "id": "node_slack_pending", "type": "slack_message", "label": "Slack" }
          ],
          "downstreamActionNodes": [
            { "id": "node_slack_pending", "type": "slack_message", "label": "Slack" }
          ]
        }
      ]
    }
  ]
}
```

The exact shape can be adjusted to match existing workflow types, but the key is that Gemini receives concrete candidate node ids and branch evidence.

### 2. Add Graph Rewrite Intent Extraction

Before normal suggestion generation, detect graph rewrite prompts:

- replace/swap X with Y
- remove/delete X
- branch words: when, if, false, true, pending, success, failed, condition, status, branch

There is already routing logic in `worker/src/api/ai-gateway.ts`; verify it and improve only if needed.

The better place for actual branch/node mapping is likely `workflow-editor.ts`.

### 3. Constrain Gemini To Concrete Candidates

Prompt Gemini with:

- the user's request
- normal workflow node/edge summary
- new graph rewrite context
- instruction: choose only from candidate node ids in `graphRewriteContext`

For replacement:

```json
{
  "kind": "replace_node",
  "targetNodeId": "existing-node-id",
  "newNodeType": "slack_message",
  "configStrategy": "merge",
  "configOverrides": {
    "message": "..."
  }
}
```

For deletion:

```json
{
  "kind": "remove_node",
  "nodeId": "existing-node-id"
}
```

### 4. Keep Operation Validation

Do not remove the validation added in `bf9f6d5`.

The correct flow is:

1. LLM generates operations.
2. Backend validates required operation fields and node ids.
3. If invalid, retry once with validation issues.
4. If still invalid, ask precise clarification.

### 5. Improve Fallback Message

Current fallback is too generic:

```text
Please name the exact node or branch...
```

Better fallback should include what the backend found:

```text
I found two Gmail nodes and two Slack nodes, but I could not determine which branch maps to "status success + condition false". Please choose one:
1. Gmail after If/Else true branch
2. Gmail after If/Else false branch
```

This may require returning structured clarification candidates to the frontend, or a plain text clarification first.

## Acceptance Criteria

A prompt like this should not show generic implementation choices:

```text
when status is success and condition is false, replace Gmail with Slack
```

It should produce either:

1. A valid preview with complete operations:

```json
[
  {
    "kind": "replace_node",
    "targetNodeId": "real-existing-gmail-node-id",
    "newNodeType": "slack_message",
    "configStrategy": "merge",
    "configOverrides": {
      "message": "..."
    }
  }
]
```

or:

2. A precise branch-aware clarification:

```text
I found two Gmail nodes. Which one should be replaced with Slack: the Gmail on the If/Else true branch, or the Gmail on the If/Else false branch?
```

It must not produce:

```json
[{ "kind": "replace_node" }]
```

It must not produce:

```text
Choose between Gmail, Slack, Notion, ScheduleWise
```

## Copy-Paste Prompt For Claude

```text
You are working in:
C:\Users\user\Desktop\ctrlchecks-hostinger

Read these docs first:
- docs/AI_EDITOR_PANEL_IMPLEMENTATION_HANDOVER.md
- docs/AI_EDITOR_GRAPH_REWRITE_FIX_HANDOFF.md

Then inspect the actual current code. Do not trust the docs blindly.

The current bug:
AI Editor analysis/chat works, but workflow editing still fails for branch-specific graph rewrite prompts like:
"in the workflow when the status id sucess and condition is false then can you remove the gmail node and update it with the slack node and when start is pending replace slack with gmail with proper node properties"

Recent fixes:
- Candidate cards are no longer supposed to appear for graph rewrites.
- Malformed JSON repair exists.
- Incomplete operations like { "kind": "replace_node" } are rejected/retried.

Current remaining failure:
The backend safely refuses the request because it cannot reliably map natural language branch references to concrete node ids and branch paths.

Your task:
Implement a universal graph rewrite understanding layer, not a Gmail/Slack-specific hack.

Inspect and likely modify:
- worker/src/services/ai/workflow-editor.ts
- worker/src/api/ai-gateway.ts only if routing needs refinement
- worker/src/core/types/ai-editor-contracts.ts only if response contracts need extension
- ctrl_checks/src/components/workflow/PropertiesPanel.tsx only if graph-aware clarification UI is needed

Implementation requirements:
1. Build a deterministic graph rewrite context from the current workflow:
   - nodes by id/type/label
   - incoming/outgoing edges
   - branch nodes such as switch and if_else
   - sourceHandle/targetHandle
   - branch paths and downstream action nodes
   - compact branch-node config summary
2. Include that graph rewrite context in the workflow editor prompt.
3. Constrain the LLM to choose target node ids only from the graph context.
4. For replace requests, generated operations must include targetNodeId and newNodeType.
5. For remove requests, generated operations must include nodeId.
6. Keep the existing operation validation. Do not weaken safety.
7. If target/branch is ambiguous, return a precise graph-aware clarification instead of a generic node-type choice.
8. Do not hardcode Gmail/Slack behavior. This must work for all node types and branches.
9. Do not auto-apply changes. Keep preview/apply flow.

After implementation:
- Run worker type-check.
- Run worker lint/build.
- Run frontend type-check if frontend changed.
- Commit only intentional files.
- Do not stage unrelated dirty files like .gitignore or worker/public/node-library.json unless they are intentionally part of the change.

Success criteria:
The prompt "when status is success and condition is false, replace Gmail with Slack" should produce a valid preview with complete replace_node/remove_node operations, or a precise branch-aware clarification naming the candidate existing nodes/branches. It must not produce incomplete operations or generic Gmail/Slack/Notion/ScheduleWise choice cards.
```

