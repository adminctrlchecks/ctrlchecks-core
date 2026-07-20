# Bugfix Requirements Document

## Introduction

Five interconnected bugs degrade the fidelity between user intent and the AI-generated workflow in the autonomous workflow builder. Bug A causes Slack node fields (`channel`, `text`, `username`) to show "Not configured" in the Properties Panel even after AI generation, because the registry's `getDefaultFillMode()` heuristic classifies them as `manual_static` or `runtime_ai` instead of `buildtime_ai_once`, and the schema's explicit `fillMode` for `message` is overridden by the heuristic. Bug B causes `set_variable` nodes to be injected into any form-triggered workflow that lacks one, regardless of whether the user's prompt requests variable assignment. Bug C causes both branches of an `if_else` node to receive the same output node type (e.g. both `slack_message`) when the planner collapses distinct per-branch intents, because the system prompt does not enforce distinct types per branch. Bug D causes `runtime_ai` fields in the schema-driven rendering path of the Properties Panel to show "Not configured" instead of the "Filled automatically by AI at runtime" banner. Bug E requires the `EdgeReconciliationEngine` to correctly wire branch ports for any branching node type (`if_else`, `switch`) with any number of branches and any mix of same-type or different-type output nodes per branch.

---

## Bug Analysis

### Current Behavior (Defect)

**Bug A — Slack Node Fields Show "Not Configured" Despite AI Generation**

1.1 WHEN the AI pipeline runs `property-population-stage` for a `slack_message` node THEN the system classifies `channel` as `manual_static` and `username` as `manual_static` via `getDefaultFillMode()`, so those fields are excluded from AI population and remain at `defaultConfig()` values.

1.2 WHEN the AI pipeline runs `property-population-stage` for a `slack_message` node THEN the system classifies `text` as `runtime_ai` via `getDefaultFillMode()` (matches the `text` pattern), so it is excluded from `buildtime_ai_once` population and remains empty.

1.3 WHEN the `slack_message` schema in `node-library.ts` defines `message` with an explicit `fillMode: { default: 'buildtime_ai_once' }` THEN the system's `convertNodeLibrarySchemaToUnified()` in `unified-node-registry.ts` correctly preserves that explicit value via the `?? getDefaultFillMode()` fallback, but `text` (the alias field) has no explicit `fillMode` and is classified as `runtime_ai` by the heuristic.

1.4 WHEN the user opens the Properties Panel for a `slack_message` node after AI generation THEN the system reads `node.data.config` and finds `channel`, `text`, and `username` empty, so `hasAiValue = false`, `fieldEnabled = false`, and the collapsed preview shows "Not configured" for all three fields.

**Bug B — Spurious `set_variable` Injection for Form-Triggered Workflows**

1.5 WHEN `workflowGraphRepair.checkGraphIntegrity()` is called for any workflow whose `structure.trigger === 'form'` that does not already contain a `set_variable`, `json_parser`, `edit_fields`, or `set` node THEN the system unconditionally pushes a `set_variable` entry into `missingNodes`, regardless of whether the user's prompt contains any intent to store or assign a variable.

1.6 WHEN `checkGraphIntegrity()` is called three times during `workflow-builder.ts` execution (lines 2052, 2204, 2369) for the same form-triggered workflow THEN the system may inject the `set_variable` node up to three times, producing duplicate nodes in the graph.

1.7 WHEN the user's prompt describes a form-triggered conditional workflow (e.g. "user submits a form with credit score; if score > 700 send Gmail, else send Slack") THEN the system generates a graph of `form → set_variable → set_variable → if_else → ...` instead of the user-intended `form → if_else → ...`.

**Bug C — Both Branches Assigned the Same Output Node Type**

1.8 WHEN the Gemini planner in `planWorkflowWithGemini()` generates a `PlannedWorkflow` for a prompt where the true branch requires one output node type (e.g. `google_gmail`) and the false branch requires a different type (e.g. `slack_message`) THEN the system emits both branch steps with the same node type (e.g. both `slack_message`), because the planner system prompt does not explicitly instruct it to preserve distinct types per branch.

1.9 WHEN `expandBranchSteps()` in `workflow-builder.ts` processes the planner output for an `if_else` node THEN the system only handles the case where there are fewer steps than branch ports (cloning steps), but does not detect or correct the case where the planner emitted the wrong node type for a branch.

