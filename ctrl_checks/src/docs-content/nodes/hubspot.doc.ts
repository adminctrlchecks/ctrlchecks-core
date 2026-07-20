import type { NodeDoc, OperationDoc, FieldDoc } from '../types';

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'The HubSpot action to run: Get, Get Many, Create, Update, Delete, Search, or Create Multiple.',
  options: ['get', 'getMany', 'create', 'update', 'delete', 'search', 'batchCreate'],
  helpText: "What this field is: The dropdown that tells this node which HubSpot CRM action to run against the selected Resource.\nWhy it matters: HubSpot needs to know whether you are reading one record, listing many, creating, changing, removing, searching, or bulk-creating before it can build the right API request.\nWhen to fill it: Every time you add a HubSpot node - this field has no usable default behavior without it and the execution engine reads it on every run.\nWhat to enter: Choose Get to fetch one record by ID, Get Many to list records with pagination, Create to add a new record, Update to change an existing record by ID, Delete to remove a record by ID, Search to run a HubSpot CRM search query, or Create Multiple to bulk-create several records in one request. Two additional values, Batch Update and Batch Delete, exist in the runtime engine but are not selectable in this dropdown today (status: deprecated in the node's own operation list) - reach them only by editing workflow JSON directly, not through this panel.\nWhere the value comes from: You pick it directly in the Properties Panel; it is rarely set dynamically from {{$json.operation}} since the required fields differ per operation.\nHow to use it later: Downstream nodes read {{$json.record}}, {{$json.results}}, or {{$json.deleted}} depending on which operation ran.\nAccepted format: One of get, getMany, create, update, delete, search, batchCreate (case-insensitive; the engine also accepts getAll/list as aliases for getMany).\nReal workplace example: Set Operation to Get Many with Resource set to contact to pull every contact into a workflow for a weekly sync.\nIf it is empty or wrong: An empty value defaults to create; an unrecognized value returns {{$json._error}} = \"Unsupported HubSpot operation: ...\".\nCommon mistake: Expecting Search to accept a plain keyword like a search engine - it expects HubSpot's CRM search query syntax (for example email:test@example.com), not free text.",
  placeholder: 'getMany',
  example: 'getMany',
  defaultValue: 'getMany',
};

const resourceField: FieldDoc = {
  name: 'Resource',
  internalKey: 'resource',
  type: 'select',
  required: true,
  description: 'The HubSpot CRM object type this operation works with.',
  options: ['contact', 'company', 'deal', 'ticket'],
  helpText: "What this field is: The HubSpot CRM object type - Contact, Company, Deal, or Ticket - that the chosen Operation reads or writes.\nWhy it matters: This node builds the API path from this value (for example contact becomes /crm/v3/objects/contacts), so the wrong Resource sends the request to the wrong object type entirely.\nWhen to fill it: Every time you add a HubSpot node; it is required on every run alongside Operation.\nWhat to enter: Pick Contact, Company, Deal, or Ticket for the four object types exposed in this dropdown. The underlying engine also recognizes product, line_item, quote, call, email, meeting, note, task, owner, and pipeline as valid resource values (each mapped to HubSpot's matching plural API path), but none of those are selectable here today - they are only reachable by editing workflow JSON directly or through an AI-generated workflow.\nWhere the value comes from: Chosen directly in the Properties Panel, or set dynamically with {{$json.resource}} when a previous node decides which CRM object to touch.\nHow to use it later: The resource you pick determines which record shape appears inside {{$json.record}} or {{$json.results}} - a contact record has different properties than a deal record.\nAccepted format: One of contact, company, deal, ticket in this dropdown (singular, lowercase); the engine also accepts the plural forms and normalizes both.\nReal workplace example: Set Resource to deal and Operation to update to move a sales deal to Closed Won after a payment succeeds.\nIf it is empty or wrong: An empty value falls back to contact; an unrecognized value is used as-is in the API path, which HubSpot rejects with a 404-style error.\nCommon mistake: Assuming every HubSpot object type (like Quote or Pipeline) is available from this dropdown - only Contact, Company, Deal, and Ticket are exposed in the visual panel today.",
  placeholder: 'contact',
  example: 'contact',
  defaultValue: 'contact',
};

