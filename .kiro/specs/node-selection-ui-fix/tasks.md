# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Auto-Selection, isComplete Gate, and Over-Generation Bugs
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate all three bugs exist
  - **Scoped PBT Approach**: Scope to concrete failing cases for reproducibility
  - Test A — Auto-Selection: Render `CapabilityStage` with one container having exactly one candidate; assert `selections` initial state is `{}` (from Bug Condition A in design — `hasAutoSelectedSingleCandidateContainer = true`)
  - Test B — isComplete Gate: Render `CapabilityStage` with 3 containers, simulate selecting 1 node, assert Continue button is enabled (`selectedCount >= 1`) (from Bug Condition B — `isCompleteRequiresAllContainers = true`)
  - Test C — Over-Generation: Call `runIntentAnalysis` with prompt "When I receive an email, send a summary to Gmail and Slack"; assert exactly 3 units returned (trigger + Gmail + Slack), no Zoom/Amazon SES units (from Bug Condition C — `unitsContainInferredDataFlowDestinations = true`)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found (e.g., "single-candidate container pre-selected", "Continue disabled with 1 of 3 selected", "5 units returned instead of 3")
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Explicit Selection, Toggle-Off, and onComplete Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: clicking a candidate node on unfixed code selects it (`selections[containerId] = nodeType`)
  - Observe: clicking an already-selected node on unfixed code deselects it (removes `containerId` from `selections`)
  - Observe: clicking Continue with valid selections on unfixed code calls `onComplete` with the correct `NodeSelectionMap`
  - Write test: for all explicit user click interactions (where `isBugCondition` is false), selection state updates correctly (from Preservation Requirements in design)
  - Write test: toggle-off behavior — clicking a selected node removes it from `selections`
  - Write test: `onComplete` fires with the exact `NodeSelectionMap` of user selections when Continue is clicked
  - Verify tests PASS on UNFIXED code (confirms baseline behavior to preserve)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix CapabilityStage.tsx — Remove auto-selection and fix isComplete gate

  - [x] 3.1 Remove auto-selection from `useState` initializer and `useEffect`; fix `isComplete` condition; update header text
    - In `ctrl_checks/src/components/workflow/CapabilityStage.tsx`:
    - Change `useState` initializer from lazy function with single-candidate auto-selection to `useState<NodeSelectionMap>({})`
    - Remove the `else if (container.candidates.length === 1)` branch from the `useEffect` hook — preserve only the `if (current && container.candidates.some(...))` branch that retains valid prior user selections
    - Change `isComplete` from `totalCount > 0 && selectedCount === totalCount` to `totalCount > 0 && selectedCount >= 1`
    - Update header subtitle from "Select one registry node for each workflow step." to "Select the integrations you need for your workflow."
    - _Bug_Condition: `isBugCondition(X)` where `X.hasAutoSelectedSingleCandidateContainer = true` OR `X.isCompleteRequiresAllContainers = true`_
    - _Expected_Behavior: `result.initialSelections = {}` AND `result.continueEnabled = (result.selectedCount >= 1)`_
    - _Preservation: Explicit user clicks, toggle-off, onComplete callback, and Go Back must remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Verify bug condition exploration test now passes (auto-selection and isComplete tests)
    - **Property 1: Expected Behavior** - Auto-Selection and isComplete Gate Fixed
    - **IMPORTANT**: Re-run the SAME tests from task 1 (Test A and Test B) — do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - When these tests pass, it confirms the frontend bugs are fixed
    - **EXPECTED OUTCOME**: Test A (auto-selection) and Test B (isComplete gate) PASS
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Verify preservation tests still pass after CapabilityStage changes
    - **Property 2: Preservation** - Explicit Selection and Toggle-Off Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - **EXPECTED OUTCOME**: All preservation tests PASS (no regressions in explicit selection, toggle-off, onComplete)

