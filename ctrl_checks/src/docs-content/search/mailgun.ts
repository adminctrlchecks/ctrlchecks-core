import type { DocsSearchIndexItem } from '../search-index';

export const mailgunSearchIndex = [
  {
    type: 'node',
    title: 'Mailgun',
    slug: 'mailgun',
    category: 'Communication',
    href: '/docs/nodes/mailgun',
    text: 'Mailgun Send transactional emails through Mailgun using a saved API key, sending domain, and region. Communication'
  },
  {
    type: 'operation',
    title: 'Mailgun: Send Email',
    slug: 'mailgun',
    category: 'Communication',
    href: '/docs/nodes/mailgun#operation-send_email',
    text: 'Mailgun Operations Send Email send_email transactional email via Mailgun'
  },
  ...[
    ['From', 'from', 'Sender email address on your verified Mailgun domain'],
    ['To', 'to', 'Recipient email address(es), comma-separated'],
    ['Subject', 'subject', 'Email subject line'],
    ['Text', 'text', 'Plain text body of the email'],
    ['Html', 'html', 'HTML body of the email'],
    ['CC', 'cc', 'CC recipient email address(es), comma-separated'],
    ['BCC', 'bcc', 'BCC recipient email address(es), comma-separated'],
    ['Reply-To', 'replyTo', 'Reply-To email address'],
    ['Tags', 'tags', 'Mailgun message tags'],
    ['Template', 'template', 'Mailgun stored template name'],
    ['Template Variables', 'templateVariables', 'JSON object sent as Mailgun template variables']
  ].map(([label, key, description]) => ({
    type: 'field' as const,
    title: `Mailgun: ${label}`,
    slug: 'mailgun',
    category: 'Communication',
    href: '/docs/nodes/mailgun#operation-send_email',
    text: `Mailgun Operations Send Email ${label} ${key} ${description}`
  }))
] satisfies DocsSearchIndexItem[];
