import type { NodeDoc, OperationDoc, FieldDoc } from '../types';

const instanceUrlField: FieldDoc = {
  name: 'Instance URL',
  internalKey: 'instanceUrl',
  type: 'url',
  required: true,
  description: 'Your Salesforce org\'s instance URL. Not vault-backed - must be typed on every node even after connecting Salesforce.',
  notes: 'A saved Salesforce OAuth2 connection auto-fills the Access Token field at run time, but not this one - Salesforce access tokens work at a specific org instance (like https://yourcompany.my.salesforce.com), and this node reads Instance URL from the node config directly rather than from the connection\'s own instance metadata. Type it every time, the same asymmetry seen on Freshdesk\'s Domain and ActiveCampaign\'s API URL fields.',
  helpText: "What this field is: The base web address of your specific Salesforce organization - every request this node makes is built on top of this URL.\nWhy it matters: Salesforce access tokens are only valid against the exact org instance they were issued for; without the matching Instance URL, every request fails even with a valid token.\nWhen to fill it: Every time you add a Salesforce node - see Notes for why a saved connection does not auto-fill this field.\nWhat to enter: Your org's full instance URL, for example https://yourcompany.my.salesforce.com (or a Salesforce sandbox/Lightning domain).\nWhere the value comes from: Look at your browser's address bar while logged into Salesforce, or check Setup -> Company Information -> Instance.\nHow to use it later: Not included in the output, but it determines which org every {{$json.data}} result comes from.\nAccepted format: A full https:// URL, with any trailing slash automatically stripped.\nReal workplace example: https://yourcompany.my.salesforce.com for a standard production org.\nIf it is empty or wrong: An empty value returns {{$json._error}} = \"instanceUrl is required\"; a wrong URL causes every request to fail to connect or return an authentication error, even with a valid token.\nCommon mistake: Reusing a sandbox org's Instance URL with a production token (or vice versa) - Salesforce access tokens are tied to a specific org instance and are rejected outright by a different one.",
  placeholder: 'https://yourcompany.my.salesforce.com',
  example: 'https://yourcompany.my.salesforce.com',
};

const accessTokenField: FieldDoc = {
  name: 'OAuth2 Access Token',
  internalKey: 'accessToken',
  type: 'password',
  required: true,
  description: 'Your Salesforce OAuth2 access token, used to authenticate every request.',
  helpText: "What this field is: A Salesforce OAuth2 access token that authenticates every request this node makes, sent as a Bearer token.\nWhy it matters: Every Salesforce REST API call requires this token - without it, every operation fails immediately.\nWhen to fill it: Leave this field blank once you have saved a Salesforce connection in CtrlChecks Connections; the node automatically retrieves the token from the credential vault at run time. Fill it directly only for a quick one-off test.\nWhat to enter: The raw OAuth2 access token, with no \"Bearer\" prefix and no surrounding quotes.\nWhere the value comes from: The CtrlChecks Salesforce OAuth2 connection flow (Connect Salesforce), or your own Salesforce Connected App OAuth exchange.\nHow to use it later: Never included in the node output.\nAccepted format: A single Salesforce OAuth2 access token string.\nReal workplace example: Save the connection once in Connections -> Add Connection -> Salesforce, then reuse the same saved connection across every Salesforce node in every workflow.\nIf it is empty or wrong: An empty token returns {{$json._error}} = \"accessToken is required\"; an expired or invalid token returns a Salesforce authentication error inside {{$json._error}}.\nCommon mistake: Pasting the token into a plain workflow field or a Fields/JSON field instead of Connections, which leaves the secret visible to anyone who can view the workflow. Salesforce access tokens are also relatively short-lived - if the saved connection's refresh flow lapses, this field returns an authentication error until reconnected.",
  placeholder: 'your-oauth-access-token',
  notes: 'Stored and displayed as a masked credential value once saved through Connections.',
};

const resourceField: FieldDoc = {
  name: 'Resource/Object',
  internalKey: 'resource',
  type: 'select',
  required: true,
  description: 'The Salesforce object (sObject) this operation works with, for Get/Create/Update/Delete/Upsert/Bulk operations. Not used by Query or Search, which specify the object inside the SOQL/SOSL text itself.',
  options: ['Account', 'Contact', 'Lead', 'Opportunity', 'Case', 'Campaign', 'Product2', 'Task', 'Event', 'custom'],
  helpText: "What this field is: The Salesforce object (Salesforce calls these \"sObjects\") - Account, Contact, Lead, Opportunity, Case, Campaign, Product, Task, Event, or a Custom Object - that Get/Create/Update/Delete/Upsert/Bulk operations read or write.\nWhy it matters: This value becomes part of every API URL this node builds for record-level operations (for example Contact becomes /sobjects/Contact), so the wrong Resource sends the request to the wrong object entirely.\nWhen to fill it: Required for Get, Create, Update, Delete, Upsert, and every Bulk operation. Not used for Query or Search - those specify the object directly inside the SOQL Query/SOSL Search Query text (for example FROM Contact).\nWhat to enter: Pick Account, Contact, Lead, Opportunity, Case, Campaign, Product, Task, or Event for the nine built-in options. Choose Custom Object and fill the Custom Object API Name field for any other object, including your own custom objects.\nWhere the value comes from: Chosen directly in the Properties Panel, or set dynamically with {{$json.resource}} when a previous node decides which Salesforce object to touch.\nHow to use it later: The resource you pick determines which record shape appears inside {{$json.data}}.\nAccepted format: The exact Salesforce API object name, for example Contact, Opportunity, Product2 (Product's real API name), or a custom object name ending in __c.\nReal workplace example: Set Resource to Lead and Operation to create to add a new sales lead captured from a website form.\nIf it is empty or wrong: An empty value on a record-level operation returns {{$json._error}} = \"resource is required\"; a wrong or nonexistent object name returns a Salesforce \"not found\" or \"invalid type\" error.\nCommon mistake: Typing \"Product\" instead of Salesforce's real API name for that object, Product2 - the dropdown's Product label already maps to the correct value, but typing it manually via JSON/AI generation must use the exact API name.",
  placeholder: 'Contact',
  example: 'Contact',
  defaultValue: 'Contact',
};

