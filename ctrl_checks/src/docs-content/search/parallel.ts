import type { DocsSearchIndexItem } from '../search-index';

export const parallelSearchIndex = [
  {
    type: 'node',
    title: 'Parallel',
    slug: 'parallel',
    category: 'Flow',
    href: '/docs/nodes/parallel',
    text: 'Parallel pass data through while recording orchestration mode'
  },
  {
    type: 'operation',
    title: 'Parallel: Configure',
    slug: 'parallel',
    category: 'Flow',
    href: '/docs/nodes/parallel#operation-configure',
    text: 'Parallel Configure mode all race'
  },
  {
    type: 'field',
    title: 'Parallel: Mode',
    slug: 'parallel',
    category: 'Flow',
    href: '/docs/nodes/parallel#operation-configure',
    text: 'Parallel Mode mode all race'
  }
] satisfies DocsSearchIndexItem[];
