# AI Credential Field Value Persistence — Bugfix Design

## Overview

The AI builds a workflow and assigns values to node config fields (including credential fields). Those values are not surviving the pipeline. Three distinct mechanisms destroy them:

1. `injectCredentials` in `workflow-lifecycle-manager.ts` unconditionally overwrites fields that already have AI-assigned values — it has no "skip if already set" guard on the primary injection paths.
2. The `generate-workflow` API handler always calls `pipeline.run()` fresh on every request, including "continue" actions — no existing workflow state is threaded through, so the AI regenerates from scratch and discards prior field values.
3. `SelfHealingWorkflowEngine` and the `validateAndHealBeforeCredentials` gate operate on the full workflow object including node configs — if a repair strategy triggers regeneration, AI-assigned field values are silently lost.

The fix must make AI-assigned field values the authoritative source of truth: credential injection becomes a fill-missing-only fallback, the generate-workflow handler must carry existing workflow state into continuation requests, and healing logic must be scoped to structural/graph-level repairs only.

## Glossary

- **Bug_Condition (C)**: A node config field that was assigned a non-empty value by the AI build step, which is subsequently overwritten or discarded by a downstream pipeline stage.
- **Property (P)**: After the full pipeline runs, every field value that was set by the AI build step must be present and unchanged in the final workflow object.
- **Preservation**: Existing behaviors that must not regress — fallback credential population for empty fields, user manual edits, structural self-healing, and execution-time field value usage.
- **injectCredentials**: Method in `WorkflowLifecycleManager` (`worker/src/services/workflow-lifecycle-manager.ts`) that maps credential store values into node config fields. Currently overwrites without checking if a value is already present.
- **generateWorkflowGraph / pipeline.run**: The AI generation entry point. Currently called unconditionally on every request, including continuation requests that should preserve existing state.
- **SelfHealingWorkflowEngine**: `worker/src/services/ai/self-healing-workflow-engine.ts` — repairs structural validation errors. May trigger full workflow regeneration, which discards node config values.
- **validateAndHealBeforeCredentials**: Private gate in `WorkflowLifecycleManager` that runs `reconcileWorkflow` before credential evaluation. Structural-only today, but must remain so.
- **AI-assigned value**: A non-empty string value placed into `node.data.config[field]` by the AI generation pipeline before any credential injection or healing step runs.
- **Locked field**: A config field whose value was set by the AI and must not be overwritten by any downstream stage except an explicit user edit.

## Bug Details

### Bug Condition

The bug manifests in three independent code paths, each of which can destroy AI-assigned field values:

**Path A — injectCredentials unconditional overwrite**: When `injectCredentials` finds a matching credential for a node, it writes to `config[field]` without checking whether the field already has a value. The primary injection paths (`credentialContract.credentialFieldName`, `config.webhookUrl`, `config.apiKey`, `config.accessToken`) have no `!config[field]` guard.

**Path B — stateless continuation**: The `generate-workflow` API handler calls `pipeline.run({ userPrompt, userId, correlationId })` on every request. There is no mechanism to pass an existing workflow object into the pipeline for continuation. When the user clicks "continue", the handler regenerates from scratch.

**Path C — self-healing regeneration**: `SelfHealingWorkflowEngine.heal()` may call `requiresRegeneration: true` repair strategies, which invoke the AI generator again. The regenerated workflow replaces the current one entirely, discarding all node config values from the prior generation.

**Formal Specification:**
```
FUNCTION isBugCondition(node, field, pipeline_stage)
  INPUT:
    node          — WorkflowNode with node.data.config[field] set to a non-empty string by AI
    field         — string field name in node.data.config
    pipeline_stage — one of: 'injectCredentials' | 'continuation' | 'selfHeal'
  OUTPUT: boolean

  IF pipeline_stage = 'injectCredentials' THEN
    RETURN node.data.config[field] IS non-empty
           AND injectCredentials writes to config[field] unconditionally
           AND result.node.data.config[field] != original value

  IF pipeline_stage = 'continuation' THEN
    RETURN existing workflow has node.data.config[field] set
           AND generate-workflow handler does NOT receive existing workflow
           AND regenerated workflow.node.data.config[field] is empty or different

  IF pipeline_stage = 'selfHeal' THEN
    RETURN workflow has node.data.config[field] set
           AND heal() triggers requiresRegeneration = true
           AND healed workflow.node.data.config[field] is empty or different

  RETURN false
END FUNCTION
```

