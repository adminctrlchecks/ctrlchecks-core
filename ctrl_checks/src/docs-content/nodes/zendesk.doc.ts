import type { NodeDoc, FieldDoc, OperationDoc } from '../types';

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'Which Zendesk REST API action to perform: list tickets, get one ticket, create, update, delete, or list users.',
  helpText:
    'What this field is: The dropdown that selects which Zendesk ticket or user action this node performs.\n' +
    'Why it matters: Zendesk exposes many different REST endpoints under one API; this field is what decides which one this node calls and which other fields become relevant.\n' +
    'When to fill it: Always — it is required on every run and it controls which fields (Ticket ID, Subject, Description, Status, Priority, Assignee ID, Results Per Page) are shown and used.\n' +
    'What to enter: Get Tickets to list every ticket, Get Ticket to fetch one by ID, Create Ticket to open a new support ticket, Update Ticket to change an existing one, Delete Ticket to permanently remove one, Get Users to list agents and end users.\n' +
    'Where the value comes from: Chosen directly from the dropdown — it is not copied from Zendesk itself.\n' +
    'How to use it later: The chosen operation determines the shape of {{$json.data}} — an array under tickets/users for the two list operations, a single ticket object for get/create/update, or an empty object for delete.\n' +
    'Accepted format: One of the six literal values: get_tickets, get_ticket, create_ticket, update_ticket, delete_ticket, get_users.\n' +
    'Real workplace example: A support triage workflow uses Get Tickets every morning to pull open high-priority tickets into Slack, while a website contact form uses Create Ticket to open a new ticket the moment a customer submits it.\n' +
    'If it is empty or wrong: The frontend always sends a value (it defaults to get_tickets); any other unrecognized value falls through to the node\'s own catch-all and returns "Unsupported operation: <value>".\n' +
    'Common mistake: Selecting Update Ticket or Delete Ticket without filling in Ticket ID — both require it, and Zendesk has no way to guess which ticket you mean.',
  options: ['get_tickets', 'get_ticket', 'create_ticket', 'update_ticket', 'delete_ticket', 'get_users'],
};

const subdomainField: FieldDoc = {
  name: 'Subdomain',
  internalKey: 'subdomain',
  type: 'string',
  required: true,
  description: 'Your Zendesk account subdomain, used to build the API URL for every request.',
  helpText:
    'What this field is: The short account name Zendesk assigned you, used to build the base API address for every request this node makes.\n' +
    'Why it matters: Every Zendesk account lives at its own subdomain (yourcompany.zendesk.com); without it the node has no address to send requests to.\n' +
    'When to fill it: Always — it is required for every operation.\n' +
    'What to enter: Only the subdomain portion, not the full URL and not https://.\n' +
    'Where the value comes from: Look at your Zendesk web address — if it is acme.zendesk.com, the subdomain is acme. This field also auto-fills from a saved Zendesk API Token connection.\n' +
    'How to use it later: This value is not part of the output — it only builds the request URL; downstream steps read {{$json.data}} for the actual result.\n' +
    'Accepted format: Plain text, lowercase, no dots or slashes — for example acme, not acme.zendesk.com or https://acme.zendesk.com.\n' +
    'Real workplace example: A support team at acme.zendesk.com enters acme once in a saved connection, and every Zendesk node in every workflow reuses it automatically.\n' +
    'If it is empty or wrong: An empty or incorrect subdomain builds a URL that does not resolve to your real Zendesk account, so every request fails with a connection or DNS-style error rather than a clean "not found" message.\n' +
    'Common mistake: Pasting the full URL (https://acme.zendesk.com) instead of just acme — the node builds https://${subdomain}.zendesk.com/api/v2 itself, so including the protocol or domain here produces a broken, doubled-up address.',
  placeholder: 'mycompany',
  example: 'acme',
};

