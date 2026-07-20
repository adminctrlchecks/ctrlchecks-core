# Bugfix Requirements Document

## Introduction

Four related bugs degrade the fidelity between user intent and the AI-generated workflow in the autonomous workflow builder. Bug 1 causes the AI pipeline to inject `set_variable` nodes that the user never requested, violating the principle that only nodes demanded by user intent should appear in the graph. Bug 2 causes both branches of an if_else node to receive the same output node type (e.g. both Slack) instead of respecting per-branch intent (e.g. Gmail for true, Slack for false). Bug 3 causes AI-generated field values (channel, message, subject, etc.) that are visible in pipeline logs to never be persisted to `node.data.config`, so the Properties Panel always shows "Not configured". Bug 4 causes the post-credential "Continue Workflow" sequencing to skip or mis-order nodes that still require configuration, breaking the step-by-step configuration flow.

---

## Bug Analysis

### Current Behavior (Defect)

**Bug 1 — Spurious `set_variable` Node Injection**

1.1 WHEN the AI planner generates a `PlannedWorkflow` for a prompt that contains conditional logic (e.g. "if credit score > 700, mark eligible and send Gmail; else mark not eligible and send Slack") THEN the system injects one or more `set_variable` nodes into `planned.steps` even though the user's prompt contains no instruction to store or assign a variable.

1.2 WHEN `hydratePlannedWorkflow` converts `PlannedWorkflow.steps` into `WorkflowNode[]` THEN the system includes the spurious `set_variable` nodes in the hydrated graph, causing them to appear as wired nodes on the canvas between the trigger and the if_else node.

1.3 WHEN `EdgeReconciliationEngine` reconciles the graph containing the injected `set_variable` nodes THEN the system wires them into the linear chain before the if_else node, producing a graph shape of `form → set_variable → set_variable → if_else → ...` instead of the user-intended `form → if_else → ...`.

**Bug 2 — Both Branches Assigned the Same Output Node Type**

1.4 WHEN the AI planner generates a `PlannedWorkflow` for a prompt where the true branch requires one output node type (e.g. `gmail`) and the false branch requires a different output node type (e.g. `slack_message`) THEN the system assigns the same node type to both branches, producing two `slack_message` nodes instead of one `gmail` and one `slack_message`.

1.5 WHEN `hydratePlannedWorkflow` maps `PlannedWorkflow.steps` to `WorkflowNode[]` for a branching workflow THEN the system does not preserve per-branch node type assignments from the planner's intent, causing the branch-to-node-type mapping to collapse to a single repeated type.

1.6 WHEN `EdgeReconciliationEngine` Step 4 fans out branch ports from the if_else node THEN the system wires `true → slack_message_1` and `false → slack_message_2` instead of `true → gmail_1` and `false → slack_message_1`, because the node list contains two `slack_message` nodes rather than one `gmail` and one `slack_message`.

**Bug 3 — AI-Built Field Values Not Persisted to Properties Panel**

1.7 WHEN the AI pipeline generates field values for a node (e.g. `channel`, `message`, `text` for a Slack node, or `subject`, `body` for a Gmail node) and logs them with an "AI build" flag THEN the system does not write those values to `node.data.config` before returning the pipeline result, leaving `node.data.config` at registry `defaultConfig()` values.

1.8 WHEN the user opens the Properties Panel for a node whose fields were AI-populated during generation THEN the system reads `node.data.config` and finds all fields at their default (empty or "Not configured") state, because the AI-generated values were never persisted.

1.9 WHEN the `generate-workflow` API response is returned to the frontend THEN the system includes nodes whose `data.config` does not contain the AI-generated field values that were computed during the pipeline run, so the canvas and Properties Panel both reflect an unconfigured state.

**Bug 4 — Post-Credential "Continue Workflow" Node Sequencing Broken**

1.10 WHEN a user submits credentials and clicks "Continue Workflow" in `AutonomousAgentWizard` THEN the system does not walk through each node's required configuration fields in the correct order, skipping nodes that still need configuration or presenting them out of sequence.

1.11 WHEN the wizard's post-credential sequencing logic determines which nodes require further configuration THEN the system does not correctly correlate submitted credentials to their owning nodes, causing nodes that are already configured to be re-presented and nodes that still need configuration to be skipped.

