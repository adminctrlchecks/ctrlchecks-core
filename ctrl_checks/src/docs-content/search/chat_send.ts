import type { DocsSearchIndexItem } from '../search-index';

export const chatSendSearchIndex = [
  { type: 'node', title: 'Chat Send', slug: 'chat_send', category: 'AI', href: '/docs/nodes/chat_send', text: 'chat send reply message chat trigger session sessionId AI agent response_text deliver live conversation' },
  { type: 'operation', title: 'Chat Send: Send Chat Message', slug: 'chat_send', category: 'AI', href: '/docs/nodes/chat_send#operation-default', text: 'send chat message session id resolve deliver skip duplicate _chatSent' },
  { type: 'field', title: 'Chat Send: Message', slug: 'chat_send', category: 'AI', href: '/docs/nodes/chat_send#operation-default', text: 'message text reply response_text response output content upstream AI Agent' },
  { type: 'field', title: 'Chat Send: Session ID', slug: 'chat_send', category: 'AI', href: '/docs/nodes/chat_send#operation-default', text: 'sessionId session id chat trigger connected conversation target' },
] satisfies DocsSearchIndexItem[];
