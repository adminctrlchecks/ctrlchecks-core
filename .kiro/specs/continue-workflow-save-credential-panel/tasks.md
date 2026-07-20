# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Save Before Credential Check
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the 409 bug and destructive toast
  - **Scoped PBT Approach**: Scope the property to the concrete failing case — `pendingWorkflowData` set with missing credentials, `step === 'configuration'`
  - Mock `supabase.insert` to succeed, mock `POST /attach-inputs` to return `{ phase: 'configuring_credentials' }`, mock `POST /attach-credentials` to return 409
  - Assert that `attach-inputs` is called and returns 200 BEFORE `attach-credentials` is ever called
  - Assert that when credentials are missing, `credentialPanelData` state is set (not a destructive toast)
  - Assert that `attach-credentials` is NOT called when `missing.length > 0`
  - Run test on UNFIXED `handleBuild` code
  - **EXPECTED OUTCOME**: Test FAILS (proves the bug exists — destructive toast is thrown, `attach-credentials` called prematurely)
  - Document counterexamples found (e.g., "`attach-credentials` called before `attach-inputs` 200 confirmed", "destructive toast shown instead of panel")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Buggy Input Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology — run UNFIXED code with non-buggy inputs first
  - Observe: when all credentials are satisfied, `handleBuild` proceeds to redirect without showing any panel
  - Observe: when `supabase.insert` fails, error toast is shown and `attach-credentials` is never called
  - Observe: `configuring_credentials` phase returned by `attach-inputs` gates workflow execution
  - Write property-based tests: for all inputs where `isBugCondition` returns false (all credentials satisfied, save errors, non-button-click interactions), behavior matches observed unfixed behavior
  - Test case 1 — all credentials satisfied: mock `discoveredCredentials` all with `satisfied: true`, assert redirect occurs, no `credentialPanelData` set, `attach-credentials` called normally
  - Test case 2 — save error: mock `supabase.insert` to fail, assert error toast shown, `attach-credentials` never called
  - Test case 3 — `configuring_credentials` phase gating: assert a workflow in this phase cannot be executed (phase check logic unchanged)
  - Verify all tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix: reorder handleBuild and replace destructive toast with credential panel

  - [x] 3.1 Reorder handleBuild to save before credential check
    - In `ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx`, locate `handleBuild` (~line 3100)
    - Ensure `supabase.insert` (workflow persist) and `POST /attach-inputs` complete and return 200 before any credential check logic runs
    - Remove the 100ms delay workaround — it is no longer needed once ordering is correct
    - _Bug_Condition: `isBugCondition(event)` where `pendingWorkflowData IS NOT NULL AND step === 'configuration' AND attach-credentials IS CALLED AND attach-inputs HAS NOT returned 200 yet`_
    - _Expected_Behavior: `attach-inputs` completes with 200 before `attach-credentials` is ever invoked_
    - _Preservation: save error path (3.3) and all-satisfied path (3.1) must remain unchanged_
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Replace destructive toast with credentialPanelData state
    - Add state variable: `const [credentialPanelData, setCredentialPanelData] = useState<CredentialPanelData | null>(null)`
    - Define type `CredentialPanelData = { workflowId: string; satisfied: CredentialEntry[]; missing: CredentialEntry[] }`
    - In the `phase === 'configuring_credentials'` branch of `handleBuild`, derive `satisfied` and `missing` from `pendingWorkflowData.discoveredCredentials`
    - When `missing.length > 0`: call `setCredentialPanelData(...)` and `return` early — do NOT call `attach-credentials` and do NOT show a destructive toast
    - When `missing.length === 0`: proceed to `attach-credentials` as normal (preserves Req 3.1)
    - _Bug_Condition: `credentialSecretsReady === false` currently throws destructive toast_
    - _Expected_Behavior: `setCredentialPanelData({ workflowId, satisfied, missing })` called; no destructive toast; `attach-credentials` not called_
    - _Preservation: all-satisfied path calls `attach-credentials` and redirects exactly as before_
    - _Requirements: 2.3, 2.4, 2.5, 3.1_

- [x] 4. Create CredentialStatusPanel component
  - Create new file `ctrl_checks/src/components/workflow/CredentialStatusPanel.tsx`
  - Props: `{ data: CredentialPanelData; onOpenNodePanel: (nodeId: string) => void }`
  - Render a non-error informational panel (not `variant: destructive`)
  - Satisfied credentials section: list each entry with a checkmark icon
  - Missing credentials section: list each entry as a clickable `<button>` that calls `onOpenNodePanel(entry.nodeId)`
  - Keep the component minimal — no extra state, no network calls
  - _Requirements: 2.3, 2.4_

- [x] 5. Wire CredentialStatusPanel into the wizard
  - In `AutonomousAgentWizard.tsx`, in the configuration step JSX (~line 6616), conditionally render `<CredentialStatusPanel>` when `credentialPanelData !== null`
  - Pass `data={credentialPanelData}` and `onOpenNodePanel={<existing node property panel open handler>}`
  - When `credentialPanelData` is set, replace (or hide) the "Ready to save workflow" panel content with `CredentialStatusPanel`
  - Ensure clicking a missing credential entry opens the correct node's property panel (wires to the same handler used by graph node clicks today)
  - _Requirements: 2.3, 2.4, 3.2_

- [x] 6. Verify bug condition exploration test now passes
  - **Property 1: Expected Behavior** - Save Before Credential Check
  - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
  - The test from task 1 encodes the expected behavior
  - Run bug condition exploration test from step 1 on the FIXED code
  - **EXPECTED OUTCOME**: Test PASSES (confirms `attach-inputs` precedes `attach-credentials`, `credentialPanelData` is set, no destructive toast)
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 7. Verify preservation tests still pass
  - **Property 2: Preservation** - Non-Buggy Input Behavior Unchanged
  - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
  - Run all preservation property tests from step 2 on the FIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — all-satisfied redirect, save error surfacing, and phase gating all unchanged)
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 8. Checkpoint - Ensure all tests pass
  - Run the full test suite for `AutonomousAgentWizard` and `CredentialStatusPanel`
  - Confirm Property 1 (bug condition) passes
  - Confirm Property 2 (preservation) passes
  - Confirm no TypeScript diagnostics errors in modified files
  - Ask the user if any questions arise before closing the spec
