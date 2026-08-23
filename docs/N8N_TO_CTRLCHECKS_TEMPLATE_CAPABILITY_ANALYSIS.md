# N8N → CtrlChecks AI Template Capability Analysis

> **Scope:** Research only. No application code was modified. This document establishes the
> *actual* current CtrlChecks template library (from the production database, not repo files),
> maps CtrlChecks' real node/execution capabilities, and compares both against the n8n template
> ecosystem to identify what CtrlChecks already covers, what it can build today, and what it cannot.
>
> **Date:** 2026-08-09
> **Author:** Capability audit (Claude Code)
> **Evidence basis:** live `GET https://worker.ctrlchecks.ai/api/templates` (36 rows), the unified
> node registry / `worker/public/node-library.json` (178 node types), the credential type registry
> (~96 credential types), `worker/src/api/execute-workflow.ts` runtime behavior, and n8n's public
> template catalog (11,190 community templates + the curated `awesome-n8n-templates` set).

---

## 1. Executive Summary

**What CtrlChecks has today:** a **36-template** library, stored **exclusively in the production
RDS PostgreSQL `templates` table** (not in repo source of truth), spanning 4 business categories:
Business Verification & Compliance (12), Sales/Support/Internal Ops (14), Finance/Accounting/Insurance (5),
and Healthcare & Clinics (5). The templates draw on only **23 of the 178 registered node types**.

**What CtrlChecks can build:** the platform registers **178 node types** across 30 categories,
**~96 credential/integration types**, a **broad and genuinely-wired trigger layer** (webhook, form,
chat, schedule + ~20 push/webhook services including Gmail/Drive/Sheets/Calendar watch triggers,
GitHub/GitLab/Jira/Linear/Trello, Stripe/Shopify, and the chat platforms), and a linear-DAG
execution engine with `if_else` / `switch` / `merge` / `filter` branching, a general-purpose
`javascript` node, and AI nodes (`ai_agent`, `openai_gpt`, `anthropic_claude`, `google_gemini`,
`memory`, `tool`, `sentiment_analyzer`, `text_summarizer`).

**The single most important limitation:** the DAG runtime **does not iterate over items**.
`loop` and `split_in_batches` expose an array as data but do **not** fan out execution over a
downstream subgraph (verified: `execute-workflow.ts:13934` and `:13976`). Every "process all
matching rows / all files / all emails in one run" pattern that is the *default* in n8n must be
re-expressed in CtrlChecks as a **scheduled one-record-per-run drain** (poll → filter to one
unprocessed record → act → write-back marker). This single architectural difference is the
biggest driver of the "not currently buildable" tier below.

**Headline gap list (fundamental, not just missing templates):**
1. **No per-item iteration / batch fan-out** (biggest).
2. **No PDF / document text-extraction node** and **no vision/multimodal input** — blocks n8n's
   entire "Document Ops / PDF" category (invoice extraction, resume parsing, chat-with-PDF).
3. **No headless-browser / crawler** — only `http_request` + `html` parsing (static pages only).
4. **No embeddings / chunking node** — vector-store nodes exist (`pinecone`, `qdrant`) but the
   full "documents → embeddings → vector store → RAG" pipeline is not turn-key; RAG-lite over
   SQL/Airtable is the working pattern.
5. **No audio (STT/TTS), image-generation, or video-generation** nodes.
6. **No SSH / shell / Docker** node — blocks n8n's DevOps/server-automation category.

**Headline strengths CtrlChecks already has that n8n templates also chase:**
email triage & auto-response, lead qualification & CRM routing, support-ticket triage,
scheduled reminders, feedback/sentiment classification, meeting-notes→actions, weekly reporting,
FAQ/knowledge chatbots grounded in owned data, and CRM/data sync — **all already shipped as
CtrlChecks templates**, plus a **Business Verification & Compliance** vertical that has **no direct
equivalent in n8n's generic library** and is a genuine differentiator.

---

## 2. Current CtrlChecks Template Source of Truth

> **Current CtrlChecks Template Source of Truth: the production RDS PostgreSQL `templates` table
> (`is_active = true`), served read-only and unauthenticated via `GET /api/templates`.**

Evidence:

- `worker/src/api/templates.ts` reads `getDbClient().from('templates').select('*').eq('is_active', true)`
  (with an optional proxy to `workflow-crud-service`). The endpoint is mounted unauthenticated
  in `worker/src/index.ts`, which is how this audit read the live data.
- `worker/src/api/admin-templates.ts` is the admin CRUD surface (requires a Cognito token + an
  `admin` row in `user_roles`); it writes to the same `templates` table.
- The **Prisma schema is NOT the template source of truth.** `worker/prisma/schema.prisma`
  models a separate "memory system" (`memory_workflows`, `memory_executions`, …). The `templates`
  table is a **raw Postgres table** accessed through the Supabase-style `getDbClient()` wrapper
  over `pg.Pool` — it is not a Prisma model.
- **Repo files are a snapshot, not the runtime source.** `ctrl_checks/templates/src/*.json` (36
  files) and `ctrl_checks/sql_migrations/templates_v2/*.sql` mirror the library, but the running
  application reads the DB. If the two disagree, the **DB wins**.

Live counts confirmed this session:

| Metric | Value |
|---|---|
| Active templates returned by `GET /api/templates` | **36** |
| Categories | 4 |
| `is_featured = true` | 5 |
| Distinct node types used across all 36 | 23 |
| Total historical rows in `templates` table (from prior audits) | ~550 (only 36 active) |

---

## 3. Database Template Architecture

**Storage mechanism**

```
Current Template Storage:  AWS RDS PostgreSQL
Table:                     templates
Accessed through:          worker/src/api/templates.ts  (public read)
                           worker/src/api/admin-templates.ts  (admin CRUD)
                           optional proxy → workflow-crud-service (port 3007)
DB access layer:           getDbClient()  (Supabase-style wrapper over pg.Pool)
ORM:                       none for templates (Prisma models a different subsystem)
```

**`templates` table columns** (from the admin CRUD contract + live payloads):

| Column | Type | Notes |
|---|---|---|
| `id` | uuid / text | Some rows use synthetic ids (`91000000-0000-4000-8000-0000000000NN`) for the "core" set; others are random uuids. |
| `name` | text | Display name |
| `description` | text | Long, benefit-led marketing copy (a library strength) |
| `category` | text | One of the 4 live categories |
| `nodes` | jsonb | React-Flow node array. **Real node type is `node.data.type`; `node.type` is always `"custom"`.** Each node carries `data.config`, `data.label`, `data.icon`, `data.category`, and rich `data.notes` (`why` / `what` / `tips[]` / `family` / `docsHref` / `overview`). |
| `edges` | jsonb | React-Flow edge array (source/target) |
| `difficulty` | text | Beginner / Intermediate / Advanced |
| `estimated_setup_time` | int | Minutes |
| `tags` | text[] | Search/filters |
| `is_featured` | bool | 5 featured |
| `is_active` | bool | Only `true` rows are served |
| `preview_image` | text | Optional |
| `created_by`, `created_at` | uuid / timestamp | Provenance |

**Workflow shape:** templates store `nodes` + `edges` **separately** (not one `definition` blob).
The graph is a React-Flow document; the execution contract reads `node.data.type` and `node.data.config`.

