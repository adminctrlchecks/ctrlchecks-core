# Continue Workflow Save Credential Panel Bugfix Design

## Overview

When the user clicks "Continue Building Workflow" on the wizard's "Configuration Required" panel, the current `handleBuild` function in `AutonomousAgentWizard.tsx` calls `attach-credentials` before the workflow has been fully persisted. This causes a 409 conflict because the backend cannot attach credentials to a workflow that does not yet exist in the database.

The fix reorders the button click handler so that:
1. The workflow is saved first via `attach-inputs` (which persists the workflow and returns the phase)
2. After a successful save, credentials are checked against the now-persisted workflow state
3. If credentials are missing, a friendly informational panel is rendered inside the workflow editor listing satisfied and missing credentials, where each missing credential is a clickable link that opens the corresponding node's property panel
4. If all credentials are satisfied, the normal continuation flow proceeds unchanged

The fix is entirely frontend-side in `AutonomousAgentWizard.tsx` and a new `CredentialStatusPanel` component.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — the user clicks "Continue Building Workflow" and `attach-credentials` is called before `attach-inputs` has successfully persisted the workflow
- **Property (P)**: The desired behavior — `attach-inputs` completes successfully before `attach-credentials` is called, and missing credentials are shown in a friendly panel rather than surfaced as an error
- **Preservation**: The existing behavior for all non-buggy inputs — normal flow when credentials are satisfied, node property panel opening, save error surfacing, and `configuring_credentials` phase gating must remain unchanged
- **handleBuild**: The async function in `ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx` that handles the "Continue Building Workflow" button click and orchestrates save → credential check → redirect
- **attach-inputs**: The `POST /api/workflows/:id/attach-inputs` backend endpoint that persists node configuration and returns the workflow phase (e.g. `configuring_credentials`)
- **attach-credentials**: The `POST /api/workflows/:id/attach-credentials` backend endpoint that attaches vault secrets to a persisted workflow; returns 409 if the workflow does not exist
- **configuring_credentials**: The workflow phase returned by `attach-inputs` when the workflow is saved but vault credentials are still missing
- **discoveredCredentials**: The array on `pendingWorkflowData` containing credential objects with `satisfied`, `vaultKey`, `displayName`, `nodeId`, and `required` fields
- **CredentialStatusPanel**: The new React component to be created that renders the friendly credential status panel inside the workflow editor

## Bug Details

### Bug Condition

The bug manifests when the user clicks "Continue Building Workflow" while `pendingWorkflowData` is set and `step === 'configuration'`. The `handleBuild` function attempts to call `attach-credentials` in the same continuation cycle as `attach-inputs`, but the credential check logic runs before the workflow is confirmed as persisted, causing a 409 from the backend.

**Formal Specification:**
```
FUNCTION isBugCondition(event)
  INPUT: event — a button click on "Continue Building Workflow"
  OUTPUT: boolean

  RETURN pendingWorkflowData IS NOT NULL
         AND step === 'configuring_credentials'
         AND attach-credentials IS CALLED
         AND attach-inputs HAS NOT returned 200 yet
END FUNCTION
```

### Examples

- **Example 1 (core bug)**: User completes wizard configuration, clicks "Continue Building Workflow". `attach-inputs` is called, returns `phase: configuring_credentials`. Before the workflow is confirmed persisted, `attach-credentials` is called and returns 409. Expected: `attach-credentials` is only called after `attach-inputs` returns 200.
- **Example 2 (missing credential)**: After saving, `attach-credentials` discovers Slack Webhook URL is missing. Expected: a friendly panel appears listing Google OAuth (satisfied ✓) and Slack Webhook URL (missing, clickable). Actual (buggy): an error toast is shown.
- **Example 3 (all satisfied)**: After saving, all credentials are present. Expected: normal continuation flow proceeds. This case is unaffected by the bug but must be preserved.
- **Edge case**: Save fails (network error or Supabase error). Expected: error is surfaced, credential check is never attempted. This must continue to work after the fix.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- When all credentials are satisfied after saving, the workflow continues normally without showing the credential panel
- Clicking a node in the workflow graph opens its property panel exactly as it does today
- When the workflow save fails, the error is surfaced via toast and the credential check is not attempted
- The `configuring_credentials` phase returned by `attach-inputs` continues to gate workflow execution — the workflow cannot be executed until credentials are resolved
- Mouse clicks on other wizard buttons and navigation are unaffected