const emailField: FieldDoc = {
  name: 'Agent Email',
  internalKey: 'email',
  type: 'email',
  required: true,
  description: 'The Zendesk agent email address used as the Basic Auth username, paired with the API token.',
  helpText:
    'What this field is: The email address of the Zendesk agent account this node authenticates as.\n' +
    'Why it matters: Zendesk\'s token authentication combines your email with the API token into one Basic Auth header; without a matching email, the token alone is not accepted.\n' +
    'When to fill it: Always — it is required for every operation.\n' +
    'What to enter: The exact email address you use to log in to Zendesk as an agent or admin.\n' +
    'Where the value comes from: Your own Zendesk login email. This field also auto-fills from a saved Zendesk API Token connection (stored there as the account\'s Email Address).\n' +
    'How to use it later: This value is not part of the output — it only authenticates the request.\n' +
    'Accepted format: A valid email address, exactly matching the account that owns the API token — for example agent@company.com.\n' +
    'Real workplace example: A support lead\'s Zendesk login email is entered once in a saved connection so every Zendesk node in the workspace authenticates as that account.\n' +
    'If it is empty or wrong: An email that does not match the API token\'s owning account fails Zendesk\'s Basic Auth check with a 401 Unauthorized response.\n' +
    'Common mistake: Entering a different agent\'s email than the one that generated the API token — Zendesk requires the two to match exactly.',
  placeholder: 'agent@example.com',
  example: 'agent@company.com',
};

const apiTokenField: FieldDoc = {
  name: 'API Token',
  internalKey: 'apiToken',
  type: 'password',
  required: true,
  description: 'The Zendesk API token that replaces your account password for this node\'s Basic Auth requests.',
  helpText:
    'What this field is: A Zendesk-generated API token used in place of your account password to authenticate every request.\n' +
    'Why it matters: Zendesk\'s API does not accept your normal login password for automated tools — an API token is required, and it is combined with Agent Email into a single Basic Auth header (username sent as "email/token", password as this token).\n' +
    'When to fill it: Always — it is required for every operation.\n' +
    'What to enter: The exact API token string Zendesk generates when you create it — it is shown only once.\n' +
    'Where the value comes from: Zendesk Admin Center → Apps and Integrations → APIs → Zendesk API → Add API token. This field also auto-fills from a saved Zendesk API Token connection, so it does not need to be retyped on every node.\n' +
    'How to use it later: This value is never part of the output and should never be read from {{$json}} in a downstream step.\n' +
    'Accepted format: A long opaque token string exactly as Zendesk generated it — for example abc123xyz789.\n' +
    'Real workplace example: An admin generates one token for CtrlChecks integrations, saves it once in a Zendesk connection, and every workflow node reuses it without anyone re-typing it.\n' +
    'If it is empty or wrong: A missing or revoked token fails every request with a 401 Unauthorized response, since Basic Auth cannot be completed without it.\n' +
    'Common mistake: Pasting the Zendesk account password here instead of a generated API token — Zendesk\'s token-based auth does not accept ordinary account passwords for this kind of integration.',
  placeholder: 'Zendesk API token',
};

const ticketIdField: FieldDoc = {
  name: 'Ticket ID',
  internalKey: 'ticketId',
  type: 'string',
  required: false,
  description: 'The numeric ID of the ticket to target — required for Get Ticket, Update Ticket, and Delete Ticket.',
  helpText:
    'What this field is: The numeric identifier of one specific Zendesk ticket.\n' +
    'Why it matters: Get Ticket, Update Ticket, and Delete Ticket all act on exactly one ticket, and this is the only way to tell Zendesk which one.\n' +
    'When to fill it: Required for Get Ticket, Update Ticket, and Delete Ticket. Not used at all for Get Tickets, Create Ticket, or Get Users.\n' +
    'What to enter: The plain numeric ticket ID, with no leading text or symbols.\n' +
    'Where the value comes from: Visible in the Zendesk ticket URL (https://mycompany.zendesk.com/agent/tickets/12345 → 12345), or map it from a previous step\'s output such as {{$json.ticket.id}} after a Create Ticket or Get Tickets step.\n' +
    'How to use it later: This value is not echoed back verbatim in every response, but the same ID appears inside {{$json.data.ticket.id}} on get_ticket/update_ticket responses, so you can confirm which ticket was affected.\n' +
    'Accepted format: A plain integer, as text — for example 12345.\n' +
    'Real workplace example: A workflow triggered by a customer reply looks up the ticket with {{$json.ticketId}} from an earlier webhook step, then updates its status to open.\n' +
    'If it is empty or wrong: Left blank on an operation that requires it, the request is sent with an incomplete URL and Zendesk returns a 404 Not Found; a nonexistent ID also returns 404.\n' +
    'Common mistake: Passing a ticket\'s subject or a URL instead of just the numeric ID — only the bare number belongs in this field.',
  placeholder: '12345',
};

