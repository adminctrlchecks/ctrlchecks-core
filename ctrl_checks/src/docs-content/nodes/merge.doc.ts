import type { NodeDoc } from '../types';

export const mergeDoc: NodeDoc = {
  slug: 'merge',
  displayName: 'Merge',
  category: 'Logic',
  logoUrl: '/icons/nodes/merge.svg',
  description: 'Combine multiple incoming branches into one output.',
  credentialType: 'None',
  credentialSetupSteps: [],
  credentialDocsUrl: '',
  resources: [
    {
      name: 'Configuration',
      description: 'Merge is configured directly with input fields.',
      operations: [
        {
          name: 'Configure',
          value: 'configure',
          description: 'Merge upstream branch outputs using overwrite, append, or deep_merge mode.',
          fields: [
            {
              name: 'Mode',
              internalKey: 'mode',
              type: 'select',
              required: false,
              description: 'Merge mode. overwrite combines object fields with later branches winning, append collects branch outputs into items, and deep_merge recursively merges nested objects.',
              helpText: 'Choose overwrite for flat objects, append to collect arrays or branch outputs into items, or deep_merge for nested objects.',
              placeholder: 'overwrite',
              example: 'overwrite',
              defaultValue: 'overwrite',
              options: ['Overwrite objects', 'Append items', 'Deep merge objects']
            }
          ],
          outputExample: {
            name: 'John',
            email: 'john@example.com',
            items: [1, 2, 3]
          },
          outputDescription: 'The output is the combined branch data. append mode returns collected values in items; overwrite and deep_merge return merged object fields.',
          usageExample: {
            scenario: 'Rejoin two If/Else branches before a final output step',
            inputValues: {
              mode: 'overwrite'
            },
            expectedOutput: 'Downstream nodes receive one object containing the merged branch data.'
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com'
        }
      ]
    }
  ],
  commonErrors: [
    {
      error: 'Unexpected overwritten field',
      cause: 'overwrite mode uses later branch values when two branches output the same key.',
      fix: 'Use deep_merge for nested objects, or rename fields upstream before merging.'
    }
  ],
  relatedNodes: ['if_else', 'parallel', 'switch']
};
