# 16 — Launch Checklist

Use this as the final sign-off before going live.

---

## Engineering Checklist

- [ ] All items in Stage 0–8 of `11_IMPLEMENTATION_ORDER.md` are complete
- [ ] `cd worker && npm run type-check` → 0 errors
- [ ] `cd worker && npm test` → all tests pass, no regressions
- [ ] `cd ctrl_checks && npm run test:vitest` → all tests pass
- [ ] `cd ctrl_checks && npm run build` → build succeeds
- [ ] `cd ctrl_checks && npm run size-check` → bundle size within limits
- [ ] Git branch `launch/phase-1` merged to main
- [ ] All new files committed and pushed

---

## Database Checklist

- [ ] RDS snapshot taken and confirmed: `aws rds describe-db-snapshots`
- [ ] Migration `0005_execution_async_fields.sql` tested on a copy of prod DB first
- [ ] Migration file created: `worker/prisma/migrations/0005_execution_async_fields.sql`
- [ ] Rollback file created: `worker/prisma/migrations/rollback_0005.sql`
- [ ] Backfill query verified: `SELECT count(*) FROM executions WHERE user_id IS NOT NULL`
- [ ] New columns verified: `\d executions` shows all 5 new columns
- [ ] New indexes verified: `\di idx_executions_*` shows all 3 new indexes

---

## Backend Checklist

- [ ] `worker/src/services/ai/gemini-key-pool.ts` created and tested
- [ ] `worker/src/services/ws-redis-bridge.ts` created and tested
- [ ] `worker/src/workers/executionQueueWorker.ts` created and starts cleanly
- [ ] `worker/src/services/execution-job-runner.ts` created and processes jobs
- [ ] Static imports removed from `execute-workflow.ts` lines 43–53
- [ ] Database node handler lazy-loads all 13 drivers
- [ ] `ENABLE_EXECUTION_QUEUE=true` set in docker-compose for app1/app2/app3
- [ ] `start:execution-worker` script added to `worker/package.json`
- [ ] Health endpoint `/api/health` returns structured JSON with all service checks
- [ ] Health endpoint `/api/health/gemini` returns key pool metrics (no key values)
- [ ] Metrics endpoint `/api/metrics` returns execution counts and queue depth

---

## Frontend Checklist

- [ ] `AutonomousAgentWizard.tsx` has default export added
- [ ] `AIWorkflowBuilder.tsx` uses `React.lazy` + Suspense for wizard
- [ ] `WizardLoadingSkeleton.tsx` created
- [ ] `WizardErrorBoundary.tsx` created
- [ ] Execution status state added to `workflowStore.ts`
- [ ] `useExecutionStatus.ts` hook created (WS + polling fallback)
- [ ] `useExecutionWebSocket.ts` hook created (reconnect with backoff)
- [ ] `ExecutionStatusBanner.tsx` component created
- [ ] `ExecutionProgressBar.tsx` component created
- [ ] WorkflowBuilder handles 202 response (shows queued state immediately)
- [ ] ExecutionConsole shows progress bar and currentStep
- [ ] Reconnect notice shown when WS disconnects
- [ ] Polling starts within 3 seconds of WS disconnect
- [ ] Bundle size check: wizard chunk is a separate file in `dist/assets/`

---

## AI / Gemini Checklist

- [ ] `GEMINI_API_KEYS` env var set with at least 2 keys
- [ ] Key pool initializes with correct count (check startup log)
- [ ] Simulated rate-limit test: mock key 0 → request succeeds with key 1
- [ ] Key values do NOT appear in any log output (grep logs for key substrings)
- [ ] Cooldown timing verified: rate-limited key unavailable for 60s
- [ ] `GEMINI_MAX_RETRIES=2` set and working
- [ ] `/api/health/gemini` returns safe metrics (index, requestCount, isCooling)

---

## Realtime Checklist

- [ ] `ws-redis-bridge.ts` initialized on all 3 app replicas
- [ ] Redis pub/sub verified: publish event → all replicas receive it
- [ ] WebSocket auth: unauthenticated connection rejected with code 4001
- [ ] Cross-replica test: execution on app2 → WS client on app1 receives event
- [ ] Frontend reconnect test: disconnect 10s → reconnecting notice → reconnect → events resume
- [ ] Polling fallback test: disable WS → polling activates within 3s
- [ ] No duplicate events causing UI double-updates

