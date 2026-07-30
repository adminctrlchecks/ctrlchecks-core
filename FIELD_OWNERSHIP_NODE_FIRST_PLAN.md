# Field-Ownership Step — Node-First Redesign & Test-Gated Build

Status: **Proposed — no application code has been changed.**
Every root cause below is **read from the code**, with `file:line` evidence. Nothing here is estimated.

Scope: the AI workflow wizard's `field-ownership` step
(`localhost:8080/workflow/ai`, `ctrl_checks/src/components/workflow/field-ownership/`).

---

## 0. How to use this document

Read §1 and §2 **before writing any code.** §1 lists what is already built and working — rebuilding
any of it is the main way this task goes wrong. §2 lists invariants that fail *silently* if broken:
the UI still looks correct and the workflow still saves, but with none of the user's values.

Then work §4 phases in order. Each phase has acceptance criteria and required tests.

---

## 1. What ALREADY WORKS — do NOT rebuild

The backend for this feature is largely complete. The gap is almost entirely **frontend
organisation** plus a few unwired seams.

| Capability | Where | State |
|---|---|---|
| Field grouping into 5 buckets | `worker/src/api/workflow-build/field-plan.ts` | **Done.** Returns `required`, `credential`, `aiFilled`, `aiRuntime`, `optional` |
| Operation-aware required fields | `field-plan.ts:161` → `resolveFieldPolicyForNode(def, config, …)` | **Done.** Uses the **live instance config**, not defaults — that is why the endpoint takes nodes inline |
| Upstream attribution (`{{$json.x}}` → producing node) | `worker/src/core/graph/upstream-field-resolver.ts`, surfaced as `producedBy` | **Done.** Registry-schema driven, no per-type branching |
| Sequential, upstream-grounded AI build | `worker/src/services/ai/stages/property-population-stage.ts:337` loop, `:412` `resolveUpstreamFields` | **Done.** Mutates `node.data.config` in place, so later nodes see earlier nodes' filled shape |
| Per-node real test run + consent | `worker/src/api/workflow-build/run-node.ts` | **Done.** Auth → ownership → ceiling → idempotency → consent → fan-out sampling |
| Chained branch-aware run | `worker/src/api/workflow-build/run.ts` | **Done.** Reuses `shouldSkipNode()`; untaken branches get `not_exercised`, never `passed` |
| Invalidate downstream results on edit | `worker/src/core/execution/build-run-state.ts:134` `invalidateFrom()` | **Done, but unused by the UI** |
| First-run classification | `worker/src/core/registry/first-run-classification.ts`, `core/execution/first-run-policy.ts` | **Done.** Default is `write`, never `none` — unclassified over-protects |
| Test button + guidance rendering | `ctrl_checks/.../field-ownership/NodeTestAction.tsx` | **Done.** Status vocabulary is `passed \| awaiting_consent \| needs_attention` — never "failed" |
| Inline value editing + ownership change | `FieldOwnershipRow.tsx`, `FieldValueControl.tsx` | **Done** |

**Consequence:** do not design new endpoints for grouping, upstream resolution, or test execution.
Consume what exists.

---

## 2. Invariants that fail SILENTLY — read before touching rows

### 2.1 The value-key contract (highest-risk detail in the step)

`ctrl_checks/src/lib/wizard-field-ownership.ts:120-134` carries an explicit warning. Restated
because a node-first refactor moves exactly this code:

> Inline editing MUST write into `inputValues` / `credentialValues` under the **same `question.id`
> keys** the deleted configuration step used, because `handleBuild` forwards those maps verbatim to
> `/attach-inputs` and `/attach-credentials`.

A different scheme (`nodeId::fieldName`, a per-node map, …) **still type-checks, and the UI still
looks right — but the workflow saves with none of the user's values.**

- Every write must go through `resolveFieldValueKey()` + `resolveFieldValueTarget()`.
- `ctrl_checks/src/components/workflow/field-ownership/__tests__/fieldRowKeyContract.test.tsx`
  asserts this. **It must keep passing, unmodified.**

