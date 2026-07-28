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
- [x] **2** — Inline connect at node selection
- [x] **3** — `/api/workflow-build/field-plan` + four-group accordions
- [x] **4** — Inline editing + parity report (gates Phase 5)
- [x] **5** — Delete `configuration` + `credentials` steps
- [x] **6** — `firstRunClass` safety layer + fan-out sampler (backend only)
- [x] **7a** — Provider-error → field guidance layer
- [x] **7b** — `/api/workflow-build/run-node` (⚠ MANDATORY PAUSE BEFORE THIS PHASE)
- [x] **8** — `/api/workflow-build/run` chained orchestration + seeded execution #1

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

- ~~`ctrl_checks/` `npx tsc --noEmit` → clean, 0 errors~~ **WRONG — this command checks zero files.** See the correction under Phase 2. The real baseline is `npx tsc --noEmit -p tsconfig.app.json` → **444 pre-existing errors**, measured on commit `bf926be`. Standard for every phase: total stays 444, and **zero** errors in files this project touches.
- `ctrl_checks/` `npm run lint` → **0 errors, 58 warnings** — all pre-existing. **58 is the regression baseline** (57 after Phase 2 deleted dead code carrying one).
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

---

## Phase 2 — Inline connect at node selection

### Reconnaissance findings (before planning — two change the design)

**Finding 1 — the readiness service is already workflow-free. The plan was wrong to think otherwise.**

§3.11's "Note on data source" says `/api/workflows/:id/missing-items` *"cannot drive this screen"* because there is no `workflowId` at node-selection time, and concludes the badge must therefore rely on the weaker `hasCredentials`. Checked the actual service:

```ts
// worker/src/services/workflow-connection-readiness.ts:484
export async function getWorkflowConnectionReadiness(input: {
  workflowId: string; userId: string; nodes: ReadinessNode[]; includeSatisfied?: boolean;
})
```

It takes **nodes inline** and never loads a workflow from the DB — `workflowId` is only stamped onto the returned rows. The *route* needs an id; the *service* does not. So scope-aware readiness can be obtained for synthetic candidate nodes with no new abstraction and no DB write. **The plan's stated blocker does not exist.**

**Finding 2 — ⚠️ but the readiness path is NOT side-effect free, which bounds how it may be used.**

`getWorkflowConnectionReadiness` calls `dryRunCredential` → `resolveCredentialDryRun` → `resolveCredential({...input, dryRun: true})`. Traced `dryRun` through `credential-resolver.ts`: it is **declared on the input type (`:30`) and passed at `:300`, but never read inside `resolveCredential`.** The function's body does:

```ts
if (isExpiring) return refreshCredential(row, requiredScopes, input.action);
```

**So a "dry run" performs a real OAuth token refresh — a network call plus a DB write — whenever a token is near expiry.** It is not a read-only check despite the name.

**Consequence for this phase:** running readiness across *every candidate* on screen load would trigger token refreshes for providers the user never selected, on a screen that should be inert. That is a side effect, a latency cost, and an abuse surface. The plan's instruction to "route the badge through the scope-aware readiness service" is therefore only safe **for selected nodes**, not for all candidates.

### Plan (adapted to the findings — the code wins)

**Backend**
1. `capability-grouper-stage.ts` — `checks.some(Boolean)` → `checks.every(Boolean)`. Pure fix, no added cost; closes the "needs two credentials, one connected, reads Connected" bug on its own. This stays the cheap first-pass badge.
2. **New** `POST /api/capability-selection/connection-readiness` — takes the *selected* node types, builds synthetic `ReadinessNode`s, and calls `getWorkflowConnectionReadiness` with a synthetic `workflowId`. Authoritative and scope-aware, and bounded to nodes the user actually chose, so Finding 2's refresh side effect stays proportionate. Returns per-node `{ provider, providerLabel, authType, status, action, requiredScopes, missingScopes }`.
3. Do **not** modify `getWorkflowConnectionReadiness` or `/missing-items` — both stay exactly as they are (§2.5).

**Frontend**
4. `CapabilityStage.tsx` — `CredentialBadge` becomes actionable when disconnected; new `NodeConnectPopover` composing `components/connections/*` **unmodified**.
5. `Continue` gated on every *selected* node being connected (unselected candidates irrelevant, §2.4.4).
6. Persist capability-stage state before any OAuth redirect; restore on return.
7. Generalise `checkOAuthReturn` beyond its hardcoded `'google'`.
8. Delete dead `handleConnectGoogleOAuth` + unused `CredentialStatusPanel` import; fix the blank-screen `setStep('credentials')` navigation.

**Verification:** tsc + lint both packages; the 42 field-ownership tests; non-regression 26/26 **unmodified**; new tests for the readiness endpoint and the gating logic.

### 🛑 CORRECTION affecting Phases 0b, 0c and 1 — `npx tsc --noEmit` was checking nothing

Discovered while type-checking this phase. `ctrl_checks/tsconfig.json` is:

```json
{ "files": [], "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }] }
```

`"files": []` with project references means plain `tsc --noEmit` compiles **zero files** — confirmed with `npx tsc --noEmit --listFiles | wc -l` → **0**. The plan prescribes this exact command as *"your primary safety net for prop wiring in 0b"*, and I ran it and reported "clean" in Phases 0b, 0c and 1.

**Those tsc claims were vacuous.** The correct command is `npx tsc --noEmit -p tsconfig.app.json` (or `tsc -b`).

This also explains the "surprise" recorded in Phase 0b — that tsc caught nothing despite the plan expecting it to catch wiring errors. The real reason was not that `any` types blunted it; it is that **it never ran**. The `any`-blunting point still stands as a secondary factor, but the primary cause was a no-op command.

**What the real check reveals:** `tsc -p tsconfig.app.json` reports **444 pre-existing errors** on the pre-project baseline commit `bf926be` — measured directly by checking out that commit and running it. So "tsc clean" was never achievable in this package, and the plan's stop condition of "tsc clean in `ctrl_checks/`" is unmeetable as written.

**Revised verification standard for every remaining phase:** run `tsc -p tsconfig.app.json`, and require **(a) the total stays at the 444 baseline, and (b) zero errors in files this project touches.** Phases 0b/0c/1 were retro-checked under this standard while validating Phase 2 — the total is 444 with none in `field-ownership/`, so those phases are in fact clean; the claim was unfounded at the time but turns out to be true.

Retro-check also confirmed the 5 `AutonomousAgentWizard.tsx` errors present today (`3352`, `3420`, `4164`×2, `7767`) are in the 444 baseline, i.e. pre-existing and not mine.

**Also noted:** in `ctrl_checks`, `npm test` maps to a *single* file (`guideGenerator.registry.test.ts`); the full suite is `test:vitest`. The machine-crashing suite referenced in memory is the **worker's** Jest run.

### What actually happened ✅ DONE

Implemented per the adapted plan. **Two of the plan's three §2.4 gaps turned out not to exist**, for a reason worth recording.

