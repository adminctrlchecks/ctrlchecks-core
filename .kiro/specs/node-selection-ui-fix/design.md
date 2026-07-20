# Node Selection UI Fix — Bugfix Design

## Overview

This bugfix addresses three interconnected defects in the capability-based node selection flow:

1. **Frontend Auto-Selection Bug**: The `CapabilityStage` component auto-selects nodes in single-candidate containers without user interaction, violating the requirement that all selections must be explicit user actions.

2. **Frontend isComplete Gate Bug**: The Continue button requires all containers to be filled (`selectedCount === totalCount`) rather than allowing the user to proceed with at least one selection (`selectedCount >= 1`).

3. **Backend Over-Generation Bug**: The intent analyzer generates additional use-case units inferred from data flow metadata (e.g., "Zoom Video", "Amazon SES") that the user never mentioned in their prompt, causing irrelevant nodes and duplicate containers to appear in the UI.

The fix strategy is minimal and targeted: remove auto-selection logic from frontend state initialization, change the isComplete condition to require at least one selection, and add explicit scope constraints to the intent analyzer's system prompt to prevent over-generation from inferred data flows.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — when single-candidate containers are auto-selected, or when isComplete blocks Continue despite valid selections, or when units are generated from inferred data flows rather than explicit user intent
- **Property (P)**: The desired behavior — no auto-selection, Continue enabled with at least one selection, units generated only from explicit user intent
- **Preservation**: Existing correct behaviors that must remain unchanged — explicit user selections, toggle-off, onComplete callback, LLM grouping for valid units
- **CapabilityStage**: The React component in `ctrl_checks/src/components/workflow/CapabilityStage.tsx` that renders the node selection UI
- **NodeSelectionMap**: A map from `containerId` to selected `nodeType` representing the user's explicit selections
- **Use_Case_Unit**: A discrete task unit produced by the intent analyzer, representing one step in the workflow
- **CapabilityContainer**: A UI container grouping semantically equivalent candidate nodes for a single use-case unit
- **Intent Analyzer**: The LLM-based stage in `worker/src/services/ai/stages/capability-intent-analyzer.ts` that parses user prompts into use-case units
- **Capability Grouper**: The LLM-based stage in `worker/src/services/ai/stages/capability-grouper-stage.ts` that maps use-case units to candidate nodes

## Bug Details

### Bug Condition

The bug manifests in three distinct but related scenarios:

**Bug A — Frontend Auto-Selection**: When a `CapabilityContainer` has exactly one candidate node, the `CapabilityStage` component auto-selects that node in the `useState` initializer and in the `useEffect` hook without any user interaction. This violates Requirement 2.7 of the capability-node-selection-flow spec, which mandates that all selections must be explicit user actions.

**Bug B — Frontend isComplete Gate**: When the user has selected at least one node but has not selected a node in every container, the Continue button remains disabled because `isComplete` evaluates to `selectedCount === totalCount`. This violates Requirement 3.4, which states that the user must be able to proceed with at least one selection.

**Bug C — Backend Over-Generation**: When the user submits a workflow prompt, the intent analyzer generates additional use-case units inferred from `dataFlows.dataDescription` destinations (e.g., "Zoom Video", "Amazon SES") that the user never mentioned. This causes the capability grouper to create containers for those units, resulting in irrelevant nodes appearing in the selection UI and duplicate containers showing the same node multiple times.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type WorkflowInteraction
  OUTPUT: boolean
  
  RETURN (
    input.hasAutoSelectedSingleCandidateContainer = true
    OR input.isCompleteRequiresAllContainers = true
    OR input.unitsContainInferredDataFlowDestinations = true
  )
