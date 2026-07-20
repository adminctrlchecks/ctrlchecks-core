# Requirements Document

## Introduction

This feature delivers a 100% correctness fix across three interconnected areas of the AI workflow builder system:

1. **Edge Wiring Correctness** — Switch branch edges, log_output predecessor selection, and post-save reconciliation must all produce a stable, deterministic graph that is identical before and after save.
2. **Node Detection and Structured Prompt Generation** — Switch case extraction must always run against the clean user prompt, never against boilerplate, and must produce all N cases the user specified.
3. **Runtime Input Field Mapping** — The dynamic executor must pass actual upstream node output data into AI context so that downstream fields (Gmail subject/body, Slack message, etc.) are filled from real data, not empty context.

All fixes must be implemented at the core orchestration and registry layer so they apply universally to every existing and future workflow.

---

## Glossary

- **ExecutionOrderManager**: The module (`execution-order-manager.ts`) responsible for computing the canonical node execution sequence (TIER 1 → TIER 2 → TIER 3 fallback).
- **EdgeReconciliationEngine**: The module (`edge-reconciliation-engine.ts`) that creates, removes, and repairs workflow edges based on execution order.
- **UnifiedGraphOrchestrator**: The single entry point (`unified-graph-orchestrator.ts`) for all graph mutations; owns `workflow.edges` as the sole source of truth.
- **UnifiedNodeRegistry**: The registry (`unified-node-registry.ts`) that defines every node's category, ports, branching behavior, and schema.
- **Switch_Node**: A branching node with `isBranching = true` and N outgoing ports labeled `case_1`, `case_2`, … `case_N`.
- **If_Else_Node**: A branching node with `isBranching = true` and exactly two outgoing ports: `true` and `false`.
- **Log_Output_Node**: A terminal node (`log_output`) with in-degree 1 and out-degree 0.
- **Branch_Target_Node**: Any non-terminal node that is the direct successor of a Switch_Node or If_Else_Node on a specific branch port.
- **reconcileWorkflow**: The `UnifiedGraphOrchestrator` operation that recomputes all edges from the current execution order; called on save and after node injection/removal.
- **pickBranchAwarePredecessorForLogOutput**: The function inside `EdgeReconciliationEngine` that selects the correct predecessor for a `Log_Output_Node` in a branched workflow.
- **SwitchCasePlan**: The planning module (`switch-case-plan.ts`) that extracts enumerated case values from the user's prompt.
- **StructureMaterializer**: The module (`structure-materializer.ts`) that converts a structured intent into a concrete workflow node list.
- **SummarizeLayer**: The module (`summarize-layer.ts`) that produces the "Workflow Blueprint" section of the structured prompt.
- **originalUserPrompt**: The raw, unmodified string the user typed, stored in workflow metadata before any boilerplate is appended.
- **DynamicNodeExecutor**: The runtime executor (`dynamic-node-executor.ts`) that resolves input fields for each node using registry schema and upstream output.
- **IntentRouter**: The routing component (`intent-router.ts`) that maps upstream output keys to downstream input fields.
- **upstreamPayload**: The actual JSON output produced by the immediately preceding node at runtime, passed as context to the AI field resolver.
- **TIER 2 Category Sort**: The fallback ordering in `ExecutionOrderManager` that sorts nodes by registry category priority when no DSL execution order is available.
- **Exclusive Fork Region**: A set of nodes reachable only through one specific branch port of a Switch_Node or If_Else_Node; nodes in different exclusive fork regions must never be cross-wired.

---

## Requirements

### Requirement 1: Deterministic and Stable Edge Wiring

**User Story:** As a workflow author, I want the edges in my workflow to be identical before and after I save, so that saving never silently rewires my graph.

#### Acceptance Criteria

1. THE UnifiedGraphOrchestrator SHALL produce identical `workflow.edges` for the same set of nodes regardless of how many times `reconcileWorkflow` is called in sequence.
2. WHEN `reconcileWorkflow` is called on a workflow that already has correct edges, THE EdgeReconciliationEngine SHALL make zero edge additions and zero edge removals.
3. THE ExecutionOrderManager SHALL produce the same ordered node ID list for the same workflow on every invocation (idempotent ordering).
4. WHEN a workflow is saved and reloaded, THE UnifiedGraphOrchestrator SHALL produce an edge set that is structurally equivalent to the pre-save edge set (same source, target, and port labels on every edge).
5. IF `reconcileWorkflow` is called and the resulting edge set differs from the pre-call edge set, THEN THE UnifiedGraphOrchestrator SHALL emit a structured warning log entry identifying every edge that was added or removed.

