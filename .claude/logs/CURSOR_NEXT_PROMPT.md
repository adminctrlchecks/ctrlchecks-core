# Cursor — Next Prompt Guide (Live Testing Program)

> Use this file when you (Cursor) need to generate the **next prompt** for Codex or Claude.  
> Codex gets the full context from `CODEX_HANDOVER.md`. This file is the **prompt factory** for the user.

---

## Current state (as of 2026-06-26)

| Item | Status |
|------|--------|
| Live testing Phases 0–2 | ✅ FULL PASS |
| Phase 3 OAuth P0+P1 | 🔶 CONDITIONAL PASS |
| Phase 4A | ✅ 8/8 PASS |
| Phase 4B | ✅ 8/8 PASS |
| **Next task** | **Tier 4C — AI nodes** |
| Blocked | Slack workflows (B3-2); OAuth reconnect Step E (deferred) |

**Stop line:** Tier 4B approved. Tier 4C not started.

---

## How to use this file

1. User opens Cursor chat
2. User says: *"Give me the next prompt"* or *"Continue live testing"*
3. Cursor reads this file + `LIVE-TEST-RESULTS.md`
4. Cursor outputs the matching prompt block below (copy-paste to Codex)

---

## Prompt — Start Codex session (first time handoff)

```text
Continue ctrlchecks live testing from Claude's handover.

Read fully before any action:
1. .claude/logs/CODEX_HANDOVER.md
2. .claude/logs/LIVE-TEST-RESULTS.md
3. docs/live-testing/PHASE-4-NODES-BY-TIER.md

We stopped after Tier 4B (APPROVED). Your job: Tier 4C ONLY.

RULES:
- Server only: ssh root@187.127.185.105, source /opt/ctrlchecks-worker/.env.live-test
- LIVE_E2E_BASE_URL=http://127.0.0.1:3001
- No heavy tests on laptop
- EXECUTION_ENGINE_CANARY_PERCENT=100 — do not change
- Registry-first node fixes only
- Log to LIVE-TEST-RESULTS.md
- Stop after gate report — no Tier 4D until I approve

TASK:
1) Verify bearer token (refresh if 401)
2) Create scripts/live-testing/phase-4c-ai-nodes.sh
3) Test: ai_chat_model, google_gemini, text_summarizer, sentiment_analyzer
4) 15s sleep between AI calls (rate limit)
5) Report matrix + Tier 4C Gate PASS/FAIL
```

---

## Prompt — After Tier 4C passes (Tier 4D)

```text
Tier 4C approved. Run PHASE 4 Tier 4D ONLY — OAuth workflow JSONs.

Read: docs/live-testing/PHASE-3-OAUTH-CONNECTIONS.md, testing/TESTING_GUIDE.md

RULES:
- Server only; one JSON file per batch; log to LIVE-TEST-RESULTS.md
- SKIP testing/productivity/type2_13_slack.json (B3-2 KNOWN-BLOCKED)
- Use canonical node types in every JSON
- Connected IDs: Google ba2f63f0-..., GitHub 1d7af7c4-..., Notion 625529ef-..., LinkedIn 4e72aabf-...
- LinkedIn: read-only (skip create_post)
- Notion: skip YOUR_NOTION_DATABASE_ID nodes
- Facebook/Salesforce/Microsoft/Zoho: skip until B0-2 OAuth apps configured

SESSION 1 (today): Run all testing/google/*.json (6 files)
Per file: import → execute → terminal status → output evidence

OUTPUT: 6-row matrix, bugs filed, Tier 4D partial gate, commands for testing/social/ next session
Stop before social/ folder until I approve.
```

---

## Prompt — After Tier 4D passes (Tier 4E)

```text
Tier 4D approved. Run PHASE 4 Tier 4E ONLY — API-key nodes.

Connect at /connections if missing: HubSpot PAT, Airtable PAT, SendGrid, Stripe sandbox, OpenAI.

Pattern: manual_trigger → node → log_output on server.
Log to LIVE-TEST-RESULTS.md. PASS/FAIL per family. Stop before 4F.
```

