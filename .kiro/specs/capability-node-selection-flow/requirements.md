# Requirements Document

## Introduction

The current workflow generation pipeline pre-computes a structural prompt using default or legacy nodes before the user has any opportunity to choose which nodes they actually want. This creates a mismatch between user intent and the generated workflow: the structural prompt is built with arbitrary defaults, and the user has no agency over which concrete integrations are used.

The Capability-Based Node Selection Flow replaces this pre-computation with a user-driven selection stage. The AI first parses the user's prompt into discrete use-case units (e.g., "trigger", "read data", "send communication", "transform data"). For each use-case unit, the AI groups semantically equivalent nodes into a capability container — driven entirely by intent meaning, not by hardcoded node names or types. The user then picks one node from each container. Only after selection does the system build the structural prompt using exclusively the chosen nodes. The user reviews that prompt and clicks Continue, at which point backend generation (credentials, execution, etc.) begins.

This feature has zero overlap with legacy behavior where the structural prompt is pre-computed with defaults before capability selection. The final chain is: intent understanding → capability grouping by use-case → user selection → structural prompt from selected nodes → continue → backend generation.

## Glossary

- **Platform**: The CtrlChecks AI workflow automation system.
- **Capability_Node_Selection_Flow**: The new end-to-end flow defined by this feature, replacing pre-computed structural prompt generation.
- **Intent_Analyzer**: The AI component that parses the user's natural language prompt and splits it into an ordered list of Use_Case_Units.
- **Use_Case_Unit**: A discrete, semantically meaningful task extracted from the user's prompt (e.g., "trigger on new email", "read spreadsheet data", "send a message", "transform data"). Each unit maps to exactly one Capability_Container.
- **Capability_Container**: A grouping of semantically equivalent nodes that can all fulfill the same Use_Case_Unit. Grouping is determined by the AI from intent meaning — never by hardcoded node names, node type strings, or category tags.
- **Capability_Stage**: The UI step where the user sees all Capability_Containers and selects nodes from whichever containers they care about. Selection is optional per container; at least one selection across any container is required to proceed.
- **Node_Selection**: The user's explicit choice of one node from a Capability_Container.
- **Structural_Prompt**: The structured representation of the workflow built exclusively from the user's selected nodes. Generated only after the user has made at least one Node_Selection and clicked Continue. Containers the user skipped are omitted from the workflow; the AI generates a coherent workflow from the partial selections combined with the original user intent.
- **Structural_Prompt_Review**: The UI step where the user reviews the Structural_Prompt built from their selections before proceeding.
- **Backend_Generation**: The downstream pipeline phase (credential resolution, execution graph compilation, etc.) that begins only after the user clicks Continue from the Structural_Prompt_Review step.
- **Unified_Node_Registry**: The single source of truth for all node type definitions, schemas, credentials, and execution logic (`worker/src/core/registry/unified-node-registry.ts`). Read-only within this feature.
- **Unified_Graph_Orchestrator**: The sole authority for all workflow edge creation, removal, and validation (`worker/src/core/orchestration/unified-graph-orchestrator.ts`). All structural graph mutations in this feature must go through it.
- **Node_Catalog**: A dynamically assembled, read-only snapshot of the Unified_Node_Registry formatted for LLM consumption.
- **AI_Pipeline**: The existing AI-first workflow generation pipeline.
- **LLM**: The large language model (Gemini) used to drive intent analysis and capability grouping.
- **Gemini_Orchestrator**: The existing service (`gemini-orchestrator.ts`) used to send requests to the LLM.

---

## Requirements

---

### Requirement 1: Intent Analysis — Splitting the Prompt into Use-Case Units

**User Story:** As a user, I want the system to understand my prompt and break it down into the distinct tasks it involves, so that I can see exactly what capabilities are needed before any nodes are chosen.

#### Acceptance Criteria

