# Service Reference

Per-process reference. Routes were extracted from source, not from documentation.

For how these fit together, see [SYSTEM-ARCHITECTURE.md](./SYSTEM-ARCHITECTURE.md).
For how they are started and deployed, see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## Ownership at a glance

The column that matters is the last one. A service that owns no data and has an in-process
fallback in the worker is an *optional accelerator*, not an independent service.

| Service | Port | Own DB? | Redis? | Worker falls back? | Really owns |
|---|---|---|---|---|---|
| worker | 3001 | shared | 38 files | — | **Everything** |
| ai-generator | 3002 | none | no | yes, silently | An LLM call |
| execution-engine | 3003 | shared | 1 file | **[UNVERIFIED]** | Execution endpoints |
| credential-service | 3004 | shared | no | yes (`\|\| localhost:3004`) | OAuth round-trips |
| notification-service | 3005 | shared | 2 files | **[UNVERIFIED]** | Delivery channels |
| trigger-service | 3006 | shared | no | **[UNVERIFIED]** | Trigger intake |
| workflow-crud-service | 3007 | shared | no | yes (503 when absent) | Workflow CRUD |

"shared" = the same PostgreSQL host, database and schema as the worker.

---

## worker — port 3001

**The system.** 1,572 TypeScript files, 360 routes on one Express app.

Subsystems:

| Area | Path |
|---|---|
| Node registry (single source of truth, 178 nodes) | `src/core/registry/unified-node-registry.ts` |
| Per-node overrides | `src/core/registry/overrides/*.ts` |
| Operation contracts / field policy | `src/core/operations/` |
| AI generation pipeline | `src/services/ai/stages/` |
| Graph orchestration | `src/core/orchestration/unified-graph-orchestrator.ts` |
| Execution engine | `src/core/execution/` |
| Credentials vault | `src/core/credentials/` |
| Workflow-build APIs (field-plan, run-node, run) | `src/api/workflow-build/` |

Real-time: `GET /ws/chat`, `GET /ws/executions`.

Owns all Prisma migrations (`worker/prisma/migrations/`) and is the only deploy that runs
`prisma migrate deploy`.

---

## ai-generator — port 3002

**Stateless LLM executor.** Declares no `DATABASE_URL`.

| Route | |
|---|---|
| `/health`, `/metrics`, `/whoami` | operational |
| `/intent` | intent extraction |
| `/structural-prompt` | structural prompt generation |
| `/capability-selection-json`, `/node-selection-json` | node/capability selection |
| `/property-population` | field value generation |
| `/edge-reasoning`, `/edge-reasoning-json` | edge inference |
| `/validation` | validation pass |

**It builds no prompts.** Every route receives a fully-formed `systemPrompt` and `message`
from the worker and calls Gemini:

```ts
const { purpose, systemPrompt, message, allowedKeys, ... } = input;
const result = await callGemini(systemPrompt, message, MODEL, TEMPERATURE);
```

⚠️ **Model divergence.** `MODEL` is a hardcoded `const` here, and the model sets on the two
sides do not overlap at all — see SYSTEM-ARCHITECTURE §7.1. The same generation step runs on
a different model depending on whether this service is up.

---

## credential-service — port 3004

Largest route surface after the worker. OAuth start/callback per provider —
google, github, facebook, instagram, linkedin, notion, salesforce, twitter, whatsapp, zoho,
plus a `generic` pair — and credential CRUD (`/`, `/:id`, `/:id/decrypted`, `/:id/test`,
`/:idOrProvider`, `/:provider`).

Reached through `src/middleware/credential-oauth-proxy.ts` in the worker:

```ts
return (process.env.CREDENTIAL_SERVICE_URL || 'http://localhost:3004').replace(/\/$/, '');
```

Note `/:id/decrypted` — this service can return decrypted secrets. Its network exposure is a
security boundary and should be treated as one.

---

## workflow-crud-service — port 3007

`/`, `/:id`, `/:id/versions`, `/:id/versions/:version/rollback`, plus health and metrics.

The only service whose absence surfaces to the user rather than falling back silently: the
worker returns `503 WORKFLOW_CRUD_SERVICE_UNAVAILABLE`
(`worker/src/index.ts:1887`, `:2055`, `worker/src/api/save-workflow.ts:183`).

---

## trigger-service — port 3006

Trigger intake:

- `/webhook/:workflowId`
- `/form/:workflowId/:nodeId/submit`
- `/chat/:workflowId/:nodeId/message`
- `/schedule/:workflowId`

These are **externally addressable** — a webhook provider or a form submitter hits them
directly. That makes this the one service with an inbound public contract, and the one whose
URL cannot change without breaking third parties.

---

## execution-engine — port 3003

Smallest public surface: `/` plus health and metrics. Given that the execution engine proper
lives in `worker/src/core/execution/` (and holds the Redis integration), this service appears
to be an entry point rather than the engine itself. **[UNVERIFIED]** — confirm before relying
on it.

---

## notification-service — port 3005

`/send`, `/email`, `/in-app`, `/webhook`, `/`, `/:id/read`, plus health and metrics.
Uses Redis in 2 files.

---

## Health endpoint convention

Every service except ai-generator exposes `/health`, `/health/live`, `/health/ready`.
ai-generator exposes `/health` only. Worth normalising if you add orchestration that
distinguishes liveness from readiness.
