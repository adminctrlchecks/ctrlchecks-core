# Implementation Plan

## Phase 1: Revert Multi-Input Capability (Validation Layer)

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - AI Generates Branch-Specific Outputs
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Test concrete failing cases: switch with 3 branches (admin/editor/viewer) where all branches incorrectly connect to single log_output
  - Test that AI-generated branching workflows create separate log_output nodes per branch (from Bug Condition in design)
  - Test cases:
    - Switch 3-branch: "Based on user role (admin/editor/viewer), admin sends email, editor updates sheet, viewer logs action" → assert 3 separate output nodes (gmail, google_sheets, log_output)
    - IF both-branch: "If temperature > 30, send alert email, otherwise log the reading" → assert true → gmail, false → log_output
    - Nested switch: "Switch on department (sales/engineering), then switch on priority (high/low). High priority sends Slack, low priority logs" → assert 2 Slack + 2 log_output nodes
    - Single branch logging: "Switch on status: approved sends email, rejected sends Slack, pending logs action" → assert gmail, slack, log_output (one per branch)
  - Registry validation: assert `unifiedNodeRegistry.get('log_output')?.allowsMultipleInputs === true` on unfixed code
  - DAG validator: build workflow with Switch → 3 branches → single log_output, assert validator emits error
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found:
    - AI generates single log_output for all branches instead of separate nodes
    - Registry allows allowsMultipleInputs: true for log_output
    - DAG validator doesn't emit error for multi-input log_output
    - Edge reconciliation creates multiple incoming edges to single log_output
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Branching Workflows Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-branching workflows:
    - Linear workflow: "When webhook received, fetch data from API, transform it, send email, log result" → observe single log_output at end
    - Single-branch workflow: "If temperature > 30, send alert email and log" → observe IF with single branch → gmail → log_output
    - Non-output node: "Fetch data from API, transform it, store in database" → observe no log_output nodes
    - Merge-capable node: "Fetch from two APIs, merge results, send email" → observe merge node used (not log_output)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements:
    - For all linear prompts (no branching), workflow structure unchanged (single log_output at end if logging mentioned)
    - For all single-branch prompts, workflow structure unchanged
    - For all non-output prompts, no log_output generated
    - For all merge-capable node prompts, merge nodes used correctly
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Revert log_output registry to single-input

  - [x] 3.1 Remove allowsMultipleInputs from log_output registry
    - File: `worker/src/core/registry/overrides/log-output.ts`
    - Remove or set to `false` the `allowsMultipleInputs` field in the log_output registry entry
    - Ensure registry entry clearly indicates log_output is a single-input terminal node
    - _Bug_Condition: isBugCondition(input) where registry allows multi-input for log_output_
    - _Expected_Behavior: unifiedNodeRegistry.get('log_output')?.allowsMultipleInputs !== true_
    - _Preservation: Registry preservation for other nodes (3.5)_
    - _Requirements: 2.1, 3.5_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - AI Generates Branch-Specific Outputs
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Branching Workflows Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Restore strict single-input validation in DAG validator

  - [x] 4.1 Restore hardcoded log_output in-degree check
    - File: `worker/src/core/validation/dag-validator.ts`
    - Revert registry-driven check back to original hardcoded check: `if (normalizedType === 'log_output' && inDegree !== 1)` emit error
    - Restore log_output to isSpecialNode string list: add back `normalizedType === 'log_output'` to special node handling
    - Restore "LOG nodes without MERGE" check: ensure check that errors when log_output has in-degree > 1 is active (not gated on `!nodeDef?.allowsMultipleInputs`)
    - _Bug_Condition: isBugCondition(input) where DAG validator allows multi-input for log_output_
    - _Expected_Behavior: DAG validator emits error for log_output with in-degree > 1_
    - _Preservation: Non-output node preservation (3.3)_
    - _Requirements: 2.1, 3.3_

  - [x] 4.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - AI Generates Branch-Specific Outputs
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 4.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Branching Workflows Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)

