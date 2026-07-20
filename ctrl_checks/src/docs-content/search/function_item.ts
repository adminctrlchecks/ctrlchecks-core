import type { DocsSearchIndexItem } from '../search-index';

export const functionItemSearchIndex = [
  {
    type: 'node',
    title: 'Function Item',
    slug: 'function_item',
    category: 'Logic',
    href: '/docs/nodes/function_item',
    text: 'Function Item Run custom JavaScript for each element in input.items and replace items with mapped results. Logic item input data $json json no index',
  },
  {
    type: 'operation',
    title: 'Function Item: Map Items',
    slug: 'function_item',
    category: 'Logic',
    href: '/docs/nodes/function_item#operation-default',
    text: 'Function Item Per-item JavaScript Map Items maps input.items. Runtime exposes item input data $json json and does not expose index.',
  },
  {
    type: 'field',
    title: 'Function Item: Function Code',
    slug: 'function_item',
    category: 'Logic',
    href: '/docs/nodes/function_item#operation-default',
    text: 'Function Item Function Code code Required JavaScript body for each item. Use item for current row. No index variable.',
  },
  {
    type: 'field',
    title: 'Function Item: Timeout',
    slug: 'function_item',
    category: 'Logic',
    href: '/docs/nodes/function_item#operation-default',
    text: 'Function Item Timeout timeout Maximum batch sandbox execution time in milliseconds capped at 30000.',
  },
] satisfies DocsSearchIndexItem[];
