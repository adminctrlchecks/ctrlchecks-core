# Bugfix Requirements Document

## Introduction

A cluster of interconnected bugs causes "Email" intent workflows to persist as `ollama`/generic AI node types, silently fail the `attach-inputs` pipeline phase, skip credential injection for Jira/Gmail nodes, and run credential discovery against a stale graph snapshot. The combined effect is that users configure a Gmail or Jira workflow, save it, and find it either empty, unconfigured, or wired to the wrong node type. The fix must close all four root-cause classes as a single coherent change so that no individual patch can re-introduce the others.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the AI planner receives a user intent containing "email" or "send email" THEN the system persists the workflow with node type `ollama` (or a generic AI node) instead of `google_gmail`

1.2 WHEN the canvas renders a workflow whose nodes were saved as `ollama` THEN the system displays the label "Email" (from the original AI label) while the Properties panel and execution engine use the `ollama` schema, creating a label-vs-registry contract mismatch

1.3 WHEN the `attach-inputs` HTTP call returns a 400 error THEN the system logs the failure as non-fatal, skips field ownership assignment and config merging, and continues the pipeline as if inputs were successfully applied

1.4 WHEN `attach-inputs` has failed or the pipeline phase flag is in the wrong state THEN the system logs "Skipping credential attachment ... (inputs still pending)" and exits without injecting vault credentials into Jira, Gmail, or any other OAuth node

1.5 WHEN credential discovery runs against the workflow graph THEN the system uses the graph snapshot captured before `save/normalize/hydrate`, so it may advertise Gmail credential requirements for a workflow that was subsequently normalized to `ollama` nodes (or vice versa)

1.6 WHEN credential injection is skipped due to 1.3 or 1.4 THEN the system leaves Jira and Gmail node configs without a `credentialId`, resulting in "all toggles off / Not configured" state in the Properties panel

1.7 WHEN a session produces multiple workflow save operations THEN the system may key credential discovery and attachment to an earlier workflow ID, causing a mismatch where the user configures credentials under one ID but the final persisted graph uses a different ID

### Expected Behavior (Correct)

2.1 WHEN the AI planner receives a user intent containing "email" or "send email" THEN the system SHALL resolve the canonical node type to `google_gmail` (or the registered email node type) via `unified-node-registry` before any persistence occurs

2.2 WHEN the canvas renders a workflow THEN the system SHALL derive both the display label and the Properties/execution schema from the same `unified-node-registry` entry, so label and behavior are always consistent

2.3 WHEN the `attach-inputs` HTTP call returns a 400 error THEN the system SHALL treat the failure as a blocking pipeline error, surface a clear error to the caller, and SHALL NOT proceed to credential attachment or any downstream phase that depends on applied inputs

2.4 WHEN `attach-inputs` succeeds THEN the system SHALL advance the pipeline phase flag to `inputs_applied` before attempting credential attachment, and credential attachment SHALL only run when the phase is `inputs_applied`

2.5 WHEN credential discovery runs THEN the system SHALL operate on the same graph version (same workflow ID and node list) that was most recently saved and will be opened by the user, not on an earlier in-memory snapshot

2.6 WHEN credential injection completes successfully THEN the system SHALL write the resolved `credentialId` into the persisted workflow row so that the Properties panel reflects the configured state on next open

2.7 WHEN a session produces multiple save operations THEN the system SHALL use a single canonical workflow ID throughout credential discovery, attachment, and final persistence, and SHALL reject or reconcile any operation that references a stale ID

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the user intent specifies a non-email node type (e.g., Slack, Jira, Google Sheets) THEN the system SHALL CONTINUE TO resolve and persist the correct canonical node type for that integration without alteration

3.2 WHEN `attach-inputs` succeeds on the first attempt THEN the system SHALL CONTINUE TO advance through field ownership, config merge, and credential attachment in the existing order without additional latency or retries

3.3 WHEN credential discovery finds no missing credentials THEN the system SHALL CONTINUE TO return an empty `missingCredentials` array and allow the pipeline to complete without prompting the user

3.4 WHEN a workflow contains only trigger and logic nodes that require no OAuth credentials THEN the system SHALL CONTINUE TO skip credential discovery and attachment without error

3.5 WHEN the unified-node-registry is queried for any node type THEN the system SHALL CONTINUE TO return the full node definition including `inputSchema`, `outputSchema`, `credentialSchema`, and `defaultConfig` without regression to any existing node

3.6 WHEN edges are created or reconciled by the orchestrator THEN the system SHALL CONTINUE TO route all edge operations through `unified-graph-orchestrator` with no direct mutation of `workflow.edges`

3.7 WHEN the AI planner outputs a node type for any non-email intent THEN the system SHALL CONTINUE TO hydrate that node from registry defaults without any hardcoded `if (node.type === ...)` branches outside the registry

### Legacy Code Removal Requirements

4.1 WHEN the system resolves a node type string THEN it SHALL use only `unified-node-registry.ts` as the resolution authority, and all other resolver implementations (`node-type-resolver.ts`, `node-type-resolver-util.ts`, `nodeTypeResolver.ts`, `node-type-normalization-service.ts`) SHALL be removed or reduced to single-line delegations to the registry

4.2 WHEN `capability-resolver.ts` processes the string "email" or any email-related alias THEN it SHALL NOT resolve to `ollama` or any LLM node type; email aliases SHALL only resolve via the registry alias map to `google_gmail`

4.3 WHEN the pipeline resolves node types THEN resolution SHALL occur exactly once at generation time; subsequent pipeline stages (normalization, hydration, attach-inputs, attach-credentials) SHALL NOT re-resolve or override the stored canonical type

4.4 WHEN `attach-inputs` processes a request THEN it SHALL NOT advance the workflow phase until graph normalization succeeds; on any normalization failure the phase SHALL remain unchanged and a blocking error SHALL be returned

4.5 WHEN credential discovery runs THEN it SHALL read the workflow graph from the database row that was most recently committed, not from any in-memory snapshot captured before the last save

4.6 WHEN the system removes a legacy resolver file THEN it SHALL verify that no remaining code imports from that file before deletion; any remaining imports SHALL be updated to import from `unified-node-registry.ts` directly
