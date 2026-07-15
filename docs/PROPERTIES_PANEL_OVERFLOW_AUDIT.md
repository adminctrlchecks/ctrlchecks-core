# Properties Panel Overflow — End-to-End Audit (2026-07-15)

Analysis only — no code changed. This catalogs every container/component rendered inside the
Properties panel, why each one can (or cannot) overflow, and the exact fix for each finding.

---

## 1. The CSS mechanics behind every overflow in this panel

Every horizontal overflow seen so far reduces to one of four mechanisms:

**M1 — Flex items refuse to shrink (`min-width: auto`).**
A flex child's default minimum width is its content's min-content size. `flex-1` does NOT
override this. A row like `flex justify-between` with a `<Label>` and a help-link button will
grow past its container if the label + link min-content exceeds the row width — the row then
paints beyond the panel and gets clipped by an ancestor's `overflow-hidden`. Fix is always
`min-w-0` on the flex children (plus `truncate`/`break-words` on text).

**M2 — Grid cells' content painting over the track.**
Tailwind's `grid-cols-N` compiles to `repeat(N, minmax(0, 1fr))`, so the *tracks* are clamped.
But a cell whose content is a flex row (M1) still paints wider than its track — text visually
overlaps the neighboring column. Fix: `min-w-0` on the cell wrapper divs.

**M3 — Radix ScrollArea's `display: table` viewport.** *(root cause of the body-wide overflow;
fixed in commit `09ec4ff`)*
`@radix-ui/react-scroll-area` wraps viewport content in `<div style="min-width:100%;
display:table">`. Inside a scroll container a table sizes to its content's preferred width, so
the entire scroll body becomes wider than the panel; every child's `max-w-full` then resolves
against that too-wide wrapper. This exactly matches the screenshot symptom: content clipped at
the panel's right edge while the Delete footer (outside the scroll area) fits perfectly.
**Any remaining `ScrollArea` inside a width-constrained box has this hazard.**

**M4 — Fixed widths wider than the host.**
An element with a hard-coded width (`w-[400px]`, inline `width: 360`) inside a narrower host is
clipped no matter what its children do.

> **Before any further fixing: verify the browser is on the latest deploy.** The screenshot
> symptoms (inputs clipped un-wrapped, footer fine) are exactly the M3 signature that commit
> `09ec4ff` removed. The deployed chunk is `PropertiesPanel-DQ9puLOz.js`; an open SPA tab keeps
> serving the *old* chunk until a hard refresh (Ctrl+Shift+R). Re-test first, then apply the
> findings below — several are real regardless.

---

## 2. Host mounts of PropertiesPanel (3 places)

| Host | Wrapper | Verdict |
|---|---|---|
| `src/pages/WorkflowBuilder.tsx:1536` | `w-[360px] shrink-0 overflow-hidden` | ✅ matches panel's inline `width: 360` |
| `src/components/workflow/debug/DebugPanel.tsx:345` | `flex-1 overflow-hidden` + `debugMode` → panel `width: 100%` | ✅ |
| `src/pages/admin/TemplateEditor.tsx:235` | **`w-80` (320px)** | ❌ **M4 BUG** — panel hard-codes 360px inline → 40px permanently clipped on the right in the admin Template Editor |

**Fix for TemplateEditor mismatch (pick one):**
- (preferred) In `PropertiesPanel.tsx`, replace inline `width: debugMode ? '100%' : PROPERTIES_PANEL_WIDTH`
  with `width: '100%'` + `maxWidth: '100%'` and let each host set the width (WorkflowBuilder
  already does via `w-[360px]`). This makes the panel width-agnostic — the spec's "must work at
  360px and full width" requirement.
- (minimal) Change TemplateEditor's wrapper from `w-80` to `w-[360px]`.

---

## 3. Component-by-component findings

### 3.1 `FormNodeSettings.tsx` — ❌ 4 violations (the screenshot's visible component)

