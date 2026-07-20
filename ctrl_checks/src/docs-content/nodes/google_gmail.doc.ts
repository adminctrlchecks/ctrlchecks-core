import type { NodeDoc } from '../types';

const operationHelpText = `What this field means: Operation chooses which Gmail action this node performs.

Why it matters: The operation decides which Gmail API endpoint runs and which other fields become visible and required.

When to fill it: Choose it first, before filling any other field, so the rest of the panel matches the job.

What to enter: Choose send to compose and send an email, list to fetch recent inbox messages, get to fetch one full message by ID, or search to find messages with Gmail search syntax.

Where the value comes from: This is a fixed dropdown choice made while building the workflow; it is not something you copy from Gmail.

How to use it later: The runtime path taken depends entirely on this value — later nodes should expect send's confirmation fields, list/search's messages array, or get's full raw message, never a mix of all of them.

Accepted format: One of send, list, get, or search from the dropdown.

Real workplace example: Use send for an order-confirmation email, list to check unread support mail, get to read one message a previous List step found, and search to find every invoice email from a vendor.

If it is empty or wrong: Runtime defaults to send when the value is missing, and returns "Gmail: Unsupported operation" for any other unrecognized value.

Common mistake: Leaving Operation on send while only filling in List/Search fields like Search Query, which then sends a blank email instead of searching.

Dropdown options: send composes and delivers an email and needs Recipient Emails (or To), Subject, and Body. list returns recent messages from the inbox and only needs optional Search Query and Max Results. get fetches one full message and needs Message ID. search finds messages matching Gmail search syntax and needs Search Query, with optional Max Results.`;

const credentialIdHelpText = `What this field means: Credential ID is an internal reference to a specific saved Google OAuth connection, used only in advanced or multi-account setups.

Why it matters: Almost every workflow does not need this — Gmail automatically uses the Google account connected for this workflow's owner without any field being filled in.

When to fill it: Leave it empty unless you specifically manage multiple Google connections and were told to reference one by ID.

What to enter: A saved credential reference such as cred_123, normally generated and stored by the Connections system itself, not typed by hand.

Where the value comes from: The credential system (Connections) generates and stores this value when you connect a Google account; you would only copy it from there in rare advanced cases.

How to use it later: This field does not appear in the node's own output; the resolved Google account is used silently to authorize the Gmail API calls.

Accepted format: An internal credential reference string.

Real workplace example: Most workflows never touch this field — a single connected Google account in Connections is enough for every Gmail node in the workflow.

If it is empty or wrong: Empty is the normal, expected state. Gmail then resolves the connected Google account automatically. An invalid reference falls back to the normal account resolution instead of hard failing.

Common mistake: Typing an email address or password into this field. It is not a login field — the real authorization happens through the OAuth connection saved in Connections.`;

const recipientSourceHelpText = `What this field means: Recipient Source chooses how this Send Email step decides who the email goes to.

Why it matters: It controls whether Gmail should trust the Recipient Emails field you type, or instead pull recipient addresses from spreadsheet-style row data earlier in the workflow.

When to fill it: Fill it whenever Operation is send. It is the first choice to make before Recipient Emails or the fallback sheet fields matter.

What to enter: Choose manual_entry to type fixed addresses yourself, or extract_from_sheet to reuse email addresses already present in upstream row data (typically from a Google Sheets node placed before this Gmail node).

Where the value comes from: This is a fixed workflow design choice based on whether recipients are already known or come from another step.

How to use it later: This setting only affects how recipients are resolved during the run; the actual recipients sent to are echoed back in {{$json.to}} after the send completes.

Accepted format: One of manual_entry or extract_from_sheet from the dropdown.

Real workplace example: Use manual_entry to always notify a fixed operations inbox, or extract_from_sheet to email every customer listed in a Google Sheets export of that day's orders.

If it is empty or wrong: Runtime treats it like manual_entry and relies on Recipient Emails (or To). With extract_from_sheet and no usable upstream rows or fallback sheet, runtime returns "Gmail: missing recipient email(s)".

Common mistake: Choosing extract_from_sheet and expecting Recipient Emails to still be used — in that mode, upstream sheet rows are the real source, and Recipient Emails is optional.

Dropdown options: manual_entry sends to the address(es) typed in Recipient Emails. extract_from_sheet reads recipient email addresses from upstream row data first, and falls back to this node's own Fallback Spreadsheet ID / Fallback Sheet Name / Fallback Range only when upstream data has none.`;

