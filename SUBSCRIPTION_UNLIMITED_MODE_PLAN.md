# Implementation Plan: Admin "Unlimited Access" Toggle + Subscription Plan Management

Status: **research complete, no code changed yet.** This file is the handoff context for the implementation conversation.

---

## 1. What the admin actually asked for

1. A new **Admin → Subscriptions** area that lets the admin see and **edit every plan's details** (price, workflow allowance, feature list) and **deactivate ("remove") a plan** from what's offered.
2. A **single system-wide toggle** ("Unlimited Mode"):
   - **OFF** → normal behavior, subscription plans/pricing/limits apply as they do today.
   - **ON** → subscription enforcement is bypassed **for every user, everywhere in the system** (no workflow-count limit, no plan-based rate limit, no upgrade paywalls) — for running live demos or giving temporary free access.
3. Must not break the existing paid Razorpay flow when the toggle is off.

This doc covers points 1–3 end-to-end: what exists today, exactly where it needs to be touched, and the traps to avoid.

---

## 2. Current system — how subscriptions actually work today

### 2.1 Database (raw SQL migrations, NOT Prisma)

Subscription tables live in `worker/migrations/011_subscription_management_schema.sql` + `012_subscription_default_data.sql` + `017_add_workflow_quota_credits.sql`. They are queried via `getDbClient()` / `getDbPool()` (`pg.Pool` to AWS RDS), never via Prisma. Prisma (`worker/prisma/schema.prisma`) only models workflows/executions/memory — unrelated.

- `subscription_plans`: `id, name CHECK IN ('Free','Pro','Enterprise'), workflow_limit, price_inr, features jsonb, is_active`. Seeded: Free=2 workflows/₹0, Pro=20/₹1999 (₹1 in dev-pricing mode), Enterprise=999/₹4999 (₹1 in dev-pricing mode).
- `subscriptions`: one active row per user (`user_id, plan_id, status, started_at, expires_at, auto_renew`), trigger-enforced single-active-row.
- `users.workflow_quota_bonus` (int, added in `017`): **additive credits**. See §2.3 — this is the load-bearing quirk.
- `payments`: Razorpay order/payment/signature audit rows.
- `subscription_history`, `admin_actions`: audit trails. `admin_actions` is already used for admin plan-upgrade actions (`worker/src/api/subscriptions.ts:398-406`) — reuse this for the new toggle's audit log.
- `user_ai_wallet_settings` / `ai_wallet_usage_events`: the "bring your own Gemini key" feature. Not plans, but **this is the existing architectural template for what we're about to build** (see §2.4).

### 2.2 Backend enforcement points (all must respect the new toggle)

Two DB functions are the ultimate source of truth:
- `check_workflow_limit(uid)` (`017_add_workflow_quota_credits.sql:89-114`)
- `get_user_subscription_details(uid)` (`017:48-87`)

Both compute the limit as **`Free.workflow_limit + users.workflow_quota_bonus`** — see §2.3.

Call sites / middleware that gate on this (all live in `worker/src/`, all import the **top-level** `services/subscription-service.ts` and `services/payment-service.ts` — confirmed via grep, these are the ones actually wired into `index.ts`):

| File | Function | What it does when limit exceeded |
|---|---|---|
| `core/middleware/workflow-limits.ts:37-96` | `checkWorkflowLimit` | 403 `WORKFLOW_LIMIT_EXCEEDED`. Already has a bypass pattern to copy — see §2.4. Fails open if DB unreachable. |
| `core/middleware/workflow-limits.ts:101-142` | `enforceWorkflowLimit` | wraps the above + increments count |
| `core/middleware/workflow-limits.ts:391-433` | `requireWorkflowCapacityForAi` | gates AI workflow generation specifically |
| `core/middleware/workflow-limits.ts:197-222` | `requirePlan(allowedPlans[])` | 403 `PLAN_UPGRADE_REQUIRED` |
| `core/middleware/subscription-auth.ts:444-469` | `requireSubscriptionPlan` | 403 `SUBSCRIPTION_UPGRADE_REQUIRED` |
| `core/middleware/tier-rate-limit.ts` | `tierRateLimit('execute'\|'generate')` | plan-tier → per-minute Redis-backed call cap (free 60/20 per min, paid 100/50, enterprise 200/100), 429 `TIER_RATE_LIMIT_EXCEEDED`. Mounted on `POST /api/execute-workflow` and `POST /api/generate-workflow` in `index.ts`. |
| `api/save-workflow.ts:280-296` | new-workflow save path | direct `canCreateWorkflow()` call |
| `api/workflow-setup-lifecycle.ts:305,388` | setup/completion lifecycle | direct call |
| `api/db-proxy.ts:123-141` | `enforceWorkflowCreationLimit` | generic DB-proxy insert-into-`workflows` path |

