import type { FieldDoc, NodeDoc, OperationDoc } from '../types';

const sheetsDocs = 'https://developers.google.com/sheets/api/guides/values';

const fieldHelp = {
  spreadsheetId: `What this field means: Spreadsheet ID is the unique file ID for the Google Sheet that this trigger polls.

Why it matters: CtrlChecks uses this ID to read the correct spreadsheet through the saved Google OAuth connection. If it points to the wrong file, the workflow watches the wrong rows.

When to fill it: Fill it before saving or activating the workflow. The trigger cannot register polling state without it.

What to enter: Copy only the long ID from the sheet URL, not the whole URL.

Where the value comes from: Open the Google Sheet in a browser and copy the text between /d/ and /edit in the address bar.

How to use it later: The trigger output includes {{$json.spreadsheetId}}, so later nodes can log which sheet started the run or pass the ID into a Google Sheets action node.

Accepted format: A Google spreadsheet ID string such as 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms.

Real workplace example: Watch the Support Intake spreadsheet so each new row can create a ticket and notify the support lead.

If it is empty or wrong: Activation returns A Google Sheets spreadsheet ID is required. A wrong ID can produce a Google Sheets API error or quietly watch a different spreadsheet.

Common mistake: Pasting the full sharing URL, a tab gid, a Drive folder ID, or a sheet name instead of the spreadsheet ID.`,
  sheetName: `What this field means: Sheet Name is the tab inside the spreadsheet that should be polled.

Why it matters: Many spreadsheets have several tabs such as Leads, Customers, Archive, and Lookup Tables. This field keeps the trigger focused on the business table that should start workflows.

When to fill it: Fill it when the spreadsheet has more than one tab or when the watched rows live outside the first/default tab. Leave it empty only when the first tab is the intended source.

What to enter: Type the tab label exactly as it appears at the bottom of Google Sheets.

Where the value comes from: Open the spreadsheet, look at the sheet tabs along the bottom, and copy the target tab name.

How to use it later: The trigger output includes {{$json.sheetName}}, which is useful for audit logs and for routing different tabs in If/Else or Switch nodes.

Accepted format: Plain tab text such as Sheet1, Leads, Q3 Renewals, or Support Queue. Spelling and capitalization must match the tab.

Real workplace example: Use New Requests when a shared operations workbook also has Archive and Metrics tabs.

If it is empty or wrong: Empty reads the default range A:ZZ from the first/default sheet. A wrong tab name can return a Google Sheets API error.

Common mistake: Entering the spreadsheet file name instead of the tab name shown inside the workbook.`,
  hasHeaderRow: `What this field means: Has Header Row tells CtrlChecks whether the first row contains column names.

Why it matters: When enabled, the runtime uses row 1 as field names and builds the row object so later nodes can read values like {{$json.row.Email}} or {{$json.row.Status}}. When disabled, the row object is empty and downstream nodes should use values by position.

When to fill it: Keep it enabled for normal business tables with headings in row 1. Turn it off for logs, exports, or simple lists that do not have a header row.

What to enter: Checked/true when row 1 is headings, unchecked/false when every row is data.

Where the value comes from: Look at the first row of the watched tab and decide whether it contains labels or real records.

How to use it later: With headers on, map values with {{$json.row.CustomerEmail}}. With headers off, map the first cell with {{$json.values[0]}}.

Accepted format: Boolean checkbox, true or false.

Real workplace example: Leave enabled for a Leads tab with Name, Email, Company, and Status in row 1.

If it is empty or wrong: The default is true. If the sheet has no header row, the first real record becomes field names and later mappings may be confusing or blank.

Common mistake: Renaming a header after downstream nodes already use that header in expressions.`,
  eventTypes: `What this field means: Event Types controls which detected row changes are allowed to start the workflow.

Why it matters: The polling job can detect newly added rows and changed existing rows. Choosing the right event types prevents a status edit from starting a "new lead" workflow, or prevents new rows from starting an update-only workflow.

When to fill it: Leave the default row_added for intake workflows. Add row_updated when edits to existing tracked rows should also start a run.

What to enter: Use row_added, row_updated, or both separated by commas.

Where the value comes from: Choose it from the business event you care about: a new row being appended, or a previously baselined row being edited.

How to use it later: The output includes {{$json.eventType}}, so later Switch nodes can handle row_added and row_updated differently.

Accepted format: Comma-separated text or an array in workflow JSON. The runtime also normalizes spaces and hyphens to underscores.

Options and when to choose them: row_added starts the workflow for rows added after activation. row_updated starts the workflow when a tracked row's values change after the baseline exists.

Real workplace example: row_added, row_updated for a support sheet where new requests create tickets and status changes update the ticket.

If it is empty or wrong: Empty falls back to row_added. Unsupported values are ignored because they do not match the runtime event type.

Common mistake: Expecting old rows to fire after activation; activation captures the current rows as the baseline, so only later changes are considered.`,
  query: `What this field means: Keyword Filter is optional text that must appear somewhere in the joined row values before the trigger starts the workflow.

Why it matters: It lets one shared sheet support several workflows without every row starting every automation.

When to fill it: Fill it when the workflow should only handle rows containing a keyword such as urgent, enterprise, refund, escalated, or a team name. Leave it empty to accept every row that matches Event Types.

What to enter: A short word or phrase to search for in the row's cell values.

Where the value comes from: Choose a stable business keyword that appears in the watched row, usually from a Status, Priority, Type, Region, or Owner column.

How to use it later: Matching rows still include the full values array and row object, so later nodes can map {{$json.row.Priority}}, {{$json.text}}, or {{$json.values[2]}}.

Accepted format: Plain text. Matching is case-insensitive and checks the row text made by joining all cell values with spaces.

Real workplace example: urgent for a customer escalation workflow that should ignore normal intake rows.

If it is empty or wrong: Empty accepts all configured event types. A typo or keyword that is not present in the row makes the polling service ignore the event.

Common mistake: Using a formula, column name, or expression here. This field is a simple row text filter, not a spreadsheet formula.`,
};

