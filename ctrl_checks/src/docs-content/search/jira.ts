import type { DocsSearchIndexItem } from '../search-index';

export const jiraSearchIndex = [
  { type: 'node', title: 'Jira', slug: 'jira', category: 'DevOps', href: '/docs/nodes/jira', text: 'Jira Cloud action node for create, get, update, delete, search, transition, add comment, and get projects. Uses Jira API Token Basic Auth from Connections.' },
  { type: 'operation', title: 'Jira: Create Issue', slug: 'jira', category: 'DevOps', href: '/docs/nodes/jira#operation-create_issue', text: 'Create Issue requires projectKey and summary. Output includes success, issueKey, issueId, created.' },
  { type: 'operation', title: 'Jira: Get Issue', slug: 'jira', category: 'DevOps', href: '/docs/nodes/jira#operation-get_issue', text: 'Get Issue requires issueKey and returns issue.' },
  { type: 'operation', title: 'Jira: Update Issue', slug: 'jira', category: 'DevOps', href: '/docs/nodes/jira#operation-update_issue', text: 'Update Issue requires issueKey and summary, description, or priority. Output includes updated.' },
  { type: 'operation', title: 'Jira: Delete Issue', slug: 'jira', category: 'DevOps', href: '/docs/nodes/jira#operation-delete_issue', text: 'Delete Issue requires issueKey and returns deleted true.' },
  { type: 'operation', title: 'Jira: Search Issues', slug: 'jira', category: 'DevOps', href: '/docs/nodes/jira#operation-search_issues', text: 'Search Issues requires jql and returns total and issues.' },
  { type: 'operation', title: 'Jira: Transition Issue', slug: 'jira', category: 'DevOps', href: '/docs/nodes/jira#operation-transition_issue', text: 'Transition Issue requires issueKey and transitionId and returns transitioned true.' },
  { type: 'operation', title: 'Jira: Add Comment', slug: 'jira', category: 'DevOps', href: '/docs/nodes/jira#operation-add_comment', text: 'Add Comment requires issueKey and commentBody and returns commentId and comment.' },
  { type: 'operation', title: 'Jira: Get Projects', slug: 'jira', category: 'DevOps', href: '/docs/nodes/jira#operation-get_projects', text: 'Get Projects lists visible projects as projects array.' },
  { type: 'field', title: 'Jira: domain', slug: 'jira', category: 'DevOps', href: '/docs/nodes/jira#field-domain', text: 'Atlassian domain such as yourcompany.atlassian.net.' },
  { type: 'field', title: 'Jira: issueKey', slug: 'jira', category: 'DevOps', href: '/docs/nodes/jira#field-issueKey', text: 'Issue key such as PROJ-123 for get update delete transition comment.' },
  { type: 'field', title: 'Jira: projectKey', slug: 'jira', category: 'DevOps', href: '/docs/nodes/jira#field-projectKey', text: 'Project key required for create issue.' },
  { type: 'field', title: 'Jira: jql', slug: 'jira', category: 'DevOps', href: '/docs/nodes/jira#field-jql', text: 'JQL query required for search issues.' },
] satisfies DocsSearchIndexItem[];
