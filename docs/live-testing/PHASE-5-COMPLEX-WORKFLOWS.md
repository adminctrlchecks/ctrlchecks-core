# Phase 5 — Complex Workflows & Production Scenarios

**Prerequisite:** Phase 4 Tiers 4A–4F PASS.

**Objective:** Multi-step real-world workflows, webhook triggers, AI-generated flows, and Playwright UI E2E — all on live/staging.

---

## Scenario suite

### 5.1 Linear production workflow

```
manual_trigger → google_sheets (read) → ai_summarizer → google_gmail (send) → log_output
```

**Validates:** OAuth + AI + template resolution + terminal log.

### 5.2 Conditional routing

```
webhook_trigger → if_else (condition) → branch A / branch B → merge → log_output
```

**Payloads:** `worker/testing/payloads/test-2.1-webhook-lead-company-size.json`

### 5.3 AI-generated workflow (full wizard)

1. Prompt: *"When form is submitted, save to Google Sheet and notify Slack"*
2. Complete all wizard stages
3. Verify credentials gate before run
4. Execute end-to-end

### 5.4 Webhook suite

Use `worker/testing/trigger-webhook.sh` against live webhook URLs:

```bash
./worker/testing/trigger-webhook.sh \
  "https://worker.ctrlchecks.com/webhook/<id>" \
  "worker/testing/payloads/test-1.1-webhook-contact.json"
```

Run all payloads in `worker/testing/payloads/` — one per session.

### 5.5 Error surfacing (Phase 5 UI)

1. Workflow with intentionally bad config (invalid spreadsheet ID)
2. Execute
3. **UI must show:** red error pill on node + tooltip message (not generic "failed")
4. **API must show:** structured error in execution status

### 5.6 Version history

1. Save workflow v1
2. Edit and save v2
3. Open History panel → see both versions
4. Restore v1 → graph matches v1

### 5.7 Playwright E2E (staging/production only)

```bash
cd ctrl_checks
export PLAYWRIGHT_BASE_URL=https://ctrlchecks.ai
npx playwright test e2e/workflow-execute.spec.ts
```

**Run on:** CI staging or server with display — **not local laptop** if resource-constrained.

Tests in `e2e/workflow-execute.spec.ts`:
- Health
- Login
- Workflow run
- Version panel

### 5.8 Observability (Phase 6)

| Check | How |
|-------|-----|
| Sentry spans | Execute workflow → Sentry shows `node.<type>` spans |
| `/metrics` | `uptime_seconds` increases |
| Structured logs | `journalctl -u ctrlchecks-worker \| grep requestId` |
| Circuit breaker | Kill microservice → fallback, no user 500 |

---

## gstack full QA pass

When Phases 0–4 are green, run one consolidated QA session:

```
/qa Systematically test https://ctrlchecks.ai:
  - Sign in
  - Generate workflow
  - Connect credentials when prompted
  - Execute workflow
  - Verify error badges on failure
  - Test /connections search and filters
Report bugs with repro steps. Do not fix until report approved.
```

---

## Production readiness checklist

```markdown
## Phase 5 — Complex Workflows
Date: ____

- [ ] 5.1 Linear production workflow PASS
- [ ] 5.2 Conditional webhook workflow PASS
- [ ] 5.3 AI wizard full flow PASS
- [ ] 5.4 Webhook payload suite (list count: __/12)
- [ ] 5.5 Error surfacing UI PASS
- [ ] 5.6 Version history restore PASS
- [ ] 5.7 Playwright e2e PASS (staging)
- [ ] 5.8 Sentry + metrics verified

**LIVE TESTING PROGRAM: COMPLETE** / **BLOCKED** (reason: ___)
```

---

## After Phase 5

Only remaining upgrade from original audit:

**Phase 6.5 — Auto-scaling** (ECS Fargate or EC2 ASG + ALB) — infrastructure project, separate from functional live testing.
