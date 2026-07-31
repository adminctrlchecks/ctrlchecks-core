# CtrlChecks AI — Template Library Audit & Implementation Report

**Date:** 2026-07-31
**Scope:** All 20 active templates (165 nodes) in production `public.templates`
**Method:** Live read of `GET https://worker.ctrlchecks.ai/api/templates` (the same payload the gallery renders), cross-checked node-by-node against `worker/src/services/nodes/node-library.ts`, `worker/src/api/execute-workflow.ts`, `worker/src/core/utils/universal-template-resolver.ts`, and `worker/src/core/utils/if-else-conditions.ts`.
**Nothing was modified.** Every finding below is a recommendation.

---

## 0. Read this first — the two things that matter

**1. "Node notes" do not exist as a concept in this product.**
The audit brief assumes each node carries a note that a first-time user reads. It doesn't. The node data contract is:

```ts
// ctrl_checks/src/stores/workflowStore.ts:27
export interface NodeData {
  label: string; type: string; category: NodeCategory;
  icon: string; config: Record<string, unknown>;
}
```

Confirmed empirically: across all 165 nodes in all 20 templates, **0 carry a `notes` or `description` field**. So Part 2 of the brief cannot be answered as "are the notes good/bad" — the correct finding is that the field, the storage, the editor input, and the canvas/inspector surface all need to be built. That is the single highest-leverage item in this report.

**2. The library is well-written but largely non-functional.**
The 15 Business Verification templates have the best *prose* I've seen in this repo — real problems, real buyers, honest caveats in the descriptions. But **17 of 20 templates contain at least one defect that would make them fail or silently misbehave on first run.** They were built as a data-integrity exercise (the execution log in `docs/TEMPLATE_LIBRARY_PROPOSAL.md` says node types and graph structure were verified — and they were, correctly) but **no template was ever executed end-to-end.** The gap is entirely in *runtime data contracts*, not in structure or node choice.

This is fixable and mostly mechanical. It is also urgent: a template that produces a broken workflow on click is worse for the investor story than no template at all.

---

## 1. Executive Summary

| Metric | Value |
|---|---|
| Active templates | 20 |
| Total nodes | 165 |
| Distinct node types used | 24 (**all 24 exist in the backend registry** ✅) |
| Nodes carrying any note/explanation | **0 / 165** |
| Nodes with entirely empty config | 8 |
| Config fields left as empty strings | 25 (22 × Airtable `baseId`, 3 × Slack `webhookUrl`) |
| Templates with ≥1 verified runtime defect | **17 / 20** |
| Templates using an unsupported expression syntax | 5 |
| Templates that emit arrays but have no loop node | 6 |
| Templates that assume cross-run state the platform doesn't provide | 3 |
| Categories covered | 6 (1 vertical + 5 department agents) |
| Templates with `use_count > 0` | 5 (max 2 uses each — all internal testing) |

### Overall Template Library Score: **4.6 / 10**

| Dimension | Score | Why |
|---|---|---|
| Business clarity | **8.5** | The 15 verification templates lead with a real pain ("Stop chasing clients for 'one more document'") and honestly disclose platform limits. Genuinely strong. |
| Node selection | **7.5** | Node *types* are right and all exist in the registry. Loses points for six templates that needed a `loop` node and didn't use one, despite `loop` and `split_in_batches` being registered and available. |
| Workflow completeness | **4.0** | Missing parse steps, missing loops, missing state, missing gates. One template ("Smart Alert Co-Pilot") is missing the single node that implements its own premise. |
| Node notes quality | **0.0** | The field does not exist. Not a content problem — an architecture gap. |
| Beginner friendliness | **3.0** | Gallery card shows name, description, difficulty, minutes, 3 tags. No graph preview, no "what you'll need", no credential list, no per-node explanation. `baseId: ""` × 22 with no hint what to put there. |
| Production readiness | **2.5** | 17/20 have a verified defect. Two templates reference credential providers that don't exist anywhere in the codebase. |
| **Overall** | **4.6** | Excellent editorial voice sitting on top of untested wiring. |

### The five findings that cost the most

1. **No node-notes architecture** (0/165 nodes explain themselves) — Part 2/3 of the brief is blocked on this.
2. **`chat_trigger` output contract is ambiguous in the codebase itself**, and 6 templates depend on the reading that isn't implemented.
3. **Six templates produce arrays and then address them as scalars** — no `loop` node anywhere in the library.
4. **Three unsupported expression syntaxes shipped in templates** (`{{$now}}`, `{{$credentials.*}}`, `{{JSON.stringify(...)}}`) — the resolver implements none of them.
5. **"Internal Knowledge / Ops Agent" is tagged `production-ready` and can never answer from the knowledge base** — its `if_else` condition parses to a permanent false.

---

## 2. Cross-cutting defects (verified against source)

These recur across templates. Fix them once at the pattern level, not template by template.