---

## Prompt — After Tier 4E passes (Tier 4F branching)

```text
Tier 4E approved. Run PHASE 4 Tier 4F ONLY — branching workflows.

Test: if_else (true/false), switch (3 cases), switch+merge, nested-if.
Validate: only active branch runs; DAG valid per orchestrator rules.
Server only. Log results. Stop before 4G.
```

---

## Prompt — After Tier 4F passes (Tier 4G + Phase 4 gate)

```text
Tier 4F approved. Run PHASE 4 Tier 4G ONLY — registry stub audit.

On server:
- grep stubs/TODOs in unified-node-registry.ts
- npm run test:contracts (server only)

Produce Phase 4 FINAL gate: all tiers 4A–4G summary.
Do NOT start Phase 5 until I approve Phase 4 final gate.
```

---

## Prompt — Phase 5 (after all Phase 4 approved)

```text
Phase 4 final gate approved. Run PHASE 5 ONLY — complex workflows.

Read: docs/live-testing/PHASE-5-COMPLEX-WORKFLOWS.md

Scenarios:
5.1 Linear: sheets → summarizer → gmail → log
5.2 Webhook + if_else (worker/testing/payloads/)
5.3 Full AI wizard flow on https://www.ctrlchecks.ai
5.5 Error badge UI on failed node
5.6 Version history restore
5.7 Playwright e2e on staging (server/CI only)

Log to LIVE-TEST-RESULTS.md. Phase 5 FINAL gate. Stop.
```

---

## Prompt — Fix B3-2 Slack (optional, before 4D Slack test)

```text
Fix B3-2 before Slack workflow testing.

Problem: slack_message expects webhookUrl; OAuth connection provides bot token.

Fix in unified-node-registry.ts (registry-first):
- Support webhookUrl OR (channel + bot token from credential resolver)
- No switch(node.type) in execute-workflow.ts

Add test, deploy worker, verify type2_13_slack.json on server.
Report files changed + live evidence. Then resume 4D Slack file.
```

---

## Prompt — Token refresh (when 401)

```text
Live test token expired. No tier work until refreshed.

1) Ask me to log in at https://www.ctrlchecks.ai and paste new Bearer token
2) Update /opt/ctrlchecks-worker/.env.live-test on server
3) Verify: curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:3001/api/credential-connections/connections → 200
4) Resume current tier from last checkpoint in LIVE-TEST-RESULTS.md
```

---

## Quick reference — what's done vs pending

### ✅ Done
- Upgrade phases 0–6 (security, logging, CI, OpenAPI, deploy, circuit breakers, frontend UX, observability)
- Live Phase 0, 1, 2 full pass
- Live Phase 3 P0+P1 conditional pass
- Live Tier 4A, 4B full pass
- Bugs fixed: B0-1, B1-1, B1-2, B1-3, B3-1, B4-1

### ⏸️ Deferred (not blocking)
- OAuth Step E reconnect (all providers) — needs browser
- B2-1 sync credential gate — UX improvement
- B4-2, B4-3 — low severity data-flow quirks

### 🚫 Blocked
- B3-2 Slack workflow execution — skip until fixed
- B0-2 Facebook, Salesforce, Microsoft, Zoho OAuth — skip in 4D until env configured

### ⬜ Pending
- Tier 4C, 4D, 4E, 4F, 4G
- Phase 5
- Phase 6.5 auto-scaling (infra — separate project)

---

## Cursor instruction for the user

When asking Cursor for the next prompt, say:

> *"Read `.claude/logs/CURSOR_NEXT_PROMPT.md` and `LIVE-TEST-RESULTS.md` — give me the next Codex prompt for where we stopped."*

Cursor should output **only** the relevant prompt block from this file, adjusted if `LIVE-TEST-RESULTS.md` shows a different stop point.

---

*Synced with CODEX_HANDOVER.md — 2026-06-26*