const idField: FieldDoc = {
  name: 'Id',
  internalKey: 'id',
  type: 'string',
  required: false,
  description: 'HubSpot object ID (required for Get, Update, and Delete).',
  helpText: "What this field is: The unique numeric ID HubSpot assigned to the contact, company, deal, or ticket you want to fetch, change, or remove.\nWhy it matters: Get, Update, and Delete all target one specific record, and this ID is the only way the node knows which record that is.\nWhen to fill it: Fill it whenever Operation is Get, Update, or Delete. Leave it blank for Get Many, Search, and Create, which do not target a single existing record.\nWhat to enter: The numeric HubSpot record ID exactly as HubSpot shows it, for example in the record's URL https://app.hubspot.com/contacts/<portalId>/contact/12345678 the ID is 12345678.\nWhere the value comes from: Copy it from the HubSpot web UI URL, or use {{$json.id}} from an earlier Create, Get, Get Many, or Search step in the same workflow.\nHow to use it later: Update and Get echo it back as {{$json.id}}, and Delete echoes it back the same way so you can confirm which record was removed.\nAccepted format: Digits only, passed through as a string in the request URL (for example 12345678, not #12345678).\nReal workplace example: Use {{$json.id}} from a Create step earlier in the same workflow to immediately Update the contact you just created.\nIf it is empty or wrong: An empty ID on Get/Update/Delete returns {{$json._error}} = \"HubSpot <operation> operation requires id or objectId\"; a wrong ID returns a HubSpot \"failed (404)\" error.\nCommon mistake: Forgetting to fill ID when switching Operation from Create to Update in the same node, since Create does not require this field but Update always does.",
  placeholder: '12345678',
  example: '12345678',
};

const objectIdField: FieldDoc = {
  name: 'Object Id',
  internalKey: 'objectId',
  type: 'string',
  required: false,
  description: 'Legacy alias for Id - used only when Id is left empty.',
  helpText: "What this field is: An older, legacy-named copy of the Id field. The execution engine checks Id first and only falls back to Object Id if Id is empty.\nWhy it matters: Some older saved workflows or AI-generated configurations set objectId instead of id - this field keeps those workflows working without breaking Get/Update/Delete.\nWhen to fill it: In new workflows, prefer filling Id instead - only fill Object Id if you are editing an older workflow that already used this field name, or if an upstream step's output happens to be named objectId.\nWhat to enter: The same kind of value as Id: the numeric HubSpot record ID.\nWhere the value comes from: Copy it from the HubSpot web UI URL, or map it from {{$json.hs_object_id}} on an earlier HubSpot search result.\nHow to use it later: The node never echoes objectId itself back in the output - only id.\nAccepted format: Digits only, same as Id.\nReal workplace example: app.hubspot.com/contacts/<portalId>/contact/12345678 -> Object Id is 12345678.\nIf it is empty or wrong: If both Id and Object Id are empty on Get/Update/Delete, the node returns {{$json._error}} = \"HubSpot <operation> operation requires id or objectId\".\nCommon mistake: Filling both Id and Object Id with different values and expecting Object Id to win - Id always takes priority when both are filled.",
  placeholder: '123456789',
  example: '123456789',
};

const propertiesField: FieldDoc = {
  name: 'Properties',
  internalKey: 'properties',
  type: 'json',
  required: false,
  description: 'HubSpot object field values for Create and Update, keyed by internal property name.',
  helpText: "What this field is: The HubSpot field values (using HubSpot's internal property names) to create a new record or change an existing one.\nWhy it matters: HubSpot's API only understands internal property names like email, firstname, dealstage, or amount - not the display labels you see in the HubSpot UI - so this field is where those exact names go.\nWhen to fill it: Required for Create and Update. If you leave it empty on Create, the node tries a fallback of a few common named fields (email/firstname/lastname/phone/company for contacts, or name/domain/phone/city/country/industry for companies) typed directly into the workflow config; if neither this field nor those fallbacks produce any values, Create/Update fails.\nWhat to enter: A JSON object whose keys are HubSpot internal property names, for example {\"email\":\"alice@example.com\",\"firstname\":\"Alice\",\"lastname\":\"Kumar\"}.\nWhere the value comes from: In HubSpot, open Settings -> Properties, select the object, and copy the internal name of each field you need. Values can also come from an earlier node, such as {{$json.email}}.\nHow to use it later: HubSpot's saved values come back inside {{$json.record.properties}} and are also duplicated at {{$json.properties}} for convenience.\nAccepted format: Valid JSON wrapped in { } with internal property names as keys - blank, null, and empty-string values are automatically dropped before sending.\nReal workplace example: {\"email\":\"{{$json.formEmail}}\",\"firstname\":\"{{$json.formFirstName}}\",\"lastname\":\"{{$json.formLastName}}\"} to create a contact from a signup form.\nIf it is empty or wrong: An empty Properties object on Create/Update returns {{$json._error}} = \"HubSpot create operation requires at least one property. Properties field is empty.\" (or \"...requires properties field, but it is missing or empty.\" when using the fallback fields); unknown property names are rejected by HubSpot's own API validation.\nCommon mistake: Typing the label shown in the HubSpot UI (like \"First Name\") instead of the internal property name (firstname) - HubSpot silently rejects unknown keys rather than guessing what you meant.",
  placeholder: '{"email":"test@example.com","firstname":"John","lastname":"Doe"}',
  example: '{"email":"test@example.com","firstname":"John","lastname":"Doe"}',
};

