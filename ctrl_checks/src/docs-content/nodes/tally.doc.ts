import type { NodeDoc, FieldDoc, OperationDoc } from '../types';

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'Which Tally XML API action to perform: read a ledger, read a voucher, create a voucher, list stock items, or read company info.',
  helpText:
    'What this field is: The dropdown that chooses which Tally XML API request this node sends — get_ledger, get_voucher, create_voucher, get_stock_items, or get_company_info.\n' +
    'Why it matters: Tally has a single XML gateway endpoint for everything; this field is what actually decides which built-in XML template the node builds and sends, since there is no separate "resource" field.\n' +
    'When to fill it: Always — it is required on every run, and it also controls which other fields (Ledger Name, Voucher ID / Number, Custom XML Payload) are relevant.\n' +
    'What to enter: Get Ledger to read one or all ledgers (Cash, Bank, Sales, etc.), Get Voucher to read one or all vouchers (transactions), Create Voucher to push a new accounting transaction into Tally, Get Stock Items to list inventory items, Get Company Info to read company metadata and as a connectivity health check.\n' +
    'Where the value comes from: Chosen directly from the dropdown in the node panel — it is not something you copy from Tally itself.\n' +
    'How to use it later: The chosen operation determines the shape of the XML returned in {{$json.data}}, so downstream JavaScript parsing logic should branch on which operation ran.\n' +
    'Accepted format: One of the five literal values: get_ledger, get_voucher, create_voucher, get_stock_items, get_company_info.\n' +
    'Real workplace example: A nightly finance workflow uses Get Ledger to check the Cash balance, while a checkout-triggered workflow uses Create Voucher to record a Sales transaction the moment an order is paid.\n' +
    'If it is empty or wrong: The frontend always sends a value (it defaults to get_ledger), but an unrecognized operation value falls through the XML-template builder with no matching branch, so Custom XML Payload becomes required in practice for anything outside the five listed values.\n' +
    'Common mistake: Selecting Create Voucher without also filling in Custom XML Payload — Create Voucher has no default template, so this always fails with "Tally node: payload (XML body) is required for create_voucher operation".',
  options: ['get_ledger', 'get_voucher', 'create_voucher', 'get_stock_items', 'get_company_info'],
};

const endpointField: FieldDoc = {
  name: 'Tally Server URL',
  internalKey: 'endpoint',
  type: 'url',
  required: true,
  description: 'The local or network web address where Tally ERP / TallyPrime\'s XML API gateway is listening.',
  helpText:
    'What this field is: The web address of the Tally XML API gateway this node sends every request to.\n' +
    'Why it matters: Tally is desktop software running on your own computer or local network, not a cloud service with a fixed address — the workflow has no way to find it unless you provide this URL.\n' +
    'When to fill it: Always — it is required for every operation, since even read operations POST an XML request to this exact address.\n' +
    'What to enter: The full URL including http:// and the port number. Use http://localhost:9000 if Tally is running on the same machine as the CtrlChecks worker, or the LAN IP address of the computer running Tally (for example http://192.168.1.10:9000) if it is on another machine.\n' +
    'Where the value comes from: The port is set inside Tally itself (Gateway of Tally → F12: Configure → Advanced Configuration → Enable XML Server, which defaults to port 9000); the IP address is whatever network address the Tally machine has.\n' +
    'How to use it later: This value is not part of the output — it only controls where the request goes; downstream nodes read {{$json.data}} for the actual result.\n' +
    'Accepted format: A full URL starting with http:// (Tally\'s XML gateway does not use HTTPS by default), including the port, with no trailing slash — for example http://localhost:9000.\n' +
    'Real workplace example: An office running Tally on a dedicated accounts PC at 192.168.1.25 would set this to http://192.168.1.25:9000 so every other machine on the network (including this workflow) can reach it.\n' +
    'If it is empty or wrong: An empty value fails immediately with "Tally node: endpoint is required" before any network call is made; a wrong or unreachable address fails with a network/connection error because nothing is listening there.\n' +
    'Common mistake: Forgetting to actually start Tally, or leaving "Enable XML Server" set to No — the workflow will fail with a connection error even though the URL itself is typed correctly.',
  placeholder: 'http://localhost:9000',
  defaultValue: 'http://localhost:9000',
  example: 'http://localhost:9000',
};

