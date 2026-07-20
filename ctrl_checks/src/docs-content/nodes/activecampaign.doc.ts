import type { FieldDoc, NodeDoc, OperationDoc } from '../types';

const activecampaignDocs = 'https://developers.activecampaign.com/reference/overview';

const sharedFields: FieldDoc[] = [
  {
    name: 'Operation',
    internalKey: 'operation',
    type: 'select',
    required: true,
    description: 'Which ActiveCampaign contact action this node performs.',
    helpText: 'What this field means: Operation chooses whether this node creates, changes, or removes an ActiveCampaign contact. Why it matters: Each operation calls a different ActiveCampaign API endpoint and needs different fields — Add needs an email, Update and Delete need a Contact ID. When to fill it: Always required; pick exactly one operation per node. What to enter: Choose Add to create a brand-new contact, Update to change an existing contact\'s details, or Delete to permanently remove a contact. Where the value comes from: Decide based on what this step in the workflow should accomplish. How to use it later: The response always echoes back {{$json.operation}} so downstream steps or logs can confirm which action ran. Accepted format: One of add, update, or delete. Real workplace example: A lead-capture workflow uses Add for brand-new signups and a separate cleanup workflow uses Delete for unsubscribe requests. If it is empty or wrong: An unsupported value fails with Unsupported ActiveCampaign operation: .... Common mistake: Choosing Update when the contact does not exist yet — Update never creates a contact; use Add instead, or look up the contact first to get its Contact ID.',
    placeholder: 'add',
    defaultValue: 'add',
    example: 'add',
    options: ['add', 'update', 'delete'],
    notes: 'Dropdown options: Add (create a new contact), Update (change an existing contact by Contact ID), Delete (permanently remove a contact by Contact ID).',
  },
  {
    name: 'API URL',
    internalKey: 'apiUrl',
    type: 'url',
    required: true,
    description: 'Your ActiveCampaign account URL.',
    helpText: 'What this field means: API URL is the base web address of your specific ActiveCampaign account, used as the target for every API call this node makes. Why it matters: ActiveCampaign is multi-tenant — every account has its own unique subdomain, so CtrlChecks cannot guess this value; without the exact URL, every request fails immediately. When to fill it: Always required. What to enter: The full URL shown on your account\'s Developer settings page, such as https://youraccount.api-us1.com — include the https:// prefix. Where the value comes from: In ActiveCampaign, go to Settings -> Developer; the API URL and API Key are both shown there together. How to use it later: This is a setup value only; it is not emitted as {{$json.apiUrl}} to downstream nodes. Accepted format: A full HTTPS URL with no trailing slash. Real workplace example: A marketing team\'s ActiveCampaign account uses https://acmemarketing.api-us1.com for every Add/Update/Delete call this node makes. If it is empty or wrong: An empty value fails immediately with apiUrl is required; a wrong or mistyped URL causes every request to fail (connection errors or 404s) since it is never reachable. Common mistake: Pasting the regular ActiveCampaign login URL (app.activecampaign.com) instead of the account-specific API URL from the Developer settings page.',
    placeholder: 'https://youraccount.api-us1.com',
    example: 'https://youraccount.api-us1.com',
  },
  {
    name: 'API Key',
    internalKey: 'apiKey',
    type: 'password',
    required: true,
    description: 'Your ActiveCampaign API key.',
    helpText: 'What this field means: API Key authenticates this node\'s requests to your ActiveCampaign account, sent as the Api-Token header on every call. Why it matters: Without a valid key, ActiveCampaign rejects every request with an authentication error. When to fill it: Always required, unless a saved ActiveCampaign connection already provides it (see Connection setup below). What to enter: The API key shown on the same Developer settings page as API URL. Where the value comes from: ActiveCampaign -> Settings -> Developer -> API Access; click Show/Copy next to the key. How to use it later: This is a setup value only; it is never emitted as {{$json.apiKey}} to downstream nodes. Accepted format: Plain API key text as shown by ActiveCampaign. Real workplace example: A sales operations admin pastes the key once when building the workflow, or better, saves it as a CtrlChecks Connection so it is not stored in plain workflow config. If it is empty or wrong: An empty value fails immediately with apiKey is required; a wrong or revoked key causes every request to fail with an ActiveCampaign authentication error. Common mistake: Typing this value directly into the node instead of saving an ActiveCampaign connection under Connections — a value typed here lives in the workflow\'s own configuration, not the credential vault, so avoid sharing or exporting the workflow JSON if you fill it this way.',
    placeholder: 'your-api-key',
    example: 'a1b2c3d4e5f6g7h8i9j0',
    notes: 'A saved Connections -> ActiveCampaign credential (vaultKey activecampaign) can supply this value instead of typing it directly into the node. The Connections credential only covers apiKey — API URL must still be entered on the node itself, since it is account-specific.',
  },
  {
    name: 'Data (JSON)',
    internalKey: 'data',
    type: 'json',
    required: false,
    description: 'Optional raw contact payload override. If set, takes precedence over Email/First Name/Last Name.',
    helpText: 'What this field means: Data lets you send ActiveCampaign\'s exact contact JSON shape yourself instead of using the simpler Email/First Name/Last Name fields, useful for setting custom fields ActiveCampaign supports but this node does not expose as dedicated fields. Why it matters: When this field has a value, it completely replaces Email/First Name/Last Name for both Add and Update — those three fields are silently ignored once Data is set. When to fill it: Leave it empty for simple add/update calls using Email/First Name/Last Name. Fill it when you need to set additional ActiveCampaign contact fields (phone, custom fields, tags) that this node\'s simple fields do not cover. What to enter: A JSON object matching ActiveCampaign\'s contact shape, such as {"email": "test@example.com", "firstName": "John", "lastName": "Doe", "phone": "5551234567"}. Where the value comes from: ActiveCampaign\'s Contact API documentation lists every supported field. How to use it later: This is a request input only; ActiveCampaign\'s response (not this input) becomes {{$json.data}} afterward. Accepted format: Valid JSON object. Real workplace example: A team needs to set a custom "lead_source" field ActiveCampaign supports but this node\'s dedicated fields do not, so they use Data with {"email": "{{$json.email}}", "fieldValues": [{"field": "5", "value": "Webinar"}]}. If it is empty or wrong: Empty falls back to the Email/First Name/Last Name fields; invalid JSON causes the request body to be malformed and ActiveCampaign to reject it. Common mistake: Setting both Data and Email/First Name/Last Name expecting them to merge — Data always wins completely when present; the other three fields are not merged in.',
    placeholder: '{"email": "test@example.com", "firstName": "John", "lastName": "Doe"}',
    example: '{"email": "test@example.com", "firstName": "John", "lastName": "Doe"}',
  },
];