### C1 — `{{$now}}` is not implemented
**Used in:** Missing Document Finder → `airtable_log_document.fields.ReceivedAt`
`grep -rn '\$now' worker/src` returns exactly one file — `node-library.ts`, where it appears only as an *example value* in field metadata. `universal-template-resolver.ts` handles `$json.`, `json.`, `input.`, `trigger.`, named-node keys, and direct keys. There is no branch for `$now`, no date built-ins at all. The literal string `{{$now}}` is written to Airtable.
**Fix:** either implement `$now`/`$today`/`$timestamp` in the resolver (small, high value — it's already documented in `nodeGuides.ts` and 4 docs-content files, so users already believe it works), or replace with a `javascript` node emitting `new Date().toISOString()`.

### C2 — `{{$credentials.<provider>.<key>}}` is not resolved, and the providers don't exist
**Used in:** Submission Package Builder (`screenshotone`), New Client Risk Checker (`whoisxml`)
`$credentials` appears only inside node *definitions* as placeholder/help text. No runtime substitution exists. Worse: `grep -rn "screenshotone\|whoisxml" worker/src ctrl_checks/src` returns **zero matches** — neither provider is registered as a credential type. Both HTTP nodes will call the API with the literal string as the API key and get a 401.
**Fix:** register both as generic API-key credential types, or rewrite those URLs to read from a config field the user fills in during setup. Do not ship a template that calls a third-party paid API the platform has never heard of.

### C3 — No expression evaluation in templates
**Used in:** Finance / Compliance Agent → `db_save_flag.dataTemplate` contains `{{JSON.stringify(input.violations)}}`
The resolver does property-path lookup only. It cannot call functions. This writes a literal string into the `violations` column.
**Fix:** move the stringify into the upstream `js_format_alert` node (which already exists) and reference `{{input.violationsJson}}`.
**Note:** `{{input.changed.length}}`, `{{input.sources.length}}`, `{{input.violations.length}}` *do* work — `.length` is a real property and `getNestedValue` walks it. Only function calls fail.

### C4 — `chat_trigger` output contract is ambiguous *in the codebase*
`worker/src/api/execute-workflow.ts:3052` returns a **bare string**:
```ts
case 'chat_trigger': { ... result = message; break; }   // result is a string
```
But `execute-workflow.ts:20086` states in a comment: *"chat_trigger always outputs `{ message, userId, sessionId, timestamp }`"* and has fallback logic for exactly that shape.

Six templates read `input.message` off the trigger output. If the string path is what actually runs, `input.message` is `undefined` and every chat template starts with an empty query.
**Affected:** FAQ Answering Assistant, Live Status Lookup Bot, Verification Co-Pilot Chat, Document Vault (search half), Customer Support Agent, Internal Knowledge / Ops Agent.
**Fix:** decide the contract, implement it in one place, and add a contract test. This is a platform bug surfaced by the templates, not a template bug — but it breaks 6 of 20 templates today. **Verify with a live run before acting**; the two code paths disagree and I did not execute a workflow to settle it.

### C5 — `senderPhone` does not exist anywhere in the product
**Used in:** FAQ Answering Assistant, Verification Co-Pilot Chat, Document Vault — all three send WhatsApp to `to: "{{input.senderPhone}}"`.
`grep -rn "senderPhone" worker/src ctrl_checks/src` → **0 matches**. No trigger, no node, no executor ever produces this field. All three WhatsApp sends have no recipient.
**Fix:** define the chat-trigger sender contract (`senderPhone` / `senderId` / `channel`) as part of C4, or route replies back through the chat channel rather than WhatsApp.

### C6 — Six templates emit arrays and then address them as scalars

> **Correction (applied during implementation).** This section originally said the fix
> was "insert a `loop` node". That is wrong. `loop` and `split_in_batches` exist in the
> registry but **do not iterate** — both only expose the array as data, and
> `execute-workflow.ts:13968` says so in its own warning string: *"iteration over
> downstream subgraph is not supported in DAG runtime yet"*. Adding them would have
> added nodes that do nothing.
>
> **The pattern actually shipped:** `maxRecords: 1` + a `filterByFormula` excluding
> already-processed rows + a write-back marker + a "did we find anything?" gate. Each
> scheduled run drains one row. This fixes the array bug *and* the duplicate-notification
> storm (C7) at the same time, and is only possible because of the B1 schema fix.

The registry **has** `loop` (node-library.ts:7908) and `split_in_batches` (:7977). Neither is used in any template — and neither would have helped.

| Template | Array produced | Read downstream as |
|---|---|---|
| License Renewal Reminder | `flagged[]` | `{{input.licenseName}}`, `{{input.daysLeft}}`, `{{input.whatsappNumber}}` |
| Overdue Task Tracker | `flagged[]` | `{{input.title}}`, `{{input.hoursOpen}}`, `{{input.ownerSlackChannel}}` |
| Business Details Matcher | `newlyReady[]` | `{{input.website}}`, `{{input.contactEmail}}` |
| Submission Package Builder | `newlyReady[]` | `{{input.website}}`, `{{input.businessName}}` |
| Cross-Platform Sync Engine | `changed[]` | `{{input.hubspotContactId}}`, `{{input.diffFields}}` |
| Smart Alert Co-Pilot | `changed[]` | routed to a single recipient |

Net effect: each of these sends **one** message with unresolved placeholders instead of **N** correct messages. "License Renewal Reminder" — a template whose entire value is per-license reminders — sends zero usable reminders.
**Fix:** the one-row-per-run pattern above, applied to all six. This is the single highest-volume correctness fix in the report.

### C7 — Three templates assume cross-run state that doesn't exist
Business Details Matcher (`lastSeenIds`), Cross-Platform Sync Engine (`lastSnapshot`), Smart Alert Co-Pilot (`lastSnapshot`) all read a variable that no upstream node sets and no store persists between scheduled runs. On every poll it's empty, so **everything looks new every time**.

Concretely: Cross-Platform Sync re-pushes every client record to HubSpot and Sheets every 15 minutes, forever. Business Details Matcher emails the same report every 15 minutes. This is the failure mode most likely to get a customer's Slack/email/HubSpot rate-limited or their account flagged.
**Fix:** ~~the registry has `set_variable` (:2702)~~ — **correction: `set_variable` is per-execution and cannot carry state between scheduled runs.** What shipped instead: a marker column on the Airtable row (`LastSyncedAt` / `LastAlertedAt` / `MatchCheckedAt`) plus a `filterByFormula` that excludes already-processed rows. No new infrastructure, idempotent, and visible to the customer.

### C8 — 25 empty-string config values with no guidance
22 × Airtable `baseId: ""`, 3 × Slack `webhookUrl: ""`, plus Sheets `spreadsheetId`/`range`. Being blank is *correct* for a template — but the gallery gives the user no indication these exist, and the node inspector will show an empty box labelled "Base ID" with no explanation of where to find one.

This is where node notes would earn their keep. The connection-readiness gate (`/missing-items`) will catch missing *credentials*, but `baseId` is a config field, not a credential — it slips through.

### C9 — AI-returns-JSON with no parse node (the 15 verification templates)
The 5 older Agent templates all follow the right pattern: `openai_gpt` → `javascript` (regex-extract JSON) → consume. The 15 newer templates mostly skip the parse node and read the fields directly off the AI output.

| Template | AI told to return | Consumed as | Result |
|---|---|---|---|
| FAQ Answering Assistant | `{answer, confidence}` | `if_else` on `$json.confidence` | undefined → **always escalates, never answers the client** |
| Document Vault | `{documentType, documentDate}` | `{{input.documentType}}` | blank Airtable fields |
| Smart Alert Co-Pilot | `{alertWorthy, reason, severity}` | `input.response.severity` in JS | undefined → always `low` |

**Fix:** insert the same `javascript` parse node the Agent templates already use. Better: promote it to a reusable "Parse AI JSON" pattern.

### C10 — `switch` node is off-schema
Customer Support Agent's `switch_intent_1` uses `value: "{{input.intent}}"` and `cases: ["order","complaint","faq"]`. The registry requires `expression` (not `value`) and `cases` as `[{value, label}]` objects (node-library.ts:3176-3200).

### C11 — `if_else` uses two different schemas across the library
The registry requires `conditions: [{field, operator, value}]`. The 5 Agent templates use the legacy `condition: "<expression string>"`. **This works** — `normalizeIfElseConditions` parses expression strings (if-else-conditions.ts:90-107) — so it is not broken, but it means the library teaches two contradictory formats to anyone reading templates as examples. Standardise on the canonical array form.

**Except one, which is genuinely broken:** see D4 below.

---

## 3. Template-by-template review

Scores are 1–10. **Notes** is 0/10 for every template — the field doesn't exist — so it is omitted from the per-row table and accounted for once in the library score.

### 3.1 Business Verification & Compliance (15 templates)

| # | Template | Clarity | Nodes | Complete | Beginner | Prod-ready | **Overall** |
|---|---|---|---|---|---|---|---|
| 1 | Verification Readiness Checker | 9 | 8 | 6 | 5 | 4 | **5.6** |
| 2 | Approval Chance Predictor | 9 | 7 | 6 | 5 | 5 | **5.7** |
| 3 | Missing Document Finder | 9 | 6 | 3 | 4 | 2 | **4.0** |
| 4 | Business Details Matcher | 9 | 6 | 3 | 3 | 2 | **3.8** |
| 5 | Submission Package Builder | 8 | 5 | 3 | 3 | 1 | **3.2** |
| 6 | License Renewal Reminder | 9 | 5 | 2 | 4 | 1 | **3.4** |
| 7 | FAQ Answering Assistant | 9 | 7 | 4 | 5 | 2 | **4.5** |
| 8 | New Client Risk Checker | 9 | 7 | 6 | 4 | 2 | **4.8** |
| 9 | Overdue Task Tracker | 9 | 5 | 3 | 4 | 2 | **4.0** |
| 10 | Client Priority Ranker | 8 | 8 | 7 | 6 | 6 | **6.6** |
| 11 | Verification Co-Pilot Chat | 9 | 6 | 4 | 4 | 2 | **4.4** |
| 12 | Document Vault with Smart Search | 8 | 5 | 2 | 3 | 1 | **3.0** |
| 13 | Live Status Lookup Bot | 8 | 8 | 6 | 6 | 4 | **5.8** |
| 14 | Cross-Platform Sync Engine | 9 | 6 | 2 | 3 | 1 | **3.4** |
| 15 | Smart Alert Co-Pilot | 9 | 5 | 2 | 3 | 1 | **3.4** |

**Per-template node findings:**

**1. Verification Readiness Checker** (9 nodes, `form → airtable → http → gpt → js → airtable → gpt → gmail + whatsapp`)
- `gmail_send_results.body` references `{{input.fixList}}` — **no node ever produces `fixList`**. The upstream `ai_fix_list` node emits `response`/`text`. The email arrives with the fix list section blank. **Highest-visibility defect in the flagship template.**
- `airtable_update_score.recordId: "{{input.recordId}}"` — the upstream Airtable `create` must be confirmed to emit `recordId` (vs `id` / `record.id`). Untested.
- Terminal fan-out `ai_fix_list → gmail` **and** `→ whatsapp` means the WhatsApp node receives the AI's prose output, not the score object; `{{input.score}}` and `{{input.businessName}}` there depend entirely on the upstream-context-preservation layer holding across 8 hops.
- **Missing node:** no `if_else` on score. A business scoring 95 and one scoring 20 get identical treatment.

**2. Approval Chance Predictor** (7 nodes)
- `ai_predict_chance` reads `{{input.record}}` (singular). Every other template reads `records` (plural) from an Airtable read. One of the two is wrong; `records` is used 5× elsewhere, so this is almost certainly the typo.
- `airtable_lookup_readiness` is an unfiltered `read` of the whole `Clients` table — the AI then gets every client's data to predict one business's chances. **Missing:** a filter/formula on the read, or a `javascript` node to select the matching record.
- Otherwise the soundest of the beginner set — the `RISK:` line-count → percentage pattern is legible and works.

**3. Missing Document Finder** (6 nodes) — **logic is inverted from its own premise**
- `js_check_missing` reads `input.receivedTypes`, which nothing produces, so it falls back to `[input.response]` — **the single document just uploaded**. The checklist therefore reports every other required document as missing, every time, even for a client whose file is complete.
- **Missing node:** an `airtable` *read* of `DocumentsReceived` filtered by client, between the log and the check. Without it the template does the opposite of what its description promises.
- `{{$now}}` → C1.
- `form_doc_upload.clientType` is a `select` with **no options defined**, yet `js_check_missing` branches on exactly `'Individual'` / `'Business'`.

**4. Business Details Matcher** (8 nodes)
- C7 (no `lastSeenIds` persistence) → re-emails every 15 minutes.
- C6 (no loop over `newlyReady`).
- `http_fetch_website_details.url: "{{input.website}}"` — after `js_detect_newly_ready`, `website` lives at `newlyReady[i].fields.Website`, not top level. The HTTP node gets an empty URL.
- `js_compare_versions` flags mismatches by regex-matching the words "mismatch|does not match|differ" in free-form AI prose. Ask the model for JSON and parse it.

**5. Submission Package Builder** (7 nodes) — **lowest production readiness**
- C2 (`screenshotone` credential doesn't exist).
- Diamond topology: `js_detect → http_screenshot` and `js_detect → http_policy`, both `→ drive_list`. With no `merge` node, `drive_list` likely executes twice and `gmail` receives only one branch's data. `{{input.screenshotUrl}}` and `{{input.policyText}}` come from *different* branches and cannot both be in scope at the email node.
- **Missing node:** `merge` before `drive_list_existing_docs`.
- C6, C7.
- `drive_list_existing_docs` has `operation: "list"` and nothing else — no folder ID, no query. It lists whatever the root of the connected Drive contains.

**6. License Renewal Reminder** (5 nodes) — **cleanest concept, worst execution**
- C6 in its purest form: `js_flag_expiring` returns `flagged[]`; both output nodes read `{{input.licenseName}}` / `{{input.daysLeft}}` / `{{input.whatsappNumber}}` at top level. Zero usable reminders sent.
- **Missing:** `loop` after `js_flag_expiring`.
- **Missing:** dedupe/state. The description promises reminders "at the 90, 30 and 7-day marks"; the code sends one **every single day** from day 90 to day 0 — 90 messages per license, not 3. `js_flag_expiring` computes `urgency` but never gates on the transition.

**7. FAQ Answering Assistant** (6 nodes)
- C9: no parse node → `$json.confidence` never exists → `if_else` always false → **every client question escalates to Slack, none is ever answered.** The template's stated value ("let clients ask their own questions instead of pinging your team") is inverted: it pings the team every time.
- C5 (`senderPhone`), C4 (`chat_trigger`).
- `airtable_read_faq` is unfiltered — the entire FAQ table is stuffed into the prompt on every question. Fine at 20 rows, breaks the context window at 500.

**8. New Client Risk Checker** (7 nodes)
- C2 (`whoisxml`).
- `if_high_risk` reads `$json.isHighRisk`, but it sits **after** `airtable_log_risk`, whose output replaces the input. Reorder so the branch reads directly from `js_risk_score`, or rely on context preservation (untested here).
- Structurally the best of the intermediate set — clear linear chain, one decision, one action.

**9. Overdue Task Tracker** (6 nodes)
- C6 (no loop over `flagged`).
- `{{input.ownerSlackChannel}}` and `{{input.managerSlackChannel}}` are never produced by any node and aren't config fields. Both Slack sends have no channel.
- `if_very_overdue` is placed **after** `slack_alert_owner`, reading `$json.isVeryOverdue` from the Slack node's output. Should branch off `js_flag_overdue`.
- No state → re-alerts every hour indefinitely.

**10. Client Priority Ranker** (5 nodes) — **best of the 15**
- Genuinely close to working. Single AI call, deterministic parse, one Slack message. No loop needed because the output is intentionally one ranked list.
- `{{input.ranked}}` is an array of objects → renders as a JSON blob in Slack. Add a `.map().join('\n')` in the JS node.
- Unfiltered Airtable read (same as #2).

**11. Verification Co-Pilot Chat** (6 nodes)
- `http_status_api_optional` is labelled "(Optional)" but is **inline in the chain** with `url: "{{input.statusApiUrl}}"`, which nothing defines. A failing HTTP node mid-chain takes down the whole workflow. If it's optional it needs an `if_else` guard or removal.
- C4, C5, unfiltered Airtable read.
- The `systemPrompt` ("You never guess — you only answer using the data given") is the best-written prompt in the library. Worth reusing as a house pattern.

**12. Document Vault with Smart Search** (8 nodes) — **structurally invalid**
- **Two trigger nodes and two fully disconnected subgraphs in one template**: `form_vault_upload → ai_tag → airtable_store` and, separately, `chat_trigger_search → js_parse → airtable_search → ai_agent → whatsapp`. There is no edge between them. This violates the platform's own DAG rule (`.cursor/rules/deterministic-workflow-dag-compiler.mdc`: no orphan nodes, one trigger, linear default) and will likely fail save-validation or topological sort.
- **Fix:** split into two templates — "Document Vault: Intake" and "Document Vault: Smart Search".
- `airtable_store_tagged_doc.FileLink: "{{input.fileUrl}}"` — the `form` node's file field is keyed `document`; `fileUrl` is never produced (0 matches in the form schema).
- C9 (Gemini asked for JSON, never parsed), C5, C4.

**13. Live Status Lookup Bot** (5 nodes) — **most likely to actually run**
- Only blockers are C4 and the unfiltered Airtable read (`js_format_reply` always takes `records[0]`, so it returns the *first* client regardless of what was asked).
- **Missing node:** a filtered read, or a JS filter step between read and format. One-line fix away from being the library's showcase beginner template.

**14. Cross-Platform Sync Engine** (6 nodes) — **highest blast radius**
- C7: no snapshot persistence → **re-pushes every client record to HubSpot and Google Sheets every 15 minutes, permanently.** This is the one template that can do real damage to a customer's CRM.
- C6: `{{input.hubspotContactId}}` and `{{input.diffFields}}` live inside `changed[i]`, not at top level.
- `sheets_update_shared_copy` has `spreadsheetId: ""` **and** `range: ""` — two blank required fields.
- **Recommend deactivating** until C6 + C7 are fixed.

**15. Smart Alert Co-Pilot** (7 nodes) — **missing the node that is the entire point**
- `ai_agent_judge_alert` returns `{alertWorthy, reason, severity}`. The next node computes a recipient, and then **WhatsApp sends unconditionally.** There is no `if_else` on `alertWorthy`. The template's whole premise — "only when a change is actually worth interrupting someone for" — is not implemented. It alerts on every polled change, i.e. it is a noisier version of a dumb alert.
- **Missing node:** `if_else` on `alertWorthy === true` between the AI and the router.
- C9: `js_route_notification` does `input.response.severity` on what is a text response → always `low`.
- `input.complianceLeadPhone` / `input.accountManagerPhone` never defined anywhere.
- C7.
- Two consecutive Airtable reads on the same table with identical (empty) filters — the second ("Pull Related Records for Context") returns exactly what the first did. **Redundant node.**

### 3.2 Department Agent templates (5 templates)

| # | Template | Clarity | Nodes | Complete | Beginner | Prod-ready | **Overall** |
|---|---|---|---|---|---|---|---|
| 16 | Customer Support Agent | 6 | 9 | 8 | 5 | 5 | **6.6** |
| 17 | Sales & Lead Qualification Agent | 6 | 6 | 4 | 5 | 3 | **4.8** |
| 18 | HR / Hiring Workflow Agent | 6 | 8 | 7 | 5 | 4 | **6.0** |
| 19 | Finance / Compliance Agent | 6 | 8 | 7 | 5 | 4 | **6.0** |
| 20 | Internal Knowledge / Ops Agent | 6 | 7 | 3 | 5 | 1 | **4.4** |

All five share weaker **descriptions** than the verification set — they list features ("Fully working with intent detection, data fetching, and confidence-based routing") rather than naming a buyer's problem. All five are tagged `production-ready`; **none is.** That tag should be removed or earned.

**16. Customer Support Agent** (16 nodes) — **best-engineered template in the library**
- Correct patterns throughout: parse node after every AI call, `switch` for multi-path, `merge` before rejoin, `memory` retrieve/store, confidence gate, escalation path. **This is the reference architecture the other 19 should be rebuilt against.**
- C10: `switch` uses `value` instead of `expression`, and bare-string `cases`.
- `slack_escalate.webhookUrl: ""` — blank required field.
- `merge_responses` sits after a `switch` where only one branch ever runs; verify `merge` doesn't block waiting for all three inputs.
- C4.

**17. Sales & Lead Qualification Agent** (12 nodes) — **two dead nodes**
- `ai_qualify_questions` generates three qualifying questions, `js_parse_questions` parses them into `questions[]` — and **nothing downstream ever reads `questions`.** Two nodes and one LLM call per lead, producing output that is discarded. Either wire the questions into the outbound email or delete both nodes.
- `ai_score_lead`'s prompt contains **no `{{input.*}}` interpolation at all**: *"Score this lead on a scale of 0-100 based on: Company size (from company name), Message quality, Contact information completeness."* The model is never shown the lead. Every score is a hallucination.
- Hardcoded `https://calendly.com/your-team/meeting` — ships with a placeholder URL that will 404 for every customer.

**18. HR / Hiring Workflow Agent** (13 nodes)
- Structurally sound; parse nodes present, branch is clean.
- **Sends automated rejection emails with no human review gate.** For a hiring workflow this is a legal/brand risk that should at minimum be called out in the template description, and better implemented as "draft rejection → notify recruiter" rather than "send".
- Hardcoded `https://calendly.com/hr-team/interview`.
- `database_write` to a `candidates` table that must already exist with a matching schema — no setup instructions anywhere.

**19. Finance / Compliance Agent** (13 nodes)
- C3 (`{{JSON.stringify(input.violations)}}`).
- Hardcoded `to: "finance@company.com"` — will silently email a non-existent address.
- The $10,000 approval threshold is buried in JS. It is the single most likely thing a customer wants to change and it isn't a config field.
- `webhook_finance_1` accepts `POST` with no auth, validation, or secret. A finance-transaction ingress endpoint should not ship open.

**20. Internal Knowledge / Ops Agent** (13 nodes) — **cannot work; tagged production-ready**
- **D4 (verified):** `if_kb_found.condition = "{{input.found}} === true && {{input.content}}.length > 0"`. `normalizeIfElseConditions` matches the first `===` with a lazy left-hand group, giving `field: "input.found"`, `operator: equals`, `value: "true && {{input.content}}.length > 0"` (a string — `parseLiteral` only returns boolean `true` for the exact string `"true"`). The comparison is **permanently false.** Every employee question takes the fallback branch: "sorry, that isn't in the knowledge base," followed by a Slack "knowledge gap" alert. **The knowledge base is never read from, and the knowledge team gets paged for every question.**
- `db_search_kb` has `filters: "{}"` and `orderBy: "relevance"` — no such column, and no search term. It returns 5 arbitrary rows regardless of what was asked.
- C4.
- **Recommend deactivating immediately** or fixing before any demo.

---

## 4. Missing functional notes — proposed content

Part 3 of the brief asks for functional notes on specialised nodes. Two important pieces of context before the recommendations:

**What already exists (do not rebuild it):** per-node-*type* documentation in this repo is genuinely strong —
- `ctrl_checks/src/components/workflow/nodeGuides.ts` — 184 field-level guides, ~14k lines
- `ctrl_checks/src/docs-content/nodes/` — 178 per-node doc pages
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` — 6,670 lines
- `ctrl_checks/src/lib/node-inspector-metadata.ts` — description-resolution fallback chain

The example the brief gives for a good HTTP note ("connects CtrlChecks with external REST APIs… CRM integrations, ERP systems…") is **already roughly what `nodeGuides.ts` contains.** The gap is not type-level documentation.

**The actual gap is instance-level.** A user opening `http_fetch_website` in Verification Readiness Checker needs to know *"this fetches the client's homepage so the AI can look for a privacy policy link — if the site blocks bots, this returns empty and the score will be wrong."* No amount of generic HTTP documentation provides that. That is what a node note is.

### Recommended note schema

```ts
// Add to NodeData in ctrl_checks/src/stores/workflowStore.ts
notes?: {
  what: string;        // what this node does *in this workflow*
  why: string;         // why it exists here — what breaks without it
  when: string;        // when a user would change/remove it
  next: string;        // what happens downstream with its output
  business: string;    // the business consequence
  setup?: string;      // instance-specific setup (e.g. "Base ID: Airtable URL, starts app...")
};
```
Persist on the node in `templates.nodes` / `workflows.nodes`; render in the node inspector and as a hover card on the canvas; expose as a textarea group in `TemplateEditor.tsx`.

### Worked examples (drop-in content for the highest-traffic node instances)

**`airtable` — 20 instances, all with `baseId: ""`** *(the single most valuable note in the library)*
> **What:** Reads and writes your client records in Airtable. This template expects a table called `Clients`.
> **Why:** Everything downstream — the score, the reminders, the reports — is keyed off this record. It's the workflow's memory.
> **Setup:** Open your Airtable base in a browser. The URL looks like `airtable.com/appXXXXXXXX/tblYYYYYYY`. `appXXXXXXXX` is your **Base ID**; `tblYYYYYYY` is your **Table ID**. Paste them in below.
> **Next:** The created record's ID flows to the next node so later steps update the same row instead of creating duplicates.
> **If it's wrong:** The workflow runs but silently writes nothing, and every downstream step gets empty data.

**`http_request` — 6 instances**
> **What:** Calls an external URL and returns whatever comes back. Here it fetches the client's website HTML.
> **Why:** The AI can't browse. This node is how the website's actual content reaches the AI step.
> **When to change:** Point it at a different URL, or add headers if the target needs an API key.
> **Next:** The response body arrives downstream as `{{input.body}}`.
> **If it fails:** Many sites block automated requests. If the body comes back empty, the readiness score will be misleadingly low — check the raw output in the execution log before trusting the score.

**`javascript` — 34 instances, the most-used node in the library**
> **What:** Runs a small piece of JavaScript to reshape data between steps. Here it counts the AI's `ISSUE:` lines and turns them into a 0-100 score.
> **Why:** AI steps return prose. Database and messaging steps need structured fields. This is the translator between them.
> **When to change:** Adjust the 15-point deduction per issue to match how strict you want the score to be.
> **Next:** Returns `score`, `issues`, `issueCount` alongside everything it received.
> **Note:** Whatever this returns becomes the input to the next node — if you drop a field here, later steps can't see it.

**`if_else` — 8 instances**
> **What:** Splits the workflow into a true path and a false path.
> **Why:** Not every result deserves the same action. Confident answers go to the customer; unconfident ones go to a human.
> **Setup:** The field you test must actually exist in the previous step's output. Open the previous node's execution log to see the exact field names available.
> **Next:** Only one branch runs. Anything the other branch would have done simply doesn't happen.
> **Common mistake:** Testing two things at once (`a === true && b > 0`) — this platform evaluates one condition per row. Add a second condition row instead.

**`schedule` — 7 instances**
> **What:** Starts this workflow on a clock. Here: every 15 minutes.
> **Why:** There is no "when a record changes" trigger yet, so the workflow checks on a timer instead.
> **When to change:** More often = faster reaction and more API calls. Every 15 minutes is ~2,880 runs/month.
> **Next:** Each run starts from scratch — the workflow does not remember the previous run. If you need "only what changed since last time", store a marker in the record itself.
> **Cost warning:** Every run that reaches an AI step costs a token call, whether or not there was anything to do.

**`openai_gpt` / `google_gemini` — 20 instances**
> **What:** Sends a prompt to the model and returns its text answer.
> **Why:** This is the judgment step — reading a website, comparing documents, writing a friendly message.
> **Setup:** Anything in `{{double braces}}` is filled in from earlier steps. If a placeholder is blank at runtime, the model receives a half-empty prompt and will make something up.
> **Next:** The answer arrives downstream as `{{input.response}}`. **If you asked for JSON, add a Code step after this to parse it** — the raw output is always text.
> **Temperature:** 0.2-0.3 for extraction and scoring; 0.5-0.7 for anything a customer will read.

**`whatsapp` — 7 instances**
> **What:** Sends a WhatsApp message via WhatsApp Business.
> **Why:** For clients who don't read email, this is the channel that gets a response.
> **Setup:** `To` must be a full international number including country code, with no `+` or spaces. It has to come from a field you actually collected — check the form has a phone field.
> **Next:** Terminal step. Delivery failures appear in the execution log, not to the customer.
> **Cost:** WhatsApp Business charges per conversation. A workflow on a 15-minute schedule can generate a large bill quickly.

**`slack_webhook` — 3 instances, all with `webhookUrl: ""`**
> **Setup:** Slack → your workspace → Apps → Incoming Webhooks → Add to Slack → pick a channel → copy the `https://hooks.slack.com/services/...` URL here. The channel is fixed by the URL; changing the channel means a new webhook.

**`ai_agent` — 3 instances**
> **What:** Like an AI step, but it can reason over several pieces of context at once and decide on an action.
> **Why:** Used here for judgment calls a fixed rule can't make — "is this change worth waking someone up for?"
> **When *not* to use it:** If a simple threshold works, use a Code step and an If/Else. They're cheaper, faster, and testable.
> **Next:** Returns text. **Ask it for JSON and parse it in a Code step** if a later step needs to branch on the result.

**`form` — 5 instances**
> **What:** Generates a public URL your clients fill in. Submitting it starts the workflow.
> **Why:** It's both the trigger and the data source — every field here becomes `{{input.<fieldKey>}}` downstream.
> **Setup:** The **field key** (not the label) is what later steps reference. Renaming a key breaks every step that used it.
> **Next:** File uploads pass along a reference, not the file itself. AI steps read the reference; they do not currently OCR the document.

Also needed, using the same schema: `google_gmail` (recipient-source modes are genuinely confusing), `webhook` (**must** cover securing the endpoint), `memory`, `merge`, `switch`, `hubspot`, `google_sheets`, `google_drive`, `database_read`/`database_write` (must state that the table has to exist first), `log_output`, `chat_trigger`, `loop` (once C6 is fixed).

---

## 5. Competitor gap analysis

**A note on the target:** "Stark AI" does not resolve to a workflow-template marketplace. The closest and almost certainly intended match is **Stack AI** (`stackai.com/templates`), an enterprise AI-agent builder with ~90 published templates. I benchmarked against Stack AI, with n8n and Zapier as the broader market. **If you meant a different product, tell me and I'll redo this section** — the rest of the report is unaffected.

### Coverage comparison

| Function | Stack AI | CtrlChecks | Gap |
|---|---|---|---|
| Finance & Investment | 10 | 1 | **-9** |
| Legal & Contracts | 9 | 0 | **-9** |
| Insurance & Claims | 5 | 0 | **-5** |
| Healthcare & Life Sciences | 5 | 0 | **-5** |
| Real Estate & Property | 6 | 0 | **-6** |
| Banking & Lending | 5 | 0 | **-5** |
| Security & Governance | 7 | 0 | **-7** |
| Quality & Risk | 5 | 1 | -4 |
| Education | 4 | 0 | **-4** |
| Data & Analytics | 5 | 0 | **-5** |
| Sales & BD | 4 | 1 | -3 |
| HR & L&D | 4 | 1 | -3 |
| Customer Support | 4 | 2 | -2 |
| Operations | 5 | 3 | -2 |
| **Compliance / KYC / Verification** | ~6 | **15** | **+9 ✅** |
| **Total** | **~90** | **20** | **-70** |

### Where CtrlChecks genuinely wins

- **Depth in one vertical.** Stack AI has ~6 compliance-adjacent templates. CtrlChecks has 15 that cover the *whole lifecycle* — intake, readiness, prediction, document chase, matching, submission, renewal, risk, SLA, prioritisation. Nobody else has that continuity.
- **Problem-first copy.** "Stop chasing clients for 'one more document'" beats "Document Classification Agent" as a sales asset, every time.
- **Honest limitation disclosure.** Three descriptions state their own workaround ("No instant Airtable-update trigger exists yet, so this polls..."). Competitors never do this. It reads as engineering confidence, not weakness. **Keep this.**
- **Multi-channel output.** WhatsApp as a first-class delivery channel is largely absent from US-centric competitors and is a real advantage in India/SEA markets.

### Where CtrlChecks loses

1. **Breadth: 20 vs ~90.** A buyer outside business verification sees nothing for them.
2. **Zero industry verticals beyond compliance.** No legal, insurance, healthcare, real estate, banking, or education templates.
3. **No document-intelligence node.** `document_ocr`, `vector_store`, and `embeddings` exist in the *frontend catalog only* — they are not registered in the backend registry and would fail at runtime (this was already caught during the original build and worked around). This is the biggest capability gap: roughly a third of Stack AI's templates are fundamentally "read a document and extract structured data," which CtrlChecks cannot do properly.
4. **No RAG / knowledge-base retrieval.** "Chat with your documents" is table stakes in 2026 and needs a vector store.
5. **No starter tier.** Every template is a full multi-step workflow. There's no 3-node "Form → AI → Email" that a new user completes in 2 minutes to build confidence.
6. **No graph preview in the gallery.** Stack AI and n8n both show the workflow shape before you commit. `Templates.tsx` (167 lines) renders name + description + difficulty + minutes + 3 tags, and nothing else.
7. **No prerequisites list.** Nothing tells the user "you'll need an Airtable account, a WhatsApp Business number, and an OpenAI key" until after they've copied the workflow.

### Recommended new templates

**Tier 1 — starters (build first; 3-5 nodes; the current library has none)**
1. Contact Form → AI Reply → Email *(the 2-minute first win)*
2. Daily Digest: Sheet → AI Summary → Slack
3. New Row → Enrich → Notify
4. Webhook → Route by Type → Log
5. Scheduled Website Uptime + Content Check

**Tier 2 — breadth into adjacent departments (highest ROI per template)**
6. Invoice Intake → Extract → Approve/Flag → Accounting *(finance, the biggest gap)*
7. Contract Renewal Tracker *(legal, reuses License Renewal Reminder's shape)*
8. Vendor Onboarding & Due Diligence *(reuses New Client Risk Checker)*
9. Employee Onboarding Checklist Runner
10. Expense Policy Checker
11. Support Ticket Triage & Routing
12. Weekly Revenue/Pipeline Report Builder
13. Meeting Notes → Action Items → Task Tracker
14. RFP/Tender Deadline Monitor
15. Customer Churn Risk Early Warning

**Tier 3 — enterprise (blocked on platform capability)**
16. KYC/AML Screening Pipeline
17. Audit Evidence Collector
18. Insurance Claim Intake & Triage
19. Loan Application Pre-Screen
20. Regulatory Change Monitor
21. Policy Q&A over Company Handbook *(**blocked** — needs vector store)*
22. Multi-Document Comparison *(**blocked** — needs document intelligence)*

**Target: 45-50 templates across 10+ categories.** Matching Stack AI's 90 is the wrong goal; 50 that all work beats 90 that don't.

---

## 6. Platform-wide improvements

**P1 — Ship the node-notes system** (schema → storage → TemplateEditor input → inspector render → canvas hover). Nothing else in this report changes the user's experience as much. *Section 4 has the schema and 10 worked examples.*

**P2 — Add a template validation gate in CI.** Every defect in this report is machine-detectable:
- config keys not in the node's `configSchema`
- `{{expr}}` referencing a field no upstream node produces
- expression syntaxes the resolver doesn't implement (`$now`, `$credentials`, function calls)
- required config left as `""`
- multiple triggers / disconnected subgraphs
- array-producing node followed by scalar consumption with no `loop`
- credential providers not in the connector registry

A single `templates.contract.test.ts` running against the active-template set would have caught **every single item in Section 3**. This is the durable fix — without it the library re-rots on the next batch.

**P3 — Rebuild the gallery card and add a detail view.** Graph preview (mini `@xyflow` render), prerequisites list ("Airtable, WhatsApp Business, OpenAI key"), node count, expandable step list. `Templates.tsx` is 167 lines and shows almost nothing.

**P4 — Add a post-copy setup checklist.** The connection-readiness gate already covers missing *credentials*; extend it to required *config* (22 blank `baseId`s slip through today) and surface it as a guided "3 things left before this can run" panel.

**P5 — Establish house patterns and enforce them.** Customer Support Agent already demonstrates most of them. Codify:
- Every AI node asked for JSON is followed by a parse node
- Every array-producing node is followed by `loop`
- Every scheduled polling workflow persists state via `set_variable`/`redis`
- Every branch reads from the node that *computed* the field, not one downstream of it
- Canonical `if_else` `conditions[]` array form only — never the legacy string
- No hardcoded emails, URLs, or thresholds in template configs — promote to config fields

**P6 — Remove `production-ready` from all 5 Agent template tag lists** until they pass an end-to-end run. Two of them currently cannot work at all.

**P7 — Standardise template descriptions on the verification-set voice** (problem → mechanism → honest caveat) and rewrite the 5 Agent descriptions to match.

**P8 — Fill the capability gaps that block a third of the competitive template space:** a backend-registered document-intelligence node, a vector store, and a database-change trigger. The frontend catalog already advertises the first two; the backend has neither.

**P9 — Add per-template cost estimates.** Several templates make an LLM call every 10-15 minutes indefinitely. A user should see "~2,880 AI calls/month at this schedule" before clicking Use.

---

## 7. Priority matrix

### High impact / low effort — do this week
| # | Action | Why |
|---|---|---|
| 1 | Deactivate **Cross-Platform Sync Engine** and **Internal Knowledge / Ops Agent** | One re-pushes every record to a customer's CRM every 15 min forever; the other cannot answer a single question and pages the team for all of them |
| 2 | Fix `{{input.fixList}}` → `{{input.response}}` in Verification Readiness Checker | One-token fix in the flagship template's customer-facing email |
| 3 | Fix `{{input.record}}` → `{{input.records}}` in Approval Chance Predictor | One-token fix |
| 4 | Add `if_else` on `alertWorthy` to Smart Alert Co-Pilot | One node; implements the template's entire premise |
| 5 | Split Document Vault into two templates | Removes the only structurally invalid graph |
| 6 | Add the parse node to FAQ Answering Assistant | One node; converts "always escalates" into "actually answers" |
| 7 | Interpolate lead data into Sales Agent's `ai_score_lead` prompt; delete the two dead question nodes | Stops scoring on no information |
| 8 | Rewrite Internal Knowledge Agent's compound condition as two `conditions[]` rows | Un-breaks a permanently-false gate |
| 9 | Remove `production-ready` tags | Accuracy, and it's free |
| 10 | Add a filtered read to Live Status Lookup Bot | One change from "returns a random client" to a working showcase template |

### High impact / high effort — this quarter
| # | Action |
|---|---|
| 11 | **Build the node-notes system end to end** (P1) — schema, storage, editor, inspector, canvas |
| 12 | **Template validation CI gate** (P2) — the only thing that keeps this fixed |
| 13 | Add `loop` to the six array-emitting templates (C6) |
| 14 | Implement cross-run state for the three polling templates (C7) |
| 15 | Write the 10 Tier-1/Tier-2 starter templates (Section 5) |
| 16 | Gallery redesign: graph preview + prerequisites + detail view (P3) |
| 17 | Backend document-intelligence node + vector store (P8) — unblocks ~30% of the competitive template space |

### Medium priority — next quarter
| # | Action |
|---|---|
| 18 | Implement `$now` and date built-ins in the resolver (C1) — already documented as if it works |
| 19 | Register `screenshotone` / `whoisxml` credential types, or rewrite those two nodes (C2) |
| 20 | Settle the `chat_trigger` output contract and add a contract test (C4/C5) |
| 21 | Promote hardcoded values (calendly URLs, `finance@company.com`, the $10k threshold) to config fields |
| 22 | Standardise all `if_else` on the canonical `conditions[]` form (C11) |
| 23 | Fix `switch` config keys in Customer Support Agent (C10) |
| 24 | Rewrite the 5 Agent descriptions in the verification-set voice (P7) |
| 25 | Post-copy setup checklist covering config, not just credentials (P4) |
| 26 | Tier-3 enterprise templates |

### Low priority — backlog
| # | Action |
|---|---|
| 27 | Per-template cost estimates (P9) |
| 28 | Human-review gate on HR Agent's automated rejection emails |
| 29 | Secure the Finance Agent's open webhook ingress |
| 30 | Remove the redundant second Airtable read in Smart Alert Co-Pilot |
| 31 | Reconcile the ~40 category strings in dormant rows against the admin dropdown |
| 32 | Decide the fate of the 530 deactivated rows (14 reference node types no longer in the registry) |

---

## 8. Appendix — evidence index

| Claim | Source |
|---|---|
| Node data has no notes field | `ctrl_checks/src/stores/workflowStore.ts:27-35` |
| 0/165 nodes carry notes | Computed over the live `/api/templates` payload |
| All 24 node types exist | `worker/src/services/nodes/node-library.ts`, grep per type |
| `$now` unimplemented | `worker/src/core/utils/universal-template-resolver.ts:80-140`; `$now` appears only in `node-library.ts` as example metadata |
| `$credentials` unresolved; providers absent | 0 matches for `screenshotone`/`whoisxml` across `worker/src` + `ctrl_checks/src` |
| No expression evaluation | `universal-template-resolver.ts:80-140` — property-path lookup only |
| `chat_trigger` returns a bare string | `worker/src/api/execute-workflow.ts:3041-3054`, contradicted by the comment at `:20084-20086` |
| `senderPhone` doesn't exist | 0 matches across `worker/src` + `ctrl_checks/src` |
| `loop` / `split_in_batches` exist but are unused | `node-library.ts:7908`, `:7977`; 0 uses across 165 template nodes |
| `set_variable` / `redis` exist but are unused | `node-library.ts:2702`, `:11255` |
| Compound `if_else` parses to permanent false | `worker/src/core/utils/if-else-conditions.ts:35-41` (pattern order), `:56-71` (`parseLiteral`), `:90-107` (`parseExpression`) |
| Legacy `condition` string *is* supported | `if-else-conditions.ts:109-116` |
| `if_else` schema requires `conditions[]` | `node-library.ts:3109-3138` |
| `switch` schema requires `expression` + object `cases` | `node-library.ts:3166-3210` |
| Gallery shows only 5 fields | `ctrl_checks/src/pages/Templates.tsx` (167 lines total) |
| Existing type-level docs are extensive | `nodeGuides.ts` (184 entries), `docs-content/nodes/` (178 files), `nodeUsageGuides.ts` (6,670 lines) |
| Stack AI ~90 templates / ~15 areas | `stackai.com/templates`, fetched 2026-07-31 |
| Library history & prior execution log | `docs/TEMPLATE_LIBRARY_PROPOSAL.md`, `docs/TEMPLATE_NODE_AUDIT_AND_ADMIN_EDITOR_FIX_PLAN.md` |
