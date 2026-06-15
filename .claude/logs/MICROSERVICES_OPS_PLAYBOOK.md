# CtrlChecks — Microservices Ops Playbook

**Updated:** 2026-06-15  
**Purpose:** Unified soak + canary ramp + rollback runbook for all 5 extracted services.  
**Server:** `ubuntu@3.7.115.58` — PEM: `Guide/Worker/ctrlchecks-backend.pem`

> All microservices bind `127.0.0.1` only. Worker keeps all public URLs. Rollback = set `ENABLED=false` + restart worker. No redeploy needed.

---

## Activation Matrix

| Service | Port | ENABLED var | CANARY var | Retirement gate | Soak required |
|---|---|---|---|---|---|
| execution-engine | 3003 | `EXECUTION_ENGINE_ENABLED` | `EXECUTION_ENGINE_CANARY_PERCENT` | Phase 6 removes internal route | 7 days at CANARY=100 before Phase 6 |
| credential-service | 3004 | `CREDENTIAL_SERVICE_ENABLED` | `CREDENTIAL_SERVICE_CANARY_PERCENT` | `CREDENTIAL_SERVICE_VAULT_WRITES_DISABLED` | 14 days at CANARY=100 before gate flip |
| notification-service | 3005 | `NOTIFICATION_SERVICE_ENABLED` | `NOTIFICATION_SERVICE_CANARY_PERCENT` | — | 7 days at CANARY=100 |
| trigger-service | 3006 | `TRIGGER_SERVICE_ENABLED` | `TRIGGER_SERVICE_CANARY_PERCENT` | — | 7 days at CANARY=100 |
| workflow-crud-service | 3007 | `WORKFLOW_CRUD_SERVICE_ENABLED` | `WORKFLOW_CRUD_SERVICE_CANARY_PERCENT` | `WORKFLOW_CRUD_LOCAL_WRITES_DISABLED` | 14 days at CANARY=100 before gate flip |

---

## Standard Canary Ramp (applies to each service independently)

```
ENABLED=true, CANARY=5   → soak 48h → check delegation counters
CANARY=25                → soak 48h
CANARY=50                → soak 48h
CANARY=100               → soak 7 days (14 days for services with retirement gates)
→ flip retirement gate (if applicable)
→ after gate=true for ≥1 week: remove worker fallback code in next PR
```

### How to set flags (no redeploy)

```bash
ssh -i Guide/Worker/ctrlchecks-backend.pem ubuntu@3.7.115.58

# Example: activate execution-engine at 5% canary
sed -i 's/^EXECUTION_ENGINE_ENABLED=.*/EXECUTION_ENGINE_ENABLED=true/' /opt/ctrlchecks-worker/.env
sed -i 's/^EXECUTION_ENGINE_CANARY_PERCENT=.*/EXECUTION_ENGINE_CANARY_PERCENT=5/' /opt/ctrlchecks-worker/.env
sudo systemctl restart ctrlchecks-worker
sleep 5 && curl -fsS http://localhost:3001/health
```

### How to monitor delegation

```bash
# Watch delegation counters update in real time (Ctrl+C to exit)
watch -n 10 'curl -s http://localhost:3001/metrics | grep -E "delegation_total|workflow_crud"'

# Check per-service
curl -s http://localhost:3001/metrics | grep execution_engine_delegation_total
curl -s http://localhost:3001/metrics | grep credential_service_delegation_total
curl -s http://localhost:3001/metrics | grep notification_service_delegation_total
curl -s http://localhost:3001/metrics | grep trigger_service_delegation_total
curl -s http://localhost:3001/metrics | grep workflow_crud_delegation_total
```

**Healthy delegation metric**: `result="success"` counter rising, `result="error"` counter at 0 or very low (< 0.1%).

---

## Per-Service Ops Status

### execution-engine (:3003)

**Code phase:** Phase 5 complete (100% canary wiring, engine-first 202/503)  
**Next code phase:** Phase 6 — move executor into engine; remove `/api/internal/engine-execute` (blocked on 7-day soak at CANARY=100)  
**Contract:** `docs/engineering/execution-engine-contract.md`  
**Completion doc:** `.claude/logs/TASK11A_PHASE5_SOAK.md`

