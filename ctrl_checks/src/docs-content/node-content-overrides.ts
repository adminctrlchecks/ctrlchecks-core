/**
 * Quality content overrides for every node and operation.
 * The docs generator merges these into the generated .doc.ts files.
 */

export interface OperationOverride {
  description?: string;
  outputExample?: Record<string, unknown>;
  outputDescription?: string;
  usageExample?: {
    scenario: string;
    inputValues: Record<string, string>;
    expectedOutput: string;
  };
}

/** Key: nodeSlug. Value: map of operationValue → overrides. Use 'default' for single-op nodes. */
export const nodeContentOverrides: Record<string, Record<string, OperationOverride>> = {

  // ─── TRIGGERS ─────────────────────────────────────────────────────────────

  schedule: {
    default: {
      description: 'Start the workflow automatically on a defined cron schedule.',
      outputExample: { scheduledTime: '2025-01-15T09:00:00.000Z', timezone: 'UTC', cronExpression: '0 9 * * 1-5' },
      outputDescription: 'scheduledTime: ISO timestamp when the trigger fired. timezone: The schedule timezone. cronExpression: The cron expression that matched.',
      usageExample: {
        scenario: 'Send a daily summary email every weekday at 9 AM',
        inputValues: { cronExpression: '0 9 * * 1-5', timezone: 'America/New_York' },
        expectedOutput: 'The workflow fires at 9 AM Mon–Fri. Connect a Gmail Send node downstream to send the email.',
      },
    },
  },

  webhook: {
    default: {
      description: 'Start the workflow when an HTTP request hits the generated webhook URL.',
      outputExample: { body: { event: 'user.created', userId: 'u_123', email: 'alice@example.com' }, headers: { 'content-type': 'application/json' }, method: 'POST', query: {} },
      outputDescription: 'body: The parsed request body sent by the caller. headers: HTTP headers from the request. method: HTTP method used (POST, GET, etc.). query: URL query parameters.',
      usageExample: {
        scenario: 'Receive a Stripe payment webhook and store the order in a database',
        inputValues: { method: 'POST', path: '/webhooks/stripe-payment' },
        expectedOutput: 'The workflow receives `{{$json.body.type}}` (e.g. payment_intent.succeeded) and `{{$json.body.data.object.amount}}` from Stripe.',
      },
    },
  },

  manual_trigger: {
    default: {
      description: 'Start the workflow when you click the "Run" button in CtrlChecks.',
      outputExample: { executedAt: '2025-01-15T14:30:00.000Z', triggeredBy: 'manual', workflowId: 'wf_abc123' },
      outputDescription: 'executedAt: ISO timestamp of the manual run. triggeredBy: Always "manual" for this trigger. workflowId: The current workflow ID.',
      usageExample: {
        scenario: 'Manually run a data migration workflow on demand',
        inputValues: {},
        expectedOutput: 'The workflow starts immediately. Use this trigger when testing or running one-off automation tasks.',
      },
    },
  },

  interval: {
    default: {
      description: 'Start the workflow at a fixed time interval (e.g. every 5 minutes).',
      outputExample: { firedAt: '2025-01-15T10:05:00.000Z', intervalMs: 300000, iteration: 42 },
      outputDescription: 'firedAt: ISO timestamp when this iteration fired. intervalMs: The configured interval in milliseconds. iteration: How many times this trigger has fired.',
      usageExample: {
        scenario: 'Poll an external API every 5 minutes for new records',
        inputValues: { interval: '300000', unit: 'milliseconds' },
        expectedOutput: 'The workflow fires every 5 minutes. Connect an HTTP Request node to fetch the API data on each run.',
      },
    },
  },

  chat_trigger: {
    default: {
      description: 'Start the workflow when a user sends a chat message in the CtrlChecks chat interface.',
      outputExample: { message: 'What is the status of order #1234?', sessionId: 'sess_xyz', userId: 'user_42', timestamp: '2025-01-15T11:00:00.000Z' },
      outputDescription: 'message: The text typed by the user. sessionId: The current chat session ID. userId: The user who sent the message. timestamp: When the message was sent.',
      usageExample: {
        scenario: 'Build a customer support chatbot that answers order status queries',
        inputValues: {},
        expectedOutput: 'Use `{{$json.message}}` in a downstream AI Agent or HTTP Request node to process the user\'s question.',
      },
    },
  },

  form: {
    default: {
      description: 'Start the workflow when a user submits a CtrlChecks form.',
      outputExample: { formData: { name: 'Alice', email: 'alice@example.com', message: 'I need help with billing.' }, submittedAt: '2025-01-15T09:45:00.000Z', formId: 'form_xyz' },
      outputDescription: 'formData: Key-value pairs of form field names and the submitted values. submittedAt: ISO timestamp of the form submission. formId: The ID of the form that was submitted.',
      usageExample: {
        scenario: 'Send a welcome email after a contact form submission',
        inputValues: {},
        expectedOutput: 'Access submitted fields via `{{$json.formData.email}}`, `{{$json.formData.name}}`, etc. Connect a Gmail Send node to respond to the submitter.',
      },
    },
  },

  error_trigger: {
    default: {
      description: 'Start the workflow when another workflow encounters an unhandled error.',
      outputExample: { error: { message: 'Request timeout after 10000ms', code: 'TIMEOUT', stack: '...' }, failedWorkflowId: 'wf_abc', failedNodeId: 'node_3', timestamp: '2025-01-15T12:00:00.000Z' },
      outputDescription: 'error.message: The error message from the failed node. error.code: The error code if available. failedWorkflowId: The ID of the workflow that failed. failedNodeId: The specific node that threw the error.',
      usageExample: {
        scenario: 'Send a Slack alert whenever any workflow fails',
        inputValues: {},
        expectedOutput: 'Use `{{$json.error.message}}` and `{{$json.failedWorkflowId}}` in a Slack Message node to alert your team.',
      },
    },
  },

  workflow_trigger: {
    default: {
      description: 'Start the workflow when called by an Execute Workflow node in another workflow.',
      outputExample: { inputData: { userId: 'u_456', action: 'send_report' }, callerWorkflowId: 'wf_parent', calledAt: '2025-01-15T13:00:00.000Z' },
      outputDescription: 'inputData: The data passed from the Execute Workflow node in the parent workflow. callerWorkflowId: The ID of the parent workflow that triggered this one.',
      usageExample: {
        scenario: 'Create a reusable "send notification" sub-workflow that other workflows call',
        inputValues: {},
        expectedOutput: 'Access passed data via `{{$json.inputData.userId}}` etc. The parent workflow continues after this sub-workflow completes.',
      },
    },
  },

  // ─── COMMUNICATION ────────────────────────────────────────────────────────

  google_gmail: {
    send: {
      description: 'Send an email to one or more recipients via Gmail.',
      outputExample: { messageId: '18abc123def456', threadId: '18abc123def456', labelIds: ['SENT'] },
      outputDescription: 'messageId: Unique Gmail message ID — use this to reference the sent message. threadId: The email thread ID. labelIds: Gmail labels applied to the sent message.',
      usageExample: {
        scenario: 'Send a personalised welcome email to a new user after form sign-up',
        inputValues: { recipientEmails: '{{$json.email}}', subject: 'Welcome to CtrlChecks, {{$json.name}}!', body: 'Hi {{$json.name}},\n\nYour account is ready. Visit your dashboard to get started.\n\nCheers,\nThe CtrlChecks Team' },
        expectedOutput: 'The email is delivered to the recipient. `{{$json.messageId}}` is available for logging or referencing in a downstream database write.',
      },
    },
    list: {
      description: 'List email messages from the connected Gmail inbox, optionally filtered by a query.',
      outputExample: { messages: [{ id: '18abc1', threadId: '18abc1', snippet: 'Hi, I have a question about...' }, { id: '18abc2', threadId: '18abc2', snippet: 'Your invoice for January...' }], resultSizeEstimate: 2 },
      outputDescription: 'messages: Array of message objects. Each has id, threadId, and snippet. resultSizeEstimate: Approximate total number of matching messages.',
      usageExample: {
        scenario: 'Fetch unread support emails and create Jira tickets for each',
        inputValues: { query: 'is:unread label:support', maxResults: '10' },
        expectedOutput: 'Returns up to 10 unread emails. Loop over `{{$json.messages}}` and use each message id in a Gmail Get node to fetch the full content.',
      },
    },
    get: {
      description: 'Fetch the full content of a specific Gmail message by its ID.',
      outputExample: { id: '18abc123', subject: 'Invoice #1234', from: 'billing@vendor.com', to: 'me@company.com', body: 'Please find attached your invoice for January.', date: '2025-01-15T08:00:00Z' },
      outputDescription: 'id: The Gmail message ID. subject: Email subject. from: Sender address. to: Recipient address. body: Full email body text. date: When the email was received.',
      usageExample: {
        scenario: 'Read the full body of each email returned by a Gmail List node',
        inputValues: { messageId: '{{$json.id}}' },
        expectedOutput: 'Returns the full message with body text. Use `{{$json.body}}` in a downstream AI or text processing node.',
      },
    },
    search: {
      description: 'Search Gmail messages using Gmail search syntax (same as the Gmail search bar).',
      outputExample: { messages: [{ id: '18abc9', threadId: '18abc9', snippet: 'Your order has shipped...' }], resultSizeEstimate: 1 },
      outputDescription: 'messages: Array of messages matching the search query. resultSizeEstimate: Approximate total matches.',
      usageExample: {
        scenario: 'Find all emails from a specific sender in the last 7 days',
        inputValues: { query: 'from:vendor@example.com newer_than:7d', maxResults: '25' },
        expectedOutput: 'Returns messages matching the query. Process each result with a Gmail Get node to access the full email content.',
      },
    },
  },

  outlook: {
    send: {
      description: 'Send an email via Microsoft Outlook.',
      outputExample: { id: 'AAMkAGI...', subject: 'Meeting Tomorrow', sentDateTime: '2025-01-15T09:00:00Z' },
      outputDescription: 'id: Outlook message ID. subject: Subject of the sent email. sentDateTime: ISO timestamp when it was sent.',
      usageExample: {
        scenario: 'Send a daily digest email to your team via Outlook',
        inputValues: { toRecipients: 'team@company.com', subject: 'Daily Digest — {{$now}}', body: '{{$json.digestContent}}' },
        expectedOutput: 'The email is sent. `{{$json.id}}` can be used to track the message.',
      },
    },
    list: {
      description: 'List emails from an Outlook mailbox folder.',
      outputExample: { value: [{ id: 'AAMkAGI...', subject: 'Re: Project Update', from: { emailAddress: { address: 'colleague@company.com' } } }] },
      outputDescription: 'value: Array of email objects. Each has id, subject, from (with address), and more.',
      usageExample: {
        scenario: 'Retrieve unread emails from a specific Outlook folder',
        inputValues: { folder: 'Inbox', filter: 'isRead eq false', top: '20' },
        expectedOutput: 'Returns up to 20 unread emails. Process each with the Get operation to read the full body.',
      },
    },
    get: {
      description: 'Fetch a specific Outlook email by its message ID.',
      outputExample: { id: 'AAMkAGI...', subject: 'Contract Terms', body: { content: 'Please review the attached contract.' }, receivedDateTime: '2025-01-14T15:00:00Z' },
      outputDescription: 'id: Outlook message ID. subject: Email subject. body.content: Full email body HTML or text. receivedDateTime: When the email was received.',
      usageExample: {
        scenario: 'Read each email returned from an Outlook List operation',
        inputValues: { messageId: '{{$json.id}}' },
        expectedOutput: 'Full message with body content. Use `{{$json.body.content}}` downstream.',
      },
    },
  },

  slack_message: {
    default: {
      description: 'Send a message to a Slack channel or direct message.',
      outputExample: { ok: true, ts: '1704067200.123456', channel: 'C01234ABCDE', message: { text: 'Deployment complete ✅', user: 'U01234' } },
      outputDescription: 'ok: true if the message was sent successfully. ts: Message timestamp (Slack message ID). channel: The channel ID where the message was sent. message.text: The message text that was posted.',
      usageExample: {
        scenario: 'Alert the #deployments channel when a workflow completes or fails',
        inputValues: { channel: '#deployments', text: '✅ Deploy complete for `{{$json.version}}` at {{$now}}' },
        expectedOutput: 'The message appears in the specified channel. Use `{{$json.ts}}` to reference or thread the message later.',
      },
    },
  },

  email: {
    default: {
      description: 'Send an email via SMTP using custom server credentials.',
      outputExample: { accepted: ['recipient@example.com'], rejected: [], response: '250 Message queued', messageId: '<abc@smtp.example.com>' },
      outputDescription: 'accepted: List of email addresses that accepted the message. rejected: Addresses rejected by the server. response: SMTP server response. messageId: The SMTP message ID.',
      usageExample: {
        scenario: 'Send transactional emails via your own SMTP server (e.g. a company mail relay)',
        inputValues: { to: '{{$json.email}}', subject: 'Password Reset', html: '<p>Click <a href="{{$json.resetLink}}">here</a> to reset your password.</p>' },
        expectedOutput: 'Email is delivered. Check `accepted` to confirm delivery was accepted by the server.',
      },
    },
  },

  log_output: {
    default: {
      description: 'Write a log message to the CtrlChecks execution log for debugging and monitoring. This is a terminal node — it cannot connect to further downstream nodes.',
      outputExample: { message: 'Processed 42 rows from orders_table' },
      outputDescription: 'message: The resolved log text, with any {{...}} template expressions substituted — this is the entire output value (a plain string, not an object with separate fields). Because log_output is a terminal node with no outgoing edges, this value is not forwarded to any further node; it is recorded in the execution history only.',
      usageExample: {
        scenario: 'Log progress checkpoints in a long-running data pipeline',
        inputValues: { message: 'Processed {{$json.rowCount}} rows from {{$json.tableName}}', level: 'info' },
        expectedOutput: 'The message appears in the workflow execution log. Useful for debugging without halting the workflow.',
      },
    },
  },

  telegram: {
    default: {
      description: 'Send a message to a Telegram chat, group, or channel via a bot.',
      outputExample: { ok: true, result: { message_id: 101, from: { username: 'my_bot' }, chat: { id: -100123456 }, text: 'Alert: server CPU above 90%' } },
      outputDescription: 'ok: true if message was sent. result.message_id: Telegram message ID. result.chat.id: The chat ID the message was sent to. result.text: The message text.',
      usageExample: {
        scenario: 'Send a server alert to a monitoring group when CPU exceeds a threshold',
        inputValues: { chatId: '-100123456', text: '🚨 Alert: {{$json.serverName}} CPU is {{$json.cpuPercent}}%\nTime: {{$now}}' },
        expectedOutput: 'Message appears in the Telegram chat. Use `{{$json.result.message_id}}` to track or reply to the message.',
      },
    },
  },

  linkedin: {
    post: {
      description: 'Publish a post to LinkedIn on behalf of the authenticated user or company page.',
      outputExample: { id: 'urn:li:share:123456789', activity: 'urn:li:activity:987654321', created: true },
      outputDescription: 'id: The LinkedIn share URN. activity: The LinkedIn activity URN. created: true if the post was published successfully.',
      usageExample: {
        scenario: 'Auto-post blog article announcements to your company LinkedIn page',
        inputValues: { text: '📢 New article: "{{$json.title}}"\n\n{{$json.summary}}\n\nRead more: {{$json.url}}', visibility: 'PUBLIC' },
        expectedOutput: 'The post appears on LinkedIn. `{{$json.id}}` can be used to track engagement.',
      },
    },
    get: {
      description: 'Get the LinkedIn profile of the authenticated user.',
      outputExample: { id: 'urn:li:person:abc123', firstName: { localized: { en_US: 'Alice' } }, lastName: { localized: { en_US: 'Smith' } }, headline: 'CTO at CtrlChecks' },
      outputDescription: 'id: LinkedIn person URN. firstName / lastName: Localized name objects. headline: The profile headline.',
      usageExample: {
        scenario: 'Retrieve the authenticated user\'s LinkedIn profile to personalise an email',
        inputValues: {},
        expectedOutput: 'Returns profile data. Access name via `{{$json.firstName.localized.en_US}}`.',
      },
    },
  },

  twitter: {
    tweet: {
      description: 'Post a new tweet to the authenticated Twitter/X account.',
      outputExample: { data: { id: '1749876543210', text: 'We just launched 🚀 Check it out: https://example.com', edit_history_tweet_ids: ['1749876543210'] } },
      outputDescription: 'data.id: The tweet ID. data.text: The full text of the tweet posted.',
      usageExample: {
        scenario: 'Auto-post a tweet when a new product is published',
        inputValues: { text: '🆕 {{$json.productName}} is now live!\n\n{{$json.description}}\n\nhttps://example.com/products/{{$json.slug}}' },
        expectedOutput: 'The tweet is posted. Use `{{$json.data.id}}` to link back to the tweet.',
      },
    },
    get: {
      description: 'Fetch a specific tweet by its ID.',
      outputExample: { data: { id: '1749876543210', text: 'Hello world!', public_metrics: { retweet_count: 5, like_count: 42 } } },
      outputDescription: 'data.id: The tweet ID. data.text: Tweet text. data.public_metrics: Engagement counts (likes, retweets, replies).',
      usageExample: {
        scenario: 'Fetch engagement metrics for a specific tweet to track campaign performance',
        inputValues: { tweetId: '{{$json.tweetId}}' },
        expectedOutput: 'Returns the tweet with `{{$json.data.public_metrics.like_count}}` likes and `{{$json.data.public_metrics.retweet_count}}` retweets.',
      },
    },
  },

  instagram: {
    post: {
      description: 'Publish an image or video post to Instagram.',
      outputExample: { id: '17858893269000001', status: 'PUBLISHED' },
      outputDescription: 'id: Instagram media ID of the published post. status: PUBLISHED if the post went live.',
      usageExample: {
        scenario: 'Auto-post product images to Instagram when a new item is added to Shopify',
        inputValues: { imageUrl: '{{$json.image_url}}', caption: '✨ New arrival: {{$json.title}}\n\nShop now ↗️ link in bio\n\n#newproduct #shop' },
        expectedOutput: 'The image is posted. `{{$json.id}}` can be used to fetch post insights later.',
      },
    },
    get: {
      description: 'Get details about an Instagram media post.',
      outputExample: { id: '17858893269000001', caption: '✨ New arrival...', like_count: 124, comments_count: 7, timestamp: '2025-01-15T12:00:00+0000' },
      outputDescription: 'id: Media ID. caption: Post caption. like_count: Number of likes. comments_count: Number of comments. timestamp: When the post was published.',
      usageExample: {
        scenario: 'Track post engagement metrics after publishing',
        inputValues: { mediaId: '{{$json.id}}' },
        expectedOutput: 'Returns post insights with `{{$json.like_count}}` and `{{$json.comments_count}}`.',
      },
    },
  },

  discord: {
    default: {
      description: 'Send a message to a Discord channel via a bot.',
      outputExample: { id: '1234567890123456789', channelId: '9876543210987654321', content: 'Build #42 passed ✅', timestamp: '2025-01-15T11:00:00.000000+00:00' },
      outputDescription: 'id: Discord message ID. channelId: The channel it was sent to. content: The message text. timestamp: When the message was sent.',
      usageExample: {
        scenario: 'Post CI/CD build status to a #ci-notifications Discord channel',
        inputValues: { channelId: '{{$env.DISCORD_CI_CHANNEL_ID}}', message: '{{$json.status === "pass" ? "✅" : "❌"}} Build #{{$json.buildNumber}} — {{$json.status}}' },
        expectedOutput: 'Message appears in the Discord channel. Use `{{$json.id}}` to track or edit the message.',
      },
    },
  },

  zoom_video: {
    create: {
      description: 'Create a new Zoom meeting and get the join link.',
      outputExample: { id: 81234567890, uuid: 'abcdef...', topic: 'Q4 Planning', start_url: 'https://zoom.us/s/81234567890', join_url: 'https://zoom.us/j/81234567890', start_time: '2025-01-20T14:00:00Z' },
      outputDescription: 'id: Zoom meeting ID. join_url: The URL to share with attendees. start_url: The host link to start the meeting. start_time: Scheduled start time.',
      usageExample: {
        scenario: 'Create a Zoom meeting when a calendly event is booked',
        inputValues: { topic: '{{$json.eventName}} with {{$json.inviteeName}}', startTime: '{{$json.startTime}}', duration: '60' },
        expectedOutput: 'Meeting is created. Share `{{$json.join_url}}` with attendees via a Slack or email node.',
      },
    },
  },

  microsoft_teams: {
    default: {
      description: 'Send a message to a Microsoft Teams channel or chat.',
      outputExample: { id: '1705123456789', etag: '1705123456789', type: 'message', createdDateTime: '2025-01-15T10:00:00Z', body: { content: 'Sprint completed ✅' } },
      outputDescription: 'id: Teams message ID. createdDateTime: When the message was created. body.content: The message text.',
      usageExample: {
        scenario: 'Post a sprint completion summary to a Teams channel',
        inputValues: { teamId: '{{$env.TEAMS_TEAM_ID}}', channelId: '{{$env.TEAMS_CHANNEL_ID}}', message: '🏁 Sprint {{$json.sprintName}} completed!\n\n**Delivered:** {{$json.storiesCompleted}} stories\n**Velocity:** {{$json.velocity}} points' },
        expectedOutput: 'The message is posted in Teams. Use `{{$json.id}}` to reply or reference the message.',
      },
    },
  },

  whatsapp_cloud: {
    default: {
      description: 'Send a WhatsApp message via the Meta WhatsApp Cloud API.',
      outputExample: { messaging_product: 'whatsapp', contacts: [{ input: '+1234567890', wa_id: '1234567890' }], messages: [{ id: 'wamid.abc123' }] },
      outputDescription: 'contacts: Array of recipient contact objects. messages[0].id: The WhatsApp message ID.',
      usageExample: {
        scenario: 'Send an order confirmation via WhatsApp after a Shopify purchase',
        inputValues: { to: '{{$json.customerPhone}}', text: 'Hi {{$json.customerName}} 👋 Your order #{{$json.orderId}} has been confirmed! Expected delivery: {{$json.deliveryDate}}.' },
        expectedOutput: 'WhatsApp message is delivered. Track delivery status using the message ID.',
      },
    },
  },

  twilio: {
    default: {
      description: 'Send an SMS message via Twilio.',
      outputExample: { sid: 'SM1234abcd5678efgh', status: 'queued', to: '+15551234567', from: '+15559876543', body: 'Your verification code is 4821.' },
      outputDescription: 'sid: Twilio message SID for tracking. status: Message delivery status (queued, sent, delivered, failed). to / from: Recipient and sender phone numbers.',
      usageExample: {
        scenario: 'Send a 2FA SMS verification code to a user who is logging in',
        inputValues: { to: '{{$json.phoneNumber}}', body: 'Your CtrlChecks verification code is {{$json.otpCode}}. Expires in 10 minutes.' },
        expectedOutput: 'SMS is queued. Use `{{$json.sid}}` to check delivery status via the Twilio console.',
      },
    },
  },

  mailgun: {
    default: {
      description: 'Send a transactional email via Mailgun.',
      outputExample: { id: '<20250115.abc123@mg.example.com>', message: 'Queued. Thank you.' },
      outputDescription: 'id: Mailgun message ID for tracking. message: Confirmation from Mailgun.',
      usageExample: {
        scenario: 'Send a password reset email using Mailgun',
        inputValues: { from: 'noreply@yourapp.com', to: '{{$json.email}}', subject: 'Reset your password', html: '<p>Click <a href="{{$json.resetUrl}}">here</a> to reset your password. Link expires in 1 hour.</p>' },
        expectedOutput: 'Email is queued by Mailgun. Track delivery in the Mailgun logs using `{{$json.id}}`.',
      },
    },
  },

  sendgrid: {
    default: {
      description: 'Send a transactional or marketing email via SendGrid.',
      outputExample: { statusCode: 202, body: '', headers: { 'x-message-id': 'ABC123' } },
      outputDescription: 'statusCode: HTTP 202 means the message was accepted. headers[x-message-id]: SendGrid message ID for tracking in the SendGrid Activity Feed.',
      usageExample: {
        scenario: 'Send a receipt email after a successful payment',
        inputValues: { to: '{{$json.customerEmail}}', from: 'receipts@yourapp.com', subject: 'Your receipt for order #{{$json.orderId}}', html: '<h1>Thank you!</h1><p>You paid ${{$json.amount}} on {{$json.date}}.</p>' },
        expectedOutput: 'Email is accepted by SendGrid for delivery. Track via the x-message-id in the SendGrid Activity Feed.',
      },
    },
  },

  amazon_ses: {
    default: {
      description: 'Send an email via Amazon Simple Email Service (SES).',
      outputExample: { MessageId: '0102018e2b3c7abc-def1234-...', ResponseMetadata: { RequestId: 'abc-123', HTTPStatusCode: 200 } },
      outputDescription: 'MessageId: The SES message ID for tracking. ResponseMetadata.HTTPStatusCode: 200 means success.',
      usageExample: {
        scenario: 'Send bulk email notifications to a list of subscribers',
        inputValues: { to: '{{$json.email}}', from: 'notifications@yourapp.com', subject: '{{$json.subject}}', body: '{{$json.bodyText}}' },
        expectedOutput: 'Email is sent via SES. Use `{{$json.MessageId}}` to track in the SES console.',
      },
    },
  },

  facebook: {
    post: {
      description: 'Publish a post to a Facebook Page.',
      outputExample: { id: '123456789_987654321', created_time: '2025-01-15T12:00:00+0000' },
      outputDescription: 'id: The Facebook post ID (format: pageId_postId). created_time: When the post was published.',
      usageExample: {
        scenario: 'Auto-post new blog articles to your company Facebook page',
        inputValues: { message: '📖 New post: "{{$json.title}}"\n\n{{$json.excerpt}}\n\nRead more: {{$json.url}}' },
        expectedOutput: 'The post is published. Use `{{$json.id}}` to track engagement.',
      },
    },
  },

  slack_webhook: {
    default: {
      description: 'Send a message to Slack using an Incoming Webhook URL — no OAuth required.',
      outputExample: { success: true, status: 200, response: 'ok' },
      outputDescription: 'success: true if Slack accepted the message. status: HTTP response code. response: "ok" indicates success.',
      usageExample: {
        scenario: 'Post a quick alert to Slack without setting up a full bot integration',
        inputValues: { webhookUrl: '{{$env.SLACK_WEBHOOK_URL}}', text: '🔔 New sign-up: {{$json.email}} at {{$now}}' },
        expectedOutput: 'Message appears in the configured channel. This is the simplest way to send Slack messages.',
      },
    },
  },

  discord_webhook: {
    default: {
      description: 'Send a message to a Discord channel using a Webhook URL — no bot required.',
      outputExample: { success: true, status: 204 },
      outputDescription: 'success: true if the message was accepted. status: HTTP 204 means Discord accepted the webhook payload.',
      usageExample: {
        scenario: 'Post GitHub commit notifications to a Discord channel',
        inputValues: { message: '📦 New commit by {{$json.author}}: {{$json.message}}\n{{$json.url}}' },
        expectedOutput: 'Message appears in the Discord channel. No bot setup required — just the webhook URL.',
      },
    },
  },

  chargebee: {
    default: {
      description: 'Create and manage subscriptions, customers, and invoices in Chargebee.',
      outputExample: { customer: { id: 'cust_abc123', email: 'alice@example.com', created_at: 1705000000 } },
      outputDescription: 'customer.id: Chargebee customer ID. customer.email: The customer email. customer.created_at: Unix timestamp of creation.',
      usageExample: {
        scenario: 'Create a Chargebee customer when a new user signs up',
        inputValues: { firstName: '{{$json.firstName}}', lastName: '{{$json.lastName}}', email: '{{$json.email}}' },
        expectedOutput: 'A Chargebee customer record is created. Use `{{$json.customer.id}}` in downstream billing operations.',
      },
    },
  },

  // ─── DATA & DATABASES ─────────────────────────────────────────────────────

  google_sheets: {
    read: {
      description: 'Read rows from a Google Sheets spreadsheet.',
      outputExample: { rows: [{ Name: 'Alice', Email: 'alice@example.com', Status: 'Active' }, { Name: 'Bob', Email: 'bob@example.com', Status: 'Inactive' }], count: 2 },
      outputDescription: 'rows: Array of objects where each key is a column header and each value is the cell value. count: Total number of rows returned.',
      usageExample: {
        scenario: 'Read a list of customers from a Google Sheet and send each a personalised email',
        inputValues: { spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', sheetName: 'Customers', range: 'A:D' },
        expectedOutput: 'Returns all rows as objects. Use a Loop node downstream to iterate over each row and pass `{{$json.Email}}` to Gmail.',
      },
    },
    write: {
      description: 'Write data to specific cells or a range in a Google Sheet.',
      outputExample: { updatedRange: 'Sheet1!A2:C2', updatedRows: 1, updatedColumns: 3, updatedCells: 3 },
      outputDescription: 'updatedRange: The A1 notation of the range that was written. updatedRows / Columns / Cells: How many rows, columns, and cells were updated.',
      usageExample: {
        scenario: 'Write form submission data to a Google Sheet',
        inputValues: { spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', range: 'Sheet1!A:C', values: '[["{{$json.name}}", "{{$json.email}}", "{{$now}}"]]' },
        expectedOutput: 'Row is written to the sheet. `{{$json.updatedRange}}` confirms where the data was placed.',
      },
    },
    append: {
      description: 'Append a new row to the end of a Google Sheet.',
      outputExample: { tableRange: 'Sheet1!A1:C100', updates: { updatedRange: 'Sheet1!A101:C101', updatedRows: 1 } },
      outputDescription: 'tableRange: The entire table range including the new row. updates.updatedRange: The specific range of the newly appended row.',
      usageExample: {
        scenario: 'Append a new order row to a tracking spreadsheet each time a Shopify order is placed',
        inputValues: { spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', sheetName: 'Orders', values: '[["{{$json.orderId}}", "{{$json.customerEmail}}", "{{$json.total}}", "{{$now}}"]]' },
        expectedOutput: 'A new row is appended. `{{$json.updates.updatedRange}}` shows where it was placed.',
      },
    },
    update: {
      description: 'Update specific cells in an existing Google Sheet row.',
      outputExample: { spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', updatedRange: 'Sheet1!D5', updatedCells: 1 },
      outputDescription: 'updatedRange: The range that was updated. updatedCells: The number of cells that changed.',
      usageExample: {
        scenario: 'Update the "Status" column of a row when an order is fulfilled',
        inputValues: { spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', range: 'Sheet1!D{{$json.rowNumber}}', values: '[["Fulfilled"]]' },
        expectedOutput: 'The specified cell is updated. Use `{{$json.updatedRange}}` to confirm.',
      },
    },
  },

  google_doc: {
    read: {
      description: 'Read the full content and structure of a Google Doc.',
      outputExample: { documentId: 'abc123', title: 'Q4 Report', body: { content: [{ paragraph: { elements: [{ textRun: { content: 'Executive Summary\n' } }] } }] } },
      outputDescription: 'documentId: The Google Doc ID. title: Document title. body.content: Array of structural content elements.',
      usageExample: {
        scenario: 'Read a Google Doc template to use as an email body',
        inputValues: { documentId: '{{$json.docId}}' },
        expectedOutput: 'Returns the full document structure. Extract text from `body.content` to use in downstream nodes.',
      },
    },
    create: {
      description: 'Create a new Google Doc with a title and optional body content.',
      outputExample: { documentId: 'newDoc123', title: 'Meeting Notes — 2025-01-15', revisionId: 'ABC123' },
      outputDescription: 'documentId: The ID of the newly created document. title: The document title. revisionId: The initial revision ID.',
      usageExample: {
        scenario: 'Auto-create a meeting notes document for each calendar event',
        inputValues: { title: 'Meeting Notes — {{$json.eventTitle}} — {{$json.date}}', content: 'Attendees: {{$json.attendees}}\nAgenda: {{$json.agenda}}' },
        expectedOutput: 'New doc is created in Google Drive. Use `{{$json.documentId}}` to share a link: https://docs.google.com/document/d/{{$json.documentId}}',
      },
    },
    update: {
      description: 'Append text or replace content in an existing Google Doc.',
      outputExample: { documentId: 'abc123', replies: [{ insertText: { objectId: 'obj1' } }] },
      outputDescription: 'documentId: The updated document ID. replies: Array of batch update replies.',
      usageExample: {
        scenario: 'Append a summary to a running report document',
        inputValues: { documentId: '{{$json.docId}}', text: '\n\n--- {{$now}} ---\n{{$json.summary}}' },
        expectedOutput: 'Text is appended to the end of the document.',
      },
    },
  },

  google_drive: {
    list: {
      description: 'List files and folders in Google Drive.',
      outputExample: { files: [{ id: 'file1', name: 'Q4 Report.pdf', mimeType: 'application/pdf', modifiedTime: '2025-01-14T10:00:00Z' }], nextPageToken: null },
      outputDescription: 'files: Array of file/folder objects with id, name, mimeType, and modifiedTime. nextPageToken: Token for paginating results.',
      usageExample: {
        scenario: 'List all PDF files in a specific Drive folder to process each one',
        inputValues: { folderId: '{{$env.DRIVE_FOLDER_ID}}', mimeType: 'application/pdf', maxResults: '50' },
        expectedOutput: 'Returns matching files. Loop over `{{$json.files}}` and use each `{{$json.id}}` in a Download operation.',
      },
    },
    upload: {
      description: 'Upload a file to Google Drive.',
      outputExample: { id: 'newFile456', name: 'report-2025-01.pdf', webViewLink: 'https://drive.google.com/file/d/newFile456/view', mimeType: 'application/pdf' },
      outputDescription: 'id: The new file ID in Drive. name: File name. webViewLink: Browser-accessible URL to the file.',
      usageExample: {
        scenario: 'Upload a generated PDF report to a shared Drive folder',
        inputValues: { folderId: '{{$env.REPORTS_FOLDER_ID}}', fileName: 'report-{{$now}}.pdf', content: '{{$json.pdfContent}}', mimeType: 'application/pdf' },
        expectedOutput: 'File is uploaded. Share `{{$json.webViewLink}}` with stakeholders.',
      },
    },
    download: {
      description: 'Download the content of a file from Google Drive.',
      outputExample: { fileId: 'file1', fileName: 'data.csv', content: 'Name,Email\nAlice,alice@example.com\n', mimeType: 'text/csv', size: 1024 },
      outputDescription: 'fileId: The Drive file ID. fileName: The file name. content: The raw file content as a string. mimeType: The file MIME type.',
      usageExample: {
        scenario: 'Download a CSV export from Drive and process each row',
        inputValues: { fileId: '{{$json.fileId}}' },
        expectedOutput: 'File content is returned in `{{$json.content}}`. Pass to a CSV node to parse rows.',
      },
    },
  },

  google_calendar: {
    list: {
      description: 'List events from a Google Calendar within a time range.',
      outputExample: { items: [{ id: 'event1', summary: 'Team Standup', start: { dateTime: '2025-01-15T09:00:00Z' }, end: { dateTime: '2025-01-15T09:30:00Z' }, attendees: [{ email: 'alice@example.com' }] }], nextPageToken: null },
      outputDescription: 'items: Array of calendar event objects. Each has id, summary, start, end, and attendees. nextPageToken: For paginating more events.',
      usageExample: {
        scenario: 'Get today\'s meetings and post them as a morning summary to Slack',
        inputValues: { calendarId: 'primary', timeMin: '{{$now}}T00:00:00Z', timeMax: '{{$now}}T23:59:59Z', maxResults: '20' },
        expectedOutput: 'Returns all events today. Format `{{$json.items}}` into a Slack message with event summaries and times.',
      },
    },
    create: {
      description: 'Create a new event on a Google Calendar.',
      outputExample: { id: 'newEvent789', summary: 'Product Demo', start: { dateTime: '2025-01-20T14:00:00Z' }, end: { dateTime: '2025-01-20T15:00:00Z' }, htmlLink: 'https://calendar.google.com/event?eid=...' },
      outputDescription: 'id: The new calendar event ID. summary: Event title. start/end: Event timestamps. htmlLink: URL to view the event in Google Calendar.',
      usageExample: {
        scenario: 'Create a Google Calendar event when a Calendly booking is confirmed',
        inputValues: { calendarId: 'primary', summary: '{{$json.eventType}} with {{$json.inviteeName}}', startDateTime: '{{$json.startTime}}', endDateTime: '{{$json.endTime}}', description: 'Booked via Calendly' },
        expectedOutput: 'Event is created. Share `{{$json.htmlLink}}` as a calendar invite link.',
      },
    },
    update: {
      description: 'Update an existing Google Calendar event.',
      outputExample: { id: 'event1', summary: 'Rescheduled: Team Standup', start: { dateTime: '2025-01-16T10:00:00Z' }, updated: '2025-01-15T12:00:00Z' },
      outputDescription: 'id: The updated event ID. summary: Updated event title. updated: ISO timestamp of the last update.',
      usageExample: {
        scenario: 'Reschedule an event when a Typeform rescheduling request comes in',
        inputValues: { calendarId: 'primary', eventId: '{{$json.eventId}}', summary: '{{$json.newTitle}}', startDateTime: '{{$json.newStartTime}}' },
        expectedOutput: 'Event is updated. `{{$json.updated}}` confirms the time of the change.',
      },
    },
  },

  google_contacts: {
    list: {
      description: 'List contacts from Google Contacts.',
      outputExample: { connections: [{ resourceName: 'people/c123', names: [{ displayName: 'Alice Smith' }], emailAddresses: [{ value: 'alice@example.com' }] }], totalItems: 1 },
      outputDescription: 'connections: Array of contact objects. Each has resourceName, names, and emailAddresses.',
      usageExample: { scenario: 'Sync Google Contacts with a CRM', inputValues: { pageSize: '100' }, expectedOutput: 'Returns contacts. Map `emailAddresses[0].value` to CRM fields.' },
    },
    create: {
      description: 'Create a new contact in Google Contacts.',
      outputExample: { resourceName: 'people/newContact456', names: [{ displayName: 'Bob Jones' }], emailAddresses: [{ value: 'bob@example.com' }] },
      outputDescription: 'resourceName: The new contact\'s resource name. names[0].displayName: Full name. emailAddresses[0].value: Primary email.',
      usageExample: { scenario: 'Add form respondents as Google Contacts', inputValues: { givenName: '{{$json.firstName}}', familyName: '{{$json.lastName}}', email: '{{$json.email}}' }, expectedOutput: 'Contact created. Use `{{$json.resourceName}}` to look up later.' },
    },
    get: {
      description: 'Get a specific Google Contact by resource name.',
      outputExample: { resourceName: 'people/c123', names: [{ displayName: 'Alice Smith' }], emailAddresses: [{ value: 'alice@example.com' }], phoneNumbers: [{ value: '+14155551234' }] },
      outputDescription: 'resourceName: Contact identifier. names: Name objects. emailAddresses / phoneNumbers: Contact info arrays.',
      usageExample: { scenario: 'Retrieve contact details before sending a personalised email', inputValues: { resourceName: '{{$json.resourceName}}' }, expectedOutput: 'Returns full contact info including all email and phone fields.' },
    },
  },

  google_bigquery: {
    query: {
      description: 'Run a SQL query against a Google BigQuery dataset.',
      outputExample: { rows: [{ user_id: '123', revenue: 450.00, sign_up_date: '2024-11-01' }], totalRows: '1250', jobId: 'bq-job-abc123', schema: { fields: [{ name: 'user_id', type: 'STRING' }] } },
      outputDescription: 'rows: Array of result objects where keys are column names. totalRows: Total matching rows. jobId: BigQuery job ID for billing/tracking.',
      usageExample: {
        scenario: 'Pull last 30 days of user revenue data for a monthly report',
        inputValues: { projectId: '{{$env.GCP_PROJECT_ID}}', query: 'SELECT user_id, SUM(amount) AS revenue FROM `myproject.analytics.orders` WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) GROUP BY user_id ORDER BY revenue DESC LIMIT 1000' },
        expectedOutput: 'Returns up to 1000 rows with revenue totals. Pass `{{$json.rows}}` to a Google Sheets append node to update a dashboard.',
      },
    },
    insert: {
      description: 'Insert rows into a BigQuery table using the streaming insert API.',
      outputExample: { insertErrors: [], kind: 'bigquery#tableDataInsertAllResponse' },
      outputDescription: 'insertErrors: Empty array means all rows were inserted successfully. Any errors here indicate row-level failures.',
      usageExample: {
        scenario: 'Stream event data from a webhook into a BigQuery events table',
        inputValues: { projectId: '{{$env.GCP_PROJECT_ID}}', datasetId: 'analytics', tableId: 'events', rows: '[{"event_type": "{{$json.event}}", "user_id": "{{$json.userId}}", "timestamp": "{{$now}}"}]' },
        expectedOutput: 'Rows are streamed to BigQuery. Empty `insertErrors` confirms success.',
      },
    },
  },

  postgresql: {
    query: {
      description: 'Execute a SQL SELECT query against a PostgreSQL database.',
      outputExample: { rows: [{ id: 1, name: 'Alice', email: 'alice@example.com', created_at: '2024-01-01T00:00:00Z' }], rowCount: 1 },
      outputDescription: 'rows: Array of result row objects. rowCount: Number of rows returned.',
      usageExample: {
        scenario: 'Fetch all users who signed up in the last 7 days',
        inputValues: { query: 'SELECT id, name, email, created_at FROM users WHERE created_at >= NOW() - INTERVAL \'7 days\' ORDER BY created_at DESC', parameters: '[]' },
        expectedOutput: 'Returns matching rows as objects. Iterate with a Loop node to process each user.',
      },
    },
    insert: {
      description: 'Insert a new row into a PostgreSQL table.',
      outputExample: { rows: [{ id: 42, name: 'Bob', email: 'bob@example.com', created_at: '2025-01-15T10:00:00Z' }], rowCount: 1 },
      outputDescription: 'rows: The inserted row(s) with all columns including auto-generated fields like id and created_at. rowCount: Number of rows inserted.',
      usageExample: {
        scenario: 'Save a webhook event payload to a PostgreSQL events table',
        inputValues: { query: 'INSERT INTO events (type, payload, created_at) VALUES ($1, $2, NOW()) RETURNING *', parameters: '["{{$json.event_type}}", "{{$json.payload}}"]' },
        expectedOutput: 'Row is inserted. `{{$json.rows[0].id}}` is the new record\'s primary key.',
      },
    },
    update: {
      description: 'Update rows in a PostgreSQL table.',
      outputExample: { rows: [{ id: 42, status: 'fulfilled', updated_at: '2025-01-15T11:00:00Z' }], rowCount: 1 },
      outputDescription: 'rows: The updated row(s). rowCount: Number of rows affected.',
      usageExample: {
        scenario: 'Mark an order as fulfilled when a payment webhook is received',
        inputValues: { query: 'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *', parameters: '["fulfilled", "{{$json.orderId}}"]' },
        expectedOutput: 'Row is updated. `{{$json.rows[0].status}}` confirms the new value.',
      },
    },
    delete: {
      description: 'Delete rows from a PostgreSQL table.',
      outputExample: { rowCount: 1 },
      outputDescription: 'rowCount: Number of rows deleted. 0 means no matching rows were found.',
      usageExample: {
        scenario: 'Delete expired session tokens from the database',
        inputValues: { query: 'DELETE FROM sessions WHERE expires_at < NOW()', parameters: '[]' },
        expectedOutput: '`{{$json.rowCount}}` rows were deleted. Log this for audit purposes.',
      },
    },
  },

  supabase: {
    select: {
      description: 'Query rows from a Supabase table with optional filters.',
      outputExample: { data: [{ id: 1, title: 'First Post', status: 'published', author_id: 'user_abc' }], count: 1, error: null },
      outputDescription: 'data: Array of matching rows. count: Total rows matching the filter. error: null on success.',
      usageExample: {
        scenario: 'Fetch all published blog posts from a Supabase table',
        inputValues: { table: 'posts', filters: '[{"column": "status", "operator": "eq", "value": "published"}]', limit: '50' },
        expectedOutput: 'Returns matching rows. Iterate over `{{$json.data}}` to process each post.',
      },
    },
    insert: {
      description: 'Insert a new row into a Supabase table.',
      outputExample: { data: [{ id: 101, email: 'user@example.com', created_at: '2025-01-15T10:00:00Z' }], error: null },
      outputDescription: 'data: Array containing the inserted row. error: null on success.',
      usageExample: {
        scenario: 'Save a new user profile to Supabase after OAuth sign-up',
        inputValues: { table: 'profiles', data: '{"email": "{{$json.email}}", "name": "{{$json.name}}", "avatar_url": "{{$json.picture}}"}' },
        expectedOutput: 'Row inserted. `{{$json.data[0].id}}` is the new record\'s primary key.',
      },
    },
    update: {
      description: 'Update rows in a Supabase table matching a filter.',
      outputExample: { data: [{ id: 42, status: 'active', updated_at: '2025-01-15T11:00:00Z' }], error: null },
      outputDescription: 'data: Updated row(s). error: null on success.',
      usageExample: {
        scenario: 'Mark a task as complete in a Supabase tasks table',
        inputValues: { table: 'tasks', filters: '[{"column": "id", "operator": "eq", "value": "{{$json.taskId}}"}]', data: '{"status": "complete", "completed_at": "{{$now}}"}' },
        expectedOutput: 'Task status is updated to "complete".',
      },
    },
    delete: {
      description: 'Delete rows from a Supabase table matching a filter.',
      outputExample: { data: [{ id: 99 }], error: null },
      outputDescription: 'data: Array of deleted row IDs. error: null on success.',
      usageExample: {
        scenario: 'Delete a user\'s data when they request account deletion',
        inputValues: { table: 'profiles', filters: '[{"column": "user_id", "operator": "eq", "value": "{{$json.userId}}"}]' },
        expectedOutput: '`{{$json.data[0].id}}` confirms which record was deleted.',
      },
    },
  },

  database_read: {
    default: {
      description: 'Run a SELECT query on the configured database.',
      outputExample: { rows: [{ id: 1, name: 'Alice', value: 100 }], rowCount: 1 },
      outputDescription: 'rows: Array of result objects with column names as keys. rowCount: Total rows returned.',
      usageExample: { scenario: 'Read records from any SQL database', inputValues: { query: 'SELECT * FROM orders WHERE status = $1', parameters: '["pending"]' }, expectedOutput: 'Returns matching rows as JavaScript objects.' },
    },
  },

  database_write: {
    default: {
      description: 'Execute an INSERT, UPDATE, or DELETE query on the configured database.',
      outputExample: { rowCount: 1 },
      outputDescription: 'rowCount: Number of rows affected by the query.',
      usageExample: { scenario: 'Insert a new record into any SQL database', inputValues: { query: 'INSERT INTO logs (message, created_at) VALUES ($1, NOW())', parameters: '["{{$json.message}}"]' }, expectedOutput: '`rowCount: 1` confirms the row was inserted.' },
    },
  },

  airtable: {
    list: {
      description: 'List records from an Airtable table with optional filters and sorting.',
      outputExample: { records: [{ id: 'recAbc123', fields: { Name: 'Alice', Status: 'Active', 'Sign-up Date': '2025-01-01' }, createdTime: '2025-01-01T00:00:00Z' }], offset: null },
      outputDescription: 'records: Array of Airtable record objects. Each has id, fields (your column data), and createdTime.',
      usageExample: {
        scenario: 'Fetch all active contacts from Airtable to send a campaign email',
        inputValues: { baseId: '{{$env.AIRTABLE_BASE_ID}}', tableId: 'Contacts', filterByFormula: '{Status} = "Active"', maxRecords: '100' },
        expectedOutput: 'Returns active records. Access field values via `{{$json.records[0].fields.Email}}`.',
      },
    },
    create: {
      description: 'Create a new record in an Airtable table.',
      outputExample: { id: 'recNewXyz456', fields: { Name: 'Bob', Email: 'bob@example.com', Status: 'New' }, createdTime: '2025-01-15T10:00:00Z' },
      outputDescription: 'id: The new Airtable record ID. fields: The data saved for this record. createdTime: When the record was created.',
      usageExample: {
        scenario: 'Add a new lead to Airtable when a website form is submitted',
        inputValues: { baseId: '{{$env.AIRTABLE_BASE_ID}}', tableId: 'Leads', fields: '{"Name": "{{$json.name}}", "Email": "{{$json.email}}", "Source": "Website Form", "Date": "{{$now}}"}' },
        expectedOutput: 'Record is created. `{{$json.id}}` is the Airtable record ID for future updates.',
      },
    },
    update: {
      description: 'Update an existing Airtable record by its record ID.',
      outputExample: { id: 'recAbc123', fields: { Name: 'Alice', Status: 'Converted', 'Close Date': '2025-01-15' } },
      outputDescription: 'id: The updated record ID. fields: All field values after the update.',
      usageExample: {
        scenario: 'Mark an Airtable lead as Converted when a CRM deal is closed',
        inputValues: { baseId: '{{$env.AIRTABLE_BASE_ID}}', tableId: 'Leads', recordId: '{{$json.recordId}}', fields: '{"Status": "Converted", "Close Date": "{{$now}}"}' },
        expectedOutput: 'Record is updated with new field values.',
      },
    },
    delete: {
      description: 'Delete a record from an Airtable table by its record ID.',
      outputExample: { deleted: true, id: 'recAbc123' },
      outputDescription: 'deleted: true if the record was successfully removed. id: The ID of the deleted record.',
      usageExample: { scenario: 'Remove a cancelled subscription record from Airtable', inputValues: { baseId: '{{$env.AIRTABLE_BASE_ID}}', tableId: 'Subscriptions', recordId: '{{$json.recordId}}' }, expectedOutput: '`deleted: true` confirms the record was removed.' },
    },
  },

  notion: {
    query_database: {
      description: 'Query a Notion database with optional filters and sorting.',
      outputExample: { results: [{ id: 'page_abc123', properties: { Name: { title: [{ plain_text: 'Project Alpha' }] }, Status: { select: { name: 'In Progress' } } } }], has_more: false },
      outputDescription: 'results: Array of Notion page objects. Each has id and properties (your database fields). has_more: true if there are more pages to fetch.',
      usageExample: {
        scenario: 'Fetch all In Progress tasks from a Notion project database',
        inputValues: { databaseId: '{{$env.NOTION_DB_ID}}', filter: '{"property": "Status", "select": {"equals": "In Progress"}}' },
        expectedOutput: 'Returns matching pages. Access properties via `{{$json.results[0].properties.Name.title[0].plain_text}}`.',
      },
    },
    create_page: {
      description: 'Create a new page (row) in a Notion database.',
      outputExample: { id: 'new_page_xyz', url: 'https://notion.so/new_page_xyz', properties: { Name: { title: [{ plain_text: 'New Task' }] } } },
      outputDescription: 'id: The new Notion page ID. url: Direct URL to the page. properties: The page properties that were set.',
      usageExample: {
        scenario: 'Create a Notion task for each incoming Jira issue',
        inputValues: { databaseId: '{{$env.NOTION_DB_ID}}', properties: '{"Name": {"title": [{"text": {"content": "{{$json.issueSummary}}"}}]}, "Status": {"select": {"name": "Backlog"}}}' },
        expectedOutput: 'Task is created in Notion. Share `{{$json.url}}` with your team.',
      },
    },
    get_page: {
      description: 'Get the properties and metadata of a Notion page by its ID.',
      outputExample: { id: 'page_abc', url: 'https://notion.so/page_abc', properties: { Name: { title: [{ plain_text: 'Meeting Notes' }] }, Status: { select: { name: 'Done' } } } },
      outputDescription: 'id: Page ID. url: Direct page URL. properties: All page properties as Notion property objects.',
      usageExample: { scenario: 'Read a Notion page\'s properties before deciding to update it', inputValues: { pageId: '{{$json.pageId}}' }, expectedOutput: 'Returns all page properties.' },
    },
    update_page: {
      description: 'Update the properties of an existing Notion page.',
      outputExample: { id: 'page_abc', properties: { Status: { select: { name: 'Done' } }, 'Completed At': { date: { start: '2025-01-15' } } } },
      outputDescription: 'id: The updated page ID. properties: All page properties including the changes.',
      usageExample: {
        scenario: 'Mark a Notion task as Done when a Jira issue is resolved',
        inputValues: { pageId: '{{$json.pageId}}', properties: '{"Status": {"select": {"name": "Done"}}, "Completed At": {"date": {"start": "{{$now}}"}}}' },
        expectedOutput: 'Page properties are updated.',
      },
    },
  },

  hubspot: {
    get: {
      description: 'Get a HubSpot CRM object (contact, company, or deal) by its ID.',
      outputExample: { id: '12345', properties: { firstname: 'Alice', lastname: 'Smith', email: 'alice@example.com', hubspot_owner_id: '6789' }, createdAt: '2024-01-01T00:00:00Z' },
      outputDescription: 'id: HubSpot object ID. properties: All CRM properties. createdAt: When the record was created.',
      usageExample: { scenario: 'Look up a HubSpot contact before updating their properties', inputValues: { objectType: 'contacts', objectId: '{{$json.contactId}}' }, expectedOutput: 'Returns the full contact record.' },
    },
    create: {
      description: 'Create a new contact, company, or deal in HubSpot.',
      outputExample: { id: 'new_12345', properties: { firstname: 'Bob', email: 'bob@example.com', hs_object_id: 'new_12345' } },
      outputDescription: 'id: The new HubSpot record ID. properties: The properties set for the new record.',
      usageExample: {
        scenario: 'Create a HubSpot contact when a new user signs up via a website form',
        inputValues: { objectType: 'contacts', properties: '{"firstname": "{{$json.firstName}}", "lastname": "{{$json.lastName}}", "email": "{{$json.email}}", "source": "website_form"}' },
        expectedOutput: 'Contact is created. `{{$json.id}}` is the HubSpot contact ID.',
      },
    },
    update: {
      description: 'Update properties on an existing HubSpot contact, company, or deal.',
      outputExample: { id: '12345', properties: { lifecyclestage: 'customer', dealstage: 'closedwon' } },
      outputDescription: 'id: The updated record ID. properties: The properties as they stand after the update.',
      usageExample: {
        scenario: 'Move a HubSpot deal to "Closed Won" when a Stripe payment succeeds',
        inputValues: { objectType: 'deals', objectId: '{{$json.dealId}}', properties: '{"dealstage": "closedwon", "closedate": "{{$now}}"}' },
        expectedOutput: 'Deal stage is updated in HubSpot.',
      },
    },
  },

  salesforce: {
    query: {
      description: 'Run a SOQL query to retrieve Salesforce records.',
      outputExample: { totalSize: 2, done: true, records: [{ Id: '001Xx...', Name: 'Acme Corp', AnnualRevenue: 5000000 }] },
      outputDescription: 'totalSize: Number of records returned. records: Array of Salesforce sObject records with all selected fields.',
      usageExample: { scenario: 'Fetch all high-value Salesforce accounts', inputValues: { query: 'SELECT Id, Name, AnnualRevenue FROM Account WHERE AnnualRevenue > 1000000 ORDER BY AnnualRevenue DESC LIMIT 100' }, expectedOutput: 'Returns matching records. Map field values to downstream nodes.' },
    },
    create: {
      description: 'Create a new Salesforce record (Account, Contact, Lead, Opportunity, etc.).',
      outputExample: { id: '001Xx...', success: true, errors: [] },
      outputDescription: 'id: The Salesforce record ID of the created object. success: true if creation succeeded. errors: Any validation errors.',
      usageExample: {
        scenario: 'Create a Salesforce Lead when someone fills in a website enquiry form',
        inputValues: { sObject: 'Lead', fields: '{"FirstName": "{{$json.firstName}}", "LastName": "{{$json.lastName}}", "Email": "{{$json.email}}", "Company": "{{$json.company}}", "LeadSource": "Website"}' },
        expectedOutput: 'Lead is created. `{{$json.id}}` is the Salesforce Lead ID.',
      },
    },
    update: {
      description: 'Update fields on an existing Salesforce record.',
      outputExample: { success: true },
      outputDescription: 'success: true if the update succeeded without errors.',
      usageExample: { scenario: 'Update Salesforce Opportunity stage when a deal progresses', inputValues: { sObject: 'Opportunity', recordId: '{{$json.opportunityId}}', fields: '{"StageName": "Closed Won", "CloseDate": "{{$now}}"}' }, expectedOutput: '`success: true` confirms the update.' },
    },
  },

  // ─── AI NODES ─────────────────────────────────────────────────────────────

  ai_agent: {
    chat: {
      description: 'Run an AI agent that can reason over a prompt and use connected tools to complete tasks.',
      outputExample: { output: 'I found 3 open tickets: #101 (billing), #102 (login issue), #103 (feature request).', messages: [{ role: 'user', content: 'List open support tickets' }, { role: 'assistant', content: 'I found 3 open tickets...' }], toolCalls: [{ tool: 'freshdesk_list_tickets', result: '[{id: 101...}]' }] },
      outputDescription: 'output: The final text response from the agent. messages: The full conversation history. toolCalls: List of tools invoked and their results.',
      usageExample: {
        scenario: 'Build an AI support agent that reads tickets, drafts replies, and updates status',
        inputValues: { prompt: 'Review the latest support tickets and draft replies for any that are about billing issues', systemPrompt: 'You are a helpful customer support agent. Be concise and professional.' },
        expectedOutput: 'The agent reads tickets via tools, drafts replies, and returns them in `{{$json.output}}`.',
      },
    },
  },

  openai_gpt: {
    chat: {
      description: 'Send a prompt to OpenAI GPT and get a text response.',
      outputExample: { content: 'The report shows a 23% increase in Q4 revenue driven by enterprise subscriptions.', model: 'gpt-4o', usage: { prompt_tokens: 150, completion_tokens: 45, total_tokens: 195 } },
      outputDescription: 'content: The GPT response text. model: The exact model used. usage: Token counts for billing tracking.',
      usageExample: {
        scenario: 'Summarise a long customer feedback email into 3 bullet points',
        inputValues: { prompt: 'Summarise the following feedback in 3 bullet points:\n\n{{$json.emailBody}}', model: 'gpt-4o', maxTokens: '300' },
        expectedOutput: 'Returns the summary in `{{$json.content}}`. Feed this into a Slack message or email reply.',
      },
    },
    complete: {
      description: 'Generate text completions using OpenAI GPT.',
      outputExample: { content: 'Dear Alice,\n\nThank you for your purchase of...', model: 'gpt-4o-mini', usage: { total_tokens: 85 } },
      outputDescription: 'content: The generated text completion. model: Model used. usage: Token usage.',
      usageExample: { scenario: 'Generate a personalised email body using a template', inputValues: { prompt: 'Write a short thank-you email for a customer named {{$json.name}} who bought {{$json.product}}.', model: 'gpt-4o-mini' }, expectedOutput: 'Generated email body in `{{$json.content}}`.' },
    },
  },

  anthropic_claude: {
    complete: {
      description: 'Send a prompt to Anthropic Claude and get a text response.',
      outputExample: { content: 'Based on the data provided, the key insight is a 15% drop in retention among users who did not complete onboarding.', model: 'claude-sonnet-4-6', usage: { input_tokens: 200, output_tokens: 60 } },
      outputDescription: 'content: Claude\'s response text. model: The model used. usage: Input and output token counts.',
      usageExample: {
        scenario: 'Analyse user data and generate actionable insights for a weekly report',
        inputValues: { prompt: 'Analyse the following user retention data and list the top 3 actionable insights:\n\n{{$json.data}}', model: 'claude-sonnet-4-6', maxTokens: '500' },
        expectedOutput: 'Returns analysis in `{{$json.content}}`. Feed into a Google Doc or email report.',
      },
    },
  },

  google_gemini: {
    generate: {
      description: 'Generate text or multimodal content using Google Gemini.',
      outputExample: { text: 'The product description highlights ease of use and enterprise security, making it suitable for B2B markets.', model: 'gemini-1.5-pro', usage: { inputTokens: 120, outputTokens: 40 } },
      outputDescription: 'text: The generated response. model: Gemini model used. usage: Token counts.',
      usageExample: { scenario: 'Classify incoming support emails into categories', inputValues: { prompt: 'Classify this email into one of: billing, technical, general. Email: {{$json.emailBody}}\nReturn only the category name.', model: 'gemini-3.5-flash' }, expectedOutput: 'Returns the category name (e.g. "billing") in `{{$json.text}}`.' },
    },
  },

  ollama: {
    generate: {
      description: 'Generate text using a locally running Ollama model.',
      outputExample: { response: 'To reset your password, go to Settings > Security > Change Password.', model: 'llama3', done: true },
      outputDescription: 'response: The generated text. model: The Ollama model used. done: true when generation is complete.',
      usageExample: { scenario: 'Run local LLM inference without sending data to external APIs', inputValues: { model: 'llama3', prompt: 'Answer this customer question concisely: {{$json.question}}' }, expectedOutput: 'Returns the response from the local Ollama server in `{{$json.response}}`.' },
    },
  },

  text_summarizer: {
    default: {
      description: 'Summarise long text using an AI language model.',
      outputExample: { summary: 'The document outlines three main points: cost reduction, team expansion, and new product launch in Q2.', wordCount: 28, originalLength: 1250 },
      outputDescription: 'summary: The condensed summary text. wordCount: Words in the summary. originalLength: Character count of the input text.',
      usageExample: { scenario: 'Summarise customer feedback before inserting into a CRM note', inputValues: { text: '{{$json.feedback}}', maxLength: '100' }, expectedOutput: 'Short summary in `{{$json.summary}}`.' },
    },
  },

  sentiment_analyzer: {
    default: {
      description: 'Analyse the sentiment (positive / negative / neutral) of a piece of text.',
      outputExample: { sentiment: 'positive', score: 0.87, label: 'Positive', confidence: 'high', text: 'Great product, very easy to use!' },
      outputDescription: 'sentiment: positive, negative, or neutral. score: Confidence score from 0 to 1. label: Human-readable label. confidence: high, medium, or low.',
      usageExample: { scenario: 'Route negative customer feedback to a priority queue', inputValues: { text: '{{$json.reviewText}}' }, expectedOutput: 'Use `{{$json.sentiment}}` in an If/Else node to route negatives to a Slack alert channel.' },
    },
  },

  // ─── LOGIC & FLOW ─────────────────────────────────────────────────────────

  if_else: {
    default: {
      description: 'Branch the workflow: if the condition is true, the "true" path runs; otherwise the "false" path runs.',
      outputExample: { condition: true, branch: 'true', value: 'premium', expression: '{{$json.plan}} === "premium"' },
      outputDescription: 'condition: The evaluated boolean result. branch: "true" or "false" indicating which path was taken. value: The value that was evaluated.',
      usageExample: {
        scenario: 'Route premium users to a VIP welcome email and free users to a trial email',
        inputValues: { condition: '{{$json.plan === "premium"}}' },
        expectedOutput: 'If `condition` is true, the "true" output path runs (connect a Gmail Send node). Otherwise the "false" path runs (connect a different email node).',
      },
    },
  },

  switch: {
    default: {
      description: 'Branch the workflow into multiple paths based on a value match.',
      outputExample: { matched: 'billing', value: 'billing', branch: 1 },
      outputDescription: 'matched: The case that was matched. value: The actual value evaluated. branch: The index of the matched case (1-based).',
      usageExample: {
        scenario: 'Route a support ticket to the right team based on the category',
        inputValues: { value: '{{$json.category}}', cases: '["billing", "technical", "general"]' },
        expectedOutput: 'Connect different downstream nodes to the "billing", "technical", and "general" output ports.',
      },
    },
  },

  merge: {
    default: {
      description: 'Merge data from multiple input branches into a single output.',
      outputExample: { merged: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }], inputCount: 2 },
      outputDescription: 'merged: Combined array of all items from all input branches. inputCount: Number of inputs that were merged.',
      usageExample: { scenario: 'Combine results from two parallel API calls before writing to a database', inputValues: { mode: 'combine' }, expectedOutput: 'All items from both branches are available in `{{$json.merged}}`.' },
    },
  },

  error_handler: {
    default: {
      description: 'Handle errors in a workflow branch with retry logic and fallback values.',
      outputExample: { handled: true, error: { message: 'Connection timeout', code: 'ECONNRESET' }, fallback: { status: 'error_handled' } },
      outputDescription: 'handled: true if the error was caught. error: The original error object. fallback: The fallback value configured.',
      usageExample: { scenario: 'Catch HTTP request failures and return a fallback value instead of stopping the workflow', inputValues: { fallbackValue: '{"status": "unavailable"}', maxRetries: '3' }, expectedOutput: 'On error, `{{$json.fallback}}` is passed to the next node instead of terminating.' },
    },
  },

  delay: {
    default: {
      description: 'Pause workflow execution for a fixed number of seconds.',
      outputExample: { delayed: true, delayMs: 5000, resumedAt: '2025-01-15T10:00:05.000Z' },
      outputDescription: 'delayed: true after the delay completes. delayMs: How long the workflow paused in milliseconds. resumedAt: ISO timestamp when execution resumed.',
      usageExample: { scenario: 'Wait 5 seconds after sending a webhook before polling for the result', inputValues: { delay: '5000' }, expectedOutput: 'Workflow pauses for 5 seconds, then continues to the next node.' },
    },
  },

  wait: {
    default: {
      description: 'Pause the workflow until a specific condition is met or a timeout expires.',
      outputExample: { resumed: true, reason: 'condition_met', waitedMs: 3500 },
      outputDescription: 'resumed: true when the wait is over. reason: Why it resumed (condition_met or timeout). waitedMs: How long it actually waited.',
      usageExample: { scenario: 'Wait until a payment status changes to "paid" before sending a receipt', inputValues: { condition: '{{$json.status}} === "paid"', pollIntervalMs: '1000', timeoutMs: '30000' }, expectedOutput: 'Workflow resumes when `status` becomes "paid" or times out after 30 seconds.' },
    },
  },

  return: {
    default: {
      description: 'Stop the current workflow and return a specified value to the caller.',
      outputExample: { returned: true, value: { success: true, orderId: 'ord_123' } },
      outputDescription: 'returned: true if the return was executed. value: The data returned to the caller.',
      usageExample: { scenario: 'Return a success response from a sub-workflow to the parent workflow', inputValues: { value: '{"success": true, "recordId": "{{$json.id}}"}' }, expectedOutput: 'The parent workflow receives `{{$json.value}}` from the Execute Workflow node.' },
    },
  },

  execute_workflow: {
    default: {
      description: 'Call another workflow and wait for its result.',
      outputExample: { result: { success: true, processedCount: 42 }, calledWorkflowId: 'wf_sub123', duration: 1250 },
      outputDescription: 'result: The data returned by the called workflow\'s Return node. calledWorkflowId: The ID of the sub-workflow. duration: How long the sub-workflow took in milliseconds.',
      usageExample: { scenario: 'Call a reusable "send-notification" sub-workflow from multiple workflows', inputValues: { workflowId: '{{$env.NOTIFY_WORKFLOW_ID}}', inputData: '{"userId": "{{$json.userId}}", "message": "{{$json.message}}"}' }, expectedOutput: 'The sub-workflow runs and returns its result in `{{$json.result}}`.' },
    },
  },

  try_catch: {
    default: {
      description: 'Wrap a branch in a try/catch: if the branch throws an error, the catch path runs.',
      outputExample: { success: true, output: { data: 'processed' }, error: null },
      outputDescription: 'success: true if the try branch completed without errors. output: The try branch result. error: null on success, or the error object on failure.',
      usageExample: { scenario: 'Attempt an external API call and gracefully handle failures', inputValues: {}, expectedOutput: 'On success, `output` has the API response. On failure, `error.message` explains what went wrong.' },
    },
  },

  retry: {
    default: {
      description: 'Automatically retry a failing branch up to N times with optional back-off.',
      outputExample: { success: true, attempts: 2, lastError: null, output: { id: 42 } },
      outputDescription: 'success: true if any attempt succeeded. attempts: How many times the branch ran. lastError: The last error if all attempts failed. output: Result of the successful attempt.',
      usageExample: { scenario: 'Retry a flaky third-party API call up to 3 times before giving up', inputValues: { maxAttempts: '3', delayMs: '1000', backoffMultiplier: '2' }, expectedOutput: 'If the 2nd attempt succeeds, `{{$json.attempts}} = 2` and `success: true`.' },
    },
  },

  filter: {
    default: {
      description: 'Filter an array of items, keeping only those that match a condition.',
      outputExample: { filtered: [{ id: 2, status: 'active', name: 'Bob' }], totalIn: 5, totalOut: 1 },
      outputDescription: 'filtered: Array of items that passed the filter condition. totalIn: Input item count. totalOut: Filtered item count.',
      usageExample: { scenario: 'Keep only active users from a database query result', inputValues: { condition: '{{$item.status === "active"}}' }, expectedOutput: 'Only items where status is "active" are passed to the next node.' },
    },
  },

  loop: {
    default: {
      description: 'Loop over an array of items and run the connected branch for each one.',
      outputExample: { processedCount: 3, results: [{ id: 1, sent: true }, { id: 2, sent: true }, { id: 3, sent: true }] },
      outputDescription: 'processedCount: How many items were processed. results: Array of outputs from each iteration.',
      usageExample: { scenario: 'Send a personalised email to each user in a list', inputValues: { items: '{{$json.users}}' }, expectedOutput: 'The connected branch runs once per user. Each iteration receives `{{$item}}` as the current user.' },
    },
  },

  split_in_batches: {
    default: {
      description: 'Split a large array into smaller batches and process each batch separately.',
      outputExample: { batch: [{ id: 1 }, { id: 2 }, { id: 3 }], batchIndex: 0, totalBatches: 4, totalItems: 12, isLastBatch: false },
      outputDescription: 'batch: The items in this batch. batchIndex: Zero-based batch number. totalBatches: Total number of batches. isLastBatch: true on the final batch.',
      usageExample: { scenario: 'Process 1000 API records in batches of 100 to avoid rate limits', inputValues: { items: '{{$json.records}}', batchSize: '100' }, expectedOutput: 'Each batch runs through the connected branch. Use `{{$json.isLastBatch}}` to trigger a completion action.' },
    },
  },

  // ─── DATA TRANSFORMATION ──────────────────────────────────────────────────

  set_variable: {
    default: {
      description: 'Store a value in a named variable that can be referenced later in the workflow.',
      outputExample: { variableName: 'userEmail', variableValue: 'alice@example.com', set: true },
      outputDescription: 'variableName: The name of the variable that was set. variableValue: The value stored. set: true on success.',
      usageExample: { scenario: 'Store the current user\'s email early in the workflow to use in multiple later nodes', inputValues: { name: 'userEmail', value: '{{$json.email}}' }, expectedOutput: 'Reference this variable later as `{{$variables.userEmail}}`.' },
    },
  },

  javascript: {
    default: {
      description: 'Execute custom JavaScript code to transform data or perform calculations.',
      outputExample: { result: { totalRevenue: 12450, averageOrderValue: 207.5, orderCount: 60 }, executionMs: 3 },
      outputDescription: 'result: Whatever your script returns. executionMs: How long the script took to run.',
      usageExample: {
        scenario: 'Calculate revenue statistics from an array of orders',
        inputValues: { code: 'const orders = $json.orders;\nconst total = orders.reduce((sum, o) => sum + o.amount, 0);\nreturn { totalRevenue: total, averageOrderValue: total / orders.length, orderCount: orders.length };' },
        expectedOutput: '`{{$json.result.totalRevenue}}` holds the computed total. Use in downstream email or Slack notifications.',
      },
    },
  },

  json_parser: {
    parse: {
      description: 'Parse a JSON string into a JavaScript object.',
      outputExample: { parsed: { userId: 123, email: 'alice@example.com', plan: 'premium' }, success: true },
      outputDescription: 'parsed: The parsed JavaScript object. success: true if parsing succeeded.',
      usageExample: { scenario: 'Parse a JSON payload received from a webhook', inputValues: { jsonString: '{{$json.rawBody}}' }, expectedOutput: 'Access parsed fields via `{{$json.parsed.email}}`.' },
    },
    stringify: {
      description: 'Convert a JavaScript object to a JSON string.',
      outputExample: { result: '{"userId":123,"email":"alice@example.com"}', success: true },
      outputDescription: 'result: The JSON string. success: true on success.',
      usageExample: { scenario: 'Serialize an object to a JSON string for an HTTP request body', inputValues: { data: '{"name": "{{$json.name}}", "email": "{{$json.email}}"}' }, expectedOutput: 'Use `{{$json.result}}` as the request body string.' },
    },
  },

  date_time: {
    format: {
      description: 'Format a date/time value into a specific string format.',
      outputExample: { formatted: '15 Jan 2025', original: '2025-01-15T10:00:00Z', format: 'DD MMM YYYY' },
      outputDescription: 'formatted: The date as a formatted string. original: The original input value. format: The format string used.',
      usageExample: { scenario: 'Format an ISO date from a database for display in an email', inputValues: { date: '{{$json.createdAt}}', format: 'MMMM D, YYYY' }, expectedOutput: 'Formatted date string like "January 15, 2025".' },
    },
    parse: {
      description: 'Parse a date string into a structured object with year, month, day, etc.',
      outputExample: { year: 2025, month: 1, day: 15, hour: 10, minute: 0, timestamp: 1736935200000, iso: '2025-01-15T10:00:00.000Z' },
      outputDescription: 'year/month/day/hour/minute: Components of the parsed date. timestamp: Unix milliseconds. iso: ISO 8601 string.',
      usageExample: { scenario: 'Extract the year from a date string for grouping records', inputValues: { date: '{{$json.dateString}}' }, expectedOutput: 'Use `{{$json.year}}` in SQL queries or conditional checks.' },
    },
    add: {
      description: 'Add or subtract time from a date (e.g. +7 days, -1 hour).',
      outputExample: { result: '2025-01-22T10:00:00.000Z', original: '2025-01-15T10:00:00.000Z', added: { amount: 7, unit: 'days' } },
      outputDescription: 'result: The new date after adding the specified duration. original: The input date. added: The amount and unit that was added.',
      usageExample: { scenario: 'Calculate an expiry date 30 days from now for a trial subscription', inputValues: { date: '{{$now}}', amount: '30', unit: 'days' }, expectedOutput: 'Trial expiry date in `{{$json.result}}`.' },
    },
  },

  text_formatter: {
    default: {
      description: 'Transform text using operations like uppercase, trim, replace, slug, etc.',
      outputExample: { result: 'hello-world-welcome-to-ctrlchecks', operation: 'slug', original: 'Hello World! Welcome to CtrlChecks' },
      outputDescription: 'result: The transformed text. operation: The transformation applied. original: The input text.',
      usageExample: { scenario: 'Create a URL-safe slug from a blog post title', inputValues: { text: '{{$json.title}}', operation: 'slug' }, expectedOutput: 'URL-friendly slug in `{{$json.result}}`.' },
    },
  },

  math: {
    default: {
      description: 'Perform mathematical calculations on numbers.',
      outputExample: { result: 127.5, expression: '(100 + 50) * 0.85', inputs: { a: 150, b: 0.85 } },
      outputDescription: 'result: The computed result. expression: The math expression that was evaluated.',
      usageExample: { scenario: 'Calculate the discounted price of a product', inputValues: { expression: '{{$json.price}} * (1 - {{$json.discountRate}})' }, expectedOutput: 'Discounted price in `{{$json.result}}`.' },
    },
  },

  edit_fields: {
    default: {
      description: 'Rename, add, remove, or transform fields in an object.',
      outputExample: { id: 1, fullName: 'Alice Smith', emailAddress: 'alice@example.com' },
      outputDescription: 'The resulting object after field edits, renames, and removals.',
      usageExample: { scenario: 'Rename API response fields to match your database schema', inputValues: { operations: '[{"action": "rename", "from": "first_name", "to": "firstName"}, {"action": "remove", "field": "internal_id"}]' }, expectedOutput: 'The object with renamed fields passes to the next node.' },
    },
  },

  aggregate: {
    default: {
      description: 'Aggregate an array of items — sum, average, count, min, max, or group.',
      outputExample: { sum: 4500, average: 900, count: 5, min: 200, max: 2000, field: 'amount' },
      outputDescription: 'sum: Sum of all values. average: Mean value. count: Number of items. min / max: Smallest / largest value.',
      usageExample: { scenario: 'Calculate total sales from an array of order amounts', inputValues: { items: '{{$json.orders}}', field: 'amount', operation: 'sum' }, expectedOutput: '`{{$json.sum}}` holds the total sales figure.' },
    },
  },

  sort: {
    default: {
      description: 'Sort an array of items by a field in ascending or descending order.',
      outputExample: { sorted: [{ name: 'Alice', score: 95 }, { name: 'Bob', score: 80 }, { name: 'Carol', score: 72 }], field: 'score', direction: 'desc' },
      outputDescription: 'sorted: The items array after sorting. field: The field used for sorting. direction: "asc" or "desc".',
      usageExample: { scenario: 'Sort a leaderboard by score descending before displaying it', inputValues: { items: '{{$json.players}}', field: 'score', direction: 'desc' }, expectedOutput: 'Top scores first in `{{$json.sorted}}`.' },
    },
  },

  limit: {
    default: {
      description: 'Take only the first N items from an array.',
      outputExample: { items: [{ id: 1 }, { id: 2 }, { id: 3 }], total: 10, returned: 3 },
      outputDescription: 'items: The truncated array. total: Original array length. returned: Number of items after limiting.',
      usageExample: { scenario: 'Take only the top 5 results from a large dataset', inputValues: { items: '{{$json.results}}', limit: '5' }, expectedOutput: 'First 5 items in `{{$json.items}}`.' },
    },
  },

  csv: {
    parse: {
      description: 'Parse a CSV string into an array of objects.',
      outputExample: { rows: [{ Name: 'Alice', Email: 'alice@example.com', Plan: 'Pro' }, { Name: 'Bob', Email: 'bob@example.com', Plan: 'Free' }], headers: ['Name', 'Email', 'Plan'], rowCount: 2 },
      outputDescription: 'rows: Array of objects where keys are column headers. headers: Column names. rowCount: Number of data rows.',
      usageExample: { scenario: 'Parse a CSV file downloaded from Google Drive into structured data', inputValues: { csv: '{{$json.content}}', hasHeaders: 'true' }, expectedOutput: 'Each row becomes an object. Loop over `{{$json.rows}}` to process each.' },
    },
    generate: {
      description: 'Convert an array of objects into a CSV string.',
      outputExample: { csv: 'Name,Email,Status\nAlice,alice@example.com,Active\nBob,bob@example.com,Inactive\n', rowCount: 2 },
      outputDescription: 'csv: The generated CSV string. rowCount: Number of data rows in the output.',
      usageExample: { scenario: 'Export a list of users as a CSV to upload to Google Drive', inputValues: { data: '{{$json.users}}', headers: '["Name", "Email", "Status"]' }, expectedOutput: 'CSV string in `{{$json.csv}}`. Pass to a Google Drive upload node.' },
    },
  },

  html: {
    parse: {
      description: 'Parse an HTML document and extract elements or text.',
      outputExample: { title: 'Example Domain', headings: ['Example Domain'], links: ['https://www.iana.org/domains/example'], text: 'This domain is for use in illustrative examples.' },
      outputDescription: 'title: Page title. headings: Array of heading texts. links: Array of href values. text: Main body text.',
      usageExample: { scenario: 'Scrape a product page to extract the title and price', inputValues: { html: '{{$json.pageContent}}', selector: '.price' }, expectedOutput: 'Extracted price in `{{$json.text}}`.' },
    },
    generate: {
      description: 'Generate an HTML string from a template.',
      outputExample: { html: '<h1>Welcome, Alice!</h1><p>Your order #123 has shipped.</p>' },
      outputDescription: 'html: The generated HTML string.',
      usageExample: { scenario: 'Generate an HTML email body from a template', inputValues: { template: '<h1>Welcome, {{name}}!</h1><p>Your order #{{orderId}} has shipped.</p>', data: '{"name": "{{$json.name}}", "orderId": "{{$json.orderId}}"}' }, expectedOutput: 'Use `{{$json.html}}` as the email body.' },
    },
  },

  xml: {
    parse: {
      description: 'Parse an XML string into a JavaScript object.',
      outputExample: { root: { order: { id: '123', customer: 'Alice', items: [{ sku: 'PROD001', qty: '2' }] } } },
      outputDescription: 'Parsed JavaScript object. Attributes and text nodes are available as nested properties.',
      usageExample: { scenario: 'Parse an XML response from a legacy SOAP API', inputValues: { xml: '{{$json.responseBody}}' }, expectedOutput: 'Access parsed fields via `{{$json.root.order.id}}`.' },
    },
    generate: {
      description: 'Convert a JavaScript object to an XML string.',
      outputExample: { xml: '<?xml version="1.0"?><order><id>123</id><customer>Alice</customer></order>' },
      outputDescription: 'xml: The generated XML string.',
      usageExample: { scenario: 'Build an XML payload for a SOAP API request', inputValues: { data: '{"order": {"id": "{{$json.orderId}}", "customer": "{{$json.name}}"}}' }, expectedOutput: 'Use `{{$json.xml}}` as the request body.' },
    },
  },

  // ─── UTILITY & HTTP ───────────────────────────────────────────────────────

  http_request: {
    default: {
      description: 'Make an HTTP request (GET, POST, PUT, PATCH, DELETE) to any URL.',
      outputExample: { status: 200, body: { id: 101, title: 'Hello World', completed: false }, headers: { 'content-type': 'application/json; charset=utf-8' } },
      outputDescription: 'status: HTTP response code. body: Parsed response body (object if JSON, string otherwise). headers: Response headers.',
      usageExample: {
        scenario: 'Fetch user details from a REST API to enrich webhook data',
        inputValues: { url: 'https://api.example.com/users/{{$json.userId}}', method: 'GET', headers: '{"Authorization": "Bearer {{$env.API_TOKEN}}", "Accept": "application/json"}' },
        expectedOutput: 'API response in `{{$json.body}}`. Access fields via `{{$json.body.email}}`.',
      },
    },
  },

  http_post: {
    default: {
      description: 'Make an HTTP POST request to send data to an external endpoint.',
      outputExample: { status: 201, body: { id: 'new_item_123', created: true }, headers: { location: '/api/items/new_item_123' } },
      outputDescription: 'status: HTTP response code. body: Response body. headers: Response headers including Location for created resources.',
      usageExample: { scenario: 'Submit form data to an external API', inputValues: { url: 'https://api.example.com/submissions', body: '{"name": "{{$json.name}}", "email": "{{$json.email}}"}', headers: '{"Content-Type": "application/json", "Authorization": "Bearer {{$env.TOKEN}}"}' }, expectedOutput: 'Created resource in `{{$json.body}}`. Use `{{$json.body.id}}` to reference it.' },
    },
  },

  graphql: {
    query: {
      description: 'Execute a GraphQL query against an endpoint.',
      outputExample: { data: { user: { id: '1', name: 'Alice', email: 'alice@example.com', orders: [{ id: 'ord_1', total: 99.99 }] } }, errors: null },
      outputDescription: 'data: The GraphQL response data. errors: Array of GraphQL errors if any occurred.',
      usageExample: { scenario: 'Fetch user orders from a Shopify GraphQL API', inputValues: { endpoint: 'https://yourstore.myshopify.com/api/2024-01/graphql.json', query: 'query { customer(id: "{{$json.customerId}}") { id name email orders(first: 5) { nodes { id totalPrice } } } }', headers: '{"X-Shopify-Access-Token": "{{$env.SHOPIFY_TOKEN}}"}' }, expectedOutput: 'Returns `data.customer` with nested orders array.' },
    },
    mutate: {
      description: 'Execute a GraphQL mutation to create or update data.',
      outputExample: { data: { createOrder: { id: 'new_ord_456', status: 'created' } }, errors: null },
      outputDescription: 'data: The mutation result data. errors: GraphQL errors if any.',
      usageExample: { scenario: 'Create a new order via GraphQL mutation', inputValues: { endpoint: 'https://api.example.com/graphql', query: 'mutation CreateOrder($input: OrderInput!) { createOrder(input: $input) { id status } }', variables: '{"input": {"customerId": "{{$json.customerId}}", "items": []}}' }, expectedOutput: '`data.createOrder.id` is the new order ID.' },
    },
  },

  respond_to_webhook: {
    default: {
      description: 'Send an HTTP response back to the caller of a Webhook Trigger node.',
      outputExample: { sent: true, statusCode: 200, body: { success: true, message: 'Processed' } },
      outputDescription: 'sent: true if the response was dispatched. statusCode: The HTTP status code returned. body: The response body sent.',
      usageExample: { scenario: 'Respond to a Stripe webhook with a 200 OK to acknowledge receipt', inputValues: { statusCode: '200', body: '{"received": true}', headers: '{"Content-Type": "application/json"}' }, expectedOutput: 'Stripe receives the 200 response and stops retrying.' },
    },
  },

  cache_get: {
    default: {
      description: 'Get a value from the Redis cache by key.',
      outputExample: { key: 'user:u_123:profile', value: { name: 'Alice', plan: 'pro' }, hit: true, ttl: 3542 },
      outputDescription: 'key: The cache key. value: The cached value (null if not found). hit: true if the key existed. ttl: Remaining TTL in seconds.',
      usageExample: { scenario: 'Check the cache for a user\'s profile before making a database query', inputValues: { key: 'user:{{$json.userId}}:profile' }, expectedOutput: 'If `{{$json.hit}}` is true, use `{{$json.value}}` and skip the DB call.' },
    },
  },

  cache_set: {
    default: {
      description: 'Store a value in the Redis cache with an optional expiry (TTL).',
      outputExample: { key: 'user:u_123:profile', set: true, ttl: 3600 },
      outputDescription: 'key: The cache key. set: true if stored successfully. ttl: The TTL set in seconds.',
      usageExample: { scenario: 'Cache a user profile for 1 hour after fetching from the database', inputValues: { key: 'user:{{$json.userId}}:profile', value: '{{$json.profile}}', ttl: '3600' }, expectedOutput: '`set: true` confirms the value is cached.' },
    },
  },

  queue_push: {
    default: {
      description: 'Push a message onto a Redis-backed queue for asynchronous processing.',
      outputExample: { pushed: true, queueName: 'email_notifications', position: 42, messageId: 'msg_abc123' },
      outputDescription: 'pushed: true if the message was added. queueName: The queue it was sent to. position: Position in the queue. messageId: Unique message ID.',
      usageExample: { scenario: 'Queue an email notification for background processing instead of blocking the webhook', inputValues: { queue: 'email_notifications', message: '{"to": "{{$json.email}}", "subject": "Welcome!"}' }, expectedOutput: 'Message is queued. A Queue Consume worker processes it asynchronously.' },
    },
  },

  queue_consume: {
    default: {
      description: 'Consume messages from a Redis queue and process them one by one.',
      outputExample: { message: { to: 'alice@example.com', subject: 'Welcome!' }, queueName: 'email_notifications', processed: true },
      outputDescription: 'message: The dequeued message payload. queueName: The queue name. processed: true when the message is acknowledged.',
      usageExample: { scenario: 'Process email notifications from a queue', inputValues: { queue: 'email_notifications', timeout: '5000' }, expectedOutput: 'Use `{{$json.message.to}}` and `{{$json.message.subject}}` in a downstream email node.' },
    },
  },

  // ─── REMAINING NODES ──────────────────────────────────────────────────────

  shopify: {
    get_order: {
      description: 'Retrieve a Shopify order by its ID.',
      outputExample: { order: { id: 5001, order_number: 1001, email: 'customer@example.com', total_price: '99.00', financial_status: 'paid', fulfillment_status: null, line_items: [{ title: 'Blue T-Shirt', quantity: 2, price: '49.50' }] } },
      outputDescription: 'order.id: Shopify order ID. order.financial_status: Payment status. order.line_items: Products in the order.',
      usageExample: { scenario: 'Fetch order details when a fulfillment webhook is received', inputValues: { orderId: '{{$json.id}}' }, expectedOutput: 'Full order object including line items, customer email, and totals.' },
    },
    create_order: {
      description: 'Create a draft order in Shopify.',
      outputExample: { order: { id: 5002, order_number: 1002, total_price: '120.00', financial_status: 'pending' } },
      outputDescription: 'order.id: New order ID. order.order_number: Human-readable order number. order.financial_status: Payment status.',
      usageExample: { scenario: 'Create a Shopify order from a custom checkout form', inputValues: { lineItems: '[{"variant_id": 123, "quantity": 1}]', email: '{{$json.email}}' }, expectedOutput: '`order.id` can be used to collect payment or send confirmation.' },
    },
  },

  stripe: {
    create_charge: {
      description: 'Create a Stripe payment charge.',
      outputExample: { id: 'ch_abc123', amount: 5000, currency: 'usd', status: 'succeeded', receipt_email: 'customer@example.com', created: 1705000000 },
      outputDescription: 'id: Stripe charge ID. amount: Amount in the smallest currency unit (cents). currency: Currency code. status: "succeeded" means payment was taken.',
      usageExample: { scenario: 'Charge a customer $50 after a service is rendered', inputValues: { amount: '5000', currency: 'usd', source: '{{$json.stripeToken}}', receipt_email: '{{$json.email}}' }, expectedOutput: 'Charge is created. `{{$json.status}}` = "succeeded" means payment was collected.' },
    },
    get_customer: {
      description: 'Retrieve a Stripe customer by their Stripe customer ID.',
      outputExample: { id: 'cus_abc123', email: 'customer@example.com', name: 'Alice Smith', subscriptions: { data: [{ id: 'sub_xyz', status: 'active', plan: { nickname: 'Pro' } }] } },
      outputDescription: 'id: Stripe customer ID. email / name: Customer details. subscriptions.data: Active subscriptions.',
      usageExample: { scenario: 'Look up a Stripe customer when a webhook event is received', inputValues: { customerId: '{{$json.data.object.customer}}' }, expectedOutput: 'Full customer object including active subscriptions.' },
    },
  },

  github: {
    create_issue: {
      description: 'Create a new issue in a GitHub repository.',
      outputExample: { number: 42, title: 'Bug: Login fails for SSO users', state: 'open', html_url: 'https://github.com/org/repo/issues/42', created_at: '2025-01-15T10:00:00Z' },
      outputDescription: 'number: The issue number. html_url: Direct link to the issue. state: "open" means it was created.',
      usageExample: { scenario: 'Create a GitHub issue when a critical error is logged', inputValues: { owner: '{{$env.GH_OWNER}}', repo: '{{$env.GH_REPO}}', title: '[ERROR] {{$json.errorMessage}}', body: '**Workflow:** {{$json.workflowId}}\n**Time:** {{$now}}\n\n```\n{{$json.stack}}\n```' }, expectedOutput: 'Issue is created. Share `{{$json.html_url}}` in a Slack alert.' },
    },
    get_repo: {
      description: 'Get details about a GitHub repository.',
      outputExample: { id: 123456, name: 'my-app', full_name: 'org/my-app', stargazers_count: 128, open_issues_count: 5 },
      outputDescription: 'id: GitHub repo ID. full_name: Owner/repo name. stargazers_count: Stars. open_issues_count: Open issues.',
      usageExample: { scenario: 'Fetch repo stats for a weekly report', inputValues: { owner: 'myorg', repo: 'my-app' }, expectedOutput: 'Repo stats available in `{{$json.stargazers_count}}` and `{{$json.open_issues_count}}`.' },
    },
  },

  jira: {
    create_issue: {
      description: 'Create a new Jira issue.',
      outputExample: { id: '10001', key: 'PROJ-42', self: 'https://yourcompany.atlassian.net/rest/api/3/issue/10001' },
      outputDescription: 'id: Jira internal issue ID. key: Human-readable issue key (e.g. PROJ-42). self: API URL to the issue.',
      usageExample: { scenario: 'Create a Jira bug ticket when a Sentry error is detected', inputValues: { project: 'PROJ', summary: '{{$json.errorTitle}}', description: '{{$json.errorDetails}}', issuetype: 'Bug', priority: 'High' }, expectedOutput: '`{{$json.key}}` is the Jira issue key (e.g. PROJ-42).' },
    },
    get_issue: {
      description: 'Get details of a Jira issue by its key.',
      outputExample: { id: '10001', key: 'PROJ-42', fields: { summary: 'Login fails for SSO users', status: { name: 'In Progress' }, assignee: { displayName: 'Alice Smith' }, priority: { name: 'High' } } },
      outputDescription: 'key: Issue key. fields.summary: Issue title. fields.status.name: Current status. fields.assignee.displayName: Assignee name.',
      usageExample: { scenario: 'Read a Jira issue to check its status before sending a reminder', inputValues: { issueKey: '{{$json.jiraKey}}' }, expectedOutput: 'Full issue details in `{{$json.fields}}`.' },
    },
  },

  notion_database: {
    query: {
      description: 'Query a Notion database.',
      outputExample: { results: [], has_more: false },
      outputDescription: 'results: Matching Notion pages. has_more: true if pagination is needed.',
      usageExample: { scenario: 'Find pages matching a filter', inputValues: { databaseId: '{{$env.NOTION_DB_ID}}', filter: '{}' }, expectedOutput: 'Returns matching page objects.' },
    },
  },

  stop_and_error: {
    default: {
      description: 'Stop the workflow intentionally and return a clear error message.',
      outputExample: { stopped: true, errorMessage: 'Validation failed', stoppedAt: '2025-01-15T10:00:00.000Z' },
      outputDescription: 'stopped: Always true when this node stops execution. errorMessage: The message shown in the workflow run logs. stoppedAt: When execution was stopped.',
      usageExample: {
        scenario: 'Stop an order workflow when the required customer email is missing',
        inputValues: { errorMessage: 'Customer email is missing. Cannot send confirmation.' },
        expectedOutput: 'The workflow stops before later nodes run, and the run log shows the exact error message.',
      },
    },
  },

  webhook_response: {
    default: {
      description: 'Send a final HTTP response back to the app or service that called the webhook.',
      outputExample: { responseCode: 200, body: { ok: true, orderId: 'ord_123' }, sent: true },
      outputDescription: 'responseCode: HTTP status returned to the caller. body: The response payload sent back. sent: True when CtrlChecks sent the response.',
      usageExample: {
        scenario: 'Return a success message to a checkout form after creating an order',
        inputValues: { responseCode: '200', body: '{"ok":true,"orderId":"{{$json.orderId}}"}' },
        expectedOutput: 'The caller receives HTTP 200 with the order ID in the response body.',
      },
    },
  },
};

/**
 * Get the content override for a specific node+operation combination.
 * Returns undefined if no override exists (generator will use defaults).
 */
export function getOperationOverride(slug: string, operation: string): OperationOverride | undefined {
  return nodeContentOverrides[slug]?.[operation];
}