const subjectField: FieldDoc = {
  name: 'Subject',
  internalKey: 'subject',
  type: 'string',
  required: false,
  description: 'The ticket\'s subject line — required for Create Ticket, optional for Update Ticket.',
  helpText:
    'What this field is: The short title/subject line shown at the top of the ticket in Zendesk.\n' +
    'Why it matters: Zendesk rejects a new ticket with no subject; on an update, this field only changes the subject if you actually fill it in.\n' +
    'When to fill it: Required for Create Ticket. Optional for Update Ticket — leave it blank there to keep the existing subject unchanged, since only non-empty fields are sent on update.\n' +
    'What to enter: A short, descriptive title summarizing the issue.\n' +
    'Where the value comes from: Type it directly, or map it from a form field or previous step such as {{$json.issueTitle}}.\n' +
    'How to use it later: The saved subject appears in the response at {{$json.data.ticket.subject}}.\n' +
    'Accepted format: Plain text, no strict length limit enforced by this node (Zendesk itself may truncate extremely long subjects).\n' +
    'Real workplace example: A website contact form sets Subject to "Issue reported by {{$json.name}}: {{$json.issueType}}" so every auto-created ticket is identifiable at a glance.\n' +
    'If it is empty or wrong: On Create Ticket, an empty subject is rejected by Zendesk with a 400 Bad Request. On Update Ticket, an empty subject simply means the existing subject is left untouched — it is not an error.\n' +
    'Common mistake: Assuming an empty Subject on Update Ticket will clear the subject — it will not; this node only sends fields that are actually filled in.',
  placeholder: 'Issue with order #1234',
};

const descriptionField: FieldDoc = {
  name: 'Description',
  internalKey: 'description',
  type: 'textarea',
  required: false,
  description: 'The body text that becomes the ticket\'s first comment when creating a new ticket.',
  helpText:
    'What this field is: The detailed message that becomes the very first comment on a newly created ticket, as if the customer had written it.\n' +
    'Why it matters: This is where the actual issue detail lives — the Subject alone is just a short title.\n' +
    'When to fill it: Only used by Create Ticket; it has no effect on any other operation, including Update Ticket (Zendesk\'s comment system for updates is not exposed by this node).\n' +
    'What to enter: The full explanation of the issue, as much detail as is useful for the support agent who picks it up.\n' +
    'Where the value comes from: Type a fixed message, or map it from a form submission or chatbot conversation, for example {{$json.message}}.\n' +
    'How to use it later: This exact text becomes the ticket\'s first comment inside Zendesk; it is not separately echoed back in this node\'s own output, since Zendesk\'s create-ticket response does not repeat comment bodies.\n' +
    'Accepted format: Plain text or simple formatted text; no strict length limit enforced by this node.\n' +
    'Real workplace example: "Customer {{$json.name}} ({{$json.email}}) reports: {{$json.description}}" turns a raw form submission into a properly attributed first comment.\n' +
    'If it is empty or wrong: Left blank, Zendesk still creates the ticket with an empty first comment — this is allowed but makes the ticket harder for an agent to act on.\n' +
    'Common mistake: Expecting this field to update an existing ticket\'s description — it only applies to Create Ticket; Update Ticket cannot add or change comments through this node.',
  placeholder: 'Describe the issue in detail…',
};

