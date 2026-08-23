# Codex Prompt — Implement the CtrlChecks Buildable Template Library

> Copy everything inside the horizontal rules below into Codex as a single task prompt.

---

## ROLE

You are working in the **CtrlChecks** monorepo (React + Vite frontend `ctrl_checks/`, Node/Express
worker `worker/`). Your job is to **add new production templates to the template library** — correctly,
so that each one actually executes, passes the CI contract gate, has correct field ownership, correct
operations, and a valid flow. **Do not modify the execution engine, node registry, or any product code.**
This is a content/data task governed by an existing CI contract.

## BACKGROUND (already researched — read these first)

Three analysis files already exist in `docs/`. Read them before doing anything:

1. `docs/N8N_TO_CTRLCHECKS_TEMPLATE_CAPABILITY_ANALYSIS.md` — full capability + gap analysis
   (178 registered node types, ~96 credential types, what the engine can and cannot do).
2. `docs/CTRLCHECKS_BUILDABLE_TEMPLATE_CATALOG.md` — the **source list of ~20 templates per category**
   to implement (86 total: 36 already live + 50 new). Each entry has trigger, integrations, and the
   intended node flow. **This is your spec for WHAT to build.** Caveat: some entries use push triggers
   that the CI gate does not yet allow — see HARD CONSTRAINTS → Triggers below; rework or defer those.
3. `docs/TEMPLATE_LIBRARY_AUDIT_2026-07-31.md` + `docs/TEMPLATE_LIBRARY_FIX_SPEC.md` — the prior audit
   that produced the current contract gate. The gate exists because 17/20 templates once shipped with
   runtime-contract defects.

## WHERE TEMPLATES LIVE (source of truth)

- **Runtime source of truth = production AWS RDS PostgreSQL, table `templates`, rows where
  `is_active = true`.** Served read-only + unauthenticated by `GET /api/templates`
  (`worker/src/api/templates.ts`). Admin CRUD: `worker/src/api/admin-templates.ts`
  (`POST/PUT/DELETE`, requires a Cognito admin token). The Prisma schema is NOT the template store.
- **Repo mirror / authoring source = `ctrl_checks/templates/src/*.json`** (one file per template).
  The CI gate reads this directory. The live DB currently mirrors these files.
- `templates` table columns: `id, name, description, category, nodes (jsonb), edges (jsonb),
  difficulty, estimated_setup_time, tags (text[]), is_featured (bool), is_active (bool),
  created_by, created_at`.

## THE TEMPLATE JSON SHAPE (author exactly this)

Each template file in `ctrl_checks/templates/src/<slug>.json` is one object:

    {
      "id": "<uuid>",
      "name": "Human Readable Name",
      "description": "Benefit-led, specific. State any 'one record per run' behavior explicitly.",
      "category": "Sales, Support & Internal Operations",   // EXACT existing category string
      "difficulty": "Beginner|Intermediate|Advanced",
      "estimated_setup_time": 18,
      "tags": ["support","ai","slack"],
      "nodes": [ <TemplateNode>, ... ],
      "edges": [ <TemplateEdge>, ... ]
    }

`TemplateNode` (note: `type` is ALWAYS the literal `"custom"`; the REAL node type is `data.type`):

    {
      "id": "openai_gpt_1",
      "type": "custom",
      "position": { "x": 400, "y": 300 },
      "data": {
        "type": "openai_gpt",                 // <-- canonical node type (backend + frontend)
        "label": "Classify Ticket",
        "icon": "Bot",
        "category": "ai",
        "config": { "model": "gpt-4o-mini", "prompt": "...", "temperature": 0.2 },
        "notes": {                            // per-node help shown in the UI — author these
          "what": "One sentence: what this node does here.",
          "why":  "Why it is in THIS workflow.",
          "tips": ["actionable tip", "..."],
          "family": "AI",
          "docsHref": "/docs/nodes/openai_gpt",
          "overview": "Short paragraph."
        }
      }
    }

