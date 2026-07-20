# Bugfix Requirements Document

## Introduction

Six interconnected bugs in the AI workflow generation pipeline degrade correctness and reliability across multiple stages. The issues span static prompt files that hardcode node-specific knowledge (bypassing the registry), a flawed seeded-edge completeness check in the edge-reasoning stage that causes branching workflows to be wired incorrectly, a duplicate-nodeId collision that silently drops one branch, an overly strict AI validator that rejects valid simple linear workflows, and missing user-intent propagation to the field-population call. Together these bugs cause generated workflows to be structurally broken, use stale/wrong edges, or produce generic placeholder field values instead of intent-driven ones.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the AI pipeline loads `PRODUCTION_WORKFLOW_GENERATION_PROMPT.md` via `workflow-analyzer.ts` THEN the system injects a hardcoded list of 30+ specific node type names (e.g. `ollama_chat`, `google_gmail`, `slack_message`) into the prompt instead of deriving the available node catalog from the registry at runtime.

1.2 WHEN the clarifying-questions agent evaluates a user prompt THEN the system asks about hardcoded node-specific required fields (e.g. "Google Sheets: Spreadsheet ID", "Slack: Channel ID") regardless of which nodes are actually implied by the prompt or defined in the registry.

1.3 WHEN the edge-reasoning stage checks whether seeded branch edges are complete THEN the system uses the condition `seededBranchEdges.length >= branchingNodeIds.length`, which evaluates to `true` for a switch node with 3 cases (3 seeded edges ≥ 1 branching node) even when those edges are incomplete or incorrectly typed, causing the seeded (potentially broken) workflow to be used instead of the orchestrator-wired fallback.

1.4 WHEN the LLM returns the same `nodeId` for two nodes of the same type placed in different branches (e.g. two `google_gmail` nodes in a switch) THEN the system overwrites the first entry in `nodeMap` with the second, causing one branch to reference a node that no longer exists in the map and leaving that branch unwired.

1.5 WHEN `generateFromPrompt` in `workflow-builder.ts` calls `aiWorkflowValidator.validateWorkflowStructure` on a simple linear workflow of 2–3 nodes THEN the system records a `_validationError` with `confidence < 50` because the validator treats low node count as insufficient complexity, and downstream code continues with a structure flagged as a critical failure.

1.6 WHEN `generateRequiredInputFields` in `workflow-builder.ts` calls the field-generation AI THEN the system does not pass the original user prompt/intent to that call, so the AI produces generic placeholder values instead of values derived from what the user actually asked for.

### Expected Behavior (Correct)

2.1 WHEN the AI pipeline constructs any prompt that references available nodes THEN the system SHALL inject the node catalog dynamically from the registry at runtime, with no hardcoded node type names in `PRODUCTION_WORKFLOW_GENERATION_PROMPT.md`; the file SHALL contain only structural rules (no orphan nodes, no cycles, etc.).

2.2 WHEN the clarifying-questions agent evaluates a user prompt THEN the system SHALL ask only about fields that are marked required in the node's registry definition AND cannot be inferred from the user's prompt, with no hardcoded node-field lists in `CLARIFYING_QUESTIONS_SYSTEM_PROMPT.md`.

2.3 WHEN the edge-reasoning stage checks whether seeded branch edges are complete THEN the system SHALL verify that for every branching node, all of its outgoing ports (e.g. `case_1`, `case_2`, `case_3` for a switch; `true`, `false` for an if_else) have at least one seeded outgoing edge, and SHALL use seeded edges only when that full-port-coverage condition is satisfied.

2.4 WHEN the LLM returns duplicate `nodeId` values for nodes of the same type in different branches THEN the system SHALL detect the collision and assign a new unique ID to each duplicate before building `nodeMap`, ensuring every branch node is independently addressable and wired.

2.5 WHEN `aiWorkflowValidator.validateWorkflowStructure` evaluates a structurally valid linear workflow of 2–3 nodes THEN the system SHALL treat node count alone as insufficient grounds for a low-confidence failure, and SHALL NOT set `_validationError` on a workflow that is otherwise structurally sound.

2.6 WHEN `generateRequiredInputFields` calls the field-generation AI THEN the system SHALL pass the original user prompt/intent as context so the AI populates fields with intent-driven values rather than generic placeholders.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a workflow contains a branching node (switch or if_else) with correctly typed and complete seeded edges THEN the system SHALL CONTINUE TO use those seeded edges directly without falling back to orchestrator-wired edges.

3.2 WHEN the node-selection stage selects nodes that all have unique IDs THEN the system SHALL CONTINUE TO build `nodeMap` and wire edges exactly as before with no change in behavior.

3.3 WHEN a complex workflow with 4 or more nodes is validated by `aiWorkflowValidator` THEN the system SHALL CONTINUE TO apply the full confidence-scoring logic including node-count heuristics.

3.4 WHEN the clarifying-questions agent processes a prompt that already contains all required field values THEN the system SHALL CONTINUE TO output "No clarification needed." without asking any questions.

3.5 WHEN `workflow-analyzer.ts` loads `PRODUCTION_WORKFLOW_GENERATION_PROMPT.md` for legacy paths THEN the system SHALL CONTINUE TO apply all structural constraint rules (no orphan nodes, no cycles, proper data flow) that are retained in that file.

3.6 WHEN `generateRequiredInputFields` is called for a node whose required fields can be fully inferred from the user intent THEN the system SHALL CONTINUE TO populate those fields without prompting the user for additional input.
