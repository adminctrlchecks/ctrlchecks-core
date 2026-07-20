# Implementation Plan: Intelligent Workflow Generation Pipeline

## Overview

Implement the four-stage workflow generation pipeline by: (1) laying down TypeScript contracts, (2) building the new backend classes, (3) wiring them into existing backend files, and (4) updating the frontend components. Property-based tests are added last, close to the code they validate.

## Pre-Implementation Audit Notes

The existing `AiFirstPipeline` in `worker/src/services/ai/ai-first-pipeline.ts` already runs **7 internal stages**:
1. Intent → 2. Capability Selection → 3. Structural Prompt → 4. Node Selection → 5. Edge Reasoning (Gemini `gemini-2.5-flash`) → 6. Validation (Gemini `gemini-2.5-flash` + orchestrator safety net) → 7. Property Population (Gemini `property-population`) → 8. Credential Discovery → 9. Field Ownership

The new `WorkflowGenerationPipeline` wraps and replaces `AiFirstPipeline` — it must preserve all 7 internal stages. The `BackendFinalizer` (Task 3) maps to stages 5–9 of the existing pipeline. Tasks must not accidentally drop edge reasoning, validation, or property population.

## Tasks

- [x] 1. Create `pipeline-contracts.ts` — TypeScript interfaces for all stage contracts
  - Create `worker/src/core/types/pipeline-contracts.ts`
  - Define `StageTrace` interface: `{ stage, startedAt, completedAt, durationMs, inputSummary, outputSummary, llmCall?, error? }`
  - Define `Stage1Output`: `{ structuredIntent, selectedNodes, capabilityOptions, appliedCapabilitySelectionsByStep, stageTrace }`
  - Define `Stage2Output`: `{ structuralPrompt: StructuralPrompt, selectedNodes, structuredIntent, stageTrace }`
  - Define `Stage3Output`: `{ workflow, buildManifest: WorkflowBuildManifestV1, fieldOwnershipMap, validationIssues, stageTrace }`
  - Define `StructuralStep`: `{ stepNumber, nodeType, displayName, description }`
  - Define `StructuralCondition`: `{ branchNodeType, trueOutcome, falseOutcome }`
  - Define `StructuralPrompt`: `{ text, steps: StructuralStep[], conditions: StructuralCondition[], triggerDescription, terminalAction }`
  - Define `StructuralPromptInput`: `{ resolvedNodes: SelectedNode[], structuredIntent, capabilitySelections }`
  - Define `FieldOwnershipState`: `{ mode: 'user' | 'ai_built' | 'ai_runtime', value, aiBuiltValue }`
  - Define `FieldOwnershipMap`: `Record<nodeId, Record<fieldName, { mode, fillMode, ownership }>>`
  - Define `WorkflowBuildManifestV1`: all fields from design (`version`, `correlationId`, `createdAt`, `userPrompt`, `intent`, `structuralBlueprint`, `authorizedNodes`, `branchingSpec`, `graphSpec`, `fieldOwnershipSnapshot`, `integrity`)
  - Define `PipelineErrorResponse`: `{ ok: false, error, message, violations?, stageTrace, correlationId }`
  - Define `WorkflowSavePayload`: `{ workflow, fieldOwnershipOverrides }`
  - Export all interfaces from this file; no implementation logic here
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 1.5 Add confidence threshold to `capability-selection-stage.ts`
  - In `worker/src/services/ai/stages/capability-selection-stage.ts`, add confidence threshold logic to `buildActionStep()`:
    - After `rankCandidates()` returns scores, compute the score gap between rank-1 and rank-2 candidates
    - If `rank1.score - rank2.score >= 3` (confident): set `candidateNodeTypes = [rank1.nodeType]` — single candidate, no UI shown
    - If `rank1.score - rank2.score < 3` (ambiguous): keep all candidates with score > 0 — UI will be shown
    - If only one candidate exists: always confident, no UI
  - In `WorkflowGenerationPipeline`, the Node_Selection_UI is shown only when any step has `candidateNodeTypes.length > 1`; steps with a single candidate are auto-resolved silently
  - This ensures the Node_Selection_UI fires only when AI genuinely cannot decide — not on every prompt
  - _Requirements: 2.2, 2.3, 2.7_

