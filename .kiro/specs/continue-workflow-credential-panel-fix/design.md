# Continue to Workflow Button – Credential Panel Bugfix Design

## Overview

The "Continue to Workflow" button is missing or unreachable in the credential panel rendered by `AutonomousAgentWizard` (`ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx`). The panel enters the `configuration` step (step `WizardStep = 'configuration'`) and renders a "Configuration Required" card. Inside that card, the step-by-step question flow only renders a "Continue Building" button when `allQuestions.length === 0`. When credential or input questions exist, no continue button is rendered at the bottom of the question sequence, leaving the user stuck. Additionally, when no credentials are present at all, the button is absent because the empty-state path does not render it unconditionally.

The fix is a targeted change to the JSX rendering logic inside the `configuration` step card: ensure the "Continue to Workflow" button is always rendered — either as the sole actionable element (no credentials) or below the credential/input question list (credentials present).

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — the `configuration` step renders without a "Continue to Workflow" button, leaving the user unable to proceed.
- **Property (P)**: The desired behavior — the "Continue to Workflow" button is always present and actionable in the credential panel, regardless of credential state.
- **Preservation**: Existing credential input handling, configuration message display, and `handleBuild()` invocation behavior that must remain unchanged by the fix.
- **AutonomousAgentWizard**: The component in `ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx` that owns the multi-step workflow creation wizard, including the `configuration` step.
- **configuration step**: The `WizardStep` value `'configuration'` — rendered when `pendingWorkflowData` is available and `configurationPhaseUnlocked` is true. Shows the "Configuration Required" card.
- **credentialQuestionsForStep**: The filtered list of credential questions shown in the `configuration` step, derived from `credentialQuestionsStrictForStep` after applying include/hide overrides.
- **manualConfigurationQuestions**: The subset of `allQuestions` that require manual user input (non-AI-owned, non-locked fields shown in the step-by-step question flow).
- **handleBuild()**: The async function invoked when the user clicks "Continue to Workflow" — saves the workflow, attaches inputs and credentials, then navigates to `/workflow/:id`.

## Bug Details

### Bug Condition

The bug manifests when the wizard reaches the `configuration` step. The JSX for this step renders a step-by-step question flow (`manualConfigurationQuestions`) and a credential section (`credentialQuestionsForStep`). The "Continue Building" button at the bottom of the question flow is only rendered when `allQuestions.length === 0` (the fallback empty-state path). When questions exist, the button is absent. When no credentials are present at all, the empty-state path also does not render a continue button unconditionally.

**Formal Specification:**
```
FUNCTION isBugCondition(renderState)
  INPUT: renderState — the React render state of AutonomousAgentWizard
  OUTPUT: boolean

  RETURN renderState.step === 'configuration'
         AND renderState.pendingWorkflowData IS NOT NULL
         AND renderState.configurationPhaseUnlocked === true
         AND (
               (renderState.manualConfigurationQuestions.length > 0
                AND NO "Continue to Workflow" button is rendered after the last question)
             OR
               (renderState.manualConfigurationQuestions.length === 0
                AND renderState.credentialQuestionsForStep.length === 0
                AND NO "Continue to Workflow" button is rendered)
             )
END FUNCTION
```

### Examples

- **No credentials, no questions**: User reaches `configuration` step with an empty workflow that needs no credentials. The card shows "Configuration Required" but no button — user is stuck.
- **Credentials present, questions answered**: User fills in all credential fields in the step-by-step flow. After the last question, there is no "Continue to Workflow" button to proceed.
- **Credentials present, no questions (all AI-owned)**: All fields are AI-owned so `manualConfigurationQuestions` is empty, but `credentialQuestionsForStep` has entries. The fallback "Continue Building" button is gated behind `allQuestions.length === 0` which is false — button is absent.
- **Edge case — single credential**: One credential question exists. User fills it in. No button appears after the input field.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Clicking "Continue to Workflow" must still invoke `handleBuild()` with the same validation logic (required inputs filled, required credentials filled).
- The "Configuration Required" card title and description text must continue to display.
- Individual credential input fields (`Input`, `Textarea`, `Select`) and their `onChange` handlers must remain unchanged.
- The step-by-step question progress indicator (dots) and per-question rendering must remain unchanged.
- The `proceedFromOwnershipStage` → `setStep('configuration')` transition must remain unchanged.
- Navigation to `/workflow/:id` after successful `handleBuild()` must remain unchanged.

