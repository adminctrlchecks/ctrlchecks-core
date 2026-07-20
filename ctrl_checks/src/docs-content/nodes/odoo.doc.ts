import type { NodeDoc, OperationDoc, FieldDoc } from '../types';

const urlField: FieldDoc = {
  name: 'Odoo URL',
  internalKey: 'url',
  type: 'url',
  required: true,
  description: 'The base web address of your Odoo instance.',
  helpText: "What this field is: The base web address of your Odoo installation - every request this node makes is built on top of this URL.\nWhy it matters: Without it, the node has nowhere to send its login request; every operation fails immediately if this is empty.\nWhen to fill it: Every time you add an Odoo node. There is a saved \"Odoo Credentials\" connection type in Connections, but it currently has no auto-fill wiring for this node (see the Password field's notes) - type this value directly every time.\nWhat to enter: Your Odoo instance's full base URL with no trailing slash needed, for example https://mycompany.odoo.com.\nWhere the value comes from: The address you use to log into Odoo in your browser.\nHow to use it later: Not included in the output, but it determines which Odoo instance every {{$json.data}} result comes from.\nAccepted format: A full https:// URL.\nReal workplace example: https://mycompany.odoo.com for an Odoo Online instance named mycompany.\nIf it is empty or wrong: An empty URL returns {{$json._error}} = \"Odoo URL is required\"; a wrong URL causes the login request to fail to connect.\nCommon mistake: Pointing this at an individual Odoo app URL (like a specific record's edit page) instead of the instance's root URL.",
  placeholder: 'https://mycompany.odoo.com',
  example: 'https://mycompany.odoo.com',
};

const dbField: FieldDoc = {
  name: 'Database',
  internalKey: 'db',
  type: 'text',
  required: true,
  description: 'The Odoo database name for your instance.',
  helpText: "What this field is: The internal database name Odoo uses to identify your specific company/instance, which can differ from your subdomain.\nWhy it matters: Odoo's login API requires the exact database name alongside your URL, username, and password - a wrong or missing database name fails authentication even with correct credentials.\nWhen to fill it: Every time you add an Odoo node; there is no fallback if this is empty.\nWhat to enter: Your Odoo database name exactly as your administrator or Odoo's own login screen shows it - for Odoo Online, this is often the same as your subdomain, but not always.\nWhere the value comes from: Odoo's own database selector screen (if your instance shows one at login), or ask your Odoo administrator.\nHow to use it later: Not included in the output.\nAccepted format: The exact database name string, case-sensitive.\nReal workplace example: mycompany-prod for a company's production Odoo database.\nIf it is empty or wrong: An empty value returns {{$json._error}} = \"Odoo database name is required\"; a wrong name returns \"Odoo authentication failed: invalid credentials or database\".\nCommon mistake: Assuming the database name always matches the URL subdomain - on some self-hosted or multi-database Odoo setups, it does not.",
  placeholder: 'mycompany',
  example: 'mycompany',
};

const usernameField: FieldDoc = {
  name: 'Username',
  internalKey: 'username',
  type: 'text',
  required: true,
  description: 'Your Odoo login username, usually an email address.',
  helpText: "What this field is: The username (usually an email address) you normally use to sign in to Odoo.\nWhy it matters: This node authenticates as a real Odoo user on every run, obtaining a fresh session for that user - without it, login fails immediately.\nWhen to fill it: Every time you add an Odoo node.\nWhat to enter: The exact username or email address you use to log into this Odoo instance.\nWhere the value comes from: Your own Odoo login credentials, or a dedicated integration user account your administrator sets up for automation.\nHow to use it later: Not included in the output.\nAccepted format: A username or email address string exactly as Odoo expects it.\nReal workplace example: automation@mycompany.com for a dedicated integration user account.\nIf it is empty or wrong: An empty value returns {{$json._error}} = \"Odoo username is required\"; a wrong username returns \"Odoo authentication failed: invalid credentials or database\".\nCommon mistake: Using a personal admin account instead of a dedicated integration user - if the admin's password changes or their account is disabled, every workflow using this node breaks.",
  placeholder: 'admin',
  example: 'admin',
};

