# Branch Node Deduplication & Webhook URL Classification Bugfix Design

## Overview

This document covers two bugs in the AI workflow generation system.

**Bug 1** — `inferCredentialCategory` in `UnifiedNodeRegistry` maps any field whose name contains `"webhook"` to the `"webhook"` credential category. Although `STRICT_CREDENTIAL_CATEGORIES` and `CREDENTIAL_QUESTION_HELP_CATEGORIES` correctly exclude `webhook_url`, the `inferCredentialCategory` method is called inside `extractCredentialSchema` after `isCredentialOwnership` has already filtered the field. The real risk is that `inferCredentialCategory` is a leaky fallback: if `classifyFieldOwnership` ever returns `'credential'` for a URL field (e.g. due to a future override that sets `helpCategory` to something unexpected), the category string `"webhook"` would appear in `credentialSchema.requirements`. The fix hardens both the ownership classifier and the category inferrer so URL-type fields can never reach the credential panel.

**Bug 2** — When the AI planner (Gemini) generates a `PlannedWorkflow` for a prompt requiring the same node type on multiple exclusive branches, it emits only one step entry for that type. `hydratePlannedWorkflow` creates exactly one `WorkflowNode` per step, so only one node exists in the graph. `EdgeReconciliationEngine` Step 4 then tries to wire multiple branch ports to that single node, producing duplicate edges and React Flow handle errors. The fix requires the planner prompt to enforce N distinct steps for N branches, and adds a structural assertion in the reconciliation engine that no two branch edges from the same switch/if node may share a target.

---

## Glossary

- **Bug_Condition (C)**: The set of inputs that trigger the defect.
- **Property (P)**: The correct behavior that must hold for all inputs in C after the fix.
- **Preservation**: Behaviors that must remain identical for all inputs NOT in C.
- **`inferCredentialCategory(fieldName)`**: Method in `UnifiedNodeRegistry` that maps a field name to a credential category string (`"oauth"`, `"api_key"`, `"token"`, `"webhook"`, `"credential"`). Called only for fields that have already passed `isCredentialOwnership`.
- **`extractCredentialSchema(schema, inputSchema)`**: Method in `UnifiedNodeRegistry` that iterates `inputSchema` fields, filters by `isCredentialOwnership`, and builds `NodeCredentialSchema`. This is the gate that determines what appears in the credential panel.
- **`classifyFieldOwnership(fieldName, field)`**: Function in `field-ownership.ts` that returns `'credential'`, `'structural'`, or `'value'` based on `field.helpCategory` against `STRICT_CREDENTIAL_CATEGORIES`.
- **`STRICT_CREDENTIAL_CATEGORIES`**: Set in `field-ownership.ts` of `FieldHelpCategory` values that classify a field as a credential. Does NOT include `webhook_url`, `base_url`, `api_endpoint`, `callback_url`, or `redirect_url`.
- **`inferFieldHelpMetadata(nodeType, fieldName, fieldType)`**: Function in `field-help-metadata.ts` that assigns a `FieldHelpCategory` to a field. Maps `webhookUrl`/`webhook_url` → `'webhook_url'`.
- **`PlannedWorkflow`**: The AI planner's output — a `{ summary, steps: PlannedStep[] }` object where each step has `{ id, type, role, config }`.
- **`hydratePlannedWorkflow(planned)`**: Method in `AgenticWorkflowBuilder` that converts `PlannedWorkflow.steps` into `WorkflowNode[]` and calls `unifiedGraphOrchestrator.initializeWorkflow(nodes)`.
- **`EdgeReconciliationEngine` Step 4**: The branch fan-out loop in `reconcileEdges` that iterates `outgoingPorts` of branching nodes and assigns each port to the next unused target in execution order.
- **`isBugCondition_credential(field)`**: Pseudocode predicate for Bug 1 — true when a field is a URL-type config value being misrouted to the credential panel.
- **`isBugCondition_dedup(plan)`**: Pseudocode predicate for Bug 2 — true when a `PlannedWorkflow` has fewer steps than branches needing the same node type.

---

## Bug Details

### Bug 1 — Webhook URL Treated as Credential

#### Bug Condition

