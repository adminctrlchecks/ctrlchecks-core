import type { NodeDoc } from '../types';

const recipientsHelpText = `What this field means: Recipients is a structured object listing who receives the email, split into To, Cc, and Bcc address arrays.

Why it matters: At least one address across To, Cc, or Bcc is required — Amazon SES rejects a send with zero recipients, and this node validates that before ever calling AWS.

When to fill it: Always required.

What to enter: A JSON object such as {"to": ["user@example.com"], "cc": ["manager@example.com"], "bcc": []}. Any of the three arrays can be omitted or empty as long as at least one has an address.

Where the value comes from: Map addresses from a previous step's output, such as {{$json.email}} for a single customer, or build the array from a database/CRM lookup.

How to use it later: Recipients are not echoed back individually in the node's own output — this node only reports recipientCount (a total) and does not repeat the addresses in $json.

Accepted format: A JSON object with to/cc/bcc keys, each an array of email address strings. Duplicate addresses across the three arrays are removed automatically, and each address is lowercased before sending.

Real workplace example: {"to": ["{{$json.customerEmail}}"], "cc": ["support-team@company.com"]} to notify both a customer and an internal team on one send.

If it is empty or wrong: An empty object (or one where to/cc/bcc are all empty) returns "At least one recipient (To, Cc, or Bcc) is required". An address that fails basic email-format validation returns "Invalid email addresses: ...".

Common mistake: Typing a single email string instead of a JSON object with a to array — the node expects {"to": ["..."]}, not a bare address string.`;

const subjectHelpText = `What this field means: Subject is the email subject line sent for a raw (non-template) Amazon SES email.

Why it matters: Amazon SES requires a non-empty subject on every send; this node checks it before contacting AWS.

When to fill it: Required whenever Use AWS SES Template is off (false). This field is hidden from the panel and ignored entirely when Use AWS SES Template is on, since the template itself supplies the subject line.

What to enter: A short, clear subject describing the email's purpose.

Where the value comes from: Type a fixed subject, or map one from an earlier step such as an order or ticket record.

How to use it later: Subject is not echoed back in this node's output fields — only success/failure and delivery metadata are returned.

Accepted format: Plain text. Template placeholders like {{$json.orderId}} are resolved before sending.

Real workplace example: "Order {{$json.orderId}} Confirmation" or "Your {{$json.planName}} subscription renews soon".

If it is empty or wrong: When Use AWS SES Template is off and Subject resolves to an empty string, the node returns "Email subject is required" before calling AWS.

Common mistake: Leaving Subject filled in while Use AWS SES Template is on — it is silently ignored, so the template's own subject is what recipients actually see.`;

const bodyHelpText = `What this field means: Body is the message content for a raw (non-template) Amazon SES email. CtrlChecks sends this exact text as both the HTML part and the plain-text part of the email.

Why it matters: Amazon SES requires at least an HTML or a text body; leaving Body empty (with Use AWS SES Template off) fails validation before any AWS call is made.

When to fill it: Required whenever Use AWS SES Template is off (false). Hidden from the panel and ignored when Use AWS SES Template is on.

What to enter: The message text recipients should read. Because the same string becomes the HTML body too, avoid relying on visual line breaks or formatting that only plain text supports — write text that reads sensibly either way, or add manual HTML tags if you need real HTML formatting.

Where the value comes from: Type fixed wording, or map content from a previous step such as an order confirmation, notification template, or generated summary.

How to use it later: Body content is not echoed back in the node's output — only success/failure fields and delivery metadata are returned.

Accepted format: Plain text or hand-written HTML markup; both are accepted as the same raw string.

Real workplace example: "Hello {{$json.name}}, your order {{$json.orderId}} is confirmed and will ship within 2 business days."

If it is empty or wrong: When Use AWS SES Template is off and Body resolves to an empty string, the node returns "Email body (HTML or text) is required".

Common mistake: Assuming line breaks in Body render as <br> in the HTML part — plain newlines display as a single run-on line in HTML email clients unless you add <br> or <p> tags yourself.`;

