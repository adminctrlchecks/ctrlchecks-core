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
      description: 'Start the workflow automatically when the selected time rule matches. Use the daily time picker for once-a-day work or cron for weekly, monthly, hourly, and business-day patterns.',
      outputExample: {
        scheduledTime: '2026-07-31T03:30:00.000Z',
        localTime: '2026-07-31 09:00',
        timezone: 'Asia/Kolkata',
        cronExpression: '0 9 * * *',
        triggeredBy: 'schedule',
        output: {},
      },
      outputDescription: 'scheduledTime: The exact timestamp when the schedule fired. localTime: The scheduled clock time in the selected timezone. timezone: The timezone used to interpret the schedule. cronExpression: The saved cron rule that matched. triggeredBy: Shows that the workflow started from the scheduler. output: A reserved object for trigger output metadata.',
      usageExample: {
        scenario: 'Send a daily sales summary to managers every morning before standup',
        inputValues: { time: '09:00', cron: '0 9 * * *', timezone: 'Asia/Kolkata' },
        expectedOutput: 'The workflow fires at 09:00 in the selected timezone. The next node can use {{$json.scheduledTime}}, {{$json.timezone}}, and {{$json.cronExpression}} in reports, logs, or notification messages.',
      },
    },
  },

  webhook: {
    default: {
      description: 'Starts the workflow when a form, app, website, or internal system sends an HTTP request to the generated CtrlChecks webhook URL.',
      outputExample: {
        event: 'order.created',
        orderId: 'ORD-1048',
        customerEmail: 'alex@example.com',
        total: 249.5,
        headers: { 'content-type': 'application/json', 'x-webhook-signature': 'sha256=...' },
        method: 'POST',
        query: { source: 'website' },
        body: { event: 'order.created', orderId: 'ORD-1048', customerEmail: 'alex@example.com', total: 249.5 },
      },
      outputDescription: 'body: The parsed request body sent by the caller. event/orderId/customerEmail/total: common payload fields available for easy mapping when present. headers: HTTP headers from the request. method: HTTP method used, usually POST. query: URL query parameters such as source or campaign.',
      usageExample: {
        scenario: 'Receive a paid-order webhook, create a fulfillment task, and notify finance',
        inputValues: { path: '/paid-order', httpMethod: 'POST', responseMode: 'responseNode', verifySignature: 'true' },
        expectedOutput: 'The workflow receives {{$json.body.orderId}}, {{$json.customerEmail}}, {{$json.headers}}, {{$json.method}}, and {{$json.query.source}} for downstream task, database, and message nodes.',
      },
    },
  },

  manual_trigger: {
    default: {
      description: 'Start the workflow when a person clicks Run. Use it for testing, approvals, one-off tasks, and workflows that should not start automatically.',
      outputExample: {
        executedAt: '2025-01-15T14:30:00.000Z',
        triggeredBy: 'manual',
        workflowId: 'wf_abc123',
        inputData: { reportDate: '2026-07-31', department: 'Sales', requestedBy: 'nina@company.com' },
        output: {},
      },
      outputDescription: 'executedAt: The date and time when the manual run started. triggeredBy: Shows that this run was started by a person. workflowId: The workflow that was run. inputData: The optional sample payload you provided, which the next node can read. output: A reserved object for trigger output metadata.',
      usageExample: {
        scenario: 'A support lead manually reruns a priority ticket notification after confirming the ticket should be escalated',
        inputValues: { inputData: '{"ticketId":"SUP-1042","customerEmail":"maya@acme.com","priority":"high"}' },
        expectedOutput: 'The workflow starts immediately. The next node can use {{$json.ticketId}}, {{$json.customerEmail}}, and {{$json.priority}} to look up the ticket, send a message, or create an audit log.',
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
      description: 'Start the workflow when someone sends a message through the CtrlChecks chat interface for an active workflow. The current visual panel has no setup fields; the chat route supplies the runtime message and session metadata.',
      outputExample: {
        message: 'What is the status of order ORD-1048?',
        channel: 'workflow_123_chat-trigger-1',
        sessionId: 'workflow_123_chat-trigger-1',
        trigger: 'chat',
        node_id: 'chat-trigger-1',
        workflow_id: 'workflow_123',
        timestamp: '2026-07-19T09:15:00.000Z',
        _chat: true,
      },
      outputDescription: 'message: The trimmed chat text. channel: In the migrated registry path this is the sessionId when one exists, otherwise the supplied channel value. sessionId: Stable chat session ID in workflowId_nodeId format so Chat Send can reply to the same open chat. trigger: chat marker. node_id: Chat Trigger node ID. workflow_id: Workflow receiving the message. timestamp: Time the chat request was accepted, or the supplied timestamp in tests. _chat: true marker for chat-triggered executions. Legacy simple execution paths may return only the message string.',
      usageExample: {
        scenario: 'Build a customer support chatbot that answers order status questions and replies in the same chat window',
        inputValues: {
          message: 'What is the status of order ORD-1048?',
          channel: 'support-chat',
          allowedSenders: '[]',
        },
        expectedOutput: 'The next node can use {{$json.message}} as the user question and {{$json.sessionId}} in Chat Send to reply to the same chat.',
      },
    },
  },

  form: {
    default: {
      description: 'Start the workflow when a person submits a CtrlChecks-hosted public form.',
      outputExample: {
        name: 'Alex Morgan',
        customer_email: 'alex@example.com',
        issue_category: 'billing',
        message: 'Invoice INV-4821 shows the wrong billing address.',
        submitted_at: '2026-07-18T08:45:00.000Z',
        form: { title: 'Support Request', id: 'form_node_1' },
        data: { name: 'Alex Morgan', customer_email: 'alex@example.com', issue_category: 'billing', message: 'Invoice INV-4821 shows the wrong billing address.' },
        files: [],
        meta: { submittedAt: '2026-07-18T08:45:00.000Z', ip: 'masked', userAgent: 'Mozilla/5.0' },
      },
      outputDescription: 'Submitted answers are available at the top level by internal name and under data. submitted_at records when the form was submitted. form contains the form title and node id. files contains uploaded files. meta contains submittedAt, masked IP, and userAgent.',
      usageExample: {
        scenario: 'Collect a support request, create a helpdesk ticket, and send the customer a confirmation email',
        inputValues: { formTitle: 'Support Request', fields: 'name, customer_email, issue_category, message', captcha: 'true' },
        expectedOutput: 'Access submitted answers with {{$json.customer_email}}, {{$json.data.issue_category}}, {{$json.message}}, {{$json.submitted_at}}, {{$json.form.id}}, and {{$json.meta.submittedAt}}.',
      },
    },
  },

  error_trigger: {
    default: {
      description: 'Runs when another node in the same workflow fails. The executor skips Error Trigger during normal successful runs and invokes it out-of-band from the failure handler with the failed node name, error message, and error type.',
      outputExample: {
        failed_node: 'HTTP Request',
        error_message: 'HTTP Request node: URL is required',
        error_type: 'Error',
        error_stack: 'Error: HTTP Request node: URL is required\n    at executeNode...',
        node_output: { _error: 'HTTP Request node: URL is required', _nodeType: 'http_request' },
      },
      outputDescription: 'failed_node: Label or ID of the node that failed. error_message: Plain text failure message for alerts, logs, tickets, or recovery notes. error_type: JavaScript error class name such as Error, TypeError, or unknown. error_stack: Optional stack trace when the error payload includes it. node_output: Optional failed-node output object when supplied. The normal failure handler passes workflow_id and execution_id into the trigger input, but the current output keeps only failed_node, error_message, error_type, and optional diagnostics.',
      usageExample: {
        scenario: 'Log workflow failures and notify operations when a customer-facing automation breaks',
        inputValues: {},
        expectedOutput: 'Use {{$json.error_message}} in the alert body, {{$json.failed_node}} in the subject or log title, and {{$json.error_type}} for routing different kinds of failures.',
      },
    },
  },

  facebook_trigger: {
    receive: {
      description: 'Receive Meta webhook deliveries for Facebook Page and Messenger activity, verify the callback token during setup, optionally validate X-Hub-Signature-256, filter accepted event types/Page/senders, and start one workflow execution per accepted event.',
      outputExample: {
        eventId: 'm_abc123',
        eventType: 'message.text',
        source: 'facebook',
        userId: '1234567890',
        username: '',
        text: 'Can you help me track my order?',
        timestamp: '2026-07-19T10:20:00.000Z',
        chatId: '1234567890',
        senderId: '1234567890',
        recipientId: '123456789012345',
        pageId: '123456789012345',
        messageId: 'm_abc123',
        messageType: 'text',
        commentId: null,
        postId: null,
        parentId: null,
        leadgenId: null,
        formId: null,
        postbackPayload: '',
        field: 'messages',
        verb: '',
        item: '',
        raw: { entry: { id: '123456789012345' } },
        trigger: 'facebook',
        workflow_id: 'workflow_123',
        node_id: 'facebook-trigger-1',
        sessionId: 'facebook_workflow_123_1234567890',
        _facebook: true,
      },
      outputDescription: 'eventId: event identifier. eventType: message.text, message.media, comment, mention, postback, leadgen, feed.post, or feed.comment. source: facebook. userId/username: sender identity when available. text: normalized message/comment/postback text. timestamp: ISO event time. chatId/senderId: values for Messenger replies. recipientId/pageId: Page identity. messageId/messageType: Messenger message details. commentId/postId/parentId: Page comment/feed identifiers. leadgenId/formId: Lead Ads identifiers. postbackPayload: quick reply/postback payload. field/verb/item: Meta webhook change metadata. raw: original event fragment. trigger/workflow_id/node_id/sessionId/_facebook: CtrlChecks trigger metadata.',
      usageExample: {
        scenario: 'Reply to Facebook Messenger questions with an AI Agent and send the answer back from the same Page',
        inputValues: {
          connectionId: '',
          eventTypes: 'message, postback',
          pageId: '123456789012345',
          allowedSenderIds: '',
          verifyToken: 'fb-webhook-verify-2026-support',
          validateSignature: 'true',
        },
        expectedOutput: 'Use {{$json.text}} as the visitor question, {{$json.senderId}} as the Facebook recipientId, {{$json.pageId}} as the Page ID, and {{$json.eventType}} for routing.',
      },
    },
  },

  github_trigger: {
    receive: {
      description: 'Receive signed GitHub repository webhook deliveries, ignore webhook pings, validate X-Hub-Signature-256, filter accepted event types and keyword text, normalize push/issues/pull_request/release/issue_comment payloads, and start one workflow execution per accepted delivery.',
      outputExample: {
        eventId: 'a1b2c3d4-0000-0000-0000-000000000000',
        eventType: 'issues.opened',
        source: 'github',
        userId: '583231',
        username: 'octocat',
        text: 'Bug: billing export fails for July invoices',
        timestamp: '2026-07-19T10:20:00.000Z',
        repository: 'acme-platform/api-service',
        action: 'opened',
        ref: null,
        commits: null,
        issueNumber: 42,
        issueTitle: 'Bug: billing export fails for July invoices',
        issueUrl: 'https://github.com/acme-platform/api-service/issues/42',
        prNumber: null,
        prTitle: null,
        prUrl: null,
        merged: null,
        releaseTag: null,
        releaseName: null,
        commentBody: null,
        commentUrl: null,
        raw: { action: 'opened', repository: { full_name: 'acme-platform/api-service' } },
        trigger: 'github',
        workflow_id: 'workflow_123',
        node_id: 'github-trigger-1',
        sessionId: 'github_workflow_123_a1b2c3d4-0000-0000-0000-000000000000',
        _github: true,
      },
      outputDescription: 'eventId: delivery ID. eventType: push, issues.opened, pull_request.closed, release.published, issue_comment.created, or another normalized GitHub event. source: github. userId/username: sender identity. text: normalized title/body/message fallback. timestamp: normalized delivery time. repository: owner/repo. action: GitHub payload action. ref: branch/tag or PR head ref. commits: push commits. issueNumber/issueTitle/issueUrl: issue fields. prNumber/prTitle/prUrl/merged: pull request fields. releaseTag/releaseName: release fields. commentBody/commentUrl: issue comment fields. raw: original payload. trigger/workflow_id/node_id/sessionId/_github: CtrlChecks trigger metadata.',
      usageExample: {
        scenario: 'Triage new GitHub issues with AI and notify the engineering channel',
        inputValues: {
          connectionId: '',
          owner: 'acme-platform',
          repo: 'api-service',
          eventTypes: 'issues, pull_request',
          webhookSecret: '',
          query: 'billing',
        },
        expectedOutput: 'Use {{$json.eventType}} to branch issues from pull requests, {{$json.issueTitle}} or {{$json.prTitle}} as the AI prompt, and {{$json.issueUrl}} or {{$json.prUrl}} as the reviewer link.',
      },
    },
  },

  gitlab_trigger: {
    receive: {
      description: 'Receive GitLab project webhook deliveries, validate the X-Gitlab-Token shared secret header, filter accepted event types and keyword text, normalize push/tag_push/issue/merge_request/note/pipeline/job/release payloads, and start one workflow execution per accepted delivery.',
      outputExample: {
        eventId: '987654321',
        eventType: 'issue',
        source: 'gitlab',
        userId: '42',
        username: 'asha',
        text: 'Bug: billing export fails for July invoices',
        timestamp: '2026-07-19T10:20:00.000Z',
        projectId: '12345',
        projectName: 'acme-platform/api-service',
        action: 'open',
        ref: null,
        commits: null,
        issueIid: 42,
        issueTitle: 'Bug: billing export fails for July invoices',
        issueUrl: 'https://gitlab.com/acme-platform/api-service/-/issues/42',
        mrIid: null,
        mrTitle: null,
        mrUrl: null,
        mrState: null,
        noteBody: null,
        noteUrl: null,
        raw: { object_kind: 'issue', project: { path_with_namespace: 'acme-platform/api-service' } },
        trigger: 'gitlab',
        workflow_id: 'workflow_123',
        node_id: 'gitlab-trigger-1',
        sessionId: 'gitlab_workflow_123_987654321',
        _gitlab: true,
      },
      outputDescription: 'eventId: normalized event identifier. eventType: GitLab object_kind such as push, tag_push, issue, merge_request, note, pipeline, job, or release. source: gitlab. userId/username: actor identity when available. text: normalized commit message, issue title, merge request title, note body, pipeline status, release name, or fallback text. timestamp: ISO event time when available. projectId/projectName: project identity. action: issue/MR/pipeline/release action or status when present. ref: branch or tag for push, tag_push, merge_request, and pipeline events. commits: push or tag push commit list. issueIid/issueTitle/issueUrl: issue fields. mrIid/mrTitle/mrUrl/mrState: merge request fields. noteBody/noteUrl: comment fields. raw: original GitLab payload. trigger/workflow_id/node_id/sessionId/_gitlab: CtrlChecks trigger metadata.',
      usageExample: {
        scenario: 'Triage new GitLab issues and merge requests with AI, then post a team alert with the project link',
        inputValues: {
          connectionId: '',
          baseUrl: 'https://gitlab.com',
          projectId: '12345',
          eventTypes: 'issue, merge_request, note',
          secretToken: '',
          query: 'billing',
        },
        expectedOutput: 'Use {{$json.eventType}} to branch issue, merge_request, and note events; use {{$json.issueTitle}}, {{$json.mrTitle}}, or {{$json.noteBody}} as AI input; and include {{$json.issueUrl}} or {{$json.mrUrl}} in the alert.',
      },
    },
  },

  workflow_trigger: {
    default: {
      description: 'Start this workflow when an allowed parent workflow calls it with an Execute Workflow node.',
      outputExample: {
        customerEmail: 'maya@acme.com',
        ticketId: 'SUP-1042',
        priority: 'high',
        inputData: { customerEmail: 'maya@acme.com', ticketId: 'SUP-1042', priority: 'high' },
        workflowId: 'workflow_parent_123',
        timestamp: '2026-07-18T09:15:00.000Z',
      },
      outputDescription: 'The child workflow receives the payload sent by the parent Execute Workflow node. Use top-level fields such as customerEmail, ticketId, and priority, or wrapped fields such as inputData.customerEmail when the parent passes an inputData object. workflowId and timestamp can be used for logging when present.',
      usageExample: {
        scenario: 'Create a reusable Send Escalation Alert child workflow that the Support Intake workflow can call',
        inputValues: { source_workflow_id: 'workflow_support_intake_123' },
        expectedOutput: 'The child workflow can use {{$json.customerEmail}}, {{$json.ticketId}}, {{$json.priority}}, or {{$json.inputData.customerEmail}} in downstream Slack, Email, database, or approval nodes.',
      },
    },
  },

  // ─── COMMUNICATION ────────────────────────────────────────────────────────

  google_gmail: {
    send: {
      description: 'Send an email to one or more recipients via Gmail, with recipients typed manually or extracted from upstream/fallback Google Sheets rows.',
      outputExample: { success: true, subject: 'Your order #1048 has shipped!', to: 'alice@example.com', messageId: '18abc123def456', sentCount: 1, failedCount: 0 },
      outputDescription: 'success: true only when every recipient sent successfully. messageId: Gmail message ID, present only for a single-recipient send (check results for multi-recipient sends). sentCount/failedCount: per-recipient delivery counts. Failures return _error instead.',
      usageExample: {
        scenario: 'Send a personalised welcome email to a new user after form sign-up',
        inputValues: { recipientEmails: '{{$json.email}}', subject: 'Welcome to CtrlChecks, {{$json.name}}!', body: 'Hi {{$json.name}},\n\nYour account is ready. Visit your dashboard to get started.\n\nCheers,\nThe CtrlChecks Team' },
        expectedOutput: 'The email is delivered to the recipient. `{{$json.messageId}}` is available for logging or referencing in a downstream database write.',
      },
    },
    list: {
      description: 'List lightweight message references from the connected Gmail inbox, optionally filtered by a query.',
      outputExample: { messages: [{ id: '18abc1', threadId: '18abc1' }, { id: '18abc2', threadId: '18abc2' }], resultSizeEstimate: 2, count: 2 },
      outputDescription: 'messages: Array of Gmail message references — only id and threadId, no subject/snippet/body. resultSizeEstimate: Gmail\'s approximate total match count. count: actual items returned. Use a Get step with each id to read full content. Failures return _error.',
      usageExample: {
        scenario: 'Fetch unread support emails and create Jira tickets for each',
        inputValues: { query: 'is:unread label:support', maxResults: '10' },
        expectedOutput: 'Returns up to 10 unread message references. Loop over `{{$json.messages}}` and use each `{{$json.id}}` in a Gmail Get node to fetch the full content.',
      },
    },
    get: {
      description: 'Fetch the full raw Gmail message resource for one specific message ID.',
      outputExample: { messageId: '18abc123', message: { id: '18abc123', snippet: 'Please find attached your invoice for January...', payload: { headers: [{ name: 'Subject', value: 'Invoice #1234' }, { name: 'From', value: 'billing@vendor.com' }] } } },
      outputDescription: 'message: the full raw Gmail API message resource — subject/from are inside message.payload.headers as {name, value} pairs, and the body text is base64url-encoded inside message.payload.body.data (or message.payload.parts for multi-part mail). messageId echoes the requested ID. Failures return _error.',
      usageExample: {
        scenario: 'Read the full body of each email returned by a Gmail List node',
        inputValues: { messageId: '{{$json.id}}' },
        expectedOutput: 'Returns the full raw Gmail message. Decode `{{$json.message.payload.body.data}}` (base64url) in a JavaScript node to get the plain-text body.',
      },
    },
    search: {
      description: 'Search Gmail messages using Gmail search syntax (same as the Gmail search bar), returning lightweight message references.',
      outputExample: { messages: [{ id: '18abc9', threadId: '18abc9' }], resultSizeEstimate: 1, query: 'from:vendor@example.com newer_than:7d', count: 1 },
      outputDescription: 'messages: Array of Gmail message references matching the query — only id and threadId, no snippet/body. resultSizeEstimate: Gmail\'s approximate total matches. query: the search text used. Use a Get step with each id for full content. Failures return _error.',
      usageExample: {
        scenario: 'Find all emails from a specific sender in the last 7 days',
        inputValues: { query: 'from:vendor@example.com newer_than:7d', maxResults: '25' },
        expectedOutput: 'Returns matching message references. Process each `{{$json.id}}` with a Gmail Get node to access the full email content.',
      },
    },
  },

  outlook: {
    send_email: {
      description: 'Send a plain-text email from the connected Microsoft Outlook mailbox through Microsoft Graph.',
      outputExample: { success: true },
      outputDescription: 'success: true when Microsoft Graph accepts the sendMail request. The Graph sendMail endpoint returns an empty 202 response, so this node does not expose a message ID.',
      usageExample: {
        scenario: 'Send a daily digest email through Outlook',
        inputValues: { to: 'team@company.com', subject: 'Daily Digest', body: '{{$json.digestContent}}' },
        expectedOutput: 'The email is submitted to Microsoft Graph from the connected Microsoft account and the node returns success: true.',
      },
    },
  },

  slack_message: {
    default: {
      description: 'Send one Slack bot message through the saved Slack OAuth2 connection using chat.postMessage.',
      outputExample: {
        id: '1704067200.123456',
        status: 'sent',
        provider: 'slack',
        ok: true,
        channel: 'C01234ABCDE',
        ts: '1704067200.123456',
        threadTs: '1704067000.111111',
        message: 'Priority ticket TCK-1042 from asha.rao@example.com needs review.',
      },
      outputDescription: 'On success, the runtime returns id, status, provider, ok, channel, ts, threadTs, and message. Use {{$json.ts}} or {{$json.id}} to reference the Slack message, {{$json.channel}} to confirm where it posted, {{$json.threadTs}} for follow-up threaded replies, and {{$json.status}} or {{$json.error}} for routing failures.',
      usageExample: {
        scenario: 'Reply in the original Slack incident thread after an AI Agent summarizes a support ticket',
        inputValues: {
          channel: '{{$json.channelId}}',
          message: 'Summary for ticket {{$json.ticketId}}: {{$json.summary}}',
          threadTs: '{{$json.threadTs}}',
          blocks: '[]',
          username: 'Support Workflow',
          iconEmoji: ':memo:',
        },
        expectedOutput: 'The message appears in Slack. Later nodes can use {{$json.status}}, {{$json.ts}}, {{$json.channel}}, {{$json.threadTs}}, or {{$json.error}} to log, branch, or send a follow-up.',
      },
    },
  },
  email: {
    default: {
      description: 'Send one plain-text or HTML email through a saved SMTP Account connection.',
      outputExample: {
        customerEmail: 'asha.rao@example.com',
        invoiceNumber: 'INV-1042',
        success: true,
        messageId: '<abc123@smtp.example.com>',
        accepted: ['asha.rao@example.com'],
        rejected: [],
      },
      outputDescription: 'The output keeps incoming fields such as customerEmail and invoiceNumber, then adds success, messageId, accepted, and rejected from the SMTP send attempt. If required fields, SMTP credentials, sender permission, or delivery fail, runtime returns _error.',
      usageExample: {
        scenario: 'Send a customer invoice notification through the company SMTP relay after an accounting system creates the invoice',
        inputValues: {
          to: '{{$json.customerEmail}}',
          subject: 'Invoice {{$json.invoiceNumber}} is ready',
          text: 'Hi {{$json.firstName}}, your invoice {{$json.invoiceNumber}} is ready: {{$json.invoiceUrl}}',
          html: '<p>Hi {{$json.firstName}},</p><p>Your invoice <strong>{{$json.invoiceNumber}}</strong> is ready.</p><p><a href="{{$json.invoiceUrl}}">View invoice</a></p>',
          from: 'billing@company.com',
        },
        expectedOutput: 'Use {{$json.success}}, {{$json.messageId}}, {{$json.accepted}}, {{$json.rejected}}, and {{$json.customerEmail}} in a downstream log, Slack alert, or If/Else branch.',
      },
    },
  },

  log_output: {
    default: {
      description: 'Write a log message to the CtrlChecks execution log for debugging and monitoring. This is a terminal node — it cannot connect to further downstream nodes.',
      outputExample: { '(entire output)': 'Processed 42 rows from orders_table' },
      outputDescription: 'The resolved log text, with any {{...}} template expressions substituted, is the entire output value (a plain string, not an object with separate message/level/success fields — the "(entire output)" key here is only a documentation label). Because log_output is a terminal node with no outgoing edges, this value is not forwarded to any further node; it is recorded in the execution history only.',
      usageExample: {
        scenario: 'Log progress checkpoints in a long-running data pipeline',
        inputValues: { message: 'Processed {{$json.rowCount}} rows from {{$json.tableName}}', level: 'info' },
        expectedOutput: 'The message appears in the workflow execution log. Useful for debugging without halting the workflow.',
      },
    },
  },

  telegram: {
    default: {
      description: 'Send Telegram text, media, or message edits through a saved Telegram Bot Token connection.',
      outputExample: {
        ticketId: 'TCK-1042',
        success: true,
        operation: 'sendMessage',
        chatId: '-1001234567890',
        messageId: 245,
        data: { message_id: 245, chat: { id: -1001234567890, title: 'Support Alerts' }, text: 'Ticket TCK-1042 is assigned to Maya.' },
        raw: { ok: true },
        telegram: { ok: true },
      },
      outputDescription: 'Successful sends and edits keep incoming data and add success, operation, chatId, messageId, data, raw, and telegram. Failures add _error and sometimes _errorDetails. Later nodes can use {{$json.success}}, {{$json.operation}}, {{$json.chatId}}, {{$json.messageId}}, {{$json.data}}, {{$json.raw}}, {{$json.telegram}}, {{$json._error}}, or {{$json._errorDetails}}.',
      usageExample: {
        scenario: 'Reply to a Telegram support question after an AI Agent drafts a concise answer',
        inputValues: {
          operation: 'send_message',
          chatId: '{{$json.chatId}}',
          messageType: 'text',
          message: 'Answer for ticket {{$json.ticketId}}: {{$json.aiResponse}}',
          text: '',
          parseMode: 'HTML',
          disableWebPagePreview: true,
          mediaUrl: '',
          caption: '',
          replyToMessageId: '{{$json.messageId}}',
          editMessageId: '',
          replyMarkup: '{"inline_keyboard":[[{"text":"Open ticket","url":"{{$json.ticketUrl}}"}]]}',
          disableNotification: false,
          protectContent: false,
          allowSendingWithoutReply: true,
        },
        expectedOutput: 'The reply appears in Telegram. A later log, edit step, or If/Else node can use {{$json.success}}, {{$json.operation}}, {{$json.chatId}}, {{$json.messageId}}, {{$json.data}}, {{$json._error}}, and {{$json._errorDetails}}.',
      },
    },
  },
  zoom_video: {
    createMeeting: {
      description: 'Create a new Zoom meeting for the connected Zoom user and return the raw Zoom meeting object under data.',
      outputExample: { success: true, data: { id: 81234567890, uuid: 'abcdef...', topic: 'Q4 Planning', start_url: 'https://zoom.us/s/81234567890', join_url: 'https://zoom.us/j/81234567890', start_time: '2026-05-01T10:00:00Z', duration: 30 } },
      outputDescription: 'success: true when Zoom created the meeting. data.id is the Zoom meeting ID, data.join_url is the attendee link, data.start_url is the host link, data.start_time is the scheduled time, and _error/_errorDetails appear on failure.',
      usageExample: {
        scenario: 'Create a Zoom meeting when a booking request is approved',
        inputValues: { operation: 'createMeeting', topic: '{{$json.eventName}} with {{$json.inviteeName}}', startTime: '{{$json.startTime}}', duration: '60' },
        expectedOutput: 'Meeting is created. Share {{$json.data.join_url}} with attendees and store {{$json.data.id}} for later update or delete workflows.',
      },
    },
    listMeetings: {
      description: 'List scheduled meetings for the connected Zoom user so a workflow can choose a meeting ID before reading, updating, deleting, or reporting on it.',
      outputExample: { success: true, data: { page_size: 30, total_records: 1, meetings: [{ id: 81234567890, topic: 'Weekly Sync', start_time: '2026-05-01T10:00:00Z', join_url: 'https://zoom.us/j/81234567890' }] } },
      outputDescription: 'success: true when Zoom returned the list. data.meetings contains scheduled meeting objects, while data.page_size and data.total_records describe the page returned by the API.',
      usageExample: {
        scenario: 'Find the scheduled Zoom meetings for an account manager before selecting the one to update',
        inputValues: { operation: 'listMeetings' },
        expectedOutput: 'Use {{$json.data.meetings}} to choose a meeting and map {{$json.data.meetings[0].id}} into Get, Update, or Delete Meeting.',
      },
    },
    getMeeting: {
      description: 'Read the latest Zoom details for one meeting ID, including topic, start time, duration, and attendee join URL when Zoom returns them.',
      outputExample: { success: true, data: { id: 81234567890, topic: 'Customer onboarding', join_url: 'https://zoom.us/j/81234567890', start_time: '2026-05-01T10:00:00Z', duration: 45 } },
      outputDescription: 'success: true when Zoom returned the meeting. data contains the raw meeting details. _error/_errorDetails appear when the ID is wrong, missing, or inaccessible.',
      usageExample: {
        scenario: 'Look up a stored Zoom meeting before sending a reminder',
        inputValues: { operation: 'getMeeting', meetingId: '{{$json.zoomMeetingId}}' },
        expectedOutput: 'Use {{$json.data.join_url}}, {{$json.data.topic}}, and {{$json.data.start_time}} in the reminder message.',
      },
    },
    updateMeeting: {
      description: 'Update one Zoom meeting by ID, sending only the topic, duration, or start time fields that the workflow fills.',
      outputExample: { success: true, data: { updated: true, meetingId: '81234567890' } },
      outputDescription: 'success: true when Zoom accepted the PATCH request. For HTTP 204 responses runtime returns data.updated and data.meetingId rather than the full meeting object.',
      usageExample: {
        scenario: 'Reschedule a customer onboarding call after a booking update',
        inputValues: { operation: 'updateMeeting', meetingId: '{{$json.zoomMeetingId}}', startTime: '{{$json.newStartsAt}}', duration: '45' },
        expectedOutput: 'Check {{$json.data.updated}} and log {{$json.data.meetingId}} before notifying attendees.',
      },
    },
    deleteMeeting: {
      description: 'Delete one Zoom meeting by ID for cancellation workflows where the meeting should be removed from the connected user account.',
      outputExample: { success: true, data: { deleted: true, meetingId: '81234567890' } },
      outputDescription: 'success: true when Zoom accepted the DELETE request. For HTTP 204 responses runtime returns data.deleted and data.meetingId. _error/_errorDetails appear when the meeting is missing or unauthorized.',
      usageExample: {
        scenario: 'Cancel a Zoom meeting after a customer cancels a scheduled session',
        inputValues: { operation: 'deleteMeeting', meetingId: '{{$json.zoomMeetingId}}' },
        expectedOutput: 'Check {{$json.data.deleted}} and send a cancellation notice using attendee data saved before the delete step.',
      },
    },
  },

  microsoft_teams: {
    default: {
      description: 'Send one Microsoft Teams message through an Incoming Webhook, or reply to a Microsoft Teams Trigger conversation through Bot Framework.',
      outputExample: {
        ticketId: 'TCK-1042',
        customerEmail: 'asha.rao@example.com',
        success: true,
        teams: { id: '1784369000000', status: 200, response: '1' },
        botReply: true,
      },
      outputDescription: 'Webhook success keeps incoming data and adds success plus teams.status and teams.response. Bot reply success keeps incoming data and adds success, teams, and botReply. Failures add _error and sometimes _errorDetails. Later nodes can use {{$json.success}}, {{$json.teams.status}}, {{$json.teams.response}}, {{$json.teams.id}}, {{$json.botReply}}, {{$json._error}}, or {{$json._errorDetails}}.',
      usageExample: {
        scenario: 'Reply to a Teams helpdesk question in the same conversation after an AI Agent drafts the answer',
        inputValues: {
          webhookUrl: '',
          message: 'Answer for {{$json.userName}} about ticket {{$json.ticketId}}: {{$json.response}}',
          serviceUrl: '{{$json.serviceUrl}}',
          conversationId: '{{$json.conversationId}}',
          replyToId: '{{$json.replyToId}}',
        },
        expectedOutput: 'The reply appears in Microsoft Teams. A later If/Else, log, or escalation node can use {{$json.success}}, {{$json.botReply}}, {{$json.teams}}, {{$json._error}}, and {{$json._errorDetails}}.',
      },
    },
  },

  whatsapp: {
    sendText: {
      description: 'Send a free-form WhatsApp text message via the WhatsApp Business Cloud API, allowed only within the 24-hour customer service window that opens after the customer messages you.',
      outputExample: { messaging_product: 'whatsapp', contacts: [{ input: '+1234567890', wa_id: '1234567890' }], messages: [{ id: 'wamid.abc123' }] },
      outputDescription: 'messaging_product: Always "whatsapp". contacts: Array with the resolved recipient wa_id. messages[0].id: The WhatsApp message ID to track delivery or reference later. Failures instead return success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails.',
      usageExample: {
        scenario: 'Reply to a customer inside the 24-hour window with an AI Agent-drafted answer',
        inputValues: { resource: 'message', operation: 'sendText', to: '{{$json.chatId}}', text: '{{$json.aiResponse}}' },
        expectedOutput: 'WhatsApp delivers the reply. A later node can use {{$json.messages[0].id}}, {{$json.success}}, and {{$json._error}}.',
      },
    },
    sendTemplate: {
      description: 'Send a pre-approved Meta message template, required to start a new conversation with a customer or to message outside the 24-hour customer service window.',
      outputExample: { messaging_product: 'whatsapp', contacts: [{ input: '+1234567890', wa_id: '1234567890' }], messages: [{ id: 'wamid.abc123' }] },
      outputDescription: 'messaging_product: Always "whatsapp". contacts: Array with the resolved recipient wa_id. messages[0].id: The WhatsApp message ID. Failures (for example an unapproved template) instead return success:false with _error and _errorCode.',
      usageExample: {
        scenario: 'Send an order confirmation template via WhatsApp after a Shopify purchase',
        inputValues: { resource: 'message', operation: 'sendTemplate', to: '{{$json.customerPhone}}', templateName: 'order_confirmation', language: 'en_US' },
        expectedOutput: 'WhatsApp message is delivered. Track delivery status using {{$json.messages[0].id}}.',
      },
    },
  },

  // Deprecated alias for 'whatsapp' — kept only for workflows saved before the merge.
  whatsapp_cloud: {
    default: {
      description: 'Deprecated — sends a plain WhatsApp text message using the same runtime as the WhatsApp node. Use the WhatsApp node for anything beyond plain text.',
      outputExample: { success: true, data: { messaging_product: 'whatsapp', contacts: [{ input: '+1234567890', wa_id: '1234567890' }], messages: [{ id: 'wamid.HBgLMTIzNDU2Nzg5MA==' }] } },
      outputDescription: 'success: true when the WhatsApp Business Cloud API accepted the message. data: Meta\'s raw API response, containing contacts (resolved recipient) and messages[0].id (the new message ID). On failure: success: false plus _error/_errorCode/_errorDetails. The field key for message text is `text`, not `message` — an older panel version stored it under `message`, which the shared executor never read, so those sends went out empty.',
      usageExample: {
        scenario: 'Reply to a customer on an existing legacy workflow not yet migrated to the WhatsApp node',
        inputValues: { to: '{{$json.chatId}}', text: 'Hi {{$json.customerName}} 👋 Your order #{{$json.orderId}} has been confirmed!' },
        expectedOutput: 'WhatsApp message is delivered, identical behavior to the WhatsApp node. Check `{{$json.success}}` and `{{$json._error}}` downstream.',
      },
    },
  },

  twilio: {
    default: {
      description: 'Send an SMS or MMS message via a Twilio Account Credentials connection.',
      outputExample: {
        success: true,
        sid: 'SM1234abcd5678efgh1234abcd5678ef',
        status: 'queued',
        twilio: { sid: 'SM1234abcd5678efgh1234abcd5678ef', status: 'queued', to: '+15551234567', from: '+15559876543', body: 'Your verification code is 4821.' },
      },
      outputDescription: 'sid / status: Twilio message SID and the initial queue status (queued/sent — not final delivery confirmation; this node does not poll for delivered/failed), flattened for convenience. twilio: the full raw Twilio API response. On failure there is no success: false — only `_error` (a bare "Twilio send failed (status)" string) and `_errorDetails` (Twilio\'s actual error message/code); check `_errorDetails` for the real reason, not just `_error`.',
      usageExample: {
        scenario: 'Send a 2FA SMS verification code to a user who is logging in',
        inputValues: { to: '{{$json.phoneNumber}}', message: 'Your CtrlChecks verification code is {{$json.otpCode}}. Expires in 10 minutes.' },
        expectedOutput: 'SMS is queued. Use `{{$json.sid}}` to check delivery status via the Twilio console.',
      },
    },
  },

  mailgun: {
    default: {
      description: 'Send a transactional email via Mailgun, as raw Text/HTML or a stored Mailgun template.',
      outputExample: { success: true, messageId: '<20260718091500.1.ABCDEF1234567890@mg.example.com>', message: 'Queued. Thank you.', mailgun: { id: '<20260718091500.1.ABCDEF1234567890@mg.example.com>', message: 'Queued. Thank you.' } },
      outputDescription: 'success: true when Mailgun accepts the message (there is no success: false on failure — only _error). messageId: Mailgun\'s message ID for tracking delivery in Mailgun\'s logs. message: Mailgun\'s own queue confirmation text. mailgun: the full raw JSON response Mailgun returned. Unlike slack_webhook, original upstream $json fields are preserved alongside these on both success and failure.',
      usageExample: {
        scenario: 'Send a password reset email using Mailgun',
        inputValues: { from: 'noreply@yourapp.com', to: '{{$json.email}}', subject: 'Reset your password', html: '<p>Click <a href="{{$json.resetUrl}}">here</a> to reset your password. Link expires in 1 hour.</p>' },
        expectedOutput: 'Email is queued by Mailgun. Track delivery in the Mailgun logs using `{{$json.messageId}}`, and check `{{$json._error}}` downstream to detect a failed send.',
      },
    },
  },

  sendgrid: {
    default: {
      description: 'Send a one-off transactional email via SendGrid\'s Mail Send API. Only From/To/Subject/Text/HTML are supported — no CC/BCC, attachments, or Dynamic Templates.',
      outputExample: { success: true, status: 202, messageId: 'a1B2c3D4e5F6.filter-node-1.abcdef1234567890@sgrp' },
      outputDescription: 'success: true when SendGrid accepts the message (there is no success: false on failure — only _error). status: always 202 on success (SendGrid\'s accepted-for-delivery response). messageId: read from the x-message-id response header, for tracking in the SendGrid Activity Feed. On failure, the node returns _error and _errorDetails (SendGrid\'s raw error body) instead.',
      usageExample: {
        scenario: 'Send a receipt email after a successful payment',
        inputValues: { to: '{{$json.customerEmail}}', from: 'receipts@yourapp.com', subject: 'Your receipt for order #{{$json.orderId}}', html: '<h1>Thank you!</h1><p>You paid ${{$json.amount}} on {{$json.date}}.</p>' },
        expectedOutput: 'Email is accepted by SendGrid for delivery. Track via `{{$json.messageId}}` in the SendGrid Activity Feed, and check `{{$json._error}}` downstream to detect a failed send.',
      },
    },
  },

  amazon_ses: {
    default: {
      description: 'Send an email via Amazon Simple Email Service (SES), as raw Subject/Body or a saved AWS SES template.',
      outputExample: { success: true, messageId: '0102018e2b3c7abc-def1234-5678-90ab-cdef12345678-000000', recipientCount: 1, failedRecipients: [], attempts: 1, timestamp: '2026-07-18T09:15:00.000Z' },
      outputDescription: 'success: true when Amazon SES accepted the send. messageId: the lowercase SES message ID used to look the send up in the AWS SES console (not a PascalCase MessageId/ResponseMetadata object). recipientCount: total To+Cc+Bcc addresses sent to. failedRecipients: always an empty array, since SES accepts or rejects the whole call, not individual recipients. Field-validation failures (missing recipients/subject/body) return `_error`; actual AWS SES send failures (unverified sender, rate limiting) return a plain `error` field instead — check both.',
      usageExample: {
        scenario: 'Send an order confirmation email to a customer after checkout',
        inputValues: { recipients: '{"to": ["{{$json.customerEmail}}"]}', fromAddress: 'orders@yourapp.com', subject: '{{$json.subject}}', body: '{{$json.bodyText}}' },
        expectedOutput: 'Email is sent via SES. Use `{{$json.messageId}}` to track in the SES console.',
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
      description: 'Send a message to Slack using a saved Incoming Webhook connection.',
      outputExample: { id: 'ok', status: 'sent', provider: 'slack_webhook', message: 'New sign-up: customer@example.com' },
      outputDescription: 'id: Slack\'s literal webhook response body ("ok" on success). status: "sent" or "failed" (not an _error field like most nodes — failure adds a plain error field instead). provider: always "slack_webhook". message: the text that was sent. This output completely replaces incoming $json data; no upstream fields carry through.',
      usageExample: {
        scenario: 'Post a quick alert to Slack without setting up a full bot integration',
        inputValues: { message: 'New sign-up: {{$json.email}} at {{$now}}' },
        expectedOutput: 'Message appears in the configured channel. Check `{{$json.status}}` in the very next node, since prior fields like `{{$json.email}}` do not survive past this node.',
      },
    },
  },

  discord_trigger: {
    receive: {
      description: 'Start a workflow from an accepted Discord slash command, interaction, modal, message-like event, or supported Discord Webhook Event after signature and filter checks pass.',
      outputExample: {
        eventId: '123456789012345678',
        eventType: 'slash_command',
        source: 'discord',
        userId: '111111111111111111',
        username: 'alice',
        text: 'priority:urgent',
        applicationId: '999999999999999999',
        guildId: '222222222222222222',
        channelId: '333333333333333333',
        command: '/support',
        interactionToken: 'interaction-token',
        responseUrl: 'https://discord.com/api/v10/webhooks/999999999999999999/interaction-token',
        raw: {},
      },
      outputDescription: 'The trigger emits normalized Discord fields at the top level: eventId, eventType, source, userId, username, text, timestamp, applicationId, guildId, channelId, threadId, chatId, messageId, command, customId, interactionId, interactionToken, responseUrl, rawEventType, raw, trigger, sessionId, and _discord.',
      usageExample: {
        scenario: 'A Discord user runs /support, the workflow classifies the request, then replies in the same channel.',
        inputValues: { eventTypes: 'slash_command, interaction', commandFilter: '/support', validateSignature: 'true' },
        expectedOutput: 'Use {{$json.text}} as the request, {{$json.channelId}} for a same-channel Discord reply, and {{$json.interactionToken}} with {{$json.applicationId}} for interaction follow-up replies.',
      },
    },
  },

  discord: {
    default: {
      description: 'Send a message to a Discord channel via a bot token, or reply to a slash command/component interaction via an interaction token.',
      outputExample: {
        success: true,
        discord: { id: '1234567890123456789', channel_id: '987654321098765432', content: 'Build #42 passed', timestamp: '2025-01-15T11:00:00.000000+00:00' },
      },
      outputDescription: 'success: true when Discord accepted the message. discord: the raw Discord API message object (id, channel_id, content, author, timestamp). interactionReply: true is added when the reply used Interaction Token + Application ID instead of Channel ID.',
      usageExample: {
        scenario: 'Post CI/CD build status to a #ci-notifications Discord channel',
        inputValues: { channelId: '{{$json.channelId}}', message: 'Build #{{$json.buildNumber}} — {{$json.status}}' },
        expectedOutput: 'Message appears in the Discord channel. Use {{$json.discord.id}} to reference or reply to it later.',
      },
    },
  },

  discord_webhook: {
    default: {
      description: 'Send a message to a Discord channel using a Webhook URL — no bot required.',
      outputExample: { success: true, sent: true, message: 'Build #42 passed', discord_webhook: { status: 204, delivered: true } },
      outputDescription: 'success: true if the message was accepted. sent: true confirms dispatch. discord_webhook.status: the HTTP status Discord returned (204 means accepted with no body). discord_webhook.delivered: true once Discord accepts the payload.',
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

  google_sheets_trigger: {
    default: {
      description: 'Poll a Google Sheet about every two minutes and start the workflow when a row_added or row_updated event passes the configured event type and keyword filters. Activation captures the current row count and row hashes as a baseline, so existing rows do not trigger until they are changed.',
      outputExample: {
        eventId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms-Leads-5-row_added-1784397000000',
        eventType: 'row_added',
        source: 'google_sheets',
        userId: null,
        username: '',
        text: 'Jane Doe jane@example.com urgent New signup',
        timestamp: '2026-07-18T09:50:00.000Z',
        spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        sheetName: 'Leads',
        rowNumber: 5,
        values: ['Jane Doe', 'jane@example.com', 'urgent', 'New signup'],
        row: { Name: 'Jane Doe', Email: 'jane@example.com', Priority: 'urgent', Notes: 'New signup' },
        raw: { values: ['Jane Doe', 'jane@example.com', 'urgent', 'New signup'] },
        trigger: 'google_sheets',
        workflow_id: 'workflow_123',
        node_id: 'sheet-trigger-1',
        sessionId: 'gsheet_workflow_123_1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms_5',
        _googleSheets: true,
      },
      outputDescription: 'eventId: Unique event ID. eventType: row_added or row_updated. source: google_sheets. userId: null for sheet events. username: empty for sheet events. text: joined row values. timestamp: normalization time. spreadsheetId: watched file ID. sheetName: watched tab. rowNumber: one-based spreadsheet row number. values: raw row cells. row: header-keyed row object when headers are enabled. raw: raw values payload. trigger: google_sheets marker. workflow_id: workflow receiving the event. node_id: trigger node ID. sessionId: polling session ID. _googleSheets: internal true marker.',
      usageExample: {
        scenario: 'Create a support ticket when a new urgent row appears in the shared support intake sheet',
        inputValues: {
          spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          sheetName: 'Leads',
          hasHeaderRow: 'true',
          eventTypes: 'row_added',
          query: 'urgent',
        },
        expectedOutput: 'The next node can use {{$json.row.Email}}, {{$json.row.Priority}}, {{$json.rowNumber}}, {{$json.eventType}}, and {{$json.values[0]}}.',
      },
    },
  },

  google_sheets: {
    read: {
      description: 'Read rows from a Google Sheets spreadsheet, normalized into row objects keyed by column header.',
      outputExample: { rows: [{ row_number: 2, Name: 'Alice', Email: 'alice@example.com', Status: 'Active' }, { row_number: 3, Name: 'Bob', Email: 'bob@example.com', Status: 'Inactive' }], headers: ['Name', 'Email', 'Status'] },
      outputDescription: 'rows/items: Array of objects keyed by detected column header plus row_number. headers: detected column names. values: raw array-of-arrays including the header row. There is no count field — use rows.length.',
      usageExample: {
        scenario: 'Read a list of customers from a Google Sheet and send each a personalised email',
        inputValues: { spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', sheetName: 'Customers', range: 'A:D' },
        expectedOutput: 'Returns all rows as objects. Use a Loop node downstream to iterate over each row and pass `{{$json.Email}}` to Gmail.',
      },
    },
    write: {
      description: 'Replace cell values in a range (or the sheet\'s used area) of a Google Sheet.',
      outputExample: { success: true, updatedRange: 'Sheet1!A2:C2', updatedRows: 1, updatedColumns: 3, updatedCells: 3 },
      outputDescription: 'success: true once the write completes. updatedRange: The A1 notation of the range that was written. updatedRows / Columns / Cells: How many rows, columns, and cells were updated. Google Sheets API errors and missing payloads throw rather than returning _error.',
      usageExample: {
        scenario: 'Write form submission data to a Google Sheet',
        inputValues: { spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', range: 'Sheet1!A:C', values: '[["{{$json.name}}", "{{$json.email}}", "{{$now}}"]]' },
        expectedOutput: 'Row is written to the sheet. `{{$json.updatedRange}}` confirms where the data was placed.',
      },
    },
    append: {
      description: 'Append new row(s) after the last existing row of a Google Sheet.',
      outputExample: { success: true, tableRange: 'Sheet1!A1:C100', updatedRange: 'Sheet1!A101:C101', updatedRows: 1, appendedValues: [['Charlie', 'charlie@example.com']] },
      outputDescription: 'success: true once the append completes. tableRange: The entire table range detected before appending. updatedRange/updatedRows: where the new row(s) landed — flattened to the top level, not nested under "updates". appendedValues: the row values Google Sheets recorded.',
      usageExample: {
        scenario: 'Append a new order row to a tracking spreadsheet each time a Shopify order is placed',
        inputValues: { spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', sheetName: 'Orders', values: '[["{{$json.orderId}}", "{{$json.customerEmail}}", "{{$json.total}}", "{{$now}}"]]' },
        expectedOutput: 'A new row is appended. `{{$json.updatedRange}}` shows where it was placed (there is no nested "updates" object).',
      },
    },
    update: {
      description: 'Update specific existing cells identified by Range in a Google Sheet.',
      outputExample: { success: true, spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', updatedRange: 'Sheet1!D5', updatedCells: 1 },
      outputDescription: 'success: true once the update completes. updatedRange: The range that was updated. updatedRows/Columns/Cells: The number of rows, columns, and cells that changed. Google Sheets API errors throw rather than returning _error.',
      usageExample: {
        scenario: 'Update the "Status" column of a row when an order is fulfilled',
        inputValues: { spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', range: 'Sheet1!D{{$json.rowNumber}}', values: '[["Fulfilled"]]' },
        expectedOutput: 'The specified cell is updated. Use `{{$json.updatedRange}}` to confirm.',
      },
    },
  },

  google_doc: {
    read: {
      description: 'Extract the plain text content of an existing Google Doc.',
      outputExample: { content: 'Quarterly Report\n\nRevenue increased 12% year over year...', format: 'text', documentId: '1a2b3c4d5e6f7g8h9i0j' },
      outputDescription: 'content: the document\'s extracted plain text. format: echoes back the selected Output Format without changing extraction — Markdown conversion is not implemented. documentId: the resolved document ID.',
      usageExample: {
        scenario: 'Read a Google Doc template to use as an email body',
        inputValues: { operation: 'read', documentId: '{{$json.docId}}' },
        expectedOutput: 'Returns the document\'s plain text. Map `{{$json.content}}` into an Email or Gmail node body.',
      },
    },
    write: {
      description: 'Delete all existing content and replace it with new Content, in one step.',
      outputExample: { success: true, documentId: '1a2b3c4d5e6f7g8h9i0j', content: 'Updated report content...' },
      outputDescription: 'success: true once the document body is replaced. documentId: the resolved document. content: the exact text that was written, echoed back for confirmation.',
      usageExample: {
        scenario: 'Overwrite a template document with freshly generated report content each week',
        inputValues: { operation: 'write', documentUrl: 'https://docs.google.com/document/d/{{$json.documentId}}/edit', content: '{{$json.reportText}}' },
        expectedOutput: 'The document\'s entire body is replaced. Use `{{$json.success}}` to confirm before notifying stakeholders.',
      },
    },
    create: {
      description: 'Create a new Google Doc with a title and optional initial content.',
      outputExample: { success: true, documentId: 'newDoc123', title: 'Meeting Notes — 2025-01-15', documentUrl: 'https://docs.google.com/document/d/newDoc123/edit', content: 'Attendees: ...' },
      outputDescription: 'success: true once the document is created. documentId: the ID of the newly created document. title: the document title. documentUrl: a ready-to-share link. content: the initial content that was inserted, if any.',
      usageExample: {
        scenario: 'Auto-create a meeting notes document for each calendar event',
        inputValues: { operation: 'create', title: 'Meeting Notes — {{$json.eventTitle}} — {{$json.date}}', content: 'Attendees: {{$json.attendees}}\nAgenda: {{$json.agenda}}' },
        expectedOutput: 'New doc is created in Google Drive. Use `{{$json.documentUrl}}` to share it directly.',
      },
    },
    append: {
      description: 'Insert new text just before the end of an existing Google Doc, leaving existing content untouched.',
      outputExample: { success: true, documentId: '1a2b3c4d5e6f7g8h9i0j', content: '\n2025-01-19: Deployment completed successfully.' },
      outputDescription: 'success: true once the new text is inserted. documentId: the resolved document. content: the text that was added, echoed back for confirmation (prior content is not returned).',
      usageExample: {
        scenario: 'Append a summary to a running report document',
        inputValues: { operation: 'append', documentUrl: 'https://docs.google.com/document/d/{{$json.docId}}/edit', content: '\n\n--- {{$now}} ---\n{{$json.summary}}' },
        expectedOutput: 'Text is appended to the end of the document, after everything already there.',
      },
    },
  },

  gmail_trigger: {
    default: {
      description: 'Receive a Gmail Pub/Sub push notification, validate OIDC or shared-secret auth, read Gmail history from the stored historyId, filter accepted message and label events, and start one workflow execution per accepted event. Watch registration calls Gmail users.watch for the connected account and stores watch state under gmail:watch:${workflowId}:${nodeId}.',
      outputExample: {
        eventId: 'msg_1784399000-message_added',
        eventType: 'message_added',
        source: 'gmail',
        userId: 'support@example.com',
        username: 'support@example.com',
        text: 'Hi, I need help with invoice INV-1042...',
        timestamp: '2026-07-18T10:15:00.000Z',
        emailAddress: 'support@example.com',
        historyId: '1234567',
        messageId: 'msg_1784399000',
        threadId: 'thread_1042',
        subject: 'Invoice INV-1042 question',
        from: 'Customer Ops <customer@example.com>',
        to: 'support@example.com',
        snippet: 'Hi, I need help with invoice INV-1042...',
        labelIds: ['INBOX', 'IMPORTANT'],
        raw: { id: 'msg_1784399000', threadId: 'thread_1042', snippet: 'Hi, I need help with invoice INV-1042...' },
        trigger: 'gmail',
        workflow_id: 'workflow_123',
        node_id: 'gmail-trigger-1',
        sessionId: 'gmail_workflow_123_thread_1042',
        _gmail: true,
      },
      outputDescription: 'eventId: normalized message-event ID. eventType: message_added, label_added, label_removed, or message_deleted. source: gmail. userId: watched mailbox. username: watched mailbox. text: Gmail snippet. timestamp: message time or processing time. emailAddress: mailbox address from the Pub/Sub envelope. historyId: latest Gmail history cursor. messageId: Gmail message ID. threadId: Gmail thread ID. subject/from/to/snippet: metadata fetched from Gmail. labelIds: Gmail label IDs on the message. raw: raw Gmail metadata or deleted-message fallback. trigger: gmail marker. workflow_id: workflow receiving the event. node_id: trigger node ID. sessionId: Gmail trigger session ID. _gmail: internal true marker.',
      usageExample: {
        scenario: 'Send new invoice emails from a shared support inbox into AI triage and reply in the same Gmail thread',
        inputValues: {
          pubsubTopic: 'projects/acme-support/topics/gmail-inbox-notifications',
          eventTypes: 'message_added',
          labelIds: 'INBOX, IMPORTANT',
          query: 'invoice',
          validateAuth: 'true',
          audience: '',
          validationSecret: '',
        },
        expectedOutput: 'The next node can use {{$json.subject}}, {{$json.from}}, {{$json.snippet}}, {{$json.threadId}}, {{$json.messageId}}, {{$json.labelIds}}, and {{$json.eventType}}.',
      },
    },
  },

  google_drive_trigger: {
    default: {
      description: 'Receive a Google Drive push notification for the connected account, validate the stored channel ID/token, then read changed files from the Drive changes feed using the saved page token. Folder ID and Keyword Filter are applied after Drive returns file metadata, and activation stores a fresh start page token so old changes do not replay.',
      outputExample: {
        eventId: 'file_1-1784399000000',
        eventType: 'file_changed',
        source: 'google_drive',
        userId: 'owner@example.com',
        username: 'Owner Name',
        text: 'Vendor Invoice - July.pdf',
        timestamp: '2026-07-18T10:15:00.000Z',
        fileId: 'file_1',
        name: 'Vendor Invoice - July.pdf',
        mimeType: 'application/pdf',
        parents: ['1a2b3c4d5e6f7g8h9i0j'],
        modifiedTime: '2026-07-18T10:15:00.000Z',
        webViewLink: 'https://drive.google.com/file/d/file_1/view',
        raw: { fileId: 'file_1', removed: false, file: { id: 'file_1', name: 'Vendor Invoice - July.pdf' } },
        trigger: 'google_drive',
        workflow_id: 'workflow_123',
        node_id: 'drive-trigger-1',
        sessionId: 'gdrive_workflow_123_file_1',
        _googleDrive: true,
      },
      outputDescription: 'eventId: normalized change ID. eventType: file_changed or file_deleted. source: google_drive. userId: owner email when available. username: owner display name. text: file name. timestamp: modifiedTime or processing time. fileId: Drive file ID. name: Drive file name. mimeType: Drive MIME type. parents: parent folder IDs. modifiedTime: Drive modified timestamp or null. webViewLink: file link when available. raw: original Drive change object. trigger: google_drive marker. workflow_id: workflow receiving the event. node_id: trigger node ID. sessionId: Drive trigger session ID. _googleDrive: internal true marker.',
      usageExample: {
        scenario: 'Route new invoice PDFs uploaded to a shared finance folder into an approval workflow',
        inputValues: { folderId: '1a2b3c4d5e6f7g8h9i0j', eventTypes: 'file_changed', query: 'invoice' },
        expectedOutput: 'The next node can use {{$json.name}}, {{$json.fileId}}, {{$json.mimeType}}, {{$json.webViewLink}}, {{$json.parents}}, and {{$json.eventType}}.',
      },
    },
  },

  google_drive: {
    list: {
      description: 'List files in Google Drive, optionally scoped to one folder.',
      outputExample: { files: [{ id: 'file1', name: 'Q4 Report.pdf', mimeType: 'application/pdf', modifiedTime: '2025-01-14T10:00:00Z' }] },
      outputDescription: 'files: Array of file objects with id, name, mimeType, size, and modifiedTime, available directly at {{$json.files}}. data: the same raw Drive API response, duplicated for reference.',
      usageExample: {
        scenario: 'List all files in a specific Drive folder to process each one',
        inputValues: { operation: 'list', folderId: '{{$env.DRIVE_FOLDER_ID}}' },
        expectedOutput: 'Returns matching files. Loop over `{{$json.files}}` and use each `{{$json.id}}` in a Download operation.',
      },
    },
    upload: {
      description: 'Upload a file to Google Drive, given File Name and File Data (base64, plain text, or a data URL).',
      outputExample: { id: 'newFile456', name: 'report-2025-01.pdf', webViewLink: 'https://drive.google.com/file/d/newFile456/view', mimeType: 'application/pdf' },
      outputDescription: 'id/fileId: The new file ID in Drive (both keys hold the same value). name/fileName: File name. webViewLink: Browser-accessible URL to the file.',
      usageExample: {
        scenario: 'Upload a generated PDF report to a shared Drive folder',
        inputValues: { operation: 'upload', folderId: '{{$env.REPORTS_FOLDER_ID}}', fileName: 'report-{{$now}}.pdf', fileData: '{{$json.dataBase64}}', mimeType: 'application/pdf' },
        expectedOutput: 'File is uploaded. Share `{{$json.webViewLink}}` with stakeholders.',
      },
    },
    download: {
      description: 'Download an existing file\'s metadata and content by File ID.',
      outputExample: { fileId: 'file1', fileName: 'invoice.pdf', dataBase64: 'JVBERi0x...', mimeType: 'application/pdf', size: 204800 },
      outputDescription: 'fileId/id: The Drive file ID. fileName/name: The file name. dataBase64: base64-encoded content for binary files (used for most real files); a plain content field is used instead for text/JSON files. mimeType/size: file metadata.',
      usageExample: {
        scenario: 'Download an invoice PDF from Drive and attach it to an email',
        inputValues: { operation: 'download', fileId: '{{$json.id}}' },
        expectedOutput: 'File content is returned. Map `{{$json.dataBase64}}` into an Email attachment or a Write Binary File node.',
      },
    },
  },

  google_calendar_trigger: {
    default: {
      description: 'Receive a Google Calendar push notification for a watched calendar, validate the saved channel ID/token, then incrementally sync changed events and start the workflow for accepted event_changed or event_cancelled items. Initial channel sync notifications are only handshakes and do not start runs.',
      outputExample: {
        eventId: 'abc123-2026-07-18T09:30:00.000Z',
        eventType: 'event_changed',
        source: 'google_calendar',
        userId: 'organizer@example.com',
        username: 'organizer@example.com',
        text: 'Discuss renewal risks and next steps',
        timestamp: '2026-07-18T09:30:00.000Z',
        calendarId: 'primary',
        eventIdRaw: 'abc123',
        subject: 'Customer renewal review',
        organizer: 'organizer@example.com',
        start: '2026-07-20T14:00:00-04:00',
        end: '2026-07-20T14:30:00-04:00',
        attendees: ['ae@example.com', 'csm@example.com'],
        htmlLink: 'https://www.google.com/calendar/event?eid=abc123',
        raw: { id: 'abc123', status: 'confirmed', summary: 'Customer renewal review' },
        trigger: 'google_calendar',
        workflow_id: 'workflow_123',
        node_id: 'calendar-trigger-1',
        sessionId: 'gcal_workflow_123_abc123',
        _googleCalendar: true,
      },
      outputDescription: 'eventId: normalized event ID. eventType: event_changed or event_cancelled. source: google_calendar. userId: organizer email when available. username: organizer display name or email. text: description text. timestamp: updated time. calendarId: watched calendar. eventIdRaw: raw Google event ID. subject: event title. organizer: organizer email. start/end: event dates or timestamps. attendees: attendee email list. htmlLink: event link. raw: original Google event object. trigger: google_calendar marker. workflow_id: workflow receiving the event. node_id: trigger node ID. sessionId: calendar trigger session ID. _googleCalendar: internal true marker.',
      usageExample: {
        scenario: 'Prepare a customer renewal brief whenever a matching calendar event is created or updated',
        inputValues: { calendarId: 'primary', eventTypes: 'event_changed, event_cancelled', query: 'renewal' },
        expectedOutput: 'The next node can use {{$json.subject}}, {{$json.start}}, {{$json.organizer}}, {{$json.attendees}}, {{$json.eventType}}, and {{$json.htmlLink}}.',
      },
    },
  },

  google_calendar: {
    list: {
      description: 'List events from a Google Calendar within a time range.',
      outputExample: { items: [{ id: 'event1', summary: 'Team Standup', start: { dateTime: '2025-01-15T09:00:00Z' }, end: { dateTime: '2025-01-15T09:30:00Z' }, attendees: [{ email: 'alice@example.com' }] }] },
      outputDescription: 'items: Array of raw Google Calendar event objects. Each has id, summary, start, end, and attendees. No separate count field — use items.length.',
      usageExample: {
        scenario: 'Get today\'s meetings and post them as a morning summary to Slack',
        inputValues: { calendarId: 'primary', timeMin: '{{$now}}T00:00:00Z', timeMax: '{{$now}}T23:59:59Z', maxResults: '20' },
        expectedOutput: 'Returns all events today. Format `{{$json.items}}` into a Slack message with event summaries and times.',
      },
    },
    create: {
      description: 'Create a new event on a Google Calendar. Start Time/End Time are converted automatically into the API\'s start/end objects.',
      outputExample: { id: 'newEvent789', summary: 'Product Demo', start: { dateTime: '2025-01-20T14:00:00Z' }, end: { dateTime: '2025-01-20T15:00:00Z' }, htmlLink: 'https://calendar.google.com/event?eid=...' },
      outputDescription: 'id: The new calendar event ID (not eventId). summary: Event title. start/end: Event timestamps. htmlLink: URL to view the event in Google Calendar. The raw event object is merged directly into $json, not nested.',
      usageExample: {
        scenario: 'Create a Google Calendar event when a Calendly booking is confirmed',
        inputValues: { calendarId: 'primary', summary: '{{$json.eventType}} with {{$json.inviteeName}}', startTime: '{{$json.startTime}}', endTime: '{{$json.endTime}}', description: 'Booked via Calendly' },
        expectedOutput: 'Event is created. Share `{{$json.htmlLink}}` as a calendar invite link, and use `{{$json.id}}` to update or cancel it later.',
      },
    },
    update: {
      description: 'Update an existing Google Calendar event.',
      outputExample: { id: 'event1', summary: 'Rescheduled: Team Standup', start: { dateTime: '2025-01-16T10:00:00Z' }, updated: '2025-01-15T12:00:00Z' },
      outputDescription: 'id: The updated event ID. summary: Updated event title. updated: ISO timestamp of the last update. Only the fields you filled in are changed; everything else stays the same.',
      usageExample: {
        scenario: 'Reschedule an event when a Typeform rescheduling request comes in',
        inputValues: { calendarId: 'primary', eventId: '{{$json.id}}', summary: '{{$json.newTitle}}', startTime: '{{$json.newStartTime}}' },
        expectedOutput: 'Event is updated. `{{$json.updated}}` confirms the time of the change.',
      },
    },
  },

  google_tasks: {
    read: {
      description: 'Fetch every task in a list, or one specific task when Task Id is filled.',
      outputExample: { operation: 'read', data: { items: [{ id: 'task1', title: 'Follow up with vendor', status: 'needsAction' }] } },
      outputDescription: 'operation: echoes back "read". data.items: array of task objects when Task Id is empty. When Task Id is filled, data is a single task object instead.',
      usageExample: { scenario: 'Pull open tasks into a morning team digest', inputValues: { operation: 'read', taskListId: '@default', taskId: '' }, expectedOutput: 'Loop over `{{$json.data.items}}` and map `{{$json.data.items[].title}}` into a digest message.' },
    },
    create: {
      description: 'Add a new task to a task list, given a Title and optional Notes/Due Date.',
      outputExample: { operation: 'create', data: { id: 'newTask789', title: 'Review proposal', status: 'needsAction' } },
      outputDescription: 'operation: echoes back "create". data.id: the new task\'s ID, needed for later Update/Delete steps.',
      usageExample: { scenario: 'Create a follow-up task after a sales call is logged', inputValues: { operation: 'create', title: 'Follow up with {{$json.customerName}}', notes: '{{$json.callSummary}}' }, expectedOutput: 'A new task appears. Save `{{$json.data.id}}` to mark it complete later.' },
    },
    update: {
      description: 'Change a task\'s title, notes, due date, and/or completion status by Task Id.',
      outputExample: { operation: 'update', data: { id: 'task1', status: 'completed', completed: '2026-02-25T09:00:00.000Z' } },
      outputDescription: 'operation: echoes back "update". data.status/data.completed confirm completion state when Status is set to completed.',
      usageExample: { scenario: 'Mark a task complete when its related order ships', inputValues: { operation: 'update', taskId: '{{$json.data.id}}', status: 'completed' }, expectedOutput: 'The task is checked off. Use `{{$json.data.completed}}` to confirm when.' },
    },
    delete: {
      description: 'Permanently remove a task from a task list by Task Id.',
      outputExample: { operation: 'delete', data: { deleted: true, taskId: 'task1' } },
      outputDescription: 'operation: echoes back "delete". data.deleted: true once removed.',
      usageExample: { scenario: 'Remove a task when its related ticket is cancelled', inputValues: { operation: 'delete', taskId: '{{$json.data.id}}' }, expectedOutput: 'The task is removed. Use `{{$json.data.deleted}}` to confirm.' },
    },
  },

  google_contacts: {
    create: {
      description: 'Create a new contact in Google Contacts using Name, Email, and/or Phone.',
      outputExample: { operation: 'create', data: { resourceName: 'people/newContact456', names: [{ displayName: 'Bob Jones' }], emailAddresses: [{ value: 'bob@example.com' }] } },
      outputDescription: 'operation: echoes back "create". data.resourceName: The new contact\'s resource name/ID. data.names[0].displayName: Full name. data.emailAddresses[0].value: Primary email. All contact fields are nested under data, not at the top level.',
      usageExample: { scenario: 'Add form respondents as Google Contacts', inputValues: { operation: 'create', name: '{{$json.fullName}}', email: '{{$json.email}}' }, expectedOutput: 'Contact created. Use `{{$json.data.resourceName}}` to look up or update it later.' },
    },
    update: {
      description: 'Change the name, email, and/or phone of an existing contact identified by Contact ID.',
      outputExample: { operation: 'update', data: { resourceName: 'people/c123', names: [{ displayName: 'Alice M. Smith' }], phoneNumbers: [{ value: '+14155551234' }] } },
      outputDescription: 'operation: echoes back "update". data: the updated Google People API person resource, reflecting the new values.',
      usageExample: { scenario: 'Update a contact\'s phone number after a CRM record changes', inputValues: { operation: 'update', contactId: '{{$json.contactId}}', phone: '{{$json.newPhone}}' }, expectedOutput: 'Contact updated. Use `{{$json.data.phoneNumbers}}` to confirm the new number.' },
    },
    delete: {
      description: 'Permanently remove a contact from Google Contacts by Contact ID.',
      outputExample: { operation: 'delete', data: { deleted: true, contactId: 'people/c123' } },
      outputDescription: 'operation: echoes back "delete". data.deleted: true once removed. data.contactId: the identifier that was deleted.',
      usageExample: { scenario: 'Remove a contact when someone unsubscribes', inputValues: { operation: 'delete', contactId: '{{$json.contactId}}' }, expectedOutput: 'Contact removed. Use `{{$json.data.deleted}}` to confirm.' },
    },
    read: {
      description: 'List every contact (Contact ID empty) or fetch one specific contact (Contact ID filled). Shown as "List Contacts" in the operation dropdown.',
      outputExample: { operation: 'read', data: { connections: [{ resourceName: 'people/c123', names: [{ displayName: 'Alice Smith' }], emailAddresses: [{ value: 'alice@example.com' }] }], totalItems: 1 } },
      outputDescription: 'operation: echoes back "read". data.connections: array of contact objects when Contact Id is empty. Each has resourceName, names, and emailAddresses. When Contact Id is filled, data is a single contact object instead.',
      usageExample: { scenario: 'Sync Google Contacts with a CRM', inputValues: { operation: 'read', contactId: '', pageSize: '100' }, expectedOutput: 'Returns contacts. Map `{{$json.data.connections[].emailAddresses[0].value}}` to CRM fields.' },
    },
  },

  google_bigquery: {
    query: {
      description: 'Run a SQL query against Google BigQuery and return the raw jobs.query API response.',
      outputExample: { operation: 'query', data: { jobComplete: true, totalRows: '1250', schema: { fields: [{ name: 'user_id', type: 'STRING' }, { name: 'revenue', type: 'FLOAT' }] }, rows: [{ f: [{ v: '123' }, { v: '450.00' }] }] } },
      outputDescription: 'operation: echoes back "query". data.rows: BigQuery\'s raw {f: [{v}]} row format — not plain column-named objects. data.schema.fields: column names/types in the same order as each row\'s values; zip them together (e.g. in a JavaScript node) to get friendly objects. data.totalRows: total matching row count as a string.',
      usageExample: {
        scenario: 'Pull last 30 days of user revenue data for a monthly report',
        inputValues: { projectId: '{{$env.GCP_PROJECT_ID}}', query: 'SELECT user_id, SUM(amount) AS revenue FROM `myproject.analytics.orders` WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) GROUP BY user_id ORDER BY revenue DESC LIMIT 1000' },
        expectedOutput: 'Returns up to 1000 rows. Zip `{{$json.data.schema.fields}}` with each `{{$json.data.rows[].f}}` in a JavaScript node, then pass the resulting objects to a Google Sheets append node.',
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
      description: 'Make a yes-or-no workflow decision from previous-step data, then route matching work to TRUE and non-matching work to FALSE.',
      outputExample: {
        orderId: 'ORD-1042',
        customerEmail: 'buyer@example.com',
        orderTotal: 725,
        status: 'paid',
        condition: true,
        condition_result: true,
        conditionResult: true,
        result: true,
        branch: 'true',
      },
      outputDescription: 'The node preserves incoming business fields such as orderId, customerEmail, orderTotal, and status, then adds routing fields such as condition, condition_result, conditionResult, result, and branch. Downstream nodes can keep using the original {{$json.customerEmail}} and {{$json.orderTotal}} values.',
      usageExample: {
        scenario: 'Route paid orders over $500 to finance review and all other orders to standard fulfillment',
        inputValues: {
          conditions: '[{"field":"$json.orderTotal","operator":"greater_than_or_equal","value":500},{"field":"$json.status","operator":"equals","value":"paid"}]',
          combineOperation: 'AND',
        },
        expectedOutput: 'A paid order with {{$json.orderTotal}} of 725 leaves through TRUE; smaller or unpaid orders leave through FALSE. Both branches can still use {{$json.customerEmail}}.',
      },
    },
  },

  switch: {
    default: {
      description: 'Branch the workflow into multiple named paths by matching one incoming value against configured case values.',
      outputExample: {
        ticketId: 'TCK-2048',
        customerEmail: 'customer@example.com',
        category: 'billing',
        priority: 'normal',
        __routing: {
          matchedCase: 'billing',
          matchedLabel: 'Billing',
          expression: '{{$json.category}}',
          expressionValue: 'billing',
        },
      },
      outputDescription: 'The node preserves incoming business fields such as ticketId, customerEmail, category, and priority, then stores routing metadata under __routing with matchedCase, matchedLabel, expression, and expressionValue. Runtime metadata reports branch and caseMatched.',
      usageExample: {
        scenario: 'Route support tickets to Billing, Technical Support, or Customer Care based on category',
        inputValues: {
          expression: '{{$json.category}}',
          cases: '[{"value":"billing","label":"Billing"},{"value":"technical","label":"Technical"},{"value":"general","label":"General"}]',
        },
        expectedOutput: 'A ticket where {{$json.category}} is billing leaves through the billing case output; downstream nodes can still use {{$json.customerEmail}} and {{$json.ticketId}}.',
      },
    },
  },

  set: {
    default: {
      description: 'Add clean, predictable fields to the current item or overwrite existing fields so later workflow steps can map data without guessing the original source names.',
      outputExample: {
        leadId: 'lead_1042',
        firstName: 'Asha',
        lastName: 'Rao',
        email: 'asha.rao@example.com',
        customerEmail: 'asha.rao@example.com',
        fullName: 'Asha Rao',
        leadSource: 'Website demo request',
        lifecycleStage: 'new_lead',
        readyForSales: true,
      },
      outputDescription: 'The output keeps incoming values and applies the configured fields on top. Existing fields remain available unless a configured key overwrites them. New fields such as customerEmail, fullName, leadSource, lifecycleStage, and readyForSales can be used by the next node with {{$json.customerEmail}}, {{$json.fullName}}, {{$json.leadSource}}, {{$json.lifecycleStage}}, and {{$json.readyForSales}}.',
      usageExample: {
        scenario: 'Normalize a website demo request before creating a CRM lead and sending a sales alert',
        inputValues: {
          fields: '{"customerEmail":"{{$json.email}}","fullName":"{{$json.firstName}} {{$json.lastName}}","leadSource":"Website demo request","lifecycleStage":"new_lead","readyForSales":true}',
        },
        expectedOutput: 'The next node can use {{$json.customerEmail}}, {{$json.fullName}}, {{$json.leadSource}}, {{$json.lifecycleStage}}, and {{$json.readyForSales}} instead of depending on the original form labels.',
      },
    },
  },

  merge: {
    default: {
      description: 'Rejoin multiple workflow branches and combine their data into one output.',
      outputExample: {
        ticketId: 'TCK-2048',
        customer: { email: 'customer@example.com', tier: 'VIP' },
        approval: { status: 'approved', reviewer: 'finance@example.com' },
        mergeMode: 'deep_merge',
        sourceCount: 2,
      },
      outputDescription: 'The output is one combined payload. overwrite combines object fields with later branch values winning, append collects branch outputs into items, and deep_merge recursively combines nested objects. Runtime metadata can include mergeMode and sourceCount.',
      usageExample: {
        scenario: 'Rejoin approval and customer-enrichment branches before sending one summary email',
        inputValues: { mode: 'deep_merge' },
        expectedOutput: 'The next node can use {{$json.customer.email}} and {{$json.approval.status}} from the merged payload.',
      },
    },
  },

  error_handler: {
    default: {
      description: 'Mark an incoming `_error` payload as handled and optionally emit a fallback value.',
      outputExample: { _error: 'Connection timeout', handled: true, value: { status: 'error_handled' } },
      outputDescription: 'handled: true when `_error` exists and fallbackValue is configured; otherwise false. value: The configured fallbackValue when present.',
      usageExample: { scenario: 'Convert an upstream error payload into a handled fallback object', inputValues: { fallbackValue: '{"status": "unavailable"}' }, expectedOutput: 'On error, `{{$json.value}}` contains the configured fallback value.' },
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
      description: 'Call another active workflow and return its final inline result.',
      outputExample: { success: true, result: { processedCount: 42 }, workflowId: 'wf_sub123' },
      outputDescription: 'success: true when the sub-workflow completes. result: The final output from the called workflow. workflowId: The called workflow ID.',
      usageExample: { scenario: 'Call a reusable "send-notification" sub-workflow from multiple workflows', inputValues: { workflowId: '{{$env.NOTIFY_WORKFLOW_ID}}', input: '{"userId": "{{$json.userId}}", "message": "{{$json.message}}"}' }, expectedOutput: 'The sub-workflow runs and returns its final result in `{{$json.result}}`.' },
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
      description: 'Keep only the records in an array that match a rule, then pass the smaller list to the next step.',
      outputExample: {
        batchId: 'weekly-active-customers',
        items: [
          { id: 'cus_1001', name: 'Asha Rao', email: 'asha@example.com', status: 'active' },
          { id: 'cus_1003', name: 'Miguel Torres', email: 'miguel@example.com', status: 'active' },
        ],
        sourceCount: 4,
      },
      outputDescription: 'items: The incoming list replaced with only records where the condition returned true. Other fields such as batchId and sourceCount are preserved. If no array is found, the input may pass through unchanged; if filtering cannot run, _error explains the failure.',
      usageExample: {
        scenario: 'Keep only active contacts with real email addresses before a renewal campaign',
        inputValues: {
          array: '{{$json.contacts}}',
          condition: 'item.status === "active" && item.email && !item.email.includes("test")',
        },
        expectedOutput: 'The next node receives {{$json.items}} containing only matching contacts, while {{$json.batchId}} remains available.',
      },
    },
  },

  loop: {
    default: {
      description: 'Expose an upstream array as items, cap it at maxIterations, and add loop metadata. The current DAG runtime does not execute the downstream branch once per item.',
      outputExample: {
        reportDate: '2026-07-18',
        items: [
          { ticketId: 'SUP-1001', customerEmail: 'ana@example.com', priority: 'high' },
          { ticketId: 'SUP-1002', customerEmail: 'lee@example.com', priority: 'medium' },
        ],
        loop: { maxIterations: 25, iterations: 2, truncated: false },
        _warning: 'Loop: iteration over downstream subgraph is not supported in DAG runtime yet; use function_item for per-item transforms.',
      },
      outputDescription: 'items: The resolved array after applying maxIterations. loop.maxIterations: The configured cap. loop.iterations: Number of items exposed. loop.truncated: true when the original array was longer than the cap. _warning explains that DAG runtime exposes items and metadata but does not run the next branch once per item. Other incoming fields such as reportDate remain available.',
      usageExample: {
        scenario: 'Cap overdue support tickets before sending a review summary to a manager',
        inputValues: { array: '{{$json.overdueTickets}}', maxIterations: '25' },
        expectedOutput: 'The next node can use {{$json.items}}, {{$json.loop.iterations}}, {{$json.loop.truncated}}, and {{$json.reportDate}} to build a summary or decide whether more tickets need another run.',
      },
    },
  },

  split_in_batches: {
    default: {
      description: 'Divide an incoming array into smaller batch groups and expose batch metadata for downstream steps. The current DAG runtime does not automatically run the next branch once per batch.',
      outputExample: {
        syncDate: '2026-07-18',
        batches: [
          [{ contactId: 'con_1001', customerEmail: 'ana@example.com' }, { contactId: 'con_1002', customerEmail: 'lee@example.com' }],
          [{ contactId: 'con_1003', customerEmail: 'maya@example.com' }],
        ],
        batchSize: 2,
        totalBatches: 2,
        items: [{ contactId: 'con_1001', customerEmail: 'ana@example.com' }, { contactId: 'con_1002', customerEmail: 'lee@example.com' }],
        _warning: 'split_in_batches exposes batches; to iterate batches, use agent/loop mode (not yet enabled in DAG runtime).',
      },
      outputDescription: 'batches: All created groups as an array of arrays. batchSize: The group size used by runtime. totalBatches: Number of groups created. items: The first batch exposed for the next node. _warning explains that Split In Batches exposes batch data but does not execute the downstream branch once per batch in the current DAG runtime. Other incoming fields such as syncDate remain available.',
      usageExample: {
        scenario: 'Split new CRM contacts from a nightly export into smaller groups before a controlled sync',
        inputValues: { array: '{{$json.contacts}}', batchSize: '100' },
        expectedOutput: 'The next node can use {{$json.items}} for the first exposed batch, {{$json.batches}} for all groups, {{$json.totalBatches}} for logging, and {{$json.syncDate}} for audit notes.',
      },
    },
  },

  // ─── DATA TRANSFORMATION ──────────────────────────────────────────────────

  set_variable: {
    default: {
      description: 'Create one or more named output values for later workflow steps.',
      outputExample: { userEmail: 'alice@example.com' },
      outputDescription: 'The output contains the assigned variable fields. With keepSource enabled, incoming fields are kept too.',
      usageExample: { scenario: 'Store the current user\'s email early in the workflow to use in later nodes', inputValues: { name: 'userEmail', value: '{{$json.email}}' }, expectedOutput: 'Reference this value later as `{{$json.userEmail}}`.' },
    },
  },

  javascript: {
    default: {
      description: 'Run sandboxed JavaScript once against the current workflow data and return the script result directly.',
      outputExample: {
        orderId: 'ord_1042',
        customerEmail: 'asha.rao@example.com',
        orderTotal: 6400,
        riskScore: 90,
        eligibleForReview: true,
        processedAt: '2026-07-18T09:30:00.000Z',
      },
      outputDescription: 'The output, data, and result are whatever the script returns. Returned fields such as customerEmail, riskScore, eligibleForReview, and processedAt become the next node\'s {{$json}} values. Missing code, disabled execution, thrown errors, and timeouts can return _error.',
      usageExample: {
        scenario: 'Score large checkout orders before routing them to finance review or normal fulfillment',
        inputValues: {
          code: 'const total = Number($json.orderTotal || 0);\nreturn { ...$json, riskScore: total > 5000 ? 90 : 20, eligibleForReview: total > 5000, processedAt: "2026-07-18T09:30:00.000Z" };',
          timeout: '10000',
          outputSchema: '{"type":"object"}',
        },
        expectedOutput: 'Use {{$json.riskScore}} and {{$json.eligibleForReview}} in an If/Else node, and {{$json.customerEmail}} in downstream email, Slack, or CRM nodes.',
      },
    },
  },

  json_parser: {
    default: {
      description: 'Parse a JSON string into workflow data and optionally copy top-level fields.',
      outputExample: { parsed: { userId: 123, email: 'alice@example.com', plan: 'premium' }, email: 'alice@example.com' },
      outputDescription: 'parsed: The parsed object. extractFields copies requested top-level keys onto the output.',
      usageExample: { scenario: 'Parse a JSON payload received from a webhook', inputValues: { json: '{{$json.rawBody}}', extractFields: '["email"]' }, expectedOutput: 'Access the parsed object via `{{$json.parsed}}` and copied fields via `{{$json.email}}`.' },
    },
  },

  date_time: {
    now: {
      description: 'Return the current date/time, optionally formatted in a timezone.',
      outputExample: { datetime: '2026-07-12T09:00:00.000Z', timestamp: 1783855800000 },
      outputDescription: 'datetime: Current date/time as ISO or timezone-formatted text. timestamp: Current Unix time in milliseconds.',
      usageExample: { scenario: 'Stamp a record with the current workflow run time', inputValues: { operation: 'now', timezone: 'UTC' }, expectedOutput: 'Use `{{$json.datetime}}` as the generated timestamp.' },
    },
    format: {
      description: 'Format a date/time value into a specific string format.',
      outputExample: { datetime: '2026-07-12T09:00:00.000Z' },
      outputDescription: 'datetime: The formatted date/time string.',
      usageExample: { scenario: 'Format an ISO date from a database for display in an email', inputValues: { date: '{{$json.createdAt}}', format: 'LOCALE', locale: 'en-US' }, expectedOutput: 'Formatted date string in `{{$json.datetime}}`.' },
    },
    add: {
      description: 'Add time to a date.',
      outputExample: { datetime: '2026-07-19T09:00:00.000Z' },
      outputDescription: 'datetime: The date after adding the configured value and unit.',
      usageExample: { scenario: 'Calculate an expiry date 30 days from now for a trial subscription', inputValues: { date: '{{$json.startedAt}}', value: '30', unit: 'days' }, expectedOutput: 'Trial expiry date in `{{$json.datetime}}`.' },
    },
    subtract: {
      description: 'Subtract time from a date.',
      outputExample: { datetime: '2026-07-05T09:00:00.000Z' },
      outputDescription: 'datetime: The date after subtracting the configured value and unit.',
      usageExample: { scenario: 'Find the start of a seven-day lookback window', inputValues: { date: '{{$now}}', value: '7', unit: 'days' }, expectedOutput: 'Lookback start date in `{{$json.datetime}}`.' },
    },
    diff: {
      description: 'Calculate the difference between two dates.',
      outputExample: { diff: 1440, diffMs: 86400000, unit: 'minutes' },
      outputDescription: 'diff: Difference in the selected unit. diffMs: Difference in milliseconds. unit: Unit used for diff.',
      usageExample: { scenario: 'Calculate minutes between order creation and fulfillment', inputValues: { date: '{{$json.createdAt}}', endDate: '{{$json.fulfilledAt}}', unit: 'minutes' }, expectedOutput: 'Difference is available as `{{$json.diff}}`.' },
    },
    convertTimezone: {
      description: 'Format a date/time in the requested IANA timezone.',
      outputExample: { datetime: '2026-07-12T14:30:00', timezone: 'Asia/Kolkata' },
      outputDescription: 'datetime: Date/time rendered in the target timezone. timezone: Target timezone used.',
      usageExample: { scenario: 'Convert a UTC event time to customer local time', inputValues: { date: '{{$json.eventTime}}', timezone: 'Asia/Kolkata' }, expectedOutput: 'Local time in `{{$json.datetime}}`.' },
    },
    getTimezoneInfo: {
      description: 'Return timezone offset and display name for a date.',
      outputExample: { timezone: 'Asia/Kolkata', offset: '+05:30', longName: 'India Standard Time', isoDate: '2026-07-12T09:00:00.000Z' },
      outputDescription: 'timezone: IANA timezone. offset: GMT offset. longName: Human-readable timezone name. isoDate: Base date as ISO.',
      usageExample: { scenario: 'Add timezone details to a scheduling confirmation', inputValues: { date: '{{$json.meetingTime}}', timezone: 'Asia/Kolkata' }, expectedOutput: 'Timezone details are available for downstream messages.' },
    },
  },

  text_formatter: {
    default: {
      description: 'Render text from a template and current workflow data.',
      outputExample: { formatted: 'Order #12345 - Total: 49.99' },
      outputDescription: 'When a template is provided, the node returns the formatted string. If the template is empty, it returns input data plus formatted.',
      usageExample: { scenario: 'Create a notification message from order data', inputValues: { template: 'Order #{{$json.orderId}} - Total: {{$json.total}}' }, expectedOutput: 'Formatted text is available as the node output.' },
    },
  },

  math: {
    default: {
      description: 'Perform math using operation, value1, value2, and precision.',
      outputExample: { result: 15, operation: 'sum' },
      outputDescription: 'result: The computed result. operation: The operation used.',
      usageExample: { scenario: 'Sum a list of invoice amounts', inputValues: { operation: 'sum', value1: '{{$json.amounts}}' }, expectedOutput: 'The numeric total is available as `{{$json.result}}`.' },
    },
  },

  edit_fields: {
    default: {
      description: 'Add, overwrite, or normalize fields on the current item using simple key-value mappings.',
      outputExample: {
        ticketId: 'SUP-1042',
        email: 'maya@example.com',
        fname: 'Maya',
        lname: 'Chen',
        customerEmail: 'maya@example.com',
        fullName: 'Maya Chen',
        priorityLabel: 'High',
        needsManagerReview: true,
      },
      outputDescription: 'The output is the incoming item plus each configured field value. Existing values remain available unless a configured field overwrites the same key. New fields such as customerEmail, fullName, priorityLabel, and needsManagerReview can be used by the next node. If fields is not an object, runtime returns _error.',
      usageExample: {
        scenario: 'Normalize support webhook data before creating a helpdesk ticket and alerting a manager',
        inputValues: { fields: '{"customerEmail":"{{$json.email}}","fullName":"{{$json.fname}} {{$json.lname}}","priorityLabel":"High","needsManagerReview":true}' },
        expectedOutput: 'The next node can use {{$json.customerEmail}}, {{$json.fullName}}, {{$json.priorityLabel}}, and {{$json.needsManagerReview}} while {{$json.ticketId}} remains available.',
      },
    },
  },

  aggregate: {
    default: {
      description: 'Aggregate an array of items — sum, average, count, min, max, or group.',
      outputExample: { aggregate: 4500, operation: 'sum', field: 'amount' },
      outputDescription: 'aggregate: The computed value. operation: Aggregation operation used. field: Field path used when configured.',
      usageExample: { scenario: 'Calculate total sales from an array of order amounts', inputValues: { field: 'amount', operation: 'sum' }, expectedOutput: '`{{$json.aggregate}}` holds the total sales figure.' },
    },
  },

  sort: {
    default: {
      description: 'Sort input.items by a field in ascending or descending order.',
      outputExample: { items: [{ name: 'Alice', score: 95 }, { name: 'Bob', score: 80 }, { name: 'Carol', score: 72 }] },
      outputDescription: 'items: The sorted input.items array. If input.items is missing, input is returned unchanged.',
      usageExample: { scenario: 'Sort a leaderboard by score descending before displaying it', inputValues: { field: 'score', direction: 'desc', type: 'number' }, expectedOutput: 'Top scores first in `{{$json.items}}`.' },
    },
  },

  limit: {
    default: {
      description: 'Take only the first N items from an array.',
      outputExample: { items: [{ id: 1 }, { id: 2 }, { id: 3 }], array: [{ id: 1 }, { id: 2 }, { id: 3 }] },
      outputDescription: 'items and array contain the truncated array.',
      usageExample: { scenario: 'Take only the top 5 results from a large dataset', inputValues: { array: '{{$json.results}}', limit: '5' }, expectedOutput: 'First 5 items in `{{$json.items}}`.' },
    },
  },

  csv: {
    parse: {
      description: 'Parse a CSV string into an array of objects.',
      outputExample: { items: [{ Name: 'Alice', Email: 'alice@example.com', Plan: 'Pro' }, { Name: 'Bob', Email: 'bob@example.com', Plan: 'Free' }], rows: [{ Name: 'Alice', Email: 'alice@example.com', Plan: 'Pro' }], headers: ['Name', 'Email', 'Plan'] },
      outputDescription: 'items/rows: Array of parsed row objects. headers: Column names used as object keys.',
      usageExample: { scenario: 'Parse a CSV file downloaded from Google Drive into structured data', inputValues: { csv: '{{$json.content}}', hasHeader: 'true', delimiter: ',' }, expectedOutput: 'Each row becomes an object. Loop over `{{$json.items}}` or `{{$json.rows}}` to process each.' },
    },
    generate: {
      description: 'Convert an array of objects into a CSV string.',
      outputExample: { csv: 'Name,Email,Status\nAlice,alice@example.com,Active\nBob,bob@example.com,Inactive' },
      outputDescription: 'csv: The generated CSV string.',
      usageExample: { scenario: 'Export a list of users as a CSV to upload to Google Drive', inputValues: { data: '{{$json.users}}', delimiter: ',' }, expectedOutput: 'CSV string in `{{$json.csv}}`. Pass to a Google Drive upload node.' },
    },
  },

  html: {
    parse: {
      description: 'Parse an HTML document into page title, meta tags, and body HTML.',
      outputExample: { title: 'Example Domain', meta: { description: 'Example page' }, body: '<h1>Example Domain</h1>', success: true },
      outputDescription: 'title: Page title. meta: Meta tag content keyed by name/property. body: Inner body HTML. success: true on success.',
      usageExample: { scenario: 'Read title and metadata from a fetched page', inputValues: { html: '{{$json.pageContent}}' }, expectedOutput: 'Use `{{$json.title}}`, `{{$json.meta}}`, or `{{$json.body}}` downstream.' },
    },
    extract: {
      description: 'Extract text from elements that match a CSS selector.',
      outputExample: { results: ['$42.00'], count: 1, success: true },
      outputDescription: 'results: Text from each matched element. count: Number of matched elements. success: true on success.',
      usageExample: { scenario: 'Scrape a product page price', inputValues: { html: '{{$json.pageContent}}', selector: '.price' }, expectedOutput: 'Extracted values are in `{{$json.results}}`.' },
    },
    toText: {
      description: 'Convert HTML body content to plain text.',
      outputExample: { text: 'Example Domain This domain is for use in illustrative examples.', success: true },
      outputDescription: 'text: Plain text from the body element. success: true on success.',
      usageExample: { scenario: 'Convert downloaded HTML into plain text for an AI step', inputValues: { html: '{{$json.pageContent}}' }, expectedOutput: 'Plain text is available in `{{$json.text}}`.' },
    },
  },

  xml: {
    default: {
      description: 'Parse, extract from, or validate XML content.',
      outputExample: { data: { root: { order: { id: '123', customer: 'Alice' } } }, success: true },
      outputDescription: 'Parse returns data/success. Extract returns result/xpath/data/success. Validate returns valid/errors.',
      usageExample: { scenario: 'Extract an order id from a legacy SOAP response', inputValues: { operation: 'extract', xml: '{{$json.responseBody}}', xpath: '/root/order/id' }, expectedOutput: 'The extracted value is available as `{{$json.result}}`.' },
    },
  },

  // ─── UTILITY & HTTP ───────────────────────────────────────────────────────

  http_request: {
    default: {
      description: 'Call an external API or webhook using GET, POST, PUT, PATCH, or DELETE, then pass the response status, headers, body, data mirror, final URL, and acknowledgement metadata to the next node.',
      outputExample: {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json; charset=utf-8', 'x-request-id': 'req_789' },
        body: { customerId: 'cus_1042', customerEmail: 'asha.rao@example.com', invoiceStatus: 'paid', balanceDue: 0 },
        data: { customerId: 'cus_1042', customerEmail: 'asha.rao@example.com', invoiceStatus: 'paid', balanceDue: 0 },
        url: 'https://api.billing.example.com/v1/customers/cus_1042/invoices?limit=1',
        acknowledgementStatus: 'acknowledged',
      },
      outputDescription: 'status: HTTP response code. statusText: server reason text. headers: response headers. body: parsed JSON response or response text. data: same response body for mapping convenience. url: final URL after Query String Params are applied. acknowledgementStatus: runtime response-read metadata. Network failures and timeouts can return _error with url, method, and errorDetails.',
      usageExample: {
        scenario: 'Fetch the latest billing status for a customer after a CRM trigger provides the customer ID',
        inputValues: {
          url: 'https://api.billing.example.com/v1/customers/{{$json.customerId}}/invoices',
          method: 'GET',
          headers: '{"Accept":"application/json","X-Request-Source":"ctrlchecks-workflow"}',
          body: '',
          qs: '{"limit":1,"status":"latest"}',
          timeout: '30000',
        },
        expectedOutput: 'Use {{$json.status}} to branch on the HTTP result, {{$json.body.invoiceStatus}} or {{$json.data.customerEmail}} for response fields, and {{$json.url}} for audit logs.',
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
      usageExample: { scenario: 'Fetch user orders from a Shopify GraphQL API', inputValues: { url: 'https://yourstore.myshopify.com/api/2024-01/graphql.json', query: 'query { customer(id: "{{$json.customerId}}") { id name email orders(first: 5) { nodes { id totalPrice } } } }', headers: '{"X-Shopify-Access-Token": "{{$env.SHOPIFY_TOKEN}}"}' }, expectedOutput: 'Returns `data.customer` with nested orders array.' },
    },
    mutate: {
      description: 'Execute a GraphQL mutation to create or update data.',
      outputExample: { data: { createOrder: { id: 'new_ord_456', status: 'created' } }, errors: null },
      outputDescription: 'data: The mutation result data. errors: GraphQL errors if any.',
      usageExample: { scenario: 'Create a new order via GraphQL mutation', inputValues: { url: 'https://api.example.com/graphql', query: 'mutation CreateOrder($input: OrderInput!) { createOrder(input: $input) { id status } }', variables: '{"input": {"customerId": "{{$json.customerId}}", "items": []}}' }, expectedOutput: '`data.createOrder.id` is the new order ID.' },
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
      outputExample: { statusCode: 200, body: { ok: true, orderId: 'ord_123' }, headers: { 'Content-Type': 'application/json' } },
      outputDescription: 'statusCode: HTTP status returned to the caller. body: The response payload sent back. headers: Response headers sent back.',
      usageExample: {
        scenario: 'Return a success message to a checkout form after creating an order',
        inputValues: { statusCode: '200', body: '{"ok":true,"orderId":"{{$json.orderId}}"}' },
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
