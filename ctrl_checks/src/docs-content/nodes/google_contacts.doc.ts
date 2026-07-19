import type { NodeDoc } from '../types';

const operationHelpText = `What this field means: Operation chooses which Google Contacts action this node performs.

Why it matters: It decides which Google People API call runs and which other fields become required.

When to fill it: Choose it first, before filling any other field.

What to enter: Choose List Contacts to fetch either every contact or one specific contact, Create Contact to add a new one, Update Contact to change an existing one, or Delete Contact to remove one.

Where the value comes from: This is a fixed dropdown choice made while building the workflow.

How to use it later: List Contacts returns either a connections array (Contact ID empty) or one contact (Contact ID filled) under {{$json.data}}; create/update return the affected contact's full person resource under {{$json.data}}; delete returns {{$json.data.deleted}} and {{$json.data.contactId}}.

Accepted format: One of read (labeled List Contacts in the dropdown), create, update, or delete.

Real workplace example: Use List Contacts to sync your address book into a CRM, Create Contact when a new lead form is submitted, Update Contact when a CRM sync changes someone's phone number, and Delete Contact when someone unsubscribes and asks to be forgotten.

If it is empty or wrong: Runtime returns "Unsupported Google Contacts operation: <value>" for any unrecognized value.

Common mistake: Choosing Update or Delete without filling Contact ID — the People API cannot identify which contact to change without it.

Dropdown options: List Contacts (internally read) fetches every contact, or one specific contact when Contact ID is filled. create adds a new contact and needs Name, Email, and/or Phone. update changes an existing contact and needs Contact ID plus at least one of Name, Email, or Phone. delete removes a contact and needs Contact ID only.`;

const contactIdHelpText = `What this field means: Contact ID identifies the specific Google Contact this Update or Delete operation should act on.

Why it matters: The People API needs to know exactly which contact resource to change or remove.

When to fill it: Required for update and delete. Not used for create.

What to enter: The contact's People API resource name or its bare ID — either "people/c1234567890" or just "c1234567890" both work, since runtime adds the "people/" prefix automatically if it's missing.

Where the value comes from: A previously read or created contact's resourceName field (accessible via {{$json.data.resourceName}} when read is set directly in workflow JSON), or wherever your workflow has stored a contact reference.

How to use it later: Update's response includes the same identifier inside {{$json.data.resourceName}}.

Accepted format: A People API resource name such as people/c1234567890, or the bare ID c1234567890.

Real workplace example: Store {{$json.data.resourceName}} from a Create Contact step, then use it later to Update or Delete that same contact.

If it is empty or wrong: Runtime throws "contactId is required for update" or "...for delete" when blank. A wrong or deleted ID returns a People API error.

Common mistake: Using an email address or display name here instead of the actual resource name/ID — the People API only accepts the resource identifier.`;

const nameHelpText = `What this field means: Name is the contact's display name.

Why it matters: It is the primary way people and Google Contacts identify this entry.

When to fill it: Fill at least one of Name, Email, or Phone for create and update; Name alone is enough to create a bare-minimum contact.

What to enter: A full name, such as "Alice Johnson".

Where the value comes from: Type it directly, or map it from an earlier step such as a form submission or CRM record, e.g. {{$json.fullName}}.

How to use it later: The saved name is echoed back inside {{$json.data.names}} (as an array of name objects) after create/update.

Accepted format: Plain text; runtime uses it for both the contact's displayName and givenName.

Real workplace example: "{{$json.fullName}}" mapped from a new-lead form submission.

If it is empty or wrong: If Name, Email, Phone, and Contact Data are all empty, runtime throws "At least one of name, email, phone, or contactData is required to create a contact" (or the equivalent update message).

Common mistake: Providing only a first name, which Google Contacts will use as both the given name and the full display name.`;

const emailHelpText = `What this field means: Email is the contact's email address.

Why it matters: It is usually the most useful field for later matching this contact to other records (CRM, marketing lists).

When to fill it: Fill at least one of Name, Email, or Phone for create and update.

What to enter: A valid email address.

Where the value comes from: Type it directly, or map it from an earlier step such as a signup form, e.g. {{$json.email}}.

How to use it later: The saved address is echoed back inside {{$json.data.emailAddresses}} (as an array of email objects) after create/update.

Accepted format: A single email address.

Real workplace example: "{{$json.email}}" mapped from a newsletter signup.

If it is empty or wrong: If Name, Email, Phone, and Contact Data are all empty, runtime throws the "At least one of name, email, phone, or contactData is required" error. An invalid address format is rejected by the People API.

Common mistake: Trying to add multiple email addresses by separating them with commas in this single field — use the advanced Contact Data field with a proper emailAddresses array instead.`;

