import type { DocsSearchIndexItem } from '../search-index';

export const contentfulSearchIndex = [
  {
    type: 'node',
    title: 'Contentful',
    slug: 'contentful',
    category: 'CMS',
    href: '/docs/nodes/contentful',
    text: 'Contentful manages entries through the Content Management API and returns success, data, and error without preserving incoming fields.',
  },
  {
    type: 'operation',
    title: 'Contentful: Entries',
    slug: 'contentful',
    category: 'CMS',
    href: '/docs/nodes/contentful#operation-get_entries',
    text: 'Operations: get_entries get_entry create_entry update_entry delete_entry. Fields: operation spaceId accessToken environment contentType entryId fields. Update and delete load current entry version first.',
  },
  {
    type: 'field',
    title: 'Contentful: CMA Token and Fields JSON',
    slug: 'contentful',
    category: 'CMS',
    href: '/docs/nodes/contentful#operation-create_entry',
    text: 'Use an authorized CFPAT CMA token. Fields must be valid JSON and usually locale keyed, for example {"title":{"en-US":"Launch post"}}. OrganizationAccessGrantRequired means the token needs authorization.',
  },
] satisfies DocsSearchIndexItem[];