const customObjectField: FieldDoc = {
  name: 'Custom Object API Name',
  internalKey: 'customObject',
  type: 'text',
  required: false,
  description: 'The exact API name of a custom Salesforce object, used only when Resource is set to Custom Object.',
  helpText: "What this field is: The exact API name of a custom object your organization created in Salesforce, used in place of one of the built-in Resource options.\nWhy it matters: Custom objects are not in the standard Resource dropdown, so this field is the only way to target one.\nWhen to fill it: Required only when Resource is set to Custom Object; ignored for every built-in Resource option.\nWhat to enter: The full API name exactly as Salesforce shows it, always ending in __c, for example CustomObject__c or Invoice__c.\nWhere the value comes from: Salesforce Setup -> Object Manager -> your custom object -> API Name field.\nHow to use it later: Determines which record shape appears inside {{$json.data}} - this node has no built-in knowledge of your custom object's fields.\nAccepted format: The API name exactly as Salesforce defines it, always ending in __c.\nReal workplace example: Invoice__c for a custom Invoice object.\nIf it is empty or wrong: If Resource is Custom Object and this field is empty, the resulting request targets an empty object name and fails; a wrong API name returns a Salesforce \"invalid type\" error.\nCommon mistake: Forgetting the trailing __c suffix - Salesforce custom object API names always end with it, and omitting it causes Salesforce to reject the object name as unrecognized.",
  placeholder: 'CustomObject__c',
  example: 'CustomObject__c',
};

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'The Salesforce action to run.',
  options: ['query', 'search', 'get', 'create', 'update', 'delete', 'upsert', 'bulkCreate', 'bulkUpdate', 'bulkDelete', 'bulkUpsert'],
  helpText: "What this field is: The dropdown that tells this node which Salesforce action to run.\nWhy it matters: Salesforce needs to know whether you are running a query, a full-text search, or a record-level action before it can build the right API request - and all 11 values here are real and fully implemented, unlike some other CRM nodes audited in this product.\nWhen to fill it: Every time you add a Salesforce node.\nWhat to enter: Choose Query to run a SOQL query, Search to run a SOSL search, Get to fetch one record by ID, Create to add a new record, Update to change an existing record by ID, Delete to remove a record by ID, Upsert to insert-or-update by an External ID field, or one of the four Bulk operations to process multiple records in fewer requests.\nWhere the value comes from: Chosen directly in the Properties Panel; it is rarely set dynamically since the required fields differ per operation.\nHow to use it later: Downstream nodes read {{$json.data}} for the Salesforce result, and {{$json.operation}}/{{$json.resource}} are also echoed back on every run.\nAccepted format: One of query, search, get, create, update, delete, upsert, bulkCreate, bulkUpdate, bulkDelete, bulkUpsert (case-sensitive).\nReal workplace example: Set Operation to query with a SOQL Query to pull every open opportunity above a certain value.\nIf it is empty or wrong: An empty value defaults to query; an unrecognized value returns {{$json._error}} = \"Unsupported Salesforce operation: ...\".\nCommon mistake: Assuming Bulk Delete uses Salesforce's true bulk API - it actually deletes records one at a time in a loop (see the Bulk Delete operation's notes), unlike the other three bulk operations, which do use Salesforce's real Composite sObject Collections API.",
  placeholder: 'query',
  example: 'query',
  defaultValue: 'query',
};

const soqlField: FieldDoc = {
  name: 'SOQL Query',
  internalKey: 'soql',
  type: 'textarea',
  required: false,
  description: 'A SOQL (Salesforce Object Query Language) query string, required for the Query operation.',
  helpText: "What this field is: A query written in SOQL, Salesforce's SQL-like query language for reading data.\nWhy it matters: This is the only way to run the Query operation - without it, there is nothing to ask Salesforce for.\nWhen to fill it: Required whenever Operation is query. Ignored for every other operation.\nWhat to enter: A complete SOQL statement, for example SELECT Id, Name, Email FROM Contact LIMIT 10.\nWhere the value comes from: Write it manually following Salesforce's SOQL reference, or build it dynamically such as SELECT Id, Name FROM Contact WHERE Email = '{{$json.email}}'.\nHow to use it later: Matching records come back as an array inside {{$json.data.records}}, with the total match count in {{$json.data.totalSize}}.\nAccepted format: Valid SOQL syntax, always including a FROM clause naming the object to query.\nReal workplace example: SELECT Id, Name, Email FROM Contact WHERE CreatedDate = TODAY to find every contact created today.\nIf it is empty or wrong: An empty SOQL Query on query returns {{$json._error}} = \"soql is required for query\"; invalid SOQL syntax or an unknown field/object name returns a Salesforce parsing error inside {{$json._error}}.\nCommon mistake: Forgetting single quotes around string literals in a WHERE clause (WHERE Email = test@example.com instead of WHERE Email = 'test@example.com') - Salesforce's SOQL parser rejects unquoted string values.",
  placeholder: 'SELECT Id, Name, Email FROM Contact LIMIT 10',
  example: 'SELECT Id, Name, Email FROM Contact LIMIT 10',
};

