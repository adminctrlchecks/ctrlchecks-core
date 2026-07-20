# Bugfix Requirements Document

## Introduction

The backend capability-node-selection pipeline produces wrong node suggestions when a user describes a conditional workflow. For the prompt "Create an autonomous workflow where a user submits details through a form including age. If age > 18, mark the user as eligible and send a confirmation email via Gmail. If age ≤ 18, mark as not eligible and send a notification message via Slack.", the UI shows **Workday** instead of the correct nodes (`form`, `if_else`, `gmail`, `slack`).

The pipeline has five distinct defects, all in the active `POST /api/capability-selection/analyze` path (`intent-stage.ts` + `capability-selection-stage.ts`). Each defect either corrupts the structured intent before node selection begins, or causes the node-scoring fallback to select semantically irrelevant nodes. The combined effect is that the user sees a completely wrong set of integration options.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the LLM response from the intent stage is wrapped in markdown code fences (` ```json ... ``` `), THEN the system fails to parse the JSON even after calling `stripMarkdownFences()`, logs `ai_pipeline_stage_error: INVALID_LLM_RESPONSE`, and falls back to `buildDeterministicIntent()`.

1.2 WHEN `buildDeterministicIntent()` is invoked as the intent-stage fallback, THEN the system splits the raw user prompt on commas and semicolons, producing a single oversized action phrase such as "Create an autonomous workflow where a user submits details through a form including age" instead of discrete actions like "check age condition", "send Gmail", and "send Slack".

1.3 WHEN the capability-selection stage receives the oversized action phrases from the deterministic intent fallback, THEN the system fails to decode the LLM's structured response (`ai_pipeline_stage_retry: STRUCTURED_DECODE_FAILED`), retries once, fails again (`ai_pipeline_stage_fallback: INVALID_AI_RESPONSE`), and falls back to `buildDeterministicStepsFromIntent()`.

1.4 WHEN `buildDeterministicStepsFromIntent()` processes an action phrase that contains conditional language (e.g., "if age > 18"), THEN the system does not recognize the conditional pattern and does not emit an `if_else` step, so no conditional logic node is ever included in the output.

1.5 WHEN `scoreDefinitionForStep()` scores registry nodes against a broad, undifferentiated action phrase, THEN the system assigns high scores to nodes with generic keywords (e.g., Workday, which matches tokens like "data", "api", "integration") and selects them over the correct domain-specific nodes (Gmail, Slack).

1.6 WHEN `reconcileDestinationCoverage()` runs after node selection, THEN the system infers additional destination nodes from `intent.dataFlows[].to`, `intent.dataFlows[].dataDescription`, and regex patterns on the intent text, adding containers for nodes the user never mentioned (e.g., Workday, Zoom Video, Amazon SES).

---

### Expected Behavior (Correct)

2.1 WHEN the LLM response from the intent stage is wrapped in markdown code fences, THEN the system SHALL successfully strip the fences and parse the JSON, returning a valid `StructuredIntent` without falling back to `buildDeterministicIntent()`.

2.2 WHEN `buildDeterministicIntent()` must be used as a last-resort fallback, THEN the system SHALL detect conditional keywords (e.g., "if", "else", "when", "≤", ">") in the prompt and split the prompt into discrete action phrases that preserve the conditional structure, rather than treating the entire prompt as a single action.

2.3 WHEN the capability-selection stage receives a `StructuredIntent` with discrete actions including a conditional action, THEN the system SHALL successfully decode the LLM's structured response and return a valid list of `CapabilityOptionStep` objects without falling back to `buildDeterministicStepsFromIntent()`.

2.4 WHEN `buildDeterministicStepsFromIntent()` processes an action phrase that contains conditional language (e.g., "if age > 18", "check condition", "route based on"), THEN the system SHALL emit an `if_else` step with `intentClass: 'logic'` for that action.

2.5 WHEN `scoreDefinitionForStep()` scores registry nodes against a step, THEN the system SHALL apply a specificity penalty to nodes whose keyword matches are generic (matching common words like "data", "api", "integration" that appear in many unrelated nodes), so that domain-specific nodes (Gmail, Slack) score higher than generic enterprise nodes (Workday) for communication-intent steps.

