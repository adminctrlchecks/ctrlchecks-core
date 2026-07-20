import type { DocsSearchIndexItem } from '../search-index';

export const githubSearchIndex = [
  {
    type: 'node',
    title: 'GitHub',
    slug: 'github',
    category: 'DevOps',
    href: '/docs/nodes/github',
    text: 'GitHub repository, issue, pull request, branch, commit, release, workflow, and contributor operations through the connected GitHub account. Success output keeps input and spreads provider data top level.',
  },
  {
    type: 'operation',
    title: 'GitHub: Repository Operations',
    slug: 'github',
    category: 'DevOps',
    href: '/docs/nodes/github#operation-get_repo',
    text: 'Operations: get_repo list_repos create_issue update_issue close_issue list_issues get_issue add_issue_comment create_pr update_pr merge_pr list_prs get_pr add_pr_comment create_branch list_branches get_branch delete_branch create_commit list_commits get_commit create_release list_releases get_release get_workflow_runs trigger_workflow list_contributors.',
  },
  {
    type: 'field',
    title: 'GitHub: Connected Account and Output',
    slug: 'github',
    category: 'DevOps',
    href: '/docs/nodes/github#operation-create_issue',
    text: 'Runtime token comes from the connected GitHub account/token manager. Output includes success provider action plus top-level fields like number html_url sha url or _error when no github token found.',
  },
] satisfies DocsSearchIndexItem[];
