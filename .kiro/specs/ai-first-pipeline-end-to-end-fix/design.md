# AI-First Pipeline End-to-End Fix — Bugfix Design

## Overview

Eight independent defects collectively break the AI-first workflow generation pipeline from end to end. This design addresses each defect with a targeted, minimal fix and introduces three missing stages (structural prompt, credential discovery, field ownership) as standalone stage files consistent with the existing stage architecture. No existing working code is removed or restructured; only broken call sites, missing stage invocations, and one configuration value are changed.

Three additional UI-layer defects have been identified: the questions step is bypassed by a premature loading overlay; the field ownership UI renders empty despite valid backend data; and credential questions leak into the wrong UI step. These are fixed by correcting the frontend state-machine transition guard, wiring the `fieldOwnershipMap` into the Field Ownership component, and filtering credential-type questions out of the ComprehensiveQuestions renderer.

---

## Glossary

- **Bug_Condition (C)**: Any of the eight conditions that cause the pipeline to produce incorrect, incomplete, or truncated output.
- **Property (P)**: The correct behavior the fixed pipeline must exhibit for each bug condition.
- **Preservation**: The behavior of the intent stage, node-selection registry validation, cycle detection, orchestrator safety net, repair pass, and single-entry-point contract — none of which are touched by this fix.
- **structural prompt**: A generated plain-language artifact (not a static template) that describes which nodes are needed, how they connect, and what each does in the context of the user's goal. Produced by `structural-prompt-stage.ts` and passed as shared context to all downstream stages.
- **fieldOwnershipMap**: A map keyed by `nodeId → fieldName → FieldFillMode` extracted from each node's `inputSchema.fillMode.default` in the registry. Tells the UI which fields are `manual_static`, `runtime_ai`, or `buildtime_ai_once`.
- **F**: The original (unfixed) pipeline — `ai-first-pipeline.ts` and its broken stage files as they exist today.
- **F'**: The fixed pipeline after all eight defects are resolved.
- **FieldFillMode**: `'manual_static' | 'runtime_ai' | 'buildtime_ai_once'` — defined in `unified-node-contract.ts`.
- **initialExecutionOrder**: The optional `ExecutionOrder` parameter accepted by `unifiedGraphOrchestrator.initializeWorkflow()` that, when provided, causes the orchestrator to use the supplied ordering instead of recomputing its own.

---

## Bug Details

### Bug Condition

The pipeline fails under eight distinct conditions, all of which are deterministic (not probabilistic). Each condition maps to a specific call site or missing invocation.

**Formal Specification:**
```
FUNCTION isBugCondition(X)
  INPUT: X of type PipelineCallSite
  OUTPUT: boolean

  RETURN (
    X.stage = 'node_selection'
      AND catalogPresentInMessageBody(X)                          // Bug 1
  ) OR (
    X.stage = 'node_hydration'
      AND defaultsStoredIn_hydratedConfig(X)                     // Bug 2
  ) OR (
    X.stage = 'edge_reasoning'
      AND initializeWorkflowCalledWithoutExecutionOrder(X)        // Bug 3
  ) OR (
    X.stage = 'validation'
      AND messageSentIsSummaryString(X)                          // Bug 4
  ) OR (
    X.pipeline = 'ai_first_pipeline'
      AND structuralPromptStageAbsent(X)                         // Bug 5
  ) OR (
    X.pipeline = 'ai_first_pipeline'
      AND credentialDiscoveryNeverCalled(X)                      // Bug 6
  ) OR (
    X.pipeline = 'ai_first_pipeline'
      AND fieldOwnershipMapNeverExtracted(X)                     // Bug 7
  ) OR (
    X.orchestrator = 'gemini_orchestrator'
      AND requestType = 'workflow-generation'
      AND maxTokens = 4000                                        // Bug 8
  )
END FUNCTION
```

### Examples

