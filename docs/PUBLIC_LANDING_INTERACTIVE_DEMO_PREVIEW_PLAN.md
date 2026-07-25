## Status: planning only — no code written yet

This is a handover plan for the next working session (Codex). It is the result of a design discussion, not an implementation — read it in full before writing any code, then execute the milestones in order.

---

## Goal

Give anonymous (pre-login) visitors to the public homepage a **scripted, interactive preview** of what the product does, so they get a taste of the experience before signing up — without giving them real workflow access, and without exposing any AI/LLM cost or abuse surface to unauthenticated traffic.

**Two-tier product narrative this supports:**
- **Pre-login** = "watch it work" — a passive, guaranteed-good, zero-cost teaser.
- **Post-login** = "build it yourself" — the real, full Adaptive UI / wizard / workflow builder.

This is a distinct feature from the existing authenticated `/adaptive-ui` page (`POST /api/adaptive-ui`) and must **not** call it, extend it, or share its backend logic. That endpoint personalizes based on a real user's connected accounts/plan and has an LLM fallback — neither applies to, nor should be exposed to, a logged-out visitor.

### Interaction model (decided in discussion, do not deviate without re-confirming with the user)
- **No free-text input pre-login.** Interaction is limited to clicking one of **6** example pills, each showing a genuinely different, mixed-category automation pattern (see "The 6 scenarios" below) — not 6 near-identical trigger→action pairs.
- Clicking a pill plays a **scripted, timed reveal animation**: nodes appear one at a time, then the connecting edge animates in between them — read-only, non-interactive (no drag, no editing), autoplay.
- **Switching between pills is a transition, not a reload.** The stage (bounding frame) stays fixed on screen; the diagram inside it morphs from one pattern to the next. See "Transition choreography — switching between scenarios" below for the full spec. This is the most important UX detail of this feature — do not implement it as "clear canvas, replay animation from scratch" without the exit choreography described there.
- The prompt textarea may be shown for visual consistency with the real product, but should be **decorative only** pre-login (e.g. a typewriter effect cycling through the 6 example prompts) — not a functional input.

### The 6 scenarios (deliberately mixed categories, not 6 variations of the same shape)

Pick these for genuine breadth — different trigger types, different node counts (3-5), at least one branching/logic node, at least one AI node — so switching between pills is visually and conceptually varied:

| # | Label (pill text) | Nodes (in order) | Why it's included |
|---|---|---|---|
| 1 | "Notify our team on Slack when Stripe payment fails" | Stripe (trigger) → Slack | Payments + alerting, the simplest baseline pattern |
| 2 | "Create Jira ticket from Gmail" | Gmail (trigger) → Jira | Email + productivity/PM tooling |
| 3 | "Sync Notion database every day" | Schedule (trigger) → Notion | Time-based trigger + data sync, no external event needed |
| 4 | "Summarize form replies with AI and log them" | Form (trigger) → AI Agent → Google Sheets | Introduces an AI node + a 3-step linear chain |
| 5 | "Alert on negative mentions, ignore the rest" | Twitter/X (trigger) → If/Else (branching) → Discord | Introduces a **branching/logic node** — visually distinct (two output paths) |
| 6 | "Enrich new GitHub issues before emailing the team" | Webhook (trigger) → HTTP Request → Email | DevOps/API category, shows an HTTP enrichment step |

### Transition choreography — switching between scenarios

This is the core UX spec for the animation. Model it on the tab-switch pattern used by product pages like Stripe.com, Linear.app, and Vercel.com (a fixed stage, morphing contents), not a "clear and replay" pattern:

1. **Fixed stage.** One bounding frame with a fixed aspect ratio stays in exactly the same screen position for all 6 patterns and both idle/first-load and every subsequent switch. Only its contents change — never resize or reflow the surrounding page when switching pills.
2. **Exit, then enter, on every switch** (not just on first load):
   - Nodes/edges present in the outgoing pattern but not in the incoming one animate out first (fade + slight scale-down, ~150-200ms) before the new pattern starts building.
   - The incoming pattern's nodes then reveal one at a time with the same staggered cadence as the very first animation (~400-600ms between each node, edge draws in ~300-500ms after both endpoints are visible) — switching should feel like *the same trick played again with new pieces*, not an abrupt jump cut.
   - Where a node in the same visual "slot" appears in both the outgoing and incoming pattern (e.g. both start with a trigger node in the same position), prefer a **morph transition in place** over exit+re-enter — implement via Framer Motion's `layoutId` (already a dependency — `framer-motion` — no new library needed) so the shared element smoothly repositions/resizes instead of flickering.
   - Use Framer Motion's `AnimatePresence` to declaratively manage the exit/enter lifecycle rather than hand-rolled `setTimeout` chains — this is the standard, safe way to implement this class of transition in React and avoids the most common source of bugs here (animations firing out of order).
