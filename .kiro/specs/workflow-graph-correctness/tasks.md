# Implementation Plan: Workflow Graph Correctness

## Overview

Fix three interconnected correctness areas: edge wiring (execution order + reconciliation), switch case extraction, and runtime field mapping. Also includes a UI-only cleanup task that structures the "Final Analyzed Prompt" display without affecting any backend logic.

**Universal-fix mandate:** Every fix must be registry-driven and work for infinite node types, infinite prompts, and infinite workflows. No hardcoded node type strings, no hardcoded condition values, no hardcoded category names outside the registry.

## Tasks

- [-] 1. Write bug condition exploration tests (must FAIL on unfixed code)
  - [x] 1.1 Write property test for P4 — Switch Node Gets Exactly N Branch Edges
    - Generate switch node with N cases (N ∈ [2, 6]) + N http_request nodes + trigger + log_output nodes
    - Assert: after reconciliation, switch node has exactly N outgoing edges with labels `case_1`..`case_N`
    - Tag: `// Feature: workflow-graph-correctness, Property 4: Switch Node Gets Exactly N Branch Edges`
    - _Requirements: 2.1, 7.3_
  - [x] 1.2 Write property test for P6 — TIER 2 Category Priority Ordering
    - Generate random workflow with nodes from multiple categories including `logic` and `http_api`
    - Assert: for every pair (A, B) in execution order where A precedes B, `categoryPriority[cat(A)] <= categoryPriority[cat(B)]`, with log_output always last
    - Tag: `// Feature: workflow-graph-correctness, Property 6: TIER 2 Category Priority Ordering`
    - _Requirements: 2.3, 2.4, 5.1, 5.2, 5.3_
  - [x] 1.3 Write property test for P8 — Log_Output Predecessor Within Branch Region
    - Generate switch workflow with N branches each ending in log_output
    - Assert: each log_output's incoming edge source has execution-order index within the same case region as the log_output
    - Tag: `// Feature: workflow-graph-correctness, Property 8: Log_Output Predecessor Stays Within Its Branch Region`
    - _Requirements: 3.1, 3.2, 3.3, 10.2_
  - [x] 1.4 Write property test for P9 — N Branches Produce N Log_Outputs Each In-Degree 1
    - Generate switch workflow with N branches
    - Assert: exactly N log_output nodes exist; each has in-degree exactly 1
    - Tag: `// Feature: workflow-graph-correctness, Property 9: N Switch Branches Produce N Log_Output Nodes Each with In-Degree 1`
    - _Requirements: 3.4, 4.1, 4.2, 4.3_
  - [x] 1.5 Write property test for P13 — getPreviousNodeOutput Returns Last Non-Meta Entry
    - Generate LRU cache with K real entries + M meta entries (keys in exclude list), meta entries set after real entries
    - Assert: `getPreviousNodeOutput(cache)` returns the most recently set real entry's value
    - Tag: `// Feature: workflow-graph-correctness, Property 13: getPreviousNodeOutput Returns Last Non-Meta Entry`
    - _Requirements: 8.5, 8.6_
  - [x] 1.6 Write property test for P14 — AI Resolver Receives Actual Upstream Payload
    - Generate nodeOutputs cache with a real upstream entry (non-empty object) + meta entries set after
    - Assert: `resolveInputsWithAI` is called with `previousOutput` equal to the real entry's value (not undefined, not empty)
    - Tag: `// Feature: workflow-graph-correctness, Property 14: AI Resolver Receives Actual Upstream Payload`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 2. Write preservation tests (must PASS on unfixed code — guard against regressions)
  - [x] 2.1 Write property test for P1 — reconcileWorkflow Idempotence
    - Generate random workflow (2–8 nodes, mix of trigger/logic/http_api/output/log_output)
    - Assert: `reconcile(reconcile(w)).edges` deep-equals `reconcile(w).edges`; second call reports `edgesAdded=0, edgesRemoved=0`
    - Tag: `// Feature: workflow-graph-correctness, Property 1: reconcileWorkflow Idempotence`
    - _Requirements: 1.1, 1.2, 2.6, 3.5, 4.4, 11.2, 11.3_
  - [x] 2.2 Write property test for P2 — ExecutionOrderManager Determinism
    - Generate random workflow node list
    - Assert: `buildOrderFromCategories(w)` called twice returns identical `orderedNodeIds`
    - Tag: `// Feature: workflow-graph-correctness, Property 2: ExecutionOrderManager Determinism`
    - _Requirements: 1.3_
  - [x] 2.3 Write property test for P3 — Serialize-Deserialize-Reconcile Round Trip
    - Generate random valid workflow
    - Assert: `reconcile(JSON.parse(JSON.stringify(w))).edges` structurally equals `reconcile(w).edges`
    - Tag: `// Feature: workflow-graph-correctness, Property 3: Serialize-Deserialize-Reconcile Round Trip`
    - _Requirements: 1.4, 11.1_
  - [x] 2.4 Write property test for P7 — No Linear Main Edge from Switch Node
    - Generate switch workflow
    - Assert: no edge with `source === switchNodeId` has `type === 'main'` or missing port label
    - Tag: `// Feature: workflow-graph-correctness, Property 7: No Linear Main Edge from Switch Node`
    - _Requirements: 2.5_
  - [x] 2.5 Write property test for P10 — planSwitchCasesFromPrompt Extracts N Cases
    - Generate prompt string with N explicitly enumerated case values (N ∈ [2, 5])
    - Assert: `planSwitchCasesFromPrompt(prompt, undefined).cases.length === N` and all values are present
    - Tag: `// Feature: workflow-graph-correctness, Property 10: planSwitchCasesFromPrompt Extracts Exactly the Specified Cases`
    - _Requirements: 6.3, 7.1_
  - [x] 2.6 Write property test for P15 — IntentRouter Deterministic Mapping
    - Generate fixed upstream output schema + target input schema; shuffle upstream key order across iterations
    - Assert: IntentRouter produces identical mapping for all key orderings
    - Tag: `// Feature: workflow-graph-correctness, Property 15: IntentRouter Produces Deterministic Mapping`
    - _Requirements: 9.5_

