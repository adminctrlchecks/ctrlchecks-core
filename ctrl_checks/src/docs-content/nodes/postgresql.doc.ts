import type { FieldDoc, NodeDoc } from '../types';

const help = (
  field: string,
  why: string,
  when: string,
  enter: string,
  source: string,
  format: string,
  example: string,
  wrong: string,
  mistake: string,
) => `What this field is: ${field}
Why it matters: ${why}
When to fill it: ${when}
What to enter: ${enter}
Where the value comes from: ${source}
How to use it later: Map it from a previous step with {{$json.fieldName}}, or use this node output later as {{$json.rows}}, {{$json.rowsAffected}}, or {{$json.inserted}} depending on the operation.
Accepted format: ${format}
Real workplace example: ${example}
If it is empty or wrong: ${wrong}
Common mistake: ${mistake}`;

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'Choose executeQuery, insert, update, or delete.',
  options: ['executeQuery', 'insert', 'update', 'delete'],
  helpText: help('The PostgreSQL action to run.', 'It tells the executor whether to run raw SQL or build an insert/update/delete statement from table fields.', 'Choose it first because it controls which fields matter.', 'Use executeQuery for raw SQL; insert to add rows; update to change rows; delete to remove rows.', 'Choose from the dropdown based on the workflow outcome you want.', 'One of executeQuery, insert, update, or delete.', 'executeQuery for a daily revenue report with a SELECT and GROUP BY.', 'Unsupported values return "operation must be one of: executeQuery, insert, update, delete".', 'Do not use old visual values such as select/query in saved JSON; the UI now uses runtime values.'),
  defaultValue: 'executeQuery',
};

const connectionFields: FieldDoc[] = [
  {
    name: 'Connection String',
    internalKey: 'connectionString',
    type: 'string',
    required: false,
    description: 'Backend schema connection-string field.',
    helpText: help('A generated-schema field for a PostgreSQL connection URL.', 'The registry advertises it, but the current executor validates host, username, password, database, port, and ssl inputs instead of reading connectionString directly.', 'Use it only when a generated workflow or credential adapter supplies it; prefer a saved PostgreSQL connection for normal UI work.', 'A PostgreSQL URL such as postgresql://user:pass@host:5432/dbname if your integration path supports it.', 'Copy it from your database provider or secret manager. Do not paste production passwords into normal workflow input data.', 'PostgreSQL connection URI.', 'postgresql://report_user:***@db.example.com:5432/analytics', 'By itself it may not satisfy the current executor; missing host/database/username/password can still produce _error.', 'Do not assume this field replaces the saved PostgreSQL connection in the current runtime path.'),
    placeholder: 'postgresql://user:pass@host:5432/dbname',
    example: 'postgresql://user:pass@host:5432/dbname',
  },
  {
    name: 'Host',
    internalKey: 'host',
    type: 'string',
    required: true,
    description: 'PostgreSQL server host.',
    helpText: help('The network address of the PostgreSQL server.', 'The pg driver cannot connect without a host.', 'Fill it when the selected PostgreSQL connection does not inject it.', 'Enter a host such as db.example.com, localhost, or an RDS endpoint.', 'Copy it from your hosting dashboard, pgAdmin connection settings, or DBA. You can map {{$json.pgHost}} for environment-specific workflows.', 'Host name or IP address only, without protocol or port.', 'analytics-db.us-east-1.rds.amazonaws.com', 'The run returns _error with "host is required" or a network/TLS error.', 'Do not paste the whole connection string into Host.'),
    placeholder: 'db.example.com',
    example: 'analytics-db.us-east-1.rds.amazonaws.com',
  },
  {
    name: 'Port',
    internalKey: 'port',
    type: 'number',
    required: false,
    description: 'PostgreSQL port.',
    helpText: help('The TCP port used by PostgreSQL.', 'The driver combines Host and Port to reach the right server process.', 'Fill it if your server does not use 5432.', 'Enter 5432 for most PostgreSQL databases or the custom port from your provider.', 'Find it in your hosting connection details. You can map {{$json.pgPort}}.', 'Number between 1 and 65535.', '5432 for a managed PostgreSQL database.', 'The run returns a port validation error or cannot connect.', 'Do not use MySQL port 3306 unless your PostgreSQL provider explicitly says so.'),
    placeholder: '5432',
    defaultValue: '5432',
    example: '5432',
  },
  {
    name: 'Database',
    internalKey: 'database',
    type: 'string',
    required: true,
    description: 'Database name.',
    helpText: help('The PostgreSQL database to open after connecting.', 'A PostgreSQL server can hold many databases, and queries run inside one selected database.', 'Required unless injected by a saved connection.', 'Enter the exact database name, such as analytics or app_production.', 'Copy it from your provider, pgAdmin, psql, or app config. You can map {{$json.database}}.', 'Plain database name.', 'analytics for reporting workflows.', 'The run returns "database is required" or PostgreSQL says the database does not exist.', 'Do not enter the table name here.'),
    placeholder: 'analytics',
    example: 'analytics',
  },
  {
    name: 'Username',
    internalKey: 'username',
    type: 'string',
    required: true,
    description: 'PostgreSQL user.',
    helpText: help('The database user used for authentication.', 'PostgreSQL checks this user and its table permissions before executing SQL.', 'Required unless injected by a saved connection.', 'Enter a least-privilege user name such as report_reader or workflow_writer.', 'Copy it from your database credential record or ask your DBA. You can map {{$json.pgUser}} for generated secure configs.', 'Plain database role/user name.', 'report_reader for read-only dashboards.', 'The run returns "username is required" or PostgreSQL returns permission/authentication errors.', 'Do not use a superuser for routine automations.'),
    placeholder: 'report_reader',
    example: 'report_reader',
  },
  {
    name: 'Password',
    internalKey: 'password',
    type: 'password',
    required: true,
    description: 'PostgreSQL password.',
    helpText: help('The secret password for the PostgreSQL user.', 'The database rejects unauthenticated connections.', 'Prefer Connections; use this field only as a direct fallback.', 'Use the password for the selected user.', 'Retrieve it from your credential vault, provider secret screen, or DBA. Avoid mapping secrets from regular upstream data.', 'Secret text stored as a masked password value when used directly.', 'A saved PostgreSQL connection for report_reader.', 'The run returns "password is required" or authentication failed.', 'Do not paste passwords into test payloads, logs, or non-secret workflow fields.'),
    placeholder: 'Use Connections when possible',
    notes: 'Store PostgreSQL passwords in Connections or a credential vault whenever possible.',
  },
  {
    name: 'SSL Mode',
    internalKey: 'ssl',
    type: 'select',
    required: false,
    description: 'PostgreSQL SSL setting.',
    options: ['disable', 'require', 'verify-full'],
    helpText: help('Controls encrypted PostgreSQL transport.', 'Managed databases often require SSL, while local databases often reject it.', 'Set it when your provider requires a specific SSL mode.', 'Choose disable for local/no-SSL, require for encrypted managed connections, or verify-full when certificates are configured.', 'Check provider docs or the DBA runbook. You can map {{$json.sslMode}}.', 'Dropdown value: disable, require, or verify-full.', 'require for most cloud PostgreSQL databases.', 'The run may fail with "server does not support SSL connections" or certificate errors.', 'Do not use verify-full unless certificate validation is actually configured.'),
    defaultValue: 'disable',
    example: 'require',
  },
];

