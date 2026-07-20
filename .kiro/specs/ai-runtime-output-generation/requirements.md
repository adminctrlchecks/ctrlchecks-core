# Requirements Document

## Introduction

This feature governs the complete **field ownership system** for workflow nodes. Every input field on every node has an ownership mode that determines who or what provides its value:

- **You (manual_static)** — the user types the value directly
- **AI (build) / buildtime_ai_once** — the AI fills the value once when the workflow is generated; the user can see and edit it
- **AI (runtime) / runtime_ai** — the AI generates the value live at execution time, using the previous node's output and the user's workflow intent; the output shape (plain string, number, JSON object, JSON array, or mixed text+JSON) is determined by the AI based on context

The toggle showing these three modes is displayed per-field in the node properties panel. When AI generates a workflow, it must stamp the correct mode into each field's config so the toggle reflects the AI's decision. If the user wants to change the mode, they click the toggle. AI Runtime fields are resolved at execution time by the `AI_Input_Resolver` subsystem, which calls the LLM with upstream context and user intent.

**Two active bugs are in scope:**
1. The toggle does not reflect AI-set modes after workflow generation (key mismatch: `_fieldModes` written by backend vs `_fillMode` read by UI).
2. AI Runtime field resolution is disabled by default and the sentinel value is not being written when a field is set to `runtime_ai` mode.

## Glossary

- **Field_Ownership_Mode**: One of `manual_static` (You), `buildtime_ai_once` (AI build), or `runtime_ai` (AI runtime) — stored per-field in `node.data.config._fillMode[fieldName]`.
- **_fillMode**: The canonical config key read by the UI (`PropertiesPanel.tsx`) to determine which toggle button is active for a field.
- **_fieldModes**: A legacy/parallel key written by `intelligent-config-filler.ts` that the UI does NOT read — this is the source of the toggle-not-reflecting bug.
- **AI_Input_Resolver**: The subsystem that resolves `runtime_ai` fields at execution time by calling the LLM with upstream context and user intent.
- **AI_Generated_Field**: An input field whose `_fillMode` is `runtime_ai`, indicating the AI_Input_Resolver must generate its value at execution time.
- **Field_Schema**: The type declaration for a specific input field in `unified-node-registry.ts`, including expected type (`string`, `number`, `object`, `array`, `mixed`) and `fillMode` metadata.
- **Upstream_Context**: All previous node outputs available at execution time, stored in `ExecutionContext.nodeOutputs` in topological order.
- **User_Intent**: The natural-language description of the workflow's goal, propagated through `currentWorkflowIntent`.
- **Resolved_Value**: The runtime-determined value produced by the AI_Input_Resolver for a single `runtime_ai` field.
- **Output_Shape**: The structure of a Resolved_Value — JSON object, JSON array, plain string, number, or mixed text+JSON.
- **Output_Shape_Descriptor**: A machine-readable prefix (`OUTPUT_SHAPE: <type>`) emitted by the LLM as the first line of its response.
- **LLM_Adapter**: The shared `llm-adapter` used by all AI execution paths.
- **Execution_Budget**: Per-execution token and call limits enforced by `execution-usage-context.ts`.
- **buildManifest**: The frozen snapshot of field ownership delivered to the UI after workflow generation, containing `fieldOwnershipMap` (nodeId → fieldName → mode).

## Requirements

### Requirement 1: Field Ownership Toggle — Config Key Consistency

**User Story:** As a workflow designer, I want the field ownership toggle (You / AI build / AI runtime) to correctly reflect the mode that was set — whether by me or by the AI during workflow generation — so that I can see at a glance who owns each field.

#### Acceptance Criteria

