import type { DocsSearchIndexItem } from '../search-index';

export const renameKeysSearchIndex = [
  {
    type: 'node',
    title: 'Rename Keys',
    slug: 'rename_keys',
    category: 'Data',
    href: '/docs/nodes/rename_keys',
    text: 'Rename Keys Rename fields on the current workflow item.'
  },
  {
    type: 'operation',
    title: 'Rename Keys: Rename',
    slug: 'rename_keys',
    category: 'Data',
    href: '/docs/nodes/rename_keys#operation-default',
    text: 'Rename keys using mappings object.'
  },
  {
    type: 'field',
    title: 'Rename Keys: Mappings',
    slug: 'rename_keys',
    category: 'Data',
    href: '/docs/nodes/rename_keys#operation-default',
    text: 'mappings Object mapping old keys to new keys'
  }
] satisfies DocsSearchIndexItem[];