**Scope:**
All inputs that do NOT involve the `configuration` step rendering should be completely unaffected. This includes:
- The `field-ownership` step rendering.
- The `credentials` step rendering (legacy path, not the primary path).
- The `configure` step rendering (the separate `step === 'configure'` path).
- The `building`, `complete`, and `workflow-confirmation` step renderings.

## Hypothesized Root Cause

Based on reading the JSX in `AutonomousAgentWizard.tsx`:

1. **Button gated behind empty-state condition**: The "Continue Building" button inside the `configuration` step is wrapped in `{allQuestions.length === 0 && (...)}`. When questions exist, this condition is false and the button is never rendered. The button should be rendered unconditionally at the bottom of the card, outside this condition.

2. **Missing button in the question-answered state**: The step-by-step question flow renders one question at a time (`currentQuestionIndex < manualConfigurationQuestions.length`). After the last question is answered and `currentQuestionIndex` advances past the end, there is no "all done" state that renders a continue button.

3. **No unconditional footer button**: The `configuration` step card's `CardContent` has no unconditional footer button. Every button path is conditional on some state, meaning certain combinations of state leave the user with no actionable element.

4. **Credential-only state gap**: When `manualConfigurationQuestions.length === 0` but `credentialQuestionsForStep.length > 0`, the credential section renders but the continue button is absent because `allQuestions.length` is not zero (credential questions are in `allQuestions`).

## Correctness Properties

Property 1: Bug Condition - Continue to Workflow Button Always Present

_For any_ render of the `configuration` step where `pendingWorkflowData` is non-null and `configurationPhaseUnlocked` is true, the fixed component SHALL render a "Continue to Workflow" button that is visible and actionable, regardless of whether `manualConfigurationQuestions` is empty or non-empty, and regardless of whether `credentialQuestionsForStep` is empty or non-empty.

**Validates: Requirements 2.1, 2.4**

Property 2: Preservation - Credential Input and Build Behavior Unchanged

_For any_ render state where the bug condition does NOT hold (i.e., the button was already present before the fix, or the step is not `configuration`), the fixed component SHALL produce the same rendered output and the same `handleBuild()` invocation behavior as the original component, preserving all credential input handling, configuration message display, and workflow navigation.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

**File**: `ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx`

**Step**: `configuration` step JSX block (condition: `step === 'configuration' && pendingWorkflowData && pendingWorkflowData.nodes?.length > 0 && configurationPhaseUnlocked`)

**Specific Changes**:

1. **Move the continue button outside the `allQuestions.length === 0` guard**: The current button is inside `{allQuestions.length === 0 && (<div className="flex gap-3 pt-4">...Continue Building...</div>)}`. Remove this guard and place an unconditional "Continue to Workflow" button at the bottom of the `CardContent`, after all conditional sections.

2. **Add unconditional footer button**: At the bottom of the `CardContent` for the `configuration` step, add:
   ```tsx
   {/* Continue to Workflow — always visible */}
   <div className="flex gap-3 pt-4 border-t border-border/60">
     <Button
       onClick={async () => { await handleBuild(); }}
       className="flex-1 bg-indigo-600 hover:bg-indigo-500"
     >
       Continue to Workflow <ArrowRight className="ml-2 h-4 w-4" />
     </Button>
   </div>
   ```

3. **Layout order for credentials-present state**: When `credentialQuestionsForStep.length > 0`, the credential section renders first (already correct), and the unconditional footer button renders below it (achieved by placing the button at the end of `CardContent`).

4. **Layout order for no-credentials state**: When both `manualConfigurationQuestions` and `credentialQuestionsForStep` are empty, the unconditional footer button is the sole actionable element (achieved by the same placement — it renders regardless of the other sections).

5. **Remove or repurpose the old gated button**: The existing `{allQuestions.length === 0 && (...Continue Building...)}` block should be removed to avoid duplicate buttons. The unconditional footer button replaces it.

### No State or Prop Changes Required

