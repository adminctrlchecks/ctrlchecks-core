import type { NodeDoc, OperationDoc, FieldDoc } from '../types';

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'The Freshdesk action to run: Get, List, Create, Update, Delete, or Search.',
  options: ['get', 'list', 'create', 'update', 'delete', 'search'],
  helpText: "What this field is: The dropdown that tells this node which Freshdesk action to run against the selected Resource.\nWhy it matters: Freshdesk needs to know whether you are reading, listing, creating, changing, or removing a record before it can build the right web request.\nWhen to fill it: Every time you add a Freshdesk node - this field has no usable default and the execution engine reads it on every run.\nWhat to enter: Choose Get to fetch one record by ID, List to fetch every record of the chosen Resource, Create to add a new record, Update to change an existing record by ID, or Delete to remove a record by ID. Search appears in the dropdown but the execution engine does not implement it yet - selecting Search always returns an \"Unsupported operation\" error, so avoid it until it is implemented.\nWhere the value comes from: You pick it directly in the Properties Panel; it is rarely set dynamically from {{$json.operation}} because the required fields differ per operation.\nHow to use it later: Downstream nodes can branch on {{$json.item}}, {{$json.items}}, {{$json.created}}, {{$json.updated}}, or {{$json.deleted}} depending on which operation ran.\nAccepted format: One of get, list, create, update, delete, search (case-insensitive, matched exactly against these words).\nReal workplace example: Set Operation to List with Resource set to ticket to pull every open support ticket into the workflow for a daily digest.\nIf it is empty or wrong: An empty value defaults to get; an unrecognized value returns {{$json._error}} = \"Freshdesk: Unsupported operation ...\".\nCommon mistake: Selecting Search expecting a keyword search - it is present in the UI but not wired up in the backend, so it always fails; use List and filter the results with a downstream Filter node instead.",
  placeholder: 'list',
  example: 'list',
  defaultValue: 'list',
};

const resourceField: FieldDoc = {
  name: 'Resource',
  internalKey: 'resource',
  type: 'select',
  required: true,
  description: 'The Freshdesk entity type this operation works with.',
  options: ['ticket', 'contact', 'company', 'agent', 'group', 'time_entry'],
  helpText: "What this field is: The Freshdesk entity type - ticket, contact, company, agent, group, or time_entry - that the chosen Operation reads or writes.\nWhy it matters: This node builds the API path from this value (for example ticket becomes /tickets, contact becomes /contacts), so the wrong Resource sends the request to the wrong endpoint entirely.\nWhen to fill it: Every time you add a Freshdesk node; it is required on every run alongside Operation.\nWhat to enter: Pick ticket, contact, or company for the common, fully-tested paths. Agent and group also work because the node falls back to simple pluralization (agent -> agents, group -> groups). Avoid time_entry: the node pluralizes it as time_entrys instead of Freshdesk's real endpoint /time_entries, so Time Entry requests currently fail.\nWhere the value comes from: Chosen directly in the Properties Panel, or set dynamically with {{$json.resource}} when a previous node decides which entity to touch.\nHow to use it later: The resource you pick determines which output key downstream nodes read - {{$json.item}}/{{$json.items}} contain whatever fields Freshdesk returns for that entity type.\nAccepted format: One of ticket, contact, company, agent, group, time_entry (lowercase, matched exactly).\nReal workplace example: Set Resource to contact and Operation to create to add a new customer contact whenever a signup form is submitted.\nIf it is empty or wrong: An empty value falls back to ticket; an unrecognized value is pluralized with a trailing s and sent as-is, which usually returns a 404 from Freshdesk.\nCommon mistake: Choosing Time Entry expecting it to work like Ticket/Contact/Company - the endpoint path this node builds for it does not match Freshdesk's real API and the request will fail.",
  placeholder: 'ticket',
  example: 'ticket',
  defaultValue: 'ticket',
};

