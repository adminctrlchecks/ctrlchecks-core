# MySQL Connection — Changes Made

Goal: verify the MySQL database connection feature actually works end-to-end (create
connection → configure a node → run it → get real data back), and fix whatever was
broken along the way. Tested locally against a Docker MySQL container
(`testdb.users` table, seeded with Alice/Bob).

---

## 1. New feature: pick Database/Table from a live dropdown

Previously the MySQL node's Database and Table fields were plain text boxes — you had
to type the exact name blind. Added a dropdown that introspects the real connection.

**New files:**
- `worker/src/api/database-explorer.ts` — `listMysqlDatabasesHandler` /
  `listMysqlTablesHandler`. Opens a real `mysql2` connection with the given
  host/port/username/password and runs `SHOW DATABASES` / `SHOW TABLES`.
- `ctrl_checks/src/lib/api/databaseExplorer.ts` — frontend client for the above.
- `ctrl_checks/src/components/workflow/MysqlResourceSelect.tsx` — the dropdown +
  refresh-button UI component, with a manual text fallback if introspection fails.

**Modified files:**
- `worker/src/index.ts` — registered two new authenticated routes:
  `POST /api/database-explorer/mysql/databases` and `.../mysql/tables`.
- `ctrl_checks/src/components/workflow/nodeTypes.ts` — added `mysqlDatabaseSelect`
  and `mysqlTableSelect` to the `ConfigField` type union.
- `ctrl_checks/src/lib/schemaConverter.ts` — maps the MySQL node's `database`/`table`
  fields to the new dropdown widget types.
- `ctrl_checks/src/components/workflow/PropertiesPanel.tsx` — renders
  `MysqlResourceSelect` for those two field types.

Scope note: this was deliberately built for MySQL only (not Mongo/Firebase/Supabase/
Oracle) as a first pass, per the plan agreed before starting.

---

## 2. Bug fix: "Test Connection" button was a no-op for MySQL (and Mongo/Firebase/Supabase)

`worker/src/credentials-system/connection-service.ts` → `testConnection()` only does a
real check if the credential type defines `testRequest` (an HTTP request it fires).
`mysql_connection`, `mongodb_connection`, `firebase_credentials`, and
`supabase_api_key` never defined one, so clicking "Test MySQL" always reported
success regardless of whether the credentials were valid. **Not fixed** — flagged and
left as-is since it needs a real driver-level test call per DB type, which is a
separate, larger task. Worth doing next if this matters for the other DB types.

---

## 3. Bug fix: "Run" button stayed disabled even with a valid, connected MySQL account

Root cause, found by tracing the `/api/workflows/:id/missing-items` check that gates
the Run button:

- **`worker/src/services/ai/credential-config-satisfaction.ts`** —
  `isCredentialSatisfiedByNodeConfig()` had no handling at all for credential
  `type: 'runtime'` (which is what DB connections use) — it fell through to
  `return false`, permanently. Added a `runtime` branch that checks:
  1. `credentialFieldName` on the config (e.g. a `connectionString` field), then
  2. discrete `host` + `username` + `password` fields typed directly into the node, then
  3. a linked saved Connection via `node.data.connectionRefs` (the "Connect MySQL DB"
     flow in the Properties Panel) — this is the path that was actually missing and
     caused the bug.

- **`worker/src/services/ai/credential-discovery-phase.ts`** and
  **`worker/src/services/ai/credential-resolver.ts`** — both had a "ghost UUID"
  safety check that validated `credentialId`/`credentialRef` existed in the
  `connections` table, but never checked `connectionRefs` the same way. Extended both
  to also validate `connectionRefs` entries exist and are `status = 'active'`, so a
  deleted/revoked connection can't silently report as satisfied.

---

## 4. Bug fix: MySQL execution always failed with "operation is required"

Even after the Run button unlocked, execution failed immediately. Root cause: the
**actual registered node schema** for MySQL
(`worker/src/services/nodes/node-library.ts` → `createMysqlSchema()`) only exposes
`query` and `parameters` fields — a "just write raw SQL" design with no separate
`operation`/`table` concept. But the executor,
**`worker/src/services/database/mysqlNode.ts`** → `runMySQLNode()`, still hard-required
`inputs.operation` to be set (impossible, since the schema never lets a user set it)
and read a field called `inputs.params` (the schema calls it `parameters`, not `params`).

Fixed in `runMySQLNode()`:
- Defaults `operation.name` to `'executeQuery'` when not provided.
- Reads `inputs.params ?? inputs.parameters` so the schema's actual field name works.

---

## Result

MySQL node now works end-to-end locally: Connections page → save credentials →
Properties Panel dropdown picks database/table → node links the saved connection →
Run executes a real query against the test MySQL container and returns rows
successfully (verified against `testdb.users`: Alice, Bob).

## Known follow-ups (not done yet)

- "Test Connection" button is still a no-op for MySQL/Mongo/Firebase/Supabase (see #2).
- The generic vault-injection path (`injectDashboardCredential` in
  `worker/src/core/registry/unified-node-registry-legacy-adapter.ts`) assumes a single
  scalar credential value per connector and doesn't cleanly map multi-field DB
  connections (host/port/username/password/database) — the fix above worked because
  the node config already carried a `connectionRefs` reference resolved through the
  `connections` table path, not through this generic injector. Worth a closer look if
  Mongo/Postgres/Oracle hit different symptoms.
- Same fixes (dropdown picker, Run-button gating, operation/params handling) have not
  been applied to MongoDB, Firebase, Supabase, or Oracle yet — MySQL was the agreed
  first pass.
