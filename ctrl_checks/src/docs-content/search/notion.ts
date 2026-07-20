import type { DocsSearchIndexItem } from '../search-index';

export const notionSearchIndex: DocsSearchIndexItem[] = [
  { type: 'node', title: 'Notion', slug: 'notion', category: 'Productivity', href: '/docs/nodes/notion', text: 'Notion OAuth Connections pages databases blocks users comments search data results _error returnAll sort isInline pageSize' },
  { type: 'operation', title: 'Notion: Page Operations', slug: 'notion', category: 'Productivity', href: '/docs/nodes/notion#operation-page.get', text: 'page get create update archive restore pageId databaseId parentPageId properties children content output data id url' },
  { type: 'operation', title: 'Notion: Database Operations', slug: 'notion', category: 'Productivity', href: '/docs/nodes/notion#operation-database.query', text: 'database get list query create update databaseId query schema title returnAll pageSize output data results' },
  { type: 'operation', title: 'Notion: Block Operations', slug: 'notion', category: 'Productivity', href: '/docs/nodes/notion#operation-block.appendChildren', text: 'block get listChildren appendChildren update delete blockId children content output data results' },
  { type: 'operation', title: 'Notion: User Operations', slug: 'notion', category: 'Productivity', href: '/docs/nodes/notion#operation-user.getMe', text: 'user get list getMe userId output data connection test' },
  { type: 'operation', title: 'Notion: Comment Operations', slug: 'notion', category: 'Productivity', href: '/docs/nodes/notion#operation-comment.create', text: 'comment list create pageId blockId parentDiscussionId richText comment output data comment get unsupported' },
  { type: 'operation', title: 'Notion: Search', slug: 'notion', category: 'Productivity', href: '/docs/nodes/notion#operation-search.search', text: 'search searchQuery filter sort returnAll pageSize output data results' },
];