3. **Interrupt-safe.** If the visitor clicks pill 5 while pill 2's animation is still mid-playback, the current animation must cancel cleanly and the new one starts immediately — never queue up multiple animations or let two play simultaneously. Model this as a small state machine (`idle → animating(scenarioId) → settled(scenarioId)`) keyed by the active scenario id, where a new selection always interrupts and restarts regardless of current phase.
4. **Total transition budget**: aim for the full exit+enter sequence to complete in under ~2.5-3 seconds even for the 5-node scenario, so repeatedly clicking through all 6 pills feels snappy, not like sitting through 6 separate mini-movies.
5. **Accessibility**: respect `prefers-reduced-motion` — when set, skip the staggered choreography entirely and snap directly to the final state of whichever pattern is selected (WCAG 2.2 SC 2.3.3; standard practice for any motion-heavy marketing site).
6. **Active-pill affordance**: the currently-selected pill has a clear active/filled state. Optional enhancement (not required for v1): auto-advance through all 6 patterns every ~4-5s while the visitor hasn't yet interacted, permanently stopping autoplay after their first manual click.

---

## Why this needs a real backend + DB (not just hardcoded frontend JSON)

Two legitimate, low-risk reasons to have a backend/DB component, confirmed against this repo's existing conventions:

1. **Content should be editable without a frontend deploy.** The scripted demo sequences (which nodes, in what order, what labels/icons) should live in a DB table, editable via an admin page — the same pattern already used for `templates` (`worker/src/api/admin-templates.ts` + `ctrl_checks/src/pages/admin/TemplatesManager.tsx`/`TemplateEditor.tsx`). Marketing/admin should be able to add a 4th example or tweak wording without touching code.
2. **Conversion analytics.** Knowing which example pill gets clicked most, and whether visitors watch the full animation before leaving, is real product data worth capturing. There is **no existing analytics/telemetry table in this codebase** (confirmed by research — the closest thing, `audit-log-service.ts`, is for authenticated user actions, not anonymous visitor events), so this introduces a small, genuinely new, well-scoped table.

Both of these are safe because **neither involves AI/LLM calls or real workflow execution** — they're a read-only content API and a write-only analytics log.

---

## Architecture

### 1. Database (new — use a real Prisma migration, not the Supabase-out-of-band pattern)

Unlike `templates` (which is a pre-existing Supabase-provisioned table with no `CREATE TABLE` in-repo — a known gap from before this convention was tightened), this is a **brand-new table with zero existing data**. Use a proper tracked Prisma migration under `worker/prisma/migrations/` so the schema is version-controlled from day one.

```sql
-- landing_demo_scenarios: the scripted content, admin-editable
CREATE TABLE landing_demo_scenarios (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label         text NOT NULL,              -- pill text, e.g. "Notify our team on Slack when Stripe payment fails"
  sort_order    int NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  script        jsonb NOT NULL,             -- ordered steps, see shape below
  created_by    uuid,                       -- admin user id
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- landing_demo_events: anonymous, fire-and-forget analytics
CREATE TABLE landing_demo_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id   uuid REFERENCES landing_demo_scenarios(id),
  session_id    text NOT NULL,              -- random client-generated id, NOT tied to any user account
  event_type    text NOT NULL,              -- 'view' | 'pill_click' | 'animation_complete' | 'cta_click'
  referrer      text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_landing_demo_events_scenario ON landing_demo_events(scenario_id);
CREATE INDEX idx_landing_demo_events_created  ON landing_demo_events(created_at);
```

**`script` JSON shape** (ordered reveal steps — purely visual, no relation to real executable node types, no registry lookup). Example for scenario 5 (the branching one — two output paths from the If/Else node, shown as two edges with different `sourceHandle`s):

```json
{
  "steps": [
    { "type": "node", "id": "n1", "delayMs": 300,  "node": { "label": "New Mention",  "icon": "twitter",  "category": "trigger", "position": { "x": 60,  "y": 160 } } },
    { "type": "node", "id": "n2", "delayMs": 900,  "node": { "label": "Negative?",     "icon": "if_else",  "category": "logic",   "position": { "x": 340, "y": 160 } } },
    { "type": "edge", "id": "e1", "delayMs": 1400, "edge": { "source": "n1", "target": "n2" } },
    { "type": "node", "id": "n3", "delayMs": 1900, "node": { "label": "Alert Discord", "icon": "discord",  "category": "communication", "position": { "x": 620, "y": 60 } } },
    { "type": "edge", "id": "e2", "delayMs": 2300, "edge": { "source": "n2", "target": "n3", "sourceHandle": "true" } }
  ]
}
```

