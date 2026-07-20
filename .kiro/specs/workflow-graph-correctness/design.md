# Design Document: Workflow Graph Correctness

## Overview

This design covers three interconnected correctness fixes for the AI workflow builder:

1. **Edge Wiring** — `execution-order-manager.ts` and `edge-reconciliation-engine.ts` must produce a stable, deterministic, idempotent graph for every workflow including switch-branching workflows.
2. **Switch Case Extraction** — `structure-materializer.ts` and `generate-workflow.ts` must always derive switch cases from the clean `originalUserPrompt`, never from boilerplate blobs.
3. **Runtime Field Mapping** — `dynamic-node-executor.ts` must pass the actual upstream node output to the AI field resolver so downstream nodes (Gmail, Slack, etc.) receive real data.

All three areas share a common invariant: the graph produced by the orchestration layer must be identical before and after save, and the runtime executor must see real upstream data.

---

## Architecture

The system follows a strict layered architecture:

```
API Layer (generate-workflow.ts)
  └─ originalUserPrompt stored before augmentation
  └─ materializeThenSanitizeForClientResponse(workflow, intentHint, originalUserPrompt)

Planning Layer (structure-materializer.ts, switch-case-plan.ts)
  └─ deriveSwitchCasesFromIntent(getFormStructuralIntentText(workflow))
  └─ planSwitchCasesFromPrompt(originalUserPrompt, upstreamNodeType)

Orchestration Layer (unified-graph-orchestrator.ts)
  └─ ExecutionOrderManager.buildOrderFromCategories()
  └─ EdgeReconciliationEngine.reconcileEdges()
       └─ pickBranchAwarePredecessorForLogOutput()
       └─ validateEdges()

Runtime Layer (dynamic-node-executor.ts)
  └─ getPreviousNodeOutput(nodeOutputs)  →  actual upstreamPayload
  └─ resolveInputsWithAI(previousOutput, inputSchema, userIntent)
```

The `UnifiedNodeRegistry` is the single source of truth for node categories, port labels, and branching behavior. No fix may hardcode node type strings outside the registry.

---

## Components and Interfaces

### Area 1: Edge Wiring

#### ExecutionOrderManager — `buildOrderFromCategories`

The TIER 2 category priority map must be complete so every registered node category maps to a deterministic sort position. The complete map:

```typescript
const categoryPriority: Record<string, number> = {
  trigger:        0,
  data:           1,
  auth:           1,
  logic:          2,   // switch, if_else — must precede branch targets
  flow:           2,
  http_api:       3,   // http_request — branch target, comes after switch
  database:       3,
  file:           3,
  queue:          3,
  cache:          3,
  ai:             4,
  transformation: 4,
  output:         5,
  communication:  5,
  google:         5,
  crm:            5,
  social:         5,
  devops:         5,
  ecommerce:      5,
  productivity:   5,
  microsoft:      5,
  utility:        6,
  // log_output handled separately: always priority 999
};
```

Any category not in this map falls back to `99` (before log_output, after utility). `log_output` nodes are sorted last via an explicit type check before the category lookup.

#### EdgeReconciliationEngine — `pickBranchAwarePredecessorForLogOutput`

Step 2 of this function currently handles only `if_else` (true/false ports). It must be extended to handle `switch` (case_N ports). The existing switch block is already present in the codebase — this design documents the correct algorithm and verifies it is complete.

**Switch case region detection pseudocode:**

```
// Collect all outgoing branch edges from the switch node
caseHeads = outgoingBranchEdges
  .map(e => { edge: e, idx: orderedNodeIds.indexOf(e.target) })
  .filter(x => x.idx >= 0)
  .sortBy(x => x.idx)                    // ascending execution-order position

// Find which case region the log_output belongs to:
// Region K spans [caseHeads[K].idx, caseHeads[K+1].idx)
// Last region spans [caseHeads[last].idx, orderedNodeIds.length)
logIdx = orderedNodeIds.indexOf(logOutputNodeId)
regionStart = -1
regionEnd   = orderedNodeIds.length

for ci in 0..caseHeads.length-1:
  start = caseHeads[ci].idx
  end   = (ci+1 < caseHeads.length) ? caseHeads[ci+1].idx : orderedNodeIds.length
  if logIdx >= start AND logIdx < end:
    regionStart = start
    regionEnd   = end
    break

if regionStart < 0: continue   // log not in any known region

// Return the closest output node within this region (before the log)
for k in outputsBefore descending:
  if outputsBefore[k].idx >= regionStart AND outputsBefore[k].idx < logIdx:
    return outputsBefore[k].id
```

