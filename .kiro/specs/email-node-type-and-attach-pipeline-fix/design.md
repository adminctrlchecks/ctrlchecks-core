# Email Node Type and Attach Pipeline Fix — Bugfix Design

## Overview

Four root-cause classes combine to produce a single user-visible failure: a workflow built from an "email" prompt ends up persisted as `ollama`, the `attach-inputs` phase silently swallows errors and advances the pipeline anyway, credential discovery runs against a stale in-memory graph, and credential injection is skipped because the phase flag is wrong. The fix is a consolidation, not a patch: delete the competing legacy resolver files, make `unified-node-registry.ts` the single alias authority, and enforce a strictly linear, atomic pipeline where each stage reads from the committed DB row and a failure at any stage stops the pipeline immediately.

## Glossary

- **Bug_Condition (C)**: Any input that triggers one of the four defect classes — email alias resolving to a non-email node type, `attach-inputs` advancing phase on failure, credential discovery reading a stale graph, or credential injection running against the wrong phase.
- **Property (P)**: The desired correct behavior for each bug condition — `google_gmail` for email aliases, phase unchanged on 400, discovery reads latest DB row, injection only when `inputs_applied`.
- **Preservation**: All non-email node type resolution, all successful `attach-inputs` flows, all credential discovery for non-email nodes, and all edge operations through `unified-graph-orchestrator` must remain unchanged.
- **unified-node-registry.ts**: `worker/src/core/registry/unified-node-registry.ts` — the single source of truth for all node definitions, alias resolution, and credential schemas after this fix.
- **attach-inputs.ts**: `worker/src/api/attach-inputs.ts` — the HTTP handler that normalizes the graph, applies field ownership and config merge, and advances the pipeline phase.
- **credential-discovery-phase.ts**: `worker/src/services/ai/credential-discovery-phase.ts` — discovers required credentials by walking the workflow node list.
- **isBugCondition**: Pseudocode predicate that identifies inputs triggering any of the four defect classes.
- **inputs_applied**: The pipeline phase value that `attach-inputs` must write to DB on success, and that `attach-credentials` must read before running.

---

## Bug Details

### Bug Condition

The bug manifests across four distinct trigger paths that share a common root: multiple competing resolver implementations that can each produce a different canonical type for the same alias, combined with a pipeline that does not treat stage failures as blocking.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input — one of { prompt, attachInputsRequest, credentialDiscoveryCall, attachCredentialsRequest }
  OUTPUT: boolean

  // Class 1: Email alias resolves to wrong node type
  IF input IS prompt
    AND input.text CONTAINS_ANY ['email', 'send email', 'mail', 'gmail', 'send via gmail']
    AND resolvedNodeType(input) NOT IN ['google_gmail']
    RETURN true

  // Class 2: attach-inputs advances phase despite normalization failure
  IF input IS attachInputsRequest
    AND graphNormalization(input.workflowId) FAILS
    AND workflowPhase(input.workflowId) CHANGED
    RETURN true

  // Class 3: Credential discovery uses stale graph
  IF input IS credentialDiscoveryCall
    AND nodeTypesUsed(input) != nodeTypesInLatestDBRow(input.workflowId)
    RETURN true

  // Class 4: Credential injection runs when phase != inputs_applied
  IF input IS attachCredentialsRequest
    AND workflowPhase(input.workflowId) != 'inputs_applied'
    AND credentialInjectionAttempted(input)
    RETURN true

  RETURN false