const companyNameField: FieldDoc = {
  name: 'Company Name',
  internalKey: 'companyName',
  type: 'string',
  required: false,
  description: 'The exact Tally company name to scope the request to, when more than one company is loaded in Tally.',
  helpText:
    'What this field is: The name of the specific Tally company this request should read or write against.\n' +
    'Why it matters: Tally can have multiple companies open at once; without this field, Tally uses whichever company is currently active in the Tally desktop UI, which may not be the one you intend.\n' +
    'When to fill it: Fill it whenever more than one company could be open in Tally, or whenever a scheduled/unattended workflow runs without anyone confirming which company is active. Leave it blank when only one company is ever loaded.\n' +
    'What to enter: The company name exactly as it appears inside Tally, including punctuation like "Pvt Ltd." — Tally company names are case-sensitive.\n' +
    'Where the value comes from: Type it directly from Tally\'s company list, or map it from an earlier step such as a lookup table that stores which company each workflow run applies to.\n' +
    'How to use it later: This field only scopes the request; it is not echoed back in the output, so downstream steps identify the company from context, not from {{$json}}.\n' +
    'Accepted format: Plain text, exactly matching Tally\'s stored company name — for example Acme Trading Pvt Ltd.\n' +
    'Real workplace example: A bookkeeping firm running Tally for three client companies on one machine sets this field to the exact client name so each scheduled sync runs against the correct company\'s books.\n' +
    'If it is empty or wrong: Left blank, Tally silently uses whatever company happens to be active in the desktop UI at that moment — a right-looking but wrong-company result, not an error. A misspelled name is typically ignored by Tally rather than rejected, so double-check results rather than expecting a clear failure.\n' +
    'Common mistake: Typing a shortened or informal company name (like "Acme") instead of the exact registered name Tally stores (like "Acme Trading Pvt Ltd") — Tally will not fuzzy-match this.',
  placeholder: 'Acme Trading Pvt Ltd',
  example: 'Acme Trading Pvt Ltd',
};

const ledgerNameField: FieldDoc = {
  name: 'Ledger Name',
  internalKey: 'ledgerName',
  type: 'string',
  required: false,
  description: 'The name of one specific ledger account to fetch with Get Ledger — leave blank to fetch every ledger.',
  helpText:
    'What this field is: A filter that narrows a Get Ledger request down to a single named account, such as "Cash" or "HDFC Bank".\n' +
    'Why it matters: Without it, Get Ledger returns every ledger in the company as one large XML document, which is slower to fetch and harder to parse for a single value like a balance.\n' +
    'When to fill it: Fill it whenever you only need one ledger\'s data, such as checking a single account balance. Leave it blank when you genuinely need the full chart of accounts, or when you plan to parse and filter the XML yourself downstream.\n' +
    'What to enter: The ledger name exactly as it appears in Tally\'s Chart of Accounts.\n' +
    'Where the value comes from: Copy it from Tally\'s ledger list, or map it dynamically with something like {{$json.ledgerName}} when an earlier form or database step supplies which account to check.\n' +
    'How to use it later: The matching ledger\'s XML block appears inside {{$json.data}} — parse it with a JavaScript node to pull out fields like opening balance or closing balance.\n' +
    'Accepted format: Plain text matching an existing ledger name — for example Cash, HDFC Bank, or Sales Account.\n' +
    'Real workplace example: A daily cash-position check sets this to "Cash" so the returned XML only covers that one ledger instead of the entire chart of accounts.\n' +
    'If it is empty or wrong: Left blank, every ledger is returned. A name that does not exist in Tally typically comes back as an empty result set rather than a clear error — check for missing data in {{$json.data}} rather than expecting a failure message.\n' +
    'Common mistake: Mistyping the ledger name with different capitalization or spacing than Tally uses internally — ledger name matching in Tally\'s XML filter is exact, not fuzzy.',
  placeholder: 'Cash',
  example: 'Cash',
};