The bug manifests when a node's `inputSchema` contains a field whose `helpCategory` is `'webhook_url'` (or another URL-type category) but whose `ownership` is incorrectly set to `'credential'` — either because `classifyFieldOwnership` is called before `helpCategory` is assigned, or because a future override sets `ownership` directly without going through `STRICT_CREDENTIAL_CATEGORIES`. The secondary manifestation is that `inferCredentialCategory` maps any field name containing `"webhook"` to the string `"webhook"`, which would appear in `credentialSchema.requirements.category` even if the field is a URL.

**Formal Specification:**
```
FUNCTION isBugCondition_credential(fieldName, field)
  INPUT: fieldName: string, field: NodeInputField
  OUTPUT: boolean

  urlCategories := { 'webhook_url', 'base_url', 'api_endpoint', 'callback_url', 'redirect_url' }

  RETURN field.helpCategory IN urlCategories
         AND (
           isCredentialOwnership(fieldName, field) = true
           OR inferCredentialCategory(fieldName) = 'webhook'
         )
END FUNCTION
```

#### Examples

- `webhookUrl` on a Slack node: `inferFieldHelpMetadata` → `'webhook_url'`; `STRICT_CREDENTIAL_CATEGORIES` does not include `'webhook_url'`; `classifyFieldOwnership` should return `'value'`. Bug: if `ownership` is not set before `extractCredentialSchema` runs, or if `inferCredentialCategory` is called on a field that slipped through, the field appears in `credentialFields`.
- `base_url` on an HTTP node: same pattern — config URL, not a secret.
- `apiKey` on any node: `inferFieldHelpMetadata` → `'api_key'`; `STRICT_CREDENTIAL_CATEGORIES` includes `'api_key'`; correctly classified as credential. Must remain unchanged.
- `botToken` on a Slack node: `inferFieldHelpMetadata` → `'generic_token'`; `STRICT_CREDENTIAL_CATEGORIES` includes `'generic_token'`; correctly classified as credential. Must remain unchanged.

---

### Bug 2 — Branch Node Deduplication

#### Bug Condition

The bug manifests when the AI planner emits a `PlannedWorkflow` where N exclusive branches each require the same node type but only one step of that type is present. The reconciliation engine then attempts to wire multiple branch ports to the same target node.

**Formal Specification:**
```
FUNCTION isBugCondition_dedup(plan, switchNodeBranchCount)
  INPUT: plan: PlannedWorkflow, switchNodeBranchCount: number
  OUTPUT: boolean

  stepsOfSameType(type) := COUNT of plan.steps WHERE step.type = type

  RETURN EXISTS type IN plan.steps.map(s => s.type)
         SUCH THAT stepsOfSameType(type) < switchNodeBranchCount
         AND switchNodeBranchCount > 1
END FUNCTION
```

#### Examples

- Switch with 3 cases (Slack, Slack, Slack): planner emits 1 Slack step → only 1 node → Step 4 tries to wire `case_1`, `case_2`, `case_3` all to the same Slack node → React Flow error `"Couldn't create edge for source handle id: output"`.
- Switch with 2 cases (Gmail, Gmail): planner emits 1 Gmail step → `case_1` and `case_2` both target the same Gmail node → duplicate edge, broken graph.
- Linear workflow (read Google Sheets + write Google Sheets): planner emits 1 Google Sheets step → single node wired as both source and destination → self-loop or missing write node.
- Switch with 3 cases (Slack, Gmail, Notion): planner emits 3 distinct steps → 3 distinct nodes → Step 4 wires correctly. This is the non-buggy case and must be preserved.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- True authentication secrets (`apiKey`, `accessToken`, `clientSecret`, `botToken`, `refreshToken`, `bearerToken`, `privateKey`, `consumerKey`, `consumerSecret`) must continue to be classified as `ownership = 'credential'` and appear in `credentialSchema.credentialFields`.
- Switch/if-else workflows where each branch targets a different node type must continue to produce exactly N distinct nodes and N branch edges, one per case.
- Linear workflows with a single instance of any node type must continue to produce exactly one node of that type, wired correctly in the linear chain.
- `EdgeReconciliationEngine` reconciliation for non-branching workflows must continue to produce a valid linear edge chain with no duplicate or missing connections.
- `extractCredentialSchema` must continue to include genuine credential fields alongside any config-only URL fields that are correctly excluded.
- The unified graph orchestrator's post-wiring validation must continue to enforce DAG invariants (reachability, no cycles, branch port out-degree = cases count).

