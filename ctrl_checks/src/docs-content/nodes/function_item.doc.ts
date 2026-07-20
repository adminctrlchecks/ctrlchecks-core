import type { NodeDoc } from '../types';
import { richFieldHelp } from './_sharedFieldHelp';

export const functionItemDoc: NodeDoc = {
  slug: 'function_item',
  displayName: 'Function Item',
  category: 'Logic',
  logoUrl: '/icons/nodes/function_item.svg',
  description: 'Run custom JavaScript once for each element in input.items and replace items with the mapped results.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node does not use credentials or a saved third-party account connection.',
    'Connect the Function Item node output to the next step with an outgoing line so the mapped items array is available downstream.',
    'Downstream service node account connection setup is still required for service nodes that run after this Function Item node.',
    'Do not paste API keys, tokens, or passwords into the code field; use connected service nodes or secure references for real integrations.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Per-item JavaScript',
      description: 'Maps input.items in the sandbox. Each iteration exposes item, input, data, $json, and json as the current item.',
      operations: [
        {
          name: 'Map Items',
          value: 'default',
          description: 'Run the configured JavaScript body for each element in input.items. The mapped array replaces the original items field, while other incoming top-level fields pass through unchanged.',
          fields: [
            {
              name: 'Function Code',
              internalKey: 'code',
              type: 'textarea',
              required: true,
              description: 'JavaScript body executed once per item in input.items.',
              helpText: richFieldHelp({
                what: 'The JavaScript body that maps one item from input.items at a time.',
                why: 'The runtime collects every return value into a new items array, so this field controls the exact shape of each downstream item.',
                when: 'Fill it when each row, contact, invoice, or record needs the same custom transformation.',
                enter: 'Read the current item as item, input, data, $json, or json. Return the mapped item or assign result. Runtime does not provide an index variable today.',
                source: 'Use values on each array element, such as item.email, item.total, or item.status. Keep external secrets out of this field.',
                later: 'Downstream nodes read the mapped array from {{$json.items}} and individual mapped fields from each element when later list-aware nodes process it.',
                format: 'JavaScript body text. Example: return { ...item, normalizedEmail: String(item.email || "").toLowerCase() };',
                example: 'A billing workflow maps invoice rows to add overdue: true before a later filter keeps only overdue invoices.',
                empty: 'Runtime returns _error with "Function item node: Code is required" and preserves the incoming fields.',
                mistake: 'Using index in the script. The current runtime does not define index, so code that references it fails.',
              }),
              placeholder: 'return { ...item, processed: true };',
              example: 'return { ...item, processed: true };',
            },
            {
              name: 'Timeout',
              internalKey: 'timeout',
              type: 'number',
              required: false,
              description: 'Maximum sandbox execution time in milliseconds, capped at 30000.',
              helpText: richFieldHelp({
                what: 'The maximum time allowed for the batch item-mapping sandbox call.',
                why: 'All item mapping runs inside one sandbox call, so a large items array or heavy calculation can hit the timeout.',
                when: 'Leave the default for small lists, raise it for scheduled batch transforms, and keep it low for user-facing request paths.',
                enter: 'Type milliseconds such as 10000. Runtime caps any larger value at 30000.',
                source: 'Choose the value from item count, script complexity, and workflow latency needs. You can map it from {{$json.timeoutMs}} when upstream data provides a trusted number.',
                later: 'Mapping failures return _error, so a later Error Handler can check {{$json._error}}.',
                format: 'Positive number in milliseconds. The visible default is 10000 and the hard runtime maximum is 30000.',
                example: 'A nightly contact cleanup uses 30000 for thousands of rows, while a webhook enrichment flow keeps 10000.',
                empty: 'Runtime uses the default 10000 milliseconds.',
                mistake: 'Typing seconds instead of milliseconds, or assuming timeout applies separately to every item.',
              }),
              placeholder: '10000',
              example: '10000',
              defaultValue: '10000',
            },
          ],
          outputExample: {
            batchId: 'batch_1042',
            items: [
              { id: 'inv_1', total: 1200, overdue: true },
              { id: 'inv_2', total: 80, overdue: false },
            ],
          },
          outputDescription: [
            'items: Replaced with the mapped array returned by the per-item code.',
            'input: Other incoming top-level fields pass through unchanged.',
            'result: If the code assigns result for an item and does not return first, result becomes that mapped item.',
            '_error: Present on missing code, disabled JavaScript execution, or thrown item-mapping errors.',
            'No index: Runtime does not provide an index variable today.',
          ].join('\n'),
          usageExample: {
            scenario: 'Normalize every contact email in an imported list before filtering out invalid records.',
            inputValues: {
              code: 'return { ...item, email: String(item.email || "").trim().toLowerCase() };',
              timeout: '10000',
            },
            expectedOutput: 'The next node can read the transformed array at {{$json.items}} and filter each mapped item by email.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Function item node: Code is required',
      cause: 'The Code field is blank or resolves to an empty string.',
      fix: 'Add JavaScript that returns the mapped item for each element in input.items.',
    },
    {
      error: 'Function item node execution is disabled for security reasons',
      cause: 'The worker has DISABLE_JAVASCRIPT_NODE=true, so custom code nodes cannot run.',
      fix: 'Use non-code transformation nodes or ask an admin to enable JavaScript execution for trusted environments.',
    },
    {
      error: 'Function item error: <message>',
      cause: 'The per-item script threw an error, referenced an undefined variable such as index, or exceeded sandbox limits.',
      fix: 'Test with a small items array, use item for the current row, and avoid index because runtime does not define it today.',
    },
    {
      error: 'input.items is missing, so mapping does not run',
      cause: 'Runtime only maps input.items or a non-UI config.items array; without either one, the input passes through unchanged after Code is present.',
      fix: 'Use a previous node that outputs items, or reshape the payload to { items: [...] } before Function Item.',
    },
  ],
  relatedNodes: ['function', 'javascript', 'loop', 'filter'],
};