const statusField: FieldDoc = {
  name: 'Status',
  internalKey: 'status',
  type: 'select',
  required: false,
  description: 'The ticket\'s workflow state — used by Create Ticket and Update Ticket.',
  helpText:
    'What this field is: The current stage of the ticket in Zendesk\'s support workflow.\n' +
    'Why it matters: Status drives Zendesk\'s own views, SLAs, and reports — an incorrect status can hide a ticket from the queue an agent is watching, or prematurely mark it resolved.\n' +
    'When to fill it: Optional on Create Ticket (defaults to open if left as-is) and optional on Update Ticket, where an empty value leaves the current status unchanged since only filled fields are sent.\n' +
    'What to enter: One of Zendesk\'s six status values.\n' +
    'Where the value comes from: Choose it directly from the dropdown based on what stage the ticket should be in.\n' +
    'How to use it later: The saved status is echoed back at {{$json.data.ticket.status}}, useful for branching later steps with an If/Else node.\n' +
    'Accepted format: One of: new, open, pending, hold, solved, closed.\n' +
    'Real workplace example: A workflow that auto-resolves a ticket once a refund is issued sets Status to solved on Update Ticket right after the refund API call succeeds.\n' +
    'If it is empty or wrong: An unrecognized status value is rejected by Zendesk itself with a 400/422 validation error, since only the six listed values are valid.\n' +
    'Common mistake: Setting Status to closed directly — Zendesk normally expects tickets to pass through solved first; jumping straight to closed can skip customer-facing resolution notifications depending on your account\'s automations.',
  placeholder: 'open',
  defaultValue: 'open',
  options: ['new', 'open', 'pending', 'hold', 'solved', 'closed'],
};

const priorityField: FieldDoc = {
  name: 'Priority',
  internalKey: 'priority',
  type: 'select',
  required: false,
  description: 'The ticket\'s urgency level — used by Create Ticket and Update Ticket.',
  helpText:
    'What this field is: How urgently the ticket should be handled, shown as a colored flag in Zendesk\'s agent interface.\n' +
    'Why it matters: Priority affects SLA timers and how tickets sort in an agent\'s queue — setting it correctly gets urgent issues seen faster.\n' +
    'When to fill it: Optional on Create Ticket (defaults to normal if left as-is) and optional on Update Ticket, where an empty value leaves the current priority unchanged since only filled fields are sent.\n' +
    'What to enter: One of Zendesk\'s four priority values.\n' +
    'Where the value comes from: Choose it directly from the dropdown, often driven by upstream logic such as an If/Else node checking order value or customer tier.\n' +
    'How to use it later: The saved priority is echoed back at {{$json.data.ticket.priority}}.\n' +
    'Accepted format: One of: low, normal, high, urgent.\n' +
    'Real workplace example: A payment-failure webhook creates a ticket with Priority set to urgent so the on-call agent sees it immediately, while a general feedback form uses low.\n' +
    'If it is empty or wrong: An unrecognized priority value is rejected by Zendesk with a validation error, since only the four listed values are valid.\n' +
    'Common mistake: Setting every ticket to urgent to "be safe" — this defeats Zendesk\'s SLA prioritization and trains agents to ignore the urgent flag over time.',
  placeholder: 'normal',
  defaultValue: 'normal',
  options: ['low', 'normal', 'high', 'urgent'],
};

