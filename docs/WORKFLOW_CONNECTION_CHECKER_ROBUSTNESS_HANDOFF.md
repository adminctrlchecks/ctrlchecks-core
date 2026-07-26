# Universal Workflow Connection And Setup Checker Handoff

Date: 2026-07-26

Purpose: preserve the universal product intent, root-cause analysis, implementation plan, code touchpoints, acceptance criteria, tests, and next-chat goal for the workflow connection/setup checker work. This document is intentionally provider-neutral and node-neutral. It must not rely on any specific provider, node type, operation, or field name.

No runtime behavior was changed while writing this document.

## Core Principle

The workflow editor should treat readiness as a workflow-level setup contract.

One saved connection for a provider should be sufficient for every node in a workflow that can use that provider when the saved connection and runtime credential satisfy the union of the exact operation requirements for those nodes.

The UI must not imply that every node needs its own separate provider connection. It should say, in universal language, that one compatible connection can cover all listed nodes for that provider when it has the required permissions/configuration.

Backend readiness must remain row-level and exact. Frontend presentation may group rows for clarity. Do not remove node/operation detail from the backend contract.

## Universal Desired User Flow

1. User opens or reloads any workflow.
2. The editor immediately asks the backend for canonical readiness for that workflow.
3. The backend reads the persisted workflow definition and checks current database-backed connection/runtime state.
4. The UI shows no blocking panel if all setup requirements are ready.
5. If provider/account setup is incomplete, the UI shows provider-level groups.
6. Each provider group lists all affected nodes and operations under that one provider requirement.
7. A single connect/reconnect/select/repair action should address that provider group whenever possible.
8. OAuth or credential setup should request/use the union of required requirements for the provider group.
9. Returning from connection setup immediately refetches canonical readiness.
10. The blocking panel closes automatically once canonical readiness is ready.
11. If configuration inputs are missing or invalid, the setup panel lists exact node, operation, field label, and reason.
12. Run proceeds only after the latest readiness check passes.
13. Run still rechecks immediately before execution to avoid stale state.

## Product Rules

- Do not hard-code any provider.
- Do not hard-code any node type.
- Do not hard-code any operation.
- Do not hard-code any field.
- Use registries/contracts as the source of truth.
- Backend remains canonical for readiness.
- Frontend groups readiness for human clarity only.
- Expected readiness failures are setup guidance, not destructive technical failures.
- Technical details belong behind disclosure/debug surfaces.

## Requested UI Change

Replace the combined `Save & Run` action with a deliberate setup checker action.

Current code locations:

- `ctrl_checks/src/components/workflow/WorkflowHeader.tsx:277` currently calls `onRun(true)`.
- `ctrl_checks/src/components/workflow/WorkflowHeader.tsx:287` currently renders `Save & Run`.
- `ctrl_checks/src/components/workflow/WorkflowHeader.tsx:278` currently disables the action based on running/saving/schedule/missing connection count.

Target behavior:

- Keep `Save`.
- Replace `Save & Run` with `Check Setup`.
- `Check Setup` should run the unified readiness check.
- If needed, it should first persist the current workflow state so backend readiness checks the same graph the user sees.
- It should open a structured setup panel.
- The panel must list provider/account groups, missing input issues, invalid input issues, node, operation, reason, and next action.
- Run should be disabled until the latest setup check passes.
- Run should still recheck immediately before execution.

## Current Backend Architecture

### Canonical Connection Readiness Service

Primary file:

- `worker/src/services/workflow-connection-readiness.ts:467` exports `getWorkflowConnectionReadiness`.

Important touchpoints:

- `worker/src/services/workflow-connection-readiness.ts:486` resolves the node requirement through a registry-driven requirement lookup.
- `worker/src/services/workflow-connection-readiness.ts:519` collects explicit connection references from node data/config.
- `worker/src/services/workflow-connection-readiness.ts:525` validates explicit references safely.
- `worker/src/services/workflow-connection-readiness.ts:546` returns an ambiguity/select state when more than one compatible active connection exists and no explicit selection is available.
- `worker/src/services/workflow-connection-readiness.ts:569` checks saved connection row status and expiry.
- `worker/src/services/workflow-connection-readiness.ts:597` checks runtime credential readiness.
- `worker/src/services/workflow-connection-readiness.ts:619` summarizes invalid reference count.
- `worker/src/services/workflow-connection-readiness.ts:620` summarizes runtime-missing count.
- `worker/src/services/workflow-connection-readiness.ts:621` summarizes missing-scope count.

Canonical statuses:

- `ready`: saved connection and runtime credential are usable.
- `missing`: no compatible active saved connection exists.
- `invalid_ref`: explicit reference is invalid, wrong, unavailable, or ambiguous.
- `runtime_missing`: visible saved connection exists but runtime credential is missing.
- `missing_scope`: runtime credential exists but lacks exact required permission/scope coverage.
- `expired`: saved connection or runtime credential is expired or refresh failed.
- `revoked`: connection was revoked.
- `error`: unexpected readiness check failure.

Implementation rule:

- Do not collapse backend rows into provider-only summaries. Keep exact row-level node/operation detail and group only in UI or response helper layers designed for presentation.

### Requirement Registry

Primary file:

- `worker/src/services/credential-scope-registry.ts:206` exports `credentialRequirementForNode`.

Important behavior:

- The requirement resolver maps node and operation contracts to provider requirements.
- It must use operation-specific contracts where available.
- It must fall back to connector registry metadata for credential-capable nodes outside direct scope maps.
- It must not be expanded with hard-coded one-off provider/node logic for this feature.

Next-stage requirement:

- Preserve exact operation-level requirement resolution.
- Add or use a provider grouping layer that unions requirements across readiness rows for UI repair actions.
- Do not change the canonical requirement source into a UI grouping mechanism.

### Runtime Credential Resolver

Primary file:

- `worker/src/services/credential-resolver.ts`

Important behavior:

- Queries runtime credentials by normalized user and provider.
- Selects a credential whose stored requirement set covers the required operation set.
- Returns missing-scope behavior when a runtime credential exists but does not cover the current operation requirement.
- Returns not-found behavior when no runtime credential exists.
- Refreshes expiring credentials when possible.

Universal root cause represented here:

- A visible saved connection row does not always prove runtime execution readiness.
- Runtime readiness requires a usable credential with exact required coverage.

### Readiness Envelope

Primary file:

- `worker/src/core/readiness/workflow-readiness-aggregator.ts:99` calls `getWorkflowConnectionReadiness`.

Returned contract:

- `ready`
- `summary`
- `readinessIssues`
- `missingInputs`
- `missingCredentials`
- `invalidInputs`
- `runtimeValidationIssues`
- `issues`
- `groupedIssues`
- `connectionReadiness`
- optional `technicalDetails`

Implementation rule:

- All run, debug, save/open readiness, and setup-check UI should consume this same contract or a strict superset of it.

### Missing Items Endpoint

Primary file:

- `worker/src/api/workflows-missing-items.ts`

Important behavior:

- Loads persisted workflow nodes/graph from the database.
- Builds canonical readiness envelope.
- Returns `connectionReadiness` and top-level readiness fields.

Frontend hook:

- `ctrl_checks/src/hooks/useWorkflowConnectionStatus.ts:139` fetches `/api/workflows/:workflowId/missing-items`.
- `ctrl_checks/src/hooks/useWorkflowConnectionStatus.ts:145` uses `cache: 'no-store'`.
- `ctrl_checks/src/hooks/useWorkflowConnectionStatus.ts:165` uses `refetchOnMount: 'always'`.
- `ctrl_checks/src/hooks/useWorkflowConnectionStatus.ts:166` uses `refetchOnWindowFocus: true`.

Next-stage requirement:

- Ensure every workflow open/reload/reopen path actually mounts or invokes this readiness query with the correct workflow id.
- Add explicit post-load recheck if route/store timing can leave stale data.

### Execution Consumers

Distributed execution:

- `worker/src/api/distributed-execute-workflow.ts:290` builds readiness envelope.
- It should return the shared readiness fields when blocked.

Synchronous execution:

- `worker/src/api/execute-workflow.ts:18889` calls execution preflight.
- `worker/src/api/execute-workflow.ts:19084` builds readiness envelope.
- `worker/src/api/execute-workflow.ts:19248` blocks execution when readiness issues exist.

Debug node:

- `worker/src/api/execute-node.ts` builds readiness envelope before single-node execution.

Attach inputs:

- `worker/src/api/attach-inputs.ts` calls canonical connection readiness during workflow phase transition logic.

Adaptive UI:

- `worker/src/services/adaptive-ui/adaptive-ui-engine.ts` calls canonical connection readiness and includes it in setup guidance.

Implementation rule:

- These paths must remain aligned. A workflow cannot be "ready" in one path and "not ready" in another due to different sources of truth.

## Current Database Architecture

Visible saved connection:

- `worker/prisma/migrations/0002_credentials_connections_system.sql:45` creates `connections`.
- `connections.id` is UUID.
- `connections.user_id` is text.
- `connections.credential_type_id` stores credential type id.
- `connections.provider` stores normalized provider.
- `connections.auth_type` stores the credential auth type.
- `connections.status` can be `active`, `expired`, `error`, or `revoked`.
- `connections.expires_at` may mark saved connection expiry.

OAuth state:

- `worker/prisma/migrations/0002_credentials_connections_system.sql:65` creates `oauth_states`.
- `oauth_states.scopes` stores requested permission/requirement coverage for the setup flow.
- `oauth_states.return_to` stores the UI return target.

Runtime credential:

- `worker/prisma/migrations/0004_unified_credentials.sql:6` creates `unified_credentials`.
- `worker/prisma/migrations/0004_unified_credentials.sql:21` enforces unique runtime credentials by user, provider, and requirement set.
- `worker/prisma/migrations/0004_unified_credentials.sql:24` indexes active credentials by user/provider.

Multiple named connections:

- `worker/migrations/031_allow_multiple_named_connections.sql:6` indexes user/type/status.
- `worker/migrations/031_allow_multiple_named_connections.sql:9` indexes user/provider/status.
- `worker/migrations/031_allow_multiple_named_connections.sql:12` indexes user/id lookup.

User identity caveat:

- Saved connection and runtime credential stores may use different user id shapes.
- `worker/src/services/user-id-normalizer.ts` normalizes runtime credential lookup.

Implementation rule:

- Any new endpoint or check must use the same user identity normalization path as the canonical services.

## Current Frontend Architecture

Workflow page:

- `ctrl_checks/src/pages/WorkflowBuilder.tsx:138` uses `useWorkflowConnectionStatus`.
- `ctrl_checks/src/pages/WorkflowBuilder.tsx:377` syncs missing connection count into global state.
- `ctrl_checks/src/pages/WorkflowBuilder.tsx:378` reopens the gate when missing connections appear.
- `ctrl_checks/src/pages/WorkflowBuilder.tsx:1176` rechecks after attach-inputs.
- `ctrl_checks/src/pages/WorkflowBuilder.tsx:1198` rechecks before run.
- `ctrl_checks/src/pages/WorkflowBuilder.tsx:1452` renders the current connection gate.

Workflow header:

- `ctrl_checks/src/components/workflow/WorkflowHeader.tsx:239` shows connection warning UI.
- `ctrl_checks/src/components/workflow/WorkflowHeader.tsx:277` current combined save/run action.
- `ctrl_checks/src/components/workflow/WorkflowHeader.tsx:287` current combined save/run label.
- `ctrl_checks/src/components/workflow/WorkflowHeader.tsx:306` disables Run when missing connection count is positive.

Workflow connection gate:

- `ctrl_checks/src/components/workflow/WorkflowConnectionGate.tsx:41` renders the gate.
- `ctrl_checks/src/components/workflow/WorkflowConnectionGate.tsx:108` currently maps missing rows directly.

Required UI shift:

- Replace direct row rendering with universal provider/credential grouping.
- Each group should list affected nodes/operations as children.
- Each group should show the correct action from canonical readiness.
- The group should make clear that one compatible connection can cover all child rows.

Connections page:

- `ctrl_checks/src/pages/Connections.tsx:76` groups workflow issues.
- `ctrl_checks/src/pages/Connections.tsx:252` detects workflow return target.
- `ctrl_checks/src/pages/Connections.tsx:253` runs workflow readiness query while on the connections page.
- `ctrl_checks/src/pages/Connections.tsx:323` handles grouped repair.
- `ctrl_checks/src/pages/Connections.tsx:343` reconnects an existing connection with required coverage.
- `ctrl_checks/src/pages/Connections.tsx:348` starts a new connection flow with required coverage.
- `ctrl_checks/src/pages/Connections.tsx:356` refetches readiness and navigates back if blockers are gone.
- `ctrl_checks/src/pages/Connections.tsx:430` renders workflow repair UI.

Required UI shift:

- Keep grouping universal.
- Do not mention any specific provider in copy.
- Group by provider, credential type, selected connection, and ambiguity state.
- Union required coverage across rows in the group.
- Action once per provider group when possible.

Query invalidation:

- `ctrl_checks/src/lib/queryInvalidation.ts:15` invalidates connection-dependent queries.
- `ctrl_checks/src/lib/queryInvalidation.ts:21` invalidates workflow connection-status queries by root key.
- `ctrl_checks/src/hooks/useConnections.ts:21`, `:30`, `:38`, `:46` invalidate after connection mutations.
- `ctrl_checks/src/components/workflow/PropertiesPanel.tsx:443` invalidates after realtime connection DB changes.

