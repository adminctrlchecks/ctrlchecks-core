import type { DocsSearchIndexItem } from '../search-index';

export const wordpressSearchIndex = [
  {
    type: 'node',
    title: 'WordPress',
    slug: 'wordpress',
    category: 'CMS',
    href: '/docs/nodes/wordpress',
    text: 'WordPress creates, lists, updates, and deletes posts through the REST API. Runtime returns success, data, and error without input passthrough.',
  },
  {
    type: 'operation',
    title: 'WordPress: Posts',
    slug: 'wordpress',
    category: 'CMS',
    href: '/docs/nodes/wordpress#operation-create_post',
    text: 'Operations: create_post get_posts update_post delete_post. Fields: operation siteUrl username password postId title content status limit. update_post sends title and content only; status is ignored on update.',
  },
  {
    type: 'field',
    title: 'WordPress: Application Password',
    slug: 'wordpress',
    category: 'CMS',
    href: '/docs/nodes/wordpress#operation-create_post',
    text: 'Use a WordPress Application Password with Basic Auth over HTTPS. siteUrl must be the base site URL with no trailing slash before /wp-json/wp/v2/posts is appended.',
  },
] satisfies DocsSearchIndexItem[];
