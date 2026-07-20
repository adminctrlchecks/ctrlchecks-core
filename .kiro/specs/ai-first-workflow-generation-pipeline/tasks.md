# Implementation Plan: AI-First Workflow Generation Pipeline

## Overview

Implement the fully AI-driven workflow generation pipeline in TypeScript. This is the single, universal pipeline — there is no feature flag, no parallel hybrid path, and no fallback. Each hardcoded component is deleted as its AI-driven replacement is built and verified. When this is done, one flow exists: User Prompt → AI_Pipeline → Workflow_Graph.

## Tasks

- [x] 1. Extend Node Catalog Builder with token budget and priority truncation
  - [x] 1.1 Implement `buildNodeCatalogText()` in `worker/src/services/ai/node-catalog-builder.ts`
    - Accept `NodeCatalogOptions` (`tokenBudget`, `priorityOrder`)
    - Read all node definitions from `unifiedNodeRegistry.getAllTypes()`
    - Sort by `priorityOrder` (trigger first, utility last)
    - Serialize each entry to compact JSON with required fields: `type`, `label`, `category`, `description`, `inputSummary`, `outputSummary`, `credentials`, `isTrigger`, `isBranching`
    - Accumulate entries until `tokenBudget` is reached; drop remaining
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - [x] 1.2 Write property test for Node_Catalog completeness (Property 1)
    - **Property 1: Node_Catalog completeness**
    - **Validates: Requirements 1.1, 1.6**
    - Generate random registry snapshots; assert every registered type appears in catalog when budget is sufficient
  - [x] 1.3 Write property test for Node_Catalog entry schema (Property 2)
    - **Property 2: Node_Catalog entry schema**
    - **Validates: Requirements 1.2**
    - Generate random node definitions; assert all required fields present in each catalog entry
  - [x] 1.4 Write property test for token budget enforcement with priority preservation (Property 3)
    - **Property 3: Token budget enforcement with priority preservation**
    - **Validates: Requirements 1.3, 1.4**
    - Generate random registries and budgets; assert catalog never exceeds budget and trigger/logic nodes appear before utility nodes are dropped

- [x] 2. Implement System_Prompt_Builder
  - [x] 2.1 Create `worker/src/services/ai/system-prompt-builder.ts` with `SystemPromptBuilder` class
    - Define `PipelineStage` union type: `'intent' | 'node_selection' | 'edge_reasoning' | 'validation' | 'repair'`
    - Define `SystemPromptBuilderInput`, `StageContext`, and `SystemPromptBuilderOutput` interfaces
    - Implement `build(input)` method that produces a prompt with four mandatory sections: role/objective, Node_Catalog, output format (JSON schema), and hard constraints
    - For `node_selection` stage: embed trigger constraint and minimal-set instructions
    - For `edge_reasoning` stage: embed all DAG constraint rules (no cycles, one trigger with in-degree zero, non-terminal nodes with outgoing edges, branching node edge labels)
    - For `validation` stage: embed all four evaluation dimensions (structural, semantic, completeness, data flow)
    - Method must be deterministic: same inputs always produce same output
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6_
  - [x] 2.2 Write property test for System_Prompt_Builder determinism (Property 14)
    - **Property 14: System_Prompt_Builder is deterministic**
    - **Validates: Requirements 5.1, 5.6**
    - Generate random stage/catalog/intent inputs; call builder twice; assert identical non-empty output
  - [x] 2.3 Write property test for mandatory prompt sections (Property 15)
    - **Property 15: System prompts contain all four mandatory sections**
    - **Validates: Requirements 5.3**
    - Generate random stage/catalog/intent combinations; assert all four sections present in output
  - [x] 2.4 Write property test for Node_Selection prompt trigger constraint (Property 6)
    - **Property 6: Node_Selection prompt contains trigger and minimal-set constraints**
    - **Validates: Requirements 2.5**
    - Generate random catalogs/intents; assert `node_selection` prompt contains trigger constraint instructions
  - [x] 2.5 Write property test for Edge_Reasoning prompt DAG constraints (Property 7)
    - **Property 7: Edge_Reasoning prompt contains DAG constraints**
    - **Validates: Requirements 3.5**
    - Generate random node selections; assert `edge_reasoning` prompt contains all four DAG constraint rules
  - [x] 2.6 Write property test for Validation prompt evaluation dimensions (Property 10)
    - **Property 10: Validation prompt covers all four evaluation dimensions**
    - **Validates: Requirements 4.2**
    - Generate random inputs; assert `validation` prompt instructs LLM on all four dimensions
  - [x] 2.7 Delete static markdown system prompt files
    - Delete `WORKFLOW_GENERATION_SYSTEM_PROMPT.md`, `WORKFLOW_PLANNING_SYSTEM_PROMPT.md`, `ULTIMATE_WORKFLOW_SYSTEM_PROMPT.md`, `FINAL_WORKFLOW_SYSTEM_PROMPT.md`
    - Remove all imports and references to these files from the codebase
    - _Requirements: 5.4, 7.4_