const domainField: FieldDoc = {
  name: 'Domain',
  internalKey: 'domain',
  type: 'url',
  required: true,
  description: 'Your Freshdesk domain (e.g., mycompany.freshdesk.com).',
  helpText: "What this field is: The full Freshdesk domain that this node calls, for example mycompany.freshdesk.com.\nWhy it matters: The node builds every request URL as https://<domain>/api/v2/..., so an incomplete or wrong domain sends every request to the wrong place and every operation fails immediately.\nWhen to fill it: Every time you add a Freshdesk node - Domain is never stored in the credential vault, so it must be typed on the node itself even after you connect Freshdesk in Connections.\nWhat to enter: Type your full Freshdesk subdomain including the .freshdesk.com suffix, exactly as it appears in your browser when you are logged into Freshdesk.\nWhere the value comes from: Look at the URL bar while logged into your Freshdesk account - it will read something like https://mycompany.freshdesk.com/a/tickets.\nHow to use it later: This value is not returned in the output, but it determines which account every {{$json.item}}, {{$json.items}}, {{$json.created}}, {{$json.updated}}, or {{$json.deleted}} result comes from.\nAccepted format: A bare hostname such as mycompany.freshdesk.com - do not include https:// or a trailing slash.\nReal workplace example: mycompany.freshdesk.com for a company whose Freshdesk portal is at https://mycompany.freshdesk.com.\nIf it is empty or wrong: An empty Domain immediately returns {{$json._error}} = \"Freshdesk: domain is required (e.g., mycompany.freshdesk.com)\"; a domain missing the .freshdesk.com suffix causes every request to fail to connect.\nCommon mistake: Typing only the short name shown in some UI placeholders (like \"yourcompany\") instead of the full mycompany.freshdesk.com hostname that the API actually needs.",
  placeholder: 'mycompany.freshdesk.com',
  example: 'mycompany.freshdesk.com',
};

const apiKeyField: FieldDoc = {
  name: 'Api Key',
  internalKey: 'apiKey',
  type: 'password',
  required: true,
  description: 'Freshdesk API key (optional on the node if stored in Connections under key "freshdesk").',
  helpText: "What this field is: Your personal Freshdesk API Key, a secret token that lets CtrlChecks act on your Freshdesk account without your account password.\nWhy it matters: Freshdesk authenticates every request with this key using HTTP Basic Auth (the key as the username, the letter X as the password) - without it, every operation returns an authentication error.\nWhen to fill it: Leave this field blank once you have saved a Freshdesk connection in CtrlChecks Connections; the node automatically retrieves the key from the credential vault at run time. Fill it directly only for a quick one-off test.\nWhat to enter: Paste the raw API Key value Freshdesk shows you, with no extra quotes or spaces.\nWhere the value comes from: In Freshdesk, click your profile picture (top-right) -> Profile Settings -> the API Key box on the right-hand side.\nHow to use it later: This value is never included in the node output, so downstream nodes cannot read it back - only the operation results ({{$json.item}}, {{$json.items}}, etc.) are passed along.\nAccepted format: A single alphanumeric token exactly as shown by Freshdesk, no \"Bearer\" prefix and no surrounding quotes.\nReal workplace example: Save the key once in Connections -> Add Connection -> Freshdesk API Key, then reuse the same saved connection across every Freshdesk node in every workflow.\nIf it is empty or wrong: An empty key with no saved connection returns {{$json._error}} = \"Freshdesk: apiKey not found. Provide apiKey or vault credential 'freshdesk'.\"; a wrong key returns a Freshdesk authentication failure.\nCommon mistake: Pasting the API Key into a plain workflow field or storing it in Data/JSON fields instead of Connections, which leaves the secret visible to anyone who can view the workflow.",
  placeholder: 'sk_...',
  notes: 'Stored and displayed as a masked credential value. Only apiKey is vault-backed; Domain must still be typed on every node.',
};

const idField: FieldDoc = {
  name: 'Id',
  internalKey: 'id',
  type: 'string',
  required: false,
  description: 'Resource ID (required for Get, Update, and Delete).',
  helpText: "What this field is: The unique numeric ID Freshdesk assigned to the ticket, contact, or company you want to fetch, change, or remove.\nWhy it matters: Get, Update, and Delete all target one specific record, and this ID is the only way the node knows which record that is.\nWhen to fill it: Fill it whenever Operation is Get, Update, or Delete. Leave it blank for List and Create, which do not target a single existing record.\nWhat to enter: The numeric ID exactly as Freshdesk shows it, for example in the ticket URL https://mycompany.freshdesk.com/a/tickets/12345 the ID is 12345.\nWhere the value comes from: Copy it from the Freshdesk web UI URL, or use {{$json.item.id}} / {{$json.created.id}} from an earlier Freshdesk step in the same workflow.\nHow to use it later: Not applicable to the output itself, but Delete echoes it back as {{$json.id}} so you can confirm which record was removed.\nAccepted format: Digits only, passed through as a string in the request URL (for example 12345, not #12345).\nReal workplace example: Use {{$json.created.id}} from a Create step earlier in the same workflow to immediately Update the ticket you just created.\nIf it is empty or wrong: An empty ID on Get/Update/Delete returns {{$json._error}} = \"Freshdesk <operation>: id is required\"; a wrong ID returns a Freshdesk \"failed (404)\" error.\nCommon mistake: Forgetting to fill ID when switching Operation from Create to Update in the same node, since Create does not require this field but Update always does.",
  placeholder: '12345',
  example: '12345',
};

