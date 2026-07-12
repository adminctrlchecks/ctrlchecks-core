import type { DocsSearchIndexItem } from '../search-index';

export const noopSearchIndex = [
  {
    type: 'node',
    title: 'NoOp',
    slug: 'noop',
    category: 'Logic',
    href: '/docs/nodes/noop',
    text: 'NoOp pass data through unchanged'
  },
  {
    type: 'operation',
    title: 'NoOp: Configure',
    slug: 'noop',
    category: 'Logic',
    href: '/docs/nodes/noop#operation-configure',
    text: 'NoOp Configure passthrough no fields'
  }
] satisfies DocsSearchIndexItem[];
