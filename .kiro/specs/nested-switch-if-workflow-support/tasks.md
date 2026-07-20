# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Nested Branching Structural Prompt Accuracy
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate all three bugs exist simultaneously
  - **Scoped PBT Approach**: Scope the property to concrete failing cases — node lists with exactly 2 branching nodes interspersed with action nodes
  - Construct node lists of the form `[manual_trigger, switch, gmail, switch, slack, hubspot]` where both `switch` nodes have `isBranching: true` in the registry
  - Assert that `composeText()` output contains at least two distinct indentation levels (e.g. `  →` for level 1 and `    →` for level 2) — will FAIL on unfixed code because all downstream nodes appear as flat `case_1`/`case_2` cases of the first switch
  - Assert that `buildConditions()` returns `conditions.length === branchingNodeCount` (i.e. 2 for a 2-switch input) — will FAIL on unfixed code because only one condition is emitted
  - Assert that `enforceRegistrySelectionContract()` with `requiredNodeTypes: ["switch", "switch"]` returns a `selectedNodes` array containing exactly 2 nodes with `isBranching === true` — will FAIL on unfixed code because the `seen` Set drops the second switch
  - Also test `[webhook, switch, if_else, gmail, slack]` (mixed branching types): assert `conditions.length === 2` and text has two indentation levels
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct — it proves the bugs exist)
  - Document counterexamples found (e.g. `composeText()` output contains only one `  →` level; `conditions.length === 1`; `selectedNodes` has only one switch node)
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Single-Level and Linear Workflows Unchanged
  - **IMPORTANT**: Follow observation-first methodology — run UNFIXED code first, observe outputs, then encode as properties
  - Observe: `composeText()` with `[manual_trigger, switch, gmail, slack]` (single switch) produces a single-level `  →` structure on unfixed code — record exact output
  - Observe: `composeText()` with `[manual_trigger, google_sheets, google_gmail]` (linear, no branching) produces a flat numbered list with no `  →` lines on unfixed code — record exact output
  - Observe: `enforceRegistrySelectionContract()` with `[{type: "google_gmail"}, {type: "google_gmail"}]` (two non-branching duplicates) preserves both instances on unfixed code — record exact count
  - Write property-based test: for all node lists where `isBugCondition` is false (zero or one branching node), the fixed `generate()` output equals the unfixed output — covers linear workflows and single-level switch/if_else
  - Write property-based test: for all `requiredTypes` arrays containing only non-branching duplicate types, `enforceRegistrySelectionContract()` output is unchanged by the fix
  - Generate random node lists with zero branching nodes; assert fixed output equals observed unfixed output
  - Generate random node lists with exactly one branching node; assert fixed output equals observed unfixed output
  - Verify all preservation tests PASS on UNFIXED code before proceeding
  - **EXPECTED OUTCOME**: Tests PASS on unfixed code (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix `enforceRegistrySelectionContract()` — exempt branching types from Set deduplication

  - [x] 3.1 Implement the fix in `worker/src/services/ai/stages/node-selection-stage.ts`
    - In the `requiredTypes` injection loop, check `unifiedNodeRegistry.get(reqType)?.isBranching` before applying the `seen.has(reqType)` guard
    - If `isBranching === true`, skip the `seen` check and always push the node into `withoutExtraTriggers` regardless of whether the type is already in `seen`
    - If `isBranching !== true`, apply the existing `seen.has(reqType)` guard unchanged
    - Do NOT change the `withoutExtraTriggers` trigger-deduplication logic
    - Do NOT change the `allowedSet` enforcement logic — unknown types are still rejected
    - Do NOT change the `kept` array building loop's `allowedSet` filter
    - _Bug_Condition: isBugCondition(nodes) where COUNT(n WHERE isBranching) >= 2_
    - _Expected_Behavior: selectedNodes contains exactly as many isBranching nodes as were in requiredTypes_
    - _Preservation: non-branching type deduplication via `seen` Set is unchanged; trigger deduplication is unchanged; allowedSet enforcement is unchanged_
    - _Requirements: 2.3, 3.3, 3.4_

  - [x] 3.2 Verify bug condition exploration test now passes for the `enforceRegistrySelectionContract()` assertion
    - **Property 1: Expected Behavior** - Branching Node Preservation in Contract Enforcement
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The assertion `selectedNodes contains 2 isBranching nodes when requiredTypes has ["switch","switch"]` must now pass
    - **EXPECTED OUTCOME**: The `enforceRegistrySelectionContract()` assertion in task 1's test PASSES
    - _Requirements: 2.3_

  - [x] 3.3 Verify preservation tests still pass after this change
    - **Property 2: Preservation** - Non-Branching Deduplication Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - **EXPECTED OUTCOME**: All preservation tests PASS (confirms no regressions in deduplication behavior)

- [x] 4. Fix `StructuralPromptGenerator.buildConditions()` — scope downstream slice per branching node

  - [x] 4.1 Implement the fix in `worker/src/services/ai/stages/structural-prompt-generator.ts`
    - In `buildConditions()`, replace the `nodes.slice(i + 1)` downstream slice with a scoped slice that only includes nodes belonging to that branching node's sub-tree
    - The sub-tree for branching node at index `i` ends at the index of the next branching node at the same or higher nesting level (exclusive), or at the end of the array if no such node exists
    - Use the same tree-scoping logic that will be introduced in `buildBranchTree()` (task 5) to determine the correct sub-tree boundary for each branching node
    - Ensure one `StructuralCondition` is emitted per branching node found in the resolved node list
    - `trueOutcome`/`falseOutcome` for each condition must be derived from the intent and the correctly scoped downstream nodes at that level
    - _Bug_Condition: isBugCondition(nodes) where COUNT(n WHERE isBranching) >= 2_
    - _Expected_Behavior: conditions.length === COUNT(n WHERE isBranching); each condition's outcomes reference only that node's own downstream sub-tree_
    - _Preservation: single-branching-node inputs still produce conditions.length === 1 with correct outcomes; linear inputs still produce conditions.length === 0_
    - _Requirements: 2.2, 3.1, 3.2_

  - [x] 4.2 Verify bug condition exploration test now passes for the `buildConditions()` assertion
    - **Property 1: Expected Behavior** - Conditions Array Length Equals Branching Node Count
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The assertion `conditions.length === 2` for a 2-branching-node input must now pass
    - **EXPECTED OUTCOME**: The `buildConditions()` assertion in task 1's test PASSES
    - _Requirements: 2.2_

  - [x] 4.3 Verify preservation tests still pass after this change
    - **Property 2: Preservation** - Single-Level and Linear Conditions Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - **EXPECTED OUTCOME**: All preservation tests PASS

- [x] 5. Fix `StructuralPromptGenerator.composeText()` — replace flat iteration with recursive tree renderer

  - [x] 5.1 Introduce `BranchTreeNode` interface in `worker/src/services/ai/stages/structural-prompt-generator.ts`
    - Define a local interface `BranchTreeNode` with fields: `step: StructuralStep` (the branching node) and `children: Array<StructuralStep | BranchTreeNode>` (leaf steps or nested branching sub-trees)
    - This interface is internal to the file — do not export it

  - [x] 5.2 Implement `buildBranchTree()` recursive helper
    - Takes the full `StructuralStep[]` array and a starting index
    - Groups steps into a `BranchTreeNode[]` by consuming steps until it encounters a branching node at the same or higher nesting level
    - When it encounters a branching node, it recursively calls itself to build that node's sub-tree
    - Returns the constructed `BranchTreeNode[]` and the index at which it stopped consuming
    - Must be purely functional — no side effects, no mutation of the input array

  - [x] 5.3 Implement `renderBranchTree()` recursive helper with indentation depth
    - Takes a `BranchTreeNode[]` and an integer `depth` (starting at 1)
    - For each `BranchTreeNode`, emits a line: `N. DisplayName — evaluates conditions and routes to the appropriate branch`
    - For each leaf `StructuralStep` child, emits a line: `{indent}→ Case "{caseLabel}": DisplayName — description` where `{indent}` is `"  ".repeat(depth)` (two spaces per depth level)
    - For each nested `BranchTreeNode` child, recurses with `depth + 1`
    - Returns the array of rendered lines

  - [x] 5.4 Replace flat `findIndex` / `downstreamSteps` loop in `composeText()` with recursive tree approach
    - Remove the `branchingStepIdx` / `downstreamSteps` flat loop
    - Call `buildBranchTree()` on the full steps list to produce a `BranchTreeNode[]`
    - Call `renderBranchTree()` on the result to produce the FLOW section lines
    - Pre-branching linear steps (steps before the first branching node) are still emitted as numbered lines before the tree output
    - The CONNECTIONS section text must be updated to reflect the nested structure
    - _Bug_Condition: isBugCondition(nodes) where COUNT(n WHERE isBranching) >= 2_
    - _Expected_Behavior: composeText() output contains at least two distinct indentation levels (`  →` for depth 1, `    →` for depth 2) for inputs with 2+ branching nodes_
    - _Preservation: single-branching-node inputs still produce single-level `  →` output; linear inputs still produce flat numbered list with no `  →` lines_
    - _Requirements: 2.1, 3.1, 3.2_

  - [x] 5.5 Verify bug condition exploration test now passes for the `composeText()` assertion
    - **Property 1: Expected Behavior** - Nested Branching Structural Prompt Accuracy
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The assertion that output contains two distinct indentation levels must now pass
    - **EXPECTED OUTCOME**: The `composeText()` assertion in task 1's test PASSES
    - _Requirements: 2.1_

  - [x] 5.6 Verify preservation tests still pass after this change
    - **Property 2: Preservation** - Single-Level and Linear composeText Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - **EXPECTED OUTCOME**: All preservation tests PASS

- [x] 6. Fix `buildEdgeReasoningPrompt()` — add nested branching edge ownership rule

  - [x] 6.1 Implement the fix in `worker/src/services/ai/system-prompt-builder.ts`
    - In `buildEdgeReasoningPrompt()`, add the following rule to the EDGE RULES section after the existing switch case rule: "For NESTED branching (a switch or if_else that is itself inside a branch of another switch/if_else): the inner branching node's outgoing edges MUST use the inner switch's own case values, NOT the outer switch's case values. Each level of nesting has its own independent set of case labels."
    - Append a concrete nested switch example to the EDGE RULES section:
      ```
      Example — nested switch:
        outer_switch → (case "A") → inner_switch
        inner_switch → (case "X") → node_for_AX
        inner_switch → (case "Y") → node_for_AY
        outer_switch → (case "B") → node_for_B
      The inner_switch edges use "X" and "Y", NOT "A" or "B".
      ```
    - Do NOT change any other section of the prompt (DAG_CONSTRAINTS, SELF-CHECK, output schema, etc.)
    - _Bug_Condition: structural prompt passed to buildEdgeReasoningPrompt() describes nested branching (per fix in task 5)_
    - _Expected_Behavior: system prompt contains explicit nested branching edge ownership rule and concrete example_
    - _Preservation: all existing EDGE RULES, DAG_CONSTRAINTS, and SELF-CHECK content is unchanged_
    - _Requirements: 2.4, 3.5_

  - [x] 6.2 Verify `buildEdgeReasoningPrompt()` output contains the nested branching rule text
    - Write a unit test that calls `systemPromptBuilder.build({ stage: 'edge_reasoning', ... })` and asserts the returned `systemPrompt` string contains the nested branching rule text and the nested switch example
    - _Requirements: 2.4_

- [x] 7. Write fix verification tests
  - Write unit tests that verify the fix works correctly for all inputs where `isBugCondition` holds:
  - Test `composeText()` with `[manual_trigger, switch, gmail, switch, slack, hubspot]` (switch-in-switch): assert output contains `  →` (two-space indent) AND `    →` (four-space indent) — two distinct indentation levels
  - Test `buildConditions()` with the same 2-switch node list: assert `conditions.length === 2`
  - Test `buildConditions()` with `[webhook, switch, if_else, gmail, slack]` (mixed types): assert `conditions.length === 2`
  - Test `enforceRegistrySelectionContract()` with `requiredNodeTypes: ["switch", "switch"]` and a parsed list containing two switch nodes: assert output contains exactly 2 nodes with `isBranching === true`
  - Test `buildBranchTree()` with a two-level switch-in-switch input: assert the returned tree has the outer switch as root with the inner switch as a nested `BranchTreeNode` child
  - Test `renderBranchTree()` with a pre-built two-level tree: assert output lines contain `  →` at depth 1 and `    →` at depth 2
  - Test `enforceRegistrySelectionContract()` with two non-branching duplicate types (e.g. two `google_gmail` nodes) in `requiredNodeTypes`: assert deduplication still applies (only one gmail in output) — regression guard
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 8. Fix `resolveCapabilitySelections()` — preserve per-step branching node count in flat constraint list

  - [x] 8.1 Implement the fix in `worker/src/services/ai/pipeline/workflow-generation-pipeline.ts`
    - In `resolveCapabilitySelections()`, replace `[...new Set(flat)]` with a count-aware flat list that preserves multiple instances of the same branching type
    - When a step's `userPicked` contains a branching node type (check `unifiedNodeRegistry.get(type)?.isBranching`), push it into `flat` once per step rather than deduplicating across steps
    - Non-branching types continue to be deduplicated in the flat list via `Set` as before
    - The `byStep` map is unchanged — it already correctly records per-step selections
    - _Expected_Behavior: if two steps each select `"switch"`, the flat list contains `["switch", "switch"]` so the node selection LLM receives the signal that two switch nodes are needed_
    - _Preservation: non-branching type deduplication in flat list is unchanged; byStep map is unchanged_
    - _Requirements: 2.3_

  - [x] 8.2 Implement the same fix in `worker/src/api/generate-workflow.ts`
    - In `resolveAnalyzeCapabilitySelections()`, the `globallyAssigned` Set prevents the same node type from being assigned to two different steps
    - Replace the `globallyAssigned.has(t)` guard with a branching-type-aware check: if `unifiedNodeRegistry.get(t)?.isBranching === true`, allow the type to be assigned to multiple steps regardless of `globallyAssigned`
    - Non-branching types continue to be blocked by `globallyAssigned` as before
    - _Expected_Behavior: two steps that both select `"switch"` both get `"switch"` in their `byStep` entry; the flat list contains `"switch"` twice_
    - _Preservation: non-branching type cross-step deduplication via `globallyAssigned` is unchanged_
    - _Requirements: 2.3_

  - [x] 8.3 Verify that same-type nested branching (switch-in-switch) now produces two switch entries in the flat constraint list
    - Write a unit test for `resolveCapabilitySelections()` with two steps both selecting `"switch"`: assert `flat` contains `["switch", "switch"]` (length 2, not 1)
    - Write a unit test for `resolveAnalyzeCapabilitySelections()` with the same input: assert same result
    - _Requirements: 2.3_

- [x] 9. Checkpoint — Ensure all tests pass
  - Run the full test suite for the affected files:
    - `worker/src/services/ai/stages/structural-prompt-generator.ts`
    - `worker/src/services/ai/stages/node-selection-stage.ts`
    - `worker/src/services/ai/system-prompt-builder.ts`
    - `worker/src/services/ai/pipeline/workflow-generation-pipeline.ts`
    - `worker/src/api/generate-workflow.ts`
  - Verify the bug condition exploration test from task 1 now PASSES (all three assertions)
  - Verify all preservation tests from task 2 still PASS
  - Verify all fix verification tests from task 7 PASS
  - Verify the constraint resolution tests from task 8.3 PASS
  - Verify no regressions in any other test files that import the changed modules
  - Ensure all tests pass; ask the user if questions arise