const recordsField: FieldDoc = {
  name: 'Records',
  internalKey: 'records',
  type: 'json',
  required: false,
  description: 'A list of records to create in one request (Create Multiple only).',
  helpText: "What this field is: An array of records, each with its own Properties object, sent to HubSpot in a single bulk Create Multiple request.\nWhy it matters: Creating dozens of contacts or companies one at a time is slow and can hit rate limits - Create Multiple sends up to 100 records in one HubSpot batch API call.\nWhen to fill it: Only when Operation is Create Multiple. It has no effect on Get, Get Many, Create, Update, Delete, or Search.\nWhat to enter: A JSON array where each item is either a plain properties object (for example {\"email\":\"a@x.com\"}) or an object with its own nested properties key (for example {\"properties\":{\"email\":\"a@x.com\"}}) - both forms are accepted.\nWhere the value comes from: Build it from an earlier node's output, such as a Loop or Aggregate step that collects several form submissions into one array, or {{$json.rows}} from a spreadsheet read.\nHow to use it later: HubSpot's raw batch response is merged directly into the output - read {{$json.results}} for the array of created records and {{$json.status}} for the batch job's status.\nAccepted format: A JSON array of objects - entries missing any usable property values are dropped before sending, and an entirely empty array after cleanup fails the operation.\nReal workplace example: [{\"email\":\"a@x.com\",\"firstname\":\"Alice\"},{\"email\":\"b@x.com\",\"firstname\":\"Bob\"}] to import two new contacts from a CSV in one step.\nIf it is empty or wrong: An empty or missing Records array on Create Multiple returns {{$json._error}} = \"HubSpot batchCreate operation requires records array\"; an array that has no usable properties after cleanup returns \"...has no usable records after empty fields were removed\".\nCommon mistake: Passing a single object instead of an array - Create Multiple always expects a JSON array, even for two records.",
  placeholder: '[{"email":"a@example.com","firstname":"Alice"}]',
  example: '[{"email":"a@example.com","firstname":"Alice"}]',
};

const searchQueryField: FieldDoc = {
  name: 'Search Query',
  internalKey: 'searchQuery',
  type: 'string',
  required: false,
  description: 'HubSpot CRM search query text (required for Search).',
  helpText: "What this field is: The search text sent to HubSpot's CRM search endpoint to find matching records of the chosen Resource.\nWhy it matters: Without a query, HubSpot has nothing to filter on - Search always fails if this field is empty.\nWhen to fill it: Only when Operation is Search. It is ignored for every other operation.\nWhat to enter: A HubSpot CRM search query string, for example email:test@example.com to find a contact by email, or a plain keyword HubSpot will match against indexed searchable properties.\nWhere the value comes from: Type it directly, or build it from an earlier node's output, such as {{$json.customerEmail}} inserted into an email:{{$json.customerEmail}} style query.\nHow to use it later: Matching records come back as an array in {{$json.results}}, with the match count in {{$json.total}}.\nAccepted format: Plain text following HubSpot's CRM search syntax - this is not a full-text web search box, it is closer to a filtered lookup.\nReal workplace example: email:alice@example.com to find the exact contact record before updating it.\nIf it is empty or wrong: An empty Search Query on Search returns {{$json._error}} = \"HubSpot search operation requires searchQuery\"; a query that matches nothing returns success with {{$json.results}} as an empty array, not an error.\nCommon mistake: Treating this like a plain keyword search box - unlike a website search bar, HubSpot's CRM search expects property-based query syntax to reliably find the right record.",
  placeholder: 'email:test@example.com',
  example: 'email:test@example.com',
};

const limitField: FieldDoc = {
  name: 'Limit',
  internalKey: 'limit',
  type: 'number',
  required: false,
  description: 'Maximum number of records to return (Get Many and Search).',
  helpText: "What this field is: The maximum number of HubSpot records this node asks for in one Get Many or Search request.\nWhy it matters: HubSpot returns records in pages - this controls how many records come back in a single run of this node, capped at HubSpot's own per-request maximum.\nWhen to fill it: Optional for Get Many and Search; ignored for Get, Create, Update, Delete, and Create Multiple.\nWhat to enter: A whole number from 1 to 100 - the node automatically clamps any value outside that range back into 1-100 for Get Many.\nWhere the value comes from: Type it directly based on how many records you realistically need per run; there is rarely a reason to map this from a previous step.\nHow to use it later: The returned count of records in {{$json.results}} will never exceed this value; {{$json.total}} reports how many records exist overall in HubSpot (which may be larger).\nAccepted format: A positive whole number - text like \"ten\" is not accepted, only digits.\nReal workplace example: 100 to pull the largest single page of contacts HubSpot allows per request.\nIf it is empty or wrong: Left empty, Get Many defaults to 100; a value over 100 is silently capped to 100 rather than causing an error.\nCommon mistake: Assuming a high Limit alone retrieves every record in HubSpot - if there are more records than Limit, use the After field with the returned paging cursor to fetch the next page.",
  placeholder: '100',
  example: '100',
  defaultValue: '100',
};

