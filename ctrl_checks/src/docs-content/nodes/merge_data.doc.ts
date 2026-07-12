import type { NodeDoc } from '../types';

export const mergeDataDoc: NodeDoc = {
  slug: 'merge_data',
  displayName: 'Merge Data',
  category: 'Data',
  logoUrl: '/icons/nodes/merge_data.svg',
  description: 'Combine data arriving from multiple workflow branches.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node does not need a saved account connection.',
    'Pick the merge mode that matches how branch data should be combined.',
    'Run the workflow after the upstream branches provide data.'
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Merge Data uses the canonical merge executor and supports multiple inputs.',
      operations: [
        {
          name: 'Merge',
          value: 'default',
          description: 'Merge branch outputs using overwrite, append, or deep_merge mode.',
          fields: [
            {
              name: 'Mode',
              internalKey: 'mode',
              type: 'select',
              required: false,
              description: 'Merge mode: overwrite, append, or deep_merge.',
              helpText: 'Overwrite combines object fields with later values winning. Append combines inputs into an items array. Deep merge recursively combines nested objects.',
              placeholder: 'overwrite',
              defaultValue: 'overwrite',
              options: ['overwrite', 'append', 'deep_merge'],
              example: 'append'
            }
          ],
          outputExample: {
            items: [
              { id: 1, name: 'Alice' },
              { id: 2, name: 'Bob' }
            ]
          },
          outputDescription: 'Overwrite and deep_merge return a merged object. Append returns combined items. Runtime aliases such as concat and concatenate are accepted for older workflows.',
          usageExample: {
            scenario: 'Combine records from two upstream branches',
            inputValues: {
              mode: 'append'
            },
            expectedOutput: 'Combined records are available in {{$json.items}}.'
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com'
        }
      ]
    }
  ],
  commonErrors: [
    {
      error: 'No branch data to merge',
      cause: 'The node ran before upstream branches produced useful objects or arrays.',
      fix: 'Check the incoming branch connections and upstream node outputs.'
    },
    {
      error: 'Unexpected merge result',
      cause: 'The selected mode does not match the shape of the incoming data.',
      fix: 'Use append for lists, overwrite for flat objects, and deep_merge for nested objects.'
    }
  ],
  relatedNodes: ['set', 'sort', 'limit']
};