const dataField: FieldDoc = {
  name: 'Data',
  internalKey: 'data',
  type: 'json',
  required: false,
  description: 'JSON payload sent to Freshdesk for Create and Update.',
  helpText: "What this field is: The raw JSON object sent as the request body to Freshdesk for Create and Update operations.\nWhy it matters: Freshdesk's API expects specific field names per resource (for example description, not descriptionText, for tickets) - this field lets you send exactly those field names when the built-in ticket convenience fields (Subject/Description Text/Email/Priority/Status) are not enough or do not apply to your Resource.\nWhen to fill it: Required for Update on every Resource. Required for Create unless Resource is ticket and you filled Subject, Description Text, and Email instead - those three convenience fields only apply to ticket creation, never to Update and never to contact/company creation.\nWhat to enter: A JSON object whose keys match the Freshdesk field names for the chosen Resource, for example {\"name\":\"Acme Inc\"} for a company.\nWhere the value comes from: Type it manually, or build it from an earlier node's output such as {{$json.formFields}} when the upstream data already matches Freshdesk's field names.\nHow to use it later: Not echoed back directly, but the record Freshdesk returns after the change appears as {{$json.created}} or {{$json.updated}}.\nAccepted format: Valid JSON wrapped in { } - invalid JSON or a non-object value is treated as missing.\nReal workplace example: {\"email\":\"alice@example.com\",\"name\":\"Alice Chen\"} to create a new Freshdesk contact.\nIf it is empty or wrong: An empty/non-object Data on Update returns {{$json._error}} = \"Freshdesk update: data (object) is required\"; on Create for a non-ticket Resource it returns \"Freshdesk create: data (object) is required (or provide subject+descriptionText+email for ticket)\".\nCommon mistake: Assuming Subject/Description Text/Email/Priority/Status also apply to Update - they do not; Update only ever reads this Data field, so put every changed value here instead.",
  placeholder: '{"key":"value"}',
  example: '{"key":"value"}',
};

const subjectField: FieldDoc = {
  name: 'Subject',
  internalKey: 'subject',
  type: 'string',
  required: false,
  description: 'Ticket subject line (Create, ticket resource only).',
  helpText: "What this field is: The one-line subject/title used when creating a new support ticket.\nWhy it matters: Freshdesk requires a subject on every ticket; this convenience field lets you set it without building the full Data JSON object yourself.\nWhen to fill it: Only when Operation is Create and Resource is ticket, and only when you are using the convenience fields instead of Data. It is ignored for every other Operation and Resource, including Update.\nWhat to enter: A short, human-readable summary of the support request.\nWhere the value comes from: Type it directly, or pull it from an earlier node such as {{$json.emailSubject}} from an inbound email trigger.\nHow to use it later: Freshdesk echoes the stored subject back inside {{$json.created.subject}} after a successful Create.\nAccepted format: Plain text, any length Freshdesk's subject field accepts.\nReal workplace example: Welcome, {{$json.name}} - please confirm your account, for a signup-triggered support ticket.\nIf it is empty or wrong: If Subject, Description Text, and Email are not all filled together, the node falls back to requiring the Data field instead, and an empty Data then returns {{$json._error}} = \"Freshdesk create: data (object) is required (or provide subject+descriptionText+email for ticket)\".\nCommon mistake: Filling Subject alone (without also filling Description Text and Email) and expecting the ticket convenience path to kick in - all three must be present together, or none of them are used.",
  placeholder: 'Welcome, {{$json.name}}',
};

