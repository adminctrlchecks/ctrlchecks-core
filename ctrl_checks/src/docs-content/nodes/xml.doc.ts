import type { NodeDoc } from '../types';

export const xmlDoc: NodeDoc = {
  slug: 'xml',
  displayName: 'XML',
  category: 'Data',
  logoUrl: '/icons/nodes/xml.svg',
  description: 'Parse, extract from, or validate XML content.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node does not need a saved account connection.',
    'Choose parse, extract, or validate and provide XML content.',
    'For extract, also provide the XPath-style path.'
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Operations',
      description: 'XML supports parse, extract, and validate.',
      operations: [
        {
          name: 'Process XML',
          value: 'default',
          description: 'Process XML using the selected operation.',
          fields: [
            {
              name: 'Operation',
              internalKey: 'operation',
              type: 'select',
              required: false,
              description: 'Operation to run: parse, extract, or validate.',
              helpText: 'Parse converts XML to an object. Extract parses then reads a slash path. Validate checks syntax and returns valid/errors.',
              placeholder: 'parse',
              defaultValue: 'parse',
              options: ['parse', 'extract', 'validate'],
              example: 'extract'
            },
            {
              name: 'XML',
              internalKey: 'xml',
              type: 'textarea',
              required: true,
              description: 'XML content or template expression.',
              helpText: 'Provide the XML string directly or from an upstream field such as {{$json.responseBody}}.',
              placeholder: '<root><item>value</item></root>',
              example: '{{$json.responseBody}}'
            },
            {
              name: 'XPath',
              internalKey: 'xpath',
              type: 'string',
              required: false,
              description: 'Slash path used by extract after XML is parsed.',
              helpText: 'Required when operation is extract. Examples: /root/item or /root/order/id.',
              placeholder: '/root/item',
              example: '/root/order/id'
            },
            {
              name: 'Max Size',
              internalKey: 'maxSize',
              type: 'number',
              required: false,
              description: 'Maximum XML payload size in bytes.',
              helpText: 'The runtime default is 5242880 bytes.',
              placeholder: '5242880',
              defaultValue: '5242880',
              example: '5242880'
            }
          ],
          outputExample: {
            data: {
              root: {
                item: 'value'
              }
            },
            success: true
          },
          outputDescription: 'Parse returns data and success. Extract returns result, xpath, data, and success. Validate returns valid and errors.',
          usageExample: {
            scenario: 'Extract an order id from an XML response',
            inputValues: {
              operation: 'extract',
              xml: '{{$json.responseBody}}',
              xpath: '/root/order/id'
            },
            expectedOutput: 'The extracted value is available as {{$json.result}}.'
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com'
        }
      ]
    }
  ],
  commonErrors: [
    {
      error: 'xml is required',
      cause: 'The XML field is empty or the expression resolved to an empty value.',
      fix: 'Provide XML content or point the field at an upstream XML string.'
    },
    {
      error: 'XML extract: xpath field is required',
      cause: 'Extract was selected without an xpath value.',
      fix: 'Enter a slash path such as /root/item.'
    }
  ],
  relatedNodes: ['json_parser', 'text_formatter']
};
