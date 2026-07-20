# Workflow Builder UX Fixes — Bugfix Design

## Overview

Three independent bugs degrade the workflow builder UX after AI-generated workflows are created:

1. **Switch/If case edge wiring** — `wireSwitchCaseEdges()` correctly resolves targets by ID/type, but when the ID lookup fails (plan-time vs materialized ID mismatch) it falls through to positional fallback, wiring the wrong node. Additionally, `reconcileEdges()` Step 4 re-creates branch edges for ports that `wireSwitchCaseEdges()` already wired correctly, because `validateEdges()` strips those edges as "execution-order violations" before Step 4 runs.

2. **Redundant credentials step** — `proceedFromOwnershipStage()` routes to a separate `'credentials'` wizard step whenever credential questions exist, even though those fields were already collected inline during the field-ownership step. The step must be removed entirely.

3. **AI ownership toggle not persisted** — `fillModeValues` wizard state (keys `mode_<nodeId>_<fieldName>`) is never written to `node.data.config._fillMode` before `setNodes()` is called, so `PropertiesPanel` always falls back to `'manual_static'` and never shows the AI runtime banner.

---

## Glossary

- **Bug_Condition (C)**: The specific input state that triggers each defect.
- **Property (P)**: The correct observable behavior that must hold after the fix.
- **Preservation**: Existing behaviors that must remain byte-for-byte identical after the fix.
- **wireSwitchCaseEdges()**: Method in `unified-graph-orchestrator.ts` that pre-wires labeled case edges onto the seed workflow before reconciliation.
- **reconcileEdges()**: Method in `edge-reconciliation-engine.ts` that normalizes all edges to match execution order; Step 4 handles branching fanout.
- **validateEdges()**: Sub-step of `reconcileEdges()` that flags edges for removal; currently removes port-labeled branch edges that don't satisfy strict monotonic execution order.
- **caseNodeMapping**: `Record<caseValue, { targetNodeType, targetNodeId, slot }>` produced by `buildCaseNodeMappingFromPlanChain()` and passed as `SwitchContext` to `initializeWorkflow()`.
- **fillModeValues**: React state in `AutonomousAgentWizard` keyed as `mode_<nodeId>_<fieldName>` → `FieldFillMode`.
- **_fillMode**: `Record<fieldName, FieldFillMode>` stored inside `node.data.config` and read by `resolveEffectiveFieldFillMode()` in `PropertiesPanel`.
- **proceedFromOwnershipStage()**: Wizard function that advances from the field-ownership step; currently routes to `'credentials'` when credential questions exist.

---

## Bug Details

### Bug 1 — Switch/If Case Edge Wiring

#### Bug Condition

The bug manifests in two related sub-paths:

**Sub-bug A** — ID lookup fallthrough in `wireSwitchCaseEdges()`: when `targetNodeId` is set in `caseNodeMapping` but the exact-ID lookup fails (because plan-time IDs differ from materialized node IDs), the code falls through to the type-based lookup and then to positional fallback, wiring the wrong node.

**Sub-bug B** — Step 4 overwrites pre-wired edges: `validateEdges()` removes port-labeled edges (e.g. `case_1`, `case_2`) from the switch node because they may not satisfy the strict `sourceIdx < targetIdx` monotonic order check (branch targets can appear at non-consecutive positions). After removal, Step 4 re-creates edges positionally, ignoring the semantic mapping.

**Formal Specification:**
```
FUNCTION isBugCondition_SwitchEdge(X)
  INPUT: X = { caseNodeMapping, workflowNodes, existingEdges }
  OUTPUT: boolean

  RETURN (
    EXISTS caseEntry IN X.caseNodeMapping WHERE
      caseEntry.targetNodeId IS SET
      AND workflowNodes CONTAINS node WHERE node.id = caseEntry.targetNodeId
      AND assignedEdge FOR caseEntry POINTS TO node WHERE node.id ≠ caseEntry.targetNodeId
  ) OR (
    EXISTS branchPort IN switch.outgoingPorts WHERE
      portLabeledEdge EXISTS in workingEdges for that port
      AND Step4 creates a NEW edge for that same port, overwriting it
  )
END FUNCTION
```

