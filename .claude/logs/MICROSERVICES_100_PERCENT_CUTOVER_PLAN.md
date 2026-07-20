# CtrlChecks — 100% Microservices Cutover Plan
**Created:** 2026-06-16 | **Updated:** 2026-06-20  
**Status:** ACTIVE — T10 FULL PASS. T0–T8 complete. T9 (retirement gate) pending.  
**Server:** `ubuntu@3.7.115.58` | **Branch:** `origin/master @ 15cc5a4`

> **MODE AMENDMENT (2026-06-16):** User opted out of 48h/7d/14d calendar soaks in favor of **task-gated execution** — accepted tradeoff: higher rollback risk in exchange for faster timeline (investor target 2026-06-25). Gate to advance is now **metrics error=0 + manual smoke + ~30–60min observation**, not elapsed wall-clock time. Multiple CANARY% steps for the *same* service may happen in one session if each gate passes. Retirement gates (LOCAL_WRITES, VAULT_WRITES) still require minimum **24h stable @ 100%** before flipping (reduced from 7d/14d — explicit user risk acceptance). Rules that still apply unchanged: one service ramp at a time, explicit "approve task T#" per flag change, rollback test once per session, SSH writes need approval, git push needs diff+approval. Task queue T0–T10 superseds the dated ladder in section B/C below for sequencing purposes; dates in B/C are now stale/advisory only.

