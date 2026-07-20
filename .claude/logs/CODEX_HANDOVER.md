# Codex Handover — ctrlchecks.ai Live Testing Program

> **Read this entire document before running any command or changing any code.**  
> This is the single source of truth for continuing work after Claude Code hit its session limit.  
> **You are picking up exactly where we stopped: Tier 4C (AI nodes) — not yet started.**

---

## 0. Executive Summary

| Item | Value |
|------|-------|
| **Project** | ctrlchecks.ai — workflow automation platform (n8n/Zapier-style) |
| **Repo** | `ctrlchecks-hostinger` (monorepo on GitHub) |
| **What we're doing** | Structured **live testing program** on production — not local laptop tests |
| **Who did Phases 0–4B** | Claude Code (sessions through 2026-06-26) |
| **Who continues now** | **Codex** (you) |
| **Where we stopped** | **Phase 4, Tier 4B — APPROVED. Tier 4C is NEXT.** |
| **Today's priority** | Complete **Tier 4C** (AI nodes), then await user approval for 4D |

### Progress at a glance

```
Phase 0  Credentials inventory     ✅ FULL PASS
Phase 1  Infrastructure smoke       ✅ FULL PASS (after B1-1/2/3 fixes)
Phase 2  Platform stage flow        ✅ FULL PASS
Phase 3  OAuth matrix P0+P1         🔶 CONDITIONAL PASS (Slack blocked B3-2)
Phase 4A No-credential nodes        ✅ FULL PASS (8/8)
Phase 4B Transform nodes            ✅ FULL PASS (8/8)
Phase 4C AI nodes                   ⬜ NOT STARTED  ← YOU ARE HERE
Phase 4D OAuth workflow JSONs       ⬜ NOT STARTED (25 files)
Phase 4E API-key nodes              ⬜ NOT STARTED
Phase 4F Branching                  ⬜ NOT STARTED
Phase 4G Registry stub audit        ⬜ NOT STARTED
Phase 5  Complex workflows          ⬜ NOT STARTED
```

### Upgrade program (separate track — already done before live testing)

Phases 0–6 of the **production upgrade** (security, CI, OpenAPI, deploy hardening, circuit breakers, frontend UX, observability) were completed and deployed earlier. Live testing builds on that stable base.

---

## 1. Infrastructure Map

### URLs

| Surface | URL |
|---------|-----|
| Frontend (Vercel) | https://www.ctrlchecks.ai |
| Worker API (public) | https://worker.ctrlchecks.ai |
| Worker (internal on server) | http://127.0.0.1:3001 |
| Execution engine (internal) | http://127.0.0.1:3003 |

### Server

| Item | Value |
|------|-------|
| Host | `root@187.127.185.105` |
| Provider | Hostinger KVM4, Ubuntu |
| SSH key | `~/.ssh/id_ed25519` |
| SSL cert | Valid until **2026-09-24** |

```bash
ssh -o StrictHostKeyChecking=no -i ~/.ssh/id_ed25519 root@187.127.185.105
```

### Deployed services on server

| Path | systemd service |
|------|-----------------|
| `/opt/ctrlchecks-worker` | `ctrlchecks-worker` |
| `/opt/ctrlchecks-execution-engine` | `ctrlchecks-execution-engine` |
| `/opt/ctrlchecks-workflow-crud-service` | `ctrlchecks-workflow-crud-service` |

### GitHub & deploy

| Item | Detail |
|------|--------|
| Remote | GitHub — user pushes to `master` |
| Worker deploy (Windows) | `$env:DEPLOY_PASS="<password>"; python scripts/deploy-worker.py` |
| Worker deploy (Linux) | `scripts/deploy-worker.sh` |
| Frontend deploy | `.github/workflows/deploy-frontend.yml` → Vercel on push to `master` |
| Worker CI deploy | `.github/workflows/deploy-worker.yml` → Hostinger with health retry + `dist.bak/` rollback |

