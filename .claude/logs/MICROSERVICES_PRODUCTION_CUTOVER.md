# CtrlChecks — Microservices Production Cutover

**Created:** 2026-06-15  
**Purpose:** Pre-cutover checklist, final flag table, end-to-end smoke script, rollback matrix.  
**Status:** PENDING — cutover is not complete. Use this doc to track progress toward "done."

> "Done" = worker is a thin proxy; no double-writes anywhere; Grafana alerts green for 7 days.

---

## Pre-Cutover Checklist

Each box must be checked before the corresponding retirement gate can be flipped.

### Infrastructure

- [ ] All 7 services healthy on EC2 (`/health/ready` → 200 for :3001–3007)
- [ ] Prometheus scraping all 7 ports (verify via Grafana → Explore → `up` metric)
- [ ] Grafana alerts configured and green for ≥48h
- [ ] `ctrlchecks-workflow-crud-service` systemd unit installed and enabled on EC2
- [ ] Branch on EC2 standardized to `main` (not `main-repair`)
- [ ] Frontend live on Vercel `https://www.ctrlchecks.ai` — Vercel env vars set (`VITE_API_URL=https://worker.ctrlchecks.ai`) + redeploy
- [ ] Cognito callback URIs include `https://www.ctrlchecks.ai` (Cognito hosted UI → allowed callbacks)

### Per-Service Soaks (CODE: all done ✅ | OPS: pending)

| Service | Phase done | CANARY=100 soak | Gate eligible |
|---|---|---|---|
| execution-engine | P5 ✅ | 7 days — not started | Phase 6 (code + removal PR) |
| credential-service | P4 ✅ | 14 days — not started | `VAULT_WRITES_DISABLED=true` |
| notification-service | P4 ✅ | 7 days — not started | Fallback removal PR |
| trigger-service | P3 ✅ | 7 days — not started | P4 code (Kafka) then soak |
| workflow-crud-service | P4 ✅ | 14 days — not started | `LOCAL_WRITES_DISABLED=true` |

### Remaining Code

- [ ] **11D Phase 4** — Kafka integration + SchedulerService move off worker (after trigger soak)
- [ ] **11A Phase 6** — Move `dynamic-node-executor.ts` into engine; remove `/api/internal/engine-execute` (after execution soak)

---

## Final Flag Values (target state)

These are the values that will be set AFTER all soaks pass. Do not set until confirmed.

**Worker `/opt/ctrlchecks-worker/.env` target:**

```bash
# Execution engine
EXECUTION_ENGINE_ENABLED=true
EXECUTION_ENGINE_CANARY_PERCENT=100
WORKER_INTERNAL_KEY=<secret>

# Credential service
CREDENTIAL_SERVICE_ENABLED=true
CREDENTIAL_SERVICE_CANARY_PERCENT=100
CREDENTIAL_SERVICE_OAUTH_ENABLED=true
CREDENTIAL_SERVICE_OAUTH_PROVIDERS=*
CREDENTIAL_SERVICE_VAULT_WRITES_DISABLED=true   # ← flip after 2-week soak

# Notification service
NOTIFICATION_SERVICE_ENABLED=true
NOTIFICATION_SERVICE_CANARY_PERCENT=100

# Trigger service
TRIGGER_SERVICE_ENABLED=true
TRIGGER_SERVICE_CANARY_PERCENT=100

# Workflow CRUD service
WORKFLOW_CRUD_SERVICE_ENABLED=true
WORKFLOW_CRUD_SERVICE_CANARY_PERCENT=100
WORKFLOW_CRUD_LOCAL_WRITES_DISABLED=true        # ← flip after 2-week soak
```

---

## End-to-End Smoke Script

Run from EC2 host after all services are live. Each step validates one delegation path.

