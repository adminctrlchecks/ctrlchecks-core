# Switch Node Case Generation Bug — Bugfix Design

## Overview

When a user describes a workflow with a switch node routing across N conditions (N ≥ 3), the
generated `cases` array is truncated and at least one `value` is set to a downstream node label
instead of the routing condition value. This produces a structurally invalid DAG that cannot route
correctly at runtime.

The fix is purely intent-driven and universal: `planSwitchCasesFromPrompt` must extract all N
condition values from the user's described intent, and `buildCaseNodeMappingForPlan` must map every
extracted case to a downstream node — never silently dropping cases when the chain is shorter than
the case list. No node-specific `if/switch` logic is added anywhere outside the registry.

---

## Glossary

- **Bug_Condition (C)**: A switch node generation request where the user's intent contains N ≥ 2
  named routing conditions and the resulting `cases` array has fewer than N entries, or at least one
  `case.value` equals a downstream node label rather than a routing condition value.
- **Property (P)**: For every switch node generation, `cases.length === N` and every `case.value`
  is a routing condition string extracted from user intent, not a node label.
- **Preservation**: All non-switch-node generation paths (linear workflows, `if_else` nodes, N=2
  switch nodes) must produce identical output before and after the fix.
- **`planSwitchCasesFromPrompt`**: Pure planning function in
  `worker/src/services/ai/switch-case-plan.ts` that extracts routing condition values from the
  user's prompt and upstream node type. Does not mutate workflows.
- **`buildCaseNodeMappingForPlan`**: Private method in `AIIntentClarifier`
  (`summarize-layer.ts`) that maps each extracted case value to a downstream node type in
  `proposedNodeChain`. Populates `WorkflowIntentPlan.caseNodeMapping`.
- **`caseNodeMapping`**: `{ [caseValue: string]: downstreamNodeType }` — the single source of
  truth for switch wiring passed from the summarize layer to the graph orchestrator.
- **`wireSwitchCaseEdges`**: Method in `UnifiedGraphOrchestratorImpl` that creates one labeled
  `case_n` edge per entry in `caseNodeMapping`. All edge creation goes through this path — no
  direct `workflow.edges.push`.
- **`validateWorkflow`**: Method in `UnifiedGraphOrchestratorImpl` that enforces structural
  invariants. Must return `valid: true` after the fix for any N ≥ 2.

---

## Bug Details

### Bug Condition

The bug manifests when a user describes a switch node with N ≥ 3 named routing conditions. Two
independent defects combine to produce the incorrect output:

**Defect A — Truncated case extraction** (`switch-case-plan.ts`):
`extractEnumeratedCasesFromPrompt` uses a `classifyIntro` regex that captures a segment and splits
it, but the split logic can miss conditions separated by certain delimiters. It then falls back to a
hardcoded `commonTriples` list (`['sales', 'support', 'general']`) that only ever contributes up to
3 values and only when those exact words appear. For prompts using domain-specific condition names
(e.g., `"shipped"`, `"processing"`, `"cancelled"`), the `casePattern` regex
`(\w+)\s+statuses?\s+(?:send|...)\s+(?:via|...)\s+(\w+)` captures the condition value in group 1
but the **destination label** in group 2 — and the function only pushes group 1. However, the
`ifPattern` regex `(?:if|when)\s+...\s+["']?(\w+)["']?\s+(?:route|send|...)\s+(?:to|via|...)\s+(\w+)`
captures the condition in group 1 correctly, but only fires when the prompt uses `if/when` phrasing.
When neither pattern fires for all N conditions, the returned `cases` array is shorter than N.

**Defect B — Silent case drop** (`summarize-layer.ts`, `buildCaseNodeMappingForPlan`):
After `planSwitchCasesFromPrompt` returns `cases`, the method iterates `cases` and maps each to
`downstreamNodes[i]`. `downstreamNodes` is built by slicing `proposedNodeChain` after the switch
node and filtering out `log_output`. When the chain has fewer downstream nodes than cases (e.g.,
chain is `[trigger, switch, gmail, log_output, slack, log_output]` but only 2 non-log nodes for 3
cases), `downstreamNodes[i]` is `undefined` for the last case and the mapping entry is silently
omitted. The resulting `caseNodeMapping` has fewer entries than `cases`, so `wireSwitchCaseEdges`
creates fewer edges than cases, producing a structurally invalid DAG.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { userPrompt: string, proposedNodeChain: string[] }
  OUTPUT: boolean

  conditionValues := extractEnumeratedCasesFromPrompt(input.userPrompt)
  switchIdx       := indexOf(input.proposedNodeChain, 'switch')
  downstreamNodes := input.proposedNodeChain
                       .slice(switchIdx + 1)
                       .filter(t => t !== 'log_output')

  RETURN (conditionValues.length < countNamedConditionsInPrompt(input.userPrompt))
      OR (Object.keys(buildCaseNodeMapping(conditionValues, downstreamNodes)).length
            < conditionValues.length)