const fields: FieldDoc[] = [
  {
    name: 'Spreadsheet ID',
    internalKey: 'spreadsheetId',
    type: 'string',
    required: true,
    description: 'Google Sheets spreadsheet ID to poll for row changes.',
    helpText: fieldHelp.spreadsheetId,
    placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  },
  {
    name: 'Sheet Name (Tab)',
    internalKey: 'sheetName',
    type: 'string',
    required: false,
    description: 'Optional tab name to poll; empty uses the first/default sheet range.',
    helpText: fieldHelp.sheetName,
    placeholder: 'Sheet1',
    example: 'Leads',
  },
  {
    name: 'Has Header Row',
    internalKey: 'hasHeaderRow',
    type: 'boolean',
    required: false,
    description: 'Uses row 1 as column names for the normalized row object.',
    helpText: fieldHelp.hasHeaderRow,
    defaultValue: 'true',
    example: 'true',
  },
  {
    name: 'Event Types',
    internalKey: 'eventTypes',
    type: 'string',
    required: false,
    description: 'Comma-separated row change types that may start the workflow: row_added and row_updated.',
    helpText: fieldHelp.eventTypes,
    placeholder: 'row_added, row_updated',
    defaultValue: 'row_added',
    options: ['row_added', 'row_updated'],
    example: 'row_added',
    notes: 'row_added fires for rows appended after activation. row_updated fires when a tracked row hash changes after the baseline exists.',
  },
  {
    name: 'Keyword Filter',
    internalKey: 'query',
    type: 'string',
    required: false,
    description: 'Optional case-insensitive keyword matched against joined row values.',
    helpText: fieldHelp.query,
    placeholder: 'urgent',
    example: 'urgent',
  },
];

const pollOperation: OperationDoc = {
  name: 'Poll for Row Changes',
  value: 'poll',
  description: 'Start the workflow when the background Google Sheets polling job finds a new row or an updated tracked row in the configured spreadsheet. Google Sheets does not provide real-time push notifications for cell changes, so CtrlChecks registers a baseline on activation and polls about every two minutes.',
  fields,
  outputExample: {
    eventId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms-Leads-5-row_added-1784397000000',
    eventType: 'row_added',
    source: 'google_sheets',
    userId: null,
    username: '',
    text: 'Jane Doe jane@example.com urgent New signup',
    timestamp: '2026-07-18T09:50:00.000Z',
    spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    sheetName: 'Leads',
    rowNumber: 5,
    values: ['Jane Doe', 'jane@example.com', 'urgent', 'New signup'],
    row: { Name: 'Jane Doe', Email: 'jane@example.com', Priority: 'urgent', Notes: 'New signup' },
    raw: { values: ['Jane Doe', 'jane@example.com', 'urgent', 'New signup'] },
    trigger: 'google_sheets',
    workflow_id: 'workflow_123',
    node_id: 'sheet-trigger-1',
    sessionId: 'gsheet_workflow_123_1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms_5',
    _googleSheets: true,
  },
  outputDescription: 'eventId: Unique event ID created from spreadsheetId, sheetName, rowNumber, eventType, and time. eventType: row_added or row_updated. source: google_sheets. userId: currently null for sheet events. username: currently empty for sheet events. text: row values joined with spaces for query filtering and quick prompts. timestamp: when the event was normalized. spreadsheetId: watched file ID. sheetName: watched tab or empty/default tab reference. rowNumber: one-based spreadsheet row number. values: raw row cells as an array. row: object keyed by header row when Has Header Row is true, otherwise empty. raw: raw values payload. trigger: google_sheets marker. workflow_id: workflow receiving the event. node_id: trigger node ID. sessionId: polling session ID built from workflow, spreadsheet, and row. _googleSheets: internal true marker.',
  usageExample: {
    scenario: 'Create a support ticket whenever a new urgent request row is added to the shared support intake sheet',
    inputValues: {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      sheetName: 'Leads',
      hasHeaderRow: 'true',
      eventTypes: 'row_added',
      query: 'urgent',
    },
    expectedOutput: 'The workflow starts on the next polling sweep after a matching row is added. Downstream nodes can use {{$json.row.Email}}, {{$json.row.Priority}}, {{$json.rowNumber}}, {{$json.eventType}}, and {{$json.values[0]}}.',
  },
  externalDocsUrl: sheetsDocs,
};