```bash
# Health
curl -fsS http://localhost:3003/health/ready | jq .

# Logs
sudo journalctl -u ctrlchecks-execution-engine -f

# Rollback
sed -i 's/^EXECUTION_ENGINE_ENABLED=.*/EXECUTION_ENGINE_ENABLED=false/' /opt/ctrlchecks-worker/.env
sudo systemctl restart ctrlchecks-worker
```

**Required env vars on EC2** (in `/opt/ctrlchecks-execution-engine/.env`):
```
PORT=3003
NODE_ENV=production
DATABASE_URL=<copy from worker>
REDIS_URL=<copy from worker>
EXECUTION_ENGINE_SERVICE_KEY=<shared secret>
WORKER_INTERNAL_KEY=<shared secret — must match worker WORKER_INTERNAL_KEY>
WORKER_URL=http://localhost:3001
EXECUTION_ENGINE_CONSUMER_ENABLED=true
```

---

### credential-service (:3004)

**Code phase:** Phase 4 complete  
**Retirement gate:** `CREDENTIAL_SERVICE_VAULT_WRITES_DISABLED=false` (flip after 2-week soak at CANARY=100)  
**Contract:** `docs/engineering/credential-service-contract.md`  
**Completion doc:** `.claude/logs/TASK11B_COMPLETE.md`

```bash
# Health
curl -fsS http://localhost:3004/health/ready | jq .

# Logs
sudo journalctl -u ctrlchecks-credential-service -f

# Rollback
sed -i 's/^CREDENTIAL_SERVICE_ENABLED=.*/CREDENTIAL_SERVICE_ENABLED=false/' /opt/ctrlchecks-worker/.env
sudo systemctl restart ctrlchecks-worker
```

**Retirement gate flip** (ops action, after 2-week soak only):
```bash
sed -i 's/^CREDENTIAL_SERVICE_VAULT_WRITES_DISABLED=.*/CREDENTIAL_SERVICE_VAULT_WRITES_DISABLED=true/' /opt/ctrlchecks-worker/.env
sudo systemctl restart ctrlchecks-worker
# After ≥1 week with gate=true: remove worker vault fallback code in next PR
```

---

### notification-service (:3005)

**Code phase:** Phase 4 complete (webhook delivery)  
**No retirement gate** — worker fallback stays until explicit removal PR  
**Contract:** `docs/engineering/notification-service-contract.md`  
**Completion doc:** `.claude/logs/TASK11C_COMPLETE.md`

```bash
# Health (SES check)
curl -fsS http://localhost:3005/health/ready | jq .

# Email delivery counter
curl -s http://localhost:3005/metrics | grep notification_delivery_total

# Logs
sudo journalctl -u ctrlchecks-notification-service -f

# Rollback
sed -i 's/^NOTIFICATION_SERVICE_ENABLED=.*/NOTIFICATION_SERVICE_ENABLED=false/' /opt/ctrlchecks-worker/.env
sudo systemctl restart ctrlchecks-worker
```

---

### trigger-service (:3006)

**Code phase:** Phase 3 complete (schedule dispatch)  
**Phase 4 (Kafka + scheduler move):** blocked on P3 soak at CANARY=100  
**Contract:** `docs/engineering/trigger-service-contract.md`

```bash
# Health
curl -fsS http://localhost:3006/health/ready | jq .

# Trigger delegation
curl -s http://localhost:3001/metrics | grep trigger_service_delegation_total

# Logs
sudo journalctl -u ctrlchecks-trigger-service -f

# Rollback
sed -i 's/^TRIGGER_SERVICE_ENABLED=.*/TRIGGER_SERVICE_ENABLED=false/' /opt/ctrlchecks-worker/.env
sudo systemctl restart ctrlchecks-worker
```

---

### workflow-crud-service (:3007)

**Code phase:** Phase 4 complete (templates + load/list canary + retirement gate)  
**Retirement gate:** `WORKFLOW_CRUD_LOCAL_WRITES_DISABLED=false` (flip after 2-week soak at CANARY=100)  
**Contract:** `docs/engineering/workflow-crud-service-contract.md`  
**Completion doc:** `.claude/logs/TASK11E_COMPLETE.md`

