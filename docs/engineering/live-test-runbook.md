# Live Server Test Runbook

**Server:** ubuntu@3.7.115.58 | PEM: Guide/Worker/ctrlchecks-backend.pem

## Quick run (T1+T2+T3 — safe, no token needed)

```bash
ssh -i Guide/Worker/ctrlchecks-backend.pem ubuntu@3.7.115.58
cd /opt/ctrlchecks-worker
bash scripts/run-live-tests.sh
```

## With T4 live E2E (requires Cognito JWT for test user)

```bash
RUN_T4=1 LIVE_TEST_BEARER_TOKEN="<cognito jwt>" bash scripts/run-live-tests.sh
```

## Individual tiers

```bash
# T1 — infrastructure only (~30s)
bash scripts/verify-production.sh

# T3a — registry contracts only (~5min)
cd worker && npm run test:contracts -- --no-coverage

# T3b — delegation client tests only (~3min)
cd worker && npm run test:microservices-delegation

# T3c — FIX-1/2/3 regression tests (~3min)
cd worker && npm run test:live-regression
```

## Rules

- **Never** run `npm test --coverage` or `npm test` (full suite) on EC2 — 453 test files, OOM risk
- **Never** run T4 without a dedicated test user token (not main admin)
- All T4 artifacts prefixed `live-test-*` and auto-deleted after run
- Logs: `.claude/logs/live-runs/YYYYMMDD-HHMMSS/`

## Interpreting results

| Tier | Pass means |
|---|---|
| T1 | All 7 services active + healthy, both retirement gates = true |
| T2 | Jest runtime works in each deployed service (0 test files — expected) |
| T3a | Node registry contracts intact, no schema regressions |
| T3b | Microservice delegation client functions work correctly |
| T3c | FIX-1 (if_else), FIX-2 (form trigger), FIX-3 (notifications) still passing |
| T4 | Real HTTP: save + execute + status poll + delegation metric + cleanup |
