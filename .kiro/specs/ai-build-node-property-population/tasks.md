# Implementation Plan: AI Build Node Property Population

## Overview

Insert a registry-driven Property Population Stage (Stage 6) into the AI-First Pipeline that calls an LLM once per node to populate every `buildtime_ai_once` field, using user intent + structural prompt + node inputSchema as context. The stage is soft-failing, never touches edges, and never calls orchestrator mutation methods.

## Tasks

- [x] 1. Add `buildtime_ai_once` to `FieldFillMode` and verify `NodeInputField` fillMode contract
  - Confirm `FieldFillMode` in `worker/src/core/types/unified-node-contract.ts` already includes `'buildtime_ai_once'` (it does per current source); if not present, add it
  - Confirm `NodeInputField.fillMode.default` and `NodeInputField.ownership` fields exist with correct types
  - No runtime behavior change — this is a type/contract verification task
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. Implement `property-population-stage.ts`
  - [x] 2.1 Create `worker/src/services/ai/stages/property-population-stage.ts` with exported interfaces and stage function
    - Export `PropertyPopulationStageInput` interface: `{ workflow, userIntent, structuralPrompt, correlationId? }`
    - Export `PropertyPopulationStageResult` interface: `{ ok: true, workflow, propertyPopulationSummary: Record<string, string[]>, durationMs }`
    - Export `runPropertyPopulationStage(input): Promise<PropertyPopulationStageResult>`
    - Stage never returns `ok: false` — all errors are per-node soft failures
    - _Requirements: 1.1, 4.1, 4.6_

  - [x] 2.2 Implement field selection logic inside `runPropertyPopulationStage`
    - For each node, call `unifiedNodeRegistry.get(node.type)?.inputSchema`
    - Filter to fields where `field.fillMode?.default === 'buildtime_ai_once'` AND `field.ownership !== 'credential'`
    - Skip nodes whose type is not found in registry (log warn, continue)
    - Skip nodes with zero eligible fields (leave config unchanged)
    - _Requirements: 1.2, 1.4, 2.1, 2.2, 2.3, 2.5_

  - [x] 2.3 Implement LLM prompt construction per node
    - Build prompt containing: (a) userIntent string, (b) structuralPrompt string, (c) field names + types + descriptions from inputSchema for all eligible fields, (d) examples if present on the field
    - Use system prompt instructing LLM to return ONLY valid JSON, no markdown, no explanation
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 2.4 Implement LLM call, JSON parsing, and fillMode gate
    - Call `geminiOrchestrator` (or equivalent LLM client used by other stages) with the constructed prompt
    - Strip markdown fences from response before `JSON.parse`
    - For each key in parsed response: verify field exists in inputSchema AND `fillMode.default === 'buildtime_ai_once'` AND `ownership !== 'credential'`; silently ignore keys that fail the gate
    - For fields whose `inputSchema` type is `'array'` or `'object'` and LLM returned a string value: `JSON.parse(value)`; on parse failure log warn and use `defaultConfig()` value for that field only
    - On unparseable JSON: attempt one retry with explicit JSON reminder; on second failure fall back to `defaultConfig()` for that node
    - _Requirements: 2.4, 2.5, 3.4, 3.5, 3.6_

  - [x] 2.5 Implement merge-over-defaults and per-node soft failure
    - Final config for each node: `{ ...nodeDef.defaultConfig(), ...filteredLlmValues }`
    - Wrap each node's LLM call in independent try/catch; on error: log warn with `correlationId` + `nodeId`, leave node at `defaultConfig()`, continue to next node
    - Stage function itself never throws — always returns `PropertyPopulationStageResult`
    - _Requirements: 1.3, 4.4, 4.5_

  - [x] 2.6 Implement `propertyPopulationSummary` tracking
    - After writing fields for a node, record `summary[nodeId] = [fieldName, ...]` for every field actually written
    - Nodes where zero fields were written must NOT appear as keys in the summary
    - _Requirements: 5.1, 4.6_

  - [ ]* 2.7 Write property test — Property 2: fillMode gate (only eligible fields written)
    - // Feature: ai-build-node-property-population, Property 2: fillMode gate — only eligible fields are written
    - Generate nodes with random mixes of `manual_static`, `runtime_ai`, `buildtime_ai_once`, and `credential` fields using fast-check
    - Run stage with mocked LLM returning values for all fields
    - Assert diff between input and output config contains only `buildtime_ai_once` non-credential fields
    - Minimum 100 iterations
    - **Property 2: fillMode gate — only eligible fields are written**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 7.2**

  - [ ]* 2.8 Write property test — Property 3: merge semantics
    - // Feature: ai-build-node-property-population, Property 3: Merge semantics — LLM output merged over registry defaults
    - For any node, mock LLM to return arbitrary JSON object R
    - Assert output config equals `{ ...defaultConfig(), ...filteredFields(R) }`
    - Minimum 100 iterations
    - **Property 3: Merge semantics — LLM output merged over registry defaults**
    - **Validates: Requirements 1.3, 7.4**

  - [ ]* 2.9 Write property test — Property 5: soft failure
    - // Feature: ai-build-node-property-population, Property 5: Soft failure — LLM error falls back to registry defaults
    - For any node, mock LLM to throw
    - Assert that node's config equals `defaultConfig()` and stage returns `ok: true`
    - Minimum 100 iterations
    - **Property 5: Soft failure — LLM error falls back to registry defaults**
    - **Validates: Requirements 4.4, 4.5, 7.5**

  - [ ]* 2.10 Write property test — Property 8: JSON parsing for array/object fields
    - // Feature: ai-build-node-property-population, Property 8: JSON parsing for array/object fields
    - For any array/object field, mock LLM to return a JSON-encoded string value
    - Assert written value is the parsed object, not the raw string
    - Minimum 100 iterations
    - **Property 8: JSON parsing for array/object fields**
    - **Validates: Requirements 3.6**

