# Implementation Plan

- [x] 1. Write bug condition exploration tests
  - **Property 1: Bug Condition** - URL Fields Misrouted to Credential Panel & Branch Node Deduplication
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior — they will validate the fix when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate both bugs exist
  - **Scoped PBT Approach**: Scope each property to the concrete failing cases for reproducibility
  - Bug 1 — Call `inferCredentialCategory('webhookUrl')` (no helpCategory guard); assert result is NOT `'webhook'` and does NOT appear in `credentialSchema.credentialFields` for a Slack node with `webhookUrl` field (helpCategory = `'webhook_url'`)
  - Bug 1 — Call `classifyFieldOwnership('webhookUrl', { helpCategory: 'webhook_url' })`; assert result is `'value'` (not `'credential'`)
  - Bug 1 — Build a mixed schema (webhookUrl + apiKey); call `extractCredentialSchema`; assert `credentialFields` contains `apiKey` but NOT `webhookUrl`
  - Bug 2 — Construct a `PlannedWorkflow` with a `switch` step + 2 `slack_message` steps (same type, 2 branches); call `hydratePlannedWorkflow`; assert result contains 2 distinct Slack node IDs
  - Bug 2 — Construct a `PlannedWorkflow` with a `switch` step + 3 `slack_message` steps (same type, 3 branches); assert 3 distinct Slack node IDs
  - Bug 2 — Build a workflow with a switch node and only 1 downstream Slack node; run `reconcileEdges`; assert `errors[]` contains a shared-target violation message
  - Run all tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found (e.g., `inferCredentialCategory('webhookUrl')` returns `'webhook'`; Step 4 silently skips `case_2` when only 1 Slack node exists)
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - True Credential Fields & Non-Branching Workflow Wiring
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: `classifyFieldOwnership('apiKey', { helpCategory: 'api_key' })` returns `'credential'` on unfixed code
  - Observe: `classifyFieldOwnership('botToken', { helpCategory: 'generic_token' })` returns `'credential'` on unfixed code
  - Observe: linear `manual_trigger → google_sheets → slack_message` workflow produces correct edge set on unfixed code
  - Observe: switch with `case_1 → slack_message`, `case_2 → google_gmail`, `case_3 → notion` produces 3 distinct branch edges on unfixed code
  - Write property-based test: for all `helpCategory` values in `STRICT_CREDENTIAL_CATEGORIES`, `classifyFieldOwnership` returns `'credential'` (from Preservation Requirements in design)
  - Write property-based test: for all linear workflows (no branching), reconciled edge set is unchanged by the fix
  - Write property-based test: for switch workflows where each branch targets a different node type, edge set has N distinct branch targets
  - Verify all tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Fix Bug 1 — Webhook URL treated as credential

  - [x] 3.1 Harden `inferCredentialCategory` with helpCategory URL guard
    - File: `worker/src/core/registry/unified-node-registry.ts`
    - Change signature to `inferCredentialCategory(fieldName: string, helpCategory?: FieldHelpCategory): string | undefined`
    - Add URL-category blocklist: if `helpCategory` is in `{ 'webhook_url', 'base_url', 'api_endpoint', 'callback_url', 'redirect_url' }`, return `undefined`
    - _Bug_Condition: isBugCondition_credential(fieldName, field) where field.helpCategory IN urlCategories AND inferCredentialCategory(fieldName) = 'webhook'_
    - _Expected_Behavior: inferCredentialCategory returns undefined for URL-type helpCategory values; field never appears in credentialSchema.credentialFields_
    - _Preservation: inferCredentialCategory must continue to return 'oauth', 'api_key', 'token', 'webhook' (secret), 'credential' for all STRICT_CREDENTIAL_CATEGORIES values_
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.2 Update `extractCredentialSchema` call site to pass helpCategory
    - File: `worker/src/core/registry/unified-node-registry.ts`
    - In `extractCredentialSchema`, update the call to `inferCredentialCategory` to pass `fd.helpCategory` as the second argument
    - This activates the URL guard for every field processed by the credential schema builder
    - _Requirements: 2.2, 2.3_

  - [x] 3.3 Add explicit URL-category guard in `classifyFieldOwnership`
    - File: `worker/src/core/utils/field-ownership.ts`
    - Before the `STRICT_CREDENTIAL_CATEGORIES` check, add: if `helpCategory` is in `{ 'webhook_url', 'base_url', 'api_endpoint', 'callback_url', 'redirect_url' }`, return `'value'` immediately
    - This makes the exclusion explicit and immune to future set membership changes in `STRICT_CREDENTIAL_CATEGORIES`
    - _Bug_Condition: isBugCondition_credential where field.helpCategory IN urlCategories AND isCredentialOwnership returns true_
    - _Expected_Behavior: classifyFieldOwnership returns 'value' for all URL-type helpCategory values_
    - _Preservation: classifyFieldOwnership must continue to return 'credential' for all STRICT_CREDENTIAL_CATEGORIES values_
    - _Requirements: 2.1, 3.1, 3.5_

  - [x] 3.4 Verify bug condition exploration test (Bug 1) now passes
    - **Property 1: Expected Behavior** - URL Fields Excluded from Credential Schema
    - **IMPORTANT**: Re-run the SAME tests from task 1 (Bug 1 subset) — do NOT write new tests
    - The tests from task 1 encode the expected behavior for Bug 1
    - When these tests pass, it confirms `classifyFieldOwnership` returns `'value'` for URL-type fields and `extractCredentialSchema` excludes them from `credentialFields`
    - Run Bug 1 exploration tests from step 1
    - **EXPECTED OUTCOME**: Tests PASS (confirms Bug 1 is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.5 Verify preservation tests still pass after Bug 1 fix
    - **Property 2: Preservation** - True Credential Fields Still Classified as Credentials
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in credential classification)
    - _Requirements: 3.1, 3.5_

