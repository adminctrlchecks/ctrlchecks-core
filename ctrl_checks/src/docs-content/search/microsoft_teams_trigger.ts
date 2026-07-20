import type { DocsSearchIndexItem } from '../search-index';

export const microsoftTeamsTriggerSearchIndex = [
  {
    type: 'node',
    title: 'Microsoft Teams Trigger',
    slug: 'microsoft_teams_trigger',
    category: 'Triggers',
    href: '/docs/nodes/microsoft_teams_trigger',
    text: 'Microsoft Teams Trigger starts workflows from Teams Bot Framework activities: channel messages, personal messages, conversation updates, message reactions, and invoke actions. Connect a Microsoft Teams Bot in Connections and set the bot messaging endpoint.',
  },
  {
    type: 'operation',
    title: 'Microsoft Teams Trigger: Receive activity',
    slug: 'microsoft_teams_trigger',
    category: 'Triggers',
    href: '/docs/nodes/microsoft_teams_trigger#operation-receive',
    text: 'Receive activity validates the Bot Framework JWT or shared Validation Secret, filters eventTypes teamIds channelIds allowedUserIds tenantId, normalizes message/conversation_update/message_reaction/invoke activities, and starts workflow executions.',
  },
  {
    type: 'field',
    title: 'Microsoft Teams Trigger fields',
    slug: 'microsoft_teams_trigger',
    category: 'Triggers',
    href: '/docs/nodes/microsoft_teams_trigger#operation-receive',
    text: 'Fields include connectionId, eventTypes message conversation_update message_reaction invoke, teamIds, channelIds, allowedUserIds, tenantId, appId, validationSecret, and validateJwt.',
  },
  {
    type: 'field',
    title: 'Microsoft Teams Trigger outputs',
    slug: 'microsoft_teams_trigger',
    category: 'Triggers',
    href: '/docs/nodes/microsoft_teams_trigger#operation-receive',
    text: 'Outputs eventId eventType source userId username text timestamp tenantId teamId channelId chatId conversationId serviceUrl activityId replyToId locale channelData raw trigger workflow_id node_id sessionId _microsoftTeams.',
  },
  {
    type: 'field',
    title: 'Microsoft Teams Trigger connection setup',
    slug: 'microsoft_teams_trigger',
    category: 'Triggers',
    href: '/docs/nodes/microsoft_teams_trigger#connection-setup',
    text: 'Connect a Microsoft Teams Bot (Microsoft App ID + App Password) in Connections, set the generated CtrlChecks webhook URL as the Azure Bot messaging endpoint, and install the bot into the target team, channel, or personal scope.',
  },
] satisfies DocsSearchIndexItem[];