const addFields: FieldDoc[] = [
  {
    name: 'Email',
    internalKey: 'email',
    type: 'email',
    required: true,
    description: 'Contact email address. Required for add unless provided via Data.',
    helpText: 'What this field means: Email is the new contact\'s email address, the primary identifier ActiveCampaign uses for every contact. Why it matters: ActiveCampaign requires an email address to create any contact; without one (and without Data providing one), the request fails before it even reaches ActiveCampaign. When to fill it: Required for Add, unless you are using Data to supply the full contact payload instead. What to enter: A valid email address, either typed directly or mapped from an earlier step. Where the value comes from: A form submission, CRM record, or any earlier workflow step that captured a lead\'s email. How to use it later: The ActiveCampaign response includes the created contact\'s data at {{$json.data.contact.email}} for confirmation. Accepted format: A standard email address. Real workplace example: A form-to-CRM workflow maps {{$json.formEmail}} into this field to create a new ActiveCampaign contact for every website signup. If it is empty or wrong: Missing this (and Data) fails validation with email is required for add before any API call is made; a malformed email is rejected by ActiveCampaign\'s own validation. Common mistake: Leaving this blank while also leaving Data blank — at least one of the two must supply an email for Add to succeed.',
    placeholder: 'test@example.com',
    example: 'newlead@example.com',
  },
  {
    name: 'First Name',
    internalKey: 'firstName',
    type: 'string',
    required: false,
    description: 'Contact first name.',
    helpText: 'What this field means: First Name is the new contact\'s given name. Why it matters: It personalizes ActiveCampaign automations and email templates (such as "Hi {{contact.firstName}}"). When to fill it: Optional, but recommended whenever the data is available from an earlier step. What to enter: The contact\'s first name as plain text. Where the value comes from: A form submission, CRM record, or an earlier workflow step. How to use it later: Included in the ActiveCampaign response at {{$json.data.contact.firstName}}. Accepted format: Plain text. Real workplace example: A lead-capture workflow maps {{$json.formFirstName}} here so ActiveCampaign\'s welcome email can greet the contact by name. If it is empty or wrong: Empty simply omits the name from the new contact — ActiveCampaign does not require it. Common mistake: Mapping a full name (John Doe) into First Name and leaving Last Name empty instead of splitting them.',
    placeholder: 'John',
    example: 'Alex',
  },
  {
    name: 'Last Name',
    internalKey: 'lastName',
    type: 'string',
    required: false,
    description: 'Contact last name.',
    helpText: 'What this field means: Last Name is the new contact\'s family name. Why it matters: It completes the contact\'s display name in ActiveCampaign\'s CRM and email personalization. When to fill it: Optional, but recommended whenever the data is available. What to enter: The contact\'s last name as plain text. Where the value comes from: A form submission, CRM record, or an earlier workflow step. How to use it later: Included in the ActiveCampaign response at {{$json.data.contact.lastName}}. Accepted format: Plain text. Real workplace example: A lead-capture workflow maps {{$json.formLastName}} here alongside First Name. If it is empty or wrong: Empty simply omits the name from the new contact. Common mistake: Swapping First Name and Last Name values when mapping from a source system that lists last name first.',
    placeholder: 'Doe',
    example: 'Morgan',
  },
];

