# Template Library — Recommended Change Set (implementation spec)

**Date:** 2026-07-31
**Companion to:** `docs/TEMPLATE_LIBRARY_AUDIT_2026-07-31.md`
**Status:** ⚠️ **Superseded by the implementation.** See `ctrl_checks/templates/CHANGELOG.md`
for what was actually built.

Two recommendations in this spec turned out to be wrong and were corrected during
implementation:

| This spec said | Reality | What shipped |
|---|---|---|
| "Add a `loop` node" (6 templates) | `loop` and `split_in_batches` **do not iterate** — `execute-workflow.ts:13968` warns that "iteration over downstream subgraph is not supported in DAG runtime yet". They only expose the array as data. | **One row per scheduled run:** `maxRecords: 1` + `filterByFormula` excluding processed rows + write-back marker + a "found anything?" gate. Drains the queue over successive polls. |
| "Use `set_variable` for cross-run state" | It is per-execution; it cannot survive between scheduled runs. | A marker **column on the Airtable row**, filtered on read. |

The per-template change tables below are otherwise accurate.

---

## Part A — Where the template files actually are

You were half right. Here is the exact situation, verified:

| Group | Source file in repo? | Evidence |
|---|---|---|
| **5 Agent templates** (Customer Support, Sales, HR, Finance, Internal Knowledge) | ✅ **YES** — `ctrl_checks/sql_migrations/10_advanced_ai_agent_templates.sql` (1,268 lines) | Contains the exact live node IDs (`js_intent_1`, `switch_intent_1`, `if_kb_found`). Spot-checked against the live DB: the file carries the **same defects** — the un-interpolated `ai_score_lead` prompt, the three empty `webhookUrl: ""`, the `.length > 0` compound condition. It is a faithful source of truth. |
| **15 Verification templates** | ❌ **NO** | `git log -S "Verification Readiness Checker"` returns only commit `133c901`, whose message says *"the 15 new verification/compliance templates (**already live in the templates table**)"*. That commit changed only `TemplatesManager.tsx` and the proposal doc. The insert transaction was run against RDS and never written to a file. |
| `templates_refresh/*.sql` (10 batches, 8,632 lines) | ⚠️ Not these | This is the **500 auto-generated junk templates** that were deactivated. Not the live 20. |

### A.1 — First recommended change: make the repo the source of truth

Right now, if the RDS instance is lost, **15 of your 20 templates are gone.** They exist in exactly one place, with no file, no version history, and no review path.

**Recommendation:** create `ctrl_checks/sql_migrations/templates_v2/` containing:

```
templates_v2/
  00_backup_current_templates.sql      -- SELECT ... INTO templates_backup_20260731
  01_agent_templates.sql               -- the 5, corrected (supersedes 10_advanced_ai_agent_templates.sql)
  02_verification_templates.sql        -- the 15, reconstructed from the live DB + corrected
  03_node_notes.sql                    -- notes payload, separate so it can ship independently
  RUN_ORDER.txt
```

I can generate `01` and `02` directly from the live `/api/templates` payload I already pulled, with every fix in Part C applied. That is a repo-side file — safe to produce and review. Applying it to RDS stays your call.

---

## Part B — Platform fixes that must land first

Four of these change **what the template fix can even be**, so they gate Part C.

### B1 — Airtable node: runtime supports filtering, the schema doesn't declare it 🔴

This is the most useful discovery in this pass. `execute-workflow.ts:8279-8332` reads and applies:

```ts
const filterByFormula = getStringProperty(config, 'filterByFormula', '');
const maxRecords     = parseInt(getStringProperty(config, 'maxRecords', '0'), 10) || 0;
const view           = getStringProperty(config, 'view', '');
```

But `node-library.ts:6983` declares only:

```ts
required: ['baseId', 'tableId', 'operation'],
optional: { baseId, tableId, operation, recordId, fields }
```

**Consequence:** the UI never renders these fields, the AI pipeline never fills them, and every one of the 20 Airtable reads in the library pulls the **entire table** on every run. My audit said "you can't filter" — that was wrong; you *can*, the schema just hides it.

**Change:** add to `airtable` `configSchema.optional`:
```ts
filterByFormula: {
  type: 'string',
  description: "Airtable formula to filter rows server-side, e.g. {Status}='Ready'. Leave empty to read every row.",
  examples: ["{Status}='Ready'", "AND({Status}='Open', {Owner}='{{input.owner}}')"],
},
maxRecords: { type: 'number', description: 'Cap rows returned. Leave 0 for all.', default: 0 },
view:       { type: 'string', description: 'Read from a named Airtable view instead of the raw table.' },
```
**Unblocks:** 8 template fixes in Part C. Do this first.

