## Status: implemented (2026-07-22), manual DB step completed

This document started as a read-only investigation and was updated in place as the fixes below were actually implemented in the same session. It covers two problems reported against `/admin/templates`:

- **Issue A** — global templates might contain node `type` strings removed/renamed out of the node registry.
- **Issue B** — the admin "Edit Workflow" button on a template loads through a different, less-complete pipeline than the end-user "Use Template" path.

A third item came up mid-session: the Supabase node's canonical `type` was reverted from `db` back to `supabase` (see "Canonical type reversal" below) — this ended up being the actual fix for most of Issue A.

---

## Issue A — Template node types vs. the live registry: audit result

Queried the live `templates` table directly (550 total rows; only **20 have `is_active = true`** — those are what actually shows in Templates Manager, including the six from the original screenshots).

**Result: none of the 20 active templates reference a removed/invalid node type.** Every node type across all 20 active rows (`ai_agent`, `airtable`, `chat_trigger`, `database_read`, `database_write`, `form`, `google_drive`, `google_gemini`, `google_gmail`, `google_sheets`, `http_request`, `hubspot`, `if_else`, `javascript`, `log_output`, `memory`, `merge`, `openai_gpt`, `schedule`, `slack_message`, `slack_webhook`, `switch`, `webhook`, `whatsapp`) exists in the current registry.

Across the other 530 **inactive** rows, 14 node instances in 6 templates use a type not in the registry (`embeddings`, `vector_store`, `crypto`, `html_extract`, `rss_feed_read`, `pdf`, `image_manipulation`, `csv_processor`, `item_lists`, `google_analytics`, `llm_chain`, `hugging_face`, `azure_openai`, and the literal `supabase`/`db` case below) — these are old auto-generated demo/showcase rows (e.g. "Complete Platform Showcase", "Multiple AI Providers") that are dormant and not visible to any user or admin today. **No SQL migration was needed or run for the templates table** — none of the affected rows are active, and several of the "missing" types (`crypto`, `pdf`, `rss_feed_read`, `image_manipulation`, `google_analytics`, `item_lists`) have no confident 1:1 registry replacement, so guessing a substitute type was deliberately avoided. If you want these dormant rows cleaned up or reactivated, that's a separate product decision, not a bug fix.

The one template that did reference the Supabase node ("Database Operations with PostgreSQL", inactive) already stores `type: "supabase"` — which, after the canonical-type reversal below, is now correct as-is.

---

## Canonical type reversal: `db` → `supabase`

Mid-session, the user asked to revert the Supabase node's internal registered type from `db` back to `supabase` (it had been renamed `supabase` → `db` on 2026-07-12, commit `c199fac`, to make it an easier keyword target for the AI generation pipeline). The concern: `db` is too generic and risks colliding with unrelated "database" logic long-term. The node's **display label was always "Supabase"** in both states — this only affects the internal `type` string.

Before making this change, verified it was safe:
- **0 live credentials** use provider `db` or `supabase` in `unified_credentials`, `user_credentials`, or `credential_vault`.
- **1 live workflow** (`afec523a-eef5-42ae-a9ea-6d3b65e277de`, "Untitled Workflow") has a node with `type: "db"`.
- **1 static row** in `credential_types` has `provider: 'db'` (the type definition, not a user secret).

Renamed the canonical type across ~35 files, including:
- `worker/src/services/nodes/node-library.ts` — base schema (`type`, `providers`, keywords)
- `worker/src/core/registry/unified-node-registry.ts` — `ALIAS_MAP` (now `supabase: supabase`, `db: supabase` as a legacy alias), credential-requirements map, db-type-detection heuristic
- `worker/src/core/registry/unified-node-registry-overrides.ts` — override map key
- **Execution dispatch** (the two places that actually run the node): `worker/src/api/execute-workflow.ts` (`case 'db'` → `case 'supabase'`), `worker/src/services/database/database-node-handler.ts` (same)
- Credential/connector wiring: `connector-registry.ts`, `credential-type-registry.ts` (`provider: 'db'` → `'supabase'`)
- ~15 AI-generation-pipeline files (`workflow-builder.ts`, `workflow-planner.ts`, `workflow-dsl.ts`, `workflow-structure-builder.ts`, `step-to-node-mapper.ts`, `step-node-mapper.ts`, `node-type-resolver.ts`, `comprehensive-alias-resolver.ts`, `enhanced-keyword-matcher.ts`, `enhanced-workflow-analyzer.ts`, `intent-completeness-validator.ts`, `linear-workflow-connector.ts`, `node-capability-registry-dsl.ts`, `repair-engine.ts`, `plan-chain-guards.ts`, `workflow-intent-parser.ts`, `workflow-pattern-matcher.ts`, `workflow-template-resolver.ts`, `executionPlanBuilder.ts`, `WorkflowAnalyzer.ts`) — node-type identity checks and lookup-table keys updated; generic natural-language heuristics (e.g. `promptLower.includes('db')`, `_storage: 'db'` in `storage-manager.ts`, Odoo's own `db` config field, Redis's `db` field) were deliberately left alone since they aren't this node's identity.
- Frontend: `nodeTypes.ts`, `backendSupportedNodeTypes.ts`, `ExecutionLogBlock.tsx`, `schemaConverter.ts`, `nodeUsageGuides.ts` (there was a stale `db`/`supabase` guide pair from the original rename — swapped so `supabase` has the full guide and `db` is the legacy stub)
- Docs content: found the July-12 rename had already left a **stale, never-wired placeholder `supabase.doc.ts`/`search/supabase.ts`** sitting unused while `db.doc.ts`/`search/db.ts` were the real, detailed, registered content. Moved the real content onto the `supabase.*` files, deleted the `db.*` files, updated `docs-content/index.ts` and `docs-content/search-index.ts` registrations, and fixed `relatedNodes: [...]` references in `airtable`, `firebase`, `google_cloud_storage`, `mongodb`, `mysql`, `postgresql`, `sql_server`, `timescaledb` doc files.
- `worker/src/lib` alias fix (`ctrl_checks/src/lib/workflowValidation.ts`): the alias map had a dead self-referential `'supabase': 'supabase'` entry from the original rename (should have been `'supabase': 'db'` — it was never fixed, so any legacy `supabase`-typed node silently fell back to `http_request` when validated). This is now `'supabase': 'supabase'` (correctly self-referential again) plus `'db': 'supabase'` as a legacy alias.
- Tests updated: `generate-workflow-plan-chain.test.ts`, `registry-metadata-contract.test.ts` (removed the now-obsolete `db` "known gap" entry), `firebase-node.property.test.ts`, `gcs-node.property.test.ts`.