- **Bug 1**: `node-selection-stage.ts` line `const message = \`STRUCTURED_INTENT:...\n\nNODE_CATALOG:\n${nodeCatalog}\`` — catalog is already in `systemPrompt` via `systemPromptBuilder.build()`, so it appears twice.
- **Bug 2**: `ai-first-pipeline.ts` hydration block: `return { ...node, _hydratedConfig: defaults }` — `defaults` is never written to `node.data.config`.
- **Bug 3**: `edge-reasoning-stage.ts`: `unifiedGraphOrchestrator.initializeWorkflow(workflowNodes)` — second argument `initialExecutionOrder` is omitted.
- **Bug 4**: `validation-stage.ts`: `const message = \`USER_INTENT:...\n\nWORKFLOW_SUMMARY:\nnodes=${workflow.nodes.length}...\`` — actual graph JSON is never serialized into the message.
- **Bug 5**: `ai-first-pipeline.ts` `run()` method jumps from Stage 1 (intent) directly to Stage 2 (node selection) with no structural prompt stage in between.
- **Bug 6**: `ai-first-pipeline.ts` `run()` method ends after validation with no call to `credentialDiscoveryPhase.discoverCredentials()`.
- **Bug 7**: `ai-first-pipeline.ts` `run()` method has no field ownership extraction loop over `unifiedNodeRegistry.get(type).inputSchema`.
- **Bug 8**: `gemini-orchestrator.ts` `getDefaultMaxTokens()`: `if (['workflow-generation', 'code-generation'].includes(type)) { return 4000; }`.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Intent stage LLM call, retry logic, and `StructuredIntent` output shape are untouched.
- Node-selection registry validation (discard unknowns, `NO_VALID_NODES` error) is untouched.
- Edge-reasoning DFS cycle detection and single re-prompt are untouched.
- Validation stage repair pass (exactly one attempt) is untouched.
- `unifiedGraphOrchestrator.validateWorkflow()` safety net call is untouched.
- `generate-workflow.ts` single entry point with no feature flag is untouched.
- The rule that `workflow.edges` is never written directly is untouched.
- The workflow is always returned even when credentials are missing.

**Scope:**
All inputs that do NOT trigger any of the eight bug conditions are completely unaffected. This includes: the intent stage, the registry validation post-LLM in node selection, the cycle detection logic in edge reasoning, the repair loop in validation, and the orchestrator safety net.

---

## Hypothesized Root Cause

1. **Bug 1 — Catalog duplication**: `node-selection-stage.ts` was written before `systemPromptBuilder` embedded the catalog in the system prompt. The message construction was never updated to remove the redundant `NODE_CATALOG` section.

2. **Bug 2 — Dead hydration property**: The hydration block in `ai-first-pipeline.ts` was written as a placeholder that attached defaults to the `SelectedNode` DTO rather than constructing a proper `WorkflowNode` with `data.config` populated. The edge-reasoning stage then builds `WorkflowNode` objects from scratch using `def.defaultConfig()` independently, but the pipeline's hydration step is never connected to that construction.

3. **Bug 3 — Ignored execution order**: `edge-reasoning-stage.ts` calls `initializeWorkflow(workflowNodes)` without the second argument. The `initialExecutionOrder` parameter exists on the orchestrator interface but was never wired up from the LLM's `orderedNodes` output. The orchestrator silently falls back to its own topological sort.

4. **Bug 4 — Summary string in validation**: The validation stage comment says "Send a compact summary instead of the full workflow JSON to avoid prompt bloat" — this was an intentional but incorrect optimization. The LLM cannot validate data flow coherence or semantic alignment from a node count.

5. **Bug 5 — Missing structural prompt stage**: The structural prompt stage file (`structural-blueprint-builder.ts`) exists but was never wired into the pipeline as a stage. The pipeline was built incrementally and this stage was deferred and forgotten.

6. **Bug 6 — Credential discovery never called**: `credential-discovery-phase.ts` exists and works but was never called from `ai-first-pipeline.ts`. The pipeline was designed to return credentials but the call site was never added.

7. **Bug 7 — Field ownership never extracted**: The `FieldFillMode` system exists in the registry contract but no pipeline stage was ever written to extract it into the response. The feature was designed but the extraction loop was never implemented.

8. **Bug 8 — Token cap too small**: `getDefaultMaxTokens()` returns 4,000 for `workflow-generation`. A workflow with 5+ nodes serialized as JSON easily exceeds 4,000 tokens, causing the Gemini API to truncate the response mid-JSON.

---

## Correctness Properties

Property 1: Bug Condition — Node Catalog Sent Only Once Per Node-Selection Call

_For any_ node-selection LLM request, the node catalog SHALL appear exactly once — in the system prompt — and SHALL NOT appear in the message body. The message body SHALL contain only the structured intent JSON.

**Validates: Requirements 2.1**

---

Property 2: Bug Condition — Node Hydration Writes to node.data.config

