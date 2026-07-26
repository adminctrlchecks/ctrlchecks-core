# Node Operation Readiness Panel Handoff

## Purpose

This document is a handoff for the next Codex session. It captures the root-cause analysis and implementation plan for fixing workflow run and debug-node guidance panels so they show operation-aware missing inputs and credentials for every node.

The current request is analysis and handoff only. Do not change application code from this document alone.

## Universal Scope

This fix is not for Supabase only. Supabase is the current visible failing example, but the implementation must work for every node in the system.

The next session must audit and support:

- All node categories in the node library.
- All node definitions loaded from backend registry and overrides.
- All operations exposed by each node.
- All operation-specific required fields.
- All credential requirements.
- All documented field help, examples, and setup guidance.
- Both full workflow runs and single-node debug runs.

The final implementation should produce the same type of structured readiness guidance for any node, including database, HTTP/API, AI/ML, CRM, CMS, communication, file/storage, Google, payment, productivity, social media, trigger, utility, and DevOps nodes.

Do not hard-code Supabase, `data`, `filters`, or any other specific node field as a special-case fix. The correct behavior must come from each node's active schema, operation contract, field policy, credential policy, and documented field guidance.

## User Problem

When a user runs a workflow or debugs a single node, the UI can show generic guidance such as:

- "Connect your account to continue"
- "One more thing to check"
- "Open the Properties panel and complete the highlighted connection or required fields"

This is confusing when the selected connection is already active and the real blocker is an operation-specific input field. Example from the screenshots:

- Node: Supabase
- Operation: Insert
- Table: users
- Connection: active
- Actual blocker: likely missing `data`
- Current panel: generic connection or generic required-field message

Expected universal behavior:

- The workflow run panel and debug node panel should identify the exact node.
- The panel should identify the exact input field or credential.
- The field list must respect the selected operation.
- The guidance should come from existing schema/docs/contracts, not hallucinated AI text.
- The Properties panel should be able to highlight the same missing fields without disturbing the UI.

## Existing Capabilities Already Present

The codebase already has several pieces needed for this feature. The likely issue is that they are not wired into one shared readiness/error payload consistently.

### Frontend Guidance Mapping

File: `ctrl_checks/src/lib/workflow-guidance.ts`

This file already knows how to build actionable guidance from structured backend details:

- `extractMissingInputs(details)`
- `extractMissingCredentials(details)`
- `buildReadinessGuidance(payload, message)`
- `mapWorkflowIssueToGuidance(input)`

It can format arrays such as:

- `missingInputs`
- `missingCredentials`
- `runtimeValidationIssues`
- `runtimeInputAudit`
- `runtimeInputHandoffAudit`
- `validationErrors`
- `executionValidationIssues`

Root implication: if the backend sends precise structured details, the UI should be able to show specific missing fields.

### Workflow Page Panel

File: `ctrl_checks/src/pages/WorkflowBuilder.tsx`

Relevant behavior:

- Uses `GuidedStatusCard`.
- Uses `mapWorkflowIssueToGuidance`.
- Uses `buildWorkflowGuidanceContext`.
- `hasConcreteBackendDiagnostics(details)` detects structured arrays such as `missingInputs`, `missingCredentials`, and validation issues.
- `getWorkflowGuidanceWithSetupContext(errorData, nodes, workflowContext)` prefers backend diagnostics when they exist, otherwise falls back to local workflow context.

Root implication: the workflow page can already consume structured backend diagnostics, but it falls back to generic guidance when the execution error does not contain those diagnostics.

### Debug Node Output Panel

File: `ctrl_checks/src/components/workflow/debug/OutputPanel.tsx`

Relevant behavior:

- Renders `GuidedStatusCard` when a structured error exists and the debug run status is `error`.
- The current screenshot shows the panel falls back to generic guidance.

Root implication: the debug-node execution response likely does not include the same structured `missingInputs` or `runtimeValidationIssues` shape as the workflow run path.

### Properties Panel Field Error Extraction

