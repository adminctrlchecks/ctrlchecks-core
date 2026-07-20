import type { NodeDoc, OperationDoc, FieldDoc } from '../types';

const instanceUrlField: FieldDoc = {
  name: 'Instance URL',
  internalKey: 'instanceUrl',
  type: 'url',
  required: true,
  description: 'Your Microsoft Dynamics 365 instance URL.',
  helpText: "What this field is: The web address of your Dynamics 365 environment - every API request this node makes is built on top of this URL.\nWhy it matters: Without it, the node has no idea which Dynamics 365 organization to talk to; every operation fails immediately if this is empty.\nWhen to fill it: Every time you add a Microsoft Dynamics node - there is no vault-backed fallback for this value (see the Access Token field's notes on why this node has no saved-connection support today).\nWhat to enter: Your organization's full Dynamics 365 URL, for example https://yourorg.crm.dynamics.com.\nWhere the value comes from: Look at your browser's address bar while logged into Dynamics 365, or check with your Dynamics 365 administrator.\nHow to use it later: Not included in the output, but it determines which organization every {{$json.data}} result comes from.\nAccepted format: A full https:// URL with no trailing slash required (a trailing slash is automatically stripped).\nReal workplace example: https://contoso.crm.dynamics.com for an organization named Contoso.\nIf it is empty or wrong: An empty value returns {{$json._error}} = \"Microsoft Dynamics: instanceUrl is required (e.g. https://yourorg.crm.dynamics.com)\"; a wrong URL causes every request to fail to connect or return a 404.\nCommon mistake: Using the Power Apps maker portal URL (make.powerapps.com) instead of the actual Dynamics 365 organization URL - they are different addresses.",
  placeholder: 'https://yourorg.crm.dynamics.com',
  example: 'https://yourorg.crm.dynamics.com',
};

const accessTokenField: FieldDoc = {
  name: 'OAuth2 Access Token',
  internalKey: 'accessToken',
  type: 'password',
  required: true,
  description: 'Azure AD OAuth2 access token. Important: this node has no Connections/credential-vault support today - this value must always be typed directly on the node.',
  notes: 'Unlike most other CRM nodes in this product, there is no registered credential type or connector for Microsoft Dynamics - grepped the entire credential-type-registry.ts, connector-registry.ts, and connections-catalog.ts and found zero references. This token cannot currently be saved in CtrlChecks Connections; it must be typed directly on every node, every time, and re-typed whenever it expires.',
  helpText: "What this field is: A short-lived Azure Active Directory OAuth2 access token that authenticates every request this node makes to Dynamics 365.\nWhy it matters: Dynamics 365's Web API requires a valid Bearer token on every call - without one, every operation fails immediately.\nWhen to fill it: Every time you add a Microsoft Dynamics node. Unlike most other CRM nodes in this product, there is currently no Connections-saved credential for this node - you must obtain and paste a fresh token yourself, and repeat this whenever the token expires (Azure AD tokens are typically short-lived, often about an hour).\nWhat to enter: The raw access token string from an Azure AD OAuth2 client-credentials or authorization-code flow scoped to your Dynamics 365 environment, with no \"Bearer\" prefix.\nWhere the value comes from: Register an app in Azure Active Directory, grant it the Dynamics 365 user_impersonation API permission, and complete an OAuth2 flow (for example via Postman, Azure CLI, or your own token-acquisition script) to obtain an access token for the https://yourorg.crm.dynamics.com resource.\nHow to use it later: Never included in the node output.\nAccepted format: A single JWT-style token string.\nReal workplace example: Acquire a token via the Azure AD client-credentials flow with scope https://yourorg.crm.dynamics.com/.default, then paste the resulting access_token value here.\nIf it is empty or wrong: An empty token returns {{$json._error}} = \"Microsoft Dynamics: accessToken (Azure AD OAuth2 token) is required\"; an expired or invalid token returns a Dynamics 365 authentication error inside {{$json._error}}.\nCommon mistake: Pasting a token once and expecting it to keep working indefinitely - Azure AD access tokens expire, typically within about an hour, and must be refreshed and re-entered since there is no automatic refresh for this node today.",
  placeholder: 'your-azure-oauth-access-token',
};