_For any_ selected node type that exists in the registry, after the hydration stage runs, `node.data.config` SHALL contain all keys returned by `unifiedNodeRegistry.get(type).defaultConfig()`. The `_hydratedConfig` intermediate property SHALL NOT be used as the final config carrier.

**Validates: Requirements 2.2**

---

Property 3: Bug Condition — Edge Reasoning Passes AI Ordering to Orchestrator

_For any_ valid `orderedNodes` list returned by the LLM in the edge-reasoning stage, the call to `unifiedGraphOrchestrator.initializeWorkflow()` SHALL include an `initialExecutionOrder` derived from that list as the second argument.

**Validates: Requirements 2.3**

---

Property 4: Bug Condition — Validation Sends Actual Graph JSON

_For any_ workflow passed to the validation stage, the message sent to the LLM SHALL contain the serialized `workflow.nodes` and `workflow.edges` arrays, not a summary string.

**Validates: Requirements 2.4**

---

Property 5: Bug Condition — Structural Prompt Stage Exists and Runs

_For any_ pipeline execution, a structural-prompt stage SHALL run between intent extraction and node selection, producing a non-empty plain-language blueprint string that is passed as context to all downstream stages.

**Validates: Requirements 2.5**

---

Property 6: Bug Condition — Credential Discovery Is Called and Output Included

_For any_ pipeline execution that reaches a validated workflow, `credentialDiscoveryPhase.discoverCredentials(workflow, userId)` SHALL be called, and `AiPipelineOutput` SHALL include `requiredCredentials` and `missingCredentials` arrays.

**Validates: Requirements 2.6**

---

Property 7: Bug Condition — Field Ownership Map Is Extracted and Included

_For any_ pipeline execution that reaches a validated workflow, the pipeline SHALL walk each node's `inputSchema` from the registry and extract `fillMode.default` per field, producing a `fieldOwnershipMap` included in `AiPipelineOutput`.

**Validates: Requirements 2.7**

---

Property 8: Bug Condition — Gemini maxTokens Is Sufficient for Workflow Generation

_For any_ `workflow-generation` request to `gemini-orchestrator`, the `maxTokens` value SHALL be at least 16,000, ensuring full workflow JSON responses are not truncated.

**Validates: Requirements 2.8**

---

Property 9: Preservation — Existing Stage Behavior Is Unchanged

_For any_ pipeline input where none of the eight bug conditions apply (intent stage, registry validation in node selection, cycle detection in edge reasoning, repair pass in validation, orchestrator safety net), the fixed pipeline SHALL produce the same result as the original pipeline for those sub-paths.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

---

## Fix Implementation

### Changes Required

**File: `worker/src/services/ai/stages/node-selection-stage.ts`**

**Bug 1 Fix — Remove catalog from message body:**
- Remove `\n\nNODE_CATALOG:\n${nodeCatalog}` from the `message` string.
- The message body becomes: `STRUCTURED_INTENT:\n${JSON.stringify(intent, null, 2)}` only.
- The catalog is already present in `systemPrompt` via `systemPromptBuilder.build()`.

---

**File: `worker/src/services/ai/ai-first-pipeline.ts`**

**Bug 2 Fix — Write defaults to node.data.config:**
- Remove the `_hydratedConfig` hydration block entirely.
- Node hydration is already performed correctly inside `edge-reasoning-stage.ts` when it constructs `WorkflowNode` objects from `def.defaultConfig()`. The pipeline's separate hydration step is redundant and broken. Remove it and pass `nsResult.selectedNodes` directly to the edge-reasoning stage.

**Bug 5 Fix — Add structural prompt stage:**
- Import and call `runStructuralPromptStage` between intent and node selection.
- Pass the resulting `structuralPrompt` string to node-selection, edge-reasoning, and validation stages as additional context.

**Bug 6 Fix — Call credential discovery:**
- After validation succeeds, call `credentialDiscoveryPhase.discoverCredentials(vsResult.workflow, input.userId)`.
- Add `requiredCredentials` and `missingCredentials` to `AiPipelineOutput`.

**Bug 7 Fix — Extract field ownership map:**
- After credential discovery, walk `vsResult.workflow.nodes`.
- For each node, call `unifiedNodeRegistry.get(node.type)?.inputSchema` and extract `field.fillMode?.default` per field.
- Build `fieldOwnershipMap: Record<nodeId, Record<fieldName, FieldFillMode>>`.
- Add to `AiPipelineOutput`.

---

**File: `worker/src/services/ai/stages/edge-reasoning-stage.ts`**

