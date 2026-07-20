# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - credentialStatuses Missing for OAuth Workflows
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing case — `filterStillBlockingOAuth` called with `credentialStatuses: undefined` and a LinkedIn candidate row
  - Call `filterStillBlockingOAuth([linkedinRow], undefined, false)` where `linkedinRow` has `vaultKey: 'linkedin'`, `type: 'oauth'`
  - Assert the result is non-empty (LinkedIn is treated as blocking when `credentialStatuses` is undefined)
  - This confirms the bug: when the API omits `credentialStatuses`, connected credentials are still shown as blocking
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct — it proves the bug exists once we assert the correct post-fix behavior, i.e. that a `resolved_connected` entry unblocks the row)
  - Document counterexample: `filterStillBlockingOAuth([linkedinRow], undefined, false)` returns `[linkedinRow]` instead of `[]`
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Buggy Inputs Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: `filterStillBlockingOAuth([linkedinRow], [{ nodeId: 'n1', credentialId: 'linkedin', status: 'resolved_connected' }], false)` returns `[]` on current code (credential is unblocked when status is present)
  - Observe: for a no-credential workflow, `credentialStatuses` is expected to be an empty array and `filterStillBlockingOAuth([], [], false)` returns `[]`
  - Write property-based test: for all candidates where every candidate has a matching `resolved_connected` entry in `credentialStatuses`, `filterStillBlockingOAuth` returns an empty array
  - Write property-based test: for all candidates where the matching entry has `status: 'required_missing'`, `filterStillBlockingOAuth` returns a non-empty array (still blocking)
  - Write test: no-credential workflow path — `filterStillBlockingOAuth([], [], false)` returns `[]` and `credentialStatuses` is empty
  - Verify all tests pass on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix: populate credentialStatuses in generate-workflow.ts

  - [x] 3.1 Implement the credentialStatuses mapping step
    - In `worker/src/api/generate-workflow.ts`, after `pipeline.run()` succeeds, add a `credentialStatuses` mapping before `res.json()`
    - FlatMap `result.requiredCredentials` into `{ nodeId, credentialId, status }[]` entries
    - Normalize `vaultKey`: apply `(key).toLowerCase().trim().replace(/^gmail$/, 'google')` so Gmail nodes produce `credentialId: 'google'`
    - Map `satisfied: true` → `status: 'resolved_connected'`; `satisfied: false` → `status: 'required_missing'`
    - For each `CredentialRequirement`, emit one entry per `nodeId` in `req.nodeIds` (or `['unknown']` if empty)
    - Add `credentialStatuses` to the `res.json({...})` call alongside the existing fields
    - No changes to `AiFirstPipeline`, `AiPipelineOutput`, or any frontend file
    - _Bug_Condition: isBugCondition(response) where response.requiredCredentials.length > 0 AND response.credentialStatuses is undefined_
    - _Expected_Behavior: every CredentialRequirement maps to a { nodeId, credentialId, status } entry with status derived from req.satisfied_
    - _Preservation: requiredCredentials, missingCredentials, discoveredCredentials, fieldOwnershipMap, stageTrace all remain unchanged; no-credential workflows return credentialStatuses: []_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - credentialStatuses Populated from Vault
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 asserts that `filterStillBlockingOAuth` returns `[]` when `credentialStatuses` contains a `resolved_connected` entry for the candidate
    - After the fix, the API returns a populated `credentialStatuses` array, so this path is now exercised
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Buggy Inputs Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm `required_missing` entries still block, no-credential workflows still return empty `credentialStatuses`, and all other response fields are unchanged

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
