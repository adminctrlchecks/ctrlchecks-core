# Workflow Editor — Name Bar, Prompt/Expert Modes, Save-State Button

**Status:** IMPLEMENTED — all 6 steps done, 2026-08-02. See the implementation log in §10.
Sections 2 and 4 below describe the *pre-implementation* state and are kept for context; the
file/line references in §2 are no longer current.
**Date specified:** 2026-08-02
**Scope:** `ctrl_checks/` frontend only. No worker/backend changes required.

---

## 1. Goal

Three connected changes to the workflow builder page (`/workflow/:id`):

1. **Move the workflow name out of the top header** into its own row below it, left-aligned and readable in full.
2. **Add a Prompt AI mode / Expert AI mode switch** on the right of that new row, which controls which panels the page shows.
3. **Replace the Save button + separate "Unsaved" badge** with a single save-state button that communicates dirty/saving/saved through its own appearance.

---

## 2. Current state (verified — file/line refs are accurate as of 2026-08-02)

### Layout

`ctrl_checks/src/pages/WorkflowBuilder.tsx` (1715 lines) renders:

```
<div h-screen flex flex-col>
  <WorkflowHeader />                       // line 1553 — back, name, badges, all action buttons
  <WorkflowConnectionGate />               // line 1568 — conditional
  <Suspense>
    <div flex-1 flex flex-col>
      <div flex-1 flex>                    // line 1623 — the 3-column row
        NodeLibrary   w-[360px]            // line 1625-1645, collapses to a w-8 rail
        WorkflowCanvas flex-1              // line 1648
        PropertiesPanel w-[360px]          // line 1682-1702, collapses to a w-8 rail
      </div>
      <ExecutionConsole />                 // line 1704 — FULL-WIDTH BOTTOM BAR
    </div>
    {debugNodeId && <DebugPanel />}        // line 1711 — full-screen overlay
  </Suspense>
</div>
```

Relevant state in `WorkflowBuilder.tsx`:
- `nodeLibraryOpen` — line 131, defaults `true`
- `propertiesPanelOpen` — line 133, defaults `true`
- `consoleExpanded` — drives `ExecutionConsole`
- `debugNodeId` — when set, `DebugPanel` renders as a full overlay (line 1711)

### Header

`ctrl_checks/src/components/workflow/WorkflowHeader.tsx`:
- Workflow name is an inline editable `Input` / click-to-edit button — **line 222-227**. `min-w-0 truncate` is why the long name truncates.
- `Unsaved` badge — **line 228-232**, `<Badge variant="secondary">`.
- Save button — **line 275-278**: `<Button variant="outline" size="sm" onClick={onSave} disabled={isSaving || !isDirty}>`.
- Reads `isDirty` from `useWorkflowStore()` — line 55.

### AI Editor

**The AI Editor is a tab inside `PropertiesPanel`**, not a separate component — see `PropertiesPanel.tsx` lines 2269 and 3003 (`aria-label="AI Editor"`). This is the single most important constraint in this plan: naively hiding the right panel in Prompt mode would also remove the AI Editor.

### Execution console

`ctrl_checks/src/components/workflow/ExecutionConsole.tsx`:
- Props: `{ isExpanded: boolean; onToggle: () => void }` (line 47, 114).
- Built for a **wide, short** bottom bar: log rows are horizontal, payloads render in `<pre className="overflow-x-auto">` (line 683).
- It does **not** currently accept an orientation/layout prop.

### How users arrive at the builder

- **AI generation:** `AutonomousAgentWizard.tsx:3645` → `navigate(\`/workflow/${savedWorkflow.id}\`, { replace: true })`
- **Manual / edit existing:** `Workflows.tsx:428`, `Workflows.tsx:520`, `Executions.tsx:258`, `Dashboard.tsx:607` → same `/workflow/:id` URL

**There is currently no signal distinguishing these two paths.** Both produce an identical URL.

---

