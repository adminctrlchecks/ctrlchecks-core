# Bugfix Requirements Document

## Introduction

Three related UX bugs in the workflow builder system that together degrade the experience of AI-generated workflows: (1) switch/if node case edges connect to the wrong downstream nodes due to positional fallback overriding semantic intent; (2) a redundant "Credentials" wizard step duplicates credential fields already shown inline, confusing users; (3) AI ownership (`runtime_ai`) fill modes set in the wizard are never persisted to `node.data.config._fillMode`, so the PropertiesPanel always shows fields as unconfigured instead of showing the AI runtime banner.

---

## Bug Analysis

### Current Behavior (Defect)

**Bug 1 — Switch/If Node Edges Not Connecting Per User Intent**

1.1 WHEN the AI generates a workflow with a switch or if_else node and `caseNodeMapping` contains `targetNodeId` or `targetNodeType` entries THEN the system assigns case edges using a positional fallback over unassigned downstream nodes rather than the semantically matched node, causing case_1 to wire to whichever node appears first in the array regardless of intent

1.2 WHEN `wireSwitchCaseEdges()` resolves a case target by type but multiple nodes share the same type THEN the system picks the first type-match in array order rather than the node whose ID matches `targetNodeId`, producing incorrect wiring for duplicate-type scenarios

1.3 WHEN `reconcileEdges()` Step 4 (branching fanout) runs after `wireSwitchCaseEdges()` has already wired correct case edges THEN the system overwrites those edges with positionally-assigned ones because Step 4 does not detect that a port-labeled edge already exists for that case slot

**Bug 2 — Credentials Panel Must Be Completely Removed**

2.1 WHEN a user completes the field-ownership step in the AutonomousAgentWizard and `credentialQuestionsForStep.length > 0` THEN the system routes to a separate `'credentials'` wizard step that re-displays the same credential fields (e.g. "Slack Webhook URL") the user already answered inline

2.2 WHEN the `'credentials'` step is rendered THEN the system shows a Card with a "Credentials" header, KeyRound icon, and credential input fields that duplicate what was already collected, creating a confusing two-step credential entry flow

**Bug 3 — AI Ownership Toggle Not Reflected in PropertiesPanel**

3.1 WHEN the wizard assigns `runtime_ai` fill mode to a field via `fillModeValues` state (key `mode_<nodeId>_<fieldName>`) THEN the system never writes those values back to `node.data.config._fillMode` before saving, so `_fillMode` remains empty or undefined

3.2 WHEN `PropertiesPanel.renderField()` calls `resolveEffectiveFieldFillMode()` for a field that the wizard set to `runtime_ai` THEN the system falls back to `'manual_static'` because `config._fillMode` is empty, hiding the "Filled automatically by AI at runtime" banner and showing "Not configured" instead

3.3 WHEN the `attach-inputs` API call is made at wizard completion with `mode_<nodeId>_<fieldName>` keys THEN the system does not apply those keys to `node.data.config._fillMode` either on the backend response or locally before calling `setNodes()`, so the canvas node state never reflects the wizard's ownership decisions

---

### Expected Behavior (Correct)

**Bug 1 — Switch/If Node Edges**

2.1 WHEN `caseNodeMapping` contains a `targetNodeId` for a case value THEN the system SHALL wire that case edge to the node whose `id` exactly matches `targetNodeId`, regardless of node array position

2.2 WHEN `caseNodeMapping` contains a `targetNodeType` but no `targetNodeId` and multiple nodes share that type THEN the system SHALL prefer the node whose type matches and has not yet been assigned, and SHALL NOT fall back to positional order until all type-matched candidates are exhausted

2.3 WHEN `reconcileEdges()` Step 4 evaluates outgoing ports for a branching node THEN the system SHALL detect that a port-labeled edge (matching `e.type === portName || e.sourceHandle === portName`) already exists and SHALL skip creating a new edge for that port, preserving the semantically-wired edges from `wireSwitchCaseEdges()`

**Bug 2 — Credentials Panel Removal**

2.4 WHEN `proceedFromOwnershipStage()` is called and `credentialQuestionsForStep.length > 0` THEN the system SHALL route directly to `setStep('configuration')` instead of `setStep('credentials')`

2.5 WHEN the wizard renders its step sequence THEN the system SHALL NOT render the `'credentials'` step Card, its "Credentials" header, KeyRound icon, or any credential input fields in that step — credential fields SHALL only appear inline within the field-ownership questions

**Bug 3 — AI Ownership Toggle Persistence**

2.6 WHEN the wizard completes and navigates to the workflow canvas THEN the system SHALL apply all `fillModeValues` entries (keys matching `mode_<nodeId>_<fieldName>`) to each corresponding node's `node.data.config._fillMode` map before calling `setNodes()`