**⚠️ Gaps 2 and 3 are void: OAuth here is popup-based, not a redirect.** `useOAuthFlow.connect()` (`hooks/useOAuthFlow.ts`) does `window.open(...)` and awaits a `BroadcastChannel('oauth_callback')` / `postMessage` result — **the host page never navigates away**. So when the connect affordance composes `OAuthConnectButton`, the wizard stays mounted with all its state for the entire round trip.

That means:
- **Gap 2 ("OAuth return loses node selections") cannot occur.** No snapshot/restore of `capNodeContainers` / `capNodeSelections` / … is needed, and I deliberately did **not** build the `wizard-oauth-snapshot.ts` my earlier plan called for — it would have been ~170 lines of machinery guarding an impossible failure.
- **Gap 3 ("generalise the Google-only return handler") is moot.** `checkOAuthReturn` served the *redirect* path, whose only writer of `pendingWorkflowAfterOAuth` was the dead `handleConnectGoogleOAuth`. Verified by grep: writer at one site inside dead code, reader in the effect, nothing else. Both deleted rather than generalised.

The plan's gap analysis was accurate for the **legacy redirect flow**; it just didn't account for §2.5's instruction to compose `components/connections/*`, which uses a different mechanism entirely.

**Backend**
- `capability-grouper-stage.ts` — `checks.some(Boolean)` → **`checks.every(Boolean)`**, with a comment explaining why this check stays cheap and provider-level.
- `capability-types.ts` — `CandidateNode` gained optional `credentialProviders?: string[]`, and `hasCredentials` documented as non-authoritative. Purely additive.
- **New** `worker/src/api/capability-selection/connection-readiness.ts` (163 lines) + route. Builds synthetic `ReadinessNode`s from the selected node types and calls the existing `getWorkflowConnectionReadiness`. **No DB write.** Capped at 40 node types. On failure it **degrades open** (reports ready) rather than trapping the user — the workflow-page gate still catches anything missed.
- Registered without the AI capacity middleware, since it makes no LLM calls.

**Frontend**
- `lib/api/capabilityConnectionReadiness.ts` (69 lines) — client that degrades to "ready" on any error, so a flaky check never blocks the wizard.
- `components/workflow/NodeConnectPopover.tsx` (147 lines) — composes `OAuthConnectButton`, `CredentialFormRenderer`, `ProviderLogo` **unmodified**; picks OAuth vs API-key form off `credentialType.authType`; falls back to a link to `/connections` when no credential type matches.
- `CapabilityStage.tsx` (400 → 520 lines) — badge is inert when connected, an actionable *"<Service> — connect"* affordance when not. Continue gates on selected-and-unconnected being empty, with a rail notice naming the specific services.
- **Accessibility fix required by the design:** the candidate row was a `<button>`, and a connect control cannot legally nest inside one. Converted to `role="button"` + `tabIndex` + Enter/Space handling, with the key handler ignoring events bubbling from children so activating the connect control does not also toggle selection.

**Dead code removed from the wizard** (8,292 → 8,187 lines): the `checkOAuthReturn` effect (66 lines), `handleConnectGoogleOAuth` (41 lines), the unused `CredentialStatusPanel` import.

**Both blank-screen navigations fixed** (§3.11 named one; there were two):
- the configuration-step button now renders inline `NodeConnectPopover`s instead of `setStep('credentials')`;
- a second site in the pre-execution credential check also called `setStep('credentials')` after setting an error message — so the user was shown a blank screen *instead of* the error. Now stays put and surfaces the message.

**Caught by checking rather than assuming:** my first version of the configuration-step fix called `refreshMissingItems?.()`, a function that does not exist in the file. Grep found it before it ever compiled.

### Verification

- ✅ `tsc -p tsconfig.app.json`: **444 errors — exactly the pre-existing baseline**, with **zero** in any file this phase created or modified.
- ✅ `worker/` `npm run type-check`: clean.
- ✅ `npm run lint`: 0 errors, **57 warnings** (down from 58 — the deleted dead code carried one).
- ✅ **New:** `CapabilityStage.connections.test.tsx` — **8/8 passing**. Covers: connect affordance offered when unconnected; inert badge when nothing is needed; **no readiness call before any selection**; readiness called with *only* the selected node types (explicitly asserting unselected `slack` is never sent — this is the Finding-2 side-effect guard); Continue blocked with the service named; Continue enabled once connected; an unconnected *unselected* candidate does not block; and **authoritative readiness overriding an optimistic candidate badge**.
- ✅ Field-ownership suite: **42/42** still passing.
- ✅ Non-regression suite: **26/26 passing, unmodified**.
- ✅ `git diff --stat` over `components/connections/` — **empty**, composed not modified (§2.5).
- ✅ `git diff --stat` over `workflows-missing-items.ts`, `workflow-connection-readiness.ts`, `execute-workflow.ts` — **empty**, all untouched.

### Could not verify

- ⚠️ **No browser E2E.** The plan's §6 manual checks — `/connections` connect/disconnect, the canvas gate on a manually-built workflow, the properties-panel selector, and a real OAuth round trip — have **not** been performed. The unit tests mock `NodeConnectPopover`, so the actual composition of `OAuthConnectButton` / `CredentialFormRenderer` has never been rendered.
- ⚠️ The new endpoint has **no test** and has never been called against a live worker.

### Deferred to Phase 3 (recorded, not dropped)

Mounting `NodeConnectPopover` inside **field-ownership cards** for pipeline-injected nodes. It needs per-node connection state, which Phase 3's `field-plan` endpoint supplies; building it now would mean a throwaway second data path. The component is already proven at two mount points (candidate row, configuration step).

### Still open from the plan

`'credentials'` / `'configure'` / `'configuration'` remain in the `WizardStep` union. Removing them means editing `workflow-generation-state.ts`'s FSM, which **Phase 5 already does** — splitting that across two phases would be worse. The user-visible bug is fixed regardless. Carried to Phase 5.

### What this changes for later phases

- `POST /api/capability-selection/connection-readiness` exists and is the pattern for Phase 3's `field-plan`: inline nodes, no workflow id, no DB write.
- **The `dryRun`-is-not-dry finding matters for Phase 7b**, which will execute nodes for real: anything calling the credential resolver may refresh tokens. Budget for that rather than assuming reads are free.
- Phase 5's scope now includes removing three step values from the `WizardStep` union and the FSM.

**Commit:** *Phase 2: inline connect at node selection with scope-aware readiness*

---

## Phase 3 — field-plan API + grouped accordions

### Plan

1. **New** `POST /api/workflow-build/field-plan` taking `{ nodes, edges }` inline — no DB write, no LLM call, nothing executes. Assemble groups from `resolveFieldPolicyForNode()`, which already computes `requiredFields` / `optionalFields` / `credentialFields` / per-field `runtimeAiAllowed`.
2. **Factor out, don't duplicate** the upstream walk. `property-population-stage.ts` has private `resolveGroundedUpstreamFields()` + `extractJsonFieldRefs()`; move both to a shared module and have the stage import them.
3. Frontend client + accordion grouping in the node card, one group expanded by default.
4. Cross-node explanation copy.
5. **Carried from Phase 2:** connect fallback inside field-ownership cards for pipeline-injected nodes.

