# 11 — Implementation Order

Every stage below must be completed and tested before the next stage starts. Do not skip stages.

---

## Stage 0 — Repo Audit and Safety Baseline

**Goal:** Confirm the current app runs, tests pass, and we have a stable baseline before making any changes.

**Tasks:**
1. Run `cd worker && npm run type-check` → must be 0 errors
2. Run `cd worker && npm test` → record which tests pass/fail
3. Run `cd ctrl_checks && npm run test:vitest` → record which tests pass/fail
4. Run `cd ctrl_checks && npm run build` → must succeed
5. Start Docker Compose: `docker compose -f infra/docker-compose.yml up -d`
6. Verify app is reachable at `http://localhost:8088`
7. Confirm existing execution flow works (trigger a test workflow manually)
8. Create a git branch: `git checkout -b launch/phase-1`
9. Document: commands tested, pass/fail status, any blocking issues

**Files touched:** None (observation only)

**Acceptance criteria:** All existing tests pass. App starts and responds. Git branch created.

**Risks:** Type errors in worker may already exist — document but do not fix in this stage unless blocking.

---

## Stage 1 — Backend Async Workflow Foundation

**Goal:** Make workflow execution async by default. API returns 202 immediately.

**Tasks:**
1. Run migration: `0005_execution_async_fields.sql` (add user_id, queued_at, progress, current_step, error_code)
2. Set `ENABLE_EXECUTION_QUEUE=true` in `infra/docker-compose.yml` for app1/app2/app3
3. Verify `execute-workflow.ts` returns 202 when `shouldUseQueue` is true (line 18727–18781)
4. Create `worker/src/workers/executionQueueWorker.ts` — pulls jobs from queue, calls execution logic
5. Create `worker/src/services/execution-job-runner.ts` — extracted per-job execution logic
6. Add `start:execution-worker` script to `worker/package.json`
7. Add `execution-worker` service to `infra/docker-compose.yml`
8. Write tests: `worker/src/api/__tests__/async-execution.test.ts`
9. Run full test suite — no regressions

**Files touched:**
- `worker/src/api/execute-workflow.ts` (minimal — verify 202 path exists)
- `worker/src/workers/executionQueueWorker.ts` (create)
- `worker/src/services/execution-job-runner.ts` (create)
- `worker/package.json`
- `infra/docker-compose.yml`
- `worker/prisma/migrations/0005_execution_async_fields.sql` (create)

**Done when:** POST `/api/execute-workflow` returns 202 with executionId in under 2 seconds. Worker process picks up job and runs it. Status changes from queued → running → success.

**Rollback:** Set `ENABLE_EXECUTION_QUEUE=false`. Run rollback SQL `rollback_0005.sql`.

---

## Stage 2 — Frontend Workflow Progress UI

**Goal:** Show users their workflow progress in real time instead of a frozen screen.

**Tasks:**
1. Add `activeExecution` state and actions to `ctrl_checks/src/stores/workflowStore.ts`
2. Create `ctrl_checks/src/hooks/useExecutionStatus.ts` (WebSocket + polling fallback)
3. Create `ctrl_checks/src/hooks/useExecutionWebSocket.ts` (reconnect with backoff)
4. Create `ctrl_checks/src/components/workflow/ExecutionStatusBanner.tsx`
5. Create `ctrl_checks/src/components/workflow/ExecutionProgressBar.tsx`
6. Update `WorkflowBuilder.tsx` and `AIWorkflowBuilder.tsx` to handle 202 response
7. Update `ExecutionConsole.tsx` to show progress and reconnecting state
8. Write tests: `ctrl_checks/src/__tests__/executionProgress.test.tsx`
9. Start dev server and test manually: trigger → see queued → running → success

**Files touched:**
- `ctrl_checks/src/stores/workflowStore.ts`
- `ctrl_checks/src/pages/WorkflowBuilder.tsx`
- `ctrl_checks/src/pages/AIWorkflowBuilder.tsx`
- `ctrl_checks/src/components/workflow/ExecutionConsole.tsx`
- New files: `useExecutionStatus.ts`, `useExecutionWebSocket.ts`, `ExecutionStatusBanner.tsx`, `ExecutionProgressBar.tsx`

