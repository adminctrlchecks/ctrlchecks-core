import type { NodeDoc, OperationDoc, FieldDoc } from '../types';

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'The Intercom action to run. Important: this dropdown and the real execution engine disagree on what is supported - read the notes below before choosing.',
  options: ['get', 'list', 'create', 'update', 'delete', 'search'],
  notes: "Real behavior does not match this dropdown. The execution engine only implements three operations total: list (fetch conversations), get (fetch one conversation), and send (post a reply to a conversation). Of the six values in this dropdown, only Get and List actually work - Create, Update, Delete, and Search all fail immediately with \"Unsupported Intercom operation\". Worse, Send - the node's main reply-sending capability - is not in this dropdown at all today; it can only be set by editing workflow JSON directly or through an AI-generated workflow, not through this Properties Panel.",
  helpText: "What this field is: The dropdown that is supposed to tell this node which Intercom action to run, though its options do not match what the engine actually supports (see Notes).\nWhy it matters: Selecting one of the four broken values (Create, Update, Delete, Search) always fails - the workflow will error out on every run until you pick Get or List instead.\nWhen to fill it: Every time you add an Intercom node.\nWhat to enter: Choose List to fetch a page of conversations, or Get to fetch one conversation by ID (once you have separately supplied a real conversationId - see the Conversation Id field). Do not choose Create, Update, Delete, or Search - none of them are implemented. To send a reply (the real \"send\" operation), this value must currently be set to send through workflow JSON or AI generation, since it is missing from this dropdown.\nWhere the value comes from: Chosen directly in the Properties Panel; there is no reasonable way to set this dynamically from an upstream step given how limited the real support is.\nHow to use it later: Downstream nodes read {{$json.data}} for the raw Intercom API response, regardless of which real operation ran.\nAccepted format: One of get, list, send (the only three the engine recognizes) - the case is not converted, so use exact lowercase.\nReal workplace example: Set Operation to List to pull the newest support conversations into a workflow for a daily summary.\nIf it is empty or wrong: An empty value defaults to List; Create/Update/Delete/Search return {{$json._error}} = \"Unsupported Intercom operation: ...\".\nCommon mistake: Picking Create or Update expecting to add/change a contact or conversation - this node cannot create or update anything; it can only list conversations, fetch one conversation, or reply to one.",
  placeholder: 'list',
  example: 'list',
  defaultValue: 'get',
};

const resourceField: FieldDoc = {
  name: 'Resource',
  internalKey: 'resource',
  type: 'select',
  required: true,
  description: 'A dropdown shown in the node editor that the execution engine never reads.',
  options: ['contact', 'conversation', 'message', 'tag', 'segment', 'company', 'event'],
  notes: "This field is entirely decorative. It offers Contact, Conversation, Message, Tag, Segment, Company, and Event, but the real execution engine never checks this value for any operation - every operation always works against Intercom Conversations (via /conversations endpoints) no matter what is selected here.",
  helpText: "What this field is: A Resource dropdown that looks like it selects which Intercom object type (contact, conversation, message, etc.) this node works with.\nWhy it matters: It doesn't - see Notes. Every real operation on this node (List, Get, Send) always operates on Intercom Conversations, never on Contacts, Tags, Segments, Companies, or Events, regardless of this dropdown's value.\nWhen to fill it: The Properties Panel requires a value here, but changing it has no effect on what the node actually does.\nWhat to enter: Leave the default (Contact) selected - it does not matter which option you pick.\nWhere the value comes from: Not applicable - the value is never read by the execution engine.\nHow to use it later: Not applicable - this value never appears in the node's output.\nAccepted format: Any of the seven listed options - all behave identically (that is, they have no effect).\nReal workplace example: None - regardless of this dropdown, use Operation: List/Get/Send with the Conversation Id field to work with Intercom conversations.\nIf it is empty or wrong: Nothing changes either way - the engine does not check this field.\nCommon mistake: Picking Contact or Company expecting this node to manage Intercom contacts or companies - this node only ever touches conversations, no matter what Resource is set to.",
  placeholder: 'contact',
  example: 'contact',
  defaultValue: 'contact',
};

