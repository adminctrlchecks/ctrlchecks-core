import type { DocsSearchIndexItem } from '../search-index';

export const mergeSearchIndex = [
  {
    type: 'node',
    title: 'Merge',
    slug: 'merge',
    category: 'Logic',
    href: '/docs/nodes/merge',
    text: 'Merge rejoin multiple workflow branches combine data no credentials',
  },
  {
    type: 'operation',
    title: 'Merge: Configure',
    slug: 'merge',
    category: 'Logic',
    href: '/docs/nodes/merge#operation-configure',
    text: 'Merge Configure mode overwrite append deep_merge branch outputs sourceCount mergeMode',
  },
  {
    type: 'field',
    title: 'Merge: Mode',
    slug: 'merge',
    category: 'Logic',
    href: '/docs/nodes/merge#operation-configure',
    text: 'Merge Mode overwrite objects append items deep_merge nested objects when to choose each output shape',
  },
  {
    type: 'connection',
    title: 'Merge: Connection Guidance',
    slug: 'merge',
    category: 'Logic',
    href: '/docs/nodes/merge#operation-configure',
    text: 'Merge connect multiple incoming branch outputs connect output downstream service node account connection',
  },
] satisfies DocsSearchIndexItem[];