const descriptionTextField: FieldDoc = {
  name: 'Description Text',
  internalKey: 'descriptionText',
  type: 'string',
  required: false,
  description: 'Ticket description body (Create, ticket resource only).',
  helpText: "What this field is: The main body text of a new support ticket, sent to Freshdesk under its own field name, description.\nWhy it matters: Freshdesk requires ticket descriptions; this field is the convenience shortcut for supplying it without writing raw Data JSON.\nWhen to fill it: Only when Operation is Create and Resource is ticket, alongside Subject and Email. It has no effect on Update, Delete, List, Get, or on any other Resource.\nWhat to enter: The full explanation of the issue or request, written the way you want it to appear inside the ticket.\nWhere the value comes from: Type it directly, or map it from an earlier node's output such as {{$json.message}} from a contact-form submission.\nHow to use it later: Freshdesk stores this as the ticket's description field, retrievable afterward as {{$json.created.description}}.\nAccepted format: Plain text (HTML is accepted by Freshdesk's API but this node sends it as-is, unescaped).\nReal workplace example: Hello {{$json.name}}, thanks for reaching out - our team will respond within one business day.\nIf it is empty or wrong: If Subject, Description Text, and Email are not all present together, this field is silently skipped and the node requires Data instead, ultimately returning {{$json._error}} = \"Freshdesk create: data (object) is required (or provide subject+descriptionText+email for ticket)\" when Data is also empty.\nCommon mistake: Assuming this field maps 1:1 to a field literally named descriptionText inside Freshdesk - internally it is renamed to description before being sent.",
  placeholder: 'Hello {{$json.name}}',
};

const emailField: FieldDoc = {
  name: 'Email',
  internalKey: 'email',
  type: 'email',
  required: false,
  description: 'Requester email address (Create, ticket resource only).',
  helpText: "What this field is: The email address of the person the new support ticket is opened on behalf of (Freshdesk calls this the requester).\nWhy it matters: Freshdesk needs a requester email (or contact ID) to know who a ticket belongs to; this convenience field supplies it for ticket Create.\nWhen to fill it: Only when Operation is Create and Resource is ticket, together with Subject and Description Text. Not used for Update, Delete, List, Get, or any other Resource.\nWhat to enter: One valid email address for the requester.\nWhere the value comes from: Type it directly, or use {{$json.email}} from an upstream form submission or contact lookup.\nHow to use it later: Freshdesk returns it inside {{$json.created.requester_id}} / the linked contact record, not as a raw email field on the ticket itself.\nAccepted format: A single standard email address such as name@example.com.\nReal workplace example: alice@example.com when a signup form triggers an onboarding support ticket for Alice.\nIf it is empty or wrong: If Subject, Description Text, and Email are not all present together, the ticket convenience path is skipped and Data becomes required instead; an invalid email is rejected by Freshdesk itself with an API-level validation error.\nCommon mistake: Filling Email but leaving Subject or Description Text blank - all three are required together for the convenience path to activate at all.",
  placeholder: 'user@example.com',
  example: 'user@example.com',
};

const priorityField: FieldDoc = {
  name: 'Priority',
  internalKey: 'priority',
  type: 'number',
  required: false,
  description: 'Priority (1=Low,2=Medium,3=High,4=Urgent).',
  helpText: "What this field is: The numeric priority level Freshdesk assigns to a new ticket.\nWhy it matters: Priority drives Freshdesk's SLA timers and agent queues, so setting it correctly at creation avoids re-triaging tickets later.\nWhen to fill it: Optional, and only used when Operation is Create and Resource is ticket alongside Subject/Description Text/Email; ignored otherwise.\nWhat to enter: A single digit: 1 for Low, 2 for Medium, 3 for High, or 4 for Urgent.\nWhere the value comes from: Type it directly, or compute it from upstream logic such as an If/Else node that maps keywords like \"urgent\" to 4.\nHow to use it later: Freshdesk echoes the stored value back as {{$json.created.priority}}.\nAccepted format: An integer from 1 to 4 - Freshdesk rejects other numbers.\nReal workplace example: 4 for a ticket auto-created from a \"site is down\" keyword match.\nIf it is empty or wrong: Left empty, Freshdesk applies its own account default (usually 1/Low); an out-of-range number is rejected by Freshdesk's API validation.\nCommon mistake: Entering a word like \"High\" instead of the matching number 3 - this field expects Freshdesk's numeric codes, not the label shown in the Freshdesk UI.",
  placeholder: '3',
  example: '3',
};

