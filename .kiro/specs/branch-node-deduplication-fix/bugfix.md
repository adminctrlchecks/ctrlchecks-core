# Bugfix Requirements Document

## Introduction

Two related bugs affect the AI workflow generation system. The first causes non-secret node configuration fields (e.g. a Slack Webhook URL) to be incorrectly surfaced in the credential panel instead of the node's inline config panel. The second causes the AI planner and edge reconciliation engine to generate only one node instance when multiple branches of a switch/if-else workflow each require the same node type — resulting in a single node wired to multiple exclusive branches, broken edge handles, and React Flow errors at render time.

Both bugs share a root cause in the orchestration layer: the system does not distinguish between "one node type used once" and "one node type needed independently per branch", and the credential classification pipeline misroutes config-only URL fields into the credential schema.

---

## Bug Analysis

### Current Behavior (Defect)

**Bug 1 — Webhook URL treated as credential**

1.1 WHEN a node's input field has a `fieldName` of `webhookUrl` or `webhook_url` THEN the system assigns it the `helpCategory` of `webhook_url` AND the `inferCredentialCategory` method maps it to the `"webhook"` credential category, causing it to appear in the credential panel instead of the node config panel.

1.2 WHEN `extractCredentialSchema` iterates over `inputSchema` fields THEN the system includes any field whose `helpCategory` resolves to a category that `inferCredentialCategory` maps to `"webhook"`, even though `STRICT_CREDENTIAL_CATEGORIES` and `CREDENTIAL_QUESTION_HELP_CATEGORIES` explicitly exclude `webhook_url`.

1.3 WHEN the frontend reads `credentialSchema.credentialFields` for a Slack node THEN the system lists `webhookUrl` as a credential field, causing the UI to render it in the credential collection panel rather than the inline node configuration panel.

**Bug 2 — Branching workflows deduplicate nodes that must be independent**

1.4 WHEN the AI planner (Gemini) generates a `PlannedWorkflow` for a prompt that requires the same node type on multiple exclusive branches (e.g. two Slack nodes for two switch cases) THEN the system produces only one node of that type in the `planned.steps` array, collapsing the two independent branch actions into a single shared node.

1.5 WHEN `hydratePlannedWorkflow` converts `PlannedWorkflow.steps` into `WorkflowNode[]` THEN the system creates exactly one `WorkflowNode` per step entry, so if the planner emitted only one Slack step, only one Slack node exists in the graph regardless of how many branches need it.

1.6 WHEN `EdgeReconciliationEngine` Step 4 fans out branch ports from a switch node THEN the system maps each `case_N` port to the next unused target in execution order, but because only one Slack node exists, `case_2` and `case_3` both attempt to wire to the same node, producing duplicate or conflicting edges.

1.7 WHEN React Flow renders a switch node whose `case_2` and `case_3` edges both target the same downstream node THEN the system throws `"Couldn't create edge for source handle id: output"` because the shared node's single `input` handle cannot satisfy two exclusive branch connections simultaneously.

1.8 WHEN a linear workflow requires the same node type twice for distinct purposes (e.g. "read from Google Sheets AND write to Google Sheets") THEN the system generates only one Google Sheets node and attempts to wire it as both source and destination, producing a self-loop or broken graph.

---

### Expected Behavior (Correct)

**Bug 1 — Webhook URL treated as credential**

2.1 WHEN a node's input field has a `fieldName` of `webhookUrl` or `webhook_url` THEN the system SHALL classify it with `ownership = "value"` (not `"credential"`), keeping it out of `credentialSchema.credentialFields` and rendering it in the inline node config panel.

2.2 WHEN `extractCredentialSchema` iterates over `inputSchema` fields THEN the system SHALL skip any field whose `helpCategory` is `webhook_url`, `base_url`, `api_endpoint`, `callback_url`, or `redirect_url`, because these are configuration values the user provides — not vault secrets.

2.3 WHEN the frontend reads `credentialSchema` for a Slack node configured with a webhook URL THEN the system SHALL return a `credentialSchema` that does NOT list `webhookUrl` in `credentialFields`, so the field appears only in the node's inline configuration panel.

**Bug 2 — Branching workflows deduplicate nodes that must be independent**

2.4 WHEN the AI planner generates a `PlannedWorkflow` for a prompt where N exclusive branches each require the same node type THEN the system SHALL produce N distinct step entries (with distinct IDs) in `planned.steps`, one per branch, so that each branch has its own independent node instance.

2.5 WHEN `hydratePlannedWorkflow` converts `PlannedWorkflow.steps` into `WorkflowNode[]` THEN the system SHALL assign each step a unique node ID (e.g. `slack_case_2_3`, `slack_case_3_4`) so that sibling branch nodes of the same type are never collapsed into a single graph node.

2.6 WHEN `EdgeReconciliationEngine` Step 4 fans out branch ports from a switch node with N cases THEN the system SHALL wire each `case_N` port to a distinct target node, asserting that no two branch edges from the same switch node share the same target.

2.7 WHEN a switch node has 3 cases and 3 downstream action nodes (even if two share the same type) THEN the system SHALL produce exactly 3 outgoing branch edges, each pointing to a different node ID, with no node receiving more than one branch edge from the same switch.

2.8 WHEN a linear workflow requires the same node type twice for distinct purposes THEN the system SHALL generate two separate node instances with unique IDs and wire them sequentially, not reuse a single node for both roles.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a node's input field is a true authentication secret (e.g. `apiKey`, `accessToken`, `clientSecret`, `botToken`) THEN the system SHALL CONTINUE TO classify it as `ownership = "credential"` and surface it in the credential collection panel.

3.2 WHEN a workflow has a switch node with N cases and each case targets a different node type THEN the system SHALL CONTINUE TO generate exactly N distinct nodes and N branch edges, one per case, as it does today.

3.3 WHEN a linear workflow uses a single instance of a node type (e.g. one Gmail send) THEN the system SHALL CONTINUE TO generate exactly one node of that type and wire it correctly in the linear chain.

3.4 WHEN `EdgeReconciliationEngine` reconciles edges for a non-branching workflow THEN the system SHALL CONTINUE TO produce a valid linear edge chain with no duplicate or missing connections.

3.5 WHEN `extractCredentialSchema` processes a node that has genuine credential fields alongside config-only URL fields THEN the system SHALL CONTINUE TO include the credential fields in `credentialSchema.credentialFields` while excluding the URL config fields.

3.6 WHEN the unified graph orchestrator validates a workflow after hydration THEN the system SHALL CONTINUE TO enforce that all nodes are reachable from the trigger, no cycles exist, and all branch ports are wired to distinct targets.

3.7 WHEN the AI planner generates a strictly linear workflow (no branching) THEN the system SHALL CONTINUE TO produce one step per action with no duplication of node instances.
