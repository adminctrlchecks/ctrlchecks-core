import type { DocsSearchIndexItem } from '../search-index';

export const outlookTriggerSearchIndex = [
  {
    type: 'node',
    title: 'Outlook Trigger',
    slug: 'outlook_trigger',
    category: 'Triggers',
    href: '/docs/nodes/outlook_trigger',
    text: 'Outlook Trigger starts workflows from new Outlook email or calendar events delivered through Microsoft Graph change notifications. Subscriptions are created and renewed automatically.',
  },
  {
    type: 'operation',
    title: 'Outlook Trigger: Receive notification',
    slug: 'outlook_trigger',
    category: 'Triggers',
    href: '/docs/nodes/outlook_trigger#operation-receive',
    text: 'Receive notification validates the Graph clientState secret, re-fetches the referenced message or event, filters resource changeTypes query, and starts workflow executions.',
  },
  {
    type: 'field',
    title: 'Outlook Trigger fields',
    slug: 'outlook_trigger',
    category: 'Triggers',
    href: '/docs/nodes/outlook_trigger#operation-receive',
    text: 'Fields include connectionId, resource mail calendar, changeTypes created updated deleted, folderName, and query.',
  },
  {
    type: 'field',
    title: 'Outlook Trigger outputs',
    slug: 'outlook_trigger',
    category: 'Triggers',
    href: '/docs/nodes/outlook_trigger#operation-receive',
    text: 'Outputs eventId eventType source userId username text timestamp resourceId subject from to snippet conversationId start end attendees raw trigger workflow_id node_id sessionId _outlook.',
  },
  {
    type: 'field',
    title: 'Outlook Trigger connection setup',
    slug: 'outlook_trigger',
    category: 'Triggers',
    href: '/docs/nodes/outlook_trigger#connection-setup',
    text: 'Connect Microsoft OAuth2 in Connections with Mail.Read and Calendars.Read scopes. CtrlChecks automatically creates and renews the Microsoft Graph subscription — no manual webhook setup required.',
  },
] satisfies DocsSearchIndexItem[];
