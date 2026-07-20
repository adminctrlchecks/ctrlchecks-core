# Design Document: Workflow Generation Quality Fix

## Overview

This document describes the technical design for fixing three interconnected quality problems in the AI workflow generation pipeline:

1. **Node Bloat** — The AI pipeline selects unnecessary utility/logging nodes not requested by the user.
2. **AI Build Value Generation** — Config values generated at build time are generic placeholders instead of intent-derived, schema-aware values.
3. **Credential Persistence Bug** — User-entered credentials are lost between the credential panel and the "Continue Workflow" confirmation step.

A fourth requirement formalizes the registry-driven classification that underpins fixes 1 and 2.

The fixes are designed to be permanent and universal: they apply to all existing and future workflows without hardcoding node-type names anywhere outside the `UnifiedNodeRegistry`.

---

## Architecture

The system is a multi-stage AI pipeline orchestrated by `AiFirstPipeline` (`ai-first-pipeline.ts`):

```
User Prompt
    │
    ▼
[Stage 1] Intent Stage (intent-stage.ts)
    │  → StructuredIntent { intent, triggerType, actions[], dataFlows[] }
    ▼
[Stage 2] Structural Prompt Stage (structural-prompt-stage.ts)
    │  → structuralPrompt (blueprint string)
    ▼
[Stage 3] Node Selection Stage (node-selection-stage.ts)  ← FIX 1, FIX 4
    │  → selectedNodes[] (validated against UnifiedNodeRegistry)
    ▼
[Stage 4] Edge Reasoning Stage
    │  → workflow with edges
    ▼
[Stage 5] Validation Stage
    │  → validationIssues[]
    ▼
[Stage 6] Property Population Stage (property-population-stage.ts)  ← FIX 2
    │  → workflow with populated node configs
    ▼
[Stage 7] Credential Discovery Stage
    │  → requiredCredentials[], missingCredentials[]
    ▼
[Stage 8] Field Ownership Stage
    │  → fieldOwnershipMap
    ▼
AiPipelineOutput { workflow, requiredCredentials, ... }
```

Credential flow (separate from generation):

```
Credential Panel UI
    │  POST /api/workflow/credentials  ← NEW ENDPOINT (FIX 3)
    ▼
PendingCredentialStore (in-memory Map)  ← NEW (FIX 3)
    │
    ▼  (on "Continue Workflow")
workflow-confirm.ts  ← FIX 3
    │  reads PendingCredentialStore → calls CredentialInjector
    ▼
CredentialInjector (credential-injector.ts)  ← FIX 3
    │  uses UnifiedNodeRegistry.credentialSchema
    ▼
Supabase (persisted workflow with injected credentials)
```

The `UnifiedNodeRegistry` (`unified-node-registry.ts`) is the single source of truth for all node definitions. All four fixes are registry-driven: no hardcoded node-type names appear in pipeline logic.

---

## Components and Interfaces

### Requirement 4 / Requirement 1: `UnifiedNodeRegistry.isUtilityNode()`

New method on `UnifiedNodeRegistry`:

```typescript
isUtilityNode(nodeType: string): boolean
```

Classification rules (in priority order):
1. Resolve `nodeType` through the alias map to its canonical form.
2. Look up the `UnifiedNodeDefinition` in the registry.
3. Return `true` if `definition.category === 'utility'`.
4. Return `true` if `definition.tags` includes any of `['logging', 'debug', 'side-effect', 'internal']`.
5. Return `false` for all other nodes (including unknown types — fail safe).

This method is the single authority for utility classification. No other file may maintain its own list of utility node type strings.

### Requirement 2: `UnifiedNodeRegistry.getBuildValueContext()`

New method on `UnifiedNodeRegistry`:

```typescript
interface BuildValueContext {
  upstreamFields: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  targetFields: Array<{
    name: string;
    role: NodeInputField['role'];
    type: string;
    fillMode: NodeInputField['fillMode'];
    essentialForExecution: boolean;
    supportsBuildtimeAI: boolean;
  }>;
}

getBuildValueContext(
  targetNodeType: string,
  upstreamNodeType: string | undefined,
): BuildValueContext
```

Implementation:
- `upstreamFields`: derived from `unifiedNodeRegistry.get(upstreamNodeType)?.outputSchema.default.schema.properties` — the flat property map of the upstream node's default output port.
- `targetFields`: derived from `unifiedNodeRegistry.get(targetNodeType)?.inputSchema` — filtered to fields where `fillMode.default === 'buildtime_ai_once'` and `ownership !== 'credential'`.

