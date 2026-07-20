# Implementation Plan

- [x] 1. Write bug condition exploration tests (all 8 bugs)
  - **Property 1: Bug Condition** - All Eight Pipeline Defects
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms each bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **GOAL**: Surface counterexamples that demonstrate each bug before any fix is applied
  - **Scoped PBT Approach**: Each test is scoped to the concrete failing call site
  - Test 1 (Bug 1): Call `runNodeSelectionStage` with a spy on `geminiOrchestrator.processRequest`; assert the `message` argument contains the string `NODE_CATALOG` — PASS on unfixed code confirms the duplication bug
  - Test 2 (Bug 2): Run the hydration block from `ai-first-pipeline.ts` directly; assert `node.data.config` is populated with registry defaults — FAIL on unfixed code confirms dead `_hydratedConfig` property
  - Test 3 (Bug 3): Call `runEdgeReasoningStage` with a spy on `unifiedGraphOrchestrator.initializeWorkflow`; assert the second argument is not `undefined` — FAIL on unfixed code confirms ignored execution order
  - Test 4 (Bug 4): Call `runValidationStage` with a spy on `geminiOrchestrator.processRequest`; assert the `message` argument contains `"nodes":[` — FAIL on unfixed code confirms summary string bug
  - Test 5 (Bug 5): Call `new AiFirstPipeline().run(...)` and inspect `stageTrace`; assert an entry with `stage: 'structural_prompt'` exists — FAIL on unfixed code confirms missing stage
  - Test 6 (Bug 6): Call `pipeline.run(...)` and assert `result.requiredCredentials !== undefined` — FAIL on unfixed code confirms credential discovery never called
  - Test 7 (Bug 7): Call `pipeline.run(...)` and assert `result.fieldOwnershipMap !== undefined` — FAIL on unfixed code confirms field ownership never extracted
  - Test 8 (Bug 8): Inspect `GeminiOrchestrator` `getDefaultMaxTokens` for `'workflow-generation'`; assert return value >= 16000 — FAIL on unfixed code confirms 4000 cap
  - Run all tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests 2, 3, 4, 5, 6, 7, 8 FAIL; Test 1 PASSES (confirming catalog duplication)
  - Document all counterexamples found
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Stage Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology — observe on UNFIXED code first
  - Observe: `runIntentStage` returns `StructuredIntent` with correct shape on unfixed code
  - Observe: node-selection discards unknown types and returns `NO_VALID_NODES` when zero valid remain on unfixed code
  - Observe: edge-reasoning re-prompts once on cycle detection and returns `CYCLE_DETECTED` if cycle persists on unfixed code
  - Observe: validation stage attempts exactly one repair pass on error-severity issues on unfixed code
  - Observe: `validateWorkflow()` is called on the final graph on unfixed code
  - Observe: `generate-workflow.ts` invokes `AiFirstPipeline` directly with no branching on unfixed code
  - Write property-based test: for any user prompt string, `runIntentStage` returns `{ ok: true, intent: StructuredIntent }` or `{ ok: false, code: 'INVALID_LLM_RESPONSE' }` — never throws
  - Write property-based test: for any LLM response containing only unknown node types, `runNodeSelectionStage` returns `{ ok: false, code: 'NO_VALID_NODES' }`
  - Write property-based test: for any edge list with a cycle, `runEdgeReasoningStage` calls the LLM exactly twice (initial + re-prompt) before returning `CYCLE_DETECTED`
  - Write example test: validation stage always calls `unifiedGraphOrchestrator.validateWorkflow()` regardless of LLM result
  - Verify all preservation tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: All preservation tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 3. Fix Bug 8 — Increase gemini-orchestrator maxTokens for workflow-generation

  - [x] 3.1 Increase maxTokens cap in gemini-orchestrator.ts
    - In `getDefaultMaxTokens()`, change the `workflow-generation` branch: `return 4000` → `return 16000`
    - Also change `code-generation` to `return 16000` for consistency (same truncation risk)
    - This fix must be applied FIRST because all subsequent LLM calls in the pipeline depend on receiving complete JSON responses
    - _Bug_Condition: isBugCondition(X) where X.requestType = 'workflow-generation' AND maxTokens = 4000_
    - _Expected_Behavior: maxTokens >= 16000 for workflow-generation requests_
    - _Preservation: all other request types retain their existing maxTokens values_
    - _Requirements: 2.8_

  - [x] 3.2 Verify Bug 8 exploration test now passes
    - **Property 1: Expected Behavior** - Gemini maxTokens Sufficient for Workflow Generation
    - **IMPORTANT**: Re-run the SAME test from task 1 (Test 8) — do NOT write a new test
    - Run: assert `getDefaultMaxTokens('workflow-generation')` returns >= 16000
    - **EXPECTED OUTCOME**: Test PASSES (confirms token cap is fixed)
    - _Requirements: 2.8_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Other Request Types Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - **EXPECTED OUTCOME**: All preservation tests PASS (no regressions)

