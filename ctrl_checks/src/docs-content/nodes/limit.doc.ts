import type { NodeDoc } from '../types';

export const limitDoc: NodeDoc = {
  slug: 'limit',
  displayName: 'Limit',
  category: 'Data',
  logoUrl: '/icons/nodes/limit.svg',
  description: 'Keep only the first N items from an array.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node does not need a saved account connection.',
    'Set the maximum number of items to keep.',
    'Optionally point Array at a specific upstream array.'
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Limit reads an optional array field, then input.items, then input.array.',
      operations: [
        {
          name: 'Limit Items',
          value: 'default',
          description: 'Truncate an array to the configured limit.',
          fields: [
            {
              name: 'Limit',
              internalKey: 'limit',
              type: 'number',
              required: true,
              description: 'Maximum number of items to return.',
              helpText: 'Use a positive number such as 10. The node keeps the first items in order.',
              placeholder: '10',
              example: '5'
            },
            {
              name: 'Array',
              internalKey: 'array',
              type: 'string',
              required: false,
              description: 'Optional array or template expression to limit.',
              helpText: 'Leave empty to use input.items first, then input.array.',
              placeholder: '{{$json.items}}',
              example: '{{$json.results}}'
            }
          ],
          outputExample: {
            items: [
              { id: 1 },
              { id: 2 }
            ],
            array: [
              { id: 1 },
              { id: 2 }
            ]
          },
          outputDescription: 'The output keeps incoming fields and writes the limited array to items and array.',
          usageExample: {
            scenario: 'Take the top five search results',
            inputValues: {
              limit: '5',
              array: '{{$json.results}}'
            },
            expectedOutput: 'The first five records are available in {{$json.items}}.'
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com'
        }
      ]
    }
  ],
  commonErrors: [
    {
      error: 'No array input',
      cause: 'Array, input.items, and input.array were all empty or non-arrays.',
      fix: 'Point Array at a valid upstream array or provide input.items.'
    },
    {
      error: 'Invalid limit',
      cause: 'The limit value is missing or not numeric.',
      fix: 'Enter a numeric maximum such as 10.'
    }
  ],
  relatedNodes: ['sort', 'merge_data']
};