const accessTokenField: FieldDoc = {
  name: 'Access Token',
  internalKey: 'accessToken',
  type: 'password',
  required: true,
  description: 'Intercom OAuth access token used to authenticate every request.',
  helpText: "What this field is: The Intercom access token that authenticates every request this node makes, sent as a Bearer token.\nWhy it matters: Every Intercom API call requires this token in the Authorization header - without it, every operation fails immediately, before any other field is even checked.\nWhen to fill it: Leave this field blank once you have saved an Intercom connection in CtrlChecks Connections; the node automatically retrieves the token from the credential vault at run time. Fill it directly only for a quick one-off test.\nWhat to enter: The raw Intercom access token, with no \"Bearer\" prefix and no surrounding quotes.\nWhere the value comes from: developers.intercom.com -> Your App -> Configure -> Authentication, or the CtrlChecks Intercom OAuth connection flow.\nHow to use it later: This value is never included in the node output, so downstream nodes cannot read it back - only {{$json.data}} is passed along.\nAccepted format: A single token string exactly as Intercom/CtrlChecks shows it.\nReal workplace example: Save the token once in Connections -> Add Connection -> Intercom, then reuse the same saved connection across every Intercom node in every workflow.\nIf it is empty or wrong: An empty token returns {{$json._error}} = \"accessToken is required\"; a wrong or expired token returns an Intercom authentication failure.\nCommon mistake: Pasting the token into a plain workflow field or a Data/JSON field instead of Connections, which leaves the secret visible to anyone who can view the workflow.",
  placeholder: 'your-access-token',
};

const conversationIdField: FieldDoc = {
  name: 'Conversation Id',
  internalKey: 'conversationId',
  type: 'string',
  required: false,
  description: 'The Intercom conversation ID this operation reads or replies to (required for Get and Send).',
  helpText: "What this field is: The unique ID Intercom assigned to a specific conversation thread between a customer and your team.\nWhy it matters: Get and Send both target one specific conversation, and this ID is the only way the node knows which one.\nWhen to fill it: Required whenever Operation is Get or Send (Get is selectable from the dropdown; Send currently is not - see the Operation field's notes). Not used for List, which returns a page of conversations instead of one.\nWhat to enter: The numeric/alphanumeric conversation ID exactly as Intercom shows it, for example in the Intercom inbox URL app.intercom.com/a/inbox/<inboxId>/conversation/<conversationId>.\nWhere the value comes from: Copy it from the Intercom web UI URL, or use {{$json.data.conversations.0.id}} from an earlier List step in the same workflow.\nHow to use it later: Not echoed back as its own output key, but {{$json.data.id}} on a Get/Send result is the same conversation ID.\nAccepted format: The conversation ID string exactly as Intercom provides it - do not add a # prefix.\nReal workplace example: Use {{$json.data.conversations.0.id}} from a List step to immediately Get the newest conversation's full details.\nIf it is empty or wrong: An empty Conversation Id on Get/Send returns {{$json._error}} = \"conversationId is required for get\" (or \"...for send\"); a wrong ID returns an Intercom \"not found\" error.\nCommon mistake: Leaving this blank because the node editor does not clearly mark it as required for Get - unlike most nodes in this product, this field's required-ness is not visibly enforced in the Properties Panel.",
  placeholder: 'conv-id',
  example: 'conv-id',
};

const idField: FieldDoc = {
  name: 'Resource ID',
  internalKey: 'id',
  type: 'text',
  required: false,
  description: 'A field shown in the node editor that the execution engine never reads.',
  helpText: "What this field is: A Resource ID box in the node editor, labeled as required for get/update/delete operations.\nWhy it matters: It is never read by the execution engine at all - Get actually requires the separate Conversation Id field instead, not this one. Filling only this field and leaving Conversation Id blank means Get will still fail.\nWhen to fill it: There is no working scenario where filling this field changes the node's behavior; fill Conversation Id instead.\nWhat to enter: Nothing is required here - whatever you type is not sent to Intercom.\nWhere the value comes from: Not applicable - this field is not wired to a request parameter today.\nHow to use it later: Not applicable - this value never appears in {{$json.data}} or any other output key.\nAccepted format: Freeform text, but format has no effect since the value is unused.\nReal workplace example: None - use the Conversation Id field instead for Get.\nIf it is empty or wrong: Nothing changes either way.\nCommon mistake: Filling this field and assuming Get will now work - Get needs Conversation Id filled, and this field's value is silently ignored regardless of what it contains.",
  placeholder: '123456',
};

