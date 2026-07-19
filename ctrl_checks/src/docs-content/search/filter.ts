import type { DocsSearchIndexItem } from '../search-index';

export const filterSearchIndex = [
  {
    type: 'node',
    title: 'Filter',
    slug: 'filter',
    category: 'Logic',
    href: '/docs/nodes/filter',
    text: 'Filter keep only matching records from an array list no credentials active customers paid orders urgent tickets',
  },
  {
    type: 'operation',
    title: 'Filter: Configure',
    slug: 'filter',
    category: 'Logic',
    href: '/docs/nodes/filter#operation-default',
    text: 'Filter Configure array condition replace items with filtered array preserve incoming business fields',
  },
  {
    type: 'field',
    title: 'Filter: Array',
    slug: 'filter',
    category: 'Logic',
    href: '/docs/nodes/filter#operation-default',
    text: 'Filter Array Expression optional list to filter {{$json.items}} {{$json.contacts}} {{$json.orders}} {{$json.rows}}',
  },
  {
    type: 'field',
    title: 'Filter: Condition',
    slug: 'filter',
    category: 'Logic',
    href: '/docs/nodes/filter#operation-default',
    text: 'Filter Condition item.status active item.total threshold item.email includes JavaScript true false',
  },
  {
    type: 'connection',
    title: 'Filter: Connection Guidance',
    slug: 'filter',
    category: 'Logic',
    href: '/docs/nodes/filter#operation-default',
    text: 'Filter no third-party account connect output downstream service node account connection Gmail Slack Notion Google Sheets',
  },
] satisfies DocsSearchIndexItem[];
