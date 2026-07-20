import type { NodeDoc, FieldDoc, OperationDoc } from '../types';

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'Whether to parse CSV text into structured items, or generate CSV text from an array of objects.',
  helpText:
    'What this field is: The dropdown that chooses which direction this node converts data — CSV text into objects, or objects into CSV text.\n' +
    'Why it matters: Parse and Generate read completely different fields (CSV Content vs. Data to Generate) and produce completely different output shapes.\n' +
    'When to fill it: Always — it is required on every run.\n' +
    'What to enter: Parse when you have raw CSV text (from a file, an HTTP download, or a form) and want structured objects. Generate when you have an array of objects and want CSV text (for a file export, an email attachment, or an upload).\n' +
    'Where the value comes from: Chosen directly from the dropdown.\n' +
    'How to use it later: Parse produces {{$json.items}}; Generate produces {{$json.csv}} — the two operations never share an output key.\n' +
    'Accepted format: One of two literal values: parse or generate.\n' +
    'Real workplace example: A workflow downloads a CSV export from Google Drive and uses Parse to turn it into individual customer records, while a separate workflow uses Generate to turn a database query\'s results into a CSV attachment for an email.\n' +
    'If it is empty or wrong: The frontend always sends a value (it defaults to parse); any other value reaches neither branch and returns "CSV: unsupported operation <value>" as an _error.\n' +
    'Common mistake: Assuming this node also validates or cleans the data — it only converts between text and structured form; malformed input is preserved as best-effort rather than rejected with an error.',
  options: ['parse', 'generate'],
};

const csvField: FieldDoc = {
  name: 'CSV Content',
  internalKey: 'csv',
  type: 'string',
  required: false,
  description: 'The raw CSV text to convert into structured items — used only by Parse.',
  helpText:
    'What this field is: The raw CSV text this node reads and converts into row objects.\n' +
    'Why it matters: Without CSV text, Parse has nothing to convert.\n' +
    'When to fill it: Required in practice for Parse. Not used by Generate at all.\n' +
    'What to enter: Paste literal CSV text, or map it from a previous step\'s output such as an HTTP Request or Google Drive download.\n' +
    'Where the value comes from: Typically {{$json.content}} or {{$json.data}} from a previous file-download or HTTP step.\n' +
    'How to use it later: Not echoed back in the output — only the parsed result ({{$json.items}}) is returned.\n' +
    'Accepted format: Plain CSV text with any line endings (\\n, \\r\\n, or a mix); values containing the delimiter, quotes, or newlines should be wrapped in double quotes, with embedded quotes doubled ("").\n' +
    'Real workplace example: {{$json.content}} from a Google Drive "Download File" step containing a customer export is parsed here into individual records for a Loop node to process one at a time.\n' +
    'If it is empty or wrong: An empty value produces {items: [], rows: [], headers: []} with no error at all — this node never raises an error for empty CSV input.\n' +
    'Common mistake: Assuming a parsing failure will show up as an error — malformed CSV (uneven column counts, unescaped quotes) is parsed as best-effort rather than rejected, so the result should be spot-checked rather than trusted blindly.',
  placeholder: 'name,email\nAda,ada@example.com',
};

const dataField: FieldDoc = {
  name: 'Data to Generate (JSON)',
  internalKey: 'data',
  type: 'json',
  required: false,
  description: 'The array of objects to convert into CSV text — used only by Generate. Falls back to the incoming items array when left blank.',
  helpText:
    'What this field is: The array of objects this node converts into CSV rows.\n' +
    'Why it matters: This is the actual data being exported; without it (and without an incoming items array), Generate has nothing to convert.\n' +
    'When to fill it: Optional for Generate — leave it blank to automatically use the incoming items array from a previous step instead. Fill it in when you want to generate CSV from data that is not already the node\'s main item array (for example, a JSON field nested inside the input).\n' +
    'What to enter: A JSON array of objects, or an expression like {{$json.users}} that resolves to one.\n' +
    'Where the value comes from: Map it from a previous step\'s output, such as a database query or Google Sheets read.\n' +
    'How to use it later: Not echoed back — only the generated {{$json.csv}} string is returned.\n' +
    'Accepted format: A JSON array of objects with consistent keys across every object — for example [{"name":"Ada","email":"ada@example.com"}].\n' +
    'Real workplace example: {{$json.queryResults}} from a database query step is passed in here to export the results as a downloadable CSV attachment.\n' +
    'If it is empty or wrong: Left blank with no incoming items array either, Generate returns {csv: \'\'} with no error at all. If the value cannot be resolved to an array (for example malformed JSON text), it is treated as an empty array, again with no error.\n' +
    'Common mistake: Passing objects with different keys from each other — only the very first object\'s keys become the CSV header row, so any keys unique to later objects are silently dropped from the output entirely.',
  placeholder: '[{"name":"Ada","email":"ada@example.com"}]',
};

