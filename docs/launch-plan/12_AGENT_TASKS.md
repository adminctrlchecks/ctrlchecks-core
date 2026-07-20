# 12 — Agent Tasks

Each task below is atomic. Give one task at a time to Codex/Claude/Cursor. Wait for approval before starting the next.

---

## TASK-01: Run Baseline Audit

**Context:** Before making any changes, we need a baseline of what works.

**Inspect first:**
- `worker/package.json` — check test script
- `ctrl_checks/package.json` — check test scripts
- `infra/docker-compose.yml` — check services

**Implementation requirements:**
1. Run `cd worker && npm run type-check` — record output
2. Run `cd worker && npm test` — record pass/fail count
3. Run `cd ctrl_checks && npm run test:vitest` — record pass/fail count
4. Run `cd ctrl_checks && npm run build` — record success/failure
5. Run `docker compose -f infra/docker-compose.yml up -d` — record which services start

**Do not modify any files.**

**Done when:** Report produced with exact command outputs, pass/fail counts, and any blocking errors.

---

## TASK-02: Add Execution Async Migration

**Context:** The `executions` table is missing columns needed for async workflow tracking. See `docs/launch-plan/02_BACKEND_ASYNC_WORKFLOWS.md` → Migration SQL section.

**Inspect first:**
- `worker/prisma/migrations/0001_init_memory_system.sql` — see current executions schema
- `worker/src/api/cancel-execution.ts` — see how executions table is queried

**Create:** `worker/prisma/migrations/0005_execution_async_fields.sql`

```sql
ALTER TABLE executions
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS queued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_step VARCHAR(255),
  ADD COLUMN IF NOT EXISTS error_code VARCHAR(128);

UPDATE executions e SET user_id = w.user_id FROM workflows w WHERE e.workflow_id = w.id AND e.user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_executions_user_id ON executions(user_id);
CREATE INDEX IF NOT EXISTS idx_executions_queued_at ON executions(queued_at);
```

**Also create:** `worker/prisma/migrations/rollback_0005.sql`

```sql
ALTER TABLE executions DROP COLUMN IF EXISTS user_id, DROP COLUMN IF EXISTS queued_at, DROP COLUMN IF EXISTS progress, DROP COLUMN IF EXISTS current_step, DROP COLUMN IF EXISTS error_code;
DROP INDEX IF EXISTS idx_executions_user_id;
DROP INDEX IF EXISTS idx_executions_queued_at;
```

**Tests to add:** None (SQL only — verified by running against test DB).

**Do not touch:** `execute-workflow.ts`, any application code.

**Done when:** Migration file created. SQL syntax valid. Rollback file created.

---

## TASK-03: Enable Async Execution Queue

**Context:** `execute-workflow.ts` already has a `shouldUseQueue` flag at line 18727. It is never activated because `ENABLE_EXECUTION_QUEUE` is not set. We need to activate it and ensure the 202 response path works.

**Inspect first:**
- `worker/src/api/execute-workflow.ts` lines 18709–18800
- `worker/src/services/execution-queue.ts` — understand existing queue

**Implementation requirements:**
1. Inspect lines 18727–18781 in `execute-workflow.ts` to confirm 202 response path exists
2. If 202 response is not being sent, add it in the `shouldUseQueue` branch
3. Add `ENABLE_EXECUTION_QUEUE: "true"` to app1, app2, app3 in `infra/docker-compose.yml`
4. Do NOT restructure the file — minimal change only

**Tests to add:** `worker/src/api/__tests__/async-execution.test.ts`
- POST with ENABLE_EXECUTION_QUEUE=true returns 202 with executionId
- executionId exists in executions table with status "queued"

**Do not touch:** Any code outside the 18727–18781 range of execute-workflow.ts. Do not change the synchronous path.

**Done when:** `curl -X POST /api/execute-workflow -d '{"workflowId":"test"}' -H "Authorization: Bearer $TOKEN"` returns HTTP 202 with `{ executionId, status: "queued" }`.

---

## TASK-04: Create Execution Queue Worker Process

**Context:** Jobs are now being enqueued but nothing processes them. We need a worker process.

**Inspect first:**
- `worker/src/services/execution-queue.ts` — understand the queue API
- `worker/src/workers/kafkaRequestConsumer.ts` — follow the same pattern
- `worker/package.json` — see existing scripts

**Create:** `worker/src/workers/executionQueueWorker.ts`

This file should:
1. Import `getExecutionQueue` from `../services/execution-queue`
2. Pull jobs from the queue
3. For each job: update execution status to `running`, call execution logic, update to `success` or `failed`
4. Handle errors with retry (up to 3 times)
5. Log lifecycle events with executionId (never log credentials or token values)

