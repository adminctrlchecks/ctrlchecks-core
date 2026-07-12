import type { NodeDoc } from '../types';

export const setDoc: NodeDoc = {
  slug: 'set',
  displayName: 'Set',
  category: 'Data',
  logoUrl: '/icons/nodes/set.svg',
  description: 'Set or override fields on the current workflow item.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node does not need a saved account connection.',
    'Enter a JSON object of fields to add or replace.',
    'Run the workflow when the fields object is valid.'
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Set merges resolved fields into the incoming object.',
      operations: [
        {
          name: 'Set Fields',
          value: 'default',
          description: 'Resolve the fields object and merge it onto the current item.',
          fields: [
            {
              name: 'Fields',
              internalKey: 'fields',
              type: 'json',
              required: true,
              description: 'JSON object of fields to set.',
              helpText: 'Use an object such as {"status":"new","email":"{{$json.email}}"}. Template strings are resolved at runtime.',
              placeholder: '{"status":"new","email":"{{$json.email}}"}',
              example: '{"status":"new","email":"{{$json.email}}"}'
            }
          ],
          outputExample: {
            id: '123',
            email: 'alice@example.com',
            status: 'new'
          },
          outputDescription: 'The output keeps incoming fields and applies the configured fields on top.',
          usageExample: {
            scenario: 'Add a normalized status field',
            inputValues: {
              fields: '{"status":"new"}'
            },
            expectedOutput: 'The current item now includes {{$json.status}}.'
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com'
        }
      ]
    }
  ],
  commonErrors: [
    {
      error: 'Set: fields must be valid JSON object',
      cause: 'The fields value is empty, invalid JSON, or not an object.',
      fix: 'Provide a valid JSON object.'
    },
    {
      error: 'Missing upstream value',
      cause: 'A template expression inside fields points to a missing input field.',
      fix: 'Check the upstream output and update the expression path.'
    }
  ],
  relatedNodes: ['set_variable', 'rename_keys']
};
