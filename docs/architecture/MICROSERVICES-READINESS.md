# SaaS & Microservices Readiness

Written in response to: *"I want to build a SaaS model so I need to build the microservices
architecture, right?"*

Short answer: **no — those are separate decisions, and the second one is not required by the
first.** This document explains why, states where the codebase actually stands, and gives an
ordered path if you decide you want a true service architecture anyway.

---

## 1. SaaS does not require microservices

The largest SaaS products in the world ran, and several still run, on monoliths. What SaaS
*does* require is a different list:

| SaaS requirement | Why | Depends on microservices? |
|---|---|---|
| Tenant isolation | One customer must never see another's data | **No** |
| Metered usage & billing | You charge for something measurable | **No** |
| Per-tenant limits / quotas | One customer cannot exhaust the platform | **No** |
| Blast-radius control | One customer's failure is not everyone's | Partly |
| Observability per tenant | "Is it slow *for them*?" | **No** |
| Independent scaling of hot paths | Execution scales differently from CRUD | Sometimes |

Only the last two get real help from splitting services, and only after the first four exist.

Microservices buy **independent deployability and independent scaling**, and charge for it in
distributed transactions, network failure modes, eventual consistency, and operational
surface. That is a good trade for a large team shipping on separate cadences. For a small
team it usually slows delivery — and today you have **seven deployables and one database**,
which is the shape that carries the costs without the benefits.

---

## 2. Where this codebase actually stands

### 2.1 Against the microservices criteria

| Criterion | Status |
|---|---|
| Independently deployable | ✅ separate CI, lockfiles, systemd units |
| **Owns its own data** | ❌ one shared PostgreSQL schema |
| Bounded context owns its domain | ❌ node registry lives only in `worker/` |
| Fails independently | ⚠️ worker falls back in-process; failure is masked |

### 2.2 Against the SaaS criteria — the more important table

| Requirement | Status | Evidence |
|---|---|---|
| Tenant isolation | ⚠️ **user-scoped, not tenant-scoped** | Prisma schema has 7 models and only **2** `userId` references. No `organization`, `tenant`, or `workspace` model exists |
| Billing primitives | ⚠️ **exist, but off-schema** | `plans`, `subscriptions`, `profiles` are queried in raw SQL from `worker/src`, but appear in **no** Prisma model |
| Quotas | ⚠️ partial | Quota logic exists in the worker; not represented in the schema of record |
| Blast-radius control | ❌ | One shared DB, one worker process holding all 360 routes |
| Per-tenant observability | ❌ **[UNVERIFIED]** | Correlation IDs exist; no evidence of tenant dimension in metrics |

**This is the finding that matters.** Your SaaS gaps are in the data model and the billing
layer — not in how many processes you run. Splitting services would not close a single row of
that second table.

### 2.3 The off-schema billing tables are a live risk

`plans`, `subscriptions` and `profiles` are read by raw SQL but are not Prisma models. So:

- No migration history governs them.
- No type safety touches them.
- `prisma migrate deploy` in the worker's pipeline does not know they exist.
- A schema drift between environments would surface as a runtime error, not a failed deploy.

For a system about to take money, that is the highest-value thing on this page to fix, and it
has nothing to do with architecture style.

---

## 3. If you want microservices anyway — the correct order

The common failure is to split code first. **Split data first**; code follows almost
mechanically, and if you cannot split the data you have learned the boundary was wrong before
writing anything.

### Phase 0 — Make the current system honest *(do this regardless)*

1. **Bring `plans` / `subscriptions` / `profiles` into the Prisma schema.** Whatever else you
   decide, the billing tables must be under migration control.
2. **Introduce a tenant concept** (`organization` / `workspace`) and scope every table to it.
   Retrofitting tenancy after customers exist is materially harder than before.
3. **Remove the silent fallbacks**, or make them loud. Today "ai-generator is down" and
   "ai-generator is up" are indistinguishable at the call site. You cannot operate what you
   cannot see failing.
4. **Consolidate the LLM model constant.** `ai-generator` hardcodes a model the worker never
   references (SYSTEM-ARCHITECTURE §7.1). Two systems currently make one decision.

Phase 0 delivers real SaaS value on its own. **Stop here if that is all you need.**

### Phase 1 — Establish a boundary before enforcing it

5. Pick **one** service to make real. `credential-service` is the strongest candidate: the
   clearest bounded context, a genuine security boundary (it can return decrypted secrets),
   and the least entanglement with the node registry.
6. Give it **its own schema** — separate Postgres schema first, separate database later. It
   owns those tables; nothing else reads them.
7. Replace every direct read of those tables elsewhere with an API call. Expect this to hurt;
   the pain is the point, and it tells you where the coupling actually is.
8. Delete the worker's fallback for it. A dependency you can silently skip is not a boundary.

### Phase 2 — Repeat only where it pays

9. `trigger-service` next — it already has an externally-addressable contract
   (`/webhook/:workflowId`), so its interface is real whether or not you formalise it.
10. `workflow-crud-service` after that — it already fails loudly (`503`), which means it is
    closer to a boundary than the others.

### What to leave alone

**Do not split the node registry or the execution engine.** They are the domain core, they
are correctly built as a single source of truth, and every feature we have shipped recently
worked precisely *because* a single registry change applied to all 178 nodes at once. Slicing
that up would be the most expensive mistake available here.

`ai-generator` is also not worth promoting: it owns a function call, not a capability. Either
give it real ownership of the AI pipeline, or fold it back into the worker — its current form
adds a network hop and a model divergence for no boundary.

---

## 4. Recommendation

1. **Do Phase 0 now.** Tenancy, billing under migration control, loud failures, one model
   constant. This is what makes SaaS possible.
2. **Do not add more services.** Seven deployables against one database already costs you
   more than it returns.
3. **Revisit Phase 1 when a concrete pressure appears** — a team that needs to deploy
   independently, or a component whose scaling profile genuinely diverges. Architecture
   should answer a pressure you can name, not a category you aspire to.

The honest summary: you do not have a microservices problem. You have a **multi-tenancy and
billing** problem wearing a microservices costume.

---

## 5. Open questions for the team

- Is production actually delegating to the six services, or are the URL variables unset?
  (DEPLOYMENT §4 has the command.) The answer changes what production *is*.
- Is `infra/` (docker-compose, k8s HPA, 3-replica nginx) a live target or an abandoned
  direction? It describes a topology Hostinger does not use.
- Who owns the `plans` / `subscriptions` schema today, given Prisma does not?
