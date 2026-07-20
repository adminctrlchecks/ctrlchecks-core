# Design Document

## Overview

This design fixes two interconnected problems in the field ownership system and ensures AI Runtime resolution works correctly by default — no environment flags required.

**Problem 1 — Toggle doesn't reflect AI-set modes:**
`intelligent-config-filler.ts` writes ownership state to `_fieldModes` but `PropertiesPanel.tsx` reads from `_fillMode`. These are different keys. The fix is to remove `_fieldModes` entirely and have every writer use `_fillMode`.

**Problem 2 — AI Runtime is disabled by default:**
`ai-input-resolver.ts` has a kill switch: `if (process.env.ENABLE_RUNTIME_AI_RESOLUTION !== 'true') return { mode: 'json', value: {} }`. This means runtime AI resolution never runs unless the operator manually sets an env var. The fix is to remove the kill switch entirely — runtime resolution is always on.

The `property-population-stage.ts` already correctly stamps `_fillMode` when it writes AI-built values. The `dynamic-node-executor.ts` already calls `resolveInputsWithAI()` for `runtime_ai` fields. The core fixes are surgical: one key rename and one kill switch removal.

---

## Architecture

### Field Ownership Data Flow

```
Workflow Generation (build time)
─────────────────────────────────────────────────────────────────────
property-population-stage.ts
  └─ fills buildtime_ai_once fields via LLM
  └─ stamps node.data.config._fillMode[fieldName] = 'buildtime_ai_once'  ✅ already correct

intelligent-config-filler.ts
  └─ fills buildtime_ai_once fields via upstream key binding
  └─ currently writes _fieldModes[fieldName]  ❌ BUG — must write _fillMode[fieldName]

plan-driven-workflow-builder.ts
  └─ stamps _fillMode[fieldName] = 'runtime_ai' for missing required fields  ✅ already correct

field-ownership-stage.ts
  └─ reads fillMode.default from registry per field
  └─ builds fieldOwnershipMap (nodeId → fieldName → FieldFillMode)

backend-finalizer.ts
  └─ converts fieldOwnershipMap to FieldOwnershipMap (mode: 'ai_built' | 'ai_runtime' | 'user')
  └─ seals into buildManifest.fieldOwnershipSnapshot

UI (PropertiesPanel.tsx)
  └─ reads node.data.config._fillMode[fieldName]  ← single source of truth
  └─ currentFillMode = fillModeMap[field.key] ?? (hasAiValue ? 'buildtime_ai_once' : 'manual_static')
  └─ renders active button: You / AI (build) / AI (runtime)

Workflow Execution (runtime)
─────────────────────────────────────────────────────────────────────
dynamic-node-executor.ts
  └─ buildEffectiveFillModes() reads config._fillMode to get per-field modes
  └─ for runtime_ai fields → calls resolveInputsWithAI()
  └─ resolveInputsWithAI() → imports aiInputResolver.resolveInput()

ai-input-resolver.ts
  └─ currently gated by ENABLE_RUNTIME_AI_RESOLUTION env var  ❌ BUG — remove gate
  └─ calls LLM with: previousOutput + userIntent + nodeInputSchema
  └─ returns ResolvedInput { mode, value }
```

---

## Component Design

### Fix 1: `intelligent-config-filler.ts` — Write `_fillMode` not `_fieldModes`

**File:** `worker/src/services/ai/intelligent-config-filler.ts`

**Current (broken):**
```typescript
filled._fieldModes = Object.fromEntries(
  Object.entries(inputSchema as Record<string, any>).map(([name, field]: [string, any]) => [
    name,
    field?.fillMode?.default ?? 'manual_static',
  ])
);
```

**Fixed:**
```typescript
// Stamp _fillMode for every field so the UI toggle reflects the correct mode.
// This is the canonical key read by PropertiesPanel.tsx.
const existingFillMode = typeof (filled as any)._fillMode === 'object' && (filled as any)._fillMode !== null
  ? { ...(filled as any)._fillMode }
  : {};

for (const [name, field] of Object.entries(inputSchema as Record<string, any>)) {
  // Only stamp if not already set by a prior stage (e.g. property-population-stage)
  if (existingFillMode[name] === undefined) {
    existingFillMode[name] = (field as any)?.fillMode?.default ?? 'manual_static';
  }
}
filled._fillMode = existingFillMode;
// Remove legacy key to prevent confusion
delete (filled as any)._fieldModes;
```

**Why:** The UI reads `_fillMode`. Writing to `_fieldModes` is invisible to the toggle. The fix stamps `_fillMode` while preserving any entries already written by `property-population-stage.ts` (which correctly stamps `buildtime_ai_once` for fields it fills).

---

### Fix 2: `ai-input-resolver.ts` — Remove the kill switch

**File:** `worker/src/core/ai-input-resolver.ts`