## 3. Decisions (confirmed by the user — do not re-litigate)

| Question | Decision |
|---|---|
| AI Editor in Prompt mode? | **Keep it.** Prompt mode must have the AI Editor reachable. |
| Clicking a node in Prompt mode? | **Nothing happens.** Properties must not open. |
| Debug node in Prompt mode? | **Works exactly as it does today** — unchanged in both modes. |
| Mode persistence? | **Last mode the user clicked**, remembered across workflows and sessions. |
| Save button? | **Merge the "Unsaved" badge into the Save button.** One control, colour/label reflects state. |

---

## 4. What to implement

### 4.1 Workflow name row (new second bar)

Create `ctrl_checks/src/components/workflow/WorkflowSubHeader.tsx`.

- Renders **below** `WorkflowHeader`, above the panel row, full width, its own bottom border.
- **Left:** workflow name, click-to-edit (move the existing edit behaviour out of `WorkflowHeader.tsx:222-227`). No `truncate` — the whole name must be visible. Use `text-xl font-semibold` or larger. Wrap or clamp to 2 lines rather than ellipsis.
- **Right:** the mode switch (§4.2).
- Remove the name block and the `Unsaved` badge from `WorkflowHeader.tsx`. All action buttons **stay in the top header** — do not move them.

### 4.2 Mode switch

New store or local state: `editorMode: 'prompt' | 'expert'`.

- Rendered as a two-option segmented control on the right of the sub-header: **Prompt AI** / **Expert AI**.
- Persist to `localStorage` under key `ctrlchecks_workflow_editor_mode` on every explicit user click.
- **Resolution order on page load:**
  1. Stored `localStorage` value, if present → use it.
  2. No stored value → origin-based default: arrived from the AI wizard = `prompt`; anything else = `expert`.
- For step 2 you need a signal for "came from the AI wizard". Recommended: pass React Router navigation state at `AutonomousAgentWizard.tsx:3645`:
  ```ts
  navigate(`/workflow/${savedWorkflow.id}`, { replace: true, state: { origin: 'ai-wizard' } });
  ```
  Read it via `useLocation().state`. Do **not** use a URL query param — it survives copy/paste of the link and would wrongly force Prompt mode for anyone opening that URL later.

### 4.3 Mode-driven layout

**Expert AI mode** — exactly today's layout. No changes.

**Prompt AI mode:**
- Node Library: **not rendered** (not even the collapsed `w-8` rail).
- Properties panel: **not rendered**, and clicking a node must not open it (see §4.4).
- AI Editor: **must remain reachable.** Recommended approach — extract the AI Editor tab body out of `PropertiesPanel.tsx` into its own component so it can render standalone in Prompt mode without dragging the node-properties form with it. This is the largest refactor in the plan; do it carefully and keep `PropertiesPanel` using the same extracted component so there is one implementation, not two.
- Canvas: left, wide.
- Execution console: **right-hand vertical panel**, not the bottom bar.

### 4.4 Node click behaviour in Prompt mode

Find where node selection currently opens the Properties panel (`WorkflowCanvas.tsx` / `workflowStore.ts` — `setSelectedNode` / `selectedNodeId`). In Prompt mode, selecting a node must **not** open any panel. Selection highlight on the canvas is fine; no side panel.

`DebugPanel` (`WorkflowBuilder.tsx:1711`) is **unaffected** — it is a full-screen overlay driven by `debugNodeId` and must keep working identically in both modes.

### 4.5 Execution console — vertical variant

`ExecutionConsole` needs to work in a tall narrow column. Add an explicit prop rather than guessing from width:

```ts
interface ExecutionConsoleProps {
  isExpanded: boolean;
  onToggle: () => void;
  orientation?: 'horizontal' | 'vertical';  // default 'horizontal' = today's bottom bar
}
```

In `vertical`: stack log entries top-to-bottom, keep payload `<pre>` blocks inside their own `overflow-x-auto` container so the panel never scrolls horizontally, and give the panel a sensible fixed width (~380-420px) with the canvas taking the rest.

