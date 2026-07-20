# Pre-Compilation Node Type Validation

## Overview

Added comprehensive node type validation **before DSL compilation** to ensure all node types exist in NodeLibrary. Unknown node types are automatically normalized or resolved to compatible types, with warnings logged. **No unknown node types are allowed to reach the compiler.**

## Implementation

### Location

**File**: `worker/src/services/ai/workflow-dsl-compiler.ts`

**Method**: `validateAndNormalizeNodeTypes(dsl: WorkflowDSL)`

**Integration**: Called at **STEP 0** in `compile()` method, before any DSL structure validation or node creation.

### Validation Process

1. **Collect All Node Types**
   - Trigger type
   - All data source types
   - All transformation types
   - All output types

2. **For Each Node Type**:
   - ✅ **Check if exists in NodeLibrary**
     - If yes → continue (no action needed)
   - ❌ **If not found**:
     - **Step 1**: Attempt normalization using `normalizeNodeType()`
       - Applies explicit semantic mappings (e.g., `ollama_llm` → `ai_chat_model`)
       - Tries exact match, substring matching, token overlap, Levenshtein distance
     - **Step 2**: If normalization fails, try `NodeTypeResolver.resolve()`
       - Uses capability-based lookup
       - Tries alias matching, fuzzy matching
       - Falls back to `ai_chat_model` for AI transformations
     - **Step 3**: If still not found → **ERROR** (compilation fails)
     - **Step 4**: If found → **Replace node type in DSL** and log warning

3. **Final Validation**
   - Ensures no unknown types remain after normalization
   - If any unknown types found → **CRITICAL ERROR** (should never happen)

### Error Handling

- **Errors**: Unknown node types that cannot be normalized or resolved
  - Compilation **fails immediately**
  - Error message includes: node type, category (dataSource/transformation/output), and failure reason

- **Warnings**: Node types that were successfully normalized/resolved
  - Compilation **continues**
  - Warning includes: original type, normalized type, resolution method
  - DSL is updated with normalized types

### Code Flow

```typescript
compile(dsl: WorkflowDSL) {
  // STEP 0: Validate and normalize all node types
  const nodeTypeValidation = this.validateAndNormalizeNodeTypes(dsl);
  if (nodeTypeValidation.errors.length > 0) {
    return { success: false, errors: nodeTypeValidation.errors };
  }
  
  // Use validated DSL (node types may have been normalized)
  const validatedDSL = nodeTypeValidation.dsl;
  
  // Continue with compilation using validatedDSL...
}
```

### Example Scenarios

#### Scenario 1: Unknown Type → Normalized Successfully

**Input DSL**:
```typescript
{
  transformations: [{ type: 'ollama_llm', operation: 'summarize' }]
}
```

**Process**:
1. `ollama_llm` not found in NodeLibrary
2. `normalizeNodeType('ollama_llm')` → `'ai_chat_model'`
3. `ai_chat_model` found in NodeLibrary ✅
4. Replace in DSL, log warning

**Output DSL**:
```typescript
{
  transformations: [{ type: 'ai_chat_model', operation: 'summarize' }]
}
```

**Warning**: `"Node type "ollama_llm" in transformation was normalized to "ai_chat_model" (method: normalized)"`

#### Scenario 2: Unknown Type → Resolved via NodeTypeResolver

**Input DSL**:
```typescript
{
  outputs: [{ type: 'gmail', operation: 'send' }]
}
```

**Process**:
1. `gmail` not found in NodeLibrary
2. `normalizeNodeType('gmail')` → `'gmail'` (no change)
3. `NodeTypeResolver.resolve('gmail')` → `{ resolved: 'google_gmail', method: 'alias' }`
4. `google_gmail` found in NodeLibrary ✅
5. Replace in DSL, log warning

**Output DSL**:
```typescript
{
  outputs: [{ type: 'google_gmail', operation: 'send' }]
}
```

**Warning**: `"Node type "gmail" in output was normalized to "google_gmail" (method: alias)"`

#### Scenario 3: Unknown Type → Cannot Resolve (ERROR)

**Input DSL**:
```typescript
{
  dataSources: [{ type: 'unknown_service', operation: 'read' }]
}
```

**Process**:
1. `unknown_service` not found in NodeLibrary
2. `normalizeNodeType('unknown_service')` → `'unknown_service'` (no change)
3. `NodeTypeResolver.resolve('unknown_service')` → `null` or `{ method: 'not_found' }`
4. Cannot resolve → **ERROR**

**Error**: `"Unknown node type "unknown_service" in dataSource. Cannot normalize or resolve to a compatible type."`

**Result**: Compilation fails immediately

## Benefits

### ✅ Safety
- **No unknown node types reach compiler**
- Prevents runtime errors from invalid node types
- Catches issues early in the pipeline

### ✅ Automatic Recovery
- Normalizes common variations automatically
- Resolves aliases and common typos
- Reduces manual intervention needed

### ✅ Transparency
- Logs all normalization actions
- Warnings show original → normalized mapping
- Easy to debug node type issues

### ✅ Consistency
- All node types validated before compilation
- Same validation logic for all categories
- Centralized validation point

## Integration Points

### Before Compilation
- ✅ **STEP 0**: Node type validation (NEW)
- ✅ **STEP 1**: DSL structure validation
- ✅ **STEP 2+**: Node creation (uses validated DSL)

### Dependencies
- `nodeLibrary`: Checks if node types are registered
- `normalizeNodeType()`: Normalizes node type strings
- `nodeTypeResolver`: Resolves node type aliases and variations

## Testing

### Test Cases

1. **Valid node types** → No changes, no warnings
2. **Normalizable types** (e.g., `ollama_llm`) → Normalized, warning logged
3. **Resolvable aliases** (e.g., `gmail`) → Resolved, warning logged
4. **Unknown types** → Error, compilation fails
5. **Mixed scenario** → Some normalized, some errors

### Verification

- ✅ TypeScript compilation: **PASSES**
- ✅ Linter: **NO ERRORS**
- ✅ All node types validated before compiler
- ✅ Unknown types never reach node creation methods

## Files Modified

1. **`worker/src/services/ai/workflow-dsl-compiler.ts`**
   - Added `validateAndNormalizeNodeTypes()` method
   - Integrated validation at STEP 0 in `compile()` method
   - Updated all node creation to use `validatedDSL`

## Future Enhancements (Optional)

1. **Metrics**: Track normalization success rates
2. **Cache**: Cache normalization results for performance
3. **Suggestions**: Provide suggestions for unknown types
4. **Strict Mode**: Option to fail on any normalization (no auto-fix)
