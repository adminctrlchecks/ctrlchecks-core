# Task — Field-ownership step: node-first layout + test-gated build

Read **`FIELD_OWNERSHIP_NODE_FIRST_PLAN.md`** at the repo root first, in full, before writing any
code. It contains measured root causes with `file:line` evidence, an inventory of what is already
built, and phase-by-phase acceptance criteria.

## Before you start

1. **§1 "What ALREADY WORKS — do NOT rebuild".** The backend for this feature is largely complete:
   the field-plan API, upstream `{{$json.x}}` attribution, the sequential AI-build stage, per-node
   test execution with consent, and branch-aware chained runs all exist and work. Consume them.
2. **§2 "Invariants that fail SILENTLY".** In particular §2.1: inline edits must keep writing under
   `question.id` keys via `resolveFieldValueKey()` / `resolveFieldValueTarget()`. Break this and the
   UI still looks correct while the workflow saves with **none** of the user's values.
   `fieldRowKeyContract.test.tsx` must keep passing **unmodified**.
3. **§2.2 "Universality" — this is a hard requirement, not a preference.** This must work for
   **every node type, with no per-node code**. No `if (node.type === …)` / `switch (node.type)`
   anywhere outside the registry. Grouping, ordering, status and gating are driven by registry data
   and graph structure only, so a node added next year works with zero changes here.
   - The field-ownership frontend currently has **0** node-type branches. Keep it at 0.
   - `property-population-stage.ts:453,476` has **2 pre-existing** ones (RC-8). Phases A–E do not
     touch that file. Do not extend it, and do not refactor it speculatively.
   - If a phase seems to need a node-type check, the requirement belongs in the registry as field
     metadata (`role`, `essentialForExecution`) instead. See RC-8 for the exact seam.
   - Run §6's **universality check** (`rg` one-liner) before declaring any phase done.

## The core defect (§3, RC-1)

Each node is rendered **twice** — once under "Workflow structure", once under "Secrets & fill mode" —
because `ownershipQuestions` is split by `ownershipClass` and the rail flat-maps both sections. That
is why the rail reads "11 of 13" for ~7 nodes, with Form Trigger at both #1 and #6.

Node-first ordering is impossible until this is collapsed into one node-ordered list. **Start there.**

## Order of work

Do **Phase A** (collapse to one node-first list), then **Phase E** (layout + remove the entrance
animation), then **B → C → D**. Phase E early so the visible problems go away while the structural
work continues.

For Phase E's scroll layout, copy the pattern already landed in
`ctrl_checks/src/components/workflow/CapabilityStage.tsx` — an `lg:h-full` chain with each pane
`lg:min-h-0 lg:overflow-y-auto lg:overflow-x-hidden`. Do **not** re-derive it: `calc(100vh - …)` and
`min-h` floors were both tried on that screen and both failed, for reasons recorded in its comments.

## Stop and ask me about

- **§5.1** — what "all nodes tested" means for a node that cannot be safely test-run. I want
  tested-or-explicitly-skipped, but confirm the UX with me before building the gate.
- **§5.2** — do **not** rebuild the AI-build chaining speculatively. Reproduce first: generate a
  form → Gmail workflow and check whether Gmail's recipient already references the form's field. If
  it does, close the item. If it does not, the fix must be **registry-driven** — adding
  `if (nodeType === 'gmail')` fails my universality requirement even if Gmail then works.
- **§5.3** — whether credentials should stay inline per node or be collected in one place.
- **Phase E hover issue** — I reported that hovering causes a panel overlap, but the exact element
  was never identified. Ask me which element I mean before removing any hover state.

## Verification

- Frontend tests: **single files only** — `npx vitest run <path>`. Never run the full suite.
- Type-check: `npx tsc --noEmit -p tsconfig.app.json` from `ctrl_checks/`. The **root** `tsconfig.json`
  has `"files": []` and checks nothing — plain `npx tsc --noEmit` exits 0 even on a syntactically
  broken file. There are ~444 pre-existing errors repo-wide; filter to the files you touched.
- Worker: `npm run type-check`.

Work one phase at a time. Show me the result of each phase before starting the next.
