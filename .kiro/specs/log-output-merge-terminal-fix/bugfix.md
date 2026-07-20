# Bugfix Requirements Document

## Introduction

The `log_output` node is a terminal node that should act as a **merge-capable terminal** — accepting connections from multiple upstream branches (e.g., all branches of a Switch node converging to a single log). Currently, the system treats `log_output` as a normal single-input node across multiple enforcement layers: the DAG validator hardcodes `in-degree = 1`, the edge reconciliation engine's `splitMultiInputLogOutputs` method clones and rewires extra incoming edges away, and the branching validator does not recognize it as a multi-input node. Worse, these enforcement layers contain hardcoded `node.type === 'log_output'` string checks scattered across the codebase rather than querying the `UnifiedNodeRegistry` for capabilities. The result is that multi-branch workflows where all paths converge to `log_output` have their extra incoming edges stripped, and the `UnifiedNodeTypeNormalizer` emits repeated `⚠️ Runtime unknown node type: "custom"` warnings because `log_output` is not properly registered. This fix must be a **permanent core architecture fix** — eliminating all hardcoded type-string dependencies and making `log_output` (and any future merge-terminal node) work purely through registry capability flags.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a `log_output` node has more than one incoming edge (e.g., three branches from a Switch node all route to the same `log_output`) THEN the edge reconciliation engine clones the `log_output` node into N separate terminal nodes and rewires each extra incoming edge to a clone, splitting what should be a single merge point into multiple disconnected terminals.

1.2 WHEN a `log_output` node has more than one incoming edge THEN the DAG validator emits an error (`LOG node <id> must have exactly 1 input, found N`) and marks the workflow as structurally invalid.

1.3 WHEN the `graph-branching-validator` checks whether a target node allows multiple inputs THEN `log_output` is not recognized as a multi-input node because `allowsMultipleInputs` requires `category === 'logic' && isBranching && tag === 'merge'`, none of which apply to `log_output`, causing edge creation to be blocked.

1.4 WHEN the `UnifiedNodeTypeNormalizer` encounters the `log_output` node type during reconciliation THEN it repeatedly logs `⚠️ Runtime unknown node type: "custom" (method: unrecognized_type)`, indicating the node type is not registered in the `UnifiedNodeRegistry` and is therefore not being resolved to its canonical form before merge-capability checks are performed.

1.5 WHEN any enforcement layer (DAG validator, branching validator, edge reconciliation engine, normalizer) needs to determine `log_output` behavior THEN it does so via hardcoded `node.type === 'log_output'` string comparisons rather than querying the `UnifiedNodeRegistry`, violating the registry-first architecture principle.

1.6 WHEN a grep for `log_output` is run against enforcement, validation, and reconciliation source files THEN it returns multiple matches — string literals used for behavioral decisions scattered across the codebase.

### Expected Behavior (Correct)

2.1 WHEN a `log_output` node has more than one incoming edge THEN the edge reconciliation engine SHALL preserve all incoming edges to the single `log_output` node without cloning it, treating it as a merge-capable terminal — determined solely by querying `UnifiedNodeRegistry` for `allowsMultipleInputs: true`.

2.2 WHEN a `log_output` node has more than one incoming edge THEN the DAG validator SHALL NOT emit an in-degree error; it SHALL permit any in-degree ≥ 1 for nodes whose registry definition carries `allowsMultipleInputs: true`, and SHALL only validate that `log_output` has out-degree = 0 (terminal, `maxOutDegree: 0`).

2.3 WHEN the `graph-branching-validator` checks whether a node allows multiple inputs THEN it SHALL query `UnifiedNodeRegistry` for the `allowsMultipleInputs` capability flag and return `true` for `log_output`, permitting edges from multiple upstream nodes to target the same `log_output` node.

2.4 WHEN the `UnifiedNodeRegistry` is queried for the `log_output` node definition THEN it SHALL expose the capability flags `allowsMultipleInputs: true`, `isTerminal: true`, and `maxOutDegree: 0` so that all enforcement layers can derive correct behavior from the registry without any type-string checks.

2.5 WHEN the `UnifiedNodeTypeNormalizer` encounters the `log_output` node type THEN it SHALL resolve it correctly via the registry and SHALL NOT emit any `⚠️ Runtime unknown node type` warnings for `log_output`.

2.6 WHEN any enforcement layer (DAG validator, branching validator, edge reconciliation engine, normalizer, or any other validation/reconciliation component) needs to determine behavioral rules for any node THEN it SHALL query `UnifiedNodeRegistry` for capability flags and SHALL NOT contain any hardcoded `node.type === 'log_output'` or `'log_output'` string literals used for behavioral decisions.

2.7 WHEN a grep for `log_output` string literals is run against all enforcement, validation, and reconciliation source files after the fix is applied THEN it SHALL return zero results — no special-casing of `log_output` anywhere in those layers.

2.8 WHEN any future node type requires merge-terminal behavior (multiple inputs, zero outputs) THEN it SHALL be supported automatically by setting `allowsMultipleInputs: true`, `isTerminal: true`, and `maxOutDegree: 0` in its `UnifiedNodeRegistry` definition, with no changes required to any enforcement layer.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a `log_output` node has exactly one incoming edge THEN the system SHALL CONTINUE TO accept it as a valid terminal node with no errors.

3.2 WHEN a normal action node (non-merge, non-branching, `allowsMultipleInputs` not set) has more than one incoming edge THEN the system SHALL CONTINUE TO reject it as a structural violation.

3.3 WHEN a `log_output` node has any outgoing edges THEN the system SHALL CONTINUE TO reject it as a structural violation (out-degree must remain 0, enforced via `maxOutDegree: 0` from the registry).

3.4 WHEN a workflow contains a dedicated `merge` node followed by `log_output` THEN the system SHALL CONTINUE TO treat that topology as valid (merge node with in-degree ≥ 2, out-degree 1; `log_output` with in-degree 1, out-degree 0).

3.5 WHEN the edge reconciliation engine processes a workflow with no multi-input `log_output` nodes THEN the system SHALL CONTINUE TO produce the same edge set as before (no regressions for single-input log terminals).

3.6 WHEN the `splitMultiInputLogOutputs` method is called on a `log_output` node that was already cloned in a prior reconcile pass (id contains `_split_`) THEN the system SHALL CONTINUE TO skip it (idempotent behavior preserved), until the method itself is removed as part of the hardcode elimination.

3.7 WHEN any other node type's enforcement behavior is evaluated THEN the system SHALL CONTINUE TO derive that behavior from the registry exactly as before — the registry-first refactor for `log_output` must not alter the resolution path for any other node type.

3.8 WHEN the `UnifiedNodeRegistry` is queried for any node type other than `log_output` THEN it SHALL CONTINUE TO return the same capability flags and definitions as before this fix.