const useTemplateHelpText = `What this field means: Use AWS SES Template is a switch that decides whether this send uses Subject/Body typed directly in this node, or an existing template stored in your AWS SES account.

Why it matters: It controls which other fields the node reads — Subject and Body when off, or Template Name and Template Data when on. Filling both sets does not combine them; only one path runs per send.

When to fill it: Always has a value (defaults to off/false). Turn it on only when you already created a template in AWS SES for this email.

What to enter: Toggle on (true) to use a saved SES template, or leave off (false) to write the subject and body directly in this node.

Where the value comes from: This is a manual workflow-design choice, not something normally mapped from upstream data.

How to use it later: This field itself is not echoed back in the output; it only changes which fields are read before sending.

Accepted format: Boolean — on/true or off/false.

Real workplace example: Turn it on for a recurring "Order Shipped" notification that AWS SES sends with pre-approved branded HTML, and keep it off for a one-off internal alert email written inline.

If it is empty or wrong: The default is off, so an unset value behaves the same as false — Subject and Body are used.

Common mistake: Turning this on without first creating the named template in the AWS SES console for the exact region this node's AWS Region field points to — SES templates are region-specific.`;

const templateNameHelpText = `What this field means: Template Name is the exact name of an AWS SES email template to fetch and send, used only when Use AWS SES Template is on.

Why it matters: Amazon SES looks the template up by this exact name in the selected AWS Region; a typo or wrong region returns a template-not-found failure.

When to fill it: Required whenever Use AWS SES Template is on. Hidden from the panel and ignored when Use AWS SES Template is off.

What to enter: The template's exact name as it appears in AWS SES, case-sensitive.

Where the value comes from: AWS Console → Amazon SES → Email templates (in the same region as this node's AWS Region field), or list templates with the AWS CLI (aws ses list-templates).

How to use it later: Template Name is not echoed back in the node's output.

Accepted format: Plain text matching an existing SES template name exactly.

Real workplace example: "OrderConfirmationV2" for a templated order-confirmation email maintained by the marketing team in AWS SES.

If it is empty or wrong: An empty value with Use AWS SES Template on returns "Template name is required when useTemplate is true". A name that does not exist in that region returns "AWS SES template '...' not found. Please create this template in your SES account."

Common mistake: Creating the template in one AWS region (for example us-east-1) while this node's AWS Region field is set to a different region — SES templates do not exist across regions.`;

const templateDataHelpText = `What this field means: Template Data supplies the variable values an AWS SES template needs to fill in its own {{placeholders}}, used only when Use AWS SES Template is on.

Why it matters: The node reads every {{variable}} used inside the template's subject, HTML, and text parts, and checks that Template Data provides a value for each one before calling AWS — a missing variable fails the send early with a specific list of what's missing.

When to fill it: Fill it whenever the selected template contains placeholders. Not required for templates with no placeholders.

What to enter: A JSON object whose keys match the template's placeholder names exactly.

Where the value comes from: Match each key to a {{placeholder}} already defined inside the AWS SES template, and pull the values from earlier workflow steps.

How to use it later: Template Data itself is not echoed back in the node's output; it is only used to fill the template before sending.

Accepted format: A JSON object, for example {"name": "John", "orderId": "12345"}. Nested objects/arrays and template expressions like {{$json.orderId}} inside values are both resolved before sending.

Real workplace example: {"name": "{{$json.customerName}}", "orderId": "{{$json.orderId}}"} for a template whose body reads "Hi {{name}}, your order {{orderId}} shipped."

If it is empty or wrong: A variable used in the template but missing from Template Data returns "Template data validation failed: missing: <variableName>" (and similarly for a null/undefined value under "invalid: ...").

Common mistake: Assuming placeholder names in Template Data must use {{ }} braces — they should not; the object's plain keys (name, orderId) are matched against the template's own {{name}}/{{orderId}} placeholders.`;