const dataField: FieldDoc = {
  name: 'Data (JSON)',
  internalKey: 'data',
  type: 'json',
  required: false,
  description: 'Raw Intercom API payload override for Send. The node editor labels this as being for create/update, but those operations do not exist in the runtime.',
  helpText: "What this field is: A raw JSON request body that, when Operation is send, completely replaces the auto-built reply payload the node would otherwise send.\nWhy it matters: By default, Send builds its own reply body from the Message and Admin Id values - but neither Message nor Admin Id has a matching field in this Properties Panel today, so filling this Data field is currently the only way to send a real reply through the visual editor.\nWhen to fill it: Only useful when Operation is send (which itself is not selectable from the Operation dropdown - see that field's notes). It has no effect on List or Get, and it is NOT used for Create or Update, despite what this field's label suggests, because those operations do not exist in the runtime.\nWhat to enter: A full Intercom reply payload, for example {\"message_type\":\"comment\",\"type\":\"admin\",\"admin_id\":\"12345\",\"body\":\"Thanks for reaching out!\"}.\nWhere the value comes from: Build it manually following Intercom's Reply to a Conversation API reference, since neither Message nor Admin Id can currently be filled as separate fields in this panel.\nHow to use it later: Intercom's reply response comes back as {{$json.data}}, the same key every operation uses.\nAccepted format: Valid JSON wrapped in { } matching Intercom's conversation reply request schema.\nReal workplace example: {\"message_type\":\"comment\",\"type\":\"admin\",\"admin_id\":\"6789\",\"body\":\"We'll follow up shortly.\"} to reply as a specific admin.\nIf it is empty or wrong: If Data is empty on Send, the node falls back to Message + Admin Id, and since neither has a Properties Panel field today, Send run through the visual editor without this field filled will return {{$json._error}} = \"message is required for send\" or \"adminId is required for admin conversation replies\".\nCommon mistake: Believing this field is for Create/Update (as its label suggests) - those operations are not implemented; this field only matters for Send, and only as a full raw payload override.",
  placeholder: '{"message_type":"comment","type":"admin","admin_id":"12345","body":"Thanks for reaching out!"}',
  example: '{"message_type":"comment","type":"admin","admin_id":"12345","body":"Thanks for reaching out!"}',
};

const messageField: FieldDoc = {
  name: 'Message',
  internalKey: 'message',
  type: 'textarea',
  required: false,
  description: 'The reply text for Send. Real and required for Send, but has no field in this Properties Panel today.',
  helpText: "What this field is: The plain-text (or simple HTML) reply body Intercom posts into the conversation on Send.\nWhy it matters: Send builds its reply from this value plus Admin Id - without it (and without a raw Data override), Send always fails.\nWhen to fill it: Only relevant when Operation is send. There is currently no Properties Panel field for this - it can only be supplied today by setting operation to send and message directly in workflow JSON, through an AI-generated workflow, or via the Data (JSON) field's full payload override.\nWhat to enter: The reply text exactly as it should appear in the Intercom conversation.\nWhere the value comes from: Type it directly in workflow JSON, or map it from an earlier node's output such as {{$json.aiResponse}} from an AI Agent step.\nHow to use it later: Not echoed back as its own key - the updated conversation (including the new reply) comes back as {{$json.data}}.\nAccepted format: Plain text; Intercom also accepts simple HTML formatting in the body.\nReal workplace example: \"Thanks for reaching out - a team member will follow up within one business day.\"\nIf it is empty or wrong: An empty Message (and no Data override) on Send returns {{$json._error}} = \"message is required for send\".\nCommon mistake: Assuming this can be typed into the visual node editor like a normal field - today it cannot; use the Data (JSON) field's raw payload override instead until this gets its own Properties Panel field.",
  placeholder: 'Thanks for reaching out! A team member will follow up shortly.',
};

const adminIdField: FieldDoc = {
  name: 'Admin Id',
  internalKey: 'adminId',
  type: 'text',
  required: false,
  description: 'The Intercom admin (teammate) ID replying on Send. Real and required for Send, but has no field in this Properties Panel today.',
  helpText: "What this field is: The Intercom admin (teammate) user ID that Intercom records as the sender of the reply.\nWhy it matters: Intercom requires every admin reply to be attributed to a specific teammate - without this, Send always fails.\nWhen to fill it: Only relevant when Operation is send. Like Message, there is currently no Properties Panel field for this - supply it today only through workflow JSON, an AI-generated workflow, or the Data (JSON) field's full payload override.\nWhat to enter: The numeric Intercom admin ID for the teammate the reply should be attributed to.\nWhere the value comes from: In Intercom, go to Settings -> Teammates, open the teammate, and copy their ID from the URL, or call Intercom's List Admins API.\nHow to use it later: Not echoed back as its own key - it becomes part of the conversation data returned as {{$json.data}}.\nAccepted format: A numeric Intercom admin ID string.\nReal workplace example: 6789 for the support teammate account that should appear as the reply's sender.\nIf it is empty or wrong: An empty Admin Id (and no Data override) on Send returns {{$json._error}} = \"adminId is required for admin conversation replies\"; an ID that does not belong to a real admin on your Intercom workspace is rejected by Intercom's API.\nCommon mistake: Assuming this can be typed into the visual node editor like a normal field - today it cannot; use the Data (JSON) field's raw payload override instead until this gets its own Properties Panel field.",
  placeholder: '6789',
  example: '6789',
};

