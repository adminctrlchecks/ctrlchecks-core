# 00 — Repository Audit

Scanned: 2026-06-06. All findings are based on direct file inspection of the real codebase.

---

## Project Structure Summary

```
ctrlchecks-ai-workflow-os/
├── ctrl_checks/          React + Vite SPA (frontend, port 5173)
├── worker/               Node + Express backend (AI engine + execution, port 3001)
├── infra/                Docker Compose, nginx config, k8s HPA
├── docs/                 Documentation folder (now being populated)
├── scripts/              Utility scripts
└── CLAUDE.md             Architecture rules
```

---

## Backend Framework and Entry Points

| Item | Detail |
|---|---|
| Framework | Express.js with TypeScript via ts-node |
| Entry point | `worker/src/index.ts` |
| Port | 3001 (dev and production) |
| Startup | `npm run dev` (nodemon + ts-node, 8GB heap) / `npm run start` |
| Route count | ~73 routes registered in `worker/src/index.ts` |
| Key middleware | Auth (aws-jwt-verify), Redis cache, token bucket rate limiter |

---

## Frontend Framework and Entry Points

| Item | Detail |
|---|---|
| Framework | React 18 + Vite + TypeScript |
| Entry point | `ctrl_checks/src/main.tsx` |
| Root component | `ctrl_checks/src/App.tsx` |
| Port | 5173 (dev) |
| State management | Zustand (`ctrl_checks/src/stores/`) |
| Data fetching | TanStack Query + `awsClient` |

---

## Database Technology

| Item | Detail |
|---|---|
| Database | AWS RDS PostgreSQL (external, not in Docker) |
| Connection | `worker/src/core/database/aws-db-client.ts` via `pg.Pool` |
| ORM / Migration | Prisma schema at `worker/prisma/schema.prisma`; raw SQL migrations in `worker/prisma/migrations/` |
| Migration files | 4 migrations: 0001 (init), 0002 (credentials), 0003 (field walk cache), 0004 (unified credentials) |

---

## Current Workflow Execution Flow

**Status: Partially present — synchronous by default, async opt-in not activated**

Evidence: `worker/src/api/execute-workflow.ts`

```
POST /api/execute-workflow
  → authenticate user
  → fetch workflow from DB
  → validate workflow is confirmed
  → topological sort of DAG
  → for each node: resolve credentials → executeNode()
  → return full result JSON synchronously
```

The handler at line 18727 has a `shouldUseQueue` flag:
```typescript
const shouldUseQueue = useQueue === true || (useQueue === undefined && process.env.ENABLE_EXECUTION_QUEUE === 'true');
```
`ENABLE_EXECUTION_QUEUE` is not set in `infra/docker-compose.yml`, so the queue is never used in production. All executions are synchronous and will block the HTTP response for the full duration.

A separate `worker/src/api/distributed-execute-workflow.ts` exists with a queue-based approach (`QueueClient` → RabbitMQ or Redis list) but it is not the default endpoint used by the frontend.

---

## Current AI / Gemini Integration Flow

**Status: Partially present — single key, no rotation, no fallback**

Evidence: `worker/src/services/ai/gemini-orchestrator.ts`, `worker/src/core/config.ts` line 42

```typescript
geminiApiKey: process.env.GEMINI_API_KEY,
```

- `gemini-orchestrator.ts` is a class-based singleton imported by 42+ files
- All AI requests use a single `GEMINI_API_KEY`
- `gemini-key-pool.ts` does **NOT** exist
- No round-robin, no cooldown, no fallback to a second key
- Rate limit from Gemini → entire AI system fails

---

## Current Database Connection Handling

**Status: Present, no connection pooling middleware**

Evidence: `worker/src/core/database/aws-db-client.ts`, `worker/src/core/database/db-pool.ts`

- Uses `pg.Pool` connecting directly to AWS RDS
- 3 app replicas + request-worker all maintain their own pools
- Under load, these can open many direct Postgres connections
- No PgBouncer in `infra/docker-compose.yml` (confirmed by file scan)

---

## Current WebSocket / Realtime Implementation

**Status: Partially present — WebSocket server exists but not Redis-bridged across replicas**

Evidence: `worker/src/index.ts` lines 1647–1674, `ctrl_checks/src/components/workflow/ExecutionConsole.tsx`

- Backend: Two WebSocket servers initialized on startup:
  - `/ws/executions` — real-time execution visualization
  - `/ws/chat` — chat trigger WebSocket
- Frontend: `ExecutionConsole.tsx` connects to `ws://localhost:3001/ws/executions?executionId=...`
- Frontend: `RealtimeExecutionVisualizer.tsx` also connects to same endpoint
- **Problem**: Each app replica (app1, app2, app3) maintains its own WebSocket connections in memory. A client connected to app1 will never receive events published by a workflow running on app2. No Redis pub/sub bridge exists.

---

## Current Redis Usage

**Status: Present for caching and rate limiting, not for pub/sub**

