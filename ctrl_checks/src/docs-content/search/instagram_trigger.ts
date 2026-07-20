import type { DocsSearchIndexItem } from '../search-index';

export const instagramTriggerSearchIndex = [
  {
    type: 'node',
    title: 'Instagram Trigger',
    slug: 'instagram_trigger',
    category: 'Triggers',
    href: '/docs/nodes/instagram_trigger',
    text: 'Instagram Trigger starts workflows from Meta webhooks for Instagram DMs, comments, mentions, story replies, and postbacks. Connect Instagram OAuth2 in Connections and configure Meta Webhooks.',
  },
  {
    type: 'operation',
    title: 'Instagram Trigger: Receive Instagram event',
    slug: 'instagram_trigger',
    category: 'Triggers',
    href: '/docs/nodes/instagram_trigger#operation-receive',
    text: 'Receive Instagram event verifies callback token, optionally validates X-Hub-Signature-256, filters eventTypes instagramBusinessAccountId allowedSenderIds, normalizes message comment mention message.story_reply postback events, and starts workflow executions.',
  },
  {
    type: 'field',
    title: 'Instagram Trigger fields',
    slug: 'instagram_trigger',
    category: 'Triggers',
    href: '/docs/nodes/instagram_trigger#operation-receive',
    text: 'Fields include connectionId, eventTypes message comment mention message.story_reply postback, instagramBusinessAccountId, allowedSenderIds, verifyToken, and validateSignature for Meta webhook setup.',
  },
  {
    type: 'field',
    title: 'Instagram Trigger outputs',
    slug: 'instagram_trigger',
    category: 'Triggers',
    href: '/docs/nodes/instagram_trigger#operation-receive',
    text: 'Outputs eventId eventType source userId username text timestamp chatId senderId recipientId instagramBusinessAccountId pageId messageId messageType commentId mediaId mentionId postbackPayload isStoryReply raw trigger workflow_id node_id sessionId _instagram.',
  },
  {
    type: 'field',
    title: 'Instagram Trigger connection setup',
    slug: 'instagram_trigger',
    category: 'Triggers',
    href: '/docs/nodes/instagram_trigger#connection-setup',
    text: 'Connect Instagram OAuth2 in Connections with permissions instagram_basic instagram_content_publish instagram_manage_messages instagram_manage_comments pages_show_list pages_read_engagement pages_manage_metadata business_management. Test /me/accounts and configure Meta for Developers Webhooks with verify token and app secret signature validation.',
  },
] satisfies DocsSearchIndexItem[];