The fix is purely a JSX rendering change. No new state, no new props, no new hooks. The `handleBuild()` function already handles all credential states correctly — it validates required inputs, attaches credentials, and navigates to the workflow. The fix only ensures the button that calls `handleBuild()` is always rendered.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the missing button on unfixed code, then verify the fix renders the button correctly and preserves all existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the missing button BEFORE implementing the fix. Confirm the root cause (button gated behind `allQuestions.length === 0`).

**Test Plan**: Render `AutonomousAgentWizard` (or extract the `configuration` step JSX into a testable sub-component) with `step = 'configuration'`, `configurationPhaseUnlocked = true`, and varying `allQuestions` / `credentialQuestionsForStep` values. Assert that a "Continue to Workflow" button is present in the rendered output. Run on UNFIXED code to observe failures.

**Test Cases**:
1. **No credentials, no questions**: `allQuestions = []`, `credentialQuestionsForStep = []` — button should be present (will fail on unfixed code).
2. **Credentials present, questions exist**: `allQuestions = [credQ1]`, `credentialQuestionsForStep = [credQ1]` — button should be present after the credential section (will fail on unfixed code).
3. **Questions answered, past last question**: `currentQuestionIndex >= manualConfigurationQuestions.length` — button should be present (will fail on unfixed code).
4. **All AI-owned, credential questions only**: `manualConfigurationQuestions = []`, `credentialQuestionsForStep = [credQ1]` — button should be present (will fail on unfixed code).

**Expected Counterexamples**:
- No "Continue to Workflow" button found in rendered output when `allQuestions.length > 0`.
- Root cause confirmed: button is inside `{allQuestions.length === 0 && (...)}` guard.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed component renders the "Continue to Workflow" button.

**Pseudocode:**
```
FOR ALL renderState WHERE isBugCondition(renderState) DO
  rendered := render(AutonomousAgentWizard_fixed, renderState)
  ASSERT "Continue to Workflow" button IS present in rendered
  ASSERT button.onClick invokes handleBuild()
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed component produces the same rendered output as the original component.

**Pseudocode:**
```
FOR ALL renderState WHERE NOT isBugCondition(renderState) DO
  ASSERT render(original, renderState) = render(fixed, renderState)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many credential state combinations automatically.
- It catches edge cases (e.g., mixed satisfied/unsatisfied credentials) that manual tests miss.
- It provides strong guarantees that the credential input handlers and `handleBuild()` invocation are unchanged.

**Test Plan**: Observe behavior on UNFIXED code for non-`configuration` steps and for the `configuration` step when the button was already present, then write property-based tests capturing that behavior.

**Test Cases**:
1. **handleBuild invocation preservation**: Verify clicking the button still calls `handleBuild()` with the same validation (required fields check, credential check).
2. **Configuration message preservation**: Verify "Configuration Required" card title and description still render alongside the button.
3. **Credential input preservation**: Verify `onChange` handlers on credential `Input` fields still update `credentialValues` state correctly.
4. **Other steps unaffected**: Verify `field-ownership`, `configure`, `building`, and `complete` step renderings are identical before and after the fix.

### Unit Tests

- Test that the `configuration` step renders a "Continue to Workflow" button when `allQuestions = []`.
- Test that the `configuration` step renders a "Continue to Workflow" button when `allQuestions = [credQ1, credQ2]`.
- Test that clicking the button invokes `handleBuild()`.
- Test that credential input fields still render and update state correctly after the fix.

### Property-Based Tests

- Generate random arrays of `credentialQuestionsForStep` (0 to N entries) and assert the button is always present in the rendered output.
- Generate random `manualConfigurationQuestions` arrays and assert the button is always present regardless of question count.
- Generate random credential value maps and assert `handleBuild()` receives the same values as before the fix.

### Integration Tests

- Full wizard flow: prompt → field-ownership → configuration (with credentials) → click "Continue to Workflow" → verify navigation to `/workflow/:id`.
- Full wizard flow: prompt → field-ownership → configuration (no credentials) → click "Continue to Workflow" → verify navigation to `/workflow/:id`.
- Verify the "Configuration Required" message and credential inputs are still visible alongside the button after the fix.
