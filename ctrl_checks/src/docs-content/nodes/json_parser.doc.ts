import type { NodeDoc } from '../types';

export const jsonParserDoc: NodeDoc = {
  slug: 'json_parser',
  displayName: 'JSON Parser',
  category: 'Data',
  logoUrl: '/icons/nodes/json_parser.svg',
  description: 'Parse a JSON string into workflow data.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node does not need a saved account connection.',
    'Provide the JSON string to parse.',
    'Optionally list top-level fields to copy onto the output.'
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'JSON Parser reads json and supports legacy jsonData/data aliases.',
      operations: [
        {
          name: 'Parse',
          value: 'default',
          description: 'Parse JSON and optionally extract top-level fields.',
          fields: [
            {
              name: 'JSON',
              internalKey: 'json',
              type: 'textarea',
              required: true,
              description: 'JSON string or template expression to parse.',
              helpText: 'Use a literal JSON string or a template such as {{$json.body}}. Legacy jsonData and data fields are still accepted by the runtime.',
              placeholder: '{"name":"Alice","email":"alice@example.com"}',
              example: '{{$json.body}}'
            },
            {
              name: 'Extract Fields',
              internalKey: 'extractFields',
              type: 'json',
              required: false,
              description: 'Optional array of top-level field names to copy from the parsed object.',
              helpText: 'Leave empty to keep the full parsed object under parsed. Use ["name","email"] to copy those keys onto the output.',
              placeholder: '["name","email"]',
              example: '["name","email"]'
            }
          ],
          outputExample: {
            parsed: {
              name: 'Alice',
              email: 'alice@example.com'
            },
            name: 'Alice'
          },
          outputDescription: 'Without extractFields, output keeps incoming fields and adds parsed. With extractFields, copied fields are added next to parsed.',
          usageExample: {
            scenario: 'Parse a JSON API response stored as text',
            inputValues: {
              json: '{{$json.responseBody}}',
              extractFields: '["id","status"]'
            },
            expectedOutput: 'The parsed object is available as {{$json.parsed}} and requested top-level fields are copied onto {{$json}}.'
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com'
        }
      ]
    }
  ],
  commonErrors: [
    {
      error: 'JSON Parser: json is required',
      cause: 'json, jsonData, and data were empty.',
      fix: 'Provide a JSON string or point the field at an upstream text value.'
    },
    {
      error: 'Invalid JSON',
      cause: 'The input text is not valid JSON.',
      fix: 'Check quotes, brackets, commas, and template output.'
    }
  ],
  relatedNodes: ['xml', 'set']
};
