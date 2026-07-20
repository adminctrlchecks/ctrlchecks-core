import type { NodeDoc, FieldDoc, OperationDoc } from '../types';

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'Which Zoho CRM record action to perform. Only 6 of the 9 dropdown values are actually implemented by the runtime — see the notes below.',
  helpText:
    'What this field is: The dropdown that chooses which Zoho CRM record action this node performs.\n' +
    'Why it matters: This node is a thin wrapper over a generic multi-service Zoho API client — this field is what actually decides which Zoho CRM REST endpoint gets called.\n' +
    'When to fill it: Always — it is required on every run.\n' +
    'What to enter: Get to fetch one record, Create to add a new one, Update to change an existing one, Delete to permanently remove one, Search to find records matching criteria, Upsert to create-or-update based on a unique field.\n' +
    'Where the value comes from: Chosen directly from the dropdown.\n' +
    'How to use it later: The chosen operation determines the shape of {{$json.data}} — see each operation\'s own output example.\n' +
    'Accepted format: One of the nine literal dropdown values, but only get, create, update, delete, search, and upsert are actually implemented by the Zoho API client this node calls.\n' +
    'Real workplace example: A lead-qualification workflow uses Search to check whether a contact already exists by email, then Create or Update depending on the result.\n' +
    'If it is empty or wrong: The frontend always sends a value (it defaults to get); Get Many sends the literal value getMany, but the runtime\'s record dispatcher only recognizes the literal value list, so Get Many always fails with "Unknown CRM record operation: getMany" — a real, unfixed dropdown/runtime mismatch. Bulk Create and Bulk Update are unreachable through this panel at all: they require the client to be called with a different resource value the visual panel never sets, so both always fail with "Unknown CRM record operation: bulkCreate"/"bulkUpdate".\n' +
    'Common mistake: Selecting Get Many, Bulk Create, or Bulk Update expecting them to work like the other six operations — they are visible in the dropdown but not functional in this version of the node; use Search with a broad criteria expression as a partial substitute for Get Many.',
  options: ['get', 'getMany', 'create', 'update', 'delete', 'search', 'upsert', 'bulkCreate', 'bulkUpdate'],
};

const resourceField: FieldDoc = {
  name: 'Resource (internal)',
  internalKey: 'resource',
  type: 'string',
  required: true,
  description: 'A backend-only field that tells the shared Zoho API client which kind of object to work with. It is not exposed in the visual panel and is always "record" for every CRM operation this node supports.',
  helpText:
    'What this field is: An internal parameter used by the underlying Zoho API client to route a request to the correct handler.\n' +
    'Why it matters: The same client also powers Zoho Books, Creator, Sheets, Tasks, Billing, Email, and Tables — this field is what tells it "this is a CRM record request," even though only CRM is exposed through this node\'s visual panel.\n' +
    'When to fill it: Never manually — there is no visual panel field for it; it is always sent as record for this node.\n' +
    'What to enter: Nothing — this field is not editable through the Properties Panel.\n' +
    'Where the value comes from: Hardcoded server-side default (record) whenever this node type executes.\n' +
    'How to use it later: It is echoed back at the top level of the output as {{$json.resource}}, always the literal string "record" for every operation this node performs.\n' +
    'Accepted format: The literal string record — no other value is reachable through this node.\n' +
    'Real workplace example: Not applicable — this field exists purely as plumbing for the shared Zoho client and is not something a workflow author configures.\n' +
    'If it is empty or wrong: Not reachable in practice — the backend always supplies record for this node type.\n' +
    'Common mistake: Confusing this with Module — Resource identifies the Zoho service/object family (always "record" here), while Module identifies which specific CRM module (Contacts, Leads, etc.) within that family.',
};

const accessTokenField: FieldDoc = {
  name: 'OAuth2 Access Token',
  internalKey: 'accessToken',
  type: 'password',
  required: true,
  description: 'The Zoho OAuth2 access token used to authenticate every request to the Zoho CRM API.',
  helpText:
    'What this field is: The OAuth2 bearer token that authenticates this node\'s requests to Zoho CRM, sent as an Authorization header.\n' +
    'Why it matters: Zoho\'s REST API requires OAuth2 for every call — without a valid, non-expired token, every operation fails.\n' +
    'When to fill it: Always — it is required for every operation, though a saved Zoho CRM OAuth2 connection normally supplies it automatically.\n' +
    'What to enter: Leave this to auto-fill from a saved connection in almost all cases; only type a token manually for quick manual testing.\n' +
    'Where the value comes from: A saved Zoho CRM OAuth2 connection (Connections → Add Connection → Zoho CRM OAuth2 → Connect Zoho) supplies this automatically, along with a refresh token used to renew it.\n' +
    'How to use it later: This value is never part of the output and should never be read from {{$json}}.\n' +
    'Accepted format: A Zoho-issued OAuth2 access token string, typically starting with 1000..\n' +
    'Real workplace example: A sales team connects Zoho once under Connections, and every Zoho CRM node across every workflow reuses that same connection\'s token automatically, with Zoho refreshing it behind the scenes as needed.\n' +
    'If it is empty or wrong: If no token is available from config or a saved connection, the node fails immediately with a message naming the workflow owner and explaining they need to connect a Zoho account; an expired or invalid token fails with a 401-style authentication error from Zoho itself.\n' +
    'Common mistake: Typing a token manually and letting it expire — Zoho access tokens are short-lived (about an hour); a saved connection with a refresh token avoids this entirely, since this node\'s credential resolver automatically renews expired tokens when a connection is used.',
  placeholder: 'your-oauth-access-token',
};