const passwordField: FieldDoc = {
  name: 'Password / API Key',
  internalKey: 'password',
  type: 'password',
  required: true,
  description: 'Your Odoo password or API key. Important: there is a saved "Odoo Credentials" connection type in Connections, but it does not currently auto-fill this node - see Notes.',
  notes: "A credential type called \"Odoo Credentials\" exists in Connections (fields: URL, Database, Username, Password) and can be saved and tested there. However, grepping worker/src/services/connectors/connector-registry.ts found no connector registered for the 'odoo' node type, and the credential type's own injection rule in credential-type-registry.ts is empty. This means saving an Odoo connection today does not automatically fill in this node's URL/Database/Username/Password fields at run time - all four must currently be typed directly on every Odoo node, the same way they would be without any saved connection at all.",
  helpText: "What this field is: Your Odoo account password, or (on Odoo 14+) an API key generated as a safer alternative to your real password.\nWhy it matters: This node logs in as a real Odoo user on every single run (not just once) - this value is required for that login to succeed.\nWhen to fill it: Every time you add an Odoo node. See Notes - a saved Odoo Credentials connection exists in CtrlChecks Connections, but it is not currently wired to auto-fill this field, so type the value directly here regardless.\nWhat to enter: Your Odoo account password, or an Odoo API key (recommended over a real password on Odoo 14+).\nWhere the value comes from: Odoo -> your user avatar -> My Profile -> Account Security -> New API Key (Odoo 14+), or your normal Odoo login password.\nHow to use it later: Never included in the node output.\nAccepted format: A single password or API key string.\nReal workplace example: Generate a dedicated API key for a service/automation account rather than reusing a personal password, so it can be revoked independently.\nIf it is empty or wrong: An empty value returns {{$json._error}} = \"Odoo password is required\"; a wrong password/key returns \"Odoo authentication failed: invalid credentials or database\".\nCommon mistake: Saving this in the \"Odoo Credentials\" Connections entry and assuming that alone is enough - today it is not; you must still type the same value on the node itself.",
  placeholder: 'your-password-or-api-key',
};

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'The Odoo action to run.',
  options: ['getRecords', 'createRecord', 'updateRecord', 'deleteRecord', 'executeMethod'],
  helpText: "What this field is: The dropdown that tells this node which Odoo action to run against the selected Model.\nWhy it matters: Odoo needs to know whether you are reading, creating, changing, removing, or running a custom method before it can build the right JSON-RPC call.\nWhen to fill it: Every time you add an Odoo node - all 5 values here are real and fully implemented.\nWhat to enter: Choose Get Records to search/list records, Create Record to add a new one, Update Record to change an existing record by ID, Delete Record to remove a record by ID, or Execute Method to call any other method Odoo exposes on the model (for example confirming a sale order).\nWhere the value comes from: Chosen directly in the Properties Panel; it is rarely set dynamically since the required fields differ per operation.\nHow to use it later: Downstream nodes read {{$json.data}} for the result, regardless of which operation ran; {{$json.operation}} and {{$json.model}} are also echoed back.\nAccepted format: One of getRecords, createRecord, updateRecord, deleteRecord, executeMethod (case-sensitive).\nReal workplace example: Set Operation to getRecords with Model set to res.partner to pull every customer contact matching a filter.\nIf it is empty or wrong: An empty value defaults to getRecords; an unrecognized value returns {{$json._error}} = \"Unknown operation: ...\".\nCommon mistake: Assuming there are more operations than these 5 (for example a dedicated \"search\" or \"count\" operation) - anything beyond these 5 must go through Execute Method, calling the underlying Odoo model method directly (for example search_count).",
  placeholder: 'getRecords',
  example: 'getRecords',
  defaultValue: 'getRecords',
};