This algorithm is already implemented in the codebase. The design task is to verify it is reachable (i.e., the `if (trueE && falseE)` guard does not short-circuit before reaching the switch block) and that `validateEdges` / `shouldKeepEdgeDespiteNonMonotonicOrder` correctly handles `case_N` port labels.

#### EdgeReconciliationEngine — `validateEdges`

`shouldKeepEdgeDespiteNonMonotonicOrder` must treat `case_N` port labels the same as `true`/`false` — any edge whose `sourceHandle` matches `/^case_\d+$/` is a legitimate branch edge and must not be removed for non-monotonic order.

---

### Area 2: Switch Case Extraction

#### `generate-workflow.ts` — `extractCleanUserPromptFromPlan`

Already implemented. Strips `"Goal: ..."` prefix and structured plan boilerplate markers. All four call sites of `materializeThenSanitizeForClientResponse` already pass `(req.body as any).originalPrompt || finalPrompt` as the third argument.

**Verification checklist:**
- Call site 1 (line ~834): passes `(req.body as any).originalPrompt || finalPrompt` ✓
- Call site 2 (line ~1411): passes `(req.body as any).originalPrompt || finalPrompt` ✓
- Call site 3 (line ~3001): passes `(req.body as any).originalPrompt || enhancedPrompt` ✓
- Call site 4 (line ~3335): passes `(req.body as any).originalPrompt || enhancedPrompt` ✓

#### `structure-materializer.ts` — `mergeOriginalUserPromptMetadata`

Already strips plan boilerplate. Called in `materializeThenSanitizeForClientResponse` via `materializeStructuralFields`. The `getFormStructuralIntentText` function returns `metadata.originalUserPrompt` first, so as long as `mergeOriginalUserPromptMetadata` has been called before `deriveSwitchCasesFromIntent`, the clean prompt is used.

#### `structure-materializer.ts` — `deriveSwitchCasesFromIntent`

The call site at line ~344 already uses `getFormStructuralIntentText(workflow)` (which returns `originalUserPrompt`) rather than `combinedIntentText`. This is correct.

**Key invariant:** `getFormStructuralIntentText` priority chain:
1. `metadata.originalUserPrompt` (set by `mergeOriginalUserPromptMetadata`) — preferred
2. `metadata.userPrompt` / `metadata.prompt`
3. `requirements.originalPrompt` / `requirements.primaryGoal`
4. `getWorkflowIntentText` fallback

---

### Area 3: Runtime Field Mapping

#### `dynamic-node-executor.ts` — `getPreviousNodeOutput`

Currently delegates to `nodeOutputs.getMostRecentOutput(['$json', 'json', 'trigger', 'input'])`, which uses timestamp-based ordering in `LRUNodeOutputsCache`. This is correct when the cache is populated in execution order.

The bug is in the **thin-payload guard** at line ~776. The guard calls `isEffectivelyEmptyUpstreamPayload(previousOutput)` which returns `true` for objects containing only underscore-prefixed keys or empty `inputData`. When a real upstream node (e.g., an HTTP request node) produces output with meaningful keys, this guard should not fire.

**Root cause:** `getMostRecentOutputEntry` returns the entry with the highest `setTimestamp`. If observability/meta entries are set *after* the real node output (e.g., a `_trigger` key is refreshed), they will shadow the real output. The fix is to exclude not just the static list `['$json', 'json', 'trigger', 'input']` but also any key whose value `isEffectivelyEmptyUpstreamPayload` returns `true` for.

**Corrected `getPreviousNodeOutput` pseudocode:**

```typescript
function getPreviousNodeOutput(nodeOutputs: LRUNodeOutputsCache): any {
  // First try: most recent non-meta, non-empty entry
  const staticExcludes = ['$json', 'json', 'trigger', 'input'];
  const entry = nodeOutputs.getMostRecentOutputEntry(staticExcludes);
  if (entry && !isEffectivelyEmptyUpstreamPayload(entry.value)) {
    return entry.value;
  }
  // Second try: any non-meta entry even if thin (let caller decide)
  return entry?.value;
}
```

This ensures that when a real upstream payload exists, it is returned even if a later meta-key was set with a higher timestamp. The thin-payload guard in the caller then correctly decides whether to use AI resolution or config-first fallback.

**Upstream payload passed to AI context:**

The `resolveInputsWithAI` call already receives `previousOutput` as its first argument. The fix ensures `previousOutput` is the actual upstream node output, not `undefined` or a thin meta object.