const soslField: FieldDoc = {
  name: 'SOSL Search Query',
  internalKey: 'sosl',
  type: 'text',
  required: false,
  description: 'A SOSL (Salesforce Object Search Language) query string, required for the Search operation.',
  helpText: "What this field is: A query written in SOSL, Salesforce's full-text search language that can search across multiple object types in one request.\nWhy it matters: This is the only way to run the Search operation - unlike SOQL, SOSL can match a term against several objects (like Contact and Lead) simultaneously.\nWhen to fill it: Required whenever Operation is search. Ignored for every other operation.\nWhat to enter: A complete SOSL statement, for example FIND {test@example.com} IN EMAIL FIELDS RETURNING Contact(Id, Name).\nWhere the value comes from: Write it manually following Salesforce's SOSL reference, or build it dynamically such as FIND {{{$json.searchTerm}}} IN ALL FIELDS RETURNING Contact(Id, Name), Lead(Id, Name).\nHow to use it later: Matching records come back grouped by object type inside {{$json.data.searchRecords}}.\nAccepted format: Valid SOSL syntax, always starting with FIND {search term} and including a RETURNING clause naming the object(s) and fields to return.\nReal workplace example: FIND {Acme} IN NAME FIELDS RETURNING Account(Id, Name), Contact(Id, Name) to find any account or contact matching \"Acme\" by name.\nIf it is empty or wrong: An empty SOSL Search Query on search returns {{$json._error}} = \"sosl is required for search\"; invalid SOSL syntax returns a Salesforce parsing error inside {{$json._error}}.\nCommon mistake: Using SOQL syntax (SELECT ... FROM ...) here instead of SOSL syntax (FIND {...} IN ... RETURNING ...) - the two Salesforce query languages are not interchangeable.",
  placeholder: 'FIND {test@example.com} IN EMAIL FIELDS RETURNING Contact(Id, Name)',
  example: 'FIND {test@example.com} IN EMAIL FIELDS RETURNING Contact(Id, Name)',
};

const idField: FieldDoc = {
  name: 'Record ID',
  internalKey: 'id',
  type: 'text',
  required: false,
  description: 'The Salesforce record ID (a 15 or 18-character string) for Get, Update, and Delete.',
  helpText: "What this field is: The unique ID Salesforce assigned to a specific record of the chosen Resource.\nWhy it matters: Get, Update, and Delete all target one specific record, and this ID is the only way the node knows which one.\nWhen to fill it: Required whenever Operation is Get, Update, or Delete. Not used for Query, Search, Create, Upsert, or any Bulk operation.\nWhat to enter: The record's Salesforce ID exactly as shown, for example 003xx000004TmiQAAS.\nWhere the value comes from: Copy it from the Salesforce record's URL, or use {{$json.data.Id}} from an earlier Query/Create step in the same workflow.\nHow to use it later: Not echoed back as its own key by Update (see that operation's output description), but the Salesforce record URL/ID format is consistent everywhere Salesforce shows record IDs.\nAccepted format: A 15-character (case-sensitive) or 18-character (case-insensitive) Salesforce ID string.\nReal workplace example: Use {{$json.data.records.0.Id}} from a Query step earlier in the same workflow to immediately Update that exact contact.\nIf it is empty or wrong: An empty ID on Get/Update/Delete returns {{$json._error}} = \"id is required for get\" (or the matching operation name); a wrong or nonexistent ID returns a Salesforce \"not found\" error.\nCommon mistake: Mixing up the 15-character case-sensitive ID with the 18-character case-insensitive ID - both work with this node, but copying only part of an 18-character ID (or changing its letter case when it matters) causes a \"not found\" error.",
  placeholder: '003xx000004TmiQAAS',
  example: '003xx000004TmiQAAS',
};

const externalIdFieldField: FieldDoc = {
  name: 'External ID Field',
  internalKey: 'externalIdField',
  type: 'text',
  required: false,
  description: 'The Salesforce custom field (marked as an External ID) used to look up the record for Upsert.',
  helpText: "What this field is: The API name of a Salesforce field configured as an \"External ID\" field on the chosen Resource - typically a custom field storing an ID from another system (like your own database's primary key).\nWhy it matters: Upsert uses this field (instead of the built-in Salesforce record ID) to decide whether a matching record already exists - if a record with this field's value exists, it is updated; if not, a new one is created.\nWhen to fill it: Required whenever Operation is upsert (and for the Bulk Upsert operation, where it is optional and defaults to Id if left blank). Ignored for every other operation.\nWhat to enter: The exact API name of a custom field marked \"External ID\" in Salesforce, for example CustomId__c.\nWhere the value comes from: Salesforce Setup -> Object Manager -> the object -> Fields & Relationships -> find the field marked \"External ID\".\nHow to use it later: Not included in the output directly.\nAccepted format: A Salesforce custom field API name, always ending in __c.\nReal workplace example: CustomId__c mapped to your own system's primary key, so re-running the same sync never creates duplicate Salesforce records.\nIf it is empty or wrong: An empty External ID Field on upsert returns {{$json._error}} = \"externalIdField and externalIdValue are required for upsert\"; a field that is not actually marked as an External ID in Salesforce returns a Salesforce configuration error.\nCommon mistake: Using the standard Salesforce Id field here instead of a real custom External ID field - Upsert's whole purpose is matching by an external system's identifier, not Salesforce's own auto-generated ID (use plain Update with Record ID for that case instead).",
  placeholder: 'CustomId__c',
  example: 'CustomId__c',
};

