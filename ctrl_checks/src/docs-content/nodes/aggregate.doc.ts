import type { NodeDoc } from '../types';

const baseFields = [
  {
    name: 'Field',
    internalKey: 'field',
    type: 'string' as const,
    required: false,
    description: 'Optional field path to aggregate. Leave empty to aggregate each item directly.',
    helpText: 'Use a field name such as amount, or a nested path such as order.total.',
    placeholder: 'amount',
    example: 'amount',
  },
];

const outputExample = { aggregate: 4500, operation: 'sum', field: 'amount' };
const outputDescription = 'aggregate: The computed value. operation: Aggregation operation used. field: Field path used when configured.';
const usageExample = {
  scenario: 'Calculate total sales from input.items order amounts',
  inputValues: { operation: 'sum', field: 'amount' },
  expectedOutput: '`{{$json.aggregate}}` holds the total sales figure.',
};

export const aggregateDoc: NodeDoc = {
  slug: 'aggregate',
  displayName: 'Aggregate',
  category: 'Data',
  logoUrl: '/icons/nodes/aggregate.svg',
  description: 'Aggregate input.items with sum, average, count, min, max, or join.',
  credentialType: 'None',
  credentialSetupSteps: ['This node does not need a saved account connection.'],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Operations',
      description: 'Aggregate exposes operation choices directly.',
      operations: [
        'sum',
        'avg',
        'count',
        'min',
        'max',
        'join',
      ].map((value) => ({
        name: value === 'avg' ? 'Average' : value.charAt(0).toUpperCase() + value.slice(1),
        value,
        description: value === 'join'
          ? 'Join item values into text using a delimiter.'
          : 'Compute an aggregate value from input.items.',
        fields: value === 'join'
          ? [
              ...baseFields,
              {
                name: 'Delimiter',
                internalKey: 'delimiter',
                type: 'string' as const,
                required: false,
                description: 'Delimiter used when joining values.',
                helpText: 'Use \\n for new lines, \\t for tabs, or any literal separator.',
                placeholder: '\\n',
                example: '\\n',
                defaultValue: '\n',
              },
            ]
          : baseFields,
        outputExample: value === 'join'
          ? { aggregate: 'Alice\nBob', text: 'Alice\nBob', operation: 'join', delimiter: '\n', field: 'name' }
          : outputExample,
        outputDescription,
        usageExample,
        externalDocsUrl: 'https://docs.ctrlchecks.com',
      })),
    },
  ],
  commonErrors: [
    {
      error: 'No items to aggregate',
      cause: 'The upstream input did not provide an items array.',
      fix: 'Connect a node that outputs items, or pass an array into Aggregate.',
    },
    {
      error: 'No numeric values found',
      cause: 'sum, avg, min, or max received values that could not be converted to numbers.',
      fix: 'Set Field to a numeric field path or use count/join instead.',
    },
  ],
  relatedNodes: [],
};