### 2.2 Universality — this must work for ALL nodes, with no per-node code

**Hard requirement.** No `if (node.type === …)` / `switch (node.type)` outside the registry, and no
per-node-type special cases anywhere in this work. Grouping, ordering, status, and gating must be
driven by **registry data and graph structure only**, so a node added next year behaves correctly
with zero changes to this step.

Audited across every file this plan touches (`rg "nodeType === '|node.type === '|switch (nodeType"`):

| Area | Node-specific branches |
|---|---|
| `ctrl_checks/src/components/workflow/field-ownership/**` | **0** |
| `field-plan.ts` — `groupForField()` keys off `credential` / `required` / `fillMode` flags | **0** |
| `upstream-field-resolver.ts` — registry output schemas only | **0** |
| `first-run-classification.ts` — table lookups, default `write` | **0** (data, not branching) |
| `run-node.ts`, `run.ts`, `build-run-state.ts` | **0** |
| `field-policy-resolver.ts`, `fill-mode-resolver.ts` | **0** |
| **`property-population-stage.ts`** | **2 — see RC-8** |

Everything Phases A–E touch is already universal. Keep it that way: if a phase seems to need a
node-type check, the correct fix is to add the missing **field metadata to the registry** — the
contract already carries `role` (`unified-node-contract.ts:189, :253`) and `essentialForExecution`
(`:289`), surfaced through `getBuildValueContext()` (`unified-node-registry.ts:2368`).

### 2.3 Real side effects

`run-node.ts` genuinely sends the email / posts the message. Never auto-run on render, on selection,
or on mount. Consent is a **server** decision (`requiresConsent`), re-affirmed by a second call
carrying `consented: true`. Do not add a client-side shortcut.

### 2.4 Wizard-owned state

`inputValues`, `credentialValues`, `fillModeValues` are owned by `AutonomousAgentWizard.tsx` and
read by `handleBuild`. The step receives them on `ctx`. **Never relocate them into the step.**

---

## 3. Root causes

### RC-1 — Each node is rendered TWICE, which is why the rail reads "11 of 13"

The step splits fields into two top-level sections and builds the rail from both:

```ts
// AutonomousAgentWizard.tsx:1418-1426
ownershipStructuralByNode = groupQuestionsByNode(
  ownershipQuestions.filter(q => q.ownershipClass === 'structural'))
ownershipSecretsByNode    = groupQuestionsByNode(
  ownershipQuestions.filter(q => q.ownershipClass !== 'structural'))
```

```ts
// NodeChecklistRail.tsx:37-43 — flatMaps BOTH sections
sections: [{ key: 'structural', … }, { key: 'secrets', … }]
// → key: `${section.key}_${group.nodeId}`   (buildRailEntries, wizard-field-ownership.ts:270)
```

A node with both structural fields and secrets produces **two rail entries and two cards**. That is
precisely the observed "Form Trigger #1 … Form Trigger #6, Switch #2 … Switch #7", and 13 entries
for ~7 nodes.

**This is the enabling defect.** Node-first ordering (Form → Switch → Gmail) is *impossible* while a
node is split across two top-level sections. Fix RC-1 first; RC-3/4/5 largely follow.

### RC-2 — The rail shows readiness, never test status

`RailNodeStatus = 'waiting' | 'needs-input' | 'ready'` (`wizard-field-ownership.ts:209`).
`buildRailEntries()` (`:260`) accepts no run results, and `ctx.runResults` — which **does** exist
(`field-ownership/types.ts:108`) — is never passed to it.

The code says so itself, at `wizard-field-ownership.ts:258`:

> "The vocabulary is a placeholder that **Phase 7b replaces with real run status**."

Phase 7b shipped the run (`run-node.ts`, `NodeTestAction`) but **never replaced the vocabulary.**
This is an unfinished handoff, not a design choice.

### RC-3 — "Build Workflow" ignores whether anything was tested