1. THE UI (`PropertiesPanel.tsx`) SHALL read field ownership mode exclusively from `node.data.config._fillMode[fieldName]`.
2. THE `intelligent-config-filler.ts` SHALL write field ownership modes into `node.data.config._fillMode[fieldName]` (not `_fieldModes`) so the UI reads the correct key.
3. WHEN the AI generates a workflow and fills a field with `buildtime_ai_once` mode, THE node config SHALL contain `_fillMode[fieldName] = 'buildtime_ai_once'` before the workflow is delivered to the UI.
4. WHEN the AI generates a workflow and marks a field as `runtime_ai`, THE node config SHALL contain `_fillMode[fieldName] = 'runtime_ai'` before the workflow is delivered to the UI.
5. WHEN `_fillMode[fieldName]` is absent from the node config, THE UI SHALL default to `manual_static` (You) for that field.
6. THE `_fieldModes` key SHALL be removed or aliased to `_fillMode` to eliminate the dual-key inconsistency; no code path SHALL write ownership state to `_fieldModes` while the UI reads from `_fillMode`.

---

### Requirement 2: AI Build — Toggle Reflects AI-Generated Values

**User Story:** As a workflow designer, I want to see the "AI (build)" toggle lit up for fields that the AI already filled during workflow generation, so that I know the AI set that value and I can choose to keep it, edit it, or switch to a different mode.

#### Acceptance Criteria

1. WHEN the AI fills a field value at build time (via `intelligent-config-filler.ts` or `buildtime-text-helper.ts`), THE system SHALL write `_fillMode[fieldName] = 'buildtime_ai_once'` into the node config in the same operation that writes the field value.
2. WHEN the workflow is delivered to the UI, THE `buildManifest.fieldOwnershipMap` SHALL contain the correct mode (`ai_built`) for every field the AI populated at build time.
3. THE UI SHALL display the "AI (build)" button as active (selected/highlighted) for any field whose `_fillMode` is `buildtime_ai_once`.
4. WHEN a user clicks "You" on a field that was AI-built, THE system SHALL switch `_fillMode[fieldName]` to `manual_static` and make the field editable.
5. WHEN a user clicks "AI (build)" on a field that was previously set to "You", THE system SHALL restore the AI-generated value from `buildManifest.fieldOwnershipMap` and set `_fillMode[fieldName]` back to `buildtime_ai_once`.
6. THE AI SHALL only set `buildtime_ai_once` on fields where `fillMode.supportsBuildtimeAI === true` in the registry; credential fields and `manual_static`-only fields SHALL never be stamped as `buildtime_ai_once`.

---

### Requirement 3: AI Runtime — Toggle Reflects Runtime Mode

**User Story:** As a workflow designer, I want to see the "AI (runtime)" toggle lit up for fields that the AI has designated as runtime-generated, so that I understand those fields will be filled automatically during execution and I don't need to configure them manually.

#### Acceptance Criteria

1. WHEN the AI generates a workflow and determines a field should be resolved at runtime, THE system SHALL write `_fillMode[fieldName] = 'runtime_ai'` into the node config.
2. THE UI SHALL display the "AI (runtime)" button as active for any field whose `_fillMode` is `runtime_ai`.
3. WHEN a field's `_fillMode` is `runtime_ai`, THE UI SHALL hide the manual input widget for that field and show a descriptive banner: "AI resolves this from previous node output at runtime."
4. WHEN a user clicks "You" on a `runtime_ai` field, THE system SHALL switch `_fillMode[fieldName]` to `manual_static` and show the editable input.
5. WHEN a user clicks "AI (runtime)" on a field, THE system SHALL set `_fillMode[fieldName]` to `runtime_ai` only if `fillMode.supportsRuntimeAI === true` for that field in the registry; otherwise the button SHALL be disabled.
6. THE AI SHALL only set `runtime_ai` on fields where `fillMode.supportsRuntimeAI === true` in the registry.

---

### Requirement 4: AI-Generated Field Marking for Runtime Resolution

**User Story:** As a workflow designer, I want any field set to "AI (runtime)" mode to be automatically resolved by the AI at execution time, so that I do not need to hardcode a value and the AI can use what came before in the workflow.