const statusField: FieldDoc = {
  name: 'Status',
  internalKey: 'status',
  type: 'number',
  required: false,
  description: 'Status (2=Open,3=Pending,4=Resolved,5=Closed).',
  helpText: "What this field is: The numeric status Freshdesk assigns to a new ticket.\nWhy it matters: Status controls which queue/view the ticket shows up in for agents, so setting it at creation avoids an extra manual status change afterward.\nWhen to fill it: Optional, and only used when Operation is Create and Resource is ticket alongside Subject/Description Text/Email; ignored otherwise, including on Update - use Data for status changes on Update.\nWhat to enter: A single digit: 2 for Open, 3 for Pending, 4 for Resolved, or 5 for Closed.\nWhere the value comes from: Type it directly; most new tickets are left at the default Open (2) so this field is usually left blank.\nHow to use it later: Freshdesk echoes the stored value back as {{$json.created.status}}.\nAccepted format: An integer between 2 and 5 - Freshdesk rejects other numbers (there is no status 1).\nReal workplace example: Leaving this blank so new tickets default to Open (2) until an agent picks them up.\nIf it is empty or wrong: Left empty, Freshdesk defaults new tickets to Open; an out-of-range number is rejected by Freshdesk's API validation.\nCommon mistake: Trying to use this field to close a ticket during Update - Status here only applies to ticket creation; put {\"status\":5} inside Data to close a ticket during Update instead.",
  placeholder: '2',
  example: '2',
};

const queryField: FieldDoc = {
  name: 'Search Query',
  internalKey: 'query',
  type: 'string',
  required: false,
  description: 'Search query text shown in the node editor; not read by the current execution engine.',
  helpText: "What this field is: A text box in the node editor labeled Search Query, intended for use with the Search operation.\nWhy it matters: It looks like a normal input field, but the execution engine that actually runs Freshdesk nodes has no code path that reads this value - filling it currently has zero effect on any operation, including Search (which itself always fails as unsupported).\nWhen to fill it: There is currently no working scenario where filling this field changes the node's behavior; leave it blank.\nWhat to enter: Nothing is required; whatever you type here is not sent to Freshdesk.\nWhere the value comes from: Not applicable - this field is not wired to a request parameter today.\nHow to use it later: Not applicable - this value never appears in {{$json.item}}, {{$json.items}}, or any other output key.\nAccepted format: Freeform text, but format has no effect since the value is unused.\nReal workplace example: None - use List with Resource set correctly, then filter the results with a downstream Filter or If/Else node instead of relying on this field.\nIf it is empty or wrong: Nothing changes either way; the node behaves identically whether this field is empty or filled.\nCommon mistake: Assuming filling Search Query enables keyword search - search is not implemented in this node yet, so both the Operation dropdown's Search option and this Query field are currently non-functional.",
  placeholder: 'email:test@example.com',
};

const pageField: FieldDoc = {
  name: 'Page Number',
  internalKey: 'page',
  type: 'number',
  required: false,
  description: 'Page number shown in the node editor; not read by the current execution engine.',
  helpText: "What this field is: A Page Number box in the node editor, intended for paging through List results.\nWhy it matters: It suggests you can page through large result sets, but the current execution engine's List operation calls Freshdesk's list endpoint with no pagination parameters at all, so this field is not sent in the request.\nWhen to fill it: There is no working scenario today where changing this value changes what List returns; leave it at the default.\nWhat to enter: Nothing required - any number typed here is ignored by the current implementation.\nWhere the value comes from: Not applicable.\nHow to use it later: Not applicable - List always returns whatever page Freshdesk's API returns by default regardless of this field.\nAccepted format: A positive integer, though the format has no effect since the value is unused.\nReal workplace example: None currently - if you need every record, be aware List only returns Freshdesk's default page and does not automatically loop through additional pages.\nIf it is empty or wrong: Nothing changes either way.\nCommon mistake: Assuming a large ticket list is complete because List ran successfully - without real pagination support, List only returns Freshdesk's first page of results.",
  placeholder: '1',
  defaultValue: '1',
};

