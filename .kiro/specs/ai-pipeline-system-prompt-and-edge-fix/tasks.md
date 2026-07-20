# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Hardcoded Node Types & Field Lists in Prompt Files
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate all 6 bugs exist
  - **Scoped PBT Approach**: For deterministic bugs (1, 2, 5, 6), scope to concrete failing cases; for structural bugs (3, 4), use property-based generation
  - Bug 1: Load `worker/src/services/ai/PRODUCTION_WORKFLOW_GENERATION_PROMPT.md` and assert it contains NO hardcoded node type strings (`ollama_chat`, `google_gmail`, `slack_message`, `if_else`, `form`) — will FAIL on unfixed code
  - Bug 2: Load `worker/src/services/ai/CLARIFYING_QUESTIONS_SYSTEM_PROMPT.md` and assert it contains NO hardcoded node-field pairs (`Google Sheets: Spreadsheet ID`, `Slack: Channel ID`) — will FAIL on unfixed code
  - Bug 3: Construct a switch node with 3 cases; produce 3 seeded edges with wrong `sourceHandle` labels; assert the old check `seededBranchEdges.length >= branchingNodeIds.length` returns `true` (demonstrating the broken predicate accepts incomplete edges) — will FAIL to detect the bug on unfixed code
  - Bug 4: Pass `selectedNodes = [{nodeId: "abc", type: "google_gmail"}, {nodeId: "abc", type: "google_gmail"}]`; build `nodeMap` using the old `new Map(selectedNodes.map(n => [n.nodeId, n]))` pattern; assert `nodeMap.size === 2` — will FAIL (map has size 1, second entry overwrites first)
  - Bug 5: Mock `aiWorkflowValidator` to return `confidence = 30` for a 2-node `manual_trigger → log_output` workflow; assert `_validationError` is NOT set on `finalStructure` — will FAIL on unfixed code
  - Bug 6: Call `generateRequiredInputFields` with `requirements.primaryGoal = "send a welcome email to new signups"`; capture the LLM prompt string; assert it contains the `primaryGoal` string — will FAIL on unfixed code
  - Run all tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves the bugs exist)
  - Document counterexamples found (e.g., prompt file contains `ollama_chat`, nodeMap.size=1 for duplicate IDs, etc.)
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Correct Behaviors Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: when `allBranchPortsCovered` returns `true` (all ports covered), the seeded workflow is used — record this on unfixed code with a correctly-wired switch node
  - Observe: when `selectedNodes` has all-unique IDs, `nodeMap.size === selectedNodes.length` — record this on unfixed code
  - Observe: a 5-node workflow with a branching node gets full confidence scoring applied — record this on unfixed code
  - Observe: loading `PRODUCTION_WORKFLOW_GENERATION_PROMPT.md` still contains all DAG structural rules (no orphan nodes, no cycles, credential unification) — record this on unfixed code
  - Write property-based test: for all `selectedNodes` arrays with unique IDs (isBugCondition=false), `nodeMap` built from deduplicatedNodes is identical to `nodeMap` built from original `selectedNodes` (Preservation Req 3.2)
  - Write property-based test: for all branching workflows where all ports are covered by seeded edges (isBugCondition=false), the fixed code uses `seededWorkflow` — same as original behavior (Preservation Req 3.1)
  - Write unit test: for a 5-node workflow with a branching node, `_validationError` IS set when confidence is genuinely low — guard must NOT fire (Preservation Req 3.3)
  - Write unit test: fixed `PRODUCTION_WORKFLOW_GENERATION_PROMPT.md` still contains DAG constraint rules (Preservation Req 3.5)
  - Write unit test: clarifying-questions agent outputs "No clarification needed." when all required fields are present (Preservation Req 3.4)
  - Verify all tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix Bug 1 — Strip hardcoded node types from PRODUCTION_WORKFLOW_GENERATION_PROMPT.md
  - [x] 3.1 Remove hardcoded node library and example sections
    - Remove the entire "AVAILABLE NODE LIBRARY (29+ Nodes)" section with all hardcoded node type names
    - Remove the "SPECIFIC IMPLEMENTATION FOR CONTACT FORM WORKFLOW" section (hardcodes `ollama_chat`, `google_gmail`, `slack_message`, `if_else`, `form`)
    - Remove all hardcoded node type names from Stage 2 and Stage 3 example JSON blocks; replace with generic placeholder names (`node_type_1`, `node_type_2`, etc.)
    - Add `{{NODE_CATALOG}}` placeholder section: `## AVAILABLE NODE CATALOG\n{{NODE_CATALOG}}`
    - Keep ALL structural rules (DAG constraints, no orphan nodes, no cycles, credential unification, validation checklist)
    - _Bug_Condition: context.type === 'load_production_prompt' AND containsHardcodedNodeTypes(context.fileContent)_
    - _Expected_Behavior: prompt string contains no hardcoded node type names; contains full node catalog from buildNodeCatalogText()_
    - _Preservation: all DAG constraint rules, orphan-node rules, credential unification rules, and validation checklist are retained_
    - _Requirements: 2.1, 3.5_