const afterField: FieldDoc = {
  name: 'After (Pagination)',
  internalKey: 'after',
  type: 'string',
  required: false,
  description: 'Pagination cursor for the next page of Get Many results.',
  helpText: "What this field is: A pagination cursor token that tells HubSpot which page of Get Many results to return next.\nWhy it matters: HubSpot's Get Many endpoint never returns every record at once - this field is how a workflow steps through page 2, page 3, and beyond.\nWhen to fill it: Only useful for Get Many, and only after a previous Get Many run already returned a paging cursor; leave it blank for the first page.\nWhat to enter: The exact cursor string HubSpot returned in a previous response's paging.next.after field - do not type your own value here.\nWhere the value comes from: Map it from {{$json.paging.next.after}} on a previous Get Many step in the same or a prior workflow run.\nHow to use it later: Not applicable to this node's own output - it only affects which page of {{$json.results}} comes back on this run.\nAccepted format: An opaque token string exactly as HubSpot provided it - it is not a page number and has no predictable pattern.\nReal workplace example: Use {{$json.paging.next.after}} from a Loop node that keeps calling this HubSpot node until {{$json.paging}} is empty, to pull an entire contact list.\nIf it is empty or wrong: Left empty, HubSpot always returns the first page; an invalid or expired cursor is rejected by HubSpot's API with an error.\nCommon mistake: Typing a made-up value like \"page2\" instead of the real cursor string HubSpot returned - any value that isn't a real HubSpot cursor will be rejected.",
  placeholder: 'paging_token',
  example: 'paging_token',
};

const accessTokenField: FieldDoc = {
  name: 'Access Token',
  internalKey: 'accessToken',
  type: 'password',
  required: false,
  description: 'HubSpot Private App or OAuth2 access token (normally supplied automatically from a saved connection).',
  helpText: "What this field is: The HubSpot Private App token or OAuth2 access token used to authenticate every request this node makes.\nWhy it matters: Every HubSpot CRM API call requires a Bearer token in the Authorization header - without one, every operation fails with an authentication error.\nWhen to fill it: Leave this field blank once you have saved a HubSpot connection in CtrlChecks Connections; the node automatically retrieves the token from the credential vault at run time (this is the field the saved connection is injected into). Fill it directly only for a quick one-off test.\nWhat to enter: A HubSpot Private App token (starts with pat-) or a raw OAuth2 access token, with no \"Bearer\" prefix and no surrounding quotes.\nWhere the value comes from: HubSpot -> Settings -> Integrations -> Private Apps -> your app -> Auth tab, or from the CtrlChecks HubSpot OAuth2 connection flow.\nHow to use it later: This value is never included in the node output, so downstream nodes cannot read it back - only the operation results ({{$json.record}}, {{$json.results}}, etc.) are passed along.\nAccepted format: A single token string exactly as HubSpot/CtrlChecks shows it.\nReal workplace example: Save the token once in Connections -> Add Connection -> HubSpot, then reuse the same saved connection across every HubSpot node in every workflow.\nIf it is empty or wrong: With no saved connection and no direct value, the node returns {{$json._error}} = \"HubSpot node requires a connected HubSpot credential. Select or create a HubSpot connection for this node.\"; a wrong or expired token returns a HubSpot authentication failure.\nCommon mistake: Pasting the token into a plain workflow field or a Data/JSON field instead of Connections, which leaves the secret visible to anyone who can view the workflow.",
  placeholder: 'pat-na1-...',
  notes: 'Stored and displayed as a masked credential value once saved through Connections. This is the field a saved HubSpot connection auto-fills at run time.',
};

