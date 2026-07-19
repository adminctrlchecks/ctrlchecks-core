import type { DocsSearchIndexItem } from '../search-index';

export const sendgridSearchIndex = [
  {
    "type": "node",
    "title": "SendGrid",
    "slug": "sendgrid",
    "category": "Communication",
    "href": "/docs/nodes/sendgrid",
    "text": "SendGrid Send a one-off transactional email through SendGrid's Mail Send API using a saved API Key connection. This node supports only From/To/Subject/Text/HTML — SendGrid features like CC/BCC, Reply-To, attachments, categories, and Dynamic Templates are not implemented here. Communication"
  },
  {
    "type": "operation",
    "title": "SendGrid: Send Email",
    "slug": "sendgrid",
    "category": "Communication",
    "href": "/docs/nodes/sendgrid#operation-send_email",
    "text": "SendGrid Configuration Send Email Sends one transactional email through SendGrid's v3 Mail Send API using From, To, Subject, Text, and HTML — no CC/BCC, Reply-To, attachments, categories, or Dynamic Template support in this node today. send_email"
  },
  ...[
    ['Operation', 'operation', 'The SendGrid action to perform (currently only Send Email is implemented)'],
    ['From', 'from', 'Sender email address (must be a verified sender in SendGrid)'],
    ['To', 'to', 'Recipient email address(es), comma-separated'],
    ['Subject', 'subject', 'Email subject line'],
    ['Message (Plain Text)', 'text', 'Plain text body of the email'],
    ['Message (HTML)', 'html', 'HTML body of the email']
  ].map(([label, key, description]) => ({
    type: 'field' as const,
    title: `SendGrid: ${label}`,
    slug: 'sendgrid',
    category: 'Communication',
    href: '/docs/nodes/sendgrid#operation-send_email',
    text: `SendGrid Configuration Send Email ${label} ${key} ${description}`
  }))
] satisfies DocsSearchIndexItem[];