File: `ctrl_checks/src/components/workflow/PropertiesPanel.tsx`

Relevant behavior:

- Already extracts field-specific errors from backend details.
- Handles `details.issues[].missingFields[]`.
- Handles `details.missingInputs`.
- Handles `details.runtimeValidationIssues`.
- Handles `details.runtimeInputAudit` and `details.runtimeInputHandoffAudit`.
- Uses field-key resolution so errors can attach to specific property fields.

Root implication: field-level UI support exists, but it depends on backend errors carrying resolvable field keys, node ids, and labels.

### Backend Operation-Aware Contracts

File: `worker/src/core/operations/operation-contract-resolver.ts`

This file resolves operation-aware contracts from:

- `definition.operationContracts`
- `inputSchema.operation`
- `resource`
- `ui.requiredIf`
- `runtimeContract.requiredWhen`

File: `worker/src/core/operations/field-policy-resolver.ts`

This file resolves active and required fields for a node:

- `resolveFieldPolicyForNode(def, config, fillModes?)`
- `pickActiveInputSchema(inputSchema, policy)`

File: `worker/src/api/node-definitions.ts`

This endpoint already exposes operation-aware `requiredFields`, `fieldPolicy`, and `operationContracts` using the backend resolver.

File: `worker/src/core/execution/dynamic-node-executor.ts`

This executor already calls:

- `resolveOperationContract(definition, migratedConfig)`
- `resolveFieldPolicyForNode(definition, migratedConfig, effectiveFillModes)`
- `pickActiveInputSchema(definition.inputSchema, runtimeFieldPolicy)`

Root implication: the backend runtime already has access to the correct operation-aware required fields. The break is likely in how readiness failures are produced, classified, and returned to the frontend.

### Existing Node Documentation

Important sources:

- `ctrl_checks/src/docs-content/nodes/*.doc.ts`
- `ctrl_checks/src/docs-content/node-field-content.ts`
- `ctrl_checks/src/docs-content/node-content-overrides.ts`
- `worker/src/services/nodes/node-library.ts`
- `worker/src/core/registry/overrides/*`

Root implication: the project already contains node and field help content. The fix should connect runtime field issues to this content. It should not ask an AI model to guess required fields.

## Suspected Root Causes

### 1. Execution errors do not always carry operation-aware missing input details

The frontend has multiple parsers for structured missing fields, but the workflow run panel still shows generic guidance. This means the execution failure payload likely lacks precise values such as:

- `nodeId`
- `nodeName` or `nodeLabel`
- `nodeType`
- `operation`
- `fieldName`
- `fieldKey`
- `fieldLabel`
- `reason`
- `helpText`
- `nextSteps`

Without these values, `workflow-guidance.ts`, `WorkflowBuilder.tsx`, `OutputPanel.tsx`, and `PropertiesPanel.tsx` must fall back to generic cards.

### 2. Missing credential status can win over missing input status

The workflow screenshot shows an active Supabase connection but the run panel still says "Connect your account to continue" and reports `EXECUTION_MISSING_CREDENTIALS`.

Likely causes to audit:

- A stale or broad credential readiness result is being reused after a valid provider connection exists.
- The execution error classifier chooses `EXECUTION_MISSING_CREDENTIALS` before checking operation-specific missing inputs.
- The credential checker validates provider presence but not the node-specific selected credential id consistently.
- The frontend receives both credential and input issues but displays the credential guidance first.

Expected precedence:

- If a required credential is genuinely missing, show the credential issue with node name and provider.
- If the credential is active and inputs are missing, show input issues.
- If both are missing, show both, grouped by node.
- Never show a generic connection panel when structured input issues exist for the same failing node.

### 3. Debug node execution does not use the same readiness contract as full workflow execution

The debug node panel displays generic "One more thing to check" guidance even while the Properties panel knows the selected node and fields.

Likely causes to audit:

- The debug-node run endpoint has a separate validation path.
- It returns `output: null` and generic `guidedError` without `missingInputs`.
- It catches runtime validation errors and strips structured details.
- It does not call the shared operation-aware field policy resolver before executing the node.