const phoneHelpText = `What this field means: Phone is the contact's phone number.

Why it matters: It gives a second, non-email way to reach or identify the contact.

When to fill it: Optional; fill it when a phone number is available and useful for this contact.

What to enter: A phone number, ideally with a country code prefix such as +1 or +44.

Where the value comes from: Type it directly, or map it from an earlier step such as a signup form, e.g. {{$json.phone}}.

How to use it later: The saved number is echoed back inside {{$json.data.phoneNumbers}} (as an array of phone objects) after create/update.

Accepted format: A phone number string; include the + country code prefix for reliable international formatting.

Real workplace example: "+14155551234" mapped from a customer's contact form submission.

If it is empty or wrong: Empty is fine as long as Name, Email, or Contact Data has a value instead. An invalid format is generally still accepted by the People API as free-form text.

Common mistake: Omitting the country code, which can make the number ambiguous or hard to dial correctly from other countries.`;

const maxResultsHelpText = `What this field means: Max Results (internally the pageSize field) caps how many contacts List Contacts can return in one run.

Why it matters: It controls how much data comes back and how long the People API call takes, especially for a large address book.

When to fill it: Optional; only used for List Contacts when Contact ID is left empty. Ignored when Contact ID is filled, since that fetches exactly one contact.

What to enter: A whole number such as 25, 100, or 500.

Where the value comes from: This is a fixed workflow design choice based on how many contacts downstream nodes (like a Loop) should realistically handle per run.

How to use it later: {{$json.data.connections}} will contain at most this many contacts.

Accepted format: A positive integer.

Real workplace example: Set to 500 for a full nightly CRM sync, or 25 for a quick spot-check.

If it is empty or wrong: Runtime defaults to 100 when left empty.

Common mistake: Setting this very high expecting it to also filter which contacts come back — it only limits the count, it does not search or filter by name/email.`;

