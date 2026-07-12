import type { NodeDoc } from '../types';

export const noopDoc: NodeDoc = {
  slug: 'noop',
  displayName: 'NoOp',
  category: 'Logic',
  logoUrl: '/icons/nodes/noop.svg',
  description: 'Pass data through unchanged.',
  credentialType: 'None',
  credentialSetupSteps: [],
  credentialDocsUrl: '',
  resources: [
    {
      name: 'Configuration',
      description: 'NoOp has no configurable fields.',
      operations: [
        {
          name: 'Configure',
          value: 'configure',
          description: 'Return the incoming object unchanged.',
          fields: [],
          outputExample: {
            orderId: 123,
            status: 'pending'
          },
          outputDescription: 'The output is the same object the node received as input.',
          usageExample: {
            scenario: 'Keep a placeholder step in a branch while preserving data flow',
            inputValues: {},
            expectedOutput: 'Downstream nodes receive the same fields that entered NoOp.'
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com'
        }
      ]
    }
  ],
  commonErrors: [],
  relatedNodes: []
};
