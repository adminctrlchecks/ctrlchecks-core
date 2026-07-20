# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Switch Case Truncation & Label Contamination
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases — N=3 condition prompts with domain-specific names (e.g., "shipped, processing, cancelled")
  - Use fast-check to generate arrays of 3–8 distinct condition strings, build a prompt of the form "route orders by status: {c1}, {c2}, ..., {cN}", call `planSwitchCasesFromPrompt(prompt, "ai_chat_model")`, assert `cases.length === N` and no `case.value` equals any node type string
  - Also test `buildCaseNodeMappingForPlan(['manual_trigger', 'switch', 'gmail', 'log_output'], prompt_with_3_conditions)` — assert error/gap is surfaced (not silent drop) when chain is shorter than case count
  - Also test `validateWorkflow` on a switch workflow with 3 cases but only 2 outgoing edges — assert `valid: false` with a descriptive error naming the node ID
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct — it proves the bug exists)
  - Document counterexamples found (e.g., `planSwitchCasesFromPrompt` returns `cases.length === 2` for a 3-condition prompt; `buildCaseNodeMappingForPlan` silently drops case 3; `validateWorkflow` returns `valid: true` for mismatched case/edge count)
  - Tag each test: `// Feature: switch-node-case-generation-bug, Property 1: Bug Condition`
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Switch and N=2 Switch Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: linear workflow generation (no switch node) produces `caseNodeMapping === undefined` on unfixed code — record this
  - Observe: `if_else` generation produces exactly 2 edges labeled `true` / `false` on unfixed code — record this
  - Observe: N=2 switch prompt returns `cases.length === 2` with correct condition values on unfixed code — record this
  - Observe: `expressionTemplate === '{{$json.' + discriminantField + '}}'` is unchanged for any upstream node type on unfixed code — record this
  - Use fast-check to generate random linear prompts (no switch intent) — assert `caseNodeMapping === undefined` and compiled workflow is structurally valid
  - Use fast-check to generate prompts with exactly 2 conditions — assert `cases.length === 2` and compiled workflow has exactly 2 `case_1` / `case_2` edges
  - Use fast-check to generate `if_else` prompts — assert exactly 2 edges labeled `true` and `false`, no regression
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Tag each test: `// Feature: switch-node-case-generation-bug, Property 2: Preservation`
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix switch node case generation bug

  - [x] 3.1 Replace narrow regex extractor with general enumeration parser in `switch-case-plan.ts`
    - In `extractEnumeratedCasesFromPrompt`, replace the `classifyIntro` regex, `casePattern`, and `ifPattern` with a general enumeration extractor that finds all comma/slash/`or`/`and`/newline-separated tokens after any routing-intent keyword (`route`, `classify`, `bucket`, `label`, `by`, `based on`, `depending on`, `when`, `if`, `status`, `type`, `category`)
    - The extractor must be greedy — collect all tokens in the enumeration, not stop at 2 or 3
    - Normalize each token: lowercase, trim, replace spaces with `_`
    - Filter tokens using `isValidConditionToken` to exclude node type strings and destination labels
    - Deduplicate preserving order
    - Remove the hardcoded `commonTriples` fallback (`['sales', 'support', 'general']`) entirely — if no enumeration is found, return an empty array
    - Remove the `casePattern` regex that captures destination labels in group 2
    - _Bug_Condition: `extractEnumeratedCasesFromPrompt(prompt).length < countNamedConditionsInPrompt(prompt)` for any prompt with N ≥ 3 domain-specific condition names_
    - _Expected_Behavior: `cases.length === N` and `∀ c ∈ cases: !isNodeLabel(c.value)` for all N ≥ 2_
    - _Preservation: `expressionTemplate` and `discriminantField` return values must remain unchanged for all inputs; N=2 prompts must still return `cases.length === 2` with correct values_
    - _Requirements: 2.1, 2.2, 3.1, 3.2_

  - [x] 3.2 Enforce chain length and surface errors in `summarize-layer.ts`
    - In `buildCaseNodeMappingForPlan`, before iterating `switchPlan.cases`, check that `downstreamNodes.length >= switchPlan.cases.length`
    - If the chain is too short, log a pipeline contract error and return `{ _error: 'chain_too_short', expected: switchPlan.cases.length, actual: downstreamNodes.length }` — do NOT silently drop cases
    - In `clarifyIntentAndGenerateSinglePlan`, when `buildCaseNodeMappingForPlan` returns an error object, record the gap in `PipelineContext.missing_fields` and set `requires_confirmation: true` — do not pass a broken `caseNodeMapping` to the graph orchestrator
    - _Bug_Condition: `Object.keys(buildCaseNodeMapping(cases, downstreamNodes)).length < cases.length` when `downstreamNodes.length < cases.length`_
    - _Expected_Behavior: error object returned with `_error: 'chain_too_short'`; no silent drop; caller records gap in `PipelineContext.missing_fields`_
    - _Preservation: all non-switch paths return `undefined`; N=2 switch with matching chain length returns a 2-entry mapping unchanged_
    - _Requirements: 2.1, 2.3, 2.4, 3.3, 3.4_

  - [x] 3.3 Add switch case count invariant to `validateWorkflow` in `unified-graph-orchestrator.ts`
    - After the existing orphan-node check, iterate all nodes whose registry definition has `isBranching: true` and `outgoingPorts` starting with `case_`
    - For each such node, assert `outDegree === node.data.config.cases?.length`; if they differ, push a descriptive error: `'Switch node "' + node.id + '": out-degree ' + outDegree + ' does not match cases.length ' + caseCount + ' — DAG structural invariant violated'`
    - Use `unifiedNormalizeNodeTypeString` and `unifiedNodeRegistry.get(nodeType)` — no hardcoded `if (node.type === 'switch')` logic
    - _Bug_Condition: `validateWorkflow` returns `valid: true` for a switch node with `outDegree !== cases.length`_
    - _Expected_Behavior: `validateWorkflow` returns `valid: false` with descriptive error naming the node ID when out-degree ≠ cases.length_
    - _Preservation: all non-switch nodes pass validation unchanged; N=2 switch with matching edges still returns `valid: true`_
    - _Requirements: 2.3, 2.4, 3.5_

  - [x] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Switch Case Truncation & Label Contamination
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms `planSwitchCasesFromPrompt` returns `cases.length === N` with no label contamination, `buildCaseNodeMappingForPlan` surfaces chain-too-short errors, and `validateWorkflow` rejects mismatched case/edge counts
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Switch and N=2 Switch Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in linear, if_else, and N=2 switch paths)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite covering all 5 correctness properties from the design
  - Confirm Property 1 (bug condition) passes on fixed code
  - Confirm Property 2 (preservation) passes on fixed code
  - Confirm Property 3 (compiled switch out-degree === N) passes
  - Confirm Property 4 (non-switch workflows unaffected) passes
  - Confirm Property 5 (N=2 switch unaffected) passes
  - Ensure all tests pass; ask the user if questions arise