- [x] 2. Create `structural-prompt-generator.ts` — Stage 2 generator class
  - Create `worker/src/services/ai/stages/structural-prompt-generator.ts`
  - Import `unifiedNodeRegistry` from `../../core/registry/unified-node-registry` — use `registry.get(nodeType).label` for every `displayName`; never use raw type strings
  - Implement `StructuralPromptGenerator` class with a single public `generate(input: StructuralPromptInput): StructuralPrompt` method
  - **This class is purely registry-driven — no Gemini call here.** The `text` field is composed deterministically from registry labels and `structuredIntent` data flows; Gemini already produced the intent in Stage 1 and will produce AI-built field values in Stage 3 Step 5
  - Build `steps[]` in execution order: one `StructuralStep` per non-duplicate node; `displayName` must equal `unifiedNodeRegistry.get(nodeType).label`
  - Build `conditions[]` for every branching node (`isBranching === true` in registry): one `StructuralCondition` per branch node with `trueOutcome` / `falseOutcome` derived from `structuredIntent.dataFlows`
  - Set `triggerDescription` from the trigger node's registry label and intent trigger type
  - Set `terminalAction` from the last node in execution order
  - Compose `text` as numbered plain-English steps; branching steps use sub-labels "3a." / "3b." format; no generic headings ("Review your workflow", "Automation overview")
  - Each integration appears at most once per logical step; for duplicate node types in branching paths, prefix with branch label ("Branch A: Gmail sends X", "Branch B: Gmail sends Y")
  - Enforce `text.length <= 4000`: if exceeded, truncate at last sentence boundary before 4000 and append `…`
  - Word count target: 50–400 words for 2–10 node workflows
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.9, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 2.1 Write property test for P6 — structural prompt contains all display names
    - **Property 6: Structural prompt contains all resolved node display names**
    - Generate random `SelectedNode[]` lists (2–10 nodes, valid registry types); assert every `steps[i].displayName === unifiedNodeRegistry.get(nodeType).label`
    - **Validates: Requirements 3.1, 8.3**

  - [ ]* 2.2 Write property test for P7 — no repeated display names and length bound
    - **Property 7: Structural prompt has no repeated display names per logical step and respects length bound**
    - Generate random linear node lists (2–10 nodes); assert no duplicate `displayName` in `steps[]`; assert `text.length <= 4000` for all inputs
    - **Validates: Requirements 3.3, 3.9, 8.2**