#### Examples

- **Correct ID, wrong wire**: `caseNodeMapping = { "urgent": { targetNodeId: "node-abc", targetNodeType: "google_gmail" } }`. Two Gmail nodes exist. ID lookup fails (plan-time ID `node-abc` ≠ materialized ID `node-xyz`). Type lookup picks the first Gmail node (index 0) instead of the second (index 1). Expected: edge to `node-xyz`. Actual: edge to first Gmail node.
- **Step 4 overwrite**: `wireSwitchCaseEdges()` creates `switch → gmail_1` via `case_1` and `switch → slack_1` via `case_2`. `validateEdges()` removes both because `gmail_1` is at execution-order index 3 and `slack_1` at index 4, but the switch is at index 2 — the edges are valid monotonically, yet the port-label check may still flag them if `shouldKeepEdgeDespiteNonMonotonicOrder` returns false. Step 4 then re-creates edges positionally.
- **Edge case — no downstream nodes**: `caseNodeMapping` has 3 entries but only 2 downstream nodes. Third case gets no edge. Expected: warning logged, no crash.

---

### Bug 2 — Credentials Step Routing

#### Bug Condition

The bug manifests when `proceedFromOwnershipStage()` is called and `credentialQuestionsForStep.length > 0` or `oauthRequirementCandidatesList.length > 0`. The function routes to `setStep('credentials')` instead of `setStep('configuration')`.

**Formal Specification:**
```
FUNCTION isBugCondition_CredentialsStep(X)
  INPUT: X = { credentialQuestionsForStep, oauthRequirementCandidatesList }
  OUTPUT: boolean

  RETURN credentialQuestionsForStep.length > 0
      OR oauthRequirementCandidatesList.length > 0
END FUNCTION
```

#### Examples

- User configures a Slack webhook inline during ownership step. `credentialQuestionsForStep.length = 1`. `proceedFromOwnershipStage()` routes to `'credentials'` and re-shows the Slack webhook field. Expected: routes to `'configuration'`.
- User configures Gmail OAuth inline. `oauthRequirementCandidatesList.length = 1`. Same incorrect routing occurs.
- User has no credential questions. `proceedFromOwnershipStage()` already routes to `'configuration'` — this path is unaffected.

---

### Bug 3 — AI Ownership Toggle Persistence

#### Bug Condition

The bug manifests when the wizard completes and calls `setNodes()` with the normalized nodes from the `attach-inputs` API response. The `fillModeValues` state contains `mode_<nodeId>_<fieldName>` entries set to `'runtime_ai'`, but those values are never merged into `node.data.config._fillMode` before `setNodes()` is called.

**Formal Specification:**
```
FUNCTION isBugCondition_FillMode(X)
  INPUT: X = { fillModeValues, nodes }
  OUTPUT: boolean

  RETURN EXISTS key IN fillModeValues WHERE
    key MATCHES /^mode_(.+)_(.+)$/
    AND fillModeValues[key] = 'runtime_ai'
    AND LET nodeId = capture group 1, fieldName = capture group 2
    AND nodes.find(n => n.id = nodeId).data.config._fillMode[fieldName]
        IS undefined OR ≠ 'runtime_ai'
END FUNCTION
```

#### Examples

