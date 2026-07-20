import type { DocsSearchIndexItem } from '../search-index';

export const aiChatModelSearchIndex = [
  { type: 'node', title: 'AI Chat Model', slug: 'ai_chat_model', category: 'AI', href: '/docs/nodes/ai_chat_model', text: 'AI Chat Model Gemini direct chat response model preserves incoming fields prompt systemPrompt responseFormat temperature' },
  { type: 'operation', title: 'AI Chat Model: Chat', slug: 'ai_chat_model', category: 'AI', href: '/docs/nodes/ai_chat_model#operation-default', text: 'Chat calls Gemini with prompt optional system prompt responseFormat text json output response model _error' },
  { type: 'field', title: 'AI Chat Model: Prompt', slug: 'ai_chat_model', category: 'AI', href: '/docs/nodes/ai_chat_model#operation-default', text: 'prompt required effective user message upstream text static prompt system context' },
  { type: 'field', title: 'AI Chat Model: Model', slug: 'ai_chat_model', category: 'AI', href: '/docs/nodes/ai_chat_model#operation-default', text: 'model dropdown currently ignored runtime hardcodes gemini-3.5-flash' },
  { type: 'field', title: 'AI Chat Model: Response Format', slug: 'ai_chat_model', category: 'AI', href: '/docs/nodes/ai_chat_model#operation-default', text: 'responseFormat text json best effort JSON parse raw text fallback' },
] satisfies DocsSearchIndexItem[];