const externalIdValueField: FieldDoc = {
  name: 'External ID Value',
  internalKey: 'externalIdValue',
  type: 'text',
  required: false,
  description: 'The value to match against the External ID Field, for Upsert.',
  helpText: "What this field is: The specific value to look up (or create, if not found) within the field named in External ID Field.\nWhy it matters: Together with External ID Field, this is how Upsert decides whether to update an existing record or create a new one.\nWhen to fill it: Required whenever Operation is upsert. Ignored for every other operation.\nWhat to enter: The value from your other system that should match (or be stored as) the External ID Field on the Salesforce record.\nWhere the value comes from: Your own system's record identifier, for example {{$json.orderId}} from an e-commerce platform.\nHow to use it later: Not included in the output directly, though it will match the record's External ID Field value on a later Get/Query.\nAccepted format: Any string matching the External ID Field's own data type (usually text).\nReal workplace example: EXT-12345 to upsert a Salesforce record tied to order EXT-12345 in an external system.\nIf it is empty or wrong: An empty External ID Value on upsert returns {{$json._error}} = \"externalIdField and externalIdValue are required for upsert\".\nCommon mistake: Reusing the same External ID Value for two genuinely different records - Salesforce's upsert matching will update the first one instead of creating a second, since External ID values are expected to be unique per record.",
  placeholder: 'EXT-12345',
  example: 'EXT-12345',
};

const fieldsField: FieldDoc = {
  name: 'Fields (JSON)',
  internalKey: 'fields',
  type: 'json',
  required: false,
  description: 'The Salesforce field values to create or update on a record, keyed by API field name.',
  helpText: "What this field is: The Salesforce field values (using API field names) to create a new record or change an existing one.\nWhy it matters: Salesforce's API only understands API field names like LastName or Email, not the display labels shown in the Salesforce UI, so this field is where those exact names go.\nWhen to fill it: Required for Create and Update. Not used for Query, Search, Get, Delete, or Upsert (Upsert instead reads this same key internally, but is documented separately above since its lookup mechanism differs).\nWhat to enter: A JSON object whose keys are Salesforce API field names, for example {\"LastName\":\"Doe\",\"Email\":\"test@example.com\"}.\nWhere the value comes from: Salesforce Setup -> Object Manager -> the object -> Fields & Relationships, for the exact API name of each field you need.\nHow to use it later: Not echoed back directly on Create (only the new id is returned) or Update (which typically returns no body at all) - run a follow-up Get to see the saved values.\nAccepted format: Valid JSON wrapped in { } with Salesforce API field names as keys.\nReal workplace example: {\"LastName\":\"{{$json.formLastName}}\",\"Email\":\"{{$json.formEmail}}\"} to create a contact from a signup form.\nIf it is empty or wrong: Left empty on Create, Salesforce still attempts to create a record with no fields set, which fails if the object has required fields; an unknown field name is rejected by Salesforce's own API validation, and the resulting error message is returned inside {{$json._error}}.\nCommon mistake: Typing the label shown in the Salesforce UI (like \"Last Name\") instead of the API field name (LastName) - Salesforce rejects unrecognized keys rather than guessing what you meant. For custom fields, remember the __c suffix (for example Custom_Field__c).",
  placeholder: '{"LastName":"Doe","Email":"test@example.com"}',
  example: '{"LastName":"Doe","Email":"test@example.com"}',
};

const recordsField: FieldDoc = {
  name: 'Records Array (JSON)',
  internalKey: 'records',
  type: 'json',
  required: false,
  description: 'A JSON array of records for the four Bulk operations.',
  helpText: "What this field is: An array of records, each with its own field values, sent to Salesforce in one bulk request (Bulk Create/Update/Upsert) or processed one at a time (Bulk Delete - see that operation's notes).\nWhy it matters: Creating or updating dozens of records one at a time is slow - Bulk Create/Update/Upsert send up to 200 records in a single Salesforce Composite sObject Collections request.\nWhen to fill it: Required for Bulk Create, Bulk Update, Bulk Delete, and Bulk Upsert. Not used for any single-record operation.\nWhat to enter: A JSON array of objects. For Bulk Create/Update/Upsert, each object's keys are Salesforce API field names (for Bulk Update, also include Id to identify which record to change). For Bulk Delete, each object needs only an Id (or lowercase id) field.\nWhere the value comes from: Build it from an earlier node's output, such as a Loop/Aggregate step that collects several form submissions into one array, or {{$json.rows}} from a spreadsheet read.\nHow to use it later: For Bulk Create/Update/Upsert, Salesforce's per-record results (each with its own success/errors) come back as an array inside {{$json.data}}, in the same order submitted. For Bulk Delete, a simple {{$json.data}} array of {id, deleted:true} confirmations comes back instead.\nAccepted format: A JSON array of objects - Salesforce's Composite sObject Collections API accepts up to 200 records per request.\nReal workplace example: [{\"LastName\":\"Doe\",\"Email\":\"a@x.com\"},{\"LastName\":\"Smith\",\"Email\":\"b@x.com\"}] to import two new contacts from a CSV in one step.\nIf it is empty or wrong: An empty or missing Records Array on any Bulk operation returns {{$json._error}} = \"records array is required for bulk operations\" (or \"records with Id values are required for bulkDelete\"); Salesforce still processes whichever individual records in the array are valid and reports failures per-record for Bulk Create/Update/Upsert (allOrNone is set to false).\nCommon mistake: Omitting the Id field on Bulk Update entries - unlike Bulk Create, every entry sent to Bulk Update needs its own Id so Salesforce knows which existing record to change.",
  placeholder: '[{"LastName":"Doe","Email":"test1@example.com"},{"LastName":"Smith","Email":"test2@example.com"}]',
  example: '[{"LastName":"Doe","Email":"test1@example.com"}]',
};