const voucherIdField: FieldDoc = {
  name: 'Voucher ID / Number',
  internalKey: 'voucherId',
  type: 'string',
  required: false,
  description: 'The voucher number of one specific transaction to fetch with Get Voucher — leave blank to fetch every voucher.',
  helpText:
    'What this field is: A filter that narrows a Get Voucher request down to a single transaction by its voucher number, such as "RCP-001" or "INV-456".\n' +
    'Why it matters: Without it, Get Voucher returns every voucher in the company, which can be a very large dataset for any business with regular transaction volume.\n' +
    'When to fill it: Fill it whenever you only need to confirm or read one specific transaction. Leave it blank when you need a full transaction list for a date range or type, which you will then filter yourself in a downstream step.\n' +
    'What to enter: The voucher number exactly as it appears in Tally, including any prefix Tally auto-generates or your numbering scheme uses.\n' +
    'Where the value comes from: Copy it from Tally\'s voucher register, or map it dynamically with something like {{$json.receiptNumber}} when an earlier webhook or form step supplies the number to look up.\n' +
    'How to use it later: The matching voucher\'s XML block appears inside {{$json.data}} — parse it with a JavaScript node to pull out fields like amount, date, or party name.\n' +
    'Accepted format: Plain text matching an existing voucher number — for example RCP-001, INV-456, or JV-2024-03-15.\n' +
    'Real workplace example: When an online store receives a payment, a workflow checks Get Voucher with the matching receipt number to confirm the accounting entry was recorded before sending a customer confirmation email.\n' +
    'If it is empty or wrong: Left blank, every voucher is returned. A voucher number that does not exist typically comes back as an empty result rather than a clear error — check for missing data in {{$json.data}} before assuming the voucher exists.\n' +
    'Common mistake: Assuming voucher numbers are globally unique across voucher types — Tally often numbers each voucher type (Sales, Payment, Receipt, Journal) independently, so the same number can exist under different types.',
  placeholder: 'RCP-001',
  example: 'RCP-001',
};

const payloadField: FieldDoc = {
  name: 'Custom XML Payload',
  internalKey: 'payload',
  type: 'json',
  required: false,
  description: 'An optional complete Tally XML request that replaces the node\'s built-in template for Get Ledger, Get Voucher, Get Stock Items, or Get Company Info.',
  helpText:
    'What this field is: A full Tally XML API request envelope you write yourself, replacing the automatic template this node normally builds for read operations.\n' +
    'Why it matters: The automatic templates cover simple cases (all records, or one record filtered by name/number); Tally\'s XML API supports far more — date ranges, voucher types, custom collections — which this field unlocks.\n' +
    'When to fill it: Fill it only when Company Name plus Ledger Name / Voucher ID cannot express the filter you need. Leave it blank for standard queries — the node already builds correct XML automatically for all four read operations.\n' +
    'What to enter: A complete, valid <ENVELOPE>...</ENVELOPE> XML document following Tally\'s TDL request schema for the operation you selected.\n' +
    'Where the value comes from: Hand-write it by referencing Tally\'s XML API documentation, or build it dynamically in a JavaScript node placed earlier in the workflow and pass it in as {{$json.customXmlBody}}.\n' +
    'How to use it later: When set, this exact XML is sent as the request body instead of the built-in template — Company Name, Ledger Name, and Voucher ID are then ignored for that request, since the XML you provide is authoritative.\n' +
    'Accepted format: Well-formed XML starting with <ENVELOPE> and matching Tally\'s TDL schema — malformed XML is sent as-is and Tally itself will reject it.\n' +
    'Real workplace example: A report needing vouchers only from the last 7 days would use a custom XML payload with an explicit SVFROMDATE/SVTODATE date range, since the built-in template has no date-range fields.\n' +
    'If it is empty or wrong: Left blank on a read operation, the node\'s own template is used instead — this is the normal, safe state. Malformed or schema-invalid XML here is forwarded to Tally as-is and Tally responds with its own XML error rather than this node catching the mistake first.\n' +
    'Common mistake: Copying an example XML from documentation without swapping in the real company name, ledger name, or date values — Tally will process the literal placeholder text as if it were real data.',
  placeholder: '<ENVELOPE>...</ENVELOPE>',
};

