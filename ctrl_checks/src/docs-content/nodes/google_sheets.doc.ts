import type { NodeDoc } from '../types';

const operationHelpText = `What this field means: Operation chooses which Google Sheets action this node performs.

Why it matters: It decides which Sheets API call runs and which other fields become required.

When to fill it: Choose it first, before filling any other field.

What to enter: Choose read to pull existing rows out, write to replace cells in a range, append to add new rows at the bottom, or update to change specific existing cells.

Where the value comes from: This is a fixed dropdown choice made while building the workflow.

How to use it later: The output shape depends entirely on this value — read returns row data (items/rows/headers/values), while write/append/update return a confirmation shape (success, updatedRange, updatedCells, and more).

Accepted format: One of read, write, append, or update from the dropdown.

Real workplace example: Use read to pull a customer list into an email campaign, append to log every new order as a new row, and update to change one row's Status column after fulfillment.

If it is empty or wrong: Runtime defaults to read when missing, and returns "Google Sheets node: Unsupported operation" for any other value.

Common mistake: Choosing write and only filling Values without a Range — write can replace the wrong cells if Range does not point at the intended block.

Dropdown options: read fetches rows and needs only Spreadsheet ID. write replaces cells in a range and needs Spreadsheet ID, Sheet Name, and Values or Data. append adds new rows at the bottom and needs Spreadsheet ID, Sheet Name, and Values or Data. update changes specific existing cells and needs Spreadsheet ID, Sheet Name, Range, and Values or Data.`;

const spreadsheetIdHelpText = `What this field means: Spreadsheet ID is the unique file identifier of the Google Sheet this node reads or writes.

Why it matters: Every operation needs to know exactly which spreadsheet file to talk to.

When to fill it: Always required, for every operation.

What to enter: The long ID segment from the sheet's browser URL, between /d/ and /edit.

Where the value comes from: Open the target Google Sheet and copy it from the address bar: https://docs.google.com/spreadsheets/d/THIS_PART/edit.

How to use it later: The same ID is echoed back at {{$json.spreadsheetId}} after write/append/update operations, useful for logging which sheet was touched.

Accepted format: A Google Sheets file ID string, such as 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms.

Real workplace example: Point every node at the same "Customer Master" spreadsheet ID to keep read and write operations in sync.

If it is empty or wrong: Runtime throws "Google Sheets node: Spreadsheet ID is required" when empty, or "Google Sheets API error" when the ID is wrong or the connected account cannot access it.

Common mistake: Pasting the full sheet URL instead of just the ID segment between /d/ and /edit.`;

const sheetNameHelpText = `What this field means: Sheet Name is the tab inside the spreadsheet this node should read or write.

Why it matters: A spreadsheet file can contain many tabs; this tells Google Sheets exactly which one to use.

When to fill it: Optional for Read (leave empty to use the first tab). Required for Write, Append, and Update.

What to enter: The exact tab name as shown at the bottom of Google Sheets, such as Sheet1 or Customers.

Where the value comes from: Look at the tab labels along the bottom of the target Google Sheet.

How to use it later: This is not echoed back as its own output field, but it determines which data appears in {{$json.rows}}/{{$json.items}} (read) or where {{$json.updatedRange}} points (write/append/update).

Accepted format: Plain text matching an existing tab name exactly, case-sensitive.

Real workplace example: "Orders" for a dedicated order-tracking tab, separate from a "Customers" tab in the same file.

If it is empty or wrong: For Read, empty uses the first tab automatically. For Write/Append/Update, a missing or wrong tab name can return "Google Sheets: Sheet ... not found in spreadsheet".

Common mistake: Typing "sheet1" instead of "Sheet1" — tab names are case-sensitive.`;

const rangeHelpText = `What this field means: Range limits which cells within the sheet tab are read, written, or updated, using A1 notation.

Why it matters: It controls exactly which block of the spreadsheet this run touches, which matters most for write and update so existing data outside the range is left untouched.

When to fill it: Optional for Read (empty reads all used cells) and for Write/Append (empty falls back to the whole tab or the next open rows). Always required for Update, since update must target specific existing cells.

What to enter: An A1-style range such as A1:D100, or include the tab name like Sheet1!A1:D100.

Where the value comes from: Look at the target spreadsheet's column/row layout, or map a row number from a previous Read step, e.g. Sheet1!D{{$json.row_number}}.

How to use it later: For read, this narrows {{$json.rows}}/{{$json.values}}. For write/append/update, the actual range touched is echoed back at {{$json.updatedRange}}.

Accepted format: A valid Google Sheets A1 range, optionally prefixed with a tab name and !.

Real workplace example: Sheet1!D{{$json.row_number}} to update only the Status cell of one specific row found by an earlier Read.

If it is empty or wrong: For Update, missing Range fails validation before the call is made. An invalid A1 format returns a Google Sheets API error.

Common mistake: Forgetting the tab name prefix when the workflow has more than one tab, which can make the range apply to the wrong sheet.`;