const recipientEmailsHelpText = `What this field means: Recipient Emails lists the address(es) this email should be sent to when Recipient Source is Manual entry.

Why it matters: For manual sends, this is the primary way Gmail knows who receives the message.

When to fill it: Fill it whenever Recipient Source is manual_entry. It is optional when Recipient Source is extract_from_sheet, since upstream or fallback sheet data supplies recipients instead.

What to enter: One email address, or several separated by commas, semicolons, or new lines.

Where the value comes from: Type fixed addresses directly, or map one from an earlier step such as a form submission or CRM lookup, e.g. {{$json.email}}.

How to use it later: The actual recipient(s) used are echoed back at {{$json.to}} (a single string for one recipient, or an array for several), and {{$json.sentCount}} / {{$json.failedCount}} confirm delivery per recipient.

Accepted format: One or more valid email addresses separated by commas, semicolons, or newlines.

Real workplace example: alice@example.com, bob@example.com for a shared team notification, or {{$json.email}} to reply to whoever filled out a form.

If it is empty or wrong: With Manual entry and this field empty (and To also empty), runtime returns "Gmail: missing recipient email(s)". An invalid address format is rejected per-recipient and recorded in {{$json.results}}.

Common mistake: Typing addresses here while Recipient Source is set to extract_from_sheet, expecting both sources to combine — extract_from_sheet prioritizes upstream sheet rows over this field.`;

const spreadsheetIdHelpText = `What this field means: Fallback Spreadsheet ID is the Google Sheet Gmail should read recipient rows from, but only as a backup when Recipient Source is Extract from sheet.

Why it matters: If no upstream node (like a Google Sheets node placed before this Gmail node) already produced usable recipient rows, this field lets Gmail fetch them directly instead of failing.

When to fill it: Fill it only when Recipient Source is extract_from_sheet and this Gmail node is not directly downstream of a Google Sheets node that already lists recipients.

What to enter: The spreadsheet ID from the sheet's URL, the long string between /d/ and /edit in the Google Sheets link.

Where the value comes from: Open the target Google Sheet and copy the ID segment from its browser URL.

How to use it later: This field is not echoed back in the node's own output; it only affects which rows get scanned to build the recipient list used for {{$json.to}}.

Accepted format: A Google Sheets spreadsheet ID string, such as 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms.

Real workplace example: A weekly digest workflow has no upstream Sheets node, so this field points directly at the "Customer List" spreadsheet to source recipients.

If it is empty or wrong: Empty is fine when an upstream node already supplies recipients. If upstream has none and this is also empty, runtime returns "Gmail: missing recipient email(s)". A wrong ID returns "Gmail: could not read inline spreadsheet".

Common mistake: Filling this in even when a Google Sheets node already runs right before Gmail — upstream data always takes priority, so this field is normally unnecessary in that setup.`;

const sheetNameHelpText = `What this field means: Fallback Sheet Name is the tab inside the Fallback Spreadsheet ID that Gmail should read.

Why it matters: A single Google Sheet file can contain several tabs; this tells Gmail exactly which one holds the recipient rows.

When to fill it: Only relevant when Fallback Spreadsheet ID is filled in and the recipient data is not on the first default tab.

What to enter: The exact tab name as shown at the bottom of Google Sheets, such as Sheet1 or Contacts.

Where the value comes from: Look at the tab labels along the bottom of the target Google Sheet.

How to use it later: This field is not echoed back in the node's own output; it only controls which tab is scanned to build {{$json.to}}.

Accepted format: Plain text matching an existing tab name exactly, case-sensitive.

Real workplace example: A spreadsheet has separate tabs per region; set this to "EU-Customers" to email only that region's list.

If it is empty or wrong: Runtime defaults to Sheet1. A tab name that does not exist returns "Gmail: could not read inline spreadsheet".

Common mistake: Leaving this set to Sheet1 when the real recipient data actually lives on a differently named tab.`;

const rangeHelpText = `What this field means: Fallback Range limits which cells inside the fallback sheet tab are read for recipient data.

Why it matters: It lets Gmail skip header rows or unrelated columns instead of scanning an entire large sheet.

When to fill it: Optional, and only relevant when Fallback Spreadsheet ID is filled in. Leave empty to read the whole tab.

What to enter: An A1-style range such as A2:D500 to skip a header row and stop at row 500.

Where the value comes from: Look at the column/row layout of the target Google Sheet and choose the block containing actual recipient rows.

How to use it later: This field is not echoed back in the node's own output; it only affects which rows are scanned to build {{$json.to}}.

Accepted format: A valid Google Sheets A1 range, such as A2:D500 or Contacts!A2:C.

Real workplace example: A sheet has a title row and a header row before the data starts at row 3, so the range is set to A3:D1000.

If it is empty or wrong: Empty reads the entire tab, which is safe but slower on very large sheets. An invalid range format is rejected by the Sheets API and surfaces as "Gmail: could not read inline spreadsheet".

Common mistake: Including the header row in the range, which can cause the header labels to be treated as if they were an email address.`;

