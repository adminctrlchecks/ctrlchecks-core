# log-output-merge-terminal-fix Bugfix Design

## Overview

`log_output` is a merge-capable terminal node: it accepts connections from multiple upstream branches (e.g., all arms of a Switch node converging to a single log) and produces no outgoing edges. Currently, four enforcement layers treat it as a plain single-input node via hardcoded `node.type === 'log_output'` string checks rather than querying the `UnifiedNodeRegistry` for capability flags. The result is that multi-branch workflows have their extra incoming edges stripped, the DAG validator emits false structural errors, the branching validator blocks valid edge creation, and the type normalizer emits repeated `⚠️ Runtime unknown node type: "custom"` warnings.

The fix is a **permanent core architecture change**: register `log_output` once in `UnifiedNodeRegistry` with `allowsMultipleInputs: true`, `isTerminal: true`, and `maxOutDegree: 0`, then update each enforcement layer to query those flags. After the fix, zero `'log_output'` string literals will exist in any enforcement, validation, or reconciliation file.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — a `log_output` node has more than one incoming edge, causing enforcement layers to incorrectly reject or destructively rewrite the graph.
- **Property (P)**: The desired behavior when the bug condition holds — all incoming edges to `log_output` are preserved, no structural errors are emitted, and the node is treated as a valid merge-capable terminal.
- **Preservation**: All existing behaviors for single-input `log_output`, normal action nodes, dedicated `merge` nodes, and all other node types must remain unchanged.
- **`allowsMultipleInputs`**: A capability flag on `UnifiedNodeDefinition` (to be added to the type contract) indicating a node may legally receive more than one incoming edge.
- **`isTerminal`**: A capability flag indicating a node must have zero outgoing edges (`maxOutDegree: 0`).
- **`maxOutDegree`**: A numeric capability flag on `UnifiedNodeDefinition` specifying the maximum number of outgoing edges (0 for terminal nodes).
- **`splitMultiInputLogOutputs`**: The method in `EdgeReconciliationEngineImpl` that currently clones `log_output` nodes and rewires extra incoming edges away — the primary destructive behavior to be removed.
- **`UnifiedNodeTypeNormalizer`**: The utility in `worker/src/core/utils/unified-node-type-normalizer.ts` that resolves node type strings via the registry; currently emits warnings for `log_output` because it is unregistered.
- **`UnifiedNodeRegistry`**: The single source of truth at `worker/src/core/registry/unified-node-registry.ts` for all node capability flags and definitions.

## Bug Details

### Bug Condition

The bug manifests when a `log_output` node has more than one incoming edge. Each of the four enforcement layers independently mishandles this topology because none of them query the registry for `allowsMultipleInputs`; instead they either hardcode `node.type === 'log_output'` checks or rely on a `category === 'logic' && isBranching && tag === 'merge'` heuristic that `log_output` does not satisfy.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input — a WorkflowNode with id, type, and associated edges
  OUTPUT: boolean

  incomingEdgeCount := COUNT(edges WHERE target = input.id)

  RETURN input.type = 'log_output'
         AND incomingEdgeCount > 1
         AND (
           splitMultiInputLogOutputs clones the node
           OR dagValidator emits in-degree error
           OR graphBranchingValidator blocks edge creation
           OR unifiedNodeTypeNormalizer emits unknown-type warning
         )