**Modify:** `worker/package.json` — add `"start:execution-worker": "ts-node src/workers/executionQueueWorker.ts"`

**Modify:** `infra/docker-compose.yml` — add `execution-worker` service:
```yaml
execution-worker:
  <<: *app
  command: npm run start:execution-worker
  deploy:
    replicas: 2
```

**Tests to add:** Unit test that worker picks up job and updates execution status.

**Do not touch:** `execute-workflow.ts`, the main server logic.

**Done when:** Worker process starts. When a job is in the queue, worker picks it up and updates the executions table.

---

## TASK-05: Frontend Execution State in Zustand

**Context:** The frontend needs state to track a live execution (executionId, status, progress, etc.).

**Inspect first:**
- `ctrl_checks/src/stores/workflowStore.ts` — existing store shape
- `ctrl_checks/src/pages/WorkflowBuilder.tsx` — how execution is currently triggered

**Modify:** `ctrl_checks/src/stores/workflowStore.ts`

Add:
```typescript
type ExecutionStatus = 'idle' | 'queued' | 'running' | 'success' | 'failed';

interface ActiveExecution {
  executionId: string;
  workflowId: string;
  status: ExecutionStatus;
  progress: number;
  currentStep: string | null;
  errorMessage: string | null;
}
```

Add actions: `setActiveExecution`, `updateExecutionStatus`, `clearActiveExecution`

**Also modify:** `ctrl_checks/src/pages/WorkflowBuilder.tsx` — when execute is called:
- If response is 202: call `setActiveExecution({ executionId, status: 'queued', ... })`
- If response is 200 (legacy sync): call `setActiveExecution({ status: 'success' })`

**Tests to add:** Store actions create, update, clear activeExecution correctly.

**Do not touch:** `execute-workflow.ts` on backend, other stores.

**Done when:** Clicking "Run" on WorkflowBuilder stores executionId in Zustand. Console log confirms.

---

## TASK-06: Frontend Execution Status Hooks

**Context:** We need a hook that subscribes to execution status via WebSocket and falls back to polling.

**Inspect first:**
- `ctrl_checks/src/components/workflow/ExecutionConsole.tsx` lines 121–160 — existing WS logic
- `ctrl_checks/src/stores/workflowStore.ts` (after TASK-05)

**Create:** `ctrl_checks/src/hooks/useExecutionStatus.ts`
- Opens WebSocket to `ws://API_HOST/ws/executions?executionId={id}&token={jwt}`
- On WS message: update Zustand store
- On WS close: switch to 3-second polling of `GET /api/workflows/executions/:id`
- On WS reconnect: stop polling
- Clean up on unmount

**Create:** `ctrl_checks/src/hooks/useExecutionWebSocket.ts`
- Handles WebSocket lifecycle: connect, reconnect with exponential backoff (1s → 2s → 4s → 30s max)
- Returns `{ connected, reconnecting }`

**Tests to add:** Hook connects to WS, updates state on message, switches to polling on disconnect.

**Do not touch:** ExecutionConsole render logic until this hook is working.

**Done when:** Hook connects to WS and updates Zustand store on messages. Verified in browser console.

---

## TASK-07: Frontend Progress UI Components

**Context:** We need UI components to show execution progress to users.

**Inspect first:**
- `ctrl_checks/src/components/workflow/ExecutionConsole.tsx` — existing console UI
- Existing UI component patterns in `ctrl_checks/src/components/ui/`

**Create:** `ctrl_checks/src/components/workflow/ExecutionStatusBanner.tsx`
- Shows status badge: queued (gray), running (blue spinner), success (green), failed (red)
- Shows cancel button when queued or running
- Shows retry button when failed
- Shows progress bar when running

**Create:** `ctrl_checks/src/components/workflow/ExecutionProgressBar.tsx`
- Props: `progress: number` (0–100), `currentStep: string | null`
- Shows animated bar + step label

**Modify:** `ctrl_checks/src/components/workflow/ExecutionConsole.tsx`
- Import and use `ExecutionStatusBanner` and `ExecutionProgressBar`
- Replace hardcoded state logic with `useExecutionStatus` hook

**Tests to add:** Render test for each status state.

**Done when:** UI shows all 5 states correctly. Tested manually in browser.

---

## TASK-08: Remove Static Backend Imports (Lazy Loading)

**Context:** Lines 43–53 of `execute-workflow.ts` load 10 heavy SDKs at every startup. See `docs/launch-plan/04_BACKEND_LAZY_LOADING.md`.

