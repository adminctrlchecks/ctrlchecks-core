# CtrlChecks — System Architecture (as built)

**Method:** every statement below was read from source, config, or CI definitions in this
repository. Nothing is inferred from other documentation. Where something could not be
verified from the repo, it is marked **[UNVERIFIED]** rather than guessed.

**Not verified:** the live state of the Hostinger box. This document describes what the
deploy definitions *install*, not what is confirmed running. See
[DEPLOYMENT.md](./DEPLOYMENT.md) for the commands that would confirm it.

---

## 1. The one-paragraph answer

CtrlChecks runs as **seven Node processes plus a static frontend**. One of them —
`worker` — contains the entire domain model and 360 HTTP routes. The other six are
independently deployed, but they share one database with the worker, do not own the domain,
and every call into them has a silent in-process fallback in the worker. The accurate
description today is a **distributed monolith**: the deployment is distributed, the
architecture is not yet. Section 6 explains why that distinction has practical consequences,
and [MICROSERVICES-READINESS.md](./MICROSERVICES-READINESS.md) sets out the path if you want
it to become a true service architecture.

---

## 2. Components

| Component | Location | Port (local) | Size | Role |
|---|---|---|---|---|
| **worker** | `worker/` | 3001 | 1,572 `.ts` files, 360 routes | The system. Registry, AI pipeline, execution engine, credentials vault, all APIs |
| ai-generator | `services/ai-generator/` | 3002 | 80 files | Executes LLM calls. Builds no prompts |
| execution-engine | `services/execution-engine/` | 3003 | 32 files | Workflow execution endpoints |
| credential-service | `services/credential-service/` | 3004 | 30 files | OAuth start/callback per provider, credential CRUD |
| notification-service | `services/notification-service/` | 3005 | 34 files | Email, in-app, webhook notifications |
| trigger-service | `services/trigger-service/` | 3006 | 26 files | Webhook / form / chat / schedule trigger intake |
| workflow-crud-service | `services/workflow-crud-service/` | 3007 | 38 files | Workflow CRUD + versioning/rollback |
| **frontend** | `ctrl_checks/` | 5173 dev | React + Vite SPA | Talks to **one** backend URL |

### The frontend addresses exactly one backend

`ctrl_checks/src/lib/api/getBackendUrl.ts` resolves `VITE_API_URL`, falling back to
`VITE_PUBLIC_BASE_URL`. A search of the entire frontend source for the six service names
returns **zero matches**. The browser never talks to a service directly — everything goes
through the worker.

---

## 3. How the worker uses the services

Every delegation follows the same shape: **try remote, fall back in-process.**

```ts
// worker/src/api/generate-workflow.ts
// "Delegates to ai-generator when AI_GENERATOR_URL is set; falls back to in-process."
(await runIntentStageRemote(userPrompt, nodeCatalog, correlationId))
  ?? await runIntentStage(userPrompt, nodeCatalog, correlationId)
```

The same pattern governs credentials (`CREDENTIAL_SERVICE_URL || 'http://localhost:3004'`)
and workflow CRUD. The worker never *requires* a service to function.

**Consequence:** a service being down is not an error. It is a silent behaviour change. The
request succeeds, on a different code path, with no signal to the caller.

### The services do not own the domain

Searching all six services for the node registry — the single source of truth for every
node's schema, credentials, and execution — returns **zero files**. The registry exists only
in `worker/src/core/registry/`.

`ai-generator` illustrates the pattern. Its property-population stage signature is:

```ts
const { purpose, systemPrompt, message, allowedKeys, ... } = input;
const result = await callGemini(systemPrompt, message, MODEL, TEMPERATURE);
```

It receives a fully-built prompt and executes it. The worker constructs that prompt from its
own registry. **A microservice owns a capability; this owns a function call.** The network
hop left the worker; the bounded context did not.

---

## 4. Data layer

### One PostgreSQL database, shared by everything

Read from each `.env` / `.env.example`:

```
worker                 → ctrlchecks-db.<...>.ap-south-1.rds.amazonaws.com:5432/ctrlchecks
credential-service     → (same host, same database)
execution-engine       → (same)
notification-service   → (same)
trigger-service        → (same)
workflow-crud-service  → (same)
```

`ai-generator` declares no `DATABASE_URL` — it is stateless.

Same host, same database, same schema. This is the single most consequential fact in this
document, and the reason §1 says "distributed monolith". Independent data ownership is what
makes services independently deployable; without it a migration must land everywhere at once.

Migrations live in `worker/prisma/migrations/` and are applied by the **worker's** deploy
(`npx prisma migrate deploy`). No service owns or applies migrations.

### Redis is effectively worker-only

| Component | Files referencing Redis |
|---|---|
| worker | 38 |
| notification-service | 2 |
| execution-engine | 1 |
| all others | 0 |