**Do not change the existing horizontal rendering.** Expert mode must look and behave exactly as it does now.

### 4.6 Save-state button

Replace `WorkflowHeader.tsx:275-278` and delete the `Unsaved` badge at lines 228-232. One button, three states:

| State | Condition | Appearance | Enabled |
|---|---|---|---|
| Unsaved | `isDirty && !isSaving` | Warning/amber treatment + dot or dirty icon, label **"Unsaved"** or **"Save changes"** | Yes |
| Saving | `isSaving` | Spinner, label **"Saving…"** | No |
| Saved | `!isDirty && !isSaving` | Muted/success treatment, check icon, label **"Saved"** | No |

Requirements:
- **Never colour-only.** The label and icon must change too — colour alone fails accessibility and is invisible to colourblind users.
- Add `aria-live="polite"` so the state change is announced.
- Keep the existing `onSave` prop contract unchanged; only the visual/label logic changes.
- `isDirty` already comes from `useWorkflowStore()` (line 55) — no store changes needed.

---

## 5. Suggested order of work

Do these as separate, verifiable steps. Do not attempt all at once.

1. **Save-state button** — smallest, self-contained, no layout risk. Ship and eyeball it first.
2. **Sub-header row with the name** — move name out of `WorkflowHeader`, verify the long name renders in full.
3. **Mode switch + persistence** — add the control and localStorage; wire it to show/hide Node Library and Properties only (console stays at the bottom for now). Verify toggling works and survives reload.
4. **AI Editor extraction** — pull it out of `PropertiesPanel` into a standalone component, used by both.
5. **Vertical execution console** — add the `orientation` prop and the Prompt-mode right-column layout.
6. **Node-click suppression in Prompt mode** — confirm `DebugPanel` still works.

---

## 6. Acceptance criteria

Status after implementation (2026-08-02). "Code-verified" = confirmed by reading the shipped code
plus tsc/eslint/test/build; items marked **needs a browser** are correct by construction but have
not been eyeballed in a running app.