- [x] 3. Checkpoint — run all tests written so far
  - Confirm Group 1 tests (P4, P6, P8, P9, P13, P14) FAIL on current code
  - Confirm Group 2 tests (P1, P2, P3, P7, P10, P15) PASS on current code
  - Ask the user if questions arise before proceeding to fixes

- [x] 4. Fix TIER 2 category priority map in execution-order-manager.ts (registry-driven, universal)
  - Add `logic: 2`, `http_api: 3`, and all other missing categories to `categoryPriority`
  - The complete map must match the design document's `categoryPriority` table exactly
  - Ensure `log_output` nodes are sorted last (priority 999) via explicit type check before category lookup
  - Any category not in the map falls back to `99` (safe default — before log_output, after utility)
  - Add startup validation: at module init, iterate `unifiedNodeRegistry.getAllTypes()`, get each node's category, and warn if any category string is absent from the priority map — ensures new node types added to the registry are never silently mis-ordered
  - File: `worker/src/core/orchestration/execution-order-manager.ts`
  - _Requirements: 2.3, 2.4, 5.1, 5.2, 5.3_
  - [x]* 4.1 Verify P6 passes after fix
    - **Property 6: TIER 2 Category Priority Ordering**
    - **Validates: Requirements 2.3, 2.4, 5.1, 5.2, 5.3**

- [x] 5. Fix pickBranchAwarePredecessorForLogOutput for switch (case_N) ports in edge-reconciliation-engine.ts (registry-driven, universal)
  - Extend Step 2 to handle `case_N` ports in addition to `true`/`false`
  - Detect branching nodes via `unifiedNodeRegistry.get(bt)?.isBranching === true` — no hardcoded node type strings
  - Read port labels from the edge graph dynamically — works for any number of cases on any branching node
  - Implement the switch case region detection algorithm from the design document
  - Verify the `if (trueE && falseE)` guard does not short-circuit before reaching the switch block
  - File: `worker/src/core/orchestration/edge-reconciliation-engine.ts`
  - _Requirements: 3.1, 3.2, 3.3_
  - [x]* 5.1 Verify P8 passes after fix
    - **Property 8: Log_Output Predecessor Stays Within Its Branch Region**
    - **Validates: Requirements 3.1, 3.2, 3.3, 10.2**

