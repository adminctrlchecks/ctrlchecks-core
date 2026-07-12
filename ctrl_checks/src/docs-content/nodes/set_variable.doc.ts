import type { NodeDoc } from '../types';

export const setVariableDoc: NodeDoc = {
  slug: 'set_variable',
  displayName: 'Set Variable',
  category: 'Data',
  logoUrl: '/icons/nodes/set_variable.svg',
  description: 'Create one or more named values for later workflow steps.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node does not need a saved account connection.',
    'Provide a variable name and value, or use the legacy values array.',
    'Optionally keep incoming fields in the output.'
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Set Variable supports a single name/value pair and a legacy values array.',
      operations: [
        {
          name: 'Set',
          value: 'default',
          description: 'Resolve the configured value and place it under the configured name.',
          fields: [
            {
              name: 'Name',
              internalKey: 'name',
              type: 'string',
              required: true,
              description: 'Variable name for the canonical single assignment path.',
              helpText: 'Use letters, numbers, and underscores. The name must start with a letter or underscore.',
              placeholder: 'userEmail',
              example: 'userEmail'
            },
            {
              name: 'Value',
              internalKey: 'value',
              type: 'textarea',
              required: false,
              description: 'Value to store under name.',
              helpText: 'Supports static values and template expressions such as {{$json.email}}.',
              placeholder: '{{$json.email}}',
              example: '{{$json.email}}'
            },
            {
              name: 'Values',
              internalKey: 'values',
              type: 'json',
              required: false,
              description: 'Legacy multi-assignment array of name/value objects.',
              helpText: 'Use only for older workflows that set several variables in one node.',
              placeholder: '[{"name":"fullName","value":"{{$json.firstName}} {{$json.lastName}}"}]',
              example: '[{"name":"fullName","value":"{{$json.firstName}} {{$json.lastName}}"}]'
            },
            {
              name: 'Keep Source',
              internalKey: 'keepSource',
              type: 'boolean',
              required: false,
              description: 'Keep incoming fields and add variable values to them.',
              helpText: 'When off, the output contains only the assigned variables.',
              placeholder: 'false',
              defaultValue: 'false',
              example: 'true'
            }
          ],
          outputExample: {
            userEmail: 'alice@example.com'
          },
          outputDescription: 'The output contains the assigned variable fields. With keepSource enabled, incoming fields are kept too.',
          usageExample: {
            scenario: 'Store a user email for later steps',
            inputValues: {
              name: 'userEmail',
              value: '{{$json.email}}'
            },
            expectedOutput: 'The value is available downstream as {{$json.userEmail}}.'
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com'
        }
      ]
    }
  ],
  commonErrors: [
    {
      error: 'Set Variable requires either name or values',
      cause: 'No single variable name and no legacy values array were provided.',
      fix: 'Fill name, or provide a non-empty values array.'
    },
    {
      error: 'Variable name must be a valid identifier',
      cause: 'The name contains spaces or starts with an invalid character.',
      fix: 'Use a name like userEmail or total_count.'
    }
  ],
  relatedNodes: ['set', 'javascript']
};
