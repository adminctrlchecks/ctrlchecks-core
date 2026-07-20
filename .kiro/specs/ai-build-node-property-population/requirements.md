# Requirements Document

## Introduction

When AI Build generates a workflow from user intent, it currently wires nodes structurally (edges, execution order) but leaves all node property fields at their registry defaults — producing "Not configured" or empty values for fields like `values` on `set_variable`, `conditions` on `if_else`, `fields` on `form_trigger`, `subject`/`body` on `gmail`, and so on.

This feature adds a universal, registry-driven **property population stage** to the AI-First Pipeline. After the graph is structurally assembled and validated, the pipeline calls an LLM once per node to populate every field whose `fillMode.default` is `buildtime_ai_once` — using the user's original intent, the structural blueprint, and the node's `inputSchema` field descriptions as context. The result is written to `node.data.config` before the pipeline returns, so the workflow is immediately usable without manual field entry.

The solution is universal: it reads field metadata from `UnifiedNodeRegistry` and applies to all node types automatically. No hardcoded per-node logic is permitted anywhere outside the registry.

---

## Glossary

- **AI_Build_Pipeline**: The `AiFirstPipeline` class in `worker/src/services/ai/ai-first-pipeline.ts` — the single entry point for AI workflow generation.
- **Property_Population_Stage**: The new pipeline stage (Stage 8, inserted after validation and before credential discovery) that AI-populates `buildtime_ai_once` fields for every node in the validated workflow.
- **UnifiedNodeRegistry**: The single source of truth for all node definitions, located at `worker/src/core/registry/unified-node-registry.ts`. All field metadata (type, fillMode, ownership, description) is read from here.
- **FieldFillMode**: The enum `'manual_static' | 'runtime_ai' | 'buildtime_ai_once'` defined in `worker/src/core/types/unified-node-contract.ts`. Controls how a field's value is expected to be provided.
- **buildtime_ai_once**: A `FieldFillMode` value indicating the field may be AI-populated once at workflow-generation time. These are the only fields the Property_Population_Stage writes.
- **manual_static**: A `FieldFillMode` value indicating the field must be provided by the user. The Property_Population_Stage must never write to these fields.
- **runtime_ai**: A `FieldFillMode` value indicating the field is resolved at execution time from upstream data. The Property_Population_Stage must never write to these fields.
- **credential**: A field `ownership` class indicating the field holds a credential reference. The Property_Population_Stage must never write to these fields regardless of fillMode.
- **PopulatedConfig**: The `Record<string, any>` written to `node.data.config` after the Property_Population_Stage runs. Contains registry defaults merged with AI-generated values for `buildtime_ai_once` fields.
- **StructuralPrompt**: The plain-language workflow blueprint produced by Stage 2 (`structural-prompt-stage.ts`), passed as context to the Property_Population_Stage.
- **FieldOwnershipMap**: The `Record<nodeId, Record<fieldName, FieldFillMode>>` produced by the existing Field Ownership Stage, used by the UI to render field toggles.
- **You_Mode**: The UI state where a user has overridden an AI-generated field value with a manual static value, switching the field's effective fillMode to `manual_static`.

---

## Requirements

### Requirement 1: Universal Property Population at Build Time

**User Story:** As a user building a workflow with AI Build, I want every node's fields to be pre-filled with values derived from my intent, so that the generated workflow is immediately usable without manual field entry.

#### Acceptance Criteria

1. WHEN the AI_Build_Pipeline produces a validated workflow, THE Property_Population_Stage SHALL attempt to populate every field in every node whose `fillMode.default` is `buildtime_ai_once` according to the node's `inputSchema` in the UnifiedNodeRegistry.
2. WHEN the Property_Population_Stage runs, THE Property_Population_Stage SHALL read field metadata exclusively from `UnifiedNodeRegistry.get(nodeType).inputSchema` — no hardcoded per-node-type logic is permitted.
3. WHEN the Property_Population_Stage produces a value for a field, THE AI_Build_Pipeline SHALL write that value to `node.data.config[fieldName]` in the workflow returned to the caller.
4. WHEN a node type has no `buildtime_ai_once` fields in its `inputSchema`, THE Property_Population_Stage SHALL leave `node.data.config` unchanged from the registry `defaultConfig()` for that node.
5. THE Property_Population_Stage SHALL process all nodes in the validated workflow, not a subset.

