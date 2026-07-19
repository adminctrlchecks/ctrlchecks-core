import type { DocsSearchIndexItem } from '../search-types';

export const gitlabTriggerSearchIndex = [
  {
    slug: 'gitlab_trigger',
    title: 'GitLab Trigger',
    href: '/docs/nodes/gitlab_trigger',
    text: 'GitLab Trigger start workflows from GitLab project webhooks push tag_push issue merge_request note comment pipeline job release X-Gitlab-Token shared secret not HMAC',
  },
  {
    slug: 'gitlab_trigger',
    title: 'GitLab Trigger setup',
    href: '/docs/nodes/gitlab_trigger#operation-receive',
    text: 'Configure GitLab URL baseUrl Project ID projectId eventTypes secretToken keyword query Personal Access Token PAT OAuth api scope /api/v4/projects/:id/hooks project webhook',
  },
  {
    slug: 'gitlab_trigger',
    title: 'GitLab Trigger outputs',
    href: '/docs/nodes/gitlab_trigger#operation-receive',
    text: 'Outputs eventId eventType source userId username text timestamp projectId projectName action ref commits issueIid issueTitle issueUrl mrIid mrTitle mrUrl mrState noteBody noteUrl raw trigger workflow_id node_id sessionId _gitlab',
  },
] satisfies DocsSearchIndexItem[];