Used for caching, rate limiting, queues, and cross-replica WebSocket delivery.

---

## 5. Request flow

```
Browser (React SPA)
   │  single origin: VITE_API_URL
   ▼
worker :3001 ──────────────────────────────── 360 routes, all domain logic
   │
   ├─ AI_GENERATOR_URL set?      → ai-generator :3002   (else in-process)
   ├─ CREDENTIAL_SERVICE_URL?    → credential-service :3004 (else in-process)
   ├─ WORKFLOW_CRUD_SERVICE_URL? → workflow-crud-service :3007 (else 503/in-process)
   │
   ├─ PostgreSQL (shared, RDS ap-south-1)
   └─ Redis (cache / rate limit / queues / WS bridge)

Real-time: GET /ws/chat, GET /ws/executions — served by the worker.
```

---

## 6. Why the label matters

Scored against the usual criteria:

| Criterion | Status | Evidence |
|---|---|---|
| Independently deployable | ✅ | Separate workflows, `package-lock.json`, build, type-check per service |
| **Owns its own data** | ❌ | One shared database and schema |
| Bounded context owns its domain | ❌ | Node registry exists only in `worker/` |
| Fails independently | ⚠️ | Worker falls back in-process — failure is *masked*, not isolated |

Three practical consequences, all observable today:

1. **A schema change hits all seven at once.** Shared tables cannot be migrated per service.
2. **Outages are invisible.** The fallback turns "ai-generator is down" into "the same
   request quietly ran somewhere else."
3. **Duplicated decisions drift.** See §7.

---

## 7. Known divergences found during analysis

These were found while reading the code and are recorded because they are live, not
hypothetical.

### 7.0 Production delegation is ON — verified

SSH to the box confirmed all seven services `active running` under systemd, and
`/opt/ctrlchecks-worker/.env` sets `AI_GENERATOR_URL`, `CREDENTIAL_SERVICE_URL` and
`WORKFLOW_CRUD_SERVICE_URL`. Production really does distribute work across processes.

This makes §7.1 a **live production issue rather than a theoretical one**: property
population in production runs on ai-generator's model, not the worker's.

(`AI_GENERATOR_URL` is also duplicated in that `.env` — same value twice, harmless now,
but evidence of unchecked appends.)

### 7.1 The two sides use different LLM models — zero overlap

| | Models referenced |
|---|---|
| `worker/` | 1.5-flash, 1.5-pro, 2.0-flash-lite, 2.5-flash, 2.5-flash-lite, 2.5-pro, 3.1-flash-lite, 3.1-flash-lite-preview |
| `services/ai-generator/` | 2.0-flash, **3.5-flash** (hardcoded `const MODEL`), pro |

Property population therefore runs on a different model depending on whether ai-generator is
up — same code path, different model, no signal. The model constant belongs in one place.

### 7.2 Local uses PM2; production uses systemd

`worker/ecosystem.config.js` defines a PM2 app (`ctrlchecks-worker`, fork mode, 1 instance).
Every deploy workflow ends in `systemctl restart ctrlchecks-<service>`, and
`scripts/*.service` holds the systemd units. **The PM2 config does not describe production.**

### 7.3 `infra/nginx.conf` describes a topology that is not the Hostinger one

It load-balances three replicas of the *worker* (`app1/app2/app3:3001`) and routes to **no
service**. Together with `infra/k8s-hpa.yaml` and `infra/docker-compose.yml`, this appears to
be a containerised design that Hostinger does not use. **[UNVERIFIED]** — treat `infra/` as
aspirational until confirmed.

### 7.4 systemd units run as `User=ubuntu`

`scripts/ctrlchecks-ai-generator.service` sets `User=ubuntu`, `WorkingDirectory=/opt/...`.
Whether that matches the actual deploy user on Hostinger is **[UNVERIFIED]** from the repo.

---

## 8. What is genuinely well built

Worth stating plainly, because the sections above are about gaps:

- **The node registry is a real single source of truth.** 178 node definitions with input
  schemas, credentials, operation contracts, and execution in one place. Node behaviour is
  data, not branching — a rule added there applies to every node, including future ones.
- **Operation contracts are config-driven.** `resolveFieldPolicyForNode` computes which
  fields are active and required from a node's live config, with no per-node-type code.
- **The AI pipeline is staged and inspectable**, with correlation IDs threaded through.
- **CI runs type-check and lint per package**, so the services cannot silently break their
  own builds.

---

## 9. Reading order for a new engineer

1. `worker/src/core/registry/unified-node-registry.ts` — the domain model. Everything else
   is plumbing around it.
2. `worker/src/index.ts` — the 360-route surface.
3. `worker/src/services/ai/` — the generation pipeline, stage by stage.
4. `worker/src/core/execution/` — the runtime.
5. `ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx` — the user-facing flow.
