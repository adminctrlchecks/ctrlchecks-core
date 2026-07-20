import type { DocsSearchIndexItem } from '../search-index';

export const cohereSearchIndex = [
  { type: 'node', title: 'Cohere', slug: 'cohere', category: 'AI', href: '/docs/nodes/cohere', text: 'Cohere Command chat models prompt preamble apiKey response finishReason inputTokens outputTokens error' },
  { type: 'operation', title: 'Cohere: Chat', slug: 'cohere', category: 'AI', href: '/docs/nodes/cohere#operation-default', text: 'Chat calls Cohere v1 chat with model message preamble temperature maxTokens returns success response model finishReason token counts error' },
  { type: 'field', title: 'Cohere: API Key', slug: 'cohere', category: 'AI', href: '/docs/nodes/cohere#operation-default', text: 'apiKey required direct runtime field Cohere API key Bearer token credential mapping' },
  { type: 'field', title: 'Cohere: Model', slug: 'cohere', category: 'AI', href: '/docs/nodes/cohere#operation-default', text: 'model command-r7b-12-2024 command-r-08-2024 command-r-plus-08-2024 command-nightly' },
  { type: 'field', title: 'Cohere: Preamble', slug: 'cohere', category: 'AI', href: '/docs/nodes/cohere#operation-default', text: 'preamble optional system persona instruction backend supported current panel may not expose' },
] satisfies DocsSearchIndexItem[];