const updateFields: FieldDoc[] = [
  {
    name: 'Contact ID',
    internalKey: 'contactId',
    type: 'string',
    required: true,
    description: 'Required for update and delete operations.',
    helpText: 'What this field means: Contact ID identifies the existing ActiveCampaign contact this operation updates or deletes. Why it matters: ActiveCampaign needs to know exactly which contact record to change or remove; without it, Update and Delete have no target. When to fill it: Always required for Update and Delete. Not used for Add, which always creates a new contact. What to enter: The numeric ActiveCampaign contact ID. Where the value comes from: The {{$json.data.contact.id}} field returned by a previous Add or a contact lookup, or the ID shown in ActiveCampaign\'s contact URL. How to use it later: This is an input value only; it is not necessarily echoed back verbatim, though the updated contact\'s own id appears in the response at {{$json.data.contact.id}}. Accepted format: Numeric ID text. Real workplace example: A workflow first looks up a contact, then maps {{$json.data.contact.id}} from that step into Contact ID on a later Update step to add a new tag or field. If it is empty or wrong: Empty fails validation with contactId is required for update (or for delete); a wrong or nonexistent ID causes ActiveCampaign to return a not-found error. Common mistake: Passing an email address or a value from a different system instead of the actual numeric ActiveCampaign contact ID.',
    placeholder: 'contact-id',
    example: '482',
  },
  {
    name: 'Email',
    internalKey: 'email',
    type: 'email',
    required: false,
    description: 'Contact email address. Used with First Name/Last Name unless Data is set.',
    helpText: 'What this field means: Email updates the contact\'s email address. Why it matters: Along with First Name/Last Name, it is one of the simple fields this node can update without needing the full Data JSON payload. When to fill it: Fill it whenever you want to change (or reaffirm) the contact\'s email during an update. Leave the whole set of Email/First Name/Last Name blank if you only want to use Data instead. What to enter: A valid email address. Where the value comes from: An earlier workflow step with updated contact information. How to use it later: Reflected in the response at {{$json.data.contact.email}}. Accepted format: A standard email address. Real workplace example: A workflow syncing corporate email changes updates the ActiveCampaign contact\'s Email field whenever an HR system reports an address change. If it is empty or wrong: Empty leaves the field unset in the request (ActiveCampaign keeps the existing value); a malformed email is rejected by ActiveCampaign. Common mistake: Assuming leaving this blank clears the contact\'s existing email in ActiveCampaign — it does not; blank means "don\'t change this field," not "erase it."',
    placeholder: 'test@example.com',
    example: 'updated@example.com',
  },
  {
    name: 'First Name',
    internalKey: 'firstName',
    type: 'string',
    required: false,
    description: 'Contact first name.',
    helpText: 'What this field means: First Name updates the contact\'s given name during Update. Why it matters: Keeps ActiveCampaign\'s contact record and personalized emails in sync with the source system. When to fill it: Fill it when the contact\'s first name is changing. Leave blank to leave it unchanged. What to enter: Plain text first name. Where the value comes from: An earlier workflow step with updated contact information. How to use it later: Reflected in the response at {{$json.data.contact.firstName}}. Accepted format: Plain text. Real workplace example: A CRM-sync workflow updates the ActiveCampaign contact\'s name whenever the source CRM record changes. If it is empty or wrong: Empty leaves the existing value unchanged in ActiveCampaign. Common mistake: Expecting an empty value here to clear the name — it does not.',
    placeholder: 'John',
    example: 'Alex',
  },
  {
    name: 'Last Name',
    internalKey: 'lastName',
    type: 'string',
    required: false,
    description: 'Contact last name.',
    helpText: 'What this field means: Last Name updates the contact\'s family name during Update. Why it matters: Keeps ActiveCampaign\'s contact record in sync with the source system. When to fill it: Fill it when the contact\'s last name is changing. Leave blank to leave it unchanged. What to enter: Plain text last name. Where the value comes from: An earlier workflow step with updated contact information. How to use it later: Reflected in the response at {{$json.data.contact.lastName}}. Accepted format: Plain text. Real workplace example: A CRM-sync workflow updates the ActiveCampaign contact\'s last name alongside First Name. If it is empty or wrong: Empty leaves the existing value unchanged in ActiveCampaign. Common mistake: Expecting an empty value here to clear the name — it does not.',
    placeholder: 'Doe',
    example: 'Morgan',
  },
];