const sharedFields: FieldDoc[] = [operationField, resourceField, instanceUrlField, accessTokenField];

const queryOperation: OperationDoc = {
  name: 'Query (SOQL)',
  value: 'query',
  description: 'Runs a SOQL query against your Salesforce org via GET /services/data/v59.0/query and returns matching records. Resource is not used for this operation - the object being queried is named directly inside the SOQL text\'s FROM clause.',
  fields: [...sharedFields, soqlField],
  outputExample: {
    operation: 'query',
    resource: '',
    data: {
      totalSize: 2,
      done: true,
      records: [
        { attributes: { type: 'Contact', url: '/services/data/v59.0/sobjects/Contact/003xx000004TmiQAAS' }, Id: '003xx000004TmiQAAS', Name: 'Alice Chen', Email: 'alice@example.com' },
      ],
    },
  },
  outputDescription: 'operation/resource: echoed back from your configuration. data: Salesforce\'s raw query response - totalSize (the number of matching records), done (false only if results are paginated beyond this one response), and records (the array of matching sObjects, each including a Salesforce attributes.type/url metadata block alongside the requested fields). _error: present only when the request failed, for example "soql is required for query" or a SOQL syntax error.',
  usageExample: {
    scenario: 'A sales reporting workflow queries every open opportunity above a certain value to build a weekly pipeline summary.',
    inputValues: { operation: 'query', instanceUrl: 'https://yourcompany.my.salesforce.com', accessToken: '', soql: 'SELECT Id, Name, Amount FROM Opportunity WHERE StageName != \'Closed Lost\' LIMIT 50' },
    expectedOutput: 'Salesforce returns matching records as {{$json.data.records}}, which a Loop node can iterate.',
  },
  externalDocsUrl: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm',
};

const searchOperation: OperationDoc = {
  name: 'Search (SOSL)',
  value: 'search',
  description: 'Runs a SOSL full-text search across one or more Salesforce object types via GET /services/data/v59.0/search. Resource is not used for this operation - the object(s) being searched are named directly inside the SOSL text\'s RETURNING clause.',
  fields: [...sharedFields, soslField],
  outputExample: {
    operation: 'search',
    resource: '',
    data: {
      searchRecords: [
        { attributes: { type: 'Contact', url: '/services/data/v59.0/sobjects/Contact/003xx000004TmiQAAS' }, Id: '003xx000004TmiQAAS', Name: 'Alice Chen' },
      ],
    },
  },
  outputDescription: 'operation/resource: echoed back from your configuration. data: Salesforce\'s raw search response - a searchRecords array combining matches across every object type named in the SOSL RETURNING clause. _error: present only when the request failed, for example "sosl is required for search" or a SOSL syntax error.',
  usageExample: {
    scenario: 'A support workflow searches across both Contacts and Leads for a customer\'s email before deciding which record to update.',
    inputValues: { operation: 'search', instanceUrl: 'https://yourcompany.my.salesforce.com', accessToken: '', sosl: 'FIND {alice@example.com} IN EMAIL FIELDS RETURNING Contact(Id, Name), Lead(Id, Name)' },
    expectedOutput: 'Salesforce returns matches as {{$json.data.searchRecords}}.',
  },
  externalDocsUrl: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_search.htm',
};

const getOperation: OperationDoc = {
  name: 'Get',
  value: 'get',
  description: 'Fetches one existing Salesforce record by its ID via GET /services/data/v59.0/sobjects/{resource}/{id} and returns the full raw record.',
  fields: [...sharedFields, customObjectField, idField],
  outputExample: {
    operation: 'get',
    resource: 'Contact',
    data: { attributes: { type: 'Contact', url: '/services/data/v59.0/sobjects/Contact/003xx000004TmiQAAS' }, Id: '003xx000004TmiQAAS', Name: 'Alice Chen', Email: 'alice@example.com' },
  },
  outputDescription: 'operation/resource: echoed back from your configuration. data: the full raw Salesforce sObject record, including its own attributes.type/url metadata. _error: present only when the request failed, for example "id is required for get" or a "not found" error.',
  usageExample: {
    scenario: 'A support workflow fetches the full details of one specific Salesforce contact right before drafting a personalized reply.',
    inputValues: { operation: 'get', instanceUrl: 'https://yourcompany.my.salesforce.com', accessToken: '', resource: 'Contact' },
    expectedOutput: 'Salesforce returns the contact as {{$json.data}}, so a later step can read {{$json.data.Email}}.',
  },
  externalDocsUrl: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_retrieve.htm',
};