```bash
#!/bin/bash
# Full e2e smoke — requires valid Cognito JWT in TOKEN env var
# TOKEN=$(curl -s ... cognito token endpoint ...)

set -e
BASE="https://worker.ctrlchecks.ai"
AUTH="Authorization: Bearer $TOKEN"

echo "=== 1. Worker health ==="
curl -fsS "$BASE/health" | jq .status

echo "=== 2. All service health ==="
for p in 3001 3002 3003 3004 3005 3006 3007; do
  echo -n ":$p → "
  curl -fsS "http://localhost:$p/health/ready" 2>/dev/null | jq -r '.status // "ok"' || echo FAIL
done

echo "=== 3. Generate workflow (ai-generator delegation) ==="
GEN=$(curl -fsS -X POST "$BASE/api/generate-workflow" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"prompt":"Send me an email when a webhook fires"}')
echo "$GEN" | jq .workflowId
# Check ai-generator logs: sudo journalctl -u ctrlchecks-ai-generator --since "1 min ago" | grep '"level":"info"'

echo "=== 4. Save workflow (CRUD delegation) ==="
WF_ID=$(echo "$GEN" | jq -r .workflowId)
SAVE=$(curl -fsS -X POST "$BASE/api/save-workflow" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"workflow\":{\"id\":\"$WF_ID\",\"name\":\"E2E smoke\",\"nodes\":[],\"edges\":[]}}")
echo "$SAVE" | jq .id
# Check metric: curl -s http://localhost:3007/metrics | grep workflow_crud_operations_total

echo "=== 5. Load workflows (CRUD load/list canary) ==="
curl -fsS "$BASE/api/workflows" -H "$AUTH" | jq '.total // .workflows | length'

echo "=== 6. Execute workflow (execution engine canary) ==="
EXEC=$(curl -fsS -X POST "$BASE/api/execute-workflow" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"workflowId\":\"$WF_ID\",\"inputs\":{}}")
echo "$EXEC" | jq '{status:.status, executionId:.executionId}'
# Check metric: curl -s http://localhost:3001/metrics | grep execution_engine_delegation_total

echo "=== 7. Connect OAuth credential (credential service) ==="
# Manual check: visit https://www.ctrlchecks.ai/connections → connect Google
# Verify: curl -s http://localhost:3004/metrics | grep credential_operations_total

echo "=== 8. Webhook trigger (trigger service) ==="
HOOK_URL=$(curl -fsS "$BASE/api/triggers/webhook/register" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"workflowId\":\"$WF_ID\"}" | jq -r .url)
echo "Trigger URL: $HOOK_URL"
curl -fsS -X POST "$HOOK_URL" -H "Content-Type: application/json" -d '{"test":true}'
# Check metric: curl -s http://localhost:3001/metrics | grep trigger_service_delegation_total

echo "=== 9. Notification (notification service) ==="
# Verify SES delivery: curl -s http://localhost:3005/metrics | grep notification_delivery_total

echo "=== 10. Delegation summary ==="
curl -s http://localhost:3001/metrics | grep -E "delegation_total|workflow_crud_delegation"

echo "=== ALL DONE ==="
```

---

## Rollback Matrix

| Scenario | Action | Time to recover |
|---|---|---|
| Single service errors | `ENABLED=false` + `systemctl restart ctrlchecks-worker` | < 30 seconds |
| Multiple services degrade | Full monolith rollback (all ENABLED=false) — see `TASK12_OBSERVABILITY.md` | < 60 seconds |
| Bad code deploy | `git reset --hard <good-sha>` + `npm ci && npm run build` + restart | 5–10 min |
| Retirement gate causes 503 | Set `*_WRITES_DISABLED=false` + restart worker | < 30 seconds |
| DB connectivity lost | Check PgBouncer; force-fail stuck executions; see `docs/runbooks/database-restore.md` | Variable |
| Queue backlog | See `TASK12_OBSERVABILITY.md` → Queue backlog procedure | Variable |

**Per-service rollback commands** → see `MICROSERVICES_OPS_PLAYBOOK.md` → "Per-Service Ops Status"

---

## "Done" Criteria

All of the following must be true simultaneously for ≥7 days:

1. All 7 services responding `/health/ready` with no degraded checks
2. `result="error"` delegation counters < 0.01% of total per service
3. No `WORKFLOW_CRUD_SERVICE_UNAVAILABLE` or `CREDENTIAL_SERVICE_UNAVAILABLE` 503s in logs
4. Grafana alerts: `queue_depth`, `5xx_rate`, `process_uptime`, `db_pool` all green
5. Both retirement gates enabled (`VAULT_WRITES_DISABLED=true`, `LOCAL_WRITES_DISABLED=true`) and stable for ≥7 days
6. Worker fallback code removal PRs merged (11A Phase 6 + CRUD/vault removal)
7. End-to-end smoke script (section above) passes clean in production

---

## Handoff Card Template (for final cutover session)

```markdown
## CUTOVER HANDOFF CARD

**Date**: <date>
**All services healthy**: yes/no
**Soaks passed**: execution-engine/credential/notification/trigger/workflow-crud
**Gates flipped**: VAULT_WRITES_DISABLED=true / LOCAL_WRITES_DISABLED=true
**Remaining code**: 11D Phase 4 / 11A Phase 6 / none
**E2E smoke result**: pass/fail
**Grafana status**: green for N days
**Next action**: <declare done / fix X / continue soak>
```