const resourceField: FieldDoc = {
  name: 'Entity / Resource',
  internalKey: 'resource',
  type: 'select',
  required: true,
  description: 'The Dynamics 365 entity (table) this operation works with.',
  options: ['contacts', 'leads', 'accounts', 'opportunities', 'incidents', 'tasks', 'activitypointers', 'custom'],
  helpText: "What this field is: The Dynamics 365 entity (Microsoft calls these \"tables\") that the chosen Operation reads or writes - Contacts, Leads, Accounts, Opportunities, Cases, Tasks, Activities, or a Custom Entity.\nWhy it matters: This value becomes part of every API URL this node builds (for example contacts becomes .../api/data/v9.2/contacts), so the wrong Resource sends the request to the wrong table entirely.\nWhen to fill it: Every time you add a Microsoft Dynamics node; it is required on every run alongside Operation.\nWhat to enter: Pick the entity type matching the record you want to work with. Choose Custom Entity and fill the Custom Entity Name field when you need a table not listed here (for example a custom entity your organization created).\nWhere the value comes from: Chosen directly in the Properties Panel, or set dynamically with {{$json.resource}} when a previous node decides which entity to touch.\nHow to use it later: The resource you pick determines which record shape appears inside {{$json.data}} - a contact record has different fields than an opportunity record.\nAccepted format: One of contacts, leads, accounts, opportunities, incidents, tasks, activitypointers, custom (Dynamics 365's plural logical entity names).\nReal workplace example: Set Resource to leads and Operation to createRecord to add a new sales lead captured from a website form.\nIf it is empty or wrong: An empty value falls back to contacts; an unrecognized logical name is sent to Dynamics as-is and returns a 404-style \"entity not found\" error.\nCommon mistake: Typing the display name shown in the Dynamics 365 UI (like \"Contact\") instead of the plural logical name this node expects (contacts) - use Custom Entity Name if you need an exact custom logical name.",
  placeholder: 'contacts',
  example: 'contacts',
  defaultValue: 'contacts',
};

const customEntityField: FieldDoc = {
  name: 'Custom Entity Name',
  internalKey: 'customEntity',
  type: 'text',
  required: false,
  description: 'The exact logical name of a custom Dynamics 365 entity, used only when Resource is set to Custom Entity.',
  helpText: "What this field is: The exact plural logical name of a custom table your organization created in Dynamics 365, used in place of one of the built-in Resource options.\nWhy it matters: Custom entities are not in the standard Resource dropdown, so this field is the only way to target one - if it is left blank while Resource is Custom Entity, the request falls back to using the literal word \"custom\" as the entity name, which is not a real Dynamics table and fails.\nWhen to fill it: Required only when Resource is set to Custom Entity; ignored for every built-in Resource option.\nWhat to enter: The full logical name exactly as Dynamics 365 shows it, including any publisher prefix, for example new_customentity or cr123_invoice.\nWhere the value comes from: Power Apps maker portal -> Tables -> your custom table -> the logical name shown in its details.\nHow to use it later: Determines which record shape appears inside {{$json.data}} - this node has no built-in knowledge of your custom table's fields.\nAccepted format: The plural logical name exactly as Dynamics 365 defines it, including its publisher prefix.\nReal workplace example: cr123_invoice for a custom Invoice table created with the cr123 publisher prefix.\nIf it is empty or wrong: If Resource is Custom Entity and this field is empty, the request targets a nonexistent \"custom\" entity and returns a 404-style error; a wrong logical name returns the same kind of error.\nCommon mistake: Typing the display name shown in the maker portal (like \"Invoice\") instead of the real logical/plural name Dynamics uses internally (like cr123_invoice).",
  placeholder: 'new_customentity',
  example: 'new_customentity',
};

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'The Dynamics 365 action to run. Note: 2 of the 8 dropdown values (Associate Records, Disassociate Records) are not implemented - see Notes.',
  options: ['getRecords', 'getRecord', 'createRecord', 'updateRecord', 'deleteRecord', 'fetchXml', 'associate', 'disassociate'],
  notes: 'Six of the eight dropdown values are real and fully implemented: getRecords, getRecord, createRecord, updateRecord, deleteRecord, and fetchXml. The remaining two, associate and disassociate (for linking/unlinking related records), are present in this dropdown and in the backend schema description, but the execution engine has no branch for either - selecting them always fails with "Microsoft Dynamics: Unsupported operation: associate" (or disassociate).',
  helpText: "What this field is: The dropdown that tells this node which Dynamics 365 action to run against the selected Resource.\nWhy it matters: Dynamics needs to know whether you are listing, reading one record, creating, changing, removing, or running an advanced query before it can build the right Web API request.\nWhen to fill it: Every time you add a Microsoft Dynamics node - this field has no usable default without it and is read on every run.\nWhat to enter: Choose Get Records to list multiple records, Get Record to fetch one by ID, Create Record to add a new record, Update Record to change an existing record by ID, Delete Record to remove a record by ID, or Search (FetchXML) to run an advanced FetchXML query. Avoid Associate Records and Disassociate Records - both appear in this dropdown but are not implemented and always fail.\nWhere the value comes from: You pick it directly in the Properties Panel; it is rarely set dynamically since the required fields differ per operation.\nHow to use it later: Downstream nodes read {{$json.data}}, {{$json.id}}, or {{$json.count}} depending on which operation ran.\nAccepted format: One of getRecords, getRecord, createRecord, updateRecord, deleteRecord, fetchXml (case-sensitive) - avoid associate and disassociate, which are non-functional.\nReal workplace example: Set Operation to getRecords with Resource set to contacts and a Filter to pull every contact matching a condition.\nIf it is empty or wrong: An empty value defaults to getRecords; associate/disassociate or any unrecognized value returns {{$json._error}} = \"Microsoft Dynamics: Unsupported operation: ...\".\nCommon mistake: Selecting Associate Records or Disassociate Records expecting to link two records together - neither is implemented yet; both always return an unsupported-operation error.",
  placeholder: 'getRecords',
  example: 'getRecords',
  defaultValue: 'getRecords',
};