const perPageField: FieldDoc = {
  name: 'Records Per Page',
  internalKey: 'perPage',
  type: 'number',
  required: false,
  description: 'Records-per-page shown in the node editor; not read by the current execution engine.',
  helpText: "What this field is: A Records Per Page box in the node editor, intended to control how many records List returns per page.\nWhy it matters: It suggests you can control the page size, but the current execution engine's List operation does not forward this value to Freshdesk at all - Freshdesk's own default page size is used every time.\nWhen to fill it: There is no working scenario today where changing this value changes List's output; leave it at the default.\nWhat to enter: Nothing required - any number typed here is ignored by the current implementation.\nWhere the value comes from: Not applicable.\nHow to use it later: Not applicable - {{$json.items}} always reflects Freshdesk's default page size, not this field.\nAccepted format: A positive integer, though the format has no effect since the value is unused.\nReal workplace example: None currently - if a full export is needed, plan for Freshdesk's default page size limit rather than relying on this field.\nIf it is empty or wrong: Nothing changes either way.\nCommon mistake: Setting this to a large number expecting a bigger single response - the value is currently ignored, so the response size does not change.",
  placeholder: '30',
  defaultValue: '30',
};

const sharedFields: FieldDoc[] = [operationField, resourceField, domainField, apiKeyField];

const getOperation: OperationDoc = {
  name: 'Get',
  value: 'get',
  description: "Fetches one existing Freshdesk record (ticket, contact, or company) by its numeric ID and returns Freshdesk's full raw record so downstream nodes can read every field Freshdesk stores for it.",
  fields: [...sharedFields, idField],
  outputExample: {
    success: true,
    item: { id: 12345, subject: 'Cannot log in', status: 2, priority: 1 },
  },
  outputDescription: "success: true when Freshdesk accepted the get request for this Freshdesk resource.\nitem: The full raw record Freshdesk returned for the requested Resource and ID (for example a ticket object with subject/status/priority for Resource ticket, or a contact/company object for those resources).\n_error: Present only when the request failed, for example \"Freshdesk get: id is required\" or \"Freshdesk get failed (404)\".\n_errorDetails: The raw error body/text Freshdesk returned alongside a failed get request, useful for debugging permission or validation problems.",
  usageExample: {
    scenario: 'A daily digest workflow needs the full details of one specific support ticket right before summarizing it in a report.',
    inputValues: { domain: 'mycompany.freshdesk.com', apiKey: '', resource: 'ticket', operation: 'get', id: '12345' },
    expectedOutput: 'Freshdesk returns the ticket as {{$json.item}}, so a later step can read {{$json.item.subject}} or {{$json.item.status}}.',
  },
  externalDocsUrl: 'https://developers.freshdesk.com/api/',
};

const listOperation: OperationDoc = {
  name: 'List',
  value: 'list',
  description: "Fetches every existing Freshdesk record of the chosen Resource type in one request, using Freshdesk's own default page and page size. This node does not currently support paging through additional pages.",
  fields: [...sharedFields, queryField, pageField, perPageField],
  outputExample: {
    success: true,
    items: [
      { id: 12345, subject: 'Cannot log in', status: 2 },
      { id: 12346, subject: 'Billing question', status: 3 },
    ],
  },
  outputDescription: 'success: true when Freshdesk accepted the list request for this Freshdesk resource.\nitems: The raw array (or paginated response object) Freshdesk returned for every record of the chosen Resource - this node does not filter, sort, or page these results itself.\n_error: Present only when the request failed, for example a Freshdesk authentication or permission problem.\n_errorDetails: The raw error body/text Freshdesk returned alongside a failed list request.',
  usageExample: {
    scenario: 'A support-team dashboard workflow pulls every open ticket once an hour to build a live backlog count.',
    inputValues: { domain: 'mycompany.freshdesk.com', apiKey: '', resource: 'ticket', operation: 'list' },
    expectedOutput: 'Freshdesk returns every record as {{$json.items}}, which a Loop node can iterate to build the dashboard.',
  },
  externalDocsUrl: 'https://developers.freshdesk.com/api/',
};