Evidence: `worker/src/index.ts` lines 238–239, `worker/src/middleware/redisGetCache.ts`, `worker/src/middleware/redisTokenBucket.ts`

- `ioredis` v5.9.3 used for response caching and token-bucket rate limiting
- `redis` v4.6.12 also listed as dependency
- Redis 7-alpine in `infra/docker-compose.yml` with healthcheck
- No pub/sub for cross-replica WebSocket broadcasting
- `execution-queue.ts` uses Redis as a job list (RPUSH/BLPOP) when available

---

## Current Kafka Usage

**Status: Present — request routing queue**

Evidence: `infra/docker-compose.yml`, `worker/src/workers/kafkaRequestConsumer.ts`

- Confluent Kafka 7.6.1 in docker-compose with Zookeeper
- `request-worker` service runs Kafka consumer with 3 replicas
- Topic: `request-queue` (dead-letter: `request-queue-dlq`)
- Used for routing HTTP requests to worker pool, not for workflow execution status

---

## Current Tests

**Status: Partially present — backend unit tests exist, no E2E, no load tests**

Evidence: `worker/src/api/__tests__/`, `worker/src/workers/__tests__/`, `ctrl_checks/src/components/workflow/__tests__/`

| Test area | Status |
|---|---|
| Backend unit tests | Present — Jest, ~15 test files found |
| Frontend component tests | Present — Vitest, minimal |
| Integration tests | Partial — contract tests exist |
| E2E tests | Missing |
| Load tests | Missing — k6 referenced in docs but no `tests/load/` directory |
| Smoke tests | Missing |

---

## Current Deployment Configuration

**Status: Present for Docker, missing CI/CD**

Evidence: `infra/docker-compose.yml`, `infra/nginx.conf`, `infra/k8s-hpa.yaml`

| Item | Status |
|---|---|
| Docker Compose | Present — nginx, app1/2/3, request-worker, redis, kafka |
| nginx config | Present — load balancing across 3 app replicas |
| K8s HPA | Present as `infra/k8s-hpa.yaml` but Kubernetes not in docker-compose |
| CI/CD pipelines | **Missing** — no `.github/workflows/`, no CircleCI, no Buildkite |
| PgBouncer | **Missing** from docker-compose |
| Staging environment | **Missing** |

---

## Current Observability / Logging / Error Monitoring

**Status: Partial — console logging only, no structured metrics**

Evidence: Throughout `worker/src/index.ts` and API handlers

| Item | Status |
|---|---|
| Console logging | Present — extensive `console.log` throughout |
| Structured logging | Missing — no Winston, Pino, or similar |
| Error monitoring | Missing — no Sentry, Datadog, or similar |
| Metrics | Missing — no Prometheus, CloudWatch custom metrics |
| Distributed tracing | Partially present — `worker/src/core/observability/distributed-tracing.ts` exists |
| Health check endpoint | Present — `/api/health` implied by code |

---

## Missing Items from Launch Scope

| # | Item | Status |
|---|---|---|
| 1 | Async workflow execution (202 response by default) | Missing |
| 2 | Workflow status tracking with `queued_at`, `progress`, `current_step`, `user_id` columns | Partially present (table exists, columns missing) |
| 3 | Frontend realtime progress UI (polling + WebSocket fallback) | Partially present |
| 4 | SDK lazy loading for lines 43–53 of `execute-workflow.ts` | Missing |
| 5 | PgBouncer in docker-compose | Missing |
| 6 | Gemini key rotation / fallback | Missing |
| 7 | AutonomousAgentWizard lazy-loaded as a component (not page) | Missing |
| 8 | Bundle-size CI check | Missing |
| 9 | WebSocket Redis pub/sub bridge | Missing |
| 10 | Load test (k6 for 500 VU) | Missing |
| 11 | Launch runbook | Missing |
| 12 | Smoke test script | Missing |
| 13 | CI/CD pipeline | Missing |
| 14 | Staging environment | Missing |

---

## Risks Discovered from Real Repo

1. **`execute-workflow.ts` is 20,000+ lines** — any refactor risks breaking the entire execution engine. Lazy loading must be surgical.
2. **`executions` table missing `user_id`** — the cancel-execution route uses `workflow.user_id` for auth but the execution row itself has no direct `user_id`. Adding it requires a migration.
3. **Three app replicas, WebSocket not replicated** — any user can be served by any replica; if the execution runs on app2 but the user's WebSocket is on app1, no live updates are received.
4. **`gemini-orchestrator.ts` has 42+ dependents** — any change must be backward compatible.
5. **`distributed-execute-workflow.ts` exists but is not the default route** — the queue-based path exists but is never activated.
6. **PgBouncer adds a new connection string** — `DATABASE_URL` must change for app runtime, but migrations should use direct connection. Any error here breaks the entire app.
7. **No CI/CD** — all deployments are manual. One bad deploy = manual rollback.
8. **No staging environment** — AWS config changes tested directly on production.