const queryFields: FieldDoc[] = [
  operationField,
  ...connectionFields,
  {
    name: 'Query',
    internalKey: 'query',
    type: 'textarea',
    required: true,
    description: 'SQL query to execute.',
    helpText: help('The raw SQL statement sent to PostgreSQL for Execute Query.', 'It is the instruction PostgreSQL runs and can read or write data depending on the SQL.', 'Required for executeQuery.', 'Write SQL with $1, $2 placeholders and put values in Parameters.', 'Write it yourself, ask a developer/DBA, or map an approved query from {{$json.sql}}.', 'PostgreSQL SQL string using positional placeholders for values.', 'SELECT id, email FROM customers WHERE status = $1 ORDER BY created_at DESC LIMIT 50', 'The run returns "query is required for executeQuery operation" or a PostgreSQL syntax error.', 'Do not paste customer-controlled values directly into SQL text.'),
    placeholder: 'SELECT * FROM users WHERE id = $1',
    example: 'SELECT id, email FROM customers WHERE status = $1 LIMIT 50',
  },
  {
    name: 'Parameters',
    internalKey: 'parameters',
    type: 'json',
    required: false,
    description: 'Values for $1, $2, and later placeholders.',
    helpText: help('A JSON array of values bound to PostgreSQL query placeholders.', 'It keeps data values separate from SQL text and now maps to the executor params field.', 'Fill it when Query contains $1, $2, or later placeholders.', 'Enter an ordered array such as ["active", "{{$json.customerId}}"].', 'Map values from forms, webhooks, CRM records, or earlier database rows.', 'JSON array in placeholder order.', '["active"] for WHERE status = $1.', 'A wrong order or missing value can return bind errors or match the wrong rows.', 'Do not enter a JSON object for positional placeholders.'),
    placeholder: '["{{$json.userId}}"]',
    example: '["active"]',
  },
];