const refreshTokenField: FieldDoc = {
  name: 'OAuth2 Refresh Token (internal)',
  internalKey: 'refreshToken',
  type: 'password',
  required: false,
  description: 'A backend-only credential field used to silently renew an expired OAuth2 Access Token — not exposed in the visual panel.',
  helpText:
    'What this field is: The long-lived OAuth2 refresh token Zoho issues alongside an access token, used to obtain a fresh access token once the current one expires.\n' +
    'Why it matters: Zoho access tokens expire roughly every hour; without a refresh token, a workflow would fail every time the token aged out, requiring manual reconnection.\n' +
    'When to fill it: Never manually — there is no visual panel field for it; a saved Zoho CRM OAuth2 connection supplies and manages it automatically.\n' +
    'What to enter: Nothing — this field is not editable through the Properties Panel.\n' +
    'Where the value comes from: Captured automatically during the "Connect Zoho" OAuth2 authorization flow when a Zoho CRM OAuth2 connection is first created.\n' +
    'How to use it later: Never read this from {{$json}} — it is a credential, not workflow data, and this node never echoes it into the output.\n' +
    'Accepted format: A Zoho-issued OAuth2 refresh token string, managed entirely by the credential system.\n' +
    'Real workplace example: A workflow that runs every night for months keeps working without anyone re-authorizing Zoho, because the refresh token silently renews the access token behind the scenes each time it expires.\n' +
    'If it is empty or wrong: If both the access token is expired and no valid refresh token is available, the node fails with the same "Zoho: Credentials not found" style message used for a fully missing connection, prompting reconnection.\n' +
    'Common mistake: Assuming a workflow needs to be manually reconnected on a schedule — it does not, as long as the original Zoho connection\'s refresh token remains valid (Zoho only invalidates it if the user revokes access or the token goes unused for an extended period).',
};

const credentialIdField: FieldDoc = {
  name: 'Credential ID (internal)',
  internalKey: 'credentialId',
  type: 'string',
  required: false,
  description: 'A backend-only reference to which saved Zoho connection this node uses — not exposed in the visual panel.',
  helpText:
    'What this field is: An internal identifier pointing at a specific saved Zoho CRM OAuth2 connection in the credential vault.\n' +
    'Why it matters: It is how the platform knows which of possibly several saved Zoho connections to pull the access/refresh token from at run time.\n' +
    'When to fill it: Never manually — there is no visual panel field for it; it is set automatically when a connection is selected for this node.\n' +
    'What to enter: Nothing — this field is not editable through the Properties Panel; do not paste an email, password, or token into any regular workflow field expecting this to act like a credential selector.\n' +
    'Where the value comes from: Assigned internally when a Zoho CRM OAuth2 connection is attached to this node.\n' +
    'How to use it later: This value is never part of the output.\n' +
    'Accepted format: An internal identifier string with no user-facing format.\n' +
    'Real workplace example: A workspace with two Zoho accounts (sales team and support team) relies on this field internally to keep each workflow\'s Zoho node pointed at the correct connection.\n' +
    'If it is empty or wrong: Not directly user-reachable; if no connection is selected, the node falls back to looking up the workflow owner\'s default Zoho connection instead.\n' +
    'Common mistake: Not applicable to normal workflow building — this field only matters to the credential-resolution system internally.',
};