**Scope:**
All inputs that do NOT involve URL-type config fields being misrouted, and all workflows where the planner correctly emits one step per branch, are completely unaffected by these fixes.

---

## Hypothesized Root Cause

### Bug 1 — Webhook URL as Credential

1. **`inferCredentialCategory` is not URL-aware**: The method checks only for `'oauth'`, `'api_key'`, `'token'`, `'webhook'` (substring match on field name). A field named `webhookUrl` matches `'webhook'` and returns category `"webhook"`. This string ends up in `credentialSchema.requirements[].category` even though the field is a URL, not a secret. The fix: `inferCredentialCategory` must check `field.helpCategory` (not just the field name) and must return `undefined` or skip for URL-type categories.

2. **`ownership` assignment timing**: In `convertNodeLibrarySchemaToUnified`, `fd.ownership = classifyFieldOwnership(fieldName, fd)` is assigned after `fd.helpCategory` is set. This ordering is correct. However, `extractCredentialSchema` calls `isCredentialOwnership(fieldName, fd)` which re-derives ownership from `fd.helpCategory`. Since `STRICT_CREDENTIAL_CATEGORIES` does not include `'webhook_url'`, this should already return `false`. The bug is therefore in `inferCredentialCategory` being called for fields that pass the ownership check — but since `extractCredentialSchema` only calls `inferCredentialCategory` for fields where `isCredentialOwnership` is true, the real risk is a future regression where an override sets `ownership = 'credential'` on a URL field directly.

3. **Defensive gap**: There is no guard in `inferCredentialCategory` that rejects URL-type `helpCategory` values. Adding an explicit URL-category blocklist there closes the gap permanently.

### Bug 2 — Branch Node Deduplication

1. **Planner prompt does not enforce per-branch uniqueness**: The Gemini system prompt for workflow planning does not instruct the model to emit one step per branch even when multiple branches need the same node type. The model deduplicates by type, treating "Slack notification" as a single logical step rather than N independent instances.

2. **`hydratePlannedWorkflow` has no branch-aware deduplication guard**: It maps `planned.steps` 1:1 to nodes with no check for whether a branching context requires multiple instances of the same type.

3. **`EdgeReconciliationEngine` Step 4 has no uniqueness assertion**: The `usedTargets` set prevents the same target from being assigned twice within a single reconciliation pass, but if only one node of the required type exists, `potentialTargets.find(t => !usedTargets.has(t))` returns `undefined` for the second branch port, silently skipping edge creation and leaving branch ports unwired.

4. **`wireSwitchCaseEdges` type-based lookup assigns the same node to multiple cases**: In `UnifiedGraphOrchestratorImpl.wireSwitchCaseEdges`, the type-based lookup `downstreamNodes.find(n => !assignedNodeIds.has(n.id) && this.getNodeType(n) === targetNodeType)` correctly uses `assignedNodeIds` to prevent double-assignment — but only if multiple nodes of the same type exist. When only one exists, the second case finds no match and falls through to positional fallback, which may assign an unrelated node.

---

## Correctness Properties

Property 1: Bug Condition — URL Fields Excluded from Credential Schema

_For any_ node input field where `inferFieldHelpMetadata` returns a `helpCategory` in `{ 'webhook_url', 'base_url', 'api_endpoint', 'callback_url', 'redirect_url' }`, the fixed `extractCredentialSchema` SHALL NOT include that field in `credentialSchema.credentialFields`, and `classifyFieldOwnership` SHALL return `'value'` (not `'credential'`) for that field.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation — True Credential Fields Still Classified as Credentials

