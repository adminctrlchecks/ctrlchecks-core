import type { FieldDoc, NodeDoc, OperationDoc } from '../types';

const help = (
  label: string,
  why: string,
  when: string,
  enter: string,
  source: string,
  format: string,
  example: string,
  wrong: string,
  mistake: string,
) => `What this field means: ${label}
Why it matters: ${why}
When to fill it: ${when}
What to enter: ${enter}
Where the value comes from: ${source}
How to use it later: Downstream nodes can use the parent node result with {{$json.success}}, {{$json.result}}, {{$json.workflowId}}, or {{$json.error}}. Inside the child workflow, its first non-trigger node receives the payload you pass here.
Accepted format: ${format}
Real workplace example: ${example}
If it is empty or wrong: ${wrong}
Common mistake to avoid: ${mistake}`;

const fields: FieldDoc[] = [
  {
    name: 'Workflow ID',
    internalKey: 'workflowId',
    type: 'string',
    required: true,
    description: 'ID of the confirmed or active child workflow to run.',
    placeholder: '123e4567-e89b-12d3-a456-426614174000',
    example: '123e4567-e89b-12d3-a456-426614174000',
    helpText: help(
      'Workflow ID tells Execute Workflow which saved child workflow to fetch and run.',
      'The runtime queries the workflows table by this exact ID; names, labels, and URLs are not resolved by this node.',
      'Fill it every time you use Execute Workflow.',
      'Paste the workflow UUID from the workflow record or map a trusted value such as {{$json.childWorkflowId}} from a setup step.',
      'Find it in the workflow URL, workflow list, database record, or an internal configuration table that stores reusable workflow IDs.',
      'Non-empty workflow ID string, usually a UUID or saved workflow identifier.',
      'A support workflow maps {{$json.notificationWorkflowId}} to call the reusable escalation-notification workflow.',
      'Blank returns success false with error "Workflow ID is required"; an unknown ID returns "Sub-workflow not found".',
      'Do not paste the workflow display name; this node requires the internal workflow ID.',
    ),
  },
  {
    name: 'Input',
    internalKey: 'input',
    type: 'json',
    required: false,
    description: 'Payload passed into the child workflow; if blank, current input is passed through.',
    placeholder: '{"ticketId":"{{$json.ticketId}}","customerEmail":"{{$json.customerEmail}}"}',
    example: '{"ticketId":"{{$json.ticketId}}"}',
    helpText: help(
      'Input is the object sent to the child workflow as its starting payload.',
      'It defines what the child workflow can read as {{$json.fieldName}} after its trigger is skipped.',
      'Fill it when the child workflow should receive a curated payload instead of the whole current object.',
      'Enter a JSON object or expression-resolved object, for example {"ticketId":"{{$json.ticketId}}","priority":"{{$json.priority}}"}. Leave blank to pass the current input object.',
      'Comes from the previous workflow step, a form/trigger payload, a database lookup, or a small mapping you create for the child workflow contract.',
      'JSON object or expression that resolves to an object; strings are passed as configured, so prefer valid JSON for predictable child-workflow fields.',
      'A parent approval workflow passes ticketId, approverEmail, and approvalStatus into a reusable notification workflow.',
      'Bad JSON can stay as a string or fail editor parsing; missing fields mean the child workflow cannot map them later.',
      'Do not send the entire incoming object when the child workflow only needs a few safe business fields.',
    ),
  },
  {
    name: 'Input Data',
    internalKey: 'inputData',
    type: 'json',
    required: false,
    description: 'Legacy/generated-workflow alias used only when input is not set.',
    placeholder: '{"ticketId":"{{$json.ticketId}}"}',
    example: '{"ticketId":"{{$json.ticketId}}"}',
    helpText: help(
      'Input Data is a backend-supported fallback alias for the child workflow payload.',
      'The runtime reads input first, then inputData, then the current node input, so this field matters only when input is absent.',
      'Use it only for imported or AI-generated workflows that already use inputData.',
      'Prefer Input for new visual workflows; if inputData is used, enter the same JSON object contract the child workflow expects.',
      'Comes from older workflow configs, generated workflow JSON, or a previous step that already prepared {{$json.inputData}}.',
      'JSON object or expression-resolved object; ignored whenever input is present.',
      'A migrated workflow keeps inputData={"ticketId":"{{$json.ticketId}}"} until the visual panel is updated to use Input.',
      'If both input and inputData are present, input wins and inputData is ignored.',
      'Do not assume input and inputData are merged; they are alternatives.',
    ),
  },
];