- Wizard sets `fillModeValues["mode_node1_subject"] = "runtime_ai"`. After `setNodes()`, `node1.data.config._fillMode` is `{}`. `PropertiesPanel` calls `resolveEffectiveFieldFillMode("subject", schema, config)` → returns `'manual_static'` → shows "Not configured". Expected: returns `'runtime_ai'` → shows AI runtime banner.
- Wizard sets `fillModeValues["mode_node2_body"] = "buildtime_ai_once"`. Same path — `_fillMode` is never written. Expected: `config._fillMode["body"] === "buildtime_ai_once"`.
- Field has `manual_static` in `fillModeValues`. After fix, `_fillMode["field"] === "manual_static"`. `resolveEffectiveFieldFillMode` returns `'manual_static'` — no banner shown. Correct.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- All workflows without switch/if_else nodes must continue to reconcile edges using the existing linear and output-node wiring logic with zero behavioral change.
- Mouse-based interactions with the wizard (clicking buttons, filling fields) must continue to work exactly as before.
- Wizard steps other than `'credentials'` (`'idle'`, `'ownership'`, `'configuration'`, `'review'`, `'building'`, `'complete'`) must render and behave identically.
- Credential values collected inline during the ownership step must continue to be stored and submitted as they are today — only the redundant second step is removed.
- Fields with `manual_static` fill mode (explicit or default) must continue to render as standard editable inputs in `PropertiesPanel` with no AI banner.
- `resolveEffectiveFieldFillMode()` must continue to return `'manual_static'` as the fallback when `_fillMode` has no entry and the schema has no default.
- The `attach-inputs` API processing of non-`mode_` keys (regular field values) must be unaffected.

**Scope:**
All inputs that do NOT involve switch/if_else case wiring, the credentials routing branch, or the `fillModeValues` → `_fillMode` write path are completely unaffected by these fixes.

---

## Hypothesized Root Cause

### Bug 1

1. **ID mismatch between plan-time and materialized nodes**: `buildCaseNodeMappingFromPlanChain()` records `nodeIdsByChainIndex[i]` at plan time, but `initializeWorkflow()` may assign fresh UUIDs to materialized nodes, making the stored IDs stale. The secondary type-based lookup in `wireSwitchCaseEdges()` then picks the first type-match in array order rather than the intended node.

2. **`validateEdges()` strips port-labeled branch edges**: The monotonic order check (`sourceIdx >= targetIdx`) does not have a carve-out for edges whose `type` or `sourceHandle` matches a branch port pattern (`case_*`, `true`, `false`). These edges are valid intentional branch edges but get flagged as execution-order violations and removed before Step 4 runs.

3. **Step 4 `edgeForPortExists` guard runs on `workingEdges` after removal**: By the time Step 4 checks `workingEdges.some(e => e.source === branchingNode.id && (e.type === portName || e.sourceHandle === portName))`, the pre-wired edges have already been stripped by Step 2 (`edgesToKeep` excludes them). The guard finds nothing and creates new positional edges.

### Bug 2

4. **`proceedFromOwnershipStage()` credential routing is unconditional**: The guard `if (credentialQuestionsForStep.length > 0 || oauthRequirementCandidatesList.length > 0)` was added when the credentials step was a separate collection phase. Now that credentials are collected inline, this branch is dead code that incorrectly re-routes users.

### Bug 3

5. **`fillModeValues` is local wizard state never flushed to node config**: The wizard accumulates fill mode selections in React state but the `setNodes()` call after the `attach-inputs` API response uses `normalized.nodes` directly from the API, which has no knowledge of the wizard's `fillModeValues`. There is no transform step between the API response and `setNodes()`.

6. **Two `setNodes()` call sites**: The `fieldOwnershipMap` synthesis path (around line 2444) also calls `setNodes()` without applying `fillModeValues`, so the bug exists in both code paths.

---

## Correctness Properties

Property 1: Bug Condition — Switch Case Edges Wire to Semantically Correct Targets

_For any_ workflow where `caseNodeMapping` contains entries with `targetNodeId` set and the corresponding node exists in `workflow.nodes`, the fixed `wireSwitchCaseEdges()` followed by `reconcileEdges()` SHALL produce exactly one edge per case port, and each edge's `target` SHALL equal the `targetNodeId` specified in the mapping (or the best type-matched node when `targetNodeId` is absent), with no Step 4 overwrite.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation — Non-Switch Workflows Unaffected by Edge Reconciliation Changes

