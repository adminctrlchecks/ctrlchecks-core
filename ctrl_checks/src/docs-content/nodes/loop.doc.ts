import type { NodeDoc } from '../types';

const arrayHelpText = `What this field means: Array Expression tells Loop which list from the previous workflow data should be exposed as {{$json.items}} for the next step.

Why it matters: Many apps return a list under a specific key, such as rows, contacts, orders, records, or messages. Loop needs to know which list should be capped and forwarded.

When to fill it: Fill it when the list is not already in input.items. Leave it empty only when the previous node already outputs an items array and you want Loop to use that default.

What to enter: Enter an expression that resolves to an array, such as {{$json.rows}}, {{$json.contacts}}, {{$json.orders}}, {{$json.data.records}}, or {{$json.messages}}.

Where the value comes from: Run the previous node and inspect its output. Copy the path to the full list, not a single item inside the list.

How to use it later: Loop writes the resolved and possibly truncated list to {{$json.items}}. The next node can read {{$json.items}} or use another processing node such as Split In Batches, Function Item, Filter, or a service node that accepts an array.

Accepted format: A workflow expression or path that resolves to an array. Use {{$json.rows}} for the full rows list. Do not use {{$json.rows[0]}} unless you intentionally want one record, because that is not an array.

Real workplace example: A Google Sheets step returns {{$json.rows}} with 500 leads. Set Array Expression to {{$json.rows}} and Max Iterations to 100 before sending the first 100 leads to a review or batch-processing step.

If it is empty or wrong: Empty uses input.items if available. If the expression does not resolve to an array and input.items is also missing, Loop outputs an empty items list with loop.iterations set to 0.

Common mistake: Do not expect the current DAG runtime to execute the next branch once per item. Loop exposes the list and metadata; use Function Item or an approved batch/agent loop path for true per-item processing.`;

const maxIterationsHelpText = `What this field means: Max Iterations is the largest number of array items Loop should expose downstream.

Why it matters: It protects workflows from accidentally sending, writing, or processing thousands of records when the previous step returns a large list.

When to fill it: Fill it whenever the upstream list size can vary or might be large. Leaving it empty falls back to 100 at runtime.

What to enter: Enter a whole number greater than 0. Common values are 10 for previews, 50 for small team tasks, 100 for ordinary batches, or a higher number only when the downstream nodes can safely handle the volume.

Where the value comes from: Choose the limit based on the next service's rate limits, your business process, and how many records a person or system should handle in one run.

How to use it later: The output includes {{$json.loop.maxIterations}}, {{$json.loop.iterations}}, and {{$json.loop.truncated}}. Use those fields in logs, alerts, or conditions to show whether the list was capped.

Accepted format: Positive number. Decimals, text, zero, negative values, or blank values are normalized by runtime; invalid values fall back to 100 and the runtime enforces at least 1.

Real workplace example: A support team reviews only the first 25 overdue tickets each morning. Set Array Expression to {{$json.overdueTickets}} and Max Iterations to 25, then alert a manager if {{$json.loop.truncated}} is true.

If it is empty or wrong: Blank or invalid values default to 100. If the array has more items than the limit, Loop truncates items and sets loop.truncated to true.

Common mistake: Setting a high limit without checking the downstream service. A later Slack, email, CRM, or database node may still have rate limits or account permissions that this node does not manage.`;