const deleteContactIdField: FieldDoc = {
  name: 'Contact ID',
  internalKey: 'contactId',
  type: 'string',
  required: true,
  description: 'Required for update and delete operations.',
  helpText: 'What this field means: Contact ID identifies which existing ActiveCampaign contact to permanently delete. Why it matters: ActiveCampaign needs to know exactly which contact record to remove; without it, Delete has no target and fails before any API call. When to fill it: Always required for Delete. What to enter: The numeric ActiveCampaign contact ID. Where the value comes from: A previous Add/Update step\'s {{$json.data.contact.id}}, a contact lookup, or the ID shown in ActiveCampaign\'s contact URL. How to use it later: The node\'s own output echoes it back at {{$json.data.contactId}} for confirmation after a successful delete. Accepted format: Numeric ID text. Real workplace example: An unsubscribe-cleanup workflow looks up a contact by email, then deletes it using the ID from that lookup. If it is empty or wrong: Empty fails validation with contactId is required for delete; a wrong or already-deleted ID causes ActiveCampaign to return a not-found error. Common mistake: Passing an email address instead of the numeric ActiveCampaign contact ID — deletion always requires the numeric ID, there is no delete-by-email option on this node.',
  placeholder: 'contact-id',
  example: '482',
};

const addOperation: OperationDoc = {
  name: 'Add',
  value: 'add',
  description: 'Creates a new contact in ActiveCampaign. Requires Email (or a Data payload that includes one). Use this when a new lead or customer should be added to your ActiveCampaign audience.',
  fields: [...sharedFields, ...addFields],
  outputExample: {
    operation: 'add',
    data: {
      contact: {
        id: '482',
        email: 'newlead@example.com',
        firstName: 'Alex',
        lastName: 'Morgan',
        cdate: '2026-07-19T10:20:00-05:00',
      },
    },
  },
  outputDescription: 'operation: echoes back which operation ran (add). data: the raw JSON response from ActiveCampaign\'s POST /api/3/contacts endpoint, wrapped exactly as ActiveCampaign returns it — a contact object containing id, email, firstName, lastName, cdate (creation date), and any other fields ActiveCampaign includes. Use {{$json.data.contact.id}} to capture the new contact\'s ID for a later Update or Delete step, and {{$json.data.contact.email}} to confirm which contact was created.',
  usageExample: {
    scenario: 'Add a new website lead to ActiveCampaign as a contact',
    inputValues: {
      apiUrl: 'https://youraccount.api-us1.com',
      apiKey: '',
      email: '{{$json.formEmail}}',
      firstName: '{{$json.formFirstName}}',
      lastName: '{{$json.formLastName}}',
    },
    expectedOutput: 'A new ActiveCampaign contact is created. Use {{$json.data.contact.id}} in a later step to tag or update this exact contact.',
  },
  externalDocsUrl: 'https://developers.activecampaign.com/reference/create-a-new-contact',
};

