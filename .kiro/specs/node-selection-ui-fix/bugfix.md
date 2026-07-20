# Bugfix Requirements Document

## Introduction

The node selection UI ("Choose your integrations") has multiple broken behaviors that violate the `capability-node-selection-flow` spec requirements. Specifically: nodes are auto-selected without user interaction (violating Req 2.7), the Continue button requires all containers to be filled rather than just one (violating Req 3.4), and the intent analyzer over-generates use-case units from inferred data flows rather than the user's explicit intent — causing irrelevant nodes (e.g., Zoom Video, Amazon SES for a Gmail+Slack workflow) and duplicate containers to appear in the UI.

These bugs collectively prevent users from exercising meaningful control over their integration choices and produce a confusing, cluttered selection screen.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a `CapabilityContainer` has exactly one candidate node, THEN the system auto-selects that node in the `useState` initializer without any user interaction.

1.2 WHEN the `containers` prop changes, THEN the system's `useEffect` auto-selects nodes in any container that has exactly one candidate, overriding the user's intent to start with no selections.

1.3 WHEN the user has selected at least one node but has not selected a node in every container, THEN the system keeps the Continue button disabled because `isComplete` evaluates to `selectedCount === totalCount` (requiring all containers to be filled).

1.4 WHEN the user submits a workflow prompt that describes conditional routing (e.g., "if condition A send Gmail, else send Slack"), THEN the intent analyzer generates additional use-case units inferred from `dataFlows.dataDescription` destinations (e.g., Zoom Video, Amazon SES) that the user never mentioned in their prompt.

1.5 WHEN the intent analyzer over-generates units from inferred data flows, THEN the capability grouper creates containers for those units, causing irrelevant nodes to appear in the node selection UI.

1.6 WHEN multiple over-generated units resolve to the same underlying node (e.g., Amazon SES appearing in both "Send result to Email" and "Send result to Amazon SES" containers), THEN the system displays duplicate containers showing the same node more than once.

---

### Expected Behavior (Correct)

2.1 WHEN a `CapabilityContainer` has exactly one candidate node, THEN the system SHALL render that candidate as an unselected option, deferring all selection to the user.

2.2 WHEN the `containers` prop changes, THEN the system SHALL preserve only previously-made user selections that are still valid (candidate still present in the container); it SHALL NOT auto-select any node in containers where the user has not yet made a selection.

2.3 WHEN the user has selected at least one node across any container, THEN the system SHALL enable the Continue button regardless of how many other containers remain unselected.

2.4 WHEN the user submits a workflow prompt, THEN the intent analyzer SHALL produce use-case units that correspond only to tasks the user explicitly described; it SHALL NOT infer or generate additional units from data flow descriptions, destination metadata, or other implicit sources not present in the user's stated intent.

2.5 WHEN the intent analyzer produces use-case units strictly from the user's explicit intent, THEN the capability grouper SHALL create containers only for those units, ensuring no irrelevant nodes appear in the selection UI.

2.6 WHEN the capability grouper produces containers, THEN each unique use-case unit SHALL map to at most one container, and no two containers SHALL present the same node as their primary candidate for the same semantic purpose.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the user explicitly clicks a candidate node in a container, THEN the system SHALL CONTINUE TO select that node and highlight it as the active selection for that container.

3.2 WHEN the user clicks an already-selected node in a container, THEN the system SHALL CONTINUE TO deselect it (toggle off), leaving that container with no selection.

3.3 WHEN the user clicks a different candidate in a container that already has a selection, THEN the system SHALL CONTINUE TO replace the prior selection with the newly clicked candidate.

3.4 WHEN the user clicks Continue with at least one selection made, THEN the system SHALL CONTINUE TO call `onComplete` with the current `NodeSelectionMap` containing only the user's explicit selections.

3.5 WHEN the user clicks Go Back, THEN the system SHALL CONTINUE TO call `onBack` without modifying the current selection state.

3.6 WHEN the user submits a workflow prompt that explicitly names specific output destinations (e.g., "send to Gmail" and "send to Slack"), THEN the intent analyzer SHALL CONTINUE TO generate one use-case unit per explicitly named destination.

3.7 WHEN the capability grouper processes a valid use-case unit, THEN it SHALL CONTINUE TO call the LLM to identify semantically equivalent candidate nodes from the Node_Catalog for that unit.

3.8 WHEN the LLM returns a candidate node type that does not exist in the Unified_Node_Registry, THEN the grouper SHALL CONTINUE TO discard that identifier and log a warning without failing the flow.

3.9 WHEN a container has multiple valid candidates after registry validation, THEN the system SHALL CONTINUE TO display all candidates as selectable options with no pre-selection.

---

## Bug Condition Pseudocode

### Bug Condition Function

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type WorkflowInteraction
  OUTPUT: boolean

  // Returns true when any of the following defects are present:
  // (a) Auto-selection: a container with one candidate was pre-selected without user action
  // (b) isComplete gate: Continue is blocked despite at least one selection existing
  // (c) Over-generation: units were produced from inferred data flows, not user intent
  RETURN (
    X.hasAutoSelectedSingleCandidateContainer = true
    OR X.isCompleteRequiresAllContainers = true
    OR X.unitsContainInferredDataFlowDestinations = true
  )
END FUNCTION
```

### Fix Checking Property

```pascal
// Property: Fix Checking — No Auto-Selection, Correct isComplete, No Over-Generation
FOR ALL X WHERE isBugCondition(X) DO
  result ← runCapabilityStage'(X)
  ASSERT result.initialSelections = {}                          // no pre-selections
  ASSERT result.continueEnabled = (result.selectedCount >= 1)  // at least one, not all
  ASSERT result.units = parseExplicitIntentOnly(X.userPrompt)  // no inferred units
END FOR
```

### Preservation Checking Property

```pascal
// Property: Preservation Checking — Existing Correct Behavior Unchanged
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
  // Explicit user selections still work
  // Toggle-off still works
  // onComplete still fires with correct NodeSelectionMap
  // LLM grouping for valid units still produces containers
END FOR
```