const payloadRequiredField: FieldDoc = {
  ...payloadField,
  name: 'Custom XML Payload (Required)',
  required: true,
  description: 'The complete Tally XML voucher envelope to create — REQUIRED for Create Voucher, since there is no default template.',
  helpText:
    'What this field is: The complete Tally XML request containing the entire voucher you want Create Voucher to add to Tally — sales, purchase, payment, receipt, or journal entry.\n' +
    'Why it matters: Unlike the four read operations, Create Voucher has no built-in template at all, because every voucher type has its own ledger mappings and required structure that this node cannot guess.\n' +
    'When to fill it: Always, whenever Operation is set to Create Voucher — there is no way to create a voucher without it.\n' +
    'What to enter: A complete, valid <ENVELOPE> containing voucher type, date, voucher number, the debit/credit ledger entries, amounts, and narration, following Tally\'s TDL import schema.\n' +
    'Where the value comes from: Typically built dynamically in a JavaScript node placed earlier in the workflow (assembling the XML from order data, form fields, or a previous step\'s output), then passed in here as {{$json.voucherXml}} — writing correct voucher XML by hand for every run is impractical.\n' +
    'How to use it later: After this node runs, parse {{$json.data}} for <CREATED>1</CREATED> to confirm Tally actually accepted the voucher before treating the workflow step as successful.\n' +
    'Accepted format: Well-formed XML starting with <ENVELOPE><HEADER><TALLYREQUEST>Import</TALLYREQUEST>... matching Tally\'s voucher import schema.\n' +
    'Real workplace example: The moment an online order is marked paid, a JavaScript node builds a Sales voucher XML from the order total and customer ledger, and this field is set to {{$json.salesVoucherXml}} so the sale is recorded in Tally automatically.\n' +
    'If it is empty or wrong: An empty value fails immediately with "Tally node: payload (XML body) is required for create_voucher operation" before any network call is made. Malformed or schema-invalid XML is still sent to Tally, which then rejects it with its own XML error — a 200 status code does not by itself mean the voucher was created.\n' +
    'Common mistake: Treating a 200 status code and a returned XML body as proof of success — Tally can return HTTP 200 with <CREATED>0</CREATED> and an embedded validation error (missing ledger, duplicate voucher number, invalid date) inside the XML body itself, so {{$json.data}} must always be parsed and checked.',
};

const getLedgerOperation: OperationDoc = {
  name: 'Get Ledger',
  value: 'get_ledger',
  description: 'Fetches ledger account details from Tally — ledgers track accounts like Cash, Bank, Sales, and Purchases. Use this to read account balances or ledger metadata for reporting or reconciliation workflows. Filter to one ledger with Ledger Name, or omit it to fetch every ledger in the company.',
  fields: [endpointField, operationField, companyNameField, ledgerNameField, payloadField],
  outputExample: { success: true, data: '<ENVELOPE><BODY><IMPORTDATA><REQUESTDATA><TALLYMESSAGE>...</TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>', statusCode: 200 },
  outputDescription: 'success: always true when Tally responded without a network error — check the presence of _error instead of relying on this to detect failures. data: the raw XML response string from Tally containing the requested ledger(s), following Tally\'s TDL schema; this is text, not JSON, so a JavaScript node is needed to extract values like opening or closing balance. statusCode: the HTTP status code Tally\'s gateway returned (200 = success). There is no separate count or items field — everything is inside the XML string in data.',
  usageExample: {
    scenario: 'Fetch the Cash ledger balance from Tally every morning and send a summary email to the finance team',
    inputValues: { operation: 'get_ledger', endpoint: 'http://localhost:9000', companyName: 'Acme Trading Pvt Ltd', ledgerName: 'Cash' },
    expectedOutput: 'Tally returns XML containing the Cash ledger details in {{$json.data}}; a JavaScript node parses it to extract the balance before it reaches the Email node.',
  },
  externalDocsUrl: 'https://help.tallysolutions.com/docs/',
};