- [x] 3. Checkpoint — verify stage in isolation
  - Ensure all tests from task 2 pass, ask the user if questions arise.

- [x] 4. Wire Property Population Stage into `ai-first-pipeline.ts`
  - [x] 4.1 Add `propertyPopulationSummary: Record<string, string[]>` to `AiPipelineOutput` interface
    - _Requirements: 4.6, 6.5_

  - [x] 4.2 Insert Stage 6 call between Validation Stage and Credential Discovery Stage
    - Call `runPropertyPopulationStage({ workflow: vsResult.workflow, userIntent: intentResult.intent.intent, structuralPrompt, correlationId })`
    - Pass `ppResult.workflow` (not `vsResult.workflow`) into the Credential Discovery Stage call
    - _Requirements: 4.1, 6.1, 6.2, 6.3_

  - [x] 4.3 Add `stageTrace` entry for `property_population`
    - Push entry with `stage: 'property_population'`, `startedAt`, `completedAt`, `durationMs`, `inputSummary: \`nodes=${vsResult.workflow.nodes.length}\``, `outputSummary: \`populated=${Object.keys(ppResult.propertyPopulationSummary).length} nodes\``
    - _Requirements: 4.2, 6.4_

  - [x] 4.4 Include `propertyPopulationSummary` in the `return { ok: true, ... }` object
    - _Requirements: 4.6_

  - [ ]* 4.5 Write property test — Property 7: edges are immutable after the stage
    - // Feature: ai-build-node-property-population, Property 7: Edges are immutable after the stage
    - For any workflow, deep-equal assert `workflow.edges` before and after stage run
    - Assert stage never calls `initializeWorkflow`, `injectNode`, `removeNode`, or any orchestrator mutation
    - Minimum 100 iterations
    - **Property 7: Edges are immutable after the stage**
    - **Validates: Requirements 6.2, 6.3**

  - [ ]* 4.6 Write property test — Property 9: stageTrace entry has all required fields
    - // Feature: ai-build-node-property-population, Property 9: stageTrace entry has all required fields
    - For any pipeline run, assert the `property_population` stageTrace entry has non-null `stage`, `startedAt`, `completedAt`, `durationMs`, `inputSummary`, `outputSummary`
    - Minimum 100 iterations
    - **Property 9: stageTrace entry has all required fields**
    - **Validates: Requirements 4.2**

  - [ ]* 4.7 Write property test — Property 10: all existing stage traces are preserved
    - // Feature: ai-build-node-property-population, Property 10: All existing stage traces are preserved
    - For any pipeline run, assert stageTrace contains entries for all 8 stages in order: `intent`, `structural_prompt`, `node_selection`, `edge_reasoning`, `validation`, `property_population`, `credential_discovery`, `field_ownership`
    - Assert no existing stage trace entry is modified
    - Minimum 100 iterations
    - **Property 10: All existing stage traces are preserved**
    - **Validates: Requirements 6.4**

