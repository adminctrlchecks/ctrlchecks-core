# AI Pipeline System Prompt & Edge Fix — Bugfix Design

## Overview

Six interconnected bugs degrade the AI workflow generation pipeline. Two static prompt files
hardcode node type names and field lists, bypassing the registry entirely. The edge-reasoning
stage uses a flawed completeness check that accepts incomplete branch wiring. Duplicate nodeIds
from the LLM silently drop one branch. An overly strict validator rejects valid simple linear
workflows. And the field-generation call omits the user's original intent, producing generic
placeholder values.

The fix strategy is: strip all hardcoded node knowledge from prompt files and replace with a
`{{NODE_CATALOG}}` placeholder injected at runtime from `buildNodeCatalogText()`; replace the
broken edge-count check with a registry-driven port-coverage check; deduplicate nodeIds before
building `nodeMap`; guard the validator threshold for simple linear workflows; and pass
`requirements.primaryGoal` into the field-generation LLM call.

## Glossary

- **Bug_Condition (C)**: The set of inputs or code paths that trigger one of the six defects.
- **Property (P)**: The desired correct behavior when the bug condition holds.
- **Preservation**: Existing behaviors that must remain unchanged after the fix.
- **`buildNodeCatalogText()`**: Function in `node-catalog-builder.ts` that reads all node
  definitions from `unifiedNodeRegistry` at runtime and serializes them to a compact string.
- **`{{NODE_CATALOG}}`**: Placeholder string in prompt files replaced at runtime with the
  output of `buildNodeCatalogText()`.
- **`seededBranchEdges`**: Edges proposed by the LLM in `edge-reasoning-stage.ts` that carry
  a non-`main` `sourceHandle` (i.e. `true`, `false`, `case_1`, `case_2`, …).
- **`allBranchPortsCovered`**: The correct completeness predicate — every outgoing port of
  every branching node must have at least one seeded edge.
- **`nodeMap`**: The `Map<nodeId, SelectedNode>` built in `edge-reasoning-stage.ts` used to
  look up nodes when materializing `WorkflowNode` objects.
- **`_validationError`**: A property attached to `finalStructure` in `workflow-builder.ts`
  when `aiWorkflowValidator` returns `confidence < 50`.
- **`generateRequiredInputFields`**: Private method in `AgenticWorkflowBuilder` that calls
  the field-generation AI to populate node config fields.
- **`requirements.primaryGoal`**: The user's original intent string stored in the
  `Requirements` object passed through the generation pipeline.

## Bug Details

### Bug Condition

The six bugs manifest under distinct but related conditions:

**Bugs 1 & 2 — Hardcoded prompts**: Manifest on every call to `WorkflowAnalyzer.buildSystemPrompt()`
and every call that loads `PRODUCTION_WORKFLOW_GENERATION_PROMPT.md`. The files contain literal
node type strings and field lists that become stale whenever the registry changes.

**Bug 3 — Edge completeness check**: Manifests when the LLM returns seeded edges for a
branching node that has more outgoing ports than there are branching nodes. For example, a
single `switch` node with 3 cases produces `seededBranchEdges.length = 3` and
`branchingNodeIds.length = 1`, so `3 >= 1` is `true` even when the edges use wrong port labels
or miss a case entirely.

**Bug 4 — Duplicate nodeId**: Manifests when the LLM assigns the same `nodeId` to two nodes
of the same type placed in different branches (e.g. two `google_gmail` nodes in a switch). The
second entry overwrites the first in `nodeMap`, leaving one branch with no backing node.

**Bug 5 — Validator threshold**: Manifests when `aiWorkflowValidator.validateWorkflowStructure`
evaluates a 2–3 node linear workflow and returns `confidence < 50` because the heuristic
penalizes low node count, causing `_validationError` to be set on a structurally valid graph.

**Bug 6 — Missing intent in field generation**: Manifests on every call to
`generateRequiredInputFields` — the method receives `requirements` (which contains
`primaryGoal`) but does not forward it to the LLM prompt, so the AI produces generic
placeholder values instead of intent-driven ones.

