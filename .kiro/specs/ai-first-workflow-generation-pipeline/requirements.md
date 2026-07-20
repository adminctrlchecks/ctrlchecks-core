# Requirements Document

## Introduction

The current workflow generation pipeline is a hybrid system: AI handles intent understanding, but every subsequent stage — node detection, execution order, edge wiring, and validation — relies on hardcoded keyword matching, deterministic topological sort, and static registry contracts. This makes the system brittle when users phrase prompts in unexpected ways, because the deterministic layers cannot understand intent — only exact keywords.

This feature replaces every hardcoded stage with an AI-driven equivalent. The unified-node-registry remains as a read-only catalog that the AI consults to know what nodes exist, but no deterministic keyword pre-filter, no hardcoded topological sort, and no hardcoded validation rules remain in the generation path. Every stage of the pipeline — node selection, execution order, edge reasoning, validation, and system prompt construction — is handled by the LLM, guided by well-crafted, dynamically assembled system prompts.

## Glossary

- **Pipeline**: The end-to-end sequence of stages that converts a user's natural language prompt into an executable workflow graph.
- **AI_Pipeline**: The new fully AI-driven pipeline defined by this feature.
- **Stage**: A discrete processing step within the Pipeline (e.g., intent understanding, node selection, edge reasoning, validation).
- **Node_Catalog**: A structured, dynamically assembled snapshot of the unified-node-registry, formatted as context for the LLM. Read-only; never used as a gatekeeper.
- **Keyword_Filter**: The existing deterministic pre-filter that maps prompt keywords to node types via tag/label matching. Targeted for removal.
- **Topological_Sort**: The existing deterministic algorithm that computes execution order from registry-defined node categories. Targeted for removal.
- **Registry_Contract_Validator**: The existing hardcoded validation layer that checks workflow graphs against registry-defined contracts. Targeted for removal in the generation path.
- **System_Prompt_Builder**: The new service responsible for dynamically assembling LLM system prompts per stage, incorporating the Node_Catalog and stage-specific instructions.
- **Intent_Stage**: The first Pipeline stage; extracts structured intent from the user's natural language prompt.
- **Node_Selection_Stage**: The second Pipeline stage; the LLM selects node types from the Node_Catalog based on structured intent.
- **Edge_Reasoning_Stage**: The third Pipeline stage; the LLM determines execution order and edge connections between selected nodes.
- **Validation_Stage**: The fourth Pipeline stage; the LLM validates the assembled graph for structural correctness and semantic alignment with the original intent.
- **Workflow_Graph**: The final output of the Pipeline — a set of nodes and edges representing an executable workflow.
- **LLM**: The large language model (Gemini) used to drive all AI stages.
- **Gemini_Orchestrator**: The existing service (`gemini-orchestrator.ts`) used to send requests to the LLM.
- **Unified_Graph_Orchestrator**: The existing service (`unified-graph-orchestrator.ts`) that is the single authority for structural graph mutations (node injection, removal, edge reconciliation). Remains in place; the AI_Pipeline feeds its output through this service.
- **Unified_Node_Registry**: The existing registry (`unified-node-registry.ts`) that defines all node types, schemas, credentials, and execution logic. Remains as the single source of truth for node behavior; used read-only by the AI_Pipeline for catalog construction.

---

## Requirements

### Requirement 1: Dynamic Node Catalog Construction

**User Story:** As a developer, I want the AI pipeline to receive a dynamically assembled, up-to-date snapshot of all available nodes, so that the LLM always reasons over the current registry without any hardcoded node lists.

#### Acceptance Criteria

1. THE System_Prompt_Builder SHALL read all node definitions from the Unified_Node_Registry at request time to construct the Node_Catalog.
2. THE Node_Catalog SHALL include, for each node type: its type identifier, human-readable label, description, input schema summary, output schema summary, category, and credential requirements.
3. THE Node_Catalog SHALL be formatted as structured text (e.g., JSON or a compact DSL) suitable for inclusion in an LLM system prompt without exceeding a configurable token budget.
4. WHEN the Node_Catalog exceeds the configured token budget, THE System_Prompt_Builder SHALL apply a priority-based truncation strategy that preserves trigger nodes, commonly used integration nodes, and logic nodes before truncating utility nodes.
5. THE System_Prompt_Builder SHALL NOT hardcode any node type names, labels, or keywords outside of the Unified_Node_Registry.
6. WHEN a new node is added to the Unified_Node_Registry, THE Node_Catalog SHALL include it automatically on the next pipeline invocation without any code changes to the AI_Pipeline.

---

### Requirement 2: AI-Driven Node Selection

**User Story:** As a user, I want the system to understand my prompt regardless of how I phrase it, so that the correct nodes are selected even when I don't use exact platform names or keywords.

#### Acceptance Criteria

