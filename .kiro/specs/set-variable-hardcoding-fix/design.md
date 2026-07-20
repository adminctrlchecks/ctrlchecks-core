# Set Variable Hardcoding Fix — Bugfix Design

## Overview

The workflow generation system contains five hardcoded injection points that force `set_variable`
nodes into generated workflows regardless of user intent. The fix removes all five injections,
replaces the intent-failure fallback with an error/clarification response, replaces the
`inferStepType` default with a warning-and-skip, and ensures all edge wiring goes through
`unifiedGraphOrchestrator` rather than being hand-built at injection sites.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — a `set_variable` node appears in
  the generated workflow even though the user's prompt contains no explicit variable-assignment
  intent (no "set variable", "store in a variable", "assign to" phrasing).
- **Property (P)**: The desired behavior when the bug condition holds — the generated workflow
  contains only nodes that match the user's stated intent; no `set_variable` node is present.
- **Preservation**: All existing correct behaviors that must remain unchanged after the fix,
  including explicit `set_variable` requests, conditional branching, loop generation, and
  fully-connected DAG output.
- **explicitVariableIntent(prompt)**: Returns `true` when the prompt contains one or more of the
  canonical variable-assignment phrases: "set variable", "store in a variable", "assign to",
  "save to variable".
- **needsDataExtraction**: A boolean flag computed in `workflow-builder.ts` that is `true` when
  the prompt contains extraction-related keywords. Currently misused as a proxy for
  variable-assignment intent.
- **inferStepType**: A private method in `workflow-builder.ts` that maps a free-text step
  description to a node type from the node library. Currently falls back to `set_variable` when
  no match is found.
- **unifiedGraphOrchestrator**: The single authority for all edge creation, removal, and
  reconciliation (`unified-graph-orchestrator.ts`). All structural changes must go through it.
- **unifiedNodeRegistry**: The single source of truth for node schemas, defaults, and execution
  logic (`unified-node-registry.ts`).

## Bug Details

### Bug Condition

The bug manifests when the workflow generation pipeline produces a `set_variable` node for a
prompt that never requested variable assignment. There are five distinct code paths that trigger
this condition:

1. `workflow-structure-builder.ts` ~line 934 — intent-failure fallback always emits
   `manual_trigger → set_variable`.
2. `workflow-builder.ts` ~line 5513 — `needsDataExtraction` flag forces `set_variable` insertion
   as the first step after the trigger.
3. `workflow-builder.ts` ~line 4592 — system prompt text maps "extract", "get specific fields",
   "parse", "separate" keywords to `set_variable` or `json_parser`.
4. `workflow-builder.ts` ~line 7022 — `inferStepType` returns `'set_variable'` as the default
   when no node-library match is found.
5. `workflow-builder.ts` ~line 4532 — a `SET_VARIABLE NODE REQUIRED` line is emitted into the
   prompt output whenever `needsDataExtraction` is true, reinforcing the AI to add the node.

**Formal Specification:**
```
FUNCTION isBugCondition(prompt, generatedWorkflow)
  INPUT: prompt       — the raw user prompt string
         generatedWorkflow — the workflow object produced by the generation pipeline
  OUTPUT: boolean

  RETURN NOT explicitVariableIntent(prompt)
         AND containsNode(generatedWorkflow, 'set_variable')
END FUNCTION

FUNCTION explicitVariableIntent(prompt)
  keywords = ["set variable", "store in a variable", "assign to", "save to variable"]
  RETURN ANY keyword IN keywords WHERE prompt.toLowerCase() CONTAINS keyword
END FUNCTION
```

### Examples

- Prompt: "Send a Slack message when a form is submitted" → current output contains a
  `set_variable` node (via `needsDataExtraction` path); expected output has no `set_variable`.
- Prompt: "Extract email and name from Google Sheets and create a contact in HubSpot" → current
  output injects `set_variable` (via system prompt keyword mapping); expected output uses
  `google_sheets → loop → hubspot` with no `set_variable`.
- Prompt: "???" (gibberish, intent parsing fails) → current output returns
  `manual_trigger → set_variable` skeleton; expected output returns an error asking for
  clarification.
- Prompt: "Set a variable called userEmail to the value from the webhook body" → current and
  expected output both contain `set_variable` (explicit intent — not a bug condition).
- Prompt: "Process each row" (step description matches no node type) → current `inferStepType`
  returns `'set_variable'`; expected behavior is a logged warning and the step is skipped.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- When the user explicitly says "set variable", "store value in a variable", or "assign to a
  variable", the system must continue to include a `set_variable` node configured according to
  the user's intent.
- Conditional logic prompts (if/else, switch) must continue to produce correct branching nodes
  with proper `true`/`false` or `case_N` edges.
- Loop prompts ("for each row", "iterate over") must continue to produce a `loop` node wired
  between the data source and the target action.
- All generated workflows must continue to be fully connected DAGs with no orphan nodes and no
  duplicate edges, validated by `unifiedGraphOrchestrator.validateWorkflow()`.
- `unifiedNodeRegistry` must remain the single source of truth for node schemas, defaults, and
  execution logic.

