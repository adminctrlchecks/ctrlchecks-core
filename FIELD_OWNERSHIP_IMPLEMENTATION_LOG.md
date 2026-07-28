# Field Ownership Redesign — Implementation Log

Durable record for the phased implementation of `FIELD_OWNERSHIP_VERIFIED_BUILD_PLAN.md` (§8 protocol).
**This file is the memory of record.** Context will be compacted during this run; anything needed later must be written here, not merely remembered.

**Rule for this file: it records only work that has actually been done.** Plans are marked as plans. Anything unverified is stated as unverified.

Started: 2026-07-28
Baseline commit: `bf926be` — *Baseline: node-selection UI redesign WIP + field-ownership build plan*
(That commit contains the prior session's uncommitted node-selection work, committed first so each phase lands as a clean single-purpose commit.)

---

## Phase checklist

- [x] **0a** — Baseline capture
- [ ] **0b** — Extraction, zero behaviour change
- [ ] **0c** — Characterization tests on the extracted unit
- [ ] **1** — Intent Context off this step + two-column layout
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

- **Never run `npm test` locally** — it has crashed this machine (memory `feedback_testing_strategy`). Tests get written here and run in CI/live. **Consequence: every test this project produces is unexecuted until someone runs CI. That must be stated in each phase's record, never glossed as "tested".**
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

**Commit:** *(recorded below after committing)*
