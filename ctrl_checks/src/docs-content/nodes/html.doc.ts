import type { NodeDoc } from '../types';

const htmlField = {
  name: 'HTML',
  internalKey: 'html',
  type: 'textarea' as const,
  required: true,
  description: 'HTML content to process.',
  helpText: 'Provide an HTML document, fragment, or an expression such as {{$json.pageContent}}.',
  placeholder: '<html>...</html>',
  example: '{{$json.pageContent}}',
};

export const htmlDoc: NodeDoc = {
  slug: 'html',
  displayName: 'HTML',
  category: 'Data',
  logoUrl: '/icons/nodes/html.svg',
  description: 'Parse HTML, extract selector text, or convert body content to plain text.',
  credentialType: 'None',
  credentialSetupSteps: ['This node does not need a saved account connection.'],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Operations',
      description: 'HTML exposes operation choices directly.',
      operations: [
        {
          name: 'Parse',
          value: 'parse',
          description: 'Parse an HTML document into page title, meta tags, and body HTML.',
          fields: [htmlField],
          outputExample: { title: 'Example Domain', meta: { description: 'Example page' }, body: '<h1>Example Domain</h1>', success: true },
          outputDescription: 'title: Page title. meta: Meta tags keyed by name/property. body: Inner body HTML. success: true on success.',
          usageExample: {
            scenario: 'Read title and metadata from a fetched page',
            inputValues: { html: '{{$json.pageContent}}' },
            expectedOutput: 'Use `{{$json.title}}`, `{{$json.meta}}`, or `{{$json.body}}` downstream.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
        {
          name: 'Extract',
          value: 'extract',
          description: 'Extract text from elements that match a CSS selector.',
          fields: [
            htmlField,
            {
              name: 'Selector',
              internalKey: 'selector',
              type: 'string',
              required: true,
              description: 'CSS selector used to find elements.',
              helpText: 'Examples: .price, h1, a[href].',
              placeholder: '.price',
              example: '.price',
            },
          ],
          outputExample: { results: ['$42.00'], count: 1, success: true },
          outputDescription: 'results: Text from each matched element. count: Number of matched elements. success: true on success.',
          usageExample: {
            scenario: 'Scrape a product page price',
            inputValues: { html: '{{$json.pageContent}}', selector: '.price' },
            expectedOutput: 'Extracted values are in `{{$json.results}}`.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
        {
          name: 'To Text',
          value: 'toText',
          description: 'Convert HTML body content to plain text.',
          fields: [htmlField],
          outputExample: { text: 'Example Domain This domain is for use in illustrative examples.', success: true },
          outputDescription: 'text: Plain text from the body element. success: true on success.',
          usageExample: {
            scenario: 'Convert downloaded HTML into plain text for an AI step',
            inputValues: { html: '{{$json.pageContent}}' },
            expectedOutput: 'Plain text is available in `{{$json.text}}`.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'HTML is required',
      cause: 'The html field and content alias were empty.',
      fix: 'Map HTML content into the html field.',
    },
    {
      error: 'Selector is required',
      cause: 'Extract was selected without a CSS selector.',
      fix: 'Set Selector to a CSS selector such as .price or h1.',
    },
  ],
  relatedNodes: [],
};