- [x] 4. Fix Bug 1 — Remove node catalog duplication from node-selection message body

  - [x] 4.1 Remove catalog from message body in node-selection-stage.ts
    - Change the `message` construction from:
      `\`STRUCTURED_INTENT:\n${JSON.stringify(intent, null, 2)}\n\nNODE_CATALOG:\n${nodeCatalog}\``
      to:
      `\`STRUCTURED_INTENT:\n${JSON.stringify(intent, null, 2)}\``
    - The catalog is already embedded in `systemPrompt` by `systemPromptBuilder.build({ stage: 'node_selection', nodeCatalog, ... })`
    - Remove the `nodeCatalog` parameter from the message — it must only appear in the system prompt
    - _Bug_Condition: isBugCondition(X) where X.stage = 'node_selection' AND catalogPresentInMessageBody(X)_
    - _Expected_Behavior: message body contains only structured intent JSON_
    - _Preservation: system prompt still contains the full catalog; LLM still receives catalog context_
    - _Requirements: 2.1_

  - [x] 4.2 Verify Bug 1 exploration test now passes
    - **Property 1: Expected Behavior** - Node Catalog Sent Only Once
    - **IMPORTANT**: Re-run the SAME test from task 1 (Test 1) — do NOT write a new test
    - Run: assert message argument to `processRequest` does NOT contain `NODE_CATALOG`
    - **EXPECTED OUTCOME**: Test PASSES (confirms catalog no longer duplicated)
    - _Requirements: 2.1_

  - [x] 4.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Node Selection Registry Validation Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - **EXPECTED OUTCOME**: All preservation tests PASS (no regressions)

- [x] 5. Fix Bug 4 — Send actual graph JSON to validation stage LLM

  - [x] 5.1 Replace summary string with actual graph JSON in validation-stage.ts
    - Remove the `nodeTypes` summary construction lines
    - Replace the `message` variable with:
      `\`USER_INTENT:\n${userIntent}\n\nWORKFLOW_GRAPH:\n${JSON.stringify({ nodes: workflow.nodes, edges: workflow.edges }, null, 2)}\``
    - Apply the same change to the re-validation message inside `processValidationResult` (the revalidate call after repair)
    - _Bug_Condition: isBugCondition(X) where X.stage = 'validation' AND messageSentIsSummaryString(X)_
    - _Expected_Behavior: message contains serialized nodes and edges arrays_
    - _Preservation: system prompt construction, repair pass logic, and orchestrator safety net call are untouched_
    - _Requirements: 2.4_

  - [x] 5.2 Verify Bug 4 exploration test now passes
    - **Property 1: Expected Behavior** - Validation Sends Actual Graph JSON
    - **IMPORTANT**: Re-run the SAME test from task 1 (Test 4) — do NOT write a new test
    - Run: assert message argument contains `"nodes":[`
    - **EXPECTED OUTCOME**: Test PASSES (confirms actual graph is sent)
    - _Requirements: 2.4_

  - [x] 5.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Validation Repair Pass and Safety Net Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - **EXPECTED OUTCOME**: All preservation tests PASS (no regressions)

