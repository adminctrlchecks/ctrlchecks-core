import type { DocsSearchIndexItem } from '../search-index';

export const htmlSearchIndex = [
  { type: 'node', title: 'HTML', slug: 'html', category: 'Data', href: '/docs/nodes/html', text: 'HTML parse extract toText title meta body selector text' },
  { type: 'operation', title: 'HTML: Parse', slug: 'html', category: 'Data', href: '/docs/nodes/html#operation-parse', text: 'Parse HTML title meta body' },
  { type: 'field', title: 'HTML: HTML', slug: 'html', category: 'Data', href: '/docs/nodes/html#operation-parse', text: 'HTML content document fragment pageContent' },
  { type: 'operation', title: 'HTML: Extract', slug: 'html', category: 'Data', href: '/docs/nodes/html#operation-extract', text: 'Extract text from CSS selector matches' },
  { type: 'field', title: 'HTML: Selector', slug: 'html', category: 'Data', href: '/docs/nodes/html#operation-extract', text: 'CSS selector required for extract price h1 href' },
  { type: 'operation', title: 'HTML: To Text', slug: 'html', category: 'Data', href: '/docs/nodes/html#operation-toText', text: 'Convert HTML body to plain text' },
] satisfies DocsSearchIndexItem[];