**Inspect first:**
- `worker/src/api/execute-workflow.ts` lines 43–53
- Grep for usage of each import: where is `Airtable`, `TwitterApi`, etc. actually used in the file?

**Implementation requirements:**
1. Remove lines 43–53 (the 10 static imports)
2. For each removed import, find where it is used in the file and add `await import(...)` inside that function
3. Run `cd worker && npm run type-check` → must be 0 errors
4. Run `cd worker && npm test` → no regressions

**Do not restructure** the file. Do not rename functions. Minimal change only.

**Tests to add:** `worker/src/api/__tests__/lazy-loading.test.ts`
- Import execute-workflow module without optional SDKs → no crash

**Do not touch:** Any file other than `execute-workflow.ts`.

**Done when:** `npm run type-check` passes. `npm test` passes. Worker starts without loading Airtable in `require.cache`.

---

## TASK-09: Lazy-Load Database Node Handler

**Context:** `database-node-handler.ts` statically imports all 13 DB drivers. See `docs/launch-plan/04_BACKEND_LAZY_LOADING.md` → Database Node Handler Fix section.

**Inspect first:**
- `worker/src/services/database/database-node-handler.ts` — see all static imports

**Implementation requirements:**
1. Remove all static DB driver imports from the file top
2. Inside each `executeXxxNode()` function, add `const { ... } = await import('...')` before using the driver
3. Run `npm run type-check` and `npm test`

**Do not touch:** `execute-workflow.ts` or any other file.

**Done when:** Type check passes. MongoDB, MySQL, Snowflake etc. not in require.cache on startup.

---

## TASK-10: Add PgBouncer to Docker Compose

**Context:** AWS RDS needs protection from connection exhaustion. See `docs/launch-plan/05_PGBOUNCER_DATABASE_POOLING.md`.

**Inspect first:**
- `infra/docker-compose.yml` — current services
- `worker/src/core/database/aws-db-client.ts` — how DATABASE_URL is used

**Modify:** `infra/docker-compose.yml`
- Add `pgbouncer` service (bitnami/pgbouncer:1.22.1)
- Update DATABASE_URL for app1/app2/app3 to use pgbouncer:6432
- Add DIRECT_DATABASE_URL for migrations

**Modify:** `worker/package.json`
- Update `prisma:migrate` script to use `DIRECT_DATABASE_URL`

**Verification:**
```bash
docker compose up -d pgbouncer
docker compose exec pgbouncer psql -h 127.0.0.1 -p 6432 -U $DB_USER -d $DB_NAME -c "SELECT 1"
```

**Do not touch:** Application code in worker/src.

**Done when:** PgBouncer starts, passes healthcheck, app connects through it. SHOW POOLS shows active pool.

---

## TASK-11: Create Gemini Key Pool

**Context:** Single GEMINI_API_KEY → all AI fails if rate-limited. See `docs/launch-plan/06_GEMINI_KEY_ROTATION.md`.

**Inspect first:**
- `worker/src/services/ai/gemini-orchestrator.ts` — find the method that calls Gemini API
- `worker/src/core/config.ts` line 42 — current key config

**Create:** `worker/src/services/ai/gemini-key-pool.ts` (full code in `06_GEMINI_KEY_ROTATION.md`)

**Modify:** `worker/src/core/config.ts` — add `GEMINI_API_KEYS` reading (keep `GEMINI_API_KEY` for backward compat)

**Modify:** `worker/src/services/ai/gemini-orchestrator.ts` — use `getGeminiKeyPool()` in request methods

**Tests to add:** `worker/src/services/ai/__tests__/gemini-key-pool.test.ts` (all 10 tests in plan)

**Done when:** Mock rate-limit on key 0 → request succeeds using key 1. Key values never appear in logs.

---

## TASK-12: Lazy-Load AutonomousAgentWizard

**Context:** The 8,000-line wizard loads in the initial bundle. See `docs/launch-plan/07_FRONTEND_BUNDLE_AND_LAZY_WIZARD.md`.

**Inspect first:**
- `ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx` line 928 — current export
- `ctrl_checks/src/pages/AIWorkflowBuilder.tsx` — how wizard is imported

**Modify:** `ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx`
- Add at the bottom: `export { AutonomousAgentWizard as default };`

**Create:** `ctrl_checks/src/components/workflow/WizardLoadingSkeleton.tsx`
**Create:** `ctrl_checks/src/components/workflow/WizardErrorBoundary.tsx`