- [x] 6. Fix Bug 3 — Pass AI execution order to orchestrator in edge-reasoning-stage

  - [x] 6.1 Convert orderedNodes to ExecutionOrder and pass as initialExecutionOrder
    - After `parsed` is confirmed valid in `runEdgeReasoningStage`, build an `ExecutionOrder` from `parsed.orderedNodes`
    - Inspect `ExecutionOrder` type from `execution-order-manager.ts` to match the exact shape expected
    - Pass the constructed `ExecutionOrder` as the second argument to `unifiedGraphOrchestrator.initializeWorkflow(workflowNodes, initialExecutionOrder)`
    - _Bug_Condition: isBugCondition(X) where X.stage = 'edge_reasoning' AND initializeWorkflowCalledWithoutExecutionOrder(X)_
    - _Expected_Behavior: initializeWorkflow receives non-null initialExecutionOrder matching LLM's orderedNodes_
    - _Preservation: cycle detection, re-prompt logic, and WorkflowNode construction from registry are untouched_
    - _Requirements: 2.3_

  - [x] 6.2 Verify Bug 3 exploration test now passes
    - **Property 1: Expected Behavior** - Edge Reasoning Passes AI Ordering to Orchestrator
    - **IMPORTANT**: Re-run the SAME test from task 1 (Test 3) — do NOT write a new test
    - Run: assert `initializeWorkflow` spy receives non-undefined second argument
    - **EXPECTED OUTCOME**: Test PASSES (confirms AI ordering is respected)
    - _Requirements: 2.3_

  - [x] 6.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Cycle Detection and Graph Materialization Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - **EXPECTED OUTCOME**: All preservation tests PASS (no regressions)

- [x] 7. Fix Bug 2 — Write registry defaults to node.data.config (remove dead _hydratedConfig)

  - [x] 7.1 Remove dead hydration block from ai-first-pipeline.ts and fix node construction in edge-reasoning-stage
    - In `ai-first-pipeline.ts`: remove the `hydratedNodes` map block entirely; pass `nsResult.selectedNodes` directly to `runEdgeReasoningStage`
    - In `edge-reasoning-stage.ts`: the `WorkflowNode` construction loop already calls `def.defaultConfig()` — verify it writes to `data.config` (it does: `config: def?.defaultConfig ? def.defaultConfig() : {}`)
    - Confirm the node construction in edge-reasoning-stage produces `data.config` populated with all registry defaults
    - Remove any reference to `_hydratedConfig` from the codebase
    - _Bug_Condition: isBugCondition(X) where X.stage = 'node_hydration' AND defaultsStoredIn_hydratedConfig(X)_
    - _Expected_Behavior: node.data.config contains all keys from registry defaultConfig()_
    - _Preservation: edge-reasoning stage node construction logic is otherwise untouched_
    - _Requirements: 2.2_

  - [x] 7.2 Verify Bug 2 exploration test now passes
    - **Property 1: Expected Behavior** - Node Hydration Writes to node.data.config
    - **IMPORTANT**: Re-run the SAME test from task 1 (Test 2) — do NOT write a new test
    - Run: assert `node.data.config` is populated after hydration
    - **EXPECTED OUTCOME**: Test PASSES (confirms defaults are applied correctly)
    - _Requirements: 2.2_

  - [x] 7.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Node Construction and Registry Lookup Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - **EXPECTED OUTCOME**: All preservation tests PASS (no regressions)