const idField: FieldDoc = {
  name: 'Record ID (GUID)',
  internalKey: 'id',
  type: 'text',
  required: false,
  description: 'The Dynamics 365 record GUID (required for Get Record, Update Record, and Delete Record).',
  helpText: "What this field is: The unique GUID Dynamics 365 assigned to a specific contact, lead, account, or other record.\nWhy it matters: Get Record, Update Record, and Delete Record all target one specific record, and this GUID is the only way the node knows which one.\nWhen to fill it: Required whenever Operation is Get Record, Update Record, or Delete Record. Leave it blank for Get Records, Create Record, and Search (FetchXML), which do not target one existing record.\nWhat to enter: The record's GUID exactly as Dynamics 365 shows it, for example 00000000-0000-0000-0000-000000000000, without surrounding parentheses.\nWhere the value comes from: Copy it from the Dynamics 365 web UI URL, or use {{$json.id}} from an earlier Create Record step in the same workflow.\nHow to use it later: Update Record and Delete Record both echo it back as {{$json.id}} so you can confirm which record was affected.\nAccepted format: A standard GUID string (32 hex characters with dashes) - do not wrap it in parentheses yourself, the node adds those automatically.\nReal workplace example: Use {{$json.id}} from a Create Record step earlier in the same workflow to immediately Update Record the contact you just created.\nIf it is empty or wrong: An empty ID on Get Record/Update Record/Delete Record returns {{$json._error}} = \"Microsoft Dynamics: id (record GUID) is required for getRecord\" (or the matching operation name); a wrong GUID returns a Dynamics \"record not found\" error.\nCommon mistake: Wrapping the GUID in parentheses yourself (like (00000000-...)) - the node already adds the parentheses Dynamics 365's API requires around the ID in the URL.",
  placeholder: '00000000-0000-0000-0000-000000000000',
  example: '00000000-0000-0000-0000-000000000000',
};