**Done when:** User triggers workflow → UI immediately shows "queued" → changes to "running" with step name → shows "success" or "failed" with error. Reconnect test passes (disconnect network 10s, reconnect, status resumes).

**Rollback:** Revert store changes and page changes. Frontend is stateless so rollback is a redeploy.

---

## Stage 3 — Backend Lazy Loading

**Goal:** Reduce startup time and memory by not loading unused SDKs on app start.

**Tasks:**
1. Remove lines 43–53 from `worker/src/api/execute-workflow.ts` (10 static imports)
2. Add dynamic `import()` inside each handler function for each removed import
3. Update `worker/src/services/database/database-node-handler.ts` — lazy-load all 13 DB drivers
4. Run `cd worker && npm run type-check` → must be 0 errors
5. Run `cd worker && npm test` → no regressions
6. Write tests: `worker/src/api/__tests__/lazy-loading.test.ts`
7. Measure startup time before and after (note it in PR description)

**Files touched:**
- `worker/src/api/execute-workflow.ts` (lines 43–53, and corresponding handler functions)
- `worker/src/services/database/database-node-handler.ts`

**Done when:** Worker starts without loading Airtable, Notion, Twitter, etc. Test: import execute-workflow in Jest without those SDKs installed → no crash.

**Rollback:** Restore original static imports.

---

## Stage 4 — Database Connection Safety (PgBouncer)

**Goal:** Protect AWS RDS from connection exhaustion under 500 concurrent users.

**Tasks:**
1. Add `pgbouncer` service to `infra/docker-compose.yml`
2. Add `DIRECT_DATABASE_URL` to environment for app services (migrations only)
3. Update `DATABASE_URL` to point to pgbouncer:6432 in docker-compose
4. Update `worker/package.json` `prisma:migrate` script to use `DIRECT_DATABASE_URL`
5. Start docker-compose with pgbouncer: `docker compose up -d pgbouncer`
6. Verify apps connect through PgBouncer: check pool stats
7. Run migrations using direct URL: verify they still work
8. Run smoke test: 50 concurrent requests → verify Postgres server connections < 20

**Files touched:**
- `infra/docker-compose.yml`
- `worker/package.json` (prisma:migrate script)

**Done when:** `docker compose exec pgbouncer psql ... -c "SHOW POOLS"` shows connections. App serves requests. Migrations work via DIRECT_DATABASE_URL.

**Rollback:** Revert `DATABASE_URL` to direct RDS URL in docker-compose. Remove PgBouncer service (data is in RDS, no loss).

---

## Stage 5 — Gemini Key Rotation

**Goal:** Support multiple Gemini keys. Automatically fall back if one is rate-limited.

**Tasks:**
1. Create `worker/src/services/ai/gemini-key-pool.ts`
2. Update `worker/src/core/config.ts` to read `GEMINI_API_KEYS`
3. Update `worker/src/services/ai/gemini-orchestrator.ts` to use key pool for requests
4. Add `GEMINI_API_KEYS=key1,key2` and `GEMINI_KEY_COOLDOWN_SECONDS=60` to docker-compose
5. Add health endpoint: `GET /api/health/gemini` → returns key pool metrics (no key values)
6. Write tests: `worker/src/services/ai/__tests__/gemini-key-pool.test.ts`
7. Verify: trigger AI generation, check which key index is used in logs

**Files touched:**
- `worker/src/services/ai/gemini-key-pool.ts` (create)
- `worker/src/services/ai/gemini-orchestrator.ts`
- `worker/src/core/config.ts`
- `infra/docker-compose.yml`

**Done when:** App uses key pool. Simulated rate limit → falls back to key 2. Keys never appear in logs. `/api/health/gemini` returns safe metrics.

**Rollback:** Remove key pool import from orchestrator; revert to single `GEMINI_API_KEY`. Backward compatible.

---

## Stage 6 — Frontend Bundle Safety

**Goal:** AutonomousAgentWizard loads separately, not in initial bundle. Bundle size checks run.

