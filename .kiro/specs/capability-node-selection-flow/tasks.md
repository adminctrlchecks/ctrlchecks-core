# Implementation Plan: Capability-Based Node Selection Flow

## Overview

Implement the capability-based node selection flow as a strictly ordered pipeline: intent analysis → capability grouping → user selection UI → structural prompt generation → review UI → backend generation. All edge creation goes through `unifiedGraphOrchestrator`, all node metadata from `unifiedNodeRegistry`, all LLM calls via `geminiOrchestrator` with `gemini-2.5-flash` at `temperature: 0.1`.

## Tasks

- [x] 1. Scaffold types and shared contracts
  - Create `worker/src/services/ai/stages/capability-types.ts` with all shared interfaces: `UseCaseUnit`, `IntentAnalysisResult`, `IntentAnalysisError`, `IntentAnalysisOutput`, `CandidateNode`, `CapabilityContainer`, `CapabilityGroupingResult`, `CapabilityGroupingError`, `NodeSelection`, `NodeSelectionMap`, `StructuralPromptGenerationInput`, `StructuralPromptGenerationResult`, `StructuralPromptGenerationError`, and `LlmCallMeta`
  - Create `ctrl_checks/src/types/capability-selection.ts` mirroring the frontend-facing shapes: `CapabilityContainer`, `CandidateNode`, `NodeSelectionMap`
  - _Requirements: 1.3, 2.2, 2.8, 4.3_

- [ ] 2. Implement Intent_Analyzer stage
  - [x] 2.1 Implement `runIntentAnalysis` in `worker/src/services/ai/stages/capability-intent-analyzer.ts`
    - Build system prompt from `buildNodeCatalogText()` instructing LLM to output a JSON array of `UseCaseUnit`
    - Call `geminiOrchestrator.processRequest('intent-analysis', ...)` with `model: 'gemini-2.5-flash'`, `temperature: 0.1`
    - Validate: list length 1–20; exactly one `semanticRole === 'trigger'`; each unit has non-empty `label`, valid `semanticRole`, non-empty `description`
    - On parse failure: retry once with schema reminder; on validation failure (zero or multiple triggers, empty list): retry once with violation context
    - On final failure: return structured `IntentAnalysisError` — never fall back to defaults
    - Emit structured log with `promptHash` (SHA-256 of input prompt), `unitCount`, `durationMs`
    - Units are transient pipeline state only — never written to node config or `workflow.edges`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ]* 2.2 Write property test for Use_Case_Unit structural completeness (Property 1)
    - **Property 1: Use_Case_Unit structural completeness**
    - **Validates: Requirements 1.1, 1.3**
    - Use `fast-check` with arbitrary non-empty string prompts (mock LLM to return valid-shaped responses)
    - Assert every unit has non-empty `label`, valid `semanticRole` from the allowed enum, non-empty `description`

  - [ ]* 2.3 Write property test for exactly one trigger unit (Property 2)
    - **Property 2: Exactly one trigger unit per prompt**
    - **Validates: Requirements 1.4**
    - Generator: mock LLM responses with 0, 1, 2, and arbitrary N trigger units
    - Assert `units.filter(u => u.semanticRole === 'trigger').length === 1` on success; error on 0 or 2+

  - [ ]* 2.4 Write property test for unit count bounds (Property 3)
    - **Property 3: Unit count bounds**
    - **Validates: Requirements 1.5**
    - Generator: mock LLM responses with 0, 1, 20, 21, and arbitrary N units
    - Assert 0 → `EMPTY_UNIT_LIST` error; 1–20 → success; 21+ → error

  - [ ]* 2.5 Write unit tests for Intent_Analyzer
    - Valid prompt produces correct `UseCaseUnit` structure
    - Empty LLM response returns `EMPTY_UNIT_LIST`
    - LLM parse failure triggers retry with schema reminder
    - Multiple trigger units triggers retry with violation context

  - [ ]* 2.6 Write property test for edge reconciliation preserves case edges (Property 16)
    - **Property 16: Edge reconciliation preserves case edges from branching nodes**
    - **Validates: Core Architecture - Edge Reconciliation Fix**
    - Generator: arbitrary workflows with branching nodes (switch, if_else) connected directly to terminal nodes via case edges
    - Assert edge reconciliation engine preserves all case edges (`true`, `false`, `case_*`) from branching nodes and does not remove them during lineage validation