1.10 WHEN `EdgeReconciliationEngine` wires branch ports from the `if_else` node THEN the system connects `true → slack_message_1` and `false → slack_message_2` instead of `true → gmail_1` and `false → slack_message_1`, because the node list contains two `slack_message` nodes rather than one `google_gmail` and one `slack_message`.

**Bug D — Properties Panel Does Not Show `runtime_ai` Banner in Schema-Driven Path**

1.11 WHEN the Properties Panel renders a field whose `effectiveFillMode === 'runtime_ai'` via the schema-driven rendering path (lines 2080–2170 of `PropertiesPanel.tsx`) THEN the system evaluates `hasAiValue` and `fieldEnabled` as it does for any other field, and because no AI value is present at build time, it shows "Not configured" in the collapsed preview.

1.12 WHEN the legacy rendering path in `PropertiesPanel.tsx` renders a `runtime_ai` field THEN the system correctly shows a "Filled automatically by AI at runtime" banner, but this path is no longer used for schema-driven nodes (which all nodes now are).

**Bug E — Branch Port Wiring Fails for Mixed-Type and Multi-Node Branches**

1.13 WHEN `EdgeReconciliationEngine` fans out branch ports from an `if_else` or `switch` node and the two branch output nodes have the same type THEN the system cannot distinguish which node belongs to which branch by type alone, and may wire ports to the wrong nodes.

1.14 WHEN a branch contains multiple sequential nodes (e.g. `true → [set_variable → gmail]`) THEN the system does not correctly identify the first node of each branch from execution order metadata, and may wire the branch port to an interior node rather than the branch-entry node.

1.15 WHEN a `switch` node has N cases and the planner emits N output nodes of varying types THEN the system does not guarantee that `case_k` is wired to the node intended for that case, because port-to-node assignment relies on sequential position rather than explicit branch metadata.

---

### Expected Behavior (Correct)

**Bug A — Slack Node Fields Show "Not Configured" Despite AI Generation**

2.1 WHEN `convertNodeLibrarySchemaToUnified()` processes the `slack_message` schema THEN the system SHALL classify `channel` as `buildtime_ai_once` (AI can suggest a channel name from prompt context such as "#general" or "#alerts"), `text` as `buildtime_ai_once` (alias for message, same treatment), and `username` as `buildtime_ai_once` (AI can suggest a bot name from context), while `blocks` SHALL remain `manual_static` (complex JSON requiring user configuration) and `webhookUrl` SHALL remain `manual_static` with `ownership: credential`.

2.2 WHEN `property-population-stage` runs for a `slack_message` node THEN the system SHALL include `channel`, `text`, `message`, and `username` in the eligible fields list (all `buildtime_ai_once`, non-credential), and SHALL write AI-generated values for those fields to `node.data.config`.

2.3 WHEN the user opens the Properties Panel for a `slack_message` node after AI generation THEN the system SHALL display `channel`, `text`, and `username` with their AI-generated values, with the toggle ON and the "AI prefilled" badge visible.

2.4 WHEN `convertNodeLibrarySchemaToUnified()` processes any node schema that has an explicit `fillMode` set on a field in `configSchema.optional` THEN the system SHALL preserve that explicit value and SHALL NOT override it with the `getDefaultFillMode()` heuristic result. (This is already the behavior via `??` but must be verified for the `message` field path.)

**Bug B — Spurious `set_variable` Injection for Form-Triggered Workflows**

2.5 WHEN `checkGraphIntegrity()` evaluates a form-triggered workflow THEN the system SHALL only inject a `set_variable` node if the user's prompt explicitly contains intent for variable assignment, data extraction, or storing values — specifically, the prompt must contain at least one of: "store", "save to variable", "assign", "extract field", "set variable", "store in variable", "save the result".

2.6 WHEN `checkGraphIntegrity()` is called multiple times for the same workflow during a single generation run THEN the system SHALL NOT inject duplicate `set_variable` nodes; each integrity check SHALL be idempotent with respect to the current node list.

2.7 WHEN the user's prompt describes a form-triggered conditional workflow with no variable assignment intent THEN the system SHALL generate a graph containing only the nodes demanded by user intent (e.g. `form → if_else → [gmail, slack_message]`) with no injected `set_variable` nodes.

**Bug C — Both Branches Assigned the Same Output Node Type**

2.8 WHEN the Gemini planner system prompt is constructed in `planWorkflowWithGemini()` THEN the system SHALL include an explicit instruction: when the user specifies different actions for different branches (e.g. "send Gmail if true, send Slack if false"), the planner MUST emit distinct node types for each branch, and MUST NOT collapse multiple branch intents into a single repeated type.