---

### Requirement 2: Correct Switch Node Branch Edge Wiring

**User Story:** As a workflow author, I want each switch case port (`case_1`, `case_2`, `case_3`) to connect to its correct and unique branch target node, so that the runtime routes data to the right downstream node.

#### Acceptance Criteria

1. WHEN a Switch_Node has N outgoing ports (`case_1` … `case_N`), THE EdgeReconciliationEngine SHALL create exactly N branch edges, one per port, each connecting to a distinct Branch_Target_Node.
2. THE EdgeReconciliationEngine SHALL assign branch ports to Branch_Target_Nodes in execution-order sequence: `case_1` connects to the first Branch_Target_Node after the Switch_Node in execution order, `case_2` to the second, and so on.
3. THE TIER 2 Category Sort in ExecutionOrderManager SHALL assign Switch_Node a category priority that places it before all of its Branch_Target_Nodes in the sorted order.
4. IF a Switch_Node's category is `logic`, THEN THE ExecutionOrderManager SHALL assign it a sort priority lower than `http_api` (priority value 2 vs 3) so that `http_request` Branch_Target_Nodes appear after the Switch_Node.
5. THE EdgeReconciliationEngine SHALL NOT create a linear "main" edge from a Switch_Node to any node; all outgoing edges from a Switch_Node MUST carry an explicit branch port label (`case_N` or `true`/`false`).
6. WHEN branch edges already exist for all ports of a Switch_Node, THE EdgeReconciliationEngine SHALL NOT create duplicate branch edges for those ports.

---

### Requirement 3: Correct Log_Output Predecessor Selection

**User Story:** As a workflow author, I want each `log_output` node to connect from the last non-terminal node in its own branch, so that it logs the output of the correct upstream action.

#### Acceptance Criteria

1. THE `pickBranchAwarePredecessorForLogOutput` function SHALL handle both `true`/`false` branch ports (If_Else_Node) and `case_N` branch ports (Switch_Node) when determining the correct predecessor for a Log_Output_Node.
2. WHEN a Log_Output_Node is the terminal of a specific switch branch (e.g. `case_2`), THE EdgeReconciliationEngine SHALL connect it from the last non-terminal node reachable exclusively through that branch port.
3. THE EdgeReconciliationEngine SHALL NOT connect a Log_Output_Node from a node that belongs to a different Exclusive Fork Region.
4. WHEN a workflow contains a Switch_Node with N branches each ending in a Log_Output_Node, THE EdgeReconciliationEngine SHALL produce exactly N distinct Log_Output_Nodes, each with exactly one incoming edge from its own branch's last non-terminal node.
5. IF a Log_Output_Node already has one incoming edge, THEN THE EdgeReconciliationEngine SHALL NOT add a second incoming edge to that same Log_Output_Node.
6. THE `pickBranchAwarePredecessorForLogOutput` function SHALL use the existing edge graph (not only execution order position) to trace branch membership when the Switch_Node's branch edges are already present.

---

### Requirement 4: No Duplicate Log_Output Nodes

**User Story:** As a workflow author, I want the reconciliation process to never create duplicate `log_output` nodes, so that my workflow canvas stays clean and execution is unambiguous.

#### Acceptance Criteria