- [x] 4. Fix capability-intent-analyzer.ts — Add strict scope and deduplication rules

  - [x] 4.1 Add STRICT SCOPE RULE and DEDUPLICATION RULE to `buildSystemPrompt()` in `worker/src/services/ai/stages/capability-intent-analyzer.ts`
    - Add STRICT SCOPE RULE after the existing BRANCHING WORKFLOWS rule in the RULES section:
      - LLM MUST generate units ONLY for tasks the user EXPLICITLY described
      - LLM MUST NOT infer units from data flow descriptions, destination metadata (e.g., "Zoom Video", "Amazon SES", "SMTP"), implicit sources, or theoretical alternatives
      - Include concrete correct/wrong examples for "send via Gmail" and conditional routing cases
    - Add DEDUPLICATION RULE after the strict scope rule:
      - If two branch cases produce the same output type, they may share a unit type but must have distinct labels
      - Do NOT create separate units for the same service unless the user explicitly named multiple instances
      - Include concrete correct/wrong example for "if A send Gmail, if B send Gmail" case
    - _Bug_Condition: `isBugCondition(X)` where `X.unitsContainInferredDataFlowDestinations = true`_
    - _Expected_Behavior: `result.units = parseExplicitIntentOnly(X.userPrompt)` — no inferred units_
    - _Preservation: Branching workflow rule, trigger requirement, unit count validation, and retry logic must remain unchanged_
    - _Requirements: 2.4, 2.5, 2.6, 3.6_

  - [x] 4.2 Verify bug condition exploration test now passes (over-generation test)
    - **Property 1: Expected Behavior** - No Over-Generation from Inferred Data Flows
    - **IMPORTANT**: Re-run the SAME test from task 1 (Test C) — do NOT write a new test
    - **EXPECTED OUTCOME**: Test C (over-generation) PASSES — exactly 3 units for Gmail+Slack prompt, no Zoom/Amazon SES units

- [x] 5. Fix capability-grouper-stage.ts — Add semantic relevance rule

  - [x] 5.1 Add SEMANTIC RELEVANCE RULE to `buildSystemPrompt()` in `worker/src/services/ai/stages/capability-grouper-stage.ts`
    - Add SEMANTIC RELEVANCE RULE after the existing RULES section:
      - Only include candidates that directly fulfill the use-case unit as described
      - Do NOT include nodes that are tangentially related, theoretically usable in a different context, or semantically distant from the unit's description
      - Include concrete correct/wrong example for "Send email notification via Gmail" use-case
    - _Bug_Condition: Grouper including tangentially related candidates (e.g., zoom_video in an email container)_
    - _Preservation: Registry validation, empty-container retry logic, candidate hydration, and LLM grouping for valid units must remain unchanged_
    - _Requirements: 2.5, 2.6, 3.7, 3.8_

- [x] 6. Write fix verification tests

  - [x] 6.1 Test that CapabilityStage starts with no selections
    - Render `CapabilityStage` with containers including single-candidate containers
    - Assert initial `selections` state is `{}` (no pre-selections)
    - Assert no container shows a pre-selected node on first render
    - _Requirements: 2.1_

  - [x] 6.2 Test that `isComplete` is true with 1 selection out of N containers
    - Render `CapabilityStage` with 3 containers
    - Simulate user clicking one candidate in one container
    - Assert Continue button is enabled (`isComplete = true`)
    - Assert Continue button remains enabled regardless of how many other containers are unselected
    - _Requirements: 2.3_

  - [x] 6.3 Test that intent analyzer does not over-generate units
    - Call `runIntentAnalysis` with a prompt that explicitly names 2 destinations (e.g., "send to Gmail and Slack")
    - Assert the returned units contain exactly the explicitly named services — no additional inferred units
    - Assert no units for services not mentioned in the prompt (e.g., Zoom Video, Amazon SES, SMTP)
    - _Requirements: 2.4, 2.5_

- [x] 7. Checkpoint — Ensure all tests pass
  - Re-run the full test suite for `CapabilityStage` component tests
  - Re-run the full test suite for `capability-intent-analyzer` tests
  - Re-run the full test suite for `capability-grouper-stage` tests
  - Ensure all tests pass, ask the user if questions arise