2.7 WHEN `PropertiesPanel.renderField()` evaluates a field for a node where the wizard set `runtime_ai` ownership THEN the system SHALL read a non-empty `config._fillMode[fieldName] === 'runtime_ai'` and SHALL display the toggle in the ON state with the "Filled automatically by AI at runtime" banner

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a switch node has cases and all `targetNodeId` values are correctly set in `caseNodeMapping` THEN the system SHALL CONTINUE TO wire each case edge to its designated target node without disruption from the reconciliation engine

3.2 WHEN a workflow contains no switch or if_else nodes THEN the system SHALL CONTINUE TO reconcile edges using the existing linear and output-node wiring logic without any change in behavior

3.3 WHEN a user answers credential questions inline during the field-ownership step THEN the system SHALL CONTINUE TO collect and store those credential values as it does today — only the redundant second step is removed

3.4 WHEN the wizard step sequence renders steps other than `'credentials'` (e.g. `'ownership'`, `'configuration'`, `'review'`) THEN the system SHALL CONTINUE TO render those steps exactly as before

3.5 WHEN a field has `manual_static` fill mode set explicitly in `config._fillMode` THEN the system SHALL CONTINUE TO show that field as a standard editable input in PropertiesPanel without the AI runtime banner

3.6 WHEN the `attach-inputs` API processes non-`mode_` keys (regular field values) THEN the system SHALL CONTINUE TO write those values to node config as before, with no change to that existing behavior

3.7 WHEN `resolveEffectiveFieldFillMode()` is called for a field with no explicit `_fillMode` entry and no schema default THEN the system SHALL CONTINUE TO return `'manual_static'` as the fallback

---

## Bug Condition Pseudocode

### Bug 1 — Switch Case Edge Wiring

```pascal
FUNCTION isBugCondition_SwitchEdge(X)
  INPUT: X = { caseNodeMapping, workflowNodes, existingEdges }
  OUTPUT: boolean

  RETURN (
    EXISTS caseEntry IN X.caseNodeMapping WHERE
      caseEntry.targetNodeId IS SET
      AND workflowNodes CONTAINS node WHERE node.id = caseEntry.targetNodeId
      AND assignedEdge FOR caseEntry POINTS TO node WHERE node.id ≠ caseEntry.targetNodeId
  ) OR (
    EXISTS branchPort IN switch.outgoingPorts WHERE
      portLabeledEdge EXISTS in workingEdges for that port
      AND Step4 creates a NEW edge for that same port overwriting it
  )
END FUNCTION

// Property: Fix Checking
FOR ALL X WHERE isBugCondition_SwitchEdge(X) DO
  result ← wireSwitchCaseEdges'(X) followed by reconcileEdges'(X)
  ASSERT FOR EACH caseEntry: edge.target = caseEntry.targetNodeId (when set)
  ASSERT FOR EACH port: exactly one edge exists per port after reconciliation
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition_SwitchEdge(X) DO
  ASSERT wireSwitchCaseEdges(X) = wireSwitchCaseEdges'(X)
END FOR
```

### Bug 2 — Credentials Step Routing

```pascal
FUNCTION isBugCondition_CredentialsStep(X)
  INPUT: X = { credentialQuestionsForStep, currentStep }
  OUTPUT: boolean

  RETURN credentialQuestionsForStep.length > 0
    AND proceedFromOwnershipStage() routes to 'credentials'
END FUNCTION

// Property: Fix Checking
FOR ALL X WHERE isBugCondition_CredentialsStep(X) DO
  result ← proceedFromOwnershipStage'(X)
  ASSERT result.nextStep = 'configuration'
  ASSERT 'credentials' step Card is NOT rendered
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition_CredentialsStep(X) DO
  ASSERT proceedFromOwnershipStage(X) = proceedFromOwnershipStage'(X)
END FOR
```

### Bug 3 — Fill Mode Persistence

```pascal
FUNCTION isBugCondition_FillMode(X)
  INPUT: X = { fillModeValues, nodeId, fieldName }
  OUTPUT: boolean

  RETURN fillModeValues[`mode_${nodeId}_${fieldName}`] = 'runtime_ai'
    AND node.data.config._fillMode[fieldName] IS undefined OR ≠ 'runtime_ai'
END FUNCTION

// Property: Fix Checking
FOR ALL X WHERE isBugCondition_FillMode(X) DO
  result ← applyFillModes'(X)
  ASSERT result.node.data.config._fillMode[fieldName] = 'runtime_ai'
  ASSERT PropertiesPanel.renderField'(result.node, fieldName) shows AI runtime banner
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition_FillMode(X) DO
  ASSERT node.data.config._fillMode behavior is unchanged
END FOR
```