2.6 WHEN `reconcileDestinationCoverage()` runs after node selection, THEN the system SHALL only add a destination-coverage step for a node if that node's name or a clear synonym appears explicitly in the user's original prompt text; it SHALL NOT infer destination nodes from `dataFlows` metadata or regex patterns on the intent string alone.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the LLM returns a clean, unfenced JSON response from the intent stage, THEN the system SHALL CONTINUE TO parse it successfully and return a valid `StructuredIntent` on the first attempt.

3.2 WHEN the intent stage succeeds (LLM or fallback), THEN the system SHALL CONTINUE TO pass the resulting `StructuredIntent` to `runCapabilitySelectionStage()` unchanged.

3.3 WHEN the capability-selection stage LLM returns a valid structured response, THEN the system SHALL CONTINUE TO parse and use it without invoking `buildDeterministicStepsFromIntent()`.

3.4 WHEN a user prompt explicitly names a destination service (e.g., "send to Gmail", "notify via Slack"), THEN the system SHALL CONTINUE TO produce a capability step for that service.

3.5 WHEN `validateRegistryBackedSteps()` processes a list of steps, THEN the system SHALL CONTINUE TO discard any candidate node type that does not exist in the `unifiedNodeRegistry` and replace it with the best registry-backed match.

3.6 WHEN `ensureTriggerStep()` finds no trigger step in the AI-produced list, THEN the system SHALL CONTINUE TO prepend the correct trigger step derived from `intent.triggerType`.

3.7 WHEN the analyze endpoint returns containers, THEN the system SHALL CONTINUE TO deduplicate containers that share the same single candidate node type, keeping only the first occurrence.

3.8 WHEN a user prompt describes a linear workflow with no conditional logic, THEN the system SHALL CONTINUE TO produce a linear sequence of capability steps with no `if_else` or `switch` step.

3.9 WHEN `reconcileDestinationCoverage()` identifies a destination node that is genuinely missing from the AI-selected steps AND the node is explicitly named in the prompt, THEN the system SHALL CONTINUE TO add a coverage step for that node.

---

## Bug Condition Pseudocode

### Bug Condition Function

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type CapabilityPipelineInput
  OUTPUT: boolean

  // Returns true when any of the five pipeline defects are triggered:
  // (a) Intent parse failure: LLM response has markdown fences that survive stripping
  // (b) Deterministic intent fallback: produces oversized, undifferentiated action phrases
  // (c) Deterministic steps fallback: conditional language in action phrase is not recognized
  // (d) Scoring too broad: generic-keyword nodes outscore domain-specific nodes
  // (e) Reconciliation over-generation: destination nodes added from inferred dataFlows

  RETURN (
    X.llmIntentResponse.hasMarkdownFences = true AND X.parsedIntent = null
    OR X.intentFallbackUsed = true AND X.actions.containsConditionalLanguage = true AND X.actions.length < 3
    OR X.capabilityFallbackUsed = true AND X.conditionalActionPhrase != null AND X.steps.hasIfElse = false
    OR X.selectedNode.isGenericEnterpriseNode = true AND X.stepIntentClass = 'communication'
    OR X.reconciliationAddedNode = true AND X.nodeNameNotInUserPrompt = true
  )
END FUNCTION
```

### Fix Checking Property

```pascal
// Property: Fix Checking — Correct nodes selected for conditional form workflow
FOR ALL X WHERE isBugCondition(X) DO
  result ← runCapabilitySelectionPipeline'(X)
  ASSERT result.steps.some(s => s.intentClass = 'trigger' AND s.candidateNodeTypes.includes('form'))
  ASSERT result.steps.some(s => s.intentClass = 'logic' AND s.candidateNodeTypes.includes('if_else'))
  ASSERT result.steps.some(s => s.intentClass = 'communication' AND s.candidateNodeTypes.includes('gmail'))
  ASSERT result.steps.some(s => s.intentClass = 'communication' AND s.candidateNodeTypes.includes('slack'))
  ASSERT NOT result.steps.some(s => s.candidateNodeTypes.includes('workday'))
  ASSERT NOT result.steps.some(s => s.candidateNodeTypes.includes('zoom_video'))
  ASSERT NOT result.steps.some(s => s.candidateNodeTypes.includes('amazon_ses'))
END FOR
```

### Preservation Checking Property

```pascal
// Property: Preservation Checking — Existing correct behavior unchanged
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
  // Clean LLM responses still parse on first attempt
  // Linear workflows still produce linear step lists
  // Explicitly named destinations still get coverage steps
  // Registry validation still filters unregistered node types
  // Trigger step injection still fires when AI omits a trigger
END FOR
```