const modelField: FieldDoc = {
  name: 'Model',
  internalKey: 'model',
  type: 'text',
  required: true,
  description: 'The Odoo model (table) this operation works with, using its technical name.',
  helpText: "What this field is: The technical name of the Odoo model (Odoo calls these \"models\", similar to database tables) that every operation works against.\nWhy it matters: Every Odoo JSON-RPC call needs an exact model name - the wrong one either returns an access error or silently queries the wrong data.\nWhen to fill it: Every time you add an Odoo node; it is required for every operation, including Execute Method.\nWhat to enter: The exact technical model name, for example res.partner for contacts/customers, sale.order for sales orders, or account.move for invoices.\nWhere the value comes from: Enable Developer Mode in Odoo (Settings -> General Settings -> scroll to Developer Tools), then check a record's technical model name via Settings -> Technical -> Database Structure -> Models, or hover over a form's debug icon.\nHow to use it later: Echoed back as {{$json.model}} on every run so downstream nodes can confirm which model was used.\nAccepted format: A dotted technical name exactly as Odoo defines it, for example res.partner (not \"Contact\" or \"Customer\").\nReal workplace example: res.partner to work with customer and vendor contact records.\nIf it is empty or wrong: An empty value returns {{$json._error}} = \"Odoo model is required (e.g. res.partner)\"; a wrong or nonexistent model name returns an Odoo API error inside {{$json._error}}.\nCommon mistake: Typing the display name shown in the Odoo UI (like \"Contacts\") instead of the technical model name (res.partner) - Odoo's API only understands technical names.",
  placeholder: 'res.partner',
  example: 'res.partner',
};

const domainField: FieldDoc = {
  name: 'Domain Filter',
  internalKey: 'domain',
  type: 'json',
  required: false,
  description: 'An Odoo domain filter array, used by Get Records to narrow which records come back.',
  helpText: "What this field is: A filter written in Odoo's own \"domain\" syntax - a list of [field, operator, value] conditions, similar to a WHERE clause.\nWhy it matters: Without a filter, Get Records returns every record of the chosen Model up to Limit, with no targeting - this field lets you fetch only records matching specific conditions.\nWhen to fill it: Optional for Get Records; ignored for every other operation.\nWhat to enter: A JSON array of Odoo domain conditions, for example [[\"customer_rank\", \">\", 0]] to find only contacts that are customers.\nWhere the value comes from: Write it manually following Odoo's domain syntax reference, or map a dynamic value such as [[\"email\", \"=\", \"{{$json.email}}\"]].\nHow to use it later: Only matching records appear inside {{$json.data}}.\nAccepted format: A JSON array of arrays, each in the form [\"field_name\", \"operator\", value] - multiple conditions are implicitly combined with AND unless you use Odoo's explicit & / | / ! prefix operators.\nReal workplace example: [[\"customer_rank\", \">\", 0], [\"active\", \"=\", true]] to find only active customer contacts.\nIf it is empty or wrong: Left empty, Get Records applies no filter and returns everything up to Limit; invalid domain syntax returns an Odoo API error inside {{$json._error}}.\nCommon mistake: Writing a single condition without the outer array-of-arrays wrapper (using [\"customer_rank\", \">\", 0] instead of [[\"customer_rank\", \">\", 0]]) - Odoo's domain format always needs the outer array even for one condition.",
  placeholder: '[["active", "=", true]]',
  example: '[["active", "=", true]]',
};

const fieldsField: FieldDoc = {
  name: 'Fields',
  internalKey: 'fields',
  type: 'json',
  required: false,
  description: 'A list of technical field names to return from Get Records. Leave empty to return every field.',
  helpText: "What this field is: A list of the specific Odoo technical field names you want returned for each record.\nWhy it matters: Odoo records can have dozens of fields - narrowing the response to only what you need makes the output smaller and easier to work with.\nWhen to fill it: Optional for Get Records; ignored for every other operation.\nWhat to enter: A JSON array of technical field names, for example [\"id\", \"name\", \"email\"].\nWhere the value comes from: The same Developer Mode technical field list used for Model, or Odoo's own external API documentation for common models.\nHow to use it later: Each record inside {{$json.data}} will only contain the listed fields (plus id, which Odoo always includes).\nAccepted format: A JSON array of field-name strings, for example [\"id\", \"name\", \"email\"].\nReal workplace example: [\"id\", \"name\", \"email\", \"phone\"] to fetch only a contact's core details instead of every field Odoo stores.\nIf it is empty or wrong: Left empty, Odoo returns every field defined on the model, which can be a very large response; an unrecognized field name is generally ignored by Odoo rather than causing an error.\nCommon mistake: Using the field's display label (like \"Email Address\") instead of its technical name (email) - check Developer Mode for the exact technical names.",
  placeholder: '["id", "name", "email"]',
  example: '["id", "name", "email"]',
};

