# Planner to Intent Mapping Fix

## Problem

Planner returns separate fields:
- `data_sources` - Services used to READ data
- `actions` - Services used to CREATE/UPDATE/SEND
- `transformations` - Logic operations

But StructuredIntent only had `actions`, causing incorrect merging where:
- `planner.data_sources` was incorrectly merged into `intent.actions`
- `planner.transformations` was incorrectly merged into `intent.actions`
- Planner's intended separation was lost

## Solution

### 1. Extended StructuredIntent Interface

**File**: `worker/src/services/ai/intent-structurer.ts`

Added optional fields to preserve planner output:

```typescript
export interface StructuredIntent {
  trigger: string;
  trigger_config?: { ... };
  actions: Array<{ ... }>;           // Outputs/write operations
  dataSources?: Array<{ ... }>;       // ✅ NEW: Read operations from planner
  transformations?: Array<{ ... }>;   // ✅ NEW: Transformations from planner
  conditions?: Array<{ ... }>;
  requires_credentials: string[];
}
```

### 2. Created Planner-to-Intent Converter

**File**: `worker/src/services/ai/planner-to-intent-converter.ts` (NEW)

Converts `WorkflowSpec` to `StructuredIntent` with correct field mapping:

```typescript
export function convertPlannerSpecToIntent(spec: WorkflowSpec): StructuredIntent {
  // Map data_sources → dataSources (preserve separately)
  const dataSources = spec.data_sources.map((ds) => {
    const parts = ds.split('.');
    return {
      type: parts[0],
      operation: parts[1] || 'read',
      config: {},
    };
  });

  // Map actions → actions (preserve separately)
  const actions = spec.actions.map((action) => {
    const parts = action.split('.');
    return {
      type: parts[0],
      operation: parts[1] || 'create',
      config: {},
    };
  });

  // Map transformations → transformations (preserve separately)
  const transformations = spec.transformations.map((tf) => {
    // Map transformation strings to node types
    // ...
  });

  return {
    trigger: mapTriggerType(spec.trigger),
    actions,
    dataSources: dataSources.length > 0 ? dataSources : undefined,
    transformations: transformations.length > 0 ? transformations : undefined,
    requires_credentials: [...],
  };
}
```

**Key Rules**:
- ✅ `planner.data_sources` → `intent.dataSources` (separate field)
- ✅ `planner.actions` → `intent.actions` (separate field)
- ✅ `planner.transformations` → `intent.transformations` (separate field)
- ❌ **DO NOT** merge data_sources into actions
- ❌ **DO NOT** merge transformations into actions

### 3. Updated DSLGenerator to Handle Separate Fields

**File**: `worker/src/services/ai/workflow-dsl.ts`

DSLGenerator now processes all three fields separately:

```typescript
// ✅ NEW: Process dataSources from StructuredIntent (if planner provided them separately)
if (intent.dataSources && intent.dataSources.length > 0) {
  for (const ds of intent.dataSources) {
    if (this.isDataSource(ds.type, ds.operation)) {
      dataSources.push({ ... });
    }
  }
}

// ✅ NEW: Process transformations from StructuredIntent (if planner provided them separately)
if (intent.transformations && intent.transformations.length > 0) {
  for (const tf of intent.transformations) {
    if (this.isTransformation(tf.type, tf.operation)) {
      transformations.push({ ... });
    }
  }
}

// Process actions (these are outputs/write operations from planner)
for (const action of intent.actions || []) {
  // Categorize as output/transformation/dataSource
  // ...
}
```

**Processing Order**:
1. Process `intent.dataSources` → DSL `dataSources`
2. Process `intent.transformations` → DSL `transformations`
3. Process `intent.actions` → DSL `outputs` (or categorize based on capabilities)

### 4. Integrated Converter into Pipeline

**File**: `worker/src/services/ai/workflow-pipeline-orchestrator.ts`

Pipeline now checks for planner output and converts it:

```typescript
// ✅ NEW: Check if planner output is available and convert it to StructuredIntent
let structuredIntent: StructuredIntent | undefined = undefined;

try {
  const { planWorkflowSpecFromPrompt } = await import('./smart-planner-adapter');
  const plannerSpec = await planWorkflowSpecFromPrompt(userPrompt);
  if (plannerSpec) {
    const { convertPlannerSpecToIntent } = await import('./planner-to-intent-converter');
    structuredIntent = convertPlannerSpecToIntent(plannerSpec);
    console.log(`✅ Converted planner spec: ${structuredIntent.dataSources?.length || 0} dataSources, ${structuredIntent.actions.length} actions, ${structuredIntent.transformations?.length || 0} transformations`);
  }
} catch (error) {
  console.warn(`⚠️  Planner conversion failed (non-fatal):`, error);
}

// Fallback to normal intent structuring if planner didn't provide output
if (!structuredIntent) {
  structuredIntent = await intentStructurer.structureIntent(userPrompt);
}
```

### 5. Updated Credential Extraction

**File**: `worker/src/services/ai/intent-structurer.ts`

Credential extraction now checks all fields:

```typescript
private extractCredentials(
  actions: StructuredIntent['actions'],
  dataSources?: StructuredIntent['dataSources'],
  transformations?: StructuredIntent['transformations']
): string[] {
  // Extract from actions
  // Extract from dataSources (if present)
  // Extract from transformations (if present)
}
```

## Mapping Flow

### Before (Incorrect)

```
Planner Output:
  data_sources: ["google_sheets"]
  actions: ["hubspot.create_contact"]
  transformations: ["loop"]

↓ (Incorrect merging)

StructuredIntent:
  actions: [
    { type: "google_sheets", operation: "read" },    // ❌ Wrong: from data_sources
    { type: "hubspot", operation: "create_contact" },
    { type: "loop", operation: "iterate" }          // ❌ Wrong: from transformations
  ]
```

### After (Correct)

```
Planner Output:
  data_sources: ["google_sheets"]
  actions: ["hubspot.create_contact"]
  transformations: ["loop"]

↓ (Correct field mapping)

StructuredIntent:
  dataSources: [
    { type: "google_sheets", operation: "read" }    // ✅ Correct: separate field
  ]
  actions: [
    { type: "hubspot", operation: "create_contact" } // ✅ Correct: separate field
  ]
  transformations: [
    { type: "loop", operation: "iterate" }          // ✅ Correct: separate field
  ]
```

## Files Created/Modified

### Created
1. **`worker/src/services/ai/planner-to-intent-converter.ts`** (127 lines)
   - Converts `WorkflowSpec` to `StructuredIntent`
   - Preserves field separation
   - Maps trigger types correctly

### Modified
1. **`worker/src/services/ai/intent-structurer.ts`**
   - Extended `StructuredIntent` interface with `dataSources?` and `transformations?`
   - Updated `extractCredentials()` to check all fields

2. **`worker/src/services/ai/workflow-dsl.ts`**
   - Processes `intent.dataSources` separately before `intent.actions`
   - Processes `intent.transformations` separately before `intent.actions`
   - Updated action count to include all components

3. **`worker/src/services/ai/workflow-pipeline-orchestrator.ts`**
   - Integrated planner-to-intent converter
   - Uses planner output when available
   - Falls back to normal intent structuring if planner fails

## Verification

✅ **TypeScript compilation**: Passes  
✅ **Linter**: No errors  
✅ **Field mapping**: Correct  
✅ **No merging**: Data sources and transformations preserved separately  
✅ **Backward compatibility**: Existing code still works (fields are optional)

## Example

**Planner Output**:
```json
{
  "trigger": "manual",
  "data_sources": ["google_sheets"],
  "actions": ["hubspot.create_contact"],
  "transformations": ["loop"]
}
```

**StructuredIntent** (after conversion):
```json
{
  "trigger": "manual_trigger",
  "dataSources": [
    { "type": "google_sheets", "operation": "read" }
  ],
  "actions": [
    { "type": "hubspot", "operation": "create_contact" }
  ],
  "transformations": [
    { "type": "loop", "operation": "iterate" }
  ],
  "requires_credentials": ["google_sheets", "hubspot"]
}
```

**DSL Output**:
```json
{
  "dataSources": [
    { "id": "ds_0", "type": "google_sheets", "operation": "read" }
  ],
  "transformations": [
    { "id": "tf_1", "type": "loop", "operation": "iterate" }
  ],
  "outputs": [
    { "id": "out_2", "type": "hubspot", "operation": "create_contact" }
  ]
}
```

✅ **Correct**: Each field is preserved and processed separately!