const writeFields: FieldDoc[] = [
  operationField,
  ...connectionFields,
  {
    name: 'Table',
    internalKey: 'table',
    type: 'string',
    required: true,
    description: 'PostgreSQL table to change.',
    helpText: help('The table used by Insert, Update, and Delete helper operations.', 'The executor quotes the table name and builds SQL around it.', 'Required for insert, update, and delete.', 'Enter the exact table name such as customers, orders, or events.', 'Copy it from pgAdmin, psql, your ORM schema, or your DBA. You can map {{$json.tableName}} for controlled generated workflows.', 'Plain table name.', 'customers for customer lifecycle updates.', 'The run returns "table is required" or PostgreSQL says the relation does not exist.', 'Do not include unsafe user-provided table names.'),
    placeholder: 'customers',
    example: 'customers',
  },
  {
    name: 'Data',
    internalKey: 'data',
    type: 'json',
    required: true,
    description: 'Column values for insert or update.',
    helpText: help('The column values to write.', 'Insert uses this as the new row; Update uses it as the new values for matched rows.', 'Required for insert and update. Not used by delete.', 'Enter a JSON object, or an array of objects for multiple inserts.', 'Map values from a previous trigger, form, CRM, or database lookup.', 'JSON object or array of objects.', '{"email":"alex@example.com","status":"active"}', 'The run returns "data is required" or PostgreSQL rejects invalid columns/types.', 'Do not include columns that the database user is not allowed to write.'),
    placeholder: '{"status": "active"}',
    example: '{"email":"alex@example.com","status":"active"}',
  },
  {
    name: 'Where',
    internalKey: 'where',
    type: 'json',
    required: true,
    description: 'Exact-match filter for update or delete.',
    helpText: help('The filter deciding which rows Update or Delete touches.', 'The executor requires it for update/delete to avoid changing every row.', 'Required for update and delete.', 'Enter a JSON object with column names and exact values to match.', 'Use IDs or stable keys from prior nodes, such as {{$json.customerId}}.', 'JSON object. Multiple entries are joined with AND.', '{"id":"{{$json.customerId}}"}', 'The run returns "where clause is required" or updates/deletes zero rows when no match exists.', 'Do not leave Where empty for destructive operations.'),
    placeholder: '{"id": "{{$json.customerId}}"}',
    example: '{"id":"{{$json.customerId}}"}',
  },
];