`TemplateEdge`:

    { "id": "e1", "source": "form_1", "target": "openai_gpt_1", "sourceHandle": "true" }

`sourceHandle` is required only on branch nodes (`if_else` → `"true"`/`"false"`; `switch` → the case key).

## THE PIPELINE YOU MUST USE (do NOT hand-edit the generated JSON blindly)

The repo convention (enforced by the contract test header) is: **author templates through the generator
script, then regenerate, then validate, then apply to the DB.**

1. Add new template definitions to the generator: `ctrl_checks/templates/apply-fixes.cjs`
   (or create a sibling `add-templates.cjs` that emits new `src/<slug>.json` files the same way).
   Reuse its existing helpers for `data.notes` (it pulls per-node-type docs from `registry-notes.json`
   and per-instance "why" from `node-notes.json`). Add new per-instance notes there.
2. Run the generator to (re)emit `ctrl_checks/templates/src/*.json`.
3. **Validate against the CI gate** (this is the definition of "correct"):
   `cd worker && npx jest src/core/registry/__tests__/template-library-contract.test.ts`
   Every template must pass all assertions. Also prove the gate still has teeth against the pre-fix
   snapshot if you touched it.
4. `cd worker && npm run type-check` must stay clean. NOTE: type-check regenerates
   `worker/public/node-library.json` lossily — revert that file before committing.
5. **Apply to the DB** by emitting SQL into `ctrl_checks/sql_migrations/templates_v2/` (INSERT rows with
   `is_active = true`) OR by POSTing to `/api/admin-templates` with an admin token. The human operator
   runs the DB write (direct RDS writes may be classifier-blocked for some tooling). Provide a
   `--dry-run` and a backup step (mirror the existing `templates_v2/00_backup_current_templates.sql`).

## HARD CONSTRAINTS (a template that violates any of these FAILS the gate)

The gate is `worker/src/core/registry/__tests__/template-library-contract.test.ts`. Its rules:

**Triggers — exactly ONE trigger, and it MUST be one of these 8 only:**
`form`, `schedule`, `interval`, `webhook`, `chat_trigger`, `telegram_trigger`, `manual_trigger`,
`workflow_trigger`.
→ **Gmail/Sheets/Drive/Calendar/GitHub/GitLab/Jira/Linear/Trello/Stripe/Shopify/Slack triggers are
NOT allowed in templates yet**, even though the runtime has them wired. Where the catalog proposes one,
**rework it to a `form`/`webhook`/`schedule` trigger** (e.g. "AI Inbox Triage" → `schedule` poll of a
Gmail-fed table, or `webhook`; "GitHub PR Review" → `webhook`; "Sheets New-Lead" → `webhook`/`form`),
or **defer it to Phase 2** (which would additionally require verifying the node and updating both this
gate's `TRIGGER_TYPES`/`NOT_VERIFIED_WORKING_NODE_TYPES` and `docs/NODE_STATUS_INVESTOR_ANALYSIS.md` —
do NOT do that silently).

**Banned node types (NOT verified working — must not appear in any template):**
`chargebee, microsoft_teams, microsoft_teams_trigger, twitter, freshdesk, outlook, outlook_trigger,
onedrive, microsoft_dynamics, twilio, intercom, zendesk, sap, workday, schedulewise, tally_trigger,
paypal, shopify_trigger, woocommerce, stripe, stripe_trigger, xero, facebook, facebook_trigger,
instagram, instagram_trigger, whatsapp, whatsapp_cloud, whatsapp_trigger`.
→ **Safe, verified palette for templates:** triggers above + `airtable, postgresql, google_gmail,
google_sheets, google_drive, slack_message, slack_webhook, chat_send, hubspot, http_request,
openai_gpt, google_gemini, ai_agent, memory, sentiment_analyzer, text_summarizer, if_else, switch,
merge, javascript, log_output, notion, trello, discord`. If unsure a node is allowed, grep the gate.