const apiDomainField: FieldDoc = {
  name: 'API Domain',
  internalKey: 'apiDomain',
  type: 'select',
  required: true,
  description: 'The Zoho data-center region your account lives in — displayed as a dropdown, but currently has no effect on the actual request (see notes).',
  helpText:
    'What this field is: A dropdown intended to select which regional Zoho data center (US/EU/IN/CN/AU/JP) this node talks to.\n' +
    'Why it matters: Zoho CRM accounts are hosted in one of six regional data centers, and calling the wrong one normally causes authentication or "not found" failures.\n' +
    'When to fill it: It is shown as required on every operation, but confirmed from the runtime source that this exact field is never read — the underlying Zoho API client always initializes with the US region regardless of what is selected here, because the code reads a differently-named region field that this node\'s visual panel does not expose at all.\n' +
    'What to enter: Select the option matching your Zoho account\'s data center for documentation/intent purposes, understanding it does not currently change behavior.\n' +
    'Where the value comes from: Your Zoho account\'s own region — check your Zoho login URL (crm.zoho.com is US, crm.zoho.eu is EU, crm.zoho.in is IN, and so on).\n' +
    'How to use it later: This value is not part of the output.\n' +
    'Accepted format: One of the six listed region values.\n' +
    'Real workplace example: A company on a European Zoho account (crm.zoho.eu) selects EU here expecting requests to route to the EU data center — today they still route to the US endpoint regardless, which may fail if the account genuinely only exists in the EU data center.\n' +
    'If it is empty or wrong: There is currently no observable difference between any selection here — this is a real, confirmed limitation of this node, not a normal per-field validation case.\n' +
    'Common mistake: Assuming changing this field fixes a region-related authentication failure — it will not; region-locked accounts currently have no reliable way to force the correct region through this node\'s visual panel.',
  placeholder: 'https://www.zohoapis.com',
  defaultValue: 'https://www.zohoapis.com',
  options: ['US', 'EU', 'IN', 'CN', 'AU', 'JP'],
};

const moduleField: FieldDoc = {
  name: 'Module',
  internalKey: 'module',
  type: 'select',
  required: true,
  description: 'The Zoho CRM module (Contacts, Leads, Deals, etc.) this operation acts on.',
  helpText:
    'What this field is: The Zoho CRM module — the equivalent of a table or object type — this operation reads or writes.\n' +
    'Why it matters: Every Zoho CRM record belongs to exactly one module, and the module name is embedded directly into the API URL this node calls.\n' +
    'When to fill it: Always — it is required for every operation.\n' +
    'What to enter: Choose a standard module from the dropdown, or choose Custom Module and fill in Custom Module API Name for a module your organization added.\n' +
    'Where the value comes from: Chosen directly from the dropdown, matching the module you want to work with in Zoho CRM.\n' +
    'How to use it later: This value is not echoed back in most operations\' output, though it is implicit in the record shape returned.\n' +
    'Accepted format: One of the twelve standard module values, or Custom Module paired with Custom Module API Name.\n' +
    'Real workplace example: A website contact form uses Module set to Leads to create a new sales lead, while a support escalation workflow uses Contacts to look up an existing customer.\n' +
    'If it is empty or wrong: An unrecognized or misspelled module name is rejected by Zoho itself with a "module not found"-style error, since the API URL is built directly from this value.\n' +
    'Common mistake: Using the plural display name shown in the Zoho UI instead of the exact API name — most standard modules match (Contacts, Leads), but some differ (Sales Orders in the UI is Sales_Orders as an API name, already reflected correctly in this dropdown).\n' +
    'All twelve standard module values are: Contacts, Leads, Accounts, Deals, Campaigns, Tasks, Events, Calls, Products, Quotes, Sales_Orders, and Invoices — plus Custom Module for anything your organization added beyond the standard set.',
  placeholder: 'Contacts',
  defaultValue: 'Contacts',
  options: ['Contacts', 'Leads', 'Accounts', 'Deals', 'Campaigns', 'Tasks', 'Events', 'Calls', 'Products', 'Quotes', 'Sales_Orders', 'Invoices', 'Custom Module'],
};

const customModuleField: FieldDoc = {
  name: 'Custom Module API Name',
  internalKey: 'customModule',
  type: 'string',
  required: false,
  description: 'The API name of a custom module — only used when Module is set to Custom Module.',
  helpText:
    'What this field is: The exact API name of a custom module your organization added to Zoho CRM.\n' +
    'Why it matters: Custom modules are not in the standard dropdown, so this field is the only way to target one.\n' +
    'When to fill it: Only when Module is set to Custom Module. It has no effect for any of the twelve standard modules.\n' +
    'What to enter: The exact API name, not the display label shown in the Zoho UI.\n' +
    'Where the value comes from: Zoho CRM → Setup → Customization → Modules → select your custom module → API Name field.\n' +
    'How to use it later: This value is not echoed back in the output.\n' +
    'Accepted format: Plain text matching Zoho\'s custom module API naming convention, typically ending in a number or underscore-suffixed word, for example CustomModule1.\n' +
    'Real workplace example: A manufacturing company with a custom "Warranty_Claims" module enters that exact API name here to create warranty claim records from a workflow.\n' +
    'If it is empty or wrong: Left blank while Module is set to Custom Module, the request has no real module to target and fails; a misspelled API name fails the same way a misspelled standard module name would.\n' +
    'Common mistake: Selecting Custom Module from the Module dropdown but forgetting to fill this field in — the two fields work together and both must be set correctly.',
  placeholder: 'CustomModule1',
};

