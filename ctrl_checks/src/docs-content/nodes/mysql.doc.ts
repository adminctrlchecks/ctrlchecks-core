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
How to use it later: Map the value from a previous step with {{$json.fieldName}}, or use the output from this node in the next step, such as {{$json.rows}} for query results or {{$json.rowsAffected}} for write counts.
Accepted format: ${format}
Real workplace example: ${example}
If it is empty or wrong: ${wrong}
Common mistake: ${mistake}`;

const connectionFields: FieldDoc[] = [
  {
    name: 'Host',
    internalKey: 'host',
    type: 'string',
    required: true,
    description: 'MySQL server host name.',
    helpText: help('The network address of the MySQL server.', 'The executor cannot open a database connection without a host.', 'Fill it when the selected MySQL connection does not inject host automatically.', 'Enter a host such as db.company.com or localhost.', 'Copy it from your database hosting panel, RDS Connectivity page, PlanetScale/Vitess settings, or your DBA. You can map {{$json.dbHost}} for environment-specific workflows.', 'Plain host name or IP address, without mysql:// and without the port.', 'db.sales.internal for the sales reporting database.', 'The run returns _error with "host is required" or a network connection error.', 'Do not paste a full connection string here; use Host only.'),
    placeholder: 'db.example.com',
    example: 'db.example.com',
  },
  {
    name: 'Port',
    internalKey: 'port',
    type: 'number',
    required: false,
    description: 'MySQL TCP port.',
    helpText: help('The port number MySQL listens on.', 'The executor uses it together with Host to reach the right service.', 'Fill it when your server does not use the default 3306.', 'Enter 3306 for most MySQL servers, or the custom port from your provider.', 'Find it beside the database endpoint in your hosting dashboard or connection details. You can map {{$json.mysqlPort}}.', 'Number only, usually between 1 and 65535.', '3306 for an AWS RDS MySQL instance.', 'The run returns a port validation error or cannot connect to the server.', 'Do not enter host:port in this field; keep the host and port separate.'),
    placeholder: '3306',
    defaultValue: '3306',
    example: '3306',
  },
  {
    name: 'Database',
    internalKey: 'database',
    type: 'string',
    required: true,
    description: 'Database name to use after connecting.',
    helpText: help('The MySQL database/schema that contains the tables you want to query or update.', 'The same server can host many databases, so this tells CtrlChecks which one to use.', 'Fill it for every operation unless a saved connection injects it.', 'Enter the exact database name, such as app_production or analytics.', 'Copy it from your database admin tool, application config, or hosting panel. You can map {{$json.databaseName}}.', 'Plain database name. MySQL names may be case-sensitive depending on the server.', 'sales_ops for customer/order automation tables.', 'The run returns "database is required" or MySQL may say the database is unknown.', 'Do not enter a table name here; tables go in Table.'),
    placeholder: 'app_production',
    example: 'app_production',
  },
  {
    name: 'Username',
    internalKey: 'username',
    type: 'string',
    required: true,
    description: 'MySQL user name.',
    helpText: help('The MySQL login name used for this connection.', 'MySQL checks this user before allowing reads or writes.', 'Fill it when the saved MySQL connection does not inject it.', 'Enter the database user, preferably one with only the permissions this workflow needs.', 'Copy it from your database credential record or ask your DBA. You can map {{$json.mysqlUser}} for generated secure configs.', 'Plain user name, not an email unless your provider uses emails as database users.', 'report_reader for read-only reporting workflows.', 'The run returns "username is required" or MySQL returns an access denied error.', 'Do not use a powerful admin/root user for routine workflow automation.'),
    placeholder: 'app_user',
    example: 'report_reader',
  },
  {
    name: 'Password',
    internalKey: 'password',
    type: 'password',
    required: true,
    description: 'MySQL password.',
    helpText: help('The secret password for the MySQL user.', 'MySQL rejects the connection without it.', 'Prefer storing it in Connections; fill this visible workflow field only when the node explicitly requires a direct fallback.', 'Use the password for the selected database user.', 'Get it from your password vault, database provider, or DBA. Avoid mapping secrets from normal upstream payloads.', 'Secret text stored as a masked password field when used directly.', 'A credential stored in Connections for the app_user account.', 'The run returns "password is required" or an access denied error.', 'Do not paste passwords into sample data, comments, logs, or ordinary input data fields.'),
    placeholder: 'Use Connections when possible',
    notes: 'Secrets should live in Connections or a credential vault whenever possible.',
  },
  {
    name: 'Use SSL',
    internalKey: 'ssl',
    type: 'boolean',
    required: false,
    description: 'Whether the MySQL connection should use SSL.',
    helpText: help('A toggle that enables encrypted MySQL transport.', 'Many managed databases require SSL and reject plain connections.', 'Turn it on when your host requires SSL or when production policy requires encrypted database traffic.', 'Use true for SSL-required cloud databases and false for local development without SSL.', 'Check your provider connection guide or ask your DBA. You can map {{$json.useSsl}} if environments differ.', 'Boolean true or false.', 'true for a managed production MySQL cluster.', 'The run may fail with a TLS, handshake, or connection refused error.', 'Do not turn SSL off for production just to make a failing connection pass.'),
    defaultValue: 'false',
    example: 'true',
  },
];

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'Choose executeQuery, insert, update, or delete.',
  options: ['executeQuery', 'insert', 'update', 'delete'],
  helpText: help('The database action this node should run.', 'It decides which fields the executor reads and whether the workflow reads, writes, updates, or deletes data.', 'Choose it before filling the other fields.', 'Use executeQuery for raw SQL with ? placeholders; insert to add rows; update to change matching rows; delete to remove matching rows.', 'Choose from the dropdown based on the workflow step you are building.', 'One of executeQuery, insert, update, or delete.', 'executeQuery to fetch unpaid invoices before sending reminders.', 'An unsupported value returns "operation must be one of: executeQuery, insert, update, delete".', 'Do not choose a write operation when you only need to read data.'),
  defaultValue: 'executeQuery',
};

const queryFields: FieldDoc[] = [
  operationField,
  ...connectionFields,
  {
    name: 'Query',
    internalKey: 'query',
    type: 'textarea',
    required: true,
    description: 'SQL query to execute.',
    helpText: help('The raw SQL text sent to MySQL for Execute Query.', 'This is the actual database instruction for SELECT, INSERT, UPDATE, DELETE, or other valid MySQL SQL.', 'Required for executeQuery.', 'Write SQL with ? placeholders, then put matching values in Parameters.', 'Write it yourself, get it from a developer/DBA, or map {{$json.sql}} when a previous step prepared approved SQL.', 'MySQL SQL string. Use ? for parameter values.', 'SELECT id, email FROM customers WHERE status = ? LIMIT 50', 'The run returns "query is required for executeQuery operation" or a MySQL syntax error.', 'Do not concatenate customer values directly into SQL; use Parameters for values.'),
    placeholder: 'SELECT * FROM users WHERE id = ?',
    example: 'SELECT id, email FROM customers WHERE status = ? LIMIT 50',
  },
  {
    name: 'Parameters',
    internalKey: 'parameters',
    type: 'json',
    required: false,
    description: 'Values for ? placeholders in Query.',
    helpText: help('A JSON array of values that replace ? placeholders in order.', 'Parameters keep user data separate from SQL text and reduce SQL injection risk.', 'Fill it when Query contains one or more ? placeholders.', 'Enter an array such as ["active", "{{$json.customerId}}"]. The first item fills the first ?, the second item fills the second ?.', 'Map values from earlier nodes, forms, webhooks, or CRM records.', 'JSON array.', '["active"] for WHERE status = ?', 'If the count/order is wrong, MySQL may return a bind error or the query may match the wrong rows.', 'Do not enter an object when the query expects an ordered array.'),
    placeholder: '["{{$json.userId}}"]',
    example: '["active"]',
  },
];

const tableWriteFields: FieldDoc[] = [
  operationField,
  ...connectionFields,
  {
    name: 'Table',
    internalKey: 'table',
    type: 'string',
    required: true,
    description: 'Table used by insert, update, or delete.',
    helpText: help('The MySQL table that should be changed.', 'Insert, Update, and Delete build SQL against this table.', 'Required for insert, update, and delete.', 'Enter the exact table name, such as customers or orders.', 'Copy it from your database admin tool or ask your DBA. You can map {{$json.tableName}} for controlled generated workflows.', 'Plain table name. The executor quotes it with backticks.', 'customers for a lead-capture workflow.', 'The run returns "table is required" or MySQL may say the table does not exist.', 'Do not include database.table unless your DBA confirms that pattern is safe here.'),
    placeholder: 'customers',
    example: 'customers',
  },
  {
    name: 'Data',
    internalKey: 'data',
    type: 'json',
    required: true,
    description: 'Column values for insert or update.',
    helpText: help('The values to write into table columns.', 'Insert uses it as the new row; Update uses it as the new values for matching rows.', 'Required for insert and update. Not used by delete.', 'Enter an object such as {"email":"{{$json.email}}","status":"active"} or an array of objects for multiple inserts.', 'Map field values from forms, webhooks, CRM lookups, or previous database rows.', 'JSON object, or JSON array of objects for insert.', '{"email":"alex@example.com","status":"active"}', 'The run returns "data is required" or MySQL rejects unknown/invalid columns.', 'Do not include columns that do not exist in the table.'),
    placeholder: '{"status": "active"}',
    example: '{"email":"alex@example.com","status":"active"}',
  },
  {
    name: 'Where',
    internalKey: 'where',
    type: 'json',
    required: true,
    description: 'Exact-match conditions for update or delete.',
    helpText: help('The row filter used to decide which records Update or Delete affects.', 'Without it, the executor refuses update/delete because too many rows could change.', 'Required for update and delete. Not used by insert.', 'Enter a JSON object where keys are column names and values are exact values to match.', 'Use IDs from previous steps, such as {{$json.customerId}}, or stable business keys from your database.', 'JSON object. Multiple keys are combined with AND.', '{"id":"{{$json.customerId}}"}', 'The run returns "where clause is required" or no rows are affected if values do not match.', 'Do not leave this broad or empty for write/delete operations.'),
    placeholder: '{"id": "{{$json.customerId}}"}',
    example: '{"id":"{{$json.customerId}}"}',
  },
];

export const mysqlDoc: NodeDoc = {
  slug: 'mysql',
  displayName: 'MySQL',
  category: 'Data',
  logoUrl: '/icons/nodes/mysql.svg',
  description: 'Run MySQL SQL queries and table write operations from a workflow. Use it for reporting queries, saving form submissions, updating operational tables, or deleting rows when a controlled filter identifies the records.',
  credentialType: 'MySQL Database Connection',
  credentialSetupSteps: [
    'Create or choose a MySQL database user with the least permissions required for this workflow: read-only for reports, write access only when the workflow inserts, updates, or deletes rows.',
    'In CtrlChecks, open Connections -> Add Connection -> MySQL and store host, port, database, username, password, and SSL settings in the credential vault when possible.',
    'Use a direct Password field only as a fallback for older workflows; keep database passwords out of ordinary workflow input data.',
    'Test with Execute Query using SELECT 1 or a small SELECT before enabling write operations.',
    'Connect this node output to the next node with an outgoing line; downstream service node account connection is still required for Slack, email, CRM, or storage steps.',
  ],
  credentialDocsUrl: 'https://dev.mysql.com/doc/refman/8.0/en/',
  resources: [
    {
      name: 'Operations',
      description: 'MySQL supports raw SQL execution plus insert, update, and delete helper operations. The current worker returns _error for validation or driver failures.',
      operations: [
        {
          name: 'Execute Query',
          value: 'executeQuery',
          description: 'Runs the SQL Query against MySQL with optional Parameters. Use this for SELECT reports, joins, custom inserts/updates, and approved SQL that needs placeholders.',
          fields: queryFields,
          outputExample: { rows: [{ id: 1048, email: 'alex@example.com', status: 'active' }], rowsAffected: 0 },
          outputDescription: 'rows: array returned by mysql2 for the SQL statement. rowsAffected: value from SELECT ROW_COUNT(); for SELECT queries this is usually 0 even when rows are returned. _error appears when validation or MySQL driver execution fails.',
          usageExample: {
            scenario: 'Fetch active customers from MySQL before sending renewal reminders',
            inputValues: { operation: 'executeQuery', host: 'db.example.com', database: 'sales_ops', username: 'report_reader', password: 'Use saved MySQL connection', query: 'SELECT id, email FROM customers WHERE status = ? LIMIT 50', parameters: '["active"]' },
            expectedOutput: 'Rows are available as {{$json.rows}} and each row email can be used later as {{$json.rows[0].email}}.',
          },
          externalDocsUrl: 'https://dev.mysql.com/doc/',
        },
        {
          name: 'Insert',
          value: 'insert',
          description: 'Adds one or more new rows to a MySQL table using the Data object keys as column names. Use this when a form, webhook, or another app creates new records.',
          fields: tableWriteFields.filter((field) => field.internalKey !== 'where'),
          outputExample: { inserted: [{ insertId: 321, email: 'alex@example.com', status: 'new' }], count: 1 },
          outputDescription: 'inserted: array containing insertId plus the data sent for each inserted row. count: number of inserted rows. _error appears when table/data/credentials or MySQL execution fails.',
          usageExample: {
            scenario: 'Save a new website lead into a MySQL leads table',
            inputValues: { operation: 'insert', host: 'db.example.com', database: 'sales_ops', username: 'app_writer', password: 'Use saved MySQL connection', table: 'leads', data: '{"email":"{{$json.email}}","source":"web_form"}' },
            expectedOutput: 'The new insert id is available as {{$json.inserted[0].insertId}} for logging or follow-up updates.',
          },
          externalDocsUrl: 'https://dev.mysql.com/doc/',
        },
        {
          name: 'Update',
          value: 'update',
          description: 'Updates rows in a MySQL table where every Where condition matches. Use it for status changes, enrichment, or marking records processed.',
          fields: tableWriteFields,
          outputExample: { rowsAffected: 1 },
          outputDescription: 'rowsAffected: number of MySQL rows updated. _error appears when table/data/where is missing, credentials are invalid, or MySQL rejects the statement.',
          usageExample: {
            scenario: 'Mark a customer record as contacted after a successful outreach step',
            inputValues: { operation: 'update', host: 'db.example.com', database: 'sales_ops', username: 'app_writer', password: 'Use saved MySQL connection', table: 'customers', data: '{"last_contacted_at":"{{$json.contactedAt}}"}', where: '{"id":"{{$json.customerId}}"}' },
            expectedOutput: 'Use {{$json.rowsAffected}} in a later If/Else node to confirm exactly one row changed.',
          },
          externalDocsUrl: 'https://dev.mysql.com/doc/',
        },
        {
          name: 'Delete',
          value: 'delete',
          description: 'Deletes rows in a MySQL table where every Where condition matches. Use it only for controlled cleanup or compliance workflows with a narrow identifier.',
          fields: tableWriteFields.filter((field) => field.internalKey !== 'data'),
          outputExample: { rowsAffected: 1 },
          outputDescription: 'rowsAffected: number of MySQL rows deleted. _error appears when table/where is missing, credentials are invalid, or MySQL rejects the statement.',
          usageExample: {
            scenario: 'Remove an expired session record after a scheduled cleanup finds its ID',
            inputValues: { operation: 'delete', host: 'db.example.com', database: 'sales_ops', username: 'cleanup_user', password: 'Use saved MySQL connection', table: 'sessions', where: '{"id":"{{$json.sessionId}}"}' },
            expectedOutput: 'Use {{$json.rowsAffected}} to log how many records were deleted.',
          },
          externalDocsUrl: 'https://dev.mysql.com/doc/',
        },
      ],
    },
  ],
  commonErrors: [
    { error: 'host is required', cause: 'No MySQL host was supplied by the node or saved connection.', fix: 'Select a MySQL connection or fill Host with the database endpoint.' },
    { error: 'database is required', cause: 'The executor did not receive a database name.', fix: 'Fill Database or update the saved MySQL connection.' },
    { error: 'query is required for executeQuery operation', cause: 'Execute Query was selected but SQL Query is empty.', fix: 'Add SQL such as SELECT 1 or choose a table helper operation.' },
    { error: 'where clause is required for update operation', cause: 'Update was selected without a Where filter.', fix: 'Add a narrow Where object such as {"id":"{{$json.id}}"}.' },
    { error: 'operation must be one of: executeQuery, insert, update, delete', cause: 'The operation value does not match the runtime executor.', fix: 'Choose one of the dropdown operations now aligned with the worker.' },
  ],
  relatedNodes: ['postgresql', 'supabase', 'mongodb', 'redis'],
};