### Requirement 1: `SystemPromptBuilder.buildNodeSelectionPrompt()` changes

The existing `buildNodeSelectionPrompt()` in `system-prompt-builder.ts` already contains a "STRICTLY MINIMAL" section. The fix strengthens it with:

1. An explicit list of node types that are **never** acceptable unless the user's words contain specific keywords (e.g., `log_output` requires "log", "debug", "monitor"; `text_formatter` requires "format text", "reformat").
2. A new constraint block: `## CRITICAL RULE — NEVER ADD UTILITY NODES` that calls out `isUtilityNode`-classified types by category name (not by hardcoded type string).

### Requirement 1: `AiFirstPipeline` intent filter changes

The existing intent filter at ~line 180 of `ai-first-pipeline.ts` already removes nodes not grounded in the user's intent. The fix adds a second filter pass after the intent filter:

```typescript
// After existing intent filter:
selectedForGraph = selectedForGraph.filter((sel) => {
  if (!unifiedNodeRegistry.isUtilityNode(sel.type)) return true;
  // Utility node: only keep if user prompt explicitly mentions it
  const nodeLabel = String(nodeDef?.label || sel.type).toLowerCase();
  return promptLower.includes(nodeLabel) || intentActions.some(a => a.includes(nodeLabel));
});
```

This is additive — it does not replace the existing filter.

### Requirement 1: `WorkflowDSLCompiler` filter changes

The existing filter in `workflow-dsl-compiler.ts` (lines ~140–175) checks for `filter`/`merge` tags using string matching. The fix replaces the tag-string check with `unifiedNodeRegistry.isUtilityNode()`:

```typescript
// Before (hardcoded tag check):
const isFilterOrMerge = nodeDef && (
  (nodeDef.tags || []).some(tag => ['filter', 'merge'].includes(tag.toLowerCase())) ||
  nodeType.toLowerCase().includes('filter') ||
  nodeType.toLowerCase().includes('merge')
);

// After (registry-driven):
const isUtility = unifiedNodeRegistry.isUtilityNode(nodeType);
if (hasEmptyConfig && isUtility) { ... }
```

### Requirement 2: `PropertyPopulationStage` changes

The existing stage calls the LLM with field metadata but does not pass upstream schema context. The fix adds:

1. **Upstream node resolution**: Before the LLM call for each node, find the immediately preceding node in `workflow.nodes` (by edge traversal or positional order) and call `getBuildValueContext(nodeType, upstreamNodeType)`.

2. **Enriched LLM prompt**: The `userMessage` is extended with:
   ```
   UPSTREAM_OUTPUT_FIELDS (use {{$json.<field>}} to reference these in long_body fields):
     - <field>: <type> — <description>
   
   FIELD_ROLES:
     - <fieldName>: role=<role>, essential=<bool>
   ```

3. **Post-LLM enforcement**: After parsing the LLM response, apply two hard rules before writing to config:
   - For any field where `fillMode.supportsBuildtimeAI === false`: skip (use registry default).
   - For any field where `fillMode.default === 'runtime_ai'`: skip (leave empty).

4. **`long_body` template enforcement**: For fields with `role === 'long_body'`, if the LLM response does not contain `{{$json.` syntax, the stage appends a `{{$json.<first_upstream_field>}}` reference to the generated value.

### Requirement 3: `PendingCredentialStore`

New file: `worker/src/services/ai/pending-credential-store.ts`

```typescript
interface PendingCredentials {
  // provider → { fieldName → value }
  [provider: string]: Record<string, string>;
}

class PendingCredentialStore {
  private store: Map<string, PendingCredentials> = new Map();

  set(workflowId: string, provider: string, fields: Record<string, string>): void
  get(workflowId: string): PendingCredentials | undefined
  clear(workflowId: string): void
  has(workflowId: string): boolean
}

export const pendingCredentialStore = new PendingCredentialStore();
```

Keyed by `workflowId`. Values are a nested map of `provider → { fieldName → value }`. The store is in-memory (process lifetime); it is cleared after successful workflow confirmation.

### Requirement 3: `POST /api/workflow/credentials` endpoint

New file: `worker/src/api/workflow-credentials.ts`

```typescript
// POST /api/workflow/credentials
// Body: { workflowId: string, provider: string, fields: Record<string, string> }
// Response: { ok: true } | { error: string }
export async function saveWorkflowCredentials(req: Request, res: Response): Promise<void>
```

This endpoint writes to `pendingCredentialStore`. It does not validate credential values — validation happens at confirm time.