const useAiRecipientMappingHelpText = `What this field means: Scan All Columns For Emails makes the fallback-sheet recipient search check every cell in each row, not only columns literally named like "email".

Why it matters: Many real spreadsheets use inconsistent headers such as "Contact", "Work Email", or no header at all; this option lets Gmail still find valid addresses in those rows.

When to fill it: Turn it on when Recipient Source is extract_from_sheet and the sheet's column headers are messy, inconsistent, or missing.

What to enter: Turn on to scan every cell, or leave off to only trust columns whose header looks like an email field.

Where the value comes from: This is a fixed workflow design choice based on how clean the source spreadsheet's headers are.

How to use it later: This field is not echoed back in the node's own output; it only changes which cells are scanned to build {{$json.to}}.

Accepted format: Boolean true or false (a checkbox).

Real workplace example: A sales export has a column literally titled "POC" containing email addresses — turning this on lets Gmail still find them.

If it is empty or wrong: Runtime treats it as false, so only columns that look like email fields are scanned. A messy sheet may then return zero recipients when this is left off.

Common mistake: Leaving this off for messy exports and then seeing "Gmail: missing recipient email(s)" even though the sheet clearly has emails in it.`;

const toHelpText = `What this field means: To is an older, single-recipient alternative to Recipient Emails, kept for backward compatibility with earlier workflow versions.

Why it matters: It is only used as a fallback source of recipients when Recipient Emails is empty.

When to fill it: Prefer Recipient Emails for new workflows, especially for more than one recipient. Use To only when working with an older workflow already built around it, or for a single simple fixed recipient.

What to enter: A single email address, or map one from an earlier step such as {{$json.email}}.

Where the value comes from: Type it directly, or map it from trigger data, a form submission, or a previous lookup step.

How to use it later: The actual recipient used is echoed back at {{$json.to}} after the send completes, regardless of whether it came from this field or Recipient Emails.

Accepted format: A single valid email address (or a template that resolves to one).

Real workplace example: support@company.com as a simple fixed fallback recipient on an older workflow.

If it is empty or wrong: If both To and Recipient Emails are empty, and no sheet-based recipients resolve either, runtime returns "Gmail: missing recipient email(s)".

Common mistake: Filling both To and Recipient Emails with different addresses and expecting both to receive the email — Recipient Emails takes priority when it has a value.`;

const subjectHelpText = `What this field means: Subject is the email subject line the recipient sees in their inbox before opening the message.

Why it matters: It is required for Send Email — Gmail will not send a message without one.

When to fill it: Always required when Operation is send.

What to enter: A short, clear line describing the email's purpose, optionally including mapped details from an earlier step.

Where the value comes from: Write it directly, or map it from upstream data such as {{$json.orderId}} or {{$json.ticketId}}.

How to use it later: The final subject used is echoed back at {{$json.subject}} after the send completes, useful for logging what was sent.

Accepted format: Plain text, ideally short enough to display fully in an inbox preview.

Real workplace example: "Your order #{{$json.orderId}} has shipped!" or "Welcome to CtrlChecks, {{$json.name}}!"

If it is empty or wrong: Runtime returns "Gmail: "subject" field is required" before attempting to send.

Common mistake: Leaving Subject as generic placeholder text like "Test" in a production workflow, which looks unprofessional to recipients.`;

const bodyHelpText = `What this field means: Body is the full email content the recipient reads after opening the message.

Why it matters: It is required for Send Email — an email needs content beyond just a subject line.

When to fill it: Always required when Operation is send.

What to enter: Plain text content, optionally personalized with values mapped from earlier steps.

Where the value comes from: Write it directly, or map values such as {{$json.name}} or {{$json.summary}} from a form, database, or AI Agent step.

How to use it later: The content is not echoed back verbatim in the node's own output, but {{$json.success}}, {{$json.sentCount}}, and {{$json.failedCount}} confirm whether it was delivered.

Accepted format: Plain text; this node sends text/plain messages, so HTML markup is not rendered as formatted HTML by the recipient's client.

Real workplace example: "Hi {{$json.name}}, thank you for your purchase! Your order will arrive in 3-5 business days."

If it is empty or wrong: Runtime returns "Gmail: "body" field is required" before attempting to send.

Common mistake: Pasting rich HTML expecting bold text or images to render — this node sends plain text, so HTML tags appear as literal text to the recipient.`;