const fieldsField: FieldDoc = {
  name: 'Fields (JSON)',
  internalKey: 'fields',
  type: 'json',
  required: false,
  description: 'The Dynamics 365 field values to create or update on a record, keyed by logical field name.',
  helpText: "What this field is: The Dynamics 365 field values (using logical field names) to create a new record or change an existing one.\nWhy it matters: Dynamics 365's Web API only understands logical field names like firstname or emailaddress1 - not the display labels shown in the Dynamics UI - so this field is where those exact names go.\nWhen to fill it: Required for Create Record and Update Record. It has no effect on Get Records, Get Record, Delete Record, or Search (FetchXML).\nWhat to enter: A JSON object whose keys are Dynamics 365 logical field names, for example {\"firstname\":\"John\",\"lastname\":\"Doe\",\"emailaddress1\":\"john@example.com\"}.\nWhere the value comes from: In Dynamics 365, check the Power Apps maker portal's table column details for each field's logical name, or map values from an earlier node such as {{$json.email}}.\nHow to use it later: Not echoed back directly - Create Record and Update Record only return the record's ID, not its field values (see those operations' output descriptions).\nAccepted format: Valid JSON wrapped in { } with logical field names as keys.\nReal workplace example: {\"firstname\":\"{{$json.formFirstName}}\",\"lastname\":\"{{$json.formLastName}}\",\"emailaddress1\":\"{{$json.formEmail}}\"} to create a contact from a signup form.\nIf it is empty or wrong: Invalid JSON here is rejected before the request is sent; unknown or invalid logical field names are rejected by Dynamics 365's own API validation, and the resulting error message is returned inside {{$json._error}}.\nCommon mistake: Typing the label shown in the Dynamics 365 UI (like \"First Name\") instead of the logical field name (firstname) - Dynamics rejects unrecognized keys rather than guessing what you meant.",
  placeholder: '{"firstname":"John","lastname":"Doe","emailaddress1":"john@example.com"}',
  example: '{"firstname":"John","lastname":"Doe","emailaddress1":"john@example.com"}',
};

const fetchXmlField: FieldDoc = {
  name: 'FetchXML Query',
  internalKey: 'fetchXml',
  type: 'textarea',
  required: false,
  description: 'A FetchXML query string (required for the Search (FetchXML) operation).',
  helpText: "What this field is: A query written in Dynamics 365's own FetchXML query language, an XML-based syntax for advanced filtering, sorting, and joining across entities.\nWhy it matters: FetchXML can express queries that plain OData $filter/$select cannot, such as multi-entity joins (link-entity) and aggregations - this field is the only way to run one from this node.\nWhen to fill it: Only used when Operation is Search (FetchXML). Ignored for every other operation.\nWhat to enter: A complete FetchXML document, for example <fetch><entity name=\"contact\"><attribute name=\"fullname\"/></entity></fetch>.\nWhere the value comes from: Build it manually following Microsoft's FetchXML schema reference, or export a saved Dynamics 365 view's FetchXML definition from the Advanced Find editor.\nHow to use it later: Matching records come back as an array inside {{$json.data}}, with the match count in {{$json.count}} - same shape as Get Records.\nAccepted format: Valid FetchXML XML matching Dynamics 365's schema; the entity name in the query does not need to match the Resource field, since Dynamics reads the entity directly from inside the query.\nReal workplace example: <fetch><entity name=\"contact\"><attribute name=\"fullname\"/><filter><condition attribute=\"statecode\" operator=\"eq\" value=\"0\"/></filter></entity></fetch> to fetch only active contacts.\nIf it is empty or wrong: An empty FetchXML Query on Search returns {{$json._error}} = \"Microsoft Dynamics: fetchXml query is required for fetchXml operation\"; invalid XML or an invalid query returns a Dynamics 365 parsing error inside {{$json._error}}.\nCommon mistake: Forgetting that this field's own <entity name=\"...\"> value is what actually gets queried - the Resource dropdown is still used to build the request URL, so keep both aligned or the query may run against an unexpected entity's endpoint.",
  placeholder: '<fetch><entity name="contact"><attribute name="fullname"/></entity></fetch>',
};

const selectField: FieldDoc = {
  name: 'Select Fields ($select)',
  internalKey: 'select',
  type: 'text',
  required: false,
  description: 'A comma-separated list of logical field names to return (OData $select).',
  helpText: "What this field is: A comma-separated list of Dynamics 365 logical field names that limits which columns come back in the response.\nWhy it matters: Dynamics records can have dozens of system fields - narrowing the response to only the fields you need makes the output smaller and easier to work with.\nWhen to fill it: Optional for Get Records and Get Record; ignored for Create Record, Update Record, Delete Record, and Search (FetchXML) (FetchXML controls its own returned attributes inside the query itself).\nWhat to enter: A comma-separated list of logical field names with no spaces, for example fullname,emailaddress1,telephone1.\nWhere the value comes from: The Power Apps maker portal's table column list, for the exact logical names of the fields you want.\nHow to use it later: Only the listed fields (plus a few Dynamics system fields) appear inside each record in {{$json.data}}.\nAccepted format: Comma-separated logical field names, for example fullname,emailaddress1,telephone1.\nReal workplace example: fullname,emailaddress1 to fetch only a contact's name and email instead of every field.\nIf it is empty or wrong: Left empty, Dynamics returns its default full set of fields; an unrecognized field name in the list returns a Dynamics 365 API error.\nCommon mistake: Using the field's display label (like \"Full Name\") instead of its logical name (fullname) - Dynamics 365's $select only understands logical names.",
  placeholder: 'fullname,emailaddress1,telephone1',
  example: 'fullname,emailaddress1,telephone1',
};