### Requirement 3: `workflow-confirm.ts` changes

Before the existing `updateWorkflowStateInDatabase` call on the approval path, insert:

```typescript
// Read pending credentials
const pending = pendingCredentialStore.get(workflowId);
if (pending && Object.keys(pending).length > 0) {
  // Validate no empty required fields
  const emptyFields = findEmptyRequiredCredentialFields(workflow, pending);
  if (emptyFields.length > 0) {
    return res.status(400).json({ error: 'Missing credential fields', fields: emptyFields });
  }
  // Inject credentials using registry-driven injector
  const injectionResult = credentialInjector.injectCredentials(workflow, pending, requiredCredentials);
  if (!injectionResult.success) {
    return res.status(400).json({ error: 'Credential injection failed', errors: injectionResult.errors });
  }
  workflow = injectionResult.workflow;
}
```

After successful DB write: `pendingCredentialStore.clear(workflowId)`.

### Requirement 3: `CredentialInjector` changes

Replace the hardcoded `fieldMap` in `getCredentialFieldName()` with a registry lookup:

```typescript
private getCredentialFieldName(nodeType: string, provider: string): string {
  const nodeDef = unifiedNodeRegistry.get(nodeType);
  const credFields = nodeDef?.credentialSchema?.credentialFields;
  if (credFields && credFields.length > 0) return credFields[0];
  return 'credentialId'; // fallback
}
```

### Requirement 3: `CredentialDetector` changes

Replace the hardcoded `credentialMap` in `detectNodeCredentials()` with a registry lookup:

```typescript
private detectNodeCredentials(node: WorkflowStructure['nodes'][0]): RequiredCredential | null {
  const nodeType = node.type;
  const nodeDef = unifiedNodeRegistry.get(nodeType);
  const credSchema = nodeDef?.credentialSchema;
  if (!credSchema || credSchema.requirements.length === 0) return null;

  const req = credSchema.requirements[0];
  const fields = credSchema.credentialFields || [];
  return {
    provider: req.provider,
    fields,
    node_id: node.id,
    node_type: nodeType,
  };
}
```

---

## Data Models

### `BuildValueContext`

```typescript
interface BuildValueContext {
  upstreamFields: Array<{
    name: string;       // e.g. "subject", "body", "status"
    type: string;       // e.g. "string", "number"
    description?: string;
  }>;
  targetFields: Array<{
    name: string;
    role: 'title_like' | 'long_body' | 'short_summary' | 'raw_json' | 'id' | 'config' | 'prompt' | 'recipient' | 'content';
    type: string;
    fillMode: NodeInputField['fillMode'];
    essentialForExecution: boolean;
    supportsBuildtimeAI: boolean;
  }>;
}
```

### `PendingCredentials` (in-memory store value)

```typescript
// Map<workflowId, { [provider]: { [fieldName]: value } }>
type PendingCredentials = Record<string, Record<string, string>>;
```

### `POST /api/workflow/credentials` request body

```typescript
interface SaveCredentialsRequest {
  workflowId: string;
  provider: string;
  fields: Record<string, string>; // fieldName → value
}
```

### `UnifiedNodeDefinition` additions (no schema change needed)

The existing `credentialSchema.credentialFields: string[]` field is already defined in `NodeCredentialSchema`. The fix ensures it is populated during `extractCredentialSchema()` in the registry initialization, so `CredentialInjector` and `CredentialDetector` can read it.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: isUtilityNode classification is registry-driven

*For any* node type registered in the `UnifiedNodeRegistry` with `category === 'utility'` or with tags including any of `['logging', 'debug', 'side-effect', 'internal']`, `isUtilityNode(nodeType)` SHALL return `true`; for all other registered node types, it SHALL return `false`.

**Validates: Requirements 1.7, 4.1, 4.2**

### Property 2: Node selection excludes utility nodes for non-utility prompts

*For any* user prompt that does not contain explicit utility/logging keywords (e.g., "log", "debug", "monitor", "set variable", "format text"), the `Node_Selection_Stage` output SHALL contain no node types for which `isUtilityNode()` returns `true`.

**Validates: Requirements 1.1, 1.2, 4.3**

### Property 3: DSL compiler filters utility nodes with empty configs

*For any* `WorkflowDSL` containing a node whose type satisfies `isUtilityNode()` and whose config is empty, the compiled workflow SHALL NOT contain that node.

**Validates: Requirements 1.4, 4.4**

### Property 4: fillMode gates are respected during property population

