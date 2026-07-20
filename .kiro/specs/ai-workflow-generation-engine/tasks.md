# Implementation Plan: AI Workflow Generation Engine

## Overview

Implement the six architectural gaps identified in the design: consolidate the single-plan pipeline path, redesign `IntelligentConfigFiller` to be fillMode-gated, extend `WorkflowIntentPlan` with `caseNodeMapping`, wire switch case edges through the orchestrator, enforce the credential gate via `_fieldModes`, and add targeted follow-up merge to `PipelineContext`.

## Tasks

- [x] 1. Extend `WorkflowIntentPlan` with `caseNodeMapping` in unified-node-contract.ts
  - Add `CaseNodeMapping` interface (`{ [caseValue: string]: string }`) to `unified-node-contract.ts`
  - Add optional `caseNodeMapping?: CaseNodeMapping` field to `WorkflowIntentPlan`
  - Add optional `mergedFollowUps?: string[]` and `lastKnownPlan?: WorkflowIntentPlan` fields to `PipelineContext`
  - _Requirements: 5.4, 5.5, 2.1, 15.3_

  - [x] 1.1 Write property test for WorkflowIntentPlan shape
    - **Property 2: proposedNodeChain contains only canonical registry keys**
    - **Validates: Requirements 1.4, 1.5**

- [x] 2. Redesign `IntelligentConfigFiller` to be fillMode-gated
  - Replace the current field-iteration loop in `analyzeAndFillConfig` with a strict fillMode gate: skip `manual_static` and `ownership === 'credential'` fields unconditionally; only fill `buildtime_ai_once` fields
  - After filling, write `_fieldModes` metadata into `filled` by iterating `inputSchema` and recording `field.fillMode?.default ?? 'manual_static'` for every field
  - Keep topological processing order (`getTopologicalOrder`) unchanged
  - _Requirements: 4.1, 4.3, 4.6, 9.7_

  - [x] 2.1 Write property test for Config_Filler fillMode gate
    - **Property 10: Config_Filler only fills buildtime_ai_once fields and skips manual_static and credential fields**
    - **Validates: Requirements 4.1, 4.3**

  - [x] 2.2 Write property test for _fieldModes population
    - **Property 12: Pre-filled fields are marked with _fieldModes**
    - **Validates: Requirements 4.6, 9.7**

  - [x] 2.3 Write property test for pre-filled value validation
    - **Property 11: Pre-filled values pass field type validation**
    - **Validates: Requirements 4.4**

- [x] 3. Populate `caseNodeMapping` in `summarize-layer.ts`
  - In `clarifyIntentAndGenerateSinglePlan`, after building `proposedNodeChain`, detect if a `switch` node is present
  - If present, call `planSwitchCasesFromPrompt` to get `SwitchCasePlanResult.cases`
  - Map each case value to the downstream node in `proposedNodeChain` that follows the switch node (case_1 → next node, case_2 → node after that, etc.)
  - Record any gap (fewer downstream nodes than cases) in `PipelineContext.missing_fields`
  - Attach the resulting map as `WorkflowIntentPlan.caseNodeMapping`
  - Ensure `clarifyIntentAndGenerateSinglePlan` is the primary path; `clarifyIntentAndGenerateVariations` must not be called from `workflow-lifecycle-manager.ts` or `workflow-pipeline-orchestrator.ts`
  - _Requirements: 1.2, 1.4, 5.1, 5.2, 5.3_

  - [x] 3.1 Write property test for Switch_Planner minimum case count
    - **Property 13: Switch_Planner produces at least two cases**
    - **Validates: Requirements 5.1, 5.2**

  - [x] 3.2 Write property test for switch discriminant field
    - **Property 14: Switch discriminant field exists in upstream outputSchema**
    - **Validates: Requirements 5.3**

  - [x] 3.3 Write property test for structuredSummary boilerplate exclusion
    - **Property 3: structuredSummary contains no registry boilerplate**
    - **Validates: Requirements 1.3, 1.7**

  - [x] 3.4 Write property test for StructuredIntent always produced
    - **Property 1: StructuredIntent always produced from prompt**
    - **Validates: Requirements 1.1**