const updateOperation: OperationDoc = {
  name: 'Update',
  value: 'update',
  description: 'Updates an existing contact in ActiveCampaign, identified by Contact ID. Requires Contact ID. Use this to change a contact\'s email, name, or other fields (via Data) after they were already added.',
  fields: [...sharedFields, ...updateFields],
  outputExample: {
    operation: 'update',
    data: {
      contact: {
        id: '482',
        email: 'updated@example.com',
        firstName: 'Alex',
        lastName: 'Morgan',
        udate: '2026-07-19T10:25:00-05:00',
      },
    },
  },
  outputDescription: 'operation: echoes back which operation ran (update). data: the raw JSON response from ActiveCampaign\'s PUT /api/3/contacts/{id} endpoint — the updated contact object, including id, email, firstName, lastName, udate (update date), and any other fields ActiveCampaign includes. Use {{$json.data.contact.id}} to confirm which contact was updated.',
  usageExample: {
    scenario: 'Update a contact\'s email address after a CRM change',
    inputValues: {
      apiUrl: 'https://youraccount.api-us1.com',
      apiKey: '',
      contactId: '{{$json.contactId}}',
      email: '{{$json.newEmail}}',
    },
    expectedOutput: 'The existing ActiveCampaign contact\'s email is updated. {{$json.data.contact.email}} reflects the new value.',
  },
  externalDocsUrl: 'https://developers.activecampaign.com/reference/update-a-contact',
};

const deleteOperation: OperationDoc = {
  name: 'Delete',
  value: 'delete',
  description: 'Permanently deletes an existing contact from ActiveCampaign, identified by Contact ID. Requires Contact ID. This cannot be undone — ActiveCampaign does not have a recycle bin for deleted contacts.',
  fields: [sharedFields[0], sharedFields[1], sharedFields[2], deleteContactIdField],
  outputExample: {
    operation: 'delete',
    data: {
      deleted: true,
      contactId: '482',
    },
  },
  outputDescription: 'operation: echoes back which operation ran (delete). data: unlike Add/Update, Delete does not return ActiveCampaign\'s raw API response (ActiveCampaign\'s delete endpoint returns no body) — this node instead returns a simple confirmation object {deleted: true, contactId: <the ID you provided>}. Use {{$json.data.deleted}} to confirm success and {{$json.data.contactId}} to log which contact was removed.',
  usageExample: {
    scenario: 'Remove a contact from ActiveCampaign after they unsubscribe or request data deletion',
    inputValues: {
      apiUrl: 'https://youraccount.api-us1.com',
      apiKey: '',
      contactId: '{{$json.contactId}}',
    },
    expectedOutput: 'The contact is permanently removed from ActiveCampaign. {{$json.data.deleted}} confirms the deletion.',
  },
  externalDocsUrl: 'https://developers.activecampaign.com/reference/delete-a-contact',
};