- [x] 5. Update `generate-workflow.ts` API response
  - Add `propertyPopulationSummary: result.propertyPopulationSummary` to the `res.json({ ... })` success response body alongside existing fields
  - _Requirements: 6.5_

- [x] 6. Add `buildtime_ai_once` fillMode to appropriate registry node fields
  - [x] 6.1 Update `form_trigger` node in `unified-node-registry.ts`: set `fillMode.default = 'buildtime_ai_once'` on `fields` field
    - _Requirements: 1.1, 1.2_

  - [x] 6.2 Update `if_else` node: set `fillMode.default = 'buildtime_ai_once'` on `conditions` field
    - _Requirements: 1.1, 1.2_

  - [x] 6.3 Update `set_variable` node: set `fillMode.default = 'buildtime_ai_once'` on `values` field
    - _Requirements: 1.1, 1.2_

  - [x] 6.4 Update `gmail` node: set `fillMode.default = 'buildtime_ai_once'` on `subject`, `body`, and `to` fields (ownership must remain `'value'`, not `'credential'`)
    - _Requirements: 1.1, 1.2_

  - [x] 6.5 Update `switch` node: set `fillMode.default = 'buildtime_ai_once'` on `cases` / `rules` field
    - _Requirements: 1.1, 1.2_

  - [x] 6.6 Audit remaining nodes in the registry for fields where user intent drives the value; add `fillMode.default = 'buildtime_ai_once'` where appropriate (e.g. `slack` message body, `http_request` url/body when intent-driven)
    - _Requirements: 1.1, 1.2, 1.5_

  - [ ]* 6.7 Write property test — Property 1: all buildtime_ai_once fields are populated
    - // Feature: ai-build-node-property-population, Property 1: All buildtime_ai_once fields are populated
    - Generate random sets of node types with mocked registry definitions containing `buildtime_ai_once` fields; mock LLM to return valid JSON
    - Assert every `buildtime_ai_once` non-credential field in every node has a non-null, non-empty value in output config
    - Minimum 100 iterations
    - **Property 1: All buildtime_ai_once fields are populated**
    - **Validates: Requirements 1.1, 7.1**

- [x] 7. Checkpoint — full pipeline integration
  - Ensure all tests pass end-to-end with the new stage wired in, ask the user if questions arise.

- [x] 8. Write remaining property and unit tests
  - [x] 8.1 Write unit test: stage emits `ai_pipeline_stage_start` and `ai_pipeline_stage_end` log events with `correlationId`
    - _Requirements: 4.3_

  - [x] 8.2 Write unit test: pipeline returns `ok: true` when all LLM calls in the stage fail
    - _Requirements: 4.5_

  - [x] 8.3 Write unit test: `generate-workflow.ts` success response includes `propertyPopulationSummary` key
    - _Requirements: 6.5_

  - [x] 8.4 Write unit test: `AiPipelineOutput` type includes `propertyPopulationSummary` field (compile-time check via TypeScript assignment)
    - _Requirements: 4.6_

  - [ ]* 8.5 Write property test — Property 4: summary accuracy
    - // Feature: ai-build-node-property-population, Property 4: Summary accuracy — propertyPopulationSummary matches written fields
    - For any workflow run, assert `propertyPopulationSummary[nodeId]` contains exactly the fields written to `node.data.config` — no more, no fewer
    - Assert nodes with zero written fields do not appear as keys
    - Minimum 100 iterations
    - **Property 4: Summary accuracy — propertyPopulationSummary matches written fields**
    - **Validates: Requirements 5.1, 7.3**

  - [ ]* 8.6 Write property test — Property 6: LLM prompt contains all required context
    - // Feature: ai-build-node-property-population, Property 6: LLM prompt contains all required context
    - For any user intent string and structural prompt, intercept the LLM call and assert the prompt contains both strings and the field metadata (names, types, descriptions) for all `buildtime_ai_once` fields
    - Minimum 100 iterations
    - **Property 6: LLM prompt contains all required context**
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 9. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Property tests use **fast-check** with a minimum of 100 iterations each
- The stage MUST NOT call `unifiedGraphOrchestrator.initializeWorkflow()`, `injectNode()`, `removeNode()`, or any other orchestrator mutation — graph structure is frozen after Stage 5
- The stage MUST NOT mutate `workflow.edges` directly
- All field metadata is read exclusively from `UnifiedNodeRegistry` — no hardcoded per-node-type logic
