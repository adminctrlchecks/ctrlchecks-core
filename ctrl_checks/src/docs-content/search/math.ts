import type { DocsSearchIndexItem } from '../search-index';

export const mathSearchIndex = [
  {
    type: 'node',
    title: 'Math',
    slug: 'math',
    category: 'Data',
    href: '/docs/nodes/math',
    text: 'Math Run numeric operations using operation, value1, value2, and precision.'
  },
  {
    type: 'operation',
    title: 'Math: Calculate',
    slug: 'math',
    category: 'Data',
    href: '/docs/nodes/math#operation-default',
    text: 'Operations: add subtract multiply divide modulo power sqrt abs round floor ceil min max avg sum.'
  },
  {
    type: 'field',
    title: 'Math: Operation',
    slug: 'math',
    category: 'Data',
    href: '/docs/nodes/math#operation-default',
    text: 'operation Math operation to perform'
  },
  {
    type: 'field',
    title: 'Math: Value 1',
    slug: 'math',
    category: 'Data',
    href: '/docs/nodes/math#operation-default',
    text: 'value1 First number expression field path or numeric list'
  },
  {
    type: 'field',
    title: 'Math: Value 2',
    slug: 'math',
    category: 'Data',
    href: '/docs/nodes/math#operation-default',
    text: 'value2 Second number for binary operations'
  },
  {
    type: 'field',
    title: 'Math: Precision',
    slug: 'math',
    category: 'Data',
    href: '/docs/nodes/math#operation-default',
    text: 'precision Decimal places applied to result'
  }
] satisfies DocsSearchIndexItem[];