1. WHEN a user submits a natural language prompt, THE Intent_Analyzer SHALL send the prompt and the Node_Catalog to the LLM to produce an ordered list of Use_Case_Units.
2. THE Intent_Analyzer SHALL NOT apply any keyword pre-filter, tag-matching, or deterministic scoring before the LLM call.
3. EACH Use_Case_Unit SHALL include: a human-readable label (e.g., "Trigger: new email received"), a semantic role (e.g., `trigger`, `data_source`, `communication`, `transformation`, `output`), and a natural language description of what the unit must accomplish.
4. THE Intent_Analyzer SHALL produce exactly one Use_Case_Unit with semantic role `trigger` per prompt.
5. WHEN the LLM produces a Use_Case_Unit list, THE Intent_Analyzer SHALL validate that the list contains at least one unit and at most twenty units; IF the list is empty, THEN THE Intent_Analyzer SHALL return a structured error rather than proceeding.
6. THE Intent_Analyzer SHALL emit a structured log entry containing the input prompt hash, the number of Use_Case_Units produced, and the duration of the LLM call in milliseconds.
7. THE Intent_Analyzer SHALL NOT store Use_Case_Units in any node's `config` object or in `workflow.edges`; the units are transient pipeline state only.

---

### Requirement 2: Capability Grouping — AI-Driven Container Construction

**User Story:** As a user, I want to see which nodes can fulfill each task in my workflow, grouped by what they do rather than what they are named, so that I can make an informed choice between equivalent options.

#### Acceptance Criteria

1. FOR EACH Use_Case_Unit produced by the Intent_Analyzer, THE Capability_Node_Selection_Flow SHALL invoke the LLM with the Use_Case_Unit description and the Node_Catalog to produce a Capability_Container.
2. EACH Capability_Container SHALL include: the Use_Case_Unit it fulfills, a human-readable container label (e.g., "Send Email"), and an ordered list of candidate node type identifiers from the Unified_Node_Registry.
3. THE LLM SHALL group nodes by semantic equivalence — nodes that can accomplish the same job for the same use-case unit — regardless of node name, node type string, or category tag.
4. THE Capability_Node_Selection_Flow SHALL NOT use any hardcoded mapping, lookup table, or if/switch on node type strings to construct Capability_Containers.
5. WHEN the LLM returns a candidate node type identifier that does not exist in the Unified_Node_Registry, THE Capability_Node_Selection_Flow SHALL discard that identifier and log a warning, without failing the flow.
6. EACH Capability_Container SHALL contain at least one valid candidate node after registry validation; IF a container would be empty after discarding invalid identifiers, THEN THE Capability_Node_Selection_Flow SHALL re-prompt the LLM once with the validation failure context before returning an error.
7. THE Capability_Node_Selection_Flow SHALL NOT pre-select or default-select any node within a Capability_Container; all selections are deferred to the user.
8. THE Capability_Node_Selection_Flow SHALL expose each Capability_Container to the frontend in a structured format containing: `containerId`, `label`, `useCaseUnit`, and `candidates` (array of `{ nodeType, label, description, credentialRequirements }`).
9. THE candidate metadata (label, description, credentialRequirements) for each node SHALL be read from the Unified_Node_Registry at runtime; it SHALL NOT be hardcoded in the Capability_Node_Selection_Flow.

---

### Requirement 3: User Selection — Capability Stage UI

**User Story:** As a user, I want to see all capability containers at once and pick nodes from only the containers I care about, so that I can build a workflow from my chosen integrations without being forced to fill every container.

#### Acceptance Criteria

