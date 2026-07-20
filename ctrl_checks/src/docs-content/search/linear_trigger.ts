import type { DocsSearchIndexItem } from '../search-index';

export const linearTriggerSearchIndex = [
  {
    type: 'node',
    title: 'Linear Trigger',
    slug: 'linear_trigger',
    category: 'Triggers',
    href: '/docs/nodes/linear_trigger',
    text: 'Linear Trigger starts workflows from signed Linear webhook events for issues, comments, projects, cycles, labels, reactions, documents, initiatives, customers, and users. Webhook registration is automatic once Linear is connected.',
  },
  {
    type: 'operation',
    title: 'Linear Trigger: Issue And Comment Activity',
    slug: 'linear_trigger',
    category: 'Triggers',
    href: '/docs/nodes/linear_trigger#operation-issue_comment_events',
    text: 'Issue And Comment Activity validates the Linear-Signature HMAC and webhook timestamp, filters teamId resourceTypes eventTypes issueId projectId actorId query, normalizes issue_created issue_updated comment_created and other resource events, and starts workflow executions.',
  },
  {
    type: 'field',
    title: 'Linear Trigger fields',
    slug: 'linear_trigger',
    category: 'Triggers',
    href: '/docs/nodes/linear_trigger#operation-issue_comment_events',
    text: 'Fields include connectionId, teamId, allPublicTeams, resourceTypes Issue Comment Project Cycle IssueLabel Reaction, eventTypes, issueId, projectId, actorId, and query.',
  },
  {
    type: 'field',
    title: 'Linear Trigger outputs',
    slug: 'linear_trigger',
    category: 'Triggers',
    href: '/docs/nodes/linear_trigger#operation-issue_comment_events',
    text: 'Outputs eventId eventType source userId username text timestamp deliveryId linearEvent action entityType entityId organizationId webhookId webhookTimestamp url teamId teamKey teamName issueId issueIdentifier issueTitle issueUrl stateId stateName assigneeId assigneeName commentId commentBody projectId projectName raw trigger workflow_id node_id sessionId _linear.',
  },
  {
    type: 'field',
    title: 'Linear Trigger connection setup',
    slug: 'linear_trigger',
    category: 'Triggers',
    href: '/docs/nodes/linear_trigger#connection-setup',
    text: 'Connect a Linear Personal API Key created from a workspace admin account (or Linear OAuth2) in Connections. CtrlChecks automatically registers the webhook via Linear webhookCreate and validates Linear-Signature and webhook timestamp on every delivery.',
  },
] satisfies DocsSearchIndexItem[];