**Dead code — do not waste time wiring the toggle into these, they are not imported anywhere in `src/` outside their own file:**
- `worker/src/services/subscription/subscription-service.ts` (Redis-cached duplicate)
- `worker/src/services/subscription/payment-service.ts` (duplicate)
- `worker/src/services/subscription/workflow-limit-service.ts` (duplicate, own Redis keys)
- `handleRazorpayWebhook` in `worker/src/api/payments-razorpay.ts:181` exists but **is not mounted as a route anywhere in `index.ts`** — payment confirmation today relies solely on the client-side `verify` call. This is a pre-existing gap, unrelated to our task — do not "fix" it as a side effect, just don't be surprised the webhook path is dead.

Non-plan-based protective rate limits (`distributed-rate-limit.ts`, `redisTokenBucket.ts`) are **not** plan-driven and should stay active even in Unlimited Mode — they protect infra, not billing.

### 2.3 Critical quirk: plan editing does not do what you'd naively expect

Read `check_workflow_limit()` / `get_user_subscription_details()` again: the effective workflow limit for **every** user, regardless of which plan they're on, is:

```
Free.workflow_limit + users.workflow_quota_bonus
```

`workflow_quota_bonus` is a one-time credit added at the moment of a successful paid purchase (`addWorkflowCredits`, `subscription-service.ts:135-146`), sized to whatever the purchased plan's `workflow_limit` was **at that instant**. Pro/Enterprise plans' `workflow_limit` column is **not** re-read for existing subscribers — it only sizes the credit grant for new purchases.

Implication for the admin plan-editor UI:
- Editing **Free.workflow_limit** → takes effect immediately for literally every user (their baseline changes on next request).
- Editing **Pro/Enterprise.workflow_limit or price_inr** → only affects the **next** person who buys that plan; it does not retroactively change existing subscribers' quota.
- This is almost certainly fine/desirable for a "demo mode" admin, but **the next conversation must surface this in the UI copy** (e.g. a note under Pro/Enterprise: "Changes apply to future purchases only") so the admin isn't confused when editing Pro's limit doesn't change an existing Pro user's quota.

`subscription_plans.name` has a hard `CHECK IN ('Free','Pro','Enterprise')` constraint, and this literal 3-value set is assumed by: the TS union type (`subscription-service.ts:9`), `PLAN_PRICING` in `payment-service.ts`, `resolveTier()` in `tier-rate-limit.ts:33-39` (anything not exactly "free"/"enterprise" buckets into "paid"), and `getSuggestedUpgradePlan` switches in two middleware files. **Recommendation: don't add a 4th plan name or let the admin rename/add arbitrary plans in v1.** Scope plan editing to: edit `price_inr`, `workflow_limit`, `features` (jsonb array), and `is_active` (soft "remove"/"restore") on the existing 3 rows. This avoids touching the CHECK constraint and the three hardcoded switches — much lower risk for a demo-focused feature. Hard `DELETE` should not be offered (FK references from `subscriptions.plan_id`, `subscription_history`) — "remove" = `is_active = false`, which `getAvailablePlans()` already filters on (`subscription-service.ts:159-163`, `.eq('is_active', true)`), so this already works end-to-end on the read path with zero new backend logic beyond an UPDATE endpoint.

### 2.4 The reusable template: Gemini Wallet "subscriptionFrozen" bypass

`worker/src/services/ai/gemini-wallet-service.ts` already implements almost exactly the pattern needed. When a user activates their own Gemini key, `getState()` returns `subscriptionFrozen: true`, and **every** limit-checking middleware (`checkWorkflowLimit`, `requireWorkflowCapacityForAi`) explicitly checks this flag first and short-circuits to `limit: Number.MAX_SAFE_INTEGER` + `next()` before ever calling `canCreateWorkflow()`. It's read fresh via a DB query on every request — no caching, so state changes take effect immediately.

**The new "Unlimited Mode" toggle should copy this exact shape**, just system-wide instead of per-user: a single boolean read at the top of each gate, short-circuiting everything else in that gate.

### 2.5 Frontend — admin pages, gating points, state

Admin routes (`ctrl_checks/src/App.tsx:156-243`, all behind `<AdminRoute>` → `useRole().canAccessAdmin`):

| Route | File | Today |
|---|---|---|
| `/admin/subscriptions` | `pages/admin/AdminSubscriptions.tsx` | **Per-user** plan reassignment only (`GET /api/admin/subscriptions/users`, `POST /api/admin/subscriptions/upgrade/:userId`). No plan/pricing CRUD exists anywhere, frontend or backend. |
| `/admin/settings` | `pages/admin/AdminPlaceholder.tsx` | Empty placeholder ("will appear in a future release") — already routed, already in nav (`components/layout/nav-config.ts`). **This is the natural home for the new toggle.** |