export const googleSheetsTriggerDoc: NodeDoc = {
  slug: 'google_sheets_trigger',
  displayName: 'Google Sheets Trigger',
  category: 'Triggers',
  logoUrl: '/integrations-logos/Google-Sheets.svg',
  description: 'Start workflows when rows are added or updated in a Google Sheet. Because Google Sheets has no native push notification for cell edits, CtrlChecks captures a baseline and polls the sheet about every two minutes.',
  credentialType: 'Google OAuth2',
  credentialSetupSteps: [
    'Create or choose a Google OAuth2 connection in Connections. The credential system stores the OAuth access token and refresh token in the credential vault; normal workflow fields only store spreadsheet and filter settings.',
    'Make sure the connected Google account has Viewer access or Editor access to the watched spreadsheet and grants Sheets read access. The current Google OAuth connection includes the Sheets scope used by this trigger.',
    'Test the Google OAuth2 connection from Connections. The shared Google credential test uses Google account identity checks such as https://www.googleapis.com/oauth2/v2/userinfo before workflow nodes use the Sheets API.',
    'Add Google Sheets Trigger, select or rely on the saved Google account connection, then enter Spreadsheet ID, optional Sheet Name, header setting, Event Types, and any Keyword Filter.',
    'Save and activate the workflow. Activation registers polling state and captures the current row count and row hashes as the baseline, so pre-existing rows do not trigger new runs.',
    'Connect an outgoing line from this trigger to the first action, AI Agent, If/Else, or Google Sheets node that should receive the row event.',
    'Each downstream service node still needs its own account connection. A Google Sheets Trigger connection authorizes this polling step only and does not automatically authorize Slack, Gmail, Discord, databases, or other service nodes.',
    'Do not put OAuth tokens, refresh tokens, passwords, client secrets, or Google account passwords in Spreadsheet ID, Sheet Name, Event Types, Keyword Filter, or row data fields.',
  ],
  credentialDocsUrl: sheetsDocs,
  resources: [
    {
      name: 'Polling',
      description: 'Polls one Google Sheets spreadsheet for accepted row_added and row_updated events.',
      operations: [pollOperation],
    },
  ],
  commonErrors: [
    {
      error: 'A Google Sheets spreadsheet ID is required.',
      cause: 'The Spreadsheet ID field was empty when polling registration ran.',
      fix: 'Copy the spreadsheet ID from the sheet URL between /d/ and /edit, paste it into Spreadsheet ID, save the node, and activate again.',
    },
    {
      error: 'Spreadsheet ID is required (set it on the Google Sheets Trigger node).',
      cause: 'An active workflow contains a Google Sheets Trigger node without a spreadsheet ID during automatic registration.',
      fix: 'Open the active workflow, fill Spreadsheet ID on every Google Sheets Trigger node, and re-save or re-activate the workflow.',
    },
    {
      error: 'No active Google connection found. Connect Google (Sheets) in Connections first.',
      cause: 'CtrlChecks could not find a usable Google OAuth2 connection for the workflow owner.',
      fix: 'Open Connections, connect Google OAuth2 with Sheets access, confirm the credential test succeeds, and activate the workflow again.',
    },
    {
      error: 'Google Sheets API error (403)',
      cause: 'The connected Google account does not have Viewer access or Editor access to the spreadsheet, or the saved OAuth grant does not include Sheets access.',
      fix: 'Share the sheet with the connected Google account, reconnect Google OAuth2 if scopes changed, and test the connection before activating the trigger.',
    },
    {
      error: 'PUBLIC_BASE_URL is required to execute Google Sheets-triggered workflows.',
      cause: 'The worker detected a matching row but did not have the public base URL needed for the internal workflow handoff.',
      fix: 'Set PUBLIC_BASE_URL for the worker environment and restart the worker before relying on production polling.',
    },
    {
      error: 'No rows trigger after activation',
      cause: 'Activation captured existing rows as the baseline. The polling service only emits row_added for later rows and row_updated for later changes to tracked rows.',
      fix: 'Add a new row after activation, edit an existing tracked row, include the right Event Types, and wait for the next roughly two-minute poll.',
    },
    {
      error: 'Next node cannot find row fields',
      cause: 'Has Header Row is off, the first row is not the expected header, a header was renamed, or the next node is using the wrong expression path.',
      fix: 'Use {{$json.row.ColumnName}} when headers are enabled, or {{$json.values[0]}} / {{$json.values[1]}} when headers are disabled.',
    },
    {
      error: 'Permission denied after Google Sheets Trigger',
      cause: 'The trigger could read the sheet, but a downstream service node is trying to use a different app without its own account connection or permission.',
      fix: 'Connect the downstream service node to its own account connection and confirm that account has the needed permission for its action.',
    },
  ],
  relatedNodes: ['google_sheets', 'google_gmail', 'google_drive', 'ai_agent', 'if_else', 'switch'],
};