- [x] 5. Restore terminal lineage check in edge reconciliation engine

  - [x] 5.1 Restore splitMultiInputLogOutputs behavior
    - File: `worker/src/core/orchestration/edge-reconciliation-engine.ts`
    - Revert method to clone log_output nodes when in-degree > 1, removing the allowsMultipleInputs check that skips splitting
    - Ensure terminal lineage check that prevents multiple branches from converging on single terminal node is enforced
    - _Bug_Condition: isBugCondition(input) where edge reconciliation creates multi-input to log_output_
    - _Expected_Behavior: splitMultiInputLogOutputs clones log_output when in-degree > 1_
    - _Preservation: Merge-capable node preservation (3.4)_
    - _Requirements: 2.1, 3.4_

  - [x] 5.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - AI Generates Branch-Specific Outputs
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 5.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Branching Workflows Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)

- [x] 6. Reject multi-input for log_output in branching validator

  - [x] 6.1 Restore category/tag heuristic for allowsMultipleInputs
    - File: `worker/src/core/validation/graph-branching-validator.ts`
    - Revert method body from `return nodeDef.allowsMultipleInputs === true` back to `return nodeDef.category === 'logic' && nodeDef.isBranching && tags.includes('merge')`
    - Add explicit log_output rejection: `if (nodeType === 'log_output') return false` before heuristic
    - _Bug_Condition: isBugCondition(input) where branching validator allows multi-input for log_output_
    - _Expected_Behavior: graphBranchingValidator.allowsMultipleInputs('log_output') returns false_
    - _Preservation: Registry preservation for other nodes (3.5)_
    - _Requirements: 2.1, 3.5_

  - [x] 6.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - AI Generates Branch-Specific Outputs
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 6.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Branching Workflows Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)

## Phase 2: Fix AI Workflow Generation (AI Layer)

- [x] 7. Remove automatic log_output injection from registry

  - [x] 7.1 Change workflowBehavior flags in log_output registry
    - File: `worker/src/core/registry/overrides/log-output.ts`
    - Change `alwaysRequired: true` to `alwaysRequired: false`
    - Change `autoInject: true` to `autoInject: false`
    - Change `exemptFromRemoval: true` to `exemptFromRemoval: false`
    - Change `injectionPriority: 10` to `injectionPriority: 0`
    - _Bug_Condition: isBugCondition(input) where registry forces log_output into every workflow_
    - _Expected_Behavior: log_output only added when user explicitly requests logging_
    - _Preservation: Linear workflows with explicit logging requests (3.1)_
    - _Requirements: 2.1, 2.2, 3.1_

  - [x] 7.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - AI Generates Branch-Specific Outputs
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 7.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Branching Workflows Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)

- [x] 8. Remove automatic log_output injection from production workflow builder

  - [x] 8.1 Make ensureAlwaysRequiredTerminalNodes intent-driven
    - File: `worker/src/services/ai/production-workflow-builder.ts`
    - Method: `ensureAlwaysRequiredTerminalNodes` (line ~1117)
    - Add intent detection: check if user prompt contains logging keywords ("log", "output", "record", "track", "observe", "monitor")
    - Only add log_output if explicitly requested in prompt
    - For branching workflows, analyze which branches need log_output based on prompt
    - Do NOT add log_output by default to every workflow
    - _Bug_Condition: isBugCondition(input) where method auto-injects log_output regardless of intent_
    - _Expected_Behavior: log_output only added when user intent detected_
    - _Preservation: Workflows with explicit logging requests (3.1)_
    - _Requirements: 2.1, 2.9, 3.1_

  - [x] 8.2 Remove or disable createSwitchBranchLogStub method
    - File: `worker/src/services/ai/production-workflow-builder.ts`
    - Method: `createSwitchBranchLogStub` (line ~2463)
    - Either remove the method entirely OR make it check user intent before creating log_output stubs
    - Branches without explicit outputs should remain empty (no automatic log_output)
    - _Bug_Condition: isBugCondition(input) where method creates log_output for empty branches_
    - _Expected_Behavior: branches only have outputs mentioned in user prompt_
    - _Preservation: Switch workflows with explicit branch outputs (3.2)_
    - _Requirements: 2.3, 3.2_

  - [x] 8.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - AI Generates Branch-Specific Outputs
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 8.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Branching Workflows Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)

- [x] 9. Enhance system prompt with branch-aware output instructions

