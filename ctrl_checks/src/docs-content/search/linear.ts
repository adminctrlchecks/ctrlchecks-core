import type { DocsSearchIndexItem } from '../search-index';

export const linearSearchIndex: DocsSearchIndexItem[] = [
  { type: 'node', title: 'Linear', slug: 'linear', category: 'Productivity', href: '/docs/nodes/linear', text: 'Linear Create update fetch and list Linear issues and teams' },
  { type: 'operation', title: 'Linear: Create Issue', slug: 'linear', category: 'Productivity', href: '/docs/nodes/linear#operation-create_issue', text: 'Linear create_issue teamId title description stateId priority' },
  { type: 'operation', title: 'Linear: List Issues', slug: 'linear', category: 'Productivity', href: '/docs/nodes/linear#operation-list_issues', text: 'Linear list_issues issue tracker teamId assigned issues' },
  { type: 'operation', title: 'Linear: Get Teams', slug: 'linear', category: 'Productivity', href: '/docs/nodes/linear#operation-get_teams', text: 'Linear get_teams team ids for issue creation' },
];