const ccHelpText = `What this field means: CC lists extra recipients who receive a visible copy of the email.

Why it matters: It lets other people see the message and who it was sent to, without being the primary recipient.

When to fill it: Optional; fill it only when someone should be visibly copied, such as a manager or an audit mailbox.

What to enter: One email address, or several separated by commas, semicolons, or new lines.

Where the value comes from: Type fixed addresses, or map one from earlier data such as {{$json.managerEmail}}.

How to use it later: CC addresses are not echoed back in the node's own output fields; check {{$json.success}} to confirm the overall send worked.

Accepted format: One or more valid email addresses separated by commas, semicolons, or newlines.

Real workplace example: manager@example.com, audit@example.com on an expense-approval notification.

If it is empty or wrong: Empty is fine and simply sends with no CC recipients. An invalid address in the list is rejected and reported per recipient in {{$json.results}}.

Common mistake: Using CC for a hidden recipient — CC is visible to every other recipient; use BCC instead when the recipient should stay hidden.`;

const bccHelpText = `What this field means: BCC lists extra recipients who receive a hidden copy of the email; no other recipient can see their address.

Why it matters: It lets teams archive, monitor, or audit outgoing email without exposing that address to the primary recipient.

When to fill it: Optional; fill it only when a hidden copy is needed, such as for compliance archiving.

What to enter: One email address, or several separated by commas, semicolons, or new lines.

Where the value comes from: Type fixed addresses, or map one from earlier data such as {{$json.archiveAddress}}.

How to use it later: BCC addresses are not echoed back in the node's own output fields; check {{$json.success}} to confirm the overall send worked.

Accepted format: One or more valid email addresses separated by commas, semicolons, or newlines.

Real workplace example: archive@example.com on every outgoing customer communication for compliance records.

If it is empty or wrong: Empty is fine and simply sends with no BCC recipients. An invalid address in the list is rejected and reported per recipient in {{$json.results}}.

Common mistake: Assuming BCC recipients can reply-all safely without revealing themselves — replying can still expose their address depending on the recipient's email client.`;

const fromHelpText = `What this field means: From optionally overrides the sender address shown on the email, using a Gmail alias already configured on the connected account.

Why it matters: It lets one connected Google account send as a different recognizable address, such as a department alias.

When to fill it: Leave it blank in almost all cases. Fill it only when the connected Gmail account has a verified "Send mail as" alias configured in Gmail settings.

What to enter: The alias address exactly as configured in Gmail, such as orders@yourcompany.com.

Where the value comes from: Check Gmail -> Settings -> Accounts and Import -> "Send mail as" for the list of verified aliases on the connected account.

How to use it later: This does not appear in the node's own output; the recipient simply sees this address as the sender.

Accepted format: A single email address matching a verified Gmail "Send mail as" alias.

Real workplace example: orders@yourcompany.com for automated order confirmations sent from a shared support Gmail account.

If it is empty or wrong: Empty uses the primary connected Gmail address automatically. An address that is not a verified alias on that account can be rejected or silently replaced by Gmail.

Common mistake: Typing an arbitrary email address here expecting Gmail to send as any address — Gmail only allows verified aliases on the connected account, not arbitrary addresses.`;

const messageIdHelpText = `What this field means: Message ID identifies the specific Gmail message this Get step should fetch.

Why it matters: Gmail's Get operation needs to know exactly which message to retrieve; without an ID there is nothing to fetch.

When to fill it: Always required when Operation is get.

What to enter: Map {{$json.id}} from a previous Gmail List or Search step's messages array — do not type this by hand.

Where the value comes from: Run a Gmail List or Search operation first; each item in its messages array has an id you can reference.

How to use it later: The full raw Gmail message is returned at {{$json.message}}, and the same ID you passed in is echoed back at {{$json.messageId}}.

Accepted format: A Gmail message ID string, such as 18abc123def456.

Real workplace example: Loop over {{$json.messages}} from a List step, and use {{$json.id}} from each item as this Get step's Message ID to read the full content.

If it is empty or wrong: Runtime returns "Gmail: "messageId" field is required for get operation". A wrong or deleted message ID returns a Gmail API error.

Common mistake: Using a message's threadId here instead of its id — they can differ, and Get expects the specific message id.`;