_For any_ workflow that contains no switch or if_else nodes, the fixed `reconcileEdges()` SHALL produce the same edge set as the original `reconcileEdges()`, preserving all linear and output-node wiring behavior.

**Validates: Requirements 3.1, 3.2**

Property 3: Bug Condition — Credentials Step Is Never Reached

_For any_ call to `proceedFromOwnershipStage()` regardless of `credentialQuestionsForStep.length` or `oauthRequirementCandidatesList.length`, the fixed function SHALL set `step` to `'configuration'` and SHALL NOT set `step` to `'credentials'`.

**Validates: Requirements 2.4, 2.5**

Property 4: Preservation — Non-Credentials Wizard Steps Unaffected

_For any_ wizard state where `step` is not `'credentials'`, the fixed wizard SHALL render and behave identically to the original, with no change to ownership, configuration, review, building, or complete step rendering.

**Validates: Requirements 3.3, 3.4**

Property 5: Bug Condition — fillModeValues Are Written to node.data.config._fillMode

_For any_ `fillModeValues` map containing one or more `mode_<nodeId>_<fieldName>` entries, the fixed `setNodes()` call site SHALL produce nodes where `node.data.config._fillMode[fieldName]` equals the corresponding value from `fillModeValues` for every matching `nodeId`/`fieldName` pair.

**Validates: Requirements 2.6, 2.7**

Property 6: Preservation — Non-AI Fill Mode Fields Unaffected

_For any_ node field where `fillModeValues` contains no entry (or the entry is `'manual_static'`), the fixed code SHALL leave `node.data.config._fillMode[fieldName]` as `'manual_static'` (or absent), and `resolveEffectiveFieldFillMode()` SHALL continue to return `'manual_static'` as the fallback.

**Validates: Requirements 3.5, 3.6, 3.7**

---

## Fix Implementation

### Bug 1 — Fix A: Secondary type+position lookup in `wireSwitchCaseEdges()`

**File**: `worker/src/core/orchestration/unified-graph-orchestrator.ts`

**Function**: `wireSwitchCaseEdges()` — resolution step (1) ID lookup

**Specific Changes**:

1. **Add index-aware secondary lookup**: After the exact-ID lookup fails (step 1), before falling to the pure type-based lookup (step 2), add a lookup that finds the node at position `i` in `downstreamNodes` whose type matches `targetNodeType`. This handles the case where IDs are stale but the positional order from plan time is still correct.

```
// Between step (1) and step (2):
if (!targetNode && targetNodeType) {
  const candidateByPosition = downstreamNodes[index];
  if (
    candidateByPosition &&
    !assignedNodeIds.has(candidateByPosition.id) &&
    this.getNodeType(candidateByPosition) === targetNodeType
  ) {
    targetNode = candidateByPosition;
  }
}
```

### Bug 1 — Fix B: Guard branch edges in `validateEdges()`

**File**: `worker/src/core/orchestration/edge-reconciliation-engine.ts`

**Function**: `validateEdges()` — execution order violation check

**Specific Changes**:

2. **Exempt port-labeled branch edges from removal**: In the `sourceIdx >= targetIdx` violation block, before pushing to `edgesToRemove`, check whether the edge is a port-labeled branch edge from a branching node. If so, skip removal — these are intentional and must survive into Step 4's `edgeForPortExists` guard.

```
// Before: edgesToRemove.push(edge) for execution order violation
// Add guard:
const edgeLabel = String(edge.type || edge.sourceHandle || '');
const isBranchPortEdge =
  edgeLabel === 'true' ||
  edgeLabel === 'false' ||
  /^case_\d+$/.test(edgeLabel);
const sourceNodeForGuard = workflow.nodes.find(n => n.id === edge.source);
const sourceIsBranching = sourceNodeForGuard
  ? unifiedNodeRegistry.get(this.getNodeType(sourceNodeForGuard))?.isBranching === true
  : false;
if (isBranchPortEdge && sourceIsBranching) {
  return; // Keep intentional branch edge — Step 4 will see it via edgeForPortExists
}
```