- [ ] 3. Implement Capability_Grouper stage
  - [x] 3.1 Implement `runCapabilityGrouping` in `worker/src/services/ai/stages/capability-grouper-stage.ts`
    - For each `UseCaseUnit`, call `geminiOrchestrator.processRequest('capability-grouping', ...)` with `model: 'gemini-2.5-flash'`, `temperature: 0.1`, passing the unit description and `buildNodeCatalogText()`
    - After LLM returns candidate node type identifiers, validate each with `unifiedNodeRegistry.has(nodeType)`; discard invalid identifiers with a warning log
    - If all candidates for a container are invalid after discarding, re-prompt once with validation failure context; if still empty, return `EMPTY_CONTAINER` error
    - Hydrate each valid candidate: `label` and `description` from `unifiedNodeRegistry.get(nodeType)`, `credentialRequirements` from `unifiedNodeRegistry.getRequiredCredentials(nodeType)`, `hasCredentials` from `credentialVault.exists(...)` per required credential
    - No `if/switch` on node type strings; no hardcoded mappings; no pre-selection flag on any candidate
    - Return containers in the same order as the input `UseCaseUnit` list
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 8.1, 8.3, 8.4, 8.6_

  - [ ]* 3.2 Write property test for one container per unit (Property 4)
    - **Property 4: One Capability_Container per Use_Case_Unit**
    - **Validates: Requirements 2.1, 2.2**
    - Generator: arbitrary arrays of 1–20 `UseCaseUnit` objects
    - Assert `containers.length === units.length` and `containers[i].useCaseUnit.unitId === units[i].unitId`

  - [ ]* 3.3 Write property test for invalid node types discarded (Property 5)
    - **Property 5: Invalid node type identifiers are discarded**
    - **Validates: Requirements 2.5**
    - Generator: mock LLM responses with arbitrary strings as node type identifiers (mix of valid registry keys and random strings)
    - Assert every candidate in every container passes `unifiedNodeRegistry.has(nodeType)`

  - [ ]* 3.4 Write property test for no pre-selection (Property 6)
    - **Property 6: No pre-selection in Capability_Containers**
    - **Validates: Requirements 2.7, 3.4**
    - Generator: arbitrary `UseCaseUnit` lists
    - Assert no container has any candidate with a pre-selected or default-selected flag

  - [ ]* 3.5 Write property test for candidate metadata matches registry (Property 7)
    - **Property 7: Candidate metadata matches registry**
    - **Validates: Requirements 2.9, 8.1, 8.6**
    - Generator: arbitrary subsets of registered node types
    - Assert `candidate.label === unifiedNodeRegistry.get(nodeType).label`, `candidate.description === unifiedNodeRegistry.get(nodeType).description`, and credential requirements match registry

  - [ ]* 3.6 Write unit tests for Capability_Grouper
    - Invalid node type identifiers are discarded and valid ones remain unaffected
    - Empty container after discard triggers re-prompt
    - Metadata values match registry values exactly
    - `hasCredentials` reflects vault state

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement Structural_Prompt_Generator stage
  - [x] 5.1 Implement `runCapabilityStructuralPromptStage` in `worker/src/services/ai/stages/capability-structural-prompt-stage.ts`
    - Build LLM prompt listing only the selected node types (from `orderedSelections`, which may be a partial subset of all containers), the original user prompt, and `buildNodeCatalogText()`; no default or legacy nodes included; instruct the LLM to generate a coherent workflow from the partial selections combined with the original user intent, intelligently omitting or bridging steps for containers the user skipped
    - Call `geminiOrchestrator.processRequest('structural-prompt', ...)` with `model: 'gemini-2.5-flash'`, `temperature: 0.1`
    - LLM outputs `{ type: "nodeName" }[]`; hydrate each entry: `const config = unifiedNodeRegistry.getDefaultConfig(nodeType)` — no hardcoded defaults
    - Call `unifiedGraphOrchestrator.initializeWorkflow(hydratedNodes)` to construct the initial graph — never write `workflow.edges` directly
    - Call `unifiedGraphOrchestrator.validateWorkflow(workflow)`; any violation returns `ORCHESTRATOR_VALIDATION_FAILED` error
    - Return `StructuralPromptGenerationResult` with `structuralPrompt`, validated `workflow`, `selectedNodeTypes`, `selectedContainerCount`, `totalContainerCount`, `nodeCount`, `edgeCount`, `durationMs`
    - Emit structured log with `selectedNodeTypes`, `selectedContainerCount`, `totalContainerCount`, `nodeCount`, `edgeCount`, `durationMs`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8, 7.1, 7.2, 8.5_

  - [ ]* 5.2 Write property test for structural prompt uses only selected node types (Property 10)
    - **Property 10: Structural prompt uses only selected node types**
    - **Validates: Requirements 4.2, 7.1, 7.2**
    - Generator: arbitrary valid `NodeSelection` maps using real registry node types
    - Assert every node in the resulting workflow has a type present in the selections; no default or legacy types appear

  - [ ]* 5.3 Write property test for node hydration uses registry defaults (Property 11)
    - **Property 11: Node hydration uses registry defaults**
    - **Validates: Requirements 4.4, 8.5**
    - Generator: arbitrary registered node types
    - Assert `hydratedNode.data.config` deep-equals `unifiedNodeRegistry.getDefaultConfig(nodeType)`

  - [ ]* 5.4 Write property test for validateWorkflow called after initializeWorkflow (Property 12)
    - **Property 12: validateWorkflow called after initializeWorkflow**
    - **Validates: Requirements 4.6**
    - Generator: arbitrary valid `NodeSelection` maps
    - Use mock orchestrator that records call order; assert `validateWorkflow` was called after `initializeWorkflow` on every invocation

  - [ ]* 5.5 Write unit tests for Structural_Prompt_Generator
    - Hydrated nodes use registry defaults
    - `initializeWorkflow` is called with the correct hydrated node list
    - `validateWorkflow` violations return `ORCHESTRATOR_VALIDATION_FAILED`
    - Structural prompt generation is never called before selections are provided