1.12 WHEN `credential-preflight-check.ts` returns the list of nodes requiring credentials and the wizard advances past the credential submission step THEN the system does not use that list to drive an ordered walk through remaining per-node configuration steps, resulting in a broken or incomplete configuration sequence.

---

### Expected Behavior (Correct)

**Bug 1 — Spurious `set_variable` Node Injection**

2.1 WHEN the AI planner generates a `PlannedWorkflow` for any prompt THEN the system SHALL include in `planned.steps` only node types that are explicitly demanded by the user's intent — no `set_variable`, `log`, or utility node SHALL be injected unless the user's prompt explicitly requests variable assignment or logging.

2.2 WHEN `hydratePlannedWorkflow` converts `PlannedWorkflow.steps` into `WorkflowNode[]` THEN the system SHALL produce a node list that contains exactly the nodes the user requested, with no additional utility nodes inserted by the planner or hydration layer.

2.3 WHEN the user's prompt describes a conditional workflow with a form trigger, an if_else condition, and two output actions THEN the system SHALL generate a graph of exactly four nodes (`form_trigger → if_else → [gmail, slack_message]`) with no intermediate `set_variable` nodes.

**Bug 2 — Both Branches Assigned the Same Output Node Type**

2.4 WHEN the AI planner generates a `PlannedWorkflow` for a prompt where the true branch requires node type A and the false branch requires node type B THEN the system SHALL produce distinct step entries with types A and B respectively, preserving per-branch node type intent.

2.5 WHEN `hydratePlannedWorkflow` maps branch steps to `WorkflowNode[]` THEN the system SHALL assign each branch step the node type specified for that branch in the planner output, so that `true → gmail` and `false → slack_message` produce one `gmail` node and one `slack_message` node.

2.6 WHEN `EdgeReconciliationEngine` Step 4 wires branch ports from an if_else node THEN the system SHALL wire `true` to the node whose type matches the true-branch intent and `false` to the node whose type matches the false-branch intent, asserting that the two branch targets have different node types when the user's prompt specifies different output actions per branch.

**Bug 3 — AI-Built Field Values Not Persisted to Properties Panel**

2.7 WHEN the AI pipeline computes field values for a node's `buildtime_ai_once` fields during workflow generation THEN the system SHALL write those values to `node.data.config[fieldName]` before the pipeline returns its result.

2.8 WHEN the `generate-workflow` API response is returned to the frontend THEN the system SHALL include nodes whose `data.config` contains all AI-generated field values, so that the Properties Panel renders those fields as pre-filled rather than "Not configured".

2.9 WHEN the user opens the Properties Panel for a node that had AI-generated field values THEN the system SHALL display those values as the current field values, reflecting the AI's intent-driven population.

**Bug 4 — Post-Credential "Continue Workflow" Node Sequencing**

2.10 WHEN a user submits credentials and clicks "Continue Workflow" THEN the system SHALL walk through each node that still requires configuration in execution order, presenting each node's required fields exactly once and in the correct sequence.

2.11 WHEN the wizard's post-credential sequencing logic runs THEN the system SHALL use the credential-to-node mapping from `credential-preflight-check.ts` to determine which nodes are now satisfied and which nodes still require configuration, and SHALL present only the unsatisfied nodes in order.

2.12 WHEN all nodes have been walked through in the post-credential configuration sequence THEN the system SHALL advance to the final review or completion step without re-presenting already-configured nodes.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the user's prompt explicitly requests a `set_variable` step (e.g. "store the result in a variable") THEN the system SHALL CONTINUE TO generate a `set_variable` node and wire it correctly in the graph.

3.2 WHEN a workflow has an if_else node and both branches legitimately require the same output node type (e.g. both send a Slack message) THEN the system SHALL CONTINUE TO generate two distinct node instances of that type and wire each branch to its own instance.

3.3 WHEN a workflow is strictly linear with no branching THEN the system SHALL CONTINUE TO generate a linear chain of nodes matching user intent with no spurious injections.

3.4 WHEN a node has `manual_static` fields that the user must configure manually THEN the system SHALL CONTINUE TO leave those fields at their registry `defaultConfig()` values and SHALL NOT overwrite them with AI-generated values.

3.5 WHEN a node has `runtime_ai` fields THEN the system SHALL CONTINUE TO leave those fields unset at build time, as they are resolved at execution time.

3.6 WHEN the user has not yet submitted credentials and the wizard is on the credential collection step THEN the system SHALL CONTINUE TO present credential fields as it does today, with no change to that collection flow.

