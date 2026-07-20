# Phase 4 — Nodes by Tier (Not All 500 at Once)

**Prerequisite:** Phase 2 PASS; Phase 3 P0/P1 OAuth PASS for credential nodes.

**Objective:** Test nodes in controlled tiers. ~160 registered nodes — test by category, not individually in one session.

**Reference:** `testing/TESTING_GUIDE.md`, `worker/public/node-library.json`, registry contract tests.

---

## Tier strategy

| Tier | Category | Credential needed | Count (approx) | Method |
|------|----------|-------------------|----------------|--------|
| **4A** | Triggers + utilities | None | ~15 | API execute |
| **4B** | Logic + data transform | None | ~25 | API execute |
| **4C** | HTTP + AI (worker keys) | GEMINI only | ~10 | API execute |
| **4D** | OAuth integrations | Per Phase 3 | 25 JSON files | Import + run |
| **4E** | API-key integrations | Per Tier 4 keys | ~20 | Connect + run |
| **4F** | Branching (if/else, switch, merge) | None | ~5 | Dedicated workflows |
| **4G** | Remaining / stub audit | Varies | Rest | Registry audit script |

**Rule:** Tier N must PASS before starting Tier N+1.

---

## Tier 4A — No credentials (run on server)

Minimal linear workflow per node type:

```
manual_trigger → <node_under_test> → log_output
```

### Nodes to test first

| Node | Config | Expected output |
|------|--------|-----------------|
| `log_output` | `message: "tier-4a"` | Logged message |
| `set_variable` | key/value | Variable in output |
| `math` | expression `2+2` | `result: 4` |
| `http_request` | `GET https://httpbin.org/get` | `status: 200` |
| `json_parse` | sample JSON string | Parsed object |
| `text_formatter` | template | Formatted string |
| `delay` | 1 second | Completes after delay |
| `noop` | empty | Pass-through |

**Script:** `scripts/live-testing/phase-4a-no-credential-nodes.sh`

---

## Tier 4B — Transform & utility

| Node | Notes |
|------|-------|
| `filter` | Array filter |
| `sort` | Array sort |
| `aggregate` | Sum/count |
| `merge` | Two inputs (needs merge topology) |
| `csv_parse` / `csv_generate` | Sample CSV |
| `date_time` | Format now |
| `regex` | Pattern match |

---

## Tier 4C — AI nodes (GEMINI on server)

| Node | Verify |
|------|--------|
| `ai_agent` | Returns text response |
| `ai_summarizer` | Summary field populated |
| `sentiment_analyzer` | Label + score |
| `text_classifier` | Category |

**Caution:** Rate limits — max 5 AI executions per minute in test script.

---

## Tier 4D — OAuth nodes (use existing JSONs)

Run one file per session from `testing/`:

```
testing/google/     → 6 workflows
testing/social/     → 5 workflows
testing/productivity/ → 5 workflows
testing/crm/        → 3 workflows
testing/business/   → 5 workflows
```

**Total: 25 type-2 workflows** — this is your OAuth node E2E suite.

Checklist: one row per file in `LIVE-TEST-RESULTS.md`.

---

## Tier 4E — API-key nodes

Connect in `/connections` first, then run single-node workflows:

| Node family | Credential type |
|-------------|-----------------|
| HubSpot | `hubspot_private_app` |
| Airtable | `airtable_api_key` |
| SendGrid | `sendgrid_api_key` |
| Stripe | `stripe_api_key` (sandbox) |
| OpenAI | `openai_api_key` |

---

## Tier 4F — Branching

Dedicated workflows (create once, reuse):

| Workflow | Tests |
|----------|-------|
| `if_else-true-false` | Both branches reachable |
| `switch-3-cases` | case_1, case_2, case_3 |
| `switch-merge` | Branches reconverge at merge |
| `nested-if` | Nested condition |

**Must validate:** Only active branch executes; DAG valid per orchestrator rules.

---

## Tier 4G — Registry stub audit

On server:

```bash
cd /opt/ctrlchecks-worker
npm run test:contracts   # live only — 3,400+ assertions
```

Separately grep registry for stubs:

```bash
grep -n "status: 'stub'" src/core/registry/unified-node-registry.ts || true
grep -n "// TODO" src/core/registry/unified-node-registry.ts | head -50
```

Document any stub nodes — do not claim "all nodes tested" if stub.

---

## Per-node pass criteria

| Check | Pass |
|-------|------|
| Node executes without throw | ✅ |
| Output schema fields present | ✅ |
| No `_error: OAuth token not found` when connected | ✅ |
| missing-items satisfied before run | ✅ |
| Template `{{$json.field}}` resolves downstream | ✅ (if chained) |

---

## Gate

| Tier | Gate |
|------|------|
| 4A | 100% of listed nodes PASS |
| 4B | 100% of listed nodes PASS |
| 4C | All AI nodes return valid output |
| 4D | 25/25 type-2 JSON workflows PASS |
| 4E | Each connected API-key family PASS |
| 4F | All branching workflows PASS |
| 4G | Contract tests PASS; stub list documented |

→ Proceed to **Phase 5**.