**Formal Specification:**
```
FUNCTION isBugCondition(context)
  INPUT: context — one of the six execution contexts described above
  OUTPUT: boolean

  RETURN (
    -- Bug 1: prompt file contains hardcoded node type names
    (context.type === 'load_production_prompt'
      AND containsHardcodedNodeTypes(context.fileContent))

    OR

    -- Bug 2: clarifying-questions prompt contains hardcoded field lists
    (context.type === 'load_clarifying_prompt'
      AND containsHardcodedFieldLists(context.fileContent))

    OR

    -- Bug 3: seeded-edge completeness check uses wrong predicate
    (context.type === 'edge_completeness_check'
      AND context.check === 'seededBranchEdges.length >= branchingNodeIds.length')

    OR

    -- Bug 4: duplicate nodeId in LLM response
    (context.type === 'build_node_map'
      AND hasDuplicateNodeIds(context.selectedNodes))

    OR

    -- Bug 5: simple linear workflow flagged by validator
    (context.type === 'validator_threshold'
      AND context.nodeCount <= 3
      AND NOT context.hasBranchingNode
      AND context.confidence < 50)

    OR

    -- Bug 6: user intent not passed to field generation
    (context.type === 'field_generation_call'
      AND NOT context.promptIncludesUserIntent)
  )
END FUNCTION
```

### Examples

- **Bug 1**: `PRODUCTION_WORKFLOW_GENERATION_PROMPT.md` contains the string `ollama_chat` in
  the "AVAILABLE NODE LIBRARY" section. After fix: that section is replaced by
  `{{NODE_CATALOG}}` and the string `ollama_chat` no longer appears in the file.

- **Bug 2**: `CLARIFYING_QUESTIONS_SYSTEM_PROMPT.md` contains `"Google Sheets: Spreadsheet ID
  (always required)"`. After fix: that line is removed; the prompt instructs the agent to
  consult the registry for required fields.

- **Bug 3**: A `switch` node with `case_1`, `case_2`, `case_3` ports produces 3 seeded edges
  and `branchingNodeIds.length = 1`. Old check: `3 >= 1 → true` (uses broken seeded workflow
  even if edges have wrong labels). New check: verifies `case_1`, `case_2`, `case_3` are each
  covered by at least one seeded edge with matching `sourceHandle`.

- **Bug 4**: LLM returns `[{nodeId: "abc", type: "google_gmail"}, {nodeId: "abc", type:
  "google_gmail"}]`. Old code: second entry overwrites first in `nodeMap`. New code: second
  entry gets a fresh `randomUUID()`, both entries are independently addressable.

- **Bug 5**: A `manual_trigger → log_output` workflow (2 nodes, no branching) gets
  `confidence = 30`. Old code: sets `_validationError`. New code: detects `nodeCount <= 3` and
  `!hasBranchingNode`, clears `_validationError`.

- **Bug 6**: `generateRequiredInputFields` is called for a `google_gmail` node with
  `requirements.primaryGoal = "send a welcome email to new signups"`. Old code: LLM prompt
  contains no mention of this goal, returns `subject: "Email Subject"`. New code: prompt
  includes the goal, returns `subject: "Welcome to our platform!"`.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- When a branching workflow has correctly typed and complete seeded edges, the system SHALL
  continue to use those seeded edges directly without falling back to orchestrator-wired edges
  (Requirement 3.1).
- When all selected nodes have unique IDs, `nodeMap` construction and edge wiring SHALL
  continue to work exactly as before (Requirement 3.2).
- When a complex workflow with 4+ nodes is validated, the full confidence-scoring logic
  including node-count heuristics SHALL continue to apply (Requirement 3.3).
- When the clarifying-questions agent processes a prompt that already contains all required
  field values, it SHALL continue to output "No clarification needed." (Requirement 3.4).
- All structural constraint rules in `PRODUCTION_WORKFLOW_GENERATION_PROMPT.md` (no orphan
  nodes, no cycles, DAG constraints) SHALL be retained after the node-list section is removed
  (Requirement 3.5).
