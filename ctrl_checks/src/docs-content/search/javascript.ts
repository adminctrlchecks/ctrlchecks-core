import type { DocsSearchIndexItem } from '../search-index';

export const javascriptSearchIndex = [
  {
    type: 'node',
    title: 'JavaScript',
    slug: 'javascript',
    category: 'Data',
    href: '/docs/nodes/javascript',
    text: 'JavaScript Execute sandboxed JavaScript to transform workflow data. Fields: code, timeout, outputSchema.'
  },
  {
    type: 'operation',
    title: 'JavaScript: Execute',
    slug: 'javascript',
    category: 'Data',
    href: '/docs/nodes/javascript#operation-default',
    text: 'Run code and return the script result directly.'
  },
  {
    type: 'field',
    title: 'JavaScript: Code',
    slug: 'javascript',
    category: 'Data',
    href: '/docs/nodes/javascript#operation-default',
    text: 'code JavaScript code to execute'
  },
  {
    type: 'field',
    title: 'JavaScript: Timeout',
    slug: 'javascript',
    category: 'Data',
    href: '/docs/nodes/javascript#operation-default',
    text: 'timeout Execution timeout in milliseconds capped at 30000'
  },
  {
    type: 'field',
    title: 'JavaScript: Output Schema',
    slug: 'javascript',
    category: 'Data',
    href: '/docs/nodes/javascript#operation-default',
    text: 'outputSchema Optional JSON schema string used as an output shape hint'
  }
] satisfies DocsSearchIndexItem[];
