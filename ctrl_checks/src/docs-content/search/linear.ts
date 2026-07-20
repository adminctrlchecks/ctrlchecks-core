import type { DocsSearchIndexItem } from '../search-index';

export const linearSearchIndex: DocsSearchIndexItem[] = [
  { type: 'node', title: 'Linear', slug: 'linear', category: 'Productivity', href: '/docs/nodes/linear', text: 'Linear issues teams GraphQL create_issue update_issue get_issue list_issues get_teams Personal API Key Connections credential vault' },
  { type: 'operation', title: 'Linear: Get Teams', slug: 'linear', category: 'Productivity', href: '/docs/nodes/linear#operation-get_teams', text: 'List Linear teams and return teams count for mapping {{$json.teams[0].id}} into create_issue teamId' },
  { type: 'operation', title: 'Linear: List Issues', slug: 'linear', category: 'Productivity', href: '/docs/nodes/linear#operation-list_issues', text: 'List Linear issues by teamId or connected user assigned issues output issues count' },
  { type: 'operation', title: 'Linear: Get Issue', slug: 'linear', category: 'Productivity', href: '/docs/nodes/linear#operation-get_issue', text: 'Get one Linear issue by issueId output issue state team assignee url' },
  { type: 'operation', title: 'Linear: Create Issue', slug: 'linear', category: 'Productivity', href: '/docs/nodes/linear#operation-create_issue', text: 'Create Linear issue requires teamId title optional description stateId priority output issue identifier url' },
  { type: 'operation', title: 'Linear: Update Issue', slug: 'linear', category: 'Productivity', href: '/docs/nodes/linear#operation-update_issue', text: 'Update Linear issue requires issueId optional title description stateId priority output issue' },
];
