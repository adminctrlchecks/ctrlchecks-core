import type { DocsSearchIndexItem } from '../search-index';

export const bitbucketSearchIndex = [
  {
    type: 'node',
    title: 'Bitbucket',
    slug: 'bitbucket',
    category: 'DevOps',
    href: '/docs/nodes/bitbucket',
    text: 'Bitbucket repository read create update delete operations through the override. Output is success plus output.operation and output.data, or error code BITBUCKET_FAILED.',
  },
  {
    type: 'operation',
    title: 'Bitbucket: Repositories',
    slug: 'bitbucket',
    category: 'DevOps',
    href: '/docs/nodes/bitbucket#operation-read',
    text: 'Operations: read create update delete. Fields: operation workspace repoSlug repo username appPassword accessToken description isPrivate data. read lists workspace repositories when repoSlug is blank.',
  },
  {
    type: 'field',
    title: 'Bitbucket: Auth and Repository Slugs',
    slug: 'bitbucket',
    category: 'DevOps',
    href: '/docs/nodes/bitbucket#operation-create',
    text: 'Use Bitbucket app password with username or OAuth accessToken. create update delete require repoSlug. workspace is required unless repo supplies workspace/repoSlug.',
  },
] satisfies DocsSearchIndexItem[];