const limitField: FieldDoc = {
  name: 'Limit',
  internalKey: 'limit',
  type: 'number',
  required: false,
  description: 'Maximum number of records to return from Get Records.',
  helpText: "What this field is: The maximum number of records this node asks Odoo for in one Get Records request.\nWhy it matters: Without a limit, a large model could return a very large response in a single run - this caps how many records come back.\nWhen to fill it: Optional for Get Records; ignored for every other operation.\nWhat to enter: A whole number representing how many records you want per run.\nWhere the value comes from: Type it directly based on how many records you realistically need; combine with Offset to page through more than one batch.\nHow to use it later: The array inside {{$json.data}} will contain at most this many records.\nAccepted format: A positive whole number.\nReal workplace example: 100 to pull a manageable batch of customer contacts for a nightly sync.\nIf it is empty or wrong: Left empty, this defaults to 100.\nCommon mistake: Assuming a high Limit alone retrieves an entire large table in one run - use Offset in a Loop node to page through additional batches instead.",
  placeholder: '100',
  defaultValue: '100',
};

const offsetField: FieldDoc = {
  name: 'Offset',
  internalKey: 'offset',
  type: 'number',
  required: false,
  description: 'Pagination offset for Get Records - how many matching records to skip before returning results.',
  helpText: "What this field is: The number of matching records to skip before Odoo starts returning results, for Get Records.\nWhy it matters: Combined with Limit, this lets a workflow page through a model's records in batches rather than in one huge request.\nWhen to fill it: Optional for Get Records; ignored for every other operation.\nWhat to enter: A whole number - 0 for the first page, Limit for the second page, 2 x Limit for the third page, and so on.\nWhere the value comes from: Computed by a Loop node that increments this value by Limit on each iteration until Get Records returns fewer than Limit records.\nHow to use it later: Not applicable to this node's own output - it only affects which slice of records {{$json.data}} contains on this run.\nAccepted format: A non-negative whole number.\nReal workplace example: Set Limit to 100 and Offset to {{$json.pageNumber * 100}} inside a Loop node to page through a large customer list.\nIf it is empty or wrong: Left empty, this defaults to 0 (the first page).\nCommon mistake: Forgetting that Domain Filter conditions apply before Limit/Offset pagination - the offset counts filtered records, not the model's entire unfiltered record count.",
  placeholder: '0',
  defaultValue: '0',
};

const valuesField: FieldDoc = {
  name: 'Field Values',
  internalKey: 'values',
  type: 'json',
  required: false,
  description: 'The Odoo field values to create or update on a record, keyed by technical field name.',
  helpText: "What this field is: The Odoo field values (using technical field names) to create a new record or change an existing one.\nWhy it matters: Odoo's API only understands technical field names like name or email, not the display labels shown in the Odoo UI, so this field is where those exact names go.\nWhen to fill it: Required for Create Record and Update Record. It has no effect on Get Records, Delete Record, or Execute Method.\nWhat to enter: A JSON object whose keys are Odoo technical field names, for example {\"name\":\"Acme Corp\",\"email\":\"info@acme.com\"}.\nWhere the value comes from: Check Developer Mode's technical field list for the model you are working with, or map values from an earlier node such as {{$json.companyName}}.\nHow to use it later: Not echoed back directly - Create Record returns only the new record's ID, and Update Record returns only true, not the saved field values (see those operations' output descriptions).\nAccepted format: Valid JSON wrapped in { } with technical field names as keys.\nReal workplace example: {\"name\":\"{{$json.formCompanyName}}\",\"email\":\"{{$json.formEmail}}\"} to create a new contact from a signup form.\nIf it is empty or wrong: An empty Field Values object on Create/Update is passed through as an empty object, which Odoo may accept (creating a blank record) or reject depending on the model's own required-field rules; unknown field names are rejected by Odoo's own API validation.\nCommon mistake: Typing the label shown in the Odoo UI (like \"Company Name\") instead of the technical field name (name) - Odoo rejects unrecognized keys rather than guessing what you meant.",
  placeholder: '{"name":"Acme Corp","email":"info@acme.com"}',
  example: '{"name":"Acme Corp","email":"info@acme.com"}',
};

