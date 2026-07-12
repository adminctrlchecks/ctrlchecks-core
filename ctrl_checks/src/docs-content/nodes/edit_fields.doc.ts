import type { NodeDoc } from '../types';

export const editFieldsDoc: NodeDoc = {
  slug: 'edit_fields',
  displayName: 'Edit Fields',
  category: 'Data',
  logoUrl: '/icons/nodes/edit_fields.svg',
  description: 'Add or overwrite fields on the current data object.',
  credentialType: 'None',
  credentialSetupSteps: ['This node does not need a saved account connection.'],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Edit Fields is configured directly with field mappings.',
      operations: [
        {
          name: 'Execute',
          value: 'default',
          description: 'Add configured fields to the object, overwriting existing keys when names match.',
          fields: [
            {
              name: 'Fields',
              internalKey: 'fields',
              type: 'json',
              required: false,
              description: 'Object mapping output field names to static values or expressions.',
              helpText: 'Example: {"fullName":"{{$json.firstName}} {{$json.lastName}}","status":"active"}.',
              placeholder: '{"fullName":"{{$json.firstName}} {{$json.lastName}}"}',
              example: '{"fullName":"{{$json.firstName}} {{$json.lastName}}"}',
            },
          ],
          outputExample: { id: 1, firstName: 'Alice', lastName: 'Smith', fullName: 'Alice Smith' },
          outputDescription: 'The output is the original object plus each configured field value.',
          usageExample: {
            scenario: 'Add a normalized fullName field before writing a record',
            inputValues: { fields: '{"fullName":"{{$json.firstName}} {{$json.lastName}}"}' },
            expectedOutput: 'The object passes downstream with `{{$json.fullName}}` set.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Fields must be an object',
      cause: 'The fields input resolved to something other than an object.',
      fix: 'Use key-value rows or a JSON object such as {"status":"active"}.',
    },
  ],
  relatedNodes: [],
};