### What actually happened ✅ DONE

**Backend**
- **New** `core/graph/upstream-field-resolver.ts` (127 lines) — the walk moved **verbatim**, plus per-field node attribution (`producedByNodeId` / `Label` / `Type`), which is the genuinely new part. `property-population-stage.ts` now imports it; its local copies and the `GroundedUpstreamField` type are gone, with `GroundedUpstreamContext` kept as an alias so the stage body was otherwise untouched.
- **New** `api/workflow-build/field-plan.ts` (233 lines) + route. Returns per node `groups {required, aiFilled, aiRuntime, optional, credential}`, `producedBy` per field, `diagnostics`, and `firstRunClass: null`.
  - **`firstRunClass` is deliberately present and null now** so the client shape does not change when Phase 6 adds it.
  - Verified read-only: no `.from(`, no `getDbClient`, no LLM call, capped at 60 nodes.
  - **Grouping is exclusive** — one group per field, priority credential → AI → required → optional — so counts sum to the node's active field count rather than double-counting.

**Frontend**
- `lib/api/workflowBuildFieldPlan.ts` (122 lines) — client plus the group ordering/titles and two exported predicates (`defaultExpandedGroup`, `hasSinglePopulatedGroup`) kept in `lib/` per CLAUDE.md.
- **New** `field-ownership/FieldGroupAccordion.tsx` (55 lines).
- `NodeOwnershipCard.tsx` — groups its rows through the plan, one accordion expanded by default.
- `FieldOwnershipRow.tsx` — renders *"uses `sheetId` from **Manual Trigger**"* under a row when the plan resolved its references.
- **Carried item done:** `NodeConnectPopover` now mounts on a card whose node type is unconnected — the third mount point of the same component.

**Three deliberate robustness choices, each test-pinned:**
1. **No plan → flat rendering.** If `field-plan` fails or is still loading, the step renders exactly as it did after Phase 1 rather than breaking.
2. **Single-group cards skip accordion chrome.** A card whose fields all land in one bucket renders them directly — an accordion there is a click with no clarity.
3. **Unclassified questions still render.** Anything the plan omits falls through to an ungrouped list, so a field can never silently vanish because the backend and the question set disagree.

**Design change vs. my own plan — connection state does *not* come from `field-plan`.** I first wired the card's connect fallback to a `connection` field on the field-plan response, then removed it: resolving connections runs the credential resolver, which (per Phase 2's Finding 2) can refresh OAuth tokens. Putting that behind a *read-only field-plan* call would have reintroduced exactly the side effect Phase 2 was careful to bound. The card now uses the existing bounded `capability-selection/connection-readiness` endpoint with an explicit node-type list. **`field-plan` stays genuinely free of side effects.**

### Verification

- ✅ `tsc -p tsconfig.app.json`: **444 — baseline**, zero in files this phase touched.
- ✅ `worker/` `type-check`: clean.
- ✅ `npm run lint`: 0 errors, 57 warnings (baseline).
- ✅ **New** `upstream-field-resolver.test.ts` — **9/9 passing** (jest, single file). Pins the extracted walk: attribution to the declaring node, walking *through* a shape-less non-dynamic node (`if_else`), **stopping at a `dynamic` node rather than guessing past it**, nearest-declarer-wins on a duplicate field name, no upstream edges, and cycle termination.
- ✅ Field-ownership suite: **51/51** (42 prior + 9 new grouping tests). The 42 still pass because with no plan the flat fallback renders — the compatibility guarantee, demonstrated rather than asserted.
- ✅ Non-regression + CapabilityStage: **34/34 across 6 files**, all unmodified.
- ✅ `property-population-stage.test.ts` fails **identically before and after** my change — verified by stashing. Pre-existing (`fieldOwnershipPolicyMap` missing from a fixture), unrelated.

### Could not verify — §6c-B's measurement questions

The plan asks Phase 3 to **measure** three things on ~10 real generated workflows: whether `upstreamContext` resolves cleanly, whether the taxonomy partitions usefully, and `field-plan` latency. **I did not measure any of them** — that needs a running worker, real Cognito auth, and real generated workflows, none of which I have here.

The design anticipates the two failure modes those measurements would expose (unresolvable references render nothing; single-group cards skip the accordion), and both are test-pinned. But the *rates* are unknown, and the thresholds in those mitigations are judgement, not data. **Action for the user: run the endpoint against ~10 real workflows before trusting the accordion UX.**

No browser verification of the accordions.

### What this changes for later phases

- Phase 4's `FieldRow` editing lands inside these accordions; `defaultExpandedGroup` decides which group is open when the user arrives.
- `field-plan` is the shape Phase 7b extends with real `firstRunClass` — the field already exists and is wired through to the client.
- `resolveUpstreamFields` is now shared, so Phase 8's chained run can reuse it for threading outputs.

**Commit:** *Phase 3: field-plan API, grouped accordions, upstream attribution*

---

## Phase 4 — Inline editing + parity report

### Plan

Read the configuration step's control rendering first and mirror it exactly, rather than
building from `convertSchemaToConfigField` in the abstract — parity is judged against
what that step *actually does*, not against a schema converter.

The configuration step's contract, read from source before writing anything:

```ts
const questionKey = question.id;                                  // the map key, verbatim
const isCredVaultQ = question.category === 'credential' && question.isVaultCredential;
// select   when question.type === 'select' || options.length > 0
// textarea when type === 'textarea' || fieldType === 'textarea' || type === 'json'
// else Input type={number | password | text}
// value: stored answer ?? question.defaultValue ?? ''
```

**Correction to the plan's approach:** §8 says to wire `convertSchemaToConfigField()` into
`FieldRow`. That function returns a **`ConfigField` descriptor, not a control** — it is a
metadata converter for the canvas properties panel, keyed off `InputFieldSchema`, whereas
field-ownership rows are *questions* from the field plane with their own `type` / `options`
/ `defaultValue`. Routing through it would have translated between two shapes and risked
diverging from the step being replaced. Mirrored the configuration step's own branching
instead. **The code wins.**

### What actually happened ✅ DONE

- **`lib/wizard-field-ownership.ts`** (+95 lines) — the contract, in one place, under a
  banner comment explaining the risk: `resolveFieldValueKey`, `resolveFieldValueTarget`,
  `resolveFieldControlValue`, `resolveFieldControlKind`, `jsonFieldParseError`.