const createOperation: OperationDoc = {
  name: 'Create',
  value: 'create',
  description: 'Creates a new Salesforce record via POST /services/data/v59.0/sobjects/{resource} using the Fields JSON payload. Salesforce returns only the new record\'s ID and success status, not the saved field values.',
  fields: [...sharedFields, fieldsField],
  outputExample: {
    operation: 'create',
    resource: 'Contact',
    data: { id: '003xx000004TmiQAAS', success: true, errors: [] },
  },
  outputDescription: 'operation/resource: echoed back from your configuration. data: Salesforce\'s raw create response - id (the new record\'s ID, needed for a later Update/Delete step), success, and errors (empty on success). Note: this does NOT include the record\'s saved field values - run a follow-up Get to see them. _error: present only when the request failed, for example a required-field validation error from Salesforce.',
  usageExample: {
    scenario: 'A signup-form workflow creates a new Salesforce contact for every visitor who submits their name and email.',
    inputValues: { operation: 'create', instanceUrl: 'https://yourcompany.my.salesforce.com', accessToken: '', resource: 'Contact', fields: '{"LastName":"Chen","Email":"alice@example.com"}' },
    expectedOutput: 'Salesforce returns the new record\'s ID as {{$json.data.id}}, for use in a later Update step.',
  },
  externalDocsUrl: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_sobject_create.htm',
};

const updateOperation: OperationDoc = {
  name: 'Update',
  value: 'update',
  description: 'Updates an existing Salesforce record identified by ID via PATCH /services/data/v59.0/sobjects/{resource}/{id} with the Fields JSON payload. Salesforce\'s update endpoint returns HTTP 204 with no body, so this node\'s output has no field data to read.',
  fields: [...sharedFields, idField, fieldsField],
  outputExample: {
    operation: 'update',
    resource: 'Contact',
    data: null,
  },
  outputDescription: 'operation/resource: echoed back from your configuration. data: always null on a successful update - Salesforce\'s PATCH endpoint returns HTTP 204 with no response body, so there is nothing to read here. Check for the absence of {{$json._error}} to confirm the update succeeded, then run a follow-up Get if you need to see the saved values. _error: present only when the request failed, for example "id is required for update" or a Salesforce validation error.',
  usageExample: {
    scenario: 'A billing workflow updates a Salesforce opportunity\'s stage after a payment is confirmed in an external system.',
    inputValues: { operation: 'update', instanceUrl: 'https://yourcompany.my.salesforce.com', accessToken: '', resource: 'Opportunity', fields: '{"StageName":"Closed Won"}' },
    expectedOutput: '{{$json.data}} is null; the absence of {{$json._error}} confirms the update succeeded. Run a follow-up Get to see the changed record.',
  },
  externalDocsUrl: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_sobject_retrieve.htm',
};

const deleteOperation: OperationDoc = {
  name: 'Delete',
  value: 'delete',
  description: 'Permanently deletes an existing Salesforce record identified by ID via DELETE /services/data/v59.0/sobjects/{resource}/{id}.',
  fields: [...sharedFields, idField],
  outputExample: {
    operation: 'delete',
    resource: 'Contact',
    data: { deleted: true, id: '003xx000004TmiQAAS' },
  },
  outputDescription: 'operation/resource: echoed back from your configuration. data: a synthetic confirmation object built by this node (not returned by Salesforce, which sends HTTP 204 with no body) - deleted is always true on success, and id echoes back the deleted record\'s ID. _error: present only when the request failed, for example "id is required for delete" or a "not found" error.',
  usageExample: {
    scenario: 'A data-cleanup workflow removes duplicate test contacts created accidentally during an integration test run.',
    inputValues: { operation: 'delete', instanceUrl: 'https://yourcompany.my.salesforce.com', accessToken: '', resource: 'Contact' },
    expectedOutput: 'Salesforce confirms removal as {{$json.data.deleted}} and {{$json.data.id}}.',
  },
  externalDocsUrl: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_sobject_retrieve.htm',
};

const upsertOperation: OperationDoc = {
  name: 'Upsert',
  value: 'upsert',
  description: 'Inserts a new record or updates an existing one, matched by an External ID Field/Value rather than Salesforce\'s own record ID, via PATCH /services/data/v59.0/sobjects/{resource}/{externalIdField}/{externalIdValue}. Whether data is populated depends on whether Salesforce created a new record or updated an existing one - see Notes.',
  fields: [...sharedFields, externalIdFieldField, externalIdValueField, fieldsField],
  outputExample: {
    operation: 'upsert',
    resource: 'Contact',
    data: { id: '003xx000004TmiQAAS', success: true, errors: [] },
  },
  outputDescription: 'operation/resource: echoed back from your configuration. data: when Salesforce creates a brand-new record (no existing record matched the External ID Value), this is the same {id, success, errors} shape Create returns. When Salesforce instead updates an existing matched record, Salesforce returns HTTP 204 with no body, so data is null instead - the same behavior as Update. _error: present only when the request failed, for example missing External ID Field/Value or a Salesforce validation error.',
  usageExample: {
    scenario: 'A nightly sync workflow upserts customer records from an external database, using that database\'s own primary key as the External ID Field so re-running the sync never creates duplicates.',
    inputValues: { operation: 'upsert', instanceUrl: 'https://yourcompany.my.salesforce.com', accessToken: '', resource: 'Contact', externalIdField: 'CustomId__c', externalIdValue: '{{$json.customerId}}' },
    expectedOutput: 'Salesforce returns {{$json.data.id}} if a new record was created, or {{$json.data}} = null if an existing record was updated instead.',
  },
  externalDocsUrl: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_sobject_upsert.htm',
};