const getVoucherOperation: OperationDoc = {
  name: 'Get Voucher',
  value: 'get_voucher',
  description: 'Fetches voucher (transaction) details from Tally — vouchers are accounting entries like sales, purchases, payments, receipts, and journal entries. Use this to retrieve transaction details for audit, reporting, or synchronization workflows. Filter to one voucher with Voucher ID / Number, or omit it to fetch every voucher.',
  fields: [endpointField, operationField, companyNameField, voucherIdField, payloadField],
  outputExample: { success: true, data: '<ENVELOPE><BODY><IMPORTDATA><REQUESTDATA><TALLYMESSAGE>...</TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>', statusCode: 200 },
  outputDescription: 'success: always true when Tally responded without a network error — check the presence of _error instead of relying on this to detect failures. data: the raw XML response string from Tally containing the requested voucher(s), including voucher type, date, number, party name, ledger entries, amounts, and narration; parse it with a JavaScript node to extract specific fields. statusCode: the HTTP status code Tally\'s gateway returned (200 = success).',
  usageExample: {
    scenario: 'When a payment is received in an online store, check whether the matching receipt voucher was recorded in Tally and send a confirmation email',
    inputValues: { operation: 'get_voucher', endpoint: 'http://localhost:9000', companyName: 'Acme Trading Pvt Ltd', voucherId: 'RCP-001' },
    expectedOutput: 'Tally returns XML containing the receipt voucher details in {{$json.data}}; a JavaScript node parses out the amount and date before an Email node sends the confirmation.',
  },
  externalDocsUrl: 'https://help.tallysolutions.com/docs/',
};

const createVoucherOperation: OperationDoc = {
  name: 'Create Voucher',
  value: 'create_voucher',
  description: 'Creates a new accounting voucher in Tally — sales, purchases, payments, receipts, journal entries, and more. This operation has no default template and requires a complete XML payload defining the entire voucher structure. Use this to push accounting transactions from external systems into Tally.',
  fields: [endpointField, operationField, payloadRequiredField, companyNameField],
  outputExample: { success: true, data: '<ENVELOPE><BODY><IMPORTRESULT><CREATED>1</CREATED><ALTERED>0</ALTERED><LASTVCHID>1</LASTVCHID></IMPORTRESULT></BODY></ENVELOPE>', statusCode: 200 },
  outputDescription: 'success: always true when Tally responded without a network error — this does NOT by itself confirm the voucher was created. data: the raw XML response string; a successful creation includes <CREATED>1</CREATED>, while a rejected voucher includes <CREATED>0</CREATED> plus a validation error message describing the problem (missing ledger, duplicate voucher number, invalid date). statusCode: the HTTP status code Tally\'s gateway returned (200 = success, but does not guarantee the voucher was actually saved). Always parse {{$json.data}} for <CREATED>1</CREATED> before treating this step as successful.',
  usageExample: {
    scenario: 'When an online sale completes, automatically create a matching Sales voucher in Tally with the customer name, items, and amount',
    inputValues: { operation: 'create_voucher', endpoint: 'http://localhost:9000', payload: '{{$json.salesVoucherXml}}' },
    expectedOutput: 'Tally returns XML showing <CREATED>1</CREATED> inside {{$json.data}} if the voucher was created; a JavaScript node checks for this tag before logging success or alerting on failure.',
  },
  externalDocsUrl: 'https://help.tallysolutions.com/docs/',
};

