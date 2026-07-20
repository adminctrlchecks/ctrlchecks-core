# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Continue to Workflow Button Missing
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the missing button
  - **Scoped PBT Approach**: Scope the property to the concrete failing cases: `allQuestions.length > 0` (any non-empty credential/input question array)
  - Test that the `configuration` step renders a "Continue to Workflow" button for all combinations of `allQuestions` (empty and non-empty) and `credentialQuestionsForStep` (empty and non-empty)
  - isBugCondition: `step === 'configuration' AND pendingWorkflowData != null AND configurationPhaseUnlocked === true AND allQuestions.length > 0 AND no "Continue to Workflow" button rendered`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "No 'Continue to Workflow' button when allQuestions = [credQ1]")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Credential Input and Build Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: clicking the button on unfixed code (when allQuestions = []) still invokes handleBuild() with the same validation logic
  - Observe: "Configuration Required" card title and description render correctly on unfixed code
  - Observe: credential Input/Textarea/Select onChange handlers update credentialValues state correctly on unfixed code
  - Write property-based tests: for all non-buggy render states (allQuestions = [], or step !== 'configuration'), the rendered output and handleBuild() invocation behavior are unchanged
  - Verify tests pass on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix: Move "Continue to Workflow" button outside allQuestions guard

  - [x] 3.1 Implement the fix
    - In `ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx`, locate the `configuration` step `CardContent`
    - Remove the `{allQuestions.length === 0 && (...)}` guard wrapping the "Continue Building" button
    - Place an unconditional "Continue to Workflow" button at the bottom of `CardContent`, after the discoveredCredentials section and before the closing `</>`
    - The button retains the same `onClick` handler (full validation + `handleBuild()` call) — no logic changes
    - Layout: credentials section (if present) renders above the button; button is always the last element
    - _Bug_Condition: isBugCondition(renderState) where renderState.allQuestions.length > 0 AND no button rendered_
    - _Expected_Behavior: "Continue to Workflow" button always present in configuration step CardContent_
    - _Preservation: handleBuild() invocation, credential inputs, configuration message display all unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Continue to Workflow Button Always Present
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.4_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Credential Input and Build Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