### Bug 2 — Remove credentials step routing

**File**: `ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx`

**Function**: `proceedFromOwnershipStage()` (around line 4622)

**Specific Changes**:

3. **Replace credentials routing with direct configuration routing**: Remove the `if (credentialQuestionsForStep.length > 0 || oauthRequirementCandidatesList.length > 0)` block entirely. Replace with direct advance to `'configuration'`:

```ts
// Remove:
if (credentialQuestionsForStep.length > 0 || oauthRequirementCandidatesList.length > 0) {
    setCredentialQuestionIndex(0);
    setStep('credentials');
    return;
}
// Replace with (already present below, just remove the early return above):
setCurrentQuestionIndex(0);
setStep('configuration');
```

4. **Remove credentials step JSX render block**: Remove the Card block rendered when `step === 'credentials'` (around lines 5769–5850). The `WizardStep` union type may retain `'credentials'` for backward compatibility but the render path must be deleted.

### Bug 3 — Apply fillModeValues before setNodes()

**File**: `ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx`

**Specific Changes**:

5. **Extract a reusable `applyFillModesToNodes` helper**: Define once near the top of the component (or as a module-level pure function):

```ts
function applyFillModesToNodes(
  nodes: any[],
  fillModeValues: Record<string, string>
): any[] {
  return nodes.map((node: any) => {
    const fillModeMap: Record<string, string> = {};
    const prefix = `mode_${node.id}_`;
    Object.entries(fillModeValues).forEach(([key, mode]) => {
      if (key.startsWith(prefix)) {
        fillModeMap[key.slice(prefix.length)] = mode;
      }
    });
    if (Object.keys(fillModeMap).length === 0) return node;
    return {
      ...node,
      data: {
        ...node.data,
        config: {
          ...(node.data?.config || {}),
          _fillMode: {
            ...(node.data?.config?._fillMode || {}),
            ...fillModeMap,
          },
        },
      },
    };
  });
}
```

6. **Apply at the primary `setNodes()` call site** (around line 2400, after `attach-inputs` API response):

```ts
// Before: setNodes(normalized.nodes as any[])
setNodes(applyFillModesToNodes(normalized.nodes as any[], fillModeValues));
```

7. **Apply at the `fieldOwnershipMap` synthesis `setNodes()` call site** (around line 2444):

```ts
// Before: setNodes(normalized.nodes as any[])
setNodes(applyFillModesToNodes(normalized.nodes as any[], fillModeValues));
```

---

## Testing Strategy

### Validation Approach

Two-phase: first surface counterexamples on unfixed code to confirm root cause, then verify fix correctness and preservation.

### Exploratory Bug Condition Checking

**Goal**: Demonstrate each bug on unfixed code before implementing the fix.

**Bug 1 Test Plan**: Construct a minimal workflow with a switch node and two downstream nodes of the same type. Set `caseNodeMapping` with explicit `targetNodeId` values that differ from the materialized node IDs (simulating plan-time/materialized ID mismatch). Call `wireSwitchCaseEdges()` then `reconcileEdges()` on unfixed code and assert edge targets — expect failures showing positional wiring.

**Bug 2 Test Plan**: Render `AutonomousAgentWizard` with `credentialQuestionsForStep` containing one entry. Call `proceedFromOwnershipStage()`. Assert `step` state — expect `'credentials'` on unfixed code, demonstrating the incorrect routing.

**Bug 3 Test Plan**: Simulate wizard completion with `fillModeValues = { "mode_node1_subject": "runtime_ai" }`. Capture the nodes passed to `setNodes()`. Assert `node1.data.config._fillMode?.subject` — expect `undefined` on unfixed code.

