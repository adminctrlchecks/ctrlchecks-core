import type { DocsSearchIndexItem } from '../search-index';

export const gitlabSearchIndex = [
  { type: 'node', title: 'GitLab', slug: 'gitlab', category: 'DevOps', href: '/docs/nodes/gitlab', text: 'GitLab issue-only action node. Read/List Issues returns items or issue. Create Issue returns created. Requires projectId and GitLab accessToken or saved connection.' },
  { type: 'operation', title: 'GitLab: Read/List Issues', slug: 'gitlab', category: 'DevOps', href: '/docs/nodes/gitlab#operation-read', text: 'Read lists up to 50 GitLab issues when issueIid is blank, or gets one issue when issueIid is filled. Output includes success, items or issue, _error, _errorDetails.' },
  { type: 'operation', title: 'GitLab: Create Issue', slug: 'gitlab', category: 'DevOps', href: '/docs/nodes/gitlab#operation-create', text: 'Create opens a GitLab issue with title and optional descriptionText. Output includes success and created raw GitLab issue data.' },
  { type: 'field', title: 'GitLab: accessToken', slug: 'gitlab', category: 'DevOps', href: '/docs/nodes/gitlab#field-accessToken', text: 'GitLab PAT or OAuth access token. Runtime reads accessToken or saved gitlab vault credential. Use api scope.' },
  { type: 'field', title: 'GitLab: baseUrl', slug: 'gitlab', category: 'DevOps', href: '/docs/nodes/gitlab#field-baseUrl', text: 'GitLab API base URL must include /api/v4, such as https://gitlab.com/api/v4.' },
  { type: 'field', title: 'GitLab: projectId', slug: 'gitlab', category: 'DevOps', href: '/docs/nodes/gitlab#field-projectId', text: 'Project ID or path such as group%2Fproject. Required for every supported GitLab operation.' },
  { type: 'field', title: 'GitLab: issueIid', slug: 'gitlab', category: 'DevOps', href: '/docs/nodes/gitlab#field-issueIid', text: 'Project-scoped issue number. Optional for read; blank lists issues, filled gets one issue.' },
  { type: 'field', title: 'GitLab: title', slug: 'gitlab', category: 'DevOps', href: '/docs/nodes/gitlab#field-title', text: 'Issue title required for Create Issue. Missing title returns GitLab create issue: title is required.' },
  { type: 'field', title: 'GitLab: descriptionText', slug: 'gitlab', category: 'DevOps', href: '/docs/nodes/gitlab#field-descriptionText', text: 'Issue description sent on Create Issue. Runtime reads descriptionText, not the old description field.' },
] satisfies DocsSearchIndexItem[];
