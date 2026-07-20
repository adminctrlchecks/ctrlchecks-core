import type { DocsSearchIndexItem } from '../search-index';

export const jiraTriggerSearchIndex = [
  {
    type: 'node',
    title: 'Jira Trigger',
    slug: 'jira_trigger',
    category: 'Triggers',
    href: '/docs/nodes/jira_trigger',
    text: 'Jira Trigger starts workflows from Jira issue created/updated/deleted or comment created/updated/deleted events, delivered through a manually configured Jira Cloud webhook. Connect a Jira API token in Connections and add the webhook in Jira System WebHooks or Automation for Jira.',
  },
  {
    type: 'operation',
    title: 'Jira Trigger: Receive event',
    slug: 'jira_trigger',
    category: 'Triggers',
    href: '/docs/nodes/jira_trigger#operation-receive',
    text: 'Receive event validates the shared webhook secret, filters eventTypes projectKey query, normalizes issue created/updated/deleted and comment created/updated/deleted payloads, and starts workflow executions.',
  },
  {
    type: 'field',
    title: 'Jira Trigger fields',
    slug: 'jira_trigger',
    category: 'Triggers',
    href: '/docs/nodes/jira_trigger#operation-receive',
    text: 'Fields include connectionId, siteUrl, projectKey, eventTypes jira:issue_created jira:issue_updated jira:issue_deleted comment_created comment_updated comment_deleted, secretToken, jql, and query.',
  },
  {
    type: 'field',
    title: 'Jira Trigger outputs',
    slug: 'jira_trigger',
    category: 'Triggers',
    href: '/docs/nodes/jira_trigger#operation-receive',
    text: 'Outputs eventId eventType source userId username text timestamp siteUrl cloudId issueKey issueId issueSummary issueUrl issueType issueStatus projectKey commentBody commentUrl raw trigger workflow_id node_id sessionId _jira.',
  },
  {
    type: 'field',
    title: 'Jira Trigger connection setup',
    slug: 'jira_trigger',
    category: 'Triggers',
    href: '/docs/nodes/jira_trigger#connection-setup',
    text: 'Connect Jira with an Atlassian API token (email + token + domain) in Connections, tested against /rest/api/3/myself. Jira webhook registration is manual — add the generated URL in Jira System WebHooks or an Automation for Jira Send web request action, and keep the shared secret private since Jira does not sign payloads.',
  },
] satisfies DocsSearchIndexItem[];
