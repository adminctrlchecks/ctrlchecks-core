import type { DocsSearchIndexItem } from '../search-index';

export const facebookTriggerSearchIndex = [
  {
    type: 'node',
    title: 'Facebook Page/Messenger Trigger',
    slug: 'facebook_trigger',
    category: 'Triggers',
    href: '/docs/nodes/facebook_trigger',
    text: 'Facebook Page Messenger Trigger starts workflows from Meta webhooks for Messenger messages, Page comments, mentions, postbacks, lead ads, and feed changes. Connect Facebook OAuth2 in Connections and configure Meta Webhooks.',
  },
  {
    type: 'operation',
    title: 'Facebook Trigger: Receive Facebook event',
    slug: 'facebook_trigger',
    category: 'Triggers',
    href: '/docs/nodes/facebook_trigger#operation-receive',
    text: 'Receive Facebook event verifies callback token, optionally validates X-Hub-Signature-256, filters eventTypes pageId allowedSenderIds, normalizes message comment mention postback leadgen feed events, and starts workflow executions.',
  },
  {
    type: 'field',
    title: 'Facebook Trigger fields',
    slug: 'facebook_trigger',
    category: 'Triggers',
    href: '/docs/nodes/facebook_trigger#operation-receive',
    text: 'Fields include connectionId, eventTypes message comment mention postback leadgen feed, pageId, allowedSenderIds, verifyToken, and validateSignature for Meta webhook setup.',
  },
  {
    type: 'field',
    title: 'Facebook Trigger outputs',
    slug: 'facebook_trigger',
    category: 'Triggers',
    href: '/docs/nodes/facebook_trigger#operation-receive',
    text: 'Outputs eventId eventType source userId username text timestamp chatId senderId recipientId pageId messageId messageType commentId postId parentId leadgenId formId postbackPayload field verb item raw trigger workflow_id node_id sessionId _facebook.',
  },
  {
    type: 'field',
    title: 'Facebook Trigger connection setup',
    slug: 'facebook_trigger',
    category: 'Triggers',
    href: '/docs/nodes/facebook_trigger#connection-setup',
    text: 'Connect Facebook OAuth2 in Connections with Page permissions pages_show_list pages_read_engagement pages_manage_metadata pages_messaging pages_manage_engagement pages_manage_posts leads_retrieval. Test /me/accounts and configure Meta for Developers Webhooks with verify token and app secret signature validation.',
  },
] satisfies DocsSearchIndexItem[];