---

### Requirement 2: fillMode Gate — Only buildtime_ai_once Fields Are AI-Populated

**User Story:** As a developer maintaining the system, I want the property population stage to respect the registry's fillMode contract, so that manual fields and runtime fields are never overwritten by AI-generated values.

#### Acceptance Criteria

1. WHEN a field's `fillMode.default` is `manual_static`, THE Property_Population_Stage SHALL NOT write any value to that field.
2. WHEN a field's `fillMode.default` is `runtime_ai`, THE Property_Population_Stage SHALL NOT write any value to that field.
3. WHEN a field's `ownership` is `credential`, THE Property_Population_Stage SHALL NOT write any value to that field, regardless of its `fillMode`.
4. WHEN a field already has a non-empty value in `node.data.config` (set by registry `defaultConfig()`), THE Property_Population_Stage SHALL NOT overwrite that value unless the field's `fillMode.default` is `buildtime_ai_once`.
5. FOR ALL nodes in the validated workflow, the set of fields written by the Property_Population_Stage SHALL be a subset of the fields whose `fillMode.default` is `buildtime_ai_once` in the UnifiedNodeRegistry.

---

### Requirement 3: Intent-Driven Field Value Generation

**User Story:** As a user, I want the AI-generated field values to reflect what I described in my prompt, so that the workflow does what I intended without requiring me to re-enter information I already provided.

#### Acceptance Criteria

1. WHEN the Property_Population_Stage calls the LLM to generate field values for a node, THE Property_Population_Stage SHALL include the user's original intent text in the LLM prompt.
2. WHEN the Property_Population_Stage calls the LLM to generate field values for a node, THE Property_Population_Stage SHALL include the StructuralPrompt (workflow blueprint) in the LLM prompt.
3. WHEN the Property_Population_Stage calls the LLM to generate field values for a node, THE Property_Population_Stage SHALL include the node's `inputSchema` field names, types, and descriptions from the UnifiedNodeRegistry in the LLM prompt.
4. WHEN the user's intent implies a specific value for a `buildtime_ai_once` field (e.g., "send an email with subject 'Order Confirmation'"), THE Property_Population_Stage SHALL produce a field value that reflects that intent.
5. WHEN the user's intent does not imply a specific value for a `buildtime_ai_once` field, THE Property_Population_Stage SHALL produce a reasonable placeholder value derived from the node's purpose and the workflow context.
6. WHEN the LLM returns a value for a field whose `type` in `inputSchema` is `array` or `object`, THE Property_Population_Stage SHALL parse the value as JSON before writing it to `node.data.config`.

---

### Requirement 4: Pipeline Integration and Stage Contract

**User Story:** As a developer, I want the property population stage to integrate cleanly with the existing AI-First Pipeline stage architecture, so that it is observable, traceable, and consistent with all other stages.

#### Acceptance Criteria

1. THE Property_Population_Stage SHALL be inserted into the AI_Build_Pipeline after the Validation Stage and before the Credential Discovery Stage.
2. WHEN the Property_Population_Stage completes, THE AI_Build_Pipeline SHALL add a `stageTrace` entry with `stage: 'property_population'`, `startedAt`, `completedAt`, `durationMs`, `inputSummary`, and `outputSummary`.
3. THE Property_Population_Stage SHALL emit `ai_pipeline_stage_start` and `ai_pipeline_stage_end` log entries using the existing `logger` with `correlationId`.
4. WHEN the LLM call in the Property_Population_Stage fails for a node, THE Property_Population_Stage SHALL log a warning and leave that node's `buildtime_ai_once` fields at their registry `defaultConfig()` values — the pipeline SHALL NOT fail.
5. WHEN all LLM calls in the Property_Population_Stage fail, THE AI_Build_Pipeline SHALL still return `{ ok: true }` with the workflow using registry defaults for all nodes.
6. THE `AiPipelineOutput` type SHALL include a `propertyPopulationSummary` field of type `Record<string, string[]>` mapping each `nodeId` to the list of field names that were AI-populated.