- [ ] 9. Enhance system prompt with branch-aware output instructions

  - [x] 9.1 Add branch-aware output instructions to system prompt
    - File: `worker/src/services/ai/system-prompt-builder.ts`
    - Enhance system prompt template to include explicit instructions about branch-specific outputs:
      - "For branching workflows (switch, if_else), analyze which branches need which output nodes"
      - "Generate SEPARATE log_output nodes for each branch that explicitly requires logging"
      - "Do NOT share a single log_output node across multiple branches"
      - "Do NOT automatically add log_output nodes - only add them when the user explicitly requests logging"
      - "Example: 'admin sends email, viewer logs' → generate gmail for admin branch, log_output for viewer branch"
    - _Bug_Condition: isBugCondition(input) where AI planner doesn't analyze branch-specific outputs_
    - _Expected_Behavior: System prompt includes branch-aware output instructions_
    - _Preservation: Linear workflow preservation (3.1)_
    - _Requirements: 2.2, 2.4, 2.9, 3.1_

  - [x] 9.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - AI Generates Branch-Specific Outputs
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 9.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Branching Workflows Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)

- [x] 10. Add prompt analysis for branch-specific outputs in workflow builder

  - [x] 10.1 Add branch-specific output analysis to planWorkflowWithGemini
    - File: `worker/src/services/ai/workflow-builder.ts`
    - Method: `planWorkflowWithGemini` (line ~148)
    - After receiving PlannedWorkflow from Gemini, analyze steps to detect if branching nodes have branch-specific output requirements
    - Look for patterns:
      - Step with role "branch" or "switch" followed by multiple steps with different output types
      - Steps with metadata indicating branch association (e.g., `branchCase: "admin"`)
    - _Bug_Condition: isBugCondition(input) where AI planner doesn't parse branch-specific outputs_
    - _Expected_Behavior: planWorkflowWithGemini analyzes PlannedWorkflow for branch-specific outputs_
    - _Preservation: Single-branch workflow preservation (3.2)_
    - _Requirements: 2.2, 3.2_

  - [x] 10.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - AI Generates Branch-Specific Outputs
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 10.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Branching Workflows Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)

- [x] 11. Generate separate log_output nodes per branch in hydratePlannedWorkflow

  - [x] 11.1 Detect branching nodes and generate branch-specific log_output
    - File: `worker/src/services/ai/workflow-builder.ts`
    - Method: `hydratePlannedWorkflow` (line ~349)
    - Before calling initializeWorkflow, scan expandedSteps to identify branching nodes (switch, if_else)
    - For each branching node, analyze downstream steps to determine if different branches need different output nodes
    - Check if:
      - Multiple branches exist (e.g., switch with 3 cases)
      - Different branches have different output types (e.g., case_1 → gmail, case_2 → slack, case_3 → log_output)
      - Only some branches explicitly mention logging
    - Generate separate log_output nodes per branch that needs one (unique IDs like log_output_case_1, log_output_case_2)
    - Add metadata to each branch-specific node: `metadata: { branchCase: "admin", branchParent: "switch_1" }`
    - _Bug_Condition: isBugCondition(input) where hydratePlannedWorkflow doesn't generate branch-specific nodes_
    - _Expected_Behavior: hydratePlannedWorkflow generates separate log_output per branch_
    - _Preservation: Non-output node preservation (3.3)_
    - _Requirements: 2.3, 3.3_

  - [x] 9.2 Preserve branch association metadata in expandBranchSteps
    - File: `worker/src/services/ai/workflow-builder.ts`
    - Method: `expandBranchSteps` (line ~301)
    - When expanding collapsed same-type branch steps, preserve metadata indicating which branch each step belongs to
    - This metadata is used later to generate branch-specific output nodes
    - _Bug_Condition: isBugCondition(input) where branch metadata is lost during expansion_
    - _Expected_Behavior: expandBranchSteps preserves branch association metadata_
    - _Preservation: Merge-capable node preservation (3.4)_
    - _Requirements: 2.4, 3.4_

  - [x] 9.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - AI Generates Branch-Specific Outputs
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 9.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Branching Workflows Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)