END FUNCTION
```

### Examples

- **Switch → 3 branches → log_output**: A Switch node with `case_1`, `case_2`, `case_3` all targeting the same `log_output`. Currently: `splitMultiInputLogOutputs` clones `log_output` into `log_output_split_1` and `log_output_split_2`, destroying the single merge point. Expected: all three edges preserved, single `log_output` node retained.
- **IF → true/false → log_output**: Both the `true` and `false` branches of an IF node target the same `log_output`. Currently: DAG validator emits `LOG node <id> must have exactly 1 input, found 2`. Expected: no error; `log_output` with in-degree 2 is valid.
- **Branching validator blocks edge**: User attempts to add a second incoming edge to `log_output` via `canCreateEdge`. Currently: `allowsMultipleInputs` returns `false` because `log_output` has `category !== 'logic'` and no `merge` tag. Expected: returns `true` because registry reports `allowsMultipleInputs: true`.
- **Single-input log_output** (non-bug): A `log_output` with exactly one incoming edge. Expected: continues to work exactly as before — no regressions.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- A `log_output` node with exactly one incoming edge must continue to be accepted as a valid terminal node with no errors.
- Normal action nodes (non-merge, `allowsMultipleInputs` not set) with more than one incoming edge must continue to be rejected as structural violations.
- A `log_output` node with any outgoing edges must continue to be rejected (`maxOutDegree: 0`).
- Workflows containing a dedicated `merge` node followed by `log_output` must continue to be treated as valid (merge in-degree ≥ 2, out-degree 1; `log_output` in-degree 1, out-degree 0).
- The edge reconciliation engine must continue to produce the same edge set for all workflows that do not contain multi-input `log_output` nodes.
- All other node types' enforcement behavior must continue to be derived from the registry exactly as before.

**Scope:**
All inputs that do NOT involve a `log_output` node with more than one incoming edge should be completely unaffected by this fix. This includes:
- All single-input `log_output` nodes.
- All non-`log_output` node types.
- All existing `merge` node topologies.
- All branching (IF/Switch) nodes and their outgoing edge validation.

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **`log_output` not registered in `UnifiedNodeRegistry`**: The registry has no entry for `log_output`, so `unifiedNodeRegistry.get('log_output')` returns `undefined`. This causes `UnifiedNodeTypeNormalizer` to fall through to `method: 'unrecognized_type'` and emit the `⚠️ Runtime unknown node type: "custom"` warning. It also means no capability flags can be queried.

2. **`UnifiedNodeDefinition` type contract missing capability fields**: The `UnifiedNodeDefinition` interface in `unified-node-contract.ts` has no `allowsMultipleInputs`, `isTerminal`, or `maxOutDegree` fields. These must be added before the registry entry can carry them.

3. **`splitMultiInputLogOutputs` hardcodes `log_output` type check**: In `edge-reconciliation-engine.ts`, the method filters nodes by `this.getNodeType(n) === 'log_output'` and clones them when in-degree > 1. This is the primary destructive behavior. It must be replaced with a registry query: skip splitting for any node where `registry.get(type)?.allowsMultipleInputs === true`.

4. **DAG validator hardcodes `in-degree = 1` for `log_output`**: In `dag-validator.ts`, the `log_output` block explicitly checks `if (inDegree !== 1)` and emits an error. It must instead query `registry.get(normalizedType)?.allowsMultipleInputs` and permit any in-degree ≥ 1 when that flag is true.

5. **`GraphBranchingValidator.allowsMultipleInputs` uses category/tag heuristic**: The method checks `nodeDef.category === 'logic' && nodeDef.isBranching && tags.includes('merge')`. `log_output` has `category: 'utility'` (or similar), `isBranching: false`, and no `merge` tag, so it returns `false`. The method must instead read `nodeDef.allowsMultipleInputs` directly.

## Correctness Properties

Property 1: Bug Condition - Multi-Input log_output Preserved

_For any_ workflow where a `log_output` node has more than one incoming edge (isBugCondition returns true), the fixed system SHALL preserve all incoming edges to the single `log_output` node without cloning it, emit zero structural errors for that in-degree, and permit edge creation to that node — determined solely by querying `UnifiedNodeRegistry` for `allowsMultipleInputs: true`.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Non-Buggy Inputs Unchanged

_For any_ workflow input where the bug condition does NOT hold (single-input `log_output`, normal action nodes, other node types, dedicated merge topologies), the fixed system SHALL produce exactly the same structural validation results, edge sets, and registry responses as the original system, preserving all existing enforcement behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 3.8**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File 1**: `worker/src/core/types/unified-node-contract.ts`

**Interface**: `UnifiedNodeDefinition`

**Specific Changes**:
1. **Add `allowsMultipleInputs` field**: Add `allowsMultipleInputs?: boolean` to the `EDGE CONNECTIONS` section. When `true`, the node may legally receive more than one incoming edge. Defaults to `false` (undefined) for all existing nodes — no regressions.
2. **Add `isTerminal` field**: Add `isTerminal?: boolean`. When `true`, the node must have zero outgoing edges.
3. **Add `maxOutDegree` field**: Add `maxOutDegree?: number`. When set to `0`, enforcement layers reject any outgoing edges from this node.

---

**File 2**: `worker/src/core/registry/unified-node-registry.ts`

**Method**: `register` (called during initialization) or a dedicated inline registration block

**Specific Changes**:
4. **Register `log_output`**: Add a `UnifiedNodeDefinition` entry for `log_output` with:
   - `type: 'log_output'`
   - `allowsMultipleInputs: true`
   - `isTerminal: true`
   - `maxOutDegree: 0`
   - `isBranching: false`
   - `outgoingPorts: []`
   - `workflowBehavior: { alwaysRequired: true, alwaysTerminal: true, exemptFromRemoval: true, autoInject: true }`
   - Minimal `inputSchema`, `outputSchema`, `defaultConfig`, `validateConfig`, `execute` (delegates to existing legacy executor)

---

**File 3**: `worker/src/core/orchestration/edge-reconciliation-engine.ts`

**Method**: `splitMultiInputLogOutputs`

**Specific Changes**:
5. **Make method registry-aware (or remove)**: Replace the `this.getNodeType(n) === 'log_output'` filter with a registry query. For any node where `unifiedNodeRegistry.get(type)?.allowsMultipleInputs === true`, skip splitting entirely. If no other node types currently use this method, the method body becomes a no-op and can be removed or left as a documented stub. The `_split_` idempotency guard (requirement 3.6) is preserved until the method is fully removed.

---

**File 4**: `worker/src/core/validation/dag-validator.ts`

**Method**: `validateStructure`

**Specific Changes**:
6. **Remove hardcoded `log_output` in-degree check**: Delete the `if (normalizedType === 'log_output')` block that enforces `inDegree !== 1`. Replace with a registry-driven check: if `nodeDef?.allowsMultipleInputs === true`, permit any in-degree ≥ 1. If `nodeDef?.isTerminal === true` or `nodeDef?.maxOutDegree === 0`, enforce out-degree = 0.
7. **Remove `log_output` from `isSpecialNode` string list**: The `isSpecialNode` guard currently includes `normalizedType === 'log_output'` as a string literal. Remove it; the registry-driven path handles it.
8. **Remove `log_output` from the "LOG nodes without MERGE" check (section 9)**: The check that errors when a `log_output` has in-degree > 1 without a `merge` upstream must be gated on `!nodeDef?.allowsMultipleInputs` — i.e., only emit the error for nodes that do NOT allow multiple inputs.

---

**File 5**: `worker/src/core/validation/graph-branching-validator.ts`

**Method**: `allowsMultipleInputs`

**Specific Changes**:
9. **Replace category/tag heuristic with registry flag**: Change the method body from:
   ```typescript
   return nodeDef.category === 'logic' && nodeDef.isBranching && tags.includes('merge');
   ```
   to:
   ```typescript
   return nodeDef.allowsMultipleInputs === true;
   ```
   This is a pure registry delegation — no type-string checks, no category heuristics.

---

**Post-fix verification**:
10. **Zero `'log_output'` literals in enforcement files**: After all changes, a grep for `'log_output'` across `edge-reconciliation-engine.ts`, `dag-validator.ts`, `graph-branching-validator.ts`, and `unified-node-type-normalizer.ts` must return zero results (requirement 2.7).

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code to confirm root cause analysis; then verify the fix works correctly and preserves all existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that construct workflows with multi-input `log_output` nodes (Switch → 3 branches → log_output; IF → both branches → log_output) and assert that edges are preserved, no structural errors are emitted, and `canCreateEdge` returns `true`. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Switch 3-branch merge test**: Build a workflow with Switch → case_1/case_2/case_3 all targeting the same `log_output`. Assert `splitMultiInputLogOutputs` does NOT clone the node. (Will fail on unfixed code — cloning occurs.)
2. **IF both-branch merge test**: Build a workflow with IF → true/false both targeting `log_output`. Assert DAG validator emits zero errors. (Will fail on unfixed code — `LOG node must have exactly 1 input` error.)
3. **`canCreateEdge` multi-input test**: Call `graphBranchingValidator.canCreateEdge` on a workflow where `log_output` already has one incoming edge and a second is being added. Assert `allowed: true`. (Will fail on unfixed code — `allowsMultipleInputs` returns `false`.)
4. **Normalizer warning test**: Call `unifiedNormalizeNodeTypeString('log_output')` and assert no `⚠️ Runtime unknown node type` warning is emitted. (Will fail on unfixed code — `log_output` is unregistered.)

**Expected Counterexamples**:
- `splitMultiInputLogOutputs` produces cloned nodes (`log_output_split_1`, etc.) instead of preserving the original.
- DAG validator emits `LOG node <id> must have exactly 1 input, found N`.
- `canCreateEdge` returns `{ allowed: false, reason: '...does not allow multiple inputs' }`.
- `unifiedNormalizeNodeTypeString` emits `⚠️ Runtime unknown node type: "custom" (method: unrecognized_type)`.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed system produces the expected behavior.

**Pseudocode:**
```
FOR ALL workflow WHERE isBugCondition(log_output_node_in_workflow) DO
  result := reconcileWorkflow_fixed(workflow)
  ASSERT result.nodes contains exactly ONE log_output node (no clones)
  ASSERT result.edges contains ALL original incoming edges to log_output
  ASSERT dagValidator_fixed.validateStructure(result) has zero errors
  ASSERT graphBranchingValidator_fixed.canCreateEdge(..., log_output_id) = { allowed: true }
  ASSERT unifiedNormalizeNodeTypeString('log_output') emits no warnings
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed system produces the same result as the original system.

