import type { NodeDoc } from '../types';

export const javascriptDoc: NodeDoc = {
  slug: 'javascript',
  displayName: 'JavaScript',
  category: 'Data',
  logoUrl: '/icons/nodes/javascript.svg',
  description: 'Execute sandboxed JavaScript to transform workflow data.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node does not need a saved account connection.',
    'Enter JavaScript that returns the value you want downstream nodes to receive.',
    'Optionally set a timeout or output schema hint.'
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'JavaScript runs code against the current node input.',
      operations: [
        {
          name: 'Execute',
          value: 'default',
          description: 'Run JavaScript and return the script result directly.',
          fields: [
            {
              name: 'Code',
              internalKey: 'code',
              type: 'textarea',
              required: true,
              description: 'JavaScript code to execute.',
              helpText: 'Return the object, array, string, or number that downstream nodes should receive. The runtime resolves template expressions before execution.',
              placeholder: 'return { ...$json, fullName: $json.firstName + " " + $json.lastName };',
              example: 'return { total: $json.items.reduce((sum, item) => sum + item.amount, 0) };'
            },
            {
              name: 'Timeout',
              internalKey: 'timeout',
              type: 'number',
              required: false,
              description: 'Execution timeout in milliseconds, capped by the runtime at 30000.',
              helpText: 'The default is 5000 milliseconds. Values above 30000 are capped.',
              placeholder: '5000',
              defaultValue: '5000',
              example: '10000'
            },
            {
              name: 'Output Schema',
              internalKey: 'outputSchema',
              type: 'textarea',
              required: false,
              description: 'Optional JSON schema string used as a top-level output shape hint.',
              helpText: 'The runtime can warn when the returned value does not match the declared top-level type.',
              placeholder: '{"type":"object"}',
              example: '{"type":"array"}'
            }
          ],
          outputExample: {
            totalRevenue: 12450,
            orderCount: 60
          },
          outputDescription: 'The node output is whatever the script returns. Errors are returned in _error.',
          usageExample: {
            scenario: 'Calculate revenue statistics from an array of orders',
            inputValues: {
              code: 'const orders = $json.orders; return { totalRevenue: orders.reduce((sum, o) => sum + o.amount, 0), orderCount: orders.length };'
            },
            expectedOutput: 'The returned object becomes the downstream {{$json}}.'
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com'
        }
      ]
    }
  ],
  commonErrors: [
    {
      error: 'JavaScript node disabled',
      cause: 'The worker was configured with DISABLE_JAVASCRIPT_NODE.',
      fix: 'Use a built-in transformation node or ask an administrator to enable JavaScript execution.'
    },
    {
      error: 'Script error or timeout',
      cause: 'The code threw an exception or exceeded the configured timeout.',
      fix: 'Check the code path, input data, and timeout value.'
    }
  ],
  relatedNodes: ['set', 'math']
};