- When `generateRequiredInputFields` is called for a node whose required fields can be fully
  inferred from user intent, it SHALL continue to populate those fields without prompting the
  user (Requirement 3.6).

**Scope:**
All inputs that do NOT trigger one of the six bug conditions are completely unaffected. This
includes: workflows with unique node IDs, complex workflows with 4+ nodes, prompts that already
contain all required information, and branching workflows with complete and correctly typed
seeded edges.

## Hypothesized Root Cause

1. **Static prompt files not connected to registry (Bugs 1 & 2)**: The prompt files were
   written manually at a point in time when the node list was small and stable. No mechanism
   exists to keep them in sync with `unifiedNodeRegistry`. The `workflow-analyzer.ts` loads
   the file with `fs.readFileSync` and passes it directly to the LLM with no post-processing.

2. **Off-by-one in completeness predicate (Bug 3)**: The check `seededBranchEdges.length >=
   branchingNodeIds.length` was written to handle the simple case of one branching node with
   one seeded edge per branch, but it counts edges rather than port coverage. A switch with 3
   cases and 1 branching node satisfies `3 >= 1` regardless of whether the edges are correct.

3. **No deduplication before `nodeMap` construction (Bug 4)**: The LLM is instructed to emit
   unique IDs but occasionally returns the same ID for same-type nodes in different branches.
   The code does `new Map(selectedNodes.map(n => [n.nodeId, n]))` which silently overwrites
   duplicates — JavaScript `Map` constructor behavior.

4. **Validator heuristic penalizes low node count (Bug 5)**: `aiWorkflowValidator` uses node
   count as a proxy for workflow completeness. A 2-node workflow scores low on "completeness"
   even when it is structurally valid. The downstream code in `generateFromPrompt` does not
   distinguish between "structurally invalid" and "low node count".

5. **`requirements` object not forwarded to LLM prompt string (Bug 6)**: `generateRequiredInputFields`
   receives `requirements` as a parameter and uses `requirements.primaryGoal` for some
   heuristics, but the string passed to the LLM call does not include `primaryGoal`. The LLM
   therefore has no context about what the user actually wants.

## Correctness Properties

Property 1: Bug Condition — Registry-Driven Prompt Content

_For any_ call that loads `PRODUCTION_WORKFLOW_GENERATION_PROMPT.md` or
`CLARIFYING_QUESTIONS_SYSTEM_PROMPT.md`, the fixed loading code SHALL produce a prompt string
that contains no hardcoded node type names (e.g. `ollama_chat`, `google_gmail`,
`slack_message`) and no hardcoded node-field pairs (e.g. `"Google Sheets: Spreadsheet ID"`),
and SHALL contain the full node catalog text produced by `buildNodeCatalogText()` injected in
place of the `{{NODE_CATALOG}}` placeholder.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition — Branch Port Coverage

_For any_ set of seeded edges and branching nodes where the bug condition holds (i.e. the old
`seededBranchEdges.length >= branchingNodeIds.length` check would return `true` but not all
ports are covered), the fixed `allBranchPortsCovered` function SHALL return `false`, causing
the pipeline to fall back to orchestrator-wired edges rather than using the incomplete seeded
workflow.

**Validates: Requirements 2.3**

Property 3: Bug Condition — NodeId Uniqueness After Deduplication

_For any_ `selectedNodes` array returned by the LLM that contains duplicate `nodeId` values,
the fixed deduplication step SHALL produce a new array where every `nodeId` is unique, and the
`nodeMap` built from that array SHALL contain an entry for every node in the array.

**Validates: Requirements 2.4**

Property 4: Preservation — Correct Seeded Edges Unchanged

_For any_ set of seeded edges where `allBranchPortsCovered` returns `true` (all ports of all
branching nodes have a seeded edge with the correct `sourceHandle`), the fixed code SHALL
produce the same `seededWorkflow` as the original code — i.e. the seeded edges are used
directly without falling back to the orchestrator.

**Validates: Requirements 3.1**

Property 5: Bug Condition — Simple Workflow Validator Guard