3.7 WHEN `EdgeReconciliationEngine` reconciles a non-branching workflow THEN the system SHALL CONTINUE TO produce a valid linear edge chain with no duplicate or missing connections.

3.8 WHEN `credential-preflight-check.ts` discovers required credentials for a workflow THEN the system SHALL CONTINUE TO return the correct list of required and missing credentials, with no change to that discovery behavior.

---

## Bug Condition Pseudocode

### Bug 1 — Spurious Node Injection

```pascal
FUNCTION isBugCondition_SpuriousInjection(X)
  INPUT: X = { userPrompt, plannedSteps }
  OUTPUT: boolean

  RETURN EXISTS step IN X.plannedSteps WHERE
    step.nodeType = 'set_variable'
    AND X.userPrompt DOES NOT CONTAIN intent for variable assignment
END FUNCTION

// Property: Fix Checking
FOR ALL X WHERE isBugCondition_SpuriousInjection(X) DO
  result ← planWorkflow'(X.userPrompt)
  ASSERT NOT EXISTS step IN result.plannedSteps WHERE
    step.nodeType = 'set_variable'
    AND X.userPrompt DOES NOT CONTAIN intent for variable assignment
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition_SpuriousInjection(X) DO
  ASSERT planWorkflow(X) = planWorkflow'(X)
END FOR
```

### Bug 2 — Branch Output Node Type Mismatch

```pascal
FUNCTION isBugCondition_BranchTypeMismatch(X)
  INPUT: X = { userPrompt, trueBranchIntendedType, falseBranchIntendedType, generatedNodes }
  OUTPUT: boolean

  trueBranchNode  ← node in X.generatedNodes wired to 'true' port of if_else
  falseBranchNode ← node in X.generatedNodes wired to 'false' port of if_else

  RETURN trueBranchNode.type ≠ X.trueBranchIntendedType
      OR falseBranchNode.type ≠ X.falseBranchIntendedType
END FUNCTION

// Property: Fix Checking
FOR ALL X WHERE isBugCondition_BranchTypeMismatch(X) DO
  result ← generateWorkflow'(X.userPrompt)
  trueBranchNode  ← node in result.nodes wired to 'true' port of if_else
  falseBranchNode ← node in result.nodes wired to 'false' port of if_else
  ASSERT trueBranchNode.type  = X.trueBranchIntendedType
  ASSERT falseBranchNode.type = X.falseBranchIntendedType
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition_BranchTypeMismatch(X) DO
  ASSERT generateWorkflow(X) = generateWorkflow'(X)
END FOR
```

### Bug 3 — AI Field Values Not Persisted

```pascal
FUNCTION isBugCondition_FieldNotPersisted(X)
  INPUT: X = { nodeId, fieldName, aiGeneratedValue, nodeDataConfig }
  OUTPUT: boolean

  RETURN aiGeneratedValue IS NOT NULL
    AND X.nodeDataConfig[X.fieldName] IS NULL OR EMPTY OR = defaultConfigValue
END FUNCTION

// Property: Fix Checking
FOR ALL X WHERE isBugCondition_FieldNotPersisted(X) DO
  result ← runPipeline'(X)
  ASSERT result.nodes[X.nodeId].data.config[X.fieldName] = X.aiGeneratedValue
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition_FieldNotPersisted(X) DO
  ASSERT node.data.config behavior is unchanged for manual_static and runtime_ai fields
END FOR
```

### Bug 4 — Post-Credential Sequencing

```pascal
FUNCTION isBugCondition_SequencingBroken(X)
  INPUT: X = { submittedCredentials, nodesRequiringConfig, presentedSequence }
  OUTPUT: boolean

  expectedSequence ← nodesRequiringConfig
    FILTER node WHERE node NOT fully satisfied by submittedCredentials
    ORDER BY executionOrder

  RETURN X.presentedSequence ≠ expectedSequence
END FUNCTION

// Property: Fix Checking
FOR ALL X WHERE isBugCondition_SequencingBroken(X) DO
  result ← continueWorkflow'(X.submittedCredentials)
  ASSERT result.configSequence = expectedSequence(X)
  ASSERT each node in result.configSequence presented exactly once
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition_SequencingBroken(X) DO
  ASSERT continueWorkflow(X) = continueWorkflow'(X)
END FOR
```