**Scope:**
All prompts that do NOT contain explicit variable-assignment intent should be completely
unaffected by the presence or absence of extraction-related keywords. This includes:
- Prompts with "extract", "parse", "get specific fields", "separate" that do not ask to store
  results in a named variable.
- Prompts that fail intent parsing (should receive an error, not a skeleton).
- Prompts whose steps cannot be matched to a known node type (step is skipped, not replaced with
  `set_variable`).

## Hypothesized Root Cause

1. **Overly broad `needsDataExtraction` flag**: The flag is triggered by generic extraction
   keywords ("extract", "parse") that do not imply variable assignment. The enforcement block at
   ~line 5513 then unconditionally injects `set_variable` whenever this flag is true, conflating
   "data transformation needed" with "user wants a variable node".

2. **System prompt keyword mapping is too aggressive**: The prompt text at ~line 4592 instructs
   the AI model to add `set_variable` for any "extract" or "parse" mention. This causes the AI
   to include the node even when the structural enforcement block would not have added it.

3. **Duplicate prompt signal at ~line 4532**: The `SET_VARIABLE NODE REQUIRED` line is emitted
   into the prompt output as a second reinforcement signal, making the AI doubly likely to add
   the node.

4. **Intent-failure fallback is a silent skeleton**: When `workflow-structure-builder.ts` cannot
   parse any actions or a valid trigger, it silently returns a `manual_trigger → set_variable`
   skeleton instead of surfacing the failure to the caller. The caller has no way to distinguish
   a real workflow from a fallback.

5. **`inferStepType` uses `set_variable` as a safe default**: The function treats `set_variable`
   as a universally safe fallback node type. In practice this silently corrupts the workflow
   structure by inserting a semantically meaningless node.

## Correctness Properties

Property 1: Bug Condition — No Implicit set_variable Injection

_For any_ prompt where `isBugCondition` holds (the prompt contains no explicit
variable-assignment intent), the fixed generation pipeline SHALL produce a workflow that contains
no `set_variable` node. All five injection paths must be inert for such prompts.

**Validates: Requirements 2.1, 2.3, 2.4**

Property 2: Preservation — Explicit set_variable Requests Still Work

_For any_ prompt where `explicitVariableIntent(prompt)` is `true`, the fixed generation pipeline
SHALL continue to include a `set_variable` node configured according to the user's intent,
identical to the behavior of the original pipeline for such prompts.

**Validates: Requirements 3.1**

Property 3: Preservation — DAG Structural Validity

_For any_ prompt that produces a non-empty workflow (i.e., intent parsing succeeds and at least
one node is generated), the fixed pipeline SHALL produce a workflow where
`unifiedGraphOrchestrator.validateWorkflow()` returns `valid: true` with zero structural errors,
preserving the fully-connected DAG guarantee.

**Validates: Requirements 2.6, 3.4**

## Fix Implementation

### Changes Required

Assuming the root cause analysis is correct:

**File 1**: `worker/src/services/ai/workflow-structure-builder.ts`

**Function**: `buildStructure` (or equivalent method containing the fallback at ~line 934)

**Specific Changes**:
1. **Remove the `manual_trigger → set_variable` fallback block**: Delete the entire `return`
   statement that emits the hardcoded skeleton when `!intent.actions || intent.actions.length === 0`
   and `!hasValidTrigger`.
2. **Return an error/clarification signal instead**: Throw a typed error (e.g.,
   `IntentParsingError`) or return a structured result `{ error: 'INTENT_UNCLEAR', message: '...' }`
   that the caller can surface to the user as a clarification request.

---

**File 2**: `worker/src/services/ai/workflow-builder.ts`

**Change A — Remove `needsDataExtraction` enforcement block (~line 5513)**:
- Delete the entire `if (detectedRequirements.needsDataExtraction)` block that calls
  `simplifiedStructure.steps.unshift(setVariableStep)`.
- The `needsDataExtraction` flag may remain for other diagnostic purposes but must no longer
  drive node injection.

**Change B — Fix system prompt keyword mapping (~line 4592)**:
- Remove the line: `User says "extract", "get specific fields", "parse", "separate" → add set_variable or json_parser`
- Replace with a clarified rule that only triggers `set_variable` on explicit variable-assignment
  phrasing: `User says "set variable", "store in a variable", "assign to" → add set_variable`

**Change C — Remove duplicate prompt signal (~line 4532)**:
- Remove the conditional line:
  `${detectedRequirements.needsDataExtraction ? '- ✅ SET_VARIABLE NODE REQUIRED ...' : ''}`
  from the prompt output template.
- The `needsHttpRequest`, `needsConditional`, `needsLoop` signals may remain as they correctly
  reflect explicit user intent.

**Change D — Fix `inferStepType` fallback (~line 7022)**:
- Replace the final `return fallbackSchema ? 'set_variable' : ...` with:
  ```typescript
  console.warn(`[inferStepType] No match found for step: "${originalStep.substring(0, 80)}" — skipping`);
  return null;
  ```
- Update all callers of `inferStepType` to handle a `null` return by skipping the step rather
  than inserting it into the node list.