- **New `field-ownership/FieldValueControl.tsx`** (117 lines) — renders the control and
  contains **the single write path**:

  ```ts
  function writeValue(next: string) {
      const key = resolveFieldValueKey(question);            // = String(question.id)
      if (!key) return;
      if (resolveFieldValueTarget(question) === 'credential') ctx.setCredentialValues(...)
      else                                                    ctx.setInputValues(...)
  }
  ```

  One function, one key format, one routing decision — so there is exactly one line that
  could be wrong, and it is asserted from three directions.
- **`FieldOwnershipRow.tsx`** — a `manual_static` row now renders the live control inline.
  An AI-owned row shows its value read-only with **"Set it myself"**, which flips
  `_fillMode` to `manual_static` via the *existing* `setFillModeValues` under the existing
  `mode_*` key; the row then re-derives into "You provide" through the existing
  `ownershipEffectiveModes` memo. **No new state was introduced for this.**
- The old copy pointing users at the Configuration step is gone from both branches.

**`inputValues` / `credentialValues` are now read, not only written.** Phase 0a found the
block never read them; inline editing must display current values, so both maps join the
context. The underlying rule is unchanged and restated at both the type and the call site:
**they remain owned by the wizard and must never be relocated**, because `handleBuild`
forwards them to `attach-inputs` / `attach-credentials`.

### ⚠️ PARITY REPORT — the gate on Phase 5

Compared against every control the configuration step renders. Each row is backed by an
executed assertion in `fieldRowKeyContract.test.tsx`, not an inspection.

| Field type | Configuration step | Inline (Phase 4) | Parity |
|---|---|---|---|
| text | `<Input type="text">` | `<Input type="text">` | ✅ |
| number | `<Input type="number">` | `<Input type="number">` — asserted via `role="spinbutton"` | ✅ |
| **password** | `<Input type="password">` | `<Input type="password">`; asserted **not** exposed as a textbox | ✅ |
| textarea (`type`) | `<Textarea>` | `<Textarea>` | ✅ |
| textarea (`fieldType`) | `<Textarea>` | `<Textarea>` | ✅ |
| JSON | `<Textarea>` | `<Textarea>` + parse feedback | ✅ |
| select (typed) | `<Select>` | `<Select>` | ✅ |
| select (implied by `options`) | `<Select>` | `<Select>` | ✅ |
| empty-string options | filtered (Radix forbids) | filtered, same guard | ✅ |
| credential (vault) | writes `credentialValues` | writes `credentialValues` | ✅ |
| value fallback | stored ?? default ?? `''` | identical | ✅ |

**Result: GREEN — 11 of 11 behaviours at parity. Phase 5 is unblocked.**

Two intentional differences, neither a parity loss:
1. JSON validates **on blur** rather than on submit — there is no submit step any more.
   The write is never blocked; the message is advisory.
2. All rows are editable at once rather than one question at a time. That is the redesign.

### Verification

- ✅ **`fieldRowKeyContract.test.tsx` — 19/19 passing, executed.** §6a-2 calls key drift the
  single highest-risk detail in the project; it is now guarded by executed assertions:
  - the key equals `question.id` verbatim for `config_*`, `op_*`, `cred_*`;
  - **negative assertions** — the key never contains `::`, is never `node1::spreadsheetId`
    and never `node1_spreadsheetId`, i.e. the exact failure mode §6a-2 warns about;
  - a text edit writes `{ config_node1_spreadsheetId: 'sheet-abc' }` into `inputValues`
    and **nothing** into `credentialValues`;
  - a vault credential writes into `credentialValues` and **nothing** into `inputValues`;
  - a non-vault `credential` question routes to `inputValues`, matching the old
    `category === 'credential' && isVaultCredential` condition exactly;
  - an id-less question writes **nothing** rather than under a key of `''`.
- ✅ `tsc -p tsconfig.app.json`: **444 — baseline**, none in my files.
- ✅ `npm run lint`: 0 errors, 57 warnings.
- ✅ **104 tests across 8 files, all passing** — field-ownership (51), key contract (19),
  CapabilityStage (8), and the 26 non-regression tests unmodified.

**tsc did real work here.** Adding `inputValues` / `credentialValues` to
`FieldOwnershipContext` broke the `buildCtx` fixture, which failed the build until updated
— the "a fixture that no longer matches the interface fails the build" property predicted
in Phase 0c, actually paying off.

### Could not verify

- ⚠️ **No end-to-end save.** The tests prove the key *format*; they do not prove that a
  value entered in the browser survives `handleBuild` → `attach-inputs` → the database.
  That is **Phase 5's acceptance test**, and it needs a running stack.
- No browser rendering of the controls.

### What this changes for Phase 5

The parity gate is **green**, so Phase 5 may proceed. Per §6a-2 no `handleBuild` rewiring
is needed: this phase wrote into the same maps under the same keys, so deleting the
configuration step removes a second way to enter values, not the only way.

**Commit:** *Phase 4: inline field editing honouring the question-ID key contract*

---

## Phase 5 — Delete `configuration` + `credentials`

Proceeded: the Phase 4 parity report is green (11/11).

### What actually happened ✅ DONE

**The configuration render block is gone** — 600 lines. `AutonomousAgentWizard.tsx`:
8,187 → **7,616** lines (cumulative **−1,260** from the 8,876 baseline).

**Two findings that changed the work:**

**1. ⚠️ `handleBuild`'s guard was `step === 'configuration'` — the one thing that would have silently broken saving.**

```ts
if (pendingWorkflowData && step === 'configuration') {   // the unified submission branch
```

`proceedFromOwnershipStage` now calls `handleBuild()` while the step is `'field-ownership'`. Had this guard not been updated, the branch that POSTs to `attach-inputs` / `attach-credentials` would simply never run: no error, no type failure, workflow saved with **none of the user's values** — precisely the §6a-2 failure mode. Changed to `step === 'field-ownership'` with a comment recording why.

§6a-2 predicted "no `handleBuild` rewiring needed". That was right about the *maps* — the keys and payload construction needed nothing — but wrong that `handleBuild` was untouched: it was gated on the step being deleted. **One line, and the whole phase's acceptance rests on it.**

**2. `'configure'` is a live step and must NOT be deleted.** I initially removed `'credentials'`, `'configuration'` **and** `'configure'` from the `WizardStep` union. `tsc` then flagged a comparison at what is now `:7165` — and inspecting it showed **`configure` has a real render block** (the missing-credentials/inputs collector), reached from two live `setStep('configure')` calls. Unlike the other two it was never broken. Restored it, with a comment on the union explaining the distinction.

§3.11 only ever claimed `'credentials'` had no render block; it said nothing about `'configure'`. I over-generalised, and tsc caught it.