### B2 — Airtable output has no `recordId` 🔴

`create` and `update` return `{ ...inputObj, records: [{ id, createdTime, fields }], count }` (`execute-workflow.ts:8450-8458`). There is **no `recordId` key**.

Three templates write `recordId: "{{input.recordId}}"` on their update node. It resolves to nothing, the update falls through to an empty `recordIdFallback`, and **the score/prediction/match result is never written back.**

**Change (template-side):** `{{input.recordId}}` → `{{input.records.0.id}}` everywhere. Verified working: `getNestedValue` walks numeric array indices (`object-utils.ts:92-95`).

**Good news from the same code:** Airtable spreads `...inputObj`, so upstream context *does* survive an Airtable node. Several "will this field still be in scope?" worries from the audit are resolved — for Airtable specifically.

### B3 — `set_variable` will NOT solve the cross-run state problem 🟠

Correcting my own audit (item C7 recommended it): `set_variable` is per-execution. It cannot carry a snapshot from one scheduled run to the next.

**Revised recommendation — write the marker into Airtable itself.** No new infrastructure, and the user can see it:
1. Add a `LastSyncedAt` (or `LastNotifiedAt`) field to the Airtable table.
2. Read with `filterByFormula` (now available via B1) that excludes already-handled rows.
3. After acting, `airtable.update` that field on the row.

This replaces the phantom `lastSnapshot` / `lastSeenIds` in all three polling templates and is idempotent.

### B4 — `chat_trigger` output contract ⚠️ *needs a live run first*

`execute-workflow.ts:3052` returns a bare string; the comment at `:20086` claims `{message, userId, sessionId, timestamp}`. **Do not write template fixes against either shape until one live chat execution settles it.** Six templates depend on the answer, plus the non-existent `senderPhone` (0 matches repo-wide).

**Change:** pick the object shape (`{ message, sessionId, senderId, senderPhone, channel, timestamp }`), implement it in the one `case 'chat_trigger'` block, add a contract test, then apply the Part C chat fixes.

### B5 — `{{$now}}` 🟡
Not implemented in the resolver (`universal-template-resolver.ts:80-140` handles `$json.`/`json.`/`input.`/`trigger.`/named keys only) — but it *is* documented in `nodeGuides.ts` and 4 docs-content pages as if it works.
**Change:** add a built-ins branch to `resolveExpression` for `$now` / `$today` / `$timestamp`. ~10 lines, closes a documentation lie, and removes the need for a workaround in Part C.

### B6 — Node notes field 🔴
`NodeData` has no notes field. Add `notes?: { what, why, when, next, business, setup? }` per the audit's Section 4, wire storage → `TemplateEditor` inputs → node inspector → canvas hover. All 165 note bodies are then a content task that can be done in parallel.

---

## Part C — The change set, template by template

