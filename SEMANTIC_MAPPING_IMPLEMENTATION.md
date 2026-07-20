# Semantic Mapping Implementation - Intent Actions to DSL Node Types

## Overview

Implemented semantic mapping between intent actions and DSL node types to solve the mismatch problem where intent action types (e.g., `ai_chat_model`) don't directly match DSL node types (e.g., `text_summarizer`, `ollama_llm`).

## Solution Architecture

### Core Component: `intent-dsl-semantic-mapper.ts`

**Location**: `worker/src/services/ai/intent-dsl-semantic-mapper.ts`

**Key Functions**:
1. `matchesIntentAction()` - Checks if intent action matches DSL node type semantically
2. `findBestDSLMatch()` - Finds best matching DSL node for an intent action
3. `isIntentActionCovered()` - Checks if intent action is covered by any DSL node

### Matching Strategy (7-Layer Approach)

The semantic mapper uses a 7-layer matching strategy with confidence scores:

1. **Exact Match** (confidence: 1.0)
   - Direct type match: `ai_chat_model` === `ai_chat_model`

2. **Substring Match** (confidence: 0.9)
   - Partial match: `gmail` matches `google_gmail`

3. **Operation-Based Matching** (confidence: 0.85-0.95)
   - `summarize` → transformation nodes
   - `read/fetch` → dataSource nodes
   - `send/write` → output nodes
   - Uses capability registry to verify node capabilities

4. **Intent Type to Transformation Mapping** (confidence: 0.8)
   - `ai_chat_model` → `['text_summarizer', 'ollama_llm', 'openai_gpt', ...]`
   - Predefined mappings for common intent types

5. **Capability-Based Matching** (confidence: 0.85)
   - Checks if intent operation matches node capabilities
   - Uses `NodeCapabilityRegistryDSL` for semantic capabilities

6. **Normalized Matching** (confidence: 0.7)
   - Handles common variations: `ai_chat_model` → `ai_chat`, `chat_model`, etc.

7. **Transformation Keyword Matching** (confidence: 0.75)
   - If operation is transformation keyword (summarize, analyze, process) and DSL node is transformation

## Operation to Category Mapping

```typescript
OPERATION_CATEGORY_MAP = {
  // Read operations → dataSource
  'read', 'fetch', 'get', 'query', 'retrieve', 'pull', 'list',
  
  // Write operations → output
  'send', 'write', 'create', 'update', 'notify', 'post', 'publish', 'store', 'save', 'append',
  
  // Transformation operations → transformation
  'summarize', 'analyze', 'process', 'transform', 'format', 'parse', 'filter', 'merge', 'extract', 'classify', 'translate'
}
```

## Intent Type to Transformation Mapping

```typescript
INTENT_TO_TRANSFORMATION_MAP = {
  'ai_chat_model': ['text_summarizer', 'ollama_llm', 'openai_gpt', 'anthropic_claude', 'ai_agent', 'ai_service'],
  'ai_model': ['text_summarizer', 'ollama_llm', 'openai_gpt', 'anthropic_claude', 'ai_agent', 'ai_service'],
  'llm': ['ollama_llm', 'openai_gpt', 'anthropic_claude', 'ai_agent', 'ai_service'],
  'chat_model': ['ai_agent', 'ai_service', 'ollama_llm', 'openai_gpt'],
  'summarizer': ['text_summarizer', 'ollama_llm', 'openai_gpt', 'anthropic_claude'],
  'text_processor': ['text_summarizer', 'text_formatter', 'javascript', 'function'],
  'analyzer': ['ai_agent', 'ai_service', 'ollama_llm', 'openai_gpt'],
}
```

## Integration

### Updated Functions

1. **`validateIntentCoverage()` in `workflow-dsl.ts`**
   - Now uses `isIntentActionCovered()` for semantic matching
   - Replaces string-based matching with semantic matching

2. **`IntentCoverageValidationLayer.validate()` in `workflow-validation-pipeline.ts`**
   - Now uses `isIntentActionCovered()` for semantic matching
   - Consistent with DSL validation logic

## Example Usage

```typescript
// Intent action: ai_chat_model (summarize)
// DSL transformations: ['text_summarizer', 'ollama_llm']

const match = isIntentActionCovered(
  { type: 'ai_chat_model', operation: 'summarize' },
  [], // dataSources
  ['text_summarizer', 'ollama_llm'], // transformations
  [] // outputs
);

// Result: { matches: true, confidence: 0.95, reason: "Operation-based match: summarize operation matches transformation node text_summarizer with capability" }
```

## Benefits

1. **Semantic Understanding**: Understands that `ai_chat_model (summarize)` matches `text_summarizer`
2. **Operation-Based**: Uses operation (summarize, analyze, process) to determine category
3. **Capability-Aware**: Leverages capability registry for semantic matching
4. **Production-Grade**: 7-layer matching with confidence scores
5. **Extensible**: Easy to add new mappings and operations

## Files Modified

1. **Created**: `worker/src/services/ai/intent-dsl-semantic-mapper.ts` (new semantic mapper)
2. **Updated**: `worker/src/services/ai/workflow-dsl.ts` (uses semantic mapper)
3. **Updated**: `worker/src/services/ai/workflow-validation-pipeline.ts` (uses semantic mapper)

## Testing

- TypeScript compilation: ✅ Passes
- Linter: ✅ No errors
- Backward compatible: ✅ No breaking changes
