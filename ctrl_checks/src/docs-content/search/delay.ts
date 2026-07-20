import type { DocsSearchIndexItem } from '../search-index';

export const delaySearchIndex = [
  { type: 'node', title: 'Delay', slug: 'delay', category: 'Utility', href: '/docs/nodes/delay', text: 'Delay pause workflow milliseconds success waitedMs originalInput ten-minute cap' },
  { type: 'operation', title: 'Delay: Pause', slug: 'delay', category: 'Utility', href: '/docs/nodes/delay#operation-default', text: 'Pause for duration milliseconds returns success waitedMs originalInput' },
  { type: 'field', title: 'Delay: Duration', slug: 'delay', category: 'Utility', href: '/docs/nodes/delay#operation-default', text: 'duration milliseconds pause wait 1000 one second 30000 thirty seconds capped' },
] satisfies DocsSearchIndexItem[];
