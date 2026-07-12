import type { NodeDoc } from '../types';

export const loopDoc: NodeDoc = {
  slug: 'loop',
  displayName: 'Loop',
  category: 'Logic',
  logoUrl: '/icons/nodes/loop.svg',
  description: 'Expose an array downstream with max-iteration metadata. The DAG runtime does not execute the next branch once per item.',
  credentialType: 'None',
  credentialSetupSteps: [],
  credentialDocsUrl: '',
  resources: [
    {
      name: 'Configuration',
      description: 'Loop is configured directly with input fields.',
      operations: [
        {
          name: 'Configure',
          value: 'configure',
          description: 'Expose input.items, or an array resolved from array, and add loop metadata.',
          fields: [
            {
              name: 'Array',
              internalKey: 'array',
              type: 'string',
              required: false,
              description: 'Optional expression or path that resolves to an array. Leave empty to use input.items from the previous node.',
              helpText: 'Use {{$json.items}} or {{$json.rows}} when the previous node returns an array under that key. Leave blank to use input.items automatically.',
              placeholder: '{{$json.items}}',
              example: '{{$json.items}}'
            },
            {
              name: 'Max Iterations',
              internalKey: 'maxIterations',
              type: 'number',
              required: false,
              description: 'Maximum number of items to expose downstream.',
              helpText: 'Loop truncates items to this number and sets loop.truncated when the input array is longer.',
              placeholder: '100',
              example: '100',
              defaultValue: '100'
            }
          ],
          outputExample: {
            items: ['email1', 'email2'],
            loop: {
              maxIterations: 100,
              iterations: 2,
              truncated: false
            }
          },
          outputDescription: 'items: The resolved array, truncated to maxIterations when needed. loop: Metadata with maxIterations, iterations, and truncated.',
          usageExample: {
            scenario: 'Cap spreadsheet rows before sending them to the next step',
            inputValues: {
              array: '{{$json.rows}}',
              maxIterations: 100
            },
            expectedOutput: 'Downstream nodes receive {{$json.items}} plus {{$json.loop.iterations}} and {{$json.loop.truncated}}.'
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com'
        }
      ]
    }
  ],
  commonErrors: [
    {
      error: 'Array is empty',
      cause: 'array did not resolve to an array and the upstream input did not contain input.items.',
      fix: 'Point array to an upstream array such as {{$json.rows}}, or leave it blank only when input.items exists.'
    }
  ],
  relatedNodes: ['function_item', 'split_in_batches', 'limit']
};
