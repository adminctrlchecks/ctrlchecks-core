# Phase 2 — Platform Stage Flow & Credential Gate

**Prerequisite:** Phase 1 PASS.

**Objective:** Validate the full user journey through wizard stages and prove that **workflows cannot run without required connections**.

This is the most important product-flow phase before per-node testing.

---

## Stage flow to test (in order)

```
Sign in (Cognito)
  → Generate workflow (AI prompt)
  → Capability selection (pick nodes)
  → Credentials stage (connect missing providers)
  → Configure stage (fill node fields)
  → Build / save workflow
  → Pre-run credential check (missing-items API)
  → Execute
  → Execution status + node error badges (Phase 5 UI)
```

---

## APIs involved

| Endpoint | Purpose |
|----------|---------|
| `POST /api/generate-workflow` | AI pipeline start |
| `GET /api/workflows/:id/missing-items` | **Authoritative** missing credentials + inputs |
| `POST /api/execute-workflow` | Run workflow (calls `executionPreflight` internally) |
| `GET /api/execution-status/:id` | Poll result |
| `GET /api/credential-connections/connections` | List user connections |
| `POST /api/credential-connections/connections/:id/test` | Test connection health |

**Key code paths:**
- `worker/src/api/workflows-missing-items.ts` — discovery + `executionPreflight`
- `worker/src/services/execution-preflight.ts` — vault lookup by provider
- `worker/src/api/execute-workflow.ts` — blocks run if preflight fails

---

## Test scenarios

### 2.1 Missing connection blocks run

1. Create workflow with `google_sheets` node (no Google connected).
2. Call missing-items:

```bash
curl -s -H "Authorization: Bearer $LIVE_TEST_BEARER_TOKEN" \
  "https://worker.ctrlchecks.com/api/workflows/$WORKFLOW_ID/missing-items" | jq
```

**Expected:** `credentials[]` contains Google with `satisfied: false`.

3. Attempt execute:

```bash
curl -s -X POST -H "Authorization: Bearer $LIVE_TEST_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workflowId":"'"$WORKFLOW_ID"'"}' \
  "https://worker.ctrlchecks.com/api/execute-workflow"
```

**Expected:** `400` or structured error listing missing credentials — **not** silent failure.

### 2.2 Connection satisfies gate

1. Connect Google in `/connections` (OAuth).
2. Re-call missing-items → Google `satisfied: true`.
3. Execute → should proceed (may fail on config like missing spreadsheet ID — that's Phase 4).

### 2.3 UI credential stage

Using gstack `/browse` or manual:

1. Start wizard with prompt: *"Read Google Sheet and send email"*
2. At credentials stage → must show Google + Gmail as required.
3. After connecting → stage should advance (no stuck wizard).
4. At run → must not show generic failure if only config fields missing.

### 2.4 Cache invalidation

After connecting a provider, missing-items must update without stale cache:

1. Call missing-items (missing Google).
2. Connect Google via UI.
3. Call missing-items again within 5s → must show satisfied.

---

## UI checks (Phase 5 features)

| Feature | How to verify |
|---------|---------------|
| Node error badge | Run workflow with bad config → red pill on failed node |
| Connections search | `/connections` → search "google" filters list |
| Category pills | All / OAuth / API Key filters work |
| Version history | History button → list versions → Restore |

---

## Script

```bash
bash scripts/live-testing/phase-2-credential-gate.sh
```

---

## Gate

| Scenario | Required |
|----------|----------|
| 2.1 Missing blocks run | PASS |
| 2.2 Connected allows run | PASS |
| 2.3 UI credential stage | PASS |
| 2.4 Cache invalidation | PASS |

→ Proceed to **Phase 3** (OAuth matrix).
