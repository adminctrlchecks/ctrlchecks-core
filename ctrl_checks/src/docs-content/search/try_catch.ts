import type { DocsSearchIndexItem } from '../search-index';

export const tryCatchSearchIndex = [
  {
    type: 'node',
    title: 'Try/Catch',
    slug: 'try_catch',
    category: 'Flow',
    href: '/docs/nodes/try_catch',
    text: 'Try/Catch marks try catch routing, preserves input fields, and provides errorHandling metadata.'
  },
  {
    type: 'operation',
    title: 'Try/Catch: Configure',
    slug: 'try_catch',
    category: 'Flow',
    href: '/docs/nodes/try_catch#operation-configure',
    text: 'Configure Try/Catch with no fields; output __routing branch try and catch error context on routed errors.'
  }
] satisfies DocsSearchIndexItem[];
