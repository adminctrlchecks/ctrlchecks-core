import type { DocsSearchIndexItem } from '../search-index';

export const githubTriggerSearchIndex = [
  {
    type: 'node',
    title: 'GitHub Trigger',
    slug: 'github_trigger',
    category: 'Triggers',
    href: '/docs/nodes/github_trigger',
    text: 'GitHub Trigger starts workflows from signed GitHub repository webhooks for push, issues, pull_request, release, issue_comment, and other repository events.',
  },
  {
    type: 'operation',
    title: 'GitHub Trigger: Receive GitHub event',
    slug: 'github_trigger',
    category: 'Triggers',
    href: '/docs/nodes/github_trigger#operation-receive',
    text: 'Receive GitHub event validates X-Hub-Signature-256, ignores ping, filters eventTypes and query, normalizes push issues pull_request release issue_comment payloads, and starts workflow executions.',
  },
  {
    type: 'field',
    title: 'GitHub Trigger fields',
    slug: 'github_trigger',
    category: 'Triggers',
    href: '/docs/nodes/github_trigger#operation-receive',
    text: 'Fields include connectionId, owner, repo, eventTypes push issues pull_request release issue_comment, webhookSecret signing secret override, and query keyword filter.',
  },
  {
    type: 'field',
    title: 'GitHub Trigger outputs',
    slug: 'github_trigger',
    category: 'Triggers',
    href: '/docs/nodes/github_trigger#operation-receive',
    text: 'Outputs eventId eventType source userId username text timestamp repository action ref commits issueNumber issueTitle issueUrl prNumber prTitle prUrl merged releaseTag releaseName commentBody commentUrl raw trigger workflow_id node_id sessionId _github.',
  },
  {
    type: 'field',
    title: 'GitHub Trigger connection setup',
    slug: 'github_trigger',
    category: 'Triggers',
    href: '/docs/nodes/github_trigger#connection-setup',
    text: 'Connect GitHub Personal Access Token or OAuth in Connections. Webhook registration calls /repos/{owner}/{repo}/hooks and needs repo or admin:repo_hook permission. CtrlChecks stores the token and generated webhook secret outside normal workflow input fields.',
  },
] satisfies DocsSearchIndexItem[];