const assigneeIdField: FieldDoc = {
  name: 'Assignee ID',
  internalKey: 'assigneeId',
  type: 'string',
  required: false,
  description: 'The numeric Zendesk agent ID to assign the ticket to — only used by Update Ticket.',
  helpText:
    'What this field is: The numeric ID of the Zendesk agent who should own this ticket.\n' +
    'Why it matters: Assigning a ticket routes it into the correct agent\'s personal queue instead of leaving it in the general unassigned pool.\n' +
    'When to fill it: Only used by Update Ticket. Leave it blank to keep the current assignee unchanged, since only filled fields are sent on update; it has no effect on Create Ticket, where Zendesk\'s own routing rules decide the initial assignee.\n' +
    'What to enter: The agent\'s numeric Zendesk user ID, not their name or email.\n' +
    'Where the value comes from: Zendesk Admin Center → People → Team Members → click the agent → read the ID from the page URL. It can also be mapped from a previous step, such as {{$json.ticket.assignee_id}} after a Get Ticket call.\n' +
    'How to use it later: The new assignee ID is echoed back at {{$json.data.ticket.assignee_id}} after a successful update.\n' +
    'Accepted format: A plain integer, as text — for example 360015005678.\n' +
    'Real workplace example: A round-robin routing workflow picks the next available agent\'s ID from a lookup table and sets Assignee ID so new escalations are distributed evenly.\n' +
    'If it is empty or wrong: An ID that does not correspond to a real agent in the account is rejected by Zendesk with a validation error; left blank, the current assignee is simply left as-is.\n' +
    'Common mistake: Entering an agent\'s email address here instead of their numeric ID — Zendesk\'s assignee_id field requires the numeric user ID specifically.',
  placeholder: '360015005678',
};

const limitField: FieldDoc = {
  name: 'Results Per Page',
  internalKey: 'limit',
  type: 'number',
  required: false,
  description: 'How many records to return per request — used by Get Tickets and Get Users.',
  helpText:
    'What this field is: The page size Zendesk uses when returning a list of tickets or users.\n' +
    'Why it matters: Zendesk accounts can have thousands of tickets or users — this field controls how many come back in a single call, trading off completeness against response size and speed.\n' +
    'When to fill it: Only relevant for Get Tickets and Get Users; it has no effect on the other four operations, which each return at most one record.\n' +
    'What to enter: A whole number between 1 and 100.\n' +
    'Where the value comes from: Chosen directly based on how many records the downstream step needs — there is no external value to copy.\n' +
    'How to use it later: This value is not echoed back in the output; if more records exist beyond this page, {{$json.data.next_page}} contains a URL to the next page, though this node has no built-in way to follow it automatically.\n' +
    'Accepted format: A positive integer from 1 to 100 — the Zendesk API default and this node\'s frontend default is 25.\n' +
    'Real workplace example: A daily digest workflow sets this to 100 to capture as many open tickets as possible in one call before summarizing them.\n' +
    'If it is empty or wrong: Left blank, Zendesk applies its own default of 25. A value above 100 is capped by Zendesk\'s API itself, not by this node.\n' +
    'Common mistake: Assuming this field paginates automatically across multiple calls — it only sets the size of one page; use a Loop node with {{$json.data.next_page}} if you need every record in a large account.',
  placeholder: '25',
  defaultValue: '25',
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
    usageExample: {
      scenario: config.scenario,
      inputValues: config.inputValues,
      expectedOutput: config.expectedOutput,
    },
    externalDocsUrl: config.externalDocsUrl,
  };
}

const getTicketsOperation = buildOperation({
  name: 'Get Tickets',
  value: 'get_tickets',
  description: 'Lists tickets from your Zendesk account, one page at a time, sized by Results Per Page. Returns an array of ticket objects with status, priority, assignee, requester, and other fields.',
  fields: [operationField, subdomainField, emailField, apiTokenField, limitField],
  outputExample: { success: true, data: { tickets: [{ id: 12345, subject: 'Login not working', status: 'open', priority: 'high', requester_id: 360015001234, assignee_id: 360015005678, created_at: '2026-07-19T10:30:00Z', updated_at: '2026-07-19T11:45:00Z' }], count: 1, next_page: 'https://mycompany.zendesk.com/api/v2/tickets.json?page=2' }, error: {} },
  outputDescription: 'success: true only when Zendesk returned a 2xx status — unlike most other CRM nodes in this product, failures do NOT use an _error key at all; check success and error instead. data: the raw Zendesk response, containing a tickets array plus count and next_page for pagination. error: an empty object {} on success, or {message, status} on failure. Use {{$json.data.tickets}} for the array.',
  scenario: 'Every morning, list all tickets and forward the open, high-priority ones to a Slack channel for triage',
  inputValues: { operation: 'get_tickets', subdomain: 'mycompany', email: 'agent@mycompany.com', limit: '50' },
  expectedOutput: 'Returns up to 50 tickets in {{$json.data.tickets}}; a Filter node keeps only status=open and priority=high before a Slack Message node notifies the team.',
  externalDocsUrl: 'https://developer.zendesk.com/api-reference/ticketing/tickets/tickets#list-tickets',
});