1. WHEN a user submits a natural language prompt, THE Node_Selection_Stage SHALL send the prompt and the Node_Catalog to the LLM to select the required node types.
2. THE Node_Selection_Stage SHALL NOT apply any keyword pre-filter, tag-matching, or deterministic scoring before the LLM call.
3. THE LLM SHALL return a structured list of node type identifiers, each validated against the Unified_Node_Registry before proceeding.
4. IF the LLM returns a node type identifier that does not exist in the Unified_Node_Registry, THEN THE Node_Selection_Stage SHALL discard that identifier and log a warning, without failing the pipeline.
5. THE system prompt for the Node_Selection_Stage SHALL instruct the LLM to select the minimal necessary set of nodes, include exactly one trigger node, and avoid nodes not implied by the user's intent.
6. WHEN the Node_Selection_Stage produces zero valid node types after registry validation, THE AI_Pipeline SHALL return a structured error indicating that no matching nodes were found, rather than falling back to keyword matching.
7. THE Keyword_Filter SHALL be removed from the node selection path after the AI-driven path is verified to be operational.

---

### Requirement 3: AI-Driven Execution Order and Edge Reasoning

**User Story:** As a developer, I want the LLM to determine the execution order and edge connections between nodes, so that the pipeline is not constrained by hardcoded topological sort rules that cannot understand semantic intent.

#### Acceptance Criteria

1. WHEN node types have been selected, THE Edge_Reasoning_Stage SHALL send the selected nodes, the Node_Catalog, and the original user intent to the LLM to determine execution order and edge connections.
2. THE LLM SHALL return an ordered node sequence and a list of directed edges, each edge specifying source node, target node, and edge type (e.g., `main`, `true`, `false`, `case_N`).
3. THE Edge_Reasoning_Stage SHALL NOT use the existing Topological_Sort algorithm to compute execution order.
4. THE Topological_Sort SHALL be removed from the generation path after the AI-driven path is verified to be operational.
5. THE system prompt for the Edge_Reasoning_Stage SHALL enforce DAG constraints: no cycles, exactly one trigger with in-degree zero, all non-terminal nodes with at least one outgoing edge, and branching nodes (if_else, switch) with the correct number of labeled outgoing edges.
6. WHEN the LLM-produced edge list would create a cycle, THE Edge_Reasoning_Stage SHALL detect this and re-prompt the LLM with the cycle identified, requesting a corrected graph.
7. AFTER the LLM produces a valid ordered node list and edge list, THE Edge_Reasoning_Stage SHALL pass the result through the Unified_Graph_Orchestrator (`initializeWorkflow` or `reconcileWorkflow`) to produce the canonical Workflow_Graph.
8. THE Unified_Graph_Orchestrator SHALL remain the single authority for structural graph mutations; the AI_Pipeline SHALL NOT write to `workflow.edges` directly.

---

### Requirement 4: AI-Driven Validation

**User Story:** As a developer, I want the LLM to validate the assembled workflow graph for both structural correctness and semantic alignment with the user's original intent, so that validation is not limited to hardcoded registry contracts.

#### Acceptance Criteria

1. WHEN a Workflow_Graph has been assembled, THE Validation_Stage SHALL send the graph, the Node_Catalog, and the original user intent to the LLM for validation.
2. THE LLM SHALL evaluate the graph for: structural validity (DAG, reachability, correct edge types), semantic alignment (does the graph accomplish what the user asked), completeness (no missing required nodes), and data flow coherence (outputs of upstream nodes are compatible with inputs of downstream nodes).
3. THE LLM SHALL return a structured validation result containing: a pass/fail status, a list of identified issues (each with a severity level of `error` or `warning`), and a suggested fix for each `error`-level issue.
4. IF the Validation_Stage returns one or more `error`-level issues, THEN THE AI_Pipeline SHALL attempt one automated repair pass by re-prompting the LLM with the issues and requesting a corrected graph.
5. IF the automated repair pass does not resolve all `error`-level issues, THEN THE AI_Pipeline SHALL return the partially repaired graph along with the remaining issues to the caller, rather than silently returning an invalid graph.
6. THE Registry_Contract_Validator hardcoded rules SHALL be removed from the generation path after the AI-driven validation path is verified to be operational.
7. THE Unified_Graph_Orchestrator's `validateWorkflow` method SHALL still be called after AI validation as a structural safety net; any violations it reports SHALL be treated as pipeline contract errors.

---

### Requirement 5: Dynamic System Prompt Construction

**User Story:** As a developer, I want system prompts to be assembled dynamically at runtime rather than read from static markdown files, so that prompts can incorporate live registry data, stage-specific context, and user intent without requiring code changes.

#### Acceptance Criteria

1. THE System_Prompt_Builder SHALL construct system prompts programmatically at runtime for each Pipeline stage.
2. THE System_Prompt_Builder SHALL accept as inputs: the target stage identifier, the Node_Catalog, the user's original intent, and any stage-specific context (e.g., previously selected nodes, identified issues).
3. THE System_Prompt_Builder SHALL produce a system prompt that includes: stage-specific role and objective instructions, the Node_Catalog (or a relevant subset), explicit output format requirements (JSON schema), and hard constraints relevant to the stage (e.g., DAG rules for the Edge_Reasoning_Stage).
4. THE static markdown system prompt files (`WORKFLOW_GENERATION_SYSTEM_PROMPT.md`, `WORKFLOW_PLANNING_SYSTEM_PROMPT.md`, `ULTIMATE_WORKFLOW_SYSTEM_PROMPT.md`, `FINAL_WORKFLOW_SYSTEM_PROMPT.md`) SHALL be deprecated and removed from the active generation path after the System_Prompt_Builder is operational.
5. WHERE a stage requires enforcing DAG structural rules, THE System_Prompt_Builder SHALL embed the DAG constraint rules directly in the system prompt for that stage.
6. THE System_Prompt_Builder SHALL be testable in isolation: given a stage identifier and a Node_Catalog, it SHALL produce a deterministic, non-empty string prompt.

