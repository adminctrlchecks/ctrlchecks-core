import type { NodeDoc } from '../types';

const toHelpText = `What this field means: To is the recipient address or recipient list for the email.

Why it matters: The SMTP server sends the message to the addresses in this field. If the address is wrong, the wrong person receives the message or the server rejects delivery.

When to fill it: Fill it every time you send an SMTP email. Runtime requires To, Subject, and at least one body field before it attempts to send.

What to enter: Enter one email address, or a comma-separated list when your SMTP provider allows multiple recipients. You can type a fixed address or map a value from earlier workflow data.

Where the value comes from: Use a form answer, CRM contact, database row, webhook payload, sheet row, or support ticket field that contains the recipient email address.

How to use it later: The output includes accepted and rejected recipient lists. A later Log Output, Slack, or If/Else node can inspect {{$json.accepted}} and {{$json.rejected}}.

Accepted format: Valid email address text such as customer@example.com, or an expression such as {{$json.customerEmail}}. For multiple recipients, separate addresses with commas.

Real workplace example: After a payment webhook, send the receipt to {{$json.customerEmail}} and copy operations in a separate provider-specific workflow if your SMTP account requires it.

If it is empty or wrong: Runtime returns _error: "Email (SMTP): to, subject, and text/html are required" before sending, or the SMTP server may place invalid addresses in rejected.

Common mistake: Mapping a display name, customer ID, or phone number instead of the actual email field. Check the previous node output and use the exact email key.`;

const subjectHelpText = `What this field means: Subject is the short title shown in the recipient's inbox.

Why it matters: People use the subject to decide whether to open the email, and many teams use it for search, filters, and ticket matching.

When to fill it: Fill it every time. Runtime requires Subject before it attempts to send the SMTP message.

What to enter: Enter a clear, specific subject. Include previous-step data only when it helps the recipient recognize the message, such as an order number, ticket number, customer name, or report date.

Where the value comes from: Use fixed text for standard notifications and map values from forms, orders, tickets, databases, or scheduled report metadata when the subject should be personalized.

How to use it later: The subject is not returned as a separate output field unless you also keep it in upstream data, but SMTP delivery output can be logged with {{$json.messageId}} and {{$json.accepted}}.

Accepted format: Plain text. Workflow expressions such as {{$json.orderId}} or {{$json.customerName}} can be included. Keep it short enough to scan in an inbox.

Real workplace example: "Invoice {{$json.invoiceNumber}} is ready" or "Support request {{$json.ticketId}} received".

If it is empty or wrong: Runtime returns _error before sending. Overly generic subjects can make automated emails hard to find or look suspicious.

Common mistake: Putting the whole email body in Subject. Keep Subject brief and put details in Text or HTML.`;

const textHelpText = `What this field means: Text is the plain-text version of the email body.

Why it matters: Plain text is readable in every inbox, works well for alerts and simple confirmations, and gives recipients a fallback when HTML is blocked.

When to fill it: Backend marks Text as required, and runtime requires at least Text or HTML before sending. Fill Text for reliable delivery, even when you also provide HTML.

What to enter: Enter the message people should read. Use short paragraphs and map relevant data from earlier steps, such as customer name, order number, total, reset link, or next action.

Where the value comes from: Combine fixed wording with workflow data from a trigger, form, CRM, order, database, or API response.

How to use it later: Text is sent to the recipient. The node output does not echo the message body; later steps should use {{$json.messageId}}, {{$json.accepted}}, and {{$json.rejected}} to track SMTP acceptance.

Accepted format: Plain text with optional workflow expressions. Avoid raw HTML tags here unless you want recipients to see those tags as text.

Real workplace example: "Hi {{$json.firstName}}, your order {{$json.orderId}} has shipped. Track it here: {{$json.trackingUrl}}".

If it is empty or wrong: If both Text and HTML are empty, runtime returns _error. If mapped fields are missing, recipients may see blanks or unresolved placeholders.

Common mistake: Relying only on HTML for important operational emails. Add a plain-text fallback for password resets, invoices, alerts, and support confirmations.`;

const htmlHelpText = `What this field means: HTML is the rich formatted version of the email body.

Why it matters: HTML lets you add links, paragraphs, emphasis, tables, and basic branding, while Text remains the fallback for clients that block or strip formatting.

When to fill it: Fill it when the email needs clickable links, layout, or formatting. It is optional, but runtime accepts HTML as the body when Text is empty.

What to enter: Enter simple, valid HTML. Keep styling lightweight and inline when needed. Map safe values from earlier steps into the content.

Where the value comes from: Use approved email copy, a template prepared by marketing or operations, and data from prior workflow steps such as reset links, order totals, appointment times, or support ticket IDs.

How to use it later: HTML is sent to the recipient. The output focuses on SMTP acceptance, so use {{$json.messageId}}, {{$json.accepted}}, and {{$json.rejected}} for tracking after send.

Accepted format: HTML string such as <p>Hello {{$json.firstName}}</p>. Avoid scripts, forms, or complex CSS that email clients commonly block.

Real workplace example: <p>Hi {{$json.firstName}},</p><p>Your invoice <strong>{{$json.invoiceNumber}}</strong> is ready.</p><p><a href="{{$json.invoiceUrl}}">View invoice</a></p>.

If it is empty or wrong: Empty is fine when Text is filled. Broken HTML can render poorly in inboxes, and missing mapped values can produce incomplete messages.

Common mistake: Placing sensitive data, hidden tracking code, or unsupported JavaScript in HTML. Email clients strip scripts, and secrets should never be sent in message content.`;