- [x] 8. Add Stage 2 — Create structural-prompt-stage.ts and wire into pipeline

  - [x] 8.1 Create worker/src/services/ai/stages/structural-prompt-stage.ts
    - The stage calls the LLM with the structured intent + node catalog
    - System prompt instructs the LLM to produce a plain-language blueprint: which nodes are needed, how they connect, what each does in context of the user's goal
    - Returns `{ ok: true, structuralPrompt: string, durationMs, llmCall }` or `{ ok: false, code: 'INVALID_LLM_RESPONSE', ... }`
    - Uses `geminiOrchestrator.processRequest('workflow-generation', ...)` with model `gemini-2.5-flash`, temperature 0.2
    - Includes retry logic (one retry with schema reminder) consistent with other stages
    - Emits `ai_pipeline_stage_start` and `ai_pipeline_stage_end` log entries
    - _Bug_Condition: isBugCondition(X) where structuralPromptStageAbsent(X)_
    - _Expected_Behavior: non-empty structural prompt string returned for any valid intent + catalog_
    - _Requirements: 2.5_

  - [x] 8.2 Wire structural-prompt-stage into ai-first-pipeline.ts between intent and node selection
    - Import `runStructuralPromptStage` from the new stage file
    - Call it after intent stage succeeds, before node selection
    - Add `structural_prompt` entry to `stageTrace`
    - If structural prompt stage fails, return `{ ok: false, code: 'STRUCTURAL_PROMPT_FAILED', ... }`
    - Pass `structuralPrompt` string as additional context to node-selection, edge-reasoning, and validation stages (add as optional parameter to each stage function signature)
    - _Requirements: 2.5_

  - [x] 8.3 Verify Bug 5 exploration test now passes
    - **Property 1: Expected Behavior** - Structural Prompt Stage Exists and Runs
    - **IMPORTANT**: Re-run the SAME test from task 1 (Test 5) — do NOT write a new test
    - Run: assert `stageTrace` contains entry with `stage: 'structural_prompt'`
    - **EXPECTED OUTCOME**: Test PASSES (confirms structural prompt stage is wired in)
    - _Requirements: 2.5_

  - [x] 8.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Downstream Stages Unchanged When Structural Prompt Is Optional Context
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - **EXPECTED OUTCOME**: All preservation tests PASS (no regressions)

- [x] 9. Add Stage 8 — Create credential-discovery-stage.ts and wire into pipeline

  - [x] 9.1 Create worker/src/services/ai/stages/credential-discovery-stage.ts
    - Thin wrapper around `credentialDiscoveryPhase.discoverCredentials(workflow, userId)`
    - Returns `{ ok: true, requiredCredentials, missingCredentials, satisfiedCredentials, durationMs }` or `{ ok: false, code: 'CREDENTIAL_DISCOVERY_FAILED', errors, durationMs }`
    - Emits `ai_pipeline_stage_start` and `ai_pipeline_stage_end` log entries
    - Stage name in logs: `'credential_discovery'`
    - _Bug_Condition: isBugCondition(X) where credentialDiscoveryNeverCalled(X)_
    - _Expected_Behavior: requiredCredentials and missingCredentials arrays present in output_
    - _Requirements: 2.6_

  - [x] 9.2 Wire credential-discovery-stage into ai-first-pipeline.ts after validation
    - Import `runCredentialDiscoveryStage` from the new stage file
    - Call it after validation succeeds, passing `vsResult.workflow` and `input.userId`
    - Add `credential_discovery` entry to `stageTrace`
    - If credential discovery fails, log a warning but do NOT fail the pipeline — return the workflow with empty credential arrays (credentials are non-blocking per Requirement 3.7)
    - Add `requiredCredentials` and `missingCredentials` to `AiPipelineOutput` type definition
    - _Requirements: 2.6, 3.7_

  - [x] 9.3 Update generate-workflow.ts to include credential data in API response
    - Add `requiredCredentials: result.requiredCredentials` and `missingCredentials: result.missingCredentials` to the success `res.json(...)` call
    - _Requirements: 2.6_

  - [x] 9.4 Verify Bug 6 exploration test now passes
    - **Property 1: Expected Behavior** - Credential Discovery Called and Output Included
    - **IMPORTANT**: Re-run the SAME test from task 1 (Test 6) — do NOT write a new test
    - Run: assert `result.requiredCredentials !== undefined`
    - **EXPECTED OUTCOME**: Test PASSES (confirms credential discovery is wired in)
    - _Requirements: 2.6_

  - [x] 9.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Workflow Returned Even When Credentials Missing
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - **EXPECTED OUTCOME**: All preservation tests PASS (no regressions)