_For any_ node input field where `inferFieldHelpMetadata` returns a `helpCategory` in `STRICT_CREDENTIAL_CATEGORIES` (i.e., `api_key`, `oauth_token`, `refresh_token`, `client_id`, `client_secret`, `generic_token`, `credential_id`, `bearer_token`, `webhook_secret`, `smtp_password`, `db_password`, `private_key`, `consumer_key`, `consumer_secret`, `generic_credential`), the fixed `classifyFieldOwnership` SHALL return `'credential'` and `extractCredentialSchema` SHALL include that field in `credentialSchema.credentialFields`.

**Validates: Requirements 3.1, 3.5**

Property 3: Bug Condition — Branch Nodes Deduplicated into N Independent Instances

_For any_ `PlannedWorkflow` where a switch/if-else node has N branch ports and N branches each require the same node type T, the fixed `hydratePlannedWorkflow` SHALL produce a `WorkflowNode[]` containing exactly N nodes of type T, each with a unique ID, such that no two nodes share the same ID.

**Validates: Requirements 2.4, 2.5**

Property 4: Bug Condition — EdgeReconciliationEngine Asserts No Shared Branch Targets

_For any_ switch or if-else node in a reconciled workflow, the fixed `EdgeReconciliationEngine` Step 4 SHALL produce branch edges such that no two edges from the same branching node share the same `target` node ID. The set of targets for all outgoing branch edges from a single switch node must have cardinality equal to the number of branch ports.

**Validates: Requirements 2.6, 2.7**

Property 5: Preservation — Non-Branching Workflows Unaffected

_For any_ workflow where no switch/if-else node exists, or where all branch targets are already distinct node types, the fixed `EdgeReconciliationEngine` SHALL produce the same edge set as the original engine, preserving all linear and single-branch-type wiring behavior.

**Validates: Requirements 3.2, 3.3, 3.4, 3.7**

Property 6: Bug Condition — Linear Same-Type Nodes Get Separate Instances

_For any_ `PlannedWorkflow` where two steps have the same node type T but serve distinct purposes (e.g., read vs. write), the fixed hydration SHALL produce two nodes of type T with distinct IDs, wired sequentially in the linear chain with no self-loop.

**Validates: Requirements 2.8**

---

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

---

**File**: `worker/src/core/registry/unified-node-registry.ts`

**Method**: `inferCredentialCategory(fieldName)`

**Specific Changes**:

1. **Add `helpCategory` parameter**: Change signature to `inferCredentialCategory(fieldName: string, helpCategory?: FieldHelpCategory): string | undefined`.
2. **Block URL-type categories**: If `helpCategory` is in `{ 'webhook_url', 'base_url', 'api_endpoint', 'callback_url', 'redirect_url' }`, return `undefined` (or a sentinel that `extractCredentialSchema` skips).
3. **Update call site in `extractCredentialSchema`**: Pass `fd.helpCategory` when calling `inferCredentialCategory` so the URL guard is active.

---

**File**: `worker/src/core/utils/field-ownership.ts`

**Function**: `classifyFieldOwnership`

**Specific Changes**:

4. **Add URL-category explicit exclusion**: Before the `STRICT_CREDENTIAL_CATEGORIES` check, add a guard: if `helpCategory` is in `{ 'webhook_url', 'base_url', 'api_endpoint', 'callback_url', 'redirect_url' }`, return `'value'` immediately. This makes the exclusion explicit and immune to future set membership changes.

---

**File**: `worker/src/services/ai/workflow-builder.ts`

**Method**: `hydratePlannedWorkflow(planned)`

**Specific Changes**:

5. **Branch-aware step expansion**: Before mapping `planned.steps` to nodes, detect if a `switch` or `if_else` step is present. For each branch port of the branching node, ensure there is exactly one downstream step. If the planner emitted fewer steps than branch ports (i.e., the same type appears fewer times than needed), clone the step with a new unique ID (e.g., `${step.type}_case_${branchIndex}_${uuid()}`). This ensures `hydratePlannedWorkflow` always produces N nodes for N branches.

---

**File**: `worker/src/services/ai/system-prompt-builder.ts` (or the planning prompt)

**Specific Changes**:

6. **Enforce per-branch uniqueness in planner prompt**: Add an explicit instruction to the Gemini planning system prompt: "When multiple branches of a switch or if-else each require the same node type, emit one distinct step per branch with a unique step ID. Never collapse two branch actions into a single shared step."

