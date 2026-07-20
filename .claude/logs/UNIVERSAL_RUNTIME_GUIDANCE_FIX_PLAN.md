# Universal Runtime Guidance Fix Plan

Date: 2026-07-13
Repo: `ctrlchecks-hostinger`

## Problem Statement

The workflow/debug guidance system is now able to show dynamic node/field guidance, but it is still too noisy in some cases.

The current visible issue:

- The workflow-level card says:
  - `Fill in the remaining fields`
  - `Form Trigger -> Allow Multiple Submissions`
  - `Form Trigger -> Require Authentication`
  - `Form Trigger -> Captcha`
- These fields are not necessarily execution blockers.
- `false` for a boolean toggle is a valid configured value, not an empty value.
- Optional fields, disabled fields, credential-owned fields, provider defaults, and operation-irrelevant fields should not create guidance.

This is a product correctness issue. Guidance must only appear when the missing/invalid value matters for the current operation.

## Desired Behavior

Guidance should be shown only when:

- A required field for the selected operation is missing.
- A conditionally required field is missing and its condition is active.
- A runtime-AI field failed to resolve and is required for execution.
- A credential/connection required for the operation is missing or invalid.
- A provider/API rejects the operation with a real actionable error.
- A graph/topology issue prevents the workflow from running.

Guidance should not be shown when:

- A boolean field is explicitly `false`.
- An optional field is empty.
- A field is disabled in `_fieldEnabled`.
- A field is managed by credentials or provider defaults.
- A field is inactive for the selected operation/resource.
- A node did not run because its branch was not selected.
- A debug-node provider response is informational and not a failure.

## Current Root-Cause Hypothesis

The remaining bug is likely in the universal frontend guidance collector and/or validation layer:

- `buildWorkflowGuidanceContext()` validates every schema required field without fully applying:
  - operation contracts
  - operation field policies
  - boolean `false` validity
  - `_fieldEnabled`
  - conditional required logic
  - provider defaults
  - node-specific runtime contract requirements from backend
- The workflow card may also merge local frontend validation with backend error details too eagerly.
- The UI may show frontend-derived missing inputs even when the backend did not report them as blockers.

Important: fix this at the shared validation/guidance pipeline, not by adding node-specific exceptions for Form Trigger, Slack, Gmail, etc.

## What Has Already Been Fixed

Previous Codex work added:

- Dynamic workflow-level guidance enrichment.
- Dynamic debug-node runtime validation guidance.
- Placeholder-like AI-built value filtering.
- Provider-level debug failure classification.
- Slack `not_in_channel` guidance.

These are good foundations, but the missing-field classifier still needs stricter execution relevance filtering.

## Universal Fix Strategy

### 1. Define A Single "Execution-Relevant Field" Classifier

Create or identify one shared helper that answers:

```ts
isFieldRequiredForOperation({
  nodeType,
  fieldName,
  fieldSchema,
  nodeConfig,
  operationContract,
  operationFieldPolicy,
  currentOperation,
  currentResource,
  fieldEnabled,
  fillMode,
})
```

It should return:

```ts
{
  required: boolean;
  reason: string;
  source: 'schema' | 'operation_contract' | 'required_if' | 'runtime_contract' | 'provider' | 'disabled' | 'optional';
}
```

This helper must be schema/contract-driven. No `if node.type === 'form'` style logic outside registry/contract metadata.

### 2. Fix Empty-Value Semantics

A value is missing only when it is truly missing for that field type.

Rules:

- `undefined`, `null`, `''`, blank string: empty.
- `false`: not empty for boolean fields.
- `0`: not empty for number fields.
- `[]`: empty only if the field is required and no default/provider behavior exists.
- `{}`: empty only if required and no default/provider behavior exists.
- Placeholder-like AI text: empty only when the field is required for execution.
- Dynamic expressions like `{{$json.email}}`: not empty if they reference a concrete path.
- Generic unresolved expressions like `{{$json}}`, `{{$json.output}}`, `{{ENV.X}}`: empty/invalid if required.

### 3. Respect Field Enablement

If a node config has `_fieldEnabled[fieldName] === false`, the field should not be reported as missing unless the backend operation contract says it is still required.

Example:

- `blocks` disabled on Slack should not be reported.
- `captcha` disabled on Form Trigger should not be reported.

### 4. Respect Operation Field Policies

If backend schema contains `operationFieldPolicies`, use them.

Do not validate inactive fields.

Only validate:

- `fields[fieldName].required === true`
- active `requiredFields`
- conditionally required fields whose condition is active

Skip:

- inactive fields
- provider default fields
- credential fields
- optional fields

### 5. Backend Should Be The Source Of Truth When Available

For save/run execution readiness, prefer backend diagnostics from:

- `details.missingInputs`
- `details.runtimeValidationIssues`
- `details.contractDiagnostics.validationErrors`
- `details.executionValidationIssues`
- `details.schemaValidationFailures`

Frontend local validation should be fallback/context only.

If backend returns a specific error, do not override it with broader local missing-field guesses.

### 6. Debug Node Must Use The Same Rules

Debug-node Properties panel and Output panel should use the same classifier.

The user should see:

- exact field highlighted only when the provider/backend says it blocks this node
- exact provider guidance when provider rejects the call
- no red error under fields that are present or optional

### 7. Provider Errors Are Not Missing Fields

Provider errors should be classified separately.

Examples:

- Slack `not_in_channel`: connection/channel access issue, not missing `message` or `channel`
- Gmail invalid recipient: input format/provider validation issue
- OAuth expired: connection refresh issue
- Rate limit: retry/limit issue

These should not create false "missing field" guidance.

## Required Implementation Areas To Inspect

Frontend:

- `ctrl_checks/src/lib/workflow-guidance-context.ts`
- `ctrl_checks/src/lib/workflow-value-readiness.ts`
- `ctrl_checks/src/lib/workflow-guidance.ts`
- `ctrl_checks/src/lib/ai-error-guidance.ts`
- `ctrl_checks/src/lib/schemaConverter.ts`
- `ctrl_checks/src/components/workflow/PropertiesPanel.tsx`
- `ctrl_checks/src/components/workflow/debug/DebugPanel.tsx`
- `ctrl_checks/src/components/workflow/debug/OutputPanel.tsx`
- `ctrl_checks/src/pages/WorkflowBuilder.tsx`

Backend:

- `worker/src/api/attach-inputs.ts`
- `worker/src/api/execute-node.ts`
- `worker/src/api/execute-workflow.ts`
- `worker/src/core/execution/runtime-field-contract.ts`
- `worker/src/core/execution/dynamic-node-executor.ts`
- `worker/src/core/registry/unified-node-registry.ts`
- `worker/src/core/registry/overrides/*`

## Acceptance Criteria

### Workflow-Level Guidance

For the screenshot case:

- Do not show Form Trigger `Allow Multiple Submissions`, `Require Authentication`, or `Captcha` as missing when they are optional/disabled/defaulted.
- If form fields are valid and required values exist, show no guidance.
- If a real required field is missing, show:
  - node label
  - field label
  - why it matters
  - example value
  - next action

### Debug Node Guidance

For Slack:

- If message exists and channel exists, do not show missing message/channel.
- If Slack returns `not_in_channel`, show channel access guidance.
- Debug status should be error, not success, when output contains provider failure.

### General

- No node-type hardcoding outside registry/contract metadata.
- No optional/default boolean fields treated as missing.
- No generic "one more thing" card when concrete diagnostics exist.
- No broad local validation overriding precise backend/provider diagnostics.
- `npm run build` in `ctrl_checks/` passes.
- `npm run type-check` in `worker/` passes.
- Do not run `npm test`.

## Suggested Verification Matrix

Test these node classes one by one:

1. Trigger nodes
   - form
   - webhook
   - schedule
   - manual trigger

2. Communication nodes
   - Slack message
   - Gmail
   - Discord/Teams if available

3. Logic nodes
   - Switch
   - If/Else
   - Merge/log output

4. Data/API nodes
   - HTTP request
   - Google Sheets
   - database nodes

For each:

- all required fields filled -> no guidance
- one required field missing -> exact guidance
- optional field empty -> no guidance
- boolean false -> no guidance
- disabled field -> no guidance
- provider rejection -> provider guidance, not missing field guidance

## Recommended Architecture

The ideal end state:

```text
Backend registry / operation contracts
        |
        v
Execution relevance classifier
        |
        +--> workflow save/run guidance
        +--> debug-node field highlighting
        +--> runtime validation details
        +--> AI guidance context
```

There should be one shared interpretation of:

- required
- optional
- disabled
- provider-owned
- runtime-generated
- buildtime-generated
- defaulted
- operation-active

## Notes For Next Agent

Do not patch the visible Form Trigger fields directly. They are only a symptom.

The right fix is a universal field relevance/requiredness classifier used by both:

- workflow-level guidance
- debug-node guidance

Be careful not to regress the good behavior already added:

- dynamic missing field guidance
- runtime validation guidance
- provider error guidance
- placeholder-like AI-built filtering
