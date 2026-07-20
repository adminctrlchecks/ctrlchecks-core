import type { NodeDoc, FieldDoc, OperationDoc } from '../types';

const nameField: FieldDoc = {
  name: 'Variable Name',
  internalKey: 'name',
  type: 'string',
  required: true,
  description: 'The single field name the resolved Value is stored under. This is the only field name that ever appears on this node\'s output.',
  helpText:
    'What this field is: The name of the one field this node creates on its output.\n' +
    'Why it matters: This node\'s entire output is exactly one field — whatever is typed here, holding whatever Value resolves to. There is no way to create more than one field from this node.\n' +
    'When to fill it: Always — it is required on every run.\n' +
    'What to enter: A short field name such as userEmail, orderTotal, or reviewStatus.\n' +
    'Where the value comes from: Typed directly — this field is not itself a template/expression field, so it cannot be mapped from a previous step.\n' +
    'How to use it later: Read the stored value downstream as {{$json.<name>}}, for example {{$json.userEmail}}.\n' +
    'Accepted format: Any plain text string. There is no validation of spaces, punctuation, or leading characters — whatever text is typed becomes the literal output field name, even if it would not be a valid variable name in code.\n' +
    'Real workplace example: Name set to approvalStatus with Value set to {{$json.status}} makes the approval status available downstream as {{$json.approvalStatus}}.\n' +
    'If it is empty or wrong: If left blank, this node still runs — it silently creates a field with an empty string as its name (written as {{$json.[\'\']}} in an expression) rather than raising an error. There is no "name is required" validation in this node.\n' +
    'Common mistake: Assuming an empty or badly-formed Name will be caught and reported before the workflow runs — it will not. Always check the field name that actually appears on the output.',
  placeholder: 'myVariable',
  example: 'userEmail',
};

const valueField: FieldDoc = {
  name: 'Value',
  internalKey: 'value',
  type: 'textarea',
  required: false,
  description: 'The value stored under Variable Name. Supports fixed text or a template expression such as {{$json.email}}.',
  helpText:
    'What this field is: The content that gets stored under the field name set in Variable Name.\n' +
    'Why it matters: This is the only source of data for this node\'s single output field.\n' +
    'When to fill it: Whenever a real value needs to be captured. Left blank, the stored value is simply an empty string.\n' +
    'What to enter: A fixed value such as pending, or a template expression that pulls from a previous step, such as {{$json.email}} or {{$json.order.total}}.\n' +
    'Where the value comes from: Type a fixed value directly, or map it from a previous workflow step using {{$json.fieldName}} syntax.\n' +
    'How to use it later: The resolved value is available downstream at {{$json.<name>}}, using whatever text was entered in Variable Name.\n' +
    'Accepted format: Plain text, or a template expression. Numbers and booleans resolved from an expression keep their real type rather than becoming text.\n' +
    'Real workplace example: {{$json.total}} captures an order total calculated by an earlier Math node so a later Email node can reference it by a clearer name.\n' +
    'If it is empty or wrong: An empty Value stores an empty string under Variable Name — this does not raise an error. An expression that cannot resolve typically resolves to an empty value rather than failing the node.\n' +
    'Common mistake: Expecting a typo\'d or unresolved expression like {{$json.emial}} to be flagged — it silently resolves to an empty or literal string instead.',
  placeholder: '{{$json.email}}',
  example: '{{$json.email}}',
};

const valuesField: FieldDoc = {
  name: 'Values (legacy — not functional)',
  internalKey: 'values',
  type: 'json',
  required: false,
  description: 'A legacy multi-assignment array field that appears in the visual panel and the backend schema, but is never read by this node\'s execution code. Filling it in has no effect on the output.',
  helpText:
    'What this field is: A field intended for setting several variables at once, in the style [{"name": "...", "value": "..."}].\n' +
    'Why it matters: It does not matter in practice — this field is declared in the node\'s configuration options, but a full reading of this node\'s execution code confirms it is never read anywhere. Whatever is entered here is silently ignored.\n' +
    'When to fill it: Never — use a single Variable Name and Value instead, or use the separate Set/Edit Fields node when several fields need to be created at once.\n' +
    'What to enter: Leave this empty. There is no working configuration for it.\n' +
    'Where the value comes from: Not applicable — this field has no effect regardless of its content.\n' +
    'How to use it later: Not applicable — nothing set here ever reaches the output.\n' +
    'Accepted format: The panel accepts a JSON-style list of name/value rows, but the format is irrelevant since it is never parsed by this node.\n' +
    'Real workplace example: Not applicable.\n' +
    'If it is empty or wrong: No difference either way — this node behaves identically whether Values is empty, filled in correctly, or filled in with invalid data.\n' +
    'Common mistake: Assuming this field lets Set Variable create multiple output fields in one node, the way its label and helpText suggest. It cannot — only the single Variable Name/Value pair ever reaches the output. Use the Set (Edit Fields) node for multi-field assignment instead.',
  placeholder: '[{"name":"fullName","value":"{{$json.firstName}} {{$json.lastName}}"}]',
  example: '[{"name":"fullName","value":"{{$json.firstName}} {{$json.lastName}}"}]',
};