const getStockItemsOperation: OperationDoc = {
  name: 'Get Stock Items',
  value: 'get_stock_items',
  description: 'Fetches the stock item list from Tally — stock items are the inventory products or goods tracked in Tally. Use this to sync inventory data, check stock levels, or integrate Tally inventory with other systems. Always returns every stock item; there is no per-item name filter for this operation.',
  fields: [endpointField, operationField, companyNameField, payloadField],
  outputExample: { success: true, data: '<ENVELOPE><BODY><IMPORTDATA><REQUESTDATA><TALLYMESSAGE>...</TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>', statusCode: 200 },
  outputDescription: 'success: always true when Tally responded without a network error — check the presence of _error instead of relying on this to detect failures. data: the raw XML response string containing every stock item\'s name, opening balance, closing balance, unit of measure, and category; parse it with a JavaScript node to extract quantities or rates. statusCode: the HTTP status code Tally\'s gateway returned (200 = success).',
  usageExample: {
    scenario: 'Every night, fetch the complete stock item list from Tally, parse it, and sync low-stock items to a Google Sheet for the procurement team',
    inputValues: { operation: 'get_stock_items', endpoint: 'http://localhost:9000', companyName: 'Acme Trading Pvt Ltd' },
    expectedOutput: 'Tally returns XML containing all stock items in {{$json.data}}; a JavaScript node filters items below a quantity threshold before a Google Sheets node logs them.',
  },
  externalDocsUrl: 'https://help.tallysolutions.com/docs/',
};

const getCompanyInfoOperation: OperationDoc = {
  name: 'Get Company Info',
  value: 'get_company_info',
  description: 'Fetches company information from Tally — company name, address, financial year, and books-beginning date. Commonly used as a connectivity health check before running a larger sync, since a successful response proves Tally is running and reachable.',
  fields: [endpointField, operationField, payloadField],
  outputExample: { success: true, data: '<ENVELOPE><BODY><IMPORTDATA><REQUESTDATA><TALLYMESSAGE><COMPANY><NAME>Acme Trading Pvt Ltd</NAME><ADDRESS>...</ADDRESS><BOOKSBEGINNINGFROM>20240401</BOOKSBEGINNINGFROM></COMPANY></TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>', statusCode: 200 },
  outputDescription: 'success: always true when Tally responded without a network error — check the presence of _error instead of relying on this to detect failures. data: the raw XML response string containing company name, address, financial year start date, and books-beginning date; parse it with a JavaScript node to extract the fields you need. statusCode: the HTTP status code Tally\'s gateway returned (200 = success, and a strong signal by itself that Tally is reachable and the XML gateway is enabled).',
  usageExample: {
    scenario: 'Before a nightly accounting sync workflow runs its real work, verify Tally is running and reachable by fetching company info, and send an alert instead of proceeding if it fails',
    inputValues: { operation: 'get_company_info', endpoint: 'http://localhost:9000' },
    expectedOutput: 'Tally returns XML with the company name in {{$json.data}}; an If/Else node checks for {{$json._error}} to decide whether to proceed with the sync or send an alert email.',
  },
  externalDocsUrl: 'https://help.tallysolutions.com/docs/',
};