---

**File**: `worker/src/core/orchestration/edge-reconciliation-engine.ts`

**Method**: `reconcileEdges` — Step 4 branch fan-out

**Specific Changes**:

7. **Assert no shared branch targets**: After the Step 4 fan-out loop completes, add a structural assertion: for each branching node, collect all outgoing branch edges and assert that `new Set(branchEdges.map(e => e.target)).size === branchEdges.length`. If the assertion fails, emit an error into `errors[]` with a descriptive message (e.g., `"Switch node X: branch ports case_1 and case_2 both target node Y — branch targets must be distinct"`). This surfaces the deduplication bug as a hard error rather than a silent broken graph.

8. **Guard `potentialTargets.find` for branch exhaustion**: If `targetCandidate` is `undefined` (no unused target found), instead of silently skipping, push a descriptive error: `"Switch node X: no distinct target available for branch port case_N — planner may have emitted too few nodes"`.

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate each bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

---

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate both bugs BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**:

For Bug 1 — run `extractCredentialSchema` on a mock Slack node schema that has a `webhookUrl` field with `helpCategory = 'webhook_url'`. Assert that `credentialFields` does NOT contain `'webhookUrl'`. On unfixed code, verify whether this already passes (the ownership path) or fails (if `inferCredentialCategory` leaks through).

For Bug 2 — construct a `PlannedWorkflow` with a `switch` step followed by two `slack_message` steps (same type, two branches). Call `hydratePlannedWorkflow`. Assert that the resulting `WorkflowNode[]` contains two distinct Slack nodes. On unfixed code, observe whether the planner collapses them and whether Step 4 produces a shared-target error.

**Test Cases**:

1. **Webhook URL ownership test**: Create a `NodeInputField` with `helpCategory = 'webhook_url'`. Call `classifyFieldOwnership('webhookUrl', field)`. Assert result is `'value'`. (Will pass on current code — confirms ownership path is correct.)
2. **`inferCredentialCategory` URL guard test**: Call `inferCredentialCategory('webhookUrl', 'webhook_url')`. Assert result is NOT `'webhook'` and does not cause the field to appear in credential requirements. (Will fail on unfixed code if the guard is absent.)
3. **Slack node credential schema test**: Build the Slack node definition through the registry. Assert `credentialSchema.credentialFields` does not contain `'webhookUrl'`. (May pass on current code — confirms end-to-end path.)
4. **Branch deduplication — same type, 2 branches**: Construct `PlannedWorkflow` with `switch` + 2 `slack_message` steps. Call `hydratePlannedWorkflow`. Assert 2 distinct Slack node IDs. (Will fail on unfixed code if planner emits only 1 step.)
5. **Branch deduplication — same type, 3 branches**: Construct `PlannedWorkflow` with `switch` + 3 `slack_message` steps. Assert 3 distinct Slack node IDs and 3 distinct branch edge targets. (Will fail on unfixed code.)
6. **EdgeReconciliationEngine shared-target assertion**: Build a workflow with a switch node and only 1 downstream Slack node. Run `reconcileEdges`. Assert that `errors[]` contains the shared-target violation message. (Will fail on unfixed code — no assertion exists.)

**Expected Counterexamples**:
- `inferCredentialCategory('webhookUrl')` returns `'webhook'` (substring match) — confirms Bug 1 secondary risk.
- Step 4 fan-out silently skips `case_2` when only 1 Slack node exists — confirms Bug 2 silent failure mode.

---

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce the expected behavior.

**Pseudocode:**
```
FOR ALL field WHERE isBugCondition_credential(fieldName, field) DO
  result := classifyFieldOwnership_fixed(fieldName, field)
  ASSERT result = 'value'
  ASSERT fieldName NOT IN extractCredentialSchema_fixed(schema, inputSchema).credentialFields
END FOR

FOR ALL plan WHERE isBugCondition_dedup(plan, branchCount) DO
  nodes := hydratePlannedWorkflow_fixed(plan).workflow.nodes
  ASSERT COUNT(nodes WHERE type = T) = branchCount
  ASSERT ALL node IDs are unique
  edges := reconcileEdges_fixed(workflow, executionOrder).workflow.edges
  branchEdges := edges WHERE source = switchNodeId
  ASSERT SET(branchEdges.map(e => e.target)).size = branchCount
END FOR
```