- [x] 3. Checkpoint — Ensure catalog builder and prompt builder tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Intent_Stage
  - [x] 4.1 Create `worker/src/services/ai/stages/intent-stage.ts`
    - Accept raw user prompt
    - Call `SystemPromptBuilder.build({ stage: 'intent', ... })` to get system prompt
    - Send prompt to `GeminiOrchestrator` with the intent output schema
    - Parse and return structured intent: `intent`, `triggerType`, `actions`, `dataFlows`, `constraints`
    - On JSON parse failure: retry once with schema reminder appended; on second failure return `code: 'INVALID_LLM_RESPONSE'`
    - Emit structured log entries at stage start and end (stage name, input summary, output summary, duration)
    - Log LLM call details (model, temperature, prompt tokens, completion tokens)
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 5. Implement Node_Selection_Stage and delete Keyword_Filter
  - [x] 5.1 Create `worker/src/services/ai/stages/node-selection-stage.ts`
    - Accept structured intent and Node_Catalog
    - Call `SystemPromptBuilder.build({ stage: 'node_selection', ... })` — no keyword pre-filter before LLM call
    - Send to `GeminiOrchestrator` with node selection output schema
    - Post-LLM: validate each returned `type` against `unifiedNodeRegistry.has(type)`; discard unknown types with warning log
    - If zero valid types remain: return `{ code: 'NO_VALID_NODES', rawLlmResponse }` — no fallback to keyword matching
    - On JSON parse failure: retry once; on second failure return `code: 'INVALID_LLM_RESPONSE'`
    - Assign a `nodeId` to each valid selected node
    - Emit stage start/end logs and LLM call logs
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 8.1, 8.2, 8.3_
  - [x] 5.2 Write property test for unknown node type discarding (Property 5)
    - **Property 5: Unknown node types are discarded without pipeline failure**
    - **Validates: Requirements 2.3, 2.4**
    - Generate random LLM responses with mixed valid/invalid types; assert unknown types discarded and pipeline continues
  - [x] 5.3 Write property test for LLM receives prompt and catalog (Property 4)
    - **Property 4: LLM receives prompt and catalog on every Node_Selection call**
    - **Validates: Requirements 2.1**
    - Assert every `GeminiOrchestrator` call from Node_Selection_Stage includes both structured intent and Node_Catalog
  - [x] 5.4 Delete Keyword_Filter from codebase
    - Delete keyword-based logic in `keyword-node-selector.ts` and `enhanced-keyword-matcher.ts`
    - Remove all call sites that invoke keyword-based node detection
    - Verify no remaining code path reaches the deleted logic
    - _Requirements: 2.7, 7.1_

