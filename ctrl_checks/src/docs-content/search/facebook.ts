import type { DocsSearchIndexItem } from '../search-index';

export const facebookSearchIndex: DocsSearchIndexItem[] = [
  { type: 'node', title: 'Facebook', slug: 'facebook', category: 'Social', href: '/docs/nodes/facebook', text: 'Facebook OAuth2 Meta Graph API Connections page list page_message sendTextMessage comment createComment scaffolded not yet implemented' },
  { type: 'operation', title: 'Facebook: List Managed Pages', slug: 'facebook', category: 'Social', href: '/docs/nodes/facebook#operation-page.list', text: 'resource page operation list calls me accounts output pages count summary pageId' },
  { type: 'operation', title: 'Facebook: Send Messenger Text', slug: 'facebook', category: 'Social', href: '/docs/nodes/facebook#operation-page_message.sendTextMessage', text: 'resource page_message operation sendTextMessage requires pageId recipientId text message output messageId raw' },
  { type: 'operation', title: 'Facebook: Create Comment Reply', slug: 'facebook', category: 'Social', href: '/docs/nodes/facebook#operation-comment.createComment', text: 'resource comment operation createComment requires commentId or postId replyText message output commentId raw' },
  { type: 'operation', title: 'Facebook: Scaffolded Operations', slug: 'facebook', category: 'Social', href: '/docs/nodes/facebook#operation-scaffolded', text: 'post photo video event lead leadgen album createPost getInsights upload not yet implemented _error' },
];