const outputFormatHelpText = `What this field means: Output Format controls how Read shapes the returned spreadsheet data for downstream nodes.

Why it matters: Different downstream nodes (loops, AI prompts, text logs) work better with different shapes of the same data.

When to fill it: Optional for Read; ignored for Write, Append, and Update.

What to enter: Choose json (row objects keyed by header), keyvalue (same row objects under a keyValue key), or text (a plain tab-separated text block).

Where the value comes from: This is a fixed workflow design choice based on what the next node expects.

How to use it later: json/keyvalue affect which key holds the friendly row objects ({{$json.rows}}/{{$json.items}} always exist regardless; {{$json.keyValue}} and {{$json.text}} are added only when selected).

Accepted format: One of json, keyvalue, or text.

Real workplace example: Use json before a Loop node that expects {{$json.rows}}, or text before an AI prompt that wants a compact plain-text table.

If it is empty or wrong: Runtime defaults to json. An unrecognized value is simply ignored and the default row objects are still returned.

Common mistake: Expecting Output Format to filter or limit rows — it only changes formatting, not which rows come back.

Dropdown options: json returns {{$json.rows}}/{{$json.items}} as objects keyed by column header. keyvalue additionally exposes the same row objects at {{$json.keyValue}}. text additionally exposes a plain tab-separated block at {{$json.text}}.`;

const readDirectionHelpText = `What this field means: Read Direction tells Google Sheets whether to read data row-by-row or column-by-column.

Why it matters: Some spreadsheets store records as rows (most common) while others store them as columns; this must match the sheet's actual layout for the data to make sense.

When to fill it: Optional, and only relevant for Read. Leave on the default unless the sheet is laid out with records running across columns instead of down rows.

What to enter: Choose rows for typical spreadsheets (each row is one record), or columns when each column is one record instead.

Where the value comes from: Look at how the target spreadsheet is actually organized.

How to use it later: This changes how {{$json.values}} (and the derived {{$json.rows}}/{{$json.items}}) are shaped; it does not add a separate output field of its own.

Accepted format: One of rows or columns.

Real workplace example: A finance sheet lists each month as a column instead of a row — set this to columns to read it correctly.

If it is empty or wrong: Runtime defaults to rows, which is correct for the vast majority of spreadsheets.

Common mistake: Leaving this on rows for a column-oriented sheet, which silently returns data organized incorrectly instead of an error.`;

const valuesHelpText = `What this field means: Values is the row data this node writes, appends, or uses to update the sheet.

Why it matters: Write, Append, and Update all need actual cell data to send to Google Sheets — at least one of Values or Data must be filled for those operations.

When to fill it: Required (together with, or instead of, Data) for Write, Append, and Update. Not used for Read. Runtime checks Data first, so if both are filled, Data wins and Values is ignored.

What to enter: An array of arrays (each inner array is one row), an array of row objects, or a single object — runtime accepts all three shapes and converts them into rows.

Where the value comes from: Type it directly, or map row data from an earlier step such as a form submission or a previous Read step's {{$json.rows}}.

How to use it later: The values actually sent are echoed back at {{$json.values}} after the write completes; appended rows are also available at {{$json.appendedValues}} for Append.

Accepted format: A JSON array of arrays, such as [["Alice", "alice@example.com", "Active"]] for one row with three columns; an array of objects also works, converted in each object's key order.

Real workplace example: [["{{$json.orderId}}", "{{$json.customerEmail}}", "{{$json.total}}"]] to append one new order row.

If it is empty or wrong: If both Values and Data are empty, runtime returns "Google Sheets node: No values provided for write/append/update operation".

Common mistake: Filling both Values and Data with different content and expecting Values to be used — Data always takes priority when both are present.`;

