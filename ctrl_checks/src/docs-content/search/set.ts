import type { DocsSearchIndexItem } from '../search-index';

export const setSearchIndex = [
  {
    type: 'node',
    title: 'Set',
    slug: 'set',
    category: 'Data',
    href: '/docs/nodes/set',
    text: 'Set Set or override fields on the current workflow item.'
  },
  {
    type: 'operation',
    title: 'Set: Set Fields',
    slug: 'set',
    category: 'Data',
    href: '/docs/nodes/set#operation-default',
    text: 'Merge configured fields onto current item.'
  },
  {
    type: 'field',
    title: 'Set: Fields',
    slug: 'set',
    category: 'Data',
    href: '/docs/nodes/set#operation-default',
    text: 'fields JSON object of fields to set'
  }
] satisfies DocsSearchIndexItem[];