**Current (broken):**
```typescript
async resolveInput(context: InputResolutionContext): Promise<ResolvedInput> {
  // Kill switch: runtime AI resolution is expensive (1 Gemini call per field).
  // Disable by default; enable only when ENABLE_RUNTIME_AI_RESOLUTION=true in .env.
  if (process.env.ENABLE_RUNTIME_AI_RESOLUTION !== 'true') {
    return { mode: 'json', value: {} };
  }
  // ... rest of resolution logic
}
```

**Fixed:**
```typescript
async resolveInput(context: InputResolutionContext): Promise<ResolvedInput> {
  // Runtime AI resolution is always enabled.
  // Fields marked runtime_ai in _fillMode are resolved here using upstream context + user intent.
  const { previousOutput, nodeInputSchema, userIntent, nodeType, nodeLabel } = context;
  // ... rest of resolution logic unchanged
}
```

**Why:** The kill switch was added as a cost-control measure but it silently breaks the entire `runtime_ai` feature. The `dynamic-node-executor.ts` already has its own `runtimeAutofillEnabled()` guard and budget checks. The kill switch in `ai-input-resolver.ts` is redundant and harmful.

---

### Fix 3: `field-ownership-stage.ts` — Sync `_fillMode` into node config

**File:** `worker/src/services/ai/stages/field-ownership-stage.ts`

The field ownership stage currently only builds the `fieldOwnershipMap` for the build manifest. It does not write `_fillMode` back into node configs. This means nodes that were not processed by `property-population-stage.ts` (e.g. trigger nodes, nodes with no `buildtime_ai_once` fields) never get their `_fillMode` stamped.

**Addition:** After building `fieldOwnershipMap`, write the registry-derived fill modes into each node's config as `_fillMode`, preserving any existing entries:

```typescript
// After building fieldOwnershipMap, sync _fillMode into node configs
for (const node of workflow.nodes) {
  const nodeId = node.id;
  const nodeFields = fieldOwnershipMap[nodeId];
  if (!nodeFields) continue;

  const config = (node.data?.config && typeof node.data.config === 'object')
    ? node.data.config as Record<string, any>
    : {};

  const existing = typeof config._fillMode === 'object' && config._fillMode !== null
    ? { ...config._fillMode }
    : {};

  for (const [fieldName, fillMode] of Object.entries(nodeFields)) {
    // Only stamp registry default if not already set by a prior stage
    if (existing[fieldName] === undefined) {
      existing[fieldName] = fillMode;
    }
  }

  node.data.config = { ...config, _fillMode: existing };
}
```

**Why:** This ensures every node has `_fillMode` populated before the workflow is delivered to the UI, even for nodes that `property-population-stage.ts` skipped.

---

### No Changes Required

The following components are already correct and need no modification:

- **`property-population-stage.ts`** — already stamps `_fillMode[fieldName] = 'buildtime_ai_once'` for every AI-written field (lines 405–430).
- **`plan-driven-workflow-builder.ts`** — already stamps `_fillMode[fieldName] = 'runtime_ai'` for missing required fields.
- **`dynamic-node-executor.ts`** — already reads `config._fillMode` via `buildEffectiveFillModes()` and calls `resolveInputsWithAI()` for `runtime_ai` fields.
- **`PropertiesPanel.tsx`** — already reads `_fillMode` and renders the correct toggle state.
- **`backend-finalizer.ts`** — already converts `fieldOwnershipMap` to the typed `FieldOwnershipMap` with `mode: 'ai_built' | 'ai_runtime' | 'user'`.
- **`unified-node-registry.ts`** — already defines `fillMode.default`, `fillMode.supportsRuntimeAI`, and `fillMode.supportsBuildtimeAI` per field.

---

## Data Structures

### `_fillMode` in node config (canonical)

```typescript
// node.data.config._fillMode
type FillModeMap = Record<string, 'manual_static' | 'buildtime_ai_once' | 'runtime_ai'>;
```

This is the single source of truth for field ownership at the node level. Written by:
1. `property-population-stage.ts` — for AI-filled build-time fields
2. `intelligent-config-filler.ts` — for all fields (registry defaults)
3. `field-ownership-stage.ts` — for all fields (registry defaults, final sync)
4. `plan-driven-workflow-builder.ts` — for runtime_ai fields on missing required inputs
5. User interaction via `PropertiesPanel.tsx` → `handleFillModeChange()`

### `fieldOwnershipMap` in build manifest

```typescript
// buildManifest.fieldOwnershipSnapshot
type FieldOwnershipSnapshot = Record<string, Record<string, string>>; // nodeId → fieldName → fillMode string

// Stage3Output.fieldOwnershipMap (typed)
type FieldOwnershipMap = Record<string, Record<string, {
  mode: 'user' | 'ai_built' | 'ai_runtime';
  fillMode: FieldFillMode;
  ownership: 'value' | 'structural' | 'credential';
}>>;
```