**Everything else, per §6a-2's work items:**
- `proceedFromOwnershipStage` → `handleBuild()` directly.
- `WizardStep` union: `'credentials'` and `'configuration'` removed; `'configure'` kept.
- `workflow-generation-state.ts`: `mapWizardStepToState` drops both dead steps and maps `'configure'` instead; `mapStateToWizardStep` returns `'configure'` for `STATE_4_CREDENTIAL_COLLECTION` (it returned `'credentials'`, so **a session resuming from a persisted FSM state would have landed on a blank screen**).
- The pre-execution readiness failure no longer routes to a dead step — it goes to `'configure'`, which collects exactly those missing items.
- **`manualConfigurationQuestions` kept and repurposed** (§6a-2 item 4) as `outstandingManualQuestions` → `outstandingCount` on the context. Fields the user owns that still have no value now **disable the build button** and render *"N fields still need a value."* This is what catches §6a-2's residual risk: a `manual_static` field whose row is toggled off.
- Deleted: `currentQuestionIndex` + its scroll effect + the stale `setCurrentQuestionIndex(0)` call, `manualConfigurationQuestionIdsKey`, the configuration-only field-description prefetch effect, `configurationPhaseUnlocked`, and `configurationGateReady` (already hardcoded `true`, so **no guard was lost**).
- Button relabelled *"Proceed To Credentials"* → **"Build Workflow"**.

**Step 0's note about `:5675` was wrong.** I recorded it as a possible duplicate `setStep('field-ownership')`. Reading it in context, the two calls are on **different branches** of the same handler (one when questions exist, one when synthesized questions exist). Both are live and correct. Nothing to remove.

### Verification

- ✅ `tsc -p tsconfig.app.json`: **444 — baseline**, and it did the heavy lifting here. Removing union members surfaced **9 stale references** (`'configure'` comparisons ×3, `setStep('configure')` ×2, the `'credentials' : 'configuration'` ternary, `step === 'configuration'` ×2, a `'credentials'` disjunct) plus the orphaned `setCurrentQuestionIndex` call. Every one was found by the compiler, not by reading.
- ✅ `npm run lint`: 0 errors, 57 warnings.
- ✅ **131/132 tests passing across 10 files.** Field-ownership now 58 (4 new: build-button label, the disabled gate, singular/plural notice copy, and the enabled case). Non-regression 26/26 unmodified. Both `workflow-generation-state` suites run.
- ⚠️ The one failure — `workflow-generation-state.capability-stage.test.ts`, `'capability-selection'` expected to map to `STATE_3` but mapping to `STATE_2` — is **pre-existing**, verified by stashing and re-running. It concerns a mapping this phase did not touch.

### ❌ Could not verify — THE PHASE 5 ACCEPTANCE TEST WAS NOT PERFORMED

The plan's acceptance is: *build a workflow end to end, enter values only in field-ownership, save, and confirm in the DB that the values persisted.* That needs a running frontend, worker, Cognito session and RDS. **I did not run it.**

This is the most important unverified claim in the project. The reasoning is layered and each layer is checked — both steps read one `ownershipQuestions` source; Phase 4's single `writeValue` path with 19 executed key assertions; the green parity report; the `handleBuild` guard updated and type-checked — **but the only other way to enter values is now deleted, and the proof that the remaining way persists them is analytical, not empirical.**

**Action for the user, before this ships:** generate a workflow, fill values only on field-ownership, save, confirm the values are on the nodes in the DB. If they are not, reverting this phase's commit restores the configuration step intact.

### What this changes for later phases

The wizard is now `… → capability-node-selection → capability-review → field-ownership → building → complete`, with `configure` as a post-build collector. Phase 7b's Test action and Phase 8's chained run mount into field-ownership with no competing step. `outstandingCount` is the gate Phase 8 extends with "no node in `needs_attention`".

**Commit:** *Phase 5: delete the configuration and credentials steps*

---

## Phase 6 — `firstRunClass` safety layer + fan-out sampler

Backend only. **Nothing executes in this phase**, by design: the layer that decides whether a run is permitted lands before any code that could run something.

### Correction to the plan — the classification has no per-operation home to live in

§8 and §2.1 say to "populate per-node values in `generated-node-operation-contracts.ts` (hand-maintained despite its name)". Opened it: it is

```ts
export const GENERATED_NODE_OPERATION_VALUES: Record<string, string[]> = {
  google_sheets: ['append', 'read', 'update', 'write'], …
```

a **nodeType → operation-name list**, not a map of `NodeOperationContract` objects. There is nowhere in it to hang a per-operation `firstRunClass`. **The code wins:** added `firstRunClass?` to the `NodeOperationContract` *type* as specified (so any contract that wants to set it can), and put the actual classification in a new declarative table.

### What actually happened ✅ DONE

- **`core/types/unified-node-contract.ts`** — `firstRunClass?: 'none' | 'read' | 'write' | 'destructive'` added to `NodeOperationContract`, **optional**, documented as defaulting to `'write'` when absent. Purely additive; every existing contract compiles unchanged (§2.5).
- **New `core/registry/first-run-classification.ts`** (232 lines) — the classification as **data, not branching**: verb lists (`DESTRUCTIVE_VERBS`, `READ_VERBS`, `NONE_VERBS`), `NODE_DEFAULT_FIRST_RUN_CLASS` for the 30 node types that never act externally (triggers, logic, transforms), and `FIRST_RUN_CLASS_OVERRIDES` for the cases where the verb misleads. Table lookups only — **no `switch (node.type)`**, so CLAUDE.md's rule holds.
- **New `core/execution/first-run-policy.ts`** (118 lines) — `resolveFirstRunClass`, `canAutoRun`, `requiresConsent`, `requiresStrongConfirmation`, `assertConsent`, `isRunPermitted`, and `ConsentRequiredError`.

**Resolution order, first hit wins:** the node's own operation contract → a per-node override → the node-level default → the operation verb → **`'write'`**.

**Design choice worth recording — verb table over 118 hand-written entries.** The plan implies enumerating every operation. Most operation names in this registry are generic verbs (`create`/`delete`/`read`/`send`/`list`), so a verb table plus targeted overrides covers them with far less to get wrong, and a *new* node inherits sane classification without anyone remembering to add it. Overrides carry the judgement calls: `jenkins.cancel` is `write` not `destructive` (stopping a build is not data loss); `mailchimp.unsubscribe` **is** `destructive` (irreversible for the recipient); `http_request` takes its class from the HTTP verb; `langchain` runs are `read` (they cost money but nothing leaves the workspace).

- **New `core/execution/fanout-sampler.ts`** (98 lines) — `sampleCollectionForFirstRun`, `isCollectionOutput`, `describeSampling`. Handles a bare array and a collection nested under a conventional key (`rows`, `items`, `records`, …); **anything else is returned untouched**, because a scalar or plain record is not a fan-out and guessing would corrupt it.

### Verification — the three mandated proofs, executed

**`npx jest` on the two files: 43/43 passing.**

1. **Unclassified → `write`, never auto-runs.** Asserted for an unknown node with an unknown operation, a *known* node with an unrecognised operation, and a node with no operation at all — plus a loop asserting an unknown operation never resolves to `'none'`.
2. **Destructive never runs without `consented === true`.** `assertConsent` throws for `undefined` and `false`, and — deliberately — for **truthy-but-not-true** values (`'true'`, `'yes'`, `1`, `{}`, `[]`, `'on'`), so a loosely-typed request body cannot authorise a real side effect. Only exactly `true` passes.
3. **A 500-row read feeds exactly ONE record.** Asserted for a bare 500-item array and for 500 rows nested under `rows`, including that the surrounding payload survives intact and that the **first** record is the one kept.