const recordIdField: FieldDoc = {
  name: 'Record ID',
  internalKey: 'recordId',
  type: 'number',
  required: false,
  description: 'The Odoo record ID (an integer, not a GUID) for Update Record and Delete Record.',
  helpText: "What this field is: The numeric ID Odoo assigned to a specific record.\nWhy it matters: Update Record and Delete Record both target one specific record, and this ID is the only way the node knows which one.\nWhen to fill it: Required whenever Operation is Update Record or Delete Record. Not used for Get Records, Create Record, or Execute Method (Execute Method can still target specific IDs through its own Method Arguments field instead).\nWhat to enter: The numeric record ID exactly as Odoo shows it, for example in a record's form-view URL such as .../odoo/contacts/42, the ID is 42.\nWhere the value comes from: Copy it from the Odoo web UI URL, or use {{$json.data.0.id}} from an earlier Get Records step, or the ID returned by an earlier Create Record step.\nHow to use it later: Not echoed back as its own key by Update Record (only true), but Delete Record's success shape confirms the deletion happened.\nAccepted format: A plain integer, unlike Microsoft Dynamics or many other CRM nodes which use GUID-style IDs.\nReal workplace example: Use an ID from an earlier Get Records or Create Record step in the same workflow to immediately Update Record or Delete Record that exact record.\nIf it is empty or wrong: An empty Record ID on Update/Delete returns {{$json._error}} = \"recordId is required for updateRecord\" (or \"...for deleteRecord\"); a wrong ID returns an Odoo \"record does not exist\" error.\nCommon mistake: Pasting a GUID-style ID from a different system (like Microsoft Dynamics) - Odoo record IDs are always plain integers.",
  placeholder: '42',
  example: '42',
};

const methodField: FieldDoc = {
  name: 'Method Name',
  internalKey: 'method',
  type: 'text',
  required: false,
  description: 'The Odoo model method to call directly (required for Execute Method).',
  helpText: "What this field is: The name of any method Odoo exposes on the chosen Model, called directly through Odoo's JSON-RPC API.\nWhy it matters: Odoo models expose many methods beyond basic create/read/update/delete (for example confirming a sale order, or triggering an invoice payment) - this field is how you reach any of them from a workflow.\nWhen to fill it: Required whenever Operation is Execute Method. Ignored for every other operation.\nWhat to enter: The exact Python method name Odoo exposes on the model, for example action_confirm to confirm a sale order.\nWhere the value comes from: Odoo's own developer/technical documentation for the model you are working with, or your Odoo developer's knowledge of the model's available methods.\nHow to use it later: The method's return value comes back as {{$json.data}}, whatever shape that method itself returns.\nAccepted format: A valid Python method name exactly as defined on the Odoo model.\nReal workplace example: action_confirm on sale.order to confirm a draft sales quotation, turning it into a confirmed sales order.\nIf it is empty or wrong: An empty Method Name on Execute Method returns {{$json._error}} = \"method is required for executeMethod\"; an unknown or inaccessible method name returns an Odoo API error inside {{$json._error}}.\nCommon mistake: Assuming any method name will work regardless of the current user's permissions - Odoo enforces the same access rules for JSON-RPC calls as it does inside the Odoo UI, so the logged-in user (Username/Password) must have rights to call that method.",
  placeholder: 'action_confirm',
  example: 'action_confirm',
};

const methodArgsField: FieldDoc = {
  name: 'Method Arguments',
  internalKey: 'methodArgs',
  type: 'json',
  required: false,
  description: 'Positional arguments passed to the custom method, for Execute Method.',
  helpText: "What this field is: A list of positional arguments passed to the method named in Method Name, in the exact order that Odoo method expects them.\nWhy it matters: Most Odoo methods take arguments (often starting with a list of record IDs to act on) - without the right arguments, the method call fails or does the wrong thing.\nWhen to fill it: Optional for Execute Method, used whenever the target method needs positional arguments beyond the model/method name themselves. Ignored for every other operation.\nWhat to enter: A JSON array of arguments in the order the method expects, for example [[42]] to pass a single record ID as the first positional argument.\nWhere the value comes from: The method's own Odoo source code or developer documentation, which defines its expected argument order and types.\nHow to use it later: Not echoed back directly - only the method's own return value appears as {{$json.data}}.\nAccepted format: A JSON array, defaulting to an empty array [] if left blank.\nReal workplace example: [[42, 43]] to call action_confirm on two specific sale order IDs at once.\nIf it is empty or wrong: Left empty, an empty array [] is sent, which many zero-argument methods accept fine; a wrong argument count or type returns an Odoo API error inside {{$json._error}}.\nCommon mistake: Passing a single ID as a bare number (42) instead of Odoo's expected list-of-IDs format ([42]) - most Odoo record methods expect a list of IDs as their first argument, even when acting on just one record.",
  placeholder: '[]',
};

