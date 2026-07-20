# ai-workflow-log-output-branch-generation-fix Bugfix Design

## Overview

The AI workflow generation system incorrectly generates workflows where multiple branches connect to a single `log_output` node, creating an invalid merge topology. This bug has two root causes: (1) the registry and validation layers incorrectly allow multi-input for `log_output` (introduced by the previous spec "log-output-merge-terminal-fix"), and (2) the AI workflow builder doesn't analyze prompts to determine branch-specific outputs and instead relies on the orchestrator to create edges, which may incorrectly merge branches.

This fix is a **two-phase permanent core architecture change**:
- **Phase 1 (Revert)**: Remove `allowsMultipleInputs: true` from `log_output` registry and restore strict single-input validation across all enforcement layers
- **Phase 2 (Fix AI Generation)**: Enhance the AI workflow builder to analyze prompts for branch-specific outputs and generate separate `log_output` nodes per branch when needed

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — the AI workflow builder generates a branching workflow where multiple branches connect to a SINGLE `log_output` node, creating an invalid merge topology
- **Property (P)**: The desired behavior when branching workflows are generated — the AI analyzes the prompt to determine which branches need `log_output` and generates SEPARATE `log_output` nodes for each branch that requires one
- **Preservation**: All existing behaviors for linear workflows, non-branching action sequences, and merge-capable nodes (not `log_output`) must remain unchanged
- **`allowsMultipleInputs`**: A capability flag on `UnifiedNodeDefinition` indicating a node may legally receive more than one incoming edge — this was incorrectly added to `log_output` in the previous spec
- **`hydratePlannedWorkflow`**: The method in `workflow-builder.ts` that converts AI planner output (PlannedWorkflow) into a Workflow with nodes and edges
- **`initializeWorkflow`**: The method in `unified-graph-orchestrator.ts` that creates edges from execution order — currently may create multiple incoming edges to a single `log_output` node
- **Branch-Specific Output Analysis**: The process of analyzing user prompts to determine which branches explicitly require which output nodes (e.g., "admin sends Gmail, viewer logs action")
- **Terminal Node Duplication**: The strategy of generating separate terminal nodes (like `log_output`) for each branch that needs one, rather than sharing a single terminal node

## Bug Details

### Bug Condition

The bug manifests when the AI workflow builder generates a branching workflow (switch/if_else) with multiple branches. The system incorrectly connects all branches to a SINGLE `log_output` node because: (1) the previous spec added `allowsMultipleInputs: true` to `log_output`, allowing invalid merge topologies, and (2) the AI workflow builder doesn't analyze prompts to determine branch-specific outputs.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input — a user prompt requesting a branching workflow
  OUTPUT: boolean
  
  hasBranching := prompt contains switch/if_else logic
  hasMultipleBranches := number of branches > 1
  generatedWorkflow := AI generates workflow from prompt
  logOutputNodes := COUNT(nodes WHERE type = 'log_output' IN generatedWorkflow)
  incomingEdgesToLogOutput := COUNT(edges WHERE target = log_output.id)
  
  RETURN hasBranching
         AND hasMultipleBranches
         AND logOutputNodes = 1
         AND incomingEdgesToLogOutput > 1
         AND (
           registry allows multi-input for log_output
           OR AI builder doesn't analyze branch-specific outputs
           OR orchestrator creates merge edges to single log_output
         )
