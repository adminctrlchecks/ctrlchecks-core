# Implementation Plan

- [x] 1. Write bug condition exploration tests
  - **Property 1: Bug Condition** - Switch Case Edge Wiring, Credentials Routing, Fill Mode Persistence
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms each bug exists
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode expected behavior — they will validate the fix when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate each bug exists

  - 1a. In `worker/src/services/ai/__tests__/switch-case-edge-wiring.test.ts` — construct a switch workflow where `caseNodeMapping` has stale `targetNodeId` values (IDs that don't match materialized nodes). Call `unifiedGraphOrchestrator.initializeWorkflow()` with the switch context. Assert that edge targets DO NOT match the intended nodes (this PASSES on unfixed code, confirming the bug).
    - Scope: switch node + 2 downstream nodes of same type, `targetNodeId` set to plan-time IDs that differ from materialized IDs
    - Assert: `edge.target !== caseNodeMapping[caseValue].targetNodeId` for at least one case
    - Run on UNFIXED code — expect PASS (confirms bug: wrong node is wired)
    - Document counterexample: e.g. `case_1` wires to first node in array instead of semantically intended node
    - _Requirements: 1.1, 1.2, 1.3_

  - 1b. In `ctrl_checks/src/__tests__/wizard-credentials-routing.test.ts` — mock `credentialQuestionsForStep` with one entry, call `proceedFromOwnershipStage()`, assert `step === 'credentials'` (confirms the bug exists on unfixed code).
    - Scope: wizard state with `credentialQuestionsForStep.length = 1`
    - Assert: `step === 'credentials'` after calling `proceedFromOwnershipStage()`
    - Run on UNFIXED code — expect PASS (confirms bug: wrong step routing)
    - Document counterexample: `proceedFromOwnershipStage()` routes to `'credentials'` instead of `'configuration'`
    - _Requirements: 2.1, 2.2_

  - 1c. In `ctrl_checks/src/__tests__/wizard-fill-mode-persistence.test.ts` — simulate wizard completion with `fillModeValues = { "mode_node1_subject": "runtime_ai" }`, capture nodes passed to `setNodes()`, assert `_fillMode` is absent (confirms the bug exists on unfixed code).
    - Scope: wizard completion path after `attach-inputs` API response, `fillModeValues` has one `runtime_ai` entry
    - Assert: `node.data.config._fillMode?.subject` is `undefined` or absent
    - Run on UNFIXED code — expect PASS (confirms bug: fill mode not persisted)
    - Document counterexample: `node1.data.config._fillMode` is `{}` or `undefined` after `setNodes()`
    - _Requirements: 3.1, 3.2, 3.3_

  - **EXPECTED OUTCOME**: All three tests PASS on unfixed code (this is correct — it proves each bug exists)
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 3.2, 3.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Switch Workflows, Non-AI Fill Mode, Non-Credentials Wizard Steps
  - **IMPORTANT**: Follow observation-first methodology — run UNFIXED code with non-buggy inputs first
  - **GOAL**: Capture baseline behavior that must not regress after the fix

  - 2a. In `worker/src/services/ai/__tests__/switch-case-edge-wiring.test.ts` — generate random workflows without switch/if_else nodes, call `reconcileEdges()`, observe and record the edge set. Write property-based test asserting the same edge set is produced after the `validateEdges()` guard change.
    - Observe: `reconcileEdges()` on linear workflows produces deterministic edge set on unfixed code
    - Write property: for all workflows where `isBugCondition_SwitchEdge(X)` is false, `reconcileEdges()` output is identical
    - Verify test PASSES on UNFIXED code
    - _Requirements: 3.1, 3.2_

  - 2b. In `ctrl_checks/src/__tests__/wizard-fill-mode-persistence.test.ts` — verify fields with `manual_static` fill mode in `fillModeValues` produce nodes where `_fillMode[field] === 'manual_static'` (or absent) after `applyFillModesToNodes()`.
    - Observe: nodes with no `mode_` key or `manual_static` value are unaffected
    - Write property: for all `fillModeValues` where no entry is `runtime_ai`, `applyFillModesToNodes()` leaves `_fillMode` as `manual_static` or absent
    - Verify test PASSES on UNFIXED code (helper doesn't exist yet — test the contract)
    - _Requirements: 3.5, 3.6, 3.7_

  - 2c. In `ctrl_checks/src/__tests__/wizard-credentials-routing.test.ts` — verify all wizard steps other than `'credentials'` (`'ownership'`, `'configuration'`, `'review'`, `'building'`, `'complete'`) render and behave identically when `credentialQuestionsForStep` is empty.
    - Observe: `proceedFromOwnershipStage()` with no credential questions already routes to `'configuration'`
    - Write property: for all wizard states where `credentialQuestionsForStep.length === 0`, step routing is unchanged
    - Verify test PASSES on UNFIXED code
    - _Requirements: 3.3, 3.4_

  - **EXPECTED OUTCOME**: All preservation tests PASS on unfixed code (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Fix Bug 1A: Secondary type+position lookup in wireSwitchCaseEdges()

  - [x] 3.1 Implement secondary type+position lookup in `wireSwitchCaseEdges()`
    - File: `worker/src/core/orchestration/unified-graph-orchestrator.ts`
    - In `wireSwitchCaseEdges()`, after the exact-ID lookup (step 1) fails and before the pure type-based lookup (step 2), add an index-aware secondary lookup using the case index `i` to find the node at position `i` in `downstreamNodes` whose type matches `targetNodeType`
    - Add between step (1) and step (2): `if (!targetNode && targetNodeType) { const candidateByPosition = downstreamNodes[index]; if (candidateByPosition && !assignedNodeIds.has(candidateByPosition.id) && this.getNodeType(candidateByPosition) === targetNodeType) { targetNode = candidateByPosition; } }`
    - _Bug_Condition: isBugCondition_SwitchEdge(X) where targetNodeId is stale (plan-time vs materialized ID mismatch)_
    - _Expected_Behavior: edge.target === caseNodeMapping[caseValue].targetNodeId (or best type+position match when ID absent)_
    - _Preservation: workflows without switch/if_else nodes must produce identical reconcileEdges() output_
    - _Requirements: 2.1, 2.2_

- [x] 4. Fix Bug 1B: Guard branch edges in validateEdges()

  - [x] 4.1 Exempt port-labeled branch edges from execution-order violation removal in `validateEdges()`
    - File: `worker/src/core/orchestration/edge-reconciliation-engine.ts`
    - In `validateEdges()`, in the `sourceIdx >= targetIdx` violation block, before pushing to `edgesToRemove`, add a guard that exempts edges whose `type` or `sourceHandle` matches `'true'`, `'false'`, or `/^case_\d+$/` from a node where `unifiedNodeRegistry.get(nodeType)?.isBranching === true`
    - Add guard: `const edgeLabel = String(edge.type || edge.sourceHandle || ''); const isBranchPortEdge = edgeLabel === 'true' || edgeLabel === 'false' || /^case_\d+$/.test(edgeLabel); const sourceNodeForGuard = workflow.nodes.find(n => n.id === edge.source); const sourceIsBranching = sourceNodeForGuard ? unifiedNodeRegistry.get(this.getNodeType(sourceNodeForGuard))?.isBranching === true : false; if (isBranchPortEdge && sourceIsBranching) { continue; }`
    - _Bug_Condition: isBugCondition_SwitchEdge(X) where Step 4 overwrites pre-wired case edges after validateEdges() strips them_
    - _Expected_Behavior: exactly one edge per branch port after reconciliation, no Step 4 overwrite_
    - _Preservation: non-branching edges continue to be removed when they violate execution order_
    - _Requirements: 2.3_

- [x] 5. Fix Bug 2: Remove credentials step routing and render

  - [x] 5.1 Remove credentials routing block from `proceedFromOwnershipStage()`
    - File: `ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx`
    - Remove the block: `if (credentialQuestionsForStep.length > 0 || oauthRequirementCandidatesList.length > 0) { setCredentialQuestionIndex(0); setStep('credentials'); return; }`
    - The `setCurrentQuestionIndex(0); setStep('configuration');` lines already present below become the unconditional path
    - _Bug_Condition: isBugCondition_CredentialsStep(X) where credentialQuestionsForStep.length > 0_
    - _Expected_Behavior: proceedFromOwnershipStage() always routes to 'configuration'_
    - _Preservation: wizard steps other than 'credentials' render and behave identically_
    - _Requirements: 2.4_

  - [x] 5.2 Remove the `step === 'credentials'` JSX render block
    - File: `ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx`
    - Remove the Card block rendered when `step === 'credentials'` (the Card with KeyRound icon, "Credentials" title, and credential input fields)
    - _Bug_Condition: isBugCondition_CredentialsStep(X) — credentials Card is rendered_
    - _Expected_Behavior: 'credentials' step Card is NOT rendered in any wizard state_
    - _Preservation: credential values collected inline during ownership step continue to be stored and submitted_
    - _Requirements: 2.5_

- [x] 6. Fix Bug 3: Apply fillModeValues before setNodes()

  - [x] 6.1 Add `applyFillModesToNodes` pure helper function
    - File: `ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx`
    - Add as a module-level pure function (before the component): maps `fillModeValues` keys matching `mode_<nodeId>_<fieldName>` onto each node's `node.data.config._fillMode`
    - Implementation: iterate nodes, for each node collect keys with prefix `mode_${node.id}_`, build `fillModeMap`, merge into `node.data.config._fillMode` via spread
    - _Bug_Condition: isBugCondition_FillMode(X) where fillModeValues has runtime_ai entries_
    - _Expected_Behavior: node.data.config._fillMode[fieldName] === fillModeValues[`mode_${nodeId}_${fieldName}`] for all matching keys_
    - _Preservation: nodes with no matching mode_ key are returned unchanged_
    - _Requirements: 2.6_

  - [x] 6.2 Apply `applyFillModesToNodes` at the primary `setNodes()` call site (after `attach-inputs` API response)
    - File: `ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx`
    - Replace `setNodes(normalized.nodes as any[])` with `setNodes(applyFillModesToNodes(normalized.nodes as any[], fillModeValues))`
    - _Requirements: 2.6, 2.7_

  - [x] 6.3 Apply `applyFillModesToNodes` at the `fieldOwnershipMap` synthesis `setNodes()` call site
    - File: `ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx`
    - Replace the second `setNodes(normalized.nodes as any[])` call (in the `fieldOwnershipMap` synthesis path) with `setNodes(applyFillModesToNodes(normalized.nodes as any[], fillModeValues))`
    - _Requirements: 2.6, 2.7_

- [x] 7. Verify bug condition exploration tests now pass (fix checking)

  - [x] 7.1 Verify Bug 1 fix: re-run switch case edge wiring exploration test
    - **Property 1: Expected Behavior** - Switch Case Edges Wire to Semantically Correct Targets
    - **IMPORTANT**: Re-run the SAME test from task 1a — do NOT write a new test
    - After fix, assert edge targets DO match `targetNodeId` values from `caseNodeMapping` (or best type+position match)
    - Assert: exactly one edge per case port after reconciliation, no Step 4 overwrite
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 1 is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 7.2 Verify Bug 2 fix: re-run credentials routing exploration test
    - **Property 1: Expected Behavior** - Credentials Step Is Never Reached
    - **IMPORTANT**: Re-run the SAME test from task 1b — do NOT write a new test
    - After fix, assert `step === 'configuration'` after `proceedFromOwnershipStage()` with `credentialQuestionsForStep.length > 0`
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 2 is fixed)
    - _Requirements: 2.4, 2.5_

  - [x] 7.3 Verify Bug 3 fix: re-run fill mode persistence exploration test
    - **Property 1: Expected Behavior** - fillModeValues Written to node.data.config._fillMode
    - **IMPORTANT**: Re-run the SAME test from task 1c — do NOT write a new test
    - After fix, assert `node.data.config._fillMode.subject === 'runtime_ai'` for the node matching `mode_node1_subject`
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 3 is fixed)
    - _Requirements: 2.6, 2.7_

- [x] 8. Verify preservation tests still pass

  - [x] 8.1 Re-run preservation tests for non-switch workflow edge reconciliation
    - **Property 2: Preservation** - Non-Switch Workflows Unaffected by Edge Reconciliation Changes
    - **IMPORTANT**: Re-run the SAME tests from task 2a — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in linear workflow wiring)

  - [x] 8.2 Re-run preservation tests for non-AI fill mode fields
    - **Property 2: Preservation** - Non-AI Fill Mode Fields Unaffected
    - **IMPORTANT**: Re-run the SAME tests from task 2b — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (confirms `manual_static` fields are unaffected)

  - [x] 8.3 Re-run preservation tests for non-credentials wizard steps
    - **Property 2: Preservation** - Non-Credentials Wizard Steps Unaffected
    - **IMPORTANT**: Re-run the SAME tests from task 2c — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (confirms all other wizard steps are unaffected)

- [x] 9. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Confirm: exploration tests (tasks 1a–1c) now PASS after fix
  - Confirm: preservation tests (tasks 2a–2c) still PASS after fix
  - Confirm: no new TypeScript diagnostics introduced by the changes