const recordIdField: FieldDoc = {
  name: 'Record ID',
  internalKey: 'recordId',
  type: 'string',
  required: false,
  description: 'The numeric ID of one specific record — required for Get, Update, and Delete.',
  helpText:
    'What this field is: The numeric identifier of one specific Zoho CRM record.\n' +
    'Why it matters: Get, Update, and Delete all act on exactly one record, and this is how the node knows which one.\n' +
    'When to fill it: Required for Get, Update, and Delete. Not used by Create, Search, or Upsert.\n' +
    'What to enter: The plain numeric record ID, with no other text.\n' +
    'Where the value comes from: Open the record in Zoho CRM and copy the ID from the URL, or map it from a previous step\'s output such as {{$json.data.data[0].id}} after a Search or Create step.\n' +
    'How to use it later: For Update, the same ID is echoed back at {{$json.data.data[0].details.id}} on success.\n' +
    'Accepted format: A long numeric string, as text — for example 1234567890123456789.\n' +
    'Real workplace example: A workflow that just created a lead with {{$json.data.data[0].details.id}} passes that same value into Record ID on a follow-up Update step a few minutes later once more information arrives.\n' +
    'If it is empty or wrong: Left blank on Get, Update, or Delete, the request fails with "recordId or externalId is required for <operation> operation" before any Zoho API call is made; a nonexistent ID fails with Zoho\'s own 404-style error.\n' +
    'Common mistake: This field is sent to Zoho\'s API under the key recordId — a much older version of this node\'s visual panel used the key "id" instead, which the runtime never read at all, silently breaking Get, Update, and Delete through the visual panel. That has since been corrected; if a saved workflow still stores a bare "id" key from before the fix, re-select the Record ID field to update it.',
  placeholder: '1234567890123456789',
};

const dataField: FieldDoc = {
  name: 'Data (JSON)',
  internalKey: 'data',
  type: 'json',
  required: false,
  description: 'The record field values as a JSON object — required for Create, Update, and Upsert.',
  helpText:
    'What this field is: A JSON object containing the Zoho CRM field values to write, using Zoho\'s exact API field names.\n' +
    'Why it matters: This is the actual record content being created, changed, or upserted — without it, there is nothing to send.\n' +
    'When to fill it: Required for Create, Update, and Upsert. Not used by Get, Search, or Delete.\n' +
    'What to enter: A JSON object whose keys are Zoho field API names (not display labels) and whose values are the data to save.\n' +
    'Where the value comes from: Type it directly, or map values from a previous step such as a form submission or a Search result, for example {"First_Name": "{{$json.firstName}}"}.\n' +
    'How to use it later: On success, the new/changed record\'s system fields (id, created_time, modified_time) are returned inside {{$json.data.data[0].details}} — but the field values you sent are not echoed back; a follow-up Get is needed to see them.\n' +
    'Accepted format: A valid JSON object (not an array) with Zoho field API names as keys — for example {"First_Name":"John","Last_Name":"Doe","Email":"john@example.com"}.\n' +
    'Real workplace example: A web form submission maps into {"First_Name":"{{$json.firstName}}","Last_Name":"{{$json.lastName}}","Email":"{{$json.email}}","Lead_Source":"Website"} to create a new lead.\n' +
    'If it is empty or wrong: An empty value on Create/Update/Upsert fails with "data is required for <operation> operation" before any Zoho call is made; malformed JSON or wrong field API names are rejected by Zoho itself with its own validation error.\n' +
    'Common mistake: Using display labels from the Zoho UI (like "First Name") instead of the exact API field name (First_Name) — Zoho CRM field API names use underscores and specific capitalization that often differs from the UI label.',
  placeholder: '{"First_Name":"John","Last_Name":"Doe","Email":"john@example.com"}',
};

const criteriaField: FieldDoc = {
  name: 'Search Criteria',
  internalKey: 'criteria',
  type: 'string',
  required: false,
  description: 'A Zoho search expression used to filter records — required for Search.',
  helpText:
    'What this field is: A search expression written in Zoho CRM\'s own criteria syntax, used to find matching records.\n' +
    'Why it matters: Without criteria, Search has nothing to filter by and cannot run.\n' +
    'When to fill it: Required for Search. Not used by any other operation.\n' +
    'What to enter: An expression in the form (FieldApiName:operator:value), optionally combined with and/or.\n' +
    'Where the value comes from: Build it directly using Zoho field API names, often with a value mapped from a previous step, for example (Email:equals:{{$json.email}}).\n' +
    'How to use it later: Matching records appear as an array at {{$json.data.data}} — check its length to know whether any matches were found.\n' +
    'Accepted format: Parenthesized Zoho criteria syntax — for example (Email:equals:john@example.com) or (Last_Name:contains:Smith).\n' +
    'Real workplace example: Before creating a new contact, a workflow searches with (Email:equals:{{$json.email}}) to check for an existing match and avoid creating a duplicate.\n' +
    'If it is empty or wrong: An empty value fails with "searchCriteria or criteria is required for search operation" before any Zoho call is made; invalid syntax is rejected by Zoho\'s own API with a criteria-parsing error.\n' +
    'Common mistake: Using a display field label instead of the Zoho API field name inside the criteria expression — Zoho\'s criteria syntax requires the exact API name, the same way Data (JSON) does.',
  placeholder: '(Email:equals:test@example.com)',
};