> **ARCHITECTURAL FINDING (2026-06-16, during T3 100% verification):** `WORKFLOW_CRUD_SERVICE_CANARY_PERCENT` only affects **writes** (save via `/api/save-workflow`, delete via `awsClient`'s special-cased `/api/workflows/:id` DELETE). **Reads (load a workflow, list workflows) never delegate to workflow-crud-service regardless of canary %.** Root cause: the frontend's primary read path is `awsClient.from('workflows').select(...)` (used in 13 files incl. `WorkflowBuilder.tsx`, `Dashboard.tsx`, `Workflows.tsx`), which calls the generic `GET /api/db/:table` proxy (`dbProxyGet` in `db-proxy.ts`) — a table-agnostic passthrough with no canary awareness. The canary-aware `GET /api/workflows` / `GET /api/workflows/:id` routes in `index.ts` (added in Phase 4) are effectively orphaned — nothing in the main app calls them for reads. **User decision (2026-06-16): accept write-only delegation as sufficient for T3/CRUD-100% and proceed with the ladder.** This is consistent with what the `WORKFLOW_CRUD_LOCAL_WRITES_DISABLED` retirement gate actually guards (writes failing closed if :3007 is down) — reads were never in scope for that gate. Wiring frontend reads through the canary path (or adding delegation to `dbProxyGet`) is a separate backlog item, not a blocker for T4+.
> Also note: the delegation metric's actual label is `ctrlchecks_workflow_crud_delegation_total{result="hit"}` — not `result="success"`/`result="error"` as earlier sections of this doc assume. No "miss"/"error" label has been observed yet; treat "error=0" checks as "no error-labeled samples exist" rather than literally grepping for `result="error"` count.

> **BUG FIX (2026-06-16, during T4 wiring audit): Redis subscriber-mode crash fixed.** `worker/src/services/ws-redis-bridge.ts` was calling the shared singleton `getRedisClient()` for both its publisher AND subscriber, getting the same object both times. Subscribing locked that one shared connection into subscriber mode for the life of the process, breaking every other caller (`execution-queue.ts`'s `zcard`/`zadd`) with `Error: Connection in subscriber mode`. This silently forced **every** workflow execution onto the legacy "direct execution" fallback in `execute-workflow.ts`, which has zero notification-sending code — meaning execution-completed/failed emails and in-app notifications had been silently broken for all users since at least 2026-06-15 18:43 UTC, independent of this cutover. Fixed by using `publisher.duplicate()` for the subscriber (commit `9b4c4c8`, deployed via `scripts/deploy-worker.sh`). Verified post-deploy: queue path now completes end-to-end (`Job queued → Executing job → Job completed`) with zero subscriber-mode errors. **Newly exposed (not introduced) latent issue:** the queue's retry-on-any-error logic doesn't understand form-trigger's "pause and wait for form submission" state — the first job retries 3x with `Error: Execution not found` before a second job (created after form submit) succeeds. Self-heals, not blocking, logged as backlog.

---

## A. Executive Summary

### Current State (2026-06-16)
- **~99% of traffic is on the monolith worker** (:3001)
- workflow-crud-service is at 5% canary → ~1% of overall workflow saves delegated
- All 5 target services deployed and healthy; none fully active yet
- ai-generator (:3002) is live and always-on (no canary gate — direct delegation)

### Target End State
```
                        ┌─────────────────────────────────────────┐
   Browser / Mobile     │   Worker :3001 (Public API Hub)         │
   ──────────────────▶  │   Auth · OAuth proxy · WebSocket        │
                        │   Graph orchestration · Rate limits      │
                        └──────┬──────┬──────┬──────┬──────┬──────┘
                               │      │      │      │      │
                               ▼      ▼      ▼      ▼      ▼
                    :3002   :3003   :3004  :3005  :3006  :3007
                    ai-gen  exec    cred   notif  trig   crud
                    (live)  eng     svc    svc    svc    svc
                            100%   100%   100%   100%   100%
                            CANARY at full delegation
```

**Worker never disappears** — it owns all public-facing concerns. Internal services (:3002–:3007) are 127.0.0.1 only.

### Estimated Calendar (conservative — 48h soaks honoured)

| Milestone | Earliest date |
|---|---|
| CRUD 25% | 2026-06-17 18:22 UTC |
| CRUD 50% | 2026-06-19 18:22 UTC |
| CRUD 100% | 2026-06-21 18:22 UTC |
| CRUD LOCAL_WRITES gate | 2026-06-28 18:22 UTC |
| notification 100% | 2026-06-28 |
| credential 100% | 2026-07-05 |
| credential VAULT_WRITES gate | 2026-07-19 |
| trigger 100% | 2026-07-12 |
| execution-engine 100% | 2026-07-19 |
| All gates + Phase 6 code cleanup | 2026-07-26 |

**Total:** ~40 days from today. Critical path is the serial soak ladder; no soaks can be parallelised.

### Critical Path
```
CRUD 100% (2026-06-21)
  └─▶ notification 100% (2026-06-28)
        └─▶ credential 100% (2026-07-05)  ←── 14-day soak adds 7 extra days
              └─▶ trigger 100% (2026-07-12)
                    └─▶ execution-engine 100% (2026-07-19)
                          └─▶ Phase 6 code removal (2026-07-26)
```

What blocks what:
- Each service ramp must be 100% before the next starts (one active ramp at a time)
- execution-engine needs `EXECUTION_ENGINE_CONSUMER_ENABLED=true` set before its first canary
- Legacy `ctrlchecks-execution-worker` stop is cleanup only (different queue) — can happen any time after execution-engine reaches 100%

---

## B. Service-by-Service Ladder

### workflow-crud-service (:3007) — IN PROGRESS

| Step | Date (earliest) | Command (redacted diff) | Metrics pass | Manual smoke |
|---|---|---|---|---|
| 5% ✅ | 2026-06-15 18:22 | done | error=0 ✅ | — |
| 25% | **2026-06-17 18:22** | `CANARY_PERCENT=25` + restart worker | success↑ error=0 | save + reload workflow |
| 50% | **2026-06-19 18:22** | `CANARY_PERCENT=50` + restart worker | same | save + delete + versions |
| 100% | **2026-06-21 18:22** | `CANARY_PERCENT=100` + restart worker | same | full CRUD smoke |
| LOCAL_WRITES gate | **2026-06-28 18:22** | `WORKFLOW_CRUD_LOCAL_WRITES_DISABLED=true` | 7-day soak at 100% passed | save fails gracefully if :3007 down |

**Rollback:** `WORKFLOW_CRUD_SERVICE_ENABLED=false` + `sudo systemctl restart ctrlchecks-worker` (~6s)  
**Retirement gate:** flipping `LOCAL_WRITES_DISABLED=true` makes worker return 503 if :3007 is down — fail-closed. Only flip after 7-day soak at CANARY=100.

---

### notification-service (:3005) — starts after CRUD hits 100%

| Step | Date (earliest) | Diff | Metrics pass | Manual smoke |
|---|---|---|---|---|
| 5% | 2026-06-22 | `NOTIFICATION_SERVICE_ENABLED=true` + `CANARY_PERCENT=5` | error=0 | trigger email/in-app from UI |
| 25% | 2026-06-24 | `CANARY_PERCENT=25` | success↑ error=0 | same |
| 50% | 2026-06-26 | `CANARY_PERCENT=50` | same | webhook delivery |
| 100% | 2026-06-28 | `CANARY_PERCENT=100` | same | full notification smoke |

**No retirement gate.** Fallback removal is a code PR after 7-day soak at 100%.  
**Rollback:** `NOTIFICATION_SERVICE_ENABLED=false` + restart worker  
**SES note:** notification health shows `ses:skip` (SES not configured). Email delegation works if `AWS_*` vars are set on the service; in-app and webhook work regardless.

---

### credential-service (:3004) — starts after notification hits 100%

| Step | Date (earliest) | Diff | Metrics pass | Manual smoke |
|---|---|---|---|---|
| 5% | 2026-06-29 | `CREDENTIAL_SERVICE_ENABLED=true` + `CANARY_PERCENT=5` | error=0 | list credentials in /connections |
| 25% | 2026-07-01 | `CANARY_PERCENT=25` | success↑ error=0 | OAuth connect flow |
| 50% | 2026-07-03 | `CANARY_PERCENT=50` | same | create + delete credential |
| 100% | 2026-07-05 | `CANARY_PERCENT=100` | same | full connections smoke |
| VAULT_WRITES gate | **2026-07-19** | `CREDENTIAL_SERVICE_VAULT_WRITES_DISABLED=true` | **14-day** soak at 100% | credential write fails gracefully if :3004 down |

**Retirement gate:** `VAULT_WRITES_DISABLED=true` means worker vault writes fail-closed — only after 14-day soak (longest gate in the system).  
**Rollback:** `CREDENTIAL_SERVICE_ENABLED=false` + restart worker

---

### trigger-service (:3006) — starts after credential hits 100%

| Step | Date (earliest) | Diff | Metrics pass | Manual smoke |
|---|---|---|---|---|
| 5% | 2026-07-06 | `TRIGGER_SERVICE_ENABLED=true` + `CANARY_PERCENT=5` | error=0 | create webhook trigger |
| 25% | 2026-07-08 | `CANARY_PERCENT=25` | success↑ error=0 | form trigger |
| 50% | 2026-07-10 | `CANARY_PERCENT=50` | same | schedule trigger dispatch |
| 100% | 2026-07-12 | `CANARY_PERCENT=100` | same | full trigger smoke |

**No retirement gate.** Phase 4 code (Kafka + scheduler move) is a separate future task after 7-day soak at 100%.  
**Rollback:** `TRIGGER_SERVICE_ENABLED=false` + restart worker

---

### execution-engine (:3003) — last; starts after trigger hits 100%

**Pre-steps (get user approval for each):**
1. SSH: set `EXECUTION_ENGINE_CONSUMER_ENABLED=true` in `/opt/ctrlchecks-execution-engine/.env` + restart engine service only (no worker restart, no traffic change yet)
2. SSH: `sudo systemctl stop ctrlchecks-execution-worker && sudo systemctl disable ctrlchecks-execution-worker` — cleanup, different queue (`workflow:execution:queue` vs `workflow:execution:engine-queue`), safe to do any time after engine consumer is verified healthy

| Step | Date (earliest) | Diff | Metrics pass | Manual smoke |
|---|---|---|---|---|
| consumer enabled | 2026-07-13 | engine .env only; restart engine | engine health/ready still ok; engine-queue starts consuming | — |
| 5% | 2026-07-13 | `EXECUTION_ENGINE_ENABLED=true` + `CANARY_PERCENT=5` | error=0 | execute workflow → WS stream |
| 25% | 2026-07-15 | `CANARY_PERCENT=25` | success↑ error=0 | async execute + status poll |
| 50% | 2026-07-17 | `CANARY_PERCENT=50` | same | execution with credential node |
| 100% | 2026-07-19 | `CANARY_PERCENT=100` | same | full execution smoke |
| Phase 6 code | **post 2026-07-26** | code PR — move executor into engine, remove `/api/internal/engine-execute` | 7-day soak at 100% | — |

**Rollback:** `EXECUTION_ENGINE_ENABLED=false` + restart worker (jobs fall back to legacy monolith path)

---

### ai-generator (:3002) — already delegating

Always-on direct delegation (no canary gate). Worker calls `AI_GENERATOR_URL=http://localhost:3002` for all workflow generation.  
**Verify:** `curl -s localhost:3001/metrics | grep ai_generator` — should show delegation hits on every `/api/generate-workflow` call.

---

## C. Sequential Order (mandatory — one active ramp at a time)

```
[NOW]   workflow-crud: 5% → 25% → 50% → 100% → 7d soak → LOCAL_WRITES_DISABLED
[~D+7]  notification: 5% → 25% → 50% → 100%
[~D+14] credential: 5% → 25% → 50% → 100% → 14d soak → VAULT_WRITES_DISABLED
[~D+21] trigger: 5% → 25% → 50% → 100%
[~D+28] execution-engine: consumer=true → (disable legacy worker) → 5% → 25% → 50% → 100%
[~D+40] Phase 6 code (executor move) — optional hardening PR
```

**Never ramp two services simultaneously.** Each ramp requires approval per step.

---

## D. Per-Step Approval Checklist Template

For every CANARY change, verify all four before requesting approval:

```bash
# 1. Metrics check
curl -s localhost:3001/metrics | grep <service>_delegation_total

# 2. Health check
curl -fsS localhost:<port>/health/ready

# 3. Error log (last 24h)
sudo journalctl -u ctrlchecks-<service> --since "24h" --no-pager | grep -iE 'error|503' | tail -20

# 4. Manual smoke (one user action through the UI or curl)
# workflow-crud: save a workflow via UI
# notification: trigger email/in-app from workflow execution
# credential: list credentials at /api/credentials
# trigger: POST to webhook trigger URL
# execution-engine: execute a workflow, confirm WS stream
```

**Pass criteria:**
- `{result="success"}` counter increasing (or documented 0 with manual test proving it works)
- `{result="error"}` = 0 (or explained spike < 0.1%)
- No 5xx spikes in journalctl
- Manual smoke passes

**Proposed .env diff (shown before every ramp, values redacted):**
```diff
-<SERVICE>_SERVICE_CANARY_PERCENT=<old>
+<SERVICE>_SERVICE_CANARY_PERCENT=<new>
```
Restart: `sudo systemctl restart ctrlchecks-worker` only (no service restart needed for canary changes)

**Rollback test** (run before confirming each ramp):
1. Set `<SERVICE>_ENABLED=false` + restart worker → confirm worker healthy + feature still works via monolith
2. Re-enable → confirm delegation resumes

---

## E. Frontend + SaaS Checklist

### Vercel (user action — dashboard only)
- [ ] `VITE_API_URL=https://worker.ctrlchecks.ai`
- [ ] `VITE_PUBLIC_BASE_URL=https://www.ctrlchecks.ai`
- [ ] `VITE_AWS_REGION=ap-south-1`
- [ ] `VITE_COGNITO_USER_POOL_ID=ap-south-1_aTYvSYflq`
- [ ] `VITE_COGNITO_CLIENT_ID=3ists5h8a1mmcs8are5n1pi5m8`
- [ ] `VITE_COGNITO_DOMAIN=ap-south-1atyvsyflq.auth.ap-south-1.amazoncognito.com`
- [ ] Redeploy triggered

### AWS Cognito (user action — console)
- [ ] `https://www.ctrlchecks.ai` added to allowed callback URLs
- [ ] `https://www.ctrlchecks.ai/` added to allowed callback URLs
- [ ] Both added to allowed sign-out URLs

### Worker CORS (already done — no action needed)
- [x] `https://www.ctrlchecks.ai` hardcoded in `cors.ts` allowlist
- [x] `https://ctrlchecks.ai` hardcoded

### End-to-end Smoke (run after each major milestone)
```
1. https://www.ctrlchecks.ai loads SPA (200, not blank)
2. Cognito login succeeds (no redirect loop, token issued)
3. Network tab: API calls → https://worker.ctrlchecks.ai (not localhost)
4. Generate workflow (hits ai-generator :3002)
5. Save workflow (hits workflow-crud :3007 for canary users)
6. Reload workflow (CRUD delegation)
7. Execute workflow (execution-engine once at 100%)
8. Trigger fires (trigger-service once at 100%)
9. Notification delivered (notification-service once at 100%)
10. OAuth credential connection (credential-service once at 100%)
```

---

## F. "Done" Criteria — 100% Microservices Production-Ready

Infrastructure:
- [ ] All 7 ports return `ready` with `db:ok` (all)
- [ ] All 5 target services at `CANARY_PERCENT=100`
- [ ] Rollback tested for each service (ENABLED=false → healthy monolith within 10s)

Delegation:
- [ ] `ctrlchecks_workflow_crud_delegation_total{result="success"}` > 0, `error` = 0 (7d window)
- [ ] `ctrlchecks_notification_service_delegation_total{result="success"}` > 0, `error` = 0
- [ ] `ctrlchecks_credential_service_delegation_total{result="success"}` > 0, `error` = 0
- [ ] `ctrlchecks_trigger_service_delegation_total{result="success"}` > 0, `error` = 0
- [ ] `ctrlchecks_execution_engine_delegation_total{result="success"}` > 0, `error` = 0

Retirement gates:
- [ ] `WORKFLOW_CRUD_LOCAL_WRITES_DISABLED=true` (after 7-day soak)
- [ ] `CREDENTIAL_SERVICE_VAULT_WRITES_DISABLED=true` (after 14-day soak)

Frontend:
- [ ] `https://www.ctrlchecks.ai` loads and authenticates
- [ ] API calls confirmed hitting `https://worker.ctrlchecks.ai`

Documentation:
- [ ] `PRODUCTION_GROUND_TRUTH_AUDIT.md` updated with final state
- [ ] `MICROSERVICES_OPS_PLAYBOOK.md` soak log fully filled
- [ ] `MICROSERVICES_CUTOVER_COMPLETE.md` created with final handoff

---

## Day 0 Baseline (2026-06-16 new session)

**Health:** All 7 ports ready — db:ok redis:ok on all that support it.
```
:3001 worker          {"status":"ready","checks":{"db":"ok","redis":"ok"}}
:3002 ai-generator    {"status":"ok"}
:3003 execution-engine{"status":"ready","checks":{"redis":"ok","db":"ok"}}
:3004 credential-svc  {"status":"ready","checks":{"db":"ok"}}
:3005 notification-svc{"status":"ready","checks":{"db":"ok","ses":"skip"}}
:3006 trigger-svc     {"status":"ready","checks":{"db":"ok"}}
:3007 workflow-crud   {"status":"ready","checks":{"db":"ok"}}
```

**Canary flags confirmed:**
```
WORKFLOW_CRUD_SERVICE_ENABLED=true
WORKFLOW_CRUD_SERVICE_CANARY_PERCENT=5
WORKFLOW_CRUD_LOCAL_WRITES_DISABLED=false
NOTIFICATION_SERVICE_ENABLED=false    CANARY=0
CREDENTIAL_SERVICE_ENABLED=false      CANARY=0  VAULT_WRITES_DISABLED=false
TRIGGER_SERVICE_ENABLED=false         CANARY=0
EXECUTION_ENGINE_ENABLED=false        CANARY=0  (CONSUMER_ENABLED not yet set)
```

**Delegation metrics:** All counters defined, no labelled values emitted — success=0, error=0 (consistent with low traffic; 5% canary on low-volume site means very few delegated calls).

**Soak status:** 5% started 2026-06-15 18:22 UTC. 25% window opens 2026-06-17 18:22 UTC. HOLD — ~47h remaining.

---

## T10 Smoke Test (2026-06-20) — FULL PASS ✅

| # | Test | Result |
|---|---|---|
| 1–2 | Manual + scheduled trigger execute | PASS |
| 3 | Form → if_else → Gmail | PASS |
| 4 | if_else branch routing | PASS |
| 5 | WS live updates (101, not 3s poll) | PASS |
| 6 | In-app notification | PASS |

Fixes deployed: FIX-1 `9824f4c`, FIX-2 `b161de2`, FIX-3 `15cc5a4`.  
See `MICROSERVICES_CUTOVER_COMPLETE.md` for full details and accepted gaps.

---

## Soak Log (current)

| Service | CANARY% | Started | Passed | Notes |
|---|---|---|---|---|
| workflow-crud | 5% | 2026-06-15 18:22 UTC | 2026-06-16 | Task-gated |
| workflow-crud | 100% | 2026-06-16 | soak ongoing | Write-only delegation. T10 verified. |
| workflow-crud | T9 GATE | — | — | `LOCAL_WRITES_DISABLED=true` — pending stable soak + `approve task T9` |
| notification | 100% | 2026-06-16 | soak ongoing | Task-gated. FIX-3B adds direct dispatch in execute-workflow.ts (belt+suspenders). |
| credential | 100% | 2026-06-16 | soak ongoing | Task-gated. OAuth bypass (accepted gap). |
| credential | T9 GATE | — | — | `VAULT_WRITES_DISABLED=true` — pending stable soak + `approve task T9` |
| trigger | 100% | 2026-06-16 | soak ongoing | Task-gated. Auth bug fixed (286989e). |
| execution-engine | consumer | 2026-06-16 | ✅ | CONSUMER_ENABLED=true; legacy worker stopped+disabled |
| execution-engine | 100% | 2026-06-16 | soak ongoing | Binary 100% (Phase 5 removed canary check). T10 execution PASS. |