```bash
# Health
curl -fsS http://localhost:3007/health/ready | jq .

# CRUD delegation counters
curl -s http://localhost:3001/metrics | grep workflow_crud_delegation_total
curl -s http://localhost:3007/metrics | grep workflow_crud_operations_total

# Logs
sudo journalctl -u ctrlchecks-workflow-crud-service -f

# Rollback
sed -i 's/^WORKFLOW_CRUD_SERVICE_ENABLED=.*/WORKFLOW_CRUD_SERVICE_ENABLED=false/' /opt/ctrlchecks-worker/.env
sudo systemctl restart ctrlchecks-worker
```

**Retirement gate flip** (ops action, after 2-week soak only):
```bash
sed -i 's/^WORKFLOW_CRUD_LOCAL_WRITES_DISABLED=.*/WORKFLOW_CRUD_LOCAL_WRITES_DISABLED=true/' /opt/ctrlchecks-worker/.env
sudo systemctl restart ctrlchecks-worker
# After ≥1 week with gate=true: remove worker save/delete/rollback fallback code in next PR
```

---

## Full Monolith Rollback (nuclear option)

Disables all 5 canary services at once. Use if multiple services degrade simultaneously.

```bash
ssh -i Guide/Worker/ctrlchecks-backend.pem ubuntu@3.7.115.58

sed -i 's/^EXECUTION_ENGINE_ENABLED=.*/EXECUTION_ENGINE_ENABLED=false/' /opt/ctrlchecks-worker/.env
sed -i 's/^CREDENTIAL_SERVICE_ENABLED=.*/CREDENTIAL_SERVICE_ENABLED=false/' /opt/ctrlchecks-worker/.env
sed -i 's/^NOTIFICATION_SERVICE_ENABLED=.*/NOTIFICATION_SERVICE_ENABLED=false/' /opt/ctrlchecks-worker/.env
sed -i 's/^TRIGGER_SERVICE_ENABLED=.*/TRIGGER_SERVICE_ENABLED=false/' /opt/ctrlchecks-worker/.env
sed -i 's/^WORKFLOW_CRUD_SERVICE_ENABLED=.*/WORKFLOW_CRUD_SERVICE_ENABLED=false/' /opt/ctrlchecks-worker/.env
sudo systemctl restart ctrlchecks-worker
sleep 5 && curl -fsS http://localhost:3001/health | jq .
```

---

## Deploy a New Service to EC2 (first-time setup)

Use one of the existing deploy scripts as the pattern:

```bash
# From local machine
bash scripts/deploy-<service-name>.sh

# On server (one-time unit install)
sudo cp /opt/ctrlchecks-worker/scripts/ctrlchecks-<service-name>.service \
        /etc/systemd/system/ctrlchecks-<service-name>.service
sudo systemctl daemon-reload
sudo systemctl enable ctrlchecks-<service-name>

# Create service .env (fill values from worker .env)
cat > /opt/ctrlchecks-<service-name>/.env <<'ENV'
PORT=<port>
NODE_ENV=production
DATABASE_URL=<copy from worker>
REDIS_URL=<copy from worker>
<SERVICE>_SERVICE_KEY=<generate: openssl rand -hex 32>
ENV

sudo systemctl start ctrlchecks-<service-name>
curl -fsS http://localhost:<port>/health/ready
```

---

## Soak Decision Log

Use this table to record soak milestones. Update as each step passes.

| Service | CANARY% | Date started | Date passed | Notes |
|---|---|---|---|---|
| execution-engine | 5 | — | — | |
| execution-engine | 100 | — | — | |
| credential-service | 5 | — | — | |
| credential-service | 100 | — | — | |
| notification-service | 5 | — | — | |
| notification-service | 100 | — | — | |
| trigger-service | 5 | — | — | |
| trigger-service | 100 | — | — | |
| workflow-crud-service | 5 | 2026-06-15 18:22 UTC | — | ENABLED=true, CANARY=5. Key mirrored. Worker + svc restarted. db:ok ✅ |
| workflow-crud-service | 25 | — | — | Pending 48h soak at 5% |
| workflow-crud-service | 50 | — | — | |
| workflow-crud-service | 100 | — | — | |
| credential gate flip | — | — | — | `VAULT_WRITES_DISABLED=true` |
| workflow-crud gate flip | — | — | — | `LOCAL_WRITES_DISABLED=true` |