---

### Requirement 5: User Override via "You" Mode

**User Story:** As a user, I want to be able to override any AI-generated field value with my own value, so that I retain full control over the workflow configuration.

#### Acceptance Criteria

1. WHEN the Property_Population_Stage writes a value to a `buildtime_ai_once` field, THE AI_Build_Pipeline SHALL record that field in `propertyPopulationSummary[nodeId]` so the UI knows which fields were AI-generated.
2. WHEN a user switches a field to "You" mode in the UI, THE system SHALL treat that field's effective fillMode as `manual_static` and SHALL NOT overwrite the user's value on subsequent AI Build runs.
3. WHEN the `fieldOwnershipMap` is returned by the pipeline, THE `fieldOwnershipMap` SHALL reflect the effective fillMode of each field after any user overrides have been applied.
4. WHERE a field has been AI-populated, THE UI SHALL display the AI-generated value as the current value and SHALL provide a mechanism for the user to edit or replace it.

---

### Requirement 6: Preservation of Existing Pipeline Behavior

**User Story:** As a developer, I want the addition of the property population stage to leave all existing pipeline stages and their outputs unchanged, so that no regressions are introduced.

#### Acceptance Criteria

1. WHEN the Property_Population_Stage is added to the pipeline, THE AI_Build_Pipeline SHALL continue to produce the same `workflow.nodes`, `workflow.edges`, `validationIssues`, `requiredCredentials`, `missingCredentials`, and `fieldOwnershipMap` outputs as before for all inputs where property population produces no changes.
2. WHEN the Property_Population_Stage runs, THE AI_Build_Pipeline SHALL NOT modify `workflow.edges` directly — all edge state remains owned by the UnifiedGraphOrchestrator.
3. WHEN the Property_Population_Stage runs, THE AI_Build_Pipeline SHALL NOT call `unifiedGraphOrchestrator.initializeWorkflow()` or any other orchestrator mutation method — the graph structure is frozen after the Edge Reasoning Stage.
4. THE stageTrace entries for `intent`, `structural_prompt`, `node_selection`, `edge_reasoning`, `validation`, `credential_discovery`, and `field_ownership` SHALL be present and unmodified in the pipeline output after the Property_Population_Stage is added.
5. WHEN the Property_Population_Stage is added, THE `generate-workflow.ts` API response SHALL include `propertyPopulationSummary` in the success response body alongside the existing fields.

---

### Requirement 7: Correctness Properties

**User Story:** As a developer, I want the property population behavior to be verifiable through automated tests, so that regressions are caught before deployment.

#### Acceptance Criteria

1. FOR ALL node types registered in the UnifiedNodeRegistry that have at least one `buildtime_ai_once` field, WHEN the Property_Population_Stage runs with any non-empty user intent, THE populated config SHALL contain a non-null, non-empty value for each such field.
2. FOR ALL node types registered in the UnifiedNodeRegistry, the set of fields written by the Property_Population_Stage SHALL be a subset of `{ fieldName | inputSchema[fieldName].fillMode.default === 'buildtime_ai_once' }` — this invariant SHALL hold for any user intent.
3. FOR ALL nodes where the Property_Population_Stage writes at least one field, `propertyPopulationSummary[nodeId]` SHALL contain exactly the list of field names that were written — no more, no less.
4. WHEN the Property_Population_Stage LLM call is mocked to return a fixed JSON object, THE populated `node.data.config` SHALL contain exactly the fields from that JSON object that are `buildtime_ai_once` in the registry, merged over the registry `defaultConfig()`.
5. IF the LLM call for a node throws an error, THEN THE Property_Population_Stage SHALL return the registry `defaultConfig()` values for that node's fields and SHALL NOT propagate the error to the pipeline.
