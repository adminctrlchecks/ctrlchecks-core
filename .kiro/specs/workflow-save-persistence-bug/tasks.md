# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Workflow Save Persistence Bugs (Credential Strip / Graph Field / isDirty / Position)
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate all four bugs exist in `handleSave`
  - **Scoped PBT Approach**: Scope each sub-property to the concrete failing case to ensure reproducibility
  - Sub-property 1.1 — Credential stripping: mock `handleSave`'s `inputsToAttach` loop with a node whose `data.config` contains `{ credentialId: "cred-123", apiKey: "sk-test", subject: "hello" }`. Assert that `credentialId` and `apiKey` are present in the resulting `inputsToAttach` map. (Will FAIL — the filter strips keys containing "credential"/"oauth".)
  - Sub-property 1.2 — Graph field missing: mock the Supabase client and call `handleSave` with any workflow. Capture the payload passed to `.update()` / `.insert()`. Assert `payload.graph` is defined and equals `{ nodes: ..., edges: ... }`. (Will FAIL — `graph` is absent from `workflowData`.)
  - Sub-property 1.3 — isDirty not cleared: call `handleSave` successfully, then simulate React Flow firing `onNodesChange` (position/selection change) after `setIsDirty(false)`. Assert `isDirty` is `false` after the full sequence. (Will FAIL — `onNodesChange` re-sets `isDirty: true`.)
  - Sub-property 1.4 — Position round-trip: create a node with `position: { x: 450, y: 300 }`, call `handleSave`, capture the Supabase payload. Assert `payload.graph.nodes[0].position` equals `{ x: 450, y: 300 }`. (Will FAIL — `graph` is absent so position is not persisted.)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found (e.g., `credentialId` absent from `inputsToAttach`; `payload.graph` is `undefined`; `isDirty` is `true` after save; position not in payload)
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Credential Config, attach-inputs Security Filter, save-workflow Endpoint, isDirty on Edit
  - **IMPORTANT**: Follow observation-first methodology — run UNFIXED code with non-buggy inputs and record actual outputs
  - Observe: `inputsToAttach` for a node with `{ subject: "hello", recipientEmails: ["a@b.com"] }` (no credential/oauth keys) is identical before and after the fix
  - Observe: `attach-inputs` endpoint strips `oauthToken: "raw-token"` from the persisted `inputs` column on unfixed code
  - Observe: `/api/save-workflow` returns the same response shape and DB row on unfixed code
  - Observe: after a successful save, dragging a node sets `isDirty = true` on unfixed code
  - Sub-property 2.1 — Non-credential config preservation: generate random node configs with no keys containing "credential" or "oauth". Assert `inputsToAttach` output is identical before and after the fix. (Should PASS on unfixed code — these keys are not filtered.)
  - Sub-property 2.2 — attach-inputs security filter: send `{ oauthToken: "raw-token", clientSecret: "secret" }` to `attach-inputs`. Assert persisted `inputs` column contains neither key. (Should PASS on unfixed code — security filter is in `attach-inputs`, not touched by this fix.)
  - Sub-property 2.3 — save-workflow endpoint unchanged: call `/api/save-workflow` with a valid workflow. Assert response shape and DB row are unchanged. (Should PASS on unfixed code — this endpoint is not modified.)
  - Sub-property 2.4 — isDirty on user edit: after a successful save, simulate a user dragging a node (`onNodesChange` with position change). Assert `isDirty` becomes `true`. (Should PASS on unfixed code — `onNodesChange` always sets `isDirty: true`.)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.4, 3.5, 3.3_

