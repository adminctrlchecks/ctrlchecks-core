import type { NodeDoc } from '../types';

const commonFields = [
  {
    name: 'API Key',
    internalKey: 'apiKey',
    type: 'password' as const,
    required: false,
    description: 'Optional Linear personal API key fallback. Prefer a saved Linear connection.',
    helpText: 'Save the key in Connections -> Add Connection -> Linear. Use this field only for one-off tests.',
    placeholder: 'Optional if saved in Connections',
  },
  {
    name: 'Team ID',
    internalKey: 'teamId',
    type: 'string' as const,
    required: false,
    description: 'Linear team UUID. Required when creating an issue; optional when listing issues.',
    helpText: 'Run Get Teams first, then use the returned team id.',
    placeholder: 'team uuid',
  },
  {
    name: 'Issue ID',
    internalKey: 'issueId',
    type: 'string' as const,
    required: false,
    description: 'Linear issue UUID for get/update operations.',
    helpText: 'Use the id returned by List Issues or Create Issue.',
    placeholder: 'issue uuid',
  },
  {
    name: 'Issue Title',
    internalKey: 'title',
    type: 'string' as const,
    required: false,
    description: 'Issue title for create or update.',
    placeholder: 'Bug: checkout fails',
  },
  {
    name: 'Issue Description',
    internalKey: 'description',
    type: 'textarea' as const,
    required: false,
    description: 'Markdown issue description.',
    placeholder: 'Steps to reproduce...',
  },
];

export const linearDoc: NodeDoc = {
  slug: 'linear',
  displayName: 'Linear',
  category: 'Productivity',
  logoUrl: '/icons/nodes/linear.svg',
  description: 'Create, update, fetch, and list Linear issues and teams.',
  credentialType: 'Linear Personal API Key',
  credentialSetupSteps: [
    'Open Linear Settings -> API -> Personal API Keys.',
    'Create a key with access to the workspace and copy it once.',
    'In CtrlChecks, open Connections -> Add Connection -> Linear and paste the key.',
    'Run Get Teams first if you need the teamId for Create Issue.',
  ],
  credentialDocsUrl: 'https://developers.linear.app/docs/graphql/working-with-the-graphql-api',
  resources: [
    {
      name: 'Operations',
      description: 'Use Linear to work with issue tracker data.',
      operations: ['get_teams', 'list_issues', 'get_issue', 'create_issue', 'update_issue'].map((value) => ({
        name: value.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
        value,
        description: `Run ${value} against Linear.`,
        fields: commonFields,
        outputExample: { success: true, operation: value, issue: { id: 'uuid', identifier: 'ENG-123', title: 'Bug' }, issues: [], teams: [] },
        outputDescription: 'success, operation, data, plus normalized issue/issues/teams/count fields when applicable.',
        usageExample: {
          scenario: 'Create an engineering task from an incoming bug report',
          inputValues: { operation: 'create_issue', teamId: 'team uuid', title: '{{$json.title}}', description: '{{$json.description}}' },
          expectedOutput: 'A Linear issue object with id, identifier, title, state, team, and url.',
        },
        externalDocsUrl: 'https://developers.linear.app/docs/graphql/working-with-the-graphql-api',
      })),
    },
  ],
  commonErrors: [
    { error: 'Connection required', cause: 'No Linear key is saved or provided.', fix: 'Save Linear in Connections, then rerun the workflow.' },
    { error: 'teamId is required', cause: 'Create Issue needs a Linear team UUID.', fix: 'Run Get Teams and use the returned id.' },
    { error: 'issueId is required', cause: 'Get or Update Issue needs the Linear issue UUID.', fix: 'Use id from List Issues or Create Issue.' },
  ],
  relatedNodes: ['trello', 'jira', 'clickup', 'notion'],
};