const filterField: FieldDoc = {
  name: 'Filter ($filter)',
  internalKey: 'filter',
  type: 'text',
  required: false,
  description: 'An OData $filter expression to narrow Get Records results.',
  helpText: "What this field is: An OData filter expression that limits which records Get Records returns, similar to a WHERE clause.\nWhy it matters: Without a filter, Get Records returns up to Max Records ($top) records with no targeting - this field lets you fetch only the records matching a specific condition.\nWhen to fill it: Optional for Get Records; ignored for every other operation (use FetchXML's own <filter> element for advanced filtering with Search (FetchXML) instead).\nWhat to enter: A valid OData v4 filter expression using logical field names, for example emailaddress1 eq 'john@example.com'.\nWhere the value comes from: Write it manually following Dynamics 365's OData filter syntax reference, or map a dynamic value such as emailaddress1 eq '{{$json.email}}'.\nHow to use it later: Only matching records appear inside {{$json.data}}, and {{$json.count}} reflects the filtered count, not the whole table.\nAccepted format: An OData v4 boolean expression, for example statecode eq 0 or emailaddress1 eq 'john@example.com' (note the single quotes around string values).\nReal workplace example: emailaddress1 eq '{{$json.formEmail}}' to look up the exact contact matching a submitted email address.\nIf it is empty or wrong: Left empty, Get Records returns records with no filter applied; invalid OData syntax returns a Dynamics 365 API error inside {{$json._error}}.\nCommon mistake: Forgetting single quotes around string values (emailaddress1 eq john@example.com instead of emailaddress1 eq 'john@example.com') - Dynamics 365's OData parser rejects unquoted string literals.",
  placeholder: "emailaddress1 eq 'john@example.com'",
  example: "emailaddress1 eq 'john@example.com'",
};

const topField: FieldDoc = {
  name: 'Max Records ($top)',
  internalKey: 'top',
  type: 'number',
  required: false,
  description: 'Maximum number of records to return for Get Records (OData $top, max 5000).',
  helpText: "What this field is: The maximum number of records this node asks Dynamics 365 for in one Get Records request.\nWhy it matters: Without a limit, a large table could return an unexpectedly huge response - this caps how many records come back in a single run.\nWhen to fill it: Optional for Get Records; ignored for every other operation.\nWhat to enter: A whole number from 1 up to Dynamics 365's own maximum of 5000.\nWhere the value comes from: Type it directly based on how many records you realistically need per run; there is rarely a reason to map this from a previous step.\nHow to use it later: The array inside {{$json.data}} will contain at most this many records, and {{$json.count}} reflects however many were actually returned.\nAccepted format: A positive whole number, capped at 5000 by Dynamics 365 itself.\nReal workplace example: 100 to pull a manageable batch of contacts for a nightly sync.\nIf it is empty or wrong: Left empty, this defaults to 50; this node does not itself enforce the 5000 cap, so a larger value is passed through and Dynamics 365's own limit applies.\nCommon mistake: Assuming a high Max Records value alone retrieves an entire large table - Dynamics 365 caps a single request at 5000 records regardless of what you request, and this node does not implement follow-up paging beyond that.",
  placeholder: '50',
  defaultValue: '50',
};

const sharedFields: FieldDoc[] = [instanceUrlField, accessTokenField, resourceField, customEntityField, operationField];