#### Acceptance Criteria

1. WHEN a field's `_fillMode` is `runtime_ai` at execution time, THE unified-node-registry execution wrapper SHALL invoke `AI_Input_Resolver.resolveAiFields()` for that field before the node executes.
2. THE `ENABLE_RUNTIME_AI_RESOLUTION` environment flag SHALL default to `true`; runtime AI resolution SHALL be on by default and SHALL NOT require manual opt-in via environment variable.
3. WHEN a field is in `runtime_ai` mode, THE node config value for that field SHALL be treated as the sentinel `"__ai_generated__"` by the execution layer, regardless of what static value (if any) is stored.
4. THE AI_Input_Resolver SHALL NOT contain any `if (nodeType === ...)` or `switch (nodeType)` logic; all field-level behavior SHALL be derived from the Field_Schema returned by the registry.
5. WHEN a node has multiple `runtime_ai` fields, THE AI_Input_Resolver SHALL resolve each field independently using the same Upstream_Context and User_Intent.

---

### Requirement 5: Upstream Context Aggregation

**User Story:** As a workflow designer, I want the AI to have access to all relevant prior node outputs when generating a runtime field value, so that the generated value is coherent with what the workflow has already produced.

#### Acceptance Criteria

1. WHEN the AI_Input_Resolver begins resolving a `runtime_ai` field, THE AI_Input_Resolver SHALL collect all entries from `ExecutionContext.nodeOutputs` that precede the current node in topological order.
2. THE AI_Input_Resolver SHALL compact each upstream output to fit within the Execution_Budget token limit before including it in the LLM prompt, using `compactForAiPrompt`.
3. WHEN the total size of all upstream outputs exceeds the per-execution token budget, THE AI_Input_Resolver SHALL prioritize the immediately preceding node's output, then earlier nodes in reverse topological order.
4. THE AI_Input_Resolver SHALL include the User_Intent string verbatim in the LLM prompt alongside the compacted upstream outputs.
5. IF the Upstream_Context is empty (the current node is the first non-trigger node), THEN THE AI_Input_Resolver SHALL generate the field value based solely on the User_Intent and the Field_Schema.

---

### Requirement 6: Output Shape Determination

**User Story:** As a workflow designer, I want the AI to produce the right type of value for each runtime field — a string for a subject line, a number for a row index, a JSON object for structured config — so that the resolved value is immediately usable by the node without manual transformation.

#### Acceptance Criteria

1. THE AI_Input_Resolver SHALL determine the Output_Shape based on the field's Field_Schema type and the upstream context — not based on node type.
2. WHEN the Field_Schema declares type `string`, THE AI_Input_Resolver SHALL return a trimmed plain string.
3. WHEN the Field_Schema declares type `number`, THE AI_Input_Resolver SHALL parse and return a floating-point number.
4. WHEN the Field_Schema declares type `object`, THE AI_Input_Resolver SHALL parse and return a JSON object.
5. WHEN the Field_Schema declares type `array`, THE AI_Input_Resolver SHALL parse and return a JSON array.
6. WHEN the Field_Schema declares type `mixed`, THE AI_Input_Resolver SHALL return a JSON object containing at minimum a `text` string field and a `data` field.
7. THE AI_Input_Resolver SHALL record the chosen Output_Shape in an Output_Shape_Descriptor attached to the field's resolution metadata.

---

### Requirement 7: LLM Prompt Construction

**User Story:** As a platform engineer, I want the prompt sent to the LLM for each runtime field resolution to be deterministic and auditable, so that field generation is reproducible and debuggable.

#### Acceptance Criteria