Required behavior:

- Workflow open/reopen should not depend only on invalidation. It should actively fetch current readiness.

## Root Causes To Address

1. Row-level backend data is currently presented as separate connection cards.
   - This can make one provider requirement appear like multiple separate connection requirements.
   - Fix in UI grouping, not by weakening backend detail.

2. Saved connection state and runtime credential state can diverge.
   - A saved connection can be visible and active.
   - Runtime credential can still be missing, expired, revoked, or missing required coverage.
   - UI must explain this as reconnect/repair/select guidance, not as a request to create duplicate connections.

3. Multiple active compatible connections are an ambiguity, not a missing connection.
   - If several compatible connections exist and no explicit reference is selected, UI should say select a connection.
   - Do not auto-pick a connection when account identity matters.

4. Workflow open/reopen must always fetch current readiness.
   - Query settings already help.
   - Verify route changes, workflow store reset, and workflow load do not leave stale readiness data.
   - Add explicit recheck after workflow load if necessary.

5. Combined save/run hides readiness review.
   - Replace with a setup-check action.
   - Keep Run separate and guarded by latest check result.

6. Connection blockers and input blockers need one setup panel.
   - Backend already returns both.
   - Frontend needs a unified presentation component.

7. Expected setup failures should not look like destructive technical failures.
   - Missing/invalid setup is normal workflow guidance.
   - Use calm panels and inline guidance.

## Universal Implementation Plan

### Phase 1: Universal Provider Grouping

Keep backend row-level readiness unchanged.

Add/adjust frontend grouping by:

- provider,
- credential type,
- selected connection id when present,
- ambiguity state when multiple candidates exist.

Each group should include:

- provider label,
- credential label,
- selected connection name if available,
- action from backend readiness,
- status from backend readiness,
- union of required coverage,
- affected nodes,
- affected operations,
- exact reason per child row.

Files likely touched:

- `ctrl_checks/src/components/workflow/WorkflowConnectionGate.tsx`
- `ctrl_checks/src/pages/Connections.tsx`
- `ctrl_checks/src/hooks/useWorkflowConnectionStatus.ts`

Tests:

- Multiple rows with same provider render as one provider group.
- Group preserves all child node/operation reasons.
- Group unions required coverage.
- Ambiguous multiple active connections show select guidance.

### Phase 2: Immediate Readiness On Workflow Open/Reopen

Target behavior:

- Workflow route load triggers readiness fetch.
- Browser reload triggers readiness fetch.
- Returning from connection setup triggers readiness fetch.
- Window focus triggers readiness fetch.
- Before Run triggers readiness fetch.
- After save/attach-inputs triggers readiness fetch.

Existing code already supporting part of this:

- `useWorkflowConnectionStatus` uses `refetchOnMount: 'always'`.
- `useWorkflowConnectionStatus` uses `refetchOnWindowFocus: true`.
- `fetchWorkflowMissingConnections` uses `cache: 'no-store'`.
- `WorkflowBuilder` rechecks before run.
- `Connections` refetches after repair.

Potential additions:

- Explicitly invalidate/refetch after workflow data load completes.
- Track latest readiness check timestamp/status in workflow page state.
- Reset latest check state when workflow id changes or graph becomes dirty.

Files likely touched:

- `ctrl_checks/src/pages/WorkflowBuilder.tsx`
- `ctrl_checks/src/hooks/useWorkflowConnectionStatus.ts`
- `ctrl_checks/src/lib/queryInvalidation.ts`

Tests:

- Opening a workflow calls missing-items/readiness endpoint.
- Reloading the same workflow calls it again.
- Switching workflow ids calls it for the new id.
- Returning from connection setup refetches.

### Phase 3: Replace Combined Save/Run With Check Setup

Target behavior:

- Remove combined save/run action.
- Add `Check Setup`.
- Check Setup runs unified readiness.
- If workflow is dirty and backend readiness only supports persisted workflows, save first.
- If a draft-readiness endpoint is introduced, use it consistently.
- Display unified setup panel with all readiness issue categories.
- Store latest check state.
- Enable Run only when latest check state is ready and workflow has not become dirty since that check.

Files likely touched:

- `ctrl_checks/src/components/workflow/WorkflowHeader.tsx`
- `ctrl_checks/src/pages/WorkflowBuilder.tsx`
- new or updated setup panel component.

Tests:

- Combined save/run action is absent.
- Check Setup action is present.
- Check Setup calls readiness.
- Run disabled until latest check passes.
- Editing workflow after passing check disables Run or marks check stale.

### Phase 4: Unified Setup Panel