- [x] 4. Extend `Graph_Orchestrator.initializeWorkflow` to accept `switchContext` for case edge wiring
  - Add optional `switchContext?: { switchNodeId: string; caseNodeMapping: CaseNodeMapping }` parameter to `initializeWorkflow` signature in `unified-graph-orchestrator.ts`
  - When `switchContext` is provided, read `outgoingPorts` from the switch node's registry definition and create one labeled edge per case (`case_1`, `case_2`, … `case_n`) connecting the switch node to the correct downstream node from `caseNodeMapping`
  - All edge creation must go through `edgeReconciliationEngine` — no direct `workflow.edges.push`
  - After wiring, `validateWorkflow` must verify switch out-degree equals the number of declared cases
  - _Requirements: 5.4, 5.5, 5.6, 7.1, 7.5, 12.3_

  - [x] 4.1 Write property test for switch edge count matching case count
    - **Property 15: Switch edges match case count**
    - **Validates: Requirements 5.4, 5.5**

  - [x] 4.2 Write property test for edge port names matching registry outgoingPorts
    - **Property 31: Edge port names match registry outgoingPorts**
    - **Validates: Requirements 12.3**

  - [x] 4.3 Write property test for alwaysTerminal out-degree 0
    - **Property 32: alwaysTerminal nodes have out-degree 0**
    - **Validates: Requirements 12.5**

- [x] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Enforce credential gate in `workflow-lifecycle-manager.ts` using `_fieldModes`
  - Implement `shouldRequireCredential(nodeType, fieldName, fieldModes)` helper: return `true` only when `fieldDef.ownership === 'credential'` AND `fieldModes[fieldName] === 'manual_static'`
  - Replace the existing credential discovery call with a loop over each node's `credentialSchema.requirements`, reading `node.data.config._fieldModes` to gate each entry
  - Call `unifiedGraphOrchestrator.validateWorkflow` after every material graph change (`initializeWorkflow`, `injectNode`, `removeNode`, `reconcileWorkflow`) and treat `valid: false` as a pipeline contract error that blocks save
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.4, 13.1, 13.2_

  - [x] 6.1 Write property test for credential gate registry-only reads
    - **Property 16: Credential gate reads only from registry**
    - **Validates: Requirements 6.1**

  - [x] 6.2 Write property test for no credential prompt when all fields are non-manual_static
    - **Property 17: No credential prompt when all credential fields are non-manual_static**
    - **Validates: Requirements 6.2, 6.6**

  - [x] 6.3 Write property test for manual_static toggle triggers credential prompt
    - **Property 18: Credential field toggled to manual_static triggers credential prompt**
    - **Validates: Requirements 6.3**

  - [x] 6.4 Write property test for credential values absent from Gemini prompts
    - **Property 19: Credential values never appear in Gemini prompts**
    - **Validates: Requirements 6.4**

  - [x] 6.5 Write property test for validateWorkflow called after every material change
    - **Property 20: validateWorkflow called after every material graph change**
    - **Validates: Requirements 7.4, 13.1, 13.2**

  - [x] 6.6 Write property test for validateWorkflow structural invariants
    - **Property 21: validateWorkflow enforces all structural invariants**
    - **Validates: Requirements 7.6, 13.3, 13.4**

- [x] 7. Add `mergeFollowUpIntoPipelineContext` to `workflow-pipeline-orchestrator.ts`
  - Add `mergedFollowUps?: string[]` and `lastKnownPlan?: WorkflowIntentPlan` to the `PipelineContext` interface
  - Implement `mergeFollowUpIntoPipelineContext(context: PipelineContext, followUpMessage: string): Promise<MergeFollowUpResult>` — merge only the fields the follow-up addresses into the prior `StructuredIntent`; re-run only the summarize step (not the full pipeline)
  - On follow-up, `Pipeline_Orchestrator` must call this function instead of re-running `executePipeline`
  - Return `MergeFollowUpResult { updatedContext, updatedPlan, changedFields }`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 7.1 Write property test for follow-up merge idempotency on unchanged fields
    - **Property 5: Follow-up merge is idempotent on unchanged fields**
    - **Validates: Requirements 2.1, 2.3**

  - [x] 7.2 Write property test for contradicting follow-up overrides prior answer
    - **Property 6: Contradicting follow-up overrides prior answer**
    - **Validates: Requirements 2.6**