- [x] 3. Create `backend-finalizer.ts` — Stage 3 finalization class
  - Create `worker/src/services/ai/pipeline/backend-finalizer.ts`
  - Implement `BackendFinalizer` class with a single public `finalize(input: { selectedNodes, structuralPrompt, userIntent, correlationId, userId }): Promise<Stage3Output | PipelineErrorResponse>` method
  - This class wraps the existing pipeline stages 5–9 from `AiFirstPipeline` — do NOT drop any of them:
  - Step 1 — Build `WorkflowNode[]` from `SelectedNode[]` using `unifiedNodeRegistry.get(nodeType).defaultConfig()` for each node
  - Step 2 — Call `unifiedGraphOrchestrator.initializeWorkflow(nodes)` as the sole entry point for graph creation; never call `workflow.edges.push()` or `workflow.edges = [...]`
  - Step 3 — **Edge Reasoning via Gemini** (preserve existing `runEdgeReasoningStage`): for branching workflows call `runEdgeReasoningStage(selectedNodes, nodeCatalog, userIntent, correlationId, structuralPrompt)`; for linear workflows use `buildWorkflowFromPlanChain(linearPlanChainFromSelection(selectedNodes))`; this stage uses `gemini-2.5-flash` and includes DFS cycle detection + one re-prompt on cycle
  - Step 4 — **Validation via Gemini** (preserve existing `runValidationStage`): call `runValidationStage(workflow, nodeCatalog, userIntent, selectedNodes, proposedEdges, correlationId, structuralPrompt)`; this calls Gemini for semantic validation + `unifiedGraphOrchestrator.validateWorkflow()` as structural safety net; one repair pass on error-severity issues
  - Step 5 — **Property Population via Gemini** (preserve existing `runPropertyPopulationStage`): call `runPropertyPopulationStage({ workflow, userIntent, structuralPrompt, correlationId })`; this fills `buildtime_ai_once` fields using `gemini-2.5-flash` with `property-population` request type
  - Step 6 — Deduplication: call `getNodeCapabilityDedupeKey(nodeType)` per node; for linear paths, remove second occurrence of any duplicate key via `unifiedGraphOrchestrator.removeNode()`
  - Step 7 — Call `unifiedGraphOrchestrator.reconcileWorkflow(workflow)` after deduplication to fix stale edges
  - Step 8 — Classify field ownership: call `classifyFieldOwnership(fieldName, field)` from `field-ownership.ts` for every field of every node; write result into `node.data.config._fillMode`; run `runFieldOwnershipStage(workflow, correlationId)` to build `fieldOwnershipMap`
  - Step 9 — **Credential Discovery** (preserve existing `runCredentialDiscoveryStage`): call `runCredentialDiscoveryStage(workflow, userId, correlationId)`; non-blocking — continue with empty arrays on failure
  - Step 10 — Call `unifiedGraphOrchestrator.validateWorkflow(workflow)` final structural check; if `valid: false` after one `reconcileWorkflow` auto-repair, return `{ ok: false, error: 'ORCHESTRATOR_VALIDATION_FAILED', violations, stageTrace }`; never return a broken workflow
  - Step 11 — Call `attachBuildManifest` / `sealWorkflowBuildManifest(manifestDraft)` using existing `workflow-build-manifest-utils.ts` helpers; compute `integrity.contentHash` via `sealWorkflowBuildManifest`; freeze `fieldOwnershipSnapshot` (use `Object.freeze`)
  - Step 12 — Call `attachCanonicalPipelineMetadata(workflow, { userPrompt, structuralPrompt, correlationId, buildManifest })` to attach metadata
  - Return `Stage3Output` with `workflow`, `buildManifest`, `fieldOwnershipMap`, `validationIssues`, `stageTrace`
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 7.1, 7.2, 7.4, 7.5_

  - [ ]* 3.1 Write property test for P9 — every finalized workflow passes structural validation
    - **Property 9: Every finalized workflow produced by BackendFinalizer passes structural validation**
    - Generate random valid node type lists (1–8 nodes from registry); run `BackendFinalizer.finalize()`; assert `unifiedGraphOrchestrator.validateWorkflow(result.workflow).valid === true` for every successful result
    - **Validates: Requirements 4.4, 7.1**

  - [ ]* 3.2 Write property test for P10 — no duplicate capability nodes in linear path
    - **Property 10: Linear workflow paths contain no duplicate capability nodes**
    - Generate random linear node type lists; run `BackendFinalizer.finalize()`; apply `getNodeCapabilityDedupeKey()` to all nodes in result; assert all keys are unique
    - **Validates: Requirements 4.6**

  - [ ]* 3.3 Write property test for P11 — field ownership complete and frozen after Stage 3
    - **Property 11: Field ownership is complete and frozen after Stage 3**
    - Generate random finalized workflows; assert every field in every node's `inputSchema` has a corresponding entry in `fieldOwnershipMap[nodeId][fieldName]`; call `reconcileWorkflow` and `validateWorkflow` post-delivery; assert `buildManifest.fieldOwnershipSnapshot` is unchanged
    - **Validates: Requirements 4.9, 5.11, 5.12**

  - [ ]* 3.4 Write property test for P12 — build manifest complete on every successful finalization
    - **Property 12: Build manifest is present and complete on every successful finalization**
    - Generate random successful `BackendFinalizer` runs; assert `workflow.metadata.buildManifest` is defined and contains `correlationId`, `structuralBlueprint`, `authorizedNodes` (non-empty array), `fieldOwnershipSnapshot`, and `integrity.contentHash`
    - **Validates: Requirements 4.10**