END FUNCTION
```

### Examples

- **Class 1**: User prompt "Send a weekly email digest via Gmail" → planner calls `capabilityResolver.resolveCapability('email')` → resolves to `ollama` (AI_PROCESSING capability) → persisted as `ollama` → canvas shows label "Email" but Properties panel shows Ollama schema.
- **Class 2**: `attach-inputs` receives a workflow with a malformed node type → `normalizeWorkflowGraph` throws → the `catch` block returns 400 but the phase was already updated to `configuring_inputs` two lines earlier → downstream `attach-credentials` sees `configuring_inputs` and skips injection.
- **Class 3**: Generation saves workflow with `google_gmail` node → lifecycle manager calls `credentialDiscoveryPhase.discoverCredentials(inMemoryWorkflow)` where `inMemoryWorkflow` still has the pre-normalization `ollama` node → discovery advertises no Google OAuth requirement → user sees no credential prompt.
- **Class 4**: `attach-inputs` returns 400 (Class 2) → phase is `configuring_inputs` not `inputs_applied` → `attach-credentials` checks phase, logs "Skipping credential attachment (inputs still pending)", exits → Gmail node has no `credentialId` → Properties panel shows "Not configured".

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- All non-email node type aliases (Slack, Jira, Google Sheets, Notion, etc.) must continue to resolve to their correct canonical types via `unified-node-registry.ts`.
- Successful `attach-inputs` calls must continue to advance through field ownership assignment, config merge, and phase advancement in the existing order without additional latency.
- Credential discovery for non-email nodes (Jira API key, Slack webhook, etc.) must continue to return the correct `CredentialRequirement` entries.
- All edge creation and reconciliation must continue to route through `unified-graph-orchestrator` with no direct mutation of `workflow.edges`.
- The `resolveAlias` method on `UnifiedNodeRegistry` must continue to return the correct canonical type for all existing aliases.

**Scope:**
All inputs that do NOT involve the four bug condition classes are completely unaffected. This includes:
- Any prompt that does not contain email-related aliases.
- Any `attach-inputs` call where graph normalization succeeds.
- Any credential discovery call that already reads from the correct DB row.
- Any `attach-credentials` call where the phase is already `inputs_applied`.

**Note:** The expected correct behavior for each bug condition class is defined in the Correctness Properties section below.

---

## Hypothesized Root Cause

### 1. Competing Alias Maps — Email Resolves to AI Capability

`capability-resolver.ts` maps `'email'` and `'mail'` into the `AI_PROCESSING` capability bucket (`CAPABILITY_TO_NODES[AICapability.AI_PROCESSING]`). When `node-type-normalization-service.ts` calls `capabilityResolver.isCapability('email')` first (before the alias map), it gets `true` and resolves to `ollama`. The `unified-node-registry.ts` alias map (`'google_gmail': ['gmail', 'email', 'send_email', ...]`) is never reached because the capability resolver short-circuits the lookup.

The chain: `node-type-normalization-service.normalizeNodeType('email')` → `capabilityResolver.isCapability('email')` → `true` → `capabilityResolver.resolveCapability('email')` → `AICapability.AI_PROCESSING` → `ollama`.

### 2. Phase Mutation Before Normalization Guard

In `attach-inputs.ts`, the phase is updated to `configuring_inputs` unconditionally before the graph normalization block:

```typescript
// Phase update happens HERE (line ~350)
await supabase.from('workflows').update({ phase: 'configuring_inputs' }).eq('id', workflowId);