**Scope:**
All inputs that do NOT involve clicking "Continue Building Workflow" with missing credentials should be completely unaffected by this fix. This includes:
- Normal workflow saves from `WorkflowBuilder.tsx`
- Node property panel interactions
- OAuth connection flows
- Wizard step navigation (Previous / Next)
- Workflow execution from the builder

## Hypothesized Root Cause

Based on the bug description and code analysis:

1. **Premature credential attachment**: In `handleBuild`, after `attach-inputs` returns `phase: configuring_credentials`, the code checks `shouldAttachCredentialsNow` which evaluates to `true` for this phase. It then checks `credentialSecretsReady` — if secrets are not ready it throws an error toast instead of showing a panel. This is the primary defect.

2. **Error instead of panel**: When `credentialSecretsReady` is false, the current code calls `toast({ variant: 'destructive' })` and throws. The fix should instead set a state flag that renders `CredentialStatusPanel` inline in the editor.

3. **409 on attach-credentials**: If `credentialSecretsReady` happens to be true (e.g. credentials were pre-filled) but the workflow isn't fully committed yet, `attach-credentials` returns 409. The 100ms delay added in the code is a workaround, not a fix. The real fix is to check credentials against the already-returned `attach-inputs` response rather than making a second network call when credentials are missing.

4. **Missing panel component**: There is no `CredentialStatusPanel` component. The friendly panel described in the requirements needs to be built and wired into the wizard's post-save flow.

## Correctness Properties

Property 1: Bug Condition - Save Before Credential Check

_For any_ button click event where `isBugCondition` returns true (i.e. "Continue Building Workflow" is clicked with `pendingWorkflowData` set), the fixed `handleBuild` function SHALL call `attach-inputs` and receive a 200 response before calling `attach-credentials`, ensuring the workflow is persisted before any credential attachment is attempted.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Non-Buggy Input Behavior Unchanged

_For any_ input where the bug condition does NOT hold (all credentials already satisfied, save errors, non-button-click interactions), the fixed code SHALL produce exactly the same behavior as the original code, preserving normal continuation flow, error surfacing, node property panel behavior, and `configuring_credentials` phase gating.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

**File**: `ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx`

**Function**: `handleBuild` (line ~3100)

**Specific Changes**:

1. **Replace destructive toast with panel state**: When `attach-inputs` returns `phase: configuring_credentials` and credentials are missing, instead of throwing a destructive toast, set a new state variable `credentialPanelData` with the credential status information and return early (do not proceed to `attach-credentials`).

2. **Derive credential status from attach-inputs response**: Use the `discoveredCredentials` already present on `pendingWorkflowData` (populated during workflow generation) combined with the phase returned by `attach-inputs` to determine satisfied vs. missing credentials — no additional network call needed for the panel display.

3. **Add state variable**: Add `const [credentialPanelData, setCredentialPanelData] = useState<CredentialPanelData | null>(null)` where `CredentialPanelData` contains `{ workflowId: string; satisfied: CredentialEntry[]; missing: CredentialEntry[] }`.

4. **Render CredentialStatusPanel**: In the wizard's configuration step JSX (around line ~6616), conditionally render `<CredentialStatusPanel>` when `credentialPanelData` is set, replacing the current "Ready to save workflow" panel content.

**File**: `ctrl_checks/src/components/workflow/CredentialStatusPanel.tsx` (new file)

**Component**: `CredentialStatusPanel`

**Specific Changes**:

5. **Create CredentialStatusPanel component**: Renders a non-error informational panel with two sections — satisfied credentials (with checkmark) and missing credentials (each as a clickable button). Clicking a missing credential calls an `onOpenNodePanel(nodeId)` callback prop, which the wizard wires to the existing node property panel open handler.

### Pseudocode for Fixed handleBuild (configuration branch)