### Examples

- **Path A**: AI sets `config.webhookUrl = "https://hooks.slack.com/T123/B456/xyz"` on a Slack node. `injectCredentials` runs, finds a Slack webhook credential in the store, and executes `config.webhookUrl = credentialValue` — overwriting the AI-assigned URL with the stored one (which may be different or stale).
- **Path A**: AI sets `config.apiKey = "sk-proj-abc123"` on an OpenAI node. `injectCredentials` runs PRIORITY 3 path: `if (!config.apiKey && !config.accessToken)` — this guard IS present, so Path A does not affect `apiKey` here. But `config[credentialContract.credentialFieldName]` (line ~2256) has no guard and will overwrite if `credentialFieldName` matches `apiKey`.
- **Path B**: User builds a workflow, AI assigns `config.spreadsheetId = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"`. User clicks "continue". The handler calls `pipeline.run()` fresh — the new workflow has `config.spreadsheetId = ""` (empty, awaiting user input).
- **Path C**: AI assigns `config.model = "gpt-4o"` on an AI node. Structural validation fails (orphaned node). `SelfHealingWorkflowEngine` triggers regeneration. The regenerated workflow has `config.model = "gpt-4"` (default) — the AI-assigned value is gone.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- When a user manually edits a credential field in the UI, the system must continue to update `node.data.config[field]` with the new user-provided value (requirement 3.1).
- When the AI builds a workflow with no pre-assigned value for a credential field (empty or undefined), `injectCredentials` must continue to populate that field from the credentials store as a fallback (requirement 3.2).
- When the workflow has structural or graph-level issues (orphaned nodes, missing edges, cycle violations), self-healing logic must continue to fix those structural issues (requirement 3.3).
- The UI must continue to display the current values from the workflow object (requirement 3.4).
- Workflow execution must continue to use the field values present in the workflow object at execution time (requirement 3.5).

**Scope:**
All inputs where a config field is empty/undefined/null are completely unaffected by this fix — the fallback credential injection path continues to operate normally for those fields. This includes:
- Nodes where the AI did not assign a value (field is empty string, undefined, or null)
- Nodes where the user has not yet provided a value
- Structural graph repairs (edge reconciliation, node injection/removal via orchestrator)

## Hypothesized Root Cause

1. **Missing "already-set" guard in injectCredentials primary paths**: The method has partial guards (`!config.credentialId`, `!config.apiKey && !config.accessToken`) but the main connector-driven paths — `config[credentialContract.credentialFieldName] = credentialValue` (lines ~2256 and ~2334) and `config.webhookUrl = credentialValue` (line ~2291) — write unconditionally. The fix is to add `if (!config[field] || config[field] === '')` guards on all write sites.

2. **Stateless generate-workflow handler**: `generate-workflow.ts` calls `pipeline.run({ userPrompt, userId, correlationId })` with no existing workflow context. The pipeline has no way to know it should preserve an existing workflow's field values. The fix requires the handler to accept an optional `existingWorkflow` in the request body and thread it into the pipeline so the AI can reference it rather than regenerate from scratch.

3. **Self-healing regeneration discards node configs**: `SelfHealingWorkflowEngine.heal()` calls the AI generator when `strategy.requiresRegeneration = true`. The regenerated workflow is a fresh object with default/empty configs. The fix is to merge the original workflow's node configs back into the regenerated workflow after healing — preserving all pre-existing field values while accepting the new structural graph.

4. **No workflow state persistence across prompt cycles**: The memory system (`MemoryManager`, `ReferenceBuilder`) exists but is not used to carry the current workflow object between prompt cycles in the generate-workflow flow. The fix requires storing the current workflow in session/request context so subsequent prompts can reference it.

## Correctness Properties

Property 1: Bug Condition — AI-Assigned Field Values Survive the Full Pipeline

_For any_ workflow node where the AI build step has assigned a non-empty value to a config field (`node.data.config[field] !== ''`), after the complete pipeline runs (credential injection, self-healing gate, any continuation), the fixed system SHALL produce a workflow where `result.node.data.config[field]` equals the original AI-assigned value.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation — Empty Fields Still Receive Fallback Credential Values

