# Workflow Run Readiness Guidance Handoff

Date: 2026-07-25

## User-Facing Problem

Debug-node readiness is now mostly specific: for Supabase Insert with missing `data`, the debug output panel can show `Input: Data for Supabase (Insert)`.

Full workflow Run still shows generic connection/setup guidance, for example:

- `Connect your account to continue`
- `Last error code: EXECUTION_MISSING_CREDENTIALS`
- generic next steps for connecting Supabase

This is wrong when the real blocker is an operation-specific field, such as Supabase Insert missing `data`, and the Supabase connection is already active.

There is also still a red destructive error toast/panel in debug-node runs:

- Toast title: `Execution Failed`
- Description: `This node needs configuration before it can run`
- Red destructive styling

The desired UX is guidance-first everywhere. Readiness/configuration problems should be presented as calm, structured guidance, not as user-facing red error panels/toasts.

## Important Product Principle

Readiness failures are not application failures from the user's perspective. They are setup guidance moments.

The UI should not show raw error language, red destructive panels, or exposed internal codes for expected setup/readiness states. It should show guided information with:

- node name
- operation
- exact field
- whether the missing item is an input or connection
- deterministic next steps
- technical details only behind an optional disclosure

## Current Relevant Implementation

### Backend Readiness Contract Already Exists

The shared resolver was added at:

- `worker/src/core/readiness/node-readiness-resolver.ts`

It exports:

- `buildNodeInputReadinessIssues`
- `buildCredentialReadinessIssues`
- `buildWorkflowReadinessIssues`
- `buildReadinessDetails`
- `readinessErrorCode`

It produces canonical structured issues:

- `kind: "missing_input"`
- `kind: "missing_credential"`
- `kind: "invalid_input"`

Each issue can include:

- `nodeId`
- `nodeType`
- `nodeLabel`
- `operation`
- `operationLabel`
- `fieldKey`
- `fieldName`
- `fieldLabel`
- `fieldType`
- `inputType`
- `message`
- `reason`
- `helpText`
- `examples`
- `nextSteps`
- `recommendations`

The frontend guidance formatter already prioritizes `details.readinessIssues` in:

- `ctrl_checks/src/lib/workflow-guidance.ts`

Specifically:

- `extractMissingInputs(details)` first reads `details.readinessIssues` for `missing_input` and `invalid_input`
- `extractMissingCredentials(details)` first reads `details.readinessIssues` for `missing_credential`
- `mapWorkflowIssueToGuidance()` routes readiness codes to `buildReadinessGuidance()`

This means the frontend can render specific workflow readiness guidance if the backend response includes canonical readiness details.

## Root Cause

### 1. Full Workflow Run Does Not Use the Same Backend Path as Debug Node

Debug node runs call:

- frontend: `ctrl_checks/src/components/workflow/debug/DebugPanel.tsx`
- endpoint: `${ENDPOINTS.itemBackend}/execute-node`
- backend: `worker/src/api/execute-node.ts`

Normal workflow Run calls:

- frontend: `ctrl_checks/src/pages/WorkflowBuilder.tsx`
- endpoint: `${ENDPOINTS.itemBackend}/api/distributed-execute-workflow`
- backend: `worker/src/api/distributed-execute-workflow.ts`

The previous fix wired the canonical readiness resolver into `execute-node.ts` and parts of `execute-workflow.ts`, but the normal Run button is primarily using `distributed-execute-workflow.ts`.

### 2. `distributed-execute-workflow.ts` Still Builds a Legacy Readiness Payload

In `worker/src/api/distributed-execute-workflow.ts`, the readiness payload is built manually from:

- `workflowLifecycleManager.validateExecutionReady(...)`
- `credentialDiscoveryPhase.discoverCredentials(...)`
- `workflowLifecycleManager.discoverNodeInputs(...)`
- local `allMissingInputs`
- local `missingCredentialsCount`

It creates `readinessCheck` with legacy fields:

- `missingInputs`
- `missingCredentials`
- `missingInputsCount`
- `missingCredentialsCount`
- `executionValidationErrors`
- `executionValidationMissingCredentials`

It does not use:

- `buildWorkflowReadinessIssues(...)`
- `buildReadinessDetails(...)`
- `readinessErrorCode(...)`

So full workflow Run often returns no `details.readinessIssues`, and the frontend cannot prefer the exact operation-aware field issue.

### 3. Credential-First Branches Can Mask Missing Input Fields

`distributed-execute-workflow.ts` has multiple early rejection branches:

- phase/status not ready: returns `EXECUTION_NOT_READY`
- `allMissingInputs.length > 0`: returns `EXECUTION_MISSING_INPUTS`
- `!credentialsAttached`: returns `EXECUTION_MISSING_CREDENTIALS`
- `executionPreflight` failure: returns `EXECUTION_MISSING_CREDENTIALS`

The screenshot shows:

- `Last error code: EXECUTION_MISSING_CREDENTIALS`
- guidance title: `Connect your account to continue`

That means the distributed endpoint is classifying the run as credential-missing before the UI gets a canonical issue list that includes the real field blocker.

Possible causes to verify:

- the saved workflow in DB does not contain the active `connectionRefs`
- `credentialDiscoveryPhase.discoverCredentials(...)` does not treat saved `connectionRefs` as satisfying the requirement
- `executionPreflight(...)` does not use the same active connection lookup logic as debug-node
- the distributed endpoint overwrites/returns legacy `missingCredentials` even when canonical readiness has missing inputs

### 4. The Frontend Is Ready for Structured Issues, But the Full Workflow Payload Is Missing Them

In `WorkflowBuilder.tsx`, the failed distributed run path does:

```ts
getWorkflowGuidanceWithSetupContext(
  { code: errorCode, message: errorMessage, hint: errorHint, details: errorData.details || errorData },
  nodes as any[],
  { phase: errorData.phase, operation: 'run' }
).then(setExecutionGuidance);
```

This is fine only if `errorData.details` contains `readinessIssues`.

If the details only contain legacy `missingCredentials`, `workflow-guidance.ts` will build connection guidance. That is exactly what is visible in the screenshot.

### 5. Debug Node Still Uses Destructive Toasts for Readiness/Configuration Outcomes

In `ctrl_checks/src/components/workflow/debug/DebugPanel.tsx`, failed node execution paths still call destructive toasts:

- node missing: `toast({ title: 'Error', variant: 'destructive' })`
- non-OK response: `toast({ title: 'Execution Failed', ..., variant: 'destructive' })`
- output failure: `toast({ title: 'Execution Failed', ..., variant: 'destructive' })`
- `data.success === false`: destructive toast
- catch block: destructive toast

This is the red toast in the screenshot.

The structured guidance card in `OutputPanel.tsx` is good, but the destructive toast is still emitted by the debug wrapper.

### 6. `OutputPanel.tsx` Has a String Error Red Panel Fallback

In `ctrl_checks/src/components/workflow/debug/OutputPanel.tsx`, structured object errors use `GuidedStatusCard`, but plain string errors still render:

```tsx
{typeof error === 'string' && (
  <div className="px-4 py-3 bg-destructive/10 border-b border-border">
    <p className="text-sm text-destructive font-mono">{error}</p>
  </div>
)}
```

This can surface red error UI whenever a debug-node failure is stored as a string.

### 7. User-Facing Reliability Status Exposes Internal Error Codes

In `ctrl_checks/src/pages/WorkflowBuilder.tsx`, `shouldShowReliabilityStatus` displays:

- `Last error code: EXECUTION_MISSING_CREDENTIALS`

For setup/readiness outcomes, this should not be a prominent user-facing card. It should either be hidden for expected readiness codes or moved into technical details of a guided panel.

## Required Universal Fix

Do not add Supabase-specific logic.

The fix must make workflow Run, debug-node Run, setup checks, and panels consume the same canonical readiness contract for all nodes and operations.