---

## Load Testing Checklist

- [ ] `tests/load/baseline.js` k6 script created
- [ ] Load test run at 100 VU: passes all thresholds
- [ ] Load test run at 500 VU: passes all thresholds
  - [ ] p95 latency (enqueue) < 2000ms ✓
  - [ ] Error rate < 1% ✓
  - [ ] DB connections (server-side via PgBouncer) < 50 ✓
  - [ ] Redis memory < 100MB ✓
  - [ ] Queue depth < 200 during test ✓
- [ ] Load test results documented in `tests/load/results-[date].md`
- [ ] Any bottlenecks found during load test have been fixed

---

## Security Checklist

- [ ] No Gemini API keys in logs (verified by grep)
- [ ] No `AWS_SECRET_ACCESS_KEY` in logs
- [ ] WebSocket connections require valid Cognito JWT
- [ ] User ID taken from JWT, not request body (verified in code)
- [ ] Users cannot access other users' executions (tested with two test accounts)
- [ ] No sensitive data in error messages returned to client
- [ ] `.env.docker` file in `.gitignore`

---

## Observability Checklist

- [ ] Structured JSON logs from execution worker
- [ ] Execution lifecycle events logged (queued, started, node.completed, completed, failed)
- [ ] Gemini events logged (rate_limited, auth_failed) with index only
- [ ] WebSocket events logged (connected, disconnected, published)
- [ ] Queue depth warnings logged when > 200
- [ ] Stuck execution alerts logged when running > 10 min
- [ ] `/api/health` returns 200 when all services OK, 503 when degraded
- [ ] Monitoring queries documented in `15_MONITORING_AND_OBSERVABILITY.md`

---

## Deployment Checklist

- [ ] All environment variables verified set and non-empty (run pre-deploy check script)
- [ ] PgBouncer service added to `infra/docker-compose.yml`
- [ ] `execution-worker` service added to `infra/docker-compose.yml`
- [ ] `infra/nginx.conf` updated with `ip_hash` sticky sessions
- [ ] `DIRECT_DATABASE_URL` set for migration-only use
- [ ] `worker/package.json` `prisma:migrate` script uses `DIRECT_DATABASE_URL`
- [ ] Docker image built and tagged for this release
- [ ] Previous Docker image tag noted for rollback

---

## Smoke Test Checklist

After deploy, run `bash scripts/smoke-test.sh`:

- [ ] `/api/health` returns 200 ✓
- [ ] Auth check with test JWT returns 200 ✓
- [ ] Workflow list returns correctly ✓
- [ ] Execute workflow returns 202 with executionId ✓
- [ ] Status endpoint returns execution record ✓
- [ ] WebSocket connects to `/ws/executions` ✓
- [ ] All smoke tests print ✓ and script exits 0

---

## Rollback Checklist

Rollback plan must be reviewed before deploy:

- [ ] Rollback steps in `10_DEPLOYMENT_AND_RUNBOOK.md` reviewed by both devs
- [ ] Previous image tag noted and available
- [ ] `rollback_0005.sql` file created and tested
- [ ] Rollback criteria agreed upon (see runbook)
- [ ] Both devs available during deploy window and 2-hour monitoring period
- [ ] Decision maker identified (who calls rollback)
- [ ] Rollback has been rehearsed on staging or locally

---

## Sign-Off Checklist

- [ ] Dev 1 (Backend): all backend items above checked ✓
- [ ] Dev 2 (Frontend/Testing): all frontend and testing items above checked ✓
- [ ] Load test results reviewed by both devs ✓
- [ ] Rollback plan reviewed by both devs ✓
- [ ] Deploy window confirmed: ______________________
- [ ] Both devs available on call during deploy: ✓
- [ ] Launch declared: ______________________

---

## Post-Launch Verification (T+1h, T+4h, T+24h)

- [ ] T+1h: Executions succeeding (query by status)
- [ ] T+1h: No stuck running jobs > 10 min old
- [ ] T+1h: PgBouncer server connections < 50
- [ ] T+4h: Gemini keys all healthy (no prolonged cooling)
- [ ] T+4h: Error rate < 1%
- [ ] T+24h: Review full day's execution stats
- [ ] T+24h: Review any user-reported issues
- [ ] T+24h: Decide if additional fixes needed before Phase 2