```
FUNCTION handleBuild_fixed()
  IF pendingWorkflowData AND step === 'configuration' THEN

    // Step 1: Save workflow (insert to Supabase)
    savedWorkflow := supabase.insert(workflowData)
    IF saveError THEN
      toast(saveError)          // Req 3.3: surface save errors
      RETURN
    END IF

    // Step 2: Attach inputs
    inputsResult := POST /attach-inputs(savedWorkflow.id, combinedInputs)
    IF NOT inputsResult.ok THEN
      toast(inputsResult.error)  // Req 3.3: surface save errors
      RETURN
    END IF

    phase := inputsResult.phase

    // Step 3: Check credential status
    IF phase === 'configuring_credentials' THEN
      // Derive satisfied/missing from discoveredCredentials
      satisfied := discoveredCredentials.filter(c => c.satisfied)
      missing   := discoveredCredentials.filter(c => NOT c.satisfied AND c.required)

      IF missing.length > 0 THEN
        // Req 2.3, 2.4: Show friendly panel, do NOT call attach-credentials
        setCredentialPanelData({ workflowId: savedWorkflow.id, satisfied, missing })
        RETURN
      END IF
    END IF

    // Step 4: All credentials satisfied — attach credentials and proceed normally
    // Req 2.5, 3.1: Normal flow
    credentialsResult := POST /attach-credentials(savedWorkflow.id, credentialsToSend)
    IF NOT credentialsResult.ok THEN
      toast(credentialsResult.error)
      RETURN
    END IF

    // Step 5: Fetch final workflow and redirect (unchanged)
    ...proceed as today...

  END IF
END FUNCTION
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the 409 bug and the destructive toast BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write unit tests that mock `fetch` and `supabase` to simulate the "Continue Building Workflow" click with missing credentials. Run these tests on the UNFIXED `handleBuild` to observe the 409 error path and the destructive toast being thrown instead of a panel being shown.

**Test Cases**:
1. **409 on attach-credentials**: Simulate `attach-inputs` returning `phase: configuring_credentials`, then `attach-credentials` returning 409. Assert that the error is thrown (will fail on fixed code — expected to pass on unfixed code).
2. **Destructive toast instead of panel**: Simulate missing credentials after save. Assert that `toast({ variant: 'destructive' })` is called and no `credentialPanelData` state is set (will fail on fixed code).
3. **attach-credentials called before attach-inputs completes**: Simulate a slow `attach-inputs` response and verify `attach-credentials` is called concurrently (will fail on fixed code).
4. **Edge case — save error**: Simulate Supabase insert failure. Assert `attach-credentials` is never called (should pass on both unfixed and fixed code — verifies preservation).

**Expected Counterexamples**:
- `attach-credentials` is called and returns 409 when workflow isn't persisted
- Possible causes: incorrect phase check ordering, `shouldAttachCredentialsNow` evaluating true too early, missing panel state

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed `handleBuild` produces the expected behavior.

**Pseudocode:**
```
FOR ALL event WHERE isBugCondition(event) DO
  result := handleBuild_fixed(event)
  ASSERT attach-inputs called before attach-credentials
  ASSERT credentialPanelData set with correct satisfied/missing lists
  ASSERT attach-credentials NOT called when missing.length > 0
  ASSERT no destructive toast shown for missing credentials
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL event WHERE NOT isBugCondition(event) DO
  ASSERT handleBuild_original(event) === handleBuild_fixed(event)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (various credential states, phases, workflow sizes)
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for all-satisfied credential scenarios and save-error scenarios, then write property-based tests capturing that behavior.

**Test Cases**:
1. **All credentials satisfied preservation**: Verify that when all credentials are satisfied, `handleBuild` proceeds to redirect exactly as before — no panel shown, `attach-credentials` called normally
2. **Save error preservation**: Verify that when Supabase insert fails, the error toast is shown and no credential check is attempted — identical to unfixed behavior
3. **Node property panel preservation**: Verify that `onOpenNodePanel(nodeId)` in `CredentialStatusPanel` calls the same handler as clicking a node in the graph today
4. **configuring_credentials phase gating preservation**: Verify that a workflow in `configuring_credentials` phase cannot be executed — phase check logic is unchanged

### Unit Tests

- Test `handleBuild` with `attach-inputs` returning `configuring_credentials` and missing credentials → assert `credentialPanelData` is set, `attach-credentials` not called
- Test `handleBuild` with all credentials satisfied → assert normal flow, redirect occurs
- Test `handleBuild` with save error → assert error toast, no credential check
- Test `CredentialStatusPanel` renders satisfied credentials with checkmarks and missing credentials as clickable buttons
- Test clicking a missing credential in `CredentialStatusPanel` calls `onOpenNodePanel` with the correct `nodeId`

### Property-Based Tests

- Generate random `discoveredCredentials` arrays (mix of satisfied/missing) and verify the panel always shows all credentials (satisfied + missing), never omits any entry
- Generate random workflow states and verify that `attach-credentials` is never called when `missing.length > 0` after save
- Generate random non-credential button click events and verify `credentialPanelData` is never set

### Integration Tests

- Full wizard flow: complete configuration, click "Continue Building Workflow" with missing Slack credential → verify panel appears with Google OAuth (satisfied) and Slack Webhook URL (missing, clickable)
- Click missing credential in panel → verify node property panel opens for the correct node
- Full wizard flow with all credentials satisfied → verify redirect to workflow builder occurs without panel
- Verify `configuring_credentials` phase still prevents workflow execution after fix