- [x] 6. Implement Edge_Reasoning_Stage and delete Topological_Sort
  - [x] 6.1 Create `worker/src/services/ai/stages/edge-reasoning-stage.ts`
    - Accept selected nodes, Node_Catalog, and original user intent
    - Call `SystemPromptBuilder.build({ stage: 'edge_reasoning', ... })`
    - Send to `GeminiOrchestrator` with edge reasoning output schema (`orderedNodes`, `edges`)
    - Run DFS cycle detection on proposed edge list
    - If cycle detected: re-prompt once with cycle path identified; if second response still has cycle return `{ code: 'CYCLE_DETECTED' }`
    - On valid edge list: call `unifiedGraphOrchestrator.initializeWorkflow(orderedNodes)` — never write to `workflow.edges` directly
    - On JSON parse failure: retry once; on second failure return `code: 'INVALID_LLM_RESPONSE'`
    - Emit stage start/end logs and LLM call logs
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.7, 3.8, 8.1, 8.2, 8.3_
  - [x] 6.2 Write property test for cycle detection triggering re-prompt (Property 8)
    - **Property 8: Cycle detection triggers re-prompt**
    - **Validates: Requirements 3.6**
    - Generate random cyclic edge lists; assert cycle detection fires and exactly one re-prompt is issued before error
  - [x] 6.3 Write property test for Unified_Graph_Orchestrator always called (Property 9)
    - **Property 9: Unified_Graph_Orchestrator is always called for graph materialization**
    - **Validates: Requirements 3.7, 3.8**
    - Assert `initializeWorkflow` or `reconcileWorkflow` is called for every valid LLM output; assert no direct `workflow.edges` writes
  - [x] 6.4 Delete Topological_Sort from generation path
    - Remove `getTopologicalOrder` calls in pipeline orchestrator and `execution-order-enforcer.ts` generation path
    - Verify no remaining generation code path invokes topological sort
    - _Requirements: 3.3, 3.4, 7.2_

- [x] 7. Implement Validation_Stage and delete Registry_Contract_Validator hardcoded rules
  - [x] 7.1 Create `worker/src/services/ai/stages/validation-stage.ts`
    - Accept workflow graph, Node_Catalog, and original user intent
    - Call `SystemPromptBuilder.build({ stage: 'validation', ... })`
    - Send to `GeminiOrchestrator` with validation output schema (`status`, `issues`)
    - Parse validation result; assert schema conformance (`status` is `pass`/`fail`, every `error`-severity issue has `suggestedFix`)
    - If `status === 'fail'` with any `error`-severity issue: attempt exactly one repair pass by re-prompting with issues and requesting corrected graph
    - If errors remain after repair: return `{ workflow: partiallyRepairedGraph, validationIssues: remainingErrors }` — never silently return invalid graph
    - Always call `unifiedGraphOrchestrator.validateWorkflow(workflow)` as structural safety net; treat violations as `code: 'ORCHESTRATOR_VALIDATION_FAILED'`
    - Emit stage start/end logs and LLM call logs; log full error details at `error` level on failure
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 8.1, 8.2, 8.3, 9.4_
  - [x] 7.2 Write property test for validation result schema conformance (Property 11)
    - **Property 11: Validation result schema conformance**
    - **Validates: Requirements 4.3**
    - Generate random validation LLM responses; assert schema conformance (status field, issues array, suggestedFix on errors)
  - [x] 7.3 Write property test for repair pass triggered exactly once (Property 12)
    - **Property 12: Repair pass is triggered exactly once on errors**
    - **Validates: Requirements 4.4**
    - Assert exactly one repair pass is attempted for any validation result containing error-severity issues
  - [x] 7.4 Write property test for validateWorkflow always called (Property 13)
    - **Property 13: validateWorkflow is always called as structural safety net**
    - **Validates: Requirements 4.7, 9.4**
    - Assert `unifiedGraphOrchestrator.validateWorkflow()` is called on the final graph for every pipeline execution reaching Validation_Stage
  - [x] 7.5 Delete Registry_Contract_Validator hardcoded rules from generation path
    - Remove hardcoded validation checks in `workflow-validator.ts` generation path
    - Verify no remaining generation code path invokes hardcoded registry contract checks
    - _Requirements: 4.6, 7.3_

- [x] 8. Checkpoint — Ensure all stage tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement node hydration with registry defaults
  - [x] 9.1 Add node hydration step in `AiFirstPipeline` after Node_Selection_Stage
    - For each LLM-selected node type, call `unifiedNodeRegistry.getDefaultConfig(type)` to hydrate node configuration
    - Merge LLM-provided config fields over registry defaults — never invent config values outside registry schema
    - _Requirements: 6.3, 6.5_
  - [x] 9.2 Write property test for node hydration using registry defaultConfig (Property 16)
    - **Property 16: Node hydration uses registry defaultConfig**
    - **Validates: Requirements 6.3**
    - Generate random node types; assert hydration always uses `unifiedNodeRegistry.getDefaultConfig(type)` and never invents values