END FUNCTION
```

### Examples

- **3-condition prompt** — "route orders by status: shipped, processing, cancelled → gmail, slack,
  log_output": expected `cases = [{value:'shipped'}, {value:'processing'}, {value:'cancelled'}]`,
  actual `cases = [{value:'shipped'}, {value:'processing'}]` (truncated to 2).
- **Label contamination** — same prompt with `casePattern` firing: `case.value` is set to
  `"send_tracking_details_via_gmail"` (the destination label) instead of `"shipped"`.
- **Chain too short** — chain is `[trigger, switch, gmail, log_output]` for 3 cases: only 1
  downstream node, so `caseNodeMapping` has 1 entry instead of 3, producing 1 edge instead of 3.
- **N=2 (no bug)** — "route messages as sales or support": `cases = [{value:'sales'},
  {value:'support'}]`, chain has 2 downstream nodes, mapping has 2 entries — correct.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Mouse clicks and all non-keyboard interactions on action buttons must continue to work exactly as
  before (not applicable here — this is a workflow generation bug, not a UI bug).
- Linear workflow generation (no switch node) must produce a fully connected linear DAG with no
  impact from this fix.
- `if_else` node generation must continue to produce exactly 2 outgoing edges labeled `true` and
  `false`.
- Switch node generation with exactly N=2 conditions must continue to produce exactly 2 cases and 2
  outgoing edges.
- The `expressionTemplate` and `discriminantField` returned by `planSwitchCasesFromPrompt` must
  remain unchanged for all inputs.
- All edge creation must continue to go through `wireSwitchCaseEdges` →
  `unifiedGraphOrchestrator.initializeWorkflow` — no direct `workflow.edges.push` anywhere.

**Scope:**
All inputs that do NOT involve a switch node with N ≥ 3 named routing conditions should be
completely unaffected by this fix. This includes:
- Linear workflows (trigger → action → output)
- `if_else` branching workflows
- Switch workflows with exactly 2 conditions
- Any workflow where `proposedNodeChain` does not contain `'switch'`

---

## Hypothesized Root Cause

Based on code analysis, the confirmed root causes are:

1. **Regex coverage gap in `extractEnumeratedCasesFromPrompt`** (`switch-case-plan.ts`): The
   `classifyIntro` regex only fires when the prompt contains `classify/categories/route/bucket/label
   ... as/into/to`. For prompts phrased as "route orders by status: shipped, processing, cancelled",
   the intro word is `"route"` but the structure is `"by status: ..."` — the regex does not match.
   The `casePattern` and `ifPattern` regexes are too narrow and miss many natural phrasings. The
   `commonTriples` fallback is hardcoded to 3 specific English words and cannot generalize.

2. **Silent case drop in `buildCaseNodeMappingForPlan`** (`summarize-layer.ts`): The method maps
   `cases[i]` to `downstreamNodes[i]` but only adds the entry when `downstreamNodes[i]` is defined.
   When the chain is shorter than the case list, excess cases are silently dropped with only a
   `console.warn`. The fix must either ensure the chain is long enough before mapping, or create
   placeholder entries for unmapped cases so `validateWorkflow` can surface the gap as a pipeline
   contract error rather than silently producing a broken DAG.

3. **No downstream chain length enforcement**: `buildDeterministicSinglePlanChain` builds the chain
   by counting `currentOutputs` against `requiredTargets` from `expectedBranchTargetCount(signals)`,
   but `expectedBranchTargetCount` may return a count that does not match the number of conditions
   extracted by `planSwitchCasesFromPrompt` (they run independently). There is no cross-check
   between the two.

4. **No `validateWorkflow` invariant for switch case count**: `validateWorkflow` does not currently
   assert that a switch node's out-degree equals `node.data.config.cases.length`. This means a
   structurally broken switch DAG passes validation silently.

---

## Correctness Properties

Property 1: Bug Condition — All N routing conditions extracted as case values

_For any_ user prompt where N ≥ 2 named routing condition values are described (e.g., "shipped,
processing, cancelled"), `planSwitchCasesFromPrompt` SHALL return a `cases` array with exactly N
entries, where each `case.value` equals the corresponding routing condition string from the prompt
and no `case.value` equals any downstream node label or node type string present in the prompt.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition — caseNodeMapping has exactly N entries

_For any_ `proposedNodeChain` containing a `'switch'` node and N downstream non-terminal nodes
(after the switch), `buildCaseNodeMappingForPlan` SHALL return a `CaseNodeMapping` with exactly N
entries — one per extracted case value — and SHALL NOT silently drop any case when
`downstreamNodes[i]` is undefined (instead, it must surface the gap as a pipeline error).

**Validates: Requirements 2.1, 2.3, 2.4**

Property 3: Bug Condition — Compiled switch node has exactly N outgoing case edges

_For any_ compiled workflow containing a switch node with N entries in `caseNodeMapping`, the switch
node SHALL have exactly N outgoing edges labeled `case_1` through `case_N`, and
`validateWorkflow` SHALL return `valid: true` with zero structural errors.

**Validates: Requirements 2.3, 2.4, 3.5**

Property 4: Preservation — Non-switch workflows are unaffected

_For any_ user prompt that does NOT produce a `'switch'` node in `proposedNodeChain`,
`buildCaseNodeMappingForPlan` SHALL return `undefined` and the compiled workflow SHALL be
byte-identical to the workflow produced before this fix.

**Validates: Requirements 3.3, 3.4**

Property 5: Preservation — N=2 switch workflows are unaffected

_For any_ user prompt that produces exactly 2 routing conditions, the fixed
`planSwitchCasesFromPrompt` SHALL return `cases.length === 2` with the same values as before the
fix, and the compiled workflow SHALL have exactly 2 outgoing `case_1` / `case_2` edges.

**Validates: Requirements 3.1, 3.5**

---

## Fix Implementation

### Changes Required

Assuming the root cause analysis above is correct, the fix touches exactly two files and adds one
new validation rule to the orchestrator. No node-specific `if/switch` logic is added anywhere.

---

**File 1**: `worker/src/services/ai/switch-case-plan.ts`

**Function**: `extractEnumeratedCasesFromPrompt`

**Specific Changes**:

1. **Replace narrow regex patterns with a general enumeration extractor**: The function must parse
   all comma/slash/`or`/`and`-separated tokens that appear after any routing-intent keyword
   (`route`, `classify`, `bucket`, `label`, `by`, `based on`, `depending on`, `when`, `if`,
   `status`, `type`, `category`). The extraction must be greedy — it must collect all tokens in the
   enumeration, not stop at 2 or 3.

   ```
   FUNCTION extractEnumeratedCasesFromPrompt(prompt)
     // 1. Find all enumeration segments after routing-intent keywords
     segments := findEnumerationSegmentsAfterRoutingKeywords(prompt)
     
     // 2. For each segment, split on [,/or/and/newline] and normalize tokens
     candidates := []
     FOR segment IN segments DO
       tokens := splitOnDelimiters(segment, [',', '/', 'or', 'and', '\n'])
       FOR token IN tokens DO
         normalized := normalize(token)  // lowercase, trim, replace spaces with _
         IF isValidConditionToken(normalized) THEN
           candidates.append(normalized)
         END IF
       END FOR
     END FOR
     
     // 3. Deduplicate preserving order
     RETURN deduplicate(candidates)
   END FUNCTION
   ```

2. **Remove the hardcoded `commonTriples` fallback**: The `['sales', 'support', 'general']`
   hardcoded list violates the universal fix principle. It must be removed entirely. If no
   enumeration is found, return an empty array and let the caller handle the gap.

3. **Remove the `casePattern` regex that captures destination labels**: The pattern
   `(\w+)\s+statuses?\s+(?:send|...)\s+(?:via|...)\s+(\w+)` captures the destination in group 2
   but only uses group 1. This pattern is fragile and must be replaced by the general extractor
   above.

---

**File 2**: `worker/src/services/ai/summarize-layer.ts`

**Function**: `buildCaseNodeMappingForPlan`

**Specific Changes**:

1. **Enforce chain length before mapping**: Before iterating `switchPlan.cases`, check that
   `downstreamNodes.length >= switchPlan.cases.length`. If not, call
   `buildDeterministicSinglePlanChain` to extend the chain with additional output nodes (one per
   missing case), using the same fallback output type selection logic already present in
   `buildDeterministicSinglePlanChain`.

   ```
   FUNCTION buildCaseNodeMappingForPlan(proposedNodeChain, userPrompt)
     switchIdx := indexOf(proposedNodeChain, 'switch')
     IF switchIdx === -1 THEN RETURN undefined END IF
     
     upstreamNodeType := proposedNodeChain[switchIdx - 1]
     switchPlan := planSwitchCasesFromPrompt(userPrompt, upstreamNodeType)
     IF switchPlan.cases.length === 0 THEN RETURN undefined END IF
     
     downstreamNodes := proposedNodeChain
       .slice(switchIdx + 1)
       .filter(t => t !== 'log_output')
     
     // Enforce: chain must have at least as many downstream nodes as cases
     IF downstreamNodes.length < switchPlan.cases.length THEN
       missingCount := switchPlan.cases.length - downstreamNodes.length
       // Surface as pipeline contract error — do NOT silently drop cases
       LOG_ERROR('caseNodeMapping: chain has ' + downstreamNodes.length +
                 ' downstream nodes but ' + switchPlan.cases.length + ' cases')
       RETURN { _error: 'chain_too_short', expected: switchPlan.cases.length,
                actual: downstreamNodes.length }
       // Caller (clarifyIntentAndGenerateSinglePlan) must record this in
       // PipelineContext.missing_fields and request clarification before compilation.
     END IF
     
     mapping := {}
     FOR i IN 0..switchPlan.cases.length-1 DO
       mapping[switchPlan.cases[i].value] := downstreamNodes[i]
     END FOR
     RETURN mapping
   END FUNCTION
   ```

2. **In `clarifyIntentAndGenerateSinglePlan`**: When `buildCaseNodeMappingForPlan` returns an error
   object, record the gap in `PipelineContext.missing_fields` and set `requires_confirmation: true`.
   Do not pass a broken `caseNodeMapping` to the graph orchestrator.

---

**File 3**: `worker/src/core/orchestration/unified-graph-orchestrator.ts`

**Function**: `validateWorkflow`

**Specific Changes**:

1. **Add switch case count invariant**: After the existing orphan-node check, add a validation rule:
   for every node whose registry definition has `isBranching: true` and `outgoingPorts` starting
   with `case_`, assert that the node's out-degree (number of outgoing edges) equals
   `node.data.config.cases?.length`. If they differ, push a descriptive error.

   ```
   FOR EACH node IN workflow.nodes DO
     nodeType := unifiedNormalizeNodeTypeString(node.type)
     nodeDef  := unifiedNodeRegistry.get(nodeType)
     IF nodeDef?.outgoingPorts?.some(p => p.startsWith('case_')) THEN
       outDegree  := workflow.edges.filter(e => e.source === node.id).length
       caseCount  := node.data?.config?.cases?.length ?? 0
       IF outDegree !== caseCount THEN
         errors.push(
           'Switch node "' + node.id + '": out-degree ' + outDegree +
           ' does not match cases.length ' + caseCount +
           ' — DAG structural invariant violated'
         )
       END IF
     END IF
   END FOR
   ```

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate
the bug on unfixed code (exploratory), then verify the fix works correctly and preserves existing
behavior (fix checking + preservation checking).

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or
refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that call `planSwitchCasesFromPrompt` and `buildCaseNodeMappingForPlan`
directly with N=3 condition prompts and assert the expected output. Run these tests on the UNFIXED
code to observe failures and confirm the root cause.

**Test Cases**:
1. **3-condition status prompt** — `planSwitchCasesFromPrompt("route orders by status: shipped,
   processing, cancelled", "ai_chat_model")` → expect `cases.length === 3` (will fail on unfixed
   code, returns 2).