const dataHelpText = `What this field means: Data is an alternative way to provide the same write/append/update payload as Values.

Why it matters: It lets AI-generated or upstream JSON (an object, an array of row objects, or an array of arrays) be written directly without manually building a row array, and it is checked before Values.

When to fill it: Optional alternative to Values for Write, Append, and Update — fill either one, not necessarily both. When both are filled, Data takes priority and Values is ignored.

What to enter: A JSON object whose key order becomes the column order (such as {"name": "Alice", "email": "alice@example.com"}), or an array of such objects/arrays for multiple rows.

Where the value comes from: Map an object or array from an earlier step, such as {{$json}} from a form submission or database row, or {{$json.rows}} from a previous Read.

How to use it later: Runtime converts this into row values before sending to Sheets; the resulting {{$json.values}} reflects what was actually written, in the same order the object's keys were in.

Accepted format: A single JSON object, an array of JSON objects, or an array of arrays — all three are accepted and normalized into rows.

Real workplace example: {{$json}} mapped directly from a form-submission node to append that submission as a new sheet row.

If it is empty or wrong: If both Values and Data are empty, runtime returns "Google Sheets node: No values provided for write/append/update operation".

Common mistake: Relying on object key names to match spreadsheet column headers — runtime only uses key order, not key names, to decide column position.`;

const allowWriteHelpText = `What this field means: Allow Write Access is a checkbox intended as a visual reminder that this node performs a write-type operation.

Why it matters: Important limitation to know: this checkbox is currently decorative in the running workflow — Write, Append, and Update all execute regardless of whether this box is checked. It is not read anywhere by the execution engine.

When to fill it: Optional. Toggle it for your own team's visual review process if useful, but do not rely on it to block or allow anything at runtime.

What to enter: Check it as a personal/team reminder that this node can modify spreadsheet data, or leave it unchecked — either way, execution behavior is identical.

Where the value comes from: This is a fixed workflow design choice with no functional effect.

How to use it later: It never appears in the node's own output and has no effect on {{$json.success}}, {{$json.updatedRange}}, or any other output field.

Accepted format: Boolean true or false (a checkbox).

Real workplace example: A team leaves this checked on every Write/Append/Update node purely as a shared visual convention marking "this node changes data."

If it is empty or wrong: No functional difference either way — Write/Append/Update still run.

Common mistake: Assuming this checkbox is a safety gate that must be enabled before write operations will run. It is not enforced; treat operation choice and permissions in Connections as the real safeguards.`;

