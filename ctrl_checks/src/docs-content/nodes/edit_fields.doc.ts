import type { NodeDoc } from '../types';

const fieldsHelpText = `What this field means: Fields is the list of output field names and values that Edit Fields should add to the current workflow item. In the builder this may appear as key-value rows; in docs and exported workflow data it is the same fields object.

Why it matters: Use this node when a later step needs cleaner names, fixed labels, combined values, or a copied value from a previous step, but you want a simpler field editor than writing one large JSON block.

When to fill it: Fill it when you want to add or overwrite one or more fields. It is optional at the backend level, so leaving it empty passes the incoming item through unchanged, but most useful workflows add at least one row.

What to enter: Enter each output field name as the key and the value to save as the value. Values can be fixed text, numbers, booleans, objects, or expressions from previous workflow data.

Where the value comes from: Copy values from a form, webhook, spreadsheet row, CRM lookup, email, database result, or API response. Common examples are {{$json.email}}, {{$json.firstName}}, {{$json.lastName}}, {{$json.order.total}}, or {{$json.ticket.priority}}.

How to use it later: Every field you add becomes available to the next node as {{$json.fieldName}}. For example, after setting customerEmail and fullName, a Slack or Email node can use {{$json.customerEmail}} and {{$json.fullName}}.

Accepted format: Key-value rows in the UI, or a JSON object in saved workflow data, such as {"customerEmail":"{{$json.email}}","fullName":"{{$json.firstName}} {{$json.lastName}}","priorityLabel":"High"}. Do not use a JSON array or plain sentence.

Real workplace example: A support team receives webhook fields named email, fname, lname, and severity. Edit Fields can create customerEmail, fullName, and priorityLabel before the workflow creates a helpdesk ticket and sends a manager alert.

If it is empty or wrong: Empty fields usually means no changes are made. If fields is not an object, runtime returns _error with "Edit Fields: fields must be an object". If a key already exists, the new value overwrites the old one.

Common mistake: Do not use this node to store account secrets or API tokens. Edit Fields has no credentials. Connect accounts on downstream service nodes, and use stable internal field names instead of visible form labels.`;

export const editFieldsDoc: NodeDoc = {
  slug: 'edit_fields',
  displayName: 'Edit Fields',
  category: 'Data',
  logoUrl: '/icons/nodes/edit_fields.svg',
  description: 'Add, overwrite, or normalize fields on the current workflow item using simple key-value mappings.',
  credentialType: 'None - Edit Fields does not use credentials or connect to a third-party account.',
  credentialSetupSteps: [
    'No third-party account is required because Edit Fields only changes data that is already inside the workflow.',
    'Connect an incoming output from a trigger, form, webhook, lookup, spreadsheet, CRM, or API node so Edit Fields has data to reshape.',
    'Connect the Edit Fields output to the next action that should use the cleaned fields.',
    'Downstream service nodes still need their own account connection and permissions; Edit Fields does not replace Gmail, Slack, CRM, database, sheet, or storage credentials.',
    'Do not paste API keys, passwords, private tokens, or connection strings into field values. Use Connections or credential settings for service access.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Use this resource to create friendly output names, enrich records with fixed labels, or prepare data before writing it to another system.',
      operations: [
        {
          name: 'Execute',
          value: 'default',
          description: 'Adds configured field values to the incoming item and overwrites matching keys when names are the same. Choose this operation when the workflow needs a quick, readable way to prepare data for the next action without writing custom JavaScript.',
          fields: [
            {
              name: 'Fields',
              internalKey: 'fields',
              type: 'json',
              required: false,
              description: 'Key-value field mappings to add or overwrite on the current item.',
              helpText: fieldsHelpText,
              placeholder: '{"customerEmail":"{{$json.email}}","fullName":"{{$json.firstName}} {{$json.lastName}}"}',
              example: '{"customerEmail":"{{$json.email}}","fullName":"{{$json.firstName}} {{$json.lastName}}","priorityLabel":"High"}',
              notes: 'Use Edit Fields when you want simple row-style mappings. Use Set when you prefer one JSON object, Rename Keys when the goal is only renaming, and JavaScript when the transformation needs loops or complex logic.',
            },
          ],
          outputExample: {
            ticketId: 'SUP-1042',
            email: 'maya@example.com',
            fname: 'Maya',
            lname: 'Chen',
            severity: 'high',
            customerEmail: 'maya@example.com',
            fullName: 'Maya Chen',
            priorityLabel: 'High',
            needsManagerReview: true,
          },
          outputDescription: 'The output is the incoming item plus each configured field value. Existing values remain available unless a configured field overwrites the same key. New fields such as customerEmail, fullName, priorityLabel, and needsManagerReview can be used by the next node with {{$json.customerEmail}}, {{$json.fullName}}, {{$json.priorityLabel}}, and {{$json.needsManagerReview}}. If fields is not an object, runtime returns _error explaining the problem.',
          usageExample: {
            scenario: 'Normalize support webhook data before creating a helpdesk ticket and alerting a manager',
            inputValues: {
              fields: '{"customerEmail":"{{$json.email}}","fullName":"{{$json.fname}} {{$json.lname}}","priorityLabel":"High","needsManagerReview":true}',
            },
            expectedOutput: 'The next node can use {{$json.customerEmail}}, {{$json.fullName}}, {{$json.priorityLabel}}, and {{$json.needsManagerReview}} while the original {{$json.ticketId}} remains available.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Fields must be an object',
      cause: 'The fields value resolved to a list, sentence, number, or another non-object value.',
      fix: 'Use key-value rows or a JSON object such as {"customerEmail":"{{$json.email}}","status":"active"}.',
    },
    {
      error: 'No fields changed',
      cause: 'Fields was left empty, so Edit Fields passed the incoming item through without adding anything.',
      fix: 'Add at least one key-value row when the next node expects a new field.',
    },
    {
      error: 'Missing upstream value',
      cause: 'A mapping such as {{$json.email}} points to a field that is not present in the previous node output.',
      fix: 'Run the previous node, inspect its output, and copy the exact internal key path such as {{$json.customer.email}}.',
    },
    {
      error: 'Unexpected overwritten field',
      cause: 'A configured key uses the same name as an incoming field, so the new value replaces the old value.',
      fix: 'Choose a different field name such as normalizedStatus or originalStatus if you need to keep both values.',
    },
    {
      error: 'Next node cannot find edited field',
      cause: 'The downstream node is referencing a display label, a misspelled key, or an old field name instead of the key created by Edit Fields.',
      fix: 'Use the exact edited key path, for example {{$json.customerEmail}} or {{$json.priorityLabel}}.',
    },
    {
      error: 'Permission denied after Edit Fields',
      cause: 'Edit Fields has no credentials, but the service node after it may not have a connected account or enough permission to send, create, update, or write data.',
      fix: 'Connect the account required by the downstream node and confirm it has the needed read/write permission.',
    },
  ],
  relatedNodes: ['set', 'rename_keys', 'set_variable', 'javascript'],
};