const queryHelpText = `What this field means: Search Query is a Gmail search filter, written exactly like what you would type into the Gmail search bar.

Why it matters: For List, it narrows down which inbox messages come back; for Search, it is the entire basis of what gets found.

When to fill it: Optional for list (empty returns the most recent inbox messages). Always required for search.

What to enter: Gmail search operators such as from:vendor@example.com, subject:invoice, is:unread, has:attachment, or newer_than:7d, combined as needed.

Where the value comes from: Use the same syntax you would type directly into the Gmail search bar in the Gmail web app.

How to use it later: For search, the exact query used is echoed back at {{$json.query}}; for both list and search, matching messages appear in {{$json.messages}}.

Accepted format: Gmail search syntax text, such as "is:unread label:support" or "from:billing@stripe.com subject:\\"payment failed\\"".

Real workplace example: "from:vendor@example.com newer_than:7d" to find recent invoices from one vendor.

If it is empty or wrong: For search, an empty query returns "Gmail: "query" field is required" is not explicitly enforced by this field alone, but an empty or overly broad query can return unrelated or too many messages; check {{$json.resultSizeEstimate}}. For list, empty simply returns the most recent inbox messages.

Common mistake: Typing plain keywords expecting a full-text description search — Gmail search syntax favors operators like from:, subject:, and is: over free-text guesses.`;

const maxResultsHelpText = `What this field means: Max Results caps how many messages List or Search can return in one run.

Why it matters: It controls how much data comes back and how long the Gmail API call takes, especially against a large inbox or broad query.

When to fill it: Optional for both list and search; a sensible default is applied automatically.

What to enter: A whole number such as 10, 25, or 100 depending on how many messages the next step should process.

Where the value comes from: This is a fixed workflow design choice based on how many messages downstream nodes (like a Loop) should realistically handle per run.

How to use it later: {{$json.messages}} will contain at most this many items, and {{$json.resultSizeEstimate}} shows Gmail's approximate total match count (which can exceed Max Results).

Accepted format: A positive integer.

Real workplace example: Set to 10 for a daily unread-support-email digest that feeds a Loop node.

If it is empty or wrong: Runtime defaults to 10 when left empty.

Common mistake: Setting this very high (like 500) expecting fewer, more relevant results — Max Results only limits the count; use Search Query to control relevance.`;

