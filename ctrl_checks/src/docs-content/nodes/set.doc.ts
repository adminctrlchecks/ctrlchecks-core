import type { NodeDoc } from '../types';

const fieldsHelpText = `What this field means: Fields is the JSON object that lists the new or replacement fields this node should place on the current workflow item.

Why it matters: The Set node is usually used to clean up messy incoming data before a CRM, email, sheet, database, or notification step needs predictable field names.

When to fill it: Fill this field every time you use the Set node. The backend requires fields, and the node only changes output data when this JSON object contains at least one key.

What to enter: Enter a JSON object where each key is the field name you want in the output and each value is the value to save there. Values can be fixed text, numbers, booleans, nested objects, or expressions from earlier workflow data.

Where the value comes from: Use fixed values for labels such as "new", "qualified", or "needs_review". Use previous-node values when the data came from a form, webhook, sheet row, email, CRM record, or API response.

How to use it later: Every key you set becomes available to the next node as {{$json.fieldName}}. For example, a downstream Email node can use {{$json.customerEmail}}, and a CRM node can map {{$json.lifecycleStage}}.

Accepted format: Valid JSON object only, such as {"customerEmail":"{{$json.email}}","lifecycleStage":"new_lead","orderTotal":{{$json.total}}}. Wrap text in quotes. Do not use a JSON array, plain sentence, or trailing comma.

Real workplace example: After a website lead form, set {"customerEmail":"{{$json.email}}","fullName":"{{$json.firstName}} {{$json.lastName}}","leadSource":"Website demo request","readyForSales":true} before creating a CRM contact and sending a Slack alert.

If it is empty or wrong: Empty or invalid JSON means the node cannot reliably create the fields you expect. If a field name matches an incoming field, the new value overwrites the old one. If an expression points to missing data, the next node may receive a blank or unresolved value.

Common mistake: Do not paste secrets, API keys, or passwords into fields. This node does not create account connections. Also avoid using display labels with spaces when the next node expects stable keys such as customerEmail or orderTotal.`;

export const setDoc: NodeDoc = {
  slug: 'set',
  displayName: 'Set',
  category: 'Data',
  logoUrl: '/icons/nodes/set.svg',
  description: 'Add clean, predictable fields to the current workflow item or overwrite existing fields before later steps use the data.',
  credentialType: 'None - Set does not use credentials or connect to a third-party account.',
  credentialSetupSteps: [
    'No third-party account is required because Set only reshapes data already inside the workflow.',
    'Connect the incoming output from a trigger, form, webhook, lookup, or service node into Set so it has data to enrich.',
    'Connect the Set output to the next action that should use the cleaned fields, such as Email, Slack, Google Sheets, HubSpot, or a database node.',
    'Downstream service nodes still need their own account connection and permissions; Set does not replace Gmail, Slack, CRM, database, or storage credentials.',
    'Never paste API keys, passwords, or private tokens into the fields object. Store service access through Connections or credential settings instead.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Use this resource when the workflow needs to add normalized names, flags, labels, totals, or mapped values to the current data item.',
      operations: [
        {
          name: 'Set Fields',
          value: 'default',
          description: 'Creates new output fields or replaces existing output fields using a JSON object. Choose this operation when a later step needs clearer field names, a fixed status, a combined display value, or a value copied from a previous trigger or service response.',
          fields: [
            {
              name: 'Fields (JSON)',
              internalKey: 'fields',
              type: 'json',
              required: true,
              description: 'JSON object of field names and values to add to the current item. Matching names overwrite the incoming value.',
              helpText: fieldsHelpText,
              placeholder: '{"customerEmail":"{{$json.email}}","status":"new"}',
              example: '{"customerEmail":"{{$json.email}}","fullName":"{{$json.firstName}} {{$json.lastName}}","leadSource":"Website demo request","readyForSales":true}',
              notes: 'Configured fields are merged on top of the incoming item. Use Rename Keys when you only want to rename existing keys, Edit Fields when you prefer row-by-row field controls, and JavaScript for complex transformations.',
            },
          ],
          outputExample: {
            leadId: 'lead_1042',
            firstName: 'Asha',
            lastName: 'Rao',
            email: 'asha.rao@example.com',
            total: 1499,
            customerEmail: 'asha.rao@example.com',
            fullName: 'Asha Rao',
            leadSource: 'Website demo request',
            lifecycleStage: 'new_lead',
            readyForSales: true,
          },
          outputDescription: 'The output keeps the incoming item and merges the configured fields on top. Existing values such as email and total remain available unless a configured key overwrites the same field name. New values such as customerEmail, fullName, leadSource, lifecycleStage, and readyForSales can be used by the next node through {{$json.customerEmail}}, {{$json.fullName}}, {{$json.leadSource}}, {{$json.lifecycleStage}}, and {{$json.readyForSales}}.',
          usageExample: {
            scenario: 'Normalize a website demo request before creating a CRM lead and notifying the sales team',
            inputValues: {
              fields: '{"customerEmail":"{{$json.email}}","fullName":"{{$json.firstName}} {{$json.lastName}}","leadSource":"Website demo request","lifecycleStage":"new_lead","readyForSales":true}',
            },
            expectedOutput: 'The next node can use {{$json.customerEmail}}, {{$json.fullName}}, {{$json.leadSource}}, {{$json.lifecycleStage}}, and {{$json.readyForSales}} without needing to know the original form field names.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Fields is required',
      cause: 'The Set node was added without a fields JSON object, or the object was left empty when a later step expected new fields.',
      fix: 'Add a valid JSON object such as {"status":"new","customerEmail":"{{$json.email}}"} and run the previous step once to confirm the source fields exist.',
    },
    {
      error: 'Set: fields must be valid JSON object',
      cause: 'The fields value is not valid JSON, has a trailing comma, uses single quotes, or is an array instead of an object.',
      fix: 'Use double quotes around text keys and values, remove trailing commas, and keep the top level as an object like {"fullName":"{{$json.firstName}} {{$json.lastName}}"}',
    },
    {
      error: 'Missing upstream value',
      cause: 'A value such as {{$json.email}} points to a field that the previous node did not output, or the previous node uses a different internal field name.',
      fix: 'Open the previous node output, copy the exact key path, and update the expression. For nested data, use the full path such as {{$json.customer.email}}.',
    },
    {
      error: 'Unexpected overwritten field',
      cause: 'A key in fields uses the same name as an incoming field, so the Set node replaces the original value.',
      fix: 'Use a new field name such as normalizedEmail or originalEmail if you need to preserve both values, or remove the duplicate key from fields.',
    },
    {
      error: 'Next node cannot find set field',
      cause: 'The downstream node is looking for a different key name, a display label, or an old field name that Set replaced.',
      fix: 'Reference the exact output key from Set, for example {{$json.customerEmail}} instead of {{$json.Email Address}} or {{$json.emailAddress}}.',
    },
    {
      error: 'Permission denied after Set',
      cause: 'Set does not use credentials, but the service node after it may still be missing a connected account or permission to create, update, send, or write data.',
      fix: 'Connect the required account on the downstream service node and confirm it has the needed read/write permission.',
    },
  ],
  relatedNodes: ['edit_fields', 'rename_keys', 'set_variable', 'javascript'],
};