const queryField: FieldDoc = {
  name: 'Search Query',
  internalKey: 'query',
  type: 'text',
  required: false,
  description: 'A field shown in the node editor for a Search operation that does not exist in the runtime.',
  helpText: "What this field is: A Search Query box in the node editor, labeled as required for a search operation.\nWhy it matters: There is no search operation in the real execution engine at all - only List, Get, and Send exist - so this field has no effect no matter what Operation is selected.\nWhen to fill it: There is no working scenario where filling this field changes the node's behavior; leave it blank.\nWhat to enter: Nothing is required - whatever you type here is not sent to Intercom.\nWhere the value comes from: Not applicable - this field is not wired to a request parameter today.\nHow to use it later: Not applicable - this value never appears in {{$json.data}}.\nAccepted format: Freeform text, but format has no effect since the value is unused.\nReal workplace example: None - use List to fetch conversations, then filter the results with a downstream Filter node instead of relying on this field.\nIf it is empty or wrong: Nothing changes either way.\nCommon mistake: Selecting Search from the Operation dropdown and filling this field expecting a filtered lookup - Search always fails with \"Unsupported Intercom operation\" regardless of this field.",
  placeholder: 'email:test@example.com',
};

const perPageField: FieldDoc = {
  name: 'Records Per Page',
  internalKey: 'perPage',
  type: 'number',
  required: false,
  description: 'Number of conversations to return per List request.',
  helpText: "What this field is: The maximum number of conversations this node asks Intercom for in one List request.\nWhy it matters: Intercom returns conversations in pages - this controls how many come back in a single run of this node.\nWhen to fill it: Optional for List; ignored for Get and Send.\nWhat to enter: A whole number - Intercom's own API limits typically apply beyond very large values, but there is no client-side validation in this node.\nWhere the value comes from: Type it directly based on how many conversations you realistically need per run.\nHow to use it later: The array inside {{$json.data.conversations}} will contain up to this many entries.\nAccepted format: A positive whole number.\nReal workplace example: 20 (the default) for a normal support-inbox summary, or higher for a bulk export.\nIf it is empty or wrong: Left empty, List defaults to 20.\nCommon mistake: Assuming a high Records Per Page alone retrieves every conversation - use Starting After with the returned pagination cursor to fetch additional pages.",
  placeholder: '20',
  defaultValue: '20',
};

const startingAfterField: FieldDoc = {
  name: 'Starting After (Pagination)',
  internalKey: 'startingAfter',
  type: 'text',
  required: false,
  description: 'Pagination cursor for the next page of List results.',
  helpText: "What this field is: A pagination cursor token that tells Intercom which page of List results to return next.\nWhy it matters: Intercom's List endpoint never returns every conversation at once - this field is how a workflow steps through additional pages.\nWhen to fill it: Only useful for List, and only after a previous List run already returned a pagination cursor; leave it blank for the first page.\nWhat to enter: The exact cursor string Intercom returned in a previous response - do not type your own value here.\nWhere the value comes from: Map it from {{$json.data.pages.next.starting_after}} on a previous List step.\nHow to use it later: Not applicable to this node's own output - it only affects which page of {{$json.data.conversations}} comes back on this run.\nAccepted format: An opaque token string exactly as Intercom provided it.\nReal workplace example: Use {{$json.data.pages.next.starting_after}} from a Loop node that keeps calling this Intercom node until no further pages remain, to pull an entire conversation inbox.\nIf it is empty or wrong: Left empty, Intercom always returns the first page; an invalid cursor is rejected by Intercom's API with an error.\nCommon mistake: Typing a made-up value instead of the real cursor string Intercom returned - any value that is not a genuine Intercom cursor will be rejected.",
  placeholder: 'paging_token',
};