const fromAddressHelpText = `What this field means: From Address is the sender email address Amazon SES uses as the message's From header.

Why it matters: AWS SES only allows sending from identities (individual addresses or whole domains) that have been verified in your SES account for the selected region — an unverified sender is rejected by AWS, not just by this node.

When to fill it: Always required.

What to enter: A verified sender address such as noreply@yourcompany.com or support@yourcompany.com.

Where the value comes from: AWS Console → Amazon SES → Verified identities, in the same region as this node's AWS Region field. Verify either the individual address or the whole domain there before using it here.

How to use it later: From Address is not echoed back in the node's own output fields.

Accepted format: A single valid email address, for example noreply@example.com. Display-name formats like "Name <email@example.com>" are not supported — use a plain address.

Real workplace example: billing@yourcompany.com for automated invoice emails, verified once as a domain identity so every address at that domain can send.

If it is empty or wrong: An empty value returns "From address is required"; a malformed address returns "Invalid from address format: ...". A syntactically valid but unverified address is accepted by this node but then rejected by AWS SES itself as a send-time (not _error) failure — see the sender-not-verified entry in Common Errors.

Common mistake: Verifying the sender identity in one AWS region while this node's AWS Region field points to a different region — SES sender verification is per-region, not account-wide.`;

const replyToAddressesHelpText = `What this field means: Reply-To Addresses lists the email address(es) that should receive a reply when a recipient hits "Reply" on this email, instead of the From Address.

Why it matters: It lets automated or no-reply sender addresses still route human replies to a real inbox or shared team address.

When to fill it: Optional. Fill it whenever replies to an automated email should land somewhere other than the From Address.

What to enter: A JSON array of one or more email addresses.

Where the value comes from: A shared support inbox, an account manager's address, or a value mapped from an earlier step such as {{$json.assignedAgentEmail}}.

How to use it later: Not echoed back in this node's output; it only affects the Reply-To header AWS SES sets on the outgoing email.

Accepted format: A JSON array of email address strings, for example ["support@example.com"] or ["support@example.com", "help@example.com"].

Real workplace example: Send order confirmations From "noreply@shop.com" but Reply-To ["support@shop.com"] so customer replies reach a monitored inbox.

If it is empty or wrong: Left empty, replies go to the From Address as normal — there is no error either way, since this field is fully optional.

Common mistake: Expecting this field to change who the email appears to be sent from — it only affects where replies go, not the visible From header.`;

const attachmentsHelpText = `What this field means: Attachments is a list of files to include with the email, each described by a filename, its content, and its content type.

Why it matters: Adding any attachment switches this node from Amazon SES's simple SendEmail API to a manually built raw MIME message (SendRawEmail) so the files can be embedded — this changes how the email is transmitted internally, though the node handles that automatically.

When to fill it: Optional. Fill it only when the email needs one or more file attachments.

What to enter: A JSON array of objects, each with filename, content (base64-encoded), and contentType.

Where the value comes from: Base64-encode file content from a previous step, such as a generated PDF, a downloaded document, or a CSV export, then reference it as {{$json.pdfContent}}.

How to use it later: Attachments are not echoed back in the node's output — only success/failure and delivery metadata are returned.

Accepted format: A JSON array such as [{"filename": "report.pdf", "content": "JVBERi0xLjQ...", "contentType": "application/pdf"}]. Only these content types are accepted, and the file extension must match the content type: PDF (.pdf), Word (.doc/.docx), Excel (.xls/.xlsx), images (.jpg/.jpeg/.png/.gif/.webp), text (.txt/.csv), and .zip. Total email size (subject + body + all attachments) must stay under Amazon SES's 40MB limit.

Real workplace example: [{"filename": "invoice-{{$json.orderId}}.pdf", "content": "{{$json.pdfBase64}}", "contentType": "application/pdf"}] for an invoice generated earlier in the workflow.

If it is empty or wrong: A missing filename/content/contentType returns "Attachment processing failed: Attachment 0: Missing required fields...". An unsupported content type or a mismatched extension returns "Attachment format validation failed: ...". Exceeding 40MB total returns "Attachment size validation failed: Total email size (...) exceeds AWS SES limit of 40MB".

Common mistake: Sending a file type outside the supported list (for example .pptx or .mp4) — the node rejects it before ever contacting AWS, even though Amazon SES itself might otherwise accept a raw MIME attachment of that type.`;

