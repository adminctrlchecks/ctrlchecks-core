import type { DocsSearchIndexItem } from '../search-index';

export const mergeDataSearchIndex = [
  {
    type: 'node',
    title: 'Merge Data',
    slug: 'merge_data',
    category: 'Data',
    href: '/docs/nodes/merge_data',
    text: 'Merge Data Combine data arriving from multiple workflow branches.'
  },
  {
    type: 'operation',
    title: 'Merge Data: Merge',
    slug: 'merge_data',
    category: 'Data',
    href: '/docs/nodes/merge_data#operation-default',
    text: 'Modes: overwrite append deep_merge.'
  },
  {
    type: 'field',
    title: 'Merge Data: Mode',
    slug: 'merge_data',
    category: 'Data',
    href: '/docs/nodes/merge_data#operation-default',
    text: 'mode Merge mode overwrite append or deep_merge'
  }
] satisfies DocsSearchIndexItem[];