**Test Cases**:
1. **Switch ID mismatch**: `targetNodeId` set but stale → wrong edge target (will fail on unfixed code)
2. **Step 4 overwrite**: Pre-wired case edges removed by `validateEdges()` → Step 4 re-creates positionally (will fail on unfixed code)
3. **Credentials routing**: `credentialQuestionsForStep.length > 0` → step becomes `'credentials'` (will fail on unfixed code)
4. **fillMode not persisted**: `fillModeValues` has `runtime_ai` entries → `_fillMode` is empty after `setNodes()` (will fail on unfixed code)

**Expected Counterexamples**:
- Edge targets do not match `targetNodeId` values in `caseNodeMapping`
- `step === 'credentials'` after `proceedFromOwnershipStage()` with credential questions
- `node.data.config._fillMode` is `undefined` or `{}` after wizard completion

### Fix Checking

**Goal**: Verify that for all inputs where each bug condition holds, the fixed code produces the expected behavior.

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition_SwitchEdge(X) DO
  result := wireSwitchCaseEdges_fixed(X) then reconcileEdges_fixed(X)
  ASSERT FOR EACH caseEntry: result.edges has exactly one edge per port
  ASSERT FOR EACH caseEntry with targetNodeId: edge.target = targetNodeId
END FOR

FOR ALL X WHERE isBugCondition_CredentialsStep(X) DO
  result := proceedFromOwnershipStage_fixed(X)
  ASSERT result.step = 'configuration'
  ASSERT 'credentials' Card NOT in rendered output
END FOR

FOR ALL X WHERE isBugCondition_FillMode(X) DO
  result := applyFillModesToNodes(X.nodes, X.fillModeValues)
  ASSERT FOR EACH mode_<nodeId>_<fieldName> key:
    result.find(n => n.id = nodeId).data.config._fillMode[fieldName] = fillModeValues[key]
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where each bug condition does NOT hold, the fixed code produces the same result as the original.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition_SwitchEdge(X) DO
  ASSERT reconcileEdges_original(X) = reconcileEdges_fixed(X)
END FOR

FOR ALL X WHERE NOT isBugCondition_CredentialsStep(X) DO
  ASSERT proceedFromOwnershipStage_original(X) = proceedFromOwnershipStage_fixed(X)
END FOR

FOR ALL X WHERE NOT isBugCondition_FillMode(X) DO
  ASSERT applyFillModesToNodes_original(X) = applyFillModesToNodes_fixed(X)
END FOR
```

**Testing Approach**: Property-based testing is recommended for the switch edge and fill mode preservation checks because:
- It generates many random node arrays and mapping configurations automatically
- It catches edge cases (empty mappings, single-node workflows, all-same-type nodes) that manual tests miss
- It provides strong guarantees that non-switch workflows and non-AI-mode fields are completely unaffected

### Unit Tests

- Test `wireSwitchCaseEdges()` with stale `targetNodeId` — assert correct type+position secondary lookup
- Test `validateEdges()` with a port-labeled edge from a branching node — assert it is NOT added to `edgesToRemove`
- Test `proceedFromOwnershipStage()` with `credentialQuestionsForStep.length > 0` — assert `step === 'configuration'`
- Test `applyFillModesToNodes()` with various `fillModeValues` maps — assert `_fillMode` is correctly merged
- Test `resolveEffectiveFieldFillMode()` with `_fillMode` set to `'runtime_ai'` — assert it returns `'runtime_ai'`

### Property-Based Tests

- Generate random `caseNodeMapping` entries and node arrays; verify each case edge target matches the mapping intent after fix
- Generate random workflows without switch nodes; verify `reconcileEdges()` output is identical before and after the `validateEdges()` guard change
- Generate random `fillModeValues` maps; verify `applyFillModesToNodes()` correctly writes all entries and leaves unrelated nodes untouched

### Integration Tests

- Full wizard flow: complete ownership step with credential questions → assert wizard advances to `'configuration'` step, not `'credentials'`
- Full wizard flow: set `runtime_ai` ownership for a field → complete wizard → open `PropertiesPanel` for that node → assert AI runtime banner is visible
- AI-generated switch workflow: verify case edges connect to the correct downstream nodes after `initializeWorkflow()` completes