2.9 WHEN `hydratePlannedWorkflow()` maps `PlannedWorkflow.steps` to `WorkflowNode[]` for a branching workflow THEN the system SHALL preserve the per-branch node type assignments from the planner output, producing one node of each distinct type as specified.

2.10 WHEN `EdgeReconciliationEngine` wires branch ports from an `if_else` node THEN the system SHALL wire `true` to the node whose type and position match the true-branch intent and `false` to the node whose type and position match the false-branch intent.

**Bug D — Properties Panel Does Not Show `runtime_ai` Banner in Schema-Driven Path**

2.11 WHEN the schema-driven rendering path in `PropertiesPanel.tsx` renders a field whose `effectiveFillMode === 'runtime_ai'` THEN the system SHALL display the "Filled automatically by AI at runtime" banner for that field, identical to the behavior of the legacy rendering path, and SHALL NOT show the toggle + "Not configured" display.

2.12 WHEN a `runtime_ai` field is rendered in the schema-driven path THEN the system SHALL suppress the On/Off toggle and the collapsed "Not configured" preview for that field, replacing them with the runtime AI banner.

**Bug E — Branch Port Wiring for Any Node Type and Branch Count**

2.13 WHEN `EdgeReconciliationEngine` fans out branch ports from any branching node (`if_else` with 2 ports, `switch` with N ports) THEN the system SHALL wire each port to the correct branch-entry node using execution order metadata (branch index or explicit branch assignment), not solely by sequential node position in the flat node list.

2.14 WHEN a branch contains multiple sequential nodes (e.g. `true → [set_variable → gmail]`) THEN the system SHALL wire the branch port to the first node in that branch's execution sequence, and SHALL wire subsequent nodes in the branch linearly from there.

2.15 WHEN both branches of an `if_else` node legitimately use the same output node type (e.g. both `slack_message`) THEN the system SHALL correctly wire each branch port to its own distinct node instance, using execution order or branch metadata to disambiguate.

2.16 WHEN a `switch` node has N cases and N corresponding output nodes THEN the system SHALL wire `case_k` to the node assigned to case k, for all k from 1 to N, regardless of whether the node types are the same or different across cases.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a `slack_message` node has `blocks` field THEN the system SHALL CONTINUE TO classify `blocks` as `manual_static`, as it is complex JSON that requires user configuration.

3.2 WHEN a `slack_message` node has `webhookUrl` field THEN the system SHALL CONTINUE TO classify `webhookUrl` as `manual_static` with `ownership: credential`, requiring user-provided configuration.

3.3 WHEN the user's prompt for a form-triggered workflow explicitly requests variable assignment (e.g. "store the credit score in a variable") THEN the system SHALL CONTINUE TO inject a `set_variable` node and wire it correctly in the graph.

3.4 WHEN a workflow has an `if_else` node and both branches legitimately require the same output node type (e.g. both send a Slack message) THEN the system SHALL CONTINUE TO generate two distinct node instances of that type and wire each branch to its own instance.

3.5 WHEN a workflow is strictly linear with no branching THEN the system SHALL CONTINUE TO generate a linear chain of nodes matching user intent with no spurious injections.

3.6 WHEN a node has `manual_static` fields THEN the system SHALL CONTINUE TO leave those fields at their registry `defaultConfig()` values and SHALL NOT overwrite them with AI-generated values.

3.7 WHEN a node has `runtime_ai` fields THEN the system SHALL CONTINUE TO leave those fields unset at build time, as they are resolved at execution time.

3.8 WHEN `EdgeReconciliationEngine` reconciles a non-branching (linear) workflow THEN the system SHALL CONTINUE TO produce a valid linear edge chain with no duplicate or missing connections.

3.9 WHEN any node schema in `node-library.ts` defines an explicit `fillMode` on a field THEN the system SHALL CONTINUE TO preserve that explicit value in `convertNodeLibrarySchemaToUnified()` without overriding it.

3.10 WHEN the Properties Panel renders a field with `effectiveFillMode === 'buildtime_ai_once'` that has an AI-generated value THEN the system SHALL CONTINUE TO show the toggle ON, the "AI prefilled" badge, and the value in the collapsed preview.

3.11 WHEN `checkGraphIntegrity()` checks for missing `if_else` nodes in a conditional workflow THEN the system SHALL CONTINUE TO inject `if_else` nodes when the prompt contains conditional logic patterns, with no change to that heuristic.