// Normalization happens AFTER (line ~380)
normalizedGraph = normalizeWorkflowGraph(...);  // may throw
```

If normalization throws, the `catch` block returns 400 but the phase has already been mutated. The fix is to move the phase update to after successful normalization, inside a try/catch that rolls back on failure.

### 3. Credential Discovery Reads In-Memory Snapshot

`credential-discovery-phase.discoverCredentials(workflow)` accepts a `Workflow` object parameter. All callers pass the in-memory workflow object that was constructed during generation, before the final `save/normalize/hydrate` pipeline ran. The DB row may have different node types (e.g., after normalization changed `email` → `google_gmail`). The fix is to make the discovery phase read from the DB row by `workflowId`.

### 4. `attach-credentials` Phase Guard Is Too Permissive

`attach-credentials.ts` currently allows credential attachment in almost all phases (`blockedPhases = ['executing', 'running', 'archived']`). It does not require `inputs_applied`. This means it runs even when `attach-inputs` failed, injecting credentials into a graph that was never properly normalized. The fix is to add `inputs_applied` as a required phase (or at minimum, block when phase is `configuring_inputs` after a failed attach-inputs).

### 5. Four Competing Resolver Files

`node-type-resolver.ts` (1000+ line alias map), `node-type-resolver-util.ts` (wrapper), `nodeTypeResolver.ts` (frontend duplicate), and `node-type-normalization-service.ts` (calls capability-resolver before registry) all contain alias logic that can diverge from `unified-node-registry.ts`. Any one of them can intercept an alias before the registry is consulted.

---

## Correctness Properties

Property 1: Bug Condition — Email Alias Always Resolves to google_gmail

_For any_ prompt or node type string where the input contains an email-related alias (`'email'`, `'mail'`, `'gmail'`, `'send_email'`, `'google_mail'`, `'send via gmail'`), the fixed resolution pipeline SHALL produce the canonical node type `'google_gmail'` and SHALL NOT produce `'ollama'`, `'ai_chat_model'`, `'ai_service'`, or any other non-email node type. This property holds regardless of which pipeline stage performs the lookup (generation, normalization, attach-inputs, or credential discovery).

**Validates: Requirements 2.1, 4.1, 4.2, 4.3**

Property 2: Bug Condition — attach-inputs Phase Atomicity

_For any_ `attach-inputs` HTTP request where graph normalization fails (throws or returns invalid), the fixed handler SHALL return HTTP 400 AND the workflow phase stored in the database SHALL be identical to the phase value that existed before the request was received. The phase SHALL NOT advance to `configuring_inputs` or any other value as a side effect of a failed normalization.

**Validates: Requirements 2.3, 4.4**

Property 3: Bug Condition — Credential Discovery Reads Committed DB Row

_For any_ credential discovery invocation for a given `workflowId`, the node types examined by the discovery phase SHALL match the node types stored in the most recently committed database row for that `workflowId`. The discovery SHALL NOT use any in-memory workflow object that predates the last successful DB write.

**Validates: Requirements 2.5, 4.5**

Property 4: Preservation — No Alias Map Outside unified-node-registry.ts

_For any_ state of the codebase after this fix is applied, no TypeScript file outside `worker/src/core/registry/unified-node-registry.ts` SHALL contain a `NODE_TYPE_ALIASES` constant, an `ALIAS_TO_CANONICAL` map, or any equivalent data structure that maps node type alias strings to canonical node type strings. All alias resolution SHALL be delegated to `unifiedNodeRegistry.resolveAlias()`.

**Validates: Requirements 4.1, 4.6**

---

## Fix Implementation

### Changes Required

Assuming the root cause analysis above is correct:

---

**File**: `worker/src/services/ai/capability-resolver.ts`

**Change**: Remove `'email'`, `'mail'`, `'send_email'`, `'send'`, `'notify'` from the `AI_PROCESSING` capability mapping and from the `aliases` map in `normalizeCapability`. Email is an integration node type, not an AI processing capability.

**Specific Changes**:
1. In `CAPABILITY_TO_NODES[AICapability.AI_PROCESSING]`, remove any entry that is an email alias.
2. In `normalizeCapability`, remove `'send'`, `'notify'`, `'email'`, `'mail'` from the aliases that map to `AICapability.AI_PROCESSING`.
3. Add a guard comment: `// Email aliases must NOT be treated as AI capabilities — they resolve via unified-node-registry alias map`.

---

**File**: `worker/src/api/attach-inputs.ts`

**Change**: Make phase advancement atomic — only update the DB phase after successful normalization. Wrap the normalization block in a try/catch that returns 400 without touching the phase on failure.

**Specific Changes**:
1. Remove the unconditional `await supabase.from('workflows').update({ phase: 'configuring_inputs' })` call that runs before normalization.
2. After the normalization block succeeds (after `validateNormalizedGraph` passes), add the phase update inside the success path.
3. In the normalization `catch` block, return 400 without any phase mutation.
4. Pseudocode:
```
// BEFORE normalization: do NOT update phase
try {
  normalizedGraph = normalizeWorkflowGraph(...)
  validation = validateNormalizedGraph(normalizedGraph)
  if (!validation.valid) return res.status(400).json(...)
  // AFTER successful normalization: update phase
  await supabase.update({ phase: 'configuring_inputs' }).eq('id', workflowId)
} catch (error) {
  // Phase NOT updated — return 400 immediately
  return res.status(400).json(createError(...))
}
```

