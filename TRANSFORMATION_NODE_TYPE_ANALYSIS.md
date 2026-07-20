# Transformation Node Type Generation Analysis

## Problem Statement

The system generates and uses `ollama_llm` as a node type, but `NodeLibrary` only registers `ollama`. This creates a mismatch where transformation detection returns node types that don't exist in the library.

## Where Transformation Node Types Are Generated

### 1. **TransformationDetector** (`transformation-detector.ts`)

**Location**: `worker/src/services/ai/transformation-detector.ts:72-81`

```typescript
private readonly VERB_TO_NODE_MAP: Record<TransformationVerb, string[]> = {
  [TransformationVerb.SUMMARIZE]: ['text_summarizer', 'ollama_llm', 'openai_gpt', 'anthropic_claude'],
  [TransformationVerb.ANALYZE]: ['ai_agent', 'ollama_llm', 'openai_gpt', 'anthropic_claude'],
  [TransformationVerb.CLASSIFY]: ['text_classifier', 'ai_agent', 'ollama_llm', 'openai_gpt'],
  [TransformationVerb.TRANSLATE]: ['ai_agent', 'ollama_llm', 'openai_gpt', 'anthropic_claude'],
  [TransformationVerb.EXTRACT]: ['ai_agent', 'ollama_llm', 'openai_gpt', 'anthropic_claude'],
  [TransformationVerb.GENERATE]: ['ai_agent', 'ollama_llm', 'openai_gpt', 'anthropic_claude'],
  [TransformationVerb.PROCESS]: ['ai_agent', 'ollama_llm', 'openai_gpt', 'anthropic_claude'],
  [TransformationVerb.TRANSFORM]: ['transform', 'ai_agent', 'ollama_llm'],
};
```

**Returns**: Array of node type strings including `ollama_llm`

**Method**: `detectTransformations(prompt: string)` → `TransformationDetection.requiredNodeTypes`

---

### 2. **DSLGenerator** (`workflow-dsl.ts`)

**Location**: `worker/src/services/ai/workflow-dsl.ts:595-611`

**Transformation Injection Logic**:
```typescript
// Line 598: Provider priority list includes 'ollama_llm'
const providerPriority = ['ollama_llm', 'ollama', 'openai_gpt', 'openai', 'anthropic_claude', 'anthropic', 'ai_agent'];

// Line 610: Default fallback uses 'ollama_llm'
selectedProvider = requiredType || 'ollama_llm';
```

**Returns**: `DSLTransformation` objects with `type: 'ollama_llm'`

**Method**: `generateDSL()` → Injects transformations into DSL

---

### 3. **NodeMapper** (`node-mapper.ts`)

**Location**: `worker/src/services/ai/node-mapper.ts:304-307`

```typescript
// Final fallback: use ollama or openai
const ollamaSchema = nodeLibrary.getSchema('ollama_llm');
if (ollamaSchema) {
  console.log(`[NodeMapper] ✅ Mapped summarize → ollama_llm (fallback)`);
  return 'ollama_llm';
}
```