const awsRegionHelpText = `What this field means: AWS Region is the AWS region CtrlChecks uses for this specific send — where SES looks up your verified sender identities, templates, and configuration sets.

Why it matters: Amazon SES verified identities, templates, and configuration sets are all region-specific; using the wrong region here causes "not found" or "unverified sender" failures even when everything is correctly set up in a different region.

When to fill it: Always has a value (defaults to us-east-1 / US East (N. Virginia)). Change it only when your SES resources live in a different region than the connection's saved default.

What to enter: Choose the region matching where you verified your sender identity and (if used) created your SES template.

Where the value comes from: AWS Console → Amazon SES → the region selector in the top navigation, to see which region your identities/templates already exist in.

How to use it later: Not echoed back in this node's output.

Accepted format: One of the dropdown's AWS region codes. Each option is where a distinct part of Amazon's SES infrastructure runs, so pick the one matching your actual AWS setup:
- us-east-1 (US East, N. Virginia): the default region and the most common choice for AWS SES getting-started guides; choose it if you followed AWS's default SES setup instructions.
- us-west-2 (US West, Oregon): choose it if your SES identities/templates were verified in Oregon, often used by US-based teams wanting geographic redundancy from us-east-1.
- eu-west-1 (EU, Ireland): choose it for European sender identities, commonly used to keep data processing within the EU.
- eu-central-1 (EU, Frankfurt): choose it for European sender identities specifically verified in Frankfurt, sometimes required for German data-residency requirements.
- ap-southeast-1 (Asia Pacific, Singapore): choose it for identities verified in Singapore, common for Southeast Asian sender domains.
- ap-northeast-1 (Asia Pacific, Tokyo): choose it for identities verified in Tokyo, common for Japan-based sender domains.
- ap-southeast-2 (Asia Pacific, Sydney): choose it for identities verified in Sydney, common for Australia/New Zealand sender domains.

Real workplace example: A European company verifies noreply@company.eu in eu-west-1, so this field must also be set to eu-west-1 — not the default us-east-1 — or the send fails with an unverified-sender error.

If it is empty or wrong: An unrecognized region code falls back silently to us-east-1. A recognized but mismatched region (where your identity/template doesn't exist) causes an unverified-sender or template-not-found failure at send time.

Common mistake: Assuming the saved Amazon SES connection's region is always used — this field overrides the connection's region whenever it is set, so a stale or incorrect value here silently sends to the wrong region.`;

const configurationSetNameHelpText = `What this field means: Configuration Set Name links this send to an Amazon SES configuration set, which controls event tracking (opens, clicks, bounces, complaints) for CloudWatch or SNS.

Why it matters: Without a configuration set, SES still sends the email, but you get no structured delivery-event tracking beyond this node's own success/failure result.

When to fill it: Optional. Fill it when your AWS setup already has a configuration set for analytics, deliverability monitoring, or compliance tracking.

What to enter: The exact configuration set name created in AWS SES.

Where the value comes from: AWS Console → Amazon SES → Configuration sets, in the same region as this node's AWS Region field.

How to use it later: Not echoed back in this node's own output — event data flows to whatever CloudWatch/SNS destination the configuration set defines in AWS, outside this workflow.

Accepted format: Plain text matching an existing configuration set name exactly.

Real workplace example: "transactional-emails-tracked" for a configuration set that forwards bounce and complaint events to an SNS topic monitored by the ops team.

If it is empty or wrong: Left empty, the email still sends normally with no configuration-set-based tracking. A name that does not exist in SES causes the AWS API call itself to fail (surfaced as a send-time error, not a pre-flight _error).

Common mistake: Expecting this field to control retry behavior or delivery speed — it only affects event tracking/analytics, not how or whether the email is delivered.`;

