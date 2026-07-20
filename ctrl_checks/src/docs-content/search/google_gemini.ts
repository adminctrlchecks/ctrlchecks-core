import type { DocsSearchIndexItem } from '../search-index';

export const googleGeminiSearchIndex = [
  { type: 'node', title: 'Google Gemini', slug: 'google_gemini', category: 'AI', href: '/docs/nodes/google_gemini', text: 'Google Gemini response model usage finishReason Gemini credential wallet key pool prompt upstream text temperature memory ignored' },
  { type: 'operation', title: 'Google Gemini: Generate', slug: 'google_gemini', category: 'AI', href: '/docs/nodes/google_gemini#operation-default', text: 'Generate calls Gemini adapter prompt upstream text returns response model usage finishReason no input spread' },
  { type: 'field', title: 'Google Gemini: API Key', slug: 'google_gemini', category: 'AI', href: '/docs/nodes/google_gemini#operation-default', text: 'apiKey optional direct Gemini API key Connections credential vault wallet key pool worker key fallback' },
  { type: 'field', title: 'Google Gemini: Prompt', slug: 'google_gemini', category: 'AI', href: '/docs/nodes/google_gemini#operation-default', text: 'prompt system context upstream text user message response output no secrets' },
  { type: 'field', title: 'Google Gemini: Temperature and Memory', slug: 'google_gemini', category: 'AI', href: '/docs/nodes/google_gemini#operation-default', text: 'temperature memory visible legacy ignored current executor no conversation turns' },
] satisfies DocsSearchIndexItem[];
