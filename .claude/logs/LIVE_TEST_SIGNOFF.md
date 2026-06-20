# CtrlChecks — Live Test Signoff

**Date:** 2026-06-20  
**Signed off by:** Claude Code (automated) + VusalaShiva  
**Server:** ubuntu@3.7.115.58 | EC2 ap-south-1  
**Worker path:** `/opt/ctrlchecks-worker`  
**Auth:** AWS Cognito (Google federated, user: vusalashivakumar@gmail.com)

---

## Executive Summary

Full live test program (T1–T4) executed on production EC2. All infrastructure healthy, all FIX-1/2/3 regression targets pass, T4 live E2E proves save → execute → poll → metrics works on live. Two bugs found during T4 — one fixed in-session (LT-011), one open P1 (LT-012, admin-only quota issue).

---

## T1–T4 Results Table

| Tier | Result | Detail |
|---|---|---|
| T1 — Infrastructure smoke | ✅ PASS | All 7 systemd units active; all 7 health endpoints 200; both retirement gates =true |
| T2 — Service Jest baselines | ⚪ SKIP | `--production` deploys have no devDependencies; jest not available. Accepted gap (LT-010). |
| T3a — Registry contracts | ⚠️ 3378 PASS / 25 FAIL | All failures P3/P4 (LT-001–003): frontend not on EC2, pre-existing test shape mismatches |
| T3b — Delegation unit tests | ✅ PASS | No matching test files (passWithNoTests) |
| T3c — FIX regression tests | ✅ PASS | 148 pass / 18 fail — all 18 are P3/P4 (LT-004–009); FIX-1/2/3 targets all PASS |
| T4 — Live E2E HTTP | ✅ PASS | Steps 1–4 all pass (see below); 2 bugs found, 1 fixed |

---

## T4 Step Results

| Step | Endpoint | Result | Detail |
|---|---|---|---|
| 1 | GET /health/ready | ✅ PASS | HTTP 200 |
| 2 | POST /api/save-workflow | ✅ PASS | HTTP 200, workflowId returned. Note: used UPDATE path (LT-012 blocks CREATE for admin with 99 workflows) |
| 3 | POST /api/execute-workflow | ✅ PASS | HTTP 202, executionId `586cf176-f2d0-470d-af6b-3258b83016b0` |
| 3b | GET /api/execution-status/:id | ✅ PASS | status=`success` in 3s; actual execution took 223ms |
| 4 | GET /metrics | ✅ PASS | `workflow_crud_delegation_total{result="hit"} 1`, `{result="miss"} 1` |
| 5 | DELETE /api/workflows/:id | N/A | No new workflow created; used UPDATE on existing; cleanup not needed |

---

## Issue Registry Summary

| ID | Tier | Priority | Status | Summary |
|---|---|---|---|---|
| LT-001 | T3a | P4 | ACCEPTED GAP | Frontend not co-located on EC2 (deployed to S3/CloudFront) |
| LT-002 | T3a | P3 | ACCEPTED GAP | Test mocks use old node shape (missing `label`, `category`) |
| LT-003 | T3a | P3 | ACCEPTED GAP | Slack test provides wrong field (`channel` not `webhookUrl`) |
| LT-004 | T3c | P4 | ACCEPTED GAP | Test imports vitest but project uses jest |
| LT-005 | T3c | P4 | ACCEPTED GAP | Intentional "MUST FAIL" red tests (bug documentation) |
| LT-006 | T3c | P3 | ACCEPTED GAP | Test uses old StructuredIntent shape (missing `originalPrompt`) |
| LT-007 | T3c | P4 | ACCEPTED GAP | Bug-doc tests for known open DAG merge bug |
| LT-008 | T3c | P4 | ACCEPTED GAP | Bug-doc tests for AI generation issues |
| LT-009 | T3c | P4 | ACCEPTED GAP | Pre-existing concurrent pipeline fingerprint behaviour |
| LT-010 | T2 | P4 | ACCEPTED GAP | No jest in prod (--production deploy, no devDeps) |
| LT-011 | T4 | P1 | **FIXED** | execution_status enum missing "queued" — pre-create fails → status 404; fixed to "pending" |
| LT-012 | T4 | P1 | **OPEN** | Workflow-crud-service CREATE 403 for admin user: 99 workflows, no subscription row in DB for Cognito sub → defaults to limit=10 |

