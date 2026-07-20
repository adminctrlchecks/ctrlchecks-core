import type { DocsSearchIndexItem } from '../search-index';

export const mistralSearchIndex = [
  { type: 'node', title: 'Mistral AI', slug: 'mistral', category: 'AI', href: '/docs/nodes/mistral', text: 'Mistral AI chat completions apiKey model prompt systemPrompt temperature maxTokens response inputTokens outputTokens success error' },
  { type: 'operation', title: 'Mistral: Chat Completion', slug: 'mistral', category: 'AI', href: '/docs/nodes/mistral#operation-default', text: 'Chat Completion calls api.mistral.ai v1 chat completions preserves input fields success model response token counts error' },
  { type: 'field', title: 'Mistral: API Key', slug: 'mistral', category: 'AI', href: '/docs/nodes/mistral#operation-default', text: 'apiKey Mistral API Key Connections credential vault La Plateforme console Bearer token' },
  { type: 'field', title: 'Mistral: Model', slug: 'mistral', category: 'AI', href: '/docs/nodes/mistral#operation-default', text: 'model mistral-small-latest mistral-medium-latest mistral-large-latest codestral-latest' },
  { type: 'field', title: 'Mistral: Prompt and System Prompt', slug: 'mistral', category: 'AI', href: '/docs/nodes/mistral#operation-default', text: 'prompt required user message systemPrompt optional system instruction response outputTokens inputTokens' },
] satisfies DocsSearchIndexItem[];
