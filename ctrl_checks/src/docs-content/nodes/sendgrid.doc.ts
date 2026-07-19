import type { NodeDoc } from '../types';

const operationHelpText = `What this field means: Operation selects which SendGrid action this node performs. Today there is only one implemented action, Send Email.

Why it matters: The dropdown exists so future SendGrid actions could be added later without changing this field's shape — right now it only ever does one thing.

When to fill it: Always has a value; it defaults to Send Email and the panel does not let you pick anything else yet.

What to enter: Leave it on Send Email.
- Send Email: sends one transactional email through SendGrid's v3 Mail Send API using the fields below. This is the only option currently available, so choosing it is effectively automatic.

Where the value comes from: This is a fixed workflow setting, not something mapped from upstream data.

How to use it later: Not echoed back in the node's own output fields.

Accepted format: The single dropdown value send_email.

Real workplace example: Every SendGrid node in every workflow today uses Send Email, whether it's a receipt, a welcome email, or an alert.

If it is empty or wrong: An empty value still runs as Send Email in practice, since it is the only implemented operation.

Common mistake: Expecting SendGrid features like templates, contact lists, or marketing campaigns to appear here — this node only sends one-off transactional emails through Mail Send; it does not implement SendGrid's Marketing Campaigns or Dynamic Templates APIs.`;

const fromHelpText = `What this field means: From is the sender email address SendGrid puts in the message's From header.

Why it matters: SendGrid rejects sends from an address that has not been verified as a Sender Identity (or is not on a domain you have authenticated) in your SendGrid account.

When to fill it: Always required.

What to enter: A verified sender address, such as noreply@yourcompany.com.

Where the value comes from: SendGrid dashboard → Settings → Sender Authentication, where you verify either a single sender address or your whole domain.

How to use it later: Not echoed back in the node's own output fields.

Accepted format: A single email address. Display-name formats like "Name <email@domain.com>" are not supported — use a plain address.

Real workplace example: receipts@yourcompany.com verified as a single sender for order-confirmation emails.

If it is empty or wrong: An empty value returns "SendGrid: from email is required" before contacting SendGrid. An unverified address is rejected by SendGrid itself at send time (typically an HTTP 403), a genuine SendGrid API failure rather than something this node can pre-validate.

Common mistake: Assuming any address on your company's domain works automatically — SendGrid requires that exact sender identity (or the whole domain) to be explicitly verified first, even if the domain itself is real and receives mail elsewhere.`;

const toHelpText = `What this field means: To is who receives this email, entered as one address or several comma-separated addresses — not a JSON object like some other email nodes use.

Why it matters: Amazon SES's node in this product accepts a structured {"to": [...]} object, but SendGrid's node here does not — mixing up the two formats would send the literal text instead of real addresses.

When to fill it: Always required.

What to enter: One address, or several separated by commas, with no JSON brackets or quotes.

Where the value comes from: Map it from an earlier step, such as a checkout, signup, or CRM step.

How to use it later: Not echoed back in the node's own output fields — only success/status/messageId are returned on success.

Accepted format: A single email address (customer@example.com) or comma-separated multiple addresses (alice@example.com, bob@example.com). Do not wrap it in {"to": [...]} JSON.

Real workplace example: {{$json.customerEmail}} mapped directly from a checkout step for a single recipient.

If it is empty or wrong: An empty value returns "SendGrid: to email is required" before contacting SendGrid.

Common mistake: Pasting a JSON array or object here — SendGrid's node expects a plain comma-separated string. Also, every comma-separated address here is added as a single shared "personalization" — every recipient can see the same subject/body but this node does not hide recipients from each other (there is no CC/BCC split; see Common Errors for the full scope limitation).`;

const subjectHelpText = `What this field means: Subject is the email subject line.

Why it matters: It is the first thing a recipient sees in their inbox.

When to fill it: Optional at the schema level, but always fill it in practice — SendGrid delivers with an empty subject line rather than failing if this is left blank.

What to enter: A short, clear description of the email's purpose.

Where the value comes from: Type a fixed subject, or map one from an earlier step such as an order or account record.

How to use it later: Not echoed back in the node's own output fields.

Accepted format: Plain text. {{$json.field}} expressions are resolved before sending.

Real workplace example: "Your receipt for order #{{$json.orderId}}" for a payment confirmation email.

If it is empty or wrong: Left empty, the email still sends with a blank subject line — there is no "Subject is required" failure for this node.

Common mistake: Leaving Subject blank and only relying on the email body to explain the message — most recipients decide whether to open an email from the subject line alone.`;