END FUNCTION
```

### Examples

- **Switch → 3 branches → single log_output**: User prompt: "Based on user role (admin/editor/viewer), perform different actions. Admin sends email, editor updates sheet, viewer logs action." Currently: AI generates Switch with 3 branches all targeting the same `log_output` node. Expected: AI generates Switch with 3 branches, each with its own appropriate output node (Gmail for admin, Google Sheets for editor, `log_output` for viewer).

- **IF → true/false → single log_output**: User prompt: "If temperature > 30, send alert email, otherwise log the reading." Currently: AI generates IF with both branches targeting the same `log_output` node. Expected: AI generates IF with true branch → Gmail, false branch → `log_output`.

- **Nested switch → multiple terminal branches → single log_output**: User prompt: "Switch on department (sales/engineering), then switch on priority (high/low). High priority sends Slack, low priority logs." Currently: AI generates nested switches with all 4 terminal branches targeting one `log_output`. Expected: AI generates nested switches with 2 branches → Slack, 2 branches → `log_output`.

- **Single branch mentions logging**: User prompt: "Switch on status: approved sends email, rejected sends Slack, pending logs action." Currently: AI adds `log_output` to ALL branches. Expected: AI adds Gmail to approved, Slack to rejected, `log_output` to pending only.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Linear workflows without branching must continue to generate a single `log_output` terminal node if logging is required
- Workflows with explicit merge behavior for non-`log_output` nodes (e.g., "all branches merge to send email") must continue to generate proper merge topologies using merge-capable nodes
- Registry-level validation must continue to enforce single-input constraints for `log_output` nodes
- Non-branching action sequences must continue to create linear edge connections without modification
- Workflows that don't mention any output nodes must continue to apply default terminal node logic

**Scope:**
All inputs that do NOT involve branching workflows with multiple branches should be completely unaffected by this fix. This includes:
- All linear workflows (trigger → action → action → log_output)
- All single-branch workflows
- All workflows using merge-capable nodes (not `log_output`)
- All non-output node types and their edge creation logic

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

### Phase 1 Root Causes (Validation Layer)

1. **`log_output` incorrectly registered with `allowsMultipleInputs: true`**: The previous spec "log-output-merge-terminal-fix" added `allowsMultipleInputs: true` to the `log_output` registry entry in `unified-node-registry.ts`. This allows the orchestrator to create multiple incoming edges to a single `log_output` node, which is structurally invalid for terminal nodes.

2. **DAG validator allows multi-input for `log_output`**: In `dag-validator.ts`, the hardcoded `log_output` in-degree check was replaced with a registry-driven check that permits any in-degree ≥ 1 when `allowsMultipleInputs === true`. This must be reverted to enforce `inDegree === 1` for `log_output`.

3. **Edge reconciliation engine doesn't split multi-input `log_output`**: In `edge-reconciliation-engine.ts`, the `splitMultiInputLogOutputs` method was modified to skip splitting for nodes where `allowsMultipleInputs === true`. This must be reverted to clone `log_output` nodes when in-degree > 1 (or better: prevent multi-input in the first place).

4. **Branching validator allows multi-input for `log_output`**: In `graph-branching-validator.ts`, the `allowsMultipleInputs` method was changed to read `nodeDef.allowsMultipleInputs` directly. This must be reverted to return `false` for `log_output`.

### Phase 2 Root Causes (AI Generation Layer)

5. **Automatic log_output injection in `ensureAlwaysRequiredTerminalNodes`**: The `production-workflow-builder.ts` file has a method `ensureAlwaysRequiredTerminalNodes` (line ~3833) that automatically adds `log_output` to EVERY workflow regardless of user intent. This must be removed or made intent-driven.

6. **`alwaysRequired: true` in log_output registry**: The `log_output` registry entry in `worker/src/core/registry/overrides/log-output.ts` has `workflowBehavior: { alwaysRequired: true, autoInject: true }`. This forces log_output to be added to every workflow. Must be changed to `alwaysRequired: false, autoInject: false`.

7. **Automatic switch branch log stubs**: The `createSwitchBranchLogStub` method in `production-workflow-builder.ts` (line ~2462) automatically creates `log_output` nodes for switch branches that don't have explicit outputs. This must be removed - branches should only have outputs mentioned in the user prompt.

8. **AI planner doesn't analyze branch-specific outputs**: The `planWorkflowWithGemini` method in `workflow-builder.ts` generates a `PlannedWorkflow` with steps but doesn't analyze which branches need which output nodes. The planner should parse the prompt to identify branch-specific output requirements (e.g., "admin sends Gmail, viewer logs action").

9. **`hydratePlannedWorkflow` doesn't generate branch-specific nodes**: The `hydratePlannedWorkflow` method converts `PlannedWorkflow` to `Workflow` by creating nodes and calling `initializeWorkflow`. It doesn't check if branching nodes need separate output nodes per branch. It should detect branching and generate separate `log_output` nodes when needed.

10. **`initializeWorkflow` creates merge edges to single terminal**: The `initializeWorkflow` method in `unified-graph-orchestrator.ts` calls `edgeReconciliationEngine.reconcileEdges` which creates edges based on execution order. When multiple branches exist and only one `log_output` node is present, it creates multiple incoming edges to that node. The fix is to ensure the AI generates separate `log_output` nodes BEFORE calling `initializeWorkflow`.

11. **No prompt analysis for nested branching**: The AI builder doesn't handle nested branching structures (switch inside switch) correctly. It should analyze each terminal branch independently and generate separate `log_output` nodes only for branches that explicitly require logging.

12. **No intent detection for logging keywords**: The system doesn't check if the user prompt contains logging-related keywords ("log", "output", "record", "track", "observe") before adding log_output nodes. It should only add them when explicitly requested.

### Phase 2 Root Causes (Additional Auto-Injection Points)

13. **Error branch injector auto-injects log_output**: The `error-branch-injector.ts` file (lines 56-65) automatically creates `error_trigger → log_output` branch with `_autoInjected: true` for ALL workflows regardless of user intent. This must be made intent-driven.

14. **Safety node injector auto-injects log_output**: The `safety-node-injector.ts` file (lines 140-469) automatically injects `log_output` nodes for safety logging and checks `metadata?.injection?.autoInjected === true` to detect existing auto-injected nodes. This must be made intent-driven.

15. **Missing node injector auto-injects log_output**: The `missing-node-injector.ts` file (lines 205-311) automatically injects `log_output` as terminal node with `_autoInjected: true` when detecting missing terminal nodes. This must be made intent-driven.

16. **Node sufficiency checker preserves alwaysRequired nodes**: The `node-sufficiency-checker.ts` file (line 47) preserves nodes marked with `alwaysRequired: true` from registry, preventing removal even when not in user intent. This must check user intent instead of registry flags.

17. **Unified graph orchestrator preserves alwaysRequired nodes**: The `unified-graph-orchestrator.ts` file (lines 635-637) preserves nodes marked with `alwaysRequired: true` or `exemptFromRemoval: true` during reconciliation. This must be made intent-driven.

18. **Edge reconciliation engine preserves alwaysRequired nodes**: The `edge-reconciliation-engine.ts` file (lines 1031-1043) preserves nodes marked with `alwaysRequired: true` or `exemptFromRemoval: true` during edge reconciliation. This must be made intent-driven.

## Correctness Properties

Property 1: Bug Condition - AI Generates Branch-Specific Outputs

_For any_ user prompt where branching logic is requested with multiple branches that have different output requirements, the fixed AI workflow builder SHALL analyze the prompt to determine which branches need which output nodes and generate SEPARATE `log_output` nodes for each branch that explicitly requires logging, ensuring each `log_output` node has exactly ONE incoming edge.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Preservation - Non-Branching Workflows Unchanged

_For any_ user prompt that does NOT involve branching logic with multiple branches (linear workflows, single-branch workflows, non-output node changes), the fixed system SHALL produce exactly the same workflow structure, edge set, and terminal node configuration as the original system, preserving all existing generation behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Phase 1: Revert Multi-Input Capability (Validation Layer)

This phase reverts the changes made in the previous spec "log-output-merge-terminal-fix" to restore strict single-input validation for `log_output`.

#### File 1: `worker/src/core/registry/overrides/log-output.ts`

**Changes Required**:
1. **Remove `allowsMultipleInputs: true`**: Delete or set to `false` the `allowsMultipleInputs` field in the `log_output` registry entry
2. **Restore single-input semantics**: Ensure the registry entry clearly indicates `log_output` is a single-input terminal node

#### File 2: `worker/src/core/validation/dag-validator.ts`

**Changes Required**:
3. **Restore hardcoded `log_output` in-degree check**: Revert the registry-driven check back to the original hardcoded check: `if (normalizedType === 'log_output' && inDegree !== 1)` emit error
4. **Restore `log_output` to `isSpecialNode` string list**: Add back `normalizedType === 'log_output'` to the special node handling
5. **Restore "LOG nodes without MERGE" check**: Ensure the check that errors when a `log_output` has in-degree > 1 is active (not gated on `!nodeDef?.allowsMultipleInputs`)

#### File 3: `worker/src/core/orchestration/edge-reconciliation-engine.ts`

**Changes Required**:
6. **Restore `splitMultiInputLogOutputs` behavior**: Revert the method to clone `log_output` nodes when in-degree > 1, removing the `allowsMultipleInputs` check that skips splitting
7. **Ensure terminal lineage check is active**: Verify the terminal lineage check that prevents multiple branches from converging on a single terminal node is enforced

#### File 4: `worker/src/core/validation/graph-branching-validator.ts`

**Changes Required**:
8. **Restore category/tag heuristic for `allowsMultipleInputs`**: Revert the method body from `return nodeDef.allowsMultipleInputs === true` back to `return nodeDef.category === 'logic' && nodeDef.isBranching && tags.includes('merge')` — this ensures `log_output` returns `false`
9. **Add explicit `log_output` rejection**: Optionally add an explicit check: `if (nodeType === 'log_output') return false` before the heuristic

### Phase 2: Fix AI Workflow Generation (AI Layer)

This phase enhances the AI workflow builder to analyze prompts for branch-specific outputs and generate separate `log_output` nodes per branch when needed.

#### File 5: `worker/src/core/registry/overrides/log-output.ts`

**Changes Required**:
10. **Remove automatic injection flags**: Change `workflowBehavior` from:
    ```typescript
    workflowBehavior: {
      alwaysRequired: true,
      alwaysTerminal: true,
      exemptFromRemoval: true,
      autoInject: true,
      injectionPriority: 10,
    }
    ```
    to:
    ```typescript
    workflowBehavior: {
      alwaysRequired: false,  // ✅ CHANGED: Only add when user requests
      alwaysTerminal: true,
      exemptFromRemoval: false,  // ✅ CHANGED: Can be removed if not in user intent
      autoInject: false,  // ✅ CHANGED: No automatic injection
      injectionPriority: 0,  // ✅ CHANGED: No priority (not auto-injected)
    }
    ```

#### File 6: `worker/src/services/ai/production-workflow-builder.ts`

**Method**: `ensureAlwaysRequiredTerminalNodes` (line ~3833)

**Changes Required**:
11. **Remove automatic log_output injection**: This method currently adds `log_output` to EVERY workflow. Change it to:
    - Check if user prompt contains logging keywords ("log", "output", "record", "track", "observe", "monitor")
    - Only add `log_output` if explicitly requested in prompt
    - For branching workflows, analyze which branches need log_output based on prompt
    - Do NOT add log_output by default

**Method**: `createSwitchBranchLogStub` (line ~2462)

**Changes Required**:
12. **Remove automatic switch branch log stubs**: This method creates `log_output` nodes for empty switch branches. Either:
    - Remove the method entirely, OR
    - Make it check user intent before creating log_output stubs
    - Branches without explicit outputs should remain empty (no automatic log_output)

#### File 7: `worker/src/services/ai/workflow-builder.ts`

**Method**: `planWorkflowWithGemini` (line ~148)

**Changes Required**:
13. **Add branch-specific output analysis to system prompt**: Enhance the system prompt sent to Gemini to explicitly instruct it to identify which branches need which output nodes. Add instructions like: "When generating branching workflows, analyze which branches need which output nodes. If different branches have different outputs (e.g., 'admin sends email, viewer logs'), generate separate output nodes per branch. Do NOT share a single log_output node across multiple branches. ONLY add log_output nodes when the user explicitly requests logging."

14. **Parse planner response for branch-specific outputs**: After receiving the `PlannedWorkflow` from Gemini, analyze the steps to detect if branching nodes have branch-specific output requirements. Look for patterns like:
    - Step with role "branch" or "switch" followed by multiple steps with different output types
    - Steps with metadata indicating branch association (e.g., `branchCase: "admin"`)

**Method**: `hydratePlannedWorkflow` (line ~349)

**Changes Required**:
15. **Detect branching nodes in planned workflow**: Before calling `initializeWorkflow`, scan the `expandedSteps` to identify branching nodes (switch, if_else)

16. **Analyze branch-specific output requirements**: For each branching node, analyze the downstream steps to determine if different branches need different output nodes. Check if:
    - Multiple branches exist (e.g., switch with 3 cases)
    - Different branches have different output types (e.g., case_1 → gmail, case_2 → slack, case_3 → log_output)
    - Only some branches explicitly mention logging

17. **Generate separate `log_output` nodes per branch**: When branch-specific outputs are detected, generate separate `log_output` nodes for each branch that needs one. Assign unique IDs like `log_output_case_1`, `log_output_case_2`, etc.

18. **Update node metadata for branch association**: Add metadata to each branch-specific node indicating which branch it belongs to (e.g., `metadata: { branchCase: "admin", branchParent: "switch_1" }`). This helps the orchestrator create correct edges.

**Method**: `expandBranchSteps` (line ~301)

**Changes Required**:
19. **Preserve branch association metadata**: When expanding collapsed same-type branch steps, preserve metadata indicating which branch each step belongs to. This metadata is used later to generate branch-specific output nodes.

#### File 8: `worker/src/services/ai/system-prompt-builder.ts`

**Changes Required**:
20. **Add branch-aware output instructions**: Enhance the system prompt template to include explicit instructions about branch-specific outputs:
    - "For branching workflows (switch, if_else), analyze which branches need which output nodes"
    - "Generate SEPARATE log_output nodes for each branch that explicitly requires logging"
    - "Do NOT share a single log_output node across multiple branches"
    - "Do NOT automatically add log_output nodes - only add them when the user explicitly requests logging"
    - "Example: 'admin sends email, viewer logs' → generate gmail for admin branch, log_output for viewer branch"

#### File 9: `worker/src/core/orchestration/unified-graph-orchestrator.ts`

**Method**: `initializeWorkflow` (line ~156)

**Changes Required**:
21. **Validate no multi-input to `log_output` before edge creation**: Before calling `edgeReconciliationEngine.reconcileEdges`, validate that no `log_output` node will receive multiple incoming edges. If detected, throw an error with a clear message: "Invalid workflow structure: multiple branches cannot connect to a single log_output node. Generate separate log_output nodes per branch."

22. **Add branch-aware edge creation logic**: When `switchContext` is provided, ensure that case edges connect to branch-specific output nodes (not shared output nodes). Check if target nodes are terminal nodes and validate they don't have multiple incoming edges.

**Method**: `wireSwitchCaseEdges` (line ~244)

**Changes Required**:
23. **Validate terminal node uniqueness per branch**: When wiring switch case edges, check if the target node is a terminal node (like `log_output`). If so, ensure it's not already assigned to another branch. If a terminal node is shared across branches, log a warning and skip the edge (forcing the workflow to fail validation).

#### File 10: `worker/src/services/ai/error-branch-injector.ts`

**Changes Required**:
24. **Make error logging intent-driven**: The `injectErrorBranch` function (lines 56-65) automatically creates `error_trigger → log_output` with `_autoInjected: true`. Change it to:
    - Check if user prompt contains error logging keywords ("error log", "log error", "error handling", "catch error")
    - Only inject error log_output if explicitly requested
    - If user doesn't request error logging, skip log_output injection entirely
    - Error trigger can exist without log_output (errors can be handled other ways)

#### File 11: `worker/src/services/ai/safety-node-injector.ts`

**Changes Required**:
25. **Make safety logging intent-driven**: The `injectSafetyNodes` function (lines 140-469) automatically injects `log_output` for safety. Change it to:
    - Already has `detectUserRequestedSafetyFeatures` - use this consistently
    - Only inject log_output if user explicitly requested safety logging
    - Remove any automatic log_output injection that bypasses intent detection
    - Ensure `shouldInjectSafety` check is enforced for ALL log_output injections

#### File 12: `worker/src/services/ai/missing-node-injector.ts`

**Changes Required**:
26. **Make missing node detection intent-driven**: The `detectMissingNodes` and `injectMissingNodes` methods (lines 205-311) automatically inject `log_output` as terminal. Change it to:
    - Check if user prompt contains logging keywords before marking log_output as "required"
    - Change `required: true` to `required: false` for log_output detection
    - Only inject log_output if user explicitly requested logging
    - Remove automatic terminal node injection logic for log_output

#### File 13: `worker/src/services/ai/node-sufficiency-checker.ts`

**Changes Required**:
27. **Make node preservation intent-driven**: The `checkNodeSufficiency` function (line 47) preserves nodes with `alwaysRequired: true`. Change it to:
    - Remove check for `def?.workflowBehavior?.alwaysRequired === true`
    - Instead, check if node type matches user intent keywords
    - For log_output specifically, only preserve if user intent contains logging keywords
    - Do NOT preserve nodes based solely on registry flags

#### File 14: `worker/src/core/orchestration/unified-graph-orchestrator.ts`

**Changes Required**:
28. **Make orchestrator preservation intent-driven**: The orchestrator (lines 635-637) preserves nodes with `alwaysRequired` or `exemptFromRemoval` flags. Change it to:
    - Remove automatic preservation based on `alwaysRequired` flag
    - Remove automatic preservation based on `exemptFromRemoval` flag
    - Add intent-based preservation: check if node matches user intent
    - For log_output, only preserve if user intent contains logging keywords

#### File 15: `worker/src/core/orchestration/edge-reconciliation-engine.ts`

**Changes Required**:
29. **Make edge reconciliation preservation intent-driven**: The engine (lines 1031-1043) preserves nodes with `alwaysRequired` or `exemptFromRemoval` flags. Change it to:
    - Remove automatic preservation based on `alwaysRequired` flag
    - Remove automatic preservation based on `exemptFromRemoval` flag
    - Add intent-based preservation: check if node matches user intent
    - For log_output, only preserve if user intent contains logging keywords

### Post-Fix Verification

24. **Zero `allowsMultipleInputs: true` for `log_output`**: After Phase 1, verify `unifiedNodeRegistry.get('log_output')?.allowsMultipleInputs !== true`

25. **Zero `alwaysRequired: true` for `log_output`**: After Phase 2, verify `unifiedNodeRegistry.get('log_output')?.workflowBehavior?.alwaysRequired !== true`

26. **AI generates separate `log_output` per branch**: After Phase 2, test that AI-generated branching workflows have separate `log_output` nodes for each branch that needs one

27. **No automatic log_output injection**: After Phase 2, test that workflows without logging keywords in the prompt do NOT have log_output nodes

28. **No multi-input edges to `log_output`**: After both phases, verify that no workflow (AI-generated or DSL-compiled) has multiple incoming edges to a single `log_output` node

29. **Error branch injector respects intent**: After Phase 2, verify error-branch-injector only adds log_output when user requests error logging

30. **Safety node injector respects intent**: After Phase 2, verify safety-node-injector only adds log_output when user requests safety logging

31. **Missing node injector respects intent**: After Phase 2, verify missing-node-injector only adds log_output when user requests logging

32. **Node sufficiency checker respects intent**: After Phase 2, verify node-sufficiency-checker doesn't preserve log_output based on alwaysRequired flag

33. **Orchestrator respects intent**: After Phase 2, verify unified-graph-orchestrator doesn't preserve log_output based on alwaysRequired flag

34. **Edge reconciliation respects intent**: After Phase 2, verify edge-reconciliation-engine doesn't preserve log_output based on alwaysRequired flag

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code to confirm root cause analysis; then verify the fix works correctly and preserves all existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate AI workflow generation for branching prompts and assert that separate `log_output` nodes are generated per branch. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Switch 3-branch test**: Prompt: "Based on user role (admin/editor/viewer), admin sends email, editor updates sheet, viewer logs action." Assert AI generates 3 separate output nodes (gmail, google_sheets, log_output). (Will fail on unfixed code — single `log_output` generated.)

2. **IF both-branch test**: Prompt: "If temperature > 30, send alert email, otherwise log the reading." Assert AI generates IF with true → gmail, false → log_output. (Will fail on unfixed code — both branches → single `log_output`.)

3. **Nested switch test**: Prompt: "Switch on department (sales/engineering), then switch on priority (high/low). High priority sends Slack, low priority logs." Assert AI generates 2 Slack nodes and 2 `log_output` nodes. (Will fail on unfixed code — all branches → single `log_output`.)

4. **Single branch logging test**: Prompt: "Switch on status: approved sends email, rejected sends Slack, pending logs action." Assert AI generates gmail, slack, and log_output (one per branch). (Will fail on unfixed code — all branches get `log_output`.)

5. **Registry validation test**: Assert `unifiedNodeRegistry.get('log_output')?.allowsMultipleInputs === true` on unfixed code. (Will pass on unfixed code — confirms Phase 1 root cause.)

6. **DAG validator test**: Build a workflow with Switch → 3 branches → single `log_output`. Assert DAG validator emits error. (Will fail on unfixed code — no error emitted because `allowsMultipleInputs === true`.)

**Expected Counterexamples**:
- AI generates single `log_output` node for all branches instead of separate nodes per branch
- Registry allows `allowsMultipleInputs: true` for `log_output`
- DAG validator doesn't emit error for multi-input `log_output`
- Edge reconciliation engine creates multiple incoming edges to single `log_output`

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed system produces the expected behavior.

**Pseudocode:**
```
FOR ALL prompt WHERE isBugCondition(prompt) DO
  workflow := AI_generates_workflow_fixed(prompt)
  branchingNodes := nodes WHERE type IN ['switch', 'if_else']
  
  FOR EACH branchingNode IN branchingNodes DO
    branches := get_branches(branchingNode)
    logOutputNodes := nodes WHERE type = 'log_output' AND is_downstream_of(branchingNode)
    
    ASSERT COUNT(logOutputNodes) >= COUNT(branches_that_need_logging)
    
    FOR EACH logOutputNode IN logOutputNodes DO
      incomingEdges := edges WHERE target = logOutputNode.id
      ASSERT COUNT(incomingEdges) = 1
    END FOR
  END FOR
  
  validation := validateWorkflow(workflow)
  ASSERT validation.valid = true
  ASSERT validation.errors.length = 0
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed system produces the same result as the original system.

