import type { NodeDoc } from '../types';

const arrayHelpText = `What this field means: Array Expression tells Split In Batches which list from the previous workflow data should be divided into smaller groups.

Why it matters: Large lists from sheets, CRMs, APIs, forms, or databases are easier to review, send, write, or summarize when they are split into controlled chunks.

When to fill it: Fill it when the list is stored under a key such as rows, contacts, orders, records, messages, or data.records. Leave it empty only when the previous node already outputs input.items and that is the list you want to split.

What to enter: Enter an expression that resolves to the full array, such as {{$json.items}}, {{$json.rows}}, {{$json.contacts}}, {{$json.orders}}, or {{$json.data.records}}.

Where the value comes from: Run the previous node and inspect its output. Copy the path to the full list. Do not copy one item from inside the list.

How to use it later: Split In Batches returns all groups under {{$json.batches}} and exposes the first group as {{$json.items}}. Later nodes can use {{$json.items}} for the current exposed batch or {{$json.batches}} when they need all groups.

Accepted format: A workflow expression or path that resolves to an array. Use {{$json.rows}} for a sheet's full row list. Do not use {{$json.rows[0]}} because that is one record, not a list.

Real workplace example: A nightly sync receives 1,000 new contacts under {{$json.contacts}}. Set Array Expression to {{$json.contacts}} and Batch Size to 100 so the workflow can prepare ten smaller contact groups.

If it is empty or wrong: Empty falls back to input.items. If no array is found, the node outputs an empty batches list, totalBatches is 0, and items is empty.

Common mistake: Expecting the current DAG runtime to automatically run the downstream branch once per batch. This node exposes batch data; use a supported loop/agent/batch path when each batch needs separate execution.`;

const batchSizeHelpText = `What this field means: Batch Size is the number of records each batch should contain.

Why it matters: A good batch size helps avoid oversized messages, rate limits, slow API calls, and overwhelming manual review steps.

When to fill it: Fill it every time you use Split In Batches. The backend requires batchSize. Runtime defaults invalid or blank values to 10 and enforces at least 1, but an intentional value is safer.

What to enter: Enter a positive whole number. Use 10 for quick tests, 25 or 50 for review queues, 100 for many API or spreadsheet operations, and smaller values for services with strict rate limits.

Where the value comes from: Choose the value based on the next service limit, the size of each record, and how much work a person or system should handle at once.

How to use it later: The output includes {{$json.batchSize}}, {{$json.totalBatches}}, {{$json.batches}}, and {{$json.items}}. Use these fields in logs, summaries, conditions, or downstream batch-capable service nodes.

Accepted format: Positive number only. Do not add words such as "100 records". Decimals, text, zero, negative values, or blank values are normalized by runtime.

Real workplace example: To create CRM contacts from 750 spreadsheet rows without sending one massive request, set Batch Size to 100 and inspect {{$json.totalBatches}} before sending each group through a supported batch path.

If it is empty or wrong: Blank or invalid values default to 10. If the batch size is too high, downstream service nodes may time out or hit account rate limits.

Common mistake: Treating Batch Size as a per-item loop count. It controls group size only; downstream nodes still need a supported batch or loop execution path to process every group separately.`;