const fieldsField: FieldDoc = {
  name: 'Fields (comma-separated)',
  internalKey: 'fields',
  type: 'string',
  required: false,
  description: 'A comma-separated list of field API names to retrieve — only used by Get Many, not by single-record Get.',
  helpText:
    'What this field is: A list of specific Zoho field API names to include in a Get Many response, reducing how much data comes back.\n' +
    'Why it matters: Zoho modules can have many custom fields; requesting only the ones you need keeps responses smaller and faster to process.\n' +
    'When to fill it: Only meaningful for Get Many — and Get Many itself is currently broken through this node\'s visual panel (see the Operation field\'s notes), so this field has no effect through the panel today. It is documented here for completeness and for anyone editing workflow JSON directly.\n' +
    'What to enter: Field API names separated by commas, with no spaces.\n' +
    'Where the value comes from: Zoho CRM → Setup → Customization → Modules → your module → Fields, to see the exact API names.\n' +
    'How to use it later: When effective, only the listed fields appear in each returned record object.\n' +
    'Accepted format: Comma-separated field API names — for example id,First_Name,Last_Name,Email.\n' +
    'Real workplace example: A lightweight sync job would request only id,Email,Lead_Status to minimize response size, if Get Many were reachable through the panel.\n' +
    'If it is empty or wrong: Left blank, Zoho returns its own default field set for the module rather than every possible field.\n' +
    'Common mistake: Expecting this field to limit what the single-record Get operation returns — Get always returns the full record regardless of this field\'s value.',
  placeholder: 'id,First_Name,Last_Name,Email',
};

const pageField: FieldDoc = {
  name: 'Page Number',
  internalKey: 'page',
  type: 'number',
  required: false,
  description: 'The page number to fetch when paginating list-style results.',
  helpText:
    'What this field is: The page number Zoho should return when a search or list-style call has more results than fit on one page.\n' +
    'Why it matters: Zoho CRM caps how many records come back per call; this field lets a workflow step through additional pages.\n' +
    'When to fill it: Relevant for Search (and for Get Many, once reachable). Leave at the default of 1 for the first page.\n' +
    'What to enter: A whole number starting from 1.\n' +
    'Where the value comes from: Typically incremented by a Loop node across repeated calls, or read from {{$json.data.info.page}} plus one on a subsequent step.\n' +
    'How to use it later: Compare against {{$json.data.info.more_records}} to know whether another page exists.\n' +
    'Accepted format: A positive integer, starting from 1.\n' +
    'Real workplace example: A workflow syncing a large Leads module loops from page 1 upward, stopping once {{$json.data.info.more_records}} is false.\n' +
    'If it is empty or wrong: Left blank, Zoho defaults to page 1.\n' +
    'Common mistake: Assuming this field automatically loops through every page — it only requests one page per run; a Loop node is needed to fetch subsequent pages.',
  placeholder: '1',
  defaultValue: '1',
};

const perPageField: FieldDoc = {
  name: 'Records Per Page',
  internalKey: 'per_page',
  type: 'number',
  required: false,
  description: 'How many records to return per page for Search — sent to Zoho\'s API as per_page.',
  helpText:
    'What this field is: The page size Zoho should use for a Search call.\n' +
    'Why it matters: It trades off how many records come back per call against response size and speed.\n' +
    'When to fill it: Relevant for Search (and for Get Many, once reachable). Leave at the default of 200 to match Zoho\'s own maximum.\n' +
    'What to enter: A whole number from 1 to 200.\n' +
    'Where the value comes from: Chosen directly based on how many records the downstream step needs.\n' +
    'How to use it later: This value is not echoed back directly, but {{$json.data.info.per_page}} in the response confirms what Zoho actually used.\n' +
    'Accepted format: A positive integer from 1 to 200, Zoho\'s own hard cap.\n' +
    'Real workplace example: A daily sync job sets this to 200 to pull as many matching records as possible in a single Search call before looping to the next page.\n' +
    'If it is empty or wrong: Left blank, Zoho defaults to 200. A value above 200 is capped by Zoho\'s API itself, not by this node.\n' +
    'Common mistake: This field is sent to Zoho\'s API under the key per_page (with an underscore) — a much older version of this node\'s visual panel used the camelCase key "perPage", which the runtime never read at all, silently always falling back to 200 regardless of what was entered. That has since been corrected.',
  placeholder: '200',
  defaultValue: '200',
};

