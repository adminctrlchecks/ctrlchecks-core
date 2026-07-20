# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - AI-Assigned Field Values Overwritten by Pipeline Stages
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug across all three paths
  - **Scoped PBT Approach**: Scope to concrete failing cases for each path:
    - Path A: Slack node with `config.webhookUrl = "https://hooks.slack.com/original"` — call `injectCredentials` with a different Slack webhook credential — assert `config.webhookUrl` is still `"https://hooks.slack.com/original"`
    - Path A: HubSpot node with `config.apiKey = "original-key"` — call `injectCredentials` with a HubSpot API key credential — assert `config.apiKey` is still `"original-key"`
    - Path A: Any node with `config[credentialContract.credentialFieldName]` pre-set — call `injectCredentials` — assert the field is not overwritten
    - Path B: Call generate-workflow handler with `existingWorkflow` containing pre-set `config.spreadsheetId` — assert returned workflow still has that value
    - Path C: Pass a workflow with pre-set `config.model = "gpt-4o"` and a structural error to `SelfHealingWorkflowEngine.heal()` — assert healed workflow still has `config.model = "gpt-4o"`
  - For each path, run on UNFIXED code — expect FAILURE (confirms bug exists)
  - Document counterexamples found (e.g., `config.webhookUrl` equals injected credential value, not original)
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Empty/Undefined Fields Still Receive Fallback Credential Values
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (fields that are empty, undefined, or null):
    - Observe: `injectCredentials` on a node with `config.webhookUrl = ""` populates it from credentials store
    - Observe: `injectCredentials` on a node with `config.apiKey = undefined` populates it from credentials store
    - Observe: `validateAndHealBeforeCredentials` on a structurally invalid workflow fixes edges without touching `node.data.config` values
    - Observe: `SelfHealingWorkflowEngine.heal()` on a workflow with a missing edge repairs the edge without modifying any `node.data.config` field
  - Write property-based tests: for all nodes where `!node.data.config[field]` (empty, undefined, null), `injectCredentials` still populates the field from the credentials store — same behavior as unfixed code
  - Write property-based test: for all workflows passed to healing functions, every pre-existing non-empty `node.data.config[field]` value is identical in the output (structural repairs only)
  - Verify all tests PASS on UNFIXED code (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix: Add "already-set" guards to `injectCredentials` in `workflow-lifecycle-manager.ts`
  - File: `worker/src/services/workflow-lifecycle-manager.ts`
  - Function: `injectCredentials`
  - Add `if (!config[credentialContract.credentialFieldName] || config[credentialContract.credentialFieldName] === '')` guard before both occurrences of `config[credentialContract.credentialFieldName] = credentialValue` (lines ~2256 and ~2334)
  - Add `if (!config.webhookUrl || config.webhookUrl === '')` guard before `config.webhookUrl = credentialValue` (line ~2291)
  - Add `if (!config.apiKey || config.apiKey === '')` guard before `config.apiKey = credentialValue` (generic api_key fallback, line ~2341)
  - Add `if (!config[field] || config[field] === '')` guard inside the generic field-scan loop (fields containing `'credential'`, `'token'`, `'key'`, `'secret'`)
  - Add `if (!config[field] || config[field] === '')` guard inside the `allFields.forEach` block for nodes without a connector
  - _Bug_Condition: `isBugCondition(node, field, 'injectCredentials')` — node.data.config[field] is non-empty AND injectCredentials writes to config[field] unconditionally_
  - _Expected_Behavior: After fix, `injectCredentials` only writes to a field when `!config[field] || config[field] === ''` — pre-set values are never overwritten_
  - _Preservation: Empty/undefined fields must still be populated from credentials store (requirements 3.1, 3.2)_
  - _Requirements: 2.1, 2.2_

- [x] 4. Fix: Accept and thread `existingWorkflow` through `generate-workflow.ts` handler
  - File: `worker/src/api/generate-workflow.ts`
  - Function: `generateWorkflow` handler
  - Read `body.existingWorkflow` (optional) from the request body
  - Pass `existingWorkflow` into `pipeline.run()` as an additional parameter when present
  - _Bug_Condition: `isBugCondition(node, field, 'continuation')` — existing workflow has node.data.config[field] set AND handler does not receive existingWorkflow AND regenerated workflow loses those values_
  - _Expected_Behavior: When `existingWorkflow` is provided, the pipeline uses it as the base and preserves all non-empty field values from existing nodes_
  - _Preservation: When no `existingWorkflow` is provided, pipeline.run() behaves identically to the unfixed code (requirements 3.2, 3.5)_
  - _Requirements: 2.3, 2.4_

- [x] 5. Fix: Merge existing node configs into generated workflow in `ai-first-pipeline.ts`
  - File: `worker/src/services/ai/ai-first-pipeline.ts` (or equivalent pipeline entry)
  - Function: `run()`
  - After the AI generates a new workflow graph, if `existingWorkflow` was provided, iterate over generated nodes
  - For each generated node, find the matching node in `existingWorkflow` (by id or type)
  - For each field in the existing node's config that is non-empty, set `generatedNode.data.config[field] = existingNode.data.config[field]` (existing values take precedence over regenerated defaults)
  - _Bug_Condition: `isBugCondition(node, field, 'continuation')` — existing workflow field values are discarded when AI regenerates from scratch_
  - _Expected_Behavior: After merge, every non-empty field from `existingWorkflow` nodes is present and unchanged in the generated workflow nodes_
  - _Preservation: Fields that are empty in `existingWorkflow` are left as generated by the AI (requirements 3.2)_
  - _Requirements: 2.3, 2.4_

- [x] 6. Fix: Merge original node configs back after regeneration in `SelfHealingWorkflowEngine.heal()`
  - File: `worker/src/services/ai/self-healing-workflow-engine.ts`
  - Function: `SelfHealingWorkflowEngine.heal()`
  - After a `requiresRegeneration: true` repair produces a new workflow, capture the original workflow's node configs before healing
  - After regeneration, iterate over `regeneratedWorkflow.nodes` and find matching nodes in `originalWorkflow.nodes` (by id or type)
  - For each field in `originalConfig` that is non-empty, set `regeneratedConfig[field] = originalConfig[field]` (original takes precedence over regenerated defaults)
  - _Bug_Condition: `isBugCondition(node, field, 'selfHeal')` — workflow has node.data.config[field] set AND heal() triggers requiresRegeneration=true AND healed workflow loses those values_
  - _Expected_Behavior: After merge, every non-empty config field from the original workflow is present and unchanged in the healed workflow_
  - _Preservation: Structural repairs (edges, execution order via unifiedGraphOrchestrator) are accepted from the regenerated workflow; only config field values are restored from the original (requirements 2.5, 3.3)_
  - _Requirements: 2.5, 3.3_

- [x] 7. Fix: Assert config field values are unchanged after `reconcileWorkflow` in `validateAndHealBeforeCredentials`
  - File: `worker/src/services/workflow-lifecycle-manager.ts`
  - Function: `validateAndHealBeforeCredentials`
  - After `reconcileWorkflow` returns, snapshot all `node.data.config` field values before and after the call
  - Add a dev-mode assertion (or `console.warn` log) if any `node.data.config[field]` value differs post-reconcile
  - This is a structural-only guard — `reconcileWorkflow` must never touch node config values
  - _Bug_Condition: Any case where `reconcileWorkflow` modifies a `node.data.config` field value_
  - _Expected_Behavior: Post-reconcile snapshot equals pre-reconcile snapshot for all node config fields_
  - _Preservation: Structural reconciliation (edges via unifiedGraphOrchestrator) continues to operate normally (requirement 3.3)_
  - _Requirements: 2.5_

- [x] 8. Verify bug condition exploration test now passes
  - [x] 8.1 Re-run the SAME tests from task 1 on the fixed code — do NOT write new tests
    - **Property 1: Expected Behavior** - AI-Assigned Field Values Survive the Full Pipeline
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - Run Path A tests: `injectCredentials` must not overwrite pre-set `webhookUrl`, `apiKey`, `credentialFieldName` fields
    - Run Path B test: generate-workflow handler with `existingWorkflow` must return workflow with preserved field values
    - Run Path C test: `SelfHealingWorkflowEngine.heal()` must return healed workflow with original node config values intact
    - **EXPECTED OUTCOME**: All tests PASS (confirms bug is fixed across all three paths)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 8.2 Verify preservation tests still pass
    - **Property 2: Preservation** - Empty Fields Still Receive Fallback Credential Values
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run empty/undefined field fallback tests — must still populate from credentials store
    - Run structural healing tests — must still fix structural issues without touching config values
    - **EXPECTED OUTCOME**: All tests PASS (confirms no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 9. Write integration tests
  - Full pipeline integration test: AI generates workflow with assigned field values → credential injection runs → assert all AI-assigned field values survive in the final workflow object
  - Continuation integration test: Existing workflow with pre-set field values → generate-workflow handler called with `existingWorkflow` in request body → assert all pre-set field values are present in the returned workflow
  - Self-healing integration test: Workflow with pre-set node configs and a structural error (orphaned node, missing edge) → full lifecycle pipeline → assert all node config values survive and structural error is fixed
  - Structural-only healing assertion test: Pass a workflow with a missing edge to `validateAndHealBeforeCredentials` → assert edge is added (via unifiedGraphOrchestrator) and all `node.data.config` values are byte-for-byte identical before and after
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 10. Checkpoint — Ensure all tests pass
  - Run all unit tests, property-based tests, and integration tests
  - Confirm Property 1 (bug condition) passes: AI-assigned field values survive `injectCredentials`, continuation, and self-healing
  - Confirm Property 2 (preservation) passes: empty fields still receive fallback credential values; structural healing still works
  - Confirm no regressions in workflow execution, UI field display, or user manual edit flows
  - Ask the user if any questions arise