const createOperation: OperationDoc = {
  name: 'Create',
  value: 'create',
  description: 'Creates a new Freshdesk record for the chosen Resource - either from a raw Data JSON payload, or, for the ticket Resource only, from the Subject/Description Text/Email/Priority/Status convenience fields - and returns the newly created record.',
  fields: [...sharedFields, dataField, subjectField, descriptionTextField, emailField, priorityField, statusField],
  outputExample: {
    success: true,
    created: { id: 12347, subject: 'Welcome, Alice', status: 2, priority: 1 },
  },
  outputDescription: 'success: true when Freshdesk accepted the create request for this Freshdesk resource.\ncreated: The full raw record Freshdesk created and returned, including the new numeric id you will need for a later Update or Delete step.\n_error: Present only when the request failed, for example "Freshdesk create: data (object) is required (or provide subject+descriptionText+email for ticket)".\n_errorDetails: The raw error body/text Freshdesk returned alongside a failed create request, such as a missing-field validation error.',
  usageExample: {
    scenario: 'A signup-form workflow opens a welcome support ticket for every new customer as soon as they register.',
    inputValues: { domain: 'mycompany.freshdesk.com', apiKey: '', resource: 'ticket', operation: 'create', subject: 'Welcome, {{$json.name}}' },
    expectedOutput: 'Freshdesk returns the new ticket as {{$json.created}}, including {{$json.created.id}} for use in a later Update step.',
  },
  externalDocsUrl: 'https://developers.freshdesk.com/api/',
};

const updateOperation: OperationDoc = {
  name: 'Update',
  value: 'update',
  description: 'Updates an existing Freshdesk record identified by ID with the fields supplied in the Data JSON payload, and returns Freshdesk\'s full record after the change is applied.',
  fields: [...sharedFields, idField, dataField],
  outputExample: {
    success: true,
    updated: { id: 12345, subject: 'Cannot log in - resolved', status: 4 },
  },
  outputDescription: 'success: true when Freshdesk accepted the update request for this Freshdesk resource.\nupdated: The full raw record Freshdesk returned after applying the change described in Data.\n_error: Present only when the request failed, for example "Freshdesk update: id is required" or "Freshdesk update: data (object) is required".\n_errorDetails: The raw error body/text Freshdesk returned alongside a failed update request.',
  usageExample: {
    scenario: 'A resolution workflow marks a support ticket Resolved and appends a closing note once an agent finishes the fix.',
    inputValues: { domain: 'mycompany.freshdesk.com', apiKey: '', resource: 'ticket', operation: 'update', id: '12345' },
    expectedOutput: 'Freshdesk returns the changed ticket as {{$json.updated}}, so a later step can confirm {{$json.updated.status}} changed to Resolved.',
  },
  externalDocsUrl: 'https://developers.freshdesk.com/api/',
};

const deleteOperation: OperationDoc = {
  name: 'Delete',
  value: 'delete',
  description: "Permanently deletes an existing Freshdesk record identified by ID. Freshdesk's delete endpoint returns no response body, so this node reports a synthetic confirmation instead of echoing back a deleted record.",
  fields: [...sharedFields, idField],
  outputExample: {
    success: true,
    deleted: true,
    id: '12345',
  },
  outputDescription: "success: true when Freshdesk accepted the delete request for this Freshdesk resource.\ndeleted: Always true on a successful delete - Freshdesk's delete endpoint returns no body, so this node reports true instead of echoing a record.\nid: The same Resource ID you requested be deleted, echoed back so downstream nodes can confirm which record is gone.\n_error: Present only when the request failed, for example \"Freshdesk delete: id is required\" or \"Freshdesk delete failed (404)\".\n_errorDetails: The raw error body/text Freshdesk returned alongside a failed delete request.",
  usageExample: {
    scenario: 'A cleanup workflow removes duplicate test tickets created accidentally during an integration test run.',
    inputValues: { domain: 'mycompany.freshdesk.com', apiKey: '', resource: 'ticket', operation: 'delete', id: '12345' },
    expectedOutput: 'Freshdesk confirms removal as {{$json.deleted}} and {{$json.id}}, so a later step can log which ticket was removed.',
  },
  externalDocsUrl: 'https://developers.freshdesk.com/api/',
};