const delimiterField: FieldDoc = {
  name: 'Delimiter',
  internalKey: 'delimiter',
  type: 'string',
  required: false,
  description: 'The character used to separate values in each CSV row, for both Parse and Generate.',
  helpText:
    'What this field is: The single character that separates one value from the next within a CSV row.\n' +
    'Why it matters: Not every CSV file uses a comma — using the wrong delimiter on Parse splits values in the wrong places, and using the wrong one on Generate produces a file the target system cannot read correctly.\n' +
    'When to fill it: Optional for both Parse and Generate — leave it at the default comma unless the source or target system specifically requires something else.\n' +
    'What to enter: A single character, or the escape sequence \\t specifically for a tab.\n' +
    'Where the value comes from: Match it to whatever produced the source CSV (for Parse) or whatever will consume the generated CSV (for Generate) — check a sample file or the target system\'s import documentation.\n' +
    'How to use it later: Not echoed back in the output directly.\n' +
    'Accepted format: A single character such as , or ; or | — only the literal two-character sequence \\t is specially recognized and converted to a real tab; other escape sequences like \\n are treated as literal text, not converted.\n' +
    'Real workplace example: A European accounting export uses semicolon as its delimiter (since comma is the decimal separator there); setting Delimiter to ; correctly parses it instead of treating the whole row as one value.\n' +
    'If it is empty or wrong: Left blank, this node defaults to a comma. A delimiter that does not match the real file structure does not error — it just silently produces one long value per row instead of several separate ones.\n' +
    'Common mistake: Assuming any escape sequence works like \\t does — only \\t is converted to a real tab character; typing \\n here does not become a real newline delimiter.',
  placeholder: ',',
  defaultValue: ',',
};

const hasHeaderField: FieldDoc = {
  name: 'Has Header Row',
  internalKey: 'hasHeader',
  type: 'boolean',
  required: false,
  description: 'Whether the first row of the CSV contains column names — used only by Parse.',
  helpText:
    'What this field is: A yes/no switch telling Parse whether the first line of the CSV is a header row of column names rather than actual data.\n' +
    'Why it matters: It controls what the object keys in {{$json.items}} look like — real column names, or plain numeric indices.\n' +
    'When to fill it: Relevant only for Parse; Generate ignores it entirely (Generate always writes a header row using the first object\'s keys).\n' +
    'What to enter: True if the first row of your CSV is column names like Name,Email,Phone. False if the CSV starts directly with data rows.\n' +
    'Where the value comes from: Look at the actual CSV content — if the first line reads like labels rather than real data, it is a header row.\n' +
    'How to use it later: When true, {{$json.headers}} contains the real column names and each item\'s keys match them; when false, {{$json.headers}} contains string indices ("0", "1", "2"...) and item keys match those indices instead.\n' +
    'Accepted format: true or false (defaults to true).\n' +
    'Real workplace example: A standard spreadsheet export with a Name,Email,Phone header row uses the default true; a raw sensor-data dump with no header row at all uses false so the first real data row is not lost as a fake header.\n' +
    'If it is empty or wrong: Left blank, this node defaults to true. Setting it to true on data that has no real header row treats the first data row as column names and permanently drops it from the item list — a common source of an "off by one row" surprise.\n' +
    'Common mistake: Leaving this at the true default on a headerless data file — the very first real record silently becomes the header/keys instead of an item, disappearing from {{$json.items}}.',
  defaultValue: 'true',
};

const parseOperation: OperationDoc = {
  name: 'Parse',
  value: 'parse',
  description: 'Parses CSV text into an array of row objects. Handles quoted values, doubled-quote escaping, and both \\n and \\r\\n line endings. Blank lines are skipped entirely rather than becoming empty rows.',
  fields: [operationField, csvField, delimiterField, hasHeaderField],
  outputExample: { items: [{ Name: 'Alice', Email: 'alice@example.com', Plan: 'Pro' }, { Name: 'Bob', Email: 'bob@example.com', Plan: 'Free' }], rows: [{ Name: 'Alice', Email: 'alice@example.com', Plan: 'Pro' }, { Name: 'Bob', Email: 'bob@example.com', Plan: 'Free' }], headers: ['Name', 'Email', 'Plan'] },
  outputDescription: 'items: an array of row objects, one per data row, with keys taken from the header row (or numeric string indices if Has Header Row is false). rows: the exact same array as items, under a second key — not a separate value. headers: the array of column names (or numeric indices) used as keys. Every value inside each item is trimmed of surrounding whitespace. Empty CSV input returns all three as empty arrays, with no error at all.',
  usageExample: {
    scenario: 'Parse a CSV customer export downloaded from Google Drive so each row can be processed individually',
    inputValues: { operation: 'parse', csv: '{{$json.content}}', delimiter: ',', hasHeader: 'true' },
    expectedOutput: 'Each CSV row becomes an object in {{$json.items}}; a Loop node processes them one at a time using {{$json.headers}} to confirm which columns are present.',
  },
  externalDocsUrl: 'https://docs.ctrlchecks.com',
};

