import type { DocsSearchIndexItem } from '../search-index';

export const ifElseSearchIndex = [
  {
    type: 'node',
    title: 'If/Else',
    slug: 'if_else',
    category: 'Logic',
    href: '/docs/nodes/if_else',
    text: 'If/Else route execution to true or false by evaluating conditions'
  },
  {
    type: 'operation',
    title: 'If/Else: Configure',
    slug: 'if_else',
    category: 'Logic',
    href: '/docs/nodes/if_else#operation-configure',
    text: 'If/Else Configure evaluate conditions against incoming data'
  },
  {
    type: 'field',
    title: 'If/Else: Conditions',
    slug: 'if_else',
    category: 'Logic',
    href: '/docs/nodes/if_else#operation-configure',
    text: 'If/Else Conditions conditions field operator value'
  },
  {
    type: 'field',
    title: 'If/Else: Combine Operation',
    slug: 'if_else',
    category: 'Logic',
    href: '/docs/nodes/if_else#operation-configure',
    text: 'If/Else Combine Operation combineOperation AND OR'
  }
] satisfies DocsSearchIndexItem[];
