import type { FieldDoc, NodeDoc, OperationDoc } from '../types';

const docsUrl = 'https://supabase.com/docs/reference/javascript/select';

function rich(label: string, meaning: string, enter: string, wrong: string, later: string, source = 'Use your Supabase project settings, a saved Supabase credential, or map safe workflow data such as {{$json.userId}}.'): string {
  return (
    `What this field is: ${label} - ${meaning}\n` +
    `Why it matters: The Supabase runtime uses these values to choose the project, schema, table, operation, filters, payload, or RPC function.\n` +
    `When to fill it: Fill it when the selected runtime operation needs it. URL plus either anonKey or serviceRoleKey are required for every real Supabase call.\n` +
    `What to enter: ${enter}\n` +
    `Where the value comes from: ${source}\n` +
    `How to use it later: ${later}\n` +
    `Accepted format: Operation is select, insert, update, delete, or rpc. Filters/filter are JSON objects, data is a JSON object or array, order is {"column":"created_at","ascending":false}, and URL starts with https://.\n` +
    `Real workplace example: A SaaS signup workflow inserts {{$json.email}} into a Supabase profiles table, then a later step selects the same profile by user_id.\n` +
    `If it is empty or wrong: ${wrong}\n` +
    `Common mistake: Choosing the panel's Raw SQL/query option. The db runtime does not execute raw SQL; use PostgreSQL or database_read/write for SQL text.`
  );
}

