# 10 — Deployment and Launch Runbook

---

# Launch Runbook

## Owners

| Area | Owner | Contact |
|---|---|---|
| Backend / Infrastructure | Dev 1 | — |
| Frontend / Testing | Dev 2 | — |
| AWS / Database | Dev 1 | — |
| Incident lead | Dev 1 | — |
| Comms | Dev 2 | — |

---

## Deployment Window

**Deploy during low-traffic time: Saturday or Sunday, 2:00 AM – 6:00 AM local time.**

Avoid: Friday evenings, Monday mornings, during active user campaigns.

---

## Required Environment Variables

All must be set in `.env.docker` (for docker-compose) before deploy. Verify each:

```bash
# Core
DATABASE_URL=postgresql://user:pass@pgbouncer:6432/db
DIRECT_DATABASE_URL=postgresql://user:pass@rds-host:5432/db
REDIS_URL=redis://redis:6379

# Kafka (set in docker-compose, not needed in worker/.env for local dev)
KAFKA_BROKERS=kafka:9092
KAFKA_REQUEST_TOPIC=request-queue
KAFKA_DEAD_LETTER_TOPIC=request-queue-dlq

# AWS (already set in worker/.env)
AWS_REGION=ap-south-1
COGNITO_USER_POOL_ID=ap-south-1_aTYvSYflq
COGNITO_CLIENT_ID=3ists5h8a1mmcs8are5n1pi5m8
COGNITO_DOMAIN=ap-south-1atyvsyflq.auth.ap-south-1.amazoncognito.com
COGNITO_ISSUER=https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_aTYvSYflq

# AI — GEMINI_API_KEY already set. Add GEMINI_API_KEYS once you have a second key:
# GEMINI_API_KEYS=AIzaSyDrHWCvQCZWByQ8LbdlTqCiw2SJeT8xCpc,AIzaSy...secondkey
GEMINI_KEY_COOLDOWN_SECONDS=60
GEMINI_MAX_RETRIES=2

# Async execution — NEW, must add to worker/.env
ENABLE_EXECUTION_QUEUE=true
WORKFLOW_WORKER_CONCURRENCY=5

# WebSocket — NEW, must add to worker/.env
WEBSOCKET_REDIS_CHANNEL_PREFIX=ctrlchecks:ws
EXECUTION_TIMEOUT_MS=300000

# DB connection (already set in worker/.env via SSH tunnel for local dev):
# DATABASE_URL=postgresql://ctrlchecks_admin:CtrlChecks2026@localhost:5433/ctrlchecks
# For PgBouncer (production only):
# DATABASE_URL=postgresql://ctrlchecks_admin:...@pgbouncer:6432/ctrlchecks
# DIRECT_DATABASE_URL=postgresql://ctrlchecks_admin:...@ctrlchecks-db.cxm8gymyysvy.ap-south-1.rds.amazonaws.com:5432/ctrlchecks
```

---

## Pre-Launch Checklist

**Engineering (complete before deploy window):**
- [ ] All backend tests pass: `cd worker && npm test`
- [ ] All frontend tests pass: `cd ctrl_checks && npm run test:vitest`
- [ ] Type check: `cd worker && npm run type-check` → 0 errors
- [ ] Frontend bundle built: `cd ctrl_checks && npm run build`
- [ ] Bundle size check passes: `cd ctrl_checks && npm run size-check`
- [ ] k6 load test at 500 VU: run against staging, review results
- [ ] All acceptance criteria from `01_LAUNCH_REQUIREMENTS.md` checked
- [ ] Rollback steps reviewed by both devs
- [ ] All new env vars added to `.env.docker` and verified non-empty

**Database (before deploy window):**
- [ ] `0005_execution_async_fields.sql` migration tested on staging DB
- [ ] Rollback SQL for migration verified
- [ ] Full DB backup taken (pg_dump or RDS snapshot)

---

## Database Migration Plan

