# Phase 1 — Infrastructure Smoke

**Prerequisite:** Phase 0 Tier 1 + Tier 2 complete.

**Objective:** Confirm worker, frontend, deploy pipeline, observability, and security headers before any user-flow testing.

---

## What to test

| # | Check | Expected |
|---|-------|----------|
| 1.1 | `GET /health/live` | `200`, `{"status":"live"}` |
| 1.2 | `GET /health/ready` | `200`, `db: ok`, `redis: ok` |
| 1.3 | Helmet headers | `X-Content-Type-Options`, `X-Frame-Options`, `x-request-id` |
| 1.4 | `GET /metrics` | JSON with `uptime_seconds`, `memory_rss_mb` |
| 1.5 | `GET /api/docs` without JWT | `401` |
| 1.6 | `GET /api/docs/openapi.json` with JWT | `200`, valid OpenAPI JSON |
| 1.7 | Circuit breaker env | Canary vars set per Phase 4 |
| 1.8 | Frontend loads | `https://ctrlchecks.ai` (or Vercel URL) returns 200 |
| 1.9 | Frontend → worker API | CORS allows frontend origin |
| 1.10 | Sentry | Test error captured (optional manual) |

---

## Scripts (run on server)

```bash
cd /opt/ctrlchecks-worker
source .env.live-test 2>/dev/null || true
bash /path/to/repo/scripts/live-testing/phase-1-infra-smoke.sh
```

### Live E2E harness (existing)

```bash
cd /opt/ctrlchecks-worker
export LIVE_E2E_BASE_URL=https://worker.ctrlchecks.com
export LIVE_TEST_BEARER_TOKEN="<jwt>"
npx ts-node scripts/live-e2e-harness.ts
```

Expected: `✅ T4 Live E2E PASS`

---

## gstack usage (optional, from Claude Code)

```
/qa Test infrastructure smoke on https://ctrlchecks.ai and https://worker.ctrlchecks.com
/canary Monitor /health/live for 5 minutes after any deploy
```

---

## Gate

All 1.1–1.10 PASS + live-e2e-harness PASS → proceed to **Phase 2**.

Log results in `.claude/logs/LIVE-TEST-RESULTS.md`.
