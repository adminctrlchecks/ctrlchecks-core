# Phase 2: Runtime Router with Skip Logic

## Overview

Phase 2 introduces the **Intent-Driven JSON Router** as runtime middleware with **strict skip logic** to prevent execution explosion.

## Core Principle

**Router activates ONLY when:**
1. Generation-time confidence < 0.85 (threshold for skip)
2. OR explicit filtering intent detected
3. OR schema hash mismatch (runtime schema drift)

**Otherwise:** Skip router entirely → Direct to AI Input Resolver

## Architecture

```
Node A Execution
    ↓
Check Skip Conditions:
    - confidence >= 0.85? → Skip router
    - schemaHash matches? → Skip router
    - explicit filtering? → Use router
    ↓
[If Router Needed]
IntentDrivenJsonRouter
    ↓ (filtered payload)
AI Input Resolver
    ↓
Node B Execution
```

## Implementation Tasks

### Task 1: Create Intent Router Core
**File:** `worker/src/core/intent-driven-json-router.ts`

**Class:** `IntentDrivenJsonRouter`

**Key Methods:**
- `shouldActivateRouter()` - Skip logic gate
- `route()` - Main routing logic
- `parseIntent()` - Uses shared IntentParser
- `extractPropertyKeys()` - Reuses existing utility
- `semanticMatch()` - Keyword → Embedding hybrid
- `extractRelevantData()` - Selective extraction

### Task 2: Skip Logic Gate
**Location:** `worker/src/core/execution/dynamic-node-executor.ts`

**Integration Point:**
```typescript
// Before AI Input Resolver
const mappingMetadata = node.data?.config?._mappingMetadata?.[fieldName];
const shouldUseRouter = shouldActivateRouter(
  mappingMetadata,
  previousOutput,
  userPrompt
);

let filteredOutput = previousOutput;
if (shouldUseRouter) {
  const router = new IntentDrivenJsonRouter();
  filteredOutput = await router.route(...);
}
```

### Task 3: Router Activation Logic
**Function:** `shouldActivateRouter()`

**Conditions:**
```typescript
function shouldActivateRouter(
  mappingMetadata: { confidence, source, schemaHash } | undefined,
  previousOutput: any,
  userPrompt: string
): boolean {
  // Condition 1: No metadata → Use router (new workflow)
  if (!mappingMetadata) return true;
  
  // Condition 2: Low confidence → Use router
  if (mappingMetadata.confidence < 0.85) return true;
  
  // Condition 3: Schema drift → Use router
  const runtimeHash = calculateSchemaHash(previousOutput);
  if (runtimeHash !== mappingMetadata.schemaHash) return true;
  
  // Condition 4: Explicit filtering intent → Use router
  const intent = parseIntent(userPrompt);
  if (requiresExplicitFiltering(intent)) return true;
  
  // Otherwise: Skip router
  return false;
}
```

### Task 4: Router Implementation
**Core Logic:**
1. Parse intent (shared module)
2. Extract JSON keys from previous output
3. Semantic matching (keyword → embedding)
4. Selective extraction
5. Return filtered payload

### Task 5: Integration with Execution Engine
**Location:** `worker/src/core/execution/dynamic-node-executor.ts`

**Flow:**
- Check skip conditions
- If router needed → route data
- Pass to AI Input Resolver
- Execute node

## Success Criteria

- ✅ Router only activates when needed (< 10% of cases)
- ✅ No performance degradation for high-confidence mappings
- ✅ Schema drift detection working
- ✅ Explicit filtering intent detected
- ✅ All tests passing

## Next Steps

1. Implement `shouldActivateRouter()` function
2. Create `IntentDrivenJsonRouter` class
3. Integrate skip logic into execution engine
4. Add tests for skip logic
5. Measure router activation rate