---

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed functions produce the same result as the original functions.

**Pseudocode:**
```
FOR ALL field WHERE NOT isBugCondition_credential(fieldName, field) DO
  ASSERT classifyFieldOwnership_original(fieldName, field)
       = classifyFieldOwnership_fixed(fieldName, field)
END FOR

FOR ALL plan WHERE NOT isBugCondition_dedup(plan, branchCount) DO
  ASSERT hydratePlannedWorkflow_original(plan).workflow.nodes
       = hydratePlannedWorkflow_fixed(plan).workflow.nodes  // same IDs, same types
  ASSERT reconcileEdges_original(workflow, order).workflow.edges
       = reconcileEdges_fixed(workflow, order).workflow.edges
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many random field name / helpCategory combinations automatically.
- It catches edge cases (e.g., field names that contain both "webhook" and "secret") that manual tests miss.
- It provides strong guarantees that credential classification is unchanged for all non-URL fields.

**Test Cases**:
1. **Credential field preservation**: For each `helpCategory` in `STRICT_CREDENTIAL_CATEGORIES`, assert `classifyFieldOwnership` returns `'credential'` before and after the fix.
2. **Linear workflow preservation**: Build a linear `manual_trigger → google_sheets → slack_message` workflow. Assert edge set is identical before and after the fix.
3. **Switch with distinct types preservation**: Build a switch with `case_1 → slack_message`, `case_2 → google_gmail`, `case_3 → notion`. Assert 3 distinct branch edges, same as before the fix.
4. **Single-instance node preservation**: Build a workflow with one Gmail node. Assert exactly one Gmail node and one incoming edge after reconciliation.

---

### Unit Tests

- Test `classifyFieldOwnership` for all URL-type `helpCategory` values — must return `'value'`.
- Test `classifyFieldOwnership` for all `STRICT_CREDENTIAL_CATEGORIES` values — must return `'credential'`.
- Test `inferCredentialCategory` with `helpCategory = 'webhook_url'` — must not return `'webhook'`.
- Test `extractCredentialSchema` with a mixed schema (webhookUrl + apiKey) — must include only apiKey in credentialFields.
- Test `hydratePlannedWorkflow` with N same-type steps — must produce N nodes with unique IDs.
- Test Step 4 fan-out with a switch node and N same-type downstream nodes — must produce N distinct branch edges.
- Test Step 4 fan-out with a switch node and fewer downstream nodes than branch ports — must emit an error.

### Property-Based Tests

- Generate random `(fieldName, helpCategory)` pairs where `helpCategory` is a URL-type category; assert `classifyFieldOwnership` always returns `'value'` (Property 1).
- Generate random `(fieldName, helpCategory)` pairs where `helpCategory` is in `STRICT_CREDENTIAL_CATEGORIES`; assert `classifyFieldOwnership` always returns `'credential'` (Property 2).
- Generate random `PlannedWorkflow` objects with N branches (N ∈ [2, 5]) all requiring the same node type; assert hydrated workflow has N distinct nodes of that type (Property 3).
- Generate random switch workflows with N branch ports and N distinct downstream nodes; assert reconciled edge set has N distinct branch targets (Property 4, Property 5).
- Generate random linear workflows (no branching); assert reconciled edge set is unchanged by the fix (Property 5).
- Generate random `PlannedWorkflow` objects with two same-type steps for distinct purposes; assert two separate node instances with no self-loop (Property 6).

### Integration Tests

- Build a full Slack webhook workflow through the registry and assert the credential panel does not show `webhookUrl`.
- Build a switch workflow with 3 Slack branches through `generateWorkflowWithGeminiPlanner` (mocked planner output) and assert 3 distinct Slack nodes and 3 distinct branch edges in the final graph.
- Build a Google Sheets read + write workflow and assert 2 distinct Google Sheets nodes wired sequentially.
- Run `unifiedGraphOrchestrator.validateWorkflow` on a switch workflow with 3 same-type branch nodes and assert zero structural errors.