const getRecordsOperation: OperationDoc = {
  name: 'Get Records',
  value: 'getRecords',
  description: 'Fetches multiple Dynamics 365 records of the chosen Resource via GET /api/data/v9.2/{entity}, optionally narrowed with Select Fields, Filter, and Max Records.',
  fields: [...sharedFields, selectField, filterField, topField],
  outputExample: {
    success: true,
    data: [
      { contactid: '00000000-0000-0000-0000-000000000000', fullname: 'Alice Chen', emailaddress1: 'alice@example.com' },
      { contactid: '11111111-1111-1111-1111-111111111111', fullname: 'Bob Smith', emailaddress1: 'bob@example.com' },
    ],
    count: 2,
  },
  outputDescription: 'success: true when Dynamics 365 accepted the request. data: the array of raw Dynamics 365 records for this page (the OData "value" array). count: the number of records returned in this response, based on data.length. _error: present only when the request failed, for example an authentication or OData syntax problem, always prefixed "Microsoft Dynamics: ".',
  usageExample: {
    scenario: 'A sales reporting workflow pulls every active contact matching a filter to build a weekly outreach list.',
    inputValues: { instanceUrl: 'https://yourorg.crm.dynamics.com', accessToken: '', resource: 'contacts', operation: 'getRecords' },
    expectedOutput: 'Dynamics 365 returns matching records as {{$json.data}}, which a Loop node can iterate, and {{$json.count}} shows how many were returned.',
  },
  externalDocsUrl: 'https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api',
};

const getRecordOperation: OperationDoc = {
  name: 'Get Record',
  value: 'getRecord',
  description: 'Fetches one existing Dynamics 365 record by its GUID via GET /api/data/v9.2/{entity}({id}) and returns the full raw record.',
  fields: [...sharedFields, idField, selectField],
  outputExample: {
    success: true,
    data: { contactid: '00000000-0000-0000-0000-000000000000', fullname: 'Alice Chen', emailaddress1: 'alice@example.com', telephone1: '555-0100' },
  },
  outputDescription: 'success: true when Dynamics 365 accepted the request. data: the full raw Dynamics 365 record for the requested Resource and ID. _error: present only when the request failed, for example "Microsoft Dynamics: id (record GUID) is required for getRecord", always prefixed "Microsoft Dynamics: ".',
  usageExample: {
    scenario: 'A support workflow fetches the full details of one specific Dynamics 365 contact right before drafting a personalized reply.',
    inputValues: { instanceUrl: 'https://yourorg.crm.dynamics.com', accessToken: '', resource: 'contacts', operation: 'getRecord', id: '00000000-0000-0000-0000-000000000000' },
    expectedOutput: 'Dynamics 365 returns the contact as {{$json.data}}, so a later step can read {{$json.data.emailaddress1}}.',
  },
  externalDocsUrl: 'https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api',
};

const createRecordOperation: OperationDoc = {
  name: 'Create Record',
  value: 'createRecord',
  description: 'Creates a new Dynamics 365 record via POST /api/data/v9.2/{entity} using the Fields JSON payload. Only the new record\'s ID comes back - the created field values are not returned.',
  fields: [...sharedFields, fieldsField],
  outputExample: {
    success: true,
    id: '00000000-0000-0000-0000-000000000000',
    entityId: 'https://yourorg.crm.dynamics.com/api/data/v9.2/contacts(00000000-0000-0000-0000-000000000000)',
  },
  outputDescription: 'success: true when Dynamics 365 accepted the create request. id: the new record\'s GUID, extracted from the response\'s OData-EntityId header - needed for a later Update Record or Delete Record step. entityId: the full raw OData-EntityId header value (a complete URL) the id was extracted from. Note: unlike Get Record, this operation does NOT return a data key with the created field values - only the ID. _error: present only when the request failed, for example a validation error from an invalid field name.',
  usageExample: {
    scenario: 'A signup-form workflow creates a new Dynamics 365 contact for every visitor who submits their email and name.',
    inputValues: { instanceUrl: 'https://yourorg.crm.dynamics.com', accessToken: '', resource: 'contacts', operation: 'createRecord', fields: '{"firstname":"{{$json.formFirstName}}","emailaddress1":"{{$json.formEmail}}"}' },
    expectedOutput: 'Dynamics 365 returns the new record\'s ID as {{$json.id}}, for use in a later Update Record step.',
  },
  externalDocsUrl: 'https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/create-entity-using-web-api',
};