```tsx
// FieldOwnershipStage.tsx:119
disabled={ctx.outstandingCount > 0}
```

`outstandingCount` = `outstandingManualQuestions.length` (`AutonomousAgentWizard.tsx:1403-1414`),
which counts only manual questions lacking a value. A workflow with **zero tested nodes** builds.

### RC-4 — Group order puts "You provide" before "AI filled"

```ts
// workflowBuildFieldPlan.ts:89-95
FIELD_GROUP_ORDER = ['required', 'credential', 'aiFilled', 'aiRuntime', 'optional']
```

The required review flow is: **see what AI filled → then fill what's left → then optional.**
Note `defaultExpandedGroup()` (`:109`) derives from this same constant, so reordering also changes
which accordion opens first — which is the desired effect.

### RC-5 — Every node is expanded at once; there is no selection

`OwnershipSection.tsx:36-43` maps **all** groups unconditionally. The rail's only behaviour is
`scrollIntoView` (`NodeChecklistRail.tsx:77-81`). There is no "selected node" state anywhere.

### RC-6 — `firstRunClass` is hardcoded `null`

```ts
// field-plan.ts:227
firstRunClass: null,   // comment says "populated once Phase 6 adds firstRunClass"
```

Phase 6 **did** land — `resolveFirstRunClass()` exists in `core/execution/first-run-policy.ts` and is
already used by `run-node.ts`. The field-plan endpoint simply never got wired to it.

**Impact:** the UI cannot warn "testing this really sends an email" *before* the user clicks Test.
The warning only appears after the server refuses the first attempt.

### RC-7 — Whole-page scroll and an unwanted entrance animation

- `NodeChecklistRail.tsx:63` — `lg:sticky lg:top-6` inside a page that scrolls as one. Same defect
  already fixed on the node-selection screen; **reuse that solution, do not re-derive it.**
- `FieldOwnershipStage.tsx:42` — `motion.div initial/animate` entrance.
- The wizard already excludes this step from the Intent Context card
  (`AutonomousAgentWizard.tsx:5585`, `step !== 'field-ownership'`), so vertical budget is healthier
  here than on node selection.