---

### Requirement 6: Registry as Read-Only Catalog

**User Story:** As a developer, I want the unified-node-registry to serve purely as a reference catalog for the AI, so that it informs the LLM about available nodes without acting as a gatekeeper that filters or blocks node selection.

#### Acceptance Criteria

1. THE Unified_Node_Registry SHALL remain the single source of truth for node type definitions, input/output schemas, credential requirements, and execution logic.
2. THE AI_Pipeline SHALL read from the Unified_Node_Registry only to construct the Node_Catalog; it SHALL NOT use the registry to pre-filter, score, or rank nodes before the LLM call.
3. THE AI_Pipeline SHALL use the Unified_Node_Registry post-LLM to validate that LLM-selected node types exist, and to hydrate node configurations with registry defaults.
4. THE Unified_Node_Registry SHALL NOT be modified as part of this feature; all changes are in the pipeline layer above it.
5. WHEN the AI_Pipeline hydrates a node configuration with registry defaults, THE hydration SHALL use the existing `defaultConfig()` method from the Unified_Node_Registry, consistent with the permanent-core-architecture rule.

---

### Requirement 7: Removal of Hardcoded Pipeline Logic

**User Story:** As a developer, I want all hardcoded deterministic logic removed from the generation pipeline after the AI-driven path is stable, so that the system is universally capable and not constrained by keyword lists or fixed rules.

#### Acceptance Criteria

1. WHEN the AI-driven node selection path is verified operational, THE Keyword_Filter (`keyword-node-selector.ts`, `enhanced-keyword-matcher.ts` keyword-based paths) SHALL be removed from the generation pipeline.
2. WHEN the AI-driven edge reasoning path is verified operational, THE Topological_Sort algorithm SHALL be removed from the generation pipeline.
3. WHEN the AI-driven validation path is verified operational, THE Registry_Contract_Validator hardcoded rules SHALL be removed from the generation pipeline.
4. WHEN the System_Prompt_Builder is verified operational, THE static markdown system prompt files SHALL be removed from the active generation path.
5. THE removal of each hardcoded component SHALL be preceded by a passing test suite that exercises the AI-driven equivalent with at least five distinct prompt phrasings that previously failed under the keyword-based approach.
6. IF any hardcoded component is retained as a fallback after the AI-driven path is operational, THEN THE retention SHALL be explicitly documented with a rationale and a removal target date.

---

### Requirement 8: Pipeline Observability

**User Story:** As a developer, I want each stage of the AI pipeline to emit structured logs, so that I can trace how a user's prompt was transformed at each stage and diagnose failures.

#### Acceptance Criteria

1. THE AI_Pipeline SHALL emit a structured log entry at the start and end of each Stage, including: stage name, input summary (prompt hash or truncated intent), output summary (node count, edge count, or issue count), and duration in milliseconds.
2. WHEN a Stage calls the LLM, THE AI_Pipeline SHALL log the model name, temperature setting, and token counts (prompt tokens, completion tokens) for that call.
3. WHEN a Stage fails or produces a validation error, THE AI_Pipeline SHALL log the full error details at `error` level, including the LLM response that caused the failure.
4. THE structured log entries SHALL be emitted using the existing `workflow-logger` service to maintain consistency with the rest of the system.
5. THE log entries SHALL NOT include the full Node_Catalog text in production mode to avoid excessive log volume; WHERE debug mode is enabled, THE AI_Pipeline SHALL log the full Node_Catalog used for each stage.

---

### Requirement 9: Single Universal Pipeline — No Dual Paths

**User Story:** As a developer, I want the AI-first pipeline to be the only generation path in the system, so that there is no legacy code that can override, interfere with, or silently fall back to hardcoded behavior.

#### Acceptance Criteria

1. THE AI_Pipeline SHALL be the sole entry point for all workflow generation requests — there SHALL be no feature flag, no parallel hybrid path, and no fallback to the existing `WorkflowPipelineOrchestrator`.
2. THE existing `WorkflowPipelineOrchestrator` and its hardcoded stages SHALL be deleted as each AI-driven stage is implemented and its tests pass — not deferred to a later cleanup task.
3. THE `generate-workflow.ts` entry point SHALL invoke `AiFirstPipeline` directly with no conditional branching.
4. WHEN the AI_Pipeline produces a Workflow_Graph, THE graph SHALL pass the `validateWorkflow` check from the Unified_Graph_Orchestrator before being returned to the caller.
5. AT NO POINT during or after implementation SHALL two pipeline implementations exist simultaneously in the active codebase.