export const postgresqlDoc: NodeDoc = {
  slug: 'postgresql',
  displayName: 'PostgreSQL',
  category: 'Data',
  logoUrl: '/icons/nodes/postgresql.svg',
  description: 'Run PostgreSQL SQL queries and table write operations. Use it for reporting, analytics, workflow state tables, audit logs, and controlled database writes.',
  credentialType: 'PostgreSQL Database Connection',
  credentialSetupSteps: [
    'Create or choose a PostgreSQL role with the least permissions required by the workflow.',
    'In CtrlChecks, open Connections -> Add Connection -> PostgreSQL and store host, port, database, username, password, and SSL mode in the credential vault whenever possible.',
    'The generated backend schema mentions connectionString, but the current executor reads host, username, password, database, port, and ssl inputs; a small alias fix also accepts Parameters for query placeholders.',
    'Test with SELECT 1 or a small SELECT before enabling insert, update, or delete operations.',
    'Connect this node output to the next node with an outgoing line; downstream service node account connection is still required for email, CRM, Slack, or storage nodes.',
  ],
  credentialDocsUrl: 'https://www.postgresql.org/docs/current/tutorial-accessdb.html',
  resources: [
    {
      name: 'Operations',
      description: 'PostgreSQL runs through the database executor and returns either rows/rowsAffected/count objects or _error when validation/driver execution fails.',
      operations: [
        {
          name: 'Execute Query',
          value: 'executeQuery',
          description: 'Runs a raw PostgreSQL SQL statement with optional Parameters. Use this for SELECT queries, joins, reports, stored SQL snippets, or custom write statements that need RETURNING.',
          fields: queryFields,
          outputExample: { rows: [{ id: 42, email: 'alex@example.com', status: 'active' }], rowsAffected: 1 },
          outputDescription: 'rows: array returned by the pg driver. rowsAffected: rowCount from PostgreSQL, including SELECT row count or write count. _error appears when validation or PostgreSQL execution fails.',
          usageExample: {
            scenario: 'Fetch recently created customers for a daily operations summary',
            inputValues: { operation: 'executeQuery', host: 'db.example.com', database: 'analytics', username: 'report_reader', password: 'Use saved PostgreSQL connection', query: 'SELECT id, email FROM customers WHERE created_at >= NOW() - INTERVAL \'1 day\'', parameters: '[]' },
            expectedOutput: 'Rows are available as {{$json.rows}} and row count as {{$json.rowsAffected}} for summary or branching.',
          },
          externalDocsUrl: 'https://www.postgresql.org/docs/current/',
        },
        {
          name: 'Insert',
          value: 'insert',
          description: 'Inserts one or more records into a PostgreSQL table and returns inserted rows because the executor uses RETURNING *. Use it to persist webhook, form, or enrichment data.',
          fields: writeFields.filter((field) => field.internalKey !== 'where'),
          outputExample: { inserted: [{ id: 101, email: 'alex@example.com', status: 'new' }], count: 1 },
          outputDescription: 'inserted: rows returned by INSERT ... RETURNING *. count: number of inserted rows. _error appears when table/data/credentials or PostgreSQL execution fails.',
          usageExample: {
            scenario: 'Save a support form submission into an intake table',
            inputValues: { operation: 'insert', host: 'db.example.com', database: 'support', username: 'workflow_writer', password: 'Use saved PostgreSQL connection', table: 'intake_requests', data: '{"email":"{{$json.email}}","summary":"{{$json.message}}"}' },
            expectedOutput: 'Use {{$json.inserted[0].id}} in a later Slack or email notification.',
          },
          externalDocsUrl: 'https://www.postgresql.org/docs/current/',
        },
        {
          name: 'Update',
          value: 'update',
          description: 'Updates matching PostgreSQL rows and returns changed rows. Use it for workflow status updates, reconciliation markers, or syncing external decisions back to a database.',
          fields: writeFields,
          outputExample: { rows: [{ id: 101, status: 'processed' }], rowsAffected: 1 },
          outputDescription: 'rows: updated rows returned by UPDATE ... RETURNING *. rowsAffected: number of rows changed. _error appears when table/data/where is missing or the database rejects the statement.',
          usageExample: {
            scenario: 'Mark an order as processed after payment and shipment steps succeed',
            inputValues: { operation: 'update', host: 'db.example.com', database: 'orders', username: 'workflow_writer', password: 'Use saved PostgreSQL connection', table: 'orders', data: '{"status":"processed"}', where: '{"id":"{{$json.orderId}}"}' },
            expectedOutput: 'Use {{$json.rows[0].status}} and {{$json.rowsAffected}} to confirm the update.',
          },
          externalDocsUrl: 'https://www.postgresql.org/docs/current/',
        },
        {
          name: 'Delete',
          value: 'delete',
          description: 'Deletes matching PostgreSQL rows and returns the deleted rows. Use it only for controlled cleanup, retention, or compliance workflows with narrow filters.',
          fields: writeFields.filter((field) => field.internalKey !== 'data'),
          outputExample: { rows: [{ id: 'session_123' }], rowsAffected: 1 },
          outputDescription: 'rows: deleted rows returned by DELETE ... RETURNING *. rowsAffected: number of rows deleted. _error appears when table/where is missing or execution fails.',
          usageExample: {
            scenario: 'Delete an expired one-time login token after it is used',
            inputValues: { operation: 'delete', host: 'db.example.com', database: 'auth', username: 'cleanup_user', password: 'Use saved PostgreSQL connection', table: 'login_tokens', where: '{"id":"{{$json.tokenId}}"}' },
            expectedOutput: 'Use {{$json.rowsAffected}} to log whether the token was actually removed.',
          },
          externalDocsUrl: 'https://www.postgresql.org/docs/current/',
        },
      ],
    },
  ],
  commonErrors: [
    { error: 'host is required', cause: 'No PostgreSQL host was supplied by the node or saved connection.', fix: 'Select a PostgreSQL connection or fill Host with the endpoint.' },
    { error: 'query is required for executeQuery operation', cause: 'Execute Query was selected but Query is empty.', fix: 'Add SQL or choose a table helper operation.' },
    { error: 'where clause is required for update operation', cause: 'Update was selected without a Where filter.', fix: 'Add a narrow Where object such as {"id":"{{$json.id}}"}.' },
    { error: 'operation must be one of: executeQuery, insert, update, delete', cause: 'The operation value does not match the runtime executor.', fix: 'Use the UI dropdown values or update older saved workflow JSON.' },
    { error: 'The server does not support SSL connections', cause: 'SSL mode was enabled for a database that does not accept SSL.', fix: 'Use SSL Mode disable for local/non-SSL servers, or require for managed databases that need SSL.' },
  ],
  relatedNodes: ['mysql', 'db', 'timescaledb', 'google_bigquery'],
};