| Line | Code | Problem | Fix |
|---|---|---|---|
| 53 | `FormGuideLabel`: `<div className="flex items-center justify-between gap-2">` | M1 — neither the `Label` nor the `InputGuideLink` child has `min-w-0`; long label ("Options (comma-separated)") + long guide question ("How to set Internal Name?") exceed the row | wrapper: add `min-w-0 max-w-full`; `Label`: add `min-w-0 break-words`; the link already truncates once the row is constrained |
| 236 | field row: `<div className="flex items-start justify-between gap-2">` | M1 — child `flex-1 space-y-3` (237) lacks `min-w-0`; X `Button` (336) lacks `shrink-0` | `flex-1 min-w-0 space-y-3`; X button `shrink-0` |
| 238 | `<div className="grid grid-cols-2 gap-2">` | M2 — the two column divs (`space-y-1`) lack `min-w-0`; the Label/Type guide-link rows paint over each other | both cells: `min-w-0 space-y-1` |
| 176 | root `<div className="space-y-6">` | defense-in-depth missing | `min-w-0 max-w-full space-y-6` |

All `Input`/`Textarea`/`SelectTrigger` leaves are `w-full` — correct once ancestors are constrained.

### 3.2 `ConditionBuilder.tsx` — ❌ 2 violations (if_else conditions editor)

| Line | Code | Problem | Fix |
|---|---|---|---|
| 230 | `<div className="flex-1 grid grid-cols-3 gap-2">` | M1 — `flex-1` without `min-w-0` inside the row flex (229) | `flex-1 min-w-0 grid grid-cols-3 gap-2`; also add `min-w-0` to the 3 cell divs (M2) |
| 325 | delete `Button` `h-8 w-8 p-0 mt-6` | no `shrink-0` | add `shrink-0` |

At 3 columns in ~300px of content width each cell is ~92px — Field/Operator/Value selects are
extremely cramped; consider `grid-cols-1 sm:grid-cols-3` or stacking Field on its own row
(UX improvement, optional).

### 3.3 `ScheduleTrigger.tsx` — ❌ 2 issues (schedule node)

| Line | Code | Problem | Fix |
|---|---|---|---|
| 785 | time picker: `flex items-center gap-4 p-4 border rounded-lg` | min-content ≈ 300–330px (two `w-16` inputs + chevron columns + `text-2xl` clock preview + `gap-4` + `p-4`) vs ~328px available at 360 — and ~288px in the 320px TemplateEditor host | add `flex-wrap justify-center` (clock preview wraps below) or reduce to `gap-2 p-3` and `text-lg` preview |
| 694, 774 | label + `InputGuideLink` rows `flex items-center justify-between gap-2` | M1 — same pattern as FormNodeSettings | `min-w-0` on children |
| 727 | `PopoverContent className="w-[400px]"` | portal (not panel overflow) but wider than the panel it belongs to | cosmetic: `w-[min(400px,90vw)]` |

### 3.4 `ScheduleWiseSettings.tsx` — ⚠️ 1 pattern
Lines 231, 277 (and each per-operation field): label + guide-link rows `flex items-center
justify-between gap-2` — M1, same fix as 3.1/3.3. Everything else is single-column `space-y-2`
stacks of `w-full` inputs — fine.

### 3.5 `UserGuide.tsx` — ⚠️ 2 issues (the overlay the ⍰ links open)
- Line 198: fixed overlay `w-[380px] h-[500px]` — it's a `fixed inset-0` overlay, so it doesn't
  overflow the panel, but 380px exceeds small viewports; `w-[min(380px,92vw)]` recommended.
- Line 217: uses Radix `ScrollArea` internally — **M3 hazard**: long guide steps/example lines
  make the guide content wider than the card and clip. Same fix as the panel body: plain
  `overflow-y-auto` div (or fix the shared component, see 3.9).

### 3.6 Components verified ✅ compliant (no action)
- `editors/KeyValueEditor.tsx`, `editors/VariableListEditor.tsx`, `editors/CaseListEditor.tsx` —
  rows are `flex gap-1.5` with `flex-1 min-w-0` inputs and `shrink-0` delete buttons.
- `editors/HubSpotRecordEditor.tsx` — `grid-cols-1`, `shrink-0` buttons.
- `nodes/NodeCredentialSelector.tsx` — `min-w-0` + `truncate` throughout; `DropdownMenuContent
  w-72` is a portal.
- `FieldOwnershipToggle.tsx` — `flex-wrap`, `min-w-0`, `truncate`.
- `ui/guided-status-card.tsx` — `min-w-0 break-words` on all long text. (Minor: title `<p>` at
  line 76 has no `break-words`; only matters for pathological titles.)