**Edge wiring**: No manual edge construction was introduced by these injection points (the
`set_variable` nodes were added to the step list and edges were derived later). After removing
the injections, the existing `unifiedGraphOrchestrator.initializeWorkflow(nodes)` call will
naturally produce correct edges for the remaining nodes. No additional orchestrator changes are
required unless a caller was manually wiring edges around the injected node.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that
demonstrate the bug on unfixed code to confirm the root cause, then verify the fix works
correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix.
Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that invoke the generation pipeline (or the specific functions) with
prompts that do not contain explicit variable-assignment intent, then assert that `set_variable`
appears in the output. Run these tests on the UNFIXED code to observe failures and understand
which injection path fired.

**Test Cases**:
1. **Extract keyword test**: Prompt = "Extract email and name from Google Sheets and create a
   contact in HubSpot" — assert `set_variable` is present in output (will pass on unfixed code,
   demonstrating the bug via paths 3 and 5).
2. **needsDataExtraction path test**: Construct a `detectedRequirements` object with
   `needsDataExtraction: true` and no explicit variable intent, call the enforcement block
   directly — assert `set_variable` is injected (will pass on unfixed code, demonstrating path 2).
3. **Intent failure fallback test**: Pass a prompt that produces `intent.actions = []` and
   `intent.trigger = undefined` to `buildStructure` — assert the returned workflow contains
   `set_variable` (will pass on unfixed code, demonstrating path 1).
4. **inferStepType fallback test**: Call `inferStepType` with a step description that matches no
   node in the library (e.g., "xyzzy operation") — assert return value is `'set_variable'` (will
   pass on unfixed code, demonstrating path 4).

**Expected Counterexamples**:
- `set_variable` node present in workflow for prompts with no variable-assignment intent.
- Possible causes: `needsDataExtraction` flag, system prompt keyword mapping, intent-failure
  fallback, `inferStepType` default.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed pipeline produces
the expected behavior (no `set_variable` node).

**Pseudocode:**
```
FOR ALL prompt WHERE NOT explicitVariableIntent(prompt) DO
  result := generateWorkflow_fixed(prompt)
  ASSERT NOT containsNode(result.workflow, 'set_variable')
  IF intentParsingFailed(prompt) THEN
    ASSERT result.error IS NOT NULL
  END IF
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (explicit variable
intent present), the fixed pipeline produces the same result as the original pipeline.

**Pseudocode:**
```
FOR ALL prompt WHERE explicitVariableIntent(prompt) DO
  original := generateWorkflow_original(prompt)
  fixed    := generateWorkflow_fixed(prompt)
  ASSERT containsNode(fixed.workflow, 'set_variable')
  ASSERT fixed.workflow.nodes.length == original.workflow.nodes.length
  ASSERT validateWorkflow(fixed.workflow).valid == true
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many prompt variations automatically across the input domain.
- It catches edge cases where a prompt contains both explicit variable intent and extraction
  keywords, ensuring the node is still included.
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs.

**Test Plan**: Observe behavior on UNFIXED code first for explicit variable-assignment prompts,
then write property-based tests capturing that behavior.

**Test Cases**:
1. **Explicit set_variable preservation**: Prompt = "Set a variable called userEmail to the
   value from the webhook body" — verify `set_variable` node is present after fix.
2. **Conditional logic preservation**: Prompt = "If the form score is above 80 send a Slack
   message, otherwise send an email" — verify `if_else` node is present and `set_variable` is
   absent after fix.
3. **Loop preservation**: Prompt = "For each row in Google Sheets create a contact in HubSpot"
   — verify `loop` node is present and `set_variable` is absent after fix.
4. **DAG validity preservation**: For any prompt that produces a non-empty workflow, verify
   `validateWorkflow` returns `valid: true` after fix.

### Unit Tests

- Test `inferStepType` with an unrecognized step string — assert `null` return and `console.warn`
  call after fix.
- Test `buildStructure` with empty intent — assert `IntentParsingError` is thrown (not a
  skeleton workflow) after fix.
- Test the `needsDataExtraction` enforcement block is absent — assert no `set_variable` is
  unshifted into steps when flag is true but no explicit intent exists.

### Property-Based Tests

- Generate random prompts without variable-assignment keywords and verify no `set_variable` node
  appears in the output workflow.
- Generate random prompts with explicit variable-assignment keywords and verify `set_variable`
  node is always present.
- Generate random valid node lists and verify `unifiedGraphOrchestrator.validateWorkflow()`
  returns `valid: true` for all outputs (structural DAG preservation).

### Integration Tests

- End-to-end: "Extract email from webhook and send to Slack" — verify full pipeline produces
  `webhook → slack_message` with no `set_variable`.
- End-to-end: "Set variable X to the webhook body field 'amount'" — verify full pipeline
  produces a workflow containing `set_variable` with correct config.
- End-to-end: Submit an ambiguous/empty prompt — verify the API returns a clarification error
  rather than a skeleton workflow.
- End-to-end: "For each row in Google Sheets send a Gmail" — verify `loop` node is present,
  `set_variable` is absent, and `validateWorkflow` passes.