function buildOperation(config: {
  name: string;
  value: string;
  description: string;
  fields: FieldDoc[];
  outputExample: Record<string, unknown>;
  outputDescription: string;
  scenario: string;
  inputValues: Record<string, string>;
  expectedOutput: string;
  externalDocsUrl: string;
}): OperationDoc {
  return {
    name: config.name,
    value: config.value,
    description: config.description,
    fields: config.fields,
    outputExample: config.outputExample,
    outputDescription: config.outputDescription,
    usageExample: { scenario: config.scenario, inputValues: config.inputValues, expectedOutput: config.expectedOutput },
    externalDocsUrl: config.externalDocsUrl,
  };
}

const getOperation = buildOperation({
  name: 'Get',
  value: 'get',
  description: 'Fetches a single record by its numeric Record ID from a Zoho CRM module. Returns the full record object with every field value Zoho has stored for it, including any custom fields configured on the module.',
  fields: [operationField, resourceField, accessTokenField, refreshTokenField, credentialIdField, apiDomainField, moduleField, customModuleField, recordIdField],
  outputExample: { success: true, data: { data: [{ id: '1234567890123456789', First_Name: 'John', Last_Name: 'Doe', Email: 'john@example.com', Phone: '+1-555-123-4567', Created_Time: '2026-07-19T10:30:00+05:30', Modified_Time: '2026-07-19T11:45:00+05:30' }], info: { per_page: 200, count: 1, page: 1, more_records: false } }, service: 'crm', resource: 'record', operation: 'get' },
  outputDescription: 'success: true if the Zoho API returned a 2xx status — on failure this node returns _error instead, with no success key at all. data: Zoho\'s raw response, an object with a data array containing the one requested record plus an info block. service/resource/operation: echoed back from this node\'s own execution context, always crm/record/get for this operation. Use {{$json.data.data[0].id}} or {{$json.data.data[0].Email}}.',
  scenario: 'Fetch a specific contact by ID from a webhook payload to check their lead status before deciding what to do next',
  inputValues: { operation: 'get', accessToken: '{{$credentials.zoho.accessToken}}', apiDomain: 'https://www.zohoapis.com', module: 'Contacts', recordId: '{{$json.contactId}}' },
  expectedOutput: 'Returns the full contact in {{$json.data.data[0]}}; an If/Else node branches on {{$json.data.data[0].Lead_Status}}.',
  externalDocsUrl: 'https://www.zoho.com/crm/developer/docs/api/v6/get-records.html',
});

const createOperation = buildOperation({
  name: 'Create',
  value: 'create',
  description: 'Creates a new record in a Zoho CRM module from the JSON object supplied in Data. Returns only the new record\'s system fields (ID, timestamps), not the field values you sent.',
  fields: [operationField, resourceField, accessTokenField, apiDomainField, moduleField, customModuleField, dataField],
  outputExample: { success: true, data: { data: [{ code: 'SUCCESS', details: { id: '1234567890123456791', created_time: '2026-07-19T10:30:00+05:30', modified_time: '2026-07-19T10:30:00+05:30' }, message: 'record added successfully', status: 'success' }] }, service: 'crm', resource: 'record', operation: 'create' },
  outputDescription: 'success: true if the Zoho API returned a 2xx status — on failure this node returns _error instead. data: Zoho\'s raw response, a data array with one confirmation object per record sent (this node only sends one at a time); details.id is the new record\'s ID. service/resource/operation: echoed back, always crm/record/create. Use {{$json.data.data[0].details.id}} to capture the new record\'s ID for a later step.',
  scenario: 'Create a new lead in Zoho CRM the moment a website contact form is submitted',
  inputValues: { operation: 'create', accessToken: '{{$credentials.zoho.accessToken}}', apiDomain: 'https://www.zohoapis.com', module: 'Leads', data: '{"First_Name":"{{$json.firstName}}","Last_Name":"{{$json.lastName}}","Email":"{{$json.email}}","Lead_Source":"Website"}' },
  expectedOutput: 'A new lead is created; {{$json.data.data[0].details.id}} is used in a later step to send a confirmation email referencing the new lead.',
  externalDocsUrl: 'https://www.zoho.com/crm/developer/docs/api/v6/create-records.html',
});

const updateOperation = buildOperation({
  name: 'Update',
  value: 'update',
  description: 'Updates an existing record by its Record ID, replacing only the fields present in Data. Fields not included in Data are left unchanged.',
  fields: [operationField, resourceField, accessTokenField, apiDomainField, moduleField, customModuleField, recordIdField, dataField],
  outputExample: { success: true, data: { data: [{ code: 'SUCCESS', details: { id: '1234567890123456789', modified_time: '2026-07-19T11:45:00+05:30' }, message: 'record updated successfully', status: 'success' }] }, service: 'crm', resource: 'record', operation: 'update' },
  outputDescription: 'success: true if the Zoho API returned a 2xx status — on failure this node returns _error instead. data: Zoho\'s raw response, a data array with a confirmation object; details.id confirms which record changed and details.modified_time confirms when. service/resource/operation: echoed back, always crm/record/update. Use {{$json.data.data[0].details.id}} to confirm the update target.',
  scenario: 'Move a lead to Qualified status when the lead responds positively to an outreach email',
  inputValues: { operation: 'update', accessToken: '{{$credentials.zoho.accessToken}}', apiDomain: 'https://www.zohoapis.com', module: 'Leads', recordId: '{{$json.leadId}}', data: '{"Lead_Status":"Qualified"}' },
  expectedOutput: 'The lead\'s status changes to Qualified; {{$json.data.data[0].details.modified_time}} confirms the change before an Email node notifies the sales team.',
  externalDocsUrl: 'https://www.zoho.com/crm/developer/docs/api/v6/update-records.html',
});