const tagsHelpText = `What this field means: Tags attaches Name/Value labels to this specific email send, used by Amazon SES (together with a configuration set) for filtering and reporting in CloudWatch metrics.

Why it matters: Tags let you slice SES delivery metrics by campaign, department, or email type without needing a separate configuration set per category.

When to fill it: Optional. Fill it when you want this send's metrics grouped or filtered in AWS CloudWatch.

What to enter: A JSON object of simple key/value pairs; each pair becomes one SES message tag.

Where the value comes from: Decide tag categories that matter for your reporting, such as campaign name or email type, or map a value from an earlier step such as {{$json.campaignId}}.

How to use it later: Not echoed back in this node's own output — tags only affect how AWS SES records and reports on the send internally.

Accepted format: A flat JSON object such as {"campaign": "newsletter", "type": "promotional"}. Values are converted to plain strings automatically.

Real workplace example: {"campaign": "black-friday-2026", "department": "marketing"} to separate this campaign's delivery metrics from transactional email metrics in CloudWatch.

If it is empty or wrong: Left empty, the email sends normally with no tags attached — there is no error either way, since this field is optional.

Common mistake: Confusing SES message Tags (internal AWS metrics labels) with recipient-facing content — tags are never visible to the email's recipient.`;

const returnPathHelpText = `What this field means: Return Path is the address Amazon SES uses as the technical bounce-handling address (the envelope-from / MAIL FROM address) for this email.

Why it matters: When a recipient's mailbox rejects or bounces the email, the bounce notification is delivered to this address instead of the visible From Address — useful for automated bounce processing separate from the sender identity recipients see.

When to fill it: Optional. Fill it only when bounces for this send need to route somewhere other than AWS SES's own default bounce handling.

What to enter: A verified email address dedicated to receiving bounce notifications.

Where the value comes from: AWS Console → Amazon SES → Verified identities — this address generally needs its own SES verification, the same as From Address.

How to use it later: Not echoed back in this node's own output.

Accepted format: A single valid email address, for example bounces@example.com.

Real workplace example: bounces@yourcompany.com routed to an internal mailbox or automated bounce-processing system, separate from the noreply@ address recipients see.

If it is empty or wrong: Left empty, Amazon SES uses its own default bounce-handling behavior for the From Address — there is no error either way, since this field is optional. An unverified Return Path address can cause AWS-side bounce-handling issues even though this node does not validate it directly.

Common mistake: Setting Return Path to an address that was never verified in AWS SES, silently breaking bounce delivery without producing a visible workflow error.`;