**Pseudocode:**
```
FOR ALL prompt WHERE NOT isBugCondition(prompt) DO
  workflow_original := AI_generates_workflow_original(prompt)
  workflow_fixed := AI_generates_workflow_fixed(prompt)
  
  ASSERT workflow_original.nodes.length = workflow_fixed.nodes.length
  ASSERT workflow_original.edges.length = workflow_fixed.edges.length
  
  FOR EACH node IN workflow_original.nodes DO
    matching_node := find_node_by_type_and_position(workflow_fixed.nodes, node)
    ASSERT matching_node EXISTS
    ASSERT matching_node.type = node.type
  END FOR
  
  FOR EACH edge IN workflow_original.edges DO
    matching_edge := find_edge(workflow_fixed.edges, edge.source, edge.target)
    ASSERT matching_edge EXISTS
  END FOR
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (random prompts, random node types)
- It catches edge cases that manual unit tests might miss (e.g., prompts with ambiguous branching logic)
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for linear workflows and non-branching prompts, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Linear workflow preservation**: Prompt: "When webhook received, fetch data from API, transform it, send email, log result." Assert workflow structure unchanged after fix (single `log_output` at end).

2. **Single-branch workflow preservation**: Prompt: "If temperature > 30, send alert email and log." Assert workflow structure unchanged (IF with single branch → gmail → log_output).

3. **Non-output node preservation**: Prompt: "Fetch data from API, transform it, store in database." Assert no `log_output` nodes generated (no logging mentioned).

4. **Merge-capable node preservation**: Prompt: "Fetch from two APIs, merge results, send email." Assert merge node used correctly (not `log_output`).

5. **Registry preservation for other nodes**: Assert `unifiedNodeRegistry.get(type)` returns identical definitions for all non-`log_output` node types after fix.

### Unit Tests

**Phase 1 (Revert) Tests**:
- Test `unifiedNodeRegistry.get('log_output')?.allowsMultipleInputs !== true` after revert
- Test DAG validator emits error for `log_output` with in-degree > 1 after revert
- Test `graphBranchingValidator.allowsMultipleInputs('log_output')` returns `false` after revert
- Test `splitMultiInputLogOutputs` clones `log_output` when in-degree > 1 after revert

**Phase 2 (AI Generation) Tests**:
- Test `planWorkflowWithGemini` includes branch-specific output instructions in system prompt
- Test `hydratePlannedWorkflow` detects branching nodes and generates separate `log_output` per branch
- Test `expandBranchSteps` preserves branch association metadata
- Test `initializeWorkflow` validates no multi-input to `log_output` before edge creation
- Test `wireSwitchCaseEdges` validates terminal node uniqueness per branch

### Property-Based Tests

**Phase 1 (Revert) Tests**:
- Generate random workflows with branching nodes and assert DAG validator rejects multi-input `log_output`
- Generate random node types and assert `allowsMultipleInputs` returns `false` for `log_output`

**Phase 2 (AI Generation) Tests**:
- Generate random branching prompts and assert AI generates separate `log_output` per branch that needs one
- Generate random linear prompts and assert AI generates single `log_output` (preservation)
- Generate random nested branching prompts and assert AI generates correct number of `log_output` nodes

### Integration Tests

**Phase 1 (Revert) Tests**:
- Full workflow: `manual_trigger → switch(3 cases) → [action_a, action_b, action_c] → log_output`. Assert `validateWorkflow` returns `valid: false` with error about multi-input `log_output`.
- Full workflow: `manual_trigger → if_else → [true: action_a, false: action_b] → log_output`. Assert validation fails.

**Phase 2 (AI Generation) Tests**:
- Full AI generation: Prompt "Based on user role (admin/editor/viewer), admin sends email, editor updates sheet, viewer logs action." Assert AI generates Switch with 3 branches, each with separate output node (gmail, google_sheets, log_output). Assert `validateWorkflow` returns `valid: true`.
- Full AI generation: Prompt "If temperature > 30, send alert email, otherwise log the reading." Assert AI generates IF with true → gmail, false → log_output. Assert validation passes.
- Full AI generation: Prompt "Switch on department (sales/engineering), then switch on priority (high/low). High priority sends Slack, low priority logs." Assert AI generates nested switches with 2 Slack nodes and 2 `log_output` nodes. Assert validation passes.
- Regression: Prompt "When webhook received, fetch data, transform, send email, log." Assert AI generates linear workflow with single `log_output` at end (preservation).