- [x] 10. Add validation in unified-graph-orchestrator to prevent multi-input to log_output

  - [x] 10.1 Validate no multi-input to log_output before edge creation
    - File: `worker/src/core/orchestration/unified-graph-orchestrator.ts`
    - Method: `initializeWorkflow` (line ~156)
    - Before calling edgeReconciliationEngine.reconcileEdges, validate that no log_output node will receive multiple incoming edges
    - If detected, throw error: "Invalid workflow structure: multiple branches cannot connect to a single log_output node. Generate separate log_output nodes per branch."
    - _Bug_Condition: isBugCondition(input) where initializeWorkflow creates merge edges to single log_output_
    - _Expected_Behavior: initializeWorkflow validates no multi-input to log_output_
    - _Preservation: Registry preservation for other nodes (3.5)_
    - _Requirements: 2.5, 3.5_

  - [x] 10.2 Validate terminal node uniqueness per branch in wireSwitchCaseEdges
    - File: `worker/src/core/orchestration/unified-graph-orchestrator.ts`
    - Method: `wireSwitchCaseEdges` (line ~244)
    - When wiring switch case edges, check if target node is terminal node (like log_output)
    - If so, ensure it's not already assigned to another branch
    - If terminal node shared across branches, log warning and skip edge (force workflow to fail validation)
    - _Bug_Condition: isBugCondition(input) where wireSwitchCaseEdges allows shared terminal nodes_
    - _Expected_Behavior: wireSwitchCaseEdges validates terminal node uniqueness per branch_
    - _Preservation: Merge-capable node preservation (3.4)_
    - _Requirements: 2.5, 3.4_

  - [x] 10.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - AI Generates Branch-Specific Outputs
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 10.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Branching Workflows Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)

- [x] 11. Checkpoint - Ensure all tests pass
  - Run all bug condition exploration tests (task 1) - expect all to PASS
  - Run all preservation tests (task 2) - expect all to PASS
  - Run integration tests:
    - Full AI generation: "Based on user role (admin/editor/viewer), admin sends email, editor updates sheet, viewer logs action" → assert Switch with 3 branches, each with separate output node (gmail, google_sheets, log_output), validateWorkflow returns valid: true
    - Full AI generation: "If temperature > 30, send alert email, otherwise log the reading" → assert IF with true → gmail, false → log_output, validation passes
    - Full AI generation: "Switch on department (sales/engineering), then switch on priority (high/low). High priority sends Slack, low priority logs" → assert nested switches with 2 Slack + 2 log_output nodes, validation passes
    - Regression: "When webhook received, fetch data, transform, send email, log" → assert linear workflow with single log_output at end (preservation)
  - Verify post-fix conditions:
    - Zero allowsMultipleInputs: true for log_output
    - AI generates separate log_output per branch
    - No multi-input edges to log_output in any workflow
  - Ensure all tests pass, ask the user if questions arise

## Phase 3: Remove Auto-Injection from Additional Files

- [x] 12. Make error-branch-injector intent-driven

  - [x] 12.1 Add intent detection to injectErrorBranch
    - File: `worker/src/services/ai/error-branch-injector.ts`
    - Function: `injectErrorBranch` (lines 56-65)
    - Add check for error logging keywords in user prompt: "error log", "log error", "error handling", "catch error"
    - Only create log_output node if user explicitly requested error logging
    - If no error logging requested, create error_trigger without log_output
    - Remove `_autoInjected: true` flag from config
    - _Bug_Condition: isBugCondition(input) where error-branch-injector auto-injects log_output_
    - _Expected_Behavior: error-branch-injector only injects log_output when user requests error logging_
    - _Requirements: 2.10_

  - [x] 12.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - AI Generates Branch-Specific Outputs
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.10_

  - [x] 12.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Branching Workflows Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)

- [x] 13. Make safety-node-injector intent-driven

  - [x] 13.1 Enforce intent detection in injectSafetyNodes
    - File: `worker/src/services/ai/safety-node-injector.ts`
    - Function: `injectSafetyNodes` (lines 140-469)
    - Already has `detectUserRequestedSafetyFeatures` - ensure it's used consistently
    - Ensure `shouldInjectSafety` check is enforced for ALL log_output injections
    - Remove any automatic log_output injection that bypasses intent detection
    - Only inject log_output if user explicitly requested safety logging
    - _Bug_Condition: isBugCondition(input) where safety-node-injector auto-injects log_output_
    - _Expected_Behavior: safety-node-injector only injects log_output when user requests safety logging_
    - _Requirements: 2.11_

  - [x] 13.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - AI Generates Branch-Specific Outputs
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.11_

  - [x] 13.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Branching Workflows Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)