_For any_ workflow node where a config field is empty, undefined, or null (`!node.data.config[field]`), the fixed `injectCredentials` SHALL still populate that field from the credentials store when a matching credential exists — preserving the existing fallback behavior for fields the AI did not assign.

**Validates: Requirements 3.1, 3.2**

Property 3: Preservation — Self-Healing Does Not Modify Node Config Field Values

_For any_ workflow passed to `validateAndHealBeforeCredentials` or `SelfHealingWorkflowEngine.heal()`, the fixed healing functions SHALL return a workflow where every pre-existing `node.data.config[field]` value is identical to the input — structural repairs (edges, execution order) may change, but config field values must not.

**Validates: Requirements 2.5, 3.3**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `worker/src/services/workflow-lifecycle-manager.ts`

**Function**: `injectCredentials`

**Specific Changes**:
1. **Add "already-set" guard to all unconditional write sites**: Before every `config[field] = credentialValue` assignment, check `if (!config[field] || config[field] === '')`. This applies to:
   - `config[credentialContract.credentialFieldName] = credentialValue` (both occurrences, lines ~2256 and ~2334)
   - `config.webhookUrl = credentialValue` (line ~2291)
   - `config.apiKey = credentialValue` (line ~2341 generic api_key fallback)
   - The generic field-scan loop that writes to any field containing `'credential'`, `'token'`, `'key'`, or `'secret'`
   - The field-matching loop for nodes without a connector (the `allFields.forEach` block)

---

**File**: `worker/src/api/generate-workflow.ts`

**Function**: `generateWorkflow` handler

**Specific Changes**:
2. **Accept and thread existing workflow state**: Read `body.existingWorkflow` (optional) from the request. When present, pass it into `pipeline.run()` as `existingWorkflow`. The pipeline must use this as the base — merging AI-generated structural changes onto the existing node configs rather than starting from empty defaults.

---

**File**: `worker/src/services/ai/ai-first-pipeline.ts` (or equivalent pipeline entry)

**Function**: `run()`

**Specific Changes**:
3. **Merge existing node configs into generated workflow**: After the AI generates a new workflow graph, if `existingWorkflow` was provided, iterate over the generated nodes and for each node that has a matching node (by type or id) in `existingWorkflow`, copy all non-empty config field values from the existing node into the generated node — preserving AI-assigned values while accepting the new structure.

---

**File**: `worker/src/services/ai/self-healing-workflow-engine.ts`

**Function**: `SelfHealingWorkflowEngine.heal()`

**Specific Changes**:
4. **Preserve node configs after regeneration**: After a `requiresRegeneration` repair produces a new workflow, merge the original workflow's node config values back into the regenerated nodes. Pattern: for each node in `regeneratedWorkflow.nodes`, find the matching node in `originalWorkflow.nodes` (by id or type), and for each field in `originalConfig` that is non-empty, set `regeneratedConfig[field] = originalConfig[field]` (original takes precedence over regenerated defaults).

---

**File**: `worker/src/services/workflow-lifecycle-manager.ts`

**Function**: `validateAndHealBeforeCredentials`

**Specific Changes**:
5. **Assert config field values are unchanged after reconcile**: After `reconcileWorkflow`, verify that no node config field values were modified. This is a structural-only operation and should never touch `node.data.config`. Add a dev-mode assertion (or log warning) if any config field value differs post-reconcile.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Construct workflows with pre-set node config field values, run them through `injectCredentials`, `validateAndHealBeforeCredentials`, and the generate-workflow continuation flow, and assert that the pre-set values are present in the output. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **injectCredentials overwrites webhookUrl** (will fail on unfixed code): Create a Slack node with `config.webhookUrl = "https://hooks.slack.com/original"`. Call `injectCredentials` with a Slack webhook credential `"https://hooks.slack.com/injected"`. Assert `result.config.webhookUrl === "https://hooks.slack.com/original"`.
2. **injectCredentials overwrites credentialFieldName field** (will fail on unfixed code): Create a HubSpot node with `config.apiKey = "original-key"`. Call `injectCredentials` with a HubSpot API key credential. Assert `result.config.apiKey === "original-key"`.
3. **Continuation regenerates from scratch** (will fail on unfixed code): Call the generate-workflow handler with an `existingWorkflow` containing pre-set field values. Assert the returned workflow contains those field values.
4. **Self-healing regeneration discards configs** (may fail on unfixed code): Pass a workflow with pre-set node configs and a structural error to `SelfHealingWorkflowEngine.heal()`. Assert the healed workflow's node configs match the originals.

