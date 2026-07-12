import type { NodeDoc } from '../types';

export const parallelDoc: NodeDoc = {
  slug: 'parallel',
  displayName: 'Parallel',
  category: 'Flow',
  logoUrl: '/icons/nodes/parallel.svg',
  description: 'Pass data through while recording the parallel orchestration mode.',
  credentialType: 'None',
  credentialSetupSteps: [],
  credentialDocsUrl: '',
  resources: [
    {
      name: 'Configuration',
      description: 'Parallel is configured directly with input fields.',
      operations: [
        {
          name: 'Configure',
          value: 'configure',
          description: 'Set the orchestration mode. Actual branch fan-out and fan-in are handled by the workflow engine.',
          fields: [
            {
              name: 'Mode',
              internalKey: 'mode',
              type: 'select',
              required: false,
              description: 'Execution mode (all, race).',
              helpText: 'all records wait-for-all behavior; race records first-completes behavior. The node passes input data through and adds mode/results.',
              placeholder: 'all',
              example: 'all',
              defaultValue: 'all',
              options: ['Wait for all', 'Race (first completes)']
            }
          ],
          outputExample: {
            orderId: 123,
            mode: 'all',
            results: []
          },
          outputDescription: 'The node passes object input fields through, adds mode, and returns an empty results array.',
          usageExample: {
            scenario: 'Mark a workflow point where independent downstream branches should be treated as parallel',
            inputValues: {
              mode: 'all'
            },
            expectedOutput: 'Downstream nodes receive the original input plus mode and results.'
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com'
        }
      ]
    }
  ],
  commonErrors: [],
  relatedNodes: ['merge']
};
