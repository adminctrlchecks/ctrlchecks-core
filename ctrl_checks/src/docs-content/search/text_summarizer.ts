import type { DocsSearchIndexItem } from '../search-index';

export const textSummarizerSearchIndex = [
  {
    type: 'node',
    title: 'Text Summarizer',
    slug: 'text_summarizer',
    category: 'AI',
    href: '/docs/nodes/text_summarizer',
    text: 'Text Summarizer Gemini AI Chat Model alias summary output is response not summary wordCount originalLength preserves incoming fields maxLength prompt hint _error',
  },
  {
    type: 'operation',
    title: 'Text Summarizer: Execute',
    slug: 'text_summarizer',
    category: 'AI',
    href: '/docs/nodes/text_summarizer',
    text: 'Execute builds Summarize the following text prompt optional maxLength in <= words delegates to ai_chat_model Gemini 3.5 Flash',
  },
  {
    type: 'field',
    title: 'Text Summarizer: Text',
    slug: 'text_summarizer',
    category: 'AI',
    href: '/docs/nodes/text_summarizer',
    text: 'Text inserted into generated summarization prompt blank text not locally rejected response contains summary',
  },
  {
    type: 'field',
    title: 'Text Summarizer: Max Length',
    slug: 'text_summarizer',
    category: 'AI',
    href: '/docs/nodes/text_summarizer',
    text: 'Max Length only changes generated prompt not hard truncation no wordCount output',
  },
] satisfies DocsSearchIndexItem[];