- [x] 4. Fix Bug 2 — Branch node deduplication

  - [x] 4.1 Add branch-aware step expansion in `hydratePlannedWorkflow`
    - File: `worker/src/services/ai/workflow-builder.ts`
    - Before mapping `planned.steps` to nodes, detect if a `switch` or `if_else` step is present
    - Count branch ports for the branching node (from registry `outgoingPorts`)
    - For each branch port, ensure there is exactly one downstream step of the required type; if the planner emitted fewer steps than branch ports (same type appears fewer times than needed), clone the step with a new unique ID: `${step.type}_case_${branchIndex}_${uuid()}`
    - This ensures `hydratePlannedWorkflow` always produces N nodes for N branches even when the planner collapsed them
    - _Bug_Condition: isBugCondition_dedup(plan, switchNodeBranchCount) where stepsOfSameType(type) < switchNodeBranchCount_
    - _Expected_Behavior: hydratePlannedWorkflow produces N WorkflowNodes of type T with unique IDs for N branches requiring type T_
    - _Preservation: linear workflows and switch workflows with distinct branch types must produce the same node set as before_
    - _Requirements: 2.4, 2.5, 2.8, 3.3, 3.7_

  - [x] 4.2 Add per-branch uniqueness instruction to Gemini planning prompt
    - File: `worker/src/services/ai/system-prompt-builder.ts` (or the planning prompt file used by `planWorkflowWithGemini`)
    - Add explicit instruction: "When multiple branches of a switch or if-else each require the same node type, emit one distinct step per branch with a unique step ID. Never collapse two branch actions into a single shared step."
    - This prevents the planner from deduplicating same-type branch steps at the source
    - _Requirements: 2.4_

  - [x] 4.3 Add shared-target assertion in `EdgeReconciliationEngine` Step 4
    - File: `worker/src/core/orchestration/edge-reconciliation-engine.ts`
    - After the Step 4 branch fan-out loop completes, for each branching node collect all outgoing branch edges and assert `new Set(branchEdges.map(e => e.target)).size === branchEdges.length`
    - If assertion fails, push a descriptive error: `"Switch node ${branchingNode.id}: branch ports ${portA} and ${portB} both target node ${sharedTargetId} — branch targets must be distinct"`
    - _Bug_Condition: isBugCondition_dedup where Step 4 produces two branch edges from the same switch node sharing the same target_
    - _Expected_Behavior: EdgeReconciliationEngine Step 4 produces branch edges where all targets are distinct; cardinality of target set equals number of branch ports_
    - _Preservation: non-branching workflows and switch workflows with distinct branch types must produce the same edge set as before_
    - _Requirements: 2.6, 2.7_

  - [x] 4.4 Guard `potentialTargets.find` for branch exhaustion in Step 4
    - File: `worker/src/core/orchestration/edge-reconciliation-engine.ts`
    - In the Step 4 fan-out loop, when `targetCandidate` is `undefined` (no unused target found), instead of silently returning, push a descriptive error: `"Switch node ${branchingNode.id}: no distinct target available for branch port ${portName} — planner may have emitted too few nodes"`
    - This surfaces the deduplication bug as a hard error rather than a silent broken graph
    - _Requirements: 2.6, 2.7_

  - [x] 4.5 Verify bug condition exploration tests (Bug 2) now pass
    - **Property 1: Expected Behavior** - Branch Nodes Deduplicated into N Independent Instances
    - **IMPORTANT**: Re-run the SAME tests from task 1 (Bug 2 subset) — do NOT write new tests
    - The tests from task 1 encode the expected behavior for Bug 2
    - When these tests pass, it confirms `hydratePlannedWorkflow` produces N distinct nodes for N branches and `reconcileEdges` errors on shared branch targets
    - Run Bug 2 exploration tests from step 1
    - **EXPECTED OUTCOME**: Tests PASS (confirms Bug 2 is fixed)
    - _Requirements: 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 4.6 Verify preservation tests still pass after Bug 2 fix
    - **Property 2: Preservation** - Non-Branching Workflows and Distinct-Type Switch Workflows Unaffected
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in edge wiring or node hydration)
    - _Requirements: 3.2, 3.3, 3.4, 3.6, 3.7_

- [x] 5. Checkpoint — Ensure all tests pass
  - Re-run the full test suite covering both bugs and all preservation cases
  - Confirm Property 1 (Bug Condition) tests pass for both Bug 1 and Bug 2
  - Confirm Property 2 (Preservation) tests pass for all non-buggy inputs
  - Confirm no new TypeScript diagnostics introduced in changed files
  - Ask the user if any questions arise
