# Bugfix Requirements Document

## Introduction

The workflow generation pipeline fails to produce correct DAGs when a user's automation contains nested branching — a switch inside a switch, an if/else inside a switch, or any combination of branching nodes at more than one depth level. Four distinct defects collaborate to produce the failure: the structural prompt generator flattens all downstream nodes into the first branch's cases, the node selection stage silently drops any second instance of the same branching type, and the edge-reasoning LLM receives a prompt that omits the inner switch's case values entirely. The combined result is that the generated workflow is missing nodes, has broken edges, and does not reflect the user's intent.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a workflow contains two or more branching nodes (switch, if_else) at any nesting depth THEN `StructuralPromptGenerator.composeText()` finds only the first branching step index and treats every subsequent node as a flat case of that first branch, producing a structurally incorrect blueprint that omits the nested branching hierarchy.

1.2 WHEN a workflow contains two or more branching nodes at any nesting depth THEN `StructuralPromptGenerator.buildConditions()` only captures `trueOutcome`/`falseOutcome` for the first branching node encountered, leaving inner branching nodes without condition descriptions in the returned `StructuralCondition[]` array.

1.3 WHEN the user has explicitly selected two or more nodes of the same branching type (e.g. two `switch` nodes) THEN `enforceRegistrySelectionContract()` in `node-selection-stage.ts` deduplicates by type via a `Set<string>`, causing the second (and any further) instance of that branching type to be silently dropped from `selectedNodes`.

1.4 WHEN the structural prompt passed to `buildEdgeReasoningPrompt()` does not describe the inner switch's case values (because Bug 1.1 flattened them) THEN the edge-reasoning LLM generates incorrect or missing edges for the inner switch's outgoing case connections.

### Expected Behavior (Correct)

2.1 WHEN a workflow contains two or more branching nodes at any nesting depth THEN `StructuralPromptGenerator.composeText()` SHALL recursively describe each branching node and its downstream sub-tree at the correct nesting level, producing a blueprint that accurately represents the full branching hierarchy regardless of depth.

2.2 WHEN a workflow contains two or more branching nodes at any nesting depth THEN `StructuralPromptGenerator.buildConditions()` SHALL emit one `StructuralCondition` entry per branching node found in the resolved node list, with correct `trueOutcome`/`falseOutcome` (for if_else) or per-case outcome descriptions (for switch) derived from the intent and downstream nodes at that level.

2.3 WHEN the user has explicitly selected two or more nodes of the same branching type THEN `enforceRegistrySelectionContract()` SHALL preserve all instances of branching node types in `selectedNodes`, applying deduplication only to non-branching node types, so that every user-confirmed branching node survives into the structural prompt and edge-reasoning stages.

2.4 WHEN the structural prompt correctly describes nested branching (per 2.1) THEN `buildEdgeReasoningPrompt()` SHALL receive a blueprint that includes the inner switch's case values, enabling the edge-reasoning LLM to generate correct labeled edges for every level of nesting.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a workflow contains exactly one branching node (a single switch or a single if_else) with no nesting THEN the system SHALL CONTINUE TO generate a structurally correct single-level branching DAG with all case edges labeled correctly.

3.2 WHEN a workflow contains no branching nodes and follows a strictly linear path THEN the system SHALL CONTINUE TO generate a linear DAG with `main`-typed edges and no spurious branch structure.

3.3 WHEN the user selects multiple instances of a non-branching node type (e.g. two `google_gmail` nodes for two separate branches) THEN the system SHALL CONTINUE TO preserve all instances of those non-branching nodes in `selectedNodes` as it does today.

3.4 WHEN the capability selection stage resolves a flat list of allowed node types THEN the system SHALL CONTINUE TO enforce that only registry-known, user-confirmed node types appear in the final `selectedNodes` list.

3.5 WHEN the edge-reasoning stage receives a correctly described single-level switch blueprint THEN the system SHALL CONTINUE TO use the actual semantic case values (e.g. `"shipped"`, `"processing"`, `"cancelled"`) as edge type labels rather than generic `"case_1"` / `"case_2"` labels.

3.6 WHEN the pipeline falls back to the deterministic node selection recovery path THEN the system SHALL CONTINUE TO produce a minimal valid workflow rather than returning a `NO_VALID_NODES` error.