const sharedFields: FieldDoc[] = [operationField, resourceField, accessTokenField];

const listOperation: OperationDoc = {
  name: 'List',
  value: 'list',
  description: 'Fetches a page of Intercom conversations via GET /conversations, using Intercom\'s own cursor-based pagination. This is the only operation both selectable from the Operation dropdown and fully working end to end today.',
  fields: [...sharedFields, perPageField, startingAfterField, queryField],
  outputExample: {
    operation: 'list',
    data: {
      type: 'conversation.list',
      conversations: [
        { type: 'conversation', id: '123456789', created_at: 1752940800 },
        { type: 'conversation', id: '123456790', created_at: 1752944400 },
      ],
      total_count: 245,
      pages: { next: { page: 2, starting_after: 'abcdef123456' }, page: 1, per_page: 20, total_pages: 13 },
    },
  },
  outputDescription: 'operation: echoes back "list". data: Intercom\'s raw conversation-list response, including a conversations array, total_count, and a pages object with a pagination cursor. _error: present only when the request failed, for example an authentication problem. _errorCode: set to "INTERCOM_FAILED" on any failure.',
  usageExample: {
    scenario: 'A support-team dashboard workflow pulls the newest Intercom conversations every hour to build a live backlog view.',
    inputValues: { operation: 'list', accessToken: '', perPage: '20' },
    expectedOutput: 'Intercom returns conversations as {{$json.data.conversations}}, which a Loop node can iterate over.',
  },
  externalDocsUrl: 'https://developers.intercom.com/docs/references/rest-api/api.intercom.io/',
};

const getOperation: OperationDoc = {
  name: 'Get',
  value: 'get',
  description: 'Fetches one existing Intercom conversation by its ID via GET /conversations/{conversationId} and returns Intercom\'s full raw conversation object. Selectable from the Operation dropdown, but only works once Conversation Id is filled - the panel\'s own Resource ID field is not read for this.',
  fields: [...sharedFields, conversationIdField, idField],
  outputExample: {
    operation: 'get',
    data: {
      type: 'conversation',
      id: '123456789',
      created_at: 1752940800,
      source: { type: 'conversation', delivered_as: 'customer_initiated', body: 'Hi, I need help with my order.' },
      conversation_message: { type: 'conversation_message', body: 'Hi, I need help with my order.' },
      contacts: { type: 'contact.list', contacts: [{ type: 'contact', id: 'abc123' }] },
    },
  },
  outputDescription: 'operation: echoes back "get". data: Intercom\'s full raw conversation object, including source, conversation_message, and contacts. _error: present only when the request failed, for example "conversationId is required for get". _errorCode: set to "INTERCOM_FAILED" on any failure.',
  usageExample: {
    scenario: 'A support workflow fetches the full details of one specific Intercom conversation before summarizing it with an AI Agent.',
    inputValues: { operation: 'get', accessToken: '', conversationId: '123456789' },
    expectedOutput: 'Intercom returns the conversation as {{$json.data}}, so a later step can read {{$json.data.conversation_message.body}}.',
  },
  externalDocsUrl: 'https://developers.intercom.com/docs/references/rest-api/api.intercom.io/',
};

const sendOperation: OperationDoc = {
  name: 'Send',
  value: 'send',
  description: 'Posts a reply into an existing Intercom conversation via POST /conversations/{conversationId}/reply. This is the node\'s core write capability, but Operation must currently be set to send via workflow JSON or AI generation - it is not one of the selectable values in the Operation dropdown, and Message/Admin Id have no dedicated Properties Panel fields either.',
  fields: [...sharedFields, conversationIdField, messageField, adminIdField, dataField],
  outputExample: {
    operation: 'send',
    data: {
      type: 'conversation',
      id: '123456789',
      conversation_parts: { type: 'conversation_part.list', conversation_parts: [{ type: 'conversation_part', body: 'Thanks for reaching out! A team member will follow up shortly.' }] },
    },
  },
  outputDescription: 'operation: echoes back "send". data: Intercom\'s raw response - the updated conversation object including the new reply under conversation_parts. _error: present only when the request failed, for example "message is required for send" or "adminId is required for admin conversation replies". _errorCode: set to "INTERCOM_FAILED" on any failure.',
  usageExample: {
    scenario: 'An AI Agent drafts a reply, and this node posts it into the original Intercom conversation as the support team.',
    inputValues: { operation: 'send', accessToken: '', conversationId: '123456789' },
    expectedOutput: 'Intercom returns the updated conversation as {{$json.data}}, confirming the reply was posted.',
  },
  externalDocsUrl: 'https://developers.intercom.com/docs/references/rest-api/api.intercom.io/',
};