const methodKwargsField: FieldDoc = {
  name: 'Method Keyword Arguments',
  internalKey: 'methodKwargs',
  type: 'json',
  required: false,
  description: 'Keyword arguments passed to the custom method, for Execute Method.',
  helpText: "What this field is: A JSON object of named (keyword) arguments passed to the method named in Method Name, alongside any positional Method Arguments.\nWhy it matters: Some Odoo methods accept optional named parameters (for example a specific context flag) - this field is how you supply those.\nWhen to fill it: Optional for Execute Method, only needed when the target method accepts or requires keyword arguments. Ignored for every other operation.\nWhat to enter: A JSON object whose keys match the method's expected keyword-argument names, for example {\"context\":{\"lang\":\"en_US\"}}.\nWhere the value comes from: The method's own Odoo source code or developer documentation.\nHow to use it later: Not echoed back directly - only the method's own return value appears as {{$json.data}}.\nAccepted format: A JSON object, defaulting to an empty object {} if left blank (this node always adds an empty context object automatically if you do not supply one).\nReal workplace example: {\"context\":{\"lang\":\"en_US\", \"tz\":\"America/New_York\"}} to run a method under a specific language/timezone context.\nIf it is empty or wrong: Left empty, only the default empty context is sent; an unrecognized keyword argument name is generally rejected by the underlying Python method with an Odoo API error inside {{$json._error}}.\nCommon mistake: Confusing this with Method Arguments (positional) - keyword arguments must be named exactly as the method's Python signature defines them, in a JSON object, not a plain array.",
  placeholder: '{}',
};

const sharedFields: FieldDoc[] = [urlField, dbField, usernameField, passwordField, operationField, modelField];

const getRecordsOperation: OperationDoc = {
  name: 'Get Records',
  value: 'getRecords',
  description: 'Searches and reads records from the chosen Odoo model via the search_read JSON-RPC method, optionally narrowed with a Domain Filter and limited by Fields/Limit/Offset.',
  fields: [...sharedFields, domainField, fieldsField, limitField, offsetField],
  outputExample: {
    success: true,
    operation: 'getRecords',
    model: 'res.partner',
    data: [
      { id: 42, name: 'Acme Corp', email: 'info@acme.com' },
      { id: 43, name: 'Beta LLC', email: 'contact@beta.com' },
    ],
    error: null,
  },
  outputDescription: 'success: true when Odoo accepted the request. operation: echoes back "getRecords". model: echoes back the model that was queried. data: the array of matching Odoo records, limited to the fields requested (or all fields if Fields is empty). error: always null on success - a real failure returns {{$json._error}} instead, not this key.',
  usageExample: {
    scenario: 'A sales reporting workflow pulls every active customer contact matching a filter to build a weekly outreach list.',
    inputValues: { url: 'https://mycompany.odoo.com', db: 'mycompany', username: 'admin', password: '', operation: 'getRecords', model: 'res.partner' },
    expectedOutput: 'Odoo returns matching records as {{$json.data}}, which a Loop node can iterate.',
  },
  externalDocsUrl: 'https://www.odoo.com/documentation/16.0/developer/reference/external_api.html',
};

const createRecordOperation: OperationDoc = {
  name: 'Create Record',
  value: 'createRecord',
  description: 'Creates a new record on the chosen Odoo model via the create JSON-RPC method, using the Field Values payload. Only the new record\'s ID comes back - the saved field values are not returned.',
  fields: [...sharedFields, valuesField],
  outputExample: {
    success: true,
    operation: 'createRecord',
    model: 'res.partner',
    data: 44,
    error: null,
  },
  outputDescription: 'success: true when Odoo accepted the create request. operation: echoes back "createRecord". model: echoes back the model. data: the new record\'s numeric ID (Odoo\'s create method returns just the ID, not the record itself) - needed for a later Update Record or Delete Record step. error: always null on success.',
  usageExample: {
    scenario: 'A signup-form workflow creates a new Odoo contact for every visitor who submits their company name and email.',
    inputValues: { url: 'https://mycompany.odoo.com', db: 'mycompany', username: 'admin', password: '', operation: 'createRecord', model: 'res.partner', values: '{"name":"{{$json.formCompanyName}}","email":"{{$json.formEmail}}"}' },
    expectedOutput: 'Odoo returns the new record\'s ID directly as {{$json.data}}, for use in a later Update Record step.',
  },
  externalDocsUrl: 'https://www.odoo.com/documentation/16.0/developer/reference/external_api.html',
};