**Modify:** `ctrl_checks/src/pages/AIWorkflowBuilder.tsx`
- Replace static import with `const AutonomousAgentWizard = lazy(() => import(...))`
- Wrap with `<WizardErrorBoundary><Suspense fallback={<WizardLoadingSkeleton />}>...</Suspense></WizardErrorBoundary>`

**Verification:**
```bash
npm run build
ls dist/assets/ | grep -i wizard  # Should show separate chunk
```

**Done when:** Build produces separate wizard chunk. Spinner visible briefly when wizard first loads.

---

## TASK-13: Add Bundle Size Check

**Context:** We need automated enforcement of bundle size limits.

**Inspect first:**
- `ctrl_checks/package.json` — current scripts
- `ctrl_checks/dist/assets/` — after running build

**Modify:** `ctrl_checks/package.json`
- Install `bundlesize` as devDependency
- Add `"size-check"` script
- Add `"bundlesize"` config section

**Done when:** `npm run size-check` passes for current bundle. Would fail if wizard chunk exceeds 600KB.

---

## TASK-14: Create WebSocket Redis Bridge

**Context:** Events from one backend replica don't reach WS clients on another replica. See `docs/launch-plan/08_REALTIME_WEBSOCKET_REDIS_BRIDGE.md`.

**Inspect first:**
- `worker/src/index.ts` lines 1647–1680 — existing WS server initialization
- `ctrl_checks/src/components/workflow/ExecutionConsole.tsx` lines 121–160 — WS client

**Create:** `worker/src/services/ws-redis-bridge.ts` (full code in `08_REALTIME_WEBSOCKET_REDIS_BRIDGE.md`)

**Modify:** `worker/src/index.ts`
- After Redis is confirmed available: call `initWsRedisBridge(process.env.REDIS_URL)`
- In `/ws/executions` handler: call `registerWsConnection(executionId, userId, ws)`
- Validate JWT before registering connection

**Modify:** `worker/src/services/execution-job-runner.ts`
- Call `publishExecutionEvent()` at each lifecycle step

**Tests to add:** `worker/src/services/__tests__/ws-redis-bridge.test.ts`

**Done when:** Manual test: 3 replicas running. Trigger execution → WS client on any replica receives event.

---

## TASK-15: Add Frontend Reconnect Handling

**Context:** When WS disconnects, frontend should poll and reconnect gracefully. (This is part of TASK-06 but isolated here for implementation.)

**Inspect first:**
- `ctrl_checks/src/hooks/useExecutionWebSocket.ts` (from TASK-06)
- `ctrl_checks/src/components/workflow/ExecutionConsole.tsx`

**Modify:** `useExecutionWebSocket.ts`
- Add exponential backoff reconnect: 1s → 2s → 4s → 8s → 30s max
- Expose `reconnecting` boolean to UI

**Modify:** `ctrl_checks/src/components/workflow/ExecutionConsole.tsx`
- Show "Reconnecting..." notice when `reconnecting === true`
- Show "Connection lost" notice when offline for > 30s

**Tests to add:** WS close event triggers reconnect. Reconnect shows status in UI.

**Done when:** Disconnect network 10 seconds. UI shows "Reconnecting...". Reconnect → status resumes.

---

## TASK-16: Create Load Test

**Context:** Need to verify 500 concurrent users don't break the system.

**Inspect first:**
- `infra/docker-compose.yml` — services and ports
- `docs/launch-plan/09_TESTING_STRATEGY.md` — load test spec

**Create:** `tests/load/baseline.js` (k6 script from testing strategy doc)
**Create:** `tests/load/README.md` — how to run, what metrics mean, pass/fail thresholds

**Do not modify** any application code.

**Done when:** `k6 run tests/load/baseline.js` runs against local stack. Results file created.

---

## TASK-17: Create Smoke Test Script

**Context:** Need a quick post-deploy verification script.

**Inspect first:**
- `docs/launch-plan/10_DEPLOYMENT_AND_RUNBOOK.md` — smoke tests section

**Create:** `scripts/smoke-test.sh` (script from runbook doc)

**Make executable:** `chmod +x scripts/smoke-test.sh`

**Done when:** Script runs against local stack, all checks pass, exits 0.

---

## TASK-18: Production Deploy

**Context:** Final deploy following the runbook.

**Read first:**
- `docs/launch-plan/10_DEPLOYMENT_AND_RUNBOOK.md` — complete runbook
- `docs/launch-plan/16_LAUNCH_CHECKLIST.md` — final checklist

Follow the runbook exactly. Do not skip any step.

**Done when:** All smoke tests pass in production. No crash loops. All checklist items checked.