- [ ] 6. Implement the three API endpoints
  - [x] 6.1 Create `worker/src/api/capability-selection/analyze.ts` — Phase 1 handler
    - `POST /api/capability-selection/analyze` accepts `{ prompt, userId, correlationId? }`
    - Build `nodeCatalog` once via `buildNodeCatalogText()`
    - Call `runIntentAnalysis(prompt, nodeCatalog, correlationId)`; on error, return 4xx with structured error body
    - Call `runCapabilityGrouping(units, nodeCatalog, userId, correlationId)`; on error, return 4xx with structured error body
    - Return 200 with `{ correlationId, containers, promptHash, durationMs }`
    - No workflow graph is constructed at this point
    - _Requirements: 2.8, 7.1, 7.3_

  - [x] 6.2 Create `worker/src/api/capability-selection/generate.ts` — Phase 2 handler
    - `POST /api/capability-selection/generate` accepts `{ correlationId, userPrompt, selections, containers }`
    - Reconstruct ordered `NodeSelection[]` from `selections` map and `containers`
    - Build `nodeCatalog` via `buildNodeCatalogText()`
    - Call `runCapabilityStructuralPromptStage({ userPrompt, orderedSelections, nodeCatalog, correlationId })`
    - On error, return 4xx with `{ ok: false, code, message, selections }` — preserve selections for retry
    - Return 200 with `{ structuralPrompt, workflow, selectedNodeTypes, nodeCount, edgeCount, durationMs }`
    - _Requirements: 4.1, 4.2, 6.6, 7.1_

  - [x] 6.3 Create `worker/src/api/capability-selection/confirm.ts` — Phase 3 handler
    - `POST /api/capability-selection/confirm` accepts `{ correlationId, workflow, userPrompt, userId }`
    - Pass the validated `Workflow` to the existing `AiFirstPipeline` credential discovery, property population, and field ownership stages
    - Any further structural mutations (e.g., safety node injection) go through `unifiedGraphOrchestrator.injectNode(...)` followed by `validateWorkflow`
    - On error, return 4xx with `{ ok: false, code, message, selections }` — preserve selections
    - Return 200 with the fully built workflow (existing pipeline output shape)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 6.4 Register the three routes in the worker API router
    - Wire `analyze`, `generate`, and `confirm` handlers into the existing Express/Fastify router
    - _Requirements: 2.8_

  - [ ]* 6.5 Write property test for Node_Selections preserved on backend failure (Property 13)
    - **Property 13: Node_Selections preserved on backend failure**
    - **Validates: Requirements 6.6**
    - Generator: arbitrary `NodeSelection` maps; mock backend pipeline to always fail
    - Assert error response from `/generate` and `/confirm` contains `selections` matching the input

  - [ ]* 6.6 Write integration tests for the three API phases
    - Phase 1 (analyze): a real prompt produces a valid set of `CapabilityContainer`s with registry-validated candidates
    - Phase 2 (generate): a valid set of `NodeSelection`s produces a structurally valid `Workflow` (passes `validateWorkflow`)
    - Phase 3 (confirm): the confirmed workflow passes through credential discovery and property population without errors

