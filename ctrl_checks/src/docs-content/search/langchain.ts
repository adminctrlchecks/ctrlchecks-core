import type { DocsSearchIndexItem } from '../search-index';

export const langchainSearchIndex = [
  { type: 'node', title: 'LangChain', slug: 'langchain', category: 'AI', href: '/docs/nodes/langchain', text: 'LangChain OpenAI Anthropic apiKey prompt tools memory ignored response steps error gpt-4o-mini claude-3-5-sonnet' },
  { type: 'operation', title: 'LangChain: Run Chain', slug: 'langchain', category: 'AI', href: '/docs/nodes/langchain#operation-run_chain', text: 'Run Chain provider OpenAI Anthropic prompt hardcoded model response steps empty error no input spread' },
  { type: 'operation', title: 'LangChain: Run Agent', slug: 'langchain', category: 'AI', href: '/docs/nodes/langchain#operation-run_agent', text: 'Run Agent OpenAI tools function calls steps Anthropic tools ignored response error' },
  { type: 'field', title: 'LangChain: API Key', slug: 'langchain', category: 'AI', href: '/docs/nodes/langchain#operation-run_chain', text: 'apiKey OpenAI Anthropic direct runtime Connections credential vault sk sk-ant' },
  { type: 'field', title: 'LangChain: Tools and Memory', slug: 'langchain', category: 'AI', href: '/docs/nodes/langchain#operation-run_agent', text: 'tools OpenAI run_agent only memory visible legacy ignored no conversation history' },
] satisfies DocsSearchIndexItem[];