Legend: **FIX** = correct an existing value · **ADD** = new node · **DEL** = remove node · **NOTE** = needs node note (all 165 do; only called out where it's load-bearing)

### C.1 — Business Verification & Compliance (15)

#### 1. Verification Readiness Checker (9 → 10 nodes)
| Node | Type | Change |
|---|---|---|
| `gmail_send_results` | FIX 🔴 | `body`: `{{input.fixList}}` → `{{input.response}}` — no node produces `fixList`; the customer's email currently has a blank fix list |
| `airtable_update_score` | FIX 🔴 | `recordId`: `{{input.recordId}}` → `{{input.records.0.id}}` (B2) — the score is currently never saved |
| `whatsapp_send_results` | FIX 🟠 | Re-parent: source from `js_score` instead of `ai_fix_list`, so `{{input.score}}` is in scope rather than the AI's prose |
| — | ADD 🟡 | `if_else` `if_needs_fixes` after `js_score`: `[{field:"$json.issueCount", operator:"greater_than", value:0}]`. True → existing fix-list path. False → a "you're ready to apply" email. A 100/100 business currently gets a fix list anyway. |
| `http_fetch_website` | NOTE 🔴 | Must warn that bot-blocked sites return empty and silently produce a wrong score |

#### 2. Approval Chance Predictor (7 nodes)
| Node | Type | Change |
|---|---|---|
| `ai_predict_chance` | FIX 🔴 | `{{input.record}}` → `{{input.records}}` — singular key never exists |
| `airtable_save_prediction` | FIX 🔴 | `recordId` → `{{input.records.0.id}}` (B2) |
| `airtable_lookup_readiness` | FIX 🟠 | Add `filterByFormula: "{Email}='{{input.contactEmail}}'"`, `maxRecords: 1` (B1) — currently feeds every client's data into the prompt for one prediction |

#### 3. Missing Document Finder (6 → 7 nodes) — *logic currently inverted*
| Node | Type | Change |
|---|---|---|
| — | ADD 🔴 | `airtable` `airtable_read_prior_docs` between `airtable_log_document` and `js_check_missing`: `operation: read`, `tableId: "DocumentsReceived"`, `filterByFormula: "{Client}='{{input.clientName}}'"`. **Without this the template cannot work** — it only ever sees the one document just uploaded |
| `js_check_missing` | FIX 🔴 | `input.receivedTypes` → derive from the new read: `const received = (input.records \|\| []).map(r => r.fields.DocumentType);` |
| `airtable_log_document` | FIX 🟡 | `ReceivedAt`: `{{$now}}` → drop the field until B5 ships, or emit an ISO string from a JS node |
| `form_doc_upload` | FIX 🟠 | `clientType` select has **no options**; `js_check_missing` branches on exactly `Individual` / `Business`. Add `options: ["Individual","Business"]` |

#### 4. Business Details Matcher (8 → 10 nodes)
| Node | Type | Change |
|---|---|---|
| `airtable_read_ready_clients` | FIX 🔴 | `filterByFormula: "AND({Status}='DocsComplete', {MatchCheckedAt}='')"` (B1+B3) — replaces the phantom `lastSeenIds` |
| `js_detect_newly_ready` | FIX 🔴 | Drop the `lastSeenIds` diff entirely; emit `items` for the loop |
| — | ADD 🔴 | `loop` `loop_clients` after the JS node: `array: "{{$json.items}}"`, `maxIterations: 100` — currently one run handles one imaginary client and every `{{input.website}}` is blank |
| — | ADD 🔴 | `airtable` `airtable_mark_checked` before the email: `operation: update`, sets `MatchCheckedAt` — without it the same client is re-emailed every 15 minutes forever |
| `ai_extract_details` | FIX 🟠 | Ask for JSON (`{website:{...}, gst:{...}, ...}`) instead of "clearly labeled by source" prose |
| `js_compare_versions` | FIX 🟠 | Replace the `/mismatch\|does not match\|differ/i` prose regex with a field-by-field comparison of the parsed JSON |

#### 5. Submission Package Builder (7 → 8 nodes)
| Node | Type | Change |
|---|---|---|
| `http_screenshot_pages` | FIX 🔴 | `{{$credentials.screenshotone.apiKey}}` is unresolvable and the provider doesn't exist (0 repo matches). Either register `screenshotone` as an API-key credential type, or drop this node and ship the package without screenshots |
| — | ADD 🔴 | `merge` `merge_package` before `drive_list_existing_docs`. The current diamond (`js_detect → http_screenshot` + `js_detect → http_policy`, both → `drive_list`) has no join, so `{{input.screenshotUrl}}` and `{{input.policyText}}` can never both be in scope at the email |
| `airtable_read_ready_status` | FIX 🔴 | `filterByFormula: "AND({Status}='Ready', {PackageSentAt}='')"` (B1+B3) |
| — | ADD 🟠 | `loop` over newly-ready clients |
| `drive_list_existing_docs` | FIX 🟠 | `operation: list` with no folder/query lists the Drive root. Add a folder ID or a name query |

#### 6. License Renewal Reminder (5 → 8 nodes) — *sends zero usable reminders today*
| Node | Type | Change |
|---|---|---|
| `js_flag_expiring` | FIX 🔴 | Return `{ items: flagged }` so the loop can consume it |
| — | ADD 🔴 | `loop` `loop_licenses`: `array: "{{$json.items}}"`. Both output nodes currently read `{{input.licenseName}}` / `{{input.daysLeft}}` off an array — all blank |
| — | ADD 🔴 | `if_else` `if_milestone_day` inside the loop: only fire when `daysLeft` is exactly 90, 30 or 7. **The description promises 3 reminders; the code sends one every day for 90 days.** |
| — | ADD 🟠 | `airtable` update setting `LastRemindedAt` |
| `airtable_read_expiry_dates` | FIX 🟠 | `filterByFormula: "{ExpiryDate} <= DATEADD(TODAY(), 90, 'days')"` |

#### 7. FAQ Answering Assistant (6 → 7 nodes) — *currently escalates 100% of questions*
| Node | Type | Change |
|---|---|---|
| — | ADD 🔴 | `javascript` `js_parse_faq_answer` between the AI and `if_confidence_check`, using the identical regex-extract pattern the Agent templates already use. Without it `$json.confidence` never exists → the gate is always false → **no client is ever answered** |
| `whatsapp_reply_client` | FIX 🔴 | `to: {{input.senderPhone}}` — blocked on B4 |
| `airtable_read_faq` | FIX 🟠 | `maxRecords: 50` (B1) — the entire FAQ table goes into every prompt |
| `chat_trigger_faq` | FIX 🔴 | Blocked on B4 |

#### 8. New Client Risk Checker (7 nodes)
| Node | Type | Change |
|---|---|---|
| `http_domain_age_lookup` | FIX 🔴 | `{{$credentials.whoisxml.apiKey}}` — register the provider or replace the node |
| `if_high_risk` | FIX 🟠 | Re-parent to read from `js_risk_score` rather than sitting downstream of `airtable_log_risk` |
| — | ADD 🟡 | `else` branch → a low-risk confirmation, so the workflow has a visible result either way |

#### 9. Overdue Task Tracker (6 → 8 nodes)
| Node | Type | Change |
|---|---|---|
| `js_flag_overdue` | FIX 🔴 | Return `{ items: flagged }` |
| — | ADD 🔴 | `loop` over flagged requests |
| `slack_alert_owner` | FIX 🔴 | `{{input.ownerSlackChannel}}` / `{{input.managerSlackChannel}}` are produced by nothing. Either read them from the Airtable row (`{{input.item.fields.OwnerChannel}}`) or make them template config fields |
| `if_very_overdue` | FIX 🟠 | Currently branches off the **Slack node's** output. Re-parent to `js_flag_overdue` |
| — | ADD 🟠 | `LastAlertedAt` write-back — re-alerts hourly, forever, otherwise |

#### 10. Client Priority Ranker (5 nodes) — *lightest touch in the set*
| Node | Type | Change |
|---|---|---|
| `js_sort_by_priority` | FIX 🟠 | Emit a formatted string, not an object array — `{{input.ranked}}` currently renders as a JSON blob in Slack |
| `airtable_read_client_history` | FIX 🟡 | `maxRecords: 200` (B1) |

#### 11. Verification Co-Pilot Chat (6 → 7 nodes)
| Node | Type | Change |
|---|---|---|
| `http_status_api_optional` | FIX 🔴 | Labelled "(Optional)" but sits inline with `url: {{input.statusApiUrl}}`, which nothing defines — a failure here kills the run. Either gate it behind an `if_else`, or delete it |
| `airtable_lookup_client_record` | FIX 🔴 | `filterByFormula: "SEARCH('{{input.clientName}}', {Name})"`, `maxRecords: 5` (B1) — the AI is currently handed the whole client table |
| `chat_trigger_copilot`, `whatsapp_reply_copilot` | FIX 🔴 | Blocked on B4 |
| `ai_agent_answer` | KEEP ✅ | Best system prompt in the library — promote it as the house pattern for grounded answers |

#### 12. Document Vault with Smart Search — **split into two templates** 🔴
Currently one template with **two triggers and two fully disconnected subgraphs** — no edge joins them. This violates the platform's own DAG rule and will likely fail save-validation.

- **12a "Document Vault — Intake"** (`form → gemini → js_parse → airtable`)
  - ADD 🔴 `javascript` parse node — Gemini is asked for JSON, then read as `{{input.documentType}}` with nothing parsing it
  - FIX 🔴 `FileLink: {{input.fileUrl}}` — the form's file field is keyed `document`; `fileUrl` never exists
- **12b "Document Vault — Smart Search"** (`chat_trigger → js → airtable → ai_agent → whatsapp`)
  - FIX 🔴 `filterByFormula` on the vault read (B1)
  - FIX 🔴 `senderPhone` — blocked on B4

#### 13. Live Status Lookup Bot (5 nodes) — *closest to shippable*
| Node | Type | Change |
|---|---|---|
| `airtable_lookup_status` | FIX 🔴 | `filterByFormula: "SEARCH('{{input.lookupValue}}', {Name})"`, `maxRecords: 1` (B1). Today `js_format_reply` always takes `records[0]` — **it returns the same client no matter what you ask** |
| `chat_trigger_status` | FIX 🔴 | Blocked on B4 |
| — | — | With those two, this becomes the showcase beginner template. Recommend featuring it. |

#### 14. Cross-Platform Sync Engine (6 → 8 nodes) — 🔴 **deactivate until fixed**
| Node | Type | Change |
|---|---|---|
| `js_diff_changed_fields` | FIX 🔴 | `lastSnapshot` never persists → **every client is re-pushed to HubSpot and Sheets every 15 minutes, forever.** Replace with a `LastSyncedAt` field + `filterByFormula` (B3) |
| — | ADD 🔴 | `loop` over changed records — `{{input.hubspotContactId}}` and `{{input.diffFields}}` live inside `changed[i]`, not at top level |
| — | ADD 🔴 | `airtable` update writing `LastSyncedAt` |
| `sheets_update_shared_copy` | FIX 🔴 | `spreadsheetId: ""` **and** `range: ""` — two blank required fields |
| `hubspot_push_changes` | FIX 🟠 | `id: {{input.hubspotContactId}}` — nothing maps an Airtable row to a HubSpot contact ID. Needs a `HubSpotId` column on the Airtable side |

#### 15. Smart Alert Co-Pilot (7 → 8 nodes) — *premise not implemented*
| Node | Type | Change |
|---|---|---|
| — | ADD 🔴 | `if_else` `if_alert_worthy` between the agent and the router: `[{field:"$json.alertWorthy", operator:"equals", value:true}]`. **Right now WhatsApp fires on every polled change regardless of the AI's verdict** — the template is a noisier dumb alert |
| — | ADD 🔴 | `javascript` parse node — `js_route_notification` does `input.response.severity` on a text response → always `low` |
| `js_route_notification` | FIX 🔴 | `input.complianceLeadPhone` / `input.accountManagerPhone` are defined nowhere. Promote to template config fields |
| `airtable_read_related_context` | DEL 🟠 | Identical table, identical (empty) filter as the previous node — returns exactly the same rows. **Redundant node, delete it** (or give it a real `filterByFormula`) |
| `js_diff_for_alerts` | FIX 🔴 | `lastSnapshot` → `LastAlertCheckedAt` field (B3) |

### C.2 — Agent templates (5) — edit `10_advanced_ai_agent_templates.sql` directly

#### 16. Customer Support Agent (16 nodes) — *reference architecture, keep the shape*
| Node | Type | Change |
|---|---|---|
| `switch_intent_1` | FIX 🔴 | `value` → `expression` (schema requires `expression`, `node-library.ts:3176`); `cases: ["order","complaint","faq"]` → `[{value:"order",label:"Order"},{value:"complaint",label:"Complaint"},{value:"faq",label:"FAQ"}]` |
| `slack_escalate` | FIX 🟠 | `webhookUrl: ""` — blank required field |
| `merge_responses` | VERIFY 🟠 | Sits after a `switch` where only one branch ever runs — confirm `merge` doesn't block waiting for all three inputs |
| all `if_else` | FIX 🟡 | Convert legacy `condition` string → canonical `conditions[]` array (works today, but the library teaches two formats) |

#### 17. Sales & Lead Qualification Agent (12 → 10 nodes) — *two dead nodes*
| Node | Type | Change |
|---|---|---|
| `ai_score_lead` | FIX 🔴 | The prompt contains **no `{{input.*}}` at all** — the model never sees the lead. Add: `Lead: {{input.name}}, company {{input.company}}, email {{input.email}}, phone {{input.phone}}, message: {{input.message}}`. **Every score today is invented.** |
| `ai_qualify_questions` + `js_parse_questions` | DEL 🔴 | Generate 3 questions, parse them, and **nothing downstream ever reads `questions`.** An LLM call per lead thrown away. Delete both, or wire the questions into `email_qualified` |
| `js_generate_booking` | FIX 🟠 | Hardcoded `https://calendly.com/your-team/meeting` — a literal placeholder that 404s for every customer. Promote to a config field |

#### 18. HR / Hiring Workflow Agent (13 nodes)
| Node | Type | Change |
|---|---|---|
| `email_rejection` | FIX 🔴 | **Sends automated rejection emails with no human review.** Change to draft-and-notify-recruiter, or at minimum state it prominently in the template description. This is a legal/brand exposure, not a style note |
| `js_generate_calendar` | FIX 🟠 | Hardcoded `calendly.com/hr-team/interview` → config field |
| `db_shortlist` / `db_reject` | NOTE 🔴 | Writes to a `candidates` table that must already exist with a matching schema. Nothing tells the user this |

#### 19. Finance / Compliance Agent (13 nodes)
| Node | Type | Change |
|---|---|---|
| `db_save_flag` | FIX 🔴 | `{{JSON.stringify(input.violations)}}` — the resolver does property lookup only, no function calls. Move the stringify into `js_format_alert` (which already exists) and reference the new field |
| `js_compliance_check` | FIX 🟠 | The $10,000 threshold is buried in JS. It's the single most likely thing a customer changes — promote to a config field |
| `email_finance_alert` | FIX 🟠 | Hardcoded `finance@company.com` → config field |
| `webhook_finance_1` | FIX 🟠 | Open `POST` ingress for financial transactions with no auth, secret, or validation |

#### 20. Internal Knowledge / Ops Agent (13 nodes) — 🔴 **deactivate until fixed**
| Node | Type | Change |
|---|---|---|
| `if_kb_found` | FIX 🔴 | `"{{input.found}} === true && {{input.content}}.length > 0"` parses to `field: input.found`, `operator: equals`, `value: "true && {{input.content}}.length > 0"` — a **permanently false** comparison (`if-else-conditions.ts:35-41`, `:56-71`). Replace with two canonical rows: `[{field:"$json.found",operator:"equals",value:true},{field:"$json.contentLength",operator:"greater_than",value:0}]`, `combineOperation:"AND"`, and have `js_format_kb_results` emit `contentLength`. **Today: the KB is never read from, and the knowledge team is paged for every single question.** |
| `db_search_kb` | FIX 🔴 | `filters: "{}"`, `orderBy: "relevance"` (no such column), no search term — returns 5 arbitrary rows regardless of the question. There is no actual search happening |
| all 5 Agent templates | FIX 🟠 | Remove the `production-ready` tag until each passes one end-to-end run |

---

## Part D — Recommended sequencing

| Stage | Work | Why this order |
|---|---|---|
| **0** | `SELECT * INTO templates_backup_20260731` | Nothing else starts until the 15 DB-only templates are recoverable |
| **1** | Deactivate **Cross-Platform Sync Engine** + **Internal Knowledge / Ops Agent** | One can damage a customer's CRM; the other is provably non-functional and demo-facing |
| **2** | B1 (Airtable schema) + B2 (`recordId` → `records.0.id`) | Unblocks 8 template fixes. B1 is ~15 lines |
| **3** | Reconstruct all 20 into `templates_v2/*.sql` with every 🔴 in Part C applied | Repo becomes the source of truth; from here changes are reviewable |
| **4** | B4 (`chat_trigger` contract) — **after one live chat run** | Unblocks the remaining 6 chat templates |
| **5** | Add `loop` + Airtable write-back state to the 6 array templates | The largest correctness block |
| **6** | B6 (node notes) + write the 165 notes | Highest user-visible value; parallelisable once the field exists |
| **7** | `templates.contract.test.ts` CI gate | Every defect in this spec is machine-detectable. Without it the library re-rots on the next batch |
| **8** | B5 (`$now`), remaining 🟠/🟡 | Cleanup |

### Change volume

| | Count |
|---|---|
| Templates needing ≥1 change | 20 / 20 |
| 🔴 blocking fixes | 41 |
| 🟠 correctness/quality | 27 |
| 🟡 enhancements | 8 |
| Nodes to ADD | 16 |
| Nodes to DELETE | 3 |
| Templates to SPLIT | 1 |
| Templates to deactivate now | 2 |
| Platform changes (Part B) | 6 |
| Node notes to write | 165 |

---

## Corrections to the audit doc

Two things I got wrong yesterday, both discovered by reading the executor rather than the schema:

1. **"Airtable reads can't be filtered"** — wrong. The runtime supports `filterByFormula`, `maxRecords` and `view`; only the registry schema omits them (B1). This makes ~8 fixes much simpler than the audit implied.
2. **"Use `set_variable` for cross-run state"** — wrong. It's per-execution. The workable approach is an Airtable marker column plus a filtered read (B3).