const bulkCreateOperation: OperationDoc = {
  name: 'Bulk Create',
  value: 'bulkCreate',
  description: 'Creates up to 200 new Salesforce records in one request via POST /services/data/v59.0/composite/sobjects, using Salesforce\'s real Composite sObject Collections API. Each record in the Records Array is reported success/failure independently.',
  fields: [...sharedFields, recordsField],
  outputExample: {
    operation: 'bulkCreate',
    resource: 'Contact',
    data: [
      { id: '003xx000004TmiQAAS', success: true, errors: [] },
      { id: '003xx000004TmiRAAS', success: true, errors: [] },
    ],
  },
  outputDescription: 'operation/resource: echoed back from your configuration. data: an array with one {id, success, errors} result per entry in Records Array, in the same order submitted - a partial failure in one record does not stop the others from succeeding (allOrNone is set to false). _error: present only when the request itself failed to run, for example "records array is required for bulk operations".',
  usageExample: {
    scenario: 'An import workflow bulk-creates every row from a freshly uploaded CSV of new leads in a single Salesforce request.',
    inputValues: { operation: 'bulkCreate', instanceUrl: 'https://yourcompany.my.salesforce.com', accessToken: '', resource: 'Contact', records: '[{"LastName":"Chen","Email":"a@x.com"},{"LastName":"Smith","Email":"b@x.com"}]' },
    expectedOutput: 'Salesforce returns one result per submitted record as {{$json.data}}.',
  },
  externalDocsUrl: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_composite_sobjects_collections_create.htm',
};

const bulkUpdateOperation: OperationDoc = {
  name: 'Bulk Update',
  value: 'bulkUpdate',
  description: 'Updates up to 200 existing Salesforce records in one request via PATCH /services/data/v59.0/composite/sobjects, using Salesforce\'s real Composite sObject Collections API. Each entry in Records Array must include its own Id.',
  fields: [...sharedFields, recordsField],
  outputExample: {
    operation: 'bulkUpdate',
    resource: 'Contact',
    data: [
      { id: '003xx000004TmiQAAS', success: true, errors: [] },
    ],
  },
  outputDescription: 'operation/resource: echoed back from your configuration. data: an array with one {id, success, errors} result per entry in Records Array, in the same order submitted - a partial failure in one record does not stop the others from succeeding. _error: present only when the request itself failed to run.',
  usageExample: {
    scenario: 'A pricing-sync workflow bulk-updates a batch of Salesforce products after a price list changes upstream.',
    inputValues: { operation: 'bulkUpdate', instanceUrl: 'https://yourcompany.my.salesforce.com', accessToken: '', resource: 'Product2', records: '[{"Id":"01txx0000006abcAAA","Name":"Updated Product"}]' },
    expectedOutput: 'Salesforce returns one result per submitted record as {{$json.data}}.',
  },
  externalDocsUrl: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_composite_sobjects_collections_update.htm',
};

const bulkDeleteOperation: OperationDoc = {
  name: 'Bulk Delete',
  value: 'bulkDelete',
  description: 'Deletes multiple Salesforce records one at a time in a loop, NOT via Salesforce\'s real bulk-delete endpoint. Unlike Bulk Create/Update/Upsert (which use Salesforce\'s real Composite sObject Collections API and report per-record success/failure), this sends one individual DELETE request per record ID in a sequential loop - if any single delete fails partway through, the whole operation throws and stops, with no partial-success reporting. Each entry in Records Array only needs an Id (or lowercase id).',
  fields: [...sharedFields, recordsField],
  outputExample: {
    operation: 'bulkDelete',
    resource: 'Contact',
    data: [
      { id: '003xx000004TmiQAAS', deleted: true },
      { id: '003xx000004TmiRAAS', deleted: true },
    ],
  },
  outputDescription: 'operation/resource: echoed back from your configuration. data: an array of {id, deleted:true} confirmations, one per successfully deleted record, built by this node rather than returned by Salesforce. _error: present only when the request itself failed, for example "records with Id values are required for bulkDelete", or if any individual delete in the sequential loop fails partway through (stopping the rest).',
  usageExample: {
    scenario: 'A data-cleanup workflow bulk-removes a batch of duplicate test leads identified by an earlier Query step.',
    inputValues: { operation: 'bulkDelete', instanceUrl: 'https://yourcompany.my.salesforce.com', accessToken: '', resource: 'Lead', records: '[{"Id":"00Qxx0000004abcAAA"},{"Id":"00Qxx0000004abdAAA"}]' },
    expectedOutput: 'Salesforce confirms each deletion as {{$json.data}}, an array of {id, deleted:true} entries.',
  },
  externalDocsUrl: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_sobject_retrieve.htm',
};