export const googleContactsDoc: NodeDoc = {
  slug: 'google_contacts',
  displayName: 'Google Contacts',
  category: 'Google',
  logoUrl: '/icons/nodes/google_contacts.svg',
  description: 'List, create, update, and delete Google Contacts through the connected Google account.',
  credentialType: 'Google OAuth (Contacts scope) - saved in Connections and shared with other Google nodes',
  credentialSetupSteps: [
    'In CtrlChecks, open Connections -> Add Connection -> Google, sign in with the Google account whose contacts this node should manage, and grant the Contacts permission requested.',
    'The OAuth token is stored in the credential system. Do not paste Google tokens, client secrets, or passwords into Google Contacts workflow fields.',
    'The connected Google account needs write access to its own Contacts (this is standard once the Contacts scope is granted; there is no separate sharing step like Sheets/Docs/Drive).',
    'The same Google connection can also power Gmail, Google Sheets, and Google Calendar nodes if those scopes are granted.',
    'Connect the Google Contacts output to a logging, If/Else, error-handling, or follow-up node when later steps should inspect {{$json.data}} or {{$json._error}}.',
    'Downstream service node account connection setup is still required for nodes after Google Contacts; the Google connection only authorizes Contacts (and optionally Gmail/Sheets/Calendar) access.',
  ],
  credentialDocsUrl: 'https://developers.google.com/people/v1/how-tos/authorizing',
  resources: [
    {
      name: 'Contact',
      description: 'List, create, update, or delete a Google Contact.',
      operations: [
        {
          name: 'List Contacts',
          value: 'read',
          description: 'Fetches either every contact on the connected account (Contact ID left empty) or one specific contact (Contact ID filled), up to Max Results per run.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Google Contacts action to run.', helpText: operationHelpText, placeholder: 'read', example: 'read', defaultValue: 'read', options: ['read', 'create', 'update', 'delete'] },
            { name: 'Contact Id', internalKey: 'contactId', type: 'string', required: false, description: 'Optional: fetch one specific contact instead of a full listing.', helpText: contactIdHelpText, placeholder: 'c1234567890', example: '' },
            { name: 'Max Results', internalKey: 'pageSize', type: 'number', required: false, description: 'Caps how many contacts a full listing returns.', helpText: maxResultsHelpText, placeholder: '100', example: '100', defaultValue: '100' },
          ],
          outputExample: {
            operation: 'read',
            data: {
              connections: [
                { resourceName: 'people/c1', names: [{ displayName: 'Alice Johnson' }], emailAddresses: [{ value: 'alice@example.com' }] },
                { resourceName: 'people/c2', names: [{ displayName: 'Bob Lee' }], emailAddresses: [{ value: 'bob@example.com' }] },
              ],
              totalItems: 2,
            },
          },
          outputDescription: 'operation: echoes back "read". data.connections: array of contact person resources when Contact Id is empty (a listing). When Contact Id is filled, data is a single person resource instead (resourceName, names, emailAddresses, phoneNumbers). Failures return _error, _errorCode ("GOOGLE_CONTACTS_FAILED"), and _errorDetails instead.',
          usageExample: {
            scenario: 'Sync all Google Contacts into a CRM every night',
            inputValues: { operation: 'read', contactId: '', pageSize: '100' },
            expectedOutput: 'Returns a page of contacts. Loop over {{$json.data.connections}} and map each {{$json.data.connections[].emailAddresses[0].value}} into CRM fields.',
          },
          externalDocsUrl: 'https://developers.google.com/people/api/rest/v1/people.connections/list',
        },
        {
          name: 'Create Contact',
          value: 'create',
          description: 'Adds a new contact to Google Contacts using any combination of Name, Email, Phone, or the advanced Contact Data payload.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Google Contacts action to run.', helpText: operationHelpText, placeholder: 'create', example: 'create', defaultValue: 'read', options: ['read', 'create', 'update', 'delete'] },
            { name: 'Name', internalKey: 'name', type: 'string', required: false, description: 'Contact display name.', helpText: nameHelpText, placeholder: 'John Doe', example: '{{$json.fullName}}' },
            { name: 'Email', internalKey: 'email', type: 'string', required: false, description: 'Contact email address.', helpText: emailHelpText, placeholder: 'john@example.com', example: '{{$json.email}}' },
            { name: 'Phone', internalKey: 'phone', type: 'string', required: false, description: 'Contact phone number.', helpText: phoneHelpText, placeholder: '+1234567890', example: '{{$json.phone}}' },
          ],
          outputExample: {
            operation: 'create',
            data: {
              resourceName: 'people/c1234567890',
              etag: '%EgUBAj0...',
              names: [{ displayName: 'Alice Johnson', givenName: 'Alice Johnson' }],
              emailAddresses: [{ value: 'alice@example.com' }],
            },
          },
          outputDescription: 'operation: echoes back "create". data: the newly created Google People API person resource — data.resourceName is the contact\'s ID for later Update/Delete steps, data.names/emailAddresses/phoneNumbers hold what was saved. Unlike some other Google nodes, these fields are only under data, not duplicated at the top level. Failures return _error, _errorCode ("GOOGLE_CONTACTS_FAILED"), and _errorDetails instead.',
          usageExample: {
            scenario: 'Add a new lead to Google Contacts after a signup form is submitted',
            inputValues: { operation: 'create', name: '{{$json.fullName}}', email: '{{$json.email}}', phone: '{{$json.phone}}' },
            expectedOutput: 'A new contact is created. Save {{$json.data.resourceName}} to reference this contact in a later Update or Delete step.',
          },
          externalDocsUrl: 'https://developers.google.com/people/api/rest/v1/people/createContact',
        },
        {
          name: 'Update Contact',
          value: 'update',
          description: 'Changes the name, email, and/or phone of an existing contact identified by Contact ID, keeping other fields as-is.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Google Contacts action to run.', helpText: operationHelpText, placeholder: 'update', example: 'update', defaultValue: 'read', options: ['read', 'create', 'update', 'delete'] },
            { name: 'Contact Id', internalKey: 'contactId', type: 'string', required: true, description: 'Which contact to update.', helpText: contactIdHelpText, placeholder: 'c1234567890', example: '{{$json.data.resourceName}}' },
            { name: 'Name', internalKey: 'name', type: 'string', required: false, description: 'New display name, if changing.', helpText: nameHelpText, placeholder: 'John Doe', example: '{{$json.fullName}}' },
            { name: 'Email', internalKey: 'email', type: 'string', required: false, description: 'New email address, if changing.', helpText: emailHelpText, placeholder: 'john@example.com', example: '{{$json.email}}' },
            { name: 'Phone', internalKey: 'phone', type: 'string', required: false, description: 'New phone number, if changing.', helpText: phoneHelpText, placeholder: '+1234567890', example: '{{$json.phone}}' },
          ],
          outputExample: {
            operation: 'update',
            data: {
              resourceName: 'people/c1234567890',
              etag: '%EgUBAj1...',
              names: [{ displayName: 'Alice M. Johnson', givenName: 'Alice M. Johnson' }],
              phoneNumbers: [{ value: '+14155551234' }],
            },
          },
          outputDescription: 'operation: echoes back "update". data: the updated Google People API person resource, reflecting the new values. Failures return _error, _errorCode ("GOOGLE_CONTACTS_FAILED"), and _errorDetails instead.',
          usageExample: {
            scenario: 'Update a contact\'s phone number after a CRM record changes',
            inputValues: { operation: 'update', contactId: '{{$json.contactId}}', phone: '{{$json.newPhone}}' },
            expectedOutput: 'The contact is updated. Use {{$json.data.phoneNumbers}} to confirm the new number was saved.',
          },
          externalDocsUrl: 'https://developers.google.com/people/api/rest/v1/people/updateContact',
        },
        {
          name: 'Delete Contact',
          value: 'delete',
          description: 'Permanently removes a contact from Google Contacts, identified by Contact ID — there is no undo once this runs.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Google Contacts action to run.', helpText: operationHelpText, placeholder: 'delete', example: 'delete', defaultValue: 'read', options: ['read', 'create', 'update', 'delete'] },
            { name: 'Contact Id', internalKey: 'contactId', type: 'string', required: true, description: 'Which contact to delete.', helpText: contactIdHelpText, placeholder: 'c1234567890', example: '{{$json.data.resourceName}}' },
          ],
          outputExample: { operation: 'delete', data: { deleted: true, contactId: 'people/c1234567890' } },
          outputDescription: 'operation: echoes back "delete". data.deleted: true once the contact is removed. data.contactId: the identifier that was deleted, echoed back for confirmation. Failures return _error, _errorCode ("GOOGLE_CONTACTS_FAILED"), and _errorDetails instead.',
          usageExample: {
            scenario: 'Remove a contact when someone unsubscribes and requests deletion',
            inputValues: { operation: 'delete', contactId: '{{$json.contactId}}' },
            expectedOutput: 'The contact is removed from Google Contacts. Use {{$json.data.deleted}} to confirm before logging the deletion.',
          },
          externalDocsUrl: 'https://developers.google.com/people/api/rest/v1/people/deleteContact',
        },
      ],
    },
  ],
  commonErrors: [
    { error: 'Unsupported Google Contacts operation', cause: 'Operation holds a value other than read, create, update, or delete — this can happen if a workflow JSON was hand-edited or imported with an old/incorrect value.', fix: 'Choose one of the four supported operations from the dropdown.' },
    { error: 'At least one of name, email, phone, or contactData is required to create a contact', cause: 'Name, Email, Phone, and the advanced Contact Data field were all left empty for create.', fix: 'Fill at least one of Name, Email, or Phone.' },
    { error: 'contactId is required for update', cause: 'Contact Id resolved to empty for an update operation.', fix: 'Fill Contact Id or map {{$json.data.resourceName}} from a previous Create/Read step.' },
    { error: 'contactId is required for delete', cause: 'Contact Id resolved to empty for a delete operation.', fix: 'Fill Contact Id or map {{$json.data.resourceName}} from a previous Create/Read step.' },
    { error: 'At least one of name, email, phone, or contactData is required to update a contact', cause: 'Name, Email, Phone, and Contact Data were all left empty for update.', fix: 'Fill at least one field to change on the contact.' },
    { error: 'Google OAuth token not found', cause: 'Neither the workflow owner nor the current user has a Google account connected with Contacts scope.', fix: 'Open Connections, add a Google connection, and grant the Contacts permission requested.' },
    { error: 'Next node cannot find contact fields', cause: 'The downstream node expects fields spread at the top level (like some other Google nodes provide), but Google Contacts only nests them under data.', fix: 'Use {{$json.data.resourceName}}, {{$json.data.names}}, {{$json.data.emailAddresses}}, or {{$json.data.connections}} — never a bare {{$json.resourceName}}.' },
    { error: 'Permission denied after Google Contacts', cause: 'The Google connection only authorizes Contacts (and optionally Gmail/Sheets/Calendar) access; downstream service nodes still need their own account connections and permissions.', fix: 'Connect the required account on the downstream service node and confirm that provider permission separately from Google Contacts.' },
  ],
  relatedNodes: ['google_gmail', 'google_sheets', 'ai_agent', 'http_request'],
};