1. THE AI_Input_Resolver SHALL construct the LLM prompt using a fixed template that includes: (a) the User_Intent, (b) the compacted Upstream_Context, (c) the field name and its Field_Schema type, and (d) an instruction to produce a value of the declared type.
2. THE AI_Input_Resolver SHALL instruct the LLM to emit `OUTPUT_SHAPE: <shape_type>` as the first line of its response, where `<shape_type>` is one of `json`, `string`, `number`, `array`, or `mixed`.
3. THE AI_Input_Resolver SHALL pass the constructed prompt to the LLM_Adapter using the same call interface used by existing AI node executors.
4. WHEN the LLM_Adapter call fails, THE AI_Input_Resolver SHALL retry once with a simplified prompt that omits all upstream context except the immediately preceding node's output.
5. IF the retry also fails, THEN THE AI_Input_Resolver SHALL return a structured error object containing `error`, `message`, and `fieldName` fields.

---

### Requirement 8: Output Parsing and Normalization

**User Story:** As a platform engineer, I want the raw LLM response to be reliably parsed into a typed value that matches the field's declared schema, so that downstream node execution always receives a well-formed input.

#### Acceptance Criteria

1. WHEN the LLM response begins with `OUTPUT_SHAPE: json`, THE AI_Input_Resolver SHALL parse the remainder as a JSON object.
2. WHEN the LLM response begins with `OUTPUT_SHAPE: string`, THE AI_Input_Resolver SHALL return the remainder as a trimmed plain string.
3. WHEN the LLM response begins with `OUTPUT_SHAPE: number`, THE AI_Input_Resolver SHALL parse the remainder as a floating-point number.
4. WHEN the LLM response begins with `OUTPUT_SHAPE: array`, THE AI_Input_Resolver SHALL parse the remainder as a JSON array.
5. WHEN the LLM response begins with `OUTPUT_SHAPE: mixed`, THE AI_Input_Resolver SHALL parse the remainder as a JSON object with at minimum a `text` string field and a `data` field.
6. IF the LLM response does not begin with a valid `OUTPUT_SHAPE:` prefix, THEN THE AI_Input_Resolver SHALL auto-detect the shape: try JSON parse first, then number parse, then treat as plain string.
7. FOR ALL valid LLM responses, parsing the Output_Shape_Descriptor then re-serializing the Resolved_Value then parsing it again SHALL produce an equivalent value (round-trip property).

---

### Requirement 9: Type Compatibility Enforcement

**User Story:** As a platform engineer, I want every AI-resolved field value to be verified as type-compatible with the field's declared schema before it is passed to the node executor, so that type mismatches are caught at resolution time rather than causing silent failures downstream.

#### Acceptance Criteria

1. AFTER the AI_Input_Resolver produces a Resolved_Value, THE AI_Input_Resolver SHALL validate it against the field's Field_Schema using the same schema validator as `schema-based-validator.ts`.
2. IF the Resolved_Value is not type-compatible, THEN THE AI_Input_Resolver SHALL attempt one corrective re-prompt, explicitly stating the type mismatch and required type.
3. IF the corrective re-prompt also produces a type-incompatible value, THEN THE AI_Input_Resolver SHALL return a structured error object containing `error`, `message`, `fieldName`, `expectedType`, and `actualType`.
4. FOR ALL `runtime_ai` fields, the Resolved_Value SHALL be type-compatible with the field's Field_Schema (correctness property: resolved type ∈ declared schema type).
5. THE AI_Input_Resolver SHALL NOT coerce values silently; any coercion SHALL be recorded in the field's resolution metadata.

---

### Requirement 10: Registry Integration

**User Story:** As a platform engineer, I want the AI-generated field resolution capability to be registered in the unified node registry, so that it applies automatically to all node types that declare `runtime_ai` fields without per-node hardcoding.

#### Acceptance Criteria