export const activecampaignDoc: NodeDoc = {
  slug: 'activecampaign',
  displayName: 'ActiveCampaign',
  category: 'CRM',
  logoUrl: '/icons/nodes/activecampaign.svg',
  description: 'Add, update, or delete contacts in ActiveCampaign using your account\'s API key. Use this to sync leads and customers into your ActiveCampaign marketing automation audience.',
  credentialType: 'ActiveCampaign API Key',
  credentialSetupSteps: [
    'In ActiveCampaign, go to Settings -> Developer to find your account\'s API URL and API Key together on one page.',
    'Either save these under CtrlChecks -> Connections -> Add Connection -> ActiveCampaign (recommended — keeps the API Key out of plain workflow config; CtrlChecks tests the connection against GET {apiUrl}/api/3/users/me), or paste the API URL and API Key directly into the node\'s own fields.',
    'Note: a saved Connections credential only supplies the API Key automatically — API URL must still be entered on the node itself, since every ActiveCampaign account has a different one.',
    'Choose Add, Update, or Delete, fill the fields that operation needs, and run the node.',
    'This node has no separate webhook or trigger counterpart; it only runs when this step executes in the workflow.',
    'Connect the ActiveCampaign output to a logging, If/Else, or follow-up node when later steps should inspect {{$json.operation}} or {{$json.data}}. Downstream service node account connection setup is still required for nodes after ActiveCampaign; this connection only authorizes ActiveCampaign contact operations.',
  ],
  credentialDocsUrl: 'https://developers.activecampaign.com/reference/authentication',
  resources: [
    {
      name: 'Contacts',
      description: 'Add, update, or delete ActiveCampaign contacts via the REST API. Does not manage campaigns, automations, deals, or tags — contact records only.',
      operations: [addOperation, updateOperation, deleteOperation],
    },
  ],
  commonErrors: [
    {
      error: 'apiUrl is required',
      cause: 'The API URL field was left blank.',
      fix: 'Enter your ActiveCampaign account URL from Settings -> Developer, such as https://youraccount.api-us1.com.',
    },
    {
      error: 'apiKey is required',
      cause: 'The API Key field was left blank and no saved ActiveCampaign connection supplied one.',
      fix: 'Paste your API key from Settings -> Developer, or connect ActiveCampaign under Connections.',
    },
    {
      error: 'email is required for add',
      cause: 'Add was run without an Email value and without a Data payload that includes an email.',
      fix: 'Map an email address into the Email field, or include one in the Data JSON payload.',
    },
    {
      error: 'contactId is required for update',
      cause: 'Update was run without a Contact ID.',
      fix: 'Provide the numeric ActiveCampaign contact ID, usually from a previous Add step\'s {{$json.data.contact.id}} or a contact lookup.',
    },
    {
      error: 'contactId is required for delete',
      cause: 'Delete was run without a Contact ID.',
      fix: 'Provide the numeric ActiveCampaign contact ID of the contact to remove.',
    },
    {
      error: 'Unsupported ActiveCampaign operation: ...',
      cause: 'The operation value is something other than add, update, or delete.',
      fix: 'Choose Add, Update, or Delete from the Operation dropdown.',
    },
    {
      error: 'ActiveCampaign operation failed (ACTIVECAMPAIGN_FAILED)',
      cause: 'ActiveCampaign\'s API rejected the request — commonly an invalid/expired API key, a wrong API URL, a nonexistent Contact ID, or a malformed Data payload.',
      fix: 'Confirm the API URL and API Key are current from Settings -> Developer, verify the Contact ID exists, and check any Data JSON is valid.',
    },
    {
      error: 'Next node cannot find expected fields',
      cause: 'A downstream node expects a flat field such as {{$json.id}} or {{$json.email}}, but this node\'s real output nests everything under {{$json.data.contact...}} (or {{$json.data.deleted}}/{{$json.data.contactId}} for Delete).',
      fix: 'Map from {{$json.data.contact.id}}, {{$json.data.contact.email}}, etc., not top-level fields.',
    },
  ],
  relatedNodes: [],
};