---

**File**: `worker/src/services/ai/credential-discovery-phase.ts`

**Change**: Accept `workflowId` as the primary input and read the workflow graph from the DB row, rather than accepting a `Workflow` object that may be stale.

**Specific Changes**:
1. Add an overload or modify `discoverCredentials` to accept `workflowId: string` and `supabase` client, then fetch the latest row before walking nodes.
2. Alternatively, add a validation step at the call site that compares the passed `workflow.nodes` against the DB row and throws if they differ.
3. All callers that pass an in-memory `Workflow` object must be updated to pass the `workflowId` instead.

---

**File**: `worker/src/api/attach-credentials.ts`

**Change**: Require phase `inputs_applied` before running credential injection. Currently the phase guard only blocks `executing`, `running`, `archived`.

**Specific Changes**:
1. Add `inputs_applied` as the required phase for credential attachment.
2. If `currentPhase !== 'inputs_applied'`, return 409 with a clear message: `"attach-inputs must complete successfully before credentials can be attached"`.
3. Keep the existing block for `executing`, `running`, `archived`.

---

**File**: `worker/src/core/registry/unified-node-registry.ts`

**Change**: Make `resolveAlias` self-contained — inline the alias map directly rather than delegating to `node-type-resolver-util` (which delegates to the legacy `node-type-resolver.ts`). After the legacy files are deleted, the `require('../utils/node-type-resolver-util')` call in `resolveAlias` would break.

**Specific Changes**:
1. Add a private `ALIAS_MAP: Record<string, string>` inside `UnifiedNodeRegistry` that contains the canonical alias entries (email → google_gmail, gmail → google_gmail, etc.).
2. Update `resolveAlias` to use this internal map directly, with a fallback to `this.has(alias) ? alias : undefined`.
3. Confirm the map includes: `'email'`, `'mail'`, `'gmail'`, `'send_email'`, `'google_mail'`, `'send via gmail'`, `'google email'` → `'google_gmail'`.

---

### Legacy File Deletion Plan

The following files must be deleted after all imports are migrated:

| File to Delete | Reason |
|---|---|
| `worker/src/services/nodes/node-type-resolver.ts` | 1000+ line alias map that duplicates registry; `NodeTypeResolver` class with capability-based fallback that can resolve email → ollama |
| `worker/src/core/utils/node-type-resolver-util.ts` | Wrapper around the above; all callers must migrate to `unifiedNodeRegistry.resolveAlias()` |
| `worker/src/utils/nodeTypeResolver.ts` | Frontend-facing duplicate of the same alias logic |
| `worker/src/services/ai/node-type-normalization-service.ts` | Calls `capabilityResolver.isCapability()` before registry; contains `PROFESSION_CATEGORY_MAPPINGS` and `ABSTRACT_TYPE_MAPPINGS` that duplicate registry data |

**Pre-deletion checklist** (per Requirement 4.6):
- Run `grep -r "node-type-resolver" worker/src --include="*.ts"` and update every import.
- Run `grep -r "nodeTypeResolver" worker/src --include="*.ts"` and update every import.
- Run `grep -r "node-type-normalization-service" worker/src --include="*.ts"` and update every import.
- Confirm zero remaining imports before deleting each file.

---

### Import Migration Table