**Never commit secrets.** `DEPLOY_PASS` is set locally only.

### gstack (methodology)

Cloned at `.claude/gstack/` — use skills for QA:

- `/qa` — systematic web app testing
- `/browse` — headless browser for UI/OAuth flows
- `/canary` — post-deploy monitoring
- Index: `.claude/gstack/gstack/llms.txt`

---

## 2. Credentials & Auth (Critical)

### Test user

| Field | Value |
|-------|-------|
| Cognito user ID | `d1f3dd1a-2081-7056-9577-8ef4e3a8082a` |
| Login method | Google OAuth via https://www.ctrlchecks.ai |
| Pool | `ap-south-1_aTYvSYflq` |
| Client ID | `3ists5h8a1mmcs8are5n1pi5m8` |

### Live test token (server only)

File: `/opt/ctrlchecks-worker/.env.live-test`

```bash
LIVE_TEST_BEARER_TOKEN=eyJ...   # Cognito **access token** (NOT idToken)
LIVE_E2E_BASE_URL=https://worker.ctrlchecks.ai
```

**Token expires ~every 1 hour.** On HTTP 401:

1. User logs in at https://www.ctrlchecks.ai
2. DevTools → Network → copy `Authorization: Bearer eyJ...`
3. Update on server:

```bash
printf 'LIVE_TEST_BEARER_TOKEN=eyJ...\nLIVE_E2E_BASE_URL=https://worker.ctrlchecks.ai\n' > /opt/ctrlchecks-worker/.env.live-test
chmod 600 /opt/ctrlchecks-worker/.env.live-test
```

### Tier 1 — Server `.env` (infrastructure)

Verified present on server (do not paste values in git):

- `DATABASE_URL` — AWS RDS PostgreSQL ✅
- `REDIS_URL` — `redis://127.0.0.1:6379` ✅
- `COGNITO_*` ✅
- `GEMINI_API_KEY` ✅ (AI nodes use this)
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` ✅
- `SENTRY_DSN` ✅ (added during Phase 0)
- `PUBLIC_BASE_URL=https://worker.ctrlchecks.ai` ✅
- `FRONTEND_URL=https://www.ctrlchecks.ai` ✅

### Tier 3 — OAuth app credentials on server

| Provider | Server env configured | Notes |
|----------|----------------------|-------|
| Google | ✅ | |
| GitHub | ✅ | |
| LinkedIn | ✅ | |
| Notion | ✅ | |
| Twitter/X | ✅ | |
| Slack | ✅ | OAuth works; **workflow execution blocked** (B3-2) |
| Zoom | ✅ | |
| HubSpot | ✅ | |
| Facebook/Meta | ❌ | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` missing — Phase 3 P2+ blocker |
| Salesforce | ❌ | `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET` missing |
| Microsoft | ❌ | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` missing |
| Zoho | ❌ | `ZOHO_OAUTH_*` missing |

All **36 redirect URIs** verified on **`.ai` domain** (not `.com`).

### Connected OAuth connections (test user)

Use these IDs for `POST .../connections/:id/test`:

| Provider | Connection ID | Credential type |
|----------|---------------|-----------------|
| Google | `ba2f63f0-d88a-483f-bc72-ec9c90fac4c1` | google_oauth2 |
| GitHub | `1d7af7c4-ace9-4eb4-987c-9c17e46c92bd` | github_oauth2 |
| Slack | `2f6a978d-bf0c-4165-9903-ee02b0366af6` | slack_oauth2 — **do not use in workflows until B3-2 fixed** |
| Notion | `625529ef-2a3d-4f2f-9a77-bfcb9dc7621e` | notion_oauth2 |
| LinkedIn | `4e72aabf-ee3c-4893-853c-d946c43624c5` | linkedin_oauth2 |

User also has 12+ API-key connections (airtable, clickup, cohere, discord, gemini, huggingface, mistral, openai, etc.) — list via:

```bash
curl -s -H "Authorization: Bearer $LIVE_TEST_BEARER_TOKEN" \
  http://127.0.0.1:3001/api/credential-connections/connections | python3 -m json.tool
```

---

## 3. Testing Rules (Non-Negotiable)

1. **All heavy tests on server** — never run `npm test`, `npm run test:contracts`, or full Playwright on the user's laptop (crashes machine).
2. **Local allowed:** `npm run type-check`, `npm run lint` only.
3. **Internal base URL for node scripts:** `LIVE_E2E_BASE_URL=http://127.0.0.1:3001` (outbound internet from VPS is blocked — e.g. httpbin.org fails; use localhost health endpoint for `http_request`).
4. **`EXECUTION_ENGINE_CANARY_PERCENT=100`** — do **NOT** roll back to monolith.
5. **One tier per session** → report → **stop** → wait for user approval.
6. **Log everything** to `.claude/logs/LIVE-TEST-RESULTS.md`.
7. **Registry-first fixes** — node behavior only in `unified-node-registry.ts` (see architecture below).
8. **Canonical node types only** — e.g. `google_gmail` not `gmail`.

---

## 4. Architecture (Must Follow)

### Single source of truth

`worker/src/core/registry/unified-node-registry.ts` — all node input/output/credentials/execute logic.

**Never:**

- `if (node.type === '...')` outside registry
- Manual `workflow.edges.push(...)` — use `unified-graph-orchestrator.ts`

### Execution flow

```
POST /api/save-workflow     → confirmed: true (B1-1 fix)
POST /api/execute-workflow  → 202 → execution-engine :3003
GET  /api/execution-status/:id → polls DB (Redis cached; B1-2 clears cache on fail)
GET  /api/workflows/:id/missing-items → credential gate before run
```

### Standard test pattern (every node script)

1. `POST /api/save-workflow` → `workflowId`
2. `POST /api/execute-workflow` → `executionId`
3. Poll status until `success` | `failed` | `completed` | `error` (max ~30s)
4. `DELETE /api/workflows/:workflowId`

### Workflow JSON shape

```json
{
  "name": "live-test-<node>",
  "trigger": "manual",
  "nodes": [
    {"id":"n1","type":"custom","position":{"x":0,"y":0},
     "data":{"type":"manual_trigger","label":"Start","category":"triggers","config":{}}},
    {"id":"n2","type":"custom","position":{"x":300,"y":0},
     "data":{"type":"<CANONICAL_TYPE>","label":"Test","category":"...","config":{...}}}
  ],
  "edges": [{"id":"e1","source":"n1","target":"n2"}]
}
```

### Pass criteria (per node)

- Terminal status = `success`
- Output fields present in execution result
- No `_error: OAuth token not found` when provider connected
- No silent hang at `pending` (if pending >30s → B1-2 regression)

---

## 5. What Was Completed (Detailed)

### Phase 0 — Credentials ✅

- health/live + health/ready (db + redis) PASS
- SENTRY_DSN added to server
- LIVE_TEST_BEARER_TOKEN obtained and working
- 36 redirect URIs on `.ai` domain

### Phase 1 — Infrastructure ✅

All 10 checks PASS after fixing:

| Bug | Fix |
|-----|-----|
| **B1-1** | Workflows saved with `confirmed: false` → execution rejected. Fixed in `save-workflow.ts` + `workflow-crud-service` → `confirmed: true` |
| **B1-2** | Failed executions stuck `pending`. Fixed in `execution-engine/.../engine-runner.ts` → DB `failed` + Redis cache invalidation |
| **B1-3** | Harness body shape wrong. Fixed `live-e2e-harness.ts` + `phase-2-credential-gate.sh` |

T4 harness: **6/6 PASS**

### Phase 2 — Platform flow ✅

| Scenario | Result |
|----------|--------|
| 2.1 Missing creds → not silent fail | ✅ async 202 → `failed` with error |
| 2.2 Connected → execute proceeds | ✅ |
| 2.3 Connections API | ✅ 12 connections |
| 2.4 missing-items cache consistent | ✅ |