const getTicketOperation = buildOperation({
  name: 'Get Ticket',
  value: 'get_ticket',
  description: 'Fetches one ticket by its numeric ID, returning the full ticket object including status, priority, assignee, requester, and any custom fields configured on the account.',
  fields: [operationField, subdomainField, emailField, apiTokenField, ticketIdField],
  outputExample: { success: true, data: { ticket: { id: 12345, subject: 'Login not working', status: 'open', priority: 'high', requester_id: 360015001234, assignee_id: 360015005678, created_at: '2026-07-19T10:30:00Z', updated_at: '2026-07-19T11:45:00Z' } }, error: {} },
  outputDescription: 'success: true only when Zendesk returned a 2xx status — check success and error instead of an _error key, which this node never sets. data: contains a single ticket object under the key ticket. error: an empty object {} on success, or {message, status} on failure, for example a 404 when the ticket does not exist. Use {{$json.data.ticket.status}} or {{$json.data.ticket.id}}.',
  scenario: 'Fetch a specific ticket by ID from a webhook payload to check its current status before deciding what to do next',
  inputValues: { operation: 'get_ticket', subdomain: 'mycompany', email: 'agent@mycompany.com', ticketId: '12345' },
  expectedOutput: 'Returns the full ticket in {{$json.data.ticket}}; an If/Else node branches on {{$json.data.ticket.status}} to decide the next step.',
  externalDocsUrl: 'https://developer.zendesk.com/api-reference/ticketing/tickets/tickets#show-ticket',
});

const createTicketOperation = buildOperation({
  name: 'Create Ticket',
  value: 'create_ticket',
  description: 'Creates a new support ticket. Subject is required; Description becomes the ticket\'s first comment. Status defaults to open and Priority to normal when left unset.',
  fields: [operationField, subdomainField, emailField, apiTokenField, subjectField, descriptionField, statusField, priorityField],
  outputExample: { success: true, data: { ticket: { id: 12345, subject: 'Login issue for user John Doe', status: 'open', priority: 'high', requester_id: 360015001234, created_at: '2026-07-19T12:00:00Z', updated_at: '2026-07-19T12:00:00Z' } }, error: {} },
  outputDescription: 'success: true only when Zendesk returned a 2xx status — check success and error, not an _error key, which this node never returns. data: contains the newly created ticket object under ticket, including its new numeric id. error: an empty object {} on success, or {message, status} on failure, for example a 400 when Subject is missing. Use {{$json.data.ticket.id}} to reference the new ticket in a later step.',
  scenario: 'Create a Zendesk ticket automatically when a customer submits a support request through a website form',
  inputValues: { operation: 'create_ticket', subdomain: 'mycompany', email: 'agent@mycompany.com', subject: 'Issue reported by {{$json.name}}: {{$json.issueType}}', description: 'Customer {{$json.name}} ({{$json.email}}) reports: {{$json.description}}' },
  expectedOutput: 'A new ticket is created; {{$json.data.ticket.id}} is used in a later step to send a confirmation email referencing the new ticket number.',
  externalDocsUrl: 'https://developer.zendesk.com/api-reference/ticketing/tickets/tickets#create-ticket',
});