1. THE Capability_Stage SHALL display all Capability_Containers to the user simultaneously, in the order of the Use_Case_Unit list produced by the Intent_Analyzer.
2. FOR EACH Capability_Container, THE Capability_Stage SHALL render the container label, the use-case description, and all candidate nodes as selectable options.
3. EACH candidate node option SHALL display: the node's human-readable label, a short description of what it does, and an indicator of whether the user already has credentials configured for it.
4. THE Capability_Stage SHALL enable the Continue button as soon as at least one node has been selected across any Capability_Container; there is no requirement to select a node from every container.
5. WHEN the user selects a node from a Capability_Container, THE Capability_Stage SHALL highlight the selected node and deselect any previously selected node in that container.
6. THE Capability_Stage SHALL NOT proceed to Structural_Prompt generation until at least one Node_Selection exists across all Capability_Containers.
7. WHEN the user clicks Continue on the Capability_Stage, THE Capability_Node_Selection_Flow SHALL record the set of Node_Selections (which may be a partial subset of all containers) and proceed to Structural_Prompt generation.
8. THE Capability_Stage SHALL allow the user to go back and change a selection at any time before clicking Continue; changing a selection SHALL NOT trigger Structural_Prompt generation until Continue is clicked.
9. THE Capability_Stage SHALL display a visual indicator showing how many containers have been selected (e.g., "3 of 6 selected") without implying that all containers must be filled.

---

### Requirement 4: Structural Prompt Generation from Partial or Full Node Selections

**User Story:** As a developer, I want the structural prompt to be built from whichever nodes the user selected — even if they skipped some containers — so that the AI can generate a meaningful workflow from the user's partial choices combined with their original intent.

#### Acceptance Criteria

1. THE Structural_Prompt SHALL be generated only after the user has made at least one Node_Selection and clicked Continue on the Capability_Stage.
2. THE Structural_Prompt generation SHALL use exclusively the node types from the user's Node_Selections; it SHALL NOT include any default, legacy, or fallback nodes that were not selected by the user.
3. WHEN generating the Structural_Prompt, THE Capability_Node_Selection_Flow SHALL call the LLM with the ordered Node_Selections (which may be a partial subset of all containers), the original user prompt, and the Node_Catalog; the LLM SHALL generate a valid workflow structure using only the selected nodes, intelligently omitting or bridging steps for containers the user skipped.
4. THE LLM SHALL output only `{ type: "nodeName" }` references for each node; the Capability_Node_Selection_Flow SHALL hydrate each node with defaults from `unifiedNodeRegistry.defaultConfig()` before passing it to the Unified_Graph_Orchestrator.
5. THE Capability_Node_Selection_Flow SHALL call `unifiedGraphOrchestrator.initializeWorkflow(nodes)` to construct the initial Workflow_Graph from the hydrated node list; it SHALL NOT write to `workflow.edges` directly.
6. AFTER `initializeWorkflow`, THE Capability_Node_Selection_Flow SHALL call `unifiedGraphOrchestrator.validateWorkflow(workflow)` and treat any structural violation as a pipeline contract error.
7. THE Structural_Prompt SHALL be presented to the user for review before Backend_Generation begins; the user SHALL be able to read the structural summary of the workflow they are about to build.
8. THE Structural_Prompt generation step SHALL emit a structured log entry containing: the list of selected node types, the total number of containers, the number of containers that had a selection, the number of nodes, the number of edges in the resulting graph, and the duration of the LLM call.

---

### Requirement 5: Structural Prompt Review and Continue Gate

**User Story:** As a user, I want to review the structural prompt built from my selected nodes before the backend starts building my workflow, so that I can confirm the workflow matches my intent before credentials and execution are configured.

#### Acceptance Criteria

1. THE Structural_Prompt_Review step SHALL display the Structural_Prompt to the user in a human-readable format showing the selected nodes in execution order and the connections between them.
2. THE Structural_Prompt_Review step SHALL display the name and description of each selected node in the workflow sequence.
3. THE Continue button on the Structural_Prompt_Review step SHALL be the sole gate that triggers Backend_Generation; no backend credential resolution, execution graph compilation, or node execution SHALL begin before the user clicks Continue.
4. WHEN the user clicks Continue on the Structural_Prompt_Review step, THE Capability_Node_Selection_Flow SHALL pass the validated Workflow_Graph to the Backend_Generation phase.
5. THE Structural_Prompt_Review step SHALL provide a "Go Back" action that returns the user to the Capability_Stage with all previous Node_Selections preserved.
6. IF the user goes back from the Structural_Prompt_Review step and changes one or more Node_Selections, THEN THE Structural_Prompt SHALL be regenerated from the updated selections when the user clicks Continue again on the Capability_Stage.