export const loopDoc: NodeDoc = {
  slug: 'loop',
  displayName: 'Loop',
  category: 'Logic',
  logoUrl: '/icons/nodes/loop.svg',
  description: 'Expose an array downstream with max-iteration metadata. In the current DAG runtime, Loop does not execute the next branch once for each item.',
  credentialType: 'None - Loop does not use credentials or connect to a third-party account.',
  credentialSetupSteps: [
    'No third-party account is required because Loop only prepares array data already inside the workflow.',
    'Connect a previous node that outputs a list, such as rows, contacts, orders, records, messages, or items.',
    'Connect the Loop output to the next node that should receive {{$json.items}} and {{$json.loop}} metadata.',
    'Downstream service nodes still need their own account connection and permissions; Loop does not replace Slack, Gmail, CRM, database, sheet, or storage credentials.',
    'The current DAG runtime does not run the connected branch once per item. Use Function Item or an approved batch-processing path when each record needs an individual action.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Use this resource to choose the upstream array and cap how many records are exposed to downstream nodes.',
      operations: [
        {
          name: 'Configure',
          value: 'default',
          description: 'Reads an array from the configured expression or from input.items, caps it at Max Iterations, writes the selected records to items, and adds loop metadata. Choose this operation when the next step should receive a controlled list and know whether the list was truncated.',
          fields: [
            {
              name: 'Array Expression',
              internalKey: 'array',
              type: 'string',
              required: false,
              description: 'Expression or path that resolves to the list Loop should expose downstream.',
              helpText: arrayHelpText,
              placeholder: '{{$json.rows}}',
              example: '{{$json.rows}}',
              notes: 'Leave blank only when the previous node already outputs input.items. If you need true one-action-per-record behavior, verify the workflow uses a runtime path that supports per-item execution.',
            },
            {
              name: 'Max Iterations',
              internalKey: 'maxIterations',
              type: 'number',
              required: false,
              description: 'Maximum number of items to expose in {{$json.items}}.',
              helpText: maxIterationsHelpText,
              placeholder: '100',
              example: '25',
              defaultValue: '100',
              notes: 'Runtime enforces at least 1 and defaults to 100 when the value is blank or invalid.',
            },
          ],
          outputExample: {
            reportDate: '2026-07-18',
            items: [
              { ticketId: 'SUP-1001', customerEmail: 'ana@example.com', priority: 'high' },
              { ticketId: 'SUP-1002', customerEmail: 'lee@example.com', priority: 'medium' },
            ],
            loop: {
              maxIterations: 25,
              iterations: 2,
              truncated: false,
            },
            _warning: 'Loop: iteration over downstream subgraph is not supported in DAG runtime yet; use function_item for per-item transforms.',
          },
          outputDescription: 'items: The resolved array after applying maxIterations. loop.maxIterations: The limit used by the node. loop.iterations: The number of items exposed downstream. loop.truncated: true when the original array was longer than the limit. _warning: Runtime note that the current DAG runtime exposes items and metadata but does not execute the downstream branch once per item. Other incoming fields such as reportDate remain available.',
          usageExample: {
            scenario: 'Cap overdue support tickets before sending a review summary to a manager',
            inputValues: {
              array: '{{$json.overdueTickets}}',
              maxIterations: '25',
            },
            expectedOutput: 'The next node can use {{$json.items}}, {{$json.loop.iterations}}, {{$json.loop.truncated}}, and {{$json.reportDate}} to build a summary or decide whether more tickets need another run.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Array is empty',
      cause: 'The Array Expression did not resolve to a list, and the previous node did not provide input.items.',
      fix: 'Run the previous node and point Array Expression to the full list, such as {{$json.rows}}, {{$json.contacts}}, or {{$json.data.records}}.',
    },
    {
      error: 'Array expression is not a list',
      cause: 'The expression points to one record, text, or an object instead of an array.',
      fix: 'Use the parent list path such as {{$json.rows}} instead of {{$json.rows[0]}} or {{$json.customer}}.',
    },
    {
      error: 'Loop truncated items',
      cause: 'The upstream array had more records than Max Iterations, so Loop exposed only the first set of records and set loop.truncated to true.',
      fix: 'Increase Max Iterations only if downstream services can safely handle the volume, or process the remaining records in a separate batch.',
    },
    {
      error: 'Branch did not run once per item',
      cause: 'The current DAG runtime exposes items and loop metadata but does not execute the connected branch once for each record.',
      fix: 'Use Function Item for per-item transforms or a supported batch/agent loop path when each record needs an individual action.',
    },
    {
      error: 'Next node cannot find loop items',
      cause: 'The downstream node is looking for the old array path or a single item field instead of the Loop output.',
      fix: 'Reference {{$json.items}} for the exposed list and {{$json.loop.iterations}} or {{$json.loop.truncated}} for metadata.',
    },
    {
      error: 'Permission denied after Loop',
      cause: 'Loop does not use credentials, but the service node after it may be missing a connected account or permission to send, write, update, or create records.',
      fix: 'Connect the required account on the downstream service node and confirm it has permission for the intended action.',
    },
  ],
  relatedNodes: ['split_in_batches', 'function_item', 'filter', 'limit'],
};