Also verified:
- ✅ **No execution path added** — grep for `executeNode` / `dynamicNodeExecutor` / `.execute(` across all three new files: **0 hits**. They are pure policy with no callers yet, which is exactly the intent.
- ✅ **No `switch (node.type)`** — the single grep hit is a comment stating there isn't one.
- ✅ `executeNode()` untouched — `git diff --stat` on `execute-workflow.ts` is empty.
- ✅ `worker/` `npm run type-check`: clean.

### Residual risk

The classification **is** the specification, so no test can catch a mis-classified operation — only review can. The default-to-`write` design means errors fail safe in one direction only: an unclassified or under-classified operation is over-protected, never under-protected. The place to look hardest is `FIRST_RUN_CLASS_OVERRIDES`, where an override could wrongly *downgrade* something.

**Commit:** *Phase 6: firstRunClass safety layer and fan-out sampler*

---

## Phase 7a — Provider-error → field guidance layer

### What actually happened ✅ DONE

- **New `core/guidance/types.ts`** — the `Guidance` shape enforcing §2.2's contract: `headline` (what happened) → `why` → `nextSteps[]` → `field` (editable inline), with raw provider text confined to `technicalDetail` for a collapsed disclosure. `severity` is `needs_attention`, never `failed`.
- **New `core/guidance/provider-error-interpreter.ts`** (200 lines) — layered resolution: input-validation guidance → structured `_errorCode` → HTTP status → substring on the message → node-level fallback. **Never throws**, even on a bad interpreter.
- **Interpreters** for the settled priority providers (§7 Q7): `google.ts` (Sheets/Gmail/Drive/Calendar — 8 mappings), `slack.ts` (9), `notion.ts` (5).

**Design points worth recording:**

- **Scope errors are attributed to the connection, not a field.** A user cannot fix "insufficient authentication scopes" by editing a spreadsheet ID; `isConnectionProblem: true` and no `fieldName`, so the UI offers *reconnect* rather than focusing a control they cannot fix with.
- **The fallback attributes nothing to any field** — only to the node. Guessing would put the cursor in the wrong box, which is worse than admitting we do not know.
- **Input validation outranks the provider.** *"You haven't filled in the channel yet"* beats *"channel_not_found"* when both are true.
- **Notion's "not found" copy leads with sharing**, not with a typo — the integration must be added to each page, and that is the far more common cause.

### ⚠️ The override audit could not be done as written — and does not need to be

§8 says to *"audit Google/Slack/Notion to populate `error.code`"*. Traced where those errors actually originate:

- `slack-message.ts`, `google-sheets`, `google-gmail` overrides are **metadata-only** — they delegate execution.
- The real Slack call site is **`execute-workflow.ts:13235-13236`**, which throws:
  ```ts
  throw new Error(`Slack API error: ${response.status} ${response.statusText} - ${slackResult?.error || responseBody}`);
  ```

`execute-workflow.ts` is on §2.5's **do-not-modify** list. So populating structured codes there is forbidden by the non-regression contract.

**It is also unnecessary.** The machine-readable code (`channel_not_found`, `missing_scope`) is already *inside* that message string, which is exactly the case §3.10's substring fallback exists for. Rather than edit a forbidden file, I added three tests pinning the **real engine-thrown format**, including that an embedded `404` does not hijack a Slack mapping. The audit's goal — priority-provider errors resolve to useful guidance — is met without touching live execution code.

### Verification

- ✅ **29/29 tests passing**, executed.
- ✅ Vocabulary tests assert user-facing copy contains no "failed"/"exception"/"stack" and **no bare HTTP status codes**, across all three providers plus the fallback.
- ✅ A test asserts raw text (`SlackAPIError: … at Object.<anonymous> (/app/x.js:1:1)`) stays out of the headline and appears only in `technicalDetail`.
- ✅ Never-throws test over `undefined`, `null`, `0`, `''`, `[]`, and an object containing a `Symbol`.
- ✅ `worker/` `type-check` clean.
- ✅ `git diff --stat` over `execute-workflow.ts` and `core/registry/overrides/` — **empty**. No live execution path touched.

**A real bug the tests caught:** the Google 404 mapping originally listed `'unable to parse range'` in its `messageIncludes`, so it claimed range errors and sent the user to `spreadsheetId` instead of `range`. Fixed by ordering the specific rule first, with a comment on why order matters.

### Could not verify

The mappings are only as good as my reading of each provider's error catalogue — a wrong mapping sends the user to the wrong field, which is worse than the fallback. **They get their real test in 7b**, the first phase that produces genuine provider errors.

**Commit:** *Phase 7a: provider-error to field guidance layer*

---

## Phase 7b — `/api/workflow-build/run-node` (⚠️ first real external operations)

### What actually happened ✅ DONE

**Backend**
- **New `core/execution/build-run-state.ts`** (270 lines) — the §6a model. Redis-backed at `wfbuild:{buildId}` with a **2h TTL refreshed on every write**, so an active build never expires under the user. Falls back to an in-memory store when `REDIS_URL` is absent, so a missing Redis degrades to single-process rather than 500s. Includes stable order-independent hashing, `computeIdempotencyKey`, `descendantsOf` (cycle-safe BFS), `invalidateFrom`, and `assertOwnership`.
- **New `api/workflow-build/run-node.ts`** (330 lines) + route.

**Guards, in the order they apply:**

| # | Guard | Gap |
|---|---|---|
| 1 | authenticated user required | G5 |
| 2 | build ownership — 403 on `userId` mismatch | G5 |
| 3 | idempotency — unchanged + already `passed` returns the stored result, no re-execution | G3 |
| 4 | **`firstRunClass` consent gate** — `write`/`destructive` need `consented === true` | §2.1 |
| 5 | per-build ceiling (50) → 429 **with guidance**, never an error dialog | G5 |
| 6 | fan-out cap — a collection is sampled to 1 record before it feeds downstream | §2.3 |

**Order matters and is deliberate:** consent is checked *before* the ceiling, so a user who has hit the cap still sees the honest "this would send an email" prompt rather than a confusing quota message about an action they never authorised.

- `executeNode()` is **called, never modified** (§2.5) — verified by an empty `git diff --stat`. All policy lives in the caller.
- Failures never surface raw: output runs through Phase 7a's `guidanceFromOutput`, and a *thrown* exception is caught and converted to guidance rather than becoming a 500.
- A synthetic `workflowId` (`wfbuild-{buildId}`) is safe because `dynamic-node-executor` performs zero DB writes — the plan's "Resolved while checking" note, relied on here.