export const tallyDoc: NodeDoc = {
  slug: 'tally',
  displayName: 'Tally Solutions',
  category: 'CRM',
  logoUrl: '/icons/nodes/tally.svg',
  description:
    'Connect directly to Tally ERP / TallyPrime\'s local XML API gateway to read ledgers, vouchers, stock items, and company info, or create new accounting vouchers — no cloud account, only a running Tally instance reachable on your network.',
  credentialType: 'None (Direct Connection)',
  credentialSetupSteps: [
    'This node has no third-party account or cloud credential and does not use credentials at all — it is a direct network connection to a Tally ERP / TallyPrime instance you run yourself, on this computer or your local network.',
    'In Tally, enable the XML gateway: Gateway of Tally (Alt+F3) → F12: Configure → Advanced Configuration → set "Enable XML Server" to Yes, then restart Tally.',
    'Confirm the port Tally is listening on (default 9000) and, if Tally runs on a different machine than the CtrlChecks worker, confirm that machine\'s firewall allows inbound connections on that port.',
    'Set the Tally Server URL field on this node to that address, for example http://localhost:9000 for a local instance or http://192.168.1.10:9000 for a networked one.',
    'Test the connection by running this node with Operation set to Get Company Info — a successful response containing the company name confirms Tally is running, the XML gateway is enabled, and the address is reachable.',
    'Connect the Tally output to a logging, If/Else, or follow-up node when later steps should inspect {{$json.data}}. Downstream service node account connection setup is still required for nodes after Tally; this connection only authorizes Tally read/write operations against the local Tally instance, not any other service.',
  ],
  credentialDocsUrl: 'https://help.tallysolutions.com/docs/',
  resources: [
    {
      name: 'Accounting Operations',
      description: 'Tally exposes five operations through its local XML API gateway: reading ledgers, reading vouchers, creating vouchers, listing stock items, and reading company info. Every operation sends an XML request to the same Tally Server URL and receives a raw XML response — there is no JSON, and no separate "resource" concept beyond the operation itself.',
      operations: [getLedgerOperation, getVoucherOperation, createVoucherOperation, getStockItemsOperation, getCompanyInfoOperation],
    },
  ],
  commonErrors: [
    {
      error: 'Tally node: endpoint is required',
      cause: 'The Tally Server URL field was left empty.',
      fix: 'Enter the full Tally XML gateway URL including http:// and the port, for example http://localhost:9000.',
    },
    {
      error: 'Tally node: payload (XML body) is required for create_voucher operation',
      cause: 'Operation is set to Create Voucher but the Custom XML Payload field is empty. Create Voucher has no default template, unlike the four read operations.',
      fix: 'Build a complete Tally voucher XML envelope — typically in a JavaScript node placed earlier in the workflow — and pass it into Custom XML Payload, for example as {{$json.voucherXml}}.',
    },
    {
      error: 'fetch failed / connection refused when calling the Tally Server URL',
      cause: 'Tally is not running, the XML gateway ("Enable XML Server") is not turned on, or the Tally Server URL is wrong or unreachable from the machine running the workflow.',
      fix: 'Confirm Tally is running, confirm Enable XML Server is set to Yes under F12: Configure → Advanced Configuration (restart Tally after changing it), confirm the URL and port are correct, and confirm firewall rules allow the connection if Tally is on another machine.',
    },
    {
      error: 'Tally node: HTTP <status> — <response text>',
      cause: 'Tally\'s XML gateway responded with a non-2xx HTTP status, most often because the XML sent (default template or custom payload) did not match what Tally expected.',
      fix: 'Inspect the response text included in the error message, verify company/ledger/voucher names match Tally exactly (matching is case-sensitive and exact, not fuzzy), and validate any Custom XML Payload against Tally\'s TDL schema.',
    },
    {
      error: 'Tally: <error message> (network/unexpected error)',
      cause: 'An unexpected error occurred while contacting Tally — for example a timeout on a very large ledger/voucher export, or a malformed URL.',
      fix: 'For large exports, add a filter (Ledger Name, Voucher ID / Number, or a date range inside Custom XML Payload) to reduce the response size, and confirm the Tally Server URL is well-formed.',
    },
    {
      error: 'XML response contains <CREATED>0</CREATED> or an embedded error message after Create Voucher',
      cause: 'Tally received and processed the create_voucher request (HTTP 200) but rejected the voucher itself — common causes are a ledger referenced in the XML that does not exist in Tally, a duplicate voucher number, or a date outside the active financial year.',
      fix: 'Parse {{$json.data}} with a JavaScript node to read Tally\'s embedded error text, then confirm every ledger referenced in the voucher XML exists in Tally, the voucher number is unique, and the date falls within the current financial year.',
    },
  ],
  relatedNodes: ['javascript', 'email', 'google_sheets', 'slack_message', 'http_request'],
};
