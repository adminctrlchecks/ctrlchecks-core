# Nested Switch / If-Else Workflow Support — Bugfix Design

## Overview

Four defects collaborate to break workflow generation whenever a user's automation contains nested branching (a switch inside a switch, an if_else inside a switch, or any combination at more than one depth level). The fix is surgical and registry-driven: replace the flat iteration in `composeText()` with a recursive tree renderer, extend `buildConditions()` to iterate all branching nodes, exempt branching node types from the type-deduplication guard in `enforceRegistrySelectionContract()`, and add a nested-switch rule to the edge-reasoning system prompt. No new LLM calls are introduced; the edge-reasoning fix is a downstream consequence of the structural prompt fix.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — a resolved node list that contains two or more branching nodes at any nesting depth.
- **Property (P)**: The desired behavior when C holds — the structural prompt and selected-node list accurately represent the full nested branching hierarchy.
- **Preservation**: All existing single-level branching, linear, and non-branching-duplicate behaviors that must remain unchanged by the fix.
- **isBranching**: The `unifiedNodeRegistry.get(type)?.isBranching === true` flag — the only mechanism used to detect branching nodes; no type names are hardcoded.
- **BranchTree**: An internal data structure (array of `BranchTreeNode`) used by the fixed `composeText()` to represent the nesting: each branching node owns a sub-tree of downstream nodes until the next branching node at the same or higher level.
- **composeText()**: The method in `StructuralPromptGenerator` (`structural-prompt-generator.ts`) that converts `StructuralStep[]` into the human-readable `WORKFLOW / TRIGGER / FLOW / CONNECTIONS` text block.
- **buildConditions()**: The method in `StructuralPromptGenerator` that produces the `StructuralCondition[]` array — one entry per branching node.
- **enforceRegistrySelectionContract()**: The post-LLM validation function in `node-selection-stage.ts` that filters, deduplicates, and guarantees required node types in `selectedNodes`.
- **buildEdgeReasoningPrompt()**: The method in `SystemPromptBuilder` (`system-prompt-builder.ts`) that assembles the LLM system prompt for the edge-reasoning stage.

## Bug Details

### Bug Condition

The bug manifests when the resolved node list passed to `StructuralPromptGenerator.generate()` (or to `enforceRegistrySelectionContract()`) contains two or more nodes whose registry definition has `isBranching === true`. The generator finds only the first branching step index and treats every subsequent node as a flat case of that first branch; the contract enforcer silently drops the second instance of any branching type via a `Set<string>` deduplication guard.

**Formal Specification:**
```
FUNCTION isBugCondition(nodes)
  INPUT: nodes — Array<SelectedNode>
  OUTPUT: boolean

  branchingCount := COUNT(n IN nodes WHERE unifiedNodeRegistry.get(n.type)?.isBranching === true)
  RETURN branchingCount >= 2
END FUNCTION
```

### Examples

- **Switch → Switch (same type)**: User asks for a workflow that first routes by order status (switch: shipped / processing / cancelled) and then, inside the "processing" branch, routes again by priority (switch: high / low). `composeText()` flattens all downstream nodes as cases of the first switch; `enforceRegistrySelectionContract()` drops the second switch node entirely.
- **Switch → If-Else (different types)**: User asks for a workflow that routes by region (switch: EU / US / APAC) and then, inside the EU branch, conditionally sends a GDPR notice (if_else: true / false). `buildConditions()` only emits a `StructuralCondition` for the switch; the if_else has no condition entry.
- **If-Else → Switch (two levels)**: User asks for a workflow that first checks whether a record is active (if_else) and then, in the true branch, routes by record type (switch). The structural prompt describes all downstream nodes as flat cases of the if_else.
- **Three levels deep**: Any combination of three or more branching nodes — the recursive fix handles arbitrary depth; the flat fix would still fail at level 3.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Single-level branching (exactly one switch or one if_else) must continue to produce a structurally correct single-level branching DAG with all case edges labeled correctly.
- Linear workflows (no branching nodes) must continue to produce a linear DAG with `main`-typed edges and no spurious branch structure.
- Multiple instances of a non-branching node type (e.g. two `google_gmail` nodes for two separate branches) must continue to be preserved in `selectedNodes` exactly as today.
- The `allowedSet` registry-known type enforcement must continue to reject unknown node types.
- Single-level switch edge labels must remain semantic (e.g. `"shipped"`, `"processing"`, `"cancelled"`) rather than generic `"case_1"` / `"case_2"`.
- The deterministic node selection recovery path must continue to produce a minimal valid workflow rather than returning a `NO_VALID_NODES` error.