*For any* node in the workflow, after the `PropertyPopulationStage` runs:
- Every field where `fillMode.supportsBuildtimeAI === false` SHALL have a value equal to the registry default (or be absent).
- Every field where `fillMode.default === 'runtime_ai'` SHALL be absent or empty in the populated config.

**Validates: Requirements 2.4, 2.5**

### Property 5: Essential buildtime-AI fields are always populated

*For any* node with a field where `essentialForExecution === true` AND `fillMode.supportsBuildtimeAI === true`, the `PropertyPopulationStage` SHALL produce a non-empty value for that field.

**Validates: Requirement 2.8**

### Property 6: long_body fields reference upstream schema fields

*For any* node with a `long_body` field that is eligible for build-time AI population, the generated value SHALL contain at least one `{{$json.<field>}}` reference where `<field>` is a key present in the upstream node's `outputSchema.default.schema.properties`.

**Validates: Requirement 2.7**

### Property 7: getBuildValueContext round-trip correctness

*For any* valid `(targetNodeType, upstreamNodeType)` pair where both types exist in the registry, `getBuildValueContext(targetNodeType, upstreamNodeType)` SHALL return:
- `upstreamFields` whose names are a subset of the keys in `unifiedNodeRegistry.get(upstreamNodeType).outputSchema.default.schema.properties`.
- `targetFields` whose names are a subset of the keys in `unifiedNodeRegistry.get(targetNodeType).inputSchema` filtered to `buildtime_ai_once` fields.

**Validates: Requirements 2.2, 2.3, 2.9**

### Property 8: PendingCredentialStore retention

*For any* set of `(workflowId, provider, fields)` tuples written to `PendingCredentialStore`, all tuples SHALL be retrievable via `store.get(workflowId)` until `store.clear(workflowId)` is called.

**Validates: Requirement 3.2**

### Property 9: Credential injection uses registry field names

*For any* node type with a `credentialSchema` in the `UnifiedNodeRegistry`, after `CredentialInjector.injectCredentials()` runs, the injected config fields SHALL match the field names listed in `credentialSchema.credentialFields` — not hardcoded strings.

**Validates: Requirements 3.4, 3.5**

### Property 10: CredentialDetector derives fields from registry

*For any* node type registered in the `UnifiedNodeRegistry` with a non-empty `credentialSchema`, `CredentialDetector.detectCredentials()` SHALL return a `RequiredCredential` whose `fields` array exactly matches `credentialSchema.credentialFields`. For node types with no `credentialSchema`, no credential SHALL be returned.

**Validates: Requirement 3.9**

### Property 11: PendingCredentialStore is cleared after successful confirmation

*For any* `workflowId` for which `workflow-confirm.ts` successfully persists the workflow to the database, `pendingCredentialStore.get(workflowId)` SHALL return `undefined` or an empty object immediately after the handler completes.

**Validates: Requirement 3.8**

---

## Error Handling

### Node Selection (Requirement 1)

- If `isUtilityNode()` throws (e.g., registry not initialized), the filter is skipped and a warning is logged — the pipeline continues with the unfiltered selection. This matches the existing soft-failure pattern in the intent filter.
- If the LLM returns a node type not in the registry, it is discarded and a warning is logged (existing behavior, unchanged).

### Property Population (Requirement 2)

- The stage is already soft-failing per node. The new `getBuildValueContext()` call is wrapped in the existing per-node try/catch. If it throws, the node falls back to `defaultConfig()`.
- If the LLM generates a `long_body` value without `{{$json.*}}` syntax, the stage appends a reference rather than rejecting the value — this avoids blocking the pipeline.

### Credential Persistence (Requirement 3)

- `POST /api/workflow/credentials` returns `400` if `workflowId` or `provider` is missing.
- `workflow-confirm.ts` returns `400` if any required credential field is an empty string in the store (Requirement 3.7).
- `workflow-confirm.ts` returns `400` if `CredentialInjector.injectCredentials()` fails.
- If `pendingCredentialStore.clear()` fails (should not happen for an in-memory Map), the error is logged but does not affect the response — the workflow is already persisted.
- If no pending credentials exist for a `workflowId`, the confirm handler proceeds as before (backward compatible).

### Registry Methods (Requirement 4)

- `isUtilityNode()` for an unknown node type returns `false` (fail-safe: unknown nodes are not classified as utility).
- `getBuildValueContext()` for an unknown node type returns `{ upstreamFields: [], targetFields: [] }` (empty context, LLM falls back to intent-only generation).

---

## Testing Strategy

### Unit Tests