- [x] 4. Fix Bug 2 — Strip hardcoded node-field lists from CLARIFYING_QUESTIONS_SYSTEM_PROMPT.md
  - [x] 4.1 Remove hardcoded field lists and add registry-driven instruction
    - Remove the "NODE LIBRARY AWARENESS" section that lists hardcoded node-field pairs (Google Sheets: Spreadsheet ID, Slack: Channel ID, etc.)
    - Remove hardcoded node-specific examples from the "REQUIRED NODE INPUTS" section
    - Add `{{NODE_CATALOG}}` placeholder so the agent knows which nodes exist and their required fields at runtime
    - Add registry-driven instruction: "Required fields for each node are defined in the node catalog above. Ask only about fields that are marked required AND cannot be inferred from the user's prompt."
    - Keep all behavioral rules (question count limits, question format, fail-safe rule, allowed question categories, output format)
    - _Bug_Condition: context.type === 'load_clarifying_prompt' AND containsHardcodedFieldLists(context.fileContent)_
    - _Expected_Behavior: prompt string contains no hardcoded node-field pairs; contains node catalog injected from buildNodeCatalogText()_
    - _Preservation: question count limits, question format rules, fail-safe rule, and all 6 allowed question categories are retained_
    - _Requirements: 2.2, 3.4_

- [x] 5. Fix Bug 3 (catalog injection) — Inject node catalog into prompt files at runtime in workflow-analyzer.ts
  - [x] 5.1 Add catalog injection after fs.readFileSync in buildSystemPrompt
    - Import `buildNodeCatalogText` from `./node-catalog-builder` (already imported in workflow-builder.ts — verify import exists in workflow-analyzer.ts)
    - After loading each prompt file with `fs.readFileSync`, replace `{{NODE_CATALOG}}` with `buildNodeCatalogText()`: `content.replace('{{NODE_CATALOG}}', buildNodeCatalogText())`
    - Apply the same injection in the fallback embedded prompt string in the `catch` block
    - _Bug_Condition: context.type === 'load_production_prompt' OR context.type === 'load_clarifying_prompt'_
    - _Expected_Behavior: returned prompt string contains full node catalog text; no {{NODE_CATALOG}} placeholder remains_
    - _Preservation: all other prompt content (structural rules, behavioral rules) is unchanged_
    - _Requirements: 2.1, 2.2_

- [x] 6. Fix Bug 4 — Fix branch port coverage check in edge-reasoning-stage.ts
  - [x] 6.1 Add allBranchPortsCovered helper and replace broken completeness check
    - Add helper function `allBranchPortsCovered(branchingNodeIds, finalNodes, seededEdges)`:
      - For each branching node ID, find the node in `finalNodes`
      - Get its outgoing ports via `unifiedNodeRegistry.getOutgoingPortsForWorkflowNode(node)`
      - For each port (skipping the generic `'output'` port), check that at least one seeded edge has `source === branchNodeId && sourceHandle === port`
      - Return `false` if any port is uncovered, `true` only when all ports of all branching nodes are covered
    - Replace the broken condition `seededBranchEdges.length >= branchingNodeIds.length` with `allBranchPortsCovered(branchingNodeIds, finalNodes, seededEdges)`
    - _Bug_Condition: context.type === 'edge_completeness_check' AND context.check === 'seededBranchEdges.length >= branchingNodeIds.length'_
    - _Expected_Behavior: allBranchPortsCovered returns false when any port is uncovered; seeded workflow used only when all ports covered_
    - _Preservation: when all ports are correctly covered, seededWorkflow is still used directly (no regression for correct seeded edges)_
    - _Requirements: 2.3, 3.1_