2. **Label contamination check** — same prompt → expect no `case.value` equals
   `"send_tracking_details_via_gmail"` or any node type string (may fail on unfixed code).
3. **Chain-too-short mapping** — `buildCaseNodeMappingForPlan(['manual_trigger', 'switch', 'gmail',
   'log_output'], prompt_with_3_conditions)` → expect error/gap surfaced, not silent drop (will
   fail on unfixed code, silently drops case 3).
4. **validateWorkflow switch invariant** — compile a switch workflow with 3 cases but only 2 edges,
   call `validateWorkflow` → expect `valid: false` with descriptive error (will fail on unfixed
   code, returns `valid: true`).

**Expected Counterexamples**:
- `planSwitchCasesFromPrompt` returns `cases.length === 2` for a 3-condition prompt.
- `buildCaseNodeMappingForPlan` returns a mapping with 2 entries for a 3-case plan.
- `validateWorkflow` returns `valid: true` for a switch node with mismatched case/edge count.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce the
expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  cases   := planSwitchCasesFromPrompt_fixed(input.userPrompt, input.upstreamType)
  mapping := buildCaseNodeMappingForPlan_fixed(input.proposedNodeChain, input.userPrompt)
  
  ASSERT cases.length === countNamedConditionsInPrompt(input.userPrompt)
  ASSERT FOR ALL c IN cases: NOT isNodeLabel(c.value)
  ASSERT Object.keys(mapping).length === cases.length
  
  workflow := compileWorkflow(input.proposedNodeChain, mapping)
  ASSERT validateWorkflow(workflow).valid === true
  ASSERT switchNode.outDegree === cases.length
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed functions
produce the same result as the original functions.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT planSwitchCasesFromPrompt_original(input) 
       = planSwitchCasesFromPrompt_fixed(input)
  ASSERT buildCaseNodeMappingForPlan_original(input)
       = buildCaseNodeMappingForPlan_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain.