export const amazonSesDoc: NodeDoc = {
  slug: 'amazon_ses',
  displayName: 'Amazon SES',
  category: 'Communication',
  logoUrl: '/integrations-logos/Amazon-SES.svg',
  description: 'Send transactional or templated emails through Amazon Simple Email Service (SES) using a saved AWS Access Key connection, with automatic retry on temporary AWS errors.',
  credentialType: 'Amazon SES Access Key',
  credentialSetupSteps: [
    'What this is: The Amazon SES Access Key connection lets CtrlChecks sign AWS SES API requests on your behalf, without ever putting your AWS secret key in a normal workflow field.',
    'Prerequisites: an AWS account with Amazon SES enabled in the region you plan to use, a verified sender identity (email or domain) for the From Address this workflow will send from, and permission to create an IAM user or access key.',
    'How to connect: AWS Console → IAM → create or choose a user for CtrlChecks sending → attach minimal SES permissions such as ses:SendEmail, ses:SendRawEmail, and ses:GetTemplate → open that user\'s Security credentials tab → Create access key (for an application running outside AWS) → copy the Access Key ID and Secret Access Key immediately, since the secret is shown only once.',
    'In CtrlChecks: open Connections → Add Connection → Amazon SES Access Key, then paste the Access Key ID (20 characters), Secret Access Key (40 characters, shown once by AWS), and the SES Region (for example us-east-1) where your verified identities and templates live.',
    'Important: treat the Access Key ID and Secret Access Key like a bank password. Store them only in Connections — never paste them into the Recipients, Subject, Body, or any other normal workflow field. If a key is ever pasted somewhere outside Connections, rotate it in AWS IAM immediately.',
    'Test it: save the connection, select it on an Amazon SES node with a verified From Address, run a simple send, and confirm the node returns success: true with a messageId.',
    'Downstream service node account connections are separate: connecting Amazon SES only authorizes this node\'s email send — any node after it in the workflow still needs its own account connection and permissions for its own outgoing line of work.',
  ],
  credentialDocsUrl: 'https://docs.aws.amazon.com/ses/latest/dg/security-iam.html',
  resources: [
    {
      name: 'Configuration',
      description: 'Amazon SES has a single send operation, configured directly with input fields — there is no separate resource/operation dropdown, unlike multi-resource nodes such as Google Calendar.',
      operations: [
        {
          name: 'Send Email',
          value: 'default',
          description: 'Sends one email via Amazon Simple Email Service (SES), either as raw Subject/Body content or by populating an existing AWS SES template, with automatic retry on temporary AWS errors such as throttling.',
          fields: [
            {
              name: 'Recipients',
              internalKey: 'recipients',
              type: 'json',
              required: true,
              description: 'Email recipients (To, Cc, Bcc)',
              helpText: recipientsHelpText,
              placeholder: '{"to": ["user@example.com"], "cc": [], "bcc": []}',
              example: '{"to":["user@example.com"]}',
            },
            {
              name: 'Subject',
              internalKey: 'subject',
              type: 'string',
              required: false,
              description: 'Email subject line (required when not using an AWS SES template)',
              helpText: subjectHelpText,
              placeholder: 'Order Confirmation',
              example: 'Order Confirmation',
              notes: 'Only shown and used when Use AWS SES Template is off.',
            },
            {
              name: 'Body',
              internalKey: 'body',
              type: 'textarea',
              required: false,
              description: 'Email body content, sent as both the HTML and plain-text parts (required when not using an AWS SES template)',
              helpText: bodyHelpText,
              placeholder: 'Hello {{$json.name}}, your order is confirmed.',
              example: 'Hello {{$json.name}}, your order is confirmed.',
              notes: 'Only shown and used when Use AWS SES Template is off.',
            },
            {
              name: 'Use AWS SES Template',
              internalKey: 'useTemplate',
              type: 'boolean',
              required: false,
              description: 'Use an existing AWS SES template instead of the Subject and Body fields',
              helpText: useTemplateHelpText,
              placeholder: 'false',
              example: 'false',
              defaultValue: 'false',
            },
            {
              name: 'Template Name',
              internalKey: 'templateName',
              type: 'string',
              required: false,
              description: 'AWS SES template name (required if Use AWS SES Template is true)',
              helpText: templateNameHelpText,
              placeholder: 'OrderConfirmation',
              example: 'OrderConfirmation',
              notes: 'Only shown and used when Use AWS SES Template is on.',
            },
            {
              name: 'Template Data',
              internalKey: 'templateData',
              type: 'json',
              required: false,
              description: 'Template variables as a JSON object, matched to the template\'s own {{placeholders}}',
              helpText: templateDataHelpText,
              placeholder: '{"name": "John", "orderId": "12345"}',
              example: '{"name":"John","orderId":"12345"}',
              notes: 'Only used when Use AWS SES Template is on and the template contains placeholders.',
            },
            {
              name: 'From Address',
              internalKey: 'fromAddress',
              type: 'email',
              required: true,
              description: 'Sender email address (must be verified in SES)',
              helpText: fromAddressHelpText,
              placeholder: 'noreply@example.com',
              example: 'noreply@example.com',
            },
            {
              name: 'Reply-To Addresses',
              internalKey: 'replyToAddresses',
              type: 'json',
              required: false,
              description: 'Reply-to email addresses',
              helpText: replyToAddressesHelpText,
              placeholder: '["support@example.com"]',
              example: '["support@example.com"]',
            },
            {
              name: 'Attachments',
              internalKey: 'attachments',
              type: 'json',
              required: false,
              description: 'Email attachments (filename, base64 content, content type)',
              helpText: attachmentsHelpText,
              placeholder: '[{"filename": "report.pdf", "content": "{{$json.pdfContent}}", "contentType": "application/pdf"}]',
              example: '[{"filename":"report.pdf","content":"JVBERi0xLjQ...","contentType":"application/pdf"}]',
            },
            {
              name: 'AWS Region',
              internalKey: 'awsRegion',
              type: 'select',
              required: false,
              description: 'AWS region for the SES service — where your verified identities, templates, and configuration sets exist',
              helpText: awsRegionHelpText,
              placeholder: 'us-east-1',
              example: 'us-east-1',
              defaultValue: 'us-east-1',
              options: ['us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1', 'ap-southeast-2'],
            },
            {
              name: 'Configuration Set Name',
              internalKey: 'configurationSetName',
              type: 'string',
              required: false,
              description: 'SES configuration set for delivery event tracking',
              helpText: configurationSetNameHelpText,
              placeholder: 'my-config-set',
              example: 'my-config-set',
            },
            {
              name: 'Tags',
              internalKey: 'tags',
              type: 'json',
              required: false,
              description: 'SES message tags for CloudWatch filtering and reporting',
              helpText: tagsHelpText,
              placeholder: '{"campaign": "newsletter", "type": "promotional"}',
              example: '{"campaign":"newsletter","type":"promotional"}',
            },
            {
              name: 'Return Path',
              internalKey: 'returnPath',
              type: 'email',
              required: false,
              description: 'Bounce-handling (envelope-from) email address',
              helpText: returnPathHelpText,
              placeholder: 'bounces@example.com',
              example: 'bounces@example.com',
            },
          ],
          outputExample: {
            success: true,
            messageId: '0102018e2b3c7abc-def1234-5678-90ab-cdef12345678-000000',
            recipientCount: 2,
            failedRecipients: [],
            attempts: 1,
            timestamp: '2026-07-18T09:15:00.000Z',
          },
          outputDescription: 'On success: success is true, messageId is the AWS SES message ID for tracking in the SES console, recipientCount is the total number of To+Cc+Bcc addresses the call was sent to, failedRecipients is always an empty array (Amazon SES SendEmail/SendRawEmail either accepts or rejects the entire call — there is no partial per-recipient result to report), attempts shows how many tries the automatic retry logic needed (1 unless a temporary AWS error was retried), and timestamp is when the node finished. On failure, the shape differs by cause: field-validation problems (missing recipients, missing subject/body, invalid attachment, bad credential format) return success: false plus an _error string and no messageId/recipientCount. Actual AWS SES API failures (unverified sender, message rejected, rate limiting, and also a missing/unfound AWS connection) return success: false plus a plain error string (not _error), along with errorCode, errorType ("temporary" or "permanent"), retryable, and a details object — so a downstream node checking only {{$json._error}} will miss AWS-side send failures and must also check {{$json.error}}.',
          usageExample: {
            scenario: 'Send an order-confirmation email to a customer right after a checkout workflow step, using values captured from the order.',
            inputValues: {
              recipients: '{"to": ["{{$json.customerEmail}}"]}',
              fromAddress: 'orders@yourcompany.com',
              subject: 'Order {{$json.orderId}} Confirmation',
              body: 'Hi {{$json.customerName}}, your order {{$json.orderId}} for ${{$json.orderTotal}} is confirmed.',
            },
            expectedOutput: 'The email is sent via Amazon SES. Use {{$json.success}} to branch on delivery in the next node, and {{$json.messageId}} to look the send up later in the SES console.',
          },
          externalDocsUrl: 'https://docs.aws.amazon.com/ses/latest/APIReference/Welcome.html',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'AWS credential retrieval failed: AWS credentials not found',
      cause: 'No AWS connection is selected on this node, and no valid credential was found in the vault for either the "aws" or "amazon_ses" credential type.',
      fix: 'Open Connections, add an Amazon SES Access Key connection with a valid Access Key ID and Secret Access Key, then select it on this node. This failure surfaces via the plain error field (not _error) — check {{$json.error}}, not just {{$json._error}}.',
    },
    {
      error: 'AWS credential validation failed: Access Key ID / Secret Access Key format invalid',
      cause: 'The saved connection\'s Access Key ID is not exactly 20 alphanumeric characters, or the Secret Access Key is not 40 base64-like characters — usually a copy/paste error when saving the connection.',
      fix: 'Re-copy the Access Key ID and Secret Access Key from AWS IAM → Security credentials without extra whitespace or truncation, and re-save the Connections entry.',
    },
    {
      error: 'Email subject is required / Email body (HTML or text) is required',
      cause: 'Use AWS SES Template is off, but Subject or Body resolved to an empty string after expressions were evaluated.',
      fix: 'Fill Subject and Body with fixed text or a valid {{$json.field}} expression, and confirm the upstream node actually produced that field.',
    },
    {
      error: 'At least one recipient (To, Cc, or Bcc) is required / Invalid email addresses',
      cause: 'Recipients resolved to an object with no addresses in to/cc/bcc, or one of the addresses failed basic email-format validation.',
      fix: 'Check the upstream data that Recipients maps from, and confirm it produces a JSON object like {"to": ["name@example.com"]} with valid addresses.',
    },
    {
      error: "AWS SES template '...' not found / Template data validation failed",
      cause: 'Use AWS SES Template is on, but the template name does not exist in the selected AWS Region, or Template Data is missing a variable the template actually uses.',
      fix: 'Confirm the template exists in AWS Console → Amazon SES → Email templates for the exact AWS Region set on this node, and fill every {{placeholder}} the template defines in Template Data.',
    },
    {
      error: 'Attachment format/size validation failed',
      cause: 'An attachment used an unsupported file type, its extension did not match its declared contentType, or the total email size (subject + body + attachments) exceeded Amazon SES\'s 40MB limit.',
      fix: 'Use only supported types (PDF, Word, Excel, common images, text/CSV, ZIP), make sure filename and contentType match, and reduce attachment size or split into multiple emails.',
    },
    {
      error: 'Sender email is not verified in AWS SES / Email was rejected by AWS SES',
      cause: 'The From Address (or Return Path) is not a verified identity in AWS SES for the selected region, or AWS SES itself rejected the message content.',
      fix: 'Verify the sending address or domain in AWS Console → Amazon SES → Verified identities for the same AWS Region configured on this node, then re-run the workflow. This is a send-time AWS failure — it appears in {{$json.error}}, not {{$json._error}}.',
    },
    {
      error: 'Temporary AWS SES error (rate limiting / throttling)',
      cause: 'AWS SES is rate-limiting the account or returned a temporary/unavailable response; the node automatically retries up to 3 times with exponential backoff before giving up.',
      fix: 'If it still fails after automatic retries, reduce send volume, request an Amazon SES sending-rate increase from AWS Support, or re-run the workflow later.',
    },
    {
      error: 'Next node cannot find the send result',
      cause: 'A downstream node is reading a field name that this node never produces, such as MessageId (capitalized) or a nested ResponseMetadata object.',
      fix: 'Use the real lowercase output fields: {{$json.success}}, {{$json.messageId}}, {{$json.recipientCount}}, and check both {{$json._error}} and {{$json.error}} for failures.',
    },
    {
      error: 'Permission denied after Amazon SES',
      cause: 'The Amazon SES connection only authorizes sending email through your SES account — it does not grant any access to whatever service a later node in the workflow talks to.',
      fix: 'Connect the required account separately on each downstream service node and confirm that node\'s own permissions.',
    },
  ],
  relatedNodes: ['email', 'sendgrid', 'mailgun', 'http_request'],
};