export const intercomDoc: NodeDoc = {
  slug: 'intercom',
  displayName: 'Intercom',
  category: 'CRM',
  logoUrl: '/icons/nodes/intercom.svg',
  description: 'List Intercom conversations, fetch one conversation, or reply to a conversation. Note: the visual Operation dropdown only reliably supports List and Get today - see the Operation field for details.',
  credentialType: 'Intercom Access Token',
  credentialSetupSteps: [
    'What this is: The Intercom connection lets CtrlChecks store your Intercom access token safely in Connections, instead of pasting it into every workflow that uses Intercom.',
    'Where to start: In Intercom, go to developers.intercom.com -> Your App -> Configure -> Authentication, and copy the access token shown there (or use the CtrlChecks Intercom OAuth connection flow to sign in directly).',
    'How to connect: In CtrlChecks, open Connections -> Add Connection -> Intercom, then paste the access token or complete the OAuth sign-in. CtrlChecks tests the credential with GET https://api.intercom.io/me.',
    'Once saved, the connection is injected automatically into the node\'s Access Token field at run time - you do not need to fill Access Token directly.',
    'Important: Treat the access token like a bank password. Store it in Connections, not in a plain workflow field, and never share it outside CtrlChecks.',
    'Test it: Save the connection, add an Intercom node with Operation set to List, run it, and confirm CtrlChecks returns real conversation data instead of an authentication error.',
    'Connect the Intercom output to a logging, If/Else, or follow-up node when later steps should inspect {{$json.data}}. Downstream service node account connection setup is still required for nodes after Intercom; this connection only authorizes Intercom conversation operations.',
  ],
  credentialDocsUrl: 'https://developers.intercom.com/docs/build-an-integration/learn-more/authentication',
  resources: [
    {
      name: 'Operations',
      description: 'Intercom conversation actions. Only three operations exist in the runtime (List, Get, Send); the visual Operation dropdown currently exposes six values, four of which always fail, and does not include Send at all.',
      operations: [listOperation, getOperation, sendOperation],
    },
  ],
  commonErrors: [
    {
      error: 'accessToken is required',
      cause: 'No Access Token was typed on the node and no Intercom connection is saved in Connections for this workflow/user.',
      fix: 'Connect Intercom in CtrlChecks -> Connections -> Intercom, or paste an access token directly into the node for a quick test.',
    },
    {
      error: 'conversationId is required for get',
      cause: 'Get was run with the Conversation Id field left empty (filling the decorative Resource ID field does not count).',
      fix: 'Fill the Conversation Id field with the ID of the Intercom conversation to fetch.',
    },
    {
      error: 'conversationId is required for send',
      cause: 'Send was run with the Conversation Id field left empty.',
      fix: 'Fill the Conversation Id field with the ID of the Intercom conversation to reply to.',
    },
    {
      error: 'message is required for send',
      cause: 'Send was run without a Message value and without a Data (JSON) payload override - and Message has no field in this Properties Panel today.',
      fix: 'Provide a full reply payload in the Data (JSON) field (for example {"message_type":"comment","type":"admin","admin_id":"...","body":"..."}) until Message gets its own Properties Panel field.',
    },
    {
      error: 'adminId is required for admin conversation replies',
      cause: 'Send was run without an Admin Id value and without a Data (JSON) payload override - and Admin Id has no field in this Properties Panel today.',
      fix: 'Provide a full reply payload in the Data (JSON) field including admin_id until Admin Id gets its own Properties Panel field.',
    },
    {
      error: 'Unsupported Intercom operation: <operation>',
      cause: 'Operation was set to create, update, delete, or search - none of which exist in the execution engine, even though they appear in the Operation dropdown.',
      fix: 'Choose List or Get from the Operation dropdown instead. There is no supported way to create, update, delete, or search records with this node today.',
    },
    {
      error: 'Intercom operation failed',
      cause: 'A network problem or an unexpected Intercom API response prevented the request from completing; the underlying HTTP error detail is included in the message.',
      fix: 'Confirm your Intercom account is reachable and the Conversation Id (if used) exists, then re-run the node.',
    },
  ],
  relatedNodes: [],
};