**Bug 3 Fix — Pass initialExecutionOrder to orchestrator:**
- After parsing `parsed.orderedNodes`, convert to `ExecutionOrder` format: `{ steps: orderedNodes.map((id, i) => ({ nodeId: id, order: i })) }` (or the actual shape expected by `executionOrderManager`).
- Pass as second argument to `unifiedGraphOrchestrator.initializeWorkflow(workflowNodes, initialExecutionOrder)`.

---

**File: `worker/src/services/ai/stages/validation-stage.ts`**

**Bug 4 Fix — Send actual graph JSON:**
- Replace the summary string message with: `USER_INTENT:\n${userIntent}\n\nWORKFLOW_GRAPH:\n${JSON.stringify({ nodes: workflow.nodes, edges: workflow.edges }, null, 2)}`.
- Remove the `nodeTypes` summary construction.

---

**File: `worker/src/services/ai/gemini-orchestrator.ts`**

**Bug 8 Fix — Increase maxTokens for workflow-generation:**
- In `getDefaultMaxTokens()`, change the `workflow-generation` branch from `return 4000` to `return 16000`.

---

**File: `worker/src/api/generate-workflow.ts`**

**Bug 6/7 Fix — Include credential and field ownership data in API response:**
- Add `requiredCredentials`, `missingCredentials`, and `fieldOwnershipMap` from `result` to the success JSON response.

---

## UI Bug Details

### Bug A — Questions UI Skipped by Premature Loading Overlay

**Root Cause:** The frontend state machine transitions to the "Refining Workflow Plan" state as soon as the backend pipeline response arrives, without checking whether the ComprehensiveQuestions step has been completed. The `ai_pipeline_validation_parse_failed` event followed by the orchestrator safety net completing causes the frontend to treat the pipeline as "done" and skip the questions gate entirely.

**Fix:** Add a guard to the state machine transition: the "Refining" state may only be entered after `questionsAnswered === true`. The pipeline-complete event should set a `pipelineReady` flag, not directly trigger the loading overlay. The questions UI reads `pipelineReady` to know it can submit answers; only after submission does the overlay appear.

**Formal Specification:**
```
FUNCTION isBugCondition_A(X)
  INPUT: X of type FrontendStateTransition
  OUTPUT: boolean

  RETURN X.event = 'PIPELINE_COMPLETE'
    AND X.currentState = 'SHOWING_QUESTIONS'
    AND X.questionsAnswered = false
    AND X.nextState = 'REFINING'
END FUNCTION
```

**Property:**
```
FOR ALL X WHERE isBugCondition_A(X) DO
  result ← applyTransition(X)
  ASSERT result.state = 'SHOWING_QUESTIONS'  // must NOT advance
  ASSERT result.pipelineReady = true          // flag set, but gate not passed
END FOR
```

---

### Bug B — Field Ownership UI Renders Empty

**Root Cause:** The Field Ownership UI component does not read `fieldOwnershipMap` from the pipeline API response. The backend correctly produces `fieldOwnershipMap` (confirmed: `nodes=4, fields=24`) but the component either receives no prop for it or ignores the prop and renders a static empty state.

**Fix:** Pass `fieldOwnershipMap` from the pipeline response into the Field Ownership component as a prop. The component should iterate over `Object.entries(fieldOwnershipMap)` grouped by fill-mode category to render field rows. Fields with `fillMode = 'manual_static'` and no AI default should render as disabled/locked toggles.

**Formal Specification:**
```
FUNCTION isBugCondition_B(X)
  INPUT: X of type FieldOwnershipRenderCall
  OUTPUT: boolean

  RETURN X.fieldOwnershipMap != null
    AND Object.keys(X.fieldOwnershipMap).length > 0
    AND X.renderedFieldCount = 0
END FUNCTION
```

**Property:**
```
FOR ALL X WHERE isBugCondition_B(X) DO
  result ← renderFieldOwnership(X)
  ASSERT result.renderedFieldCount > 0
  ASSERT result.renderedFieldCount = totalFieldsIn(X.fieldOwnershipMap)
END FOR
```

---

### Bug C — Credential Questions Leak into Questions UI Step

**Root Cause:** The ComprehensiveQuestions renderer iterates over all questions returned by the pipeline without filtering by question type. Questions with `type: 'credentialId'` (or `category: 'credentials'`) are intended exclusively for the Credentials step but appear in the questions list because no filter is applied.