- [x] 10. Add Stage 10 — Create field-ownership-stage.ts and wire into pipeline

  - [x] 10.1 Create worker/src/services/ai/stages/field-ownership-stage.ts
    - Walks `workflow.nodes`; for each node calls `unifiedNodeRegistry.get(node.type)?.inputSchema`
    - For each field in `inputSchema`, reads `field.fillMode?.default` (type `FieldFillMode`)
    - If `fillMode` is absent for a field, defaults to `'manual_static'`
    - Builds `fieldOwnershipMap: Record<string, Record<string, FieldFillMode>>` keyed by `nodeId → fieldName → fillMode`
    - Returns `{ ok: true, fieldOwnershipMap, durationMs }` — this stage never fails (worst case returns empty map)
    - Emits `ai_pipeline_stage_start` and `ai_pipeline_stage_end` log entries
    - Stage name in logs: `'field_ownership'`
    - _Bug_Condition: isBugCondition(X) where fieldOwnershipMapNeverExtracted(X)_
    - _Expected_Behavior: fieldOwnershipMap contains entry for every node and every inputSchema field_
    - _Requirements: 2.7_

  - [x] 10.2 Wire field-ownership-stage into ai-first-pipeline.ts after credential discovery
    - Import `runFieldOwnershipStage` from the new stage file
    - Call it after credential discovery, passing `vsResult.workflow`
    - Add `field_ownership` entry to `stageTrace`
    - Add `fieldOwnershipMap` to `AiPipelineOutput` type definition
    - _Requirements: 2.7_

  - [x] 10.3 Update generate-workflow.ts to include fieldOwnershipMap in API response
    - Add `fieldOwnershipMap: result.fieldOwnershipMap` to the success `res.json(...)` call
    - _Requirements: 2.7_

  - [x] 10.4 Verify Bug 7 exploration test now passes
    - **Property 1: Expected Behavior** - Field Ownership Map Extracted and Included
    - **IMPORTANT**: Re-run the SAME test from task 1 (Test 7) — do NOT write a new test
    - Run: assert `result.fieldOwnershipMap !== undefined`
    - **EXPECTED OUTCOME**: Test PASSES (confirms field ownership map is wired in)
    - _Requirements: 2.7_

  - [x] 10.5 Verify preservation tests still pass
    - **Property 2: Preservation** - All Existing Stage Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - **EXPECTED OUTCOME**: All preservation tests PASS (no regressions)

- [x] 11. Checkpoint — Ensure all tests pass
  - Re-run the full exploration test suite (task 1): all 8 tests must now PASS
  - Re-run the full preservation test suite (task 2): all tests must still PASS
  - Run a full integration test: call `pipeline.run()` with a representative 3-node prompt and assert:
    - `stageTrace` contains entries for: `intent`, `structural_prompt`, `node_selection`, `edge_reasoning`, `validation`, `credential_discovery`, `field_ownership`
    - `result.workflow.nodes` each have non-empty `data.config`
    - `result.requiredCredentials` is an array (may be empty for non-credential nodes)
    - `result.fieldOwnershipMap` is a non-empty object
    - `result.validationIssues` is an array
  - Verify `generate-workflow.ts` API response includes `requiredCredentials`, `missingCredentials`, and `fieldOwnershipMap`
  - Ask the user if any questions arise before marking complete

- [x] 12. Fix Bug A — Gate "Refining Workflow Plan" overlay behind questions completion

  - [x] 12.1 Locate the frontend state machine managing the AI pipeline wizard steps
    - Find the React context, Zustand store, or XState machine that controls transitions between: questions UI → refining overlay → field ownership → credentials
    - Identify the event/action that currently triggers the "Refining" state transition when the pipeline backend completes
    - _Bug_Condition: isBugCondition_A(X) where X.event = 'PIPELINE_COMPLETE' AND X.questionsAnswered = false AND X.nextState = 'REFINING'_
    - _Requirements: 1.9, 2.9_

  - [x] 12.2 Add questionsAnswered flag and fix the transition guard
    - Add a `questionsAnswered: boolean` flag (default `false`) to the state machine
    - Change the `PIPELINE_COMPLETE` handler: set `pipelineReady = true` but do NOT advance to `REFINING` if `questionsAnswered === false`
    - Add a `SUBMIT_ANSWERS` action that sets `questionsAnswered = true` and, if `pipelineReady === true`, advances to `REFINING`
    - Ensure the ComprehensiveQuestions submit button dispatches `SUBMIT_ANSWERS`
    - _Expected_Behavior: overlay only appears after user submits answers_
    - _Preservation: once questionsAnswered is true and pipelineReady is true, transition to REFINING proceeds normally_
    - _Requirements: 2.9, 3.9_

  - [x] 12.3 Verify the questions UI is shown and awaits user input before the overlay appears
    - Confirm that after pipeline backend completes, the questions UI is visible and interactive
    - Confirm that the "Refining Workflow Plan" overlay does NOT appear until the user submits answers
    - _Requirements: 2.9_