Use the shared backend readiness envelope.

Panel sections:

- Provider/account setup groups.
- Missing input issues.
- Invalid input issues.
- Optional technical details disclosure.

For every item show:

- node label,
- operation label when available,
- requirement label,
- reason,
- action.

Do not show:

- raw generic red error strings for expected setup blockers,
- provider-specific hard-coded text,
- node-specific hard-coded text,
- field-specific hard-coded text.

Files likely touched:

- `ctrl_checks/src/components/workflow/WorkflowConnectionGate.tsx` or replacement component.
- `ctrl_checks/src/pages/WorkflowBuilder.tsx`.
- `ctrl_checks/src/components/workflow/WorkflowHeader.tsx`.

Tests:

- Missing connection issue renders in provider section.
- Missing input issue renders in input section.
- Invalid input issue renders in invalid section.
- Expected readiness failures do not produce destructive toast.

### Phase 5: Optional Draft Readiness Endpoint

Current endpoint checks persisted workflow data:

- `GET /api/workflows/:workflowId/missing-items`

If Check Setup must check unsaved graph state, add a universal endpoint:

- `POST /api/workflows/:workflowId/readiness-check`
- Body: candidate workflow nodes/edges.
- Authenticated user required.
- Calls `buildWorkflowReadinessEnvelope`.
- Returns exactly the shared readiness fields.

If product decision is "Check Setup saves before checking", this endpoint can be skipped.

Files likely touched if endpoint is needed:

- new backend API route.
- route registration in backend index.
- frontend API helper/hook.
- tests for persisted and draft readiness consistency.

## Acceptance Criteria

1. No provider-specific logic is added for this feature.
2. No node-specific logic is added for this feature.
3. No field-specific logic is added for this feature.
4. Backend readiness remains registry-driven.
5. Workflow open/reload/reopen immediately fetches canonical readiness.
6. Returning from connection setup refetches canonical readiness.
7. Provider/account setup UI groups compatible rows into one provider-level group.
8. Group action uses union of required coverage.
9. Multiple compatible saved accounts show select guidance.
10. Runtime-missing, missing-coverage, expired, revoked, invalid-ref, and missing states remain distinct.
11. Combined save/run action is removed.
12. Check Setup action exists and opens unified setup panel.
13. Unified setup panel lists connection, missing input, and invalid input blockers.
14. Run is disabled until the latest check passes.
15. Run rechecks before execution.
16. Expected setup blockers use calm guidance, not destructive toasts.
17. Technical details remain behind disclosure/debug surfaces.

## Universal Test Plan

Backend:

- A single compatible provider connection/runtime credential with union coverage satisfies multiple node requirements for the same provider.
- Missing partial coverage returns missing-coverage status with exact required/available details.
- Saved connection without runtime credential returns runtime-missing status.
- Expired or unrefreshable runtime credential returns expired status.
- Legacy provider alias references do not get parsed as UUIDs and do not crash.
- Multiple compatible active saved connections without explicit reference returns select/invalid-ref guidance.
- Distributed execution returns the shared readiness fields on setup blockers.
- Synchronous execution returns the shared readiness fields on setup blockers.
- Debug-node execution returns the shared readiness fields on setup blockers.

Frontend:

- Workflow open calls canonical readiness endpoint.
- Workflow reload calls canonical readiness endpoint.
- Workflow id switch calls canonical readiness endpoint for the new workflow.
- Returning from connection setup refetches readiness.
- Provider/account gate groups multiple rows into one provider-level group.
- Group action passes union coverage into connect/reconnect.
- Select-connection state is shown when multiple compatible connections exist.
- Check Setup replaces combined save/run.
- Check Setup opens unified setup panel.
- Run disabled until latest check ready.
- Editing after check makes readiness stale.
- Expected readiness blockers do not produce destructive toast.

Build/verification:

- Focused backend readiness tests.
- Focused backend execution-preflight tests.
- Focused frontend hook tests.
- Focused frontend setup panel/header tests.
- Worker typecheck/build.
- Frontend typecheck/build.
- Deploy only after focused checks pass.

## Implementation Cautions

- Do not solve presentation duplication by deleting backend detail.
- Do not hard-code provider display behavior beyond generic provider metadata.
- Do not auto-select among multiple compatible accounts unless an existing explicit reference or deterministic product rule already exists.
- Do not check every possible provider permission. Check only the union of requirements for the actual workflow nodes/operations.
- Do not let legacy discovery overwrite canonical readiness messages.
- Do not let generic credential guidance hide operation-specific input blockers.
- Do not make expected readiness failures look like crashes.