- [x] 6. Verify shouldKeepEdgeDespiteNonMonotonicOrder handles case_N ports in edge-reconciliation-engine.ts
  - Confirm that any edge whose `sourceHandle` matches `/^case_\d+$/` is treated as a legitimate branch edge
  - These edges must not be removed for non-monotonic order
  - File: `worker/src/core/orchestration/edge-reconciliation-engine.ts`
  - _Requirements: 2.1, 2.2, 10.1, 10.2_
  - [x]* 6.1 Verify P4 and P9 pass after fixes
    - **Property 4: Switch Node Gets Exactly N Branch Edges**
    - **Property 9: N Switch Branches Produce N Log_Output Nodes Each with In-Degree 1**
    - **Validates: Requirements 2.1, 3.4, 4.1, 4.2, 4.3, 7.3**

- [x] 7. Fix getPreviousNodeOutput in dynamic-node-executor.ts (registry-driven, universal)
  - Change implementation to return the last non-meta, non-empty entry from the cache
  - Skip entries where `isEffectivelyEmptyUpstreamPayload` returns `true`
  - Make `isEffectivelyEmptyUpstreamPayload` registry-aware: check if the output matches the upstream node's `outputSchema` from `unifiedNodeRegistry` rather than pattern-matching key names — works for any node type producing any output shape
  - Fall back to the raw entry value only if no non-empty entry exists (let caller decide)
  - File: `worker/src/core/execution/dynamic-node-executor.ts`
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  - [x]* 7.1 Verify P13 passes after fix
    - **Property 13: getPreviousNodeOutput Returns Last Non-Meta Entry**
    - **Validates: Requirements 8.5, 8.6**
  - [x]* 7.2 Verify P14 passes after fix
    - **Property 14: AI Resolver Receives Actual Upstream Payload**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**

- [x] 8. Store originalUserPrompt at API entry point before any augmentation (universal, eliminates stripping heuristic)
  - In `generate-workflow.ts`, at the very first line of the request handler (before prompt normalization, summarization, or boilerplate injection), extract `req.body.prompt || req.body.refinedPrompt` and store it as `originalUserPrompt` in a request-scoped variable
  - Pass this value through every pipeline stage so it reaches `mergeOriginalUserPromptMetadata` without any stripping needed
  - Remove the `extractCleanUserPromptFromPlan` stripping heuristic once `originalUserPrompt` is reliably set at entry — the heuristic was a workaround for the missing entry-point storage
  - This makes switch case extraction work correctly for any prompt format, not just the current "Goal: ..." format
  - File: `worker/src/api/generate-workflow.ts`
  - _Requirements: 6.1, 6.2_

- [x] 9. Verify deriveSwitchCasesFromIntent uses getFormStructuralIntentText in structure-materializer.ts
  - Confirm the call site at ~line 344 uses `getFormStructuralIntentText(workflow)` not `combinedIntentText`
  - `getFormStructuralIntentText` must return `metadata.originalUserPrompt` first per its priority chain
  - If incorrect, update the call site to use `getFormStructuralIntentText(workflow)`
  - File: `worker/src/services/ai/structure-materializer.ts`
  - _Requirements: 6.2, 6.3, 6.6_

- [x] 10. Clean up "Final Analyzed Prompt" UI display (UI-only, no backend changes)
  - Added `parseStructuredSummary()` helper that strips the configuration contract boilerplate and parses Goal / Intent alignment / Execution steps / Terminals into separate fields
  - Added `StructuredPlanDisplay` component that renders those fields cleanly with section labels, numbered execution steps, and a subtle terminal note — supports both full and compact modes
  - Replaced both raw `whitespace-pre-wrap` blob render locations with `StructuredPlanDisplay`:
    - Plan confirmation card (line ~4514): full mode, uses `planSummary` first then `refinement` fallback
    - Building-state compact card (line ~6678): compact mode, same fallback chain
  - The editable textarea still shows the full `planSummary` so the backend receives the complete text on confirm — no backend data flow changed
  - File: `ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx`

- [x] 11. Checkpoint — run all property tests and verify all fixes
  - All Group 1 tests (P4, P6, P8, P9, P13, P14) must now PASS
  - All Group 2 tests (P1, P2, P3, P7, P10, P15) must still PASS
  - No regressions in existing test suites
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Group 1 tests are intentionally written to fail on unfixed code — do not fix the code before confirming they fail
- Group 2 tests must pass before any fix is applied — if they fail, stop and investigate
- All fixes must go through the unified orchestration layer; never mutate `workflow.edges` directly
- No fix may hardcode node type strings outside the registry
- Every fix must work for infinite node types, infinite prompts, and infinite workflows — registry-driven, not pattern-matched
- Task 10 (UI cleanup) is already implemented and marked complete