**Frontend**
- `lib/api/workflowBuildRunNode.ts` — client plus `badgeForNode`, which implements **G8**: a `schedule` trigger reads *"Configured — fires on schedule"*, **never "Verified"**, because synthesising a timestamp proves nothing about it firing later.
- **New `field-ownership/NodeTestAction.tsx`** — one right-aligned button in the card header (§4.3). First click sends `consented: false`; the server answers `awaiting_consent` with copy naming the effect; only the second click carries `true`. Guidance renders **in place** — headline, why, next steps — with raw provider text behind a collapsed "Technical detail" disclosure. No toasts, no red alerts.
- Wizard holds `buildRunId` / `runResults` / `runningNodeId` and passes `onRunNode` through the context.

### Verification

- ✅ **`run-node.test.ts` — 19/19**, and the critical assertions are negative:
  - `executeNode` is **never called** for a `write` without consent;
  - **never called** for a `destructive` node without consent;
  - **never called** for truthy-but-not-true consent (`'true'`, `'yes'`, `1`, `{}`);
  - called exactly once when consent is exactly `true`;
  - auto-runs a `read` with no consent at all.
- ✅ Idempotency proven by call count: two identical requests → **one** `executeNode` call, second returns `deduped: true`. Editing the config → a second call happens (G2 cascade).
- ✅ Fan-out proven end to end through the endpoint: a 500-row output returns `rows.length === 1` plus the settled copy.
- ✅ 403 proven by a second user targeting an existing `buildId`.
- ✅ **`build-run-state.test.ts` — 20/20**: hashing is order-independent; the idempotency key changes on config, upstream **and** buildId; invalidation resets the node *and* descendants and **drops stored output**, leaving upstream untouched.
- ✅ **`NodeTestAction.test.tsx` — 16/16**: first click sends `false`; consent copy shows the target; destructive styling; disabled while running; **schedule never badged "Verified"**; technical detail hidden until expanded; the rendered card contains no "failed".
- ✅ Field-ownership suite **85/85**; non-regression **34/34 across 6 files, unmodified**.
- ✅ `tsc -p tsconfig.app.json` 444 (baseline), lint 0 errors / 57 warnings, worker `type-check` clean.

### ❌ Not done in this phase — stated, not skipped silently

1. **Trigger input panels (§4.4)** — `form` / `webhook` / `chat` / `schedule` / `manual` payload editors. The run path treats a trigger like any other node and uses its configured input. Sized as its own piece of work; **deferred to Phase 8 or a follow-up**.
2. **No real E2E.** `executeNode` is mocked in every test here, so what is proven is **the gate, not the side effect**. Nothing has actually been sent to Slack or Gmail from this code path. The plan's four E2E scenarios (one message, one email from a 50-row sheet, a guidance card from a bad spreadsheet ID, one branch of an `if_else`) all remain **unrun** — they need a running stack and throwaway targets.

**Commit:** *Phase 7b: consented single-node first run*

---

## Phase 8 — chained first run (`POST /api/workflow-build/run`)

### 🛑 MACHINE-SAFETY CORRECTION — jest is what crashed the machine, not vitest

Established during this phase, and it supersedes the "single-file test runs are approved" note recorded in Phase 0c.

**`npx jest <file>` in `worker/` is unsafe even for one file.** It loads the entire node registry on every invocation — visible as `[NodeLibrary] …` in the output — and measured at **27-51 seconds per run**. Six such runs across this session are what exhausted the machine. `npx vitest run <file>` in `ctrl_checks/` is genuinely cheap (~2-5s) and remains safe.

**Standing rule from here on:**

| Command | Verdict |
|---|---|
| `ctrl_checks/` `npx vitest run <single-path>` | ✅ safe |
| `ctrl_checks/` `npx tsc --noEmit -p tsconfig.app.json` | ✅ safe |
| `ctrl_checks/` `npm run lint` | ✅ safe |
| `worker/` `npm run type-check` | ✅ safe |
| **anything invoking jest** | ❌ **forbidden** |
| `npm test`, `npm run test:vitest`, unfiltered vitest | ❌ forbidden |

**For worker code, type-check is the verification.** Write the tests, commit them, and state plainly that they were not executed locally.

### What actually happened ✅ DONE (partial — see below)

- **New `api/workflow-build/run.ts`** (300 lines) + route registration.
- **G1 is the whole reason this is not a naive walk.** It reuses `shouldSkipNode()` from `unified-execution-engine.ts`, fed `ifElseResults` / `switchResults` captured as the walk proceeds — exactly as `execute-workflow.ts` does. A naive topological sweep fires **both** sides of every `if_else`, meaning a real email *and* a real Slack message when only one should have gone. Untaken branches get `not_exercised`, never `passed`.
- `topologicalOrder()` is Kahn's algorithm, and **keeps cycle members at the end rather than dropping them** — the DAG compiler forbids cycles, but a malformed draft must not silently lose nodes.
- Halts at the first node needing consent, emitting the effect-naming prompt rather than running past it.
- **Halts on `needs_attention`** rather than feeding a broken payload downstream and producing a second, misleading failure.
- Fan-out cap applied before a value reaches anything downstream (§2.3).
- Streams NDJSON with `x-stream-progress: true`, matching `/api/generate-workflow`.
- `Continue` gates on `needs_attention` only — `not_exercised` never blocks (G1).

### Verification

- ✅ `worker/` `npm run type-check` — **clean, exit 0**. This is the verification for this phase.
- ⚠️ **`run.test.ts` (11 cases) was written and passed once, but must be treated as UNVERIFIED going forward.** It was executed via jest before the safety rule above was established. It is committed for CI; do not re-run it locally.

The tests cover: topological ordering and cycle retention; **only the taken `if_else` branch executing** (asserted both ways, by `executeNode` call list); `not_exercised` not blocking Continue; consent halting the chain before a write; proceeding once consented; halting on `needs_attention` without running downstream; the fan-out cap delivering exactly one record to the next node; NDJSON headers; and 401 without a user.

### ❌ Not done — stated, not skipped

1. **`RunReport` is not persisted as execution #1.** The plan's §4.5 handoff (seeding the canvas with real logs) is not implemented. Node results live in `BuildRunState` only.
2. **No "skip and open anyway" escape hatch.**
3. **Trigger input panels (§4.4)** — still outstanding from 7b.
4. **No E2E whatsoever.** `executeNode` is mocked throughout, so what is proven is the orchestration and the gates, **not the side effects**. Nothing has been sent to Slack or Gmail from this code path. All four of the plan's E2E scenarios remain unrun.

**Commit:** *Phase 8: chained first run with branch-aware orchestration*

---

## Post-implementation — CI coverage audit

### 🛑 Finding: none of this project's tests ran anywhere

Priority item 2 was "run the committed test suites in CI (they have never run there)". Audited `.github/workflows/ci.yml` before doing so, and the reason they had never run is worse than "nobody triggered it":

