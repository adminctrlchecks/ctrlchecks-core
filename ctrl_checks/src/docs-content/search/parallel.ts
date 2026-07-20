import type { DocsSearchIndexItem } from '../search-index';

export const parallelSearchIndex = [
  {
    type: 'node',
    title: 'Parallel',
    slug: 'parallel',
    category: 'Flow',
    href: '/docs/nodes/parallel',
    text: 'Parallel passes workflow data through while recording mode all or race and leaving branch fan-out/fan-in to workflow wiring.'
  },
  {
    type: 'operation',
    title: 'Parallel: Configure',
    slug: 'parallel',
    category: 'Flow',
    href: '/docs/nodes/parallel#operation-configure',
    text: 'Configure Parallel mode, preserve object input, output empty results placeholder, metadata parallelMode.'
  },
  {
    type: 'field',
    title: 'Parallel: Mode',
    slug: 'parallel',
    category: 'Flow',
    href: '/docs/nodes/parallel#operation-configure',
    text: 'Mode dropdown Wait for all all or Race first completes race; branch results are not collected by this node itself.'
  }
] satisfies DocsSearchIndexItem[];