- [x] 8. Add `PATCH /api/workflows/:id/nodes/:nodeId/field-mode` endpoint
  - Create the route handler that accepts `{ fieldName: string, mode: FieldFillMode }` in the request body
  - Load the workflow from the database, update `node.data.config._fieldModes[fieldName]` to the new mode
  - If the new mode is `manual_static` and `ownership === 'credential'`, re-evaluate the credential gate and update `requiredCredentials` accordingly
  - Persist the updated workflow and return the updated node config
  - _Requirements: 9.1, 9.3, 9.4, 9.5, 9.6, 9.7_

- [x] 9. Formalize `runtime_ai` resolution contract in `dynamic-node-executor.ts`
  - For each field where `effectiveFillModes[fieldName] === 'runtime_ai'`, pass upstream node JSON output (from `nodeOutputs`), the workflow's `structuredSummary` (from `(global as any).currentWorkflowIntent`), and the field's type constraints from `inputSchema` to the Gemini resolver
  - Validate the resolved value against the field's `validation` function before use; on failure return `NodeExecutionResult { success: false, error: { code, message } }`
  - Resolve all `{{$json.*}}` template expressions via `universalTemplateResolver` before the legacy executor receives config
  - Do not cache resolved values across runs unless upstream output and intent are byte-identical
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 9.1 Write property test for runtime_ai fields resolved from upstream JSON + structuredSummary
    - **Property 22: runtime_ai fields resolved from upstream JSON + structuredSummary**
    - **Validates: Requirements 8.1, 8.2**

  - [x] 9.2 Write property test for template expressions fully resolved before execution
    - **Property 23: Template expressions fully resolved before execution**
    - **Validates: Requirements 8.3**

  - [x] 9.3 Write property test for runtime_ai resolved values contain no registry boilerplate
    - **Property 24: runtime_ai resolved values contain no registry boilerplate**
    - **Validates: Requirements 8.5**

- [x] 10. Verify and harden `intent-extraction.ts` sanitizer coverage
  - Confirm `sanitizeIntentTextForFormFieldExtraction` strips all registry fill contract headers: `## Configuration contract`, `Semantics (universal):`, `Planner rules:`, `ownership=`, `buildtime_ai_once`, `manual_static`, `runtime_ai`
  - Confirm it strips execution-order slugs and node type labels in parentheses
  - Add any missing patterns without altering user-supplied content
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 10.1 Write property test for sanitizer removes contract text without altering user content
    - **Property 25: Sanitizer removes registry contract text without altering user content**
    - **Validates: Requirements 10.2, 10.4**

  - [x] 10.2 Write property test for sanitizer idempotency on clean input
    - **Property 26: Sanitizer is idempotent on clean input**
    - **Validates: Requirements 10.5**

- [x] 11. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Verify registry field fill mode completeness and determinism
  - Audit `unified-node-registry.ts`: every field in every `inputSchema` must have `fillMode.default` set; every `ownership === 'credential'` field must have `fillMode.default === 'manual_static'`
  - Fix any missing `fillMode.default` assignments found during audit
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_

  - [x] 12.1 Write property test for all registry fields have a declared fillMode.default
    - **Property 7: All registry fields have a declared fillMode.default**
    - **Validates: Requirements 3.1**

  - [x] 12.2 Write property test for credential fields are always manual_static
    - **Property 8: Credential fields are always manual_static**
    - **Validates: Requirements 3.2, 3.3**

  - [x] 12.2 Write property test for Fill_Contract output is deterministic
    - **Property 9: Fill_Contract output is deterministic**
    - **Validates: Requirements 3.4, 3.6**