const fields: FieldDoc[] = [
  { name: 'Project URL', internalKey: 'url', type: 'url', required: true, description: 'Supabase project URL used to create the client.', placeholder: 'https://xyzabc.supabase.co', helpText: rich('Project URL', 'the Supabase project endpoint.', 'Enter the Project URL from Supabase Settings -> API, such as https://xyzabc.supabase.co.', 'If blank, the node returns url is required. A wrong URL returns a Supabase/client connection error.', 'The URL is setup-only; downstream nodes use {{$json.rows}}, {{$json.inserted}}, {{$json.count}}, or {{$json.result}}.') },
  { name: 'Anon Key', internalKey: 'anonKey', type: 'string', required: false, description: 'Supabase anon/public API key. Used when serviceRoleKey is blank.', placeholder: 'eyJ...', helpText: rich('Anon Key', 'the public Supabase API key that respects Row Level Security.', 'Use the anon/public key for normal user-scoped reads/writes when RLS policies should apply.', 'If both anonKey and serviceRoleKey are blank, the node returns Either anonKey or serviceRoleKey is required.', 'Do not map this key downstream; map returned data fields instead.', 'Supabase Dashboard -> Project Settings -> API -> Project API keys.') },
  { name: 'Service Role Key', internalKey: 'serviceRoleKey', type: 'string', required: false, description: 'Supabase service role key. Takes priority over anonKey.', placeholder: 'eyJ...', helpText: rich('Service Role Key', 'the privileged key that bypasses Supabase Row Level Security.', 'Use only for trusted server-side workflows that truly need admin access.', 'Wrong or overprivileged keys can expose or change records outside normal RLS protections; blank is fine when anonKey is set.', 'Never expose this key in downstream output or logs.', 'Supabase Dashboard -> Project Settings -> API -> service_role key, stored in Connections/credential vault where possible.') },
  { name: 'Schema', internalKey: 'schema', type: 'string', required: false, description: 'Postgres schema. Defaults to public.', placeholder: 'public', defaultValue: 'public', helpText: rich('Schema', 'the Postgres schema used by client.schema(schema).', 'Enter public unless your Supabase tables live in another exposed schema.', 'Blank defaults to public. Wrong schemas cause table/function not found errors from Supabase.', 'Output paths do not include schema; use {{$json.rows}} or operation-specific data.') },
  { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Runtime operation to run. The visual panel currently shows query, but runtime supports select, insert, update, delete, and rpc.', options: ['select', 'insert', 'update', 'delete', 'rpc', 'query'], defaultValue: 'select', helpText: rich('Operation', 'the Supabase SDK action to run.', 'Use select to read rows, insert to add rows, update to modify filtered rows, delete to remove filtered rows, or rpc to call a Postgres function. The query value from the old panel is unsupported.', 'Blank returns operation is required. Unsupported values such as query return operation must be one of: select, insert, update, delete, rpc.', 'Use {{$json.rows}}, {{$json.inserted}}, {{$json.count}}, or {{$json.result}} depending on the operation.') },
  { name: 'Table', internalKey: 'table', type: 'string', required: true, description: 'Supabase table for select/insert/update/delete.', placeholder: 'profiles', helpText: rich('Table', 'the table passed to from(table).', 'Enter the exact Supabase table name such as profiles, orders, or events.', 'Select/insert/update/delete without it returns table is required for <operation> operation. RPC does not use table.', 'Returned rows are read with {{$json.rows}} for select/update/delete or {{$json.inserted}} for insert.') },
  { name: 'Columns', internalKey: 'columns', type: 'string', required: false, description: 'Columns expression for select. Defaults to *.', placeholder: 'id,email,status', helpText: rich('Columns', 'the select column list.', 'Enter * or a Supabase select expression such as id,email,status.', 'Blank defaults to *. Invalid column expressions return a Supabase error.', 'Selected rows appear in {{$json.rows}}.') },
  { name: 'Filters', internalKey: 'filters', type: 'json', required: false, description: 'Frontend/backend filter object. Runtime also accepts filter.', placeholder: '{"status":"active"}', helpText: rich('Filters', 'conditions applied to select/update/delete.', 'Enter {"status":"active"} for equality or {"age":{"gte":18}} for supported operators eq, neq, gt, gte, lt, lte, like, ilike, in, and is.', 'Wrong filters can return no rows or cause Supabase errors. Update/delete require a filter to avoid broad changes.', 'Use {{$json.count}} to see how many rows matched or changed.') },
  { name: 'Filter', internalKey: 'filter', type: 'json', required: false, description: 'Runtime alias for Filters.', placeholder: '{"id":"{{$json.userId}}"}', helpText: rich('Filter', 'the runtime alias for filters.', 'Use filter when generated config already provides this singular key; otherwise use Filters in the panel.', 'For update/delete, missing filter returns filter is required for update/delete operation.', 'Matched output still appears under {{$json.rows}} and {{$json.count}}.') },
  { name: 'Limit', internalKey: 'limit', type: 'number', required: false, description: 'Maximum rows for select.', placeholder: '100', helpText: rich('Limit', 'maximum number of selected rows.', 'Enter a practical number such as 10, 50, or 100.', 'Blank means no explicit limit in the runtime operation. Very high or missing limits can create large workflow payloads.', 'The actual number returned appears in {{$json.count}}.') },
  { name: 'Order', internalKey: 'order', type: 'json', required: false, description: 'Runtime sort object for select.', placeholder: '{"column":"created_at","ascending":false}', helpText: rich('Order', 'the runtime sort object.', 'Enter {"column":"created_at","ascending":false}. Use ascending:false for newest-first order.', 'Malformed objects can cause Supabase client errors. The frontend Order By/Ascending fields are not read by this runtime.', 'Sorted rows appear in {{$json.rows}}.') },
  { name: 'Order By', internalKey: 'orderBy', type: 'string', required: false, description: 'Old frontend field. Not read by the Supabase runtime.', placeholder: 'created_at', helpText: rich('Order By', 'a stale frontend field for sorting.', 'Prefer the runtime Order JSON field in generated config; the current runSupabaseNode code does not read orderBy.', 'Leaving it blank has no effect. Filling it also has no effect unless another layer translates it before execution.', 'Downstream output is unchanged; use {{$json.rows}} after a real order object if sorting matters.') },
  { name: 'Ascending', internalKey: 'ascending', type: 'boolean', required: false, description: 'Old frontend sort direction. Not read by the Supabase runtime.', defaultValue: 'true', helpText: rich('Ascending', 'a stale frontend sort direction field.', 'Prefer order.ascending in the Order JSON object.', 'Changing this checkbox alone has no runtime effect in runSupabaseNode.', 'Downstream output is unchanged unless a real order object is supplied.') },
  { name: 'Query', internalKey: 'query', type: 'textarea', required: false, description: 'Old frontend Raw SQL field. Not supported by db runtime.', placeholder: 'SELECT * FROM profiles', helpText: rich('Query', 'a stale Raw SQL field from the visual panel.', 'Do not use this field for db. Use operation select/insert/update/delete/rpc, or use PostgreSQL/database_read/database_write for raw SQL.', 'Choosing operation query returns operation must be one of: select, insert, update, delete, rpc. The query text itself is ignored by runSupabaseNode.', 'There is no SQL result path for this field; use real operation outputs such as {{$json.rows}} or {{$json.result}}.') },
  { name: 'Data', internalKey: 'data', type: 'json', required: false, description: 'Row payload for insert/update.', placeholder: '{"email":"{{$json.email}}"}', helpText: rich('Data', 'the row object or array sent to insert/update.', 'Enter a JSON object or array, such as {"email":"{{$json.email}}","status":"active"}.', 'Insert/update without data returns data is required for insert/update operation.', 'Inserted rows appear in {{$json.inserted}}; updated rows appear in {{$json.rows}}.') },
  { name: 'Function Name', internalKey: 'functionName', type: 'string', required: false, description: 'RPC function name for rpc operation.', placeholder: 'search_profiles', helpText: rich('Function Name', 'the Postgres function called by rpc.', 'Enter a function name exposed through Supabase, such as search_profiles.', 'RPC without it returns functionName is required for rpc operation.', 'The function result appears in {{$json.result}}.') },
  { name: 'Params', internalKey: 'params', type: 'json', required: false, description: 'RPC parameters object.', placeholder: '{"term":"{{$json.search}}"}', helpText: rich('Params', 'the JSON object passed to the RPC function.', 'Enter a JSON object whose keys match the function parameters.', 'Blank sends {}. Wrong parameter names or types return a Supabase function error.', 'The function return value appears in {{$json.result}}.') },
];

function op(name: string, value: string, description: string, outputExample: Record<string, unknown>, outputDescription: string, inputValues: Record<string, string>): OperationDoc {
  return {
    name,
    value,
    description: `${description} This entry reflects the worker runtime and the legacy database-node wrapper output shape.`,
    fields,
    outputExample,
    outputDescription,
    usageExample: {
      scenario: `${name} in a Supabase-backed product workflow that reads or changes application records`,
      inputValues: { operation: value, url: 'https://xyzabc.supabase.co', anonKey: '{{$credentials.supabase.anonKey}}', serviceRoleKey: '', schema: 'public', table: 'profiles', ...inputValues },
      expectedOutput: 'The next step can use {{$json.rows}}, {{$json.inserted}}, {{$json.count}}, {{$json.result}}, or {{$json._error}} depending on the operation.',
    },
    externalDocsUrl: docsUrl,
  };
}

export const dbDoc: NodeDoc = {
  slug: 'db',
  displayName: 'Supabase',
  category: 'Database',
  logoUrl: '/icons/nodes/supabase.svg',
  description: 'Canonical Supabase node type. It uses @supabase/supabase-js for select, insert, update, delete, and rpc; it does not execute raw SQL from the old visual Query field.',
  credentialType: 'Supabase Credential',
  credentialSetupSteps: [
    'Create or open a Supabase project and copy the Project URL plus either the anon/public key or the service_role key from Project Settings -> API.',
    'Store Supabase keys in CtrlChecks Connections/credential vault where possible. Use anonKey for RLS-protected workflows and serviceRoleKey only for trusted server-side admin workflows.',
    'Make sure the target table/schema is exposed to the Supabase API and Row Level Security policies allow the operation when using anonKey.',
    'Test select with a small limit before enabling insert, update, delete, or service-role operations.',
    'After this node runs, connect its output to the next app, notification, reporting, or database step. Each downstream service node account connection is configured separately.',
  ],
  credentialDocsUrl: 'https://supabase.com/docs/guides/api',
  resources: [{ name: 'Tables and RPC', description: 'Supabase JavaScript client operations against one project/schema.', operations: [
    op('Select Rows', 'select', 'Reads rows from one table. Supports column selection, equality/operator filters, optional order object, and optional limit.', { rows: [{ id: 1, email: 'buyer@example.com', status: 'active' }], count: 1 }, 'rows: selected rows. count: number of rows returned. _error: present when validation or Supabase fails.', { columns: 'id,email,status', filters: '{"status":"active"}', filter: '{"status":"active"}', limit: '50', order: '{"column":"created_at","ascending":false}', query: '', orderBy: '', ascending: 'true' }),
    op('Insert Rows', 'insert', 'Inserts one object or an array of objects into a table and selects the inserted rows back from Supabase.', { inserted: [{ id: 2, email: 'new@example.com' }], count: 1 }, 'inserted: rows returned after insert. count: number inserted. _error: present when data/table/credentials fail.', { data: '{"email":"{{$json.email}}","status":"new"}', filters: '{}', filter: '{}', query: '', orderBy: '', ascending: 'true' }),
    op('Update Rows', 'update', 'Updates rows matching simple equality filters. The implementation applies eq for each filter key in update/delete operations.', { rows: [{ id: 2, status: 'active' }], count: 1 }, 'rows: updated rows returned by Supabase. count: number updated. _error: present when data/filter/table/credentials fail.', { data: '{"status":"active"}', filters: '{"id":"{{$json.userId}}"}', filter: '{"id":"{{$json.userId}}"}', query: '', orderBy: '', ascending: 'true' }),
    op('Delete Rows', 'delete', 'Deletes rows matching simple equality filters and selects deleted rows back from Supabase.', { rows: [{ id: 2 }], count: 1 }, 'rows: deleted rows returned by Supabase. count: number deleted. _error: present when filter/table/credentials fail.', { filters: '{"id":"{{$json.userId}}"}', filter: '{"id":"{{$json.userId}}"}', query: '', orderBy: '', ascending: 'true' }),
    op('Call RPC', 'rpc', 'Calls a Supabase Postgres function by functionName with optional params. Table is not used by the RPC handler, but remains in the backend required schema and is included for compatibility.', { result: [{ id: 2, rank: 0.92 }] }, 'result: raw value returned by the Supabase RPC function. _error: present when functionName, credentials, or Supabase execution fails.', { functionName: 'search_profiles', params: '{"term":"{{$json.search}}"}', filters: '{}', filter: '{}', query: '', orderBy: '', ascending: 'true' }),
  ] }],
  commonErrors: [
    { error: 'url is required', cause: 'Project URL was blank.', fix: 'Copy the Supabase Project URL from Settings -> API.' },
    { error: 'Either anonKey or serviceRoleKey is required', cause: 'No Supabase API key was supplied.', fix: 'Use a saved Supabase credential, anonKey, or serviceRoleKey depending on permissions needed.' },
    { error: 'operation is required', cause: 'Operation was blank.', fix: 'Choose select, insert, update, delete, or rpc.' },
    { error: 'operation must be one of: select, insert, update, delete, rpc', cause: 'The old visual query operation or another unsupported value was used.', fix: 'Use Supabase SDK operations here; use PostgreSQL/database_read/database_write for raw SQL.' },
    { error: 'table/data/filter/functionName is required for <operation> operation', cause: 'A required operation-specific field was missing.', fix: 'Fill Table for table operations, Data for insert/update, Filter(s) for update/delete, or Function Name for rpc.' },
  ],
  relatedNodes: ['postgresql', 'database_read', 'database_write', 'firebase'],
};