### Phase 3 — OAuth P0+P1 🔶 CONDITIONAL PASS

| Provider | A start | B connect | C test | D workflow | E reconnect | F .ai URI |
|----------|---------|-----------|--------|------------|-------------|-----------|
| Google | ✅ | ✅ | ✅ | ✅ gmail list | ⏸️ UI | ✅ |
| GitHub | ✅ | ✅ | ✅ | ✅ list_repos | ⏸️ UI | ✅ |
| Slack | ✅ | ✅ | ✅ | ⚠️ B3-2 | ⏸️ UI | ✅ |
| Notion | ✅ | ✅ | ✅ | ✅ search+getMe | ⏸️ UI | ✅ |
| LinkedIn | ✅ | ✅ | ✅ | ✅ get_profile | ⏸️ UI | ✅ |

**Step E (reconnect)** deferred for all — needs browser; not blocking Phase 4.

### Phase 4A — No-credential nodes ✅ 8/8

`log_output`, `set_variable`, `math`, `http_request`, `json_parser`, `text_formatter`, `delay`, `noop`

Script: `scripts/live-testing/phase-4a-no-credential-nodes.sh`

### Phase 4B — Transform nodes ✅ 8/8

`filter`, `sort`, `aggregate`, `merge` (fan-in DAG), `date_time`, `json_parser→rename_keys` chain, `rename_keys`, `edit_fields`

Script: `scripts/live-testing/phase-4b-transform-nodes.sh`

---

## 6. Bug Registry (Open vs Fixed)

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| B0-2 | Low | Facebook, Salesforce, Microsoft, Zoho OAuth apps not on server | **Open** — Phase 3 P2+ only |
| B2-1 | Low | Credential gate async (202→fail) not sync 400 | **Open** — deferred |
| B3-1 | Low | `type2_01_gmail.json` used alias `gmail` | **✅ Fixed** — now `google_gmail` |
| B3-2 | **Medium** | `slack_message` needs webhookUrl; OAuth gives bot token | **Open** — **SKIP Slack in 4D** |
| B4-1 | Low | math schema `a`/`b` vs executor `value1`/`value2` | **✅ Fixed** in `node-library.ts` |
| B4-2 | Low | `set_variable` echoes workflow name not value | **Open** — non-blocking |
| B4-3 | Low | `rename_keys` chain gets empty inputObj | **Open** — non-blocking |

---

## 7. YOUR TASK — Tier 4C (AI Nodes)

### Read first

- `docs/live-testing/PHASE-4-NODES-BY-TIER.md` (Tier 4C section)
- `.claude/logs/LIVE-TEST-RESULTS.md` (update after run)

### Nodes to test

Verify canonical types in `worker/public/node-library.json` before scripting. Expected:

| Node | Sample config |
|------|---------------|
| `ai_chat_model` | `{"model":"gemini","prompt":"Say hello in one sentence"}` |
| `google_gemini` | `{"prompt":"Reply with: tier-4c test OK","temperature":0.1}` |
| `text_summarizer` | `{"text":"CtrlChecks automates workflows between services.","maxLength":50}` |
| `sentiment_analyzer` | `{"text":"This platform works great and tests are passing!"}` |

Pattern: `manual_trigger → <ai_node> → log_output` (optional log node)

### Rate limit

**Max ~5 AI calls/minute** — add `sleep 15` between tests in script.

`GEMINI_API_KEY` already on server — no extra setup.

### Create and run

1. Create `scripts/live-testing/phase-4c-ai-nodes.sh` (copy pattern from `phase-4a-no-credential-nodes.sh`)
2. SCP to server `/tmp/`
3. Run:

```bash
ssh -i ~/.ssh/id_ed25519 root@187.127.185.105
cd /opt/ctrlchecks-worker
source .env.live-test
export LIVE_E2E_BASE_URL=http://127.0.0.1:3001
bash /tmp/phase-4c-ai-nodes.sh
```