const deleteOperation = buildOperation({
  name: 'Delete',
  value: 'delete',
  description: 'Permanently deletes a record by its Record ID. This action cannot be undone — Zoho CRM has no recycle-bin recovery reachable through this node\'s API path.',
  fields: [operationField, resourceField, accessTokenField, apiDomainField, moduleField, customModuleField, recordIdField],
  outputExample: { success: true, data: { data: [{ code: 'SUCCESS', details: { id: '1234567890123456791' }, message: 'record deleted successfully', status: 'success' }] }, service: 'crm', resource: 'record', operation: 'delete' },
  outputDescription: 'success: true if the Zoho API returned a 2xx status — on failure this node returns _error instead. data: Zoho\'s raw response, a data array confirming which record was removed via details.id. service/resource/operation: echoed back, always crm/record/delete. There is no separate "deleted" boolean — the presence of a success message with status "success" is the confirmation.',
  scenario: 'Remove a duplicate test lead created during a workflow build/test session',
  inputValues: { operation: 'delete', accessToken: '{{$credentials.zoho.accessToken}}', apiDomain: 'https://www.zohoapis.com', module: 'Leads', recordId: '{{$json.leadId}}' },
  expectedOutput: 'The lead is permanently deleted; {{$json.success}} confirms it. This cannot be undone — Zoho CRM has no recycle-bin recovery through this API for records deleted this way.',
  externalDocsUrl: 'https://www.zoho.com/crm/developer/docs/api/v6/delete-records.html',
});

const searchOperation = buildOperation({
  name: 'Search',
  value: 'search',
  description: 'Searches a module for records matching a criteria expression, with pagination via Page Number and Records Per Page. The only reliable way to list/filter multiple records through this node\'s visual panel today, since Get Many is not functional.',
  fields: [operationField, resourceField, accessTokenField, apiDomainField, moduleField, customModuleField, criteriaField, fieldsField, pageField, perPageField],
  outputExample: { success: true, data: { data: [{ id: '1234567890123456789', First_Name: 'John', Last_Name: 'Doe', Email: 'john@example.com' }], info: { per_page: 200, count: 1, page: 1, more_records: false } }, service: 'crm', resource: 'record', operation: 'search' },
  outputDescription: 'success: true if the Zoho API returned a 2xx status — on failure this node returns _error instead. data: Zoho\'s raw response, a data array of matching records plus an info block with per_page/count/page/more_records. service/resource/operation: echoed back, always crm/record/search. An empty {{$json.data.data}} array means no matches, not an error.',
  scenario: 'Search for a contact by email before creating a new one, to avoid creating duplicates',
  inputValues: { operation: 'search', accessToken: '{{$credentials.zoho.accessToken}}', apiDomain: 'https://www.zohoapis.com', module: 'Contacts', criteria: '(Email:equals:{{$json.email}})' },
  expectedOutput: 'Matching contacts appear in {{$json.data.data}}; an If/Else node checks the array length to decide between Create (if empty) and Update (if a match exists).',
  externalDocsUrl: 'https://www.zoho.com/crm/developer/docs/api/v6/search-records.html',
});

const upsertOperation = buildOperation({
  name: 'Upsert',
  value: 'upsert',
  description: 'Creates a new record, or updates an existing one if a matching record is found by Zoho\'s own duplicate-check rules for the module. Useful for syncing external data without first checking whether a record already exists.',
  fields: [operationField, resourceField, accessTokenField, apiDomainField, moduleField, customModuleField, dataField],
  outputExample: { success: true, data: { data: [{ code: 'SUCCESS', details: { id: '1234567890123456791', created_time: '2026-07-19T10:30:00+05:30', modified_time: '2026-07-19T10:30:00+05:30' }, message: 'record added successfully', status: 'success' }] }, service: 'crm', resource: 'record', operation: 'upsert' },
  outputDescription: 'success: true if the Zoho API returned a 2xx status — on failure this node returns _error instead. data: Zoho\'s raw response; message reads "record added successfully" when a new record was created or "record updated successfully" when an existing one was matched and changed instead — check this text to know which branch Zoho took. service/resource/operation: echoed back, always crm/record/upsert.',
  scenario: 'Sync contacts from an external mailing list, relying on Zoho\'s own email-based duplicate matching to avoid creating duplicate contacts',
  inputValues: { operation: 'upsert', accessToken: '{{$credentials.zoho.accessToken}}', apiDomain: 'https://www.zohoapis.com', module: 'Contacts', data: '{"First_Name":"{{$json.firstName}}","Last_Name":"{{$json.lastName}}","Email":"{{$json.email}}"}' },
  expectedOutput: '{{$json.data.data[0].message}} reveals whether a contact was newly added or an existing one was updated.',
  externalDocsUrl: 'https://www.zoho.com/crm/developer/docs/api/v6/upsert-records.html',
});

