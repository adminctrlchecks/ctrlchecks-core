import type { NodeDoc } from '../types';

export const mergeDoc: NodeDoc = {
  slug: 'merge',
  displayName: 'Merge',
  category: 'Logic',
  logoUrl: '/icons/nodes/merge.svg',
  description: 'Rejoin multiple workflow paths and combine their data into one output for the next step.',
  credentialType: 'None - Merge does not use credentials or a third-party account.',
  credentialSetupSteps: [
    'No third-party account is needed for the Merge node itself. It only combines data already produced by earlier workflow branches.',
    'Connect two or more incoming branch outputs to Merge when separate paths need to rejoin before a final action.',
    'Connect the Merge output to the next step that needs the combined data, such as a summary email, database write, Slack report, or Log Output node.',
    'Every service node after Merge, such as Gmail, Slack, Notion, HubSpot, Google Sheets, or Airtable, still needs its own account connection before it can run.',
    'Keep API keys, passwords, and tokens out of merged business data. Store secrets in the destination service node connection instead.',
  ],
  credentialDocsUrl: '',
  resources: [
    {
      name: 'Configuration',
      description: 'Choose how incoming branch outputs should be combined.',
      operations: [
        {
          name: 'Configure',
          value: 'configure',
          description: 'Combines data from multiple incoming workflow branches into one output. Use Merge after If/Else, Switch, Parallel, or other branching patterns when later steps need a single combined payload instead of separate branch outputs.',
          fields: [
            {
              name: 'Mode',
              internalKey: 'mode',
              type: 'select',
              required: false,
              description: 'How Merge combines incoming branch outputs.',
              helpText: `What this field is: The merge strategy for combining data from incoming branches.
Why it matters: Different modes create different output shapes. Choosing the wrong mode can overwrite fields, wrap data into items, or keep nested details you did not expect.
When to fill it: Choose it when connecting two or more paths into the Merge node. Leave the default overwrite when you are combining simple flat objects.
What to enter: Choose overwrite, append, or deep_merge. Overwrite objects combines fields and lets later branch values win when keys collide. Append items collects each branch output into {{$json.items}}. Deep merge objects recursively combines nested objects so separate nested fields can survive together.
Where the value comes from: This choice comes from how the next node needs to read the merged data. Summary steps often like overwrite or deep_merge; list processing often likes append.
How to use it later: Downstream nodes read the merged output from {{$json}}. In append mode, use {{$json.items}}. In overwrite and deep_merge mode, use the merged object fields directly, such as {{$json.customer.email}} or {{$json.approval.status}}.
Accepted format: Dropdown options are overwrite, append, and deep_merge. The labels may appear as Overwrite objects, Append items, and Deep merge objects.
Real workplace example: After a Switch routes a ticket through category-specific enrichment, use deep_merge so customer details from one branch and ticket details from another branch stay under their nested objects.
If it is empty or wrong: Empty defaults to overwrite. Overwrite can replace fields with the same name, append can wrap data into items when the next node expected top-level fields, and deep_merge can preserve nested objects but still replace arrays or non-object values.
Common mistake: Using overwrite after two branches both output status. Rename fields upstream or choose deep_merge if the values belong under different nested objects.`,
              placeholder: 'overwrite',
              example: 'deep_merge',
              defaultValue: 'overwrite',
              options: ['overwrite', 'append', 'deep_merge'],
              notes: 'Use append when you need a list of branch outputs. Use deep_merge when both branches output nested objects that should be combined.',
            },
          ],
          outputExample: {
            ticketId: 'TCK-2048',
            customer: {
              email: 'customer@example.com',
              tier: 'VIP',
            },
            approval: {
              status: 'approved',
              reviewer: 'finance@example.com',
            },
            mergeMode: 'deep_merge',
            sourceCount: 2,
          },
          outputDescription: 'The output is one combined object. In overwrite mode, object fields are combined and later branch values win when keys collide. In append mode, branch outputs are collected into items. In deep_merge mode, nested object fields are recursively combined. Backend inventory exposes output, data, and result-compatible outputs, and runtime metadata can include mergeMode and sourceCount.',
          usageExample: {
            scenario: 'Rejoin an approval branch and a customer-enrichment branch before sending one summary email.',
            inputValues: {
              mode: 'deep_merge',
            },
            expectedOutput: 'The next node receives merged data such as {{$json.customer.email}} and {{$json.approval.status}} in one payload.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Unexpected overwritten field',
      cause: 'Overwrite mode was used and two incoming branches produced the same field name.',
      fix: 'Rename fields before Merge, or use deep_merge when the values belong under different nested objects.',
    },
    {
      error: 'Next node cannot find items',
      cause: 'Append mode was not selected, so branch outputs were not collected into {{$json.items}}.',
      fix: 'Choose append when the next node expects a list, or update the next node to read the merged top-level fields.',
    },
    {
      error: 'Next node cannot find top-level field',
      cause: 'Append mode wrapped branch outputs into items, but the downstream node expects direct fields like {{$json.email}}.',
      fix: 'Use overwrite or deep_merge for top-level fields, or map the downstream node from {{$json.items[0].email}} when a list is intended.',
    },
    {
      error: 'Missing incoming branch',
      cause: 'Only one path, or no path, is connected into Merge.',
      fix: 'Connect the outgoing line from each branch that should rejoin, such as the true and false paths or multiple Switch cases.',
    },
    {
      error: 'Deep merge did not combine arrays',
      cause: 'Deep merge recursively combines objects, but arrays and simple values are replaced rather than merged item by item.',
      fix: 'Use append for collecting arrays, or normalize arrays upstream before deep merging.',
    },
    {
      error: 'Permission denied after merge',
      cause: 'Merge itself does not use credentials, but a service node after Merge is missing its account connection.',
      fix: 'Open the downstream service node and connect the required Gmail, Slack, Notion, Google Sheets, Airtable, or CRM account.',
    },
  ],
  relatedNodes: ['if_else', 'switch', 'parallel', 'filter', 'loop', 'log_output'],
};