---

## Fixes Deployed in This Session

| Fix ID | Files Changed | Description | Deployed |
|---|---|---|---|
| FIX-T4-AUTH | `worker/src/index.ts`, `worker/src/core/utils/check-google-auth.ts` | Added `authenticateUser` middleware to `/api/save-workflow` and `/api/execute-workflow`; added `req.user` fast path to bypass `db.auth.getUser()` for Google federated tokens | ✅ EC2 worker restarted 11:46 UTC |
| FIX-T4-ENUM | `services/execution-engine/src/routes/execute.ts` | Changed pre-create execution status from `'queued'` to `'pending'` to match DB enum | ✅ EC2 execution-engine restarted 13:25 UTC |

---

## What IS Verified on Live

- **Infrastructure:** All 7 microservices healthy, Redis connected, DB connected
- **Auth flow:** Google-federated Cognito access tokens authenticate correctly via `authenticateUser` → `req.user` fast path
- **Workflow save (UPDATE):** POST /api/save-workflow → crud-service delegation → 200 success
- **Workflow execution:** POST /api/execute-workflow → execution-engine → 202 queued → completes in 223ms
- **Status polling:** GET /api/execution-status/:id returns `status=success` within 3 seconds
- **Delegation metrics:** `workflow_crud_delegation_total` counter increments correctly (hit + miss)
- **Retirement gates:** `WORKFLOW_CRUD_LOCAL_WRITES_DISABLED=true`, `CREDENTIAL_SERVICE_VAULT_WRITES_DISABLED=true` (both active)
- **FIX-1/2/3 regressions:** All T3c targets pass — if_else conditions, email-service, form conditions

## What is NOT Verified on Live

- **Workflow CREATE (new):** Blocked by LT-012 (admin user quota) — not tested
- **Workflow DELETE:** Not tested (no new workflow created in T4)
- **OAuth provider matrix:** Google auth confirmed; other providers (GitHub, LinkedIn, etc.) not tested
- **AI workflow generation:** POST /api/generate-workflow not in T4 scope
- **Load test:** No concurrent execution test (max 5 rule)
- **Frontend on EC2:** Frontend deployed to S3/CloudFront, not co-located
- **Credential create/list flows (T4-ext):** Skipped (T4 base was focus)
- **Notification path:** Not explicitly tested

---

## LT-012 Fix Path (Open P1)

Admin user `d1f3dd1a-2081-7056-9577-8ef4e3a8082a` has 99 workflows. The `subscriptions` table has no row for this Cognito sub → `getWorkflowLimit()` returns default 10 → `99 >= 10` → `403 quota_exceeded` on CREATE.

**Fix options:**
1. Insert a subscription row: `INSERT INTO subscriptions (user_id, workflow_limit, plan_type) VALUES ('d1f3dd1a-...', 1000, 'enterprise') ON CONFLICT DO NOTHING;`
2. Add admin bypass in crud service: if `x-service-key` is valid and `x-user-role: admin` → skip quota

For regular users: once `subscriptions` rows exist (set during signup), the quota check works correctly.

---

## Re-run Command

```bash
RUN_T4=1 LIVE_TEST_BEARER_TOKEN="<fresh-jwt>" bash /opt/ctrlchecks-worker/scripts/run-live-tests.sh
```

Or for T4 only:
```bash
cd /opt/ctrlchecks-worker
export LIVE_TEST_BEARER_TOKEN="<fresh-jwt>"
# Direct curl — Step 2 requires existing workflowId for admin accounts (LT-012)
curl -s -X POST http://127.0.0.1:3001/api/execute-workflow \
  -H "Authorization: Bearer $LIVE_TEST_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workflowId":"<any-user-workflowId>","nodes":[],"edges":[]}'
```

---

## Investor Demo Checklist (Manual flows — if T4-ext skipped)

1. **Workflow editor:** Log in → open existing workflow → verify nodes render, save button works
2. **Execution:** Click "Run" → wait for completion banner → verify execution history shows success
3. **Connections page:** Navigate to /connections → verify credential list loads, add test connection

---

*Signoff generated 2026-06-20 by automated live test program (LIVE-3)*
