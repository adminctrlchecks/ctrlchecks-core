# Implementation Plan: Workflow Generation Quality Fix

## Overview

Three interconnected fixes applied in dependency order: registry methods first (everything else depends on them), then pipeline filters, then property population, then credential flow. All changes are registry-driven — no hardcoded node-type strings outside `UnifiedNodeRegistry`.

## Tasks

- [x] 1. Add `isUtilityNode()` and `getBuildValueContext()` to `UnifiedNodeRegistry`
  - Add `isUtilityNode(nodeType: string): boolean` method to `UnifiedNodeRegistry` class in `worker/src/core/registry/unified-node-registry.ts`
    - Resolve alias first, then look up definition
    - Return `true` if `definition.category === 'utility'`
    - Return `true` if `definition.tags` includes any of `['logging', 'debug', 'side-effect', 'internal']`
    - Return `false` for unknown types (fail-safe)
  - Add `getBuildValueContext(targetNodeType: string, upstreamNodeType: string | undefined): BuildValueContext` method
    - `upstreamFields`: derived from `unifiedNodeRegistry.get(upstreamNodeType)?.outputSchema.default.schema.properties`
    - `targetFields`: derived from `inputSchema` filtered to `fillMode.default === 'buildtime_ai_once'` and `ownership !== 'credential'`
    - Return `{ upstreamFields: [], targetFields: [] }` for unknown types
  - Export the `BuildValueContext` interface from the registry file
  - _Requirements: 1.7, 2.9, 4.1, 4.2_

  - [ ]* 1.1 Write property test for `isUtilityNode` classification
    - **Property 1: isUtilityNode classification is registry-driven**
    - Generate arbitrary node definitions with `category === 'utility'` or tags in `['logging', 'debug', 'side-effect', 'internal']`, register them, verify `isUtilityNode()` returns `true`; verify non-utility nodes return `false`; verify unknown types return `false`
    - **Validates: Requirements 1.7, 4.1, 4.2**

  - [ ]* 1.2 Write property test for `getBuildValueContext` round-trip
    - **Property 7: getBuildValueContext round-trip correctness**
    - For arbitrary valid `(targetNodeType, upstreamNodeType)` pairs from the registry, verify `upstreamFields` names are a subset of `outputSchema.default.schema.properties` keys and `targetFields` names are a subset of `buildtime_ai_once` input schema keys
    - **Validates: Requirements 2.2, 2.3, 2.9**

- [x] 2. Strengthen `buildNodeSelectionPrompt()` with explicit utility node exclusion rules
  - Modify `buildNodeSelectionPrompt()` in `worker/src/services/ai/system-prompt-builder.ts`
  - Add a `## CRITICAL RULE — NEVER ADD UTILITY NODES` block that references utility node *categories* (not hardcoded type strings): nodes classified as `utility`, `logging`, `debug`, or `side-effect` by the registry
  - Add explicit keyword-gate examples: `log_output` requires "log"/"debug"/"monitor" in the prompt; `text_formatter` requires "format text"/"reformat"
  - The new block is additive — it does not replace existing `## CRITICAL RULE — NO UTILITY NODES UNLESS EXPLICITLY REQUESTED`
  - _Requirements: 1.3_

- [x] 3. Add utility node filter pass in `AiFirstPipeline` after the existing intent filter
  - Modify `worker/src/services/ai/ai-first-pipeline.ts`
  - After the existing intent filter block (the `// ✅ UNIVERSAL FIX: Remove nodes not grounded...` block), add a second filter pass
  - Call `unifiedNodeRegistry.isUtilityNode(sel.type)` for each node; keep utility nodes only if the user prompt or intent actions explicitly mention the node's label or type
  - Wrap in try/catch matching the existing soft-failure pattern; log removed types via `logger.info` with `event: 'ai_pipeline_utility_filter'`
  - _Requirements: 1.2, 4.3_

- [x] 4. Replace hardcoded tag checks in `WorkflowDSLCompiler` with `isUtilityNode()`
  - Modify `worker/src/services/ai/workflow-dsl-compiler.ts`
  - Find the existing filter/merge tag-string check (lines ~140–175) that uses `['filter', 'merge'].includes(tag.toLowerCase())` or similar string matching
  - Replace with `unifiedNodeRegistry.isUtilityNode(nodeType)` — if `hasEmptyConfig && isUtility`, skip the node
  - Import `unifiedNodeRegistry` if not already imported
  - _Requirements: 1.4, 4.4_

  - [ ]* 4.1 Write property test for DSL compiler utility node filtering
    - **Property 3: DSL compiler filters utility nodes with empty configs**
    - Generate arbitrary `WorkflowDSL` objects containing nodes where `isUtilityNode()` returns `true` and config is empty; compile and verify those nodes are absent from the output
    - **Validates: Requirements 1.4, 4.4**

