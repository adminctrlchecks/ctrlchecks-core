import type { NodeDoc } from '../types';

export const linearTriggerDoc: NodeDoc = {
  slug: 'linear_trigger',
  displayName: 'Linear Trigger',
  category: 'Triggers',
  logoUrl: '/icons/nodes/linear.svg',
  description: 'Start a workflow from signed Linear webhook events for issues, comments, projects, cycles, labels, reactions, documents, initiatives, customers, and users.',
  credentialType: 'Linear Personal API Key',
  credentialSetupSteps: [
    'Open Linear Settings -> API -> Personal API Keys.',
    'Create a key from a workspace admin account if CtrlChecks should register webhooks automatically.',
    'In CtrlChecks, open Connections -> Add Connection -> Linear and save the key.',
    'Set a Team ID only if the webhook should watch one Linear team; otherwise leave it blank to watch all public teams.',
  ],
  credentialDocsUrl: 'https://linear.app/developers/webhooks',
  resources: [
    {
      name: 'Webhook Events',
      description: 'Receive Linear webhook deliveries signed with Linear-Signature.',
      operations: [
        {
          name: 'Issue And Comment Activity',
          value: 'issue_comment_events',
          description: 'Trigger on Linear issue and comment creation, updates, removals, and related project-management events.',
          fields: [
            { name: 'Team ID', internalKey: 'teamId', type: 'string', required: false, description: 'Optional Linear team UUID. Leave blank for all public teams.', placeholder: 'team uuid' },
            { name: 'Resource Types', internalKey: 'resourceTypes', type: 'string', required: false, description: 'Comma-separated Linear resource types to subscribe to.', placeholder: 'Issue, Comment' },
            { name: 'Event Types', internalKey: 'eventTypes', type: 'string', required: false, description: 'Comma-separated normalized event filters.', placeholder: 'issue_created, issue_updated, comment_created' },
            { name: 'Issue ID', internalKey: 'issueId', type: 'string', required: false, description: 'Optional issue UUID or identifier filter.', placeholder: 'ENG-123 or issue uuid' },
            { name: 'Project ID', internalKey: 'projectId', type: 'string', required: false, description: 'Optional project UUID filter.', placeholder: 'project uuid' },
          ],
          outputExample: { eventType: 'issue_updated', issueId: 'issue_uuid', issueIdentifier: 'ENG-123', issueTitle: 'Fix billing retry', teamKey: 'ENG', raw: {} },
          outputDescription: 'Normalized fields include eventId, eventType, deliveryId, action, entityType, issue fields, comment fields, project fields, actor fields, timestamp, and raw.',
          usageExample: {
            scenario: 'Triage new Linear issues with an AI Agent',
            inputValues: { resourceTypes: 'Issue', eventTypes: 'issue_created' },
            expectedOutput: 'A normalized Linear issue payload available as {{$json.issueId}}, {{$json.issueIdentifier}}, {{$json.issueTitle}}, and {{$json.teamId}}.',
          },
          externalDocsUrl: 'https://linear.app/developers/webhooks',
        },
      ],
    },
  ],
  commonErrors: [
    { error: 'Connection required', cause: 'No Linear key is saved.', fix: 'Save Linear in Connections, then activate the workflow again.' },
    { error: 'Webhook creation failed', cause: 'The Linear credential cannot create webhooks.', fix: 'Use a workspace admin personal API key or an OAuth credential with admin access.' },
    { error: 'Invalid signature', cause: 'The webhook secret in Redis does not match Linear, or the raw body was changed before validation.', fix: 'Re-register the webhook by saving the active workflow again.' },
  ],
  relatedNodes: ['linear', 'jira_trigger', 'trello_trigger'],
};