- `NodeUsageCard.tsx` — fixed in commit `25641f1` (bounded card, truncating tabs, wrapping tips,
  bounded example).
- `MysqlQueryEditor.tsx` / `PostgresQueryEditor` / Mongo/Firebase/Supabase selects — previews
  live in portal popovers with their own `overflow-x-auto` and truncated cells.
- `FacebookConnectionStatus.tsx` — compact header buttons with `hidden sm:inline` text.
- `InputGuideLink.tsx` — the button itself is `max-w-full min-w-0 truncate`; it only overflows
  when its *parent row* is unconstrained (3.1, 3.3, 3.4).

### 3.7 PropertiesPanel's own render paths ✅ (after commits `25641f1` + `09ec4ff`)
- Root: `flex flex-col h-full overflow-hidden` + `boxSizing: border-box`.
- Header / footer `shrink-0`; body plain `flex-1 min-h-0 overflow-y-auto overflow-x-hidden`.
- `renderField` cases: text/number/select/json/textarea/date/time all wrapped in
  `min-w-0 max-w-full overflow-hidden`; `SelectTrigger` has `[&>span]:line-clamp-1`;
  runtime-value `<pre>` blocks use `max-h-28 overflow-auto whitespace-pre-wrap break-all`.
- Field card header row: `min-w-0` label with `truncate`, `shrink-0` switch, help link capped
  at `max-w-[150px]`.
- Form/Chat URL blocks: `break-all` code + `flex-shrink-0` icon buttons.
- Help `Sheet` is a portal.

### 3.8 UI primitives (shadcn) — ✅ as leaves, with one rule
`Input`, `Textarea`, `SelectTrigger` are `w-full` (they never overflow a *constrained* parent);
`Label` has no width behavior of its own → **rule: every flex row that contains a Label or any
text next to a control must put `min-w-0` on the text side and `shrink-0` on the control side.**

### 3.9 `ui/scroll-area.tsx` — systemic hazard (M3)
Every `ScrollArea` in a width-constrained container has the `display:table` viewport issue.
Already replaced in the panel body + AI editor (commit `09ec4ff`); still present in `UserGuide`
(3.5) and elsewhere in the app. Two options:
- Per-call-site: replace with plain `overflow-y-auto` divs where width is constrained (done so far).
- Global: patch the shared component's viewport —
  `<ScrollAreaPrimitive.Viewport className="… [&>div]:!block [&>div]:min-w-0">` — makes every
  usage wrap correctly; verify no call site depends on horizontal table sizing before applying.

---

## 4. Ordered fix plan

1. **Verify current deploy first** — hard refresh; confirm chunk is `PropertiesPanel-DQ9puLOz.js`
   or newer (DevTools → Network). Re-screenshot. M3 symptoms should already be gone.
2. `FormNodeSettings.tsx` — the 4 edits in 3.1 (visible in the reported screenshot).
3. `ConditionBuilder.tsx` — the 2 edits in 3.2 (if_else is a spec-named node).
4. Panel width contract — make `PropertiesPanel` `width: 100%` and give hosts the fixed width;
   fixes TemplateEditor's 320 vs 360 clipping (section 2).
5. `ScheduleTrigger.tsx` — time-picker wrap + label rows (3.3).
6. `ScheduleWiseSettings.tsx` — label rows (3.4).
7. `UserGuide.tsx` — ScrollArea replacement + viewport-capped width (3.5).
8. Optional hardening: global `ui/scroll-area.tsx` viewport patch (3.9); `guided-status-card`
   title `break-words`.

## 5. Verification checklist (after fixes)
- 360px panel: form (multi-field, select-type field with long options), google_gmail,
  slack_message, if_else (3-column condition row), schedule (time picker), schedulewise.
- Admin Template Editor (`w-80` host) — panel must not clip at 320px.
- Debug mode (full-width host).
- Open a ⍰ guide with long steps — no horizontal clipping inside the guide card.
- DevTools: `document.querySelectorAll('*')` horizontal scroll probe — no element inside the
  panel wider than the panel: `[...panel.querySelectorAll('*')].filter(e => e.scrollWidth > panel.clientWidth + 1)`.