- [x] 4. Create `workflow-generation-pipeline.ts` — four-stage pipeline orchestrator
  - Create `worker/src/services/ai/pipeline/workflow-generation-pipeline.ts`
  - Implement `WorkflowGenerationPipeline` class with a single public `run(input: { userPrompt, userId, correlationId, capabilitySelectionsByStep?, mandatoryNodeTypes?, existingWorkflow?, onStageComplete? }): Promise<Stage3Output | PipelineErrorResponse>` method
  - This class replaces `AiFirstPipeline` — it must accept the same `AiPipelineInput` shape for backward compatibility during transition
  - Stage 1 (Node Selection): call `runIntentStage()` → `runCapabilitySelectionStage()` → check confidence threshold (Task 1.5) → if `capabilityOptions` has ambiguous steps and no `capabilitySelectionsByStep` provided, return early with `{ ok: true, capabilityOptions, stageTrace }` for UI to show Node_Selection_UI → `runNodeSelectionStage()` → `runStructuralPromptStage()`; record `StageTrace` entry for each sub-stage
  - Stage 2 (Structural Prompt): call `new StructuralPromptGenerator().generate(stage1Output)` to produce typed `StructuralPrompt`; store `StructuralPrompt.text` in `workflow.metadata.structuralBlueprintSummary`; record `StageTrace` entry; if `runStructuralPromptStage` LLM fails, use `intent.intent` string as degraded structural prompt
  - Stage 3 (Backend Finalization): call `new BackendFinalizer().finalize({ selectedNodes, structuralPrompt: structuralPromptText, userIntent: intent.intent, correlationId, userId })`; record `StageTrace` entry; this internally runs edge reasoning, validation, property population, credential discovery, field ownership, deduplication, manifest sealing
  - Stage 4 (UI delivery): return `Stage3Output` — the UI receives a structurally valid, fully annotated workflow
  - Halt-on-failure: if any stage returns `ok: false`, immediately return `PipelineErrorResponse` with the failing stage's error code and `stageTrace` containing only entries up to and including the failing stage
  - Populate `stageTrace` on every response (success and failure); each entry must include `stage`, `startedAt`, `completedAt`, `durationMs`, `inputSummary`, `outputSummary`
  - LLM fallback: if node selection stage fails after deterministic recovery, fall back to `manual_trigger → ai_chat_model → log_output` via `unifiedGraphOrchestrator.initializeWorkflow()`
  - Preserve `mandatoryNodeTypes` and `existingWorkflow` config merge behavior from `AiFirstPipeline` (existing workflow config merge in Stage 3)
  - No dual code paths, feature flags, or A/B variants — exactly one pipeline
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.4, 6.5, 7.3_

  - [ ]* 4.1 Write property test for P1 — pipeline always produces stageTrace
    - **Property 1: Pipeline always produces stageTrace**
    - Generate random non-empty prompt strings (1–500 chars); run `WorkflowGenerationPipeline.run()`; assert `response.stageTrace` is an array with `length >= 1` for both success and failure responses
    - **Validates: Requirements 1.4**

  - [ ]* 4.2 Write property test for P2 — stage failure halts pipeline at the failing stage
    - **Property 2: Stage failure halts pipeline at the failing stage**
    - For each stage index (1–3), inject a failure condition; assert `response.ok === false`, correct error code, and `stageTrace.length === failingStageIndex` (no entries for subsequent stages)
    - **Validates: Requirements 1.3**

- [x] 5. Checkpoint — verify new backend files compile and unit tests pass
  - Ensure all new files (`pipeline-contracts.ts`, `structural-prompt-generator.ts`, `backend-finalizer.ts`, `workflow-generation-pipeline.ts`) compile without TypeScript errors
  - Run existing test suite to confirm no regressions
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Modify `summarize-layer.ts` — replace `buildStructuralBlueprint()` with `StructuralPromptGenerator`
  - In `worker/src/services/ai/summarize-layer.ts`, locate `buildStructuralBlueprint()` and the `overviewText` concatenation pattern (`nodeNarratives.map(n => n.text).join(' ')`)
  - Import `StructuralPromptGenerator` from `./stages/structural-prompt-generator`
  - Replace the per-node `"${label} runs the ${friendlyType} action."` template loop with a call to `new StructuralPromptGenerator().generate(input)`
  - Map the existing `WorkflowIntentPlan.proposedNodeChain` to `StructuralPromptInput.resolvedNodes` before calling the generator
  - Store the returned `StructuralPrompt.text` in `WorkflowIntentPlan.structuredSummary`
  - Remove the old `buildStructuralBlueprint()` function and any helper that produces the repetitive per-node narrative
  - Preserve all other `summarize-layer.ts` behavior (keyword collection, variant generation, `processPrompt()` entry point) unchanged
  - _Requirements: 3.1, 3.2, 3.3, 8.1, 8.2_