const apiKeyField: FieldDoc = {
  name: 'Api Key',
  internalKey: 'apiKey',
  type: 'password',
  required: false,
  description: 'Deprecated HubSpot API key - used only as a fallback if Access Token is empty.',
  helpText: "What this field is: HubSpot's older, deprecated API key authentication method - HubSpot has phased this out in favor of Private App tokens and OAuth2.\nWhy it matters: The node still accepts this as a fallback if Access Token is empty, so very old saved workflows or credentials keep working, but new connections should use the Access Token / Private App path instead.\nWhen to fill it: Only if you are maintaining an older workflow that still relies on a legacy HubSpot API key; for anything new, set up a Private App token or OAuth2 connection instead.\nWhat to enter: The legacy HubSpot API key string, if your account still has one issued.\nWhere the value comes from: HubSpot has removed the ability to generate new API keys for most accounts - this field exists mainly for backward compatibility with credentials created before the deprecation.\nHow to use it later: Never included in the node output, same as Access Token.\nAccepted format: A single legacy API key string.\nReal workplace example: Not recommended for new setups - use a Private App token instead.\nIf it is empty or wrong: If both Access Token and Api Key are empty (and no saved connection exists), the node returns {{$json._error}} = \"HubSpot node requires a connected HubSpot credential. Select or create a HubSpot connection for this node.\"\nCommon mistake: Trying to generate a new HubSpot API key for a new integration - HubSpot no longer supports creating new API keys; use a Private App token instead.",
  placeholder: '(legacy - not recommended)',
};

const credentialIdField: FieldDoc = {
  name: 'Credential Id',
  internalKey: 'credentialId',
  type: 'string',
  required: false,
  description: 'Reserved field for a stored credential reference; not currently read by the execution engine.',
  helpText: "What this field is: A field intended to reference a specific stored HubSpot credential by its internal ID.\nWhy it matters: It looks like a normal configuration field, but the HubSpot execution code never reads this value for any operation - credential lookup instead always goes through the standard saved-connection/vault mechanism keyed to the workflow and node, not this field.\nWhen to fill it: There is currently no working scenario where filling this field changes which credential is used; leave it blank and manage the connection through CtrlChecks Connections instead.\nWhat to enter: Nothing is required - any value typed here has no effect.\nWhere the value comes from: Not applicable - this field is not wired to the credential-lookup logic today.\nHow to use it later: Not applicable - this value never appears in the node's output.\nAccepted format: Freeform text, but format has no effect since the value is unused.\nReal workplace example: None - connect HubSpot once through Connections instead of trying to target a credential by ID here.\nIf it is empty or wrong: Nothing changes either way; the node behaves identically whether this field is empty or filled.\nCommon mistake: Assuming this field lets you pick between multiple saved HubSpot connections on a per-node basis - credential selection for this node does not read this field at all.",
  placeholder: '(unused)',
};

const sharedFields: FieldDoc[] = [operationField, resourceField];

