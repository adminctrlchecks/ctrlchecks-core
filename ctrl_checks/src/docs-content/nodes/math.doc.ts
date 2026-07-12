import type { NodeDoc } from '../types';

export const mathDoc: NodeDoc = {
  slug: 'math',
  displayName: 'Math',
  category: 'Data',
  logoUrl: '/icons/nodes/math.svg',
  description: 'Run numeric operations on values from the current workflow item.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node does not need a saved account connection.',
    'Choose the operation and provide the visible numeric fields.',
    'Run the workflow when the required fields are complete.'
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Operations',
      description: 'Math supports binary, unary, and list-based operations.',
      operations: [
        {
          name: 'Calculate',
          value: 'default',
          description: 'Calculate a result from value1, value2, and the selected operation.',
          fields: [
            {
              name: 'Operation',
              internalKey: 'operation',
              type: 'select',
              required: false,
              description: 'Operation to run: add, subtract, multiply, divide, modulo, power, sqrt, abs, round, floor, ceil, min, max, avg, or sum.',
              helpText: 'Choose the math operation. Binary operations use value1 and value2. Unary operations use value1. Min, max, avg, and sum can use a list in value1.',
              placeholder: 'add',
              defaultValue: 'add',
              options: ['add', 'subtract', 'multiply', 'divide', 'modulo', 'power', 'sqrt', 'abs', 'round', 'floor', 'ceil', 'min', 'max', 'avg', 'sum'],
              example: 'sum'
            },
            {
              name: 'Value 1',
              internalKey: 'value1',
              type: 'string',
              required: false,
              description: 'First number, template expression, field path, or comma-separated list for list operations.',
              helpText: 'Use a number such as 10, an expression such as {{$json.amount}}, or a comma-separated list such as 1,2,3.',
              placeholder: '{{$json.value1}}',
              example: '1,2,3'
            },
            {
              name: 'Value 2',
              internalKey: 'value2',
              type: 'string',
              required: false,
              description: 'Second number for binary operations.',
              helpText: 'Use this for add, subtract, multiply, divide, modulo, and power.',
              placeholder: '{{$json.value2}}',
              example: '5'
            },
            {
              name: 'Precision',
              internalKey: 'precision',
              type: 'number',
              required: false,
              description: 'Decimal places applied to the returned number.',
              helpText: 'The runtime defaults to 10 decimal places and accepts values from 0 through 20.',
              placeholder: '10',
              defaultValue: '10',
              example: '2'
            }
          ],
          outputExample: {
            result: 15,
            operation: 'sum'
          },
          outputDescription: 'The output keeps incoming fields and adds result plus operation. Errors are returned in _error.',
          usageExample: {
            scenario: 'Sum a list of invoice amounts',
            inputValues: {
              operation: 'sum',
              value1: '{{$json.amounts}}'
            },
            expectedOutput: 'The numeric total is available as {{$json.result}}.'
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com'
        }
      ]
    }
  ],
  commonErrors: [
    {
      error: 'Invalid numeric value',
      cause: 'A value cannot be converted to a number or a list operation receives no numbers.',
      fix: 'Check value1/value2 templates and make sure they resolve to numbers or numeric lists.'
    },
    {
      error: 'Unsupported operation',
      cause: 'The operation field is not one of the supported runtime operations.',
      fix: 'Choose one of the operation values shown in the node settings.'
    }
  ],
  relatedNodes: ['set', 'javascript']
};