Seed all **6** scenarios listed in "The 6 scenarios" table above, `is_active: true`, `sort_order: 0..5`, each with its own `script` following this shape (3 nodes for the simple ones, up to 5 for the branching/3-step ones).

### 2. Backend — public endpoints (no auth, no LLM, global rate limit already covers these)

- `GET /api/landing-demo/scenarios` — returns active scenarios ordered by `sort_order`. Public, no auth middleware, matches the existing pattern of `GET /api/templates` and `GET /api/node-definitions` (`worker/src/index.ts`). Cacheable (short TTL, e.g. `Cache-Control: public, max-age=60`) since content changes rarely.
- `POST /api/landing-demo/events` — fire-and-forget event log. Body: `{ scenarioId, sessionId, eventType, referrer? }`. Validate `eventType` against the fixed enum, validate `scenarioId` exists, insert and return `204`. No auth. The existing global `tokenBucketRateLimiter` (`worker/src/index.ts:454-458`, Redis-backed, ~100 req/min/IP by default) already covers this route; optionally wrap with `distributedRateLimit({ endpointKey: 'landing-demo-events', perUserLimit: <N>, globalLimit: <N>, windowMs: 60_000 })` keyed by IP for a stricter, dedicated ceiling, matching how `/api/execute-workflow` layers a stricter limit on top of the global one.

### 3. Backend — admin CRUD (authenticated, gated)

- `worker/src/api/admin-landing-demo.ts` — GET/POST/PUT/DELETE on `landing_demo_scenarios`, modeled on `worker/src/api/admin-templates.ts`. **Register it in `index.ts` with route-level `requireAdmin`/`requirePermission` middleware** (the pattern used for most admin routes, e.g. `index.ts:988-993`) rather than `admin-templates.ts`'s inline manual-auth-check-inside-the-handler pattern — that inline pattern is an established inconsistency in this codebase, don't propagate it further.

### 4. Frontend — admin UI