---

## Data Models

### SwitchCasePlanResult

```typescript
interface SwitchCasePlanResult {
  cases: SwitchCasePlanCase[];       // Extracted from originalUserPrompt
  expressionTemplate: string;         // e.g. "{{$json.status}}"
  discriminantField: string;          // e.g. "status"
}

interface SwitchCasePlanCase {
  value: string;   // normalized, e.g. "shipped"
  label: string;   // display, e.g. "Shipped"
}
```

### ExecutionOrder

```typescript
interface ExecutionOrder {
  orderedNodeIds: string[];
  dependencies: Map<string, string[]>;
  tier: 'TIER1_DSL' | 'TIER2_CATEGORY' | 'TIER3_FALLBACK';
}
```

### EdgeReconciliationResult

```typescript
interface EdgeReconciliationResult {
  edges: WorkflowEdge[];
  edgesAdded: number;
  edgesRemoved: number;
  warnings: string[];
}
```

### LRUNodeOutputsCache entry

```typescript
interface CacheEntry {
  value: unknown;
  timestamp: number;       // access time (LRU)
  setTimestamp: number;    // insertion/update time (recency)
  persistent: boolean;
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: reconcileWorkflow Idempotence

*For any* valid workflow, calling `reconcileWorkflow` twice in sequence should produce an identical `workflow.edges` set on both calls — same source, target, and port labels on every edge, with `edgesAdded = 0` and `edgesRemoved = 0` on the second call.

**Validates: Requirements 1.1, 1.2, 2.6, 3.5, 4.4, 11.2, 11.3**

---

### Property 2: ExecutionOrderManager Determinism

*For any* workflow, calling `buildOrderFromCategories` multiple times should return the same ordered node ID list on every invocation.

**Validates: Requirements 1.3**

---

### Property 3: Serialize-Deserialize-Reconcile Round Trip

*For any* valid workflow, serializing it to JSON, deserializing it, and then calling `reconcileWorkflow` should produce a workflow whose `edges` are structurally equivalent to the pre-serialization edges (same source, target, and port labels).

**Validates: Requirements 1.4, 11.1**

---

### Property 4: Switch Node Gets Exactly N Branch Edges

*For any* switch node configured with N cases, after `reconcileWorkflow` the switch node should have exactly N outgoing edges, each carrying a distinct `case_K` port label (`case_1` through `case_N`).

**Validates: Requirements 2.1, 7.3**

---

### Property 5: Branch Ports Assigned in Execution-Order Sequence

*For any* switch node with N cases, after reconciliation `case_1` should connect to the first branch target in execution order, `case_2` to the second, and so on — the port index and execution-order rank must agree.

**Validates: Requirements 2.2**

---

### Property 6: TIER 2 Category Priority Ordering

*For any* workflow processed by TIER 2 category sort, the resulting execution order should satisfy: every `trigger` node precedes every `logic` node, every `logic` node precedes every `http_api` node, every `http_api` node precedes every `output` node, and every `log_output` node appears last.

**Validates: Requirements 2.3, 2.4, 5.1, 5.2, 5.3**

---

### Property 7: No Linear Main Edge from Switch Node

*For any* switch node in a reconciled workflow, no outgoing edge from that node should have type `"main"` or lack an explicit branch port label (`case_N`, `true`, or `false`).

**Validates: Requirements 2.5**

---

### Property 8: Log_Output Predecessor Stays Within Its Branch Region

*For any* switch workflow with N branches each ending in a `log_output` node, after reconciliation each `log_output` should have exactly one incoming edge, and that edge's source should be a node whose execution-order index falls within the same case region as the `log_output` — never in a sibling branch region.

**Validates: Requirements 3.1, 3.2, 3.3, 10.2**

---

### Property 9: N Switch Branches Produce N Log_Output Nodes Each with In-Degree 1

*For any* switch workflow where each branch ends in a `log_output` node, after reconciliation there should be exactly N `log_output` nodes and each should have exactly one incoming edge.

**Validates: Requirements 3.4, 4.1, 4.2, 4.3**

---

### Property 10: planSwitchCasesFromPrompt Extracts Exactly the Specified Cases

*For any* prompt string that explicitly enumerates N distinct case values (e.g. "shipped, processing, cancelled"), `planSwitchCasesFromPrompt` should return a `cases` array of length N containing exactly those values.

**Validates: Requirements 6.3, 7.1**

---

### Property 11: buildDeterministicSinglePlanChain Produces One Branch Target per Case

*For any* switch node with N cases, `buildDeterministicSinglePlanChain` should produce a node ordering that includes exactly N branch target nodes — one per case — in the same order as the cases array.

**Validates: Requirements 7.2**

---

### Property 12: getOutgoingPortsForWorkflowNode Reads Cases Dynamically

*For any* switch node whose `config.cases` array has length N, `getOutgoingPortsForWorkflowNode` should return exactly N port labels (`case_1` through `case_N`), derived from the persisted config rather than a static registry definition.

**Validates: Requirements 7.4**

---

### Property 13: getPreviousNodeOutput Returns Last Non-Meta Entry

*For any* `LRUNodeOutputsCache` containing at least one entry whose key is not in `['$json', 'json', 'trigger', 'input']` and whose value is not effectively empty, `getPreviousNodeOutput` should return that entry's value, regardless of whether later meta-key entries were set with higher timestamps.

**Validates: Requirements 8.5, 8.6**

---

### Property 14: AI Resolver Receives Actual Upstream Payload

*For any* node with `runtime_ai` fill-mode fields where the preceding node produced a non-empty output, `resolveInputsWithAI` should be called with a `previousOutput` that contains the actual upstream node's output keys and values — not `undefined`, not an empty object, and not a thin meta-only object.

**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

---

### Property 15: IntentRouter Produces Deterministic Mapping

*For any* fixed upstream output schema and target input schema, the IntentRouter should produce the same field mapping result regardless of the iteration order of upstream keys.

**Validates: Requirements 9.5**

---

### Property 16: areExclusiveForkDescendantsInDifferentRegions Correctness

*For any* two nodes that are reachable only through different branch ports of the same switch or if_else node, `areExclusiveForkDescendantsInDifferentRegions` should return `true`; for any two nodes in the same branch or outside any branch, it should return `false`.

**Validates: Requirements 10.1**

---

### Property 17: areConsecutivePairExclusiveBranchHeadsByOrder Correctness

*For any* two consecutive nodes in execution order that are the first nodes of different exclusive branches of the same branching node, `areConsecutivePairExclusiveBranchHeadsByOrder` should return `true`.

**Validates: Requirements 10.3**

---

### Property 18: N Branches Produce Exactly N×2 Branch-Region Edges

*For any* switch workflow with N branches where each branch contains exactly one branch target node followed by one `log_output` node, after reconciliation the total number of edges originating from or targeting branch-region nodes should be exactly `N * 2` (N switch→target edges + N target→log_output edges).

**Validates: Requirements 10.4**

---

## Error Handling

| Scenario | Handler | Behavior |
|---|---|---|
| Switch node `cases` array empty at reconciliation | `EdgeReconciliationEngine` | Log error, skip branch edge creation for that node |
| `originalUserPrompt` absent when SwitchCasePlan runs | `deriveSwitchCasesFromIntent` | Log error, fall back to `getWorkflowIntentText` |
| TIER 1 DSL order covers fewer nodes than workflow | `ExecutionOrderManager` | Log warning with missing node IDs, fall back to TIER 2 |
| `validateWorkflow` returns `false` after `reconcileWorkflow` | `UnifiedGraphOrchestrator` | Log all violations as pipeline contract errors, do not pass broken workflow downstream |
| `getPreviousNodeOutput` returns thin payload | `resolveInputsWithAI` caller | Log "Thin upstream payload detected", use config-first fallback |
| IntentRouter confidence < 0.75 | `DynamicNodeExecutor` | Log warning with field name, upstream key candidates, and confidence score |
| Cross-region edge detected post-reconciliation | `validateEdges` | Emit error log entry identifying the violating edge |

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. Unit tests cover specific examples, edge cases, and error conditions. Property tests verify universal correctness across randomly generated inputs.

### Property-Based Testing Library

Use **fast-check** (TypeScript/JavaScript). Each property test must run a minimum of **100 iterations**.

Tag format for each test:
```
// Feature: workflow-graph-correctness, Property N: <property_text>
```

### Property Test Specifications

Each correctness property maps to exactly one property-based test:

**P1 — reconcileWorkflow Idempotence**
Generate: random workflow (2–8 nodes, mix of trigger/logic/http_api/output/log_output).
Assert: `reconcile(reconcile(w)).edges` deep-equals `reconcile(w).edges`; second call reports `edgesAdded=0, edgesRemoved=0`.

**P2 — ExecutionOrderManager Determinism**
Generate: random workflow node list.
Assert: `buildOrderFromCategories(w)` called twice returns identical `orderedNodeIds`.

**P3 — Serialize-Deserialize-Reconcile Round Trip**
Generate: random valid workflow.
Assert: `reconcile(JSON.parse(JSON.stringify(w))).edges` structurally equals `reconcile(w).edges`.

**P4 — Switch Node Gets Exactly N Branch Edges**
Generate: switch node with N cases (N ∈ [2, 6]) + N http_request nodes + trigger + log_output nodes.
Assert: after reconciliation, switch node has exactly N outgoing edges with labels `case_1`..`case_N`.

**P5 — Branch Ports in Execution-Order Sequence**
Generate: switch node with N cases + N distinct branch target nodes.
Assert: `case_K` edge target is the K-th branch target in execution order.

**P6 — TIER 2 Category Priority Ordering**
Generate: random workflow with nodes from multiple categories.
Assert: for every pair (A, B) in execution order where A precedes B, `categoryPriority[cat(A)] <= categoryPriority[cat(B)]` (with log_output always last).

**P7 — No Linear Main Edge from Switch Node**
Generate: switch workflow.
Assert: no edge with `source === switchNodeId` has `type === 'main'` or missing port label.

**P8 — Log_Output Predecessor Within Branch Region**
Generate: switch workflow with N branches each ending in log_output.
Assert: each log_output's incoming edge source has execution-order index within the same case region as the log_output.

**P9 — N Branches → N Log_Outputs Each In-Degree 1**
Generate: switch workflow with N branches.
Assert: exactly N log_output nodes exist; each has in-degree exactly 1.

**P10 — planSwitchCasesFromPrompt Extracts N Cases**
Generate: prompt string with N explicitly enumerated case values (N ∈ [2, 5]).
Assert: `planSwitchCasesFromPrompt(prompt, undefined).cases.length === N` and all values are present.

**P11 — buildDeterministicSinglePlanChain N Branch Targets**
Generate: switch node with N cases.
Assert: plan chain contains exactly N branch target nodes in cases-array order.

**P12 — getOutgoingPortsForWorkflowNode Dynamic Cases**
Generate: switch node config with N cases (N ∈ [1, 8]).
Assert: `getOutgoingPortsForWorkflowNode(node)` returns `['case_1', ..., 'case_N']`.

**P13 — getPreviousNodeOutput Returns Last Non-Meta Entry**
Generate: LRU cache with K real entries + M meta entries (keys in exclude list), meta entries set after real entries.
Assert: `getPreviousNodeOutput(cache)` returns the most recently set real entry's value.

**P14 — AI Resolver Receives Actual Upstream Payload**
Generate: nodeOutputs cache with a real upstream entry (non-empty object) + meta entries.
Assert: `resolveInputsWithAI` is called with `previousOutput` equal to the real entry's value (not undefined, not empty).

**P15 — IntentRouter Deterministic Mapping**
Generate: fixed upstream output schema + target input schema; shuffle upstream key order.
Assert: IntentRouter produces identical mapping for all key orderings.

**P16 — areExclusiveForkDescendantsInDifferentRegions Correctness**
Generate: switch workflow with N branches; pick one node from branch A and one from branch B (A ≠ B).
Assert: function returns `true`. Pick two nodes from the same branch — assert `false`.

**P17 — areConsecutivePairExclusiveBranchHeadsByOrder Correctness**
Generate: switch workflow; identify the two consecutive branch head nodes in execution order.
Assert: function returns `true` for that pair; returns `false` for non-head consecutive pairs.

**P18 — N Branches → N×2 Branch-Region Edges**
Generate: switch workflow with N branches (each: one branch target + one log_output).
Assert: total branch-region edges === `N * 2`.

### Unit Test Specifications

- **Category priority map completeness**: assert every category string returned by `unifiedNodeRegistry.getAllCategories()` has an entry in `categoryPriority` (or falls back gracefully to `99`).
- **Empty cases array error**: assert that reconciliation of a switch node with `cases: []` logs an error and produces zero outgoing edges from that node.
- **TIER 1 fallback warning**: assert that when DSL order covers N-1 of N nodes, a warning is logged with the missing node ID.
- **Cross-region edge violation log**: assert that `validateEdges` emits an error log when a cross-region edge is present.
- **Low confidence warning**: assert that IntentRouter logs a warning when confidence < 0.75.
- **validateWorkflow false → pipeline error**: assert that `UnifiedGraphOrchestrator` does not return a broken workflow when `validateWorkflow` returns `false`.
