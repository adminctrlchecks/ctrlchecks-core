import type { DocsSearchIndexItem } from '../search-index';

export const sentimentAnalyzerSearchIndex = [
  {
    type: 'node',
    title: 'Sentiment Analyzer',
    slug: 'sentiment_analyzer',
    category: 'AI',
    href: '/docs/nodes/sentiment_analyzer',
    text: 'Sentiment Analyzer Gemini AI Chat Model alias response.sentiment response.score response.summary no top-level sentiment confidence label invalid JSON raw text fallback _error',
  },
  {
    type: 'operation',
    title: 'Sentiment Analyzer: Execute',
    slug: 'sentiment_analyzer',
    category: 'AI',
    href: '/docs/nodes/sentiment_analyzer',
    text: 'Execute builds sentiment JSON prompt delegates to ai_chat_model Gemini 3.5 Flash responseFormat json parsed response or raw text',
  },
  {
    type: 'field',
    title: 'Sentiment Analyzer: Text',
    slug: 'sentiment_analyzer',
    category: 'AI',
    href: '/docs/nodes/sentiment_analyzer',
    text: 'Text inserted into generated sentiment analysis prompt blank text not locally rejected route with {{$json.response.sentiment}}',
  },
  {
    type: 'field',
    title: 'Sentiment Analyzer: Temperature',
    slug: 'sentiment_analyzer',
    category: 'AI',
    href: '/docs/nodes/sentiment_analyzer',
    text: 'Temperature passed through to Gemini-backed AI Chat Model low values keep sentiment JSON stable',
  },
] satisfies DocsSearchIndexItem[];
