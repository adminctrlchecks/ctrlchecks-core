import type { DocsSearchIndexItem } from '../search-index';

export const functionSearchIndex = [
  {
    type: 'node',
    title: 'Function',
    slug: 'function',
    category: 'Logic',
    href: '/docs/nodes/function',
    text: 'Function Run custom JavaScript once against the incoming object and return the exact script value. Logic custom code result input data $json json timeout',
  },
  {
    type: 'operation',
    title: 'Function: Run Function',
    slug: 'function',
    category: 'Logic',
    href: '/docs/nodes/function#operation-default',
    text: 'Function JavaScript Function Run Function Execute code once with input data $json and json. Return a value assign result or pass original input through.',
  },
  {
    type: 'field',
    title: 'Function: Function Code',
    slug: 'function',
    category: 'Logic',
    href: '/docs/nodes/function#operation-default',
    text: 'Function Function Code code Required JavaScript body executed once. Returns exact value or assigned result.',
  },
  {
    type: 'field',
    title: 'Function: Timeout',
    slug: 'function',
    category: 'Logic',
    href: '/docs/nodes/function#operation-default',
    text: 'Function Timeout timeout Maximum execution time in milliseconds capped at 30000.',
  },
] satisfies DocsSearchIndexItem[];
