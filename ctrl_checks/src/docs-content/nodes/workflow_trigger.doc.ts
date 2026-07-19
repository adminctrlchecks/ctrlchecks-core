import type { NodeDoc } from '../types';

export const workflowTriggerDoc: NodeDoc = {
  slug: 'workflow_trigger',
  displayName: 'Workflow Trigger',
  category: 'Triggers',
  logoUrl: '/icons/nodes/workflow_trigger.svg',
  description: 'Start this workflow when another CtrlChecks workflow calls it with an Execute Workflow node.',
  credentialType: 'None',
  credentialSetupSteps: [
    'No third-party account connection is required for Workflow Trigger itself. It is called from another CtrlChecks workflow.',
    'Create or open the child workflow that should be reusable, then add Workflow Trigger as its first node.',
    'Copy the parent workflow ID from the workflow that is allowed to call this child workflow, and paste it into Source Workflow ID.',
    'In the parent workflow, add an Execute Workflow node, choose this child workflow, and pass the payload the child should receive.',
    'Connect the output line from Workflow Trigger to the first service or logic node in the child workflow. That next service node may need its own account connection.',
    'Test from the parent workflow, then inspect the child workflow execution output to confirm fields such as {{$json.customerEmail}} or {{$json.inputData.customerEmail}} are available where you expect.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Workflow Call',
      description: 'Accept a payload from an allowed parent workflow and start this workflow as a reusable child workflow.',
      operations: [
        {
          name: 'Execute',
          value: 'default',
          description: 'Starts this workflow when the configured parent workflow calls it through an Execute Workflow node. Use this to split large automations into reusable pieces, such as a shared notification workflow, a reusable customer lookup workflow, or a standard approval-request workflow.',
          fields: [
            {
              name: 'Source Workflow ID',
              internalKey: 'source_workflow_id',
              type: 'string',
              required: true,
              description: 'The ID of the parent workflow that is allowed to trigger this workflow.',
              helpText: `What this field means: Source Workflow ID is the unique ID of the parent workflow that is allowed to start this child workflow.
Why it matters: It documents and limits which workflow should call this reusable workflow, so a child workflow is not confused with a manual, schedule, form, or public webhook trigger.
When to fill it: Fill it before connecting the parent workflow's Execute Workflow node to this child workflow.
What to enter: Paste the exact workflow ID from the parent workflow, such as workflow_123 or the UUID shown in the parent workflow URL.
Where the value comes from: Open the workflow that will contain the Execute Workflow node and copy its ID from the URL, details panel, or workflow list.
How to use it later: The parent workflow sends the payload. Later nodes in this child workflow can map fields such as {{$json.customerEmail}}, {{$json.ticketId}}, {{$json.orderId}}, or {{$json.inputData.customerEmail}}, depending on how the parent passes data.
Accepted format: A valid workflow ID, not the workflow display name and not the child workflow ID.
Real workplace example: Put the Sales Lead Intake workflow ID here so it can call a reusable Send Lead Notification workflow after a new lead is qualified.
If it is empty or wrong: The child workflow may not be clearly tied to the intended parent, or the Execute Workflow setup may point to the wrong workflow during testing.
Common mistake: Pasting the child workflow's own ID. This field should identify the source workflow that will call the child.`,
              placeholder: 'workflow_123',
              example: 'workflow_123',
              notes: 'The parent workflow still needs an Execute Workflow node that points to this child workflow and passes input data.',
            },
          ],
          outputExample: {
            customerEmail: 'maya@acme.com',
            ticketId: 'SUP-1042',
            priority: 'high',
            inputData: {
              customerEmail: 'maya@acme.com',
              ticketId: 'SUP-1042',
              priority: 'high',
            },
            workflowId: 'workflow_parent_123',
            timestamp: '2026-07-18T09:15:00.000Z',
          },
          outputDescription: 'The child workflow receives the payload sent by the parent Execute Workflow node. When the parent sends plain fields, later nodes can use customerEmail, ticketId, priority, workflowId, and timestamp directly. When the parent wraps data under inputData, later nodes can use inputData.customerEmail, inputData.ticketId, or inputData.priority. Use expressions such as {{$json.customerEmail}}, {{$json.ticketId}}, {{$json.inputData.customerEmail}}, and {{$json.timestamp}} after checking a test execution.',
          usageExample: {
            scenario: 'Create a reusable Send Escalation Alert child workflow that can be called by the Support Intake parent workflow.',
            inputValues: {
              source_workflow_id: 'workflow_support_intake_123',
            },
            expectedOutput: 'When the parent Execute Workflow node passes customerEmail, ticketId, and priority, the child workflow can use {{$json.customerEmail}}, {{$json.ticketId}}, {{$json.priority}}, or {{$json.inputData.customerEmail}} in Slack, Email, database, or approval nodes.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Source Workflow ID is missing',
      cause: 'The Workflow Trigger does not list which parent workflow is allowed to call it.',
      fix: 'Open the parent workflow, copy its workflow ID from the URL or details panel, paste it into Source Workflow ID, and save the child workflow.',
    },
    {
      error: 'Wrong workflow ID was pasted',
      cause: 'The child workflow ID, display name, or another unrelated workflow ID was entered instead of the parent workflow ID.',
      fix: 'Confirm which workflow contains the Execute Workflow node and paste that parent workflow ID into Source Workflow ID.',
    },
    {
      error: 'Parent workflow does not call this child workflow',
      cause: 'The parent workflow is missing an Execute Workflow node, or that node points to a different child workflow.',
      fix: 'In the parent workflow, add or update Execute Workflow so it selects this child workflow and passes the expected input payload.',
    },
    {
      error: 'Next node cannot find inputData or a payload field',
      cause: 'The parent workflow sent fields in a different shape than the child workflow mappings expect.',
      fix: 'Run the parent workflow once, open the child execution, and map the exact path: {{$json.customerEmail}} for top-level values or {{$json.inputData.customerEmail}} for wrapped values.',
    },
    {
      error: 'Child workflow is not active or not confirmed',
      cause: 'Execute Workflow can only call a child workflow that is saved and available for execution.',
      fix: 'Save and activate or confirm the child workflow before testing the parent workflow again.',
    },
    {
      error: 'Loop or circular workflow call',
      cause: 'The parent calls the child, and the child calls the parent or another workflow that eventually calls it back.',
      fix: 'Keep child workflows focused on reusable work and avoid Execute Workflow calls that route back to the parent chain.',
    },
    {
      error: 'Permission denied in a later service node',
      cause: 'Workflow Trigger itself does not use credentials, but the connected service node in the child workflow may need an account connection.',
      fix: 'Open the connected output node in the child workflow, select or create its service account connection, test it, and rerun the parent workflow.',
    },
  ],
  relatedNodes: ['execute_workflow', 'manual_trigger', 'return', 'if_else', 'slack_message', 'email'],
};
