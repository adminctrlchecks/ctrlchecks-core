import type { NodeDoc } from '../types';

const projectIdHelpText = `What this field means: Project ID is the Google Cloud project that owns the BigQuery job and gets billed for this query.

Why it matters: BigQuery runs every query inside a specific Google Cloud project; without it, there is nowhere to submit the job.

When to fill it: Always required.

What to enter: The Google Cloud project ID, exactly as shown in the Google Cloud Console (not the human-friendly project name).

Where the value comes from: Google Cloud Console -> project selector at the top of the page, or your organization's data team.

How to use it later: The same project context is reflected in {{$json.data.jobReference.projectId}} after the query runs.

Accepted format: A Google Cloud project ID string, such as my-company-analytics-prod.

Real workplace example: "my-company-analytics-prod" for a query against the production analytics warehouse.

If it is empty or wrong: Runtime returns "projectId is required" when blank. A wrong or inaccessible project ID returns a BigQuery API permission or not-found error.

Common mistake: Using the project's display name (like "My Company Analytics") instead of its actual project ID, which is usually a lowercase, hyphenated identifier.`;

const datasetIdHelpText = `What this field means: Dataset ID is shown as a reference-only field for which BigQuery dataset this query targets.

Why it matters: Important limitation to know: this field is not sent to BigQuery and is not read by the query executor at all — it exists purely as your own note. The actual dataset used is whatever you fully qualify inside SQL Query itself.

When to fill it: Optional; fill it only as a personal or team reminder of which dataset this node's query is about.

What to enter: The dataset name, such as analytics or sales_2026, purely for your own reference.

Where the value comes from: Whatever dataset name is meaningful to you or your team.

How to use it later: Not applicable — this value is never sent to BigQuery and never appears in the output.

Accepted format: Plain text; format has no functional effect.

Real workplace example: Note "orders_prod" here as a reminder, while the actual SQL Query still fully qualifies the table as \`my-project.orders_prod.orders\`.

If it is empty or wrong: No functional difference either way — the query still runs based solely on what SQL Query specifies.

Common mistake: Assuming this field selects the dataset for the query, then being confused when a query targeting a different dataset in SQL Query still runs successfully (or fails) regardless of what's typed here.`;

const queryHelpText = `What this field means: SQL Query is the Standard SQL statement BigQuery actually runs.

Why it matters: It is the only field that determines what data is read, filtered, or aggregated — Project ID only tells BigQuery which project to bill and run inside.

When to fill it: Always required.

What to enter: A full Standard SQL query, with every table fully qualified as \`project.dataset.table\` (using backticks around the fully qualified name is standard BigQuery style).

Where the value comes from: Write it directly, or map a query string built by an earlier step, such as an AI-generated SQL statement.

How to use it later: The result rows and schema are returned inside {{$json.data.rows}} and {{$json.data.schema}}.

Accepted format: Standard SQL text compatible with BigQuery (or legacy SQL when Use Legacy SQL is enabled).

Real workplace example: "SELECT customer_id, SUM(order_total) AS lifetime_value FROM \`my-project.sales_2026.orders\` GROUP BY customer_id ORDER BY lifetime_value DESC LIMIT 100".

If it is empty or wrong: Runtime returns "query is required" when blank. Invalid SQL or an inaccessible table returns a BigQuery API error with the SQL problem described.

Common mistake: Referencing a table without the full \`project.dataset.table\` path — BigQuery needs the complete path, since Dataset ID above does not supply it automatically.`;

const useLegacySqlHelpText = `What this field means: Use Legacy SQL switches the query dialect BigQuery uses to interpret SQL Query.

Why it matters: Legacy SQL and Standard SQL have different syntax for certain functions, joins, and table references; the wrong setting can make a valid query in one dialect fail in the other.

When to fill it: Optional; leave off unless you specifically have an older query written in BigQuery's legacy SQL dialect.

What to enter: Turn on only for legacy SQL queries; leave off (the default) for modern Standard SQL, which is what most new queries use.

Where the value comes from: Determined by which SQL dialect the query in SQL Query was actually written in.

How to use it later: This does not appear in the node's own output; it only affects how BigQuery parses SQL Query.

Accepted format: Boolean true or false.

Real workplace example: Turn on only when reusing an older saved query that was written before your team standardized on Standard SQL.

If it is empty or wrong: Runtime defaults to false (Standard SQL), which is correct for the vast majority of new queries.

Common mistake: Enabling this for a modern Standard SQL query, which can cause valid syntax (like backtick-quoted table paths) to be rejected.`;