const updateTicketOperation = buildOperation({
  name: 'Update Ticket',
  value: 'update_ticket',
  description: 'Updates an existing ticket by ID. Only fields you actually fill in are sent to Zendesk — every blank field (Subject, Status, Priority, Assignee ID) leaves its current value unchanged.',
  fields: [operationField, subdomainField, emailField, apiTokenField, ticketIdField, subjectField, statusField, priorityField, assigneeIdField],
  outputExample: { success: true, data: { ticket: { id: 12345, subject: 'Updated: Login issue for user John Doe', status: 'solved', priority: 'urgent', assignee_id: 360015005678, updated_at: '2026-07-19T13:00:00Z' } }, error: {} },
  outputDescription: 'success: true only when Zendesk returned a 2xx status — check success and error, not an _error key, which this node never returns. data: contains the updated ticket object under ticket, reflecting only the fields that were actually changed. error: an empty object {} on success, or {message, status} on failure, for example a 404 when Ticket ID does not exist. Use {{$json.data.ticket.status}} to confirm the change took effect.',
  scenario: 'When a customer replies confirming their issue is resolved, mark the ticket solved and assign it to the agent who handled it',
  inputValues: { operation: 'update_ticket', subdomain: 'mycompany', email: 'agent@mycompany.com', ticketId: '{{$json.ticketId}}', status: 'solved', assigneeId: '360015005678' },
  expectedOutput: 'The ticket status changes to solved and is reassigned; {{$json.data.ticket.status}} confirms the change before an Email node notifies the customer their issue is resolved.',
  externalDocsUrl: 'https://developer.zendesk.com/api-reference/ticketing/tickets/tickets#update-ticket',
});

const deleteTicketOperation = buildOperation({
  name: 'Delete Ticket',
  value: 'delete_ticket',
  description: 'Permanently deletes a ticket by ID. This action cannot be undone — Zendesk returns no body on success, which this node reflects as an empty data object.',
  fields: [operationField, subdomainField, emailField, apiTokenField, ticketIdField],
  outputExample: { success: true, data: {}, error: {} },
  outputDescription: 'success: true when Zendesk accepted the delete (Zendesk itself returns HTTP 204 with no body) — check success and error, not an _error key, which this node never returns. data: always an empty object {} on success, since Zendesk sends nothing back to describe. error: an empty object {} on success, or {message, status} on failure, for example a 404 when the ticket does not exist. There is no confirmation field like "deleted" — the absence of a failure is the only success signal.',
  scenario: 'Remove a duplicate or spam ticket that was created in error during testing',
  inputValues: { operation: 'delete_ticket', subdomain: 'mycompany', email: 'agent@mycompany.com', ticketId: '{{$json.ticketId}}' },
  expectedOutput: 'The ticket is permanently deleted; {{$json.success}} confirms it. This cannot be undone — consider Update Ticket with status=closed instead if the record should be preserved.',
  externalDocsUrl: 'https://developer.zendesk.com/api-reference/ticketing/tickets/tickets#delete-ticket',
});

const getUsersOperation = buildOperation({
  name: 'Get Users',
  value: 'get_users',
  description: 'Lists users from your Zendesk account, one page at a time, sized by Results Per Page. Returns agents, admins, and end users all mixed together in one array — there is no built-in role filter, so downstream filtering is needed to isolate just agents or just customers.',
  fields: [operationField, subdomainField, emailField, apiTokenField, limitField],
  outputExample: { success: true, data: { users: [{ id: 360015001234, name: 'John Doe', email: 'john@company.com', role: 'admin', created_at: '2026-01-15T09:00:00Z', updated_at: '2026-07-19T10:30:00Z' }], count: 1, next_page: 'https://mycompany.zendesk.com/api/v2/users.json?page=2' }, error: {} },
  outputDescription: 'success: true only when Zendesk returned a 2xx status — check success and error, not an _error key, which this node never returns. data: the raw Zendesk response, containing a users array (mixing agents, admins, and end users) plus count and next_page for pagination. error: an empty object {} on success, or {message, status} on failure. Use {{$json.data.users}} for the array and filter by {{$json.data.users[n].role}} if you only need agents.',
  scenario: 'List all agents and admins to sync with an internal directory used for round-robin ticket assignment',
  inputValues: { operation: 'get_users', subdomain: 'mycompany', email: 'agent@mycompany.com', limit: '100' },
  expectedOutput: 'Returns up to 100 users in {{$json.data.users}}; a Filter node keeps only role=agent or role=admin before storing the list in Google Sheets.',
  externalDocsUrl: 'https://developer.zendesk.com/api-reference/ticketing/users/users#list-users',
});