const updateRecordOperation: OperationDoc = {
  name: 'Update Record',
  value: 'updateRecord',
  description: 'Updates an existing Dynamics 365 record identified by GUID via PATCH /api/data/v9.2/{entity}({id}) with the fields supplied in Fields (JSON). No updated record data comes back - only the same ID is echoed.',
  fields: [...sharedFields, idField, fieldsField],
  outputExample: {
    success: true,
    id: '00000000-0000-0000-0000-000000000000',
  },
  outputDescription: 'success: true when Dynamics 365 accepted the update request. id: echoes back the same Record ID (GUID) you supplied - confirming which record was changed. Note: this operation does NOT return a data key with the updated field values, only success and id. _error: present only when the request failed, for example a missing Record ID or an invalid field name.',
  usageExample: {
    scenario: 'A support workflow updates a Dynamics 365 case status after an agent resolves it in an external ticketing tool.',
    inputValues: { instanceUrl: 'https://yourorg.crm.dynamics.com', accessToken: '', resource: 'incidents', operation: 'updateRecord', id: '{{$json.caseId}}', fields: '{"statuscode":5}' },
    expectedOutput: 'Dynamics 365 confirms the update with {{$json.id}} - to see the changed record, run a follow-up Get Record step with the same ID.',
  },
  externalDocsUrl: 'https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/update-delete-entities-using-web-api',
};

const deleteRecordOperation: OperationDoc = {
  name: 'Delete Record',
  value: 'deleteRecord',
  description: 'Permanently deletes an existing Dynamics 365 record identified by GUID via DELETE /api/data/v9.2/{entity}({id}).',
  fields: [...sharedFields, idField],
  outputExample: {
    success: true,
    id: '00000000-0000-0000-0000-000000000000',
    deleted: true,
  },
  outputDescription: 'success: true when Dynamics 365 accepted the delete request. id: the same Record ID you requested be deleted, echoed back so downstream nodes can confirm which record is gone. deleted: always true on a successful delete. _error: present only when the request failed, for example a missing Record ID or a record that no longer exists.',
  usageExample: {
    scenario: 'A data-cleanup workflow removes duplicate test leads created accidentally during an integration test run.',
    inputValues: { instanceUrl: 'https://yourorg.crm.dynamics.com', accessToken: '', resource: 'leads', operation: 'deleteRecord', id: '{{$json.leadId}}' },
    expectedOutput: 'Dynamics 365 confirms removal as {{$json.deleted}} and {{$json.id}}, so a later step can log which lead was removed.',
  },
  externalDocsUrl: 'https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/update-delete-entities-using-web-api',
};

const fetchXmlOperation: OperationDoc = {
  name: 'Search (FetchXML)',
  value: 'fetchXml',
  description: 'Runs an advanced FetchXML query via GET /api/data/v9.2/{entity}?fetchXml={query}, for filtering, sorting, or joins that plain OData $select/$filter cannot express.',
  fields: [...sharedFields, fetchXmlField],
  outputExample: {
    success: true,
    data: [
      { contactid: '00000000-0000-0000-0000-000000000000', fullname: 'Alice Chen' },
    ],
    count: 1,
  },
  outputDescription: 'success: true when Dynamics 365 accepted the FetchXML query. data: the array of raw records matching the query (the OData "value" array). count: the number of records returned, based on data.length. _error: present only when the request failed, for example invalid FetchXML syntax, prefixed "Microsoft Dynamics: ".',
  usageExample: {
    scenario: 'A workflow re-uses a saved Dynamics 365 Advanced Find view (exported as FetchXML) to pull the same filtered contact list every morning.',
    inputValues: { instanceUrl: 'https://yourorg.crm.dynamics.com', accessToken: '', resource: 'contacts', operation: 'fetchXml', fetchXml: '<fetch><entity name="contact"><attribute name="fullname"/></entity></fetch>' },
    expectedOutput: 'Dynamics 365 returns matching records as {{$json.data}}, with {{$json.count}} showing how many matched.',
  },
  externalDocsUrl: 'https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/use-fetchxml-web-api',
};

