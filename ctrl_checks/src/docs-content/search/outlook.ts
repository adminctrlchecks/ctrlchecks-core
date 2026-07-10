import type { DocsSearchIndexItem } from '../search-index';

export const outlookSearchIndex = [
  {
    type: 'node',
    title: 'Outlook',
    slug: 'outlook',
    category: 'Communication',
    href: '/docs/nodes/outlook',
    text: 'Outlook Send emails via Microsoft Outlook using Microsoft Graph OAuth. Requires a Microsoft Connection with User.Read and Mail.Send. Communication',
  },
  {
    type: 'operation',
    title: 'Outlook: Send Email',
    slug: 'outlook',
    category: 'Communication',
    href: '/docs/nodes/outlook#operation-send_email',
    text: 'Outlook Operations Send Email send_email sends a plain-text email from the connected Microsoft mailbox.',
  },
  {
    type: 'field',
    title: 'Outlook: To',
    slug: 'outlook',
    category: 'Communication',
    href: '/docs/nodes/outlook#operation-send_email',
    text: 'Outlook Send Email To to recipient email address or comma-separated recipient email addresses.',
  },
  {
    type: 'field',
    title: 'Outlook: Subject',
    slug: 'outlook',
    category: 'Communication',
    href: '/docs/nodes/outlook#operation-send_email',
    text: 'Outlook Send Email Subject subject email subject line.',
  },
  {
    type: 'field',
    title: 'Outlook: Body',
    slug: 'outlook',
    category: 'Communication',
    href: '/docs/nodes/outlook#operation-send_email',
    text: 'Outlook Send Email Body body plain-text email body content.',
  },
] satisfies DocsSearchIndexItem[];
