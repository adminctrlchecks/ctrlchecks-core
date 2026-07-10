import type { NodeDoc } from '../types';

export const mailgunDoc: NodeDoc = {
  slug: 'mailgun',
  displayName: 'Mailgun',
  category: 'Communication',
  logoUrl: '/integrations-logos/Mailgun.svg',
  description: 'Send transactional emails through Mailgun using a saved API key, sending domain, and region.',
  credentialType: 'Mailgun API Key',
  credentialSetupSteps: [
    'What this is: The Mailgun connection stores your private API key, verified sending domain, region, and optional default sender outside regular workflow fields.',
    'Where to start: Mailgun -> Account settings -> API keys.',
    'Create or copy a Private API Key. Do not use the public validation key.',
    'Open Mailgun -> Sending -> Domains and copy the verified sending domain, for example mg.yourcompany.com.',
    'Choose the matching API region: US uses api.mailgun.net; EU uses api.eu.mailgun.net.',
    'Sandbox domains can send only to authorized recipients until your domain/account setup allows production sending.',
    'Important: Store the API key in Connections, not in regular workflow fields.',
    'Test it: Save the connection, run a simple Mailgun send step, and confirm Mailgun queues the message.'
  ],
  credentialDocsUrl: 'https://documentation.mailgun.com/docs/mailgun/api-reference/authentication',
  resources: [
    {
      name: 'Operations',
      description: 'Mailgun exposes one implemented send operation.',
      operations: [
        {
          name: 'Send email',
          value: 'send_email',
          description: 'Send a transactional email via Mailgun.',
          fields: [
            {
              name: 'From',
              internalKey: 'from',
              type: 'string',
              required: true,
              description: 'Sender email address on your verified Mailgun domain.',
              helpText: 'Use an address on the sending domain saved in your Mailgun connection. Example: noreply@mg.yourcompany.com.',
              placeholder: 'noreply@mg.yourdomain.com',
              example: 'noreply@mg.yourdomain.com'
            },
            {
              name: 'To',
              internalKey: 'to',
              type: 'string',
              required: true,
              description: 'Recipient email address(es), comma-separated.',
              helpText: 'Enter one recipient or comma-separated recipients. Sandbox domains can send only to authorized recipients.',
              placeholder: 'user@example.com',
              example: 'user@example.com'
            },
            {
              name: 'Subject',
              internalKey: 'subject',
              type: 'string',
              required: false,
              description: 'Email subject line.',
              helpText: 'Subject is optional at schema level, but recommended unless your Mailgun template provides it.',
              placeholder: 'Hello!',
              example: 'Reset your password'
            },
            {
              name: 'Text',
              internalKey: 'text',
              type: 'textarea',
              required: false,
              description: 'Plain text body of the email.',
              helpText: 'Mailgun requires at least one of Text, HTML, or Template.',
              placeholder: 'Your message here',
              example: 'Your reset link is {{$json.resetUrl}}'
            },
            {
              name: 'Html',
              internalKey: 'html',
              type: 'textarea',
              required: false,
              description: 'HTML body of the email.',
              helpText: 'Mailgun requires at least one of Text, HTML, or Template.',
              placeholder: '<p>Your message</p>',
              example: '<p>Click <a href="{{$json.resetUrl}}">here</a>.</p>'
            },
            {
              name: 'CC',
              internalKey: 'cc',
              type: 'string',
              required: false,
              description: 'CC recipient email address(es), comma-separated.',
              placeholder: 'manager@example.com',
              example: 'manager@example.com'
            },
            {
              name: 'BCC',
              internalKey: 'bcc',
              type: 'string',
              required: false,
              description: 'BCC recipient email address(es), comma-separated.',
              placeholder: 'audit@example.com',
              example: 'audit@example.com'
            },
            {
              name: 'Reply-To',
              internalKey: 'replyTo',
              type: 'string',
              required: false,
              description: 'Reply-To email address for recipient replies.',
              placeholder: 'support@mg.yourdomain.com',
              example: 'support@mg.yourdomain.com'
            },
            {
              name: 'Tags',
              internalKey: 'tags',
              type: 'string',
              required: false,
              description: 'Mailgun message tags, comma-separated.',
              placeholder: 'welcome,onboarding',
              example: 'password-reset,transactional'
            },
            {
              name: 'Template',
              internalKey: 'template',
              type: 'string',
              required: false,
              description: 'Mailgun stored template name.',
              helpText: 'If set, the template can provide message content. Pair with Template Variables as needed.',
              placeholder: 'welcome_email',
              example: 'welcome_email'
            },
            {
              name: 'Template Variables',
              internalKey: 'templateVariables',
              type: 'object',
              required: false,
              description: 'JSON object sent to Mailgun as template variables.',
              placeholder: '{"name":"Ada"}',
              example: '{"name":"Ada","resetUrl":"{{$json.resetUrl}}"}'
            }
          ],
          outputExample: {
            success: true,
            messageId: '<20250115.abc123@mg.example.com>',
            message: 'Queued. Thank you.'
          },
          outputDescription: 'success: true when Mailgun accepts the message. messageId: Mailgun message ID for tracking. message: Mailgun queue confirmation.',
          usageExample: {
            scenario: 'Send a password reset email using Mailgun',
            inputValues: {
              from: 'noreply@mg.yourapp.com',
              to: '{{$json.email}}',
              subject: 'Reset your password',
              html: '<p>Click <a href="{{$json.resetUrl}}">here</a> to reset your password.</p>'
            },
            expectedOutput: 'Email is queued by Mailgun. Track delivery in Mailgun logs using {{$json.messageId}}.'
          },
          externalDocsUrl: 'https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/messages'
        }
      ]
    }
  ],
  commonErrors: [
    {
      error: 'Authentication failed',
      cause: 'The saved Mailgun API key, sending domain, or region is incorrect.',
      fix: 'Open Connections -> Mailgun, verify the private API key, domain, and US/EU region, then re-run the node.'
    },
    {
      error: 'text, html, or template is required',
      cause: 'The message has no body and no stored template name.',
      fix: 'Fill Text, HTML, or Template before running the node.'
    },
    {
      error: 'Forbidden or unauthorized recipient',
      cause: 'A sandbox domain is sending to an address that is not authorized, or the From address is not on the verified domain.',
      fix: 'Authorize the recipient in Mailgun sandbox settings or use a verified production sending domain.'
    }
  ],
  relatedNodes: ['sendgrid', 'amazon_ses', 'email']
};
