# CtrlChecks — Live Server Test Plan

**Date:** 2026-06-20  
**Authorization:** `approve task LIVE`  
**Server:** ubuntu@3.7.115.58 | PEM: Guide/Worker/ctrlchecks-backend.pem  
**Public:** https://www.ctrlchecks.ai | Worker: https://worker.ctrlchecks.ai

---

## Audit Findings

| Item | Value |
|---|---|
| Node version | v20.20.2 |
| RAM free | 4.5 GB (7.6 GB total) |
| Disk free | 2.2 GB (68% used — watch this) |
| All 7 service units | active |
| All 7 health endpoints | ready |
| WORKFLOW_CRUD_LOCAL_WRITES_DISABLED | true ✅ |
| CREDENTIAL_SERVICE_VAULT_WRITES_DISABLED | true ✅ |

### Critical Structural Finding

Microservices are deployed as **separate directories** (`/opt/ctrlchecks-{name}`), NOT under a shared `services/` subdirectory. Each has `jest --passWithNoTests` and **0 actual test files**. T2 tests will pass trivially — this is expected for deployed services (tests live in source, not deployed bundle).

### Test File Inventory

| Package | Path on EC2 | Test files | Est. safe run time |
|---|---|---|---|
| worker | `/opt/ctrlchecks-worker` | 453 src + 15 test | Tiered only — NO full suite |
| ai-generator | `/opt/ctrlchecks-ai-generator` | 0 | `npm test` instant |
| execution-engine | `/opt/ctrlchecks-execution-engine` | 0 | `npm test` instant |
| credential-service | `/opt/ctrlchecks-credential-service` | 0 | `npm test` instant |
| notification-service | `/opt/ctrlchecks-notification-service` | 0 | `npm test` instant |
| trigger-service | `/opt/ctrlchecks-trigger-service` | 0 | `npm test` instant |
| workflow-crud-service | `/opt/ctrlchecks-workflow-crud-service` | 0 | `npm test` instant |

---

## 4-Tier Live Test Model

### T1 — Infrastructure Smoke (2 min, read-only)
**Script:** `scripts/verify-production.sh`  
**What:** systemctl active check, curl health :3001–:3007, grep both retirement gates  
**Destructive:** No  
**OOM risk:** None

### T2 — Service Jest Baseline (3 min, read-only)
**Script:** `run-live-tests.sh` section  
**What:** `cd /opt/ctrlchecks-{svc} && npm test` for each of 6 services  
**Result:** All 6 pass with 0 tests (expected — no test files deployed)  
**Value:** Confirms Jest + Node runtime works in each deployed env  
**Destructive:** No

### T3 — Worker Test Subsets (15–30 min, read-only)

Run in order, each `--runInBand --no-coverage` to stay within RAM:

| Sub-tier | npm script | What it tests |
|---|---|---|
| T3a | `test:contracts` | Registry contracts, frontend parity, node schema |
| T3b | `--testPathPattern=credential-service-client\|workflow-crud-service-client\|execution-engine-client\|trigger-service-client` | Microservice delegation client unit tests |
| T3c | `--testPathPattern=form-trigger\|dispatch-execution-notifications\|email-service` | FIX-2/3 regression tests |
| T3d | `--testPathPattern=if_else\|condition` | FIX-1 regression tests |

**Do NOT run:** `npm test --coverage` or full `npm test` (453 files → OOM / 30+ min)

### T4 — Live E2E Harness (10–15 min, isolated writes)
**Script:** `worker/scripts/live-e2e-harness.ts` (to be created in LIVE-1)  
**What:** Real HTTP against `http://127.0.0.1:3001`:
1. `GET /health/ready` — baseline
2. `POST /api/save-workflow` with minimal `manual_trigger → log_output` workflow
3. `POST /api/execute-workflow` → poll until terminal → verify `success`
4. Check delegation metrics hit `:3007` (CRUD) and `:3003` (engine)
5. `DELETE /api/workflows/{id}` — cleanup

**Requires:** `LIVE_TEST_BEARER_TOKEN` env var (Cognito JWT for dedicated test user)  
**Do NOT:** use main admin account, run concurrent requests, test OAuth flows  
**Destructive:** Yes — writes to DB (but cleans up, test-prefixed)

---

## Safety Rules

1. **Never** `npm test --coverage` on EC2 — OOM with 453 files
2. **Never** `npm test` (full suite) without explicit `--testPathPattern` filter
3. All T4 artifacts: prefix `live-test-*`, delete after run
4. Never stop a service for more than 60s during kill tests
5. Disk at 68% — each `node_modules` install adds ~500MB; check before `npm ci`
6. RAM: 4.5GB free — `--max-old-space-size=4096` cap if needed

---

## Existing Useful Scripts on EC2

| Script | Safe? | Notes |
|---|---|---|
| `test:contracts` | ✅ | Core contracts, mocked — run first |
| `test:run` | ⚠️ | Calls live AI generation — T4 only |
| `test:15-workflows` | ⚠️ | Calls live execute — T4 only, needs token |
| `test:integration` | ⚠️ | May call live services — review before running |
| `test:workflows` | ⚠️ | AI generation calls — T4 only |

---

## Files to Create in LIVE-1

| File | Purpose |
|---|---|
| `scripts/verify-production.sh` | T1 infrastructure smoke |
| `scripts/run-live-tests.sh` | Orchestrator for T1–T4 |
| `worker/scripts/live-e2e-harness.ts` | T4 real HTTP flows |
| `docs/engineering/live-test-runbook.md` | How to run on EC2 |

npm scripts to add to worker `package.json`:
- `"test:smoke"` — `jest --runInBand --no-coverage --passWithNoTests --testPathPattern=health|smoke|auth`
- `"test:microservices-delegation"` — `jest --runInBand --no-coverage --testPathPattern=trigger-service-client|workflow-crud-service-client|credential-service-client|execution-engine-client`

---

## Issue Priority Definitions

| Priority | Category | Examples |
|---|---|---|
| P0 | Production broken / data risk | save fails, execute hangs, 500 on core path |
| P1 | Microservice delegation broken | wrong service, silent fallback, gate not enforcing |
| P2 | Test infrastructure | missing script, OOM, wrong env |
| P3 | Pre-existing unit failures | unrelated to live stack |
| P4 | Accepted gap | document only |

---

## Expected Results (pre-run estimate)

| Tier | Expected outcome |
|---|---|
| T1 | All PASS — already verified manually |
| T2 | All PASS with 0 tests — trivial |
| T3a | Likely mostly PASS — contracts run locally |
| T3b–d | Likely PASS — FIX-1/2/3 unit tests pass locally |
| T4 | ✅ PASS — Steps 1–4 pass; 2 bugs found (LT-011 fixed, LT-012 open P1 admin quota) |

---

## Log Location

`/opt/ctrlchecks-worker/.claude/logs/live-runs/YYYYMMDD-HHMMSS/`  
(or locally at `.claude/logs/live-runs/`)