export const zendeskDoc: NodeDoc = {
  slug: 'zendesk',
  displayName: 'Zendesk',
  category: 'CRM',
  logoUrl: '/icons/nodes/zendesk.svg',
  description: 'List, fetch, create, update, and delete Zendesk support tickets, or list users, using HTTP Basic Auth (agent email + API token) against the Zendesk REST API.',
  credentialType: 'Zendesk API Token',
  credentialSetupSteps: [
    'Connect a Zendesk account under Connections — no third-party OAuth flow is used; Zendesk authenticates with an agent email plus a generated API token combined into a Basic Auth header.',
    'In Zendesk, go to Admin Center (gear icon) → Apps and Integrations → APIs → Zendesk API, make sure Token Access is enabled, then click Add API token and copy the token — it is shown only once.',
    'In CtrlChecks, open Connections → Add Connection → Zendesk API Token, then enter Subdomain (the part before .zendesk.com in your Zendesk URL), Email Address (your Zendesk login email), and the API Token you just copied.',
    'A saved connection auto-fills Subdomain, Agent Email, and API Token on this node at run time; you do not need to retype them on every node.',
    'Test the connection by running this node with Operation set to Get Tickets — a successful response confirms the subdomain, email, and token are all correct together.',
    'Connect the Zendesk output to a logging, If/Else, or follow-up node when later steps should inspect {{$json.data}}. Downstream service node account connection setup is still required for nodes after Zendesk; this connection only authorizes Zendesk ticket and user operations, not any other service.',
  ],
  credentialDocsUrl: 'https://developer.zendesk.com/api-reference/introduction/security-and-auth/',
  resources: [
    {
      name: 'Operations',
      description: 'Zendesk exposes six operations through its REST API: listing tickets, fetching one ticket, creating a ticket, updating a ticket, deleting a ticket, and listing users. Unlike most other CRM nodes in this product, failures are reported through a plain success/error shape rather than an _error key.',
      operations: [getTicketsOperation, getTicketOperation, createTicketOperation, updateTicketOperation, deleteTicketOperation, getUsersOperation],
    },
  ],
  commonErrors: [
    {
      error: 'Authentication failed (401 Unauthorized)',
      cause: 'The API token is invalid or revoked, or the Agent Email does not match the account that owns the token. Zendesk builds the Basic Auth header from these two fields together.',
      fix: 'Verify the API token in Zendesk Admin Center → Apps and Integrations → APIs → Zendesk API, confirm Agent Email is the exact email of the account that generated it, and re-save the Connections entry.',
    },
    {
      error: 'Ticket not found (404 Not Found)',
      cause: 'The Ticket ID does not exist in this Zendesk account, or the Subdomain points to the wrong account.',
      fix: 'Confirm the ticket ID with a Get Tickets call first, and verify the Subdomain matches the account where the ticket actually lives.',
    },
    {
      error: 'Subject is required (400 Bad Request)',
      cause: 'Create Ticket was run with an empty Subject field. Zendesk rejects new tickets without a subject line.',
      fix: 'Fill in the Subject field before running Create Ticket.',
    },
    {
      error: 'Unsupported operation: <operation>',
      cause: 'The Operation field held a value other than the six supported ones (get_tickets, get_ticket, create_ticket, update_ticket, delete_ticket, get_users) — this is the node\'s own literal error text, returned before any Zendesk request is made.',
      fix: 'Select one of the six values from the Operation dropdown rather than typing a custom value into workflow JSON.',
    },
    {
      error: 'Rate limit exceeded (429 Too Many Requests)',
      cause: 'Too many Zendesk API requests were made in a short window; Zendesk enforces a per-minute limit based on your plan.',
      fix: 'Add a Delay node between repeated Zendesk operations, or batch fewer requests per workflow run.',
    },
  ],
  relatedNodes: ['javascript', 'email', 'google_sheets', 'slack_message', 'http_request', 'filter', 'if_else'],
};