**Node types must exist in BOTH catalogs:** backend (`isValidCanonicalNodeType` /
`worker/src/services/nodes/node-library.ts`) AND frontend (`type: '...'` in
`ctrl_checks/src/components/workflow/nodeTypes.ts`). A node registered backend-only gets silently
rewritten to `http_request` on "Use Template" — the gate blocks that.

**Config keys:** every key in `data.config` must be declared by the node's `configSchema`
(`required`/`optional`) or be in the gate's `RUNTIME_ONLY_KEYS` allowlist. No stray keys.

**Expression syntax — resolver implements ONLY these prefixes:** `{{$json.x}}`, `{{json.x}}`,
`{{input.x}}`, `{{trigger.x}}`, and named-node paths. **No function calls** (`{{JSON.stringify(...)}}`
writes a literal string), **no `$now`, no `$credentials`, no other `$…` built-ins.** To format a date
or transform data, use a `javascript` node upstream and read its output via `{{$json.…}}`.

**No per-item iteration exists.** `loop`/`split_in_batches` do NOT fan out. Anywhere the use case is
"process all matching rows/files," implement the **poll-one-record-per-run** pattern instead:
`schedule → airtable/postgres read with a filter that EXCLUDES already-processed rows + limit 1 →
…act… → write a "processed"/"checked" marker back`. Successive runs drain the queue and also prevent
duplicate-notification storms. State it in the description.

**Airtable ids:** Airtable create/update returns `{ records: [{ id, fields }] }` — there is **no
`recordId`** output. Reference `{{input.records.0.id}}` (or produce `recordId` explicitly in an
upstream `javascript` node). `{{input.recordId}}` fails the gate.

**`if_else` canonical form:** config must be
`{ "conditions": [ { "field": "{{$json.x}}", "operator": "equals", "value": "..." } ],
"combineOperation": "AND" }`. **One comparison per condition row** — no compound strings like
`"a === true && b > 0"` (parses to a permanently-false comparison). Multiple conditions → multiple
rows or a `switch`. The legacy `condition` string key is banned.

**AI-returns-JSON must be parsed before branching:** if an `openai_gpt`/`google_gemini`/`ai_agent`
prompt says to return JSON, the **immediately next node must be a `javascript` node doing
`JSON.parse`** before any `if_else`/`switch` reads its fields. Otherwise the branch reads undefined and
always takes the wrong path.

**No blank required config** except the per-customer keys `baseId`, `tableId`, `recordId` (these are
intentionally left `""` for the customer to fill). Any other `""` value fails — it means a forgotten field.

**No orphan nodes, no dangling edges, no cycles.** Every node must be reachable from the single trigger.

**No "production-ready"/misleading tags.**

## FIELD OWNERSHIP (author config with the right ownership discipline)

CtrlChecks classifies every node field into one of three ownership classes
(`worker/src/core/utils/field-ownership.ts` → `classifyFieldOwnership`). Author templates accordingly:

- **`credential` (secrets):** api keys, oauth/bearer/refresh tokens, client secrets, passwords,
  connection strings, private keys, smtp/db passwords, usernames.
  → **NEVER put these in `data.config`.** Credentials are injected at runtime from the user's
  connection by `credential-resolver.ts`. A template that hardcodes a secret is wrong and unsafe.
- **`structural` (defines the workflow shape):** `operation`, `resource`, `event`, `serviceType`,
  `fields`, `expression`, anything matching `condition`/`case`/`schema`/`layout`/`template`, and
  operation/type/field-name selectors.
  → **These MUST be set correctly and completely in the template** — they decide what the node does
  (e.g. `hubspot.operation: "update"`, `airtable.operation: "read"` + `filterByFormula`,
  `switch.expression` + `cases`, `if_else.conditions`). Pick the right operation for each node's role.
- **`value` (data):** everything else — the payloads. Set as literals or resolver expressions
  (`{{$json.x}}`). URLs (`webhook_url`, `base_url`, `api_endpoint`) are `value`, not secrets.

