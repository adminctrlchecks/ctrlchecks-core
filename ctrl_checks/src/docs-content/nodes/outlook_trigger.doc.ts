import type { NodeDoc } from '../types';

export const outlookTriggerDoc: NodeDoc = {
  slug: 'outlook_trigger',
  displayName: 'Outlook Trigger',
  category: 'Triggers',
  logoUrl: '/integrations-logos/Outlook.svg',
  description: 'Start workflows from new Outlook email or calendar events delivered through Microsoft Graph change notifications.',
  credentialType: 'Microsoft OAuth2',
  credentialSetupSteps: [
    'Connect Microsoft (Outlook) in Connections if not already connected. This grants the Mail.Read and Calendars.Read Graph scopes needed to watch the mailbox or calendar.',
    'Add this trigger to a workflow, choose Mail or Calendar, and save/activate the workflow.',
    'CtrlChecks automatically creates a Microsoft Graph subscription pointing at the generated webhook URL — no external dashboard setup is required, unlike Gmail Pub/Sub.',
    'Subscriptions are renewed automatically before they expire (Graph subscriptions expire after roughly 3 days).',
  ],
  credentialDocsUrl: 'https://learn.microsoft.com/graph/api/resources/webhooks',
  resources: [
    {
      name: 'Webhook',
      description: 'Receives Microsoft Graph change notifications and emits a normalized event payload.',
      operations: [
        {
          name: 'Receive notification',
          value: 'receive',
          description: 'Starts the workflow when an accepted Outlook change notification arrives.',
          fields: [
            {
              name: 'Resource',
              internalKey: 'resource',
              type: 'string',
              required: false,
              description: 'Which Outlook resource to watch: mail or calendar.',
              helpText: 'Mail watches the selected folder; Calendar watches events.',
              placeholder: 'mail',
              example: 'mail',
            },
            {
              name: 'Change Types',
              internalKey: 'changeTypes',
              type: 'string',
              required: false,
              description: 'Comma-separated Microsoft Graph change types to accept.',
              helpText: 'Use created for new items, updated for calendar changes.',
              placeholder: 'created',
              example: 'created',
            },
            {
              name: 'Mail Folder',
              internalKey: 'folderName',
              type: 'string',
              required: false,
              description: 'Mail folder to watch (mail resource only).',
              helpText: 'Defaults to Inbox.',
              placeholder: 'Inbox',
              example: 'Inbox',
            },
          ],
          outputExample: {
            eventId: 'msg-1-created',
            eventType: 'message_created',
            source: 'outlook',
            subject: 'Invoice #123',
            from: 'billing@example.com',
            snippet: 'Your invoice is ready...',
            conversationId: 'conversation-1',
            raw: {},
          },
          outputDescription: 'Outputs normalized top-level fields: eventId, eventType, source, userId, username, text, timestamp, resourceId, subject, from, to, snippet, conversationId, start, end, attendees, and raw.',
          usageExample: {
            scenario: 'AI triage for new support emails',
            inputValues: {
              resource: 'mail',
              changeTypes: 'created',
            },
            expectedOutput: 'Use {{$json.subject}}, {{$json.from}}, and {{$json.snippet}} in an AI Agent, then reply using the Outlook action node.',
          },
          externalDocsUrl: 'https://learn.microsoft.com/graph/api/resources/webhooks',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'No active Microsoft connection found',
      cause: 'The workflow owner has not connected Microsoft (Outlook), or the connection lacks the Mail.Read/Calendars.Read scopes.',
      fix: 'Connect Microsoft (Outlook) in Connections and re-register the subscription. Existing connections made before this trigger existed may need to be reconnected to grant the new scopes.',
    },
    {
      error: 'Ignored notification with invalid clientState',
      cause: 'The notification did not include the shared secret CtrlChecks generated when creating the Graph subscription.',
      fix: 'This should not happen under normal use; re-register the subscription if it persists.',
    },
  ],
  relatedNodes: ['outlook', 'ai_agent'],
};