**Expected Counterexamples**:
- `result.config.webhookUrl` equals the injected credential value, not the original AI-assigned value
- `result.config.apiKey` equals the injected credential value, not the original AI-assigned value
- Possible causes: missing `!config[field]` guard, unconditional assignment in connector-driven injection paths

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL node WHERE node.data.config[field] IS non-empty (AI-assigned) DO
  result := injectCredentials_fixed(workflow_containing_node, credentials)
  ASSERT result.workflow.node.data.config[field] = original_value
END FOR

FOR ALL workflow WHERE existingWorkflow IS provided to generate-workflow DO
  result := generateWorkflow_fixed({ userPrompt, existingWorkflow })
  FOR ALL node IN existingWorkflow.nodes DO
    FOR ALL field WHERE existingWorkflow.node.data.config[field] IS non-empty DO
      ASSERT result.workflow.node.data.config[field] = existingWorkflow.node.data.config[field]
    END FOR
  END FOR
END FOR

FOR ALL workflow WHERE workflow has structural errors AND node configs are set DO
  result := heal_fixed(workflow, validationResult, intent, prompt)
  FOR ALL node IN workflow.nodes DO
    FOR ALL field WHERE workflow.node.data.config[field] IS non-empty DO
      ASSERT result.workflow.node.data.config[field] = workflow.node.data.config[field]
    END FOR
  END FOR
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL node WHERE node.data.config[field] IS empty/undefined DO
  ASSERT injectCredentials_original(workflow, credentials).node.data.config[field]
       = injectCredentials_fixed(workflow, credentials).node.data.config[field]
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many random node configs across the full input domain (empty, undefined, null, various field names)
- It catches edge cases that manual unit tests might miss (e.g., fields that are `"0"` or `false`)
- It provides strong guarantees that the fallback injection behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for empty-field injection, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Empty field fallback preservation**: For any node with `config[field] = ""`, verify `injectCredentials` still populates it from the credentials store after the fix.
2. **Undefined field fallback preservation**: For any node with `config[field] = undefined`, verify `injectCredentials` still populates it after the fix.
3. **User manual edit preservation**: Simulate a user edit event that sets `config[field]` to a new value; verify the workflow is updated (this path is unaffected by the fix but must be regression-tested).
4. **Structural healing preservation**: Pass a workflow with a missing edge to `validateAndHealBeforeCredentials`; verify the edge is added and all node config values are unchanged.

### Unit Tests

- Test `injectCredentials` with a node that has a pre-set `webhookUrl` — assert value is not overwritten
- Test `injectCredentials` with a node that has an empty `webhookUrl` — assert value IS populated from credentials store
- Test `injectCredentials` with a node that has a pre-set `credentialFieldName` field — assert value is not overwritten
- Test `validateAndHealBeforeCredentials` with a structurally invalid workflow — assert node config values are identical before and after
- Test `SelfHealingWorkflowEngine.heal()` with a workflow that has pre-set configs and a structural error — assert configs survive healing

### Property-Based Tests

- **Property 1 (Fix Checking)**: Generate random non-empty string values for node config fields. Run `injectCredentials` with a matching credential. Assert every pre-set field value is unchanged in the result.
- **Property 2 (Preservation)**: Generate random empty/undefined node config fields. Run `injectCredentials` with matching credentials. Assert every empty field is populated (same behavior as unfixed code).
- **Property 3 (Self-Healing Preservation)**: Generate random node configs with arbitrary field values. Introduce a structural error. Run `heal()`. Assert all pre-existing config field values are identical in the healed workflow.

### Integration Tests

- Full pipeline test: AI generates workflow with assigned field values → credential injection runs → assert field values survive in the final workflow object
- Continuation test: Existing workflow with field values → generate-workflow handler called with `existingWorkflow` → assert field values are present in the returned workflow
- Self-healing integration test: Workflow with pre-set configs and a structural error → full lifecycle pipeline → assert configs survive and structural error is fixed
