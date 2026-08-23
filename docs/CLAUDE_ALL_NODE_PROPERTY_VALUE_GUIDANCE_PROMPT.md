# Claude Prompt: Audit And Complete "How To Set Value" Guidance For Every Node Property

Copy/paste this whole prompt into Claude when you want it to continue the node-property guidance audit.

---

You are working in the CtrlChecks monorepo:

- Frontend: `ctrl_checks/`
- Worker/backend: `worker/`

Your job is to audit and improve **every node property / config field** so the product clearly explains:

- what the field means,
- why it matters,
- when the user should fill it,
- what value to enter,
- where that value comes from,
- whether the user must run/add another workflow step to get that value,
- how to map it from a previous step,
- accepted format,
- realistic workplace examples,
- what happens if the value is missing or wrong,
- common mistakes.

This is specifically about the in-product "How to set/How to choose ..." guidance shown from the workflow properties panel, like:

> How to set Event Id?
>
> Follow these steps to get the required information.

That panel must be useful for a non-technical user. A field guide is not complete if it only says "enter an ID", "select an option", "example: test", or gives content without explaining **how the user obtains the value**.

## Critical Context To Read First

Before editing anything, read these files in full:

1. `docs/NODE_FIELD_GUIDANCE_AND_DOCUMENTATION_AUDIT_PLAN.md`
2. `docs/AI_AGENT_COMPLETE_SESSION_SUMMARY_AND_HANDOVER.md`
3. `docs/AI_AGENT_END_TO_END_DEBUG_AND_FIX_LOG.md`
4. `docs/BLANK_FIELD_INTEGRITY_ROOT_CAUSE_RESEARCH.md`

Important existing context:

- `ctrl_checks/src/docs-content/node-field-content.ts` was confirmed dead code. Do **not** maintain it unless you first prove it is imported again.
- The active field-help UI reads from the current frontend guidance/doc sources, especially `ctrl_checks/src/components/workflow/nodeGuides.ts`, `ctrl_checks/src/lib/resolve-field-help-content.ts`, node docs in `ctrl_checks/src/docs-content/nodes/*.doc.ts`, and node config definitions.
- Do not assume a tracker saying "Complete" means the field-level value guidance is sufficient. Re-check every field against this prompt's stricter "how to obtain the value" standard.

## Non-Negotiable Output Goal

Every UI-visible node must have complete, practical, field-level guidance for every visible property and every operation-specific/conditional property.

For every node field, the user should be able to answer:

1. Can I type this value manually?
2. Can I pick it from a dropdown?
3. Does CtrlChecks fill it at runtime?
4. Does it come from Connections/credentials?
5. Does it come from a previous workflow step?
6. If it comes from a previous step, which node/operation should I add first?
7. Which output field should I map?
8. What expression should I use?
9. What format does the provider API expect?
10. What error or bad workflow behavior happens if I leave it blank or use the wrong value?

## Main Files To Inspect

Use repo facts, not memory.

For each node, inspect:

- `worker/public/node-library.json`
- `worker/src/services/nodes/node-library.ts`
- node runtime implementation in `worker/src/api/execute-workflow.ts`
- registry override in `worker/src/core/registry/overrides/<node>.ts`, if present
- shared provider executors under `worker/src/shared/`, if present
- credential/connection definitions under `worker/src/credentials-system/`, `worker/src/services/connectors/`, and connection-related worker API files
- `ctrl_checks/src/components/workflow/nodeTypes.ts`
- `ctrl_checks/src/components/workflow/nodeGuides.ts`
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts`
- `ctrl_checks/src/docs-content/nodes/<node>.doc.ts`
- `ctrl_checks/src/docs-content/node-content-overrides.ts`
- `ctrl_checks/src/docs-content/search/<node>.ts`
- `ctrl_checks/src/docs-content/manifest.ts`
- tests under matching `__tests__/` directories

Also search for node-specific files/components before editing each node.

## Required Loop

Work node by node. Do not stop after creating a plan.

Use this loop:

1. Pick the next UI-visible node.
2. Read its backend schema, frontend config fields, runtime code, docs, search docs, usage guide, node guide, and connection guidance.
3. Build a field matrix.
4. Identify missing/thin/incorrect guidance.
5. Update guidance and docs.
6. Add or update coverage tests.
7. Run focused verification for the batch.
8. Record what was completed.
9. Move to the next node.
10. Continue until all UI-visible nodes are complete.

If context/time runs out, leave a clear continuation note with:

- last completed node,
- next node,
- files touched,
- tests run,
- known warnings,
- remaining gaps.

## Field Matrix Required Before Editing Each Node

For every node, create this matrix in your working notes before editing:

| Field | Label | Type | Visible In UI? | Operation(s) | Required When | Source Of Value | How To Obtain | Mapping Example | Current Guidance Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `eventId` | Event ID | text | yes | get/update/delete/move | existing event operation | previous Calendar List/Get/Create output | add Google Calendar List or Create first | `{{$json.id}}` | thin/missing/complete |

The "How To Obtain" column is mandatory. This is the main thing being fixed.

## Required Help Text Structure

Every "How to set ..." field guide must be written in plain language and include these items. Use short numbered steps or concise paragraphs that fit the existing UI pattern.

Minimum required structure:

1. **What this field means:** define the field in user language.
2. **Why it matters:** explain what the node/provider does with it.
3. **When to fill it:** say which operation/mode needs it and when it can be blank.
4. **What to enter:** say the exact kind of value.
5. **Where the value comes from:** say whether it comes from the provider UI, Connections, a previous node, trigger data, AI runtime, or user typing.
6. **How to get the value:** give concrete acquisition steps.
7. **How to map it from a previous step:** include the likely previous node/operation and expression.
8. **How to use it later:** explain whether this field is echoed in output or useful for chaining.
9. **Accepted format:** string, number, boolean, ISO date, email, URL, JSON object, array, provider ID, etc.
10. **Real workplace example:** use a realistic business scenario.
11. **If it is empty or wrong:** explain actual failure or behavior.
12. **Common mistake:** warn about the most likely confusion.

Do not fake details. If the runtime behavior is limited or broken, document the real behavior honestly.

## Special Rules By Field Type

### ID Fields

Any field ending in `Id`, `_id`, `ID`, or described as an identifier must explain how to obtain the ID.

Examples:

- Event ID: run Google Calendar List/Get/Create first, then map `{{$json.id}}` or each item's `{{$json.items[0].id}}` / loop item `{{$json.id}}`, depending on actual output.
- Spreadsheet ID: copy from the Google Sheets URL or get it from a previous Google Sheets/Drive step.
- Database ID: copy from the provider URL or use a previous List/Search database step.
- Card ID / Issue ID / Contact ID: use a Find/List/Create step first, then map the returned ID.

For every ID field, clearly state:

- can it be copied from the third-party app URL?
- can it be selected from a connection picker?
- can it be produced by a previous List/Search/Create node?
- which exact prior operation is recommended?
- which output key should be mapped?

### Dropdown Fields

Every dropdown/select option must explain:

- what the option does,
- when to choose it,
- which fields become required after choosing it,
- what output/behavior to expect,
- a workplace example.

Use "How to choose ..." rather than "How to set ..." for dropdowns when the UI does that.

### Date/Time Fields

Explain:

- accepted formats, usually ISO 8601 if runtime expects it,
- timezone behavior,
- examples such as `2026-08-23T09:00:00Z`,
- whether a Date & Time node can generate it,
- how to map from form/schedule/calendar trigger output,
- common mistake: local time without timezone.

### JSON/Object/Array Fields

Explain:

- whether the user can type JSON manually,
- whether the field expects an object or array,
- minimal valid example,
- how to map a full object from a previous step,
- common parsing failures.

Do not show invalid JSON.

### Expression/Mapping Fields

Explain both modes:

- fixed value: user types a literal value,
- mapped value: user inserts a value from a previous node.

Include examples like:

- `{{$json.email}}`
- `{{$json.customerEmail}}`
- `{{$json.items[0].id}}`
- `{{$json.data.id}}`

Only use expressions that are actually supported by the resolver. If uncertain, inspect `worker/src/core/utils/universal-template-resolver.ts` and related resolver code.

### Connection/Credential Fields

Do not tell users to paste secrets into normal fields unless the runtime truly requires a raw key.

Explain:

- which account to connect,
- where to connect it in CtrlChecks,
- required scopes/permissions,
- whether the field is metadata only or actually used at runtime,
- what to do if permission is denied,
- how to test the connection.

### AI Runtime / Build-Time Fields

For fields controlled by `_fillMode` or registry `fillMode`:

- `manual_static`: user owns the value; blank must stay blank.
- `runtime_ai`: AI fills it at execution time from the current request/input.
- `buildtime_ai_once`: AI generates a saved starting value while building/configuring.

Explain this in user language, not internal terms unless needed.

Example:

> If this field is set to AI at runtime, leave it blank in setup. The agent will choose the value from the user's current request. If you want a fixed value every run, switch it to manual and type the value.

## "How To Get This Value" Patterns To Add Everywhere

For each field, classify the source and write the matching guidance.

### Source: Previous Workflow Step

Say:

- which step to add first,
- which operation to use,
- what that step returns,
- which output key to map,
- whether to loop over returned items.

Example:

> To get an Event ID, add a Google Calendar List step first. It returns events with an `id`. If you are looping over events, map the current event ID with `{{$json.id}}`. If you only need the first returned event, map `{{$json.items[0].id}}` if that matches the actual output shape.

### Source: Third-Party App UI

Say:

- where in the app to find/copy it,
- whether it is in the URL,
- whether admin permissions are needed,
- what not to copy.

Example:

> To get a Google Spreadsheet ID, open the sheet and copy the long ID between `/d/` and `/edit` in the browser URL. Do not paste the whole URL unless the field explicitly accepts full URLs.

### Source: Connection

Say:

> This value comes from your saved connection. Connect the account in Connections first. Do not paste access tokens into this field unless the node documentation says legacy token mode is supported.

### Source: Trigger Payload

Say:

> This value can come from the trigger. For a form trigger, use the internal field name, such as `{{$json.customer_email}}`. For a chat trigger, use the message fields actually emitted by the trigger.

### Source: User Input / Static Value

Say:

> Type the fixed value you want this workflow to use every run.

### Source: Generated By This Node

Say:

> You do not enter this before running. The provider creates it and returns it in the output. Use it in later nodes by mapping the returned field.

## Required Quality Bar

Bad guidance examples:

- "Enter the ID."
- "Select the operation."
- "The event ID."
- "Example: abc123."
- "Configure this value."

Good guidance examples:

- "The Event ID identifies the exact existing calendar event to update or delete. You usually get it from a previous Google Calendar List or Create step. For a loop over listed events, map the current event with `{{$json.id}}`. If it is blank or wrong, Google Calendar cannot know which event to change."
- "Choose List when you want to find existing records before updating them. List is often used before Update/Delete because it gives you the record ID needed by later steps."
- "The Calendar ID is usually `primary` for your own main calendar. Use another calendar's ID only when you intentionally want a shared/team calendar; you can find it in Google Calendar settings under Integrate calendar."

## Accuracy Rules

- Never invent an operation that runtime does not support.
- Never invent output fields.
- Never claim a provider supports picker/dropdown selection if the UI does not implement it.
- Never document a decorative or unused field as functional.
- If the UI exposes an option that runtime rejects, either fix the small mismatch if safe or document it honestly.
- If a field is legacy-only or AI-generated-workflow-only, say that clearly.
- If the runtime output shape differs from docs, update docs to match runtime.

## Testing / Verification Rules

Do not run full `npm test`.

Use focused tests and builds.

Frontend focused docs tests:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

Frontend type/build:

```powershell
cd ctrl_checks
npx tsc --noEmit
npm run build
```

Worker type/build if worker schemas, runtime notes, generated schema, or shared docs/contracts are touched:

```powershell
cd worker
npm run type-check
npm run build
```

Run any node-specific focused test touched by the batch.

Known warnings may exist; report them clearly instead of hiding them.

## Batch Size

Work in batches of 3 to 5 nodes.

After each batch:

1. Run focused docs tests.
2. Run frontend build.
3. Run worker type-check/build if worker files or schema-derived assumptions were touched.
4. Summarize completed nodes.
5. Record remaining nodes.
6. Continue.

If a batch touches shared files like `nodeGuides.ts`, `nodeUsageGuides.ts`, `nodeTypes.ts`, docs coverage tests, or manifest/search infrastructure, be extra careful with syntax and run verification before moving on.

## Required Per-Node Completion Report

After each node, report:

- Node type and label.
- Fields audited.
- Operations audited.
- Value-source patterns added.
- Files changed.
- Tests run.
- Any runtime mismatch found.
- Whether the node is complete.
- Next node.

## Final Definition Of Done

The entire task is complete only when:

- every UI-visible node has field guidance,
- every visible field has "how to obtain this value" guidance,
- every ID/reference field explains the previous step or app UI source,
- every dropdown option is explained,
- every operation has required/optional/conditional field guidance,
- input examples and output examples match runtime,
- connection guidance is accurate,
- tests/builds pass,
- no stale placeholder-only help remains.

## Start Now

Begin by:

1. Reading the required context files.
2. Checking `git status`.
3. Locating the current source of field help shown by the "How to set ..." panel.
4. Listing all UI-visible nodes from `ctrl_checks/src/components/workflow/nodeTypes.ts`.
5. Picking the first node and building its field matrix.
6. Editing the files needed for that node.
7. Continuing node by node in the loop above.

Do not stop after analysis. Continue implementing until all nodes are covered or a real blocker is reached.

Do not commit.
Do not revert unrelated user changes.