- [x] 5. Checkpoint — registry and pipeline filter changes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Add upstream schema context, fillMode enforcement, and `long_body` template references to `PropertyPopulationStage`
  - Modify `worker/src/services/ai/stages/property-population-stage.ts`
  - Before the LLM call for each node, find the immediately preceding node by edge traversal (source of the edge whose target is this node) and call `unifiedNodeRegistry.getBuildValueContext(nodeType, upstreamNodeType)`
  - Extend `userMessage` with two new sections:
    - `UPSTREAM_OUTPUT_FIELDS` listing `name: type — description` for each upstream field, with instruction to use `{{$json.<field>}}` syntax in `long_body` fields
    - `FIELD_ROLES` listing `fieldName: role=<role>, essential=<bool>` for each eligible field
  - After parsing the LLM response, apply two hard post-LLM enforcement rules before writing to config:
    - Skip any field where `fillMode.supportsBuildtimeAI === false` (use registry default instead)
    - Skip any field where `fillMode.default === 'runtime_ai'` (leave empty)
  - For fields with `role === 'long_body'`: if the generated value does not contain `{{$json.` syntax, append `{{$json.<first_upstream_field>}}` reference
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8_

  - [ ]* 6.1 Write property test for fillMode gate enforcement
    - **Property 4: fillMode gates are respected during property population**
    - Generate arbitrary node configs with mixed fillMode fields; run property population with mocked LLM; verify `runtime_ai` fields are absent and `supportsBuildtimeAI === false` fields retain registry defaults
    - **Validates: Requirements 2.4, 2.5**

  - [ ]* 6.2 Write property test for essential field population
    - **Property 5: Essential buildtime-AI fields are always populated**
    - Generate arbitrary workflows with fields where `essentialForExecution === true` and `fillMode.supportsBuildtimeAI === true`; run property population; verify non-empty values are produced
    - **Validates: Requirement 2.8**

  - [ ]* 6.3 Write property test for `long_body` template references
    - **Property 6: long_body fields reference upstream schema fields**
    - Generate arbitrary node pairs where the target has `long_body` fields eligible for build-time AI; run property population; verify the generated value contains at least one `{{$json.<field>}}` reference where `<field>` is a key in the upstream node's `outputSchema.default.schema.properties`
    - **Validates: Requirement 2.7**

- [x] 7. Create `PendingCredentialStore`
  - Create new file `worker/src/services/ai/pending-credential-store.ts`
  - Implement `PendingCredentialStore` class with:
    - `private store: Map<string, PendingCredentials>` where `PendingCredentials = Record<string, Record<string, string>>`
    - `set(workflowId: string, provider: string, fields: Record<string, string>): void` — merges fields into existing provider entry
    - `get(workflowId: string): PendingCredentials | undefined`
    - `clear(workflowId: string): void`
    - `has(workflowId: string): boolean`
  - Export singleton `export const pendingCredentialStore = new PendingCredentialStore()`
  - _Requirements: 3.1, 3.2, 3.8_

  - [ ]* 7.1 Write property test for `PendingCredentialStore` retention
    - **Property 8: PendingCredentialStore retention**
    - Generate arbitrary sets of `(workflowId, provider, fields)` tuples; write to store; verify all are retrievable via `store.get(workflowId)` until `store.clear(workflowId)` is called
    - **Validates: Requirement 3.2**

- [x] 8. Create `POST /api/workflow/credentials` endpoint
  - Create new file `worker/src/api/workflow-credentials.ts`
  - Implement `saveWorkflowCredentials(req: Request, res: Response): Promise<void>`
  - Request body: `{ workflowId: string, provider: string, fields: Record<string, string> }`
  - Validate `workflowId` and `provider` are present; return `400` with error message if missing
  - On valid request: call `pendingCredentialStore.set(workflowId, provider, fields)` and return `{ ok: true }`
  - Import and use `pendingCredentialStore` singleton
  - _Requirements: 3.1_

- [x] 9. Register `/api/workflow/credentials` route in the Express app router
  - Find the Express router file where other `/api/workflow/*` routes are registered (e.g., `workflow-confirm`, `generate-workflow`)
  - Import `saveWorkflowCredentials` from `./workflow-credentials`
  - Register `router.post('/api/workflow/credentials', saveWorkflowCredentials)` alongside the existing workflow routes
  - _Requirements: 3.1_

