import type { DocsSearchIndexItem } from '../search-index';

export const mailgunSearchIndex = [
  {
    type: 'node',
    title: 'Mailgun',
    slug: 'mailgun',
    category: 'Communication',
    href: '/docs/nodes/mailgun',
    text: 'Mailgun Send transactional emails through Mailgun using a saved API key, sending domain, and region, with automatic retry on temporary Mailgun errors. Communication'
  },
  {
    type: 'operation',
    title: 'Mailgun: Send Email',
    slug: 'mailgun',
    category: 'Communication',
    href: '/docs/nodes/mailgun#operation-send_email',
    text: 'Mailgun Operations Send Email send_email Sends one transactional email through Mailgun\'s Messages API, as raw Text/HTML or a stored Mailgun template'
  },
  ...[
    ['Operation', 'operation', 'The Mailgun action to perform (currently only Send Email is implemented)'],
    ['Domain', 'domain', 'Mailgun sending domain saved on the selected Mailgun connection'],
    ['Api Key', 'apiKey', 'Mailgun Private API Key saved on the selected Mailgun connection'],
    ['From', 'from', 'Sender email address on your verified Mailgun domain'],
    ['To', 'to', 'Recipient email address(es), comma-separated'],
    ['Subject', 'subject', 'Email subject line'],
    ['Message (Plain Text)', 'text', 'Plain text body of the email'],
    ['Message (HTML)', 'html', 'HTML body of the email'],
    ['CC', 'cc', 'CC recipient email address(es), comma-separated'],
    ['BCC', 'bcc', 'BCC recipient email address(es), comma-separated'],
    ['Reply-To', 'replyTo', 'Reply-To email address'],
    ['Tags', 'tags', 'Mailgun message tags, comma-separated'],
    ['Template', 'template', 'Optional Mailgun stored template name'],
    ['Template Variables (JSON)', 'templateVariables', 'JSON object of variables for the Mailgun template']
  ].map(([label, key, description]) => ({
    type: 'field' as const,
    title: `Mailgun: ${label}`,
    slug: 'mailgun',
    category: 'Communication',
    href: '/docs/nodes/mailgun#operation-send_email',
    text: `Mailgun Operations Send Email ${label} ${key} ${description}`
  }))
] satisfies DocsSearchIndexItem[];