- [x] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement Capability_Stage frontend component
  - [x] 8.1 Implement `ctrl_checks/src/components/workflow/CapabilityStage.tsx`
    - Props: `{ containers: CapabilityContainer[], onComplete: (selections: NodeSelectionMap) => void, onBack?: () => void }`
    - State: `selections: NodeSelectionMap`; derived `isComplete`: `Object.keys(selections).length >= 1` (at least one container has a selection; not all containers need to be filled)
    - Render all containers simultaneously in `useCaseUnit.orderIndex` order
    - Each container renders its `label`, `useCaseUnit.description`, and all `candidates` as radio-style selectable options
    - Each candidate displays: node `label`, `description`, and a credential status badge derived from `CandidateNode.hasCredentials`
    - Selecting a node replaces any prior selection in that container (single-select invariant); no backend call is triggered on selection change
    - Continue button disabled until `isComplete === true` (at least one container selected); clicking Continue calls `onComplete(selections)` — the only action that triggers downstream processing; selections passed may be a partial subset of all containers
    - Display a visual counter ("X of Y selected") showing how many containers have been selected without implying all must be filled
    - "Go Back" button (when `onBack` provided) calls `onBack()` with no state change
    - No `if/switch` on node type strings; no hardcoded credential logic
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 8.6_

  - [ ]* 8.2 Write property test for Continue gate (Property 8)
    - **Property 8: Continue gate — at least one selection across any container**
    - **Validates: Requirements 3.4, 3.6**
    - Generator: arbitrary sets of containers with arbitrary selection states (0 or 1 selection per container)
    - Assert `isComplete === (Object.keys(selections).length >= 1)` — enabled as soon as at least one container has a selection

  - [ ]* 8.3 Write property test for single-selection invariant (Property 9)
    - **Property 9: Single-selection invariant per container**
    - **Validates: Requirements 3.5**
    - Generator: arbitrary sequences of selection events on a container (selecting different candidates in sequence)
    - Assert after each event, at most one candidate is selected in that container

  - [ ]* 8.4 Write property test for go-back preserves selections (Property 15)
    - **Property 15: Go-back preserves selections**
    - **Validates: Requirements 5.5**
    - Generator: arbitrary `NodeSelectionMap` values
    - Assert that after navigating to the review step and clicking "Go Back", the `selections` state is unchanged

  - [ ]* 8.5 Write unit tests for Capability_Stage
    - Continue button disabled until at least one container has a selection
    - Selecting a node in a container deselects the previous selection
    - Selection change does not trigger any backend call
    - "Go Back" calls `onBack` without modifying selections

- [ ] 9. Implement Capability_Review frontend component
  - [x] 9.1 Implement `ctrl_checks/src/components/workflow/CapabilityReviewStep.tsx`
    - Props: `{ structuralPrompt: string, workflow: Workflow, selections: NodeSelectionMap, onConfirm: () => void, onBack: () => void }`
    - Display the `structuralPrompt` as a human-readable summary
    - List selected nodes in execution order with registry-sourced `label` and `description` (from `workflow.nodes` in order)
    - "Continue" button calls `onConfirm()` — the sole gate for Backend_Generation; no backend call happens before this
    - "Go Back" calls `onBack()` returning the user to `CapabilityStage` with `selections` preserved
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1_

  - [ ]* 9.2 Write unit tests for Capability_Review
    - "Continue" calls `onConfirm` and does not call `onBack`
    - "Go Back" calls `onBack` and does not call `onConfirm`
    - Nodes are displayed in execution order
    - Structural prompt text is rendered