**Fix:** In the ComprehensiveQuestions component, filter the question list before rendering: exclude any question where `question.type === 'credentialId'` or `question.category === 'credentials'`. The Credentials step already handles these questions independently via OAuth/vault flows.

**Formal Specification:**
```
FUNCTION isBugCondition_C(X)
  INPUT: X of type QuestionListRenderCall
  OUTPUT: boolean

  RETURN EXISTS q IN X.questions WHERE q.type = 'credentialId'
    AND X.stepName = 'ComprehensiveQuestions'
END FUNCTION
```

**Property:**
```
FOR ALL X WHERE isBugCondition_C(X) DO
  rendered ← renderQuestionList(X)
  ASSERT NOT EXISTS q IN rendered WHERE q.type = 'credentialId'
END FOR
```

---

## UI Fix Implementation

### Changes Required

**Frontend state machine (workflow builder / pipeline state):**

**Bug A Fix — Gate "Refining" transition behind questions completion:**
- Identify the state machine file managing the AI pipeline wizard steps (likely a React context, Zustand store, or XState machine in the frontend).
- Add a `questionsAnswered: boolean` flag (default `false`).
- Change the transition: `PIPELINE_COMPLETE` event sets `pipelineReady = true` but does NOT advance state if `questionsAnswered === false`.
- The "Submit Answers" action sets `questionsAnswered = true` and, if `pipelineReady === true`, advances to `REFINING`.
- This ensures the overlay only appears after the user has submitted answers.

**ComprehensiveQuestions component:**

**Bug C Fix — Filter credential questions from question list:**
- In the component that renders the question list, add a filter before mapping to JSX:
  ```ts
  const displayQuestions = questions.filter(
    q => q.type !== 'credentialId' && q.category !== 'credentials'
  );
  ```
- Render `displayQuestions` instead of the raw `questions` array.

**Field Ownership component:**

**Bug B Fix — Consume fieldOwnershipMap prop:**
- Accept `fieldOwnershipMap: Record<string, Record<string, FieldFillMode>>` as a prop.
- Replace the static empty-state render with an iteration over the map:
  ```ts
  Object.entries(fieldOwnershipMap).forEach(([nodeId, fields]) => {
    Object.entries(fields).forEach(([fieldName, fillMode]) => {
      // render field row with toggle
    });
  });
  ```
- Group rows by fill-mode category for display.
- Fields with `fillMode === 'manual_static'` and no AI default value render as locked (disabled toggle) until the user explicitly enables them.
- Pass `fieldOwnershipMap` from the parent component that holds the pipeline response.

---

**New Files to Create:**

- `worker/src/services/ai/stages/structural-prompt-stage.ts` — Calls the LLM with intent + node catalog to generate a plain-language workflow blueprint. Returns `{ structuralPrompt: string }`.
- `worker/src/services/ai/stages/node-hydration-stage.ts` — Standalone stage that constructs `WorkflowNode[]` from `SelectedNode[]` by calling `unifiedNodeRegistry.get(type).defaultConfig()` and writing to `node.data.config`. (Extracted from edge-reasoning-stage for clarity; edge-reasoning-stage delegates to this.)
- `worker/src/services/ai/stages/credential-discovery-stage.ts` — Thin wrapper that calls `credentialDiscoveryPhase.discoverCredentials(workflow, userId)` and returns the result with stage trace metadata.
- `worker/src/services/ai/stages/field-ownership-stage.ts` — Walks `workflow.nodes`, reads `inputSchema` from registry per node, extracts `fillMode.default` per field, returns `fieldOwnershipMap`.

---

## Testing Strategy

### Validation Approach

The testing strategy follows the bug condition methodology: first write tests that demonstrate each bug on unfixed code (exploration), then write preservation tests that confirm unchanged behavior on unfixed code, then apply the fix and verify both sets pass.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate each of the eight bugs BEFORE implementing the fix. Confirm root cause analysis.

**Test Plan**: Write unit tests that call the broken functions/stages directly and assert the incorrect behavior. Run on UNFIXED code — tests will FAIL (expected).

