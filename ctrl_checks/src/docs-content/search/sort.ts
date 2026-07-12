import type { DocsSearchIndexItem } from '../search-index';

export const sortSearchIndex = [
  {
    type: 'node',
    title: 'Sort',
    slug: 'sort',
    category: 'Data',
    href: '/docs/nodes/sort',
    text: 'Sort Sort the input items array.'
  },
  {
    type: 'operation',
    title: 'Sort: Sort Items',
    slug: 'sort',
    category: 'Data',
    href: '/docs/nodes/sort#operation-default',
    text: 'Sort input.items by field direction and type.'
  },
  {
    type: 'field',
    title: 'Sort: Field',
    slug: 'sort',
    category: 'Data',
    href: '/docs/nodes/sort#operation-default',
    text: 'field Field to sort by'
  },
  {
    type: 'field',
    title: 'Sort: Direction',
    slug: 'sort',
    category: 'Data',
    href: '/docs/nodes/sort#operation-default',
    text: 'direction Sort direction asc or desc'
  },
  {
    type: 'field',
    title: 'Sort: Type',
    slug: 'sort',
    category: 'Data',
    href: '/docs/nodes/sort#operation-default',
    text: 'type Comparison type auto number string or date'
  }
] satisfies DocsSearchIndexItem[];