- [x] 10. Implement AiFirstPipeline orchestrator
  - [x] 10.1 Create `worker/src/services/ai/ai-first-pipeline.ts` with `AiFirstPipeline` class
    - Define `AiPipelineInput`, `AiPipelineOutput`, `AiPipelineDeps`, and `StageTrace` interfaces
    - Implement `run(input)` method that sequences: Intent_Stage → Node_Selection_Stage → Edge_Reasoning_Stage → node hydration → Validation_Stage
    - Propagate structured errors (`NO_VALID_NODES`, `CYCLE_DETECTED`, `INVALID_LLM_RESPONSE`, `ORCHESTRATOR_VALIDATION_FAILED`) to caller
    - Collect `StageTrace` entries (stage name, startedAt, completedAt, durationMs, inputSummary, outputSummary, llmCall details) for every stage
    - Return `{ workflow, validationIssues, stageTrace }` on success
    - _Requirements: 8.1, 8.2, 8.4_
  - [x] 10.2 Write property test for stage logs emitted for every stage (Property 17)
    - **Property 17: Stage logs are emitted for every stage**
    - **Validates: Requirements 8.1**
    - Run pipeline with mock LLM; capture log output; assert structured log entries present at start and end of each stage with required fields
  - [x] 10.3 Write property test for LLM call logs contain required fields (Property 18)
    - **Property 18: LLM call logs contain model, temperature, and token counts**
    - **Validates: Requirements 8.2**
    - Assert every LLM call log entry contains model name, temperature, prompt token count, and completion token count

- [x] 11. Wire AiFirstPipeline as the single entry point and delete old pipeline
  - [x] 11.1 Update `generate-workflow.ts` to invoke `AiFirstPipeline` directly
    - Remove any feature flag check or conditional branching
    - Instantiate and call `AiFirstPipeline` as the only pipeline
    - _Requirements: 9.1, 9.3_
  - [x] 11.2 Write property test for single pipeline entry point (Property 19)
    - **Property 19: Single pipeline entry point — no dual paths**
    - **Validates: Requirements 9.1, 9.3**
    - Assert `generate-workflow.ts` invokes `AiFirstPipeline` directly with no conditional branching
  - [x] 11.3 Delete `WorkflowPipelineOrchestrator` and all hybrid pipeline code
    - Delete the existing `WorkflowPipelineOrchestrator` class and its file
    - Remove all imports and references to the old orchestrator
    - Verify no remaining code path reaches the deleted orchestrator
    - _Requirements: 9.2, 9.5_

- [x] 12. Checkpoint — Ensure all pipeline and entry point tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Write integration tests verifying universal AI-first behavior
  - [x] 13.1 Verify `validateWorkflow` passes on `AiFirstPipeline` outputs for a representative prompt set
    - Run at least 10 representative prompts through the pipeline
    - Assert every output passes `unifiedGraphOrchestrator.validateWorkflow()`
    - _Requirements: 9.4_
  - [x] 13.2 Verify five prompt phrasings that previously failed under keyword matching now succeed
    - Test at least five distinct prompt phrasings that previously failed under the keyword-based approach
    - Assert each now produces a valid `Workflow_Graph` via the AI pipeline
    - _Requirements: 7.5_
  - [x] 13.3 Verify no hardcoded component is reachable from any code path
    - Assert deleted files are gone and no import references remain
    - Assert no `if (node.type === ...)` or `switch (node.type)` patterns exist in the generation path
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All property tests are required — not optional. They are the verification gate for each stage.
- Property tests use `fast-check` and run a minimum of 100 iterations each
- Each property test is tagged: `// Feature: ai-first-workflow-generation-pipeline, Property N: <property_text>`
- Hardcoded components are deleted inline as each stage is built — not deferred to a cleanup task
- The `Unified_Graph_Orchestrator` is the single authority for all edge mutations — never write to `workflow.edges` directly
- Node hydration always uses `unifiedNodeRegistry.getDefaultConfig(type)` — never invent config values
- There is no feature flag, no fallback, no dual pipeline. One flow only.