**Scope:**
All inputs that do NOT satisfy `isBugCondition` (i.e. contain fewer than two branching nodes) must be completely unaffected by this fix. This includes:
- All linear node lists.
- Node lists with exactly one branching node.
- Node lists with multiple non-branching duplicates.

## Hypothesized Root Cause

### Bug 1 — `composeText()` flat iteration

The current implementation calls `steps.findIndex(s => branchingStepNumbers.has(s.stepNumber))` which returns only the **first** branching step index. All nodes after that index are then iterated in a flat loop and labeled as cases of that first branch. There is no recursion and no concept of nesting depth.

### Bug 2 — `buildConditions()` single capture

`buildConditions()` iterates all nodes and pushes a `StructuralCondition` for each branching node it finds — this part is structurally correct. However, the `downstreamNodes` slice it uses for outcome extraction is always `nodes.slice(i + 1)`, which includes nodes belonging to inner branches. For the second branching node, the slice is empty (all downstream nodes were already consumed by the first iteration), so no condition is emitted. In practice the loop does push for each branching node, but the outcome text is derived from the wrong downstream scope, and the `trueOutcome`/`falseOutcome` for inner nodes is incorrect or empty.

### Bug 3 — `enforceRegistrySelectionContract()` Set-based deduplication

The `requiredTypes` loop uses:
```typescript
const seen = new Set(withoutExtraTriggers.map((n) => n.type));
for (const reqType of requiredTypes) {
  if (seen.has(reqType)) continue; // ← drops second switch!
  ...
}
```
When `requiredTypes` contains two entries of the same branching type (e.g. `["switch", "switch"]`), the `seen` set already contains `"switch"` after the first iteration, so the second is silently skipped. Additionally, the `kept` array building loop at the top uses `allowedSet` filtering but does not account for multiple instances of the same branching type being needed — it relies on the LLM output containing duplicates, which is then subject to the same `seen` guard downstream.

### Bug 4 — Edge reasoning prompt missing nested case values

This is a downstream consequence of Bug 1. When `composeText()` flattens the nested structure, the structural prompt passed to `buildEdgeReasoningPrompt()` does not describe the inner switch's case values. The LLM therefore cannot generate correct labeled edges for the inner switch's outgoing connections. Additionally, the system prompt contains no explicit rule about nested branching edge ownership, so even if the blueprint were correct, the LLM might still assign the outer switch's case values to the inner switch's edges.

## Correctness Properties

Property 1: Bug Condition — Nested Branching Structural Prompt Accuracy

_For any_ resolved node list where `isBugCondition` holds (two or more branching nodes at any nesting depth), the fixed `StructuralPromptGenerator.generate()` SHALL produce a `text` field that contains at least two distinct indentation levels of branch descriptions (e.g. `  →` for level 1 and `    →` for level 2), and a `conditions` array whose length equals the number of branching nodes in the input list.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition — Branching Node Preservation in Contract Enforcement

_For any_ parsed node list where `isBugCondition` holds, the fixed `enforceRegistrySelectionContract()` SHALL return a `selectedNodes` array that contains exactly as many nodes with `isBranching === true` as were present in the input list, regardless of whether multiple instances share the same type string.

**Validates: Requirements 2.3**

Property 3: Preservation — Single-Level and Linear Workflows Unchanged

_For any_ resolved node list where `isBugCondition` does NOT hold (zero or one branching node), the fixed `StructuralPromptGenerator.generate()` and `enforceRegistrySelectionContract()` SHALL produce results identical to the original (unfixed) implementations for those inputs.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

