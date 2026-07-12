import type { NodeDoc } from '../types';

export const ifElseDoc: NodeDoc = {
  slug: 'if_else',
  displayName: 'If/Else',
  category: 'Logic',
  logoUrl: '/icons/nodes/if_else.svg',
  description: 'Route execution to the true or false branch by evaluating one or more conditions.',
  credentialType: 'None',
  credentialSetupSteps: [],
  credentialDocsUrl: '',
  resources: [
    {
      name: 'Configuration',
      description: 'If/Else is configured directly with input fields.',
      operations: [
        {
          name: 'Configure',
          value: 'configure',
          description: 'Evaluate conditions against the incoming data and route to true or false.',
          fields: [
            {
              name: 'Conditions',
              internalKey: 'conditions',
              type: 'json',
              required: true,
              description: 'Conditions to evaluate. Each condition must include field, operator, and value.',
              helpText: 'Use field paths such as $json.age with operators equals, not_equals, greater_than, less_than, greater_than_or_equal, less_than_or_equal, contains, or not_contains.',
              placeholder: '[{"field":"$json.age","operator":"greater_than_or_equal","value":18}]',
              example: '[{"field":"$json.age","operator":"greater_than_or_equal","value":18}]'
            },
            {
              name: 'Combine Operation',
              internalKey: 'combineOperation',
              type: 'select',
              required: false,
              description: 'How to combine multiple conditions.',
              helpText: 'AND requires every condition to pass. OR routes true when any condition passes.',
              placeholder: 'AND',
              example: 'AND',
              defaultValue: 'AND',
              options: ['AND', 'OR']
            }
          ],
          outputExample: {
            condition: true,
            condition_result: true,
            conditionResult: true,
            result: true
          },
          outputDescription: 'The node forwards clean upstream business data and adds condition, condition_result, conditionResult, result, and output booleans for routing/debugging.',
          usageExample: {
            scenario: 'Route adults down the true branch and minors down the false branch',
            inputValues: {
              conditions: [{ field: '$json.age', operator: 'greater_than_or_equal', value: 18 }],
              combineOperation: 'AND'
            },
            expectedOutput: 'If the condition evaluates true, the true output path runs; otherwise the false output path runs.'
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com'
        }
      ]
    }
  ],
  commonErrors: [
    {
      error: 'Condition did not match expected data',
      cause: 'The field path did not exist in the incoming JSON, or the value type did not match the operator.',
      fix: 'Inspect the previous node output and use a field path such as $json.status or $json.items.length.'
    }
  ],
  relatedNodes: ['switch', 'merge']
};