- [x] 10. Checkpoint — credential store and endpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Derive credential fields in `CredentialDetector` from `UnifiedNodeRegistry`
  - Modify `worker/src/services/ai/credential-detector.ts`
  - Replace the hardcoded `credentialMap` in `detectNodeCredentials()` with a registry lookup:
    - `const nodeDef = unifiedNodeRegistry.get(nodeType)`
    - `const credSchema = nodeDef?.credentialSchema`
    - If `!credSchema || credSchema.requirements.length === 0` return `null`
    - Build `RequiredCredential` from `credSchema.requirements[0].provider` and `credSchema.credentialFields`
  - Import `unifiedNodeRegistry` from `../../core/registry/unified-node-registry`
  - Remove the `nodeLibrary` import if it is no longer used after this change
  - _Requirements: 3.9_

  - [ ]* 11.1 Write property test for `CredentialDetector` registry derivation
    - **Property 10: CredentialDetector derives fields from registry**
    - For all node types in the registry with a non-empty `credentialSchema`, verify `detectCredentials()` returns a `RequiredCredential` whose `fields` array exactly matches `credentialSchema.credentialFields`; for node types with no `credentialSchema`, verify no credential is returned
    - **Validates: Requirement 3.9**

- [x] 12. Use `UnifiedNodeRegistry.credentialSchema` for field name mapping in `CredentialInjector`
  - Modify `worker/src/services/ai/credential-injector.ts`
  - Replace the hardcoded `fieldMap` in `getCredentialFieldName()` with a registry lookup:
    - `const nodeDef = unifiedNodeRegistry.get(nodeType)`
    - `const credFields = nodeDef?.credentialSchema?.credentialFields`
    - `if (credFields && credFields.length > 0) return credFields[0]`
    - `return 'credentialId'` as fallback
  - Import `unifiedNodeRegistry` if not already imported
  - Remove the `nodeLibrary` import if it is no longer used after this change
  - _Requirements: 3.4, 3.5_

  - [ ]* 12.1 Write property test for credential injection field names
    - **Property 9: Credential injection uses registry field names**
    - Generate arbitrary node types with `credentialSchema` in the registry; call `CredentialInjector.injectCredentials()`; verify injected config fields match `credentialSchema.credentialFields`, not hardcoded strings
    - **Validates: Requirements 3.4, 3.5**

- [x] 13. Update `workflow-confirm.ts` to read from `PendingCredentialStore`, inject credentials, and clear store
  - Modify `worker/src/api/workflow-confirm.ts`
  - Import `pendingCredentialStore` from `../services/ai/pending-credential-store`
  - Import `credentialInjector` from `../services/ai/credential-injector`
  - On the approval path, before the `updateWorkflowStateInDatabase` call, insert:
    1. Read `pending = pendingCredentialStore.get(workflowId)`
    2. If `pending` has entries, validate no required credential field is an empty string; return `400` with `{ error: 'Missing credential fields', fields: [...] }` if any are empty
    3. Call `credentialInjector.injectCredentials(workflow, pending, requiredCredentials)`; return `400` on injection failure
    4. Reassign `workflow` to `injectionResult.workflow`
  - After successful `updateWorkflowStateInDatabase` call: call `pendingCredentialStore.clear(workflowId)`
  - The `requiredCredentials` list should come from `confirmationRequest` (already stored on the confirmation manager); if not available, pass an empty array (backward compatible)
  - _Requirements: 3.3, 3.4, 3.6, 3.7, 3.8_

  - [ ]* 13.1 Write property test for store cleared after confirmation
    - **Property 11: PendingCredentialStore is cleared after successful confirmation**
    - Generate arbitrary `workflowId` values; simulate successful confirmation; verify `pendingCredentialStore.get(workflowId)` returns `undefined` or empty object immediately after the handler completes
    - **Validates: Requirement 3.8**

  - [ ]* 13.2 Write property test for node selection excluding utility nodes
    - **Property 2: Node selection excludes utility nodes for non-utility prompts**
    - Generate arbitrary user prompts that do not contain utility keywords ("log", "debug", "monitor", "set variable", "format text"); run the `AiFirstPipeline` utility filter with a mocked LLM response containing utility node types; verify the post-filter output contains no nodes for which `isUtilityNode()` returns `true`
    - **Validates: Requirements 1.1, 1.2, 4.3**

- [x] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All property tests should use `fast-check` (already available in the TypeScript ecosystem)
- Each property test runs a minimum of 100 iterations
- Registry methods (`isUtilityNode`, `getBuildValueContext`) must be implemented before any downstream task
- The `PendingCredentialStore` is in-memory only — it is cleared on process restart; this is intentional for the current scope
- Credential flow changes (tasks 11–13) are independent of pipeline filter changes (tasks 2–4) and can be worked in parallel after task 1 is complete