| Importing File | Current Import | New Import |
|---|---|---|
| `worker/src/core/utils/ai-specified-nodes-context.ts` | `resolveNodeType` from `./node-type-resolver-util` | `unifiedNodeRegistry.resolveAlias()` from `../registry/unified-node-registry` |
| `worker/src/services/workflow-lifecycle-manager.ts` | `resolveNodeType` from `../core/utils/node-type-resolver-util` | `unifiedNodeRegistry.resolveAlias()` |
| `worker/src/services/workflow-planner.ts` | `resolveNodeType` from `../core/utils/node-type-resolver-util` | `unifiedNodeRegistry.resolveAlias()` |
| `worker/src/api/execute-workflow.ts` | `resolveNodeType` from `../core/utils/node-type-resolver-util` | `unifiedNodeRegistry.resolveAlias()` |
| `worker/src/services/node-auto-configurator.ts` | `resolveNodeType` from `./node-type-resolver-util` (relative) | `unifiedNodeRegistry.resolveAlias()` |
| `worker/src/api/plan-chain-guards.ts` | `resolveCanonicalNodeTypeStrict` from `../core/utils/node-type-resolver-util` | Inline strict check: `unifiedNodeRegistry.has(type) ? type : throw` |
| `worker/src/services/ai/intent-completeness-validator.ts` | `resolveNodeType` from `../../core/utils/node-type-resolver-util` | `unifiedNodeRegistry.resolveAlias()` |
| `worker/src/services/ai/intent-confidence-scorer.ts` | `resolveNodeType` from `../../core/utils/node-type-resolver-util` | `unifiedNodeRegistry.resolveAlias()` |
| `worker/src/services/ai/plan-driven-workflow-builder.ts` | `resolveCanonicalNodeTypeStrict` from `../../core/utils/node-type-resolver-util` | Inline strict check |
| `worker/src/services/ai/structured-intent-validator.ts` | `resolveNodeType` from `../../core/utils/node-type-resolver-util` | `unifiedNodeRegistry.resolveAlias()` |
| `worker/src/services/ai/summarize-layer.ts` | `resolveCanonicalNodeTypeStrict` from `../../core/utils/node-type-resolver-util` | Inline strict check |
| `worker/src/services/ai/workflow-builder.ts` | `resolveNodeType` from `../../core/utils/node-type-resolver-util` | `unifiedNodeRegistry.resolveAlias()` |
| `worker/src/services/ai/workflow-dsl.ts` | `resolveNodeType` from `../../core/utils/node-type-resolver-util` | `unifiedNodeRegistry.resolveAlias()` |
| `worker/src/services/ai/workflow-dsl-compiler.ts` | `nodeTypeResolver` from `../nodes/node-type-resolver` AND `nodeTypeNormalizationService` from `./node-type-normalization-service` | `unifiedNodeRegistry.resolveAlias()` for alias resolution; remove normalization service calls |
| `worker/src/services/fix-agent.ts` | `nodeTypeNormalizationService` from `./ai/node-type-normalization-service` | Remove or replace with direct registry calls |
| `worker/src/services/ai/production-workflow-builder.ts` | `nodeTypeNormalizationService` from `./node-type-normalization-service` | Remove or replace with direct registry calls |
| `worker/src/utils/nodeTypeResolver.ts` | `resolveNodeType` from `../core/utils/node-type-resolver-util` | Delete file entirely |

**Note on `resolveCanonicalNodeTypeStrict`**: This function checks that a type exists in the registry and throws if not. After deletion of `node-type-resolver-util.ts`, callers should inline: `if (!unifiedNodeRegistry.has(type)) throw new Error(...)`.

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate each bug class on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write tests that exercise each of the four bug condition classes against the unfixed code. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Email Alias Resolution Test**: Call `nodeTypeNormalizationService.normalizeNodeType('email')` and assert result is `'google_gmail'`. On unfixed code this will return `'ollama'` — confirming Class 1 root cause.
2. **attach-inputs Phase Atomicity Test**: Mock `normalizeWorkflowGraph` to throw, call `attachInputsHandler`, then read the workflow phase from DB. On unfixed code the phase will have changed — confirming Class 2 root cause.
3. **Credential Discovery Staleness Test**: Save a workflow with `google_gmail` node, then call `discoverCredentials` with an in-memory object that has `ollama` node. Assert that discovery uses `google_gmail`. On unfixed code it will use `ollama` — confirming Class 3 root cause.
4. **attach-credentials Phase Guard Test**: Set workflow phase to `configuring_inputs`, call `attachCredentialsHandler`, assert it returns 409. On unfixed code it will proceed — confirming Class 4 root cause.