export const googleSheetsDoc: NodeDoc = {
  slug: 'google_sheets',
  displayName: 'Google Sheets',
  category: 'Data',
  logoUrl: '/icons/nodes/google_sheets.svg',
  description: 'Read, write, append, or update rows in a Google Sheets spreadsheet through the connected Google account.',
  credentialType: 'Google OAuth (Sheets scope) - saved in Connections and shared with other Google nodes',
  credentialSetupSteps: [
    'In CtrlChecks, open Connections -> Add Connection -> Google, sign in with the Google account that owns or can access the target spreadsheet, and grant the Sheets permission requested.',
    'The OAuth token is stored in the credential system. Do not paste Google tokens, client secrets, or passwords into Google Sheets workflow fields.',
    'The connected Google account must have at least Viewer access to the spreadsheet for Read, and Editor access for Write, Append, and Update.',
    'The same Google connection can also power Gmail, Google Calendar, and Google Drive nodes if those scopes are granted.',
    'Connect the Google Sheets output to a logging, If/Else, error-handling, or follow-up node when later steps should inspect {{$json.rows}}, {{$json.updatedRange}}, or the thrown error message.',
    'Downstream service node account connection setup is still required for nodes after Google Sheets; the Google connection only authorizes Sheets (and optionally Gmail/Calendar/Drive) access.',
  ],
  credentialDocsUrl: 'https://developers.google.com/sheets/api/guides/authorizing',
  resources: [
    {
      name: 'Operations',
      description: 'Choose whether Google Sheets should read existing rows, replace cells in a range, append new rows, or update specific existing cells.',
      operations: [
        {
          name: 'Read',
          value: 'read',
          description: 'Reads rows from a Google Sheets tab and normalizes them into row objects (keyed by header) alongside the raw cell values, optionally limited to a specific range.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Google Sheets action to run.', helpText: operationHelpText, placeholder: 'read', example: 'read', defaultValue: 'read', options: ['read', 'write', 'append', 'update'] },
            { name: 'Spreadsheet Id', internalKey: 'spreadsheetId', type: 'string', required: true, description: 'The Google Sheets file ID.', helpText: spreadsheetIdHelpText, placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' },
            { name: 'Sheet Name', internalKey: 'sheetName', type: 'string', required: false, description: 'Tab name; leave empty for the first tab.', helpText: sheetNameHelpText, placeholder: 'Sheet1', example: 'Customers' },
            { name: 'Range', internalKey: 'range', type: 'string', required: false, description: 'Optional A1 range; leave empty to read all used cells.', helpText: rangeHelpText, placeholder: 'A1:D100', example: 'A:D' },
            { name: 'Output Format', internalKey: 'outputFormat', type: 'select', required: false, description: 'How the read data is shaped for downstream nodes.', helpText: outputFormatHelpText, placeholder: 'json', example: 'json', defaultValue: 'json', options: ['json', 'keyvalue', 'text'] },
            { name: 'Read Direction', internalKey: 'readDirection', type: 'select', required: false, description: 'Whether records run down rows or across columns.', helpText: readDirectionHelpText, placeholder: 'rows', example: 'rows', defaultValue: 'rows', options: ['rows', 'columns'] },
          ],
          outputExample: {
            items: [
              { row_number: 2, Name: 'Alice', Email: 'alice@example.com', Status: 'Active' },
              { row_number: 3, Name: 'Bob', Email: 'bob@example.com', Status: 'Inactive' },
            ],
            rows: [
              { row_number: 2, Name: 'Alice', Email: 'alice@example.com', Status: 'Active' },
              { row_number: 3, Name: 'Bob', Email: 'bob@example.com', Status: 'Inactive' },
            ],
            headers: ['Name', 'Email', 'Status'],
            values: [['Name', 'Email', 'Status'], ['Alice', 'alice@example.com', 'Active'], ['Bob', 'bob@example.com', 'Inactive']],
            range: 'Customers!A1:C3',
            outputFormat: 'json',
          },
          outputDescription: 'items/rows: the same array of row objects, each keyed by the detected column header plus row_number (the actual spreadsheet row, accounting for a header row). headers: the detected column header names. values: the raw Sheets API array-of-arrays (including the header row, unlike items/rows). range: the exact A1 range Google Sheets actually read. google_sheets.{headers,rows,values} duplicates the same data under one namespaced object. text/keyValue are added only when Output Format is text or keyvalue. There is no separate count field — use {{$json.rows.length}}.',
          usageExample: {
            scenario: 'Read a list of customers from a Google Sheet and send each a personalised email',
            inputValues: {
              operation: 'read',
              spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
              sheetName: 'Customers',
              range: 'A:D',
              outputFormat: 'json',
            },
            expectedOutput: 'Returns all matching rows as objects. Use a Loop node downstream over {{$json.rows}} and map {{$json.Email}} into a Gmail or Email node.',
          },
          externalDocsUrl: 'https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/get',
        },
        {
          name: 'Write',
          value: 'write',
          description: 'Replaces cell values starting at (or within) the given range with new data. Requires Sheet Name; Range is optional and falls back to the sheet\'s used area when omitted.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Google Sheets action to run.', helpText: operationHelpText, placeholder: 'write', example: 'write', defaultValue: 'read', options: ['read', 'write', 'append', 'update'] },
            { name: 'Spreadsheet Id', internalKey: 'spreadsheetId', type: 'string', required: true, description: 'The Google Sheets file ID.', helpText: spreadsheetIdHelpText, placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' },
            { name: 'Sheet Name', internalKey: 'sheetName', type: 'string', required: true, description: 'Tab name to write into.', helpText: sheetNameHelpText, placeholder: 'Sheet1', example: 'Sheet1' },
            { name: 'Range', internalKey: 'range', type: 'string', required: false, description: 'A1 range to write; optional.', helpText: rangeHelpText, placeholder: 'A1:D100', example: 'Sheet1!A:C' },
            { name: 'Values', internalKey: 'values', type: 'json', required: false, description: 'Row data as an array of arrays; provide this or Data.', helpText: valuesHelpText, placeholder: '[["Name", "Email"], ["Alice", "alice@example.com"]]', example: '[["{{$json.name}}", "{{$json.email}}", "{{$now}}"]]' },
            { name: 'Data', internalKey: 'data', type: 'json', required: false, description: 'Row data as an object; alternative to Values.', helpText: dataHelpText, placeholder: '{"name": "Alice", "email": "alice@example.com"}', example: '{{$json}}' },
            { name: 'Output Format', internalKey: 'outputFormat', type: 'select', required: false, description: 'Not used by write; kept for schema consistency.', helpText: outputFormatHelpText, placeholder: 'json', example: 'json', defaultValue: 'json', options: ['json', 'keyvalue', 'text'] },
            { name: 'Allow Write Access', internalKey: 'allowWrite', type: 'boolean', required: false, description: 'Decorative reminder checkbox with no runtime effect.', helpText: allowWriteHelpText, placeholder: 'false', example: false, defaultValue: false },
          ],
          outputExample: {
            success: true,
            spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
            updatedRange: 'Sheet1!A2:C2',
            updatedRows: 1,
            updatedColumns: 3,
            updatedCells: 3,
            values: [['Alice', 'alice@example.com', '2025-01-15']],
          },
          outputDescription: 'success: true once the write completes without error. spreadsheetId: echoes the target file. updatedRange/updatedRows/updatedColumns/updatedCells: exactly what Google Sheets reports it changed. values: the row data that was actually sent. Runtime throws (rather than returning _error) when Spreadsheet ID or payload data is missing, or when the Sheets API rejects the request.',
          usageExample: {
            scenario: 'Write form submission data into fixed cells of a Google Sheet',
            inputValues: {
              operation: 'write',
              spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
              sheetName: 'Sheet1',
              range: 'Sheet1!A:C',
              values: '[["{{$json.name}}", "{{$json.email}}", "{{$now}}"]]',
            },
            expectedOutput: 'The row is written to the sheet. {{$json.updatedRange}} confirms exactly where the data was placed.',
          },
          externalDocsUrl: 'https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/update',
        },
        {
          name: 'Append',
          value: 'append',
          description: 'Adds new row(s) after the last row of existing data in the sheet, without overwriting anything already there.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Google Sheets action to run.', helpText: operationHelpText, placeholder: 'append', example: 'append', defaultValue: 'read', options: ['read', 'write', 'append', 'update'] },
            { name: 'Spreadsheet Id', internalKey: 'spreadsheetId', type: 'string', required: true, description: 'The Google Sheets file ID.', helpText: spreadsheetIdHelpText, placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' },
            { name: 'Sheet Name', internalKey: 'sheetName', type: 'string', required: true, description: 'Tab name to append into.', helpText: sheetNameHelpText, placeholder: 'Sheet1', example: 'Orders' },
            { name: 'Range', internalKey: 'range', type: 'string', required: false, description: 'Optional A1 range hint; Google Sheets still appends after the last used row.', helpText: rangeHelpText, placeholder: 'A1:D100', example: '' },
            { name: 'Values', internalKey: 'values', type: 'json', required: false, description: 'Row data as an array of arrays; provide this or Data.', helpText: valuesHelpText, placeholder: '[["Charlie", "charlie@example.com"]]', example: '[["{{$json.orderId}}", "{{$json.customerEmail}}", "{{$json.total}}", "{{$now}}"]]' },
            { name: 'Data', internalKey: 'data', type: 'json', required: false, description: 'Row data as an object; alternative to Values.', helpText: dataHelpText, placeholder: '{"orderId": "1048"}', example: '{{$json}}' },
          ],
          outputExample: {
            success: true,
            spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
            tableRange: 'Sheet1!A1:C100',
            updatedRange: 'Sheet1!A101:C101',
            updatedRows: 1,
            appendedValues: [['ORD-1048', 'alice@example.com', '249.50']],
          },
          outputDescription: 'success: true once the append completes without error. tableRange: the full table range Google Sheets detected before appending. updatedRange/updatedRows: where the new row(s) actually landed — these are flattened to the top level, not nested under an "updates" object. appendedValues: the actual row values Google Sheets recorded. Runtime throws rather than returning _error on failure.',
          usageExample: {
            scenario: 'Append a new order row to a tracking spreadsheet each time an order is placed',
            inputValues: {
              operation: 'append',
              spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
              sheetName: 'Orders',
              values: '[["{{$json.orderId}}", "{{$json.customerEmail}}", "{{$json.total}}", "{{$now}}"]]',
            },
            expectedOutput: 'A new row is appended after the last existing row. {{$json.updatedRange}} shows exactly where it landed.',
          },
          externalDocsUrl: 'https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/append',
        },
        {
          name: 'Update',
          value: 'update',
          description: 'Changes the values of specific existing cells identified by Range, leaving everything else in the sheet untouched.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Google Sheets action to run.', helpText: operationHelpText, placeholder: 'update', example: 'update', defaultValue: 'read', options: ['read', 'write', 'append', 'update'] },
            { name: 'Spreadsheet Id', internalKey: 'spreadsheetId', type: 'string', required: true, description: 'The Google Sheets file ID.', helpText: spreadsheetIdHelpText, placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' },
            { name: 'Sheet Name', internalKey: 'sheetName', type: 'string', required: true, description: 'Tab name containing the cells to update.', helpText: sheetNameHelpText, placeholder: 'Sheet1', example: 'Sheet1' },
            { name: 'Range', internalKey: 'range', type: 'string', required: true, description: 'The exact A1 range of cells to update.', helpText: rangeHelpText, placeholder: 'A1:D100', example: 'Sheet1!D{{$json.row_number}}' },
            { name: 'Values', internalKey: 'values', type: 'json', required: false, description: 'New cell values as an array of arrays; provide this or Data.', helpText: valuesHelpText, placeholder: '[["Fulfilled"]]', example: '[["Fulfilled"]]' },
            { name: 'Data', internalKey: 'data', type: 'json', required: false, description: 'New cell value(s) as an object; alternative to Values.', helpText: dataHelpText, placeholder: '{"status": "Fulfilled"}', example: '{{$json}}' },
          ],
          outputExample: {
            success: true,
            spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
            updatedRange: 'Sheet1!D5',
            updatedRows: 1,
            updatedColumns: 1,
            updatedCells: 1,
            values: [['Fulfilled']],
          },
          outputDescription: 'success: true once the update completes without error. updatedRange: the exact range Google Sheets changed. updatedRows/updatedColumns/updatedCells: how many of each were changed. values: the values that were actually written. Runtime throws rather than returning _error on failure.',
          usageExample: {
            scenario: 'Update the Status column of one row when an order is fulfilled',
            inputValues: {
              operation: 'update',
              spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
              sheetName: 'Sheet1',
              range: 'Sheet1!D{{$json.row_number}}',
              values: '[["Fulfilled"]]',
            },
            expectedOutput: 'The specified cell is updated in place. Use {{$json.updatedRange}} to confirm exactly which cell changed.',
          },
          externalDocsUrl: 'https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/update',
        },
      ],
    },
  ],
  commonErrors: [
    { error: 'Google Sheets node: Spreadsheet ID is required', cause: 'Spreadsheet Id resolved to empty.', fix: 'Fill Spreadsheet Id or map it from an earlier step.' },
    { error: 'Google Sheets: OAuth token not found', cause: 'Neither the workflow owner nor the current user has a Google account connected.', fix: 'Open Connections, add a Google connection, and grant Sheets access.' },
    { error: 'Google Sheets: Sheet "..." not found in spreadsheet', cause: 'Sheet Name does not match any tab in the target spreadsheet, or has the wrong capitalization.', fix: 'Open the spreadsheet and copy the exact tab name shown at the bottom.' },
    { error: 'Google Sheets node: No values provided for write/append/update operation', cause: 'Both Values and Data resolved to empty for a Write, Append, or Update operation.', fix: 'Fill Values as an array of arrays, or Data as an object, with the row content to send.' },
    { error: 'Google Sheets API error', cause: 'Google Sheets rejected the request — commonly an invalid range format, insufficient permission on the spreadsheet, or a malformed values payload.', fix: 'Check the range format, confirm the connected account has edit access to the spreadsheet, and confirm Values is a nested array of arrays.' },
    { error: 'Google Sheets node: Unsupported operation', cause: 'Operation holds a value other than read, write, append, or update.', fix: 'Choose one of the four supported operations from the dropdown.' },
    { error: 'Next node cannot find sheet rows', cause: 'The downstream node is reading count or data instead of the real output fields.', fix: 'Use {{$json.rows}} or {{$json.items}} after Read (there is no count field — use {{$json.rows.length}}), and {{$json.updatedRange}} after Write/Append/Update (append/update results are flattened, not nested under "updates").' },
    { error: 'Permission denied after Google Sheets', cause: 'The Google connection only authorizes Sheets (and optionally Gmail/Calendar/Drive) access; downstream service nodes still need their own account connections and permissions.', fix: 'Connect the required account on the downstream service node and confirm that provider permission separately from Google Sheets.' },
  ],
  relatedNodes: ['google_sheets_trigger', 'google_gmail', 'google_drive', 'ai_agent', 'http_request'],
};