**Pseudocode:**
```
FOR ALL workflow WHERE NOT isBugCondition(any_node_in_workflow) DO
  ASSERT reconcileWorkflow_original(workflow).edges = reconcileWorkflow_fixed(workflow).edges
  ASSERT dagValidator_original.validateStructure(workflow) = dagValidator_fixed.validateStructure(workflow)
  ASSERT graphBranchingValidator_original.allowsMultipleInputs(type) = graphBranchingValidator_fixed.allowsMultipleInputs(type)
         FOR ALL type != 'log_output'
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (random node types, random in-degrees).
- It catches edge cases that manual unit tests might miss (e.g., nodes with `category: 'logic'` and `tag: 'merge'` must still return `true` from `allowsMultipleInputs`).
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs.

**Test Plan**: Observe behavior on UNFIXED code first for single-input `log_output`, normal action nodes, and dedicated merge topologies, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Single-input log_output preservation**: Verify a `log_output` with exactly one incoming edge continues to pass DAG validation and reconciliation with no changes.
2. **Normal node multi-input rejection preserved**: Verify that a normal action node (e.g., `google_sheets`) with two incoming edges continues to be rejected by both the DAG validator and `canCreateEdge`.
3. **Dedicated merge topology preserved**: Verify that a workflow with `merge` → `log_output` (merge in-degree 2, log in-degree 1) continues to be valid.
4. **`allowsMultipleInputs` false for non-merge nodes**: Property test — for any node type other than `log_output` (and other explicitly registered merge-capable nodes), `allowsMultipleInputs` must return `false`.
5. **Registry unchanged for other types**: Verify `unifiedNodeRegistry.get(type)` returns identical definitions for all pre-existing node types after the fix.

### Unit Tests

- Test `unifiedNodeRegistry.get('log_output')` returns a definition with `allowsMultipleInputs: true`, `isTerminal: true`, `maxOutDegree: 0`.
- Test `unifiedNormalizeNodeTypeString('log_output')` returns `'log_output'` with no warnings.
- Test `splitMultiInputLogOutputs` with a multi-input `log_output` returns the original node list and edge set unchanged.
- Test DAG validator emits zero errors for `log_output` with in-degree 2 or 3.
- Test DAG validator still emits out-degree error for `log_output` with any outgoing edge.
- Test `graphBranchingValidator.allowsMultipleInputs('log_output')` returns `true`.
- Test `graphBranchingValidator.allowsMultipleInputs('google_sheets')` still returns `false`.
- Test `canCreateEdge` allows a second incoming edge to `log_output`.

### Property-Based Tests

- Generate random node types (excluding `log_output`) and assert `allowsMultipleInputs` returns `false` for all of them — preserving the existing heuristic result for all non-merge nodes.
- Generate random workflows with a single-input `log_output` and assert reconciliation produces an identical edge set before and after the fix.
- Generate random in-degrees (1–10) for `log_output` and assert the DAG validator emits zero in-degree errors and exactly one out-degree error only when out-degree > 0.
- Generate random workflows with no `log_output` nodes and assert the reconciliation engine output is byte-for-byte identical before and after removing `splitMultiInputLogOutputs` logic.

### Integration Tests

- Full workflow: `manual_trigger → switch(3 cases) → [action_a, action_b, action_c] → log_output`. Assert `validateWorkflow` returns `valid: true` with zero errors and the final edge set contains all three incoming edges to `log_output`.
- Full workflow: `manual_trigger → if_else → [true: action_a, false: action_b] → log_output`. Assert same.
- Regression: `manual_trigger → action → merge(2 inputs) → log_output`. Assert still valid (dedicated merge topology unchanged).
- Grep assertion: After fix, `grep -r "'log_output'" worker/src/core/orchestration worker/src/core/validation worker/src/core/utils` returns zero results.