Expected behavior:

- Running a single node in debug mode should produce the same `NodeReadinessIssue[]` structure as running the full workflow.
- The debug output panel should show exact node and field guidance.
- The middle Properties panel should highlight the same field.

### 4. Setup/missing-items discovery may not be fully operation-aware

Files to audit:

- `worker/src/services/workflow-lifecycle-manager.ts`
- `worker/src/services/ai/credential-input-discovery.ts`
- `worker/src/api/workflows-missing-items.ts`

`credential-input-discovery.ts` calls `workflowLifecycleManager.discoverNodeInputs(workflow)`. If this discovery still depends on static schema required arrays, `def.requiredInputs`, or broad config schema requirements, it can miss operation-specific requirements.

Expected behavior:

- Missing-items discovery, workflow execution readiness, and debug-node readiness should all use the same operation-aware resolver.
- The source of truth for required inputs must be `resolveFieldPolicyForNode` plus `resolveOperationContract`, not scattered local lists.

### 5. Field keys may not be normalized between backend and frontend

The Properties panel can highlight fields only when backend details include keys that match the frontend schema field ids.

Likely mismatches:

- Backend sends `data` but frontend expects a nested field id.
- Backend sends `filters` as an object path while frontend expects the top-level field key.
- Backend sends a label but no stable key.
- Backend sends operation-specific field names that do not exist in the active schema after `pickActiveInputSchema`.

Expected behavior:

- Every missing input issue must include a stable top-level `fieldKey`.
- Include optional `fieldPath` only for nested details.
- Include `fieldLabel` for display.
- Include `nodeId` for focusing the node.

### 6. Docs, schemas, and runtime contracts are fragmented

Existing documentation and contracts live in multiple places. That is fine, but the runtime should not infer requirements from prose docs.

Expected source hierarchy:

1. Runtime readiness source: backend node definition, operation contracts, field policy, active input schema.
2. Display label/help source: active input schema field metadata and docs-content mappings.
3. AI guidance source: only summarizes structured issues; it must not invent missing fields.

## Proposed Shared Payload

Create or standardize a shared issue shape similar to this:

```ts
type NodeReadinessIssue = {
  kind: 'missing_input' | 'missing_credential' | 'invalid_input';
  code: string;
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  provider?: string;
  operation?: string;
  fieldKey?: string;
  fieldPath?: string[];
  fieldLabel?: string;
  message: string;
  reason?: string;
  helpText?: string;
  nextSteps?: string[];
};
```

Backend error details should include:

```ts
{
  readinessIssues: NodeReadinessIssue[];
  missingInputs: NodeReadinessIssue[];
  missingCredentials: NodeReadinessIssue[];
}
```

Keep legacy arrays if existing frontend code depends on them, but make `readinessIssues` the canonical structured list.

## Required Universal Node Audit

The next session should add or use a node-contract audit that walks every registered node definition and every operation variant. The audit should verify:

- Every operation-specific required field exists in the active input schema.
- Every required field has a stable frontend-resolvable `fieldKey`.
- Every credential requirement can be represented as a structured credential issue.
- Every required field has a display label.
- Every required field can resolve useful setup/help/recommendation text from schema metadata or docs-content.
- Operation contracts and field policies do not disagree about active required fields.
- Hidden or inactive fields are not reported as missing.
- Fill modes are respected, including user-provided, AI-built, and runtime-provided values.

This audit must include all nodes. Supabase should remain the first regression fixture only because it is the reported failure.

## Implementation Plan For Next Codex Session

### 1. Trace the actual failing payloads

Reproduce these cases locally or from logs:

- Workflow run: Supabase node with active connection, operation `Insert`, table set, `data` empty.
- Debug node run: same Supabase node and operation.
- Missing credential: same node with no selected/valid connection.

Capture the exact JSON returned to the frontend for each case.

Confirm whether the payload contains:

