import type { DocsSearchIndexItem } from '../search-index';

export const openaiGptSearchIndex = [
  {
    type: 'node',
    title: 'OpenAI GPT',
    slug: 'openai_gpt',
    category: 'AI',
    href: '/docs/nodes/openai_gpt',
    text: 'OpenAI GPT legacy LLM adapter OpenAI API Key credential resolver Connections credential vault response model usage finishReason no incoming field passthrough temperature ignored memory ignored messages fallback prompt system context',
  },
  {
    type: 'operation',
    title: 'OpenAI GPT: Execute',
    slug: 'openai_gpt',
    category: 'AI',
    href: '/docs/nodes/openai_gpt',
    text: 'Execute sends prompt or joined messages to OpenAI. Static prompt can become system context when upstream text exists. Output keys are response model usage finishReason and credential error success false error.',
  },
  {
    type: 'field',
    title: 'OpenAI GPT: Prompt',
    slug: 'openai_gpt',
    category: 'AI',
    href: '/docs/nodes/openai_gpt',
    text: 'Prompt System Context prompt messages fallback upstream text user message {{$json.response}}',
  },
  {
    type: 'field',
    title: 'OpenAI GPT: Temperature and Memory',
    slug: 'openai_gpt',
    category: 'AI',
    href: '/docs/nodes/openai_gpt',
    text: 'Temperature ignored Memory ignored current openai_gpt executor does not pass temperature or read memory',
  },
] satisfies DocsSearchIndexItem[];
