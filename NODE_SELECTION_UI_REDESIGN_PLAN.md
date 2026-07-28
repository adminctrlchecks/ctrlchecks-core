# Node-Selection Step UI Redesign — Plan

Status: **Implemented.** See "Implementation Notes" at the end.

Scope: the capability/node-selection screen in the AI workflow wizard (`localhost:8080/workflow/ai`, step `capability-node-selection`) — the screen in the two screenshots showing "Intent Context" at the top and "Choose your integrations" below it.

## 1. Goal

Two complaints about this screen, from the screenshots and feedback:

1. **The "Intent Context" card shows internal system state the user doesn't need** ("Workflow intent is locked in. Continue with ownership and configuration."). The only thing that matters to the user here is **their own original prompt** — it should be the dominant, large-font element of that card; the internal-state sentence should go away (the "Intent Context" label itself is optional — keep it small, or drop it, as long as the prompt is what's visually prominent).
2. **The page is single-column and centered in a narrow strip of a wide screen**, forcing the user to scroll down through every integration/trigger card, then scroll back up to check what they've already selected. Screen space on the sides is wasted. This should become a **two-column layout**: one side shows selection status/guidance ("workflow needs a trigger", progress, why each step is needed), the other side shows the actual candidate options to pick from — sized however best fits the content, not forced to be 50/50.

## 2. Current State Audit

### 2.1 "Intent Context" card — shared across multiple wizard steps, not specific to node-selection

File: `ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx`

```
5729  const showIntentContextCard =
5730      !showPromptComposer &&
5731      step !== 'building' &&
5732      step !== 'complete' &&
5733      hasPostAnalysisContext;
```

This flag is **true for every step after the initial prompt box** (`questioning`, `capability-node-selection`, `capability-review`, etc.) — it is not specific to the node-selection screen. The card itself:

```
5843  <CardTitle className="text-sm text-indigo-300">Intent Context</CardTitle>
5844  <CardDescription>
5845    Workflow intent is locked in. Continue with ownership and configuration.
5846  </CardDescription>
...
5849  {originalPrompt && (
5850    <p className="text-xs text-muted-foreground">
5851      <span className="font-semibold text-foreground/80">Original prompt:</span> {originalPrompt}
5852    </p>
5853  )}
5854  {intentContextSummary ? (
5855    <StructuredPlanDisplay summary={intentContextSummary} compact />
5856  ) : null}
```

The original prompt renders at `text-xs` — the smallest text on the card — while a system-status sentence sits above it in normal card-description size. That's backwards from what the user actually needs to see.

**Important wrinkle found while auditing:** on the `questioning` step, this same Intent Context card renders *and* a separate "Structured workflow plan" card (lines 5906–5947) *also* shows the original prompt in its own collapsible ("Original prompt", lines 5928–5940). That's a pre-existing duplication on a **different** step than the one in the screenshots — not something the user asked about, and not touched by this plan unless you want to fold it in (see Open Questions).

### 2.2 `CapabilityStage.tsx` — narrow, single-column, "show everything, scroll forever"

File: `ctrl_checks/src/components/workflow/CapabilityStage.tsx`

- Root container is hard-capped at `max-w-3xl mx-auto` (line 235) — and it's nested inside the wizard's own `max-w-5xl mx-auto` wrapper (`AutonomousAgentWizard.tsx:5784`). On a wide monitor that's two layers of centering, leaving large empty margins on both sides — exactly the "wasted screen space" the feedback calls out.
- Header (lines 237–246) shows "Choose your integrations" + "X of Y selected" — this is the **only** progress indicator, and it's static text at the very top. Once the user scrolls past it into the container list, there's nothing reminding them how many are done without scrolling back up.
- All containers render as one continuous vertical stack (lines 298–308), each an expanded card with all its candidate options inline. The code comment literally says *"Req 3.1, 3.2, 3.3 — natural flow, no inner scroll"* — i.e. this was built deliberately to show everything in one scroll, which is exactly the behavior now being flagged as a problem at real container counts.
- The "Workflow needs a trigger" / "Some intent steps are not selected" guidance (lines 248–295) renders as full-width `Alert` banners **above** the container list, separate from the specific container card they're talking about. The user has to read the alert, then scroll down to find the matching trigger card — the explanation and the choice are visually disconnected.
- The sticky bottom action bar (Go Back / Continue, lines 311–329) is already `fixed` — that part already works fine and doesn't need to change.

### 2.3 Data already supports a "checklist" view — it's just not used that way

`ctrl_checks/src/lib/capability-selection-validation.ts` and `ctrl_checks/src/types/capability-selection.ts` already carry everything needed for a per-item status list:

- `container.useCaseUnit.semanticRole` — `'trigger' | 'data_source' | 'communication' | 'transformation' | 'output' | 'logic'`
- `container.useCaseUnit.orderIndex` — display order
- `validateCapabilitySelections()` — already computes `triggerContainers`, `missingIntentSteps`, and per-container `title`/`message` copy (e.g. "Workflow needs a trigger" / "Every workflow needs a starting point")

None of this currently drives a persistent per-container status list — it only drives the two floating `Alert` banners. The same data can drive a sticky left-hand checklist instead.

### 2.4 Related file with the same narrow-column pattern (not in scope unless you want it included)

`ctrl_checks/src/components/workflow/CapabilityReviewStep.tsx:120` — the very next step after node-selection — has the identical `w-full max-w-3xl mx-auto` constraint. Same complaint would likely apply once this step is fixed and the user scrolls forward. Flagged for awareness; see Open Questions.

## 3. Proposed New Structure

### 3.1 Intent Context card — simplify, and only for this part of the flow

- Drop the "Workflow intent is locked in. Continue with ownership and configuration." sentence entirely (`AutonomousAgentWizard.tsx:5845`) — it's internal-state narration, not useful to the user.
- Promote the original prompt to the dominant element: large font (e.g. `text-base`/`text-lg`, up from `text-xs`), no longer prefixed with a bolded "Original prompt:" label competing for attention — the card's context already makes it clear what it is.
- Keep "Intent Context" as a small, de-emphasized eyebrow label (cheap to keep, doesn't hurt) rather than removing it outright — the user said either is fine, so default to keeping it since it costs nothing once it's no longer competing visually with the prompt.
- Scope this simplification to the `capability-node-selection` and `capability-review` steps specifically (i.e. gate the "simple/large-prompt" variant on `step`), leaving the `questioning` step's Intent Context card untouched — that step already has its own separate original-prompt display and structured plan editor, and isn't part of what was flagged here. Trying to unify all three steps' treatment in one pass would be scope creep beyond what was asked.
- Drop the `intentContextSummary` / `StructuredPlanDisplay` block from the simplified variant — the user explicitly asked for "only the original prompt" on this screen; the structured plan is still fully available on the `questioning` step where it's actually editable.

### 3.2 Two-column layout for `CapabilityStage`

**Recommendation: sticky left checklist + scrollable right content pane.** Concretely:

- **Left column** (narrower — e.g. ~300–340px, not 50%): a "Workflow steps" list, one row per container in `orderIndex` order. Each row shows:
  - the container's semantic role as an icon/badge (trigger vs. action vs. output, etc.)
  - the container label
  - a selected/unselected indicator (checkmark vs. empty circle) — reusing existing `CheckCircle2` styling
  - a one-line reason this step exists / is required, sourced from the same copy `validateCapabilitySelections()` already generates (e.g. "Every workflow needs a starting point" shown directly against the *Trigger* row, instead of in a floating banner disconnected from it)
  - clicking a row scrolls the right column to that container's card (anchor-scroll within the right pane, not a full page jump)
  - the column is `sticky` positioned so it stays visible while the right column scrolls — this directly solves "user shouldn't have to scroll up to check total selected" — the running "X of Y selected" count lives here too, always visible.
- **Right column** (wider, takes remaining width): the existing container cards with their candidate options, unchanged in behavior — still "show all, no forced single-item view" per the original requirement — just scoped to its own scrollable region instead of the whole page scrolling.
- The full-width `Alert` banners (2.2 above) are retired in favor of the per-row explanation in the left column — same underlying data (`validateCapabilitySelections`), different presentation. If a trigger truly isn't selected yet, that row simply shows its "not selected" state with the reason text inline, no separate banner needed.
- **Widen the layout for this step only**: change the outer wizard content wrapper (`AutonomousAgentWizard.tsx:5784`, currently a blanket `max-w-5xl mx-auto` for every non-building/complete step) to use a wider container (e.g. `max-w-7xl`, or no max-width beyond padding) specifically when `step === 'capability-node-selection'` (and, if you want consistency, `capability-review`). Other steps (prompt composer, questioning form) are single-column text/forms and don't need the extra width — leave those as-is.
- `CapabilityStage.tsx`'s own `max-w-3xl mx-auto` (line 235) is replaced by the two-column grid described above; it no longer self-constrains to a narrow centered column.

**Alternative considered, not recommended as the first pass:** a true master-detail view where only the *currently active* container's candidates are shown on the right (not all of them at once), switched by clicking a row on the left. This would remove essentially all scrolling on the right side too, but it's a bigger behavior change from the current "show everything at once" model and a larger rewrite. The sticky-checklist approach above gets most of the benefit (progress always visible, no lost context) with a much smaller, lower-risk change. Worth a second pass later if the sticky-list version still feels like too much scrolling in practice.

## 4. Content / Layout Principles

- Progress/status should never require scrolling to check — it lives in a sticky column, not a static header that scrolls away.
- An explanation for *why* a step is needed belongs next to that step, not in a separate banner above the whole list.
- Use the width that's actually there — stop double-centering content into a narrow strip on wide viewports.
- Don't duplicate what's already shown elsewhere in the flow (the structured plan) just because a shared card component happens to render on this step too.

## 5. Open Questions (need your input before implementation)

1. **Left column width** — is ~300–340px reasonable, or do you want it narrower/wider? (Not full 50/50 — confirmed you don't want equal panels.)
2. **Extend the same treatment to `CapabilityReviewStep.tsx`** (the very next step, same `max-w-3xl` narrow-column issue) in this pass, or keep this plan scoped to `capability-node-selection` only and handle the review step separately later?
3. **`questioning` step's duplicate original-prompt display** (section 2.1's "wrinkle") — leave it alone for now (recommended, since it's a different step than what was flagged), or fix it in the same pass since we'll already be touching this shared code?
4. Confirm the recommended approach (sticky left checklist + scrollable right pane, all containers still visible on the right) over the master-detail alternative (only the active container's candidates shown) — or say if you'd rather go straight to master-detail.

## 6. Implementation Notes (what actually shipped)

Q1–Q3 were still unanswered when implementation started (pasted back as literal `[Answer to Q1]`-style placeholders). Went with the plan's own recommended defaults:

- **Q1 (left column width)**: `320px` fixed, via CSS grid `lg:grid-cols-[320px_1fr]` (single column below the `lg` breakpoint).
- **Q2 (`CapabilityReviewStep.tsx`)**: left untouched. Same `max-w-3xl` narrow-column pattern is still there — separate follow-up if wanted.
- **Q3 (`questioning` step duplicate prompt)**: left untouched, as recommended — different step than what was flagged, out of scope here.

What changed:

- **`AutonomousAgentWizard.tsx`**: added `isCapabilitySelectionFlow` (`step === 'capability-node-selection' || step === 'capability-review'`) and a `handleEditIntent` helper (de-duplicating the "Edit intent" button logic that used to be inlined twice). The Intent Context card now branches on that flag — the `capability-node-selection`/`capability-review` variant drops the "Workflow intent is locked in..." sentence and the structured-plan-summary block, and renders the original prompt at `text-base sm:text-lg` (up from `text-xs`) as the dominant element; "Intent Context" stays as a small de-emphasized eyebrow. The `questioning` step keeps the original full card, untouched. The outer content wrapper (line ~5784) now uses `max-w-7xl` instead of `max-w-5xl` specifically when `step === 'capability-node-selection'`; every other step keeps `max-w-5xl`.
- **`CapabilityStage.tsx`**: rebuilt as a CSS grid with a sticky left checklist and a right pane of the existing container/candidate cards (`CredentialBadge`, `CandidateOption` untouched). New `StepRow` component renders one row per container: selected/unselected indicator, semantic-role "Trigger" badge, and a one-line reason (the container's own description normally, or "Required — every workflow needs a starting point." on the trigger row specifically when no trigger is selected yet). The two floating `Alert` banners are gone; the same underlying message (`validateCapabilitySelections()` / the `validationIssue` prop) now renders as a compact inline block inside the sticky left column, and the "some intent steps not selected" note renders as a compact block below the checklist instead of a full-width banner. Clicking a row calls `scrollIntoView` on the matching container card (`id="capability-container-<id>"`) in the right pane. The sticky bottom action bar (Go Back / Continue) is unchanged.

Verified: `tsc --noEmit` and `npm run lint` both clean (0 errors). Reaching this step for real requires an authenticated session — confirmed, since the dev server returned a 401 on the analyze call for an anonymous headless request. Verification was instead done by temporarily wiring `CapabilityStage` into a throwaway debug route (`/__debug/capability-stage`, fixture data, no auth) on the already-running dev server, screenshotting it, then fully reverting the route and deleting the debug page — nothing debug-related is left in the tree (confirmed via `git status`). Screenshots showed: full-width two-column layout, the sticky left checklist correctly staying pinned in place while the right pane scrolled past it, a live "X of Y selected" count, the trigger row highlighted with the "Required..." copy until selected, and the "steps aren't selected yet" note appearing once a trigger was chosen but other steps remained open.

Not independently visually confirmed: the Intent Context card's simplified variant on the real authenticated wizard screen (the debug route only exercised `CapabilityStage` in isolation, not the surrounding wizard chrome). Worth a quick manual check in your own logged-in session.

Not committed or deployed — left for review, since this task wasn't given a commit/deploy instruction the way the homepage redesign was.
