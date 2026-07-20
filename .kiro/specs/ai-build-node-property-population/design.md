# Design Document — AI Build Node Property Population

## Overview

The AI-First Pipeline currently leaves all node property fields at registry defaults after structural assembly, producing "Not configured" placeholders for fields like `subject`/`body` on gmail, `conditions` on if_else, `values` on set_variable, etc. This feature inserts a **Property Population Stage** (Stage 8) into the pipeline — after Validation, before Credential Discovery — that calls an LLM once per node to populate every field whose `fillMode.default` is `buildtime_ai_once`, using the user's original intent, the structural blueprint, and the node's `inputSchema` as context.

The solution is entirely registry-driven. No hardcoded per-node logic exists anywhere outside `UnifiedNodeRegistry`. The stage is soft-failing: LLM errors per node fall back to registry defaults without blocking the pipeline.

---

## Architecture

### Pipeline Stage Order (after this feature)

```
Stage 1: Intent
Stage 2: Structural Prompt
Stage 3: Node Selection
Stage 4: Edge Reasoning
Stage 5: Validation                  ← graph structure frozen here
Stage 6: [NEW] Property Population   ← writes node.data.config only
Stage 7: Credential Discovery
Stage 8: Field Ownership
```

The graph structure (nodes + edges) is frozen after Stage 5. Stage 6 only mutates `node.data.config` — it never touches `workflow.edges` and never calls any `UnifiedGraphOrchestrator` mutation method.

### Data Flow

```mermaid
flowchart TD
    VS[Validation Stage\nworkflow: Workflow] --> PPS[Property Population Stage]
    PPS --> |"for each node"| REG[UnifiedNodeRegistry\n.get(nodeType).inputSchema]
    REG --> |"buildtime_ai_once fields"| LLM[LLM Call\ngeminiOrchestrator]
    LLM --> |"JSON field values"| MERGE[Merge over defaultConfig]
    MERGE --> |"node.data.config updated"| CDS[Credential Discovery Stage]
    PPS --> |"propertyPopulationSummary"| OUT[AiPipelineOutput]
```

### Failure Isolation

Each node's LLM call is wrapped in an independent try/catch. A failure for node N does not affect nodes N+1..M. The stage itself never throws — it always returns a result, even if every LLM call failed.

---

## Components and Interfaces

### New File: `worker/src/services/ai/stages/property-population-stage.ts`

```typescript
export interface PropertyPopulationStageInput {
  workflow: Workflow;
  userIntent: string;
  structuralPrompt: string;
  correlationId?: string;
}

export interface PropertyPopulationStageResult {
  ok: true;
  workflow: Workflow;                              // nodes with updated data.config
  propertyPopulationSummary: Record<string, string[]>; // nodeId → populated field names
  durationMs: number;
}

// Stage never returns ok: false — errors are per-node soft failures
export async function runPropertyPopulationStage(
  input: PropertyPopulationStageInput,
): Promise<PropertyPopulationStageResult>
```

### Modified: `AiPipelineOutput` in `ai-first-pipeline.ts`

```typescript
export interface AiPipelineOutput {
  workflow: Workflow;
  validationIssues: ValidationIssue[];
  stageTrace: StageTrace[];
  requiredCredentials: CredentialRequirement[];
  missingCredentials: CredentialRequirement[];
  fieldOwnershipMap: FieldOwnershipMap;
  propertyPopulationSummary: Record<string, string[]>; // NEW
}
```

### Modified: `generate-workflow.ts` API response

The success response body gains `propertyPopulationSummary` alongside existing fields.

---

## Data Models

### Field Selection Logic

For each node, the stage reads `UnifiedNodeRegistry.get(nodeType).inputSchema` and filters to fields satisfying **all** of:

1. `field.fillMode?.default === 'buildtime_ai_once'`
2. `field.ownership !== 'credential'`

These are the only fields the stage may write. All other fields are untouched.

### LLM Prompt Structure (per node)