### Backend Requirements

1. In `worker/src/api/distributed-execute-workflow.ts`, compute canonical readiness before any legacy readiness rejection:

```ts
const readinessIssues = buildWorkflowReadinessIssues({
  nodes,
  credentials: credentialDiscovery.missingCredentials || [],
});
const readinessDetails = buildReadinessDetails(readinessIssues);
```

2. Merge canonical readiness into `readinessCheck`:

```ts
const readinessCheck = {
  workflowId,
  phase: workflowPhase,
  status: workflowStatus,
  ...readinessDetails,
  legacyMissingInputs: ...,
  legacyMissingCredentials: ...,
};
```

3. Use `readinessErrorCode(readinessDetails.readinessIssues)` for readiness responses.

4. When both credentials and inputs are missing, include both in `readinessIssues`.

5. When an active connection exists, do not emit `missing_credential` for that node.

6. Ensure the distributed endpoint evaluates all nodes and all operations before returning, so the panel can list every missing field across the workflow.

7. The `executionPreflight` branch must not overwrite canonical `readinessIssues`. If it finds credentials missing, convert them to canonical `missing_credential` issues and merge/dedupe with field issues.

8. Do not return only legacy `missingCredentials`/`missingInputs`. Preserve legacy fields if needed, but canonical fields must be the primary contract:

- `readinessIssues`
- `missingInputs`
- `missingCredentials`
- `invalidInputs`
- `runtimeValidationIssues`
- `issues`

9. Verify saved workflow `connectionRefs` behavior. If debug node has the active connection but full workflow does not, find where connection refs are lost:

- save workflow path
- attach-inputs path
- DB stored `nodes`
- distributed endpoint DB fetch
- credential discovery/preflight active connection lookup

### Frontend Requirements

1. Workflow Run panel must render full-workflow readiness from `details.readinessIssues`, not generic connection guidance.

2. For each missing input, show:

- Input
- field label
- node label
- operation label
- deterministic help text

Example:

```text
Input: Data for Supabase (Insert)
```

3. If multiple nodes have missing inputs, list all of them in the same guided panel.

4. If credentials are actually missing, still show connection guidance.

5. If both missing input and missing credential exist, show both categories, but do not let a credential-only title mask field blockers. Suggested title:

```text
Finish setup before running
```

6. Remove destructive red toasts for expected readiness/configuration outcomes in debug-node and workflow Run paths.

7. Debug node should keep the inline `GuidedStatusCard`, and failed readiness should not also trigger a red toast.

8. Replace the string-error red panel fallback in `OutputPanel.tsx` with a guidance-style card, or normalize all debug errors to structured records before they reach the panel.

9. Hide or translate `Last error code: ...` for expected readiness codes:

- `EXECUTION_NOT_READY`
- `EXECUTION_MISSING_INPUTS`
- `EXECUTION_MISSING_CREDENTIALS`
- `WORKFLOW_NOT_CONFIRMED`
- `WORKFLOW_SETUP_PENDING`

If technical diagnostics are needed, put them behind the guided card's technical details disclosure.

## Files to Inspect/Change

Backend:

- `worker/src/core/readiness/node-readiness-resolver.ts`
- `worker/src/api/distributed-execute-workflow.ts`
- `worker/src/api/execute-workflow.ts`
- `worker/src/api/execute-node.ts`
- `worker/src/services/execution-preflight.ts`
- `worker/src/services/ai/credential-discovery-phase.ts`
- `worker/src/services/workflow-lifecycle-manager.ts`
- `worker/src/api/workflows-configure.ts`
- `worker/src/api/workflow-setup-lifecycle.ts`

Frontend:

