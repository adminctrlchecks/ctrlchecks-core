import type { DocsSearchIndexItem } from '../search-index';

export const anthropicClaudeSearchIndex = [
  { type: 'node', title: 'Anthropic Claude', slug: 'anthropic_claude', category: 'AI', href: '/docs/nodes/anthropic_claude', text: 'Anthropic Claude LLM adapter prompt messages apiKey vault response model usage finishReason no input spread' },
  { type: 'operation', title: 'Anthropic Claude: Complete', slug: 'anthropic_claude', category: 'AI', href: '/docs/nodes/anthropic_claude#operation-default', text: 'Complete sends prompt or joined messages to Claude returns response model usage finishReason' },
  { type: 'field', title: 'Anthropic Claude: API Key', slug: 'anthropic_claude', category: 'AI', href: '/docs/nodes/anthropic_claude#operation-default', text: 'apiKey direct fallback saved anthropic credential vault sk-ant' },
  { type: 'field', title: 'Anthropic Claude: Messages', slug: 'anthropic_claude', category: 'AI', href: '/docs/nodes/anthropic_claude#operation-default', text: 'messages backend fallback array used when prompt blank' },
  { type: 'field', title: 'Anthropic Claude: Temperature', slug: 'anthropic_claude', category: 'AI', href: '/docs/nodes/anthropic_claude#operation-default', text: 'temperature visible UI field currently not passed to Claude adapter' },
] satisfies DocsSearchIndexItem[];