- It catches edge cases that manual unit tests might miss.
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs.

**Test Cases**:
1. **Linear workflow preservation** — generate random linear prompts (no switch), assert
   `caseNodeMapping === undefined` and compiled workflow is unchanged.
2. **if_else preservation** — generate prompts with `if_else` intent, assert 2 edges labeled `true`
   / `false`, no regression.
3. **N=2 switch preservation** — generate prompts with exactly 2 conditions, assert
   `cases.length === 2` and compiled workflow has exactly 2 `case_n` edges.
4. **expressionTemplate preservation** — for any upstream node type, assert
   `expressionTemplate === '{{$json.' + discriminantField + '}}'` is unchanged.

### Unit Tests

- `planSwitchCasesFromPrompt` with N=2, 3, 4, 5 conditions — assert `cases.length === N`.
- `planSwitchCasesFromPrompt` with domain-specific condition names (not `sales/support/general`) —
  assert correct extraction.
- `buildCaseNodeMappingForPlan` with chain shorter than case count — assert error surfaced, not
  silent drop.
- `validateWorkflow` with switch node out-degree ≠ `cases.length` — assert `valid: false` with
  descriptive error naming the node ID.
- Full compile of a 3-condition switch workflow — assert `validateWorkflow` returns `valid: true`.

### Property-Based Tests

