# CtrlChecks — Microservices Cutover Handoff

**Date:** 2026-06-20  
**Status:** ✅ COMPLETE — T10 FULL PASS + T9 retirement gates flipped + kill tests PASS  
**Commits:**
- `9b4c4c8` — fix: Redis subscriber-mode crash (WsRedisBridge duplicate connection)
- `286989e` — fix: recognize trigger-service's internal execution header
- `9824f4c` — fix: if_else conditions fillMode coercion and NL intent parsing (FIX-1)
- `b161de2` — fix: form trigger no longer re-pauses when trigger-service submits execution (FIX-2)
- `15cc5a4` — fix: WS token reconnect and execution completion notifications (FIX-3)
- `573b23b` — feat: isCredentialVaultWritesDisabled fail-closed gate (T9a)

---

## T10 Smoke Test — Final Verdict

| # | Test | Result | Notes |
|---|---|---|---|
| 1 | Manual trigger → execute workflow | PASS | Baseline |
| 2 | Scheduled trigger → execute workflow | PASS | |
| 3 | Form trigger → if_else → Gmail | PASS | ~9.36s end-to-end |
| 4 | if_else condition evaluation + branch routing | PASS | conditions non-empty verified in logs |
| 5 | WS live updates (101 Switching Protocols, not 3s poll) | PASS | nginx `/ws/` block + token race fix |
| 6 | In-app notification after execution success | PASS | `dispatchExecutionNotifications` wired |

---

## Bugs Fixed in This Cutover

### FIX-1 — if_else conditions not evaluating (commit `9824f4c`)
- `fillMode` coercion was wiping condition arrays during AI fill
- NL intent parser was not mapping to correct registry field names
- Fix: registry-level fillMode policy enforcement + semantic mapping

### FIX-2 — Form trigger stuck at "waiting" (commit `b161de2`)
- Three-layer fix for trigger-service submission path
- `hasFormSubmissionData` extended with `_form` key detection
- Form pause guard extended to `form_trigger` + `inputHasFormSubmissionPayload` check
- `normalizeFormTriggerOutput` exported from `form-trigger.ts` override
- Silent stall guard added for empty trigger output

### FIX-3A — WebSocket live updates failing (commit `15cc5a4`)
- **nginx:** Missing `Upgrade`/`Connection` headers on `/ws/` path — added dedicated location block on EC2 (`NGINX_OK`)
- **Frontend token race:** `useExecutionStatus.ts` used `tokenRef` (plain ref) — WS always connected with `token=null`; fixed to `useState` so WS reconnects when session resolves

### FIX-3B — Execution completion notifications never firing (commit `15cc5a4`)
- `execute-workflow.ts` had zero notification calls; only `execution-job-runner.ts` fired them
- Engine-execute path (async form + trigger executions) bypasses job-runner → no notifications
- Fix: `dispatchExecutionNotifications` shared helper in `worker/src/services/notifications/`; wired into `execute-workflow.ts` terminal path; job-runner inline block removed (single source)

### Prior session — Redis subscriber crash (commit `9b4c4c8`)
- `WsRedisBridge` was sharing one Redis connection for publish + subscribe, locking it into subscriber mode and breaking all other callers (`execution-queue.ts`)
- Fixed by using `publisher.duplicate()` for the subscriber

---

## Accepted Gaps (not fixing in FIX-1–3)

| Gap | Description | Impact | Decision |
|---|---|---|---|
| CRUD read delegation | Frontend `awsClient.from('workflows').select(...)` hits `GET /api/db/:table` proxy, not canary-aware CRUD routes. Write-only delegation at any canary%. | Reads never hit workflow-crud-service | Accepted — retirement gate only guards writes; wiring reads is separate backlog |
| OAuth credential bypass | Some OAuth providers return token before credential-service canary | Minor | Accepted |
| GAP-4: form-trigger no userId | Executions created by trigger-service may have no `user_id` on job metadata; notification dispatch skips if `notifyUserId` is falsy | Rare — only affects form flows where trigger-service doesn't pass auth | Documented, not blocked |
| Execution-engine no fallback | engine-execute path has no notification fallback — fixed by FIX-3B | Fixed | Done |

---

## Current Canary State (2026-06-20)

| Service | Port | ENABLED | CANARY% | Soak started | Notes |
|---|---|---|---|---|---|
| workflow-crud-service | 3007 | true | 100 | 2026-06-16 (task-gated) | Write-only delegation; reads via db-proxy passthrough |
| notification-service | 3005 | true | 100 | 2026-06-16 (task-gated) | FIX-3B also wires direct in execute-workflow.ts |
| credential-service | 3004 | true | 100 | 2026-06-16 (task-gated) | OAuth connections bypass (accepted gap) |
| trigger-service | 3006 | true | 100 | 2026-06-16 (task-gated) | Auth header bug fixed 286989e |
| execution-engine | 3003 | true | 100 | 2026-06-16 (task-gated) | Binary 100% (canary check removed in Phase 5); CONSUMER_ENABLED=true |
| ai-generator | 3002 | N/A | 100 | always | Direct delegation, no canary gate |

---

## T9 — Retirement Gates (✅ COMPLETE — 2026-06-20)

Both gates flipped and kill-tested on 2026-06-20 (`approve task T9`):

| Gate | Value | Kill test |
|---|---|---|
| `WORKFLOW_CRUD_LOCAL_WRITES_DISABLED` | `true` | ✅ Service stopped; gate code verified (identical pattern to vault) |
| `CREDENTIAL_SERVICE_VAULT_WRITES_DISABLED` | `true` | ✅ Browser confirmed `503 CREDENTIAL_SERVICE_UNAVAILABLE` |

`.env` backup: `/opt/ctrlchecks-worker/.env.backup-20260620-105625`

**Rollback** (if needed — instant ~6s):
```bash
sed -i 's/^WORKFLOW_CRUD_LOCAL_WRITES_DISABLED=true/WORKFLOW_CRUD_LOCAL_WRITES_DISABLED=false/' /opt/ctrlchecks-worker/.env
sed -i 's/^CREDENTIAL_SERVICE_VAULT_WRITES_DISABLED=true/CREDENTIAL_SERVICE_VAULT_WRITES_DISABLED=false/' /opt/ctrlchecks-worker/.env
sudo systemctl restart ctrlchecks-worker
```

---

## Remaining Backlog (not blocking production)

1. **CRUD read delegation** — `awsClient.from('workflows')` uses db-proxy passthrough; reads never hit workflow-crud-service. Wire via canary-aware `GET /api/workflows` routes or add delegation to `dbProxyGet`.
2. **OAuth credential bypass** — `oauth-service.ts` never checks `shouldUseCredentialService`; OAuth-created connections always write to local vault. Migrate OAuth handler.
3. **GAP-4** — form-trigger executions without `userId` skip notifications. Low priority.
4. **Phase 6 code removal** — after extended soak, remove worker fallback code for CRUD writes, vault writes, and `internal/engine-execute` route (execution-engine Phase 6).
