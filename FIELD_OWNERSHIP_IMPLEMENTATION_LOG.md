# Field Ownership Redesign — Implementation Log

Durable record for the phased implementation of `FIELD_OWNERSHIP_VERIFIED_BUILD_PLAN.md` (§8 protocol).
**This file is the memory of record.** Context will be compacted during this run; anything needed later must be written here, not merely remembered.

**Rule for this file: it records only work that has actually been done.** Plans are marked as plans. Anything unverified is stated as unverified.

**Convention:** commits are referenced by their **subject line**, not by hash — a hash written into the log before committing is a guess, and one written after can be invalidated by an amend. `git log --oneline` is the source of truth for hashes.

Started: 2026-07-28
Baseline commit: *Baseline: node-selection UI redesign WIP + field-ownership build plan*
(That commit contains the prior session's uncommitted node-selection work, committed first so each phase lands as a clean single-purpose commit.)

---

## Phase checklist

- [x] **0a** — Baseline capture
- [x] **0b** — Extraction, zero behaviour change
- [x] **0c** — Characterization tests on the extracted unit
- [x] **1** — Intent Context off this step + two-column layout
- [ ] **2** — Inline connect at node selection
- [ ] **3** — `/api/workflow-build/field-plan` + four-group accordions
- [ ] **4** — Inline editing + parity report (gates Phase 5)
- [ ] **5** — Delete `configuration` + `credentials` steps
- [ ] **6** — `firstRunClass` safety layer + fan-out sampler (backend only)
- [ ] **7a** — Provider-error → field guidance layer
- [ ] **7b** — `/api/workflow-build/run-node` (⚠ MANDATORY PAUSE BEFORE THIS PHASE)
- [ ] **8** — `/api/workflow-build/run` chained orchestration + seeded execution #1

---

## Step 0 — Orientation (2026-07-28) ✅ DONE

Read `FIELD_OWNERSHIP_VERIFIED_BUILD_PLAN.md` in full (871 lines) and `CLAUDE.md`. Re-verified every anchor §8 Step 0.3 names.

### Anchors — actually checked against the working tree

| Anchor | Plan said | Verified current | Status |
|---|---|---|---|
| `AutonomousAgentWizard.tsx` lines | 8,876 | **8,876** | ✅ exact |
| Field-ownership block opens | `:6584` | **`:6584`** (`{step === 'field-ownership' && pendingWorkflowData && (`) | ✅ |
| Field-ownership block closes | `:7218` | **`:7217`** (`)}`) | ✅ ±1 |
| `Proceed To Credentials` | `:7211` | **`:7210`** onClick, **`:7211`** label | ✅ |
| `configuration` block opens | `:7220` | **`:7220`** | ✅ |
| `showIntentContextCard` | `:5729` | **`:5729`** decl, **`:5849`** render | ✅ |
| `isCapabilitySelectionFlow` | `:5734` | **`:5734`** | ✅ |
| Wizard wrapper `max-w-*` | `:5795` | **`:5795`** — already a conditional (`max-w-7xl` for `capability-node-selection`, else `max-w-5xl`) | ✅ |
| `proceedFromOwnershipStage` | `:5338` | **`:5338`** | ✅ |
| `manualConfigurationQuestions` | `:1420` | **`:1420`**; id-key `:1473`; clamp effect `:1479-1483` | ✅ |
| `handleBuild` → `attach-inputs` | `:3449`/`:3462` | **`:3462`** | ✅ |
| `handleBuild` → `attach-credentials` | `:3562` | **`:3612`** | ⚠️ **drifted +50** |
| `handleConnectGoogleOAuth` | `:3312`, dead | **`:3312`**; grep shows no JSX reference | ✅ dead confirmed |
| `CredentialStatusPanel` import | `:32`, unused | **`:32`** | ✅ |
| `checkOAuthReturn` | `:868-925` | **`:868`** decl, **`:930`** invoked | ✅ |
| `WizardStep` union | `:239` | **`:239`** — includes `'credentials'`, `'configure'`, `'configuration'` | ✅ |
| `setStep('field-ownership')` sites | `:2821,:2830,:4282`, live `:5666` | **`:2821, :2830, :4282, :5666, :5675`** | ⚠️ **extra site at `:5675`** |
| `CapabilityStage.tsx` | badge exists | **400 lines**; `CredentialBadge` `:54-73`, used `:122` | ✅ |
| `lib/wizard-field-ownership.ts` | exists, 209 lines | **209 lines** | ✅ exact |

### Where the plan had drifted

1. **`attach-credentials` is at `:3612`, not `:3562`.** Around it (`:3595-3609`) is a guard that *skips* the call entirely when credentials are missing and falls through to navigate. Phase 5 must not assume that call always fires.
2. **A fifth `setStep('field-ownership')` exists at `:5675`**, which §3.2 does not list — immediately after the live `:5666` one. Phase 5's cleanup must inspect it rather than trust §3.2's list as complete.
3. **The `max-w-7xl` wrapper is already conditional**, so Phase 1 extends a condition rather than replacing a literal.

Everything else the plan asserted was accurate.

### Baseline verification state (before any phase)

- `ctrl_checks/` `npx tsc --noEmit` → **clean, 0 errors**
- `ctrl_checks/` `npm run lint` → **0 errors, 58 warnings** — all pre-existing. **58 is the regression baseline.**
- Working tree: only `worker/public/node-library.json` dirty — a regenerated export artifact (drops `credentialType: null` / `capabilities: []`), unrelated to this project. Left uncommitted deliberately.

### Standing constraints for every phase

- **Never run `npm test` / any full suite locally** — it has crashed this machine (memory `feedback_testing_strategy`). ~~Consequence: every test this project produces is unexecuted.~~ **SUPERSEDED during Phase 0c** — the user approved single-file `npx vitest run <path>`, so tests written here are actually executed. See the "Standing constraint CHANGED" note below Phase 0b.
- `components/connections/*` — compose, never modify.
- `executeNode()` (`worker/src/api/execute-workflow.ts`) — never modify.
- `GET /api/workflows/:id/missing-items` — additive only.
- Shared state (`inputValues`, `credentialValues`, `fillModeValues`, `appliedFieldGuidanceExamples`, `pendingWorkflowData`) passed as props, never relocated.
- Registry single-source-of-truth: no `switch (node.type)` outside the registry.
- One commit per phase.
- ⚠️ The two `AutonomousAgentWizard.*.test.ts` files mirror logic instead of importing it — not evidence of anything (memory `project_wizard_test_mirror_trap`).

---

## Phase 0a — Baseline capture

### Plan

**Goal:** a reference for "unchanged" that Phase 0b's extraction can be diffed against.

**The plan's prescribed approach does not work here, and the code wins.** §5 asks for a throwaway debug route mounting the step with fixture data. Checked against the source: the field-ownership block at `:6584-7217` is **not a component** — it is inline JSX inside `AutonomousAgentWizard`, closing over component state and `useMemo` derivations. There is nothing importable to mount. Making it mountable *is* Phase 0b, so a baseline built that way would already contain the refactor it is meant to check. Mounting the whole wizard is ruled out by §3.9.

**Adapted approach — structural baseline instead of a pixel baseline:**

1. Copy `:6584-7217` verbatim to `docs/field-ownership-baseline/0a-block.tsx.txt`.
2. Generate a mechanical structural inventory — JSX element openings in order, `className` strings, text literals, handler bindings, and the identifiers the block reads — via a committed script, to `docs/field-ownership-baseline/0a-structure.md`.
3. After 0b, regenerate the inventory from the new components and diff.

Rationale for the substitution: a structural inventory catches a dropped `onClick` or an altered conditional, which a screenshot cannot. The 0b acceptance criterion changes from "screenshot identical" to "inventory identical". This is a deliberate deviation from the plan, recorded here.

**Verification:** baseline artifacts exist; no debug route or throwaway file left in the tree.

### What actually happened ✅ DONE

Implemented as planned above.

**Created:**
- `ctrl_checks/scripts/field-ownership-baseline.mjs` (198 lines) — AST-based inventory generator using the TypeScript compiler API (`ts.createSourceFile`, `ScriptKind.TSX`), not regex. Committed and reusable for the post-0b comparison.
- `ctrl_checks/docs/field-ownership-baseline/0a-block.tsx.txt` — verbatim `:6584-7217` (633 lines). Boundaries confirmed correct: opens `{step === 'field-ownership' && pendingWorkflowData && (`, closes `)}`.
- `ctrl_checks/docs/field-ownership-baseline/0a-structure.md` — the inventory.

**Measured inventory (real numbers):**

| Category | Count |
|---|---|
| JSX element openings | **99** |
| `className` values | **90** |
| JSX text literals | **31** |
| JSX string copy (literals in expressions) | **48** |
| Handler bindings | **13** |

The 13 handler bindings are captured with their **full expression text**, e.g.
`Switch.onCheckedChange=(v) => setFieldEnabledOverrides((prev) => ({ ...prev, [fieldEnabledKey]: v, }))`.
That is the set 0b must reproduce exactly — a dropped or altered `onClick` is precisely what a screenshot could not have caught.

**Comparison method for 0b — corrected while building it.** My plan said "diff the inventory, require identical". That is wrong by construction: after extraction the same elements live across several files, so a single linear sequence cannot match. The script therefore emits **sorted multisets**, and the acceptance criterion is stated in the generated file itself:
- text literals and JSX string copy — **identical sets** (losing one means user-visible copy vanished);
- classNames — **superset** allowed (a wrapper may be added), any *missing* one is drift;
- handler bindings — **identical count and expression set**;
- element tags — expected to *gain* the new component tags; any missing host element is drift.

**Verified:**
- ✅ Script output is **deterministic** — ran twice, `diff` clean.
- ✅ Block boundaries correct (checked first and last lines against the source).
- ✅ `git status` shows **no debug route and no throwaway file** — none was created, since the adapted approach needs none.
- ✅ No application source touched in this phase.

### 🔑 Material finding — §3.6's shared-state list is wrong, and this shrinks Phase 0b

The identifier read-set showed something the plan asserts the opposite of. §3.6 (and §8's Phase 0b instruction) name **five** shared values that "must be passed as props": `inputValues`, `credentialValues`, `fillModeValues`, `appliedFieldGuidanceExamples`, `pendingWorkflowData`.

Grepping the extracted block for each:

| Identifier | Reads in block |
|---|---|
| `inputValues` | **0** |
| `credentialValues` | **0** |
| `appliedFieldGuidanceExamples` | **0** |
| `fillModeValues` | 2 |
| `pendingWorkflowData` | 3 |

**Three of the five are never read by the field-ownership block — only their setters are** (`setInputValues`, `setCredentialValues`, `setAppliedFieldGuidanceExamples` all appear). So `FieldOwnershipContext` needs those three as **setters only**, not values.

This matters twice over:
1. It shrinks the prop surface and removes three large objects from the memo dependency array, so re-render behaviour stays closer to the inline original.
2. The underlying constraint is **unchanged and still absolute** — those setters write the maps `handleBuild` reads, so the state itself still must not be relocated. The finding narrows *what gets passed*, not the rule.

Also confirmed absent from the block's read-set despite appearing in §3.6's derived/handler lists: `guideSelectedField` (written, never read), `blockingOAuthCredentials`, `ownershipQuestions`, `nodeLabelById`. §3.6 was a hand-written approximation; the generated read-set supersedes it as 0b's input list.

**Could not verify:** no visual/pixel baseline exists, by design. If 0b introduces drift that is purely visual (CSS cascade or ordering effects that leave the tree identical), this method will not catch it.

**Commit:** *Phase 0a: capture structural baseline of the field-ownership block*

---

## Phase 0b — Extraction, zero behaviour change

### Plan

Read the full 633-line block before planning. The real structure is:

```
block
├── blueprint panel                    (IIFE, reads pendingWorkflowData.update)
├── walk-through button + progress bar (single use)
├── sections.map ['structural','secrets']
│   └── section.groups.map             → one card per node
│       ├── totals reduce              ← DEAD (see below)
│       ├── node header
│       ├── node description           (IIFE)
│       └── group.fields.map           → one row per field
│           ├── header (label, AI badges, field-help button, enable Switch)
│           ├── OFF collapsed preview
│           ├── ON compact ownership hint
│           ├── <FieldOwnershipHelpPanel/>
│           └── ON full controls
│               ├── unlock Switch
│               ├── locked / current-value previews
│               └── credential help    (IIFE)
└── Proceed button
```

**Component split — deviates from the plan's four names, matching the real structure:**

| Plan named | Building | Why |
|---|---|---|
| `FieldOwnershipStage` | `FieldOwnershipStage.tsx` | same |
| — | `BlueprintPanel.tsx` | the blueprint IIFE is self-contained and ~65 lines |
| `FieldGroup` | `OwnershipSection.tsx` | the real grouping unit is a *section* (structure vs secrets), not a "field group". Renamed for accuracy; Phase 3's accordions will introduce a genuine `FieldGroup` inside the card. |
| `NodeOwnershipCard` | `NodeOwnershipCard.tsx` | same |
| `FieldRow` | `FieldOwnershipRow.tsx` | same role |
| — | `CredentialHelpDisclosure.tsx` | the credential-help IIFE, ~55 lines, only renders for credential rows |

**`FieldOwnershipContext` — built from the 0a read-set, not §3.6.** Per the 0a finding, `inputValues` / `credentialValues` / `appliedFieldGuidanceExamples` are passed as **setters only** (never read). Full membership:

- values: `pendingWorkflowData`, `requiredSectionStyles`, `globalWalkActive`, `ownershipStructuralByNode`, `ownershipSecretsByNode`, `ownershipEffectiveModes`, `fillModeValues`, `fieldPlaneRows`, `fieldEnabledOverrides`, `nodeDescriptions`, `fieldDescriptions`, `appliedExampleKeys`, `fieldHelpExpanded`, `credHelpExpanded`, `credHelpViewMode`, `fieldDescFetchedRef`
- callbacks: `isCredentialUnlocked`, `startGlobalWalkThrough`, `fetchNodeDescription`, `fetchFieldDescriptions`, `proceedFromOwnershipStage`
- setters: `setFieldEnabledOverrides`, `setCredentialUnlockOverrides`, `setFieldHelpExpanded`, `setAppliedExampleKeys`, `setGuideSelectedField`, `setCredHelpExpanded`, `setCredHelpViewMode`, `setFillModeValues`, `setInputValues`, `setCredentialValues`, `setAppliedFieldGuidanceExamples`

**One intentional deletion — `totals`.** The per-card `totals` reduce (block lines 159-189, 31 lines) computes `{you, aiBuild, aiRun, locked}` and **is never read** — `grep -c '\btotals\b'` over the block returns exactly 1, the declaration. It is dead code. Its only call is `isCredentialUnlocked(question)`, a pure `useCallback`, so dropping it has no observable effect. Dropping it rather than transcribing dead code into a new file.

**Rules held:** no React context (changes re-render semantics); shared state passed, never relocated; `FieldOwnershipHelpPanel.tsx` reused unmodified; `lib/wizard-field-ownership.ts` extended, not replaced.

**Verification:** regenerate the inventory over the new component files and compare per the criteria 0a's generated doc states — text/string sets identical, classNames a superset, handler bindings identical, no host element lost. Plus `tsc --noEmit` and `lint` at the 58-warning baseline.

### What actually happened ✅ DONE

Executed as planned, with one correction to my own plan.

**Correction — plain object, not `useMemo`.** My plan said to assemble `fieldOwnershipContext` in a `useMemo` with the full read-set as deps. That is wrong for this phase's contract: the code being replaced was **inline JSX, re-evaluated on every render**. A memo would re-render the step *less* often than before — a behaviour change, in the one phase whose entire promise is zero behaviour change. Shipped a plain object literal, which matches the original's re-render semantics exactly. Noted in a comment at the declaration site.

**Files created** (`ctrl_checks/src/components/workflow/field-ownership/`):

| File | Lines |
|---|---|
| `FieldOwnershipStage.tsx` | 100 |
| `FieldOwnershipRow.tsx` | 336 |
| `BlueprintPanel.tsx` | 96 |
| `NodeOwnershipCard.tsx` | 72 |
| `CredentialHelpDisclosure.tsx` | 68 |
| `OwnershipSection.tsx` | 47 |
| `types.ts` | 117 |
| `index.ts` | 17 |

**`lib/wizard-field-ownership.ts` extended** 209 → 298 lines with pure helpers lifted out of the JSX, bodies unchanged: `resolveFieldModeKey`, `resolveFieldUnlockKey`, `resolveFieldEnabledKey`, `resolveFieldHelpKey`, `resolveAppliedExampleKey`, `isOwnershipRowLocked`, `isOwnershipRowEnabled`, `resolveOwnerLabel`, `resolveWorkflowPreviewText`. The `mode_*` / `unlock_*` key formats now live in one place — they are attach-inputs keys, so that matters beyond tidiness.

**`AutonomousAgentWizard.tsx`:** 8,876 → **8,292** lines (−584). The 634-line block is now three lines guarding `<FieldOwnershipStage ctx={fieldOwnershipContext} />`. The now-unused `FieldOwnershipHelpPanel` import was removed (it is imported by `FieldOwnershipRow` instead).

**Dead code dropped as planned:** the 31-line per-card `totals` reduce. Re-confirmed unused before deleting (`grep -c '\btotals\b'` over the block = 1, the declaration).

### Verification — the structural comparison

Regenerated the inventory over the six new files and diffed against `0a-structure.md` (`docs/field-ownership-baseline/0b-structure.md`):

| Category | 0a | 0b | Verdict |
|---|---|---|---|
| Element tags | 99 | 104 | ✅ **+5 exactly** — the five new component tags. **No host element lost.** |
| classNames | 90 (75 distinct) | 90 (75 distinct) | ✅ only difference is the access path `requiredSectionStyles.fieldOwnership.*` → `ctx.sectionStyles.*`, same values |
| JSX text literals | 31 | 31 | ✅ **IDENTICAL set** — no user-visible copy lost |
| Handler bindings | 13 | 13 | ✅ **all 13 present, one-to-one**, each the same expression with `ctx.` prefixing |
| JSX string copy | 48 | 58 | ⚠️ investigated — see below |

**The string-copy delta is fully accounted for, no loss:**
- *Added (21):* all import module specifiers (`'@/lib/fillMode'`, `'./types'`, …). The inline block had no imports; the script counts them. A script artifact, not drift.
- *Missing (8):* every one verified present elsewhere — `'You'`/`'AI Build'`/`'AI Runtime'` and the reduced counts of `'locked'` / `'manual_static'` / `'runtime_ai'` / `'buildtime_ai_once'` moved into the new lib helpers (confirmed by grep: `AI Build`×6, `AI Runtime`×5, `'You'`×5, `'locked'`×1, … in `wizard-field-ownership.ts`); `'field-ownership'` is the step guard, which correctly stayed in the wizard.

**Also verified:**
- ✅ `npx tsc --noEmit` — clean, exit 0.
- ✅ `npm run lint` — 0 errors, **58 warnings, exactly the baseline**. (It first read 65: seven `eslint-disable @typescript-eslint/no-explicit-any` directives I added were unnecessary, since that rule is not enabled in this config. Removed them.)
- ✅ `FieldOwnershipHelpPanel.tsx` reused **unmodified** — `git diff` shows no change to it.
- ✅ No React context introduced.

**Surprise — `tsc` caught nothing.** The plan predicted tsc would be the primary net for prop-wiring errors in this phase, and I expected several. It passed first try. That is *not* reassurance: `OwnershipQuestion` is `any` and `pendingWorkflowData` is `any`, so much of the surface tsc would have policed is untyped by construction. **The structural inventory, not tsc, is what actually verified this phase.** Worth knowing before Phase 4, where the plan again leans on tsc.

**Could not verify:** no runtime render, and no pixel comparison. The inventory proves the JSX tree, its copy, and its handler bindings survived; it cannot prove CSS resolves identically or that the plain-object choice reproduces re-render timing in practice.

**What this changes for later phases:**
- Phase 1 edits `FieldOwnershipStage.tsx` (100 lines), not a 634-line inline block.
- Phase 3's accordions land in `NodeOwnershipCard.tsx`/a new `FieldGroup`; Phase 4's inline editing lands in `FieldOwnershipRow.tsx`.
- `FieldOwnershipContext` in `types.ts` is the single choke point for every later phase's new inputs: one field on the interface, one line in the wizard's object literal.
- The `0b-structure.md` inventory is the new "before" reference for Phase 1.

**Commit:** *Phase 0b: extract field-ownership block into presentational components*

---

## 🔄 Standing constraint CHANGED during Phase 0c — tests can now actually be run

The log's Step 0 constraint said every test this project produces would ship unexecuted. **That is no longer true.**

Asked the user whether the "never run `npm test`" rule (memory `feedback_testing_strategy`) covers single-file runs, since `CLAUDE.md` documents `npx vitest run <path>` as the single-file command and the recorded crash was the full 468-file suite. **Answer: single-file runs are approved; `npm test` is still forbidden.**

Measured: a 33-case component file runs in **4.65s** with no memory pressure. The memory file and `MEMORY.md` index have been updated to record the scoped exception.

**Consequence for every remaining phase:** tests get **written and run**. "Written but unexecuted" is no longer an acceptable phase outcome, and the Phase 6 safety layer — the gate on 7b — can be genuinely proven rather than asserted.

**Non-regression baseline established (all pass, unmodified):**

```
npx vitest run \
  src/components/connections/__tests__/connectionAvailability.test.ts \
  src/components/connections/__tests__/credential-guidance.test.tsx \
  src/components/workflow/__tests__/WorkflowConnectionGate.setup.test.tsx \
  src/components/workflow/__tests__/WorkflowHeader.setup.test.tsx \
  src/hooks/__tests__/useWorkflowConnectionStatus.test.ts
→ 5 files, 26 tests, all passing (2.65s)
```

Run this after every phase from here on.

---

## Phase 0c — Characterization tests

### Plan

Render the extracted components for real and lock in their behaviour, following `PropertiesPanel.inspector.test.tsx` (the proven pattern for a store-coupled component in this repo).

Constraints observed from the repo, not assumed: `vite.config.ts` has **no `setupFiles`**, and `@testing-library/jest-dom` is **not a dependency** — so assertions use `.toBeTruthy()` / `.toBe()`, never jest-dom matchers. `@testing-library/user-event` is also absent, so interaction goes through `fireEvent`.

**Mocking strategy — mock the heavy leaves, keep the logic under test real:**
- `@/lib/field-doc-resolver` → stub. It pulls the entire `@/docs-content` bundle in for what is, in a test, always a "no doc" answer.
- `framer-motion` → `motion` Proxy returning a plain `div`.
- `../FieldOwnershipHelpPanel` → recording stub, so the row's prop contract to it can be asserted (that panel has its own genuine test already).
- `ResizeObserver` stub for Radix.
- **Not mocked:** `lib/wizard-field-ownership` (including the nine helpers Phase 0b added), `lib/wizard-field-plane`, `lib/fillMode`, `lib/actionable-field-example`. Mocking those would test the mocks.

Shared `buildCtx(overrides)` factory producing a valid `FieldOwnershipContext`, so later phases extend one function instead of many literals.

### What actually happened ✅ DONE

`field-ownership/__tests__/FieldOwnershipStage.test.tsx` — **33 tests, all passing** (4.65s).

Coverage by area:

| Area | Cases | What is locked in |
|---|---|---|
| Structure | 5 | both section headings; step heading; per-section empty state; one card per node with fields under the right node; structural vs secret separation |
| Proceed action | 1 | button invokes `proceedFromOwnershipStage` |
| Walk-through | 2 | passes **both** groupings to `startGlobalWalkThrough`; active walk shows `Node · Field (2/4)` and hides the idle label |
| Node description | 2 | requests with the section-namespaced key `desc_structural_node1`; renders text and flips to "Hide description" |
| Enable toggle | 3 | off by default, **on** when AI-prefilled; explicit override wins; writes under `fieldEnabled_<nodeId>_<fieldName>` |
| Ownership label | 4 | `manual_static`→You, `buildtime_ai_once`→AI Build, `runtime_ai`→AI Runtime; hidden while the row is off |
| Locked rows | 3 | locked row hides the ownership hint; an *unlocked* unlockable credential is not locked; unlock switch appears on a locked unlockable row |
| Field help | 4 | first open sets `fieldhelp_*` **and** fetches with request key `node1:spreadsheetId`; already-fetched keys are not re-requested; help panel receives the right open/mode/enabled/locked props; mode change routes to `mode_<nodeId>_<fieldName>` |
| Selection | 1 | clicking a row reports `{nodeId, fieldName}` to the guide |
| Credential disclosure | 5 | present only for credential rows; simple by default; technical view; AI guidance from `discoveredCredentials` wins over the fallback copy |
| Blueprint | 3 | absent without data; overview + node narratives; structural errors and warnings |

**The key-format assertions matter beyond this phase.** Several tests call the captured state-updater and assert the resulting object, e.g.:

```ts
expect(updater({})).toEqual({ fieldEnabled_node1_spreadsheetId: true });
expect(updater({})).toEqual({ mode_node1_spreadsheetId: 'buildtime_ai_once' });
```

`mode_*` and `unlock_*` are **attach-inputs keys**. §6a-2 calls key-format drift the single highest-risk detail in the project; these now fail loudly if it happens. Phase 4 extends this to `config_*` / `cred_*`.

**Verified:**
- ✅ **33/33 passing** — actually executed, not merely written.
- ✅ `npx tsc --noEmit` clean.
- ✅ `npm run lint` — 0 errors, 58 warnings (baseline).
- ✅ Non-regression suite: 26/26 passing, unmodified.

**Surprise:** every test passed on the first run. Given that Phase 0b's `tsc` also passed first try, the honest read is that the extraction was genuinely mechanical — but it is worth recording that these 33 tests were written *after* the refactor, so they characterize the extracted code, not the original. They protect phases 1-8; they were never capable of catching a 0b mistake. The structural inventory was the only thing that could, and did.

**What this changes for later phases:** `buildCtx()` is the extension point. Phase 1 adds rail assertions, Phase 3 group/accordion assertions, Phase 4 the key-shape contract test.

**Commit:** *Phase 0c: characterization tests for extracted field-ownership components*

---

## Phase 1 — Intent Context removal + two-column layout

### Plan

1. `AutonomousAgentWizard.tsx` — add `step !== 'field-ownership'` to `showIntentContextCard` (now at `:5729`). Add no replacement button: `handleWizardClose` is already the escape hatch (§3.4).
2. Extend the wrapper conditional (now `:5842`) so `field-ownership` also gets `max-w-7xl`. Per Step 0, this is already a conditional — extend, do not replace.
3. `FieldOwnershipStage.tsx` — two-column shell: sticky rail ~340px + right column.
4. New `NodeChecklistRail.tsx`. **Node name + status only, no group counts** (§6a/G9).
5. Rail status derived from data available today; explicitly a placeholder for 7b's real run status.

**Verification:** tsc; lint at the 58-warning baseline; the 33 existing tests must still pass (they are now a real net); new rail tests; structural comparison showing additions only.

### What actually happened ✅ DONE

All five items done, plus one architectural correction found by lint.

- **Intent Context off this step.** One added clause on `showIntentContextCard`, with a comment on why (field ownership is a working surface, not a review screen; "Edit intent"/"Restart" there only invite losing work). No new button.
- **Wrapper widened:** `step === 'capability-node-selection' || step === 'field-ownership'` → `max-w-7xl`.
- **Two-column shell** in `FieldOwnershipStage.tsx`: `flex flex-col lg:flex-row gap-6 items-start`, rail then `w-full lg:flex-1 min-w-0`. The proceed button moved inside the right column so it tracks the cards rather than spanning under the rail.
- **`NodeChecklistRail.tsx` (105 lines)** — numbered nodes in order, status dot, name, status text, header reading "N of M ready". Clicking an entry scrolls its card into view via a new `id={fo-card-<section>_<nodeId>}` on `NodeOwnershipCard`.
- **Responsive:** collapses to one column below `lg`, matching node-selection. §6c-D flagged responsive behaviour as unspecified; this is the choice made.

**Correction found by lint — rail logic moved to `lib/`.** My first version exported `buildRailEntries` from the component file, which tripped `react-refresh/only-export-components` (warnings 58→59). That warning was pointing at a real violation of CLAUDE.md's rule that wizard business logic lives in `lib/wizard-*.ts`. Moved `buildRailEntries`, `RailEntry`, `RailNodeStatus` and the satisfied-row predicate into `lib/wizard-field-ownership.ts` (now 401 lines), taking an explicit input object rather than the whole `ctx` so `lib` does not depend on a component type. Warnings back to 58. The lint rule caught an architecture problem, not a style nit.

**Status vocabulary shipped** (placeholder, replaced in 7b): `waiting` / `needs input` / `ready`. A row counts as satisfied when it is locked, switched off, AI-owned, or already has a value — so "needs input" means specifically *"you turned this on and it is still empty"*.

### Verification

- ✅ **42/42 tests pass.** The 33 from Phase 0c still pass unchanged — that is the first time this project's safety net has actually done its job, confirming the layout change altered nothing about behaviour. 9 new rail tests: node listing order across both sections, empty rail, needs-input vs ready vs waiting, AI-owned counts as satisfied, locked counts as satisfied, "N of M ready", the scroll-target id exists, and an explicit assertion that **no group counts appear** (guarding G9).
- ✅ `npx tsc --noEmit` clean.
- ✅ `npm run lint` — 0 errors, **58 warnings** (baseline restored).
- ✅ Non-regression suite: **26/26 passing, unmodified.**
- ✅ Structural comparison vs the 0a baseline — additive as intended: elements 99→119, classNames 90→102, text literals 27→30 distinct (`Steps`, `of`, `ready`), handler bindings 13→**14** (the 13 originals plus the rail scroll button).

**Comparison tooling improved.** The first pass reported 37 "removals" that were mostly count changes, because it compared the rendered `name ×N` lines as a set. Added a proper `--compare` mode to `scripts/field-ownership-baseline.mjs` that compares by **name** and reports count changes separately. With it, every genuine removal is explainable:

| Removed | Why |
|---|---|
| 2 classNames (`requiredSectionStyles.fieldOwnership.*`) | renamed to `ctx.sectionStyles.*`, same values |
| `rounded border border-border/60 p-3 space-y-3`, `space-y-8` | gained `scroll-mt-6` and the layout classes — deliberate Phase 1 edits |
| `You` / `AI Build` / `AI Runtime` | moved to `resolveOwnerLabel()` in lib (0b) |
| `field-ownership`, `step` | the step guard, correctly still in the wizard |
| `acc`, `aiBuild`, `aiRun`, `you`, `reduce`, `totals`, `rowLocked` | the dead `totals` reduce deleted in 0b |
| `hasAiPrefilledValue`, `fromNodeSnapshot`, `fromQuestionDefaultPreview`, `snapshotConfigFieldToString` | moved into `isOwnershipRowEnabled()` / `resolveWorkflowPreviewText()` in lib |
| `ownershipStructuralByNode`, `ownershipSecretsByNode`, `requiredSectionStyles`, `fieldOwnership` | now reached through `ctx` |

**Could not verify:** the visual result in a browser. The tests prove structure and status logic; they cannot prove the sticky rail behaves well at every viewport, or that 340px is the right width against real node names.

**Surprise:** the Intent Context removal was genuinely one line with no fallout, because 0b had already severed this block's coupling to the surrounding layout. Doing Phase 1 before the extraction would have been materially messier.

**What this changes for later phases:**
- The rail is where Phase 7b's run status renders — `RailNodeStatus` is the type to extend, in `lib`, not the component.
- Phase 3 adds group counts to rail entries; `buildRailEntries`' input object is the extension point.
- `lib/wizard-field-ownership.ts` is now the home for this step's logic (401 lines). Keep new logic there — lint enforces it.

**Commit:** *Phase 1: remove Intent Context from field-ownership, add two-column layout*