**Reference implementation to copy** (`CapabilityStage.tsx`, landed and tested):
`lg:h-full` chain from the content area down, panes `lg:h-full lg:min-h-0 lg:overflow-y-auto
lg:overflow-x-hidden`, grid `lg:flex-1 lg:min-h-0`, action bar `fixed bottom-0 left-0 right-0` with
`pb-20` on the root reserving its footprint. **No `calc(100vh - …)`, no `min-h` floors** — both were
tried and both failed (see that file's comments).

### RC-8 — The AI-build stage is the ONE place that is not node-agnostic

`worker/src/services/ai/stages/property-population-stage.ts` hardcodes three node types:

```ts
:453   if (nodeType === 'if_else') { …inject conditions format + operator list… }
:476   if (nodeType === 'switch')  { …inject routing expression + cases format… }
```

and the system prompt itself (`:420-435`) embeds literal rules for `if_else`, `switch` and `loop`
as prose. These are **pre-existing violations** of §2.2 and of CLAUDE.md's single-source-of-truth
rule. They are not introduced by this plan, and Phases A–E do not touch them.

**Why it matters here:** this file is exactly what §5.2 asks you to investigate. If the AI-build
chain does turn out to need work, the fix must **not** add a fourth `if (nodeType === …)`.

**The correct seam already exists.** The contract carries per-field `role`
(`unified-node-contract.ts:189`, `:253`) and `essentialForExecution` (`:289`), and
`getBuildValueContext()` (`unified-node-registry.ts:2368`) already returns `targetFields` with
`{ role, essentialForExecution }` — the stage builds a `FIELD_ROLES` prompt hint from it generically.
The if_else / switch hints belong in that same registry-driven path, expressed as field metadata
(e.g. a role meaning "routing expression" or "condition list") rather than a node-type check.

Treat de-hardcoding as **optional cleanup**, in scope only if §5.2 proves a real defect. Do not
refactor it speculatively — but do not extend it either.

---

## 4. Implementation phases

### Phase A — Collapse to one node-first list *(unblocks everything)*

**Frontend only.**

1. Add `ownershipNodesInOrder`: one `NodeQuestionGroup` per node, merging structural + secret
   questions, ordered by **workflow execution order** (topological — take it from
   `pendingWorkflowData.nodes`, which is already ordered, rather than re-deriving).
   - Keep `ownershipClass` on each question; it becomes a *within-card* concern, not a section.
   - Keep `structuralByNode` / `secretsByNode` on `ctx` until Phase A is green, then delete.
2. `FieldOwnershipStage.tsx` — replace the two `OwnershipSection`s with one node-ordered list.
3. `NodeOwnershipCard` — render all of a node's groups, credential rows included, in the new order.
4. `FIELD_GROUP_ORDER` → `['aiFilled', 'required', 'credential', 'aiRuntime', 'optional']` (RC-4).
5. `buildRailEntries` — key becomes `nodeId` alone; **one entry per node**.

**Acceptance**
- A workflow with 7 nodes shows exactly 7 rail entries and 7 cards.
- No node label appears twice.
- Rail order == card order == execution order.
- `fieldRowKeyContract.test.tsx` passes **unmodified**.

**Tests** — extend `FieldOwnershipStage.test.tsx`: a node with both structural and secret fields
produces one card containing both.

---

### Phase B — Master-detail selection

**Frontend only.**

1. `selectedNodeId` state, defaulting to the first node needing attention.
2. Rail click selects instead of scrolling.
3. Right pane renders the selected node only.
4. Rail keeps per-node status + outstanding count so nothing is hidden by selection.

**Acceptance** — clicking a rail entry swaps the right pane; only one card is mounted; keyboard
navigable; below `lg`, fall back to the stacked list (no selection) rather than trapping the user.

---

### Phase C — "Tested" as a first-class state

**Backend (small):**
- `field-plan.ts:227` — replace `firstRunClass: null` with `resolveFirstRunClass(def, operation)`
  (RC-6). Import from `core/execution/first-run-policy.ts`. No new endpoint.

**Frontend:**
1. `RailNodeStatus` → add `'tested'` and `'needs-attention'`.
2. `buildRailEntries()` — accept `runResults`; a node is `tested` when
   `runResults[nodeId].status === 'passed'`, `needs-attention` on `needs_attention`.
   `not_exercised` (untaken branch) counts as **satisfied**, not tested — do not block on it.
3. Pass `ctx.runResults` into the rail (currently available, never forwarded).
4. On any field edit, clear that node's result **and its descendants'** — mirror
   `invalidateFrom()`'s semantics client-side so a stale "tested" cannot survive an edit.
5. Use `firstRunClass` to warn *before* the click for `write` / `destructive`.

**Acceptance** — a passed test flips the rail dot; editing a field on node 2 clears node 2 **and**
node 3's tested state; `not_exercised` never renders as failure.

---

### Phase D — Gate the build on tested + filled

**Frontend, plus one product decision (§5).**

`disabled={ctx.outstandingCount > 0}` becomes
`disabled={outstandingCount > 0 || untestedRequiredNodes.length > 0}`, with a tooltip naming what
is missing — same pattern as `CapabilityStage`'s `blockedReason`.

**A hard gate will trap users** — see §5.1. Implement **tested-or-explicitly-skipped**.

**Acceptance** — the button explains *why* it is disabled, never just sits dead.

---

### Phase E — Layout and animation

1. Apply the `CapabilityStage` scroll pattern (RC-7): independent rail/detail panes, pinned
   full-width action bar, `pb-20` footprint. Copy the pattern; do not invent a new one.
2. Remove the `motion.div` entrance on `FieldOwnershipStage.tsx:42`.
3. Hover: **the specific element causing overlap is not yet identified.** Candidates are the rail's
   `hover:bg-muted/30` (`NodeChecklistRail.tsx:82`), the framer-motion entrance, and
   `NodeConnectPopover` (`NodeOwnershipCard.tsx:117`). **Ask the user which element before
   changing anything** — guessing here means removing a hover state that was not the problem.

**Suggested order:** A → E → B → C → D. Phase E early gets the visual complaints fixed while the
structural work continues.

---

## 5. Decisions the user must make

### 5.1 What "all nodes tested" means when a node cannot be tested

A `destructive` node needs consent; some nodes cannot be safely test-run at all. A hard
"every node must be tested" gate makes such a workflow **impossible to build**.

**Recommendation:** *tested-or-explicitly-skipped*, with the skip recorded per node and shown in the
rail. Preserves the guarantee without the dead end.

### 5.2 Whether the AI-build chain actually has a bug

The user's requirement — "if the form collects an email, Gmail's recipient should be
`{{$json.email}}`, not empty" — **appears to already be implemented**
(`property-population-stage.ts:412` + `getBuildValueContext`).

**Do not rebuild this speculatively.** First reproduce: generate a form → Gmail workflow and inspect
the Gmail node's `to` field.
- If it correctly references the form field → **no work needed**, close the item.
- If not → the bug is in `getBuildValueContext` or prompt construction. A targeted fix, not a
  re-architecture.

**If it does need a fix, it must be registry-driven (RC-8).** The user's requirement is explicitly
"all nodes, no node-specific code". Adding `if (nodeType === 'gmail')` — or any fourth node-type
branch — fails the requirement even if the Gmail case then works. Express the need as field
metadata in the registry (`role`, `essentialForExecution`) so every node that ever declares that
role benefits.

### 5.3 Whether "Secrets & fill mode" should survive as a visual grouping

Phase A removes it as a *section*. It can remain as a group **inside** each node's card (the
`credential` bucket already exists). Confirm the user wants credentials shown inline per node rather
than collected in one place.