```bash
# Real RDS details:
# Host: ctrlchecks-db.cxm8gymyysvy.ap-south-1.rds.amazonaws.com
# DB:   ctrlchecks  |  User: ctrlchecks_admin
# Access locally via SSH tunnel: localhost:5433 (run ssh-tunnel-loop.bat first)

# 1. Take RDS snapshot first (AWS CLI)
aws rds create-db-snapshot \
  --region ap-south-1 \
  --db-instance-identifier ctrlchecks-db \
  --db-snapshot-identifier pre-launch-$(date +%Y%m%d-%H%M)

# 2a. Run migration LOCALLY (tunnel must be running):
psql "postgresql://ctrlchecks_admin:CtrlChecks2026@localhost:5433/ctrlchecks" \
  -f worker/prisma/migrations/0005_execution_async_fields.sql

# 2b. OR run migration from EC2 (direct to RDS, no tunnel needed):
# ssh -i Guide/Worker/ctrlchecks-backend.pem ubuntu@3.7.115.58
# psql "postgresql://ctrlchecks_admin:CtrlChecks2026@ctrlchecks-db.cxm8gymyysvy.ap-south-1.rds.amazonaws.com:5432/ctrlchecks" -f 0005_execution_async_fields.sql

# 3. Verify migration (via tunnel locally):
psql "postgresql://ctrlchecks_admin:CtrlChecks2026@localhost:5433/ctrlchecks" -c "\d executions"
# Should show: user_id, queued_at, progress, current_step, error_code columns
```

---

## PgBouncer Deployment Plan

**Note: PgBouncer is for production only. Local dev uses the SSH tunnel directly.**

For production (running on EC2 or ECS in same AWS VPC as RDS):

```bash
# 1. Add pgbouncer service to docker-compose.yml (see 05_PGBOUNCER plan)
#    Set POSTGRESQL_HOST=ctrlchecks-db.cxm8gymyysvy.ap-south-1.rds.amazonaws.com

# 2. Deploy PgBouncer first
docker compose -f infra/docker-compose.yml up -d pgbouncer

# 3. Verify PgBouncer health
docker compose exec pgbouncer psql -h 127.0.0.1 -p 6432 -U ctrlchecks_admin -d ctrlchecks -c "SELECT 1"

# 4. Update app services DATABASE_URL to pgbouncer:6432, then redeploy
docker compose -f infra/docker-compose.yml up -d app1 app2 app3

# 5. Verify pools (should show active client+server connections)
docker compose exec pgbouncer psql -h 127.0.0.1 -p 6432 -U ctrlchecks_admin -d pgbouncer -c "SHOW POOLS"
```

---

## Redis / Kafka Checks

```bash
# Redis health
docker compose exec redis redis-cli ping   # → PONG

# Redis pub/sub verify
docker compose exec redis redis-cli subscribe ctrlchecks:ws:execution:test   # listen
# In another terminal: redis-cli publish ctrlchecks:ws:execution:test '{"test":1}'

# Kafka health (if using)
docker compose exec kafka kafka-topics.sh --bootstrap-server localhost:9092 --list
```

---

## Backend Deployment Steps

```bash
# 1. Pull latest code
git pull origin main

# 2. Build Docker image
docker compose -f infra/docker-compose.yml build

# 3. Deploy PgBouncer first (new service)
docker compose -f infra/docker-compose.yml up -d pgbouncer
# Wait for PgBouncer healthcheck to pass

# 4. Deploy execution worker (new service)
docker compose -f infra/docker-compose.yml up -d execution-worker
# Verify it starts and pulls from queue

# 5. Rolling deploy app replicas (one at a time to avoid downtime)
docker compose -f infra/docker-compose.yml up -d --no-deps app1
sleep 30  # Wait for health
docker compose -f infra/docker-compose.yml up -d --no-deps app2
sleep 30
docker compose -f infra/docker-compose.yml up -d --no-deps app3
```

---

## Worker Deployment Steps

```bash
# Deploy request-worker and execution-worker
docker compose -f infra/docker-compose.yml up -d request-worker execution-worker

# Verify workers are consuming from queues
docker compose logs -f execution-worker | grep "job\|queue\|starting"
```

---

## Frontend Deployment Steps

```bash
# Build production bundle
cd ctrl_checks && npm run build

# Verify bundle
ls -la dist/assets/
npm run size-check   # must pass thresholds

# Deploy to your hosting (nginx serves static files or upload to S3/CloudFront)
# For nginx: copy dist/ to nginx static folder
cp -r dist/* /var/www/html/ctrlchecks/
nginx -s reload
```

---