const bulkUpsertOperation: OperationDoc = {
  name: 'Bulk Upsert',
  value: 'bulkUpsert',
  description: 'Inserts or updates up to 200 records in one request via PATCH /services/data/v59.0/composite/sobjects/{resource}/{externalIdField}, matched by an External ID Field rather than Salesforce\'s own record ID (defaults to Id if External ID Field is left blank).',
  fields: [...sharedFields, externalIdFieldField, recordsField],
  outputExample: {
    operation: 'bulkUpsert',
    resource: 'Contact',
    data: [
      { id: '003xx000004TmiQAAS', success: true, errors: [], created: true },
    ],
  },
  outputDescription: 'operation/resource: echoed back from your configuration. data: an array with one {id, success, errors, created} result per entry in Records Array, in the same order submitted - created indicates whether Salesforce made a brand-new record or matched an existing one for that entry. _error: present only when the request itself failed to run, for example a missing Records Array.',
  usageExample: {
    scenario: 'A nightly sync workflow bulk-upserts customer records from an external database using that database\'s own primary key as the External ID Field.',
    inputValues: { operation: 'bulkUpsert', instanceUrl: 'https://yourcompany.my.salesforce.com', accessToken: '', resource: 'Contact', externalIdField: 'CustomId__c', records: '[{"CustomId__c":"CUST-1","LastName":"Chen"}]' },
    expectedOutput: 'Salesforce returns one result per submitted record as {{$json.data}}, each showing whether it was newly created.',
  },
  externalDocsUrl: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_composite_sobjects_collections_upsert.htm',
};

export const salesforceDoc: NodeDoc = {
  slug: 'salesforce',
  displayName: 'Salesforce',
  category: 'CRM',
  logoUrl: '/icons/nodes/salesforce.svg',
  description: 'Query (SOQL), search (SOSL), get, create, update, delete, upsert, or bulk-process Salesforce records across any standard or custom object.',
  credentialType: 'Salesforce OAuth2',
  credentialSetupSteps: [
    'What this is: The Salesforce connection lets CtrlChecks store your Salesforce OAuth2 access token safely in Connections, instead of pasting it into every workflow that uses Salesforce.',
    'How to connect: In CtrlChecks, open Connections -> Add Connection -> Salesforce, then choose Connect Salesforce to sign in with OAuth2. CtrlChecks tests the connection with GET https://login.salesforce.com/services/oauth2/userinfo.',
    'Once saved, the connection is injected automatically into the node\'s OAuth2 Access Token field at run time - you do not need to fill it directly. Instance URL is NOT auto-filled from the connection, since a token is only valid for the specific org instance it was issued for - type your org\'s Instance URL directly on every node.',
    'Important: Treat the OAuth2 access token like a bank password. Store it in Connections, not in a plain workflow field, and never share it outside CtrlChecks.',
    'Test it: Save the connection, add a Salesforce node with Operation set to query and a simple SOQL Query (for example SELECT Id, Name FROM Contact LIMIT 1), run it, and confirm CtrlChecks returns real Salesforce data instead of an authentication error.',
    'Connect the Salesforce output to a logging, If/Else, or follow-up node when later steps should inspect {{$json.data}}. Downstream service node account connection setup is still required for nodes after Salesforce; this connection only authorizes Salesforce CRM operations.',
  ],
  credentialDocsUrl: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_oauth_and_connected_apps.htm',
  resources: [
    {
      name: 'Operations',
      description: 'Salesforce CRM actions available on this node. All 11 dropdown values (Query, Search, Get, Create, Update, Delete, Upsert, and 4 Bulk operations) are real and implemented - this is one of the most accurately-matched CRM nodes in this product, though Bulk Delete uses a one-at-a-time loop rather than Salesforce\'s true bulk API (see that operation\'s notes).',
      operations: [queryOperation, searchOperation, getOperation, createOperation, updateOperation, deleteOperation, upsertOperation, bulkCreateOperation, bulkUpdateOperation, bulkDeleteOperation, bulkUpsertOperation],
    },
  ],
  commonErrors: [
    {
      error: 'accessToken is required',
      cause: 'No OAuth2 Access Token was typed on the node and no Salesforce connection is saved in Connections for this workflow/user.',
      fix: 'Connect Salesforce in CtrlChecks -> Connections -> Salesforce, or paste an access token directly into the node for a quick test.',
    },
    {
      error: 'instanceUrl is required',
      cause: 'The Instance URL field was left empty - this value is never auto-filled from a saved connection.',
      fix: 'Type your organization\'s full Salesforce instance URL, for example https://yourcompany.my.salesforce.com.',
    },
    {
      error: 'soql is required for query',
      cause: 'Query was run with the SOQL Query field left empty.',
      fix: 'Fill the SOQL Query field with a valid SOQL statement, for example SELECT Id, Name FROM Contact LIMIT 10.',
    },
    {
      error: 'id is required for get',
      cause: 'Get, Update, or Delete was run with the Record ID field left empty.',
      fix: 'Fill the Record ID field with the Salesforce ID of the record to fetch, change, or remove.',
    },
    {
      error: 'externalIdField and externalIdValue are required for upsert',
      cause: 'Upsert was run without both the External ID Field and External ID Value filled in.',
      fix: 'Fill both the External ID Field (a Salesforce custom field marked as an External ID) and External ID Value (the value to match).',
    },
    {
      error: 'records array is required for bulk operations',
      cause: 'A Bulk operation was run with the Records Array field left empty or not a valid JSON array.',
      fix: 'Fill the Records Array field with a JSON array of record objects.',
    },
    {
      error: 'Unsupported Salesforce operation: <operation>',
      cause: 'The Operation field held a value the execution engine does not recognize.',
      fix: 'Choose one of Query, Search, Get, Create, Update, Delete, Upsert, Bulk Create, Bulk Update, Bulk Delete, or Bulk Upsert from the Operation dropdown.',
    },
  ],
  relatedNodes: [],
};
