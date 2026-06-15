# Production Ground Truth Audit

**Date:** 2026-06-15 (updated post-deploy)
**Server:** `ubuntu@3.7.115.58`

---

## EC2 State vs. Plan: Summary Table (CURRENT)

| Service | Code in repo | Deployed on EC2 | Port responds | ENABLED flag | CANARY% | Soak status |
|---|---|---|---|---|---|---|
| worker | ✅ Task 12+ (master bcffcb8) | ✅ running | ✅ :3001 ready (db:ok, redis:ok) | N/A | N/A | Live |
| ai-generator | ✅ latest | ✅ running | ✅ :3002 ok | not in .env | N/A | Live (no canary gate) |
| execution-engine | ✅ SSL fix bcffcb8 | ✅ deployed | ✅ :3003 ready (db:ok, redis:ok) | not in .env (false) | 0 | Not started — awaiting flags |
| credential-service | ✅ SSL fix bcffcb8 | ✅ deployed | ✅ :3004 ready (db:ok) | not in .env (false) | 0 | Not started |
| notification-service | ✅ SSL fix bcffcb8 | ✅ deployed | ✅ :3005 ready (db:ok) | not in .env (false) | 0 | Not started |
| trigger-service | ✅ SSL fix bcffcb8 | ✅ deployed | ✅ :3006 ready (db:ok) | not in .env (false) | 0 | Not started |
| workflow-crud-service | ✅ SSL fix bcffcb8 | ✅ deployed | ✅ :3007 ready (db:ok) | not in .env (false) | 0 | Not started |

**Phase D complete.** All 5 microservices deployed with systemd units and responding healthy.  
**Phase E next:** Add worker .env flags (all DISABLED), then canary ramp per MICROSERVICES_OPS_PLAYBOOK.md.

---

## Port Health (verified 2026-06-15 ~18:13 UTC)

```
:3001 → {"status":"ready","checks":{"db":"ok","redis":"ok"}}                              ✅
:3002 → {"status":"ok","service":"ai-generator","port":3002}                              ✅
:3003 → {"status":"ready","service":"execution-engine","checks":{"redis":"ok","db":"ok"}} ✅
:3004 → {"status":"ready","service":"credential-service","checks":{"db":"ok"}}            ✅
:3005 → {"status":"ready","service":"notification-service","checks":{"db":"ok","ses":"skip"}} ✅
:3006 → {"status":"ready","service":"trigger-service","checks":{"db":"ok"}}               ✅
:3007 → {"status":"ready","service":"workflow-crud-service","checks":{"db":"ok"}}         ✅
```

**SSL fix applied (bcffcb8):** `pg.Pool` in all 5 `services/*/src/lib/db.ts` now has
`ssl: { rejectUnauthorized: false }` — required for AWS RDS connections from EC2.

---

## Systemd Units (all 8 active as of 2026-06-15)

```
ctrlchecks-ai-generator.service         active running  :3002
ctrlchecks-credential-service.service   active running  :3004
ctrlchecks-execution-engine.service     active running  :3003
ctrlchecks-execution-worker.service     active running  ← LEGACY (pre-Task 11A) — see note below
ctrlchecks-notification-service.service active running  :3005
ctrlchecks-trigger-service.service      active running  :3006
ctrlchecks-worker.service               active running  :3001
ctrlchecks-workflow-crud-service.service active running :3007
```

**LEGACY NOTE:** `ctrlchecks-execution-worker.service` is the old queue-based execution
consumer from before Task 11A. It must be stopped/disabled **before** enabling
`EXECUTION_ENGINE_CANARY_PERCENT > 0` to avoid duplicate job consumption.
Do not stop without user approval.

---

## Feature Flags in worker .env (as of 2026-06-15)

```
(none yet — all ENABLED flags default to false in code)
```

**Next step:** Append the flag block from MICROSERVICES_OPS_PLAYBOOK.md Phase 2 to
`/opt/ctrlchecks-worker/.env`. All values start ENABLED=false / CANARY=0.

---

## Git State

| Location | Branch | Commit | Status |
|---|---|---|---|
| Local workspace | master | bcffcb8 | ✅ pushed to origin |
| GitHub origin | master | bcffcb8 | ✅ current |
| EC2 /opt/ctrlchecks-worker | (tar deploy, not git) | Task 12+ code | ✅ deployed via scripts/deploy-worker.sh |

---

## Historical Findings (initial audit 2026-06-15 morning)

- Server was on Task 9 code, 116 commits behind local workspace
- Zero microservices deployed; no systemd units beyond worker + ai-generator + legacy-execution-worker
- No feature flags in worker .env
- Both issues resolved in this session via Phase C (worker deploy) + Phase D (5 microservices)

---

## Activation Matrix (CURRENT)

| Service | Port | ENABLED flag | CANARY% | Retirement gate | Soak status |
|---|---|---|---|---|---|
| execution-engine | 3003 | false (not in .env) | 0 | `EXECUTION_ENGINE_CONSUMER_ENABLED` | Not started |
| credential-service | 3004 | false (not in .env) | 0 | `CREDENTIAL_SERVICE_VAULT_WRITES_DISABLED` | Not started |
| notification-service | 3005 | false (not in .env) | 0 | — | Not started |
| trigger-service | 3006 | false (not in .env) | 0 | — | Not started |
| workflow-crud-service | 3007 | **true** | **5** | `WORKFLOW_CRUD_LOCAL_WRITES_DISABLED=false` | **Soak started 2026-06-15 18:22 UTC** |

---

## Next Steps (Priority Order)

### Phase E — Worker flags (no delegation yet)
1. SSH to `/opt/ctrlchecks-worker/.env`, append all `*_ENABLED=false / *_CANARY_PERCENT=0` vars
2. Generate service keys: `openssl rand -hex 32` × 5
3. Mirror keys into each `/opt/ctrlchecks-*/\.env`
4. Restart worker — verify :3001 still healthy, no delegation traffic yet

### Phase E2 — Legacy execution-worker
5. Document conflict risk; get user approval; `sudo systemctl stop ctrlchecks-execution-worker`
6. Disable unit: `sudo systemctl disable ctrlchecks-execution-worker`

### Phase F — Canary ramp (ops playbook order)
Ramp one service at a time, 48h soak between steps:
1. workflow-crud-service: CANARY 5 → 25 → 50 → 100 (7d at 100% before retirement gate)
2. notification-service
3. credential-service
4. trigger-service
5. execution-engine (last — requires legacy worker disabled first)

### Phase G — Frontend HTTPS
- DNS A record `app.ctrlchecks.ai → 3.7.115.58`
- `sudo certbot --nginx -d app.ctrlchecks.ai`
- Add Cognito callback URIs for `https://app.ctrlchecks.ai`

### Phase H — Retirement gates (only after 2-week soak at CANARY=100)
- `WORKFLOW_CRUD_LOCAL_WRITES_DISABLED=true`
- `CREDENTIAL_SERVICE_VAULT_WRITES_DISABLED=true`