- [x] 13. Write golden-path integration tests
  - Flow A: `manual_trigger → google_sheets → ai_chat_model → google_gmail → log_output`
    - Assert `proposedNodeChain` equals the five node types; `_fieldModes` populated for all nodes; no credential prompt (all credential fields non-manual_static by default); `validateWorkflow` passes with zero structural errors
  - Flow B: `trigger → if_else → (true) → slack → log_output / (false) → gmail → log_output`
    - Assert `if_else` node has exactly 2 outgoing edges labeled `true` and `false`; each branch terminates at a `log_output` node; `validateWorkflow` passes
  - Flow C: `chat_trigger → ai_chat_model → switch → [slack, gmail, log_output]`
    - Assert `caseNodeMapping` populated with 3 entries; switch node has exactly 3 outgoing edges; each case edge connects to the correct downstream node
  - _Requirements: 12.6, 13.1, 14.1, 14.4_

  - [x] 13.1 Write property test for unresolvable node types omitted and recorded
    - **Property 4: Unresolvable node types are omitted and recorded**
    - **Validates: Requirements 1.6**

  - [x] 13.2 Write property test for compiled graph equals proposedNodeChain plus alwaysRequired nodes
    - **Property 33: Compiled graph equals proposedNodeChain plus alwaysRequired nodes**
    - **Validates: Requirements 12.4, 14.1**

  - [x] 13.3 Write property test for node type normalizer canonical for all spelling variants
    - **Property 30: Node type normalizer is canonical for all spelling variants**
    - **Validates: Requirements 12.2**

- [x] 14. Write remaining property-based tests for pipeline observability
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 15.1_

  - [x] 14.1 Write property test for PipelineContext confidence score in [0, 1]
    - **Property 27: PipelineContext always contains confidence score in [0, 1]**
    - **Validates: Requirements 11.1**

  - [x] 14.2 Write property test for low confidence blocks graph compilation without confirmation
    - **Property 28: Low confidence blocks graph compilation without confirmation**
    - **Validates: Requirements 11.2**

  - [x] 14.3 Write property test for missing_fields triggers clarification questions
    - **Property 29: missing_fields triggers clarification questions**
    - **Validates: Requirements 11.3, 11.4**

  - [x] 14.4 Write property test for PipelineContext produced for every generation run
    - **Property 34: PipelineContext produced for every generation run**
    - **Validates: Requirements 15.1**

- [-] 15. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Implement `NodeDescriptionBlock` interface and `buildNodeDescriptionBlocks` function
  - Create `worker/src/services/ai/node-description-builder.ts`
  - Define `NodeDescriptionBlock` interface with fields: `nodeType`, `nodeIndex`, `prose`, `receivesFrom`, `passesTo`, `formFields?`, `conditionExpression?`, `conditionSourceField?`, `trueBranchTarget?`, `falseBranchTarget?`, `switchCases?`, `switchDiscriminant?`, `integrationOperation?`, `integrationDataSources?`
  - Implement `buildNodeDescriptionBlocks(intent: StructuredIntent, chain: string[], caseNodeMapping?: CaseNodeMapping): NodeDescriptionBlock[]`
  - For each node in chain: fetch `inputSchema` from `unifiedNodeRegistry` (no hardcoded field lists); derive node-type-specific detail from `StructuredIntent`
  - For `form` nodes: map `inputSchema` fields where `ownership !== 'credential'` to `formFields`
  - For `if_else` nodes: extract condition from `intent.conditions[0]`; resolve true/false targets from adjacent chain positions
  - For `switch` nodes: extract cases from `caseNodeMapping`; resolve discriminant from upstream `outputSchema`
  - For integration nodes: read `operation` from `intent.operations`; map data sources from upstream `outputSchema` keys
  - Compose `prose` as a single plain-English sentence per node — no JSON, no registry boilerplate
  - Add `nodeDescriptionBlocks?: NodeDescriptionBlock[]` to `WorkflowIntentPlan` interface
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8_

  - [x] 16.1 Write property test for per-node description blocks match chain length
    - **Property 35: structuredSummary contains per-node description for every chain node**
    - **Validates: Requirements 16.1**

  - [x] 16.2 Write property test for form node description lists all non-credential fields
    - **Property 36: form node description lists all non-credential inputSchema fields**
    - **Validates: Requirements 16.2, 16.8**

  - [x] 16.3 Write property test for if_else description completeness
    - **Property 37: if_else description states condition, source field, and both branch targets**
    - **Validates: Requirements 16.3**

