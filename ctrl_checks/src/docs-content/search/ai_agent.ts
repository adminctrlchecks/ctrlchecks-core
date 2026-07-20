import type { DocsSearchIndexItem } from '../search-index';

export const aiAgentSearchIndex = [
  { type: 'node', title: 'AI Agent', slug: 'ai_agent', category: 'AI', href: '/docs/nodes/ai_agent', text: 'AI Agent prompt-driven LLM agent userInput systemPrompt outputFormat response_text response_json reasoning provider model runtime' },
  { type: 'operation', title: 'AI Agent: Run Agent', slug: 'ai_agent', category: 'AI', href: '/docs/nodes/ai_agent#operation-default', text: 'Run Agent extracts message text, applies system prompt, calls detected provider, and returns response_text response_json confidence_score used_tools memory_written error_flag reasoning' },
  { type: 'field', title: 'AI Agent: User Input', slug: 'ai_agent', category: 'AI', href: '/docs/nodes/ai_agent#operation-default', text: 'userInput optional direct message runtime also accepts upstream message text input content query prompt' },
  { type: 'field', title: 'AI Agent: Model', slug: 'ai_agent', category: 'AI', href: '/docs/nodes/ai_agent#operation-default', text: 'model gemini-3.5-flash gemini-3.1-pro-preview claude-3-5-sonnet gpt-4o provider detected from model name' },
  { type: 'field', title: 'AI Agent: System Prompt', slug: 'ai_agent', category: 'AI', href: '/docs/nodes/ai_agent#operation-default', text: 'systemPrompt instructions role behavior output rules prompt guardrails' },
  { type: 'field', title: 'AI Agent: Output Format', slug: 'ai_agent', category: 'AI', href: '/docs/nodes/ai_agent#operation-default', text: 'outputFormat text json keyvalue markdown response_json response_markdown parse behavior' },
] satisfies DocsSearchIndexItem[];