- [x] 7. Modify `generate-workflow.ts` — wire `WorkflowGenerationPipeline` as the single default, remove `AiFirstPipeline`
  - In `worker/src/api/generate-workflow.ts`, replace all imports and usages of `AiFirstPipeline` with `WorkflowGenerationPipeline` from `../services/ai/pipeline/workflow-generation-pipeline`
  - Replace the `mode: 'analyze'` block's direct calls to `runIntentStage`, `runCapabilitySelectionStage`, `runStructuralPromptStage`, `runNodeSelectionStage` with a single `new WorkflowGenerationPipeline().run(...)` call
  - Replace the `mode: 'refine'` / default block's `new AiFirstPipeline().run(...)` call with `new WorkflowGenerationPipeline().run(...)`
  - `WorkflowGenerationPipeline` is now the **only** pipeline — no conditional, no flag, no fallback to `AiFirstPipeline`
  - Preserve the streaming NDJSON path: pass `onStageComplete` callback to `WorkflowGenerationPipeline.run()` and emit stage events as before
  - Preserve the non-streaming path: return the `Stage3Output` fields (`workflow`, `stageTrace`, `fieldOwnershipMap`, `capabilityOptions`, etc.) in the same JSON shape the frontend already consumes
  - Remove all direct imports of `runIntentStage`, `runCapabilitySelectionStage`, `runStructuralPromptStage`, `runNodeSelectionStage` from this file — they are now internal to the pipeline
  - Remove `AiFirstPipeline` import entirely from this file
  - _Requirements: 1.1, 1.5, 6.5_

- [x] 8. Modify `workflow-lifecycle-manager.ts` — replace `AiFirstPipeline` with `WorkflowGenerationPipeline`, remove deterministic fallback
  - In `worker/src/services/workflow-lifecycle-manager.ts`, find all dynamic `import('./ai/ai-first-pipeline')` calls (currently at lines ~376 and ~523) and replace with `import('./ai/pipeline/workflow-generation-pipeline')`
  - Replace `new AiFirstPipeline().run(...)` with `new WorkflowGenerationPipeline().run(...)` at both call sites
  - Remove the **deterministic fallback path** inside `generateWorkflowWithNewPipeline()` (lines ~480–483: `// FALLBACK: existing deterministic pipeline architecture`); `WorkflowGenerationPipeline` already handles its own internal fallback via `buildDeterministicNodeSelection()` — no outer fallback needed
  - Replace all direct `workflow.nodes` or `workflow.edges` mutations (e.g. `workflow.nodes.push(...)`, `workflow.edges.push(...)`, `workflow = { ...workflow, nodes: [...workflow.nodes, newNode] }`) with `unifiedGraphOrchestrator.injectNode(workflow, newNode, context)`
  - Replace each direct edge mutation with the appropriate orchestrator call (`removeEdges`, `reconcileWorkflow`)
  - After every `injectNode` call, add `unifiedGraphOrchestrator.validateWorkflow(result.workflow, result.executionOrder)` and fail fast if `!validation.valid`
  - `WorkflowGenerationPipeline` is now the **only** pipeline called from this file — no dual paths, no flags, no legacy fallback
  - Preserve all existing method signatures and return types — this is a structural refactor, not a behavioral change
  - _Requirements: 4.2, 6.3, 6.5_