- [-] 3. Fix workflow save persistence bugs in WorkflowBuilder.tsx

  - [x] 3.1 Remove credential-stripping filter from inputsToAttach loop
    - In `handleSave` in `ctrl_checks/src/pages/WorkflowBuilder.tsx`, locate the `inputsToAttach` construction loop (line ~360)
    - Remove the line: `if (key.includes('credential') || key.includes('oauth')) return;`
    - Do NOT modify `worker/src/api/attach-inputs.ts` — the security filter there must remain untouched
    - Verify that all non-null, non-`_`-prefixed keys in `node.data.config` (including those containing "credential" or "oauth") are now included in `inputsToAttach`
    - _Bug_Condition: isBugCondition(input) where EXISTS node.data.config key containing "credential" or "oauth"_
    - _Expected_Behavior: all node.data.config keys (including credential/oauth keys) are present in inputsToAttach and persisted in data.config in the DB_
    - _Preservation: attach-inputs security filter in worker/src/api/attach-inputs.ts continues to strip raw OAuth tokens at the API boundary — no change to that file_
    - _Requirements: 2.1, 3.1, 3.5_

  - [x] 3.2 Add graph field to workflowData payload in handleSave
    - In `handleSave`, locate the `workflowData` object construction (line ~300)
    - Add `graph: { nodes: normalized.nodes, edges: normalized.edges } as unknown as Json` to the object
    - Optionally add `settings: {} as unknown as Json` and `schema_version: 2` to match `/api/save-workflow` payload shape
    - Verify the Supabase `.update()` / `.insert()` call receives a payload where `payload.graph.nodes` equals `normalized.nodes` and `payload.graph.edges` equals `normalized.edges`
    - _Bug_Condition: isBugCondition(input) where handleSave writes to Supabase and "graph" NOT IN writtenPayload_
    - _Expected_Behavior: writtenPayload.graph equals { nodes: normalizedNodes, edges: normalizedEdges }_
    - _Preservation: /api/save-workflow endpoint behavior is completely unaffected — no changes to that file_
    - _Requirements: 2.2, 2.4, 3.4_

  - [x] 3.3 Move setIsDirty(false) to finally block guarded by saveSucceeded flag
    - In `handleSave`, introduce a `let saveSucceeded = false;` local variable before the `try` block
    - Set `saveSucceeded = true` at the end of the `try` block, after all save operations complete successfully
    - Remove any existing `setIsDirty(false)` call from inside the `try` block
    - In the `finally` block, after `setIsSaving(false)`, add: `if (saveSucceeded) setIsDirty(false);`
    - This ensures `setIsDirty(false)` always runs last, overwriting any intermediate `isDirty: true` set by React Flow reconciliation after the `attach-inputs` response
    - Verify that on a Supabase error, `setIsDirty(false)` is NOT called (saveSucceeded remains false)
    - _Bug_Condition: isBugCondition(input) where handleSave() completes successfully AND isDirty = true AFTER completion_
    - _Expected_Behavior: isDirty = false after the entire save sequence (including post-save side-effects) completes_
    - _Preservation: onNodesChange and onEdgesChange continue to set isDirty = true for genuine user edits after the save is fully complete_
    - _Requirements: 2.3, 3.3_

  - [ ] 3.4 (Optional) Unify handleSave to delegate to /api/save-workflow
    - Replace the direct Supabase write in `handleSave` with a `fetch` call to `${ENDPOINTS.itemBackend}/api/save-workflow`
    - Pass `{ workflowId: savedWorkflowId, name, nodes: normalized.nodes, edges: normalized.edges, user_id }` as the JSON body with `Authorization: Bearer ${sessionToken}` header
    - Read `workflowId` from the response and assign to `savedWorkflowId`
    - Verify that the Google OAuth check in `/api/save-workflow` (`requireGoogleAuth`) is appropriate for all manual save scenarios; if not, keep the direct Supabase write and rely on changes 3.1–3.3 instead
    - _Bug_Condition: isBugCondition(input) where handleSave and /api/save-workflow write divergent payloads_
    - _Expected_Behavior: both save paths write the same nodes, edges, and graph fields to the DB_
    - _Preservation: /api/save-workflow validation, normalization, versioning, and metadata merge behavior is unchanged_
    - _Requirements: 2.4, 3.4_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Workflow Save Persistence Bugs (Credential Strip / Graph Field / isDirty / Position)
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior; when they pass, the bugs are fixed
    - Run all four sub-properties from task 1 against the fixed code
    - **EXPECTED OUTCOME**: All four sub-property tests PASS (confirms all bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Credential Config, attach-inputs Security Filter, save-workflow Endpoint, isDirty on Edit
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run all four preservation sub-properties from task 2 against the fixed code
    - **EXPECTED OUTCOME**: All preservation tests PASS (confirms no regressions)
    - Confirm non-credential config values are still included in `inputsToAttach`
    - Confirm `attach-inputs` still strips raw OAuth tokens
    - Confirm `/api/save-workflow` response and DB row are unchanged
    - Confirm `isDirty` becomes `true` after a user edit post-save

- [x] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite covering `handleSave`, `attach-inputs`, and `save-workflow`
  - Confirm Property 1 (bug condition) tests pass — all four sub-properties green
  - Confirm Property 2 (preservation) tests pass — all four sub-properties green
  - Confirm no TypeScript errors in `WorkflowBuilder.tsx` (`getDiagnostics`)
  - Ensure all tests pass; ask the user if questions arise