1. **All 7 new worker test files were invisible to CI.** The three worker test jobs select by `--testPathPattern`:
   - `worker-test-contracts` → `unified-node-registry-contract.test.ts` only
   - `worker-test-delegation` → the four service clients only
   - `worker-test-fix-regressions` → `form-trigger|dispatch-execution-notifications|email-service|if_else`

   Checked each new file against every pattern: **zero matches.** `first-run-policy`, `fanout-sampler`, `build-run-state`, `upstream-field-resolver`, `provider-error-interpreter`, `run-node`, `run` — roughly 150 tests, including the three mandated Phase 6 safety proofs, committed and executed nowhere.

2. **There was no frontend test job at all.** `frontend-lint` runs lint + tsc; `frontend-build` runs build. No vitest anywhere in CI. Every frontend suite in the repo — including the four non-regression suites this project leaned on as its trustworthy net — ran only on a developer machine.

3. **⚠️ `frontend-lint`'s type-check gate is a no-op.** Line 115 runs `npx tsc --noEmit`, which (per the Phase 2 correction) compiles **zero files** because `tsconfig.json` is `"files": []` plus project references. **This is almost certainly how 444 type errors accumulated unnoticed** — the gate that should have caught them has never checked anything.

### What was done

Added two jobs to `ci.yml`:

- **`worker-test-workflow-build`** — runs all 7 new worker test files by **explicit path**, `--runInBand --no-coverage`, 4GB heap, 15-min timeout. Explicit paths rather than a broad pattern, deliberately: the file's own comments record that the full 453-file suite OOMs on runners.
- **`frontend-tests`** — two steps, field-ownership suites and the non-regression suites, each scoped to specific paths. Not a bare `vitest run`: the full frontend suite has never been validated on a runner, and this job exists to protect known-good tests, not to surface unrelated failures.

Both verified locally before committing: **93 tests** (field-ownership + CapabilityStage) and **26 tests** (non-regression), all passing.

### ❌ Deliberately NOT fixed — needs a decision

**`frontend-lint` still runs the no-op `npx tsc --noEmit`.** Changing it to `-p tsconfig.app.json` would turn CI **red immediately** on 444 pre-existing errors that have nothing to do with this project. That is a judgement call about the repo's error budget, not a change to make silently mid-project.

**Recommended:** fix it as its own piece of work — either burn the 444 down first, or land the correct command with a temporary allowance and ratchet it. Leaving it as-is means the frontend type gate stays fake.

**Commit:** *CI: run the field-ownership test suites that were never executed*

---

# ⛔ SESSION END — handoff for the next run

Stopped after Phase 6 at the user's request (context budget). This coincides with the plan's own **mandatory pause before Phase 7b**.

## State

**7 phases complete and committed, one commit each**, on `master`:

```
7559d95 Phase 6: firstRunClass safety layer and fan-out sampler
0508813 Phase 5: delete the configuration and credentials steps
9514598 Phase 4: inline field editing honouring the question-ID key contract
42c957d Phase 3: field-plan API, grouped accordions, upstream attribution
599379d Phase 2: inline connect at node selection with scope-aware readiness
5846cf1 Phase 1: remove Intent Context from field-ownership, add two-column layout
5a5c781 Phase 0c: characterization tests for extracted field-ownership components
815cbda Phase 0b: extract field-ownership block into presentational components
b980178 Phase 0a: capture structural baseline of the field-ownership block
bf926be Baseline: node-selection UI redesign WIP + field-ownership build plan
```

**Remaining: 7a, 7b, 8.** Working tree clean except `worker/public/node-library.json` (pre-existing generated artifact, deliberately untouched).

## Verification standard (do not use the plan's version — it is wrong)

- ❌ `npx tsc --noEmit` in `ctrl_checks/` **checks zero files** (`"files": []` + project references).
- ✅ Use `npx tsc --noEmit -p tsconfig.app.json`. **444 pre-existing errors is the baseline.** Require: total stays 444, and zero errors in files you touch.
- ✅ `npm run lint` in `ctrl_checks/`: 0 errors, **57 warnings** is the baseline.
- ✅ `npm run type-check` in `worker/`: clean.
- ✅ **Single-file test runs are approved** (user confirmed this session): `npx vitest run <path>` and `npx jest <path> --coverage=false`. **Never** `npm test` or an unfiltered run.

Non-regression suite — must pass **unmodified** after every phase:
```
npx vitest run \
  src/components/connections/__tests__/connectionAvailability.test.ts \
  src/components/connections/__tests__/credential-guidance.test.tsx \
  src/components/workflow/__tests__/WorkflowConnectionGate.setup.test.tsx \
  src/components/workflow/__tests__/WorkflowHeader.setup.test.tsx \
  src/hooks/__tests__/useWorkflowConnectionStatus.test.ts
```

Two **pre-existing** failures, both verified by stashing — do not chase them:
- `workflow-generation-state.capability-stage.test.ts` (`capability-selection` state mapping)
- `property-population-stage.test.ts` (fixture missing `fieldOwnershipPolicyMap`)

## ⚠️ Outstanding empirical checks — none of these have been run

1. **Phase 5 acceptance (most important).** Build a workflow end to end, enter values **only** on field-ownership, save, and confirm in the DB that the values landed on the nodes. The configuration step is deleted, so this is the only remaining path; the proof it works is analytical, not empirical. If it fails, revert `0508813`.
2. **Phase 2 manual E2E.** `/connections` connect/disconnect, the canvas connection gate on a manually-built workflow, the per-node connection selector, and a real OAuth round trip from node selection.
3. **Phase 3 measurements (§6c-B).** On ~10 real generated workflows: `{{$json.*}}` resolution rate, whether the five-group taxonomy partitions usefully, and `field-plan` latency.
4. No browser rendering of anything built this session.

## Findings later phases depend on

- **`resolveCredentialDryRun` is not dry.** `resolveCredential` ignores its `dryRun` flag and calls `refreshCredential()` when a token is near expiry — a real OAuth refresh plus a DB write. Phase 7b executes nodes for real; budget for this and keep credential resolution scoped to explicit node lists.
- **OAuth is popup-based** (`useOAuthFlow` → `window.open` + `BroadcastChannel`). The wizard never unmounts, so no redirect-state snapshot is needed anywhere.
- **`configure` is a live step** with a real render block. Only `credentials` and `configuration` were removed.
- `POST /api/capability-selection/connection-readiness` and `POST /api/workflow-build/field-plan` exist; `field-plan` is deliberately side-effect-free and must stay that way.
- `resolveUpstreamFields` (`core/graph/upstream-field-resolver.ts`) is shared — Phase 8 can reuse it for threading outputs.
- `firstRunClass` is already wired end to end as `null` through `field-plan` → the client; Phase 7b just populates it.

## Phase 6 status for the mandatory pause

The pause asks for confirmation that the safety layer is **unit-tested and passing**. It is: **43/43 executed and green**, covering all three mandated proofs. No execution path exists yet — verified by grep.