const outputDescription = 'success: true when the child workflow was found, confirmed/active, and the inline execution completed; false when lookup/config validation fails. result: the final output from the last executed child node, or the Return node returnedValue when the child emits __return. workflowId: the child workflow ID that was called. error: present on failures such as Workflow ID is required, Sub-workflow not found, child workflow not confirmed/active, missing trigger node, or Failed to execute sub-workflow. Execution skips the child trigger node, seeds $json/json with the supplied input, runs child nodes in topological order, and stops early when a Return node emits __return.';

const executeOperation: OperationDoc = {
  name: 'Execute Child Workflow',
  value: 'default',
  description: 'Fetches another saved workflow by workflowId, verifies that it is confirmed or active, skips that child workflow trigger, seeds the child with the provided input payload, executes the remaining child nodes in topological order, and returns the child final result to the parent workflow.',
  fields,
  outputExample: {
    success: true,
    result: {
      notificationSent: true,
      ticketId: 'SUP-1042',
      channel: 'slack',
    },
    workflowId: '123e4567-e89b-12d3-a456-426614174000',
  },
  outputDescription,
  usageExample: {
    scenario: 'A support workflow calls a reusable child workflow that sends the same escalation notice to Slack and email whenever a high-priority ticket is approved.',
    inputValues: {
      workflowId: '{{$json.escalationWorkflowId}}',
      input: '{"ticketId":"{{$json.ticketId}}","customerEmail":"{{$json.customerEmail}}","priority":"{{$json.priority}}"}',
      inputData: '',
    },
    expectedOutput: 'The parent workflow receives {{$json.success}}, {{$json.result.notificationSent}}, {{$json.result.ticketId}}, {{$json.workflowId}}, or {{$json.error}} from the child run.',
  },
  externalDocsUrl: 'https://docs.ctrlchecks.com',
};

export const executeWorkflowDoc: NodeDoc = {
  slug: 'execute_workflow',
  displayName: 'Execute Workflow',
  category: 'Workflow',
  logoUrl: '/icons/nodes/execute_workflow.svg',
  description: 'Call a reusable confirmed or active child workflow from the current workflow and return its inline result.',
  credentialType: 'No third-party account or credentials',
  credentialSetupSteps: [
    'Execute Workflow does not store API keys, OAuth tokens, passwords, or third-party credentials.',
    'Choose or paste the child Workflow ID, then connect this node output with an outgoing line to the next parent-workflow step.',
    'The child workflow itself must be confirmed or active and must contain a trigger node; Execute Workflow skips that trigger and starts the child payload at the first real child step.',
    'Test the child workflow directly first with a Manual Trigger or Workflow Trigger sample payload, then run the parent workflow and confirm the returned result shape.',
    'Any service nodes inside the child workflow still need their own account connection, and any downstream service node after Execute Workflow still needs its own account connection.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Child Workflow',
      description: 'Runs another workflow as a reusable component and returns the child final output to the parent workflow.',
      operations: [executeOperation],
    },
  ],
  commonErrors: [
    {
      error: 'Workflow ID is required',
      cause: 'workflowId was blank or resolved to an empty value before the lookup.',
      fix: 'Fill Workflow ID with the saved child workflow ID, or map a trusted value such as {{$json.childWorkflowId}}.',
    },
    {
      error: 'Sub-workflow not found: <workflowId>',
      cause: 'The runtime could not find a workflow row with the supplied ID.',
      fix: 'Check the ID in the workflow URL/list and make sure the parent is using the child workflow ID, not the child name.',
    },
    {
      error: 'Sub-workflow <workflowId> is not confirmed/active',
      cause: 'The child workflow exists but is still draft, unconfirmed, inactive, or hidden setup is not finished.',
      fix: 'Open the child workflow, confirm/activate it, and test it before calling it from the parent.',
    },
    {
      error: 'Sub-workflow <workflowId> has no trigger node',
      cause: 'The child workflow has nodes but no trigger-like start node for Execute Workflow to skip.',
      fix: 'Add a Manual Trigger or Workflow Trigger to the child workflow and connect it to the first child step.',
    },
    {
      error: 'Failed to execute sub-workflow',
      cause: 'A child node threw an unexpected error while Execute Workflow was running the child inline.',
      fix: 'Run the child workflow directly with the same input payload, inspect the failing child node, and add Return/Error Handler nodes where a controlled result is needed.',
    },
    {
      error: 'Next node cannot find expected child fields',
      cause: 'Execute Workflow wraps the child final payload under result rather than spreading it at the parent top level.',
      fix: 'Map fields from {{$json.result.fieldName}} in the parent workflow, or use a Return node in the child to shape the returnedValue.',
    },
  ],
  relatedNodes: ['workflow_trigger', 'manual_trigger', 'return', 'try_catch'],
};