- [ ] 10. Integrate Capability_Stage and Capability_Review into the workflow creation flow
  - [x] 10.1 Wire `CapabilityStage` into the existing workflow creation step sequence
    - Insert `CapabilityStage` after the prompt submission step and before any structural prompt generation
    - Pass `containers` from the Phase 1 API response as props
    - On `onComplete`, call the Phase 2 API (`/generate`) with the selections
    - On `onBack`, return to the prompt step
    - _Requirements: 3.7, 7.1, 7.3_

  - [x] 10.2 Wire `CapabilityReviewStep` after Phase 2 response
    - Pass `structuralPrompt`, `workflow`, and `selections` from the Phase 2 response as props
    - On `onConfirm`, call the Phase 3 API (`/confirm`) to begin Backend_Generation
    - On `onBack`, return to `CapabilityStage` with `selections` preserved; re-entering `CapabilityStage` and clicking Continue again regenerates the structural prompt
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 6.1_

  - [x] 10.3 Ensure legacy pre-computation path is not invoked when this flow is active
    - Verify the existing pre-selection structural prompt generation step is not called in parallel or as a background task during Phase 1 or Phase 2
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 10.4 Write integration tests for legacy path isolation
    - Mock `runStructuralPromptStage` (legacy) and assert it is never called during Phase 1 or Phase 2
    - Assert `workflow.edges.push` and `workflow.edges = [...]` do not appear in any new source files (static analysis)

- [x] 11. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Write property test for Node_Catalog includes all registry nodes (Property 14)
  - [ ] 12.1 Write property test for Node_Catalog completeness
    - **Property 14: Node_Catalog includes all registry nodes**
    - **Validates: Requirements 8.2**
    - Generator: register arbitrary mock node types in the registry
    - Assert `buildNodeCatalogText()` output contains every registered node type
    - Assert adding a new node to the registry automatically includes it in the catalog on the next call without code changes

- [ ] 13. Validate edge reconciliation fix integration
  - [x] 13.1 Verify edge reconciliation engine fix is implemented
    - Confirm `hasLineageValidIncoming` function recognizes case edges from branching nodes as legitimate predecessors
    - Verify fix prevents removal of `switch→log_output` and `if_else→log_output` case edges
    - _Edge Reconciliation Architecture Fix_

  - [x] 13.2 Confirm comprehensive test coverage exists
    - Verify `edge-reconciliation-branching.test.ts` contains 23+ test scenarios
    - Confirm tests validate all branching patterns (if_else, switch, multi-case scenarios)
    - Ensure tests pass and validate the universal solution
    - _Edge Reconciliation Architecture Fix_

  - [ ]* 13.3 Add integration test for capability flow with branching workflows
    - Test that capability-based node selection flow works correctly with branching workflows
    - Verify edge reconciliation fix applies to workflows generated through this flow
    - Assert case edges are preserved when users select branching nodes that connect to terminals
    - _Edge Reconciliation Architecture Fix Integration_

- [ ] 14. Add CI static analysis check for edge ownership
  - Add a CI step (e.g., a script or lint rule) that greps all new source files under `worker/src/services/ai/stages/capability-*.ts` and `worker/src/api/capability-selection/` for `workflow\.edges\.push` and `workflow\.edges\s*=\s*\[`
  - The check must fail if any match is found outside `unified-graph-orchestrator.ts`
  - _Requirements: 7.5_

- [x] 15. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All 16 correctness properties from the design document are covered by property-based tests using `fast-check` (minimum 100 iterations each)
- All edge creation goes through `unifiedGraphOrchestrator.initializeWorkflow()` and `validateWorkflow()` — never `workflow.edges.push` or `workflow.edges = []`
- All node metadata (label, description, credentialRequirements, defaultConfig) is read from `unifiedNodeRegistry` at request time — never hardcoded
- No `if/switch` on node type strings anywhere in the new code
- LLM calls use `geminiOrchestrator` with `gemini-2.5-flash`, `temperature: 0.1`
- Node_Catalog is built once per Phase 1 request via `buildNodeCatalogText()` and reused across all LLM calls within that request
- The structural prompt is never computed before all Node_Selections are recorded (Requirement 7)
- Backend_Generation never starts before the user clicks Continue on the review step (Requirement 6)
- **Edge Reconciliation Fix**: The core architecture includes a critical fix in `edge-reconciliation-engine.ts` (lines 511-534) that preserves case edges from branching nodes to terminal nodes, ensuring workflow graph correctness for all branching scenarios. This fix is permanent and applies universally to all workflows.
