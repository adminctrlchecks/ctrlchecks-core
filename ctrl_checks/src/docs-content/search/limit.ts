import type { DocsSearchIndexItem } from '../search-index';

export const limitSearchIndex = [
  {
    type: 'node',
    title: 'Limit',
    slug: 'limit',
    category: 'Data',
    href: '/docs/nodes/limit',
    text: 'Limit Keep only the first N items from an array. Fields: limit and optional array.'
  },
  {
    type: 'operation',
    title: 'Limit: Limit Items',
    slug: 'limit',
    category: 'Data',
    href: '/docs/nodes/limit#operation-default',
    text: 'Truncate array, input.items, or input.array to the configured limit.'
  },
  {
    type: 'field',
    title: 'Limit: Limit',
    slug: 'limit',
    category: 'Data',
    href: '/docs/nodes/limit#operation-default',
    text: 'limit Maximum number of items to return'
  },
  {
    type: 'field',
    title: 'Limit: Array',
    slug: 'limit',
    category: 'Data',
    href: '/docs/nodes/limit#operation-default',
    text: 'array Optional array or template expression to limit'
  }
] satisfies DocsSearchIndexItem[];