**Returns**: String `'ollama_llm'` if schema exists (but it doesn't!)

**Method**: `mapTransform(operation)` → Returns node type string

---

### 4. **StepToNodeMapper** (`step-to-node-mapper.ts`)

**Location**: `worker/src/services/ai/step-to-node-mapper.ts:177-178, 192-193, 201-202`

```typescript
const ollamaSchema = nodeLibrary.getSchema('ollama_llm');
nodeType = ollamaSchema ? 'ollama_llm' : 'ai_agent';
```

**Returns**: String `'ollama_llm'` if schema exists (but it doesn't!)

**Method**: `mapPlanStepsToWorkflowSteps()` → Maps planner steps to node types

---

### 5. **IntentDSLSemanticMapper** (`intent-dsl-semantic-mapper.ts`)

**Location**: `worker/src/services/ai/intent-dsl-semantic-mapper.ts:99-105`

```typescript
'ai_chat_model': ['text_summarizer', 'ollama_llm', 'openai_gpt', 'anthropic_claude', 'ai_agent', 'ai_service'],
'ai_model': ['text_summarizer', 'ollama_llm', 'openai_gpt', 'anthropic_claude', 'ai_agent', 'ai_service'],
'llm': ['ollama_llm', 'openai_gpt', 'anthropic_claude', 'ai_agent', 'ai_service'],
'chat_model': ['ai_agent', 'ai_service', 'ollama_llm', 'openai_gpt'],
'summarizer': ['text_summarizer', 'ollama_llm', 'openai_gpt', 'anthropic_claude'],
```

**Returns**: Array of potential node types including `ollama_llm`

**Method**: `findBestDSLMatch()` → Semantic matching for intent coverage

---

## NodeLibrary Registration Reality

### What NodeLibrary Actually Registers

**Location**: `worker/src/services/nodes/node-library.ts:4638-4671`

```typescript
private createOllamaSchema(): NodeSchema {
  return {
    type: 'ollama',  // ← Registered as 'ollama', NOT 'ollama_llm'
    label: 'Ollama',
    category: 'ai',
    description: 'Local Ollama models for chat completion',
    // ...
  };
}
```

**Registration**: `worker/src/services/nodes/node-library.ts:651`
```typescript
this.addSchema(this.createOllamaSchema()); // Registers 'ollama'
```

**Result**: 
- ✅ `nodeLibrary.getSchema('ollama')` → Returns schema
- ❌ `nodeLibrary.getSchema('ollama_llm')` → Returns `undefined`

---

## Why `ollama_llm` Is Produced Despite Not Being Supported

### Root Cause Analysis

1. **Naming Inconsistency**: 
   - NodeLibrary uses `'ollama'` (short form)
   - Transformation system uses `'ollama_llm'` (descriptive form)
   - No mapping/alias between the two

2. **Schema Check Logic Flaw**:
   ```typescript
   // In node-mapper.ts, step-to-node-mapper.ts
   const ollamaSchema = nodeLibrary.getSchema('ollama_llm');
   if (ollamaSchema) {
     return 'ollama_llm'; // This never executes because schema is undefined
   }
   // Falls through to next fallback
   ```

3. **Default Fallback Without Validation**:
   ```typescript
   // In workflow-dsl.ts:610
   selectedProvider = requiredType || 'ollama_llm'; // Uses 'ollama_llm' without checking if it exists
   ```

4. **Hardcoded String Lists**:
   - `TransformationDetector.VERB_TO_NODE_MAP` hardcodes `'ollama_llm'`
   - `workflow-dsl.ts` provider priority list hardcodes `'ollama_llm'`
   - `intent-dsl-semantic-mapper.ts` mapping tables hardcode `'ollama_llm'`

5. **No Runtime Validation**:
   - Transformation injection doesn't validate node types against NodeLibrary
   - DSL generation accepts any string as node type
   - Validation happens later (if at all) during workflow compilation

---

## Impact

### Where This Causes Issues

1. **DSL Generation**: Creates DSL with `type: 'ollama_llm'` that doesn't exist
2. **Workflow Compilation**: May fail when trying to create nodes with unknown type
3. **Node Validation**: `nodeLibrary.getSchema('ollama_llm')` returns `undefined`
4. **Intent Coverage**: Semantic mapper suggests `ollama_llm` but it's not available
5. **Transformation Detection**: Returns `ollama_llm` in `requiredNodeTypes` but it's invalid

### Current Behavior

- ✅ Code checks `nodeLibrary.getSchema('ollama_llm')` → Returns `undefined`
- ❌ Code still uses `'ollama_llm'` string in DSL/transformations
- ⚠️ Falls back to `'ai_agent'` or other types when schema check fails
- ⚠️ But hardcoded defaults still use `'ollama_llm'`

---

## Files Involved

### Generation Sources (Return Node Type Strings)
1. `worker/src/services/ai/transformation-detector.ts` - Returns `ollama_llm` in `requiredNodeTypes`
2. `worker/src/services/ai/workflow-dsl.ts` - Uses `ollama_llm` as default/fallback
3. `worker/src/services/ai/node-mapper.ts` - Returns `ollama_llm` string (if schema existed)
4. `worker/src/services/ai/step-to-node-mapper.ts` - Returns `ollama_llm` string (if schema existed)
5. `worker/src/services/ai/intent-dsl-semantic-mapper.ts` - Suggests `ollama_llm` in mappings

### Registration Source (Actual NodeLibrary)
1. `worker/src/services/nodes/node-library.ts` - Registers `'ollama'` (not `'ollama_llm'`)

### Validation Points (Check Schema Existence)
1. `worker/src/services/ai/node-mapper.ts:304` - Checks `getSchema('ollama_llm')`
2. `worker/src/services/ai/step-to-node-mapper.ts:177,192,201` - Checks `getSchema('ollama_llm')`
3. `worker/src/services/ai/workflow-dsl.ts:598-610` - Uses `ollama_llm` without validation

---

## Summary

**The Problem**: 
- Transformation system generates `'ollama_llm'` node type strings
- NodeLibrary only supports `'ollama'`
- Schema checks fail but code still uses the invalid type

**The Root Cause**:
- Naming inconsistency between transformation layer (`ollama_llm`) and NodeLibrary (`ollama`)
- No validation before using node type strings
- Hardcoded defaults use invalid type names

**The Solution** (Recommended):
1. **Option A**: Register `'ollama_llm'` as alias/virtual type pointing to `'ollama'`
2. **Option B**: Replace all `'ollama_llm'` references with `'ollama'` throughout codebase
3. **Option C**: Add runtime validation to map `'ollama_llm'` → `'ollama'` before use

**Format Verification**: ✅ Analysis complete. The format is correct and ready for execution.