- [x] 7. Fix Bug 5 — Fix duplicate nodeId collision in edge-reasoning-stage.ts
  - [x] 7.1 Add deduplication before nodeMap construction
    - Before building `nodeMap`, add deduplication:
      ```typescript
      const seenIds = new Set<string>();
      const deduplicatedNodes = selectedNodes.map(n => {
        if (seenIds.has(n.nodeId)) {
          return { ...n, nodeId: randomUUID() };
        }
        seenIds.add(n.nodeId);
        return n;
      });
      ```
    - Build `nodeMap` from `deduplicatedNodes` instead of `selectedNodes`
    - When building `workflowNodes` from `parsed.orderedNodes`, use `deduplicatedNodes` as the lookup source
    - _Bug_Condition: context.type === 'build_node_map' AND hasDuplicateNodeIds(context.selectedNodes)_
    - _Expected_Behavior: after deduplication all nodeIds are unique; nodeMap.size === deduplicatedNodes.length; every node independently addressable_
    - _Preservation: when all selectedNodes have unique IDs, deduplicatedNodes is identical to selectedNodes; nodeMap is unchanged_
    - _Requirements: 2.4, 3.2_

- [x] 8. Fix Bug 6 — Fix simple workflow validator threshold in workflow-builder.ts
  - [x] 8.1 Add isSimpleLinear guard before storedValidationError check
    - In `generateFromPrompt`, before the `storedValidationError` check, add:
      ```typescript
      const isSimpleLinear = finalNodes.length <= 3 && !finalNodes.some(n => {
        const def = unifiedNodeRegistry.get(unifiedNormalizeNodeType(n));
        return def?.isBranching;
      });
      if (isSimpleLinear && storedValidationError && storedValidationError.confidence < 50) {
        delete (finalStructure as any)._validationError;
      }
      ```
    - _Bug_Condition: context.type === 'validator_threshold' AND context.nodeCount <= 3 AND NOT context.hasBranchingNode AND context.confidence < 50_
    - _Expected_Behavior: _validationError is NOT set on finalStructure for simple linear workflows with confidence < 50_
    - _Preservation: for workflows with 4+ nodes, full confidence-scoring logic still applies; for 3-node workflows with a branching node, guard does NOT fire_
    - _Requirements: 2.5, 3.3_

- [x] 9. Fix Bug 7 — Pass user intent to generateRequiredInputFields in workflow-builder.ts
  - [x] 9.1 Add requirements.primaryGoal to the field-generation LLM prompt
    - In the `generateRequiredInputFields` method, locate the LLM prompt construction
    - Add `requirements.primaryGoal` (or the original user prompt) to the prompt context sent to the LLM:
      ```typescript
      const userGoal = requirements.primaryGoal || '';
      // Include userGoal in the prompt string passed to the LLM
      ```
    - Ensure the field-generation AI receives the user's intent so it can produce intent-driven values instead of generic placeholders like "Email Subject" or "Message Body"
    - _Bug_Condition: context.type === 'field_generation_call' AND NOT context.promptIncludesUserIntent_
    - _Expected_Behavior: LLM prompt for field generation contains requirements.primaryGoal when it is non-empty; AI produces intent-driven field values_
    - _Preservation: when primaryGoal is empty, field generation continues to work as before; fields that can be fully inferred are still populated without prompting the user_
    - _Requirements: 2.6, 3.6_

- [x] 10. Verify bug condition exploration test now passes
  - [x] 10.1 Re-run the SAME test from task 1 on fixed code
    - **Property 1: Expected Behavior** - All 6 Bug Conditions Resolved
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior for all 6 bugs
    - When this test passes, it confirms all expected behaviors are satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms all 6 bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 10.2 Verify preservation tests still pass
    - **Property 2: Preservation** - No Regressions Introduced
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