export const googleBigqueryDoc: NodeDoc = {
  slug: 'google_bigquery',
  displayName: 'Google BigQuery',
  category: 'Google',
  logoUrl: '/icons/nodes/google_bigquery.svg',
  description: 'Run a SQL query against Google BigQuery and return the result rows through the connected Google account.',
  credentialType: 'Google OAuth (BigQuery scope) - saved in Connections and shared with other Google nodes',
  credentialSetupSteps: [
    'In CtrlChecks, open Connections -> Add Connection -> Google, sign in with the Google account that has access to the target BigQuery project, and grant the BigQuery permission requested.',
    'The OAuth token is stored in the credential system. Do not paste Google tokens, client secrets, or passwords into Google BigQuery workflow fields.',
    'The connected Google account needs BigQuery Data Viewer (or higher) on the dataset(s) queried, and BigQuery Job User on the project so it can run query jobs.',
    'The same Google connection can also power Gmail, Google Sheets, and Google Drive nodes if those scopes are granted.',
    'Connect the Google BigQuery output to a logging, If/Else, error-handling, or follow-up node when later steps should inspect {{$json.data.rows}}, {{$json.data.schema}}, or {{$json._error}}.',
    'Downstream service node account connection setup is still required for nodes after Google BigQuery; the Google connection only authorizes BigQuery (and optionally Gmail/Sheets/Drive) access.',
  ],
  credentialDocsUrl: 'https://cloud.google.com/bigquery/docs/authorization',
  resources: [
    {
      name: 'Query',
      description: 'Run a SQL statement against BigQuery.',
      operations: [
        {
          name: 'Run Query',
          value: 'query',
          description: 'Submits SQL Query to BigQuery as a synchronous query job and returns the result rows and column schema once the job completes.',
          fields: [
            { name: 'Project Id', internalKey: 'projectId', type: 'string', required: true, description: 'Google Cloud project to run the query in.', helpText: projectIdHelpText, placeholder: 'my-project-id', example: 'my-company-analytics-prod' },
            { name: 'Dataset Id', internalKey: 'datasetId', type: 'string', required: false, description: 'Reference-only note; not sent to BigQuery.', helpText: datasetIdHelpText, placeholder: 'my_dataset', example: 'sales_2026' },
            { name: 'Sql Query', internalKey: 'query', type: 'textarea', required: true, description: 'The SQL statement to run.', helpText: queryHelpText, placeholder: 'SELECT * FROM `project.dataset.table` LIMIT 10', example: 'SELECT customer_id, SUM(order_total) AS lifetime_value FROM `my-project.sales_2026.orders` GROUP BY customer_id LIMIT 100' },
            { name: 'Use Legacy Sql', internalKey: 'useLegacySql', type: 'boolean', required: false, description: 'Switch to BigQuery legacy SQL dialect.', helpText: useLegacySqlHelpText, placeholder: 'false', example: false, defaultValue: false },
          ],
          outputExample: {
            operation: 'query',
            data: {
              jobComplete: true,
              totalRows: '2',
              schema: { fields: [{ name: 'customer_id', type: 'STRING' }, { name: 'lifetime_value', type: 'FLOAT' }] },
              rows: [
                { f: [{ v: 'cust_101' }, { v: '4820.50' }] },
                { f: [{ v: 'cust_204' }, { v: '3190.00' }] },
              ],
            },
          },
          outputDescription: 'data.jobComplete: whether BigQuery finished the query within the timeout. data.totalRows: total matching row count, as a string. data.schema.fields: column names and types, in the same order as each row\'s values. data.rows: BigQuery\'s raw row format — each row is {f: [{v: value}, ...]}, not a plain object; match each row.f[i].v to schema.fields[i].name to get column-named values (for example with a JavaScript node). Failures return _error, _errorCode ("GOOGLE_BIGQUERY_FAILED"), and _errorDetails instead.',
          usageExample: {
            scenario: 'Pull top customers by lifetime value for a weekly sales report',
            inputValues: {
              projectId: 'my-company-analytics-prod',
              datasetId: 'sales_2026',
              query: 'SELECT customer_id, SUM(order_total) AS lifetime_value FROM `my-company-analytics-prod.sales_2026.orders` GROUP BY customer_id ORDER BY lifetime_value DESC LIMIT 10',
              useLegacySql: false,
            },
            expectedOutput: 'Returns up to 10 rows. Use a JavaScript node to zip {{$json.data.schema.fields}} with each {{$json.data.rows[].f}} into column-named objects before sending to Slack or Email.',
          },
          externalDocsUrl: 'https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query',
        },
      ],
    },
  ],
  commonErrors: [
    { error: 'projectId is required', cause: 'Project Id resolved to empty.', fix: 'Fill Project Id with the Google Cloud project that owns the BigQuery data.' },
    { error: 'query is required', cause: 'SQL Query resolved to empty.', fix: 'Fill SQL Query or map it from an earlier step\'s output.' },
    { error: 'Google OAuth token not found', cause: 'Neither the workflow owner nor the current user has a Google account connected with BigQuery scope.', fix: 'Open Connections, add a Google connection, and grant the BigQuery permission requested.' },
    { error: 'BigQuery API error (permission denied)', cause: 'The connected account lacks BigQuery Data Viewer on the dataset or BigQuery Job User on the project.', fix: 'Ask a BigQuery project admin to grant the connected account the required IAM roles.' },
    { error: 'BigQuery API error (invalid query / not found)', cause: 'The SQL has a syntax error, or a referenced table/dataset does not exist or is not fully qualified.', fix: 'Check _errorDetails, verify every table uses the full `project.dataset.table` path, and confirm the SQL dialect matches Use Legacy Sql.' },
    { error: 'Next node cannot find row data as plain objects', cause: 'The downstream node expects column-named objects, but BigQuery\'s rows are returned in the raw {f: [{v}]} array format.', fix: 'Use a JavaScript node to combine {{$json.data.schema.fields}} names with each row\'s {{$json.data.rows[].f}} values before mapping into other nodes.' },
    { error: 'Permission denied after Google BigQuery', cause: 'The Google connection only authorizes BigQuery (and optionally Gmail/Sheets/Drive) access; downstream service nodes still need their own account connections and permissions.', fix: 'Connect the required account on the downstream service node and confirm that provider permission separately from Google BigQuery.' },
  ],
  relatedNodes: ['google_sheets', 'postgresql', 'mysql', 'ai_agent', 'http_request'],
};
