import type { DocsSearchIndexItem } from '../search-index';

export const timeoutSearchIndex = [
  {
    type: 'node',
    title: 'Timeout',
    slug: 'timeout',
    category: 'Flow',
    href: '/docs/nodes/timeout',
    text: 'Timeout routes success or timeout by comparing elapsed workflow time with Limit.'
  },
  {
    type: 'operation',
    title: 'Timeout: Configure',
    slug: 'timeout',
    category: 'Flow',
    href: '/docs/nodes/timeout#operation-configure',
    text: 'Configure Timeout limit; output elapsedMs limitMs timedOut originalInput __routing branch success timeout.'
  },
  {
    type: 'field',
    title: 'Timeout: Limit',
    slug: 'timeout',
    category: 'Flow',
    href: '/docs/nodes/timeout#operation-configure',
    text: 'Limit positive milliseconds; invalid values return INVALID_CONFIG Invalid timeout limit.'
  }
] satisfies DocsSearchIndexItem[];
