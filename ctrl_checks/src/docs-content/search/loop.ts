import type { DocsSearchIndexItem } from '../search-index';

export const loopSearchIndex = [
  {
    type: 'node',
    title: 'Loop',
    slug: 'loop',
    category: 'Logic',
    href: '/docs/nodes/loop',
    text: 'Loop expose an array downstream with max iteration metadata'
  },
  {
    type: 'operation',
    title: 'Loop: Configure',
    slug: 'loop',
    category: 'Logic',
    href: '/docs/nodes/loop#operation-configure',
    text: 'Loop Configure array maxIterations items loop metadata'
  },
  {
    type: 'field',
    title: 'Loop: Array',
    slug: 'loop',
    category: 'Logic',
    href: '/docs/nodes/loop#operation-configure',
    text: 'Loop Array array optional expression path input.items'
  },
  {
    type: 'field',
    title: 'Loop: Max Iterations',
    slug: 'loop',
    category: 'Logic',
    href: '/docs/nodes/loop#operation-configure',
    text: 'Loop Max Iterations maxIterations truncate items'
  }
] satisfies DocsSearchIndexItem[];