const textHelpText = `What this field means: Text is the plain-text body of the email, used by email clients that do not render HTML and as a fallback everywhere else.

Why it matters: If Text and HTML are both left empty, this node still sends the email with a single blank-space plain-text body rather than failing — unlike Mailgun's node, SendGrid's node here has no "at least one of Text/HTML" requirement.

When to fill it: Fill it whenever you are writing message content directly. Recommended even when HTML is also filled, as a readable fallback.

What to enter: The message content as plain text, with no HTML tags.

Where the value comes from: Type fixed wording, or map content from a previous step such as a generated summary or notification text.

How to use it later: Not echoed back in the node's own output fields.

Accepted format: Plain text. {{$json.field}} expressions are resolved before sending.

Real workplace example: "Thank you for your order! Your total was {{$json.amount}}." as the plain-text half of a receipt email.

If it is empty or wrong: Left empty along with Html, SendGrid still accepts and sends the message with a single blank-space body — the recipient receives an essentially empty email rather than the node failing, so leaving both blank is a silent mistake, not a loud one.

Common mistake: Filling only HTML and skipping Text. Some spam filters and older mail clients render better (or only work at all) with a plain-text part present.`;

const htmlHelpText = `What this field means: Html is the HTML-formatted body of the email, shown by email clients that support rich formatting. When both Text and HTML are filled, SendGrid receives both content versions in the same message.

Why it matters: It lets you send rich formatting (links, bold text, layout) instead of, or in addition to, Text.

When to fill it: Fill it whenever you want rich formatting.

What to enter: Hand-written HTML markup for the message body.

Where the value comes from: Type fixed HTML, or map content from a previous step such as a generated report or templated snippet.

How to use it later: Not echoed back in the node's own output fields.

Accepted format: HTML markup. {{$json.field}} expressions are resolved before sending, including inside HTML attributes such as href.

Real workplace example: "<h1>Thank you!</h1><p>You paid \${{$json.amount}} on {{$json.date}}.</p>" for a receipt email.

If it is empty or wrong: Left empty along with Text, SendGrid still accepts and sends the message with a single blank-space body rather than the node failing. Malformed HTML is sent as-is and may render incorrectly in some clients, but does not fail the node.

Common mistake: Assuming this node supports SendGrid's Dynamic Templates (template IDs with {{substitution}} placeholders defined in the SendGrid dashboard) — it does not; Html here is always raw markup typed or mapped directly into this field, not a template reference.`;

