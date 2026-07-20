import type { DocsSearchIndexItem } from '../search-index';

export const chatModelSearchIndex = [
  { type: 'node', title: 'Chat Model', slug: 'chat_model', category: 'AI', href: '/docs/nodes/chat_model', text: 'Chat Model internal support config node returns provider gemini model gemini-3.5-flash temperature _chat_model_config no AI response' },
  { type: 'operation', title: 'Chat Model: Return Config', slug: 'chat_model', category: 'AI', href: '/docs/nodes/chat_model#operation-default', text: 'Return Config ignores provider apiKey model prompt reads temperature returns static Gemini config' },
  { type: 'field', title: 'Chat Model: Provider', slug: 'chat_model', category: 'AI', href: '/docs/nodes/chat_model#operation-default', text: 'provider gemini only ignored runtime output always gemini' },
  { type: 'field', title: 'Chat Model: Prompt', slug: 'chat_model', category: 'AI', href: '/docs/nodes/chat_model#operation-default', text: 'prompt UI field ignored no provider call no generated response' },
  { type: 'field', title: 'Chat Model: Temperature', slug: 'chat_model', category: 'AI', href: '/docs/nodes/chat_model#operation-default', text: 'temperature only runtime-used field returned in config object' },
] satisfies DocsSearchIndexItem[];