**Both `worker` and `ctrl_checks` type-check clean (`tsc --noEmit`) after the rename.**

### Manual DB step completed

Two live-data rows still said `db` after the code rename and needed updating to `supabase`. The user explicitly asked Codex to complete the remaining production RDS write on 2026-07-22, so the update below was run against the worker's `DATABASE_URL` in a single transaction:

```sql
BEGIN;

-- 1. The one live workflow with a stale node type
UPDATE workflows
SET nodes = (
  SELECT jsonb_agg(
    CASE WHEN elem->'data'->>'type' = 'db'
      THEN jsonb_set(elem, '{data,type}', '"supabase"')
      ELSE elem
    END
  )
  FROM jsonb_array_elements(nodes) AS elem
)
WHERE id = 'afec523a-eef5-42ae-a9ea-6d3b65e277de';

-- 2. The credential type definition row
UPDATE credential_types SET provider = 'supabase' WHERE provider = 'db';

COMMIT;

-- Verify:
-- SELECT nodes FROM workflows WHERE id = 'afec523a-eef5-42ae-a9ea-6d3b65e277de';
-- SELECT id, provider FROM credential_types WHERE id = 'supabase_api_key';
```

Post-commit verification result:

```text
updated.workflows = 1
updated.credential_types = 1
workflow afec523a-eef5-42ae-a9ea-6d3b65e277de: db_nodes = 0, supabase_nodes = 1
credential_types: provider db rows = 0, supabase_api_key provider = supabase
```

No template-table migration is needed (see Issue A above — the one template using this node already stores `supabase`).

---

## Issue B — Admin "Edit Workflow" on a template vs. user "Use Template": fixed

### Root cause confirmed

| Step | End-user path | Admin path (was broken) |
|---|---|---|
| Load | `ctrl_checks/src/pages/WorkflowBuilder.tsx` `loadWorkflow()` — runs `normalizeBackendWorkflow()` → `validateAndFixWorkflow()` → `enforceFrontendRenderContract()` → `validateNodeTypesRegistered()` + edge-existence filter | `ctrl_checks/src/pages/admin/TemplateEditor.tsx` `loadTemplate()` — ran **only** `validateAndFixWorkflow()` |

`TemplateEditor.tsx` skipped 3 of the 4 steps `WorkflowBuilder` runs, and never filtered dangling edges. Also, its "Invalid Nodes Removed" toast described old behavior — `validateAndFixWorkflow` no longer removes nodes (it rewrites to `http_request` as a last resort, or preserves the type), so that count was always 0 and the message was actively misleading.

**Caveat honestly noted mid-investigation:** a screenshot showed a Supabase node rendering fine in the Template Editor, which argued against the node-type-drift theory being the visible symptom for that specific template. Live browser reproduction (with devtools) was not done in this session — there's no browser-automation tool available here — so the exact on-screen symptom the admin originally saw was never independently confirmed. The fix below closes the structural gap regardless; if the admin still sees an issue after this, it's a different bug and needs a fresh repro (open `/admin/templates` → Edit Workflow with devtools open, capture the console/network error).

### What was changed

`ctrl_checks/src/pages/admin/TemplateEditor.tsx`:
1. `loadTemplate()` now runs the same 4-step pipeline as `WorkflowBuilder.loadWorkflow()`: `normalizeBackendWorkflow` → `validateAndFixWorkflow` → `enforceFrontendRenderContract` → `validateNodeTypesRegistered`, plus the same dangling-edge filter.
2. The `invalidNodesCount` badge/toast now reflects `validateNodeTypesRegistered()`'s `missingTypes` (types not found in the registry) instead of a "nodes removed" count that could never be anything but zero. Toast copy changed from "Invalid Nodes Removed" to "Unregistered Node Types Found", and the header badge from "invalid node(s) removed" to "unregistered node type(s)".

Not done (out of scope for this pass, listed for a future session if needed): auditing `TemplateEditor.tsx`'s `handleSave()` for the same rigor, and extracting the 4-step pipeline into one shared helper used by both pages (currently duplicated inline in both files — functionally identical, just not DRY).