_For any_ workflow where `finalNodes.length <= 3` and no node has `isBranching === true`, the
fixed code SHALL NOT set `_validationError` on `finalStructure` when
`storedValidationError.confidence < 50`, treating the workflow as structurally valid.

**Validates: Requirements 2.5**

Property 6: Bug Condition — User Intent in Field Generation

_For any_ call to `generateRequiredInputFields` where `requirements.primaryGoal` is a
non-empty string, the fixed method SHALL include that string in the prompt sent to the
field-generation LLM, so the LLM can produce intent-driven field values rather than generic
placeholders.

**Validates: Requirements 2.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File 1**: `worker/src/services/ai/PRODUCTION_WORKFLOW_GENERATION_PROMPT.md`

**Specific Changes**:
1. **Remove "AVAILABLE NODE LIBRARY" section**: Delete the entire section listing 29+ node
   types with their descriptions. This is the primary source of hardcoded node knowledge.
2. **Remove Stage 2 and Stage 3 example JSON**: The example workflow JSON in Stage 2 and
   Stage 3 contains hardcoded node types (`ollama_chat`, `google_gmail`, `slack_message`,
   `if_else`, `form`). Replace with a generic structural example that uses placeholder names.
3. **Remove "SPECIFIC IMPLEMENTATION FOR CONTACT FORM WORKFLOW" section**: This section
   hardcodes a specific workflow with specific node types. Remove entirely.
4. **Add `{{NODE_CATALOG}}` placeholder**: Insert a clearly labeled section:
   ```
   ## AVAILABLE NODE CATALOG
   {{NODE_CATALOG}}
   ```
   This placeholder is replaced at runtime by `buildNodeCatalogText()`.
5. **Retain all structural rules**: Keep all DAG constraints, orphan-node rules, credential
   unification rules, and validation checklist — these are structural, not node-specific.

---

**File 2**: `worker/src/services/ai/CLARIFYING_QUESTIONS_SYSTEM_PROMPT.md`

**Specific Changes**:
1. **Remove "NODE LIBRARY AWARENESS" section**: Delete the hardcoded list of nodes and their
   required fields (Google Sheets: Spreadsheet ID, Slack: Channel ID, etc.).
2. **Replace with registry-driven instruction**: Add a section that instructs the agent:
   > "Required fields for each node are defined in the node registry. Ask only about fields
   > that are marked `required: true` in the registry AND cannot be inferred from the user's
   > prompt."
3. **Remove hardcoded examples in "REQUIRED NODE INPUTS" section**: The examples
   `"What is the Google Sheets Spreadsheet ID?"` etc. are node-specific. Replace with generic
   examples that do not name specific node types.
4. **Add `{{NODE_CATALOG}}` placeholder**: Insert a section so the agent knows which nodes
   exist and what their required fields are at runtime.

---

**File 3**: `worker/src/services/ai/workflow-analyzer.ts`

**Function**: `buildSystemPrompt()`

**Specific Changes**:
1. **Import `buildNodeCatalogText`**: Add import at top of file.
2. **Inject catalog after loading file**: After `fs.readFileSync(promptPath, 'utf-8')`,
   replace `{{NODE_CATALOG}}` with `buildNodeCatalogText()`:
   ```typescript
   const catalog = buildNodeCatalogText();
   return content.replace('{{NODE_CATALOG}}', catalog);
   ```
3. **Apply same injection in fallback embedded prompt**: The fallback string in the `catch`
   block also needs the catalog injected.

---

**File 4**: `worker/src/services/ai/stages/edge-reasoning-stage.ts`

**Specific Changes**:
1. **Add `allBranchPortsCovered` helper function**:
   ```typescript
   function allBranchPortsCovered(
     branchingNodeIds: string[],
     finalNodes: WorkflowNode[],
     seededEdges: Array<{ source: string; sourceHandle?: string }>
   ): boolean {
     for (const branchNodeId of branchingNodeIds) {
       const node = finalNodes.find(n => n.id === branchNodeId);
       if (!node) return false;
       const ports = unifiedNodeRegistry.getOutgoingPortsForWorkflowNode(node);
       for (const port of ports) {
         if (port === 'output') continue; // skip generic output port
         const covered = seededEdges.some(
           e => e.source === branchNodeId && e.sourceHandle === port
         );
         if (!covered) return false;
       }
     }
     return true;
   }
   ```