---

## Bug Condition Pseudocode

### Bug A — Slack Field fillMode Misclassification

```pascal
FUNCTION isBugCondition_SlackFillMode(X)
  INPUT: X = { fieldName, schemaExplicitFillMode, registryClassifiedFillMode }
  OUTPUT: boolean

  RETURN X.fieldName IN ['channel', 'text', 'username']
    AND X.schemaExplicitFillMode IS NULL
    AND X.registryClassifiedFillMode ≠ 'buildtime_ai_once'
END FUNCTION

// Property: Fix Checking
FOR ALL X WHERE isBugCondition_SlackFillMode(X) DO
  result ← convertNodeLibrarySchemaToUnified'(slackSchema)
  ASSERT result.inputSchema[X.fieldName].fillMode.default = 'buildtime_ai_once'
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition_SlackFillMode(X) DO
  ASSERT convertNodeLibrarySchemaToUnified(X) = convertNodeLibrarySchemaToUnified'(X)
END FOR
```

### Bug B — Spurious set_variable Injection

```pascal
FUNCTION isBugCondition_SpuriousInjection(X)
  INPUT: X = { trigger, userPrompt, existingStepTypes }
  OUTPUT: boolean

  hasVariableIntent ← X.userPrompt CONTAINS ANY OF
    ['store', 'save to variable', 'assign', 'extract field', 'set variable',
     'store in variable', 'save the result']

  RETURN X.trigger = 'form'
    AND NOT ('set_variable' IN X.existingStepTypes)
    AND NOT hasVariableIntent
END FUNCTION

// Property: Fix Checking
FOR ALL X WHERE isBugCondition_SpuriousInjection(X) DO
  result ← checkGraphIntegrity'(X)
  ASSERT NOT EXISTS node IN result.missingNodes WHERE node.type = 'set_variable'
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition_SpuriousInjection(X) DO
  ASSERT checkGraphIntegrity(X) = checkGraphIntegrity'(X)
END FOR
```

### Bug C — Branch Output Node Type Mismatch

```pascal
FUNCTION isBugCondition_BranchTypeMismatch(X)
  INPUT: X = { userPrompt, trueBranchIntendedType, falseBranchIntendedType, generatedNodes, edges }
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

### Bug D — runtime_ai Banner Missing in Schema-Driven Path

```pascal
FUNCTION isBugCondition_RuntimeAiBannerMissing(X)
  INPUT: X = { fieldEffectiveFillMode, renderingPath, renderedOutput }
  OUTPUT: boolean

  RETURN X.fieldEffectiveFillMode = 'runtime_ai'
    AND X.renderingPath = 'schema_driven'
    AND X.renderedOutput CONTAINS 'Not configured'
    AND X.renderedOutput DOES NOT CONTAIN 'Filled automatically by AI at runtime'
END FUNCTION

// Property: Fix Checking
FOR ALL X WHERE isBugCondition_RuntimeAiBannerMissing(X) DO
  result ← renderField'(X)
  ASSERT result CONTAINS 'Filled automatically by AI at runtime'
  ASSERT result DOES NOT CONTAIN 'Not configured'
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition_RuntimeAiBannerMissing(X) DO
  ASSERT renderField(X) = renderField'(X)
END FOR
```

### Bug E — Branch Port Wiring Correctness

```pascal
FUNCTION isBugCondition_BranchWiringIncorrect(X)
  INPUT: X = { branchingNodeId, branchPorts, intendedPortToNodeMap, actualEdges }
  OUTPUT: boolean

  FOR EACH port IN X.branchPorts DO
    actualTarget ← edge in X.actualEdges WHERE source = X.branchingNodeId AND edgeType = port
    intendedTarget ← X.intendedPortToNodeMap[port]
    IF actualTarget.target ≠ intendedTarget.nodeId THEN
      RETURN true
    END IF
  END FOR
  RETURN false
END FUNCTION

// Property: Fix Checking
FOR ALL X WHERE isBugCondition_BranchWiringIncorrect(X) DO
  result ← reconcileEdges'(X)
  FOR EACH port IN X.branchPorts DO
    actualTarget ← edge in result.edges WHERE source = X.branchingNodeId AND edgeType = port
    ASSERT actualTarget.target = X.intendedPortToNodeMap[port].nodeId
  END FOR
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition_BranchWiringIncorrect(X) DO
  ASSERT reconcileEdges(X) = reconcileEdges'(X)
END FOR
```
