# Template library — source of truth

Before 2026-07-31, **15 of the 20 live templates existed only in the production
database.** No file, no version history, no review path — if RDS were lost, they
were gone. This directory fixes that.

```
snapshot/live-2026-07-31.json   what was live in production, untouched (the backup)
apply-fixes.cjs                 every correction, as an explicit reviewable patch
node-notes.json                 why each node exists in its workflow (hand-written)
extract-registry-notes.cjs      pulls note content out of the existing note registry
registry-notes.json             the extracted registry content — GENERATED
src/*.json                      the corrected templates — GENERATED, do not hand-edit
CHANGELOG.md                    every change and why — GENERATED
DEFERRED.md                     known defects deliberately left alone, and why — GENERATED
../sql_migrations/templates_v2/ the apply scripts — GENERATED
```

## Changing a template

Edit **`apply-fixes.cjs`** (and `node-notes.json` if you add a node), then:

```bash
node ctrl_checks/templates/extract-registry-notes.cjs   # only if the docs changed
node ctrl_checks/templates/apply-fixes.cjs
cd worker && npx jest src/core/registry/__tests__/template-library-contract.test.ts
```

Adding a node without a note in `node-notes.json` fails the generator on purpose.

## Node notes — two layers, no duplication

Every node carries `data.notes`. It is assembled, never hand-written twice:

| field | source | example (HubSpot node in Cross-Platform Sync) |
|---|---|---|
| `family` | note registry | `CRM` |
| `what` | `nodeLaymanDescriptions.ts` | "Create, update, or find contacts, deals, and companies in HubSpot CRM" |
| `overview`, `tips` | `nodeUsageGuides.ts` | "Connects to HubSpot CRM to get, list, create…" |
| `docsHref` | `docs-content/manifest.ts` | `/docs/nodes/hubspot` |
| `why` | `node-notes.json` | "Updates the matching CRM contact. This is a write into your real CRM — test it against a sandbox contact before switching the template on." |

The first four come from the platform's own 176 documentation pages — a CRM node
gets CRM notes, an AI node gets AI notes, because that is how the registry files
them. Only `why` is written per template, because the registry cannot know why a
node was placed in a particular workflow or what breaks if it is removed.

## Node families

`data.category` is set from the note registry, so the family label and colour on
the canvas always match the family the node's help page is filed under. The
templates previously invented their own: HubSpot — the only CRM node in the
library — was filed as `database`, as were Airtable, Sheets and Drive; Gmail was
`output` in 15 templates and `google` in the other 5. All 181 nodes are now
consistent, one family per node type.

Never edit `src/*.json` or the SQL directly — they are regenerated from the
snapshot on every run and your change will vanish.

## Why a patch script instead of just editing the JSON

The snapshot is the ground truth of what shipped. Keeping the corrections as
named, commented transformations means a reviewer sees *what changed and why*
rather than a 140 KB JSON diff, and the same corrections can be re-derived if the
baseline ever needs re-pulling from production.

## The contract test

`worker/src/core/registry/__tests__/template-library-contract.test.ts` runs the
corrected templates against the real node registry and the real resolver rules.
Every assertion in it corresponds to a defect found in live production data on
2026-07-31 — not a hypothetical.

To prove the gate still has teeth, point it at the pre-fix snapshot:

```bash
node -e "const fs=require('fs');JSON.parse(fs.readFileSync('ctrl_checks/templates/snapshot/live-2026-07-31.json','utf8')).forEach(t=>fs.writeFileSync('/tmp/before/'+t.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.json',JSON.stringify(t)))"
cd worker && TEMPLATE_SRC_DIR=/tmp/before npx jest src/core/registry/__tests__/template-library-contract.test.ts
```

That run fails 71 times. The current templates pass all 295.

## Runtime constraints these templates are written against

Four platform facts shape almost every design decision here. Read them before
authoring a new template.

**1. There is no per-item fan-out.** `loop` and `split_in_batches` only expose the
array as data — `execute-workflow.ts:13968` says so in its own warning string.
Downstream nodes still execute exactly once. So a workflow can never "send one
message per row".

The pattern used instead, everywhere a template needs to act on many rows:

> `maxRecords: 1` + a `filterByFormula` that excludes already-processed rows +
> a write-back marker field + a "did we find anything?" `if_else` gate.

Each scheduled run handles one row and stamps it, so successive polls drain the
queue. This also removes the duplicate-notification storms, because a processed
row no longer matches the filter.

**2. Airtable create/update returns `{ records: [{ id, fields }] }`.** There is no
`recordId` output key. Use `{{input.records.0.id}}`. Airtable nodes also spread
`...inputObj`, so upstream context survives them.

**3. The resolver does property lookup only.** `$json.` / `json.` / `input.` /
`trigger.` / named-node keys. There is **no `$now`**, **no `$credentials`**, and
**no function calls** — `{{JSON.stringify(x)}}` writes that literal string. Compute
values in a `javascript` node and reference the result.

**4. `if_else` evaluates one comparison per condition row.** A compound string
(`"a === true && b > 0"`) parses to `field: a`, `operator: equals`,
`value: "true && b > 0"` — permanently false. Use two entries in `conditions[]`
with `combineOperation: "AND"`.

**5. A node type must exist in BOTH catalogs.** Backend registration
(`node-library.ts`) is not enough. `workflowValidation.ts` builds its valid set
from the FRONTEND catalog (`nodeTypes.ts` → `NODE_TYPES`) and rewrites anything it
cannot find to `http_request` as a last resort — silently, on "Use Template".

`database_read` and `database_write` are registered in the backend but missing
from the frontend, so all ten uses across the five Agent templates arrived on the
canvas as generic HTTP nodes. The Sales Agent's CRM step showed up as "HTTP & API".
All ten have been replaced with types present in both catalogs (HubSpot for the
CRM step, PostgreSQL for genuine table work), and the contract test now checks
both catalogs.

**Also pick the node that matches the job.** A qualified lead belongs in a CRM
node, not a generic database write — the library has 18 CRM nodes.

## Still outstanding

**Rendering the notes.** They now exist in the template data (`data.notes` on all
181 nodes) and `NodeData`'s index signature accepts them without a type change.
What does not exist yet is the UI — the node inspector and canvas hover card still
show nothing. The content is ready for it.

**The catalog gap itself.** These templates no longer use `database_read` /
`database_write`, but the underlying problem is untouched: both are still
backend-registered and frontend-missing, so **any AI-generated workflow that picks
them still degrades to `http_request`**. Fix it by either adding both to
`nodeTypes.ts` or removing them from the backend registry. Worth checking whether
other backend-only types have the same gap.
