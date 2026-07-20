import type { DocsSearchIndexItem } from '../search-index';

export const ollamaSearchIndex = [
  {
    type: 'node',
    title: 'AI Chat (Gemini)',
    slug: 'ollama',
    category: 'AI',
    href: '/docs/nodes/ollama',
    text: 'AI Chat Gemini legacy Ollama slug not local Ollama delegates to ai_chat_model Gemini 3.5 Flash response model _error preserves incoming fields',
  },
  {
    type: 'operation',
    title: 'AI Chat (Gemini): Execute',
    slug: 'ollama',
    category: 'AI',
    href: '/docs/nodes/ollama',
    text: 'Execute rewrites ollama to ai_chat_model provider gemini model gemini-3.5-flash prompt temperature response model _error wallet code',
  },
  {
    type: 'field',
    title: 'AI Chat (Gemini): Prompt',
    slug: 'ollama',
    category: 'AI',
    href: '/docs/nodes/ollama',
    text: 'Prompt sent to delegated AI Chat Model Gemini not local server blank prompt can return AI Chat Model node prompt is required',
  },
  {
    type: 'field',
    title: 'AI Chat (Gemini): Temperature',
    slug: 'ollama',
    category: 'AI',
    href: '/docs/nodes/ollama',
    text: 'Temperature passed through to Gemini-backed AI Chat Model',
  },
] satisfies DocsSearchIndexItem[];