export const splitInBatchesDoc: NodeDoc = {
  slug: 'split_in_batches',
  displayName: 'Split In Batches',
  category: 'Logic',
  logoUrl: '/icons/nodes/split_in_batches.svg',
  description: 'Divide an incoming array into smaller batch groups and expose batch metadata for downstream steps.',
  credentialType: 'None - Split In Batches does not use credentials or connect to a third-party account.',
  credentialSetupSteps: [
    'No third-party account is required because Split In Batches only reshapes array data already inside the workflow.',
    'Connect a previous node that outputs a list, such as rows, contacts, orders, records, messages, or items.',
    'Connect the Split In Batches output to the next node that should receive {{$json.items}}, {{$json.batches}}, and batch metadata.',
    'Downstream service nodes still need their own account connection and permissions; Split In Batches does not replace Gmail, Slack, CRM, database, sheet, or storage credentials.',
    'The current DAG runtime exposes batch data but does not automatically run the connected branch once per batch. Use a supported loop, agent, or batch-processing path when every batch needs separate execution.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Use this resource to choose the upstream array and decide how many records should be placed in each batch.',
      operations: [
        {
          name: 'Execute',
          value: 'default',
          description: 'Splits the selected array into smaller arrays, returns every group in batches, exposes the first batch as items, and adds batch metadata. Choose this operation before API, CRM, spreadsheet, or review steps that should handle a controlled number of records at a time.',
          fields: [
            {
              name: 'Array Expression',
              internalKey: 'array',
              type: 'string',
              required: false,
              description: 'Expression or path that resolves to the array to split.',
              helpText: arrayHelpText,
              placeholder: '{{$json.items}}',
              example: '{{$json.contacts}}',
              notes: 'Leave blank only when input.items already contains the list to split.',
            },
            {
              name: 'Batch Size',
              internalKey: 'batchSize',
              type: 'number',
              required: true,
              description: 'Number of records to place in each batch.',
              helpText: batchSizeHelpText,
              placeholder: '100',
              example: '100',
              defaultValue: '10',
              notes: 'Runtime uses 10 when the value is blank or invalid and enforces a minimum of 1.',
            },
          ],
          outputExample: {
            syncDate: '2026-07-18',
            batches: [
              [
                { contactId: 'con_1001', customerEmail: 'ana@example.com' },
                { contactId: 'con_1002', customerEmail: 'lee@example.com' },
              ],
              [
                { contactId: 'con_1003', customerEmail: 'maya@example.com' },
              ],
            ],
            batchSize: 2,
            totalBatches: 2,
            items: [
              { contactId: 'con_1001', customerEmail: 'ana@example.com' },
              { contactId: 'con_1002', customerEmail: 'lee@example.com' },
            ],
            _warning: 'split_in_batches exposes batches; to iterate batches, use agent/loop mode (not yet enabled in DAG runtime).',
          },
          outputDescription: 'batches: All created groups as an array of arrays. batchSize: The group size used by runtime. totalBatches: Number of groups created. items: The first batch exposed for the next node. _warning: Runtime note that Split In Batches exposes batch data but does not execute the downstream branch once per batch in the current DAG runtime. Other incoming fields such as syncDate remain available.',
          usageExample: {
            scenario: 'Split new CRM contacts from a nightly export into smaller groups before a controlled sync',
            inputValues: {
              array: '{{$json.contacts}}',
              batchSize: '100',
            },
            expectedOutput: 'The next node can use {{$json.items}} for the first exposed batch, {{$json.batches}} for all groups, {{$json.totalBatches}} for logging, and {{$json.syncDate}} for audit notes.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Batch Size is required',
      cause: 'The node was configured without an intentional batch size, or the value was removed.',
      fix: 'Enter a positive number such as 10, 25, 50, or 100 based on the downstream service and workload.',
    },
    {
      error: 'Array expression is not a list',
      cause: 'Array Expression points to one object, a string, or a missing field instead of an array.',
      fix: 'Use the full list path from the previous output, such as {{$json.rows}}, {{$json.contacts}}, or {{$json.data.records}}.',
    },
    {
      error: 'No batches created',
      cause: 'The resolved array was empty, or the previous node did not provide input.items when Array Expression was blank.',
      fix: 'Run the previous node, confirm the list has records, and update Array Expression if the list is under another key.',
    },
    {
      error: 'Branch did not run once per batch',
      cause: 'The current DAG runtime exposes batches as data but does not execute the connected branch once for each batch.',
      fix: 'Use a supported loop, agent, or batch-processing path when every batch needs separate execution.',
    },
    {
      error: 'Next node cannot find batches',
      cause: 'The downstream node is referencing old names such as batch, batchIndex, or current_batch instead of the runtime output keys.',
      fix: 'Use {{$json.batches}} for all groups, {{$json.items}} for the first exposed batch, and {{$json.totalBatches}} for metadata.',
    },
    {
      error: 'Permission denied after Split In Batches',
      cause: 'Split In Batches has no credentials, but the service node after it may be missing a connected account or permission to send, write, create, or update records.',
      fix: 'Connect the required account on the downstream service node and confirm it has the needed permission.',
    },
  ],
  relatedNodes: ['loop', 'function_item', 'filter', 'limit'],
};
