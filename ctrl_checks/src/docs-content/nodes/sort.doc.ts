import type { NodeDoc } from '../types';

export const sortDoc: NodeDoc = {
  slug: 'sort',
  displayName: 'Sort',
  category: 'Data',
  logoUrl: '/icons/nodes/sort.svg',
  description: 'Sort the input items array.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node does not need a saved account connection.',
    'Choose the field, direction, and comparison type.',
    'Run the workflow after an upstream node provides items.'
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Sort reads input.items and writes the sorted array back to items.',
      operations: [
        {
          name: 'Sort Items',
          value: 'default',
          description: 'Sort items by a configured field.',
          fields: [
            {
              name: 'Field',
              internalKey: 'field',
              type: 'string',
              required: false,
              description: 'Field to sort by.',
              helpText: 'Leave blank to sort primitive items. Use a field name such as score for object arrays.',
              placeholder: 'score',
              example: 'score'
            },
            {
              name: 'Direction',
              internalKey: 'direction',
              type: 'select',
              required: false,
              description: 'Sort direction.',
              helpText: 'Use asc for low-to-high or desc for high-to-low.',
              placeholder: 'asc',
              defaultValue: 'asc',
              options: ['asc', 'desc'],
              example: 'desc'
            },
            {
              name: 'Type',
              internalKey: 'type',
              type: 'select',
              required: false,
              description: 'Comparison type.',
              helpText: 'Use auto, number, string, or date.',
              placeholder: 'auto',
              defaultValue: 'auto',
              options: ['auto', 'number', 'string', 'date'],
              example: 'number'
            }
          ],
          outputExample: {
            items: [
              { name: 'Alice', score: 95 },
              { name: 'Bob', score: 80 }
            ]
          },
          outputDescription: 'The output keeps incoming fields and replaces items with the sorted items array. If input.items is missing, the input is returned unchanged.',
          usageExample: {
            scenario: 'Sort a leaderboard by score descending',
            inputValues: {
              field: 'score',
              direction: 'desc',
              type: 'number'
            },
            expectedOutput: 'Sorted records are available in {{$json.items}}.'
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com'
        }
      ]
    }
  ],
  commonErrors: [
    {
      error: 'No items to sort',
      cause: 'The incoming data does not contain an items array.',
      fix: 'Provide input.items from an upstream list-producing node.'
    },
    {
      error: 'Unexpected order',
      cause: 'The comparison type does not match the field values.',
      fix: 'Set type to number, string, or date when auto is not enough.'
    }
  ],
  relatedNodes: ['limit', 'merge_data']
};