```
SYSTEM:
You are a workflow configuration assistant. Given a user's intent, a workflow blueprint,
and a node's input schema, return a JSON object with values for the specified fields.
Return ONLY valid JSON. No markdown, no explanation.

USER:
USER_INTENT:
<userIntent>

WORKFLOW_BLUEPRINT:
<structuralPrompt>

NODE_TYPE: <nodeType>
NODE_ID: <nodeId>

FIELDS_TO_POPULATE:
<for each buildtime_ai_once field>
  - <fieldName> (type: <type>): <description>
    examples: <examples if present>

Return a JSON object with keys matching the field names above.
For array/object fields, return valid JSON values (not strings).
```

### LLM Response Processing

```typescript
// 1. Parse JSON from LLM response (strip markdown fences)
// 2. For each key in parsed response:
//    a. Check field exists in inputSchema
//    b. Check field.fillMode.default === 'buildtime_ai_once'
//    c. Check field.ownership !== 'credential'
//    d. If field.type is 'array' or 'object' and value is string → JSON.parse(value)
//    e. Write to node.data.config[fieldName]
// 3. Track written field names in populatedFields[]
// 4. Final config = { ...defaultConfig(), ...filteredLlmValues }
```

### `propertyPopulationSummary` Shape

```typescript
// Maps nodeId → list of field names that were AI-populated
// Only nodes where at least one field was written appear as keys
{
  "node_abc123": ["subject", "body"],
  "node_def456": ["conditions"],
  "node_ghi789": ["values"]
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: All buildtime_ai_once fields are populated

*For any* workflow with any set of node types, and any non-empty user intent string, after the Property Population Stage runs with a functioning LLM, every field in every node whose `fillMode.default` is `buildtime_ai_once` (and `ownership !== 'credential'`) SHALL have a non-null, non-empty value in `node.data.config`.

**Validates: Requirements 1.1, 7.1**

---

### Property 2: fillMode gate — only eligible fields are written

*For any* workflow and any user intent, the set of fields written to `node.data.config` by the Property Population Stage SHALL be a strict subset of `{ fieldName | inputSchema[fieldName].fillMode.default === 'buildtime_ai_once' AND inputSchema[fieldName].ownership !== 'credential' }`. Fields with `manual_static`, `runtime_ai`, or `credential` ownership SHALL never be written, regardless of their prior value.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 7.2**

---

### Property 3: Merge semantics — LLM output merged over registry defaults

*For any* node and any mocked LLM response returning a JSON object `R`, the resulting `node.data.config` SHALL equal `{ ...defaultConfig(), ...filteredFields(R) }` where `filteredFields(R)` contains only the keys from `R` that satisfy the fillMode gate (Property 2).

**Validates: Requirements 1.3, 7.4**

---

### Property 4: Summary accuracy — propertyPopulationSummary matches written fields

*For any* workflow run, `propertyPopulationSummary[nodeId]` SHALL contain exactly the list of field names written to `node.data.config` for that node — no more, no fewer. Nodes where no fields were written SHALL NOT appear as keys in the summary.

**Validates: Requirements 5.1, 7.3**

---

### Property 5: Soft failure — LLM error falls back to registry defaults

*For any* node where the LLM call throws an error, the Property Population Stage SHALL leave that node's `buildtime_ai_once` fields at their `defaultConfig()` values and SHALL NOT propagate the error. The pipeline SHALL return `ok: true` even if every LLM call fails.

**Validates: Requirements 4.4, 4.5, 7.5**

---

### Property 6: LLM prompt contains all required context

*For any* node being populated, the prompt sent to the LLM SHALL contain: (a) the user's original intent string, (b) the structural prompt (workflow blueprint), and (c) the field names, types, and descriptions from the node's `inputSchema` for all `buildtime_ai_once` fields.

**Validates: Requirements 3.1, 3.2, 3.3**

---

### Property 7: Edges are immutable after the stage

*For any* workflow, `workflow.edges` after the Property Population Stage completes SHALL be deeply equal to `workflow.edges` before the stage ran. The stage SHALL NOT call `unifiedGraphOrchestrator.initializeWorkflow()`, `injectNode()`, `removeNode()`, or any other orchestrator mutation method.

**Validates: Requirements 6.2, 6.3**

---

### Property 8: JSON parsing for array/object fields

*For any* LLM response that returns a string value for a field whose `inputSchema` type is `array` or `object`, the value written to `node.data.config` SHALL be the result of `JSON.parse(value)`, not the raw string.

**Validates: Requirements 3.6**

---

### Property 9: stageTrace entry has all required fields

*For any* pipeline run, the `stageTrace` entry with `stage: 'property_population'` SHALL contain non-null values for `stage`, `startedAt`, `completedAt`, `durationMs`, `inputSummary`, and `outputSummary`.

**Validates: Requirements 4.2**

---

### Property 10: All existing stage traces are preserved

*For any* pipeline run, the `stageTrace` array SHALL contain entries for all of: `intent`, `structural_prompt`, `node_selection`, `edge_reasoning`, `validation`, `property_population`, `credential_discovery`, `field_ownership` — in that order. No existing stage trace entry SHALL be modified.

**Validates: Requirements 6.4**

---

## Error Handling

| Scenario | Behavior |
|---|---|
| LLM call throws for node N | Log `warn` with `correlationId` and `nodeId`. Leave node N's `buildtime_ai_once` fields at `defaultConfig()`. Continue to node N+1. |
| LLM returns unparseable JSON | Log `warn`. Attempt one retry with explicit JSON reminder. On second failure, fall back to `defaultConfig()` for that node. |
| LLM returns JSON with extra keys | Silently ignore keys not in `inputSchema` or not `buildtime_ai_once`. |
| LLM returns string for array/object field | `JSON.parse()` the string. If parse fails, log `warn` and use `defaultConfig()` value for that field only. |
| Node type not found in registry | Log `warn`. Skip node (no fields to populate). |
| All LLM calls fail | Stage returns `ok: true` with all nodes at `defaultConfig()`. Pipeline continues normally. |

---

## Testing Strategy

### Unit Tests (example-based)

- Stage emits `ai_pipeline_stage_start` and `ai_pipeline_stage_end` log events
- Stage is positioned after validation and before credential discovery in the pipeline
- `generate-workflow.ts` API response includes `propertyPopulationSummary`
- Pipeline returns `ok: true` when all LLM calls fail
- `AiPipelineOutput` type includes `propertyPopulationSummary`

### Property-Based Tests

Property-based testing is appropriate here because the stage is a pure data transformation (registry metadata → LLM prompt → config merge) with a large input space (any node type, any field set, any user intent, any LLM response shape). The library to use is **[fast-check](https://github.com/dubzzz/fast-check)** (already available in the TypeScript/Node.js ecosystem).

Each property test runs a minimum of **100 iterations**.

Tag format: `// Feature: ai-build-node-property-population, Property {N}: {property_text}`