- [x] 17. Integrate `buildNodeDescriptionBlocks` into `Summarize_Layer`
  - In `summarize-layer.ts`, after `proposedNodeChain` is finalized, call `buildNodeDescriptionBlocks(intent, chain, caseNodeMapping)`
  - Set `WorkflowIntentPlan.nodeDescriptionBlocks` to the result
  - Update `WorkflowIntentPlan.structuredSummary` to be the concatenation of all `NodeDescriptionBlock.prose` values separated by newlines
  - Ensure the summary contains no registry boilerplate (no `fillMode`, `ownership`, `buildtime_ai_once`, `manual_static`, `runtime_ai` strings)
  - _Requirements: 16.1, 16.7, 1.3, 1.7_

- [x] 18. Implement same-node-type branch handling in `proposedNodeChain` encoding
  - In `summarize-layer.ts`, when building `proposedNodeChain` for an `if_else` workflow where both branches use the same node type, emit annotated tokens using `formatPlanChainToken` with a `branchTag` (e.g., `gmail[true]`, `gmail[false]`)
  - Update `buildNodeDescriptionBlocks` to emit two separate `NodeDescriptionBlock` entries for same-type branch nodes, each with distinct `prose` describing the branch-specific purpose
  - _Requirements: 17.1, 17.3_

- [x] 19. Extend `Graph_Orchestrator.initializeWorkflow` for same-type branch multi-instance creation
  - In `unified-graph-orchestrator.ts`, detect annotated tokens (tokens with `[branchTag]` suffix) in the node list
  - For each annotated token, create a separate `WorkflowNode` instance with a distinct ID (e.g., `gmail_true_<uuid>` and `gmail_false_<uuid>`)
  - Store `branchTag` in `node.data.meta.branchTag` for downstream `Config_Filler` context
  - Wire the `if_else` `true` edge to the `[true]`-tagged instance and `false` edge to the `[false]`-tagged instance
  - Apply the same logic for `switch` nodes: each case connects to a separate node instance
  - All edge creation must go through `edgeReconciliationEngine` — no direct `workflow.edges.push`
  - _Requirements: 17.1, 17.4, 17.5, 17.6_

  - [x] 19.1 Write property test for same-type branch nodes produce distinct node IDs
    - **Property 38: Same-type branch nodes produce distinct node IDs**
    - **Validates: Requirements 17.1, 17.4**

- [x] 20. Extend `Config_Filler` for branch-aware pre-fill
  - In `intelligent-config-filler.ts`, when processing a node with `node.data.meta.branchTag`, append branch context to the Gemini prompt: `"This node is on the [true/false] branch of an if_else. The branch purpose is: [derived from StructuredIntent]."`
  - Derive branch purpose from `StructuredIntent` — the true-branch purpose comes from the first conditional outcome in `intent.conditions`; the false-branch purpose comes from the second
  - Ensure the two same-type branch nodes receive different `buildtime_ai_once` field values (different subject lines, body content, etc.)
  - _Requirements: 17.2_

  - [x] 20.1 Write property test for same-type branch nodes receive different Config_Filler outputs
    - **Property 39: Same-type branch nodes receive different Config_Filler outputs**
    - **Validates: Requirements 17.2**