const generateOperation: OperationDoc = {
  name: 'Generate',
  value: 'generate',
  description: 'Generates CSV text from an array of objects, using the first object\'s keys as the header row. Values containing the delimiter, quotes, or newlines are automatically wrapped in quotes, with embedded quotes doubled.',
  fields: [operationField, dataField, delimiterField],
  outputExample: { csv: 'Name,Email,Status\nAlice,alice@example.com,Active\nBob,bob@example.com,Inactive' },
  outputDescription: 'csv: the complete generated CSV text, including the header row, joined with real newline characters. Only keys present on the first object in the array become columns — keys unique to later objects are silently dropped. An empty or unresolvable Data value (with no incoming items array either) returns csv as an empty string, with no error at all.',
  usageExample: {
    scenario: 'Export a database query\'s results as a CSV file before uploading it to Google Drive',
    inputValues: { operation: 'generate', data: '{{$json.queryResults}}', delimiter: ',' },
    expectedOutput: 'CSV text is available in {{$json.csv}}, ready to pass into a Google Drive Upload node or attach directly to an Email node.',
  },
  externalDocsUrl: 'https://docs.ctrlchecks.com',
};

export const csvDoc: NodeDoc = {
  slug: 'csv',
  displayName: 'CSV',
  category: 'Data',
  logoUrl: '/icons/nodes/csv.svg',
  description: 'Parse CSV text into structured row objects, or generate CSV text from an array of objects. Never raises an error for empty or malformed input on either operation — it silently returns empty results instead.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node has no third-party account or cloud credential and does not use credentials at all — it only converts data already present in the workflow between CSV text and structured objects.',
    'No connection setup is required. Place Parse after any step producing CSV text (like an HTTP Request or Google Drive download), or place Generate after any step producing an items array.',
    'Connect the CSV output to a logging, If/Else, or follow-up node when later steps should inspect {{$json.items}} or {{$json.csv}}. Downstream service node account connection setup is still required for nodes after CSV; this node itself has nothing to authorize.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Operations',
      description: 'CSV converts between raw CSV text and structured objects in either direction. Unlike many other data-transform nodes, it never raises a validation error for empty, missing, or malformed input on either operation — it returns empty results silently instead, so results should be spot-checked rather than assumed correct.',
      operations: [parseOperation, generateOperation],
    },
  ],
  commonErrors: [
    {
      error: 'CSV: unsupported operation <value>',
      cause: 'The Operation field held a value other than parse or generate — this can only happen via hand-edited workflow JSON, since the visual dropdown only offers those two values.',
      fix: 'Select Parse or Generate from the Operation dropdown.',
    },
    {
      error: 'Parse silently returns empty items/rows/headers arrays for empty or missing CSV Content (no error is raised)',
      cause: 'CSV Content resolved to an empty string, either because it was left blank or an upstream expression like {{$json.content}} resolved to nothing.',
      fix: 'Confirm the upstream step actually produces CSV text under the field you are referencing, and check {{$json.items}}.length after this node to confirm real data arrived rather than assuming an error would have appeared.',
    },
    {
      error: 'Generate silently returns an empty csv string for empty or missing Data and no incoming items (no error is raised)',
      cause: 'Both Data to Generate and the incoming items array were empty, so there was nothing to convert to CSV.',
      fix: 'Set Data to Generate to a JSON array of objects, or connect a previous step that outputs an items array, then check whether {{$json.csv}} is non-empty rather than assuming an error would have appeared.',
    },
    {
      error: 'The very first real data row disappears when Has Header Row is left true on headerless data',
      cause: 'Has Header Row defaults to true; on CSV that has no real header row, the first genuine data row is consumed as the header/keys instead of becoming an item.',
      fix: 'Set Has Header Row to false whenever the source CSV genuinely starts with data rather than column names.',
    },
    {
      error: 'Generated CSV is missing columns present only on later objects in the Data array',
      cause: 'Generate builds its header row from only the first object\'s keys — any key that only appears on a later object in the array is never included as a column at all.',
      fix: 'Normalize every object in the Data array to have the same complete set of keys (using an Edit Fields step beforehand, filling missing keys with empty values) before Generate.',
    },
  ],
  relatedNodes: ['edit_fields', 'google_sheets', 'google_drive', 'http_request', 'filter', 'aggregate', 'email'],
};