Practical rule: **credential fields → omit (runtime-injected); structural fields → set exactly right;
value fields → literal or `{{$json.…}}`.** Per-customer resource ids (`baseId`, `tableId`) → `""`.

## WHAT TO BUILD

Implement the templates in `docs/CTRLCHECKS_BUILDABLE_TEMPLATE_CATALOG.md`, category by category, to
reach **~20 per category** across the 4 live categories (exact strings):
`Business Verification & Compliance`, `Sales, Support & Internal Operations`,
`Finance, Accounting & Insurance`, `Healthcare & Clinics`.

- The 36 existing templates already live in `src/*.json` — leave them intact (only touch one if the
  gate flags it).
- Add the ~50 NEW ones from the catalog. For any catalog entry whose trigger is not in the allowed
  8, rework the trigger to `form`/`webhook`/`schedule` (keep the same use case) or defer it and note
  why in a `DEFERRED.md`.
- Reuse the proven flow patterns from the catalog's summary: intake-classify-route; poll-drain
  reminder; RAG-lite chat (keyword lookup over airtable/postgres, answer only from returned rows);
  scheduled summary.
- Author `data.notes` for every node (what/why/tips) — the live library now carries these and the UI
  renders them.

## FIELD & FLOW VERIFICATION (do this for EVERY template before considering it done)

1. **Flow check:** trace trigger → … → terminal. Exactly one trigger; every node reachable; no cycle;
   every branch (`if_else`/`switch`) has its `sourceHandle` edges wired for each outcome.
2. **Field check:** for each node, confirm (a) no credential/secret in config, (b) all structural
   fields set with the correct operation/resource/conditions, (c) all value fields are literals or use
   only the 4 supported expression prefixes, (d) no stray/unknown config keys, (e) no blank required
   fields except `baseId`/`tableId`.
3. **Data-contract check:** Airtable ids use `records.0.id`; AI-JSON nodes are followed by a
   `JSON.parse` javascript node; `if_else` uses the array form; poll-drain templates write a marker.
4. Run the gate: `cd worker && npx jest src/core/registry/__tests__/template-library-contract.test.ts`
   — **all green**. Fix, regenerate, re-run until clean. Then `npm run type-check` clean.

## DELIVERABLES

1. New `ctrl_checks/templates/src/<slug>.json` files (generated, gate-passing), ~20 per category total.
2. Generator changes (`apply-fixes.cjs` or `add-templates.cjs`) + any new `node-notes.json` entries.
3. `ctrl_checks/sql_migrations/templates_v2/` INSERT scripts (with backup + `--dry-run`) to load them
   into RDS with `is_active = true`.
4. A short `docs/TEMPLATE_LIBRARY_EXPANSION_REPORT.md`: what was added per category, what was reworked
   (trigger swaps), what was deferred and why.

## ACCEPTANCE CRITERIA

- `npx jest template-library-contract.test.ts` passes for the full expanded `src/` set.
- `npm run type-check` clean in both `worker/` and `ctrl_checks/`.
- Each category has ~20 templates; every new template uses only the verified palette + allowed triggers.
- No secrets in any template config; field ownership correct; flows valid; no gate rule violated.
- DB apply scripts are reviewable, backed up, dry-runnable — the human runs the actual RDS write.

## GUARDRAILS

- Do NOT modify the execution engine, `unified-node-registry.ts`, `node-library.ts`, resolver, or any
  node behavior to make a template "fit." Templates adapt to the engine, never the reverse.
- Do NOT hand-edit generated `src/*.json` as the primary edit path — change the generator and regenerate.
- Do NOT introduce a node/trigger from the banned/unverified list. Do NOT invent config keys.
- Do NOT claim a template works until it passes the contract gate.
- If a use case genuinely cannot be built within these constraints, put it in `DEFERRED.md` with the
  missing capability — do not ship a broken approximation.

---