1. THE AI_Input_Resolver SHALL be invoked from within the `execute()` method of the unified-node-registry's shared execution wrapper, not from any individual node executor.
2. THE unified-node-registry SHALL expose `fillMode.supportsRuntimeAI` and `fillMode.supportsBuildtimeAI` on individual field definitions; these flags are the sole mechanism for opting a field into AI resolution.
3. WHEN `fillMode.supportsRuntimeAI` is `false` for a given field, THE unified-node-registry SHALL not invoke the AI_Input_Resolver for that field under any circumstances.
4. WHEN a new node type is registered with fields where `fillMode.supportsRuntimeAI === true`, THE AI_Input_Resolver SHALL apply to those fields automatically without any additional code changes.
5. THE AI_Input_Resolver SHALL not introduce any `if (nodeType === ...)` or `switch (nodeType)` logic.

---

### Requirement 11: Execution Budget Enforcement

**User Story:** As a platform operator, I want AI field resolution to respect the per-execution token and call budgets, so that a single workflow execution cannot exhaust LLM quota through unbounded field resolution calls.

#### Acceptance Criteria

1. BEFORE making an LLM call for any `runtime_ai` field, THE AI_Input_Resolver SHALL call `canStartExecutionLlmCall('ai_input_resolver')` and proceed only if the result is `true`.
2. AFTER a successful LLM call, THE AI_Input_Resolver SHALL call `recordExecutionLlmUsage(totalTokens, 'ai_input_resolver')`.
3. IF `canStartExecutionLlmCall` returns `false`, THEN THE AI_Input_Resolver SHALL return the field's `defaultConfig` value from the registry and log a budget-exceeded warning.
4. WHEN a node has multiple `runtime_ai` fields, THE AI_Input_Resolver SHALL check the budget before each individual field resolution, stopping further resolutions and falling back to defaults if the budget is exhausted mid-node.

---

### Requirement 12: Downstream Compatibility

**User Story:** As a workflow designer, I want the AI-resolved field values to flow correctly into the node's execution and into downstream nodes, so that the rest of the workflow behaves as expected regardless of which fields were AI-generated.

#### Acceptance Criteria

1. WHEN the AI_Input_Resolver has resolved all `runtime_ai` fields for a node, THE unified-node-registry SHALL merge the Resolved_Values into the node's config before passing it to the node's `execute()` method.
2. WHEN a node produces output after executing with AI-resolved field values, THE unified-execution-engine SHALL store that output in `ExecutionContext.nodeOutputs` using the same `setNodeOutput` call used for all other node types.
3. WHEN a downstream node references the output of a node that used AI-resolved fields, THE downstream node SHALL receive the output in the same format as if the fields had been hardcoded.
4. WHEN a resolved field value is a JSON object, THE AI_Input_Resolver SHALL ensure the object's top-level keys are accessible via `{{$json.<key>}}` template expressions in downstream node configs.

---

### Requirement 13: Observability and Logging

**User Story:** As a platform operator, I want every AI field resolution event to be logged with enough detail to diagnose issues, so that I can audit what the AI produced for each field and why.

#### Acceptance Criteria

1. WHEN the AI_Input_Resolver completes a field resolution successfully, THE AI_Input_Resolver SHALL emit a structured log entry containing: `nodeId`, `nodeType`, `fieldName`, `outputShape`, `tokenCount`, `durationMs`, and a truncated preview of the Resolved_Value (maximum 500 characters).
2. WHEN the AI_Input_Resolver falls back to the retry path, THE AI_Input_Resolver SHALL log the original failure reason, the field name, and indicate that a simplified prompt was used.
3. WHEN the AI_Input_Resolver returns a budget-exceeded fallback, THE AI_Input_Resolver SHALL log the budget state, the field name, and the default value used.
4. WHEN the AI_Input_Resolver detects a type-compatibility failure, THE AI_Input_Resolver SHALL log the field name, expected type, actual type, and whether the corrective re-prompt succeeded.
5. THE AI_Input_Resolver SHALL NOT log raw credential values, API keys, or personally identifiable information.
6. WHILE an execution is in progress, THE AI_Input_Resolver SHALL include the `executionId` from `getActiveExecutionId()` in every log entry.
