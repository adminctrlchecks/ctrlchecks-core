# Bugfix Requirements Document

## Introduction

When a user describes a workflow with a switch node routing across multiple conditions (e.g., "route orders by status: shipped, processing, cancelled"), the AI planner generates an incomplete and incorrect `cases` array for the switch node. Specifically, it truncates the case list to fewer entries than the user described, and substitutes an action/destination label (e.g., `"send_tracking_details_via_gmail"`) in place of a routing condition value (e.g., `"shipped"`). This causes the switch node's cases to be misaligned with its outgoing edges, producing an invalid DAG that cannot route correctly at runtime.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user describes a switch node with N routing conditions (N ≥ 3), THEN the system generates a `cases` array with fewer than N entries (observed: 2 entries instead of 3).

1.2 WHEN the system generates switch node cases, THEN one or more case `value` fields contain the action/destination label of a downstream node (e.g., `"send_tracking_details_via_gmail"`) instead of the routing condition value from the user's intent (e.g., `"shipped"`).

1.3 WHEN the generated `cases` array has fewer entries than the number of outgoing edges declared for the switch node, THEN the switch node's cases and edges are inconsistent, producing a structurally invalid workflow DAG.

### Expected Behavior (Correct)

2.1 WHEN a user describes a switch node with N routing conditions, THEN the system SHALL generate a `cases` array containing exactly N entries — one per condition described by the user.

2.2 WHEN the system generates switch node case values, THEN each case `value` SHALL be derived from the routing condition in the user's intent (e.g., `"shipped"`, `"processing"`, `"cancelled"`) and SHALL NOT be derived from the action description or downstream node label.

2.3 WHEN the system generates switch node cases and edges, THEN each `case_n` edge SHALL correspond 1:1 with the Nth entry in the `cases` array, so that `case_1` routes to the node matching the first case value, `case_2` to the second, and so on.

2.4 WHEN the switch node `cases` array is generated, THEN the number of cases SHALL equal the number of outgoing `case_n` edges, satisfying the DAG structural invariant enforced by `validateWorkflow`.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a switch node has exactly 2 routing conditions, THEN the system SHALL CONTINUE TO generate exactly 2 cases with correct condition values and 2 outgoing edges labeled `case_1` and `case_2`.

3.2 WHEN a switch node expression is derived from an upstream node's output field (e.g., `{{$json.status}}`), THEN the system SHALL CONTINUE TO set the switch node `expression` to that field reference unchanged.

3.3 WHEN a linear workflow (no switch node) is generated, THEN the system SHALL CONTINUE TO produce a fully connected linear DAG with no impact from this fix.

3.4 WHEN an `if_else` node is used instead of a switch node, THEN the system SHALL CONTINUE TO generate exactly 2 outgoing edges labeled `true` and `false` with no regression.

3.5 WHEN the switch node cases are generated for any number N ≥ 2, THEN the system SHALL CONTINUE TO pass `validateWorkflow` with zero structural errors after graph compilation.