- [x] 14. Make missing-node-injector intent-driven

  - [x] 14.1 Add intent detection to detectMissingNodes and injectMissingNodes
    - File: `worker/src/services/ai/missing-node-injector.ts`
    - Methods: `detectMissingNodes` and `injectMissingNodes` (lines 205-311)
    - Check if user prompt contains logging keywords before marking log_output as "required"
    - Change `required: true` to `required: false` for log_output detection
    - Only inject log_output if user explicitly requested logging
    - Remove automatic terminal node injection logic for log_output
    - Remove `_autoInjected: true` flag from config
    - _Bug_Condition: isBugCondition(input) where missing-node-injector auto-injects log_output_
    - _Expected_Behavior: missing-node-injector only injects log_output when user requests logging_
    - _Requirements: 2.12_

  - [x] 14.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - AI Generates Branch-Specific Outputs
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.12_

  - [x] 14.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Branching Workflows Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)

- [x] 15. Make node-sufficiency-checker intent-driven

  - [x] 15.1 Remove alwaysRequired flag check from checkNodeSufficiency
    - File: `worker/src/services/ai/node-sufficiency-checker.ts`
    - Function: `checkNodeSufficiency` (line 47)
    - Remove check for `def?.workflowBehavior?.alwaysRequired === true`
    - Instead, check if node type matches user intent keywords
    - For log_output specifically, only preserve if user intent contains logging keywords
    - Do NOT preserve nodes based solely on registry flags
    - _Bug_Condition: isBugCondition(input) where node-sufficiency-checker preserves log_output based on alwaysRequired_
    - _Expected_Behavior: node-sufficiency-checker only preserves log_output when user intent detected_
    - _Requirements: 2.13_

  - [x] 15.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - AI Generates Branch-Specific Outputs
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.13_

  - [x] 15.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Branching Workflows Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)

- [x] 16. Make unified-graph-orchestrator preservation intent-driven

  - [x] 16.1 Remove alwaysRequired and exemptFromRemoval flag checks
    - File: `worker/src/core/orchestration/unified-graph-orchestrator.ts`
    - Lines: 635-637
    - Remove automatic preservation based on `alwaysRequired` flag
    - Remove automatic preservation based on `exemptFromRemoval` flag
    - Add intent-based preservation: check if node matches user intent
    - For log_output, only preserve if user intent contains logging keywords
    - _Bug_Condition: isBugCondition(input) where orchestrator preserves log_output based on flags_
    - _Expected_Behavior: orchestrator only preserves log_output when user intent detected_
    - _Requirements: 2.14_

  - [x] 16.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - AI Generates Branch-Specific Outputs
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.14_

  - [x] 16.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Branching Workflows Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)

- [x] 17. Make edge-reconciliation-engine preservation intent-driven

  - [x] 17.1 Remove alwaysRequired and exemptFromRemoval flag checks
    - File: `worker/src/core/orchestration/edge-reconciliation-engine.ts`
    - Lines: 1031-1043
    - Remove automatic preservation based on `alwaysRequired` flag
    - Remove automatic preservation based on `exemptFromRemoval` flag
    - Add intent-based preservation: check if node matches user intent
    - For log_output, only preserve if user intent contains logging keywords
    - _Bug_Condition: isBugCondition(input) where edge-reconciliation preserves log_output based on flags_
    - _Expected_Behavior: edge-reconciliation only preserves log_output when user intent detected_
    - _Requirements: 2.15_

  - [x] 17.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - AI Generates Branch-Specific Outputs
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.15_

  - [x] 17.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Branching Workflows Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)

- [x] 18. Final Checkpoint - Comprehensive Verification
  - Run all bug condition exploration tests (task 1) - expect all to PASS
  - Run all preservation tests (task 2) - expect all to PASS
  - Run integration tests from task 11
  - Verify ALL post-fix conditions:
    - Zero allowsMultipleInputs: true for log_output
    - Zero alwaysRequired: true for log_output
    - AI generates separate log_output per branch
    - No automatic log_output injection from ANY file
    - No multi-input edges to log_output in any workflow
    - Error-branch-injector respects intent
    - Safety-node-injector respects intent
    - Missing-node-injector respects intent
    - Node-sufficiency-checker respects intent
    - Unified-graph-orchestrator respects intent
    - Edge-reconciliation-engine respects intent
  - Test workflows WITHOUT logging keywords - should have ZERO log_output nodes
  - Test workflows WITH logging keywords - should have log_output nodes ONLY where requested
  - Ensure all tests pass, ask the user if questions arise