The build manifest snapshot is frozen after Stage 3 and used by the UI to restore AI-built values when the user clicks "AI (build)" after having switched to "You".

---

## Execution Flow: AI Runtime Resolution

When a workflow executes and a node has `runtime_ai` fields:

```
1. dynamic-node-executor.ts: executeNode(node, context)
   └─ buildEffectiveFillModes(definition.inputSchema, config)
      └─ reads config._fillMode per field
      └─ returns effectiveFillModes map

2. getRequiredRuntimeFields(inputSchema, effectiveFillModes)
   └─ returns fields where effectiveFillModes[field] === 'runtime_ai'

3. For each runtime_ai field with missing/empty value:
   └─ resolveInputsWithAI(nodeOutputs, aiSchema, config, ...)
      └─ imports aiInputResolver (dynamic import)
      └─ aiInputResolver.resolveInput({
           previousOutput,        // actual upstream node output
           nodeInputSchema,       // field schema from registry
           userIntent,            // workflow intent string
           nodeType,
         })
      └─ returns ResolvedInput { mode: 'message' | 'message+json' | 'json', value }

4. Resolved value merged into resolvedInputs
   └─ inputSources[fieldName] = 'runtime_ai'

5. Node executes with resolved config
   └─ output stored in ExecutionContext.nodeOutputs
   └─ downstream nodes receive output normally
```

---

## Output Shape Determination

The `AIInputResolver.determineResolutionMode()` already derives output shape from the field schema — not from node type. The logic:

| Field schema has... | Output shape |
|---|---|
| message/text/content/body field + object/array field + object upstream | `message+json` |
| message/text/content/body field only | `message` |
| object/array/json fields only | `json` |

This is registry-driven and requires no per-node-type hardcoding.

---

## UI Toggle Behavior

After the fixes, the toggle in `PropertiesPanel.tsx` works as follows:

| `_fillMode[fieldName]` | Active button | Input shown? |
|---|---|---|
| `manual_static` (or absent) | **You** | Yes — editable |
| `buildtime_ai_once` | **AI (build)** | Yes — shows AI value, editable |
| `runtime_ai` | **AI (runtime)** | No — shows "Filled automatically by AI at runtime" banner |

The `currentFillMode` derivation in `PropertiesPanel.tsx` (line 2351–2354) already handles this correctly once `_fillMode` is populated:

```typescript
const currentFillMode =
  (fillModeMap[field.key] as FieldFillMode | undefined) ??
  (hasAiValue ? 'buildtime_ai_once' : 'manual_static');
```

The `??` fallback to `hasAiValue ? 'buildtime_ai_once' : 'manual_static'` is a safety net for nodes that somehow still lack `_fillMode`. After the fixes, `_fillMode` will always be present, so the fallback is rarely needed.

---

## Files to Modify

| File | Change | Scope |
|---|---|---|
| `worker/src/services/ai/intelligent-config-filler.ts` | Replace `_fieldModes` write with `_fillMode` write | ~10 lines |
| `worker/src/core/ai-input-resolver.ts` | Remove `ENABLE_RUNTIME_AI_RESOLUTION` kill switch | ~4 lines |
| `worker/src/services/ai/stages/field-ownership-stage.ts` | Add `_fillMode` sync into node configs after building map | ~20 lines |

---

## Testing

### Property-Based Tests

1. **Toggle consistency property:** For any workflow generated by the AI pipeline, every field in every node that has a non-`manual_static` registry `fillMode.default` SHALL have a matching `_fillMode` entry in `node.data.config._fillMode`. No field with an AI-generated value shall have `_fillMode` absent or set to `manual_static`.

2. **Kill switch removal property:** For any `runtime_ai` field with a non-empty upstream context, `aiInputResolver.resolveInput()` SHALL return a non-empty `ResolvedInput.value`. The empty `{ mode: 'json', value: {} }` response SHALL only occur on genuine LLM failure, not as a default.

3. **Round-trip property:** For any field resolved by `AIInputResolver`, parsing the `OUTPUT_SHAPE` descriptor then re-serializing the `Resolved_Value` then parsing it again SHALL produce an equivalent value.

4. **No `_fieldModes` property:** After the fix, no node config in any generated workflow SHALL contain a `_fieldModes` key. All ownership state SHALL be in `_fillMode`.

### Unit Tests

- `intelligent-config-filler.test.ts`: Assert `filled._fillMode` is set and `filled._fieldModes` is absent after `fillNodeConfig()`.
- `ai-input-resolver.test.ts`: Assert `resolveInput()` proceeds to LLM call without checking `ENABLE_RUNTIME_AI_RESOLUTION`.
- `field-ownership-stage.test.ts`: Assert each node in the workflow has `_fillMode` populated after `runFieldOwnershipStage()`.
- `property-population-stage.test.ts`: Assert `_fillMode` entries from property population are preserved (not overwritten) by field ownership stage.