- `ctrl_checks/src/pages/admin/LandingDemoManager.tsx` (list/create/delete) + `LandingDemoEditor.tsx` (edit one scenario's label, sort order, active flag, and script steps) — modeled directly on `TemplatesManager.tsx`/`TemplateEditor.tsx`. Add a nav entry alongside the existing Templates/Users/Subscriptions admin tabs.
- The script editor doesn't need to be a full visual builder — a structured form (ordered list of steps, each with type/label/icon/category/delay, add/remove/reorder) is enough; it's a small, fixed content shape, not a general workflow.

### 5. Frontend — public preview component

- New component, e.g. `ctrl_checks/src/components/landing/InteractiveDemoPreview.tsx`, placed in `ctrl_checks/src/pages/Index.tsx` at the existing `WorkflowDemoSection` slot (`id="demo"`, currently just a static `<video>` embed — replace or place alongside it; the section is already the natural "see it in action" spot in the page's existing layout: `Header → Hero → IntegrationsMarqueeSection → HowItWorks → WorkflowDemoSection → OpenCoreSection → ...`).
- Data fetching: use TanStack Query's `useQuery` (`QueryClientProvider` is already app-wide in `App.tsx`; no landing component uses it yet, but it's the established pattern everywhere else in this app, e.g. `useConnections.ts`) to fetch `GET /api/landing-demo/scenarios` once on mount.
- Render: **6** pill buttons (scenario labels) + a fixed-aspect-ratio stage. Clicking a pill fires `POST /api/landing-demo/events` (`pill_click`, fire-and-forget, don't block the animation on it), then plays that scenario's `script` following the full "Transition choreography" spec above — exit the previous pattern's nodes/edges, then stagger-reveal the new pattern's nodes per `delayMs`, then draw edges. Reuse the visual node card component/styling from the workflow canvas for brand consistency, in a stripped-down read-only variant (no `@xyflow/react` interactivity needed — implement with Framer Motion `AnimatePresence` + `layoutId` over absolutely-positioned elements, or a minimal static `@xyflow/react` instance with `nodesDraggable={false}`, `nodesConnectable={false}`, `elementsSelectable={false}` if edge-drawing is easier that way). On animation completion, fire `animation_complete`. A visible CTA ("Sign up to build your own") fires `cta_click` on click.
- Decorative textarea above the pills, per the interaction-model decision above — cycles through the 6 example prompts, not wired to anything functional.

---

## Guardrails (do not deviate)

- **No AI/LLM calls anywhere in this feature.** Nothing here should import or call the Gemini orchestrator, `/api/generate-workflow`, or `/api/adaptive-ui`.
- **No real workflow creation/execution reachable from this feature.** The rendered "nodes" are display-only mockups (label/icon/category strings for visual styling) — they must never be passed to `unifiedNodeRegistry`, `execute-workflow.ts`, or any DAG compiler. This is a pure content-display feature and must not touch the node-registry single-source-of-truth system at all.
- **No PII in analytics.** `session_id` is a random client-generated UUID (e.g. stored in `localStorage`), never tied to a real user account, email, or IP beyond what the global rate limiter already logs.
- Keep this entirely separate from `/adaptive-ui` — different route, different component tree, different backend files. Do not modify `worker/src/api/adaptive-ui.ts` or its frontend page.

---

## Milestones (execute in order; each should be verified — type-check + live browser check — before moving to the next)

1. **DB migration**: new Prisma migration creating `landing_demo_scenarios` + `landing_demo_events`, seed all **6** scenarios from "The 6 scenarios" table.
2. **Backend read endpoint**: `GET /api/landing-demo/scenarios`, wired into `worker/src/index.ts` as a public route. Verify via `curl`/browser that it returns all 6 seeded scenarios in `sort_order`.
3. **Backend write endpoint**: `POST /api/landing-demo/events`, with validation + rate limiting. Verify a manual POST inserts a row.
4. **Backend admin CRUD**: `worker/src/api/admin-landing-demo.ts`, gated with `requireAdmin`, wired into `index.ts`.
5. **Frontend admin UI**: `LandingDemoManager.tsx` + `LandingDemoEditor.tsx`, nav entry added. Verify an admin can edit a scenario's label/script and see it reflected via the read endpoint.
6. **Frontend public component — static render first**: `InteractiveDemoPreview.tsx`, fetches all 6 scenarios, renders 6 pills + decorative textarea + the fixed stage with the selected scenario's final state (no animation yet) to validate data flow end to end before adding motion.
7. **Animation + transition choreography**: implement the full "Transition choreography" spec — staggered node/edge reveal on first load, exit-then-enter morph on every subsequent pill switch (Framer Motion `AnimatePresence` + `layoutId`), interrupt-safe switching, `prefers-reduced-motion` support. Wire `view`/`pill_click`/`animation_complete`/`cta_click` analytics events.
8. **Placement + responsive/perf pass**: slot into `Index.tsx` at the `WorkflowDemoSection` position; verify on mobile and desktop viewport widths; confirm no layout shift/jank; confirm rapid repeated pill-clicking never glitches or stacks animations.
9. **Live end-to-end verification** (per this repo's convention — do not rely on local test runs): open the running dev server (`ctrl_checks` on :5173, `worker` on :3001) in a real browser while logged out, click through all 6 example pills (including rapid switching between them), confirm the transition choreography plays correctly for each including the branching scenario (#5), confirm analytics events land in `landing_demo_events`, confirm the admin editor round-trips a content change.

**Definition of done**: all 9 milestones complete and step 9's live verification passes for all 6 scenarios — including rapid interrupt-switching between them — with no console errors.

---

## Handover prompt for the next session

```
Read docs/PUBLIC_LANDING_INTERACTIVE_DEMO_PREVIEW_PLAN.md in full before writing any code.

Implement the plan's 9 milestones in order. After each milestone, verify it before moving to
the next (type-check for backend/frontend changes; a real curl/browser check for anything
DB- or API-facing). Do not skip ahead.

This feature is a pre-login, anonymous-visitor "watch it work" preview on the public homepage:
6 example pills, each a genuinely different mixed-category automation pattern (payments,
email/PM, scheduled sync, AI+logging, branching/logic, DevOps/API — see the plan's "The 6
scenarios" table for the exact list and node sequences). Clicking a pill plays a scripted
node-by-node reveal animation inside a fixed-position stage. The most important UX requirement
is the plan's "Transition choreography" section: switching between pills must be a morphing
transition (exit outgoing nodes, then stagger in the incoming ones, using Framer Motion
AnimatePresence + layoutId — already a dependency), not a clear-and-replay. It must be
interrupt-safe (clicking a new pill mid-animation cancels cleanly and restarts) and respect
prefers-reduced-motion.

Hard constraints, do not deviate from these without checking with the user first:
- No AI/LLM calls anywhere in this feature (it must not touch /api/adaptive-ui,
  /api/generate-workflow, or the Gemini orchestrator).
- The rendered demo nodes are visual-only mockups — never pass them through
  unifiedNodeRegistry, execute-workflow.ts, or any DAG/workflow-execution code path.
- Pre-login interaction is button/pill clicks only — no functional free-text input.
- Keep this fully separate from the existing authenticated /adaptive-ui page/feature.
- New DB table: use a real tracked Prisma migration (not an out-of-band Supabase table
  like the existing `templates` table, which has no CREATE TABLE in-repo — don't repeat
  that gap here).

When all 9 milestones are done and live-verified in a real browser (logged out, all 6
example pills tested including rapid switching between them, the branching scenario (#5)
rendering its two output paths correctly, no console errors, admin editor round-trips a
content change), the goal is complete.
```