const fromHelpText = `What this field means: From is the sender address shown on the email.

Why it matters: The SMTP provider may only allow approved sender addresses. The wrong From value can cause authentication failures, spam filtering, or rejected messages.

When to fill it: Leave it empty when the message should send from the SMTP username or the default From address stored on the SMTP Account connection. Fill it only when your mail server allows this sender.

What to enter: Enter an approved sender address such as support@company.com, billing@company.com, or noreply@company.com.

Where the value comes from: Use the sending address configured by your IT team, email provider, domain administrator, or SMTP relay. Some providers require the address or domain to be verified first.

How to use it later: From is used for sending and is not returned as a separate output field. Delivery tracking still uses {{$json.messageId}}, {{$json.accepted}}, and {{$json.rejected}}.

Accepted format: Valid email address. Do not enter display-only names unless your SMTP provider explicitly supports formatted From headers.

Real workplace example: Use billing@company.com for invoices, support@company.com for ticket confirmations, and alerts@company.com for operations alerts.

If it is empty or wrong: Empty defaults to the SMTP username or connection default. Unauthorized From addresses may fail with relay, sender, authentication, or permission errors.

Common mistake: Entering a personal address when the SMTP relay only allows the company's verified domain. Ask IT which sender addresses are approved.`;

export const emailDoc: NodeDoc = {
  slug: 'email',
  displayName: 'Send Email (SMTP)',
  category: 'Communication',
  logoUrl: '/icons/nodes/email.svg',
  description: 'Send a plain-text or HTML email through a saved SMTP Account connection.',
  credentialType: 'SMTP Account - Email requires a saved SMTP connection with host, port, username, and password.',
  credentialSetupSteps: [
    'Create or select an SMTP Account connection before running this node. The connection stores the mail server host, port, username, password or app password, and optional default From address.',
    'Find SMTP settings in your email provider or company mail relay documentation. Common examples are smtp.gmail.com with port 587, smtp-mail.outlook.com with port 587, or mail.yourdomain.com for custom domains.',
    'For Gmail, Outlook, and many accounts with two-factor authentication, create an app password in account security settings. Do not use your normal login password unless the provider explicitly allows SMTP password login.',
    'Keep SMTP passwords in Connections or the credential vault, not in To, Subject, Text, HTML, From, or any ordinary workflow input field.',
    'Connect the incoming output from a trigger, form, CRM, sheet, database, or API node when recipient addresses or message content should use previous workflow data.',
    'Connect the Email output to a logging, If/Else, Slack, CRM, or error-handling node if you need to inspect {{$json.success}}, {{$json.messageId}}, {{$json.accepted}}, {{$json.rejected}}, or {{$json._error}}.',
    'Downstream service node account connection setup is still required for nodes after Email; the SMTP Account only authorizes sending this SMTP message.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Use this resource to choose recipients, compose subject and body content, and optionally override the sender address for one SMTP email.',
      operations: [
        {
          name: 'Send Email',
          value: 'default',
          description: 'Sends one email through the selected SMTP Account connection. Choose this operation for operational notifications, password reset messages, receipt emails, internal alerts, report delivery, and confirmations from an SMTP mailbox or company mail relay.',
          fields: [
            {
              name: 'To',
              internalKey: 'to',
              type: 'string',
              required: true,
              description: 'Recipient email address or comma-separated list of recipients.',
              helpText: toHelpText,
              placeholder: '{{$json.customerEmail}}',
              example: '{{$json.customerEmail}}',
              notes: 'Runtime resolves workflow expressions before sending. Invalid addresses can appear in rejected.',
            },
            {
              name: 'Subject',
              internalKey: 'subject',
              type: 'string',
              required: true,
              description: 'Inbox subject line for the email.',
              helpText: subjectHelpText,
              placeholder: 'Invoice {{$json.invoiceNumber}} is ready',
              example: 'Invoice {{$json.invoiceNumber}} is ready',
              notes: 'Keep the subject short and specific. Avoid putting secret or sensitive body details in the subject.',
            },
            {
              name: 'Text',
              internalKey: 'text',
              type: 'textarea',
              required: true,
              description: 'Plain-text email body.',
              helpText: textHelpText,
              placeholder: 'Hi {{$json.firstName}}, your invoice {{$json.invoiceNumber}} is ready: {{$json.invoiceUrl}}',
              example: 'Hi {{$json.firstName}}, your invoice {{$json.invoiceNumber}} is ready: {{$json.invoiceUrl}}',
              notes: 'Backend marks Text as required. Runtime can send with HTML only, but Text is recommended as the reliable fallback.',
            },
            {
              name: 'HTML',
              internalKey: 'html',
              type: 'textarea',
              required: false,
              description: 'Optional rich HTML email body.',
              helpText: htmlHelpText,
              placeholder: '<p>Hi {{$json.firstName}}, your invoice is ready.</p>',
              example: '<p>Hi {{$json.firstName}},</p><p>Your invoice <strong>{{$json.invoiceNumber}}</strong> is ready.</p><p><a href="{{$json.invoiceUrl}}">View invoice</a></p>',
              notes: 'Use simple HTML that email clients support. Scripts and complex interactive content are not appropriate for email.',
            },
            {
              name: 'From',
              internalKey: 'from',
              type: 'string',
              required: false,
              description: 'Optional sender address override. Defaults to the SMTP username or connection default.',
              helpText: fromHelpText,
              placeholder: 'billing@company.com',
              example: 'billing@company.com',
              notes: 'Only use a sender address your SMTP provider allows.',
            },
          ],
          outputExample: {
            customerEmail: 'asha.rao@example.com',
            invoiceNumber: 'INV-1042',
            success: true,
            messageId: '<abc123@smtp.example.com>',
            accepted: ['asha.rao@example.com'],
            rejected: [],
          },
          outputDescription: 'The Email output keeps incoming fields such as customerEmail and invoiceNumber, then adds success when the SMTP server accepts the send call, messageId for the provider message identifier, accepted for recipient addresses accepted by the server, and rejected for addresses the server refused. If configuration, credentials, or delivery fail, runtime returns _error. Later nodes can use {{$json.success}}, {{$json.messageId}}, {{$json.accepted}}, {{$json.rejected}}, and prior fields such as {{$json.customerEmail}}.',
          usageExample: {
            scenario: 'Send a customer invoice notification through the company SMTP relay after an accounting system creates the invoice',
            inputValues: {
              to: '{{$json.customerEmail}}',
              subject: 'Invoice {{$json.invoiceNumber}} is ready',
              text: 'Hi {{$json.firstName}}, your invoice {{$json.invoiceNumber}} is ready: {{$json.invoiceUrl}}',
              html: '<p>Hi {{$json.firstName}},</p><p>Your invoice <strong>{{$json.invoiceNumber}}</strong> is ready.</p><p><a href="{{$json.invoiceUrl}}">View invoice</a></p>',
              from: 'billing@company.com',
            },
            expectedOutput: 'The next logging or If/Else node can use {{$json.success}}, {{$json.messageId}}, {{$json.accepted}}, {{$json.rejected}}, and {{$json.customerEmail}} to record or route the send result.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Email (SMTP): to, subject, and text/html are required',
      cause: 'To or Subject is blank, or both Text and HTML are empty after workflow expressions resolve.',
      fix: 'Fill To and Subject, then provide Text or HTML. Run the previous step and confirm mapped values such as {{$json.customerEmail}} and {{$json.invoiceUrl}} exist.',
    },
    {
      error: 'Email (SMTP): missing SMTP credentials (host/username/password)',
      cause: 'No SMTP Account connection is selected, or the saved connection is missing host, username, or password.',
      fix: 'Open Connections, add or reconnect the SMTP Account, and confirm host, port, username, and password or app password are saved.',
    },
    {
      error: 'Authentication failed',
      cause: 'The SMTP username, password, app password, or provider security setting is wrong or expired.',
      fix: 'Regenerate the app password or SMTP password, update the SMTP Account connection, and test the connection with a simple email to yourself.',
    },
    {
      error: 'Sender address rejected',
      cause: 'The From field uses an address or domain the SMTP server is not allowed to send as.',
      fix: 'Leave From blank to use the SMTP username, or use a verified sender address approved by your mail provider or IT team.',
    },
    {
      error: 'Recipient rejected or invalid email format',
      cause: 'The To field contains a typo, a blank mapped value, a display name without an address, or a recipient blocked by the mail server.',
      fix: 'Check the previous node output, use a valid address such as customer@example.com, and inspect {{$json.rejected}} after the send attempt.',
    },
    {
      error: 'Next node cannot find send result',
      cause: 'The downstream node is looking for provider-specific fields or old names instead of the SMTP runtime output.',
      fix: 'Use {{$json.success}}, {{$json.messageId}}, {{$json.accepted}}, and {{$json.rejected}} for SMTP send status.',
    },
    {
      error: 'Permission denied after Email',
      cause: 'Email uses the SMTP Account only for sending mail, but a downstream service node may still need its own connected account or permission to create, update, send, upload, or write data.',
      fix: 'Connect the required account on the downstream service node and confirm that provider permission separately from the SMTP connection.',
    },
  ],
  relatedNodes: ['google_gmail', 'outlook', 'amazon_ses', 'sendgrid', 'mailgun', 'slack_message'],
};