2. **Replace broken completeness check**: Change:
   ```typescript
   const workflow: Workflow = seededBranchEdges.length >= branchingNodeIds.length
     ? seededWorkflow
     : initialized.workflow;
   ```
   To:
   ```typescript
   const workflow: Workflow = allBranchPortsCovered(branchingNodeIds, finalNodes, seededEdges)
     ? seededWorkflow
     : initialized.workflow;
   ```
3. **Add nodeId deduplication before `nodeMap` construction**: Before the `nodeMap` line,
   insert:
   ```typescript
   const seenIds = new Set<string>();
   const deduplicatedNodes = selectedNodes.map(n => {
     if (seenIds.has(n.nodeId)) {
       return { ...n, nodeId: randomUUID() };
     }
     seenIds.add(n.nodeId);
     return n;
   });
   const nodeMap = new Map(deduplicatedNodes.map(n => [n.nodeId, n]));
   ```
   Also update `orderedNodes` references: when building `workflowNodes`, use `deduplicatedNodes`
   as the lookup source instead of `selectedNodes`.

---

**File 5**: `worker/src/services/ai/workflow-builder.ts`

**Specific Changes**:
1. **Add simple-workflow guard before `_validationError` check** (around line 2731):
   ```typescript
   const isSimpleLinear = finalNodes.length <= 3 && !finalNodes.some(n => {
     const def = unifiedNodeRegistry.get(unifiedNormalizeNodeType(n));
     return def?.isBranching;
   });
   if (isSimpleLinear && storedValidationError && storedValidationError.confidence < 50) {
     delete (finalStructure as any)._validationError;
   }
   ```
2. **Pass `requirements.primaryGoal` to `generateRequiredInputFields` LLM prompt**: In the
   method body, locate the LLM call and add `primaryGoal` to the prompt context:
   ```typescript
   const userGoal = requirements.primaryGoal || '';
   // Include userGoal in the prompt string passed to the LLM
   ```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that
demonstrate each bug on unfixed code, then verify the fix works correctly and preserves
existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fixes.
Confirm or refute the root cause analysis.

**Test Plan**: Write tests that load the prompt files, simulate the edge-reasoning stage with
duplicate IDs and incomplete seeded edges, and invoke the validator on simple workflows. Run
these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Prompt file content test** (Bug 1 & 2): Load `PRODUCTION_WORKFLOW_GENERATION_PROMPT.md`
   and `CLARIFYING_QUESTIONS_SYSTEM_PROMPT.md` and assert they contain no hardcoded node type
   strings. Will fail on unfixed code.
2. **Branch port coverage test** (Bug 3): Create a `switch` node with 3 cases, produce 3
   seeded edges with correct `sourceHandle` values, and assert `allBranchPortsCovered` returns
   `true`. Then produce 3 seeded edges with wrong labels and assert it returns `false`. The
   old check would return `true` in both cases.
3. **Duplicate nodeId test** (Bug 4): Pass `selectedNodes` with two entries sharing the same
   `nodeId` and assert that after deduplication both entries have unique IDs and both appear
   in `nodeMap`. Will fail on unfixed code (second entry overwrites first).
4. **Simple workflow validator test** (Bug 5): Build a 2-node `manual_trigger → log_output`
   workflow, mock `aiWorkflowValidator` to return `confidence = 30`, and assert
   `_validationError` is NOT set on `finalStructure`. Will fail on unfixed code.
5. **Field generation intent test** (Bug 6): Call `generateRequiredInputFields` with a
   `requirements` object containing `primaryGoal = "send welcome email to new signups"` and
   capture the prompt sent to the LLM. Assert the prompt contains the `primaryGoal` string.
   Will fail on unfixed code.