---

**File 1**: `worker/src/services/ai/stages/structural-prompt-generator.ts`

**Function**: `composeText()` and `buildConditions()`

**Specific Changes**:

1. **Introduce `BranchTreeNode` type**: A local interface that holds a `StructuralStep` (the branching node itself) and a `children` array of either leaf `StructuralStep` objects or nested `BranchTreeNode` objects.

2. **Introduce `buildBranchTree()` helper**: A recursive function that takes the remaining steps starting after a branching node and groups them into the correct sub-tree. It stops consuming steps when it encounters another branching node at the same or higher level (i.e. when the next branching node's depth is ≤ current depth). Returns a `BranchTreeNode[]`.

3. **Introduce `renderBranchTree()` helper**: A recursive function that takes a `BranchTreeNode[]` and an indentation depth (starting at 1) and emits lines of the form:
   - `  →` (two spaces per level) for depth 1
   - `    →` (four spaces) for depth 2
   - etc.
   Each branching node line uses the format: `N. DisplayName — evaluates conditions and routes to the appropriate branch`
   Each leaf node line uses: `{indent}→ Case "{caseLabel}": DisplayName — description`

4. **Replace flat iteration in `composeText()`**: Remove the `branchingStepIdx` / `downstreamSteps` flat loop. Instead, call `buildBranchTree()` on the full steps list and then `renderBranchTree()` to produce the FLOW section lines.

5. **Fix `buildConditions()`**: Scope the `downstreamNodes` slice for each branching node to only the nodes that belong to that node's sub-tree (i.e. nodes between this branching node and the next branching node at the same or higher level). Use the same tree-building logic as `buildBranchTree()` to determine the correct scope.

---

**File 2**: `worker/src/services/ai/stages/node-selection-stage.ts`

**Function**: `enforceRegistrySelectionContract()`

**Specific Changes**:

1. **Fix the `kept` array building loop**: When iterating `parsed` nodes, allow multiple instances of the same type through if `unifiedNodeRegistry.get(canonical)?.isBranching === true`. Non-branching types continue to be subject to the existing `allowedSet` filter (no change to that logic).

2. **Fix the `requiredTypes` injection loop**: Before applying the `seen.has(reqType)` guard, check `unifiedNodeRegistry.get(reqType)?.isBranching`. If the node is branching, skip the `seen` check and always push the node. If the node is non-branching, apply the existing `seen` guard as before.

3. **No change to trigger deduplication**: The `withoutExtraTriggers` logic (exactly one trigger) is unaffected.

4. **No change to `allowedSet` enforcement**: Unknown types and types not in the user-confirmed capability selection are still rejected.

---

**File 3**: `worker/src/services/ai/system-prompt-builder.ts`

**Function**: `buildEdgeReasoningPrompt()`

**Specific Changes**:

1. **Add nested branching rule to EDGE RULES section**: Insert the following rule after the existing switch case rule:
   > "For NESTED branching (a switch or if_else that is itself inside a branch of another switch/if_else): the inner branching node's outgoing edges MUST use the inner switch's own case values, NOT the outer switch's case values. Each level of nesting has its own independent set of case labels."

2. **Add nested switch example**: Append a concrete example to the EDGE RULES section showing a two-level switch structure:
   ```
   Example — nested switch:
     outer_switch → (case "A") → inner_switch
     inner_switch → (case "X") → node_for_AX
     inner_switch → (case "Y") → node_for_AY
     outer_switch → (case "B") → node_for_B
   The inner_switch edges use "X" and "Y", NOT "A" or "B".
   ```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate each bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write unit tests that construct node lists with two or more branching nodes and assert on the outputs of `composeText()`, `buildConditions()`, and `enforceRegistrySelectionContract()`. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Switch-in-Switch `composeText()` test**: Construct a node list `[manual_trigger, switch, gmail, switch, slack, hubspot]` where both `switch` nodes have `isBranching: true`. Assert that the output text contains two distinct indentation levels. (Will fail on unfixed code — all downstream nodes appear as flat cases of the first switch.)
2. **Switch-in-Switch `buildConditions()` test**: Same node list. Assert that `conditions.length === 2`. (Will fail on unfixed code — only one condition is emitted.)
3. **`enforceRegistrySelectionContract()` duplicate branching type test**: Pass `[{type: "switch", ...}, {type: "gmail", ...}, {type: "switch", ...}]` with `requiredNodeTypes: ["switch", "switch"]`. Assert that the output contains two switch nodes. (Will fail on unfixed code — second switch is dropped.)
4. **If-Else-in-Switch test**: Construct `[webhook, switch, if_else, gmail, slack]`. Assert `conditions.length === 2` and text has two indentation levels. (Will fail on unfixed code.)

**Expected Counterexamples**:
- `composeText()` output contains only one level of `  →` indentation regardless of nesting depth.
- `conditions.length === 1` even when two branching nodes are present.
- `selectedNodes` contains only one switch node when two were required.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce the expected behavior.

**Pseudocode:**
```
FOR ALL nodes WHERE isBugCondition(nodes) DO
  result := structuralPromptGenerator.generate({ resolvedNodes: nodes, ... })
  ASSERT countIndentationLevels(result.text) >= 2
  ASSERT result.conditions.length === countBranchingNodes(nodes)

  contractResult := enforceRegistrySelectionContract(nodes, ...)
  ASSERT countBranchingNodes(contractResult) === countBranchingNodes(nodes)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed functions produce the same result as the original functions.

**Pseudocode:**
```
FOR ALL nodes WHERE NOT isBugCondition(nodes) DO
  ASSERT structuralPromptGenerator_original.generate(nodes) 
       = structuralPromptGenerator_fixed.generate(nodes)
  ASSERT enforceRegistrySelectionContract_original(nodes)
       = enforceRegistrySelectionContract_fixed(nodes)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (zero branching nodes, exactly one branching node, various linear node counts).
- It catches edge cases that manual unit tests might miss (e.g. a single if_else at the end of a long linear chain).
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs.

**Test Plan**: Observe behavior on UNFIXED code first for single-level and linear inputs, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Linear workflow preservation**: Verify that a node list with no branching nodes produces the same `text` and `conditions` before and after the fix.
2. **Single-level switch preservation**: Verify that a node list with exactly one switch node produces the same output before and after the fix.
3. **Single-level if_else preservation**: Verify that a node list with exactly one if_else node produces the same output before and after the fix.
4. **Non-branching duplicate type preservation**: Verify that two `google_gmail` nodes in `enforceRegistrySelectionContract()` are still both preserved after the fix (existing behavior).

### Unit Tests

- Test `buildBranchTree()` with two-level switch-in-switch input — assert correct tree structure.
- Test `renderBranchTree()` with a pre-built two-level tree — assert correct indentation in output lines.
- Test `buildConditions()` with two branching nodes — assert `conditions.length === 2` with correct downstream scoping.
- Test `enforceRegistrySelectionContract()` with two switch nodes in `requiredTypes` — assert both survive.
- Test `enforceRegistrySelectionContract()` with two non-branching duplicate types — assert deduplication still applies.
- Test `buildEdgeReasoningPrompt()` output string — assert it contains the nested branching rule text.

### Property-Based Tests

- Generate random node lists with 2–5 branching nodes interspersed with action nodes; assert `conditions.length === branchingNodeCount` and text indentation depth equals nesting depth.
- Generate random node lists with exactly one branching node; assert fixed output equals original output (preservation).
- Generate random node lists with zero branching nodes; assert fixed output equals original output (preservation).
- Generate random `requiredTypes` arrays with N instances of the same branching type; assert output contains exactly N branching nodes of that type.

### Integration Tests

- Full pipeline test: user prompt describing a switch-in-switch workflow → assert the generated `workflow.edges` contains correctly labeled edges at both nesting levels.
- Full pipeline test: user prompt describing a linear workflow → assert no spurious branching structure is introduced.
- Full pipeline test: user prompt describing a single-level switch → assert semantic case labels are preserved (not replaced with `"case_1"` / `"case_2"`).