export const microsoftDynamicsDoc: NodeDoc = {
  slug: 'microsoft_dynamics',
  displayName: 'Microsoft Dynamics',
  category: 'CRM',
  logoUrl: '/icons/nodes/microsoft_dynamics.svg',
  description: 'Get, list, create, update, or delete Microsoft Dynamics 365 records, or run an advanced FetchXML query, from a workflow.',
  credentialType: 'Azure AD OAuth2 Access Token (no Connections support today)',
  credentialSetupSteps: [
    'Important: Unlike most other CRM nodes in this product, Microsoft Dynamics has no saved-connection support today. There is no Connections entry, vault key, or auto-fill for this node - Instance URL and OAuth2 Access Token must both be typed directly on every node, every time.',
    'Where to start: In Azure Active Directory (Microsoft Entra ID), register an application and grant it the Dynamics 365 user_impersonation API permission for your organization.',
    'How to connect: Complete an Azure AD OAuth2 flow (client-credentials or authorization-code) scoped to https://yourorg.crm.dynamics.com/.default, then paste the resulting access token directly into this node\'s OAuth2 Access Token field.',
    'Important: Treat the access token like a bank password even though it cannot currently be stored in Connections - avoid pasting it into shared or logged locations, and remove it from the node before sharing a workflow export.',
    'Test it: Fill Instance URL and OAuth2 Access Token, set Operation to Get Records with Resource set to contacts, run the node, and confirm CtrlChecks returns real Dynamics 365 contact data instead of an authentication error.',
    'Remember the token expires: Azure AD access tokens are typically short-lived (often about an hour) - you will need to obtain and paste a fresh token again once it expires, since there is no refresh-token handling built into this node today.',
    'Connect the Microsoft Dynamics output to a logging, If/Else, or follow-up node when later steps should inspect {{$json.data}} or {{$json.id}}. Downstream service node account connection setup is still required for nodes after Microsoft Dynamics; this node only authorizes Dynamics 365 CRM operations.',
  ],
  credentialDocsUrl: 'https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/authenticate-oauth',
  resources: [
    {
      name: 'Operations',
      description: 'Dynamics 365 CRM actions available on this node: Get Records, Get Record, Create Record, Update Record, Delete Record, and Search (FetchXML). Two more dropdown values, Associate Records and Disassociate Records, are not implemented - see the Operation field for details.',
      operations: [getRecordsOperation, getRecordOperation, createRecordOperation, updateRecordOperation, deleteRecordOperation, fetchXmlOperation],
    },
  ],
  commonErrors: [
    {
      error: 'Microsoft Dynamics: instanceUrl is required (e.g. https://yourorg.crm.dynamics.com)',
      cause: 'The Instance URL field was left empty when the node ran.',
      fix: 'Type your full Dynamics 365 organization URL into the Instance URL field.',
    },
    {
      error: 'Microsoft Dynamics: accessToken (Azure AD OAuth2 token) is required',
      cause: 'The OAuth2 Access Token field was left empty. This node has no saved-connection fallback, so there is no vault to check.',
      fix: 'Obtain a fresh Azure AD OAuth2 access token for your Dynamics 365 environment and paste it into the OAuth2 Access Token field.',
    },
    {
      error: 'Microsoft Dynamics: id (record GUID) is required for getRecord',
      cause: 'Get Record, Update Record, or Delete Record was run with the Record ID (GUID) field left empty.',
      fix: 'Fill the Record ID (GUID) field with the GUID of the record to fetch, change, or remove.',
    },
    {
      error: 'Microsoft Dynamics: fetchXml query is required for fetchXml operation',
      cause: 'Search (FetchXML) was run with the FetchXML Query field left empty.',
      fix: 'Fill the FetchXML Query field with a valid FetchXML document.',
    },
    {
      error: 'Microsoft Dynamics: Unsupported operation: associate',
      cause: 'The Operation dropdown was set to Associate Records or Disassociate Records, both of which appear in the dropdown but are not implemented in the execution engine.',
      fix: 'Use Update Record with a lookup field in Fields (JSON) to relate records instead, until Associate/Disassociate are implemented.',
    },
    {
      error: 'Microsoft Dynamics: <Dynamics API error message>',
      cause: 'Dynamics 365 rejected the request - common causes are an invalid logical field name in Fields (JSON), an invalid OData Filter expression, or insufficient permissions on the Azure AD app.',
      fix: 'Check Fields/Filter/FetchXML against Dynamics 365\'s logical field names, and confirm the Azure AD app has the user_impersonation permission for this environment.',
    },
  ],
  relatedNodes: [],
};