**Expected Counterexamples**:
- Prompt files contain strings like `ollama_chat`, `google_gmail`, `slack_message`.
- `seededBranchEdges.length >= branchingNodeIds.length` returns `true` for incomplete edges.
- `nodeMap` has fewer entries than `selectedNodes` when duplicates exist.
- `_validationError` is set on a valid 2-node workflow.
- LLM prompt for field generation contains no user intent string.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed code produces
the expected behavior.

**Pseudocode:**
```
FOR ALL context WHERE isBugCondition(context) DO
  result := fixedCode(context)
  ASSERT expectedBehavior(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code
produces the same result as the original code.

**Pseudocode:**
```
FOR ALL context WHERE NOT isBugCondition(context) DO
  ASSERT originalCode(context) = fixedCode(context)
END FOR
```

**Testing Approach**: Property-based testing is recommended for the edge-completeness and
nodeId-deduplication fixes because:
- It generates many random node configurations and edge sets automatically.
- It catches edge cases (e.g. 0 branching nodes, all ports covered, no duplicates) that
  manual unit tests might miss.
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs.

**Test Cases**:
1. **Correct seeded edges preserved** (Preservation of Req 3.1): Generate random branching
   workflows where all ports are covered by seeded edges. Assert the fixed code uses the
   seeded workflow (not the orchestrator fallback) — same as original behavior.
2. **Unique nodeIds unchanged** (Preservation of Req 3.2): Generate `selectedNodes` arrays
   with all-unique IDs. Assert `nodeMap` is identical before and after the deduplication step.
3. **Complex workflow validator unchanged** (Preservation of Req 3.3): Build a 5-node
   workflow with a branching node. Assert the validator's full confidence-scoring logic still
   applies and `_validationError` is set when confidence is genuinely low.
4. **Structural rules retained in prompt** (Preservation of Req 3.5): Load the fixed
   `PRODUCTION_WORKFLOW_GENERATION_PROMPT.md` and assert it still contains the DAG constraint
   rules (no orphan nodes, no cycles, etc.).

### Unit Tests

- Test `allBranchPortsCovered` with: all ports covered, one port missing, zero branching
  nodes, branching node not in `finalNodes`.
- Test nodeId deduplication with: no duplicates (identity), one duplicate, all duplicates.
- Test simple-workflow guard with: 2-node linear, 3-node linear, 4-node linear (guard must
  NOT fire), 3-node with branching (guard must NOT fire).
- Test `buildSystemPrompt()` in `workflow-analyzer.ts` returns a string containing the node
  catalog and not containing any hardcoded node type names.

### Property-Based Tests

- Generate random `selectedNodes` arrays (0–20 nodes, random types, random IDs with
  controlled collision rate) and verify: after deduplication, all IDs are unique AND all
  original nodes are represented (no node dropped).
- Generate random branching node configurations (random port counts 2–6) and random seeded
  edge sets. Verify: `allBranchPortsCovered` returns `true` iff every port has a matching
  seeded edge; the seeded workflow is used iff `allBranchPortsCovered` returns `true`.
- Generate random `requirements` objects with varying `primaryGoal` values and verify: the
  LLM prompt produced by `generateRequiredInputFields` always contains the `primaryGoal`
  string when it is non-empty.

### Integration Tests

- End-to-end: submit a prompt that implies a `switch` node with 3 cases (e.g. "route orders
  by status: shipped, processing, cancelled — send Gmail for shipped, Slack for processing,
  Slack for cancelled"). Assert the generated workflow has 3 distinct branch edges with correct
  `sourceHandle` values and 3 distinct target nodes.
- End-to-end: submit a simple 2-step prompt (e.g. "when triggered manually, log the result").
  Assert the generated workflow has no `_validationError` in its metadata.
- End-to-end: submit a prompt with clear user intent (e.g. "send a welcome email to new
  signups"). Assert the generated `google_gmail` node's `subject` field reflects the intent
  rather than a generic placeholder.
- Regression: submit the contact-form spam-check prompt from the original prompt file. Assert
  the generated workflow is structurally valid (trigger → AI → if_else → gmail/slack) and
  uses registry-derived node types.