export const zohoCrmDoc: NodeDoc = {
  slug: 'zoho_crm',
  displayName: 'Zoho CRM',
  category: 'CRM',
  logoUrl: '/icons/nodes/zoho_crm.svg',
  description: 'Get, create, update, delete, search, or upsert Zoho CRM records across standard and custom modules via OAuth2. Built on a generic multi-service Zoho API client — only 6 of the 9 dropdown operations are currently implemented for CRM records.',
  credentialType: 'Zoho CRM OAuth2',
  credentialSetupSteps: [
    'Connect a Zoho account under Connections — no third-party account or API key is typed directly on the node for normal use; this node uses a full OAuth2 flow with automatic token refresh.',
    'In CtrlChecks, open Connections → Add Connection → Zoho CRM OAuth2, click Connect Zoho, sign in to your Zoho account, and authorize the requested scopes (ZohoCRM.modules.ALL, ZohoCRM.users.READ).',
    'A saved connection auto-fills OAuth2 Access Token on this node at run time and refreshes it automatically when it expires — you do not need to retype it.',
    'Important, confirmed limitation: the API Domain field does NOT currently route requests to the selected region — every request is sent to the US Zoho data center regardless of this field\'s value, because the underlying client reads a differently-named region setting this visual panel does not expose. Accounts genuinely hosted outside the US region may see authentication failures that look unrelated to this field.',
    'Test the connection by running this node with Operation set to Get and a known Record ID, or Search with a broad criteria expression, to confirm the token and module access work together.',
    'Connect the Zoho CRM output to a logging, If/Else, or follow-up node when later steps should inspect {{$json.data}}. Downstream service node account connection setup is still required for nodes after Zoho CRM; this connection only authorizes Zoho CRM record operations, not any other service.',
  ],
  credentialDocsUrl: 'https://www.zoho.com/crm/developer/docs/api/v2/oauth-overview.html',
  resources: [
    {
      name: 'Operations',
      description: 'This node calls a shared Zoho API client that supports multiple Zoho services; for CRM records specifically, only get, create, update, delete, search, and upsert are actually implemented. Get Many, Bulk Create, and Bulk Update are visible in the dropdown but are not reachable through this node today.',
      operations: [getOperation, createOperation, updateOperation, deleteOperation, searchOperation, upsertOperation],
    },
  ],
  commonErrors: [
    {
      error: 'Zoho: Credentials not found.',
      cause: 'No OAuth2 access token, client ID, or client secret is available from either the node config or a saved Zoho connection for the workflow owner.',
      fix: 'Connect a Zoho account under Connections → Add Connection → Zoho CRM OAuth2 → Connect Zoho, then re-run the workflow.',
    },
    {
      error: 'recordId or externalId is required for get operation / recordId is required for delete operation',
      cause: 'Get, Update, or Delete was run without Record ID filled in.',
      fix: 'Fill in Record ID with the numeric ID of the record to target, typically mapped from a previous Search or Create step.',
    },
    {
      error: 'data is required for create operation',
      cause: 'Create, Update, or Upsert was run without the Data (JSON) field filled in.',
      fix: 'Fill in Data (JSON) with a valid JSON object using Zoho field API names.',
    },
    {
      error: 'searchCriteria or criteria is required for search operation',
      cause: 'Search was run without Search Criteria filled in.',
      fix: 'Fill in Search Criteria using Zoho\'s (FieldApiName:operator:value) syntax.',
    },
    {
      error: 'Unknown CRM record operation: getMany',
      cause: 'Get Many was selected from the Operation dropdown — this exact value is not recognized by the underlying Zoho API client, which expects the literal value "list" instead. This is a real, unfixed dropdown/runtime mismatch, not a configuration mistake.',
      fix: 'Use Search with a broad or empty-ish criteria expression as a substitute for listing multiple records, since Get Many does not currently work through this node.',
    },
    {
      error: 'Zoho API error: <message>',
      cause: 'Zoho itself rejected the request — common causes include an invalid module name, malformed Data JSON, a nonexistent Record ID, or an expired access token that failed to refresh.',
      fix: 'Check the <message> text for the specific Zoho-reported reason, verify Module and Record ID are correct, and reconnect the Zoho account if the token could not refresh.',
    },
  ],
  relatedNodes: ['hubspot', 'pipedrive', 'salesforce', 'freshdesk', 'google_sheets', 'slack_message', 'email'],
};