**Tasks:**
1. Add `export { AutonomousAgentWizard as default }` to `AutonomousAgentWizard.tsx`
2. Create `ctrl_checks/src/components/workflow/WizardLoadingSkeleton.tsx`
3. Create `ctrl_checks/src/components/workflow/WizardErrorBoundary.tsx`
4. Update `AIWorkflowBuilder.tsx` to use `React.lazy` + Suspense for wizard
5. Add `bundlesize` config and `size-check` script to `ctrl_checks/package.json`
6. Run `npm run build` and verify wizard chunk is separate in `dist/assets/`
7. Run `npm run size-check` → must pass
8. Write tests: `ctrl_checks/src/__tests__/lazyWizard.test.tsx`

**Files touched:**
- `ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx` (add default export)
- `ctrl_checks/src/pages/AIWorkflowBuilder.tsx`
- `ctrl_checks/package.json`
- New: `WizardLoadingSkeleton.tsx`, `WizardErrorBoundary.tsx`

**Done when:** Build produces separate `AutonomousAgentWizard-[hash].js` chunk. Main bundle does not contain wizard code. Size check script passes.

**Rollback:** Remove lazy wrapper, restore static import. Bundle size increase is the only impact.

---

## Stage 7 — Realtime Multi-Replica WebSocket Bridge

**Goal:** WebSocket events reach all browser clients regardless of which backend replica processed the workflow.

**Tasks:**
1. Create `worker/src/services/ws-redis-bridge.ts`
2. Update `worker/src/index.ts` to call `initWsRedisBridge()` on startup
3. Update `/ws/executions` WebSocket handler to call `registerWsConnection()`
4. Add `publishExecutionEvent()` calls to `execution-job-runner.ts` at each lifecycle step
5. Update `infra/nginx.conf` to use `ip_hash` for sticky sessions
6. Write tests: `worker/src/services/__tests__/ws-redis-bridge.test.ts`
7. Test manually: connect to app1 WebSocket, trigger execution on app2, verify event arrives

**Files touched:**
- `worker/src/services/ws-redis-bridge.ts` (create)
- `worker/src/index.ts`
- `worker/src/services/execution-job-runner.ts`
- `infra/nginx.conf`

**Done when:** Manual test with 3 replicas: event fired on replica 2 reaches WS client on replica 1. Tests pass.

**Rollback:** Remove `initWsRedisBridge()` call. Events stop being Redis-bridged but WebSocket still works (single-replica only).

---

## Stage 8 — Load Testing

**Goal:** Validate the system at 500 concurrent users. Document results. Fix bottlenecks.

**Tasks:**
1. Create `tests/load/baseline.js` (k6 test script)
2. Create `tests/load/README.md` with how to run and interpret results
3. Run k6 against local docker-compose at 100 VU, then 500 VU
4. Record: p50, p95, p99 latency; error rate; DB connections; Redis memory
5. Fix any bottlenecks discovered
6. Re-run at 500 VU → must pass thresholds from `09_TESTING_STRATEGY.md`
7. Document results in `tests/load/results-[date].md`

**Files created:**
- `tests/load/baseline.js`
- `tests/load/README.md`
- `tests/load/results-YYYYMMDD.md`

**Done when:** 500 VU test completes with p95 < 2s and error rate < 1%. Results documented.

---

## Stage 9 — Launch Runbook and Deployment

**Goal:** Deploy to production safely during low-traffic window.

**Tasks:**
1. Complete all items in `10_DEPLOYMENT_AND_RUNBOOK.md` pre-launch checklist
2. Ensure RDS snapshot is taken before migration
3. Run migration via `DIRECT_DATABASE_URL`
4. Deploy PgBouncer
5. Deploy execution-worker
6. Rolling deploy app replicas (one at a time)
7. Deploy frontend
8. Run smoke tests: `bash scripts/smoke-test.sh`
9. Monitor for 2 hours per checklist
10. Declare launch complete or roll back

**Acceptance criteria:** All smoke tests pass. No crash loops. DB connections < 50. Gemini keys healthy. WebSocket bridge working.