## Health Checks

```bash
# API health
curl http://localhost:8088/api/health

# Auth middleware
curl -H "Authorization: Bearer $TEST_TOKEN" http://localhost:8088/api/auth-status

# PgBouncer
docker compose exec pgbouncer psql -h 127.0.0.1 -p 6432 -U $DB_USER -d pgbouncer -c "SHOW STATS"

# Gemini pool metrics
curl -H "Authorization: Bearer $TEST_TOKEN" http://localhost:8088/api/health/gemini

# WebSocket
wscat -c "ws://localhost:3001/ws/executions?executionId=test&token=$TEST_TOKEN"
```

---

## Smoke Tests

```bash
# Run smoke test script
BASE_URL=http://localhost:8088 AUTH_TOKEN=$TOKEN SMOKE_WORKFLOW_ID=$WF_ID bash scripts/smoke-test.sh
```

Expected: all checks print ✓, script exits 0.

---

## Monitoring Checklist

After deploy, monitor for 2 hours:

- [ ] Docker logs: `docker compose logs -f app1 app2 app3` — no crash loops
- [ ] Execution queue depth: check Redis list length `LLEN ctrlchecks:execution-queue`
- [ ] PgBouncer pool stats: `SHOW POOLS` — server connections < 50
- [ ] Gemini health: `/api/health/gemini` — all keys healthy
- [ ] WebSocket connections: grep logs for `[WsRedisBridge]` messages
- [ ] Error rate: grep logs for `ERROR` count per minute
- [ ] Failed executions: query `SELECT status, count(*) FROM executions GROUP BY status`

---

## Rollback Criteria

Roll back immediately if any of these occur:

| Condition | Action |
|---|---|
| Login/auth failing for >5% of users | Immediate rollback |
| POST `/api/execute-workflow` error rate > 5% | Immediate rollback |
| DB connection errors appearing in logs | Immediate rollback (check PgBouncer) |
| p95 latency > 5 seconds sustained for 5 minutes | Rollback + investigate |
| All Gemini keys rate-limited simultaneously | Rollback AI generation feature only |
| Execution queue stuck (no jobs processing) | Restart execution-worker first; rollback if not fixed in 10 min |
| Worker crash loop (restarting every <60s) | Immediate rollback |
| Any data corruption or data loss | Immediate rollback + restore from RDS snapshot |

---

## Rollback Steps

```bash
# 1. Roll back app replicas to previous image
docker compose -f infra/docker-compose.yml up -d --no-deps \
  -e IMAGE_TAG=previous app1 app2 app3

# 2. If PgBouncer is causing issues, revert DATABASE_URL to direct RDS
# Edit docker-compose.yml: DATABASE_URL back to direct postgres URL
docker compose -f infra/docker-compose.yml up -d app1 app2 app3

# 3. If migration caused issues, run rollback SQL
cd worker
psql $DIRECT_DATABASE_URL -f prisma/migrations/rollback_0005.sql

# 4. Disable queue mode if async execution is broken
# Set ENABLE_EXECUTION_QUEUE=false in docker-compose and redeploy apps
docker compose -f infra/docker-compose.yml up -d app1 app2 app3

# 5. Verify rollback
curl http://localhost:8088/api/health
BASE_URL=http://localhost:8088 AUTH_TOKEN=$TOKEN bash scripts/smoke-test.sh
```

---

## Post-Launch Verification

Verify at T+1h, T+4h, T+24h:

- [ ] Executions succeeding: `SELECT status, count(*) FROM executions WHERE queued_at > now()-interval '1 hour' GROUP BY status`
- [ ] No stuck jobs: `SELECT count(*) FROM executions WHERE status = 'running' AND started_at < now()-interval '10 minutes'`
- [ ] PgBouncer stable: max server connections < 50
- [ ] All Gemini keys healthy: `/api/health/gemini`
- [ ] WebSocket events reaching browsers (test manually)

---

## Incident Notes Template

```
## Incident [DATE TIME]

**Detected at:** 
**Who detected:**
**Symptoms:**
**Impact:**
**Timeline:**
  - [TIME]: ...
  - [TIME]: ...
**Root cause:**
**Fix applied:**
**Rollback performed:** Y/N
**Resolution time:**
**Prevention:**
```
