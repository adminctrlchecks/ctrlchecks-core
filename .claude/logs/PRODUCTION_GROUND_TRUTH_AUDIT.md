# Production Ground Truth Audit

**Date:** 2026-06-20 (updated post T10 FULL PASS)
**Server:** `ubuntu@3.7.115.58`

---

## T10 Smoke Test Results (2026-06-20)

| # | Test | Result |
|---|---|---|
| 1 | Manual trigger → execute workflow | PASS |
| 2 | Scheduled trigger | PASS |
| 3 | Form trigger → if_else → Gmail (~9.36s) | PASS |
| 4 | if_else condition routing | PASS |
| 5 | WS 101 live updates (not 3s poll) | PASS |
| 6 | In-app notification after success | PASS |

**Commits:** `9824f4c` FIX-1 · `b161de2` FIX-2 · `15cc5a4` FIX-3  
See `MICROSERVICES_CUTOVER_COMPLETE.md` for full bug list and accepted gaps.

---

## EC2 State vs. Plan: Summary Table (2026-06-20)

| Service | Code in repo | Deployed on EC2 | Port responds | ENABLED flag | CANARY% | Soak status |
|---|---|---|---|---|---|---|
| worker | ✅ 15cc5a4 | ✅ running | ✅ :3001 ready (db:ok, redis:ok) | N/A | N/A | Live |
| ai-generator | ✅ latest | ✅ running | ✅ :3002 ok | N/A | 100 | Live (direct delegation) |
| execution-engine | ✅ deployed | ✅ running | ✅ :3003 ready (db:ok, redis:ok) | **true** | **100** | Since 2026-06-16 (task-gated). CONSUMER_ENABLED=true in engine .env. Legacy execution-worker stopped+disabled. |
| credential-service | ✅ deployed | ✅ running | ✅ :3004 ready (db:ok) | **true** | **100** | Since 2026-06-16 (task-gated). OAuth connections bypass canary (accepted gap). |
| notification-service | ✅ deployed | ✅ running | ✅ :3005 ready (db:ok) | **true** | **100** | Since 2026-06-16. FIX-3B also wires notifications in execute-workflow.ts directly. |
| trigger-service | ✅ deployed | ✅ running | ✅ :3006 ready (db:ok) | **true** | **100** | Since 2026-06-16. Auth header bug fixed (286989e). |
| workflow-crud-service | ✅ deployed | ✅ running | ✅ :3007 ready (db:ok) | **true** | **100** | Since 2026-06-16 (task-gated). Write-only delegation (reads use db-proxy passthrough). |

**T10 FULL PASS (2026-06-20).** All 6 smoke items pass: form→if_else→Gmail, WS live updates, in-app notifications.  
**T9 retirement gates PENDING.** `WORKFLOW_CRUD_LOCAL_WRITES_DISABLED` and `CREDENTIAL_SERVICE_VAULT_WRITES_DISABLED` not yet flipped — require stable soak verification + `approve task T9`.

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
| Local workspace | master | 15cc5a4 | ✅ FIX-3 (WS + notifications) |
| GitHub origin | master | 15cc5a4 | ✅ current |
| EC2 /opt/ctrlchecks-worker | (tar deploy, not git) | 15cc5a4 | ✅ deployed via scripts/deploy-worker.sh |

---

## Historical Findings (initial audit 2026-06-15 morning)

- Server was on Task 9 code, 116 commits behind local workspace
- Zero microservices deployed; no systemd units beyond worker + ai-generator + legacy-execution-worker
- No feature flags in worker .env
- Both issues resolved in this session via Phase C (worker deploy) + Phase D (5 microservices)

---

## Activation Matrix (2026-06-20 — T9 COMPLETE)

| Service | Port | ENABLED flag | CANARY% | Retirement gate | Gate status |
|---|---|---|---|---|---|
| execution-engine | 3003 | **true** | **100** | Phase 6 code removal (future PR) | N/A |
| credential-service | 3004 | **true** | **100** | `CREDENTIAL_SERVICE_VAULT_WRITES_DISABLED` | ✅ **true** — flipped 2026-06-20, kill test PASS |
| notification-service | 3005 | **true** | **100** | — | N/A |
| trigger-service | 3006 | **true** | **100** | — | N/A |
| workflow-crud-service | 3007 | **true** | **100** | `WORKFLOW_CRUD_LOCAL_WRITES_DISABLED` | ✅ **true** — flipped 2026-06-20, kill test PASS |

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

### Phase G — Frontend (Vercel, NOT EC2 nginx)
- Frontend is live on **Vercel** at `https://www.ctrlchecks.ai` (GoDaddy → Vercel, already connected)
- EC2 nginx frontend vhost is unused — no Certbot on EC2 needed
- **User action (Vercel dashboard):** set `VITE_API_URL=https://worker.ctrlchecks.ai`, `VITE_PUBLIC_BASE_URL=https://www.ctrlchecks.ai` + other Cognito vars; redeploy
- **User action (AWS Cognito):** add `https://www.ctrlchecks.ai` to allowed callback + sign-out URLs
- Worker CORS already allows `https://www.ctrlchecks.ai` and `https://ctrlchecks.ai` (hardcoded in `cors.ts`)

### Phase H — Retirement gates (only after 2-week soak at CANARY=100)
- `WORKFLOW_CRUD_LOCAL_WRITES_DISABLED=true`
- `CREDENTIAL_SERVICE_VAULT_WRITES_DISABLED=true`