- [x] 21. Implement `PipelineReasoningCoordinator` class
  - Create `worker/src/services/ai/pipeline-reasoning-coordinator.ts`
  - Define interfaces: `StageProposal<T>`, `ValidationResult<T>`, `PipelineFullContext`
  - `PipelineFullContext` contains: `originalPrompt`, `structuredIntent`, `workflowIntentPlan?`, `registryKnowledgeSummary`, `priorStageOutputs`
  - Implement `PipelineReasoningCoordinator` class with constructor taking `seniorModel: string` (`'gemini-2.5-pro'`), `juniorModel: string` (`'gemini-2.5-flash'`), `fullContext: PipelineFullContext`
  - Implement `executeStage<T>(stageName, juniorExecutor, seniorValidator): Promise<T>`:
    - Junior AI executes the stage via `juniorExecutor()`
    - Senior AI validates via `seniorValidator(proposal, context)` using `gemini-2.5-pro`
    - If rejected: incorporate `correctedValue` and re-submit once
    - If rejected twice: throw `PipelineContractError('SENIOR_REJECTION_LIMIT')`
    - Return the approved value
  - Build `registryKnowledgeSummary` as a compact digest of node types, categories, and tags from `unifiedNodeRegistry` — no hardcoded content
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8_

  - [x] 21.1 Write property test for Senior AI approval required before graph compilation
    - **Property 40: Senior AI approval required before graph compilation**
    - **Validates: Requirements 18.6**

  - [x] 21.2 Write property test for model assignment
    - **Property 41: Senior AI uses gemini-2.5-pro; Junior AI uses gemini-2.5-flash**
    - **Validates: Requirements 18.7**

  - [x] 21.3 Write property test for Senior AI rejection produces corrected value
    - **Property 42: Senior AI rejection produces corrected value, not empty**
    - **Validates: Requirements 18.4**

- [x] 22. Integrate `PipelineReasoningCoordinator` into `Summarize_Layer` node selection
  - In `summarize-layer.ts`, wrap the node selection call with `coordinator.executeStage('node-selection', juniorSelectNodes, seniorValidateNodeSelection)`
  - `juniorSelectNodes`: calls `selectNodesFromIntent` (Gemini-first path) and returns `StageProposal<string[]>` with the node types and a rationale string
  - `seniorValidateNodeSelection`: validates the proposal against the node selection checklist (all types exist in registry, minimum sufficient set, no unintended duplicates, valid DAG shape)
  - Populate `PipelineContext.nodeSelectionRationale` from the approved result
  - _Requirements: 18.3, 18.5, 18.6, 21.1, 21.5_

- [x] 23. Implement `checkNodeSufficiency` and `NodeSelectionRationale`
  - Create `worker/src/services/ai/node-sufficiency-checker.ts`
  - Define `NodeSelectionRationale` interface: `{ nodeType: string; instanceIndex: number; reason: string; intentSource: string }`
  - Implement `checkNodeSufficiency(proposedChain: string[], intent: StructuredIntent): { sufficient: boolean; nodesToRemove: string[]; rationale: NodeSelectionRationale[] }`
  - For each node: check if it maps to a goal, entity, trigger, or operation in `intent`; check `workflowBehavior.alwaysRequired` in registry
  - Special rule: `log_output` only kept if `intent.goals` contains observability/logging keywords OR `workflowBehavior.alwaysTerminal === true` in registry
  - Add `nodeSelectionRationale?: NodeSelectionRationale[]` to `PipelineContext` interface
  - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6_

  - [x] 23.1 Write property test for every node in final selection has a rationale entry
    - **Property 47: Every node in final selection has a rationale entry**
    - **Validates: Requirements 21.1, 21.5**

  - [x] 23.2 Write property test for log_output absent when no observability signal
    - **Property 48: log_output absent from selection when intent has no observability signal**
    - **Validates: Requirements 21.3**

  - [x] 23.3 Write property test for single linear intent produces minimum node count
    - **Property 49: Single linear intent produces minimum node count**
    - **Validates: Requirements 21.4**

- [x] 24. Implement `validateAndHealBeforeCredentials` self-healing gate
  - In `workflow-lifecycle-manager.ts`, implement `validateAndHealBeforeCredentials(workflow, plan)` method
  - Call `unifiedGraphOrchestrator.validateWorkflow(workflow)` first
  - If invalid: call `unifiedGraphOrchestrator.reconcileWorkflow(workflow)`; re-validate
  - If still invalid after repair: throw `PipelineContractError('SELF_HEAL_FAILED', errors)`
  - If healed: call `rebuildSummaryAfterHeal(plan, repaired.changes)` to update `structuredSummary`
  - Reorder the lifecycle pipeline so `validateAndHealBeforeCredentials` runs BEFORE credential evaluation
  - The credential step must only be reached when `validateWorkflow` returns `valid: true`
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_

  - [x] 24.1 Write property test for credential step unreachable from invalid graph
    - **Property 43: Credential step unreachable from invalid graph**
    - **Validates: Requirements 19.1, 19.3, 19.6**

  - [x] 24.2 Write property test for self-healing updates structuredSummary when graph changes
    - **Property 44: Self-healing updates structuredSummary when graph changes**
    - **Validates: Requirements 19.5**