- `ctrl_checks/src/pages/WorkflowBuilder.tsx`
- `ctrl_checks/src/lib/workflow-guidance.ts`
- `ctrl_checks/src/components/workflow/debug/DebugPanel.tsx`
- `ctrl_checks/src/components/workflow/debug/OutputPanel.tsx`
- `ctrl_checks/src/components/workflow/PropertiesPanel.tsx`
- `ctrl_checks/src/components/workflow/ExecutionResultNotification.tsx`
- `ctrl_checks/src/lib/executionNotifications.ts`
- `ctrl_checks/src/hooks/useExecutionNotifications.ts`
- `ctrl_checks/src/components/ui/guided-status-card.tsx`
- `ctrl_checks/src/components/ui/toast.tsx`

## Regression Cases

### Case 1: Supabase Insert, Active Connection, Missing Data

Setup:

- Node type: `supabase`
- Operation: `insert`
- `table` filled
- `data` empty/missing
- Supabase connection active

Expected debug-node:

- no red destructive toast
- guided card says missing `Data`
- `fieldKey: data`
- `operation: insert`
- no missing credential

Expected full workflow Run:

- no generic `Connect your account to continue`
- no `EXECUTION_MISSING_CREDENTIALS` visible as main UX
- guided workflow panel lists `Input: Data for Supabase (Insert)`
- `details.readinessIssues[0].kind === "missing_input"`
- `details.missingCredentials.length === 0`

### Case 2: Supabase Insert, No Connection, Missing Data

Expected:

- one missing input issue for `data`
- one missing credential issue for Supabase
- guided panel lists both categories
- no destructive red toast

### Case 3: Multiple Nodes Missing Operation-Specific Fields

Example:

- Supabase Insert missing `data`
- Google Sheets Append missing `sheetName`
- Slack Message missing `channel` or `message`

Expected:

- full workflow Run returns all missing fields in `readinessIssues`
- panel lists all fields with node + operation
- no single generic credential/setup message masks the list

### Case 4: Missing Credential Only

Expected:

- missing credential guidance still works
- panel explains exactly which account/node needs connection
- no missing input shown

### Case 5: Invalid Required Input

Example:

- field expects object/array but receives string

Expected:

- `kind: "invalid_input"`
- field highlighted in Properties panel
- guided panel explains field and expected type

## Test Plan

### Backend Tests

Add or extend tests for `distributed-execute-workflow.ts`:

- active connection + Supabase Insert + empty data returns canonical `readinessIssues` with missing input only
- missing connection only returns canonical missing credential
- both missing input and missing credential includes both
- multiple node workflow returns every operation-aware required field
- `executionPreflight` failures merge into canonical readiness instead of overwriting it
- saved `connectionRefs` are honored in full workflow execution

Existing resolver tests:

- keep/extend `worker/src/core/readiness/__tests__/node-readiness-resolver.test.ts`

### Frontend Tests

Add/extend:

- `ctrl_checks/src/lib/__tests__/workflow-guidance.test.ts`
- debug panel/output panel tests if available
- WorkflowBuilder run error mapping test if available

Assertions:

- `details.readinessIssues` with Supabase `data` renders `Input: Data for Supabase (Insert)`
- legacy `missingCredentials` does not win when canonical missing input exists
- debug-node readiness failure does not call destructive toast
- string error fallback in `OutputPanel` does not render red destructive panel for readiness/configuration messages
- readiness error codes are not shown in the prominent reliability status card

## Verification Commands

Run focused checks first:

```powershell
cd worker
npm test -- --runInBand --no-coverage --silent src/core/readiness/__tests__/node-readiness-resolver.test.ts
npm test -- --runInBand --no-coverage --silent src/api/__tests__/distributed-execute-workflow*.test.ts
npm run type-check
```

```powershell
cd ctrl_checks
npm run test:vitest -- src/lib/__tests__/workflow-guidance.test.ts
npm run build
```

Then run a manual live/browser check:

1. Open a workflow with Supabase Insert.
2. Confirm Supabase connection is active.
3. Leave `data` empty.
4. Click Debug Node -> Run Node.
5. Click full workflow Run.
6. Confirm both surfaces show the same missing `Data` guidance and no red destructive toast.
image.png