const updateRecordOperation: OperationDoc = {
  name: 'Update Record',
  value: 'updateRecord',
  description: 'Updates an existing record identified by Record ID via the write JSON-RPC method, using the Field Values payload. No updated field data comes back - only a boolean confirmation.',
  fields: [...sharedFields, recordIdField, valuesField],
  outputExample: {
    success: true,
    operation: 'updateRecord',
    model: 'res.partner',
    data: true,
    error: null,
  },
  outputDescription: 'success: true when Odoo accepted the update request. operation: echoes back "updateRecord". model: echoes back the model. data: Odoo\'s write method returns a plain boolean (true) confirming the write succeeded - it does NOT return the updated field values; run a follow-up Get Records step with the same Record ID to see the saved data. error: always null on success.',
  usageExample: {
    scenario: 'A billing workflow updates a customer\'s payment terms field after they sign a new contract in an external system.',
    inputValues: { url: 'https://mycompany.odoo.com', db: 'mycompany', username: 'admin', password: '', operation: 'updateRecord', model: 'res.partner', recordId: '{{$json.contactId}}', values: '{"email":"newemail@acme.com"}' },
    expectedOutput: 'Odoo confirms the update with {{$json.data}} = true; use a follow-up Get Records step to see the changed record.',
  },
  externalDocsUrl: 'https://www.odoo.com/documentation/16.0/developer/reference/external_api.html',
};

const deleteRecordOperation: OperationDoc = {
  name: 'Delete Record',
  value: 'deleteRecord',
  description: 'Permanently deletes an existing record identified by Record ID via the unlink JSON-RPC method. This action cannot be undone once it completes.',
  fields: [...sharedFields, recordIdField],
  outputExample: {
    success: true,
    operation: 'deleteRecord',
    model: 'res.partner',
    data: true,
    error: null,
  },
  outputDescription: 'success: true when Odoo accepted the delete request. operation: echoes back "deleteRecord". model: echoes back the model. data: Odoo\'s unlink method returns a plain boolean (true) confirming the deletion - there is no record object to read here. error: always null on success.',
  usageExample: {
    scenario: 'A data-cleanup workflow removes duplicate test contacts created accidentally during an integration test run.',
    inputValues: { url: 'https://mycompany.odoo.com', db: 'mycompany', username: 'admin', password: '', operation: 'deleteRecord', model: 'res.partner', recordId: '{{$json.contactId}}' },
    expectedOutput: 'Odoo confirms removal as {{$json.data}} = true.',
  },
  externalDocsUrl: 'https://www.odoo.com/documentation/16.0/developer/reference/external_api.html',
};

const executeMethodOperation: OperationDoc = {
  name: 'Execute Method',
  value: 'executeMethod',
  description: 'Calls any method Odoo exposes on the chosen model directly via JSON-RPC, using Method Name plus optional Method Arguments and Method Keyword Arguments. Use this for anything beyond basic create/read/update/delete, such as confirming a sale order.',
  fields: [...sharedFields, methodField, methodArgsField, methodKwargsField],
  outputExample: {
    success: true,
    operation: 'executeMethod',
    model: 'sale.order',
    data: true,
    error: null,
  },
  outputDescription: 'success: true when Odoo accepted the method call. operation: echoes back "executeMethod". model: echoes back the model. data: whatever the called method itself returns - this varies by method (a boolean, a number, an object, or an array), so check the specific Odoo method\'s own documentation for its return shape. error: always null on success.',
  usageExample: {
    scenario: 'A sales-automation workflow confirms a draft sales quotation as soon as a customer accepts a proposal in an external e-signature tool.',
    inputValues: { url: 'https://mycompany.odoo.com', db: 'mycompany', username: 'admin', password: '', operation: 'executeMethod', model: 'sale.order', method: 'action_confirm', methodArgs: '[[{{$json.orderId}}]]' },
    expectedOutput: 'Odoo runs the method and returns its result as {{$json.data}} - for action_confirm this is typically true.',
  },
  externalDocsUrl: 'https://www.odoo.com/documentation/16.0/developer/reference/external_api.html',
};

