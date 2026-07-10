# MongoDB Node — Changes Made

Goal: verify the MongoDB CRUD operations actually work end-to-end (Find, Insert One,
Update One, Delete One), and add the same table/collection browser + row preview
already built for MySQL. Tested locally against a Docker MongoDB container
(`testdb.users` collection, seeded with Alice/Bob).

---

## 1. Bug fix: saved MongoDB connection couldn't actually execute

`mongodb_connection` credential stores the full connection string in its `username`
field and an optional DB-name override in `password` (see
`credential-type-registry.ts`). `runMongoDBNode()` (`worker/src/services/database/mongoDBNode.ts`)
treated `inputs.username`/`inputs.password` as literal discrete auth
credentials, never as "this is actually the connection string" — so any node
linked to a saved connection failed with `"host is required when
connectionString is not provided"`.

**Fix:** `runMongoDBNode()` now detects when `inputs.username` matches
`mongodb://` or `mongodb+srv://` and treats it as the connection string,
falling back to `inputs.password` as the database name override.

---

## 2. Bug fix: UI only ever exposed "Find" — no Insert/Update/Delete

`ctrl_checks/src/components/workflow/nodeTypes.ts`'s MongoDB Operation dropdown
was hardcoded to a single "Find" option, and the filter field wrote to
`config.query` while the executor read `inputs.filter` — so even Find silently
ignored whatever the user typed.

**Fix:**
- Operation dropdown now offers Find / Insert One / Update One / Delete One.
- Renamed the filter field's key from `query` to `filter` to match the executor.
- Added `document` (Insert One) and `update` (Update One) fields, each shown
  only for the relevant operation via `visibleIf`.
- Updated `worker/src/services/nodes/node-library.ts`'s AI-generation schema/examples
  to match (`insertOne`/`updateOne`/`deleteOne`, `filter`/`document`/`update`).

---

## 3. Bug fix: a *second*, separate hardcoded operation list overrode the dropdown

The Operation dropdown's actual rendered options/labels come from
`worker/src/core/registry/generated-node-operation-contracts.ts`
(`GENERATED_NODE_OPERATION_VALUES`) — a lookup table completely independent of
`node-library.ts`'s schema. It still listed `['delete', 'find', 'insert', 'update']`
(no `deleteOne`/`insertOne`/`updateOne`), so the dropdown showed stale values no
matter what the schema said.

**Fix:** updated the `mongodb` entry to
`['find', 'insertOne', 'updateOne', 'deleteOne']` — **`find` deliberately listed
first**, since this array's first entry becomes the field's default value, and
defaulting a fresh node to a destructive delete would be a bad surprise.

**Gotcha found while fixing this:** the field's *default* value is only ever
shown visually — it is not written into `node.data.config` until the user
actually interacts with the control. A node created before this fix had no
`operation` key in its saved config at all, even though the dropdown displayed
"DeleteOne" (the then-current default). Save correctly rejected it with
`"operation is required"`. Fix for existing nodes: delete and re-add, then
actively click the dropdown once even if the value already looks selected.

---

## 4. Bug fix: Update field couldn't express `$set` (or any operator)

`ctrl_checks/src/lib/schemaConverter.ts`'s `detectObjectWidget()` renders every
plain-object-typed field as a flat key-value editor by default. That works fine
for simple filters like `{"name": "Alice"}`, but MongoDB's Update field needs
nested operators (`{"$set": {"name": "..."}}`) that a flat key-value list
cannot represent — it silently flattened to `{"name": "..."}`, which MongoDB
then rejected ("update document requires atomic operators").

**Fix:** added a MongoDB-specific case so `filter`/`document`/`update` render
as raw JSON textareas instead of key-value editors.

---

## 5. New feature: "Browse Collections" + document preview

Mirrors the MySQL "Browse Tables" work.

**New files:**
- `worker/src/api/database-explorer.ts` — added `listMongoCollectionsHandler` /
  `previewMongoCollectionHandler` (alongside the existing MySQL handlers in the
  same file). Resolves the connection string the same way as the executor fix
  above, runs `listCollections()` / `find().limit(5)`.
- `ctrl_checks/src/lib/api/databaseExplorer.ts` — added
  `fetchMongoCollectionsForConnection` / `fetchMongoCollectionPreview` client
  functions (alongside the existing MySQL ones).
- `ctrl_checks/src/components/workflow/MongoCollectionSelect.tsx` — collection
  name field with a "Browse Collections" button; expanding a collection shows
  up to 5 sample documents (column set is a union across the sample, since
  documents can vary in shape) before you write a filter/document/update by hand.

**Modified files:**
- `worker/src/index.ts` — registered `POST /api/database-explorer/mongo/collections`
  and `POST /api/database-explorer/mongo/preview`.
- `ctrl_checks/src/components/workflow/nodeTypes.ts` — Collection field type
  changed to `mongoCollectionSelect`.
- `ctrl_checks/src/components/workflow/PropertiesPanel.tsx` — renders
  `MongoCollectionSelect` for that field type.
- `ctrl_checks/src/lib/schemaConverter.ts` — added the `mongodb`/`collection`
  override so the live backend schema actually picks the custom widget instead
  of defaulting to a plain text input (see gotcha below).

**Gotcha found while wiring this up:** field widget type is decided by
`schemaConverter.ts`'s live backend-schema conversion, which takes priority
over `nodeTypes.ts`'s local field type. A per-node/per-field override line
(matching the existing MySQL `mysqlQueryEditor` pattern) is required for any
custom widget to actually render — just declaring the type in `nodeTypes.ts`
is not enough.

---

## 6. Also fixed in passing: swallowed save-error detail

`ctrl_checks/src/pages/WorkflowBuilder.tsx`'s auto-save error handler did
`errorData.error || errorData.message` — the backend puts the generic label
("Workflow validation failed") in `.error` and the actual specific reason
("Cannot save workflow: operation is required") in `.message`. Since `.error`
is always truthy when present, the specific reason was never visible in the
console. Swapped the priority so `.message` wins.

---

## Result

MongoDB node now works end-to-end locally: Connections page → save connection
string → Properties Panel "Browse Collections" picks a collection and previews
sample documents → Find / Insert One / Update One / Delete One all execute
correctly against a real MongoDB container (verified against `testdb.users`:
Alice, Bob, plus a full create → update → delete cycle on a "Charlie" record).

## Known follow-ups (not done yet)

- Insert Many / Update Many / Delete Many / Aggregate operations are supported
  by the executor (`mongoDBNode.ts`) but not yet exposed in the UI — Find/Insert
  One/Update One/Delete One was the agreed scope for this pass, matching MySQL's
  single-record scope.
- The `filter` field is still capable of holding operators (`$gte`, etc.) via
  the JSON textarea fix above, but there's no builder UI for them — raw JSON only.
- Same widget-override gotcha (schemaConverter.ts) likely affects other nodes
  with custom field types added the same way — worth an audit if more custom
  widgets are added later.
