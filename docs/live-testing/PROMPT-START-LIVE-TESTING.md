# Prompt — Start Live Testing Program

Copy-paste this into a **new Claude Code chat** with the repo open.

---

```text
Start the CtrlChecks LIVE TESTING PROGRAM.

Read these docs first (in order):
1. docs/live-testing/README.md
2. docs/live-testing/PHASE-0-CREDENTIALS-INVENTORY.md
3. .claude/gstack/gstack/llms.txt — use /qa, /browse, /canary skills where noted

CRITICAL RULES:
- Do NOT run heavy test suites on my laptop (npm test, test:contracts, full Playwright).
- All heavy validation runs on LIVE SERVER only: root@187.127.185.105 / worker.ctrlchecks.com
- You have access to server credentials and test keys in worker/.env on the server — use them via SSH.
- Complete ONE phase at a time. Stop at each gate for my approval.
- Log every result to .claude/logs/LIVE-TEST-RESULTS.md

CURRENT STATE:
- Upgrade Phases 0–6 (security, CI, OpenAPI, deploy, circuit breakers, frontend UX, observability) are COMPLETE.
- Domain migrated to .ai — verify all OAuth redirect URIs.
- Deploy: scripts/deploy-worker.py (Windows), deploy-worker.sh (Linux)

YOUR TASK NOW — PHASE 0 ONLY:

1) SSH to server and audit Tier-1 infrastructure credentials (see PHASE-0 doc).
2) Obtain or verify LIVE_TEST_BEARER_TOKEN for dedicated test user.
3) Produce a credential gap report:
   - Tier 1: infra vars present/missing
   - Tier 3: OAuth app credentials per provider (present in .env or missing)
   - Tier 4: which API-key test accounts still need to be created in /connections
4) Update .claude/logs/LIVE-TEST-RESULTS.md with Phase 0 checklist (checked/unchecked).
5) Create scripts/live-testing/phase-0-verify-infra.sh if not present.
6) Run phase-0 script ON SERVER ONLY.
7) Do NOT start Phase 1 until I approve Phase 0 gate.

OUTPUT FORMAT:
A) Credential inventory table (present / missing / action needed)
B) OAuth redirect URI audit (.ai domain)
C) Phase 0 script output from server
D) Phase 0 Gate: PASS / FAIL
E) Exact commands I need for Phase 1 (do not run Phase 1 yet)

Use gstack /qa for any UI verification that requires browser.
Reference existing assets: worker/scripts/live-e2e-harness.ts, testing/TESTING_GUIDE.md, testing/*.json workflows.
```

---

## After Phase 0 approved — Phase 1 prompt

```text
Phase 0 approved. Run PHASE 1 only (docs/live-testing/PHASE-1-INFRASTRUCTURE-SMOKE.md).

On server:
- bash scripts/live-testing/phase-1-infra-smoke.sh
- npx ts-node scripts/live-e2e-harness.ts with LIVE_TEST_BEARER_TOKEN

Log to LIVE-TEST-RESULTS.md. Stop for approval before Phase 2.
```

---

## After Phase 1 approved — Phase 2 prompt

```text
Phase 1 approved. Run PHASE 2 only (docs/live-testing/PHASE-2-PLATFORM-STAGE-FLOW.md).

Focus: missing-items API + execute blocked without connection + wizard credential stage.

Test scenarios 2.1–2.4. Use /browse for UI flows.
Log results. Stop for approval before Phase 3.
```

---

## Phase 3+ pattern

Replace `PHASE-N` doc path and stop at gate each time.