export const freshdeskDoc: NodeDoc = {
  slug: 'freshdesk',
  displayName: 'Freshdesk',
  category: 'CRM',
  logoUrl: '/icons/nodes/freshdesk.svg',
  description: 'Get, list, create, update, or delete Freshdesk tickets, contacts, and companies from a workflow.',
  credentialType: 'Freshdesk API Key',
  credentialSetupSteps: [
    'What this is: The Freshdesk connection lets CtrlChecks store your Freshdesk API Key safely in Connections, instead of pasting it into every workflow that uses Freshdesk.',
    "Where to start: Log in to Freshdesk, open your profile picture (top right) -> Profile Settings, and copy the API Key shown under 'Your API Key'.",
    'How to connect: In CtrlChecks, open Connections -> Add Connection -> Freshdesk API Key, then paste the API Key. CtrlChecks tests the credential with a GET request to https://<your-domain>/api/v2/agents/me using HTTP Basic Auth (the API Key as the username, the letter X as the password).',
    "Domain field stays on the node: Unlike the API Key, your Freshdesk domain (for example mycompany.freshdesk.com) is not stored in the credential vault. Type the full domain, including the .freshdesk.com suffix, directly into the node's Domain field every time you use this node.",
    'Important: Treat the API Key like a bank password. Store it in Connections, not in a plain text workflow field, and never share it outside CtrlChecks.',
    'Test it: Save the connection, add a Freshdesk node with Operation set to List, run it, and confirm CtrlChecks returns real ticket data instead of an authentication error.',
    'Connect the Freshdesk output to a logging, If/Else, or follow-up node when later steps should inspect {{$json.item}}, {{$json.items}}, {{$json.created}}, {{$json.updated}}, or {{$json.deleted}}. Downstream service node account connection setup is still required for nodes after Freshdesk; this connection only authorizes Freshdesk support-desk operations.',
  ],
  credentialDocsUrl: 'https://developers.freshdesk.com/api/',
  resources: [
    {
      name: 'Operations',
      description: 'Freshdesk support-desk actions available on this node: Get, List, Create, Update, and Delete tickets, contacts, or companies.',
      operations: [getOperation, listOperation, createOperation, updateOperation, deleteOperation],
    },
  ],
  commonErrors: [
    {
      error: 'Freshdesk: domain is required (e.g., mycompany.freshdesk.com)',
      cause: 'The Domain field was left empty when the node ran.',
      fix: "Type your full Freshdesk domain, including the .freshdesk.com suffix, into the node's Domain field.",
    },
    {
      error: 'Freshdesk: apiKey not found. Provide apiKey or vault credential "freshdesk".',
      cause: 'No API Key was typed on the node and no Freshdesk connection is saved in Connections for this workflow/user.',
      fix: "Connect Freshdesk in CtrlChecks -> Connections -> Freshdesk API Key, or paste the API Key directly into the node's API Key field for a quick test.",
    },
    {
      error: 'Freshdesk get: id is required',
      cause: 'Get, Update, and Delete all target one existing record, and the Resource ID field was left empty.',
      fix: 'Fill the Resource ID field with the numeric ID of the ticket, contact, or company to fetch, change, or remove.',
    },
    {
      error: 'Freshdesk create: data (object) is required (or provide subject+descriptionText+email for ticket)',
      cause: 'Create was run for a non-ticket Resource without a Data JSON object, or for the ticket Resource without all three of Subject, Description Text, and Email.',
      fix: "Fill the Data field with a JSON object matching Freshdesk's field names for the chosen Resource, or fill Subject + Description Text + Email together when creating a ticket.",
    },
    {
      error: 'Freshdesk update: data (object) is required',
      cause: 'Update was run without a Data JSON object describing what to change.',
      fix: 'Fill the Data field with a JSON object containing only the fields you want to change, for example {"status":4}.',
    },
    {
      error: 'Freshdesk: Unsupported operation "search". Supported: get/read, list, create, update, delete',
      cause: 'The Operation dropdown was set to Search, which is present in the node editor but not implemented in the execution engine yet.',
      fix: 'Use List instead, and filter the results with a downstream Filter or If/Else node until Search is implemented.',
    },
    {
      error: 'Freshdesk get failed (404)',
      cause: 'The Resource ID does not exist in this Freshdesk account, or the Resource/Domain combination points at the wrong record type.',
      fix: 'Confirm the ID exists in Freshdesk for the selected Resource, and confirm Domain matches the account that ID belongs to.',
    },
    {
      error: 'Freshdesk error: <message>',
      cause: 'A network problem, an invalid Domain hostname, or an unexpected Freshdesk API response prevented the request from completing.',
      fix: 'Check the Domain field for typos, confirm your Freshdesk account is reachable, and re-run the node.',
    },
  ],
  relatedNodes: [],
};
