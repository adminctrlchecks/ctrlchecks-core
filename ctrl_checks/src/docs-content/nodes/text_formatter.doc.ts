import type { NodeDoc, FieldDoc, OperationDoc } from '../types';

const templateField: FieldDoc = {
  name: 'Template',
  internalKey: 'template',
  type: 'textarea',
  required: true,
  description: 'The text pattern this node renders, mixing static text with {{$json.field}} expressions pulled from the current workflow item.',
  helpText:
    'What this field is: The text this node builds, with placeholders that get replaced by real data when the node runs.\n' +
    'Why it matters: This is the only setting on this node — the entire output is the resolved result of this one field.\n' +
    'When to fill it: Always — it is required on every run. An empty Template does not build a message; instead this node falls back to converting the whole incoming item to a JSON text blob (see "If it is empty or wrong" below).\n' +
    'What to enter: Static words plus one or more {{$json.field}} expressions, such as Hello {{$json.name}}, your order #{{$json.orderId}} totals {{$json.total}}.\n' +
    'Where the value comes from: Type the static wording directly, and insert data from earlier steps using {{$json.field}} syntax, such as {{$json.email}} or {{$json.order.total}}.\n' +
    'How to use it later: The result is not stored under a field name — it becomes the entire output of this node. Downstream nodes read it as {{$json}} directly, not {{$json.formatted}} or {{$json.text}}.\n' +
    'Accepted format: Free text mixed with any number of {{$json...}} expressions. A Template written as a single expression with no surrounding text (for example just {{$json.name}}, nothing else) behaves differently from a Template with any text around an expression — see the common mistake below.\n' +
    'Real workplace example: Order #{{$json.orderId}} shipped to {{$json.customerName}}, total {{$json.total}} builds a one-line shipment confirmation message ready for an Email or Slack node.\n' +
    'If it is empty or wrong: An empty or blank Template does not produce an error — instead this node returns the entire incoming item converted to a JSON text string (under both a data and a formatted field, both holding the same text), rather than a normal formatted message. A field reference inside the Template that does not exist on the incoming item resolves to an empty string wherever it appears — unless the ENTIRE Template is that one unresolved expression with nothing else around it, in which case the output becomes the literal 4-character text "null" instead of an empty string.\n' +
    'Common mistake: Writing a Template that is a single bare expression with no surrounding text, such as just {{$json.middleName}}, when that field might be missing — a normal Template like "Name: {{$json.middleName}}" quietly drops the missing value ("Name: "), but a bare single-expression Template turns a missing value into the literal word "null" appearing in the output.',
  placeholder: 'Hello {{$json.name}}',
  example: 'Order #{{$json.orderId}} - Total: {{$json.total}}',
};

const formatOperation: OperationDoc = {
  name: 'Format',
  value: 'default',
  description: 'Resolves every {{$json.field}} expression in Template against the current workflow item and returns the finished text as this node\'s entire output — not wrapped in an object. If Template is left blank, this node instead converts the whole incoming item to a JSON string and returns that under both a data and a formatted field.',
  fields: [templateField],
  outputExample: { '(entire output)': 'Order #12345 - Total: 49.99' },
  outputDescription: 'When Template is filled in, the output is the resolved text itself, returned directly — there is no wrapper object and no formatted field to read from (the "(entire output)" key above is a documentation label only, not a real field). Downstream nodes reference the whole result as {{$json}}, not {{$json.formatted}}. When Template is left blank, the output is instead a real object with two fields, data and formatted, both holding the entire incoming item converted to one JSON text string — the individual original fields are not preserved separately in that case.',
  usageExample: {
    scenario: 'Build a one-line shipment confirmation message for a notification node',
    inputValues: { template: 'Order #{{$json.orderId}} - Total: {{$json.total}}' },
    expectedOutput: 'The resolved text becomes the entire output of this node — the next node reads it directly as {{$json}} (not {{$json.formatted}}), for example as the message body for an Email or Slack node.',
  },
  externalDocsUrl: 'https://docs.ctrlchecks.com',
};

export const textFormatterDoc: NodeDoc = {
  slug: 'text_formatter',
  displayName: 'Text Formatter',
  category: 'Data',
  logoUrl: '/icons/nodes/text_formatter.svg',
  description: 'Render a text template against the current workflow item. When Template is filled in, the resolved text becomes this node\'s entire output directly — there is no wrapper object or formatted field to reference. When Template is left blank, the whole incoming item is instead converted to a JSON text string.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node has no third-party account or cloud credential and does not use credentials at all — it only builds text from data already present in the workflow.',
    'No connection setup is required. Place this node right before a step that needs one finished text value, such as an Email body, a Slack message, or a Log Output entry.',
    'Connect the Text Formatter output to the next step that should use the finished text — remember the output is the raw text itself, not an object, so map it as {{$json}} rather than {{$json.formatted}} or {{$json.text}}. Downstream service node account connection setup is still required for nodes after Text Formatter; this node itself has nothing to authorize.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Text Formatter has a single action (internally the operation value default) that resolves Template into one finished text value and returns it directly as the entire output, with no wrapper object.',
      operations: [formatOperation],
    },
  ],
  commonErrors: [
    {
      error: 'An empty Template silently converts the whole item to a JSON string instead of an error',
      cause: 'Template was left blank or only contained whitespace.',
      fix: 'Fill in Template with the text and {{$json.field}} expressions this step should produce.',
    },
    {
      error: 'A missing field inside a mixed Template silently resolves to an empty string (no error is raised)',
      cause: 'A {{$json.field}} expression referenced a field that was not present on the incoming item, and the Template also contained other text or expressions around it.',
      fix: 'Confirm the upstream node actually produces the field being referenced, and check the exact spelling and path used in the expression.',
    },
    {
      error: 'A Template that is only one unresolved expression outputs the literal text "null"',
      cause: 'The entire Template was a single {{$json.field}} expression with no surrounding text, and that field was missing from the incoming item.',
      fix: 'Add a little surrounding text (even a single character) around the expression so a missing value resolves to an empty string instead of the literal word "null", or confirm the referenced field is always present.',
    },
    {
      error: 'Downstream node cannot find the expected field on the output',
      cause: 'A workflow was built assuming this node\'s output is an object like {{$json.formatted}} or {{$json.text}} — it is not, unless Template was left blank.',
      fix: 'Reference the resolved text directly as {{$json}} in the next node, not as a nested field.',
    },
  ],
  relatedNodes: ['set', 'edit_fields', 'javascript'],
};
