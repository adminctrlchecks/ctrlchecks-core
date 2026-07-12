import type { NodeDoc } from '../types';

export const renameKeysDoc: NodeDoc = {
  slug: 'rename_keys',
  displayName: 'Rename Keys',
  category: 'Data',
  logoUrl: '/icons/nodes/rename_keys.svg',
  description: 'Rename fields on the current workflow item.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node does not need a saved account connection.',
    'Provide key mappings from old field name to new field name.',
    'Run the workflow when mappings are complete.'
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Rename Keys copies values to new names and removes the old keys.',
      operations: [
        {
          name: 'Rename',
          value: 'default',
          description: 'Rename current item keys according to the mappings object.',
          fields: [
            {
              name: 'Mappings',
              internalKey: 'mappings',
              type: 'json',
              required: true,
              description: 'Key mappings in the form {"oldKey":"newKey"}.',
              helpText: 'Use an object where each key is the current field name and each value is the new field name.',
              placeholder: '{"oldName":"name","oldEmail":"email"}',
              example: '{"oldName":"name","oldEmail":"email"}'
            }
          ],
          outputExample: {
            name: 'Alice',
            email: 'alice@example.com'
          },
          outputDescription: 'The output keeps unmapped fields, adds renamed fields, and deletes old keys that were renamed.',
          usageExample: {
            scenario: 'Normalize API field names before loading data into another system',
            inputValues: {
              mappings: '{"oldEmail":"email"}'
            },
            expectedOutput: 'The value from oldEmail is available as {{$json.email}} and oldEmail is removed.'
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com'
        }
      ]
    }
  ],
  commonErrors: [
    {
      error: 'Rename Keys: mappings must be object',
      cause: 'Mappings were empty or not a valid object.',
      fix: 'Provide an object such as {"oldName":"newName"}.'
    },
    {
      error: 'No key changed',
      cause: 'The mapped source key was not present in the incoming item.',
      fix: 'Check the upstream output and mapping source keys.'
    }
  ],
  relatedNodes: ['set', 'json_parser']
};