const getOperation: OperationDoc = {
  name: 'Get',
  value: 'get',
  description: 'Fetches one existing HubSpot CRM record (contact, company, deal, or ticket) by its numeric ID via GET /crm/v3/objects/{resource}/{id} and returns the full raw record HubSpot stores for it.',
  fields: [...sharedFields, idField, objectIdField, accessTokenField, apiKeyField, credentialIdField],
  outputExample: {
    success: true,
    id: '12345678',
    record: { id: '12345678', properties: { email: 'alice@example.com', firstname: 'Alice', lastname: 'Smith' }, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z' },
    properties: { email: 'alice@example.com', firstname: 'Alice', lastname: 'Smith' },
  },
  outputDescription: 'success: true when HubSpot accepted the get request. id: echoes back the HubSpot record ID that was fetched. record: the full raw HubSpot object, including its own id/properties/createdAt/updatedAt. properties: the same properties object duplicated here for convenience, so {{$json.properties.email}} and {{$json.record.properties.email}} both work. _error: present only when the request failed, for example "HubSpot get operation requires id or objectId". _errorCode: set to "EXECUTION_ERROR" on failure. _errorDetails: the raw JavaScript error object - the useful HubSpot error text is inside _error itself, not here.',
  usageExample: {
    scenario: 'A support workflow fetches the full details of one specific HubSpot contact right before personalizing a follow-up email.',
    inputValues: { resource: 'contact', operation: 'get', id: '12345678' },
    expectedOutput: 'HubSpot returns the contact as {{$json.record}}, so a later step can read {{$json.record.properties.email}} or {{$json.properties.email}}.',
  },
  externalDocsUrl: 'https://developers.hubspot.com/docs/api/crm/contacts',
};

const getManyOperation: OperationDoc = {
  name: 'Get Many',
  value: 'getMany',
  description: 'Fetches a page of existing HubSpot CRM records of the chosen Resource type via GET /crm/v3/objects/{resource}, following HubSpot\'s own cursor-based pagination model.',
  fields: [...sharedFields, limitField, afterField, accessTokenField, apiKeyField, credentialIdField],
  outputExample: {
    success: true,
    results: [
      { id: '12345678', properties: { email: 'alice@example.com', firstname: 'Alice' } },
      { id: '12345679', properties: { email: 'bob@example.com', firstname: 'Bob' } },
    ],
    total: 245,
    paging: { next: { after: 'NTI1MjQ5NjM1Mg', link: 'https://api.hubapi.com/crm/v3/objects/contacts?after=NTI1MjQ5NjM1Mg' } },
  },
  outputDescription: 'success: true when HubSpot accepted the get many request. results: the array of raw HubSpot records returned for this page, limited by the Limit field. total: the total number of matching records HubSpot reports across all pages, which may be far larger than results.length. paging: HubSpot\'s cursor object for fetching the next page - present only when more records remain, and the After field on a follow-up run should be set to paging.next.after. _error: present only when the request failed, for example a HubSpot authentication or permission problem. _errorCode/_errorDetails: set on the same failure conditions as every other HubSpot operation.',
  usageExample: {
    scenario: 'A weekly reporting workflow pulls the current page of HubSpot contacts to build a CRM health summary.',
    inputValues: { resource: 'contact', operation: 'getMany', limit: '100' },
    expectedOutput: 'HubSpot returns up to 100 records as {{$json.results}}, which a Loop node can iterate, and {{$json.paging.next.after}} for fetching the next page.',
  },
  externalDocsUrl: 'https://developers.hubspot.com/docs/api/crm/contacts',
};

const createOperation: OperationDoc = {
  name: 'Create',
  value: 'create',
  description: 'Creates a new HubSpot CRM record via POST /crm/v3/objects/{resource}, using the Properties field (or, if Properties is empty, a small set of directly-typed fallback fields) and returns the newly created record.',
  fields: [...sharedFields, propertiesField, accessTokenField, apiKeyField, credentialIdField],
  outputExample: {
    success: true,
    id: 'new_12345',
    record: { id: 'new_12345', properties: { email: 'bob@example.com', firstname: 'Bob' }, createdAt: '2026-07-19T00:00:00Z', updatedAt: '2026-07-19T00:00:00Z' },
    properties: { email: 'bob@example.com', firstname: 'Bob' },
    createdAt: '2026-07-19T00:00:00Z',
    updatedAt: '2026-07-19T00:00:00Z',
  },
  outputDescription: 'success: true when HubSpot accepted the create request. id: the new HubSpot record ID, needed for a later Update or Delete step. record: the full raw HubSpot object HubSpot created and returned. properties: the same properties duplicated at the top level for convenience. createdAt/updatedAt: also duplicated at the top level (Get and Update do not duplicate these two). _error: present only when the request failed, for example "HubSpot create operation requires at least one property. Properties field is empty." _errorCode/_errorDetails: set on the same failure conditions as every other HubSpot operation.',
  usageExample: {
    scenario: 'A signup-form workflow creates a new HubSpot contact for every visitor who submits their email and name.',
    inputValues: { resource: 'contact', operation: 'create', properties: '{"email":"{{$json.formEmail}}","firstname":"{{$json.formFirstName}}"}' },
    expectedOutput: 'HubSpot returns the new contact as {{$json.record}}, including {{$json.id}} for use in a later Update step.',
  },
  externalDocsUrl: 'https://developers.hubspot.com/docs/api/crm/contacts',
};

const updateOperation: OperationDoc = {
  name: 'Update',
  value: 'update',
  description: 'Updates an existing HubSpot CRM record identified by ID via PATCH /crm/v3/objects/{resource}/{id} with the fields supplied in Properties, and returns HubSpot\'s full record after the change.',
  fields: [...sharedFields, idField, objectIdField, propertiesField, accessTokenField, apiKeyField, credentialIdField],
  outputExample: {
    success: true,
    id: '12345678',
    record: { id: '12345678', properties: { dealstage: 'closedwon', amount: '5000' } },
    properties: { dealstage: 'closedwon', amount: '5000' },
  },
  outputDescription: 'success: true when HubSpot accepted the update request. id: echoes back the HubSpot record ID that was changed. record: the full raw HubSpot object after the update. properties: the same properties duplicated at the top level for convenience. _error: present only when the request failed, for example "HubSpot update operation requires id or objectId". _errorCode/_errorDetails: set on the same failure conditions as every other HubSpot operation.',
  usageExample: {
    scenario: 'A billing workflow moves a HubSpot deal to Closed Won as soon as a Stripe payment succeeds.',
    inputValues: { resource: 'deal', operation: 'update', id: '{{$json.dealId}}', properties: '{"dealstage":"closedwon"}' },
    expectedOutput: 'HubSpot returns the changed deal as {{$json.record}}, so a later step can confirm {{$json.record.properties.dealstage}} is closedwon.',
  },
  externalDocsUrl: 'https://developers.hubspot.com/docs/api/crm/deals',
};

const deleteOperation: OperationDoc = {
  name: 'Delete',
  value: 'delete',
  description: 'Permanently deletes (archives) an existing HubSpot CRM record identified by ID via DELETE /crm/v3/objects/{resource}/{id}. HubSpot\'s delete endpoint returns no response body, so this node reports a synthetic confirmation instead of echoing back a deleted record.',
  fields: [...sharedFields, idField, objectIdField, accessTokenField, apiKeyField, credentialIdField],
  outputExample: {
    success: true,
    id: '12345678',
    deleted: true,
  },
  outputDescription: 'success: true when HubSpot accepted the delete request. id: the same HubSpot record ID you requested be deleted, echoed back so downstream nodes can confirm which record is gone. deleted: always true on a successful delete - there is no record field here since HubSpot\'s DELETE endpoint returns HTTP 204 with no body. _error: present only when the request failed, for example "HubSpot delete operation requires id or objectId". _errorCode/_errorDetails: set on the same failure conditions as every other HubSpot operation.',
  usageExample: {
    scenario: 'A data-cleanup workflow removes duplicate test contacts created accidentally during an integration test run.',
    inputValues: { resource: 'contact', operation: 'delete', id: '12345678' },
    expectedOutput: 'HubSpot confirms removal as {{$json.deleted}} and {{$json.id}}, so a later step can log which contact was removed.',
  },
  externalDocsUrl: 'https://developers.hubspot.com/docs/api/crm/contacts',
};

const searchOperation: OperationDoc = {
  name: 'Search',
  value: 'search',
  description: 'Finds HubSpot CRM records matching a search query via POST /crm/v3/objects/{resource}/search, using HubSpot\'s CRM search query syntax rather than free-text search.',
  fields: [...sharedFields, searchQueryField, limitField, accessTokenField, apiKeyField, credentialIdField],
  outputExample: {
    success: true,
    results: [
      { id: '12345678', properties: { email: 'alice@example.com', firstname: 'Alice' } },
    ],
    total: 1,
  },
  outputDescription: 'success: true when HubSpot accepted the search request. results: the array of matching HubSpot records - an empty array (not an error) when nothing matches. total: the number of matching records HubSpot reports. Unlike Get Many, Search does not return a paging cursor even when more results exist beyond Limit. _error: present only when the request failed, for example "HubSpot search operation requires searchQuery". _errorCode/_errorDetails: set on the same failure conditions as every other HubSpot operation.',
  usageExample: {
    scenario: 'A support workflow looks up the exact HubSpot contact by email before updating their support-ticket status.',
    inputValues: { resource: 'contact', operation: 'search', searchQuery: 'email:alice@example.com' },
    expectedOutput: 'HubSpot returns matching records as {{$json.results}}; use {{$json.results.0.id}} to reference the first match.',
  },
  externalDocsUrl: 'https://developers.hubspot.com/docs/api/crm/search',
};

const batchCreateOperation: OperationDoc = {
  name: 'Create Multiple',
  value: 'batchCreate',
  description: 'Creates several HubSpot CRM records in one request via POST /crm/v3/objects/{resource}/batch/create, using the Records field. HubSpot\'s raw batch response is merged directly into the output rather than nested under a wrapper key.',
  fields: [...sharedFields, recordsField, accessTokenField, apiKeyField, credentialIdField],
  outputExample: {
    success: true,
    status: 'COMPLETE',
    results: [
      { id: '12345678', properties: { email: 'a@example.com' } },
      { id: '12345679', properties: { email: 'b@example.com' } },
    ],
    requestedAt: '2026-07-19T00:00:00Z',
    startedAt: '2026-07-19T00:00:01Z',
    completedAt: '2026-07-19T00:00:02Z',
  },
  outputDescription: 'success: true when HubSpot accepted the batch create request. status: HubSpot\'s batch job status, typically COMPLETE. results: the array of newly created HubSpot records, one per entry in Records. requestedAt/startedAt/completedAt: HubSpot\'s own batch job timestamps. _error: present only when the request failed, for example "HubSpot batchCreate operation requires records array". _errorCode/_errorDetails: set on the same failure conditions as every other HubSpot operation.',
  usageExample: {
    scenario: 'An import workflow bulk-creates every row from a freshly uploaded CSV of new leads in a single HubSpot request.',
    inputValues: { resource: 'contact', operation: 'batchCreate', records: '[{"email":"a@example.com","firstname":"Alice"},{"email":"b@example.com","firstname":"Bob"}]' },
    expectedOutput: 'HubSpot returns the created records as {{$json.results}}, one entry per record in the input array.',
  },
  externalDocsUrl: 'https://developers.hubspot.com/docs/api/crm/batch',
};

export const hubspotDoc: NodeDoc = {
  slug: 'hubspot',
  displayName: 'HubSpot',
  category: 'CRM',
  logoUrl: '/icons/nodes/hubspot.svg',
  description: 'Get, list, create, update, delete, search, or bulk-create HubSpot CRM contacts, companies, deals, and tickets from a workflow.',
  credentialType: 'HubSpot API Key',
  credentialSetupSteps: [
    'What this is: The HubSpot connection lets CtrlChecks store your HubSpot Private App token or OAuth2 connection safely in Connections, instead of pasting a secret into every workflow that uses HubSpot.',
    'Where to start (recommended): In HubSpot, go to Settings -> Integrations -> Private Apps -> Create a private app, add the CRM scopes you need (for example crm.objects.contacts.read/write, crm.objects.companies.read/write, crm.objects.deals.read/write, tickets), then create the app and copy the access token shown under the Auth tab.',
    'How to connect: In CtrlChecks, open Connections -> Add Connection -> HubSpot, then either paste the Private App token (starts with pat-...) or choose Connect HubSpot to sign in with OAuth2 instead. CtrlChecks tests a Private App token with GET https://api.hubapi.com/crm/v3/objects/contacts?limit=1, and tests an OAuth2 token with GET https://api.hubapi.com/oauth/v1/access-tokens/{token}.',
    'Both connection methods are stored under the same HubSpot connection and are injected automatically into the node\'s Access Token field at run time - you do not need to fill Access Token, Api Key, or Credential Id directly once a connection is saved.',
    'Important: Treat the Private App token or OAuth2 token like a bank password. Store it in Connections, not in a plain workflow field, and never share it outside CtrlChecks.',
    'Test it: Save the connection, add a HubSpot node with Operation set to Get Many, run it, and confirm CtrlChecks returns real HubSpot records instead of an authentication error.',
    'Connect the HubSpot output to a logging, If/Else, or follow-up node when later steps should inspect {{$json.record}}, {{$json.results}}, or {{$json.deleted}}. Downstream service node account connection setup is still required for nodes after HubSpot; this connection only authorizes HubSpot CRM operations.',
  ],
  credentialDocsUrl: 'https://developers.hubspot.com/docs/api/private-apps',
  resources: [
    {
      name: 'Operations',
      description: 'HubSpot CRM actions available on this node: Get, Get Many, Create, Update, Delete, Search, and Create Multiple, across Contact, Company, Deal, and Ticket resources.',
      operations: [getOperation, getManyOperation, createOperation, updateOperation, deleteOperation, searchOperation, batchCreateOperation],
    },
  ],
  commonErrors: [
    {
      error: 'HubSpot node requires a connected HubSpot credential. Select or create a HubSpot connection for this node.',
      cause: 'No Access Token or Api Key was typed on the node and no HubSpot connection is saved in Connections for this workflow/user.',
      fix: 'Connect HubSpot in CtrlChecks -> Connections -> HubSpot (Private App token or OAuth2), or paste an access token directly into the node for a quick test.',
    },
    {
      error: 'HubSpot get operation requires id or objectId',
      cause: 'Get, Update, and Delete all target one existing record, and both the Id and Object Id fields were left empty.',
      fix: 'Fill the Id field with the numeric HubSpot record ID of the contact, company, deal, or ticket to fetch, change, or remove.',
    },
    {
      error: 'HubSpot create operation requires at least one property. Properties field is empty.',
      cause: 'Create or Update was run with an empty Properties object and no usable value in any of the fallback fields.',
      fix: 'Fill the Properties field with a JSON object using HubSpot internal property names, for example {"email":"alice@example.com"}.',
    },
    {
      error: 'HubSpot search operation requires searchQuery',
      cause: 'Search was run with the Search Query field left empty.',
      fix: 'Fill the Search Query field with a HubSpot CRM search query such as email:test@example.com.',
    },
    {
      error: 'HubSpot batchCreate operation requires records array',
      cause: 'Create Multiple was run with the Records field left empty or not a valid JSON array.',
      fix: 'Fill the Records field with a JSON array of record objects, for example [{"email":"a@example.com"}].',
    },
    {
      error: 'Unsupported HubSpot operation: <operation>. Supported: create, get, getMany, update, delete, search, batchCreate, batchUpdate, batchDelete',
      cause: 'The Operation field held a value the execution engine does not recognize.',
      fix: 'Choose one of Get, Get Many, Create, Update, Delete, Search, or Create Multiple from the Operation dropdown.',
    },
    {
      error: 'HubSpot CREATE failed (<status>): <details>',
      cause: 'HubSpot rejected the request - common causes are an unknown property name, a duplicate contact by email, or insufficient scope on the connected token.',
      fix: 'Check the Properties field against HubSpot\'s Settings -> Properties internal names, and confirm the connected Private App/OAuth2 token has the required CRM scopes.',
    },
    {
      error: 'HubSpot GET failed (404)',
      cause: 'The Id/Object Id does not exist in this HubSpot account, or the Resource does not match the record type that ID belongs to.',
      fix: 'Confirm the ID exists in HubSpot for the selected Resource, and that you are connected to the correct HubSpot account/portal.',
    },
  ],
  relatedNodes: [],
};
