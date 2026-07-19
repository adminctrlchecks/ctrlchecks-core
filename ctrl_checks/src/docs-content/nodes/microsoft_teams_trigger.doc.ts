import type { NodeDoc } from '../types';

export const microsoftTeamsTriggerDoc: NodeDoc = {
  slug: 'microsoft_teams_trigger',
  displayName: 'Microsoft Teams Trigger',
  category: 'Triggers',
  logoUrl: '/integrations-logos/Microsoft-Teams.svg',
  description: 'Start workflows from Microsoft Teams Bot Framework activities such as channel messages, personal messages, conversation updates, and invoke actions.',
  credentialType: 'Microsoft Teams Bot',
  credentialSetupSteps: [
    'Create or open an Azure Bot / Teams app in Microsoft Developer Portal or Azure Bot Channels Registration.',
    'Copy the Microsoft App ID and save it on the Microsoft Teams Bot connection.',
    'Create a client secret/app password if workflows should reply through Bot Framework, then save it on the connection.',
    'Use the generated CtrlChecks webhook URL as the bot messaging endpoint.',
    'Install the Teams app into the target team, channel, group chat, or personal scope.',
  ],
  credentialDocsUrl: 'https://learn.microsoft.com/microsoftteams/platform/bots/how-to/create-a-bot-for-teams',
  resources: [
    {
      name: 'Webhook',
      description: 'Receives Microsoft Teams Bot Framework activities and emits a normalized event payload.',
      operations: [
        {
          name: 'Receive activity',
          value: 'receive',
          description: 'Starts the workflow when an accepted Teams activity arrives.',
          fields: [
            {
              name: 'Event Types',
              internalKey: 'eventTypes',
              type: 'string',
              required: false,
              description: 'Comma-separated Teams activity types to accept.',
              helpText: 'Use message, conversation_update, message_reaction, and invoke.',
              placeholder: 'message, conversation_update, invoke',
              example: 'message',
            },
            {
              name: 'Allowed Channel IDs',
              internalKey: 'channelIds',
              type: 'string',
              required: false,
              description: 'Optional Teams channel allowlist.',
              helpText: 'Leave empty for personal chats or broad testing.',
              placeholder: '19:channel-id@thread.tacv2',
              example: '19:channel-id@thread.tacv2',
            },
            {
              name: 'Validate Bot Framework Auth',
              internalKey: 'validateJwt',
              type: 'boolean',
              required: false,
              description: 'Validates Bot Framework bearer JWTs or a configured shared secret.',
              helpText: 'Keep this enabled in production.',
              example: true,
            },
          ],
          outputExample: {
            eventId: 'activity-1',
            eventType: 'message',
            source: 'microsoft_teams',
            userId: 'user-1',
            text: 'Can you help?',
            tenantId: 'tenant-1',
            teamId: 'team-1',
            channelId: 'channel-1',
            conversationId: 'conversation-1',
            serviceUrl: 'https://smba.trafficmanager.net/amer/',
            replyToId: 'activity-1',
            raw: {},
          },
          outputDescription: 'Outputs normalized top-level fields: eventId, eventType, source, userId, username, text, timestamp, tenantId, teamId, channelId, chatId, conversationId, serviceUrl, activityId, replyToId, locale, channelData, and raw.',
          usageExample: {
            scenario: 'AI reply to a Teams bot message',
            inputValues: {
              EventTypes: 'message',
            },
            expectedOutput: 'Use {{$json.serviceUrl}}, {{$json.conversationId}}, and {{$json.replyToId}} in Microsoft Teams action to reply to the same conversation.',
          },
          externalDocsUrl: 'https://learn.microsoft.com/microsoftteams/platform/bots/what-are-bots',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Invalid Microsoft Teams/Bot Framework request',
      cause: 'The Bot Framework bearer token is invalid, the Microsoft App ID is missing, or the shared validation secret does not match.',
      fix: 'Save the Microsoft App ID on the Teams Bot connection and keep validation enabled. Use the optional validation secret only for simulations.',
    },
    {
      error: 'Teams bot reply failed',
      cause: 'The bot app password/client secret is missing or the bot cannot post to the conversation.',
      fix: 'Save the app password on the Teams Bot connection and ensure the bot is installed in the target Teams scope.',
    },
  ],
  relatedNodes: ['microsoft_teams', 'ai_agent'],
};