---

## 6. Verification

```bash
# Frontend — single files only. NEVER run the full suite (crashes the user's machine).
cd ctrl_checks
npx vitest run src/components/workflow/field-ownership/__tests__/FieldOwnershipStage.test.tsx
npx vitest run src/components/workflow/field-ownership/__tests__/fieldRowKeyContract.test.tsx
npx vitest run src/components/workflow/field-ownership/__tests__/NodeTestAction.test.tsx

# Type-check — the ROOT tsconfig has "files": [] and checks NOTHING.
# `npx tsc --noEmit` exits 0 while the file is syntactically broken. Always use -p:
npx tsc --noEmit -p tsconfig.app.json
```

`tsconfig.app.json` currently reports **~444 pre-existing errors repo-wide**. Filter to the files you
touched; do not attempt to fix the rest.

```bash
# Worker
cd worker
npm run type-check
npx jest src/api/workflow-build/__tests__/run-node.test.ts
```

### Universality check — run this before declaring any phase done

```bash
# Must return ZERO new matches in the field-ownership step and the files Phases A–E touch.
# property-population-stage.ts:453,476 are the two KNOWN pre-existing hits (RC-8) — the count
# must not grow beyond them.
rg -n "nodeType === '|node\.type === '|switch \(nodeType|switch \(node\.type" \
  ctrl_checks/src/components/workflow/field-ownership \
  ctrl_checks/src/lib/wizard-field-ownership.ts \
  worker/src/api/workflow-build \
  worker/src/core/graph \
  worker/src/core/execution
```

A phase that needs a node-type check is a phase whose requirement belongs in the registry instead.

---

## 7. Out of scope

- Node-selection screen (`CapabilityStage`) — landed, tested, working. Reference only.
- Credential connection flow — handled at node selection; the card's connect affordance is a safety
  net for pipeline-injected nodes, not a second gate.
- The AI generation pipeline itself, unless §5.2 reproduces an actual defect.