- `missingInputs`
- `missingCredentials`
- `runtimeValidationIssues`
- `readinessIssues`
- node ids
- field keys
- operation

### 2. Create one backend readiness resolver

Add a single shared backend function that takes:

- workflow or node
- node definition
- current config
- selected fill modes
- credential readiness result

It should return a normalized `NodeReadinessIssue[]`.

It must use:

- `resolveFieldPolicyForNode`
- `resolveOperationContract`
- `pickActiveInputSchema`
- backend node definitions and registry overrides

It must not use prose docs as the source of required fields.

### 3. Wire the resolver into all readiness paths

Use the shared resolver in:

- Workflow missing-items endpoint: `worker/src/api/workflows-missing-items.ts`
- Workflow lifecycle input discovery: `worker/src/services/workflow-lifecycle-manager.ts`
- Credential/input discovery: `worker/src/services/ai/credential-input-discovery.ts`
- Full workflow execution validation path
- Dynamic node executor failure path
- Debug/test-node execution endpoint

The important goal is one issue contract across:

- setup checks
- full workflow run
- single node debug run
- execution failure details

### 4. Fix classification and precedence

Ensure error classification follows this model:

- Only emit `EXECUTION_MISSING_CREDENTIALS` when at least one real credential issue exists.
- Emit `EXECUTION_MISSING_INPUTS` when missing or invalid required fields are the blocker.
- Emit `EXECUTION_NOT_READY` when both credential and input issues exist.
- Do not let generic credential guidance override structured input issues.

### 5. Keep the frontend panels dynamic

Audit:

- `ctrl_checks/src/lib/workflow-guidance.ts`
- `ctrl_checks/src/pages/WorkflowBuilder.tsx`
- `ctrl_checks/src/components/workflow/debug/OutputPanel.tsx`
- `ctrl_checks/src/components/workflow/PropertiesPanel.tsx`

Required behavior:

- Workflow run panel groups issues by node.
- Debug node panel shows the current node and exact field.
- Properties panel field errors resolve by `fieldKey`.
- Panels show operation-aware help text.
- Generic guidance appears only when no structured details exist.

### 6. Connect field help without hallucination

Use runtime schema labels/help and existing docs content:

- `ctrl_checks/src/docs-content/nodes/*.doc.ts`
- `ctrl_checks/src/docs-content/node-field-content.ts`
- `ctrl_checks/src/docs-content/node-content-overrides.ts`

AI guidance can rewrite or summarize only the structured issue list. It should never choose required fields by itself.

### 7. Add focused regression tests

At minimum, add coverage for:

- Supabase Insert with active connection and missing `data` returns a missing input issue for `data`, not missing credentials.
- Supabase Insert debug-node run returns the same missing input issue.
- Missing Supabase credential returns a credential issue with node id and provider.
- A workflow with both missing credential and missing input returns both issues.
- Frontend guidance maps structured `missingInputs` into specific panel text.
- Properties panel can resolve and display the field error for `data`.

Also add a contract coverage test over node definitions if feasible:

- For each node operation contract, required fields must exist in the active input schema.
- Required field ids must be stable top-level keys that the frontend can highlight.
- For each documented operation, the readiness resolver can produce field labels and setup guidance without using AI to invent requirements.

## Acceptance Criteria

- With an active Supabase connection, operation `Insert`, table `users`, and empty `data`, workflow run shows a panel pointing to `Supabase` and `Data`.
- The same scenario in debug-node mode shows `Supabase`, operation `Insert`, and missing `Data` in the debug output panel.
- The Properties panel highlights or annotates the missing `Data` field.
- Missing credential guidance appears only when the credential is truly missing or inactive.
- Panels never use the generic "one more thing to check" fallback when structured node/field details are available.
- All blocking issues across all nodes are grouped by node and deduped.
- The same readiness resolver supports every node type and operation, not only Supabase.
- There is a test or audit that iterates all registered node definitions and validates required-field/readiness metadata.
- Existing UI layout remains stable.
- Tests cover both backend issue generation and frontend issue rendering.