The property-based testing library for this codebase is **fast-check** (TypeScript). Each property
test must run a minimum of 100 iterations and be tagged:

```typescript
// Feature: switch-node-case-generation-bug, Property N: <property_text>
```

- **Property 1 test**: Generate random arrays of 2–8 condition strings, build a prompt containing
  them, call `planSwitchCasesFromPrompt`, assert `cases.length === N` and no `case.value` is a node
  label.
- **Property 2 test**: Generate random `proposedNodeChain` arrays with a `'switch'` node and N
  downstream nodes, call `buildCaseNodeMappingForPlan`, assert mapping has exactly N entries (or
  surfaces an error when chain is too short).
- **Property 3 test**: Generate random N ∈ [2, 8], build a switch workflow with N cases and N
  downstream nodes, compile, call `validateWorkflow`, assert `valid: true` and switch out-degree
  equals N.
- **Property 4 test**: Generate random prompts without switch intent, assert `caseNodeMapping ===
  undefined` and compiled workflow is structurally valid.
- **Property 5 test**: Generate random prompts with exactly 2 conditions, assert `cases.length ===
  2` and compiled workflow has exactly 2 `case_n` edges.

### Integration Tests

- Full pipeline test: prompt "route orders by status: shipped, processing, cancelled — send
  tracking via gmail, notify team via slack, log unknown" → assert compiled workflow has 3 switch
  outgoing edges, `validateWorkflow` passes, each edge connects to the correct downstream node.
- Full pipeline test: prompt with 2 conditions → assert N=2 behavior unchanged (regression).
- Full pipeline test: linear prompt (no switch) → assert no switch node in compiled workflow,
  `validateWorkflow` passes (regression).