const keepSourceField: FieldDoc = {
  name: 'Keep Source (not functional)',
  internalKey: 'keepSource',
  type: 'boolean',
  required: false,
  description: 'A toggle that appears in the visual panel and is intended to preserve incoming fields alongside the new variable, but is never read by this node\'s execution code. The output is always exactly one field, regardless of this setting.',
  helpText:
    'What this field is: A checkbox suggesting the original incoming fields will be kept alongside the new variable field when turned on.\n' +
    'Why it matters: It does not currently do anything — a full reading of this node\'s execution code confirms this setting is never read. This node\'s output always contains exactly one field (the one named in Variable Name), whether this toggle is on or off.\n' +
    'When to fill it: There is no working configuration for this field today; leave it at its default.\n' +
    'What to enter: Not applicable.\n' +
    'Where the value comes from: Not applicable — this field has no effect regardless of its state.\n' +
    'How to use it later: Not applicable.\n' +
    'Accepted format: On or off (boolean); both behave identically.\n' +
    'Real workplace example: Not applicable.\n' +
    'If it is empty or wrong: No difference — this node drops every incoming field except the one it creates, whether Keep Source is checked or not.\n' +
    'Common mistake: Turning this on and assuming fields the workflow already had (like {{$json.orderId}}) will still be readable after this node runs. They will not — use the Set (Edit Fields) node instead if incoming fields must be preserved alongside a new one.',
  placeholder: 'false',
  defaultValue: 'false',
  example: 'false',
};

const setOperation: OperationDoc = {
  name: 'Set',
  value: 'default',
  description: 'Resolves Value and stores it under the field name in Variable Name. The output always replaces everything from the incoming item — it contains exactly one field, the newly-created variable. Every other field the item had before this node, including anything Merge, a trigger, or an earlier action produced, is discarded on every run, regardless of the Values or Keep Source fields (both are present in the panel but have no effect).',
  fields: [nameField, valueField, valuesField, keepSourceField],
  outputExample: {
    userEmail: 'alice@example.com',
  },
  outputDescription: 'The output is a single field: the text typed into Variable Name, holding whatever Value resolved to. There is no wrapper object, no success flag, and — critically — every field that existed on the item before this node ran is discarded, even if Keep Source is turned on and even if Values contains other entries, because neither field is read by this node\'s code.',
  usageExample: {
    scenario: 'Store a resolved user email under a clear name for later steps to reference',
    inputValues: { name: 'userEmail', value: '{{$json.email}}' },
    expectedOutput: 'The value is available downstream as {{$json.userEmail}}. Any other field the item had before this node (such as {{$json.orderId}}) is no longer present.',
  },
  externalDocsUrl: 'https://docs.ctrlchecks.com',
};

export const setVariableDoc: NodeDoc = {
  slug: 'set_variable',
  displayName: 'Set Variable',
  category: 'Data',
  logoUrl: '/icons/nodes/set_variable.svg',
  description: 'Create exactly one named field from a resolved value. The visual panel also shows a legacy Values list and a Keep Source toggle, but neither is read by this node\'s execution code — the output is always a single field, and every other field the item previously had is discarded. Use the Set (Edit Fields) node instead when several fields need to be created or existing fields need to be preserved.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node has no third-party account or cloud credential and does not use credentials at all — it only resolves one value from data already present in the workflow.',
    'No connection setup is required. Because this node discards every field except the one it creates, place it only where losing the rest of the current item\'s data is acceptable — usually right before a node that only needs this one value.',
    'Connect the Set Variable output to the next step that should read the new field. Downstream service node account connection setup is still required for nodes after Set Variable; this node itself has nothing to authorize.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Set Variable has a single action (internally the operation value default) that resolves Value and stores it under Variable Name as the node\'s entire output. The Values (legacy array) and Keep Source fields are visible in the panel and declared in the backend configuration options, but neither is ever read by the execution code.',
      operations: [setOperation],
    },
  ],
  commonErrors: [
    {
      error: 'An empty Variable Name silently creates a field named with an empty string (no error is raised)',
      cause: 'Variable Name was left blank.',
      fix: 'Fill in a clear field name in Variable Name before relying on this node\'s output downstream.',
    },
    {
      error: 'Every field from before this node is lost, even fields that another branch or an earlier step produced',
      cause: 'This node\'s output is always exactly one field — the one created from Variable Name and Value. There is no setting anywhere on this node that preserves other fields.',
      fix: 'If later steps need both the new variable and the original data, use the Set (Edit Fields) node instead, which adds fields on top of the incoming item rather than replacing it.',
    },
    {
      error: 'The Values field has no effect, no matter what is entered in it',
      cause: 'Values is shown in the visual panel and declared in the backend configuration options, but this node\'s execution code never reads it.',
      fix: 'Do not rely on Values for multiple variables. Use one Set Variable node per value, or switch to the Set (Edit Fields) node, which supports setting several fields from one JSON object.',
    },
    {
      error: 'The Keep Source toggle has no effect, whether it is on or off',
      cause: 'Keep Source is shown in the visual panel and declared in the backend configuration options, but this node\'s execution code never reads it.',
      fix: 'Do not rely on Keep Source to preserve incoming fields. Use the Set (Edit Fields) node instead if the workflow needs both the original fields and a new one.',
    },
  ],
  relatedNodes: ['set', 'edit_fields', 'javascript'],
};