- [x] 25. Phase 1 legacy removal — feature flag and registry-based logic-intent safeguard
  - Add feature flag `USE_GEMINI_FIRST_EXCLUSIVELY` to `worker/src/core/config.ts` (default: `false`)
  - When flag is `true`, skip `enhanced-keyword-matcher.ts` entirely in `summarize-layer.ts`
  - Replace the hardcoded `['form', 'javascript', 'if_else', 'function']` logic-intent safeguard array in `summarize-layer.ts` with a registry query:
    ```typescript
    const logicNodeTypes = unifiedNodeRegistry.getAllTypes().filter(type => {
      const def = unifiedNodeRegistry.get(type);
      return def?.tags?.includes('logic') || def?.category === 'conditional';
    });
    ```
  - Verify all golden-path tests pass with the flag set to `true`
  - _Requirements: 20.1, 20.4_

- [x] 26. Phase 2 legacy removal — remove hardcoded keyword maps
  - Set `USE_GEMINI_FIRST_EXCLUSIVELY` default to `true` in config
  - Delete the `keywordVariations` Map from `enhanced-keyword-matcher.ts`
  - Update `enhanced-keyword-matcher.ts` to read keywords exclusively from `Node_Registry.aiSelectionCriteria.keywords`, `tags`, and `aliases` — no hardcoded strings
  - Run all golden-path tests (Flows A–F); assert zero regressions
  - Remove the `USE_GEMINI_FIRST_EXCLUSIVELY` feature flag entirely
  - _Requirements: 20.1, 20.2, 20.3, 20.5, 20.6_

  - [x] 26.1 Write property test for no hardcoded keyword maps after legacy removal
    - **Property 45: No hardcoded keyword maps after legacy removal**
    - **Validates: Requirements 20.1, 20.4**

  - [x] 26.2 Write property test for Gemini-first non-empty result used exclusively
    - **Property 46: Gemini-first non-empty result is used exclusively**
    - **Validates: Requirements 20.2**

- [x] 27. Write golden-path integration tests for new flows (D, E, F)
  - Flow D (same-type branching): `form → if_else → gmail[true] → gmail[false]`
    - Assert: two distinct Gmail node instances with different IDs; `Config_Filler` produces different subject/body for each; `if_else` true edge connects to `gmail_true_*` and false edge connects to `gmail_false_*`; `validateWorkflow` passes
  - Flow E (Senior/Junior approval): any prompt through `PipelineReasoningCoordinator`
    - Assert: `PipelineContext.nodeSelectionRationale` populated; every node has a non-empty reason; no workflow compiled before `coordinator.executeStage` returns approved result
  - Flow F (self-healing gate): deliberately broken graph injected before credential step
    - Assert: `validateAndHealBeforeCredentials` repairs the graph; credential step receives `valid: true` graph; `structuredSummary` updated to reflect repair
  - _Requirements: 17.1, 17.4, 18.6, 19.1, 19.5_

- [x] 28. Final checkpoint — all tests pass, no hardcoding remains
  - Run full test suite; assert zero failures
  - Search codebase for `keywordVariations` — assert zero matches
  - Search `summarize-layer.ts` for the literal array `['form', 'javascript', 'if_else', 'function']` — assert zero matches
  - Verify `PipelineReasoningCoordinator` is the only place Senior/Junior AI logic exists
  - Verify credential step is only reachable after `validateWorkflow` returns `valid: true`
  - _Requirements: 20.5, 19.6, 18.8_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All property tests use **fast-check** with a minimum of 100 iterations each
- Each property test must be tagged: `// Feature: ai-workflow-generation-engine, Property N: <property_text>`
- No direct `workflow.edges` mutation is permitted anywhere — all edge changes go through `unifiedGraphOrchestrator`
- `clarifyIntentAndGenerateVariations` must not be called from `workflow-lifecycle-manager.ts` or `workflow-pipeline-orchestrator.ts` after task 3 is complete