export const googleGmailDoc: NodeDoc = {
  slug: 'google_gmail',
  displayName: 'Gmail',
  category: 'Communication',
  logoUrl: '/integrations-logos/Gmail.svg',
  description: 'Send, list, get, and search Gmail messages through the connected Google account, including an optional Google Sheets fallback for bulk-send recipient lists.',
  credentialType: 'Google OAuth (Gmail scopes) - saved in Connections and shared with other Google nodes',
  credentialSetupSteps: [
    'In CtrlChecks, open Connections -> Add Connection -> Google, sign in with the Google account that should send and read this mail, and grant the Gmail permissions requested.',
    'The OAuth token is stored in the credential system. Do not paste Google tokens, client secrets, or passwords into Gmail workflow fields; Credential ID is an internal reference only, not a login field.',
    'Scopes used: gmail.send is required for Send Email. gmail.readonly is required for List, Get, and Search. The same Google connection can also power Google Sheets, Google Calendar, and Google Drive nodes if those scopes are granted.',
    'For Extract from sheet recipients, the same connected Google account also needs Sheets API access so the optional Fallback Spreadsheet ID can be read.',
    'Connect the Gmail output to a logging, If/Else, error-handling, or follow-up node when later steps should inspect {{$json.success}}, {{$json.messageId}}, {{$json.messages}}, {{$json.message}}, or {{$json._error}}.',
    'Downstream service node account connection setup is still required for nodes after Gmail; the Google connection only authorizes Gmail (and optionally Sheets) access.',
  ],
  credentialDocsUrl: 'https://developers.google.com/gmail/api/auth/scopes',
  resources: [
    {
      name: 'Operations',
      description: 'Choose whether Gmail should send a new email, list recent inbox messages, fetch one full message by ID, or search messages with Gmail search syntax.',
      operations: [
        {
          name: 'Send Email',
          value: 'send',
          description: 'Sends an email through the connected Gmail account to one or more recipients, chosen either by typing addresses directly or by extracting them from upstream Google Sheets row data, with optional CC, BCC, and sender alias.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Gmail action to run.', helpText: operationHelpText, placeholder: 'send', example: 'send', defaultValue: 'send', options: ['send', 'list', 'get', 'search'] },
            { name: 'Credential Id', internalKey: 'credentialId', type: 'string', required: false, description: 'Advanced: internal reference to a specific saved Google connection.', helpText: credentialIdHelpText, placeholder: '', example: '' },
            { name: 'Recipient Source', internalKey: 'recipientSource', type: 'select', required: true, description: 'How recipients are chosen for Send Email.', helpText: recipientSourceHelpText, placeholder: 'manual_entry', example: 'manual_entry', defaultValue: 'manual_entry', options: ['manual_entry', 'extract_from_sheet'] },
            { name: 'Recipient Emails', internalKey: 'recipientEmails', type: 'string', required: false, description: 'Recipient email address(es) for Manual entry mode.', helpText: recipientEmailsHelpText, placeholder: 'a@x.com, b@y.com', example: '{{$json.email}}' },
            { name: 'Fallback Spreadsheet Id', internalKey: 'spreadsheetId', type: 'string', required: false, description: 'Backup Google Sheet to read recipients from when Extract from sheet has no upstream rows.', helpText: spreadsheetIdHelpText, placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' },
            { name: 'Fallback Sheet Name', internalKey: 'sheetName', type: 'string', required: false, description: 'Tab name inside the fallback spreadsheet.', helpText: sheetNameHelpText, placeholder: 'Sheet1', example: 'Sheet1', defaultValue: 'Sheet1' },
            { name: 'Fallback Range', internalKey: 'range', type: 'string', required: false, description: 'Optional A1 range inside the fallback sheet tab.', helpText: rangeHelpText, placeholder: 'A2:D500', example: 'A2:D500' },
            { name: 'Scan All Columns For Emails', internalKey: 'useAiRecipientMapping', type: 'boolean', required: false, description: 'Scan every cell for emails instead of only email-named columns.', helpText: useAiRecipientMappingHelpText, placeholder: 'false', example: false, defaultValue: false },
            { name: 'To', internalKey: 'to', type: 'string', required: false, description: 'Legacy single-recipient fallback used when Recipient Emails is empty.', helpText: toHelpText, placeholder: 'recipient@example.com', example: '{{$json.email}}' },
            { name: 'Subject', internalKey: 'subject', type: 'string', required: true, description: 'Email subject line.', helpText: subjectHelpText, placeholder: 'Hello', example: 'Your order #{{$json.orderId}} has shipped!' },
            { name: 'Body', internalKey: 'body', type: 'textarea', required: true, description: 'Email body content.', helpText: bodyHelpText, placeholder: 'Email content', example: 'Hi {{$json.name}}, thank you for your purchase!' },
            { name: 'Cc', internalKey: 'cc', type: 'string', required: false, description: 'Optional visible copied recipients.', helpText: ccHelpText, placeholder: 'manager@example.com', example: 'manager@example.com' },
            { name: 'Bcc', internalKey: 'bcc', type: 'string', required: false, description: 'Optional hidden copied recipients.', helpText: bccHelpText, placeholder: 'archive@example.com', example: 'archive@example.com' },
            { name: 'From', internalKey: 'from', type: 'string', required: false, description: 'Optional verified Gmail alias to send as.', helpText: fromHelpText, placeholder: 'your-email@gmail.com', example: '' },
          ],
          outputExample: {
            success: true,
            subject: 'Your order #1048 has shipped!',
            to: 'alice@example.com',
            messageId: '18abc123def456',
            sentCount: 1,
            failedCount: 0,
            results: [{ to: 'alice@example.com', success: true, messageId: '18abc123def456' }],
          },
          outputDescription: 'success: true only when every recipient sent successfully. subject/to: the final resolved subject and recipient(s) used. messageId: the Gmail message ID when exactly one recipient was sent to (omitted for multi-recipient sends — use results instead). sentCount/failedCount: how many of the resolved recipients succeeded or failed. results: one entry per recipient with its own success, messageId, and error. Failures return _error (with _adapterDiagnostics for recipient/subject/body problems) instead of throwing.',
          usageExample: {
            scenario: 'Send a personalized order-shipped email to a customer captured earlier in the workflow',
            inputValues: {
              operation: 'send',
              recipientSource: 'manual_entry',
              recipientEmails: '{{$json.email}}',
              subject: 'Your order #{{$json.orderId}} has shipped!',
              body: 'Hi {{$json.name}}, your order is on its way and should arrive in 3-5 business days.',
              cc: '',
              bcc: '',
              from: '',
            },
            expectedOutput: 'The email is delivered to the recipient. Use {{$json.messageId}} for logging, and {{$json.success}} or {{$json.failedCount}} in an If/Else step to branch on delivery failure.',
          },
          externalDocsUrl: 'https://developers.google.com/gmail/api/reference/rest/v1/users.messages/send',
        },
        {
          name: 'List Messages',
          value: 'list',
          description: 'Lists recent messages from the connected Gmail inbox, optionally filtered by an initial Gmail search query, returning only lightweight message references (not full content).',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Gmail action to run.', helpText: operationHelpText, placeholder: 'list', example: 'list', defaultValue: 'send', options: ['send', 'list', 'get', 'search'] },
            { name: 'Search Query', internalKey: 'query', type: 'string', required: false, description: 'Optional Gmail search filter.', helpText: queryHelpText, placeholder: 'from:example@gmail.com', example: 'is:unread label:support' },
            { name: 'Max Results', internalKey: 'maxResults', type: 'number', required: false, description: 'Maximum number of messages to return.', helpText: maxResultsHelpText, placeholder: '10', example: '10', defaultValue: '10' },
          ],
          outputExample: {
            messages: [
              { id: '18abc1', threadId: '18abc1' },
              { id: '18abc2', threadId: '18abc2' },
            ],
            resultSizeEstimate: 2,
            count: 2,
          },
          outputDescription: 'messages: array of lightweight Gmail message references, each with only id and threadId — Gmail\'s List endpoint does not include subject, sender, or snippet text; use a Get step with {{$json.id}} to read full content. resultSizeEstimate: Gmail\'s approximate total match count, which can exceed Max Results. count: the actual number of items returned in this run. Failures return _error instead of a messages array.',
          usageExample: {
            scenario: 'Fetch unread support emails so each one can be turned into a support ticket',
            inputValues: {
              operation: 'list',
              query: 'is:unread label:support',
              maxResults: '10',
            },
            expectedOutput: 'Returns up to 10 unread messages. Loop over {{$json.messages}} and use each item\'s {{$json.id}} in a Gmail Get step to fetch the full content before creating a ticket.',
          },
          externalDocsUrl: 'https://developers.google.com/gmail/api/reference/rest/v1/users.messages/list',
        },
        {
          name: 'Get Message',
          value: 'get',
          description: 'Fetches the full raw Gmail message resource for one specific message ID, including headers, labels, and the MIME body payload.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Gmail action to run.', helpText: operationHelpText, placeholder: 'get', example: 'get', defaultValue: 'send', options: ['send', 'list', 'get', 'search'] },
            { name: 'Message Id', internalKey: 'messageId', type: 'string', required: true, description: 'Gmail message ID to fetch.', helpText: messageIdHelpText, placeholder: 'abc123def456', example: '{{$json.id}}' },
          ],
          outputExample: {
            messageId: '18abc123',
            message: {
              id: '18abc123',
              threadId: '18abc123',
              labelIds: ['INBOX', 'IMPORTANT'],
              snippet: 'Please find attached your invoice for January...',
              payload: {
                headers: [
                  { name: 'Subject', value: 'Invoice #1234' },
                  { name: 'From', value: 'billing@vendor.com' },
                  { name: 'To', value: 'me@company.com' },
                ],
                mimeType: 'text/plain',
                body: { size: 812, data: 'UGxlYXNlIGZpbmQgYXR0YWNoZWQgeW91ciBpbnZvaWNlLi4u' },
              },
              internalDate: '1736928000000',
            },
          },
          outputDescription: 'message: the full raw Gmail API message resource (Gmail\'s native shape, not a simplified one) — message.snippet is a short preview, message.labelIds shows Gmail labels, and message.payload.headers is an array of {name, value} pairs where you find Subject/From/To by matching header.name. The actual body text is base64url-encoded inside message.payload.body.data (or inside message.payload.parts for multi-part messages) and must be decoded before use. messageId echoes back the ID that was requested. Failures return _error instead of message.',
          usageExample: {
            scenario: 'Read the full details of each email a previous Gmail List step found',
            inputValues: {
              operation: 'get',
              messageId: '{{$json.id}}',
            },
            expectedOutput: 'Returns the full raw Gmail message. Use {{$json.message.snippet}} for a quick preview, or decode {{$json.message.payload.body.data}} (base64url) in a JavaScript node to get the full plain-text body.',
          },
          externalDocsUrl: 'https://developers.google.com/gmail/api/reference/rest/v1/users.messages/get',
        },
        {
          name: 'Search Messages',
          value: 'search',
          description: 'Searches Gmail messages using Gmail search syntax, the same operators available in the Gmail search bar, returning lightweight message references.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Gmail action to run.', helpText: operationHelpText, placeholder: 'search', example: 'search', defaultValue: 'send', options: ['send', 'list', 'get', 'search'] },
            { name: 'Search Query', internalKey: 'query', type: 'string', required: true, description: 'Gmail search filter.', helpText: queryHelpText, placeholder: 'from:example@gmail.com', example: 'from:vendor@example.com newer_than:7d' },
            { name: 'Max Results', internalKey: 'maxResults', type: 'number', required: false, description: 'Maximum number of messages to return.', helpText: maxResultsHelpText, placeholder: '10', example: '25', defaultValue: '10' },
          ],
          outputExample: {
            messages: [{ id: '18abc9', threadId: '18abc9' }],
            resultSizeEstimate: 1,
            query: 'from:vendor@example.com newer_than:7d',
            count: 1,
          },
          outputDescription: 'messages: array of lightweight Gmail message references matching the query, each with only id and threadId — no subject, sender, or snippet text; use a Get step with {{$json.id}} to read full content. resultSizeEstimate: Gmail\'s approximate total match count. query: the exact search text that was used, useful for logging. count: the actual number of items returned. Failures return _error instead of a messages array.',
          usageExample: {
            scenario: 'Find every recent invoice email from a specific vendor',
            inputValues: {
              operation: 'search',
              query: 'from:vendor@example.com newer_than:7d',
              maxResults: '25',
            },
            expectedOutput: 'Returns messages matching the query. Loop over {{$json.messages}} and use each item\'s {{$json.id}} in a Gmail Get step to read the full invoice content.',
          },
          externalDocsUrl: 'https://developers.google.com/gmail/api/reference/rest/v1/users.messages/list',
        },
      ],
    },
  ],
  commonErrors: [
    { error: 'Gmail: OAuth token not found', cause: 'Neither the workflow owner nor the current user has a Google account connected with Gmail scopes.', fix: 'Open Connections, add a Google connection, and grant the Gmail send/readonly permissions requested.' },
    { error: 'Gmail: missing recipient email(s)', cause: 'Recipient Source, Recipient Emails, To, and any fallback sheet all resolved to zero usable addresses.', fix: 'Fill Recipient Emails or To directly, or make sure an upstream node (or the Fallback Spreadsheet ID) actually supplies rows with an email-like column.' },
    { error: 'Gmail: "subject" field is required', cause: 'Subject resolved to empty for a Send Email operation.', fix: 'Fill Subject or map it from an earlier step\'s output.' },
    { error: 'Gmail: "body" field is required', cause: 'Body resolved to empty for a Send Email operation.', fix: 'Fill Body or map it from an earlier step\'s output.' },
    { error: 'Gmail: "messageId" field is required for get operation', cause: 'Operation is get and Message ID is blank.', fix: 'Map {{$json.id}} from a previous Gmail List or Search step.' },
    { error: 'Gmail: could not read inline spreadsheet', cause: 'Fallback Spreadsheet ID, Fallback Sheet Name, or Fallback Range points at a sheet, tab, or range the connected account cannot read.', fix: 'Verify the spreadsheet ID, confirm the tab name matches exactly, and confirm the connected Google account has access to that sheet.' },
    { error: 'Gmail: Authentication failed', cause: 'The Google OAuth token is invalid or expired, commonly a 401 response from the Gmail API.', fix: 'Reconnect Google in Connections so a fresh token is issued.' },
    { error: 'Gmail: Permission denied', cause: 'The connected account is missing the gmail.send or gmail.readonly scope for the attempted operation, commonly a 403 response.', fix: 'Reconnect Google in Connections and make sure the Gmail permission prompt is fully accepted.' },
    { error: 'Gmail: Unsupported operation', cause: 'Operation holds a value other than send, list, get, or search.', fix: 'Choose one of the four supported operations from the dropdown.' },
    { error: 'Next node cannot find Gmail result', cause: 'The downstream node is reading a field shape from the wrong operation, such as expecting messageId after a List step, or expecting a flat body after a Get step.', fix: 'Use {{$json.messageId}} only after Send or Get, {{$json.messages}} only after List or Search, and decode {{$json.message.payload.body.data}} for the actual Get message text.' },
    { error: 'Permission denied after Gmail', cause: 'The Google connection only authorizes Gmail (and optionally Sheets) access; downstream service nodes still need their own account connections and permissions.', fix: 'Connect the required account on the downstream service node and confirm that provider permission separately from Gmail.' },
  ],
  relatedNodes: ['gmail_trigger', 'google_sheets', 'email', 'ai_agent', 'http_request'],
};
