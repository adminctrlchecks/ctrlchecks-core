import type { DocsSearchIndexItem } from '../search-index';

export const outlookSearchIndex = [
  {
    type: 'node',
    title: 'Outlook',
    slug: 'outlook',
    category: 'Communication',
    href: '/docs/nodes/outlook',
    text: 'Outlook sends plain-text email through Microsoft Graph sendMail using a Microsoft OAuth2 Connection with Mail.Send.',
  },
  {
    type: 'operation',
    title: 'Outlook: Send Email',
    slug: 'outlook',
    category: 'Communication',
    href: '/docs/nodes/outlook#operation-send_email',
    text: 'Send Email resolves To, Subject, and Body, sends /me/sendMail, preserves incoming fields, and adds success true when Graph accepts the message.',
  },
  {
    type: 'field',
    title: 'Outlook: Operation',
    slug: 'outlook',
    category: 'Communication',
    href: '/docs/nodes/outlook#operation-send_email',
    text: 'Operation supports send_email in the visual panel; legacy send is accepted by runtime.',
  },
  {
    type: 'field',
    title: 'Outlook: To',
    slug: 'outlook',
    category: 'Communication',
    href: '/docs/nodes/outlook#operation-send_email',
    text: 'To is one or more recipient email addresses, comma-separated, or mapped from a previous field such as {{$json.customerEmail}}.',
  },
  {
    type: 'field',
    title: 'Outlook: Subject',
    slug: 'outlook',
    category: 'Communication',
    href: '/docs/nodes/outlook#operation-send_email',
    text: 'Subject is required plain text for the recipient inbox headline.',
  },
  {
    type: 'field',
    title: 'Outlook: Body',
    slug: 'outlook',
    category: 'Communication',
    href: '/docs/nodes/outlook#operation-send_email',
    text: 'Body is required plain-text email content; this executor sends Microsoft Graph contentType Text, not HTML.',
  },
] satisfies DocsSearchIndexItem[];