- [-] 9. Checkpoint — verify backend modifications compile and integration tests pass
  - Confirm `generate-workflow.ts` and `workflow-lifecycle-manager.ts` compile without errors
  - Run a smoke test: submit a simple 3-node prompt through the pipeline and verify `stageTrace` contains entries for all stages
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9.5 Delete `AiFirstPipeline` and update all tests that reference it
  - Delete `worker/src/services/ai/ai-first-pipeline.ts` — `WorkflowGenerationPipeline` is now the single source of truth; `AiFirstPipeline` must not exist as a fallback or alternative
  - In `worker/src/services/ai/__tests__/single-pipeline-entry-point.property.test.ts`: replace all `AiFirstPipeline` mock references with `WorkflowGenerationPipeline`; update the assertion from `expect(source).toContain('AiFirstPipeline')` to `expect(source).toContain('WorkflowGenerationPipeline')`
  - In `worker/src/services/ai/__tests__/ai-first-pipeline-integration.test.ts`: rename file to `workflow-generation-pipeline-integration.test.ts`; replace `AiFirstPipeline` import with `WorkflowGenerationPipeline`; update all `new AiFirstPipeline()` calls to `new WorkflowGenerationPipeline()`
  - In `worker/src/services/ai/__tests__/ai-first-pipeline-no-hardcoded-components.test.ts`: rename file to `workflow-generation-pipeline-no-hardcoded-components.test.ts`; replace `ai-first-pipeline.ts` file reference with `workflow-generation-pipeline.ts`; update all assertions accordingly
  - In `worker/src/services/ai/__tests__/ai-first-pipeline-keyword-bypass.test.ts`: rename file to `workflow-generation-pipeline-keyword-bypass.test.ts`; replace `AiFirstPipeline` import with `WorkflowGenerationPipeline`
  - In `worker/src/services/__tests__/ai-credential-field-value-persistence-integration.test.ts`: update the test description and any `AiFirstPipeline` references to `WorkflowGenerationPipeline`
  - After deletion, run `grep -r "AiFirstPipeline" worker/src` — the result must be empty; if any reference remains, remove it
  - _Requirements: 6.5_

- [x] 10. Modify `WorkflowConfirmationStep.tsx` — render new `StructuralPrompt` shape
  - In `ctrl_checks/src/components/workflow/WorkflowConfirmationStep.tsx`, add a new `StructuralPrompt` interface matching `pipeline-contracts.ts` (or import from a shared types package if available)
  - Add `structuralPrompt?: StructuralPrompt` to `WorkflowConfirmationStepProps`; keep `workflowExplanation?: WorkflowExplanation` for backward compatibility during transition
  - When `structuralPrompt` is provided, render using the new shape:
    - Use `structuralPrompt.triggerDescription` as the section title (replacing the "Review your workflow" heading)
    - Render `structuralPrompt.steps[]` as a numbered list; each item shows `step.stepNumber` and `step.displayName` (never `step.nodeType`)
    - Render `structuralPrompt.conditions[]` as indented sub-items under the branching step, showing `trueOutcome` and `falseOutcome` on separate lines
    - Render `structuralPrompt.terminalAction` as the final step
  - When `structuralPrompt` is absent, fall back to the existing `workflowExplanation` rendering path unchanged
  - Remove the "Review Your Workflow" `CardTitle` text when `structuralPrompt` is present; use `triggerDescription` instead
  - _Requirements: 3.6, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 11. Modify `FieldOwnershipGuidePanel.tsx` — enforce user-only ownership, read-only snapshot
  - In `ctrl_checks/src/components/workflow/FieldOwnershipGuidePanel.tsx`, add two new props to the component:
    - `buildManifestSnapshot?: ManifestFieldOwnershipSnapshot` — read-only reference; the component must never mutate this object
    - `onOwnershipChange?: (nodeId: string, fieldName: string, mode: 'user' | 'ai_built' | 'ai_runtime') => void` — the exclusive path for ownership state changes
  - Add `ManifestFieldOwnershipSnapshot` type: `Record<string, Record<string, string>>` (nodeId → fieldName → fillMode)
  - Ensure no internal state or effect in this component modifies `buildManifestSnapshot` — it is passed as a reference only
  - When `onOwnershipChange` is provided, wire any ownership-related quick actions (e.g. "Choose AI runtime", "Choose You") to call `onOwnershipChange` instead of making direct state mutations
  - All existing chat/guide functionality (bootstrap message, quick actions, manual input) remains unchanged
  - _Requirements: 5.11, 5.12, 5.13_