END FUNCTION
```

### Examples

**Bug A Example**:
- User navigates to the node selection UI
- One container has exactly one candidate: `google_gmail`
- **Expected**: The container shows `google_gmail` as an unselected option
- **Actual**: The container shows `google_gmail` as pre-selected without user interaction

**Bug B Example**:
- User has 3 containers: Gmail, Slack, Sheets
- User explicitly selects Gmail
- **Expected**: Continue button is enabled (at least one selection made)
- **Actual**: Continue button remains disabled (requires all 3 containers to be filled)

**Bug C Example**:
- User prompt: "When I receive an email, send a summary to Gmail and Slack"
- **Expected**: Intent analyzer produces 3 units: trigger (email), communication (Gmail), communication (Slack)
- **Actual**: Intent analyzer produces 5+ units: trigger (email), communication (Gmail), communication (Slack), communication (Zoom Video), communication (Amazon SES) — the last two were inferred from data flow metadata, not user intent

**Edge Case — Preservation**:
- User explicitly clicks a candidate node
- **Expected**: Node is selected and highlighted
- **Actual**: Node is selected and highlighted (this behavior is correct and must be preserved)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Explicit user selections must continue to work — clicking a candidate node selects it
- Toggle-off must continue to work — clicking an already-selected node deselects it
- Replacing selections must continue to work — clicking a different candidate in a container replaces the prior selection
- onComplete callback must continue to fire with the correct NodeSelectionMap when Continue is clicked
- onBack callback must continue to fire without modifying selection state when Go Back is clicked
- LLM grouping for valid use-case units must continue to produce containers with semantically equivalent candidate nodes
- Registry validation must continue to discard invalid node types and log warnings

**Scope:**
All inputs that do NOT involve auto-selection, isComplete gating, or over-generation should be completely unaffected by this fix. This includes:
- Explicit user click interactions on candidate nodes
- Toggle-off behavior when clicking an already-selected node
- Navigation actions (Go Back, Continue with valid selections)
- LLM-based grouping of valid use-case units into containers
- Registry validation of candidate node types

## Hypothesized Root Cause

Based on the bug description and source code analysis, the root causes are:

1. **Auto-Selection Root Cause**: The `CapabilityStage` component's `useState` initializer and `useEffect` hook contain logic that checks `container.candidates.length === 1` and automatically adds that candidate to the `selections` map. This was likely intended as a convenience feature but violates the explicit-selection requirement.

2. **isComplete Gate Root Cause**: The `isComplete` condition is defined as `totalCount > 0 && selectedCount === totalCount`, which requires all containers to be filled. This was likely intended to ensure completeness but violates the requirement that users should be able to proceed with partial selections (at least one).

3. **Over-Generation Root Cause**: The intent analyzer's system prompt instructs the LLM to create separate output units for each branch case in conditional workflows, but it does not explicitly constrain the LLM to generate units only from the user's explicit intent. The LLM is inferring additional units from data flow descriptions (e.g., "Zoom Video", "Amazon SES") that appear in the node catalog metadata but were never mentioned by the user.

4. **Grouper Permissiveness Root Cause**: The capability grouper's system prompt does not explicitly prevent the LLM from including candidates that are tangentially related or semantically distant from the use-case unit's description. This allows the grouper to add nodes that could theoretically be used in a different context but are not relevant to the user's stated intent.

## Correctness Properties

Property 1: Bug Condition — No Auto-Selection

_For any_ set of containers rendered in the CapabilityStage component, the initial `selections` state SHALL be an empty object `{}`, and the `useEffect` hook SHALL preserve only previously-made user selections that are still valid (candidate still present in the container), without auto-selecting any node in containers where the user has not yet made a selection.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition — Correct isComplete Gate

_For any_ set of containers rendered in the CapabilityStage component, the `isComplete` condition SHALL evaluate to `true` if and only if `Object.keys(selections).length >= 1`, enabling the Continue button when at least one selection has been made regardless of how many other containers remain unselected.

**Validates: Requirements 2.3**

Property 3: Bug Condition — No Over-Generation from Inferred Data Flows

_For any_ user prompt submitted to the intent analyzer, the analyzer SHALL produce use-case units that correspond only to tasks the user explicitly described in their prompt, and SHALL NOT infer or generate additional units from data flow descriptions, destination metadata, or other implicit sources not present in the user's stated intent.

**Validates: Requirements 2.4, 2.5**

Property 4: Preservation — Explicit Selection Works

_For any_ candidate node in a container, clicking that node SHALL select it and set `selections[containerId] = nodeType`, producing exactly the same behavior as the original code for explicit user interactions.

**Validates: Requirements 3.1, 3.3**

Property 5: Preservation — Toggle Off Works

_For any_ container with a selected node, clicking the same node again SHALL deselect it and remove `containerId` from `selections`, producing exactly the same behavior as the original code.

**Validates: Requirements 3.2**

Property 6: Preservation — LLM Grouping Works

_For any_ valid use-case unit produced by the intent analyzer, the capability grouper SHALL call the LLM to identify semantically equivalent candidate nodes from the Node_Catalog, and SHALL discard invalid node types with warnings, producing exactly the same behavior as the original code for valid units.

**Validates: Requirements 3.7, 3.8**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `ctrl_checks/src/components/workflow/CapabilityStage.tsx`

**Function**: `CapabilityStage` component

**Specific Changes**:

1. **Remove Auto-Selection from useState Initializer** (lines 169-177):
   - Change the `useState` initializer from:
     ```typescript
     const [selections, setSelections] = useState<NodeSelectionMap>(() => {
       const initial: NodeSelectionMap = {};
       for (const container of containers) {
         if (container.candidates.length === 1) {
           initial[container.containerId] = container.candidates[0].nodeType;
         }
       }
       return initial;
     });
     ```
   - To:
     ```typescript
     const [selections, setSelections] = useState<NodeSelectionMap>({});
     ```

2. **Remove Auto-Selection from useEffect** (lines 180-193):
   - Change the `useEffect` logic from:
     ```typescript
     useEffect(() => {
       setSelections((prev) => {
         const next: NodeSelectionMap = {};
         for (const container of containers) {
           const current = prev[container.containerId];
           if (current && container.candidates.some((candidate) => candidate.nodeType === current)) {
             next[container.containerId] = current;
           } else if (container.candidates.length === 1) {
             next[container.containerId] = container.candidates[0].nodeType;
           }
         }
         return next;
       });
     }, [containers]);
     ```
   - To:
     ```typescript
     useEffect(() => {
       setSelections((prev) => {
         const next: NodeSelectionMap = {};
         for (const container of containers) {
           const current = prev[container.containerId];
           if (current && container.candidates.some((candidate) => candidate.nodeType === current)) {
             next[container.containerId] = current;
           }
         }
         return next;
       });
     }, [containers]);
     ```

3. **Change isComplete Condition** (line 205):
   - Change from:
     ```typescript
     const isComplete = totalCount > 0 && selectedCount === totalCount;
     ```
   - To:
     ```typescript
     const isComplete = totalCount > 0 && selectedCount >= 1;
     ```

**File**: `worker/src/services/ai/stages/capability-intent-analyzer.ts`

**Function**: `buildSystemPrompt`

**Specific Changes**:

4. **Add Strict Scope Rule to System Prompt** (after line 60, in the RULES section):
   - Add a new rule after the existing branching workflow rule:
     ```
     STRICT SCOPE RULE — EXPLICIT USER INTENT ONLY:
     You MUST generate use-case units ONLY for tasks the user EXPLICITLY described in their prompt.
     You MUST NOT infer additional units from:
     - Data flow descriptions in the node catalog
     - Destination metadata (e.g., "Zoom Video", "Amazon SES", "SMTP")
     - Implicit sources or tangentially related services
     - Theoretical alternatives the user did not mention
     
     Example — User says "send via Gmail":
     CORRECT: Create ONE unit for Gmail
     WRONG: Create units for Gmail, Outlook, Amazon SES, SMTP (user only mentioned Gmail)
     
     Example — User says "if shipped send email, if processing send Slack":
     CORRECT: Create units for email and Slack (2 units)
     WRONG: Create units for email, Slack, Zoom, SMS, webhook (user only mentioned email and Slack)
     ```

5. **Add Deduplication Rule to System Prompt** (after the strict scope rule):
   - Add:
     ```
     DEDUPLICATION RULE:
     If two branch cases would produce the same type of output (e.g., both send an email), they may share the same use-case unit type but must have distinct labels.
     Do NOT create separate units for the same service unless the user explicitly named multiple instances.
     
     Example — User says "if condition A send Gmail, if condition B send Gmail":
     CORRECT: Create ONE Gmail unit with label "Send Gmail notification" (shared by both branches)
     WRONG: Create two separate Gmail units (unnecessary duplication)
     ```

**File**: `worker/src/services/ai/stages/capability-grouper-stage.ts`

**Function**: `buildSystemPrompt`

**Specific Changes**:

6. **Add Semantic Relevance Constraint to System Prompt** (after line 30, in the RULES section):
   - Add a new rule:
     ```
     SEMANTIC RELEVANCE RULE:
     Only include candidates that directly fulfill the use-case unit as described.
     Do NOT include nodes that are:
     - Tangentially related to the use-case
     - Theoretically usable in a different context
     - Semantically distant from the unit's description
     
     Example — Use-case: "Send email notification via Gmail"
     CORRECT: Include google_gmail, outlook (both send email)
     WRONG: Include zoom_video, slack_webhook (not email services)
     ```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that render the `CapabilityStage` component with various container configurations and assert that no auto-selection occurs, that isComplete evaluates correctly, and that the intent analyzer produces only explicitly-mentioned units. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Auto-Selection Test**: Render CapabilityStage with one container having exactly one candidate (will fail on unfixed code — node will be pre-selected)
2. **isComplete Gate Test**: Render CapabilityStage with 3 containers, select 1 node, assert Continue is enabled (will fail on unfixed code — Continue will be disabled)
3. **Over-Generation Test**: Submit prompt "send to Gmail and Slack" to intent analyzer, assert exactly 3 units returned (trigger + Gmail + Slack) (will fail on unfixed code — additional units like Zoom, Amazon SES will be generated)
4. **Edge Case Test**: Render CapabilityStage with containers prop changing, assert prior user selections are preserved but no new auto-selections occur (may fail on unfixed code)

**Expected Counterexamples**:
- Single-candidate containers will have pre-selected nodes in the initial state
- Continue button will be disabled despite having at least one selection
- Intent analyzer will return more units than the user explicitly mentioned
- Possible causes: auto-selection logic in useState/useEffect, incorrect isComplete condition, missing scope constraints in system prompt

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := runCapabilityStage_fixed(input)
  ASSERT result.initialSelections = {}
  ASSERT result.continueEnabled = (result.selectedCount >= 1)
  ASSERT result.units = parseExplicitIntentOnly(input.userPrompt)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed functions produce the same result as the original functions.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT CapabilityStage_original(input) = CapabilityStage_fixed(input)
  ASSERT IntentAnalyzer_original(input) = IntentAnalyzer_fixed(input)
  // Explicit user selections still work
  // Toggle-off still works
  // onComplete still fires with correct NodeSelectionMap
  // LLM grouping for valid units still produces containers
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for explicit user interactions (clicking nodes, toggling off, navigation), then write property-based tests capturing that behavior.

**Test Cases**:
1. **Explicit Selection Preservation**: Observe that clicking a candidate node selects it on unfixed code, then write test to verify this continues after fix
2. **Toggle-Off Preservation**: Observe that clicking an already-selected node deselects it on unfixed code, then write test to verify this continues after fix
3. **onComplete Preservation**: Observe that clicking Continue with valid selections calls onComplete with correct NodeSelectionMap on unfixed code, then write test to verify this continues after fix
4. **LLM Grouping Preservation**: Observe that valid use-case units produce containers with semantically equivalent candidates on unfixed code, then write test to verify this continues after fix

### Unit Tests

- Test CapabilityStage component with various container configurations (0, 1, 3, 10 containers)
- Test CapabilityStage with single-candidate containers (no auto-selection)
- Test CapabilityStage with multi-candidate containers (explicit selection required)
- Test isComplete condition with 0, 1, partial, and full selections
- Test intent analyzer with prompts that explicitly name 1, 2, 3+ destinations
- Test intent analyzer with prompts that describe conditional routing
- Test capability grouper with valid and invalid use-case units

### Property-Based Tests

- Generate random container configurations and verify no auto-selection occurs
- Generate random selection states and verify isComplete evaluates correctly (true if selectedCount >= 1, false otherwise)
- Generate random user prompts with explicit destination names and verify intent analyzer produces exactly N units for N destinations
- Generate random use-case units and verify capability grouper produces containers only for those units

### Integration Tests

- Test full flow: user prompt → intent analyzer → capability grouper → CapabilityStage UI
- Test that irrelevant nodes (Zoom, Amazon SES) do not appear when user only mentions Gmail and Slack
- Test that duplicate containers do not appear for the same node
- Test that user can select at least one node and proceed with Continue
- Test that user can navigate back without losing selection state