1. THE `splitMultiInputLogOutputs` function SHALL only clone a Log_Output_Node when it genuinely has more than one incoming edge after all branch edges have been assigned.
2. WHEN a Log_Output_Node receives exactly one incoming edge (from its branch's last non-terminal node), THE EdgeReconciliationEngine SHALL NOT clone it.
3. THE EdgeReconciliationEngine SHALL NOT produce two Log_Output_Nodes with labels that differ only by a branch index suffix (e.g. "Log Output (branch 2)") unless the original Log_Output_Node legitimately had multiple incoming edges before splitting.
4. WHEN `reconcileWorkflow` is called a second time on a workflow that was already correctly reconciled, THE EdgeReconciliationEngine SHALL produce zero new Log_Output_Nodes.

---

### Requirement 5: Correct Node Execution Order for Branching Workflows

**User Story:** As a workflow author, I want the execution order to always follow the pattern trigger → logic/branching → branch targets → log_output, so that the graph compiler never places a branch target before its branching node.

#### Acceptance Criteria

1. THE ExecutionOrderManager TIER 2 Category Sort SHALL enforce the following priority order: `trigger` (0) → `data` (1) → `logic` (2) → `http_api` (3) → `transformation` (4) → `output`/`communication` (5) → `utility` (6), with `log_output` always last (priority 999).
2. WHEN a workflow contains a Switch_Node (category `logic`) and an `http_request` node (category `http_api`), THE ExecutionOrderManager SHALL always place the Switch_Node before the `http_request` node in the computed execution order.
3. THE ExecutionOrderManager SHALL place all Log_Output_Nodes after all non-terminal output nodes in the execution order, regardless of the order in which nodes were added to the workflow.
4. WHEN TIER 1 DSL execution order is available and complete, THE ExecutionOrderManager SHALL use it as the sole source of truth and SHALL NOT apply TIER 2 category sorting.
5. IF TIER 1 DSL execution order is incomplete (covers fewer nodes than the workflow contains), THEN THE ExecutionOrderManager SHALL fall back to TIER 2 and log a warning identifying the missing node IDs.

---

### Requirement 6: Switch Cases Always Extracted from Clean User Prompt

**User Story:** As a workflow author, I want the switch node to always contain all the cases I specified in my original request, so that the generated workflow matches my intent exactly.

#### Acceptance Criteria

1. THE `generate-workflow` API handler SHALL store the raw, unmodified user input string as `originalUserPrompt` in workflow metadata before any prompt augmentation, boilerplate injection, or summarization occurs.
2. THE SwitchCasePlan SHALL receive `originalUserPrompt` as its input string and SHALL NOT receive the full structured prompt blob, boilerplate system instructions, or any concatenated multi-section string.
3. WHEN the user specifies N distinct case values in their prompt (e.g. "shipped, processing, cancelled"), THE SwitchCasePlan SHALL extract exactly those N values and produce exactly N `SwitchCasePlanCase` entries.
4. THE SummarizeLayer SHALL include the correct case values in the "Workflow Blueprint" section of the structured prompt, derived from the same `originalUserPrompt` extraction, not from a re-parse of the boilerplate blob.
5. IF `originalUserPrompt` is absent or empty in workflow metadata at the time SwitchCasePlan runs, THEN THE SwitchCasePlan SHALL log an error and fall back to extracting cases from the most recent non-boilerplate user message available in context.
6. THE StructureMaterializer SHALL use the case list produced by SwitchCasePlan as the authoritative source for Switch_Node configuration and SHALL NOT re-derive cases independently.

---

### Requirement 7: All N Switch Cases Present in Node Config

**User Story:** As a workflow author, I want the switch node's configuration to contain all N cases I described, so that the runtime can route to every branch I intended.

#### Acceptance Criteria

1. WHEN SwitchCasePlan produces N cases, THE StructureMaterializer SHALL configure the Switch_Node with exactly those N cases in its `cases` array.
2. THE `buildDeterministicSinglePlanChain` function SHALL produce a node ordering that includes one Branch_Target_Node per switch case, in the same order as the cases array.
3. WHEN the Switch_Node config contains N cases, THE EdgeReconciliationEngine SHALL create exactly N outgoing branch edges labeled `case_1` through `case_N`.
4. THE UnifiedNodeRegistry SHALL expose a `getOutgoingPortsForWorkflowNode` method that reads the Switch_Node's persisted `cases` array from its config and returns the corresponding port labels (`case_1` … `case_N`) dynamically, not from a static registry definition.
5. IF the Switch_Node config `cases` array is empty or absent at reconciliation time, THEN THE EdgeReconciliationEngine SHALL log an error and skip branch edge creation for that node rather than silently creating zero or one branch edges.

---

### Requirement 8: Runtime AI Field Filling Uses Actual Upstream Output

**User Story:** As a workflow author, I want downstream nodes (Gmail, Slack, etc.) to be filled with data from the actual output of the preceding node at runtime, so that emails and messages contain real content rather than empty or placeholder values.

#### Acceptance Criteria

1. THE DynamicNodeExecutor SHALL pass the actual `upstreamPayload` (the JSON output of the immediately preceding node) to the AI field resolver for every node that has `runtime_ai` fill-mode fields.
2. WHEN `upstreamPayload` is a non-empty object, THE `resolveInputsWithAI` function SHALL include the upstream output keys and values in the AI context prompt so the AI can map them to the target node's input fields.
3. THE DynamicNodeExecutor SHALL NOT log "Thin upstream payload detected, using config-first fallback" when a non-empty upstream payload is available from the node outputs cache.
4. THE DynamicNodeExecutor SHALL NOT log "AI analyzed previous keys []" (empty key list) when the preceding node produced a non-empty output object.
5. WHEN `nodeOutputs.getAll()` returns a non-empty map, THE DynamicNodeExecutor SHALL extract the output of the most recent non-observability-key entry as the `upstreamPayload` for AI context.
6. THE `getPreviousNodeOutput` helper SHALL return the output of the last node that executed before the current node, identified by execution order, not by arbitrary cache key iteration order.

---

### Requirement 9: IntentRouter Maps Upstream Keys with High Confidence

**User Story:** As a workflow author, I want the IntentRouter to correctly map upstream output keys to downstream input fields so that Gmail `subject`/`body` and Slack `message` are populated from the right upstream data.

#### Acceptance Criteria

1. THE IntentRouter SHALL use the target node's registry `inputSchema` field definitions (including `role`, `type`, and field name) as the primary signal for mapping upstream output keys to input fields.
2. WHEN an upstream output key semantically matches a target input field (e.g. upstream `subject` → Gmail `subject`, upstream `text` → Slack `message`), THE IntentRouter SHALL produce a mapping confidence of 0.85 or higher.
3. THE IntentRouter SHALL NOT rely solely on embedding similarity or keyword matching when the registry `inputSchema` provides explicit field roles (`role: "title_like"`, `role: "long_body"`, etc.) that can be used for deterministic matching.
4. WHEN the IntentRouter confidence for a field mapping is below 0.75, THE DynamicNodeExecutor SHALL log a warning identifying the field name, the upstream key candidates considered, and the confidence score.
5. THE IntentRouter SHALL produce a deterministic mapping result for the same upstream output schema and target input schema regardless of the order in which upstream keys are iterated.

---

### Requirement 10: No Cross-Branch Edge Creation

**User Story:** As a workflow author, I want the reconciliation engine to never wire a node from one switch branch to a node in a different switch branch, so that exclusive branches remain isolated.

#### Acceptance Criteria

1. THE `areExclusiveForkDescendantsInDifferentRegions` function SHALL correctly identify nodes that are reachable only through different branch ports of the same Switch_Node or If_Else_Node.
2. THE EdgeReconciliationEngine SHALL NOT create a linear "main" edge between two nodes that belong to different Exclusive Fork Regions of the same branching node.
3. THE `areConsecutivePairExclusiveBranchHeadsByOrder` function SHALL correctly identify when two consecutive nodes in execution order are the first nodes of different exclusive branches, and SHALL prevent a linear edge from being created between them.
4. WHEN a Switch_Node has N branches and each branch has one Branch_Target_Node followed by one Log_Output_Node, THE EdgeReconciliationEngine SHALL produce exactly `N * 2` edges originating from or targeting branch-region nodes (N branch edges from Switch_Node + N edges from Branch_Target_Node to Log_Output_Node).
5. THE EdgeReconciliationEngine SHALL validate after reconciliation that no node in one Exclusive Fork Region has an incoming edge from a node in a sibling Exclusive Fork Region, and SHALL emit an error log entry for any violation found.

---

### Requirement 11: Round-Trip Workflow Serialization Stability

**User Story:** As a workflow author, I want to serialize, save, deserialize, and re-reconcile my workflow without any structural changes, so that the persistence layer never corrupts my graph.

#### Acceptance Criteria

1. FOR ALL valid workflows, serializing to JSON then deserializing then calling `reconcileWorkflow` SHALL produce a workflow structurally equivalent to the pre-serialization workflow (round-trip property).
2. THE UnifiedGraphOrchestrator SHALL treat a workflow whose edges already satisfy all registry port contracts as already-reconciled and SHALL make no changes to it.
3. WHEN a workflow is loaded from persistence and `reconcileWorkflow` is called, THE EdgeReconciliationEngine SHALL report `edgesAdded = 0` and `edgesRemoved = 0` if the persisted edges were correct.
4. THE `validateWorkflow` function SHALL be called after every `reconcileWorkflow` invocation and SHALL return `valid = true` for any workflow that was already correctly wired before reconciliation.
5. IF `validateWorkflow` returns `valid = false` after `reconcileWorkflow`, THEN THE UnifiedGraphOrchestrator SHALL treat this as a pipeline contract error, log the violations, and SHALL NOT silently pass the broken workflow downstream.