- [x] Long workflow names are fully readable in the new row; nothing truncates with `…`. — `WorkflowSubHeader.tsx` uses `break-words`, no `truncate`/`line-clamp`. **needs a browser** to confirm visually.
- [x] Top header still contains: back, Connections, Schedule, Webhook, Save-state button, Check Setup, Run, settings. — all 8 verified present in `WorkflowHeader.tsx`; nothing was moved out.
- [x] Prompt mode shows: canvas + execution console (right) + reachable AI Editor. No Node Library, no Properties, no collapsed rails. — the rails are inside the same gate as their panels, so neither renders.
- [x] Expert mode is pixel-identical to today. — every new class is behind an `isVertical &&` / mode gate; no existing class set was altered. **needs a browser** for a true pixel diff.
- [x] Clicking a node in Prompt mode opens nothing. — locked by `resolveEditorLayout('prompt').showPropertiesPanel === false` + test.
- [x] Debug panel opens and works identically in both modes. — rendered outside every mode gate, driven only by `debugNodeId`.
- [x] Mode survives a page reload and applies to the next workflow opened. — `localStorage`, read in the `useState` initialiser; covered by `useEditorMode.test.ts`.
- [x] A freshly AI-generated workflow opens in Prompt mode when the user has no stored preference. — router state from all 4 wizard exits; **needs a browser** (the wizard's own tests mirror logic, per §8, so they prove nothing here).
- [x] Save button reads "Unsaved" → "Saving…" → "Saved" with icon + label changing, not just colour.
- [x] Execution console in vertical mode never causes horizontal page scroll. — `min-w-0` + `overflow-x-hidden` on the detail pane; payload `<pre>`s scroll inside themselves. **needs a browser** to confirm with a real wide payload.

---

## 7. Verification commands

Per `CLAUDE.md` and standing project guidance:

```bash
cd ctrl_checks
npx tsc --noEmit -p tsconfig.app.json     # expect only PRE-EXISTING errors (LightPillar.tsx, docs-content, tests)
npx eslint src/components/workflow src/pages/WorkflowBuilder.tsx
npx vite build
npx vitest run <single-test-file>          # single files only
```

**Never run the full test suite / bare `npm test` locally — it crashes the machine.** Single-file `npx vitest run <path>` is approved.

Existing tests that touch this area (check before and after):
- `ctrl_checks/src/components/workflow/__tests__/` — several PropertiesPanel tests exist and already have pre-existing type errors; do not be alarmed by those, but do not add new ones.

---

## 8. Constraints and traps

- **Single source of truth (see `CLAUDE.md`):** never add `if (node.type === ...)` outside `unified-node-registry.ts`. This work is layout-only and must not touch node behaviour.
- **AI Editor is inside PropertiesPanel** — the whole plan hinges on extracting it cleanly. Do not duplicate it into a second component; both modes must use one implementation.
- **`AutonomousAgentWizard.tsx` tests mirror logic instead of importing it** — they stay green through refactors, so "tests pass" proves nothing there. Verify the wizard→builder navigation change in the browser.
- **Dev server can run orphaned and serve stale code.** If a change doesn't appear, check the node process StartTime against file mtime before debugging further.
- **Do not move the action buttons** out of the top header. Only the name and the mode switch belong in the new row.
- **Do not change Expert mode's appearance.** It is the regression baseline.

---

## 9. Open item

`localStorage` was chosen for mode persistence because the user asked for "the last mode which user clicked" — it is per-browser, not per-account. If the mode should follow the user across devices, this needs a column on the profile or workflow row and a small API change. Not in scope unless requested.

---

## 10. Implementation log

### Known PRE-EXISTING type errors in the touched area (baseline — not introduced by this work)

```
src/components/workflow/ExecutionConsole.tsx(345,32)  TS2352 Execution cast
src/components/workflow/ExecutionConsole.tsx(372,37)  TS2352 Execution cast
src/components/workflow/PropertiesPanel.tsx(2922,13)  TS2740 FormConfig
src/components/workflow/WorkflowCanvas.tsx(461,46)    TS2677 type predicate
src/pages/WorkflowBuilder.tsx(~313,~720)              TS2345 Node[] vs WorkflowNode[]
```
(WorkflowBuilder line numbers shift as imports are added; the two errors themselves are unchanged.)
Plus the wider pre-existing set: `LightPillar.tsx`, `ConnectionsPanel.tsx`, `docs-content/**`, and test files.
Pre-existing eslint **errors**: 2 × `no-shadow` in `__tests__/CapabilityStage.connections.test.tsx`.

### Step 1 — done (save-state button)

- **Added** `src/components/workflow/SaveStateButton.tsx`. One control, three states: `unsaved`
  (amber outline, `CircleDot`, label "Unsaved", enabled) → `saving` (spinning `Loader2`, "Saving…",
  disabled) → `saved` (muted, `Check`, "Saved", disabled). Icon **and** label change in every state,
  so nothing is communicated by colour alone. `aria-live="polite"`; the unsaved state adds an
  `sr-only` "— click to save changes" so the accessible name reads as an action.
  `disabled:opacity-100` keeps the "Saved" state legible.
- **`WorkflowHeader.tsx`** — deleted the `Unsaved` `<Badge>` (old lines 228-232) and replaced the
  old Save button (old lines 275-278) with `<SaveStateButton>`. Dropped the now-unused `Badge` and
  `Save` imports. `onSave` prop contract and disabled logic unchanged.
- **Verified:** tsc clean for both files; eslint clean for both files; `WorkflowHeader.setup.test.tsx`
  2/2 pass; `vite build` OK.

### Step 2 — done (workflow name row)

- **Added** `src/components/workflow/WorkflowSubHeader.tsx`. Full-width row with its own bottom
  border, `min-h-[3.25rem]`. Left: workflow name as a click-to-edit button at `text-xl font-semibold`
  with `break-words` and **no** `truncate`/`line-clamp` — long names wrap and are fully readable, no
  `…` anywhere. Editing swaps in a full-width `Input` (`max-w-2xl`) with `aria-label="Workflow name"`.
  Right: a `children` slot, currently empty — the step-3 mode switch goes there.
- **`WorkflowHeader.tsx`** — removed the name block (old lines 209-233) and its `isEditing` state,
  `setWorkflowName` destructure, and `Input` import. `workflowName` is still read for the export
  filename and the Connections deep link. All action buttons stayed in the top header.
- **`WorkflowBuilder.tsx`** — `<WorkflowSubHeader />` rendered directly under `<WorkflowHeader />`,
  above `WorkflowConnectionGate`; added the import.
- **Verified:** tsc — only the baseline errors above; eslint on the three touched files — 0 errors
  (2 pre-existing `exhaustive-deps` warnings in `WorkflowBuilder.tsx`);
  `WorkflowHeader.setup.test.tsx` 2/2 pass; `vite build` OK in 43s.

### Step 3 — done (mode switch + persistence)

- **Added** `src/hooks/useEditorMode.ts`. Exports `EditorMode`, `EDITOR_MODE_STORAGE_KEY`
  (`ctrlchecks_workflow_editor_mode`), `AI_WIZARD_ORIGIN`, and two pure helpers —
  `readStoredEditorMode()` (validates the stored string, returns `null` for garbage, try/caught for
  private-browsing throws) and `resolveInitialEditorMode(stored, cameFromAiWizard)` (stored wins;
  otherwise wizard ⇒ `prompt`, else `expert`). The hook seeds `useState` once from those and only
  writes to `localStorage` inside `setMode`, so the origin-based default is never persisted on its own.
- **Added** `src/components/workflow/WorkflowModeSwitch.tsx` — a `role="group"` segmented control,
  **Prompt AI** / **Expert AI**, each button carrying `aria-pressed` and a `title` describing what
  that mode shows.
- **`WorkflowBuilder.tsx`** — `const { mode: editorMode, setMode: setEditorMode } = useEditorMode()`
  plus `isPromptMode`. Switch passed into `<WorkflowSubHeader>`'s right slot. Node Library and
  Properties blocks each wrapped in `{!isPromptMode && ( … )}` so **neither the panel nor its
  collapsed `w-8` rail** renders in Prompt mode. Expert mode's JSX is byte-identical inside the guard.
- **`AutonomousAgentWizard.tsx`** — added `state: { origin: AI_WIZARD_ORIGIN }` to **all four**
  wizard→builder navigations (old lines 3645, 4538, 7639, 7763), not just the one the plan named;
  they are all wizard exits and the signal must be consistent. Router state, not a query param, so
  a copy/pasted URL does not force Prompt mode.
- **Note:** `WorkflowBuilder`'s own `navigate('/workflow/:id', { replace: true })` after first save
  drops `location.state`, but that is a same-route change — the component does not remount and the
  already-initialised mode state survives.
- **Added test** `src/hooks/__tests__/useEditorMode.test.ts` — 6 cases, and it **imports** the real
  helpers rather than mirroring them (cf. the wizard-test trap in §8).
- **Verified:** tsc — baseline only. The 5 `AutonomousAgentWizard.tsx` errors that appear in the
  filtered output were confirmed pre-existing by `git stash`-ing the file and re-running: identical
  errors, line numbers shifted by exactly 1 (the added import). eslint on all 6 touched files — 0
  errors, 8 warnings all pre-existing. `useEditorMode.test.ts` 6/6 pass; `vite build` OK in 45s.

### Step 4 — done (AI Editor extraction)

**Why a store was needed (not anticipated by the plan).** `PropertiesPanel` has *three* early-return
branches — "no node selected", "invalid node", and the main body — and two of them rendered
`renderAIEditor()`. Today the AI state lives in `PropertiesPanel` itself, which never unmounts, so
the conversation survives selecting/deselecting a node. A plain child component would be torn down
and rebuilt whenever the host branch changed, silently losing the chat. Hoisting the conversation
into a store makes the component genuinely mount-location-independent, which is also precisely what
lets the *same* component render under `WorkflowBuilder` in Prompt mode.

- **Added** `src/stores/aiEditorStore.ts` — conversation, pending-preview, and analyzer state.
  Setters are generated by a small typed `setter(key)` factory and deliberately mirror React's
  `useState` signature (accepting a value *or* an updater), so every handler body transplanted from
  `PropertiesPanel` is byte-identical to the original. `analyzerHydratedForWorkflowRef` became the
  `hydratedWorkflowId` field.
- **Added** `src/components/workflow/AIEditorPanel.tsx` — the single implementation. Holds the three
  effects, all nine handlers, `parseAnalyzerStructuredContent`, and the full JSX body. Reads
  `nodes/edges/workflowId/selectedNode/…` straight from `useWorkflowStore` so it needs no prop
  drilling and works standalone. `isActive` replaces the old `viewMode === 'ai-editor'` checks, so
  nothing is fetched until the panel is actually opened. Only DOM/timer refs stayed local.
- **`PropertiesPanel.tsx`** — removed ~1050 lines (2 blocks: the state + effects + handlers, and
  `renderAIEditor`), plus the `Message`/`AnalyzerStructuredContent` types and
  `parseAnalyzerStructuredContent`. Both call sites now render `<AIEditorPanel isActive={…}
  className={cn(… && 'hidden')} />` **unconditionally** rather than as the `else` of a ternary — that
  keeps it mounted across tab switches, matching today's behaviour. Dropped 8 now-dead imports
  (`useRole`, `mergeCapabilityHints`, `validateAndFixWorkflow`, the `node-type-normalizer` trio, the
  whole `@/types/aiEditor` block, `normalizeIfElseConfig`) and the `setEdges`/`setAiEditedNodeIds`/
  `clearAiEditedNodeHighlight`/`appRole` destructures. File: 4021 → 2865 lines.
- **`WorkflowBuilder.tsx`** — Prompt mode now renders `<AIEditorPanel />` in a 400px right column
  (lazy-loaded, same as the other panels), satisfying §4.3's "AI Editor must remain reachable".
- **Verified:** tsc — baseline only (the `PropertiesPanel` `FormConfig` error simply moved 2922 →
  1871 as lines were removed); eslint — 0 errors, `AIEditorPanel.tsx` and `aiEditorStore.ts` both
  fully clean. Tests: `PropertiesPanel.integration` 54/54 pass, `PropertiesPanel.unlock` 20/20 pass.
  `PropertiesPanel.inspector` (6) and `PropertiesPanel.schema` (7) fail — **confirmed pre-existing**
  by `git stash`-ing `PropertiesPanel.tsx` and re-running against the untouched original: identical
  6 and 7 failures, cause is `nodeSchemaService.getCachedSchemas is not a function`, a mock gap in
  those tests with nothing to do with the AI Editor. `vite build` OK — and it confirms the split:
  new `AIEditorPanel` chunk at 24.65 kB, `PropertiesPanel` down from 211.40 kB to 189.10 kB.

### Step 5 — done (vertical execution console)

- **`ExecutionConsole.tsx`** — added the `orientation?: 'horizontal' | 'vertical'` prop (default
  `'horizontal'`) and `const isVertical = orientation === 'vertical'`. Six className sites are now
  gated on it:

  | Site | horizontal (unchanged) | vertical |
  |---|---|---|
  | outer shell | `flex-shrink-0` + `h-[600px]`/`h-10` | `flex min-h-0 w-full flex-col overflow-hidden` + `flex-1`/`h-10 shrink-0` |
  | header row | as-is | `shrink-0 gap-2`, icon `shrink-0`, title `truncate` |
  | content wrapper | `h-[calc(100%-40px)]` | `min-h-0 flex-1 overflow-hidden` |
  | list/detail split | `flex flex-1 min-h-0` | `+ flex-col min-w-0` |
  | run list | `w-64 border-r` (beside) | `h-32 shrink-0 min-w-0 border-b` (stacked above) |
  | detail pane | `flex-1 overflow-y-auto` | `+ min-h-0 min-w-0 overflow-x-hidden` |

  **Every horizontal class set is byte-identical to before** — each vertical class is added through
  an `isVertical && …` gate, never by replacing an existing one. The payload `<pre>` blocks already
  had `overflow-x-auto` / `whitespace-pre-wrap`; the new `min-w-0` + `overflow-x-hidden` on the
  detail pane is what actually stops a wide payload from pushing the page sideways.
- **`WorkflowBuilder.tsx`** — Prompt mode's 400px right column now stacks `<AIEditorPanel />` above
  `<ExecutionConsole orientation="vertical" />`; both share the column via `flex-1` when the console
  is expanded, and the AI Editor takes everything but 40px when it is collapsed. The full-width
  bottom bar is now wrapped in `{!isPromptMode && …}`, so Expert mode is untouched and Prompt mode
  has exactly one console. Both share the same `consoleExpanded` state.
- **Verified:** tsc — baseline only (the two `ExecutionConsole` errors moved 345/372 → 352/379 as
  lines were added); eslint — 0 errors, 5 pre-existing warnings. No test file covers
  `ExecutionConsole`. `vite build` OK in 12s.

### Step 6 — done (node-click suppression in Prompt mode)

**Finding:** there was no code hole left to plug. `onNodeClick` (`WorkflowCanvas.tsx:197`) only calls
`selectNode`; nothing anywhere calls `setPropertiesPanelOpen` in response to selection — that state
is local to `WorkflowBuilder` and defaults to `true`. The panel appears purely because of its render
gate, which step 3 already made mode-dependent. So clicking a node in Prompt mode already opened
nothing, and canvas highlighting still works (which §4.4 explicitly allows).

The remaining risk was that the guarantee was *implicit*, spread across four bare `!isPromptMode`
checks that a later edit could silently undo. Step 6 made it explicit:

- **Added** `src/lib/workflow-editor-layout.ts` — `resolveEditorLayout(mode)` returning
  `{ showNodeLibrary, showPropertiesPanel, showBottomConsole, showAssistantColumn }`, the single
  source of truth for mode-driven surface visibility. `showPropertiesPanel` carries the comment
  explaining that it is what makes a Prompt-mode node click open nothing, and the module documents
  that the debug panel is deliberately **not** covered because it must stay mode-independent.
- **`WorkflowBuilder.tsx`** — replaced `isPromptMode` with `editorLayout.*` at all four render sites.
- **Added test** `src/lib/__tests__/workflow-editor-layout.test.ts` — 5 cases, importing the real
  function. Beyond the two per-mode snapshots it asserts three invariants: properties are never
  shown in Prompt mode, the two consoles are never shown simultaneously, and the AI Editor is always
  reachable via one surface or the other in every mode.

**Debug panel confirmed unaffected:** `WorkflowBuilder.tsx:1737` renders `{debugNodeId && <DebugPanel />}`
outside the `Suspense` panel row and outside every mode gate; `debugNodeId` comes from `debugStore`,
which no part of this work touches. Identical in both modes.

- **Verified:** tsc — baseline only; eslint — 0 errors, 2 pre-existing warnings. Tests:
  `workflow-editor-layout` 5/5, `useEditorMode` 6/6, `WorkflowHeader.setup` 2/2,
  `PropertiesPanel.integration` 54/54, `PropertiesPanel.unlock` 20/20. `vite build` OK in 12s.