export const sendgridDoc: NodeDoc = {
  slug: 'sendgrid',
  displayName: 'SendGrid',
  category: 'Communication',
  logoUrl: '/icons/nodes/sendgrid.svg',
  description: 'Send a one-off transactional email through SendGrid\'s Mail Send API using a saved API Key connection. This node supports only From/To/Subject/Text/HTML — SendGrid features like CC/BCC, Reply-To, attachments, categories, and Dynamic Templates are not implemented here.',
  credentialType: 'SendGrid API Key',
  credentialSetupSteps: [
    'What this is: The SendGrid API Key connection lets CtrlChecks send email through your SendGrid account without putting your API key in a normal workflow field.',
    'Prerequisites: a SendGrid account (the free plan allows 100 emails/day), and a verified sender identity or authenticated domain (SendGrid → Settings → Sender Authentication) — required before sending real emails.',
    'How to connect: SendGrid dashboard → Settings → API Keys → Create API Key → name it (for example "CtrlChecks") → choose Restricted Access → enable Mail Send → Create & View → copy the key immediately, since it starts with SG. and is shown only once.',
    'In CtrlChecks: open Connections → Add Connection → SendGrid API Key, then paste the API Key.',
    'Important: treat the API Key like a bank password. Store it only in Connections — never paste it into the From, To, Subject, or any other normal workflow field. If it is ever pasted somewhere outside Connections, revoke and regenerate it in SendGrid.',
    'Test it: save the connection, select it on a SendGrid node with a verified From address, run a simple send, and confirm the node returns success: true with status: 202.',
    'Downstream service node account connections are separate: connecting SendGrid only authorizes this node\'s email send — any node after it in the workflow still needs its own account connection and permissions for its own outgoing line of work.',
  ],
  credentialDocsUrl: 'https://docs.sendgrid.com/api-reference/how-to-use-the-sendgrid-v3-api/authentication',
  resources: [
    {
      name: 'Configuration',
      description: 'SendGrid exposes a single implemented action, configured directly with input fields — the Operation dropdown exists for future expansion but only has one working choice today.',
      operations: [
        {
          name: 'Send Email',
          value: 'send_email',
          description: 'Sends one transactional email through SendGrid\'s v3 Mail Send API using From, To, Subject, Text, and HTML — no CC/BCC, Reply-To, attachments, categories, or Dynamic Template support in this node today.',
          fields: [
            {
              name: 'Operation',
              internalKey: 'operation',
              type: 'select',
              required: true,
              description: 'The SendGrid action to perform (currently only Send Email is implemented)',
              helpText: operationHelpText,
              placeholder: 'send_email',
              example: 'send_email',
              defaultValue: 'send_email',
              options: ['send_email'],
            },
            {
              name: 'From',
              internalKey: 'from',
              type: 'email',
              required: true,
              description: 'Sender email address (must be a verified sender in SendGrid)',
              helpText: fromHelpText,
              placeholder: 'you@yourdomain.com',
              example: 'noreply@yourdomain.com',
            },
            {
              name: 'To',
              internalKey: 'to',
              type: 'string',
              required: true,
              description: 'Recipient email address(es), comma-separated (not a JSON array)',
              helpText: toHelpText,
              placeholder: 'recipient@example.com',
              example: 'user@example.com',
            },
            {
              name: 'Subject',
              internalKey: 'subject',
              type: 'string',
              required: false,
              description: 'Email subject line',
              helpText: subjectHelpText,
              placeholder: 'Hello from SendGrid!',
              example: 'Hello!',
            },
            {
              name: 'Message (Plain Text)',
              internalKey: 'text',
              type: 'textarea',
              required: false,
              description: 'Plain text body of the email',
              helpText: textHelpText,
              placeholder: 'Your message here...',
              example: 'Your message here',
            },
            {
              name: 'Message (HTML)',
              internalKey: 'html',
              type: 'textarea',
              required: false,
              description: 'HTML body of the email. If both Text and HTML are provided, SendGrid receives both content versions.',
              helpText: htmlHelpText,
              placeholder: '<p>Your HTML message here...</p>',
              example: '<p>Your message</p>',
            },
          ],
          outputExample: {
            success: true,
            status: 202,
            messageId: 'a1B2c3D4e5F6.filter-node-1.abcdef1234567890@sgrp',
          },
          outputDescription: 'On success (SendGrid returns HTTP 202): success is true, status is always 202 (SendGrid\'s "accepted for delivery" response has no body, only headers), and messageId is read from SendGrid\'s x-message-id response header — use it to look the send up in the SendGrid Activity Feed. Original upstream $json fields are preserved alongside these. On failure — missing from/to, or SendGrid rejecting the request (unverified sender, invalid API key, malformed recipient) — the node returns _error and _errorDetails (SendGrid\'s raw JSON error body, typically an errors array) with no success field at all (not set to false, simply absent); check {{$json._error}} to detect failure.',
          usageExample: {
            scenario: 'Send a receipt email right after a successful payment',
            inputValues: {
              from: 'receipts@yourapp.com',
              to: '{{$json.customerEmail}}',
              subject: 'Your receipt for order #{{$json.orderId}}',
              html: '<h1>Thank you!</h1><p>You paid ${{$json.amount}} on {{$json.date}}.</p>',
            },
            expectedOutput: 'Email is accepted by SendGrid for delivery. Track it via {{$json.messageId}} in the SendGrid Activity Feed, and check {{$json._error}} in a following node to detect a failed send.',
          },
          externalDocsUrl: 'https://docs.sendgrid.com/api-reference/mail-send/mail-send',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'SendGrid: apiKey is required',
      cause: 'No SendGrid connection is selected on this node, and no API key was found any other way.',
      fix: 'Open Connections, add a SendGrid API Key connection with a valid Restricted Access key that has Mail Send enabled, then select it on this node.',
    },
    {
      error: 'SendGrid: from email is required / SendGrid: to email is required',
      cause: 'From or To resolved to an empty string after expressions were evaluated.',
      fix: 'Fill From and To with fixed addresses or valid {{$json.field}} expressions, and confirm the upstream node actually produced that field.',
    },
    {
      error: 'SendGrid send failed (403): Unauthorized / sender identity not verified',
      cause: 'The From address (or its domain) has not been verified under SendGrid → Settings → Sender Authentication, or the API key lacks Mail Send permission.',
      fix: 'Verify the sender identity or authenticate the full domain in SendGrid, and confirm the API key was created with Mail Send access enabled.',
    },
    {
      error: 'This node does not support CC, BCC, Reply-To, attachments, categories, or SendGrid Dynamic Templates',
      cause: 'The runtime executor for this node only ever reads From, To, Subject, Text, and HTML from its configuration — every other SendGrid Mail Send API feature is explicitly excluded, even though SendGrid\'s own API supports all of them.',
      fix: 'Use the Mailgun node instead if the workflow genuinely needs CC/BCC/Reply-To/stored-template support today, or send those specific features through the generic HTTP Request node directly against SendGrid\'s v3 Mail Send API.',
    },
    {
      error: 'Next node cannot find the send result',
      cause: 'A downstream node is reading a field this node never produces, such as a nested response body instead of the flattened output.',
      fix: 'Use the real output fields: {{$json.success}}, {{$json.status}}, {{$json.messageId}}, and check {{$json._error}} for failures (this node never sets a plain success: false — check _error instead).',
    },
    {
      error: 'Permission denied after SendGrid',
      cause: 'The SendGrid connection only authorizes sending email through your SendGrid account — it does not grant any access to whatever service a later node in the workflow talks to.',
      fix: 'Connect the required account separately on each downstream service node and confirm that node\'s own permissions.',
    },
  ],
  relatedNodes: ['mailgun', 'amazon_ses', 'email'],
};