- [x] 12. Modify `workflowStore.ts` — add `fieldOwnershipOverrides` to save payload
  - In `ctrl_checks/src/stores/workflowStore.ts`, add `fieldOwnershipOverrides: Record<string, Record<string, string>>` to `WorkflowState` (nodeId → fieldName → mode string)
  - Initialize `fieldOwnershipOverrides` as `{}` in the initial state
  - Add `setFieldOwnershipOverride(nodeId: string, fieldName: string, mode: string) => void` action: upsert into `fieldOwnershipOverrides[nodeId][fieldName]`
  - Add `resetFieldOwnershipOverrides() => void` action: reset to `{}`
  - Include `fieldOwnershipOverrides` in `resetWorkflow()` (reset to `{}`)
  - Update the save payload shape: wherever the workflow is serialized for saving (search for `workflowId`, `workflowName`, `isDirty` save patterns), include `fieldOwnershipOverrides` in the payload
  - On workflow load, restore `fieldOwnershipOverrides` from the loaded data if present; fall back to `{}` if absent
  - _Requirements: 5.9, 5.11_

- [x] 13. Checkpoint — verify frontend modifications compile and render correctly
  - Confirm `WorkflowConfirmationStep.tsx`, `FieldOwnershipGuidePanel.tsx`, and `workflowStore.ts` compile without TypeScript errors
  - Verify `WorkflowConfirmationStep` renders correctly with both `structuralPrompt` (new shape) and `workflowExplanation` (legacy shape) props
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Write property-based tests for alias resolution and pipeline contracts
  - Create a test file (e.g. `worker/src/__tests__/pipeline-properties.test.ts`) using `fast-check`

  - [ ]* 14.1 Write property test for P3 — alias resolution is registry-exclusive
    - **Property 3: Alias resolution is registry-exclusive and total**
    - Generate random alias strings from `UnifiedNodeRegistry.ALIAS_MAP` keys; assert `unifiedNodeRegistry.resolveAlias(alias)` returns a canonical type and `unifiedNodeRegistry.get(canonicalType)` returns a defined node definition; assert no alias resolution occurs outside the registry
    - **Validates: Requirements 2.1, 2.8, 6.2**

  - [ ]* 14.2 Write property test for P4 — ambiguous actions produce capability options
    - **Property 4: Ambiguous actions produce non-empty capability options**
    - Generate random action texts that score within 3 points of the top-ranked candidate for at least two registry node types; assert the resulting `CapabilityOptionStep` has `candidateNodeTypes.length > 1` and a non-null `defaultSuggestedNodeType`
    - **Validates: Requirements 2.3**

  - [ ]* 14.3 Write property test for P5 — user selections preserved as mandatory constraints
    - **Property 5: User capability selections are preserved as mandatory constraints**
    - Generate random `capabilitySelectionsByStep` maps with valid registry node types; run through `resolveAnalyzeCapabilitySelections()`; assert every user-selected type appears in `selectedNodeConstraintsFlat` and in the final `selectedNodes` array
    - **Validates: Requirements 2.6**

  - [ ]* 14.4 Write property test for P8 — structural prompt unchanged through Stage 3
    - **Property 8: Structural prompt is stored unchanged through Stage 3**
    - Generate random confirmed structural prompt strings; run `BackendFinalizer.finalize()`; assert `workflow.metadata.structuralBlueprintSummary === buildManifest.structuralBlueprint` (exact string equality)
    - **Validates: Requirements 3.8, 4.11**

- [x] 15. Final checkpoint — full pipeline end-to-end verification
  - Run the complete test suite including all property-based tests
  - Verify a full pipeline run (simple prompt → `stageTrace` with all stage names, valid workflow, complete `buildManifest`)
  - Verify a pipeline run with an ambiguous prompt returns `capabilityOptions` before Stage 2
  - Verify a pipeline run with injected LLM failure returns the fallback `manual_trigger → ai_chat_model → log_output` workflow
  - Run `grep -r "AiFirstPipeline" worker/src` — must return zero results
  - Run `grep -r "useNewPipeline\|legacyPipeline\|fallback.*pipeline" worker/src` — must return zero results
  - Confirm `WorkflowGenerationPipeline` is the only pipeline class in the codebase — single source, end-to-end
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- All edge operations must go through `unifiedGraphOrchestrator` — never mutate `workflow.edges` directly
- All node type resolution must go through `unifiedNodeRegistry.resolveAlias()` — no external alias maps
- `fieldOwnershipSnapshot` in `buildManifest` is frozen after Stage 3 and must never be modified by any post-delivery call
- Property tests use `fast-check` with a minimum of 100 iterations per property
- Each property test is tagged: `Feature: intelligent-workflow-generation-pipeline, Property {N}: {property_text}`