**Runtime template filtering:** `GET /api/templates?category=&search=` filters server-side by
`is_active`, category, and name/description substring. Separately, the frontend can **filter the
gallery by the connections the user already has** (commit `bb0b3f1` "Templates: filter by the
connections you already have").

---

## 4. Existing CtrlChecks Template Library

All 36 live templates. Trigger = first node; "Main nodes" summarizes the distinctive middle of the
flow; Integrations = external services the flow authenticates to.

| # | Template Name | Category | Trigger | Main Nodes | Integrations | Status |
|---|---|---|---|---|---|---|
| 1 | Approval Chance Predictor | Verification | form | airtable → openai_gpt → javascript → airtable | Airtable, OpenAI, Slack, Gmail | Active |
| 2 | Business Details Matcher | Verification | schedule (15m) | airtable → http_request → openai_gpt → if_else | Airtable, HTTP, OpenAI, Gmail | Active |
| 3 | Document Vault — Intake & Auto-Tagging | Verification | form | google_gemini → airtable → javascript | Gemini, Airtable | Active |
| 4 | Document Vault — Smart Search | Verification | chat_trigger | airtable → ai_agent → chat_send | Airtable, OpenAI | Active |
| 5 | License Renewal Reminder | Verification | schedule (daily) | airtable → javascript → gmail → if_else | Airtable, Gmail | Active |
| 6 | Live Status Lookup Bot | Verification | chat_trigger | airtable → javascript → slack_message | Airtable, Slack | Active |
| 7 | Missing Document Finder | Verification | form | google_gemini → airtable → openai_gpt → gmail | Gemini, Airtable, OpenAI, Gmail | Active |
| 8 | New Client Risk Checker | Verification | form | http_request → openai_gpt → if_else → slack_message | HTTP, OpenAI, Airtable, Slack | Active |
| 9 | Smart Alert Co-Pilot | Verification | schedule (10m) | airtable → ai_agent → if_else → slack_message | Airtable, OpenAI, Slack | Active |
| 10 | Submission Package Builder | Verification | schedule | http_request → google_drive → merge → gmail | HTTP, Drive, Gmail, Airtable | Active |
| 11 | Verification Co-Pilot Chat | Verification | chat_trigger | airtable → ai_agent → chat_send | Airtable, OpenAI | Active |
| 12 | Verification Readiness Checker | Verification | form | airtable → http_request → openai_gpt ×2 → gmail | Airtable, HTTP, OpenAI, Gmail | Active |
| 13 | Expense Policy Checker | Finance | form | openai_gpt → postgresql → if_else → slack_message | OpenAI, Postgres, Slack | Active |
| 14 | Finance / Compliance Agent ⭐ | Finance | webhook | openai_gpt → if_else → postgresql → slack_webhook → gmail | OpenAI, Postgres, Slack, Gmail | Active/Featured |
| 15 | Invoice Approval Triage | Finance | form | openai_gpt → if_else → postgresql → slack_message → gmail | OpenAI, Postgres, Slack, Gmail | Active |
| 16 | Payment Failure Recovery | Finance | webhook | openai_gpt → gmail → if_else → slack_message | OpenAI, Gmail, Slack | Active |
| 17 | Vendor Due Diligence | Finance | form | http_request → openai_gpt → airtable → if_else → slack | HTTP, OpenAI, Airtable, Slack | Active |
| 18 | Clinic Appointment Reminder | Healthcare | schedule | airtable → if_else → gmail → airtable | Airtable, Gmail | Active |
| 19 | Insurance Pre-Authorization Tracker | Healthcare | schedule | airtable → if_else ×2 → slack_message → gmail | Airtable, Slack, Gmail | Active |
| 20 | Lab Report Follow-up | Healthcare | form | openai_gpt → if_else → slack_message → gmail | OpenAI, Slack, Gmail | Active |
| 21 | Patient Feedback Classifier | Healthcare | form | openai_gpt → airtable → if_else → slack_message | OpenAI, Airtable, Slack | Active |
| 22 | Patient Intake Triage | Healthcare | form | openai_gpt → if_else → slack_message → gmail | OpenAI, Slack, Gmail | Active |
| 23 | Client Priority Ranker | Sales/Ops | schedule (weekly) | airtable → openai_gpt → javascript → slack_message | Airtable, OpenAI, Slack | Active |
| 24 | CRM Data Cleanup Assistant | Sales/Ops | schedule | hubspot → if_else → slack_message → hubspot | HubSpot, Slack | Active |
| 25 | Cross-Platform Sync Engine | Sales/Ops | schedule (15m) | airtable → hubspot → google_sheets → slack → airtable | Airtable, HubSpot, Sheets, Slack | Active |
| 26 | Customer Churn Risk Alert | Sales/Ops | schedule | airtable → openai_gpt → if_else → slack_message | Airtable, OpenAI, Slack | Active |
| 27 | Customer Support Agent ⭐ | Sales/Ops | chat_trigger | memory → switch → postgresql → openai_gpt ×3 → merge → if_else | OpenAI, Postgres, Slack | Active/Featured |
| 28 | Employee Onboarding Checklist | Sales/Ops | schedule | airtable → if_else → gmail → slack_message → airtable | Airtable, Gmail, Slack | Active |
| 29 | FAQ Answering Assistant | Sales/Ops | chat_trigger | airtable → openai_gpt → if_else → chat_send → slack | Airtable, OpenAI, Slack | Active |
| 30 | HR / Hiring Workflow Agent ⭐ | Sales/Ops | webhook | openai_gpt ×2 → if_else → postgresql → gmail ×2 | OpenAI, Postgres, Gmail | Active/Featured |
| 31 | Internal Knowledge / Ops Agent ⭐ | Sales/Ops | chat_trigger | postgresql → if_else → openai_gpt → postgresql → slack_webhook → merge | OpenAI, Postgres, Slack | Active/Featured |
| 32 | Meeting Notes to Action Items | Sales/Ops | form | openai_gpt → javascript → postgresql → slack_message | OpenAI, Postgres, Slack | Active |
| 33 | Overdue Task Tracker | Sales/Ops | schedule (hourly) | airtable → javascript → slack → if_else → slack → airtable | Airtable, Slack | Active |
| 34 | Sales & Lead Qualification Agent ⭐ | Sales/Ops | webhook | openai_gpt → if_else → hubspot → gmail ×2 | OpenAI, HubSpot, Gmail | Active/Featured |
| 35 | Support Ticket Triage | Sales/Ops | form | openai_gpt → postgresql → if_else → slack_message → gmail | OpenAI, Postgres, Slack, Gmail | Active |
| 36 | Weekly Pipeline Report | Sales/Ops | schedule (weekly) | airtable → openai_gpt → gmail → slack_message | Airtable, OpenAI, Gmail, Slack | Active |

### Representative detail (patterns that recur across the library)

**Template: Sales & Lead Qualification Agent** (Featured)
- **Category:** Sales, Support & Internal Operations
- **Use Case:** Capture inbound lead → AI-qualify/score → route qualified to CRM + book, nurture the rest.
- **Trigger:** webhook (form/landing-page POST)
- **Workflow:**
  ```
  webhook → javascript (normalize) → openai_gpt (qualify+score) → javascript
    → if_else (qualified?)
        ├── yes → hubspot (create/update) → gmail (booking invite)
        └── no  → gmail (nurture follow-up)
    → log_output
  ```
- **Required Integrations:** OpenAI, HubSpot, Gmail
- **AI Operations:** lead scoring + qualification reasoning (single LLM call)
- **Notes:** Pure linear + one branch. No iteration needed (one lead per trigger). Fully robust.

**Template: Customer Support Agent** (Featured — the most complex, 16 nodes)
- **Use Case:** Chat support agent: detect intent, fetch order/customer data, answer or escalate by confidence.
- **Trigger:** chat_trigger
- **Workflow:**
  ```
  chat_trigger → memory (load) → javascript → switch (intent)
    → postgresql (fetch) → openai_gpt ×3 (answer drafts / confidence)
    → merge → if_else (confident?)
        ├── yes → memory (save) → postgresql (log)
        └── no  → slack_webhook (escalate to human)
    → log_output
  ```
- **Required Integrations:** OpenAI, PostgreSQL, Slack
- **AI Operations:** intent detection, answer generation, confidence scoring
- **Notes:** Uses `memory` for conversation state and `switch` for intent routing — the richest use of control flow in the library.

**Template: Business Details Matcher** (illustrates the no-iteration workaround)
- **Use Case:** Detect silent verification-rejection cause (name/address mismatch across website vs GST vs bank).
- **Trigger:** schedule (every 15 min)
- **Workflow:**
  ```
  schedule → airtable (read ONE unchecked client) → javascript
    → http_request (fetch website) → openai_gpt (compare identities)
    → javascript → airtable (write result) → gmail (report)
    → airtable (mark checked) → javascript → if_else
  ```
- **Notes:** The description explicitly says: *"No instant Airtable-update trigger exists yet, so this
  polls every 15 minutes and checks one client per run, marking each as checked so it is never
  re-reported."* This is the canonical CtrlChecks substitute for n8n's default item-iteration.

### Library composition observations

- **Triggers used:** `form` (13) and `schedule` (13) dominate; `chat_trigger` (6) and `webhook` (4)
  round it out. **No template uses any of the ~20 push/webhook triggers that are actually wired**
  (Gmail/Drive/Sheets/Calendar/GitHub/Stripe/etc.) — see §5 and §21.
- **Node concentration:** `javascript` (52 uses), `airtable` (37), `if_else` (29), `openai_gpt` (28),
  `slack_message` (23), `google_gmail` (20) account for the bulk of every flow. Data lives in
  **Airtable or PostgreSQL**; notifications go to **Slack or Gmail**; intelligence is **OpenAI/Gemini**.
- **AI-agent nodes** (`ai_agent`) appear in only 3 templates; most "AI" is single `openai_gpt` calls.
- **Branching is shallow:** `if_else` is common; `switch` appears once; there is **no template with
  true parallel fan-out** (consistent with the runtime).

---

## 5. Existing Template Filtering / Migration Analysis

**Were the current DB templates sourced from a larger dataset? Yes.** The `templates` table has
accreted ~550 rows over time, of which only **36 are `is_active = true`**. History (git + SQL migrations):

| Phase | Evidence | What happened |
|---|---|---|
| Initial seeds | `09_comprehensive_templates.sql`, `10_advanced_ai_agent_templates.sql`, `05_role_based_templates.sql`, `25_workflow_sample_data.sql` | Early template + sample rows seeded via SQL. |
| Bulk refresh | `sql_migrations/templates_refresh/00_delete_all_templates.sql` + `01..10_seed_templates_batch_*.sql` | A 10-batch refresh; the ~500 old rows are the **deactivated remainder**, not the live set. |
| Verification vertical | commit `133c901` "Add Business Verification & Compliance template category" | The 15 verification templates were **inserted straight into RDS** (no repo file at the time). |
| Library v2 | commits `52b3795`, `ffb4eae` "Template library v2: fix all 20 templates, add notes, show required connections" | The active set was fixed for runtime-contract defects and enriched with per-node `notes`. Repo mirror created under `ctrl_checks/templates/` + `sql_migrations/templates_v2/`. |
| Connection-aware gallery | commit `bb0b3f1` "Templates: filter by the connections you already have" | Runtime filtering by the user's existing connections. |
| Expansion to 36 | commit `2b51d36` "Expand template library and fix admin template editing" (current HEAD) | Grew from 20 → 36 active; per-node `notes.why`/`notes.tips` now present in live JSON. |

**Filtering criteria (verified from the v2 work):** templates were retained/curated primarily for
**runtime-contract correctness** — i.e., that every node type exists in both the backend
(`node-library.ts`) and frontend (`nodeTypes.ts`) catalogs, that referenced output keys resolve,
and that graphs are valid DAGs. A CI gate exists:
`worker/src/core/registry/__tests__/template-library-contract.test.ts`. Categories/tags were
normalized during v2. There is **no evidence** the retained set was chosen by popularity or by
importing an external (e.g., n8n) library — it is a hand-authored, vertical-focused set.

---

## 6. CtrlChecks Node & Operation Capability Baseline

**178 registered node types across 30 categories** (from `worker/public/node-library.json`,
hydrated by the unified node registry). Summary by category:

| Category | Count | Notable nodes |
|---|---|---|
| triggers | 29 | webhook, form, chat_trigger, schedule, interval, manual_trigger, gmail_trigger, outlook_trigger, google_calendar/sheets/drive_trigger, slack/discord/telegram/whatsapp/instagram/facebook/microsoft_teams_trigger, github/gitlab/jira/linear/trello_trigger, stripe/shopify_trigger, typeform/tally_trigger, error_trigger, workflow_trigger |
| ai | 16 | ai_agent, openai_gpt, anthropic_claude, google_gemini, cohere, mistral, ollama, huggingface, langchain, memory, tool, sentiment_analyzer, text_summarizer, ai_chat_model, chat_model, lightricks |
| data | 16 | javascript, aggregate, csv, date_time, edit_fields, html, json_parser, limit, math, merge_data, rename_keys, set, set_variable, sort, text_formatter, xml |
| database | 15 | postgresql, mysql, sql_server, oracle_database, mongodb, redis, airtable, supabase, firebase, google_cloud_storage, pinecone, qdrant, timescaledb, database_read/write |
| crm | 14 | hubspot, salesforce, pipedrive, zoho_crm, zendesk, freshdesk, intercom, activecampaign, mailchimp, microsoft_dynamics, odoo, sap, tally, intuit_smes |
| output (comms) | 14 | slack_message, slack_webhook, email, amazon_ses, sendgrid, mailgun, discord, discord_webhook, microsoft_teams, telegram, twilio, whatsapp_cloud, chat_send, log_output |
| logic | 12 | if_else, switch, filter, merge, loop, split_in_batches, wait, function, function_item, noop, stop_and_error, error_handler |
| google | 8 | google_gmail, google_sheets, google_doc, google_drive, google_calendar, google_contacts, google_tasks, google_bigquery |
| http_api | 8 | http_request, http_post, graphql, respond_to_webhook, webhook_response, workday, xero, schedulewise |
| devops | 7 | github, gitlab, bitbucket, jira, jenkins, netlify, vercel |
| file | 7 | aws_s3, dropbox, onedrive, ftp, sftp, read_binary_file, write_binary_file |
| flow | 5 | parallel, retry, return, timeout, try_catch |
| productivity | 5 | notion, trello, linear, calendly, typeform |
| social | 5 | twitter, linkedin, facebook, instagram, youtube |
| ecommerce | 4 | stripe, paypal, shopify, woocommerce |
| cms / communication / queue / cache | 2 each | wordpress, contentful / whatsapp, zoom_video / queue_push, queue_consume / cache_get, cache_set |
| actions/microsoft/payment/utility/workflow | 1 each | clickup / outlook / chargebee / delay / execute_workflow |

**Operations model:** each node's operations/config are defined once in the unified node registry
(`inputSchema` / `outputSchema` / `credentialSchema` / `defaultConfig` / `execute`). The
general-purpose escape hatches are **`javascript`** (arbitrary transform) and **`http_request` /
`graphql`** (any REST/GraphQL API) — these are what make "potentially supported" use cases reachable.

### Control-flow / data-plane capabilities (and their limits)

| Capability | Supported? | Evidence / caveat |
|---|---|---|
| Linear DAG (Trigger→Action→…→Terminal) | ✅ | Default topology; topological execution in `execute-workflow.ts`. |
| Conditional branch (`if_else`) | ✅ (one comparison per row) | Compound expressions like `a && b` do **not** parse; use separate condition rows. |
| Multi-way branch (`switch`) | ✅ | Used in Customer Support Agent. |
| Merge branches (`merge`) | ✅ | Used in several templates. |
| Filter (`filter`) | ✅ | Drops non-matching items as data (no fan-out). |
| Wait / delay | ✅ | `wait`, `delay`, `timeout`. |
| Parallel / retry / try-catch | ✅ (nodes exist) | `parallel`, `retry`, `try_catch`, `error_handler`, `stop_and_error`. |
| **Iterate over N items / batch fan-out** | ❌ **Not supported** | `loop` and `split_in_batches` expose the array but do **not** execute the downstream subgraph per item (`execute-workflow.ts:13934`, `:13976`). Use scheduled one-record-per-run drain. |
| Cross-run persistent state | ⚠️ workaround | `set_variable` is per-execution only; persist via an Airtable/DB marker column. |
| Template expression language | ⚠️ limited | Resolver supports `{{$json.x}}` / `{{json.x}}` / `{{input.x}}` / `{{trigger.x}}` / named-node paths. **No `$now`, `$credentials`, or function calls.** |
| Sub-workflow call | ✅ (basic) | `execute_workflow` node exists; not a full "workflow-as-tool" iterator. |

---

## 7. CtrlChecks Control Checks / Validation Capabilities

CtrlChecks' namesake is validation, and its validation surface is genuinely broader than a stock
n8n install — this is a real differentiator worth centering in template marketing.

| Layer | Where | What it checks |
|---|---|---|
| **Node type validity** | frontend `workflowValidation.ts` + backend `node-library.ts` `CANONICAL_NODE_TYPES` | A node type must exist in **both** catalogs; unknown types are rewritten (historically to `http_request`) — the CI contract test guards templates against this. |
| **DAG integrity** | `UnifiedGraphOrchestrator` (`unified-graph-orchestrator.ts`) | No orphan nodes, no cycles, no duplicate edges, no uncontrolled fan-out; all graph mutations funnel through one place. |
| **Node input schema validation** | unified registry `inputSchema` at execution | Required inputs validated before `execute()`; typed fields. |
| **Credential discovery + readiness gate** | `comprehensive-credential-scanner.ts`, connection readiness gate service, `/missing-items` envelope | Scans a generated/loaded workflow for required credentials and blocks/annotates until the user's connections satisfy them (scope-aware). |
| **Runtime credential injection** | `credential-resolver.ts` | Secrets injected just before execution, never stored in workflow JSON. |
| **Template library contract test** | `template-library-contract.test.ts` | CI gate that catches template runtime-contract defects. |
| **Business "control checks" domain logic** | the Verification & Compliance templates themselves | Domain-level checks (privacy-policy present, business-detail match across sources, domain age, risk scoring) — the product's vertical specialty. |

n8n's equivalent (expression editor validation, node parameter validation, pinned-data testing) is
per-node and developer-facing; CtrlChecks' readiness-gate + credential-scanner is more of a
**pre-flight "will this actually run for this user" gate**, which suits a template-marketplace model.

---

## 8. N8N Template Category Landscape

n8n's public library reports **11,190 community templates**. Official top-level categories:

1. **AI** (fastest-growing) 2. **Sales** 3. **IT Ops** 4. **Marketing**
5. **Document Ops** 6. **Support** 7. **Other**

Top integrations surfaced on the library: **Google Sheets, OpenAI, Telegram, Gmail, MySQL,
Postgres, Discord, Google Drive, Slack, Notion, Microsoft Outlook.**

The curated `awesome-n8n-templates` set (~280 hand-picked) groups them more granularly, which maps
cleanly to capability areas:

| n8n curated group | ~count | Core capability exercised |
|---|---|---|
| Gmail & Email Automation | 15 | email triage/label/draft/respond + AI |
| Telegram | 20 | chat bot, voice/audio, multimodal |
| Google Drive & Sheets | 16 | sheet CRUD, Drive RAG, doc summarize |
| WordPress | 6 | AI content → CMS publish |
| PDF & Document Processing | 12 | **PDF/vision extraction** |
| Discord | 3 | chat bot / notifications |
| Database & Storage | 5 | chat-with-DB, SQL gen, vectors |
| DevOps / Server | 3 | **SSH/Docker/Linux** |
| Airtable | 5 | Airtable agent/chat |
| Notion | 10 | Notion KB, vector upsert |
| Slack | 9 | slackbots, ticketing, enrichment |
| OpenAI & LLMs | 26 | agents, RAG, content, extraction |
| WhatsApp | 5 | chatbot, RAG |
| Social Media (IG/Twitter/…) | 15 | content gen, posting, **image gen** |
| Other Integrations | 39 | long tail via HTTP + niche apps |
| Forms & Surveys | 4 | form intake + AI |
| AI Research / RAG / Data Analysis | 39 | **scraping, vectors, deep research** |

---

## 9. N8N Template Research Dataset

The representative dataset used for mapping (drawn from the curated set + official popular list).
Grouped by the capability the template *requires*, since that is what determines CtrlChecks support:

**A. Notify/route from a data source (CtrlChecks-native):** Automated form response (Sheets→Slack→Gmail→Contacts);
Contact-form management (Sheets+Slack+Gmail); Lead response & classification (Sheets→OpenAI→Slack);
Enrich Pipedrive org + notify Slack; Screen applicants with AI + notify HR; Weekly analytics digest to email/Telegram.

**B. Email intelligence:** Auto-label Gmail with AI; Compose Gmail reply draft with AI; InboxZero Lite classifier;
Cold email writer (website-grounded); AI email auto-responder; Auto-categorize Outlook emails.

**C. Chatbots grounded in owned data:** Chat with a Google Sheet; Chat with Postgres DB;
IT-Ops SlackBot over knowledge base; Notion KB assistant; WooCommerce support agent;
SupportFlow Lite support chatbot; Slack slash-command AI bot.

**D. RAG with vector stores:** RAG chatbot for Company Documents (Drive+Gemini); Notion→Pinecone;
Store Notion pages as vectors in Supabase; Financial/Tax assistant (Qdrant+Mistral);
Chat with GitHub docs (Pinecone+OpenAI); Movie recommendations (Qdrant).

**E. Document / PDF / vision:** Ask questions about a PDF; Invoice extraction (LlamaParse/OpenAI);
CV/resume PDF parsing (vision); Chat with PDF citing sources; Extract license plate from image;
Extract PDF+image to CSV (Vertex/Gemini).

**F. Content & social generation:** Blog post from keywords → WordPress; Content repurposing (blog→LinkedIn/X/email);
OpenAI tweet generator; Instagram content from trends (**image gen**); Social media amplifier; YouTube→X.

**G. Scraping / research:** Scrape & summarize webpages; Autonomous AI crawler; Deep Research agent (Apify+o3);
Trustpilot review scraping+sentiment; Hacker News scraper; Perplexity research→HTML.

**H. DevOps / server:** Linux system update via webhook (SSH); Docker Compose controller (SSH); Disk-space watchdog;
ChatGPT code review in GitLab MR; Classify Linear bugs with GPT-4.

**I. Audio / video / voice:** Telegram voice assistant (STT); Translate Telegram audio; Obsidian notes read-aloud (TTS);
Zoom AI meeting assistant; Song generation (Suno); Video generation (Seedance).

**J. Sync / ETL / long-tail apps:** Airtable↔Sheets auto-sync; ETL pipeline (Twitter→Mongo/Postgres);
Pennylane invoices from webhook; Todoist inbox organizer; UTM link + QR generator; niche APIs via HTTP.

---

## 10. Existing CtrlChecks Templates vs Similar N8N Templates

For each shipped CtrlChecks template, the closest n8n analog(s) and the structural delta:

| CtrlChecks Template | Similar n8n Template(s) | Similarity | n8n Structure | CtrlChecks Structure | Key Difference |
|---|---|---|---|---|---|
| Sales & Lead Qualification Agent | "Automate lead response with Sheets, OpenAI, Gmail, Slack"; "Qualify leads via GPT-4" | High | Sheets trigger → validate → OpenAI classify → CRM/Slack/Gmail | webhook → OpenAI → if_else → HubSpot → Gmail | n8n triggers off a Sheet row; CtrlChecks off a webhook (1 lead/run either way) |
| Support Ticket Triage / Customer Support Agent | "SupportFlow Lite"; "Support ticketing with Slack+Linear"; "IT-Ops SlackBot" | High | chat/email trigger → intent → KB fetch → answer/escalate | chat_trigger → switch → postgres → OpenAI ×3 → if_else → escalate | Comparable; CtrlChecks lacks a Linear-ticket create step in-template (node exists) |
| FAQ Answering Assistant / Internal Knowledge Ops Agent | "Chat with a Google Sheet"; "Notion KB assistant"; "Chat with Postgres" | High (RAG-lite) | chat → **vector retrieve** → LLM answer | chat → SQL/Airtable lookup → OpenAI → confidence gate | CtrlChecks grounds via **SQL/Airtable filter**, not vector similarity |
| Patient/Customer Feedback Classifier | "AI customer feedback sentiment analysis"; "Analyze feedback → Mattermost" | High | trigger → sentiment → store/notify | form → OpenAI → store → if_else → Slack | Near-identical; CtrlChecks also has a dedicated `sentiment_analyzer` node |
| Meeting Notes to Action Items | "Zoom AI Meeting Assistant"; "Meeting notetaker (Recall.ai)" | Medium | **live transcription** → summarize → tasks | form (paste notes) → OpenAI → Postgres → Slack | CtrlChecks has **no transcription**; requires pasted text |
| Weekly Pipeline Report / Client Priority Ranker | "GA report to email+Telegram"; analytics digests | High | schedule → read → summarize → send | schedule → airtable → OpenAI → gmail/slack | Equivalent (both single-run summaries) |
| Cross-Platform Sync Engine / CRM Data Cleanup | "Airtable↔Sheets auto-sync"; CRM enrichment | Medium | trigger → **loop rows** → upsert | schedule → **one changed row/run** → HubSpot/Sheets → marker | n8n iterates all rows; CtrlChecks drains one per run (no iteration) |
| Vendor Due Diligence / New Client Risk Checker | "Enrich company metadata with Apify"; "Competitor research" | Medium | trigger → **scrape** → LLM → store | form → http_request (static fetch) → OpenAI → store → Slack | n8n uses real scrapers; CtrlChecks does static `http_request` only |
| Expense/Invoice/Finance Agent | "Reconcile rent payments"; "Pennylane invoices"; invoice extraction | Medium | webhook/PDF → **extract** → classify → store | form/webhook (structured JSON) → OpenAI → Postgres → Slack/Gmail | CtrlChecks **cannot parse the invoice PDF**; expects structured input |
| Document Vault Intake/Search | "Ask questions about a PDF"; "Chat with PDF"; Drive RAG | Low-Medium | upload → **PDF/vision extract** → vector → chat | form upload → Gemini (tag) → Airtable → chat → Airtable lookup | CtrlChecks tags via multimodal-ish Gemini but stores **metadata**, not extracted full text / vectors |
| License Renewal / Appointment / Pre-Auth Reminders | "Automatic payment reminders from Sheets" | High | schedule → read → send reminder | schedule → airtable → if_else → gmail → marker | Equivalent pattern |
| Business Verification suite (Approval Predictor, Readiness Checker, Details Matcher, Submission Builder, Co-Pilot) | **No direct n8n equivalent** | — | — | domain-specific verification checks | **CtrlChecks-unique vertical** |

**Takeaway:** CtrlChecks already covers the *high-frequency* n8n patterns (notify-from-data, email
intelligence, lead/ticket triage, reminders, reporting, owned-data chatbots) and owns a vertical
(verification/compliance) n8n's generic library does not. The gaps cluster in **PDF/vision,
vectors/RAG, scraping, transcription, and item-iteration**.

---

## 11. Fully Supported N8N Templates

Every required node type, trigger, and control-flow element exists, with **no iteration and no
missing operation**. CtrlChecks can recreate these today (many it already has as templates).

- Auto-label / categorize incoming email with AI (Gmail/Outlook + openai_gpt + gmail update)
- Compose AI reply draft for inbound email (gmail_trigger + openai_gpt + gmail)
- Lead response & classification, single lead (webhook/form + openai_gpt + hubspot/gmail/slack)
- Contact-form / form-response management (form + postgres/airtable + slack + gmail)
- Support-ticket triage & routing (form/chat + openai_gpt + db + if_else + slack/gmail)
- Slack/Discord/Teams notification from a data change (schedule + db + slack_message)
- Feedback / review sentiment classification + alert (form + sentiment_analyzer/openai + db + slack)
- Meeting-notes (pasted) → action items → task post (form + openai_gpt + db + slack)
- Weekly/scheduled report from CRM/DB → email + Slack (schedule + db + openai_gpt + gmail/slack)
- Scheduled reminders / SLA escalation (schedule + db + if_else + gmail/slack + marker)
- CRM enrichment from a known API + notify (form + http_request + openai_gpt + hubspot + slack)
- New-bug / new-item classification (webhook or *_trigger + openai_gpt + linear/jira/db)
- GitLab/GitHub MR/PR AI code review comment (gitlab/github trigger + openai_gpt + gitlab/github)
- AI content draft → publish to WordPress/Notion (form/schedule + openai_gpt + wordpress/notion)
- Owned-data chatbot / FAQ (SQL/Airtable-grounded) (chat_trigger + db/airtable + openai_gpt + chat_send)
- Enrich CRM org + Slack notify (webhook + http_request + openai_gpt + pipedrive/hubspot + slack)

---

## 12. Mostly Supported N8N Templates

Core is buildable, but one substitution is required — usually **poll-one-record instead of
push/iterate**, or **static `http_request` instead of a scraper**.

- Google-Sheet new-row lead pipeline processing **many** rows → build as **google_sheets_trigger OR
  schedule + one-row-per-run**. Single-row: fully supported; whole-sheet batch: substitution needed.
- Airtable-driven automations ("when a record changes, do X") → **no Airtable trigger**; use schedule
  poll + marker (the pattern the shipped templates already use).
- Airtable ↔ Sheets / CRM sync across many records → one changed record per run + marker.
- Cold-email writer "grounded in the prospect's website" → `http_request` fetches HTML, `html`/JS
  parses it; works for **static** sites only (no JS rendering).
- Daily digest of unread emails → gmail_trigger/schedule + gmail read + openai_gpt + slack/telegram;
  works per-message, not as a single batched digest of N messages in one run without manual concat.
- Pipedrive/HubSpot reply qualification → CRM node + openai_gpt; fine if one record per run.
- Classify & tag many blog posts → per-post supported; whole-catalog batch needs the drain pattern.

---

## 13. Partially Supported N8N Templates

Core intent reachable, but a **key operation is missing**, forcing a materially degraded version.

- **RAG chatbot over documents / knowledge base** → `ai_agent` + `memory` + `pinecone`/`qdrant`
  nodes exist, **but there is no embeddings node and no chunking step**. Working version = RAG-lite:
  store text in SQL/Airtable and retrieve by keyword/filter (what shipped templates do). True
  semantic vector RAG is not turn-key.
- **PDF-based intake (invoice/resume/contract)** → no PDF text-extraction node. Partial only if the
  data arrives already structured (JSON/webhook) or the user pastes text into a form.
- **YouTube comment / video analysis** → `youtube` node exists (fetch), but summarizing long
  transcripts requires the transcript source; no transcription node.
- **Analytics report from Google Analytics/Umami/SERPBear** → no dedicated node; reachable only via
  `http_request` to the provider API (counts as partial-via-HTTP, see §14).
- **Multi-platform content repurposing with posting** → text generation ✅; posting to X/LinkedIn/
  Instagram ✅ (social nodes exist); but **image/banner generation** is missing.
- **ETL to a data warehouse** → `google_bigquery`, `postgresql`, `mongodb` exist; but bulk
  row-by-row transform relies on `javascript` over an array, not per-item nodes.

---

## 14. Potentially Supported N8N Templates

Buildable via the **generic `http_request` / `graphql` + `javascript`** escape hatch (no dedicated
node, so more setup and no first-class credential UX). Robustness depends on the third-party API.

- Any niche SaaS without a dedicated node: Perplexity, Firecrawl, Apify, BannerBear, Printify,
  Pennylane, NocoDB, Baserow, Cal.com, ClickUp (has node), Todoist, Strava, TradingView, etc.
- Public data APIs: Open-Meteo weather, CoinPaprika/Bitcoin price, Hacker News, Reddit (read),
  Google Analytics Data API, SERP APIs — all via `http_request`.
- Webhook-in / webhook-out integrations to arbitrary systems (`webhook` + `http_request` + `respond_to_webhook`).
- Simple screenshot/render services (URLbox/Latchshot) via `http_request` returning a URL.
- LLM providers not first-classed for a step: call any via `http_request` if not covered by the
  16 AI nodes (most are: OpenAI, Anthropic, Gemini, Cohere, Mistral, Ollama, HuggingFace).

**Caveat:** "potentially supported" means *technically reachable*, not *template-ready*. Each needs
custom headers/auth via the generic credential types (`api_key`, `bearer_token`, `basic_auth`,
`custom_header`, `query_auth`) and hand-built request/response mapping in `javascript`.

---

## 15. Unsupported N8N Templates

Require a capability CtrlChecks **does not currently have**. These define the real product roadmap.

| n8n use case | Missing capability |
|---|---|
| Process **all** rows/files/emails in one run; per-item fan-out | **No iteration / batch execution** in DAG runtime |
| Ask-questions-about-a-PDF; invoice/resume PDF extraction; chat-with-PDF | **No PDF/document text-extraction node** |
| Image analysis, license-plate/OCR, CV vision parsing | **No vision/multimodal image input node** |
| AI image generation, background removal, banner/thumbnail creation | **No image-generation/manipulation node** |
| Song/video generation (Suno, Seedance), TTS read-aloud, voice assistants | **No audio/TTS/video-generation nodes** |
| Speech-to-text (Telegram voice, audio translation) | **No STT node** |
| Live meeting transcription (Recall.ai/Fireflies/Zoom transcript) | **No transcription integration** |
| JS-rendered web scraping / autonomous crawling / deep research | **No headless browser / crawler** (only static `http_request`) |
| True semantic RAG (documents → chunk → embed → vector search) | **No embeddings/chunking node** (vector stores exist but pipeline incomplete) |
| Linux update / Docker control / disk watchdog | **No SSH / shell / Docker node** |
| Local-file ETL (read a local Excel/SQLite on the host) | Sandboxed cloud runtime; no local FS/SQLite node (`csv`/`xml` parse only) |
| External-workflow-as-a-tool, dynamic multi-agent tool graphs | `execute_workflow` is basic; no agent-tool iteration |

---

## 16. Buildable But Missing From CtrlChecks Templates

Use cases fully within current capabilities (§11/§12) that **are not yet in the 36-template library**
— the fastest, lowest-risk library-growth wins:

1. **AI Email Triage & Auto-Label** (gmail_trigger + openai_gpt + gmail) — top n8n category, zero gaps.
2. **AI Reply-Draft Assistant for Inbox** (gmail_trigger + openai_gpt + gmail draft).
3. **New-Row Lead Pipeline** using the real **google_sheets_trigger** (showcases push triggers).
4. **GitHub/GitLab PR AI Code Review** (github/gitlab_trigger + openai_gpt + comment).
5. **New-Bug Auto-Classification** in Linear/Jira (linear/jira_trigger + openai_gpt + linear/jira).
6. **Stripe Payment-Failure / Dunning** using the real **stripe_trigger** (currently the template uses a generic webhook).
7. **Shopify New-Order Ops** (shopify_trigger + openai_gpt + slack/gmail).
8. **Telegram/WhatsApp Support Bot** (telegram/whatsapp trigger + openai_gpt + reply) — huge n8n demand.
9. **Notion/WordPress AI Content Publisher** (schedule/form + openai_gpt + notion/wordpress).
10. **CRM Org Enrichment + Slack** (webhook + http_request + openai_gpt + hubspot/pipedrive + slack).
11. **Calendar-driven Meeting Prep** (google_calendar_trigger + openai_gpt + gmail/slack).
12. **Scheduled Competitor/News Digest** (schedule + http_request + openai_gpt + gmail) — static sources.
13. **RAG-lite Docs Assistant over Postgres/Airtable** (generalize the Internal Knowledge Ops Agent).
14. **Discord Community Alert Bot** (discord_trigger/schedule + openai_gpt + discord).

**Trigger-modernization sub-theme:** the current library uses only form/schedule/chat/webhook, yet
~20 push triggers are wired. Re-issuing several templates with real event triggers (Sheets, Stripe,
Shopify, Gmail, Calendar, GitHub) would both improve UX and *demonstrate* the platform's trigger breadth.

---

## 17. Detailed Node-by-Node Mapping

n8n node → CtrlChecks equivalent (or gap):

| n8n node / concept | CtrlChecks node | Status |
|---|---|---|
| Manual/Cron/Schedule Trigger | `manual_trigger`, `schedule`, `interval` | ✅ |
| Webhook | `webhook` (+ `respond_to_webhook`, `webhook_response`) | ✅ |
| n8n Form Trigger | `form` | ✅ |
| Chat Trigger | `chat_trigger` (+ `chat_send`) | ✅ |
| Gmail / Gmail Trigger | `google_gmail` / `gmail_trigger` | ✅ |
| Outlook / Trigger | `outlook` / `outlook_trigger` | ✅ |
| Google Sheets / Trigger | `google_sheets` / `google_sheets_trigger` | ✅ |
| Google Drive / Trigger | `google_drive` / `google_drive_trigger` | ✅ |
| Google Calendar / Trigger | `google_calendar` / `google_calendar_trigger` | ✅ |
| Slack / Trigger | `slack_message`, `slack_webhook` / `slack_trigger` | ✅ |
| Telegram / Discord / Teams / WhatsApp | `telegram`,`discord`,`microsoft_teams`,`whatsapp_cloud` (+ triggers) | ✅ |
| Airtable | `airtable` (no trigger) | ✅ node / ❌ trigger |
| Postgres / MySQL / SQL Server / Oracle / Mongo / Redis | `postgresql`,`mysql`,`sql_server`,`oracle_database`,`mongodb`,`redis` | ✅ |
| Notion / Trello / ClickUp / Linear / Jira | `notion`,`trello`,`clickup`,`linear`,`jira` (+ triggers for last 3-ish) | ✅ |
| HubSpot / Salesforce / Pipedrive / Zoho / Zendesk / Freshdesk / Intercom | present in `crm` category | ✅ |
| Stripe / PayPal / Shopify / WooCommerce | `stripe`,`paypal`,`shopify`,`woocommerce` (+ stripe/shopify triggers) | ✅ |
| GitHub / GitLab / Bitbucket / Jenkins / Vercel / Netlify | present in `devops` category (+ triggers) | ✅ |
| OpenAI / Anthropic / Gemini / Cohere / Mistral / Ollama / HuggingFace | present in `ai` category | ✅ |
| AI Agent / Memory / Tool | `ai_agent`, `memory`, `tool` | ✅ |
| **Embeddings** | — | ❌ **gap** |
| Vector Store (Pinecone/Qdrant/Supabase/PGVector) | `pinecone`, `qdrant`, `supabase` | ⚠️ store yes, embed no |
| **Default Data Loader / Text Splitter (chunking)** | — | ❌ **gap** |
| **Extract from File (PDF/Docx)** | — | ❌ **gap** (`read_binary_file` only) |
| **Edit Image / Analyze Image (vision)** | — | ❌ **gap** |
| HTTP Request / GraphQL | `http_request`, `http_post`, `graphql` | ✅ |
| **HTML Extract / scrape** | `html` (static parse only) | ⚠️ static only |
| Code (JS/Python) | `javascript` | ✅ (JS only) |
| Item Lists / Split In Batches / Loop Over Items | `split_in_batches`, `loop` | ❌ **no iteration** |
| IF / Switch / Filter / Merge / Wait / NoOp | `if_else`,`switch`,`filter`,`merge`,`wait`,`noop` | ✅ |
| Set / Edit Fields / Rename Keys / Sort / Aggregate / Limit | present in `data` category | ✅ |
| Date & Time / Crypto / Compression | `date_time` ✅ / crypto ❌ / compression ❌ |  mixed |
| CSV / XML / JSON parse | `csv`,`xml`,`json_parser` | ✅ |
| **SSH / Execute Command** | — | ❌ **gap** |
| FTP / SFTP / S3 / Dropbox / OneDrive / GCS | present in `file` category | ✅ |
| Twilio / SendGrid / Mailgun / SES | `twilio`,`sendgrid`,`mailgun`,`amazon_ses` | ✅ |
| Execute Sub-workflow | `execute_workflow` | ⚠️ basic |

---

## 18. CtrlChecks Workflow Designs (recreating popular n8n templates)

Concrete CtrlChecks graphs for the highest-demand buildable n8n use cases:

**AI Email Triage & Auto-Label**
```
gmail_trigger → openai_gpt (classify: category+urgency+intent)
  → switch (category)
      ├── billing  → google_gmail (apply label) → slack_message (#billing)
      ├── urgent   → slack_message (#oncall) → google_gmail (label)
      └── other    → google_gmail (label)
  → log_output
```

**PR Code Review (GitHub)**
```
github_trigger (PR opened) → http_request (fetch diff) → openai_gpt (review)
  → if_else (issues found?)
      ├── yes → github (post review comment)
      └── no  → github (approve/comment "LGTM")
```

**Stripe Dunning / Payment-Failure Recovery (with real trigger)**
```
stripe_trigger (invoice.payment_failed) → javascript (extract customer)
  → openai_gpt (classify failure reason) → google_gmail (customer notice)
  → if_else (manual recovery?) → slack_message (#finance)
```

**RAG-lite Knowledge Assistant (working pattern, no vectors)**
```
chat_trigger → postgresql (keyword/ILIKE search over kb) → if_else (found?)
      ├── yes → openai_gpt (answer grounded in rows, cite ids) → chat_send
      └── no  → slack_webhook (escalate) → chat_send ("handed to a human")
```

**Sheets New-Row Lead (showcasing push trigger)**
```
google_sheets_trigger (new row) → javascript (validate/dedupe)
  → openai_gpt (score High/Med/Low + draft first-touch)
  → if_else (High?) → hubspot (create) → google_gmail (send) ; else → google_sheets (mark nurture)
```

---

## 19. Missing Nodes & Operations

Ranked by how many n8n use cases they unblock:

1. **Extract-from-File node (PDF/DOCX → text)** — unblocks the entire Document Ops category
   (invoice extraction, resume parsing, chat-with-PDF, contract review).
2. **Iteration primitive (real Loop / Split-In-Batches / "Loop Over Items")** — unblocks every
   "process all N" pattern; the single highest-leverage engine change.
3. **Embeddings node + Text-Splitter/Chunking node** — completes the RAG pipeline (vector stores
   already exist), unblocking ~40 n8n RAG/research templates.
4. **Vision / image-analysis input** (multimodal to existing LLM nodes) — OCR, receipts, ID docs.
5. **Headless-browser / scrape node** — JS-rendered scraping & crawling.
6. **SSH / Execute-Command node** — the DevOps/server category.
7. **Speech-to-text & Text-to-speech nodes** — voice bots, transcription.
8. **Image-generation node** — social/marketing creative.
9. **Airtable trigger** (polling-backed) — remove the biggest recurring template caveat.
10. **Compound `if_else` expressions** and **richer template expressions** (`$now`, functions) —
    quality-of-life that removes template footguns.

---

## 20. Missing Integrations & Credentials

CtrlChecks already has **~96 credential types** (OAuth + API-key + generic). Integration coverage vs
n8n is strong for mainstream SaaS. Notable **service** gaps that appear in n8n templates:

- **Vector/RAG infra as first-class:** Weaviate, Chroma, PGVector-as-node, Milvus (only Pinecone/Qdrant/Supabase today).
- **Document/AI-extraction services:** LlamaParse, Cradl AI, Gotenberg, Unstructured, Vertex AI vision.
- **Scraping/research:** Apify, Firecrawl, Brave Search, Perplexity, Exa.ai, SerpAPI (reachable via HTTP, not first-class).
- **Messaging/voice:** LINE, Mattermost, Vapi/Bland (voice), Recall.ai/Fireflies (transcription).
- **Analytics:** Google Analytics Data API, Umami, SERPBear, Plausible.
- **Creative/media:** BannerBear, Suno, Seedance, Printify, Pinterest.
- **Low-code DBs:** NocoDB, Baserow, Monday (Monday has a credential type but no node).
- **Generic HTTP already covers the long tail** — the gap is *first-class UX/credentials*, not raw reachability, for most of these.

---

## 21. Missing Control-Flow / Data Capabilities

1. **Item iteration / fan-out** — the defining gap (see §6, §15, §19).
2. **Sub-workflow as an iterable tool** — `execute_workflow` exists but isn't a per-item mapper.
3. **Persistent cross-run state** — `set_variable` is per-execution; needs a DB/marker workaround.
4. **Compound boolean conditions** in `if_else` (currently one comparison per row).
5. **Expression richness** — no `$now`, `$credentials`, or function calls in templates.
6. **Binary/attachment data plane** — limited handling of files/attachments between nodes
   (`read_binary_file`/`write_binary_file` exist but no rich binary passthrough like n8n's `binary`).
7. **Trigger under-utilization** — capability exists (20+ push triggers) but no template uses them;
   this is a *usage* gap more than a *capability* gap.

---

## 22. High-Value Use Cases CtrlChecks Can Build (now)

Prioritized by (n8n demand × zero-gap buildability):

| Use case | n8n demand | CtrlChecks effort | Notes |
|---|---|---|---|
| AI email triage/label/auto-draft | Very high | Low | gmail_trigger + openai_gpt |
| Telegram/WhatsApp AI support bot | Very high | Low-Med | trigger + openai_gpt + reply |
| PR/MR AI code review | High | Low | github/gitlab trigger + openai_gpt |
| Sheets/Stripe/Shopify event-driven ops | High | Low | real push triggers already wired |
| RAG-lite owned-data assistant | Very high | Low | generalize Internal Knowledge Ops Agent |
| CRM enrichment + notify | High | Low | http_request + openai_gpt + CRM |
| AI content → Notion/WordPress publish | High | Low | openai_gpt + notion/wordpress |
| Calendar-driven meeting prep | Med-High | Low | google_calendar_trigger |

---

## 23. High-Value Templates Worth Adding

Concrete additions to the library (all §11/§12-buildable), in priority order:

1. AI Inbox Triage & Auto-Label (Gmail)
2. AI Reply-Draft Assistant
3. Telegram AI Support Bot
4. WhatsApp AI Support/FAQ Bot
5. GitHub/GitLab PR AI Code Review
6. Stripe Dunning / Payment-Failure Recovery (native trigger)
7. Shopify New-Order Triage & Ops
8. Google-Sheets New-Lead Pipeline (native trigger)
9. Notion/WordPress AI Content Publisher
10. RAG-lite Company Docs Assistant (SQL-grounded, cited)
11. CRM Org Enrichment → Slack
12. Calendar Meeting-Prep Brief
13. Discord Community Alert Bot
14. Scheduled Competitor/News Digest (static sources)

---

## 24. Product Capability Gaps (roadmap themes)

| Theme | Gap | Unlocks |
|---|---|---|
| **Iteration engine** | No per-item fan-out | The largest class of n8n workflows; removes the "one record per run" caveat from many existing templates |
| **Document AI** | No PDF/vision extraction | Entire Document Ops category; finance/insurance/healthcare intake |
| **RAG completeness** | No embeddings/chunking | Semantic knowledge assistants at scale |
| **Web data** | No headless scraper | Research/monitoring/competitive-intel templates |
| **Media** | No STT/TTS/image/video | Voice bots, transcription, creative marketing |
| **DevOps** | No SSH/shell | Server-automation category |
| **Trigger activation UX** | Push triggers wired but unused | Real-time UX + demonstrable breadth |

---

## 25. Priority Recommendations

**Immediate (no engine change) — grow the library into proven n8n demand:**
- Ship the 14 templates in §23, several using the **already-wired push triggers** (Sheets, Stripe,
  Shopify, GitHub, Gmail, Calendar) to both add value and showcase trigger breadth.
- Generalize the Internal Knowledge Ops Agent into a reusable **RAG-lite (SQL-grounded)** template.

**Near-term (single engine feature, high leverage):**
- Build a **real iteration primitive** (Loop-Over-Items / Split-In-Batches that fans out the
  downstream subgraph). This retroactively upgrades many existing templates (sync, cleanup,
  reminders) from "one record per run" to "process the batch," and unblocks a huge n8n class.
- Add an **Extract-from-File (PDF→text)** node — highest-demand single node; unblocks Document Ops.

**Medium-term (RAG + media):**
- Add **Embeddings + Text-Splitter** nodes to complete the RAG pipeline atop existing vector stores.
- Add **vision input** to LLM nodes (OCR/receipts/IDs) — strong fit for the verification vertical.

**Lower priority / long tail:**
- Headless scraper, SSH/command node, STT/TTS/image-gen — pursue per specific customer demand;
  most niche APIs remain reachable via `http_request` in the interim.

**Positioning:** lean into the **control-checks / readiness-gate / verification** differentiator
(§7) — it is a genuine edge over n8n's generic library and aligns with the Verification & Compliance
vertical that has no n8n analog.

---

## 26. Master Compatibility Matrix

n8n capability area → CtrlChecks support tier:

| n8n capability area | Tier | Rationale |
|---|---|---|
| Notify/route from data source | **Fully supported** | Native; multiple shipped templates |
| Email intelligence (triage/label/draft/respond) | **Fully supported** | Gmail/Outlook nodes + triggers + LLM |
| Lead / ticket / feedback triage & routing | **Fully supported** | Shipped templates |
| Scheduled reminders / reporting / digests | **Fully supported** | Shipped templates |
| Owned-data chatbot / FAQ (SQL/Airtable) | **Fully supported** | Shipped (RAG-lite) |
| CRM sync / enrichment / cleanup (single record) | **Fully supported** | Shipped |
| CRM/data sync across **many** records | **Mostly** | No iteration → one record per run |
| Event-driven via push triggers | **Mostly** | Wired but not templated; Airtable has no trigger |
| Website-grounded (static) enrichment | **Mostly** | `http_request` static only |
| Content generation → CMS/social (text) | **Mostly / Partial** | Text ✅; image gen ❌ |
| Semantic RAG over documents (vectors) | **Partial** | Vector stores yes; embeddings/chunking no |
| PDF / document / invoice / resume extraction | **Unsupported→Partial** | No extraction node |
| Vision / OCR / image analysis | **Unsupported** | No vision input |
| Web scraping / crawling / deep research | **Unsupported→Potential** | Static HTTP only |
| DevOps / SSH / Docker / server ops | **Unsupported** | No SSH/command node |
| Audio / voice / TTS / transcription | **Unsupported** | No media nodes |
| Image / video / music generation | **Unsupported** | No generative-media nodes |
| Niche SaaS via generic HTTP | **Potentially supported** | `http_request` + generic creds |
| Batch/per-item processing of any kind | **Unsupported** | No iteration primitive |

---

## 27. Research Sources

**CtrlChecks (primary, this repo + live prod):**
- Live data: `GET https://worker.ctrlchecks.ai/api/templates` (36 active templates, full graphs)
- [worker/src/api/templates.ts](../worker/src/api/templates.ts), [worker/src/api/admin-templates.ts](../worker/src/api/admin-templates.ts)
- [worker/public/node-library.json](../worker/public/node-library.json) (178 node types) + [unified-node-registry.ts](../worker/src/core/registry/unified-node-registry.ts)
- [worker/src/credentials-system/credential-type-registry.ts](../worker/src/credentials-system/credential-type-registry.ts) (~96 credential types)
- [worker/src/api/execute-workflow.ts](../worker/src/api/execute-workflow.ts) (iteration limits at :13934, :13976)
- [worker/src/index.ts](../worker/src/index.ts) (trigger route wiring), `sql_migrations/` + `ctrl_checks/templates/` (repo mirror)
- Prior audit: `docs/TEMPLATE_LIBRARY_AUDIT_2026-07-31.md`

**n8n (public):**
- n8n workflow library — https://n8n.io/workflows/ (11,190 templates; 7 categories)
- awesome-n8n-templates — https://github.com/enescingoz/awesome-n8n-templates (~280 curated, categorized)
- n8n AI agent examples — https://blog.n8n.io/ai-agents-examples/
- Best n8n templates roundups — https://www.intuz.com/blog/best-n8n-workflow-templates/ , https://connectsafely.ai/articles/n8n-templates-workflow-automation-examples
- Representative template pages: automated form response (Sheets/Slack/Gmail/Contacts), lead response (Sheets/OpenAI/Gmail/Slack), contact-form management — all on n8n.io/workflows

---

*End of analysis. Research only — no application code was modified.*