export const odooDoc: NodeDoc = {
  slug: 'odoo',
  displayName: 'Odoo',
  category: 'CRM',
  logoUrl: '/icons/nodes/odoo.svg',
  description: 'Search, read, create, update, or delete records in any Odoo model, or call a custom Odoo method, via JSON-RPC.',
  credentialType: 'Odoo Credentials (Connections entry exists, but does not currently auto-fill this node)',
  credentialSetupSteps: [
    'Important: A saved "Odoo Credentials" connection type exists in CtrlChecks Connections (URL, Database, Username, Password), but it is not currently wired to auto-fill this node\'s fields at run time - you must type URL, Database, Username, and Password directly on every Odoo node regardless of any saved connection.',
    'Where to start: If your Odoo instance is version 14 or later, generate a dedicated API key instead of using a real password - go to your Odoo user avatar -> My Profile -> Account Security -> New API Key.',
    'How to connect: Type your Odoo instance URL, Database name, Username, and Password (or API key) directly into this node\'s fields. This node authenticates as a real Odoo user and starts a fresh session on every single run.',
    'Important: Treat the Password/API Key field like a bank password - avoid pasting it into shared or logged locations, and remove it before sharing a workflow export, since it cannot currently be masked by a saved Connections entry the way most other nodes support.',
    'Test it: Fill all four credential fields, set Operation to Get Records with Model set to res.partner, run the node, and confirm CtrlChecks returns real Odoo contact data instead of an authentication error.',
    'Consider a dedicated integration user: use a separate Odoo user account (not your own personal login) for automation, so a password change or account issue on your personal account does not silently break every workflow using this node.',
    'Connect the Odoo output to a logging, If/Else, or follow-up node when later steps should inspect {{$json.data}}. Downstream service node account connection setup is still required for nodes after Odoo; this node only authorizes Odoo ERP operations.',
  ],
  credentialDocsUrl: 'https://www.odoo.com/documentation/16.0/developer/reference/external_api.html',
  resources: [
    {
      name: 'Operations',
      description: 'Odoo ERP actions available on this node: Get Records, Create Record, Update Record, Delete Record, and Execute Method (for any other Odoo model method). All 5 dropdown values are real and implemented.',
      operations: [getRecordsOperation, createRecordOperation, updateRecordOperation, deleteRecordOperation, executeMethodOperation],
    },
  ],
  commonErrors: [
    {
      error: 'Odoo URL is required',
      cause: 'The Odoo URL field was left empty when the node ran.',
      fix: 'Type your full Odoo instance URL into the Odoo URL field, for example https://mycompany.odoo.com.',
    },
    {
      error: 'Odoo authentication failed: invalid credentials or database',
      cause: 'The Database, Username, or Password/API Key does not match a valid Odoo login for this instance.',
      fix: 'Double-check the exact Database name, Username, and Password/API Key against a successful manual login to the same Odoo instance.',
    },
    {
      error: 'recordId is required for updateRecord',
      cause: 'Update Record or Delete Record was run with the Record ID field left empty.',
      fix: 'Fill the Record ID field with the numeric ID of the record to change or remove.',
    },
    {
      error: 'method is required for executeMethod',
      cause: 'Execute Method was run with the Method Name field left empty.',
      fix: 'Fill the Method Name field with the exact Odoo model method to call, for example action_confirm.',
    },
    {
      error: 'Unknown operation: <operation>',
      cause: 'The Operation field held a value outside the five recognized values.',
      fix: 'Choose one of Get Records, Create Record, Update Record, Delete Record, or Execute Method from the Operation dropdown.',
    },
    {
      error: 'Odoo API error: <message>',
      cause: 'Odoo rejected the JSON-RPC call itself - common causes are an unknown technical field name in Field Values, an invalid Domain Filter, or insufficient access rights for the logged-in user.',
      fix: 'Check Field Values/Domain Filter against Odoo\'s Developer Mode technical field names, and confirm the Username/Password account has access rights to the Model and method being called.',
    },
  ],
  relatedNodes: [],
};
