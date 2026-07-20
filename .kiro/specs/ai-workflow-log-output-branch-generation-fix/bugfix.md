# Bugfix Requirements Document

## Introduction

The AI workflow generation system has multiple critical issues with `log_output` node generation:

1. **Automatic Injection**: The system automatically injects `log_output` nodes into EVERY workflow via `ensureAlwaysRequiredTerminalNodes`, `alwaysRequired` registry flag, and switch branch stubs - regardless of user intent
2. **Invalid Merge Topology**: Multiple branches incorrectly connect to a single `log_output` node, creating invalid merge topologies
3. **Registry Multi-Input Bug**: The registry and validation layers incorrectly allow multi-input for `log_output` (from previous spec)
4. **No Intent Analysis**: The AI workflow builder doesn't analyze user prompts to determine which branches actually need logging

This fix makes the system **purely intent-driven**: `log_output` nodes are ONLY generated when the user explicitly requests logging in their prompt. No automatic injection, no hardcoded defaults, no merge topologies.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the AI workflow builder generates ANY workflow THEN the system automatically injects a `log_output` node via `ensureAlwaysRequiredTerminalNodes` method regardless of whether the user requested logging in their prompt

1.2 WHEN the `log_output` registry entry is queried THEN it returns `alwaysRequired: true` and `autoInject: true` in `workflowBehavior`, causing the node to be forcibly added to every workflow

1.3 WHEN a switch node has branches without explicit output nodes THEN the system automatically creates `log_output` stub nodes via `createSwitchBranchLogStub` method without checking user intent

1.4 WHEN the AI workflow builder generates a branching workflow (switch/if_else) with multiple branches THEN the system incorrectly connects all branches to a SINGLE log_output node creating an invalid merge topology

1.5 WHEN the user prompt specifies different outputs for different branches (e.g., "admin sends Gmail, editor sends Slack, viewer logs action") THEN the system ignores the branch-specific output requirements and generates a single shared log_output node

1.6 WHEN the AI workflow builder processes nested branching structures (switch inside switch) THEN the system generates incorrect merge connections where multiple terminal branches converge on one log_output node

1.7 WHEN only one branch in a multi-branch workflow explicitly mentions logging (e.g., "viewer: log the action") THEN the system incorrectly adds log_output to ALL branches instead of only the specified branch

1.8 WHEN the workflow builder creates edges for branching workflows THEN the system generates multiple incoming edges to the same log_output node violating the single-input terminal node constraint

1.9 WHEN the user prompt does NOT mention logging, output, or observability THEN the system still forcibly adds a log_output node to the workflow

1.10 WHEN the error-branch-injector adds error handling THEN it automatically injects `log_output` nodes for error logging regardless of user intent

1.11 WHEN the safety-node-injector adds safety nodes THEN it automatically injects `log_output` nodes for safety logging regardless of user intent

1.12 WHEN the missing-node-injector detects missing nodes THEN it automatically injects `log_output` nodes as terminal nodes regardless of user intent

1.13 WHEN the node-sufficiency-checker validates workflows THEN it preserves `log_output` nodes marked with `alwaysRequired: true` even when not in user intent

1.14 WHEN the unified-graph-orchestrator reconciles workflows THEN it preserves nodes marked with `alwaysRequired: true` or `exemptFromRemoval: true` even when not in user intent

1.15 WHEN the edge-reconciliation-engine processes workflows THEN it preserves nodes marked with `alwaysRequired: true` or `exemptFromRemoval: true` even when not in user intent

### Expected Behavior (Correct)

2.1 WHEN the AI workflow builder generates ANY workflow THEN the system SHALL NOT automatically inject log_output nodes - they should ONLY be generated when the user explicitly requests logging in their prompt

2.2 WHEN the `log_output` registry entry is queried THEN it SHALL return `alwaysRequired: false` and `autoInject: false` in `workflowBehavior`, making log_output generation purely intent-driven

2.3 WHEN a switch node has branches without explicit output nodes THEN the system SHALL NOT automatically create log_output stub nodes - branches should only have outputs explicitly mentioned in the user prompt

2.4 WHEN the AI workflow builder generates a branching workflow (switch/if_else) with multiple branches THEN the system SHALL analyze the prompt to determine which branches need log_output and generate SEPARATE log_output nodes for each branch that requires one

2.5 WHEN the user prompt specifies different outputs for different branches (e.g., "admin sends Gmail, editor sends Slack, viewer logs action") THEN the system SHALL generate the appropriate output node for each branch (Gmail for admin, Slack for editor, log_output for viewer) with NO shared log_output node

2.6 WHEN the AI workflow builder processes nested branching structures (switch inside switch) THEN the system SHALL analyze each terminal branch independently and generate separate log_output nodes only for branches that explicitly require logging

2.7 WHEN only one branch in a multi-branch workflow explicitly mentions logging (e.g., "viewer: log the action") THEN the system SHALL add log_output ONLY to that specific branch and use appropriate output nodes for other branches

2.8 WHEN the workflow builder creates edges for branching workflows THEN the system SHALL ensure each log_output node has exactly ONE incoming edge from its parent branch node

2.9 WHEN the user prompt does NOT mention logging, output, or observability THEN the system SHALL NOT add any log_output nodes to the workflow - the workflow should end with whatever output the user specified (Gmail, Slack, database, etc.)

2.10 WHEN the error-branch-injector adds error handling THEN it SHALL ONLY inject `log_output` nodes if the user explicitly requested error logging in their prompt

2.11 WHEN the safety-node-injector adds safety nodes THEN it SHALL ONLY inject `log_output` nodes if the user explicitly requested safety logging in their prompt

2.12 WHEN the missing-node-injector detects missing nodes THEN it SHALL NOT automatically inject `log_output` nodes unless the user explicitly requested logging

2.13 WHEN the node-sufficiency-checker validates workflows THEN it SHALL NOT preserve `log_output` nodes unless they match user intent (not based on `alwaysRequired` flag)

2.14 WHEN the unified-graph-orchestrator reconciles workflows THEN it SHALL NOT preserve nodes based solely on `alwaysRequired` or `exemptFromRemoval` flags - preservation must be intent-driven

2.15 WHEN the edge-reconciliation-engine processes workflows THEN it SHALL NOT preserve nodes based solely on `alwaysRequired` or `exemptFromRemoval` flags - preservation must be intent-driven

### Unchanged Behavior (Regression Prevention)

3.1 WHEN generating linear workflows that explicitly mention logging THEN the system SHALL CONTINUE TO generate a single log_output terminal node at the end

3.2 WHEN the user prompt explicitly requests merge behavior for non-log_output nodes (e.g., "all branches merge to send email") THEN the system SHALL CONTINUE TO generate proper merge topologies using merge-capable nodes

3.3 WHEN validating workflows at the registry level THEN the system SHALL CONTINUE TO enforce single-input constraints for log_output nodes

3.4 WHEN the workflow builder generates non-branching action sequences THEN the system SHALL CONTINUE TO create linear edge connections without modification

3.5 WHEN processing user prompts that explicitly mention logging or observability THEN the system SHALL generate log_output nodes as requested by the user