- [x] 13. Fix Bug B — Wire fieldOwnershipMap into Field Ownership UI component

  - [x] 13.1 Locate the Field Ownership UI component and its data source
    - Find the component rendering "No fields in this category for this workflow"
    - Identify where the pipeline API response is stored in frontend state (the object containing `fieldOwnershipMap`)
    - Confirm `fieldOwnershipMap` is present in the stored response (backend confirmed: `nodes=4, fields=24`)
    - _Bug_Condition: isBugCondition_B(X) where fieldOwnershipMap is non-empty AND renderedFieldCount = 0_
    - _Requirements: 1.10, 2.10_

  - [x] 13.2 Pass fieldOwnershipMap as a prop and render field rows
    - Accept `fieldOwnershipMap: Record<string, Record<string, FieldFillMode>>` as a prop on the Field Ownership component
    - Replace the static empty-state render with iteration over `Object.entries(fieldOwnershipMap)`
    - Group field rows by fill-mode category (`buildtime_ai_once`, `runtime_ai`, `manual_static`) for display
    - Fields with `fillMode === 'manual_static'` and no AI default render as disabled/locked toggles until the user enables them
    - Fields with `buildtime_ai_once` or `runtime_ai` fill mode pre-fill their display value with the AI-generated default
    - _Expected_Behavior: all fields from fieldOwnershipMap are rendered with correct fill-mode toggles_
    - _Preservation: AI-generated default values are still shown; user can still override with static value_
    - _Requirements: 2.10, 3.11_

  - [x] 13.3 Verify Field Ownership step renders actual fields
    - Confirm the component renders one row per field in `fieldOwnershipMap` (expected: 24 fields across 4 nodes)
    - Confirm "No fields in this category" is no longer shown when `fieldOwnershipMap` is non-empty
    - _Requirements: 2.10_

- [x] 14. Fix Bug C — Filter credential questions out of ComprehensiveQuestions UI step

  - [x] 14.1 Locate the ComprehensiveQuestions component question list renderer
    - Find the component that maps over the questions array to render question inputs
    - Identify the question shape — specifically the `type` and `category` fields used to distinguish credential questions (e.g., `type: 'credentialId'`, `category: 'credentials'`)
    - _Bug_Condition: isBugCondition_C(X) where EXISTS q IN questions WHERE q.type = 'credentialId' AND stepName = 'ComprehensiveQuestions'_
    - _Requirements: 1.11, 2.11_

  - [x] 14.2 Add filter to exclude credential questions from the display list
    - Before mapping questions to JSX, apply:
      ```ts
      const displayQuestions = questions.filter(
        q => q.type !== 'credentialId' && q.category !== 'credentials'
      );
      ```
    - Render `displayQuestions` instead of the raw `questions` array
    - _Expected_Behavior: no credentialId questions appear in the ComprehensiveQuestions step_
    - _Preservation: credential questions are still available to the Credentials step; OAuth/vault flows are unaffected_
    - _Requirements: 2.11, 3.10_

  - [x] 14.3 Verify credential questions do not appear in the questions step
    - Confirm `google_gmail` `credentialId` question (askOrder: 0.5) is absent from the ComprehensiveQuestions render
    - Confirm the Credentials step still shows the credential prompt
    - _Requirements: 2.11_

- [x] 15. Checkpoint — Verify full UI flow end-to-end
  - Confirm the questions UI is shown after workflow generation with all non-credential questions visible
  - Confirm the "Refining Workflow Plan" overlay only appears after the user submits answers
  - Confirm the Field Ownership step renders all fields from `fieldOwnershipMap` with correct fill-mode toggles
  - Confirm no credential questions appear in the ComprehensiveQuestions step
  - Confirm the Credentials step still shows OAuth/vault credential prompts
  - _Requirements: 2.9, 2.10, 2.11, 3.9, 3.10, 3.11_