- `UnifiedNodeRegistry.isUtilityNode()`: test with nodes of category `utility`, nodes with tags `logging`/`debug`/`side-effect`/`internal`, nodes with neither, and unknown types.
- `UnifiedNodeRegistry.getBuildValueContext()`: test with known node pairs (e.g., `google_sheets` → `google_gmail`), unknown upstream, unknown target.
- `PendingCredentialStore`: test `set`, `get`, `clear`, `has` with multiple workflowIds and providers.
- `CredentialInjector.injectCredentials()`: test that field names come from registry, not hardcoded map.
- `CredentialDetector.detectNodeCredentials()`: test that fields come from registry `credentialSchema`.
- `PropertyPopulationStage`: test that `runtime_ai` fields are skipped, `supportsBuildtimeAI=false` fields use defaults, `long_body` fields get `{{$json.*}}` references.

### Property-Based Tests

Use a property-based testing library (e.g., `fast-check` for TypeScript). Each property test runs a minimum of 100 iterations.

- **Property 1** (`isUtilityNode` classification): Generate arbitrary node definitions with varying categories and tags, register them, verify `isUtilityNode()` returns the correct boolean. Tag: `Feature: workflow-generation-quality-fix, Property 1: isUtilityNode classification is registry-driven`

- **Property 2** (node selection excludes utility nodes): Generate arbitrary non-utility prompts (no utility keywords), run node selection with mocked LLM returning utility nodes, verify the post-selection filter removes them. Tag: `Feature: workflow-generation-quality-fix, Property 2: Node selection excludes utility nodes for non-utility prompts`

- **Property 3** (DSL compiler filters utility nodes): Generate arbitrary DSLs with utility nodes (empty config), compile, verify utility nodes absent. Tag: `Feature: workflow-generation-quality-fix, Property 3: DSL compiler filters utility nodes with empty configs`

- **Property 4** (fillMode gates): Generate arbitrary node configs with mixed fillMode fields, run property population with mocked LLM, verify `runtime_ai` and `supportsBuildtimeAI=false` fields are not overwritten. Tag: `Feature: workflow-generation-quality-fix, Property 4: fillMode gates are respected during property population`

- **Property 5** (essential fields populated): Generate arbitrary workflows with essential+buildtime-AI fields, run property population, verify non-empty values. Tag: `Feature: workflow-generation-quality-fix, Property 5: Essential buildtime-AI fields are always populated`

- **Property 6** (`long_body` template references): Generate arbitrary node pairs where the target has `long_body` fields, run property population, verify `{{$json.*}}` references appear. Tag: `Feature: workflow-generation-quality-fix, Property 6: long_body fields reference upstream schema fields`

- **Property 7** (`getBuildValueContext` round-trip): Generate arbitrary valid node type pairs from the registry, call `getBuildValueContext`, verify field names are subsets of the respective schemas. Tag: `Feature: workflow-generation-quality-fix, Property 7: getBuildValueContext round-trip correctness`

- **Property 8** (store retention): Generate arbitrary sets of credential tuples, write to store, verify all are retrievable. Tag: `Feature: workflow-generation-quality-fix, Property 8: PendingCredentialStore retention`

- **Property 9** (credential injection uses registry): Generate arbitrary node types with credentialSchema, inject credentials, verify field names match registry. Tag: `Feature: workflow-generation-quality-fix, Property 9: Credential injection uses registry field names`

- **Property 10** (CredentialDetector from registry): For all node types in the registry, verify `detectCredentials` output matches `credentialSchema.credentialFields`. Tag: `Feature: workflow-generation-quality-fix, Property 10: CredentialDetector derives fields from registry`

- **Property 11** (store cleared after confirmation): Generate arbitrary workflowIds, confirm workflow, verify store is cleared. Tag: `Feature: workflow-generation-quality-fix, Property 11: PendingCredentialStore is cleared after successful confirmation`

### Integration Tests

- End-to-end: generate a workflow from a simple prompt (e.g., "send a Slack message when a form is submitted"), verify no utility nodes appear in the output.
- End-to-end: generate a workflow, enter credentials in the credential panel (via `POST /api/workflow/credentials`), confirm, verify the persisted workflow contains the credential fields.
- `workflow-confirm.ts` with empty credential fields: verify `400` response.

### Smoke Tests

- Server starts with `PendingCredentialStore` initialized.
- `POST /api/workflow/credentials` route is registered and reachable.
- `UnifiedNodeRegistry.isUtilityNode` and `getBuildValueContext` are callable without errors on startup.
