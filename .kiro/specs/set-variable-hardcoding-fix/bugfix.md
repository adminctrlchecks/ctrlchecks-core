# Bugfix Requirements Document

## Introduction

The workflow generation system is automatically injecting `set_variable` nodes into workflows even when the user never requested variable assignment. This violates the core principle that nodes must only be added based on explicit user intent. The bug manifests through multiple hardcoded injection points across system prompts and generation logic — including a fallback in `workflow-structure-builder.ts` that always emits a `set_variable` node when intent parsing fails, a forced injection in `workflow-builder.ts` when `needsDataExtraction` is true, and system prompt text that suggests `set_variable` for generic "extract" keywords. The result is unwanted nodes appearing in generated workflows with broken or missing edges.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the user submits a workflow prompt that does not mention variable assignment, storing, or setting a variable THEN the system injects a `set_variable` node into the generated workflow

1.2 WHEN intent parsing produces no actions and no valid trigger THEN the system falls back to a hardcoded `manual_trigger → set_variable` skeleton regardless of user intent

1.3 WHEN the user's prompt contains words like "extract", "get specific fields", or "parse" THEN the system prompt instructs the AI to add a `set_variable` node even though no variable assignment was requested

1.4 WHEN `needsDataExtraction` is flagged true THEN the system forcibly inserts a `set_variable` node as the first step after the trigger, bypassing user intent

1.5 WHEN `inferStepType` cannot match a step to a known node type THEN the system defaults to `set_variable` as a fallback node type

1.6 WHEN a `set_variable` node is injected automatically THEN its edges are not always properly wired according to DAG rules, producing orphan nodes or invalid connections

### Expected Behavior (Correct)

2.1 WHEN the user submits a workflow prompt that does not mention variable assignment THEN the system SHALL generate a workflow containing only the nodes that match the user's stated intent

2.2 WHEN intent parsing produces no actions and no valid trigger THEN the system SHALL return an error or ask the user for clarification instead of emitting a hardcoded `set_variable` fallback

2.3 WHEN the user's prompt contains words like "extract", "get specific fields", or "parse" THEN the system prompt SHALL NOT suggest or inject `set_variable` unless the user explicitly asks to assign a value to a named variable

2.4 WHEN `needsDataExtraction` is flagged true THEN the system SHALL only include a `set_variable` node if the user's prompt contains an explicit variable-assignment intent (e.g., "set variable", "store in a variable", "assign to")

2.5 WHEN `inferStepType` cannot match a step to a known node type THEN the system SHALL log a warning and skip that step or surface an error rather than defaulting to `set_variable`

2.6 WHEN any node is added to a workflow THEN the system SHALL wire all edges through `unifiedGraphOrchestrator.initializeWorkflow(nodes)` or `injectNode()` so the DAG remains valid with no orphan nodes

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the user explicitly says "set variable", "store value in a variable", or "assign to a variable" THEN the system SHALL CONTINUE TO include a `set_variable` node configured according to the user's intent

3.2 WHEN the user requests conditional logic (if/else, switch) THEN the system SHALL CONTINUE TO generate the correct branching nodes with proper true/false or case edges

3.3 WHEN the user requests a loop over a data source THEN the system SHALL CONTINUE TO generate the correct `loop` node wired between the data source and the target action

3.4 WHEN a valid workflow is generated from a clear user prompt THEN the system SHALL CONTINUE TO produce a fully connected DAG with no orphan nodes and no duplicate edges

3.5 WHEN the `unified-node-registry` defines a node's behavior THEN the system SHALL CONTINUE TO use the registry as the single source of truth for node schemas, defaults, and execution logic without hardcoding node-specific logic outside the registry