---

### Requirement 6: Backend Generation Begins Only After Continue

**User Story:** As a developer, I want backend generation (credentials, execution, etc.) to start only after the user has reviewed and confirmed the structural prompt, so that no backend work is wasted on a workflow the user has not approved.

#### Acceptance Criteria

1. THE Backend_Generation phase SHALL NOT begin until the user has clicked Continue on the Structural_Prompt_Review step.
2. WHEN Backend_Generation begins, THE Capability_Node_Selection_Flow SHALL pass the Workflow_Graph — built exclusively from the user's Node_Selections — to the existing credential resolution and execution pipeline.
3. THE credential resolution step SHALL read required credentials from the Unified_Node_Registry for each selected node type; it SHALL NOT use hardcoded credential mappings.
4. THE Backend_Generation phase SHALL use the Unified_Graph_Orchestrator as the sole authority for any further structural graph mutations (e.g., injecting safety nodes, resolving credential nodes).
5. WHEN Backend_Generation completes, THE Capability_Node_Selection_Flow SHALL return the fully built workflow to the caller.
6. IF Backend_Generation fails after the user has clicked Continue, THEN THE Capability_Node_Selection_Flow SHALL return a structured error to the frontend without discarding the user's Node_Selections, so that the user can retry without repeating the Capability_Stage.

---

### Requirement 7: No Pre-Computation of Structural Prompt Before Selection

**User Story:** As a developer, I want to ensure the legacy behavior of pre-computing the structural prompt with default nodes is completely removed from this flow, so that there is no overlap or silent fallback to the old approach.

#### Acceptance Criteria

1. THE Capability_Node_Selection_Flow SHALL NOT call any structural prompt generation function before the user has completed all Node_Selections on the Capability_Stage.
2. THE Capability_Node_Selection_Flow SHALL NOT pass default or legacy node types to the Unified_Graph_Orchestrator before the user's Node_Selections are recorded.
3. WHEN the Capability_Node_Selection_Flow is active, THE AI_Pipeline SHALL NOT run its existing pre-selection structural prompt generation step in parallel or as a background task.
4. THE Capability_Node_Selection_Flow SHALL NOT fall back to the legacy pre-computed structural prompt if the LLM fails to produce a Capability_Container; instead, it SHALL surface the error to the user.
5. FOR ALL code paths in the Capability_Node_Selection_Flow, THE Platform SHALL contain zero occurrences of `workflow.edges.push(...)` or `workflow.edges = [...]` outside of `unified-graph-orchestrator.ts`.

---

### Requirement 8: Registry-Driven Behavior — No Hardcoding

**User Story:** As a developer, I want all node grouping, metadata, and credential information to come from the Unified_Node_Registry at runtime, so that adding a new node automatically makes it available in capability containers without any code changes.

#### Acceptance Criteria

1. THE Capability_Node_Selection_Flow SHALL read all node metadata (label, description, category, credential requirements) from the Unified_Node_Registry at request time; it SHALL NOT hardcode any node labels, descriptions, or credential requirements.
2. WHEN a new node type is added to the Unified_Node_Registry, THE Capability_Node_Selection_Flow SHALL include it as a candidate in relevant Capability_Containers on the next invocation without any code changes.
3. THE Capability_Node_Selection_Flow SHALL NOT contain any `if (node.type === '...')` or `switch (node.type)` comparisons for routing, grouping, or display logic.
4. THE Capability_Node_Selection_Flow SHALL NOT maintain any hardcoded mapping between use-case labels and node type strings (e.g., no `{ "send email": ["google_gmail", "outlook"] }` lookup tables).
5. WHEN the Capability_Node_Selection_Flow hydrates a selected node with defaults, THE hydration SHALL use `unifiedNodeRegistry.defaultConfig(nodeType)` exclusively.
6. THE credential indicator shown for each candidate node in the Capability_Stage SHALL be derived by reading `credentialSchema` from the Unified_Node_Registry and checking the user's credential vault; it SHALL NOT be hardcoded per node type.