**Test Cases:**
1. **Catalog duplication test**: Call `runNodeSelectionStage` and capture the `message` argument passed to `geminiOrchestrator.processRequest`. Assert it contains `NODE_CATALOG` — this will PASS on unfixed code (confirming the bug).
2. **Dead hydration test**: Run the hydration block in `ai-first-pipeline.ts` and assert `node.data.config` is populated — this will FAIL on unfixed code (confirming the bug).
3. **Ignored execution order test**: Call `runEdgeReasoningStage` and assert `initializeWorkflow` was called with a non-null second argument — this will FAIL on unfixed code.
4. **Summary string test**: Call `runValidationStage` and capture the `message` argument. Assert it contains `workflow.nodes` JSON — this will FAIL on unfixed code.
5. **Missing structural prompt test**: Inspect `AiFirstPipeline.run()` stage trace and assert a `structural_prompt` stage entry exists — this will FAIL on unfixed code.
6. **Missing credential discovery test**: Call `pipeline.run()` and assert `result.requiredCredentials` is defined — this will FAIL on unfixed code.
7. **Missing field ownership test**: Call `pipeline.run()` and assert `result.fieldOwnershipMap` is defined — this will FAIL on unfixed code.
8. **Token cap test**: Call `geminiOrchestrator.getDefaultMaxTokens('workflow-generation')` (via reflection or by inspecting the source) and assert it returns >= 16000 — this will FAIL on unfixed code.

**Expected Counterexamples:**
- Message body contains full catalog text (Bug 1).
- `node.data.config` is `{}` after hydration (Bug 2).
- `initializeWorkflow` called with `undefined` as second arg (Bug 3).
- Message body is `"nodes=3, edges=2, node_types=..."` (Bug 4).
- Stage trace has no `structural_prompt` entry (Bug 5).
- `result.requiredCredentials` is `undefined` (Bug 6).
- `result.fieldOwnershipMap` is `undefined` (Bug 7).
- `maxTokens` is `4000` (Bug 8).

### Fix Checking

**Goal**: Verify that for all inputs where each bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition(X) DO
  result := fixedPipeline(X)
  ASSERT expectedBehavior(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where none of the bug conditions apply, the fixed pipeline produces the same result as the original.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT originalPipeline(X) = fixedPipeline(X)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation because the intent stage, registry validation, and cycle detection each operate over large input domains. Generating random `StructuredIntent` objects and random node type lists exercises these paths more thoroughly than hand-written examples.

**Test Cases:**
1. **Intent stage preservation**: For any user prompt, `runIntentStage` output shape is unchanged after the fix.
2. **Registry validation preservation**: For any LLM response containing unknown node types, the node-selection stage still discards them and returns `NO_VALID_NODES` when zero valid types remain.
3. **Cycle detection preservation**: For any edge list containing a cycle, `runEdgeReasoningStage` still re-prompts once and returns `CYCLE_DETECTED` if the cycle persists.
4. **Repair pass preservation**: For any validation result with error-severity issues, the validation stage still attempts exactly one repair pass.
5. **Orchestrator safety net preservation**: For any pipeline execution, `validateWorkflow()` is still called on the final graph.

### Unit Tests

- `node-selection-stage.ts`: assert message body contains no catalog text after fix.
- `edge-reasoning-stage.ts`: assert `initializeWorkflow` receives `initialExecutionOrder` matching LLM's `orderedNodes`.
- `validation-stage.ts`: assert message body contains serialized `nodes` and `edges` arrays.
- `structural-prompt-stage.ts`: assert non-empty string returned for any valid intent + catalog input.
- `credential-discovery-stage.ts`: assert it calls `credentialDiscoveryPhase.discoverCredentials` and returns shaped result.
- `field-ownership-stage.ts`: assert every node's fields appear in the map with a valid `FieldFillMode` value.
- `gemini-orchestrator.ts`: assert `getDefaultMaxTokens('workflow-generation')` returns >= 16000.

### Property-Based Tests

- For any `StructuredIntent`, `runStructuralPromptStage` returns a non-empty string (Property 5).
- For any workflow with N nodes each having M input fields, `fieldOwnershipMap` contains exactly N × M entries (Property 7).
- For any set of selected nodes, after hydration every `node.data.config` key set is a superset of `defaultConfig()` keys (Property 2).

### Integration Tests

- Full `pipeline.run()` with a 3-node workflow: assert `stageTrace` contains `structural_prompt`, `node_selection`, `edge_reasoning`, `validation`, `credential_discovery`, `field_ownership` entries.
- Full `pipeline.run()` with a credential-requiring node: assert `missingCredentials` is non-empty in the response.
- Full `pipeline.run()` with any node: assert `fieldOwnershipMap` is present and non-empty in the response.
- `generate-workflow.ts` API response: assert `requiredCredentials`, `missingCredentials`, and `fieldOwnershipMap` are present in the success response body.
