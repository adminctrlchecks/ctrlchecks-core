# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Implicit set_variable Injection
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate all five injection paths fire on non-variable-intent prompts
  - **Scoped PBT Approach**: Scope the property to the five concrete failing cases below for reproducibility
  - Test 1a — Extract keyword path (paths 3 & 5): invoke the generation pipeline with prompt "Extract email and name from Google Sheets and create a contact in HubSpot"; assert `set_variable` node is present in output (confirms `needsDataExtraction` + system prompt keyword mapping)
  - Test 1b — needsDataExtraction enforcement path (path 2): construct a `detectedRequirements` object with `needsDataExtraction: true` and no explicit variable intent; call the enforcement block directly; assert `set_variable` is unshifted into steps
  - Test 1c — Intent-failure fallback path (path 1): pass a prompt that produces `intent.actions = []` and `intent.trigger = undefined` to `buildStructure`; assert the returned workflow contains a `set_variable` node (not an error)
  - Test 1d — inferStepType fallback path (path 4): call `inferStepType` with step description "xyzzy operation" (matches no node in library); assert return value is `'set_variable'`
  - Test 1e — Prompt signal path (path 5): construct a prompt context where `needsDataExtraction` is true; assert the generated system prompt string contains "SET_VARIABLE NODE REQUIRED"
  - Run all tests on UNFIXED code
  - **EXPECTED OUTCOME**: All five assertions PASS (each one proves a distinct injection path fires)
  - Document counterexamples found (e.g., "prompt 'Extract email…' produces workflow with set_variable node via needsDataExtraction flag")
  - Mark task complete when tests are written, run, and all five failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Explicit set_variable and DAG Validity
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on UNFIXED code: prompt "Set a variable called userEmail to the value from the webhook body" → workflow contains `set_variable` node
  - Observe on UNFIXED code: prompt "If the form score is above 80 send a Slack message, otherwise send an email" → workflow contains `if_else` node, no `set_variable`
  - Observe on UNFIXED code: prompt "For each row in Google Sheets create a contact in HubSpot" → workflow contains `loop` node, no `set_variable`
  - Observe on UNFIXED code: any non-empty workflow → `unifiedGraphOrchestrator.validateWorkflow()` returns `valid: true`
  - Write property-based test P2a: for all prompts containing at least one of ["set variable", "store in a variable", "assign to", "save to variable"], the generated workflow contains a `set_variable` node (from Preservation Requirements in design — requirement 3.1)
  - Write property-based test P2b: for any non-empty workflow produced by the pipeline, `unifiedGraphOrchestrator.validateWorkflow(workflow)` returns `{ valid: true }` with zero structural errors (from Preservation Requirements — requirements 2.6, 3.4)
  - Write example test P2c: prompt with conditional phrasing produces `if_else` node and no `set_variable` (requirement 3.2)
  - Write example test P2d: prompt with loop phrasing produces `loop` node and no `set_variable` (requirement 3.3)
  - Run all preservation tests on UNFIXED code
  - **EXPECTED OUTCOME**: All preservation tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix: Remove all five set_variable hardcoded injection points

  - [x] 3.1 workflow-structure-builder.ts — Replace intent-failure fallback with IntentParsingError (~line 934)
    - Locate the block that returns `manual_trigger → set_variable` when `!intent.actions || intent.actions.length === 0` and `!hasValidTrigger`
    - Delete the entire hardcoded skeleton return statement
    - Throw a typed `IntentParsingError` (or return `{ error: 'INTENT_UNCLEAR', message: 'Could not determine workflow intent — please clarify your request' }`) so the caller can surface a clarification prompt to the user
    - Ensure the caller in `workflow-builder.ts` handles the error/result and does NOT silently swallow it
    - _Bug_Condition: isBugCondition(prompt, workflow) where intent.actions = [] AND !hasValidTrigger → workflow contains set_variable_
    - _Expected_Behavior: caller receives IntentParsingError; no set_variable node is emitted; user sees clarification request_
    - _Preservation: explicit variable-assignment prompts still reach the normal generation path and produce set_variable_
    - _Requirements: 2.2, 1.2_

  - [x] 3.2 workflow-builder.ts Change A — Remove needsDataExtraction enforcement block (~line 5513)
    - Locate the `if (detectedRequirements.needsDataExtraction)` block that calls `simplifiedStructure.steps.unshift(setVariableStep)`
    - Delete the entire block (the `needsDataExtraction` flag may remain for diagnostics but must no longer drive node injection)
    - Verify no other caller relies on the unshift side-effect
    - _Bug_Condition: isBugCondition(prompt, workflow) where detectedRequirements.needsDataExtraction = true AND !explicitVariableIntent(prompt) → set_variable unshifted into steps_
    - _Expected_Behavior: steps list is built solely from AI-parsed intent; no set_variable injected by enforcement block_
    - _Preservation: prompts with explicit variable intent still produce set_variable via the AI parsing path_
    - _Requirements: 2.4, 1.4_

  - [x] 3.3 workflow-builder.ts Change B — Fix system prompt keyword mapping (~line 4592)
    - Locate the system prompt line: `User says "extract", "get specific fields", "parse", "separate" → add set_variable or json_parser`
    - Remove that line entirely
    - Replace with the explicit variable-assignment-only rule: `User says "set variable", "store in a variable", "assign to" → add set_variable`
    - Verify the surrounding prompt context still correctly guides the AI for other node types
    - _Bug_Condition: isBugCondition(prompt, workflow) where prompt contains "extract"/"parse"/"get specific fields" → AI instructed to add set_variable_
    - _Expected_Behavior: AI only adds set_variable when prompt contains explicit variable-assignment phrasing_
    - _Preservation: prompts with "set variable" / "assign to" still instruct AI to add set_variable_
    - _Requirements: 2.3, 1.3_

  - [x] 3.4 workflow-builder.ts Change C — Remove SET_VARIABLE NODE REQUIRED prompt signal (~line 4532)
    - Locate the conditional template line: `${detectedRequirements.needsDataExtraction ? '- ✅ SET_VARIABLE NODE REQUIRED ...' : ''}`
    - Delete this line from the prompt output template
    - Verify the `needsHttpRequest`, `needsConditional`, `needsLoop` signals remain intact (they correctly reflect explicit user intent and must not be removed)
    - _Bug_Condition: isBugCondition(prompt, workflow) where needsDataExtraction = true → prompt output contains "SET_VARIABLE NODE REQUIRED" reinforcing AI to add node_
    - _Expected_Behavior: prompt output contains no set_variable signal unless explicitVariableIntent(prompt) is true_
    - _Preservation: needsConditional and needsLoop signals still appear in prompt output for relevant prompts_
    - _Requirements: 2.3, 1.3_

  - [x] 3.5 workflow-builder.ts Change D — Fix inferStepType to return null instead of 'set_variable' (~line 7022)
    - Locate the final fallback in `inferStepType`: `return fallbackSchema ? 'set_variable' : ...`
    - Replace with:
      ```typescript
      console.warn(`[inferStepType] No match found for step: "${originalStep.substring(0, 80)}" — skipping`);
      return null;
      ```
    - Update all callers of `inferStepType` to handle a `null` return by skipping the step (filtering out nulls before building the node list)
    - Ensure no caller treats `null` as a valid node type or inserts it into the workflow
    - _Bug_Condition: isBugCondition(prompt, workflow) where step description matches no node library entry → inferStepType returns 'set_variable'_
    - _Expected_Behavior: inferStepType returns null; caller skips the step; console.warn is emitted_
    - _Preservation: steps that DO match a node library entry continue to return the correct node type_
    - _Requirements: 2.5, 1.5_

  - [x] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - No Implicit set_variable Injection
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - Re-run test 1a: "Extract email and name…" prompt → assert workflow does NOT contain `set_variable`
    - Re-run test 1b: `needsDataExtraction: true` enforcement block → assert `set_variable` is NOT unshifted
    - Re-run test 1c: empty intent → assert `IntentParsingError` is thrown (not a skeleton workflow)
    - Re-run test 1d: `inferStepType("xyzzy operation")` → assert return value is `null` (not `'set_variable'`)
    - Re-run test 1e: `needsDataExtraction: true` prompt context → assert system prompt does NOT contain "SET_VARIABLE NODE REQUIRED"
    - **EXPECTED OUTCOME**: All five assertions PASS (confirms all injection paths are inert)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Explicit set_variable and DAG Validity
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Re-run P2a: explicit variable-assignment prompts still produce `set_variable` node
    - Re-run P2b: all non-empty workflows pass `unifiedGraphOrchestrator.validateWorkflow()` with zero structural errors
    - Re-run P2c: conditional prompts still produce `if_else` node, no `set_variable`
    - Re-run P2d: loop prompts still produce `loop` node, no `set_variable`
    - **EXPECTED OUTCOME**: All preservation tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix

- [x] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite covering the five injection paths and all preservation cases
  - Confirm zero `set_variable` nodes appear in workflows generated from non-variable-intent prompts
  - Confirm `unifiedGraphOrchestrator.validateWorkflow()` returns `valid: true` for all generated workflows
  - Confirm `IntentParsingError` is surfaced to callers when intent parsing fails
  - Confirm `inferStepType` emits `console.warn` and returns `null` for unrecognized steps
  - Ask the user if any questions arise before closing the spec