Client-side gating that must react to the toggle (only two real gates found — confirmed no per-node/per-execution client-side gating exists):
- `components/workflow/WorkflowCreationOptions.tsx:64` — `aiLocked = remainingWorkflows <= 0` → locks "Create Using AI" card.
- `pages/AIWorkflowBuilder.tsx:23-60` — full-screen paywall replacing the whole AI wizard route when quota exhausted.
- Softer, non-blocking "Upgrade Plan" CTAs to also hide/relabel when Unlimited Mode is on: `pages/Dashboard.tsx:459-468`, `components/layout/AppChromeHeader.tsx:116-121`, `pages/Subscriptions.tsx` itself, `components/landing/Pricing.tsx` (hardcoded marketing card, separate from live data).

No shared subscription store exists — three components each hold local `useState` duplicating subscription info (`WorkflowCreationOptions.tsx`'s `useSubscriptionUsage()`, `Subscriptions.tsx`, `Profile.tsx`). `Profile.tsx` already carries a `billingMode: "subscription" | "gemini_wallet"` field in its local state — the closest existing frontend precedent for a mode flag. Recommend introducing a single hook (e.g. `useSubscription()` via React Query, `QueryClientProvider` already set up in `App.tsx`) that also carries the new `unlimitedModeEnabled` flag, so all gating points read from one place instead of three.

Reusable UI: `components/ui/switch.tsx` (Radix Switch, already styled/used) — copy the exact pattern at `pages/Profile.tsx:453-459` (label + description + async `onCheckedChange` + disabled/busy state) for the new toggle.

---

## 3. Proposed design

### 3.1 New system setting: `system_settings` table (or single-row config)

Add a tiny table, e.g.:
```sql
CREATE TABLE IF NOT EXISTS public.system_settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id)
);
```
Row: `key = 'unlimited_mode'`, `value = { "enabled": false }`. A dedicated table (not a hardcoded `users` column) keeps this generic for any future system-wide flag, and matches the existing "small dedicated table per concern" style already used in this codebase (`user_ai_wallet_settings`, `admin_actions`, etc).

Backend helper, e.g. `worker/src/services/system-settings-service.ts`:
- `isUnlimitedModeEnabled(): Promise<boolean>` — reads the row. Use a **short in-process cache (5–10s TTL)**, same spirit as `subscription-auth.ts`'s existing `_subscriptionCache` pattern, so a toggle flip propagates near-instantly without hammering the DB on every request (this endpoint is checked on nearly every gated call).
- `setUnlimitedMode(enabled: boolean, adminUserId: string): Promise<void>` — UPDATE + write an `admin_actions` row (`action: 'unlimited_mode_toggled'`, `details: { enabled }`), same audit pattern as `subscriptions.ts:398-406`.

### 3.2 Wire the bypass into every enforcement point from §2.2

At the very top of each of: `checkWorkflowLimit`, `enforceWorkflowLimit`, `requireWorkflowCapacityForAi`, `requirePlan`, `requireSubscriptionPlan`, `tierRateLimit`, plus the three direct `canCreateWorkflow()` call sites (`save-workflow.ts`, `workflow-setup-lifecycle.ts`, `db-proxy.ts`) — add:
```ts
if (await isUnlimitedModeEnabled()) return next(); // or equivalent bypass return value
```
mirroring exactly how `subscriptionFrozen` is checked today. Cheapest/lowest-risk approach: put the check inside `canCreateWorkflow()` / `getSubscriptionUsage()` themselves in `subscription-service.ts` so every direct call site is covered automatically with one change, **plus** a separate explicit check in `tier-rate-limit.ts` (since that one doesn't go through `subscription-service.ts` at all — it's a standalone Redis limiter keyed on `req.user.subscriptionPlan`).

Also extend `GET /api/subscriptions/plans` and `GET /api/subscriptions/current` responses with `unlimitedModeEnabled: boolean` so the frontend can react without a second round-trip.

### 3.3 Admin API — plan CRUD + toggle endpoint

New routes under the existing `/api/admin/subscriptions/*` namespace in `worker/src/api/subscriptions.ts` (same file as the existing `adminGetUsers`/`adminUpgradeUser`, same `requireAdmin` guard, same `admin_actions` audit pattern):

- `GET /api/admin/subscriptions/plans` — list all plans including inactive ones (admin view, unlike the public endpoint which filters `is_active = true`).
- `PATCH /api/admin/subscriptions/plans/:id` — update `price_inr`, `workflow_limit`, `features`, `is_active`. Validate `workflow_limit >= 0`, `price_inr >= 0`, reject `name` changes (immutable, per §2.3 CHECK constraint caveat).
- `GET /api/admin/settings/unlimited-mode` — current state.
- `PUT /api/admin/settings/unlimited-mode` — `{ enabled: boolean }`, calls `setUnlimitedMode()`.

### 3.4 Frontend

- Extend `src/lib/api/admin.ts` with `getAdminSubscriptionPlans()`, `updateSubscriptionPlan(id, patch)`, `getUnlimitedMode()`, `setUnlimitedMode(enabled)` — following the exact pattern already used for templates/landing-demo CRUD in that same file.
- Build out `/admin/settings` (currently `AdminPlaceholder.tsx`) into a real page: a "Demo / Unlimited Access" card with the Switch (copy `Profile.tsx:453-459` pattern) + confirmation copy explaining the blast radius ("This affects every user immediately"), and a "Subscription Plans" card/table listing the 3 plans with inline-editable price/limit/features and an active/inactive toggle per plan (reuse `Checkbox` pattern from `LandingDemoEditor.tsx`, or add a per-row `Switch`).
- Add the new `useSubscription()`/`usePlan()` hook (React Query) that fetches `/api/subscriptions/current` (now including `unlimitedModeEnabled`) and use it to gate/hide: `WorkflowCreationOptions.tsx:64`, `AIWorkflowBuilder.tsx:23-60`, the "Upgrade Plan" CTAs in `Dashboard.tsx` and `AppChromeHeader.tsx`, and `Subscriptions.tsx` (show a banner "Unlimited access is currently active — no plan required" instead of pricing cards when the flag is on).
- Add "Plans" (or fold into "Subscriptions") to `components/layout/nav-config.ts`'s `ADMIN_SECTION_NAV` if a separate page is used instead of extending `/admin/settings`.

---

## 4. What NOT to touch / non-goals for this task

- Do not fix the unmounted Razorpay webhook route — pre-existing gap, separate concern.
- Do not delete the dead-code duplicate services (`services/subscription/*`) as part of this task unless asked — out of scope, riskier than it looks if something non-obvious still imports them at runtime via a path this research missed.
- Do not add a 4th plan tier or relax the `subscription_plans.name` CHECK constraint — not needed for "edit price/limit/features + deactivate," and touches three hardcoded switches (§2.3).
- Do not touch `distributed-rate-limit.ts` / `redisTokenBucket.ts` — infra protection, not billing, should stay active even in Unlimited Mode.
- Don't forget the 30s in-process auth cache (`subscription-auth.ts` `_subscriptionCache`/`_roleDbCache`) — not directly related to the new toggle's own cache, but worth knowing an already-logged-in admin/user's role/plan can lag up to 30s behind a DB change during testing.

---

## 5. Suggested implementation order (for the next conversation)

1. Migration: `system_settings` table + seed row (`unlimited_mode = false`).
2. `system-settings-service.ts` with `isUnlimitedModeEnabled()` / `setUnlimitedMode()`.
3. Wire bypass into `subscription-service.ts` (`canCreateWorkflow`/`getSubscriptionUsage`) + standalone check in `tier-rate-limit.ts`.
4. Admin API endpoints (toggle + plan CRUD) in `subscriptions.ts`, mounted in `index.ts`, `requireAdmin`-gated, audit-logged.
5. Extend `/api/subscriptions/current` + `/plans` payloads with `unlimitedModeEnabled`.
6. Frontend: `src/lib/api/admin.ts` additions.
7. Frontend: build out `/admin/settings` page (toggle + plan table).
8. Frontend: `useSubscription()` hook + update the ~5 gating/CTA call sites to respect `unlimitedModeEnabled`.
9. Manual verification per the checklist below (this repo's convention is live testing post-deploy, not local `npm test` — see project memory on testing strategy).

### Verification checklist
- [ ] Toggle OFF (default): existing Free/Pro/Enterprise flow, Razorpay checkout, and workflow-count paywall all behave exactly as before.
- [ ] Toggle ON: a brand-new Free-tier user can create workflows past their normal 2-workflow limit; AI workflow generation is not paywalled; `tierRateLimit` no longer 429s at the free-tier cap.
- [ ] Toggle ON → OFF: normal limits resume immediately (check the 5–10s cache doesn't leave a stale "unlimited" window longer than expected).
- [ ] Editing Free plan's `workflow_limit` while toggle is OFF changes every existing user's quota immediately (expected quirk, §2.3) — confirm the admin UI explains this.
- [ ] Editing Pro/Enterprise plan fields does NOT change an already-subscribed user's current quota (expected quirk, §2.3) — confirm the admin UI explains this too.
- [ ] Deactivating a plan (`is_active=false`) removes it from `/api/subscriptions/plans` and the `/subscriptions` pricing page, without affecting anyone already subscribed to it.
- [ ] Admin API endpoints reject non-admin callers (403).
- [ ] Toggle action and plan edits both produce an `admin_actions` row.
