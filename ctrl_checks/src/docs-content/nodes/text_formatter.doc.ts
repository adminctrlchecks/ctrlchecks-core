import type { NodeDoc } from '../types';

export const textFormatterDoc: NodeDoc = {
  slug: 'text_formatter',
  displayName: 'Text Formatter',
  category: 'Data',
  logoUrl: '/icons/nodes/text_formatter.svg',
  description: 'Render text from a template and current workflow data.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node does not need a saved account connection.',
    'Enter a template using static text and workflow expressions.',
    'Run the workflow when the template is complete.'
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Text Formatter resolves a single template string.',
      operations: [
        {
          name: 'Format',
          value: 'default',
          description: 'Resolve template expressions against the incoming data.',
          fields: [
            {
              name: 'Template',
              internalKey: 'template',
              type: 'textarea',
              required: true,
              description: 'Text template to resolve.',
              helpText: 'Use static text plus expressions such as {{$json.name}}. The runtime does not read a separate values field.',
              placeholder: 'Hello {{$json.name}}',
              example: 'Order #{{$json.orderId}} - Total: {{$json.total}}'
            }
          ],
          outputExample: {
            formatted: 'Order #12345 - Total: 49.99'
          },
          outputDescription: 'When a template is provided, the node returns the formatted string. If the template is empty, it returns the input data plus formatted.',
          usageExample: {
            scenario: 'Build a message for a notification',
            inputValues: {
              template: 'Order #{{$json.orderId}} - Total: {{$json.total}}'
            },
            expectedOutput: 'The formatted text is the node output and can be used by downstream message nodes.'
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com'
        }
      ]
    }
  ],
  commonErrors: [
    {
      error: 'Empty template',
      cause: 'No template was provided.',
      fix: 'Add the text you want to render, including any {{$json.field}} expressions.'
    },
    {
      error: 'Missing expression value',
      cause: 'A template expression points to a field that is not present in the incoming data.',
      fix: 'Check the upstream output and update the expression path.'
    }
  ],
  relatedNodes: ['set', 'javascript']
};
