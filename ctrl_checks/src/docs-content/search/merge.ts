import type { DocsSearchIndexItem } from '../search-index';

export const mergeSearchIndex = [
  {
    type: 'node',
    title: 'Merge',
    slug: 'merge',
    category: 'Logic',
    href: '/docs/nodes/merge',
    text: 'Merge combine multiple incoming branches into one output'
  },
  {
    type: 'operation',
    title: 'Merge: Configure',
    slug: 'merge',
    category: 'Logic',
    href: '/docs/nodes/merge#operation-configure',
    text: 'Merge Configure overwrite append deep_merge branch outputs'
  },
  {
    type: 'field',
    title: 'Merge: Mode',
    slug: 'merge',
    category: 'Logic',
    href: '/docs/nodes/merge#operation-configure',
    text: 'Merge Mode mode overwrite append deep_merge'
  }
] satisfies DocsSearchIndexItem[];