**Expected Counterexamples**:
- `normalizeNodeType('email')` returns `'ollama'` instead of `'google_gmail'`.
- Workflow phase changes to `configuring_inputs` even when normalization throws.
- Credential discovery uses stale `ollama` node type instead of committed `google_gmail`.
- Credential injection runs when phase is `configuring_inputs`.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed pipeline produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedPipeline(input)
  ASSERT expectedBehavior(result)
END FOR
```

Concretely:
```
FOR ALL alias IN ['email', 'mail', 'gmail', 'send_email', 'google_mail'] DO
  ASSERT unifiedNodeRegistry.resolveAlias(alias) === 'google_gmail'
END FOR

FOR ALL workflowId WHERE normalizationFails(workflowId) DO
  phaseBefore := readPhaseFromDB(workflowId)
  attachInputs(workflowId)  // returns 400
  phaseAfter := readPhaseFromDB(workflowId)
  ASSERT phaseBefore === phaseAfter
END FOR

FOR ALL workflowId DO
  latestDBNodeTypes := readNodeTypesFromDB(workflowId)
  discoveryNodeTypes := captureNodeTypesUsedByDiscovery(workflowId)
  ASSERT latestDBNodeTypes === discoveryNodeTypes
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed pipeline produces the same result as the original pipeline.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalPipeline(input) = fixedPipeline(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because it generates many test cases automatically across the input domain, catches edge cases that manual unit tests might miss, and provides strong guarantees that behavior is unchanged for all non-buggy inputs.

**Test Plan**: Observe behavior on UNFIXED code first for non-email aliases and successful attach-inputs flows, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Non-Email Alias Preservation**: For aliases like `'slack'`, `'jira'`, `'google_sheets'`, `'notion'`, verify `resolveAlias` returns the same canonical type before and after the fix.
2. **Successful attach-inputs Preservation**: For a valid workflow, verify that a successful `attach-inputs` call still advances phase to `configuring_inputs` and applies field ownership and config merge correctly.
3. **Credential Discovery Non-Email Preservation**: For workflows with Jira, Slack, or Sheets nodes, verify credential discovery still returns the correct `CredentialRequirement` entries.
4. **Edge Reconciliation Preservation**: Verify that all edge operations still route through `unified-graph-orchestrator` and produce the same topology.

### Unit Tests

- Test `unifiedNodeRegistry.resolveAlias()` for all email aliases → `google_gmail`.
- Test `unifiedNodeRegistry.resolveAlias()` for all non-email aliases → unchanged canonical types.
- Test `attachInputsHandler` returns 400 and does not mutate phase when `normalizeWorkflowGraph` throws.
- Test `attachInputsHandler` advances phase to `configuring_inputs` when normalization succeeds.
- Test `attachCredentialsHandler` returns 409 when phase is not `inputs_applied`.
- Test `credentialDiscoveryPhase.discoverCredentials` reads from DB row, not in-memory object.

### Property-Based Tests

- Generate random email-intent prompts and verify the persisted node type is always `google_gmail` (Property 1).
- Generate random failing normalization scenarios and verify the DB phase is always unchanged after a 400 response (Property 2).
- Generate random workflow save/discovery sequences and verify discovery always uses the latest committed node types (Property 3).
- Verify that no file in the codebase outside `unified-node-registry.ts` contains a node type alias map constant (Property 4 — static analysis property).

### Integration Tests

- Full pipeline test: prompt "Send weekly email digest via Gmail" → generation → save → attach-inputs → attach-credentials → verify persisted node type is `google_gmail` and `credentialId` is set.
- Failure recovery test: prompt with valid email intent → save → inject normalization failure → verify phase unchanged → fix normalization → re-run attach-inputs → verify pipeline completes.
- Multi-node test: prompt with Gmail + Google Sheets → verify both nodes resolve correctly and credential discovery returns separate requirements for each.
- Regression test: prompt with Slack, Jira, Notion → verify none of these are affected by the email alias fix.