4. Update `LIVE-TEST-RESULTS.md`
5. **STOP** — report matrix + PASS/FAIL — **do not start 4D without user approval**

---

## 8. After 4C — Remaining Tiers (Do Not Start Yet)

### Tier 4D — OAuth workflow JSONs (25 files)

Location: `testing/` — see `testing/TESTING_GUIDE.md`

```
testing/google/          6 files (type2_01–06)
testing/social/          5 files (type2_07–11)
testing/productivity/    5 files (type2_12–16)
testing/crm/             3 files (type2_17–19)
testing/business/        6 files (type2_20–25)
```

**Rules:**

- Skip `testing/productivity/type2_13_slack.json` until **B3-2** fixed
- LinkedIn: read-only — skip `create_post`
- Notion: skip nodes needing `YOUR_NOTION_DATABASE_ID`
- Always use **canonical** `data.type` values

### Tier 4E — API-key nodes

HubSpot, Airtable, SendGrid, Stripe sandbox, OpenAI — connect at `/connections` first.

### Tier 4F — Branching

`if_else`, `switch`, `merge`, nested-if workflows — validate DAG rules.

### Tier 4G — Registry audit

```bash
grep -n "status: 'stub'" worker/src/core/registry/unified-node-registry.ts
npm run test:contracts   # SERVER ONLY — 3400+ assertions
```

### Phase 5 — Complex workflows

Multi-node production scenarios, webhooks (`worker/testing/payloads/`), Playwright on staging — after all Phase 4 tiers approved.

---

## 9. Key Files Reference

| File | Purpose |
|------|---------|
| `worker/src/core/registry/unified-node-registry.ts` | Node registry |
| `worker/src/services/nodes/node-library.ts` | Config field schemas |
| `worker/src/api/save-workflow.ts` | Save + B1-1 fix |
| `services/execution-engine/src/runner/engine-runner.ts` | B1-2 fix |
| `worker/scripts/live-e2e-harness.ts` | T4 harness |
| `scripts/live-testing/phase-4a-no-credential-nodes.sh` | Done |
| `scripts/live-testing/phase-4b-transform-nodes.sh` | Done |
| `scripts/live-testing/phase-4c-ai-nodes.sh` | **CREATE THIS** |
| `docs/live-testing/README.md` | Program index |
| `.claude/logs/LIVE-TEST-RESULTS.md` | Master log — **always update** |
| `.claude/logs/CURSOR_NEXT_PROMPT.md` | Cursor prompt templates |

---

## 10. Deploy When You Change Code

```powershell
# Windows (from repo root)
$env:DEPLOY_PASS="<your-password>"
python scripts/deploy-worker.py
```

After deploy:

```bash
curl -s https://worker.ctrlchecks.ai/health/ready | python3 -m json.tool
```

Execution-engine changes need separate deploy to `/opt/ctrlchecks-execution-engine`.

---

## 11. Session Protocol for Codex

1. Read this file + `LIVE-TEST-RESULTS.md`
2. Verify token: `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" http://127.0.0.1:3001/api/credential-connections/connections` → expect 200
3. Execute **current tier only** (4C today)
4. Log results
5. Produce gate report (matrix + PASS/FAIL)
6. **Stop and wait for user approval**

---

## 12. First Message to Send Codex

```
I am continuing the ctrlchecks live testing program from Claude.

Read entirely:
- .claude/logs/CODEX_HANDOVER.md
- .claude/logs/LIVE-TEST-RESULTS.md
- docs/live-testing/PHASE-4-NODES-BY-TIER.md

Execute Tier 4C ONLY (AI nodes) on server root@187.127.185.105.
Create scripts/live-testing/phase-4c-ai-nodes.sh, run on server, update LIVE-TEST-RESULTS.md.
Do not start Tier 4D. Stop for approval after gate report.
```

---

*Last updated: 2026-06-26 — stopped after Tier 4B approval, before Tier 4C.*