**Property 1** — Generate random sets of node types with mocked registry definitions containing `buildtime_ai_once` fields. Mock LLM to return valid JSON for each node. Verify every `buildtime_ai_once` field in every node has a non-null, non-empty value in the output config.

**Property 2** — Generate nodes with random mixes of `manual_static`, `runtime_ai`, `buildtime_ai_once`, and `credential` fields. Run stage. Verify only `buildtime_ai_once` non-credential fields appear in the diff between input and output config.

**Property 3** — For any node, mock LLM to return a fixed arbitrary JSON object. Verify output config equals `{ ...defaultConfig(), ...filteredFields }`.

**Property 4** — For any workflow run, verify `propertyPopulationSummary[nodeId]` contains exactly the fields written to `node.data.config`.

**Property 5** — For any node, mock LLM to throw. Verify that node's config equals `defaultConfig()` and pipeline returns `ok: true`.

**Property 6** — For any user intent string and structural prompt, intercept the LLM call and verify the prompt contains both strings and the field metadata.

**Property 7** — For any workflow, capture `workflow.edges` before stage. Run stage. Deep-equal assert edges are unchanged.

**Property 8** — For any array/object field, mock LLM to return a JSON string. Verify written value is the parsed object.

**Property 9** — For any pipeline run, verify the `property_population` stageTrace entry has all required fields with correct types.

**Property 10** — For any pipeline run, verify all 8 stage names appear in `stageTrace` in the correct order.
