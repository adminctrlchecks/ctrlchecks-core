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

  // ─── CRM ──────────────────────────────────────────────────────────────────

  activecampaign: {
    add: {
      description: 'Creates a new contact in ActiveCampaign via POST /api/3/contacts. Requires Email (or a Data payload that includes one).',
      outputExample: {
        operation: 'add',
        data: {
          contact: {
            id: '482',
            email: 'newlead@example.com',
            firstName: 'Alex',
            lastName: 'Morgan',
            cdate: '2026-07-19T10:20:00-05:00',
          },
        },
      },
      outputDescription: 'operation: echoes back add. data: the raw ActiveCampaign API response — a contact object with id, email, firstName, lastName, cdate, and any other fields ActiveCampaign includes. Use {{$json.data.contact.id}} to capture the new contact\'s ID for a later Update or Delete.',
      usageExample: {
        scenario: 'Add a new website lead to ActiveCampaign as a contact',
        inputValues: { email: '{{$json.formEmail}}', firstName: '{{$json.formFirstName}}', lastName: '{{$json.formLastName}}' },
        expectedOutput: 'A new ActiveCampaign contact is created. Use {{$json.data.contact.id}} in a later step to tag or update this exact contact.',
      },
    },
    update: {
      description: 'Updates an existing contact in ActiveCampaign via PUT /api/3/contacts/{id}, identified by Contact ID.',
      outputExample: {
        operation: 'update',
        data: {
          contact: {
            id: '482',
            email: 'updated@example.com',
            firstName: 'Alex',
            lastName: 'Morgan',
            udate: '2026-07-19T10:25:00-05:00',
          },
        },
      },
      outputDescription: 'operation: echoes back update. data: the raw ActiveCampaign API response — the updated contact object with id, email, firstName, lastName, udate, and any other fields. Use {{$json.data.contact.id}} to confirm which contact was updated.',
      usageExample: {
        scenario: 'Update a contact\'s email address after a CRM change',
        inputValues: { contactId: '{{$json.contactId}}', email: '{{$json.newEmail}}' },
        expectedOutput: 'The existing ActiveCampaign contact\'s email is updated. {{$json.data.contact.email}} reflects the new value.',
      },
    },
    delete: {
      description: 'Permanently deletes an existing contact from ActiveCampaign via DELETE /api/3/contacts/{id}, identified by Contact ID. Cannot be undone.',
      outputExample: {
        operation: 'delete',
        data: { deleted: true, contactId: '482' },
      },
      outputDescription: 'operation: echoes back delete. data: unlike Add/Update, ActiveCampaign\'s delete endpoint returns no body, so this node returns a simple confirmation object {deleted: true, contactId}. Use {{$json.data.deleted}} to confirm success.',
      usageExample: {
        scenario: 'Remove a contact from ActiveCampaign after they unsubscribe or request data deletion',
        inputValues: { contactId: '{{$json.contactId}}' },
        expectedOutput: 'The contact is permanently removed from ActiveCampaign. {{$json.data.deleted}} confirms the deletion.',
      },
    },
  },

  freshdesk: {
    get: {
      description: "Fetches one existing Freshdesk record (ticket, contact, or company) by its numeric ID via GET /api/v2/{resource}/{id} and returns Freshdesk's full raw record.",
      outputExample: { success: true, item: { id: 12345, subject: 'Cannot log in', status: 2, priority: 1 } },
      outputDescription: 'success: true when Freshdesk accepted the request. item: the full raw record Freshdesk returned for the requested Resource and ID. Use {{$json.item.subject}} or {{$json.item.status}} in a downstream node.',
      usageExample: {
        scenario: 'Pull the full details of one support ticket before summarizing it in a daily digest',
        inputValues: { domain: 'mycompany.freshdesk.com', apiKey: '', resource: 'ticket', operation: 'get', id: '12345' },
        expectedOutput: 'Freshdesk returns the ticket as {{$json.item}}. Use {{$json.item.subject}} in a summary message.',
      },
    },
    list: {
      description: "Fetches every existing Freshdesk record of the chosen Resource type via GET /api/v2/{resource} using Freshdesk's own default page and page size.",
      outputExample: { success: true, items: [{ id: 12345, subject: 'Cannot log in', status: 2 }, { id: 12346, subject: 'Billing question', status: 3 }] },
      outputDescription: 'success: true when Freshdesk accepted the request. items: the raw array Freshdesk returned for every record of the chosen Resource - this node does not filter, sort, or page results itself.',
      usageExample: {
        scenario: 'Pull every open ticket once an hour to build a live support backlog count',
        inputValues: { domain: 'mycompany.freshdesk.com', apiKey: '', resource: 'ticket', operation: 'list' },
        expectedOutput: 'Freshdesk returns every record as {{$json.items}}, which a Loop node can iterate over.',
      },
    },
    create: {
      description: 'Creates a new Freshdesk record via POST /api/v2/{resource}, from a raw Data JSON payload or, for ticket resources only, from the Subject/Description Text/Email convenience fields.',
      outputExample: { success: true, created: { id: 12347, subject: 'Welcome, Alice', status: 2, priority: 1 } },
      outputDescription: 'success: true when Freshdesk accepted the request. created: the full raw record Freshdesk created, including the new id you will need for a later Update or Delete step.',
      usageExample: {
        scenario: 'Open a welcome support ticket for every new customer as soon as they register',
        inputValues: { domain: 'mycompany.freshdesk.com', apiKey: '', resource: 'ticket', operation: 'create', subject: 'Welcome, {{$json.name}}' },
        expectedOutput: 'Freshdesk returns the new ticket as {{$json.created}}, including {{$json.created.id}} for a later Update step.',
      },
    },
    update: {
      description: "Updates an existing Freshdesk record via PUT /api/v2/{resource}/{id} with the fields supplied in Data, and returns Freshdesk's full record after the change.",
      outputExample: { success: true, updated: { id: 12345, subject: 'Cannot log in - resolved', status: 4 } },
      outputDescription: 'success: true when Freshdesk accepted the request. updated: the full raw record Freshdesk returned after applying the Data change. Use {{$json.updated.status}} to confirm the new status.',
      usageExample: {
        scenario: 'Mark a support ticket Resolved once an agent finishes the fix',
        inputValues: { domain: 'mycompany.freshdesk.com', apiKey: '', resource: 'ticket', operation: 'update', id: '12345' },
        expectedOutput: 'Freshdesk returns the changed ticket as {{$json.updated}}. Confirm {{$json.updated.status}} is now Resolved.',
      },
    },
    delete: {
      description: "Permanently deletes an existing Freshdesk record via DELETE /api/v2/{resource}/{id}. Freshdesk's delete endpoint returns no body, so this node reports a synthetic confirmation instead.",
      outputExample: { success: true, deleted: true, id: '12345' },
      outputDescription: 'success: true when Freshdesk accepted the request. deleted: always true on success, since Freshdesk returns no body. id: the same Resource ID that was deleted, echoed back for confirmation.',
      usageExample: {
        scenario: 'Remove duplicate test tickets created accidentally during an integration test run',
        inputValues: { domain: 'mycompany.freshdesk.com', apiKey: '', resource: 'ticket', operation: 'delete', id: '12345' },
        expectedOutput: 'Freshdesk confirms removal as {{$json.deleted}} and {{$json.id}}.',
      },
    },
  },

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
      description: 'Start the workflow automatically and repeatedly, waiting the configured Interval/Unit between each run once the workflow is saved and active. Recurring runs are driven by a scheduler that runs in an open CtrlChecks browser tab, not a separate always-on server job.',
      outputExample: { executed_at: '2026-07-19T10:05:00.000Z', _scheduled: 'true', _trigger: 'schedule' },
      outputDescription: 'executed_at: ISO timestamp of this run, generated fresh every time the trigger fires. _scheduled/_trigger: internal marker fields the browser-based scheduler sends with every automatic call; _trigger is always "schedule" here, even for Interval Trigger runs.',
      usageExample: {
        scenario: 'Poll a support inbox every 5 minutes for new messages',
        inputValues: { interval: '5', unit: 'minutes' },
        expectedOutput: 'The workflow fires every 5 minutes once activated and a browser tab has initialized the schedule. Connect an HTTP Request or Gmail node to fetch new messages on each run.',
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

  instagram_trigger: {
    receive: {
      description: 'Receive Meta Instagram webhook deliveries, verify the callback token during setup, optionally validate X-Hub-Signature-256, filter accepted event types/business account/senders, normalize DMs, story replies, comments, mentions, and postbacks, and start one workflow execution per accepted event.',
      outputExample: {
        eventId: 'mid.$abc123',
        eventType: 'message.text',
        source: 'instagram',
        userId: '1234567890',
        username: '',
        text: 'Can you help me?',
        timestamp: '2026-07-19T10:30:00.000Z',
        chatId: '1234567890',
        senderId: '1234567890',
        recipientId: '17841400000000000',
        instagramBusinessAccountId: '17841400000000000',
        pageId: null,
        messageId: 'mid.$abc123',
        messageType: 'text',
        commentId: null,
        mediaId: null,
        mentionId: null,
        postbackPayload: '',
        isStoryReply: false,
        raw: { entry: [{ messaging: [{ message: { mid: 'mid.$abc123' } }] }] },
        trigger: 'instagram',
        workflow_id: 'workflow_123',
        node_id: 'instagram-trigger-1',
        sessionId: 'instagram_workflow_123_1234567890',
        _instagram: true,
      },
      outputDescription: 'eventId: event identifier. eventType: message.text, message.media, message.story_reply, comment, mention, or postback. source: instagram. userId/username: sender identity when available. text: normalized DM/comment/postback text. timestamp: ISO event time. chatId/senderId: values for DM replies. recipientId/instagramBusinessAccountId: receiving Instagram account identity. pageId: linked Facebook Page ID when Meta includes it, otherwise null. messageId/messageType: DM message details. commentId/mediaId/mentionId: comment and mention identifiers. postbackPayload: quick reply/postback payload. isStoryReply: true for story reply DMs. raw: original event fragment. trigger/workflow_id/node_id/sessionId/_instagram: CtrlChecks trigger metadata.',
      usageExample: {
        scenario: 'Reply to Instagram DM questions with an AI Agent and send the answer back from the same account',
        inputValues: {
          connectionId: '',
          eventTypes: 'message, message.story_reply',
          instagramBusinessAccountId: '17841400000000000',
          allowedSenderIds: '',
          verifyToken: 'ig-webhook-verify-2026-support',
          validateSignature: 'true',
        },
        expectedOutput: 'Use {{$json.text}} as the visitor question, {{$json.senderId}} as the Instagram recipientId, {{$json.instagramBusinessAccountId}} for the receiving account, and {{$json.eventType}} for routing.',
      },
    },
  },

  jira_trigger: {
    receive: {
      description: 'Receive Jira Cloud webhook deliveries, validate the shared per-node secret (Jira does not sign payloads), filter accepted event types/project/keyword, normalize issue and comment payloads, and start one workflow execution per accepted event.',
      outputExample: {
        eventId: '10002',
        eventType: 'jira:issue_created',
        source: 'jira',
        userId: '5b10a2844c20165700ede21g',
        username: 'Alex Morgan',
        text: 'Bug: something broke',
        timestamp: '2026-07-19T10:20:00.000Z',
        siteUrl: 'https://yourcompany.atlassian.net',
        cloudId: null,
        issueKey: 'PROJ-123',
        issueId: '10002',
        issueSummary: 'Bug: something broke',
        issueUrl: 'https://yourcompany.atlassian.net/browse/PROJ-123',
        issueType: 'Bug',
        issueStatus: 'To Do',
        projectKey: 'PROJ',
        commentBody: null,
        commentUrl: null,
        raw: {},
        trigger: 'jira',
        workflow_id: 'workflow_123',
        node_id: 'jira-trigger-1',
        sessionId: 'jira_workflow_123_10002',
        _jira: true,
      },
      outputDescription: 'eventId: issue/comment ID or generated fallback. eventType: the raw webhookEvent value Jira sent. source: jira. userId/username: the Jira account behind the event when available. text: issue summary or comment body. timestamp: ISO event time. siteUrl/issueUrl: derived Atlassian links. issueKey/issueId/issueSummary/issueType/issueStatus/projectKey: issue details. commentBody/commentUrl: populated only for comment events. cloudId: reserved, always null today. raw: original Jira payload. trigger/workflow_id/node_id/sessionId/_jira: CtrlChecks trigger metadata.',
      usageExample: {
        scenario: 'Triage new Jira issues with an AI Agent and post a summary comment back on the issue',
        inputValues: {
          siteUrl: '',
          projectKey: 'PROJ',
          eventTypes: 'jira:issue_created',
          secretToken: '',
          jql: '',
          query: '',
        },
        expectedOutput: 'Use {{$json.issueKey}} and {{$json.issueSummary}} in an AI Agent or downstream Jira action node, and {{$json.issueUrl}} in a Slack/email notification.',
      },
    },
  },

  linear_trigger: {
    issue_comment_events: {
      description: 'Receive Linear webhook deliveries, automatically registered via Linear\'s webhookCreate GraphQL mutation, validate the Linear-Signature HMAC and webhook timestamp, filter accepted team/resource/event/keyword, normalize issue/comment/project/other resource payloads, and start one workflow execution per accepted event.',
      outputExample: {
        eventId: 'a1b2c3d4-0000-0000-0000-000000000000',
        eventType: 'issue_created',
        source: 'linear',
        userId: 'user_uuid',
        username: 'Alex Morgan',
        text: 'Fix billing retry',
        timestamp: '2026-07-19T10:20:00.000Z',
        teamId: 'team_uuid',
        teamKey: 'ENG',
        issueId: 'issue_uuid',
        issueIdentifier: 'ENG-123',
        issueTitle: 'Fix billing retry',
        issueUrl: 'https://linear.app/yourteam/issue/ENG-123',
        stateName: 'Todo',
        commentBody: null,
        projectId: null,
        raw: {},
        trigger: 'linear',
        workflow_id: 'workflow_123',
        node_id: 'linear-trigger-1',
        sessionId: 'linear_workflow_123_a1b2c3d4-0000-0000-0000-000000000000',
        _linear: true,
      },
      outputDescription: 'eventId: deliveryId/webhookId/entity ID. eventType: normalized resource_action value such as issue_created. source: linear. userId/username: the Linear user behind the change. text: issue title, comment body, or project name. timestamp: ISO event time. teamId/teamKey: the Linear team the entity belongs to. issueId/issueIdentifier/issueTitle/issueUrl/stateName: issue details, null on non-issue events. commentBody: populated only for comment events. projectId: populated only for project events. raw: original Linear payload. trigger/workflow_id/node_id/sessionId/_linear: CtrlChecks trigger metadata.',
      usageExample: {
        scenario: 'Triage new Linear issues with an AI Agent and notify the team in Slack',
        inputValues: {
          teamId: '',
          allPublicTeams: 'true',
          resourceTypes: 'Issue, Comment',
          eventTypes: 'issue_created',
          issueId: '',
          projectId: '',
          actorId: '',
          query: '',
        },
        expectedOutput: 'A normalized Linear issue payload available as {{$json.issueId}}, {{$json.issueIdentifier}}, {{$json.issueTitle}}, and {{$json.teamKey}} for an AI Agent or Slack notification node.',
      },
    },
  },

  microsoft_teams_trigger: {
    receive: {
      description: 'Receive Microsoft Teams Bot Framework activities, validate the Bot Framework JWT or a configured shared secret, filter accepted event types/team/channel/user/tenant, normalize channel/personal messages, conversation updates, reactions, and invoke actions, and start one workflow execution per accepted activity.',
      outputExample: {
        eventId: 'activity-1',
        eventType: 'message',
        source: 'microsoft_teams',
        userId: 'aad-object-id-1',
        username: 'Alex Morgan',
        text: 'Can you help?',
        timestamp: '2026-07-19T10:20:00.000Z',
        tenantId: 'tenant-1',
        teamId: 'team-1',
        channelId: 'channel-1',
        chatId: 'channel-1',
        conversationId: 'conversation-1',
        serviceUrl: 'https://smba.trafficmanager.net/amer/',
        activityId: 'activity-1',
        replyToId: 'activity-1',
        locale: 'en-US',
        channelData: {},
        raw: {},
        trigger: 'microsoft_teams',
        workflow_id: 'workflow_123',
        node_id: 'teams-trigger-1',
        sessionId: 'teams_workflow_123_tenant-1_conversation-1',
        _microsoftTeams: true,
      },
      outputDescription: 'eventId: activity ID or generated fallback. eventType: message, conversation_update, message_reaction, invoke, installation_update, or unknown. source: microsoft_teams. userId/username: sender identity when available. text: message or invoke value text. timestamp: ISO event time. tenantId/teamId/channelId: Microsoft 365/Teams identifiers, null for personal chats. chatId: channelId or conversationId, useful as a single reply-target key. conversationId/serviceUrl/activityId/replyToId: needed to reply through Bot Framework. locale/channelData: sender locale and raw Teams metadata. raw: original Bot Framework activity. trigger/workflow_id/node_id/sessionId/_microsoftTeams: CtrlChecks trigger metadata.',
      usageExample: {
        scenario: 'Reply to a Microsoft Teams bot message with an AI Agent',
        inputValues: {
          eventTypes: 'message',
          teamIds: '',
          channelIds: '',
          allowedUserIds: '',
          tenantId: '',
          appId: '',
          validationSecret: '',
          validateJwt: 'true',
        },
        expectedOutput: 'Use {{$json.text}} as the user question, and {{$json.serviceUrl}}, {{$json.conversationId}}, {{$json.replyToId}} in a Microsoft Teams action node to reply to the same conversation.',
      },
    },
  },

  outlook_trigger: {
    receive: {
      description: 'Receive Microsoft Graph change notifications, validate the per-subscription clientState secret, re-fetch the referenced mail message or calendar event, filter accepted resource/change types/keyword, and start one workflow execution per accepted notification.',
      outputExample: {
        eventId: 'msg-1-created',
        eventType: 'message_created',
        source: 'outlook',
        userId: 'billing@example.com',
        username: 'Billing Team',
        text: 'Your invoice is ready for review...',
        timestamp: '2026-07-19T10:20:00.000Z',
        resourceId: 'msg-1',
        subject: 'Invoice #123',
        from: 'billing@example.com',
        to: 'you@company.com',
        snippet: 'Your invoice is ready for review...',
        conversationId: 'conversation-1',
        start: null,
        end: null,
        attendees: [],
        raw: {},
        trigger: 'outlook',
        workflow_id: 'workflow_123',
        node_id: 'outlook-trigger-1',
        sessionId: 'outlook_workflow_123_conversation-1',
        _outlook: true,
      },
      outputDescription: 'eventId: resourceId-changeType composite. eventType: message_created for mail, or event_created/updated/deleted for calendar. source: outlook. userId/username: sender or organizer identity. text/snippet: body preview. timestamp: received or start time. resourceId: the Graph message/event ID. subject/from/to/conversationId: mail fields, empty/null for calendar. start/end/attendees: calendar fields, null/empty for mail. raw: the full re-fetched Graph object. trigger/workflow_id/node_id/sessionId/_outlook: CtrlChecks trigger metadata.',
      usageExample: {
        scenario: 'AI triage for new support emails, then reply from the Outlook action node',
        inputValues: {
          resource: 'mail',
          changeTypes: 'created',
          folderName: 'Inbox',
          query: '',
        },
        expectedOutput: 'Use {{$json.subject}}, {{$json.from}}, and {{$json.snippet}} in an AI Agent, then reply using the Outlook action node with {{$json.conversationId}}.',
      },
    },
  },

  shopify_trigger: {
    store_events: {
      description: 'Receive Shopify Admin API webhook deliveries, validate the X-Shopify-Hmac-Sha256 signature, filter accepted topics/shop/financial/fulfillment/customer/product/currency/price/keyword, normalize order/customer/product/refund/checkout payloads, and start one workflow execution per accepted event.',
      outputExample: {
        eventId: '820982911946154508',
        eventType: 'orders_paid',
        source: 'shopify',
        userId: '207119551',
        username: 'buyer@example.com',
        text: '#1001',
        timestamp: '2026-07-19T10:20:00.000Z',
        topic: 'orders/paid',
        shopDomain: 'my-store.myshopify.com',
        orderId: '450789469',
        orderName: '#1001',
        financialStatus: 'paid',
        fulfillmentStatus: null,
        totalPrice: 125.5,
        currency: 'usd',
        customerId: '207119551',
        customerEmail: 'buyer@example.com',
        customerName: 'Alex Morgan',
        lineItems: [{ title: 'Blue T-Shirt', quantity: 1, price: '115.50' }],
        raw: {},
        trigger: 'shopify',
        workflow_id: 'workflow_123',
        node_id: 'shopify-trigger-1',
        sessionId: 'shopify_workflow_123_820982911946154508',
        _shopify: true,
      },
      outputDescription: 'eventId: webhook delivery ID or a fallback. eventType: the topic with underscores, such as orders_paid. source: shopify. userId/username: customer identity when available. text: order name, product title, or customer identity. timestamp: delivery time. topic/shopDomain: raw Shopify topic and store domain. orderId/orderName/financialStatus/fulfillmentStatus/totalPrice/currency: order fields, null on non-order topics. customerId/customerEmail/customerName: customer identity. lineItems: order line items when present. raw: the original Shopify payload. trigger/workflow_id/node_id/sessionId/_shopify: CtrlChecks trigger metadata.',
      usageExample: {
        scenario: 'Route a paid Shopify order to fulfillment and notify the warehouse in Slack',
        inputValues: {
          topics: 'orders/paid',
          financialStatus: 'paid',
        },
        expectedOutput: 'A normalized Shopify order payload available as {{$json.orderId}}, {{$json.customerEmail}}, {{$json.totalPrice}}, and {{$json.lineItems}} for a fulfillment or Slack notification node.',
      },
    },
  },

  slack_trigger: {
    receive: {
      description: 'Receive Slack Events API, slash command, and interactivity callbacks, validate the X-Slack-Signature HMAC and request timestamp, filter accepted event types/channel/user/workspace/command, normalize the payload, and start one workflow execution per accepted event.',
      outputExample: {
        eventId: 'Ev0123ABCDE',
        eventType: 'app_mention',
        source: 'slack',
        userId: 'U0123456789',
        username: '',
        text: '<@UAPPBOT> can you check this order?',
        timestamp: '2026-07-19T10:20:00.000Z',
        teamId: 'T0123456789',
        enterpriseId: null,
        channelId: 'C0123456789',
        channelName: '',
        chatId: 'C0123456789',
        threadTs: '1784260800.000100',
        messageTs: '1784260800.000100',
        command: '',
        triggerId: '',
        responseUrl: '',
        callbackId: '',
        actionId: '',
        interactionType: '',
        raw: {},
        trigger: 'slack',
        workflow_id: 'workflow_123',
        node_id: 'slack-trigger-1',
        sessionId: 'slack_workflow_123_T0123456789_1784260800.000100',
        _slack: true,
      },
      outputDescription: 'eventId: Slack event_id, message ts, or generated fallback. eventType: app_mention, message, slash_command, interaction (or a specific subtype), or url_verification. source: slack. userId/username: sender identity when available. text: message, slash command, or interaction text. timestamp: ISO event time. teamId/enterpriseId: workspace identifiers. channelId/channelName/chatId: channel identity for replies. threadTs/messageTs: thread timestamps. command/triggerId/responseUrl: slash command fields. callbackId/actionId/interactionType: interaction fields. raw: original Slack payload. trigger/workflow_id/node_id/sessionId/_slack: CtrlChecks trigger metadata.',
      usageExample: {
        scenario: 'Reply to a Slack app mention with an AI Agent in the same thread',
        inputValues: {
          eventTypes: 'app_mention, message',
          channelIds: '',
          allowedUserIds: '',
          commandFilter: '',
          teamId: '',
          signingSecret: '',
          validateSignature: 'true',
        },
        expectedOutput: 'Use {{$json.channelId}} as the Slack Message channel and {{$json.threadTs}} as Thread Timestamp to reply in the same thread.',
      },
    },
  },

  stripe_trigger: {
    payment_billing_events: {
      description: 'Receive Stripe webhook deliveries, automatically registered via the Stripe API\'s webhook_endpoints, validate the Stripe-Signature HMAC, filter accepted event types/livemode/customer/currency/amount/keyword, normalize the payload, and start one workflow execution per accepted event.',
      outputExample: {
        eventId: 'evt_1AbCdEfGhIjKlMnO',
        eventType: 'payment_intent.succeeded',
        source: 'stripe',
        userId: 'cus_ABC123',
        username: 'buyer@example.com',
        text: 'buyer@example.com',
        timestamp: '2026-07-19T10:20:00.000Z',
        livemode: false,
        objectId: 'pi_1AbCdEfGhIjKlMnO',
        objectType: 'payment_intent',
        customerId: 'cus_ABC123',
        customerEmail: 'buyer@example.com',
        amount: 2500,
        currency: 'usd',
        status: 'succeeded',
        paymentIntentId: 'pi_1AbCdEfGhIjKlMnO',
        receiptUrl: 'https://pay.stripe.com/receipts/...',
        metadata: {},
        raw: {},
        trigger: 'stripe',
        workflow_id: 'workflow_123',
        node_id: 'stripe-trigger-1',
        sessionId: 'stripe_workflow_123_evt_1AbCdEfGhIjKlMnO',
        _stripe: true,
      },
      outputDescription: 'eventId: the Stripe event ID. eventType: the exact Stripe event name, such as payment_intent.succeeded. source: stripe. userId/username: customer identity when available. text: description, customer email, or object ID. timestamp: Stripe\'s event created time. livemode: true for real payments, false for test mode. objectId/objectType: the Stripe object and its type. customerId/customerEmail/amount/currency/status: core transaction fields. paymentIntentId/receiptUrl/metadata: additional object-specific fields. raw: the original Stripe event. trigger/workflow_id/node_id/sessionId/_stripe: CtrlChecks trigger metadata.',
      usageExample: {
        scenario: 'Fulfill a paid Stripe Checkout order and notify the team in Slack',
        inputValues: {
          eventTypes: 'checkout.session.completed, payment_intent.succeeded',
          currency: 'usd',
        },
        expectedOutput: 'A normalized Stripe event payload available as {{$json.eventType}}, {{$json.customerId}}, {{$json.amount}}, and {{$json.paymentIntentId}} for a fulfillment or Slack notification node.',
      },
    },
  },

  tally_trigger: {
    receive: {
      description: 'Receive Tally (tally.so) form submission webhooks, automatically registered via the Tally API, validate the Tally-Signature HMAC, filter accepted form/keyword, normalize the answers, and start one workflow execution per accepted submission.',
      outputExample: {
        eventId: '01HXYZABC123',
        eventType: 'form_response',
        source: 'tally',
        userId: 'resp_a1b2c3',
        username: '',
        text: '{"email":"user@example.com","message":"Hello!"}',
        timestamp: '2026-07-19T10:20:00.000Z',
        formId: 'wA1b2C',
        formName: 'Contact Us',
        responseId: 'a1b2c3',
        answers: { email: 'user@example.com', message: 'Hello!' },
        raw: {},
        trigger: 'tally',
        workflow_id: 'workflow_123',
        node_id: 'tally-trigger-1',
        sessionId: 'tally_workflow_123_a1b2c3',
        _tally: true,
      },
      outputDescription: 'eventId: Tally event ID or generated fallback. eventType: always form_response. source: tally. userId: the Tally respondent ID when available. text: a JSON string of all answers used for keyword matching. timestamp: submission time. formId/formName/responseId: form identity and submission ID. answers: an object keyed by field key/label, with choice fields resolved to option text. raw: original Tally payload. trigger/workflow_id/node_id/sessionId/_tally: CtrlChecks trigger metadata.',
      usageExample: {
        scenario: 'Process new lead-intake submissions with an AI Agent and create a CRM contact',
        inputValues: {
          formId: 'wA1b2C',
          query: '',
        },
        expectedOutput: 'Use {{$json.answers.email}} and {{$json.answers.message}} in an AI Agent or downstream CRM/email node.',
      },
    },
  },

  tally: {
    get_ledger: {
      description: 'Fetches ledger details from Tally ERP via XML API. If ledgerName is provided, filters to that specific ledger; otherwise returns all ledgers. Response is raw XML — use a JavaScript node to parse it.',
      outputExample: { success: true, data: '<ENVELOPE><BODY>...</BODY></ENVELOPE>', statusCode: 200 },
      outputDescription: 'success: Always true when Tally responded. data: Raw XML string containing ledger data (name, opening balance, closing balance, etc.). statusCode: HTTP status code (200 = success). Parse {{$json.data}} with a JavaScript node to extract ledger balances or account details.',
      usageExample: { scenario: 'Fetch Cash ledger balance every morning and email it to the finance team', inputValues: { endpoint: 'http://localhost:9000', operation: 'get_ledger', companyName: 'Acme Trading Pvt Ltd', ledgerName: 'Cash' }, expectedOutput: 'Parse {{$json.data}} to extract the Cash balance, then send it via Email node.' },
    },
    get_voucher: {
      description: 'Fetches voucher (transaction) details from Tally ERP via XML API. If voucherId is provided, filters to that specific voucher; otherwise returns all vouchers. Response is raw XML — use a JavaScript node to parse it.',
      outputExample: { success: true, data: '<ENVELOPE><BODY>...</BODY></ENVELOPE>', statusCode: 200 },
      outputDescription: 'success: Always true when Tally responded. data: Raw XML string containing voucher data (voucher type, date, number, party name, ledger entries, amounts, narration). statusCode: HTTP status code (200 = success). Parse {{$json.data}} with a JavaScript node to extract voucher date, amount, or party name.',
      usageExample: { scenario: 'When a payment is received, verify the receipt voucher was created in Tally and send confirmation', inputValues: { endpoint: 'http://localhost:9000', operation: 'get_voucher', voucherId: 'RCP-{{$json.receiptNumber}}' }, expectedOutput: 'Parse {{$json.data}} to extract voucher amount and date, then send confirmation email.' },
    },
    create_voucher: {
      description: 'Creates a new voucher (accounting transaction) in Tally ERP via XML API. REQUIRES a complete XML voucher envelope in the payload field. No default template exists — you must build the voucher XML yourself (typically via a JavaScript node). Response XML indicates whether creation succeeded.',
      outputExample: { success: true, data: '<ENVELOPE><BODY><IMPORTRESULT><CREATED>1</CREATED>...</IMPORTRESULT></BODY></ENVELOPE>', statusCode: 200 },
      outputDescription: 'success: Always true when Tally responded. data: Raw XML string indicating creation result. <CREATED>1</CREATED> means success; error messages appear for validation failures (missing ledgers, invalid dates, duplicate voucher numbers). statusCode: HTTP status code (200 = success). Always parse {{$json.data}} to verify <CREATED>1</CREATED> appears before assuming the voucher was created.',
      usageExample: { scenario: 'When an online sale completes, automatically create a Sales voucher in Tally', inputValues: { endpoint: 'http://localhost:9000', operation: 'create_voucher', payload: '{{$json.salesVoucherXml}}' }, expectedOutput: 'Parse {{$json.data}} to verify <CREATED>1</CREATED>, then log success or send error alert.' },
    },
    get_stock_items: {
      description: 'Fetches stock item list from Tally ERP via XML API. Returns all stock items (inventory products) with names, quantities, units, and categories. Response is raw XML — use a JavaScript node to parse it.',
      outputExample: { success: true, data: '<ENVELOPE><BODY>...</BODY></ENVELOPE>', statusCode: 200 },
      outputDescription: 'success: Always true when Tally responded. data: Raw XML string containing stock item data (item names, opening balances, closing balances, units, categories). statusCode: HTTP status code (200 = success). Parse {{$json.data}} with a JavaScript node to extract item names, quantities, or rates.',
      usageExample: { scenario: 'Every night, fetch stock items from Tally and sync low-stock items to a Google Sheet', inputValues: { endpoint: 'http://localhost:9000', operation: 'get_stock_items', companyName: 'Acme Trading Pvt Ltd' }, expectedOutput: 'Parse {{$json.data}} to filter items with low closing balance, then pass to Google Sheets node.' },
    },
    get_company_info: {
      description: 'Fetches company information from Tally ERP via XML API. Returns company name, address, financial year, books beginning date, and other metadata. Commonly used as a connection health check. Response is raw XML — use a JavaScript node to parse it.',
      outputExample: { success: true, data: '<ENVELOPE><BODY><IMPORTDATA><REQUESTDATA><TALLYMESSAGE><COMPANY><NAME>Acme Trading Pvt Ltd</NAME>...</COMPANY></TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>', statusCode: 200 },
      outputDescription: 'success: Always true when Tally responded. data: Raw XML string containing company metadata (name, address, financial year, books beginning date). statusCode: HTTP status code (200 = success). Parse {{$json.data}} with a JavaScript node to extract company name or financial year.',
      usageExample: { scenario: 'Before running a nightly sync, verify Tally is running and accessible by fetching company info', inputValues: { endpoint: 'http://localhost:9000', operation: 'get_company_info' }, expectedOutput: 'Parse {{$json.data}} to extract company name, then proceed with sync or send error alert if Tally is unreachable.' },
    },
  },

  zendesk: {
    get_tickets: {
      description: 'Lists all tickets from your Zendesk account with optional pagination via GET /api/v2/tickets.json. Returns an array of ticket objects with full ticket details including status, priority, assignee, requester, and custom fields.',
      outputExample: {
        success: true,
        data: {
          tickets: [
            { id: 12345, subject: 'Login not working', status: 'open', priority: 'high', requester_id: 360015001234, assignee_id: 360015005678, created_at: '2026-07-19T10:30:00Z', updated_at: '2026-07-19T11:45:00Z' }
          ],
          count: 1,
          next_page: 'https://mycompany.zendesk.com/api/v2/tickets.json?page=2'
        },
        error: {},
      },
      outputDescription: 'success: true if the Zendesk API returned a 2xx status — this node never sets an _error key, unlike most other CRM nodes in this product. data: the raw Zendesk API response — contains tickets array with ticket objects (id, subject, status, priority, requester_id, assignee_id, created_at, updated_at, etc.), count, and next_page for pagination. error: an empty object {} on success, or {message, status} on failure. Use {{$json.data.tickets}} to access the array, or {{$json.data.tickets[0].id}} for the first ticket\'s ID.',
      usageExample: {
        scenario: 'List all open high-priority tickets from Zendesk to send to a Slack channel for triage',
        inputValues: { subdomain: 'mycompany', email: 'agent@mycompany.com', apiToken: '{{$credentials.zendesk.apiToken}}', limit: '50' },
        expectedOutput: 'Returns up to 50 tickets. Use a Filter node to keep only status=open and priority=high, then a Slack Message node to notify the team with ticket subjects and IDs.'
      },
    },
    get_ticket: {
      description: 'Fetches a single ticket by its numeric ID via GET /api/v2/tickets/{id}.json. Returns the full ticket object including all fields, comments, and metadata.',
      outputExample: {
        success: true,
        data: {
          ticket: { id: 12345, subject: 'Login not working', status: 'open', priority: 'high', requester_id: 360015001234, assignee_id: 360015005678, created_at: '2026-07-19T10:30:00Z', updated_at: '2026-07-19T11:45:00Z', custom_fields: [{ id: 123456, value: 'Enterprise' }] }
        },
        error: {},
      },
      outputDescription: 'success: true if the Zendesk API returned a 2xx status — this node never sets an _error key. data: the raw Zendesk API response — contains a single ticket object with id, subject, status, priority, requester_id, assignee_id, created_at, updated_at, custom_fields, and all other ticket fields. error: an empty object {} on success, or {message, status} on failure (for example a 404 when the ticket does not exist). Use {{$json.data.ticket.id}} for the ID, {{$json.data.ticket.subject}} for the subject, etc.',
      usageExample: {
        scenario: 'Fetch a specific ticket by ID from a webhook or form submission to check its status before taking action',
        inputValues: { subdomain: 'mycompany', email: 'agent@mycompany.com', apiToken: '{{$credentials.zendesk.apiToken}}', ticketId: '{{$json.ticketId}}' },
        expectedOutput: 'Returns the full ticket object. Use {{$json.data.ticket.status}} to check if it\'s open/solved/closed, then branch with an If Else node to take different actions based on status.'
      },
    },
    create_ticket: {
      description: 'Creates a new support ticket in Zendesk via POST /api/v2/tickets.json. Requires a subject line. The description becomes the first comment on the ticket. Optionally set status and priority.',
      outputExample: {
        success: true,
        data: {
          ticket: { id: 12345, subject: 'Login issue for user John Doe', status: 'open', priority: 'high', requester_id: 360015001234, created_at: '2026-07-19T12:00:00Z', updated_at: '2026-07-19T12:00:00Z' }
        },
        error: {},
      },
      outputDescription: 'success: true if the Zendesk API returned a 2xx status — this node never sets an _error key. data: the raw Zendesk API response — contains the newly created ticket object with id, subject, status, priority, requester_id, created_at, updated_at, and all other ticket fields. error: an empty object {} on success, or {message, status} on failure (for example a 400 when Subject is empty). Use {{$json.data.ticket.id}} to capture the new ticket\'s ID for later update or reference.',
      usageExample: {
        scenario: 'Create a Zendesk ticket from a web form submission when a customer reports an issue',
        inputValues: { subdomain: 'mycompany', email: 'agent@mycompany.com', apiToken: '{{$credentials.zendesk.apiToken}}', subject: 'Issue reported by {{$json.name}}: {{$json.issueType}}', description: 'Customer {{$json.name}} ({{$json.email}}) reports: {{$json.description}}', status: 'new', priority: 'high' },
        expectedOutput: 'A new Zendesk ticket is created. Use {{$json.data.ticket.id}} in a later step to update this ticket or send a confirmation email to the customer.'
      },
    },
    update_ticket: {
      description: 'Updates an existing ticket by its numeric ID via PUT /api/v2/tickets/{id}.json. Only non-empty fields are sent — blank fields keep existing values unchanged. Can update subject, status, priority, and assignee.',
      outputExample: {
        success: true,
        data: {
          ticket: { id: 12345, subject: 'Updated: Login issue for user John Doe', status: 'solved', priority: 'urgent', assignee_id: 360015005678, updated_at: '2026-07-19T13:00:00Z' }
        },
        error: {},
      },
      outputDescription: 'success: true if the Zendesk API returned a 2xx status — this node never sets an _error key. data: the raw Zendesk API response — contains the updated ticket object with the new values for any fields that were changed. error: an empty object {} on success, or {message, status} on failure. Use {{$json.data.ticket.id}} to confirm the ticket ID, or {{$json.data.ticket.status}} to verify the new status.',
      usageExample: {
        scenario: 'Auto-assign and solve a ticket when a customer replies with a confirmation',
        inputValues: { subdomain: 'mycompany', email: 'agent@mycompany.com', apiToken: '{{$credentials.zendesk.apiToken}}', ticketId: '{{$json.ticketId}}', status: 'solved', assigneeId: '360015005678' },
        expectedOutput: 'The ticket status changes to solved and is assigned to the specified agent. Use an Email node to notify the customer that their issue has been resolved.'
      },
    },
    delete_ticket: {
      description: 'Permanently deletes a ticket by its numeric ID via DELETE /api/v2/tickets/{id}.json. This action cannot be undone. Zendesk returns HTTP 204 with no body on success.',
      outputExample: { success: true, data: {}, error: {} },
      outputDescription: 'success: true if the Zendesk API returned a 2xx status (HTTP 204 on successful delete) — this node never sets an _error key. data: empty object {} on success — Zendesk returns no body for delete operations. error: an empty object {} on success, or {message, status} on failure. Check success: true rather than data to confirm the deletion.',
      usageExample: {
        scenario: 'Delete a test ticket after it has been processed or archived elsewhere',
        inputValues: { subdomain: 'mycompany', email: 'agent@mycompany.com', apiToken: '{{$credentials.zendesk.apiToken}}', ticketId: '{{$json.ticketId}}' },
        expectedOutput: 'The ticket is permanently deleted from Zendesk. Use {{$json.success}} to verify the deletion succeeded. Note that this cannot be undone — consider using Update Ticket to set status=closed instead if you want to preserve the record.'
      },
    },
    get_users: {
      description: 'Lists all users from your Zendesk account with optional pagination via GET /api/v2/users.json. Returns an array of user objects including agents, admins, and end users with their roles, email addresses, and profile details.',
      outputExample: {
        success: true,
        data: {
          users: [
            { id: 360015001234, name: 'John Doe', email: 'john@company.com', role: 'admin', created_at: '2026-01-15T09:00:00Z', updated_at: '2026-07-19T10:30:00Z' },
            { id: 360015005678, name: 'Jane Smith', email: 'jane@company.com', role: 'agent', created_at: '2026-02-20T14:00:00Z', updated_at: '2026-07-19T11:45:00Z' }
          ],
          count: 2,
          next_page: 'https://mycompany.zendesk.com/api/v2/users.json?page=2'
        },
        error: {},
      },
      outputDescription: 'success: true if the Zendesk API returned a 2xx status — this node never sets an _error key. data: the raw Zendesk API response — contains users array with user objects (id, name, email, role, created_at, updated_at, etc.), count, and next_page for pagination. error: an empty object {} on success, or {message, status} on failure. Use {{$json.data.users}} to access the array, or {{$json.data.users[0].id}} for the first user\'s ID.',
      usageExample: {
        scenario: 'List all agents and admins from Zendesk to sync with an internal directory or assign tickets programmatically',
        inputValues: { subdomain: 'mycompany', email: 'agent@mycompany.com', apiToken: '{{$credentials.zendesk.apiToken}}', limit: '100' },
        expectedOutput: 'Returns up to 100 users. Use a Filter node to keep only role=agent or role=admin, then store the results in Google Sheets or your database for reference in ticket assignment workflows.'
      },
    },
  },

  zoho_crm: {
    get: {
      description: 'Fetches a single record by its ID from a Zoho CRM module via GET /crm/v3/{module}/{id}. Returns the full record object with all field values including custom fields.',
      outputExample: {
        success: true,
        data: {
          data: [
            { id: '1234567890123456789', First_Name: 'John', Last_Name: 'Doe', Email: 'john@example.com', Phone: '+1-555-123-4567', Created_Time: '2026-07-19T10:30:00+05:30', Modified_Time: '2026-07-19T11:45:00+05:30' }
          ],
          info: { per_page: 200, count: 1, page: 1, more_records: false }
        },
        service: 'crm',
        resource: 'record',
        operation: 'get'
      },
      outputDescription: 'success: true if the Zoho API returned a 2xx status. data: the raw Zoho API response — contains a data array with the record object (id, First_Name, Last_Name, Email, and all other module fields) and an info object with pagination details. Use {{$json.data.data[0].id}} for the record ID, or {{$json.data.data[0].Email}} for the email. service/resource/operation echo back the CRM service context.',
      usageExample: {
        scenario: 'Fetch a specific contact by ID from a webhook to check their status before taking action',
        inputValues: { accessToken: '{{$credentials.zoho.accessToken}}', apiDomain: 'https://www.zohoapis.com', module: 'Contacts', recordId: '{{$json.contactId}}' },
        expectedOutput: 'Returns the full contact object. Use {{$json.data.data[0].Lead_Status}} to check if it\'s a qualified lead, then branch with an If Else node to take different actions based on status.'
      },
    },
    create: {
      description: 'Creates a new record in a Zoho CRM module via POST /crm/v3/{module}. Requires a JSON object with field values matching the module\'s API field names.',
      outputExample: {
        success: true,
        data: {
          data: [
            { code: 'SUCCESS', details: { created_by: { id: '1234567890123456789', name: 'John Doe' }, created_time: '2026-07-19T10:30:00+05:30', id: '1234567890123456791', modified_by: { id: '1234567890123456789', name: 'John Doe' }, modified_time: '2026-07-19T10:30:00+05:30' }, message: 'record added successfully', status: 'success' }
          ]
        },
        service: 'crm',
        resource: 'record',
        operation: 'create'
      },
      outputDescription: 'success: true if the Zoho API returned a 2xx status. data: the raw Zoho API response — contains a data array with the created record\'s details including id, created_time, created_by, modified_time, modified_by, and a success message. Use {{$json.data.data[0].details.id}} to capture the new record\'s ID for later update or reference. service/resource/operation echo back the CRM service context.',
      usageExample: {
        scenario: 'Create a new lead in Zoho CRM from a web form submission',
        inputValues: { accessToken: '{{$credentials.zoho.accessToken}}', apiDomain: 'https://www.zohoapis.com', module: 'Leads', data: '{"First_Name":"{{$json.firstName}}","Last_Name":"{{$json.lastName}}","Email":"{{$json.email}}","Company":"{{$json.company}}","Lead_Source":"Website"}' },
        expectedOutput: 'A new lead is created in Zoho CRM. Use {{$json.data.data[0].details.id}} in a later step to update this lead or send a confirmation email to the prospect.'
      },
    },
    update: {
      description: 'Updates an existing record in a Zoho CRM module by its ID via PUT /crm/v3/{module}/{id}. Requires a JSON object with field values to change. Only specified fields are updated.',
      outputExample: {
        success: true,
        data: {
          data: [
            { code: 'SUCCESS', details: { created_by: { id: '1234567890123456789', name: 'John Doe' }, created_time: '2026-07-19T10:30:00+05:30', id: '1234567890123456791', modified_by: { id: '1234567890123456789', name: 'John Doe' }, modified_time: '2026-07-19T11:45:00+05:30' }, message: 'record updated successfully', status: 'success' }
          ]
        },
        service: 'crm',
        resource: 'record',
        operation: 'update'
      },
      outputDescription: 'success: true if the Zoho API returned a 2xx status. data: the raw Zoho API response — contains a data array with the updated record\'s details including id, created_time, created_by, modified_time, modified_by, and a success message. Use {{$json.data.data[0].details.id}} to confirm which record was updated, or {{$json.data.data[0].details.modified_time}} to verify the update time. service/resource/operation echo back the CRM service context.',
      usageExample: {
        scenario: 'Update a lead\'s status to Qualified when they respond to an email',
        inputValues: { accessToken: '{{$credentials.zoho.accessToken}}', apiDomain: 'https://www.zohoapis.com', module: 'Leads', recordId: '{{$json.leadId}}', data: '{"Lead_Status":"Qualified","Lead_Source":"Email Campaign"}' },
        expectedOutput: 'The lead\'s status changes to Qualified. Use an Email node to send a follow-up message to the sales team with the lead\'s details.'
      },
    },
    delete: {
      description: 'Permanently deletes a record from a Zoho CRM module by its ID via DELETE /crm/v3/{module}/{id}. This action cannot be undone.',
      outputExample: {
        success: true,
        data: {
          data: [
            { code: 'SUCCESS', details: { id: '1234567890123456791' }, message: 'record deleted successfully', status: 'success' }
          ]
        },
        service: 'crm',
        resource: 'record',
        operation: 'delete'
      },
      outputDescription: 'success: true if the Zoho API returned a 2xx status. data: the raw Zoho API response — contains a data array with the deleted record\'s ID and a success message. Use {{$json.data.data[0].details.id}} to confirm which record was deleted. service/resource/operation echo back the CRM service context.',
      usageExample: {
        scenario: 'Delete a test lead after it has been processed or archived elsewhere',
        inputValues: { accessToken: '{{$credentials.zoho.accessToken}}', apiDomain: 'https://www.zohoapis.com', module: 'Leads', recordId: '{{$json.leadId}}' },
        expectedOutput: 'The lead is permanently deleted from Zoho CRM. Use {{$json.success}} to verify the deletion succeeded. Note that this cannot be undone — consider using Update to set a status like \'Closed\' instead if you want to preserve the record.'
      },
    },
    search: {
      description: 'Searches for records in a Zoho CRM module using criteria via GET /crm/v3/{module}/search. Returns matching records based on field conditions.',
      outputExample: {
        success: true,
        data: {
          data: [
            { id: '1234567890123456789', First_Name: 'John', Last_Name: 'Doe', Email: 'john@example.com' }
          ],
          info: { per_page: 200, count: 1, page: 1, more_records: false }
        },
        service: 'crm',
        resource: 'record',
        operation: 'search'
      },
      outputDescription: 'success: true if the Zoho API returned a 2xx status. data: the raw Zoho API response — contains a data array with matching record objects and an info object with pagination details (per_page, count, page, more_records). Use {{$json.data.data}} to access the array, or {{$json.data.data[0].id}} for the first record\'s ID. service/resource/operation echo back the CRM service context.',
      usageExample: {
        scenario: 'Search for contacts with a specific email address to check if they already exist before creating a new one',
        inputValues: { accessToken: '{{$credentials.zoho.accessToken}}', apiDomain: 'https://www.zohoapis.com', module: 'Contacts', criteria: '(Email:equals:{{$json.email}})' },
        expectedOutput: 'Returns matching contacts. Use {{$json.data.data}} to check if any results exist — if the array is empty, proceed with Create; if results exist, use an If Else node to handle duplicates.'
      },
    },
    upsert: {
      description: 'Creates a new record or updates an existing one based on a unique field via POST /crm/v3/{module}/upsert. If the record exists (by external ID or email), it updates; otherwise, it creates.',
      outputExample: {
        success: true,
        data: {
          data: [
            { code: 'SUCCESS', details: { created_by: { id: '1234567890123456789', name: 'John Doe' }, created_time: '2026-07-19T10:30:00+05:30', id: '1234567890123456791', modified_by: { id: '1234567890123456789', name: 'John Doe' }, modified_time: '2026-07-19T10:30:00+05:30' }, message: 'record added successfully', status: 'success' }
          ]
        },
        service: 'crm',
        resource: 'record',
        operation: 'upsert'
      },
      outputDescription: 'success: true if the Zoho API returned a 2xx status. data: the raw Zoho API response — contains a data array with the record\'s details (id, created_time, created_by, modified_time, modified_by) and a success message indicating whether the record was created or updated. Use {{$json.data.data[0].details.id}} to capture the record\'s ID. service/resource/operation echo back the CRM service context.',
      usageExample: {
        scenario: 'Sync contacts from an external system — use upsert to avoid duplicates based on email address',
        inputValues: { accessToken: '{{$credentials.zoho.accessToken}}', apiDomain: 'https://www.zohoapis.com', module: 'Contacts', data: '{"First_Name":"{{$json.firstName}}","Last_Name":"{{$json.lastName}}","Email":"{{$json.email}}","Phone":"{{$json.phone}}"}' },
        expectedOutput: 'If a contact with this email exists, it\'s updated with new values. If not, a new contact is created. Use {{$json.data.data[0].message}} to check if it was \'record added\' or \'record updated\'.'
      },
    },
  },

  telegram_trigger: {
    default: {
      description: 'Receive Telegram Bot API webhook updates, validate the optional Secret Token, filter accepted update types/chat/command, normalize the update, and start one workflow execution per accepted update.',
      outputExample: {
        chatId: '123456789',
        messageId: 42,
        text: 'Hello bot',
        username: 'alice',
        firstName: 'Alice',
        lastName: 'Ng',
        userId: '987654321',
        updateType: 'message',
        raw: { update_id: 10001, message: { text: 'Hello bot' } },
        trigger: 'telegram',
        workflow_id: 'workflow_123',
        node_id: 'telegram-trigger-1',
        updateId: 10001,
        sessionId: 'telegram_workflow_123_123456789',
        timestamp: '2026-07-19T10:20:00.000Z',
        _telegram: true,
      },
      outputDescription: 'chatId: the Telegram chat to reply to. messageId: numeric Telegram message ID. text: message text, caption, callback data, or inline query text. username/firstName/lastName/userId: sender identity. updateType: message, edited_message, channel_post, edited_channel_post, callback_query, inline_query, or unknown. raw: original Telegram update. trigger/workflow_id/node_id/updateId/sessionId/timestamp/_telegram: CtrlChecks trigger metadata.',
      usageExample: {
        scenario: 'Telegram chatbot that replies with an AI-generated answer',
        inputValues: {
          updateTypes: 'message',
          allowedChatIds: '',
          commandFilter: '',
          secretToken: '',
        },
        expectedOutput: 'A user sends your bot a message, the workflow starts immediately, and {{$json.chatId}} is used in the Telegram action node to reply to the same chat.',
      },
    },
  },

  trello_trigger: {
    card_events: {
      description: 'Receive Trello webhook deliveries after HEAD callback validation, validate the X-Trello-Webhook HMAC, filter accepted event types/board/list/card/member/keyword, normalize card/list/board/checklist activity, and start one workflow execution per accepted event.',
      outputExample: {
        eventId: '5f8a1b2c3d4e5f6a7b8c9d20',
        eventType: 'card_moved',
        source: 'trello',
        userId: '5f8a1b2c3d4e5f6a7b8c9d11',
        username: 'alexmorgan',
        text: 'Follow up',
        timestamp: '2026-07-19T10:20:00.000Z',
        boardId: '5f8a1b2c3d4e5f6a7b8c9d0e',
        boardName: 'Support Board',
        listBeforeId: 'todo_list_id',
        listAfterId: 'done_list_id',
        cardId: '5f8a1b2c3d4e5f6a7b8c9d10',
        cardName: 'Follow up',
        commentText: null,
        memberId: '5f8a1b2c3d4e5f6a7b8c9d11',
        memberName: 'Alex Morgan',
        raw: {},
        trigger: 'trello',
        workflow_id: 'workflow_123',
        node_id: 'trello-trigger-1',
        sessionId: 'trello_workflow_123_5f8a1b2c3d4e5f6a7b8c9d20',
        _trello: true,
      },
      outputDescription: 'eventId: Trello action ID or generated fallback. eventType: normalized activity such as card_created, card_moved, card_commented, list_activity, or checklist_activity. source: trello. userId/username: the member who performed the action. text: comment text, card name, or a fallback. timestamp: action time. boardId/boardName: the board. listBeforeId/listAfterId: populated for card_moved events. cardId/cardName: card identity. commentText: populated for card_commented events. memberId/memberName: the member the action is about. raw: original Trello payload. trigger/workflow_id/node_id/sessionId/_trello: CtrlChecks trigger metadata.',
      usageExample: {
        scenario: 'Create a follow-up task when a Trello card is moved to Done',
        inputValues: {
          modelId: '5f8a1b2c3d4e5f6a7b8c9d0e',
          eventTypes: 'card_moved',
        },
        expectedOutput: 'A normalized Trello card movement payload available as {{$json.cardId}}, {{$json.listAfterId}}, and {{$json.cardName}} for a downstream task or notification node.',
      },
    },
  },

  typeform_trigger: {
    receive: {
      description: 'Receive Typeform (typeform.com) form response webhooks, automatically registered via the Typeform API, validate the Typeform-Signature HMAC, filter accepted form/keyword, normalize the answers, and start one workflow execution per accepted response.',
      outputExample: {
        eventId: '01HXYZABC123',
        eventType: 'form_response',
        source: 'typeform',
        userId: null,
        username: '',
        text: '{"email":"user@example.com","message":"Hello!"}',
        timestamp: '2026-07-19T10:20:00.000Z',
        formId: 'abc123',
        responseId: 'a1b2c3',
        answers: { email: 'user@example.com', message: 'Hello!' },
        hidden: {},
        raw: {},
        trigger: 'typeform',
        workflow_id: 'workflow_123',
        node_id: 'typeform-trigger-1',
        sessionId: 'typeform_workflow_123_a1b2c3',
        _typeform: true,
      },
      outputDescription: 'eventId: Typeform delivery event_id. eventType: always form_response. source: typeform. userId/username: always null/empty — Typeform webhooks carry no respondent identity. text: a JSON string of all answers used for keyword matching. timestamp: response submitted_at time. formId/responseId: form identity and response token. answers: an object keyed by field ref/id/title. hidden: any hidden fields on the form. raw: original Typeform payload. trigger/workflow_id/node_id/sessionId/_typeform: CtrlChecks trigger metadata.',
      usageExample: {
        scenario: 'Process new lead-intake submissions with an AI Agent and create a CRM contact',
        inputValues: {
          formId: 'abc123',
          query: '',
        },
        expectedOutput: 'Use {{$json.answers.email}} and {{$json.answers.message}} in an AI Agent or downstream CRM/email node.',
      },
    },
  },

  whatsapp_trigger: {
    receive_event: {
      description: 'Receive Meta WhatsApp Cloud webhook events, validate the X-Hub-Signature-256 signature, filter accepted event types/phone number/sender, normalize message and status payloads, and start one workflow execution per accepted event.',
      outputExample: {
        eventId: 'wamid.HBgM...',
        eventType: 'message.text',
        source: 'whatsapp',
        userId: '15551234567',
        username: 'Alex Morgan',
        text: 'Hi, I need help with my order',
        timestamp: '2026-07-19T10:20:00.000Z',
        chatId: '15551234567',
        from: '15551234567',
        waId: '15551234567',
        messageId: 'wamid.HBgM...',
        messageType: 'text',
        status: '',
        phoneNumberId: '123456789012345',
        displayPhoneNumber: '+1 555-123-4567',
        businessAccountId: 'waba_123456789',
        raw: {},
        trigger: 'whatsapp',
        workflow_id: 'workflow_123',
        node_id: 'whatsapp-trigger-1',
        sessionId: 'whatsapp_workflow_123_15551234567',
        _whatsapp: true,
      },
      outputDescription: 'eventId: message/status ID or generated fallback. eventType: message.text, message.media, status.sent, status.delivered, status.read, or status.failed. source: whatsapp. userId/username: sender identity for messages, recipient ID for statuses. text: message content, empty for status events. chatId/from/waId: reply target. messageId/messageType: message fields. status: delivery status for status events. phoneNumberId/displayPhoneNumber/businessAccountId: which WhatsApp Business number/account received the event. raw: original Meta payload fragment. trigger/workflow_id/node_id/sessionId/_whatsapp: CtrlChecks trigger metadata.',
      usageExample: {
        scenario: 'Reply to incoming WhatsApp messages with an AI Agent',
        inputValues: {
          eventTypes: 'message',
          verifyToken: 'wa_verify_abc123',
          validateSignature: 'true',
        },
        expectedOutput: 'WhatsApp Trigger -> AI Agent -> WhatsApp Send Text with To = {{$json.chatId}}.',
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
      outputExample: { orderId: 'ORD-1042', customerEmail: 'buyer@example.com', success: true },
      outputDescription: 'Incoming object fields are preserved and success: true is added when Microsoft Graph accepts the sendMail request. The Graph sendMail endpoint returns an empty accepted response, so this node does not expose a message ID. Failures preserve input and return _error, with Graph text in _errorDetails when available.',
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
      description: 'Legacy Facebook post override retained for old keys. The current implemented Facebook actions are page/list, page_message/sendTextMessage, and comment/createComment; post creation is scaffolded and returns _error until a handler is implemented.',
      outputExample: { _error: 'facebook node: Not yet implemented: post.createTextPost. Expected completion date: 2026-05-15.' },
      outputDescription: 'Scaffolded Facebook post operations return _error instead of fabricated post ids. Use page/list for Page discovery, page_message/sendTextMessage for Messenger replies, or comment/createComment for comment replies.',
      usageExample: {
        scenario: 'Detect a stale imported Facebook post workflow before production use',
        inputValues: { message: '📖 New post: "{{$json.title}}"\n\n{{$json.excerpt}}\n\nRead more: {{$json.url}}' },
        expectedOutput: 'Route on `{{$json._error}}` or change the workflow to one of the implemented Facebook operations.',
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
      description: 'Create Chargebee customers, create subscriptions, retrieve customers, and cancel subscriptions. Failures return success:false with a plain error field rather than _error.',
      outputExample: { success: true, operation: 'create_customer', customer: { id: 'cust_abc123', email: 'alice@example.com' }, customerId: 'cust_abc123' },
      outputDescription: 'success: true when Chargebee accepts the request. operation: echoed operation name. customer/customerId: returned for create_customer and get_customer. subscription/subscriptionId: returned for create_subscription and cancel_subscription. error: plain error message when success is false.',
      usageExample: {
        scenario: 'Create a Chargebee customer when a new user signs up',
        inputValues: { operation: 'create_customer', site: 'acme', email: '{{$json.email}}' },
        expectedOutput: 'A Chargebee customer record is created. Use {{$json.customerId}} in downstream billing operations.',
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

  db: {
    select: {
      description: 'Select rows through the canonical Supabase db node. Runtime supports Supabase SDK select, not raw SQL query text.',
      outputExample: { rows: [{ id: 1, email: 'buyer@example.com', status: 'active' }], count: 1 },
      outputDescription: 'rows: Array of selected rows returned by Supabase. count: Number of rows returned. _error: Present when validation or Supabase execution fails.',
      usageExample: { scenario: 'Read active customer profiles before sending a campaign', inputValues: { url: 'https://xyzabc.supabase.co', anonKey: '{{$credentials.supabase.anonKey}}', table: 'profiles', filters: '{"status":"active"}', limit: '50' }, expectedOutput: 'Use `{{$json.rows[0].email}}` in the next step and `{{$json.count}}` for audit logging.' },
    },
    insert: {
      description: 'Insert one row or an array of rows into a Supabase table and return the inserted rows.',
      outputExample: { inserted: [{ id: 101, email: 'new@example.com' }], count: 1 },
      outputDescription: 'inserted: Rows returned after insert. count: Number inserted. _error: Present when data, table, credentials, or Supabase execution fails.',
      usageExample: { scenario: 'Save a new signup profile in Supabase', inputValues: { url: 'https://xyzabc.supabase.co', anonKey: '{{$credentials.supabase.anonKey}}', table: 'profiles', data: '{"email":"{{$json.email}}","status":"new"}' }, expectedOutput: '`{{$json.inserted[0].id}}` is the new row ID.' },
    },
    update: {
      description: 'Update rows in a Supabase table using equality filters and return the updated rows.',
      outputExample: { rows: [{ id: 42, status: 'active' }], count: 1 },
      outputDescription: 'rows: Updated rows returned by Supabase. count: Number updated. _error: Present when data, filter, table, credentials, or Supabase execution fails.',
      usageExample: { scenario: 'Mark a profile as active after email verification', inputValues: { url: 'https://xyzabc.supabase.co', anonKey: '{{$credentials.supabase.anonKey}}', table: 'profiles', filter: '{"id":"{{$json.userId}}"}', data: '{"status":"active"}' }, expectedOutput: '`{{$json.count}}` confirms how many rows were updated.' },
    },
    delete: {
      description: 'Delete rows from a Supabase table using equality filters and return the deleted rows.',
      outputExample: { rows: [{ id: 42 }], count: 1 },
      outputDescription: 'rows: Deleted rows returned by Supabase. count: Number deleted. _error: Present when filter, table, credentials, or Supabase execution fails.',
      usageExample: { scenario: 'Remove a user profile after a deletion request', inputValues: { url: 'https://xyzabc.supabase.co', anonKey: '{{$credentials.supabase.anonKey}}', table: 'profiles', filter: '{"id":"{{$json.userId}}"}' }, expectedOutput: '`{{$json.rows[0].id}}` identifies the deleted row.' },
    },
    rpc: {
      description: 'Call a Supabase Postgres function by functionName with optional params.',
      outputExample: { result: [{ id: 42, rank: 0.91 }] },
      outputDescription: 'result: Raw value returned by Supabase RPC. _error: Present when functionName, credentials, or Supabase execution fails.',
      usageExample: { scenario: 'Call a search function before routing support tickets', inputValues: { url: 'https://xyzabc.supabase.co', anonKey: '{{$credentials.supabase.anonKey}}', functionName: 'search_profiles', params: '{"term":"{{$json.email}}"}' }, expectedOutput: 'Use `{{$json.result}}` in the branch or notification step.' },
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
      description: 'List Airtable records from one base/table. The runtime also normalizes operation read to list.',
      outputExample: { records: [{ id: 'recAbc123', fields: { Name: 'Alice', Status: 'Active' }, createdTime: '2026-07-19T09:00:00.000Z' }], count: 1 },
      outputDescription: 'records: Array of Airtable record objects with id, fields, and createdTime. count: Number of records collected. _error/_errorDetails: Present when validation or Airtable execution fails.',
      usageExample: { scenario: 'Fetch all active contacts from Airtable before sending an email campaign', inputValues: { apiKey: '{{$credentials.airtable.apiKey}}', baseId: 'appXXXXXXXXXXXXXX', table: 'Contacts', filterByFormula: '{Status} = "Active"', maxRecords: '100' }, expectedOutput: 'Use `{{$json.records[0].fields.Email}}` in the next node and `{{$json.count}}` for logging.' },
    },
    get: {
      description: 'Get one Airtable record by recordId. The current runtime parses Fields projection but does not pass it into table.find.',
      outputExample: { id: 'recAbc123', fields: { Name: 'Alice', Status: 'Active' }, createdTime: '2026-07-19T09:00:00.000Z' },
      outputDescription: 'id: Airtable record ID. fields: Returned Airtable field values. createdTime: Record creation timestamp. _error/_errorDetails: Present on missing recordId or API failure.',
      usageExample: { scenario: 'Read a lead row before deciding whether to update its status', inputValues: { apiKey: '{{$credentials.airtable.apiKey}}', baseId: 'appXXXXXXXXXXXXXX', table: 'Leads', recordId: '{{$json.recordId}}' }, expectedOutput: 'Use `{{$json.fields.Email}}` or `{{$json.id}}` in the next node.' },
    },
    create: {
      description: 'Create one or more Airtable records using Records or Fields payloads.',
      outputExample: { records: [{ id: 'recNewXyz456', fields: { Name: 'Bob', Email: 'bob@example.com' }, createdTime: '2026-07-19T09:05:00.000Z' }], count: 1 },
      outputDescription: 'records: Created Airtable records. count: Number created. _error/_errorDetails: Present when payload, credential, base, table, or Airtable validation fails.',
      usageExample: { scenario: 'Add a new website lead to Airtable', inputValues: { apiKey: '{{$credentials.airtable.apiKey}}', baseId: 'appXXXXXXXXXXXXXX', table: 'Leads', records: '[{"fields":{"Name":"{{$json.name}}","Email":"{{$json.email}}"}}]' }, expectedOutput: '`{{$json.records[0].id}}` is the new Airtable record ID.' },
    },
    update: {
      description: 'Update one or more Airtable records. Every resolved record must include id or recordId, or use the Record ID fallback.',
      outputExample: { records: [{ id: 'recAbc123', fields: { Status: 'Converted' }, createdTime: '2026-07-19T09:00:00.000Z' }], count: 1 },
      outputDescription: 'records: Updated Airtable records. count: Number updated. _error/_errorDetails: Present when payload, ID, credential, or Airtable validation fails.',
      usageExample: { scenario: 'Mark an Airtable lead as converted after a CRM deal closes', inputValues: { apiKey: '{{$credentials.airtable.apiKey}}', baseId: 'appXXXXXXXXXXXXXX', table: 'Leads', recordId: '{{$json.recordId}}', records: '[{"id":"{{$json.recordId}}","fields":{"Status":"Converted"}}]' }, expectedOutput: '`{{$json.records[0].fields.Status}}` confirms the new value.' },
    },
    upsert: {
      description: 'Update matching records by Match Field and create records that have no match.',
      outputExample: { records: [{ id: 'recAbc123', fields: { Email: 'buyer@example.com', Status: 'Active' }, createdTime: '2026-07-19T09:00:00.000Z' }], count: 1, created: 0, updated: 1 },
      outputDescription: 'records: Created or updated records. count: Total changed. created: Number created. updated: Number updated. _error/_errorDetails: Present when matchField, records, credential, or Airtable execution fails.',
      usageExample: { scenario: 'Sync a customer profile into Airtable by email address', inputValues: { apiKey: '{{$credentials.airtable.apiKey}}', baseId: 'appXXXXXXXXXXXXXX', table: 'Customers', matchField: 'Email', records: '[{"fields":{"Email":"{{$json.email}}","Status":"Active"}}]' }, expectedOutput: 'Use `{{$json.created}}` and `{{$json.updated}}` to audit the sync.' },
    },
    delete: {
      description: 'Delete one or more Airtable records by recordIds or the Record ID fallback.',
      outputExample: { deletedRecords: [{ id: 'recAbc123', fields: {}, createdTime: '2026-07-19T09:00:00.000Z' }], count: 1 },
      outputDescription: 'deletedRecords: Airtable record objects returned by the SDK for deleted records. count: Number deleted. _error/_errorDetails: Present when IDs, credentials, base, table, or Airtable execution fails.',
      usageExample: { scenario: 'Remove a cancelled subscription record from Airtable', inputValues: { apiKey: '{{$credentials.airtable.apiKey}}', baseId: 'appXXXXXXXXXXXXXX', table: 'Subscriptions', recordIds: '["{{$json.recordId}}"]' }, expectedOutput: '`{{$json.deletedRecords[0].id}}` confirms which record was removed.' },
    },
  },

  firebase: {
    get: {
      description: 'Read one Firestore document by collection and documentId.',
      outputExample: { documentId: 'user_123', email: 'buyer@example.com', status: 'active' },
      outputDescription: 'documentId: Firestore document ID. data: null for a missing document, or object fields may be flattened to top level by the wrapper. _error: Present when validation or Firebase execution fails.',
      usageExample: { scenario: 'Read a user profile before sending a notification', inputValues: { projectId: 'my-project', clientEmail: 'firebase-adminsdk@my-project.iam.gserviceaccount.com', privateKey: '{{$credentials.firebase.privateKey}}', collection: 'users', documentId: '{{$json.userId}}' }, expectedOutput: 'Use `{{$json.email}}`, `{{$json.data}}`, or `{{$json.documentId}}` in the next step.' },
    },
    query: {
      description: 'Query a Firestore collection with simple equality filters and optional limit.',
      outputExample: { data: [{ id: 'user_123', email: 'buyer@example.com' }], count: 1 },
      outputDescription: 'data: Array of documents with id plus fields. count: Number returned. _error: Present when validation, credentials, or Firestore execution fails.',
      usageExample: { scenario: 'Find active users for a daily report', inputValues: { projectId: 'my-project', clientEmail: 'firebase-adminsdk@my-project.iam.gserviceaccount.com', privateKey: '{{$credentials.firebase.privateKey}}', collection: 'users', filter: '{"status":"active"}', limit: '100' }, expectedOutput: 'Loop over `{{$json.data}}` and record `{{$json.count}}`.' },
    },
    add: {
      description: 'Add a Firestore document with an auto-generated ID and return that ID plus written data.',
      outputExample: { documentId: 'newDocId123', email: 'new@example.com', status: 'new' },
      outputDescription: 'documentId: Generated document ID. Object data fields may be flattened to top level. _error: Present when data or Firebase execution fails.',
      usageExample: { scenario: 'Store a signup profile in Firestore', inputValues: { projectId: 'my-project', clientEmail: 'firebase-adminsdk@my-project.iam.gserviceaccount.com', privateKey: '{{$credentials.firebase.privateKey}}', collection: 'users', data: '{"email":"{{$json.email}}","status":"new"}' }, expectedOutput: '`{{$json.documentId}}` is the new Firestore document ID.' },
    },
    update: {
      description: 'Merge-update one Firestore document by collection and documentId.',
      outputExample: { documentId: 'user_123', status: 'active' },
      outputDescription: 'documentId: Updated document ID. Object data fields may be flattened to top level. _error: Present when documentId, data, or Firebase execution fails.',
      usageExample: { scenario: 'Mark a user as active after verification', inputValues: { projectId: 'my-project', clientEmail: 'firebase-adminsdk@my-project.iam.gserviceaccount.com', privateKey: '{{$credentials.firebase.privateKey}}', collection: 'users', documentId: '{{$json.userId}}', data: '{"status":"active"}' }, expectedOutput: '`{{$json.documentId}}` identifies the updated document.' },
    },
    delete: {
      description: 'Delete one Firestore document by collection and documentId.',
      outputExample: { documentId: 'user_123', deleted: true },
      outputDescription: 'documentId: Deleted document ID. deleted: true after the delete call completes. _error: Present when documentId or Firebase execution fails.',
      usageExample: { scenario: 'Remove a temporary Firestore profile', inputValues: { projectId: 'my-project', clientEmail: 'firebase-adminsdk@my-project.iam.gserviceaccount.com', privateKey: '{{$credentials.firebase.privateKey}}', collection: 'users', documentId: '{{$json.userId}}' }, expectedOutput: '`{{$json.deleted}}` confirms the delete call completed.' },
    },
    realtime_get: {
      description: 'Read a Firebase Realtime Database value from the Collection field, which acts as the path.',
      outputExample: { data: { online: true } },
      outputDescription: 'data: snapshot.val() for the Realtime Database path. _error: Present when databaseUrl, path, credentials, or Firebase execution fails.',
      usageExample: { scenario: 'Check live presence before routing a chat', inputValues: { projectId: 'my-project', clientEmail: 'firebase-adminsdk@my-project.iam.gserviceaccount.com', privateKey: '{{$credentials.firebase.privateKey}}', collection: '/presence/{{$json.userId}}', databaseUrl: 'https://my-project-default-rtdb.firebaseio.com' }, expectedOutput: 'Use `{{$json.data.online}}` in a branch.' },
    },
    realtime_set: {
      description: 'Write data to a Firebase Realtime Database path from the Collection field.',
      outputExample: { path: '/presence/user_123' },
      outputDescription: 'path: Realtime Database path that was written. _error: Present when databaseUrl, path, data, credentials, or Firebase execution fails.',
      usageExample: { scenario: 'Update live user presence', inputValues: { projectId: 'my-project', clientEmail: 'firebase-adminsdk@my-project.iam.gserviceaccount.com', privateKey: '{{$credentials.firebase.privateKey}}', collection: '/presence/{{$json.userId}}', data: '{"online":true}', databaseUrl: 'https://my-project-default-rtdb.firebaseio.com' }, expectedOutput: '`{{$json.path}}` confirms where the value was written.' },
    },
  },

  mongodb: {
    find: {
      description: 'Find MongoDB documents with optional filter, projection, sort, skip, and limit.',
      outputExample: { documents: [{ _id: '64f...', email: 'buyer@example.com', status: 'active' }], count: 1 },
      outputDescription: 'documents: Array from cursor.toArray(). count: Number returned. _error: Present when connection, validation, or driver execution fails.',
      usageExample: { scenario: 'Find active users before sending a campaign', inputValues: { connectionString: '{{$credentials.mongodb.connectionString}}', database: 'appdb', collection: 'users', filter: '{"status":"active"}', limit: '50' }, expectedOutput: 'Use `{{$json.documents[0].email}}` in the next node.' },
    },
    insertOne: {
      description: 'Insert one MongoDB document and return the driver insert result fields.',
      outputExample: { insertedId: '64f...', acknowledged: true },
      outputDescription: 'insertedId: Inserted document ID. acknowledged: Driver acknowledgement flag. _error: Present when document or execution fails.',
      usageExample: { scenario: 'Store a new event document', inputValues: { connectionString: '{{$credentials.mongodb.connectionString}}', database: 'appdb', collection: 'events', document: '{"email":"{{$json.email}}","type":"signup"}' }, expectedOutput: '`{{$json.insertedId}}` is the new document ID.' },
    },
    updateOne: {
      description: 'Update the first MongoDB document matching filter.',
      outputExample: { matchedCount: 1, modifiedCount: 1, upsertedCount: 0, upsertedId: null, acknowledged: true },
      outputDescription: 'matchedCount: Number matched. modifiedCount: Number changed. upsertedCount/upsertedId: Upsert metadata. acknowledged: Driver acknowledgement flag. _error: Present when filter, update, or execution fails.',
      usageExample: { scenario: 'Mark one user as verified', inputValues: { connectionString: '{{$credentials.mongodb.connectionString}}', database: 'appdb', collection: 'users', filter: '{"_id":"{{$json.userId}}"}', update: '{"$set":{"verified":true}}' }, expectedOutput: '`{{$json.modifiedCount}}` confirms the update.' },
    },
    deleteOne: {
      description: 'Delete the first MongoDB document matching filter.',
      outputExample: { deletedCount: 1, acknowledged: true },
      outputDescription: 'deletedCount: Number deleted. acknowledged: Driver acknowledgement flag. _error: Present when filter or execution fails.',
      usageExample: { scenario: 'Delete one temporary import document', inputValues: { connectionString: '{{$credentials.mongodb.connectionString}}', database: 'appdb', collection: 'imports', filter: '{"_id":"{{$json.importId}}"}' }, expectedOutput: '`{{$json.deletedCount}}` confirms whether a document was deleted.' },
    },
  },

  google_cloud_storage: {
    upload: {
      description: 'Upload File Content to one bucket object path.',
      outputExample: { fileName: 'invoices/inv-1001.txt', fileSize: 42 },
      outputDescription: 'fileName: Object path written. fileSize: Byte length of the uploaded content. _error: Present when credentials, bucket, fileName, fileContent, or GCS execution fails.',
      usageExample: { scenario: 'Archive a generated invoice in GCS', inputValues: { projectId: 'my-gcp-project', clientEmail: 'workflow@my-gcp-project.iam.gserviceaccount.com', privateKey: '{{$credentials.google_cloud_storage.privateKey}}', bucket: 'company-uploads', fileName: 'invoices/{{$json.invoiceId}}.txt', fileContent: '{{$json.invoiceText}}' }, expectedOutput: '`{{$json.fileName}}` and `{{$json.fileSize}}` confirm the upload.' },
    },
    download: {
      description: 'Download one GCS object and return its UTF-8 string content.',
      outputExample: { fileName: 'invoices/inv-1001.txt', data: 'Invoice INV-1001 paid' },
      outputDescription: 'fileName: Object path downloaded. data: UTF-8 string content. _error: Present when credentials, bucket, object path, or GCS execution fails.',
      usageExample: { scenario: 'Read a stored invoice before emailing it', inputValues: { projectId: 'my-gcp-project', clientEmail: 'workflow@my-gcp-project.iam.gserviceaccount.com', privateKey: '{{$credentials.google_cloud_storage.privateKey}}', bucket: 'company-uploads', fileName: 'invoices/{{$json.invoiceId}}.txt' }, expectedOutput: 'Use `{{$json.data}}` as the downloaded text.' },
    },
    delete: {
      description: 'Delete one GCS object by fileName.',
      outputExample: { fileName: 'tmp/export.csv', deleted: true },
      outputDescription: 'fileName: Object path deleted. deleted: true after SDK delete completes. _error: Present when credentials, bucket, object path, or GCS execution fails.',
      usageExample: { scenario: 'Clean up a temporary export file', inputValues: { projectId: 'my-gcp-project', clientEmail: 'workflow@my-gcp-project.iam.gserviceaccount.com', privateKey: '{{$credentials.google_cloud_storage.privateKey}}', bucket: 'company-uploads', fileName: 'tmp/{{$json.fileName}}' }, expectedOutput: '`{{$json.deleted}}` confirms the delete call completed.' },
    },
    list: {
      description: 'List objects in a GCS bucket, optionally using filter as an object-name prefix.',
      outputExample: { data: [{ name: 'exports/report.csv', size: '1024', updated: '2026-07-19T09:00:00.000Z' }], count: 1 },
      outputDescription: 'data: Array of file metadata objects with name, size, and updated. count: Number of objects returned. _error: Present when credentials, bucket, permissions, or GCS execution fails.',
      usageExample: { scenario: 'List generated reports before sending a digest', inputValues: { projectId: 'my-gcp-project', clientEmail: 'workflow@my-gcp-project.iam.gserviceaccount.com', privateKey: '{{$credentials.google_cloud_storage.privateKey}}', bucket: 'company-uploads', filter: 'exports/' }, expectedOutput: 'Loop over `{{$json.data}}` and log `{{$json.count}}`.' },
    },
  },

  linear: {
    create_issue: {
      description: 'Create a Linear issue with teamId and title, plus optional description, stateId, and priority.',
      outputExample: { success: true, operation: 'create_issue', issue: { id: 'issue-uuid', identifier: 'ENG-124', title: 'Bug: checkout fails', url: 'https://linear.app/acme/issue/ENG-124' } },
      outputDescription: 'Runtime preserves incoming fields and adds success, operation, data, issue, issues, teams, and count when applicable. Failures return success false with error.',
      usageExample: { scenario: 'Create an engineering task from a support escalation', inputValues: { operation: 'create_issue', teamId: '{{$json.teams[0].id}}', title: '{{$json.title}}', description: '{{$json.summary}}' }, expectedOutput: 'Use `{{$json.issue.url}}` in the next notification.' },
    },
  },

  trello: {
    create_card: {
      description: 'Create a Trello card in a list. Requires listId and cardName; optional fields include cardDesc, dueDate, idLabels, and idMembers.',
      outputExample: { success: true, operation: 'create_card', card: { id: 'card789', name: 'Follow up with Acme', url: 'https://trello.com/c/card789' }, data: { id: 'card789' } },
      outputDescription: 'Runtime preserves incoming fields and adds success, operation, data, plus normalized card/cards/boards/lists/labels/count fields depending on the operation.',
      usageExample: { scenario: 'Create a Trello card from a Typeform response', inputValues: { operation: 'create_card', listId: '{{$json.lists[0].id}}', cardName: '{{$json.title}}', cardDesc: '{{$json.description}}' }, expectedOutput: 'Use `{{$json.card.id}}` for later update, move, label, or checklist steps.' },
    },
  },

  typeform: {
    get_responses: {
      description: 'Retrieve submissions for one Typeform form. The current runtime supports get_responses, create_form, and get_form; it does not support get_forms.',
      outputExample: { success: true, operation: 'get_responses', data: { total_items: 2, items: [{ response_id: 'rsp_123' }] }, items: [{ response_id: 'rsp_123' }], totalItems: 2, formId: 'abc123' },
      outputDescription: 'Runtime preserves incoming fields and adds success, operation, data, items when data.items is an array, totalItems from total_items, and formId.',
      usageExample: { scenario: 'Pull survey responses before sending a weekly summary', inputValues: { operation: 'get_responses', formId: '{{$json.formId}}' }, expectedOutput: 'Summarize `{{$json.items}}` and log `{{$json.totalItems}}`.' },
    },
  },

  notion: {
    query_database: {
      description: 'Legacy Notion query_database override retained for old keys. The current UI/runtime uses resource database with operation query, databaseId, query, pageSize, and returnAll.',
      outputExample: { success: true, data: { object: 'list', results: [{ id: 'page_abc123', properties: { Name: { title: [{ plain_text: 'Project Alpha' }] } } }] } },
      outputDescription: 'Success preserves incoming fields and adds success true plus data. Query results live under data.results, not a top-level results field. Failures return _error and may include _errorDetails.',
      usageExample: {
        scenario: 'Fetch all In Progress tasks from a Notion project database',
        inputValues: { resource: 'database', operation: 'query', databaseId: '{{$json.databaseId}}', query: '{"filter":{"property":"Status","select":{"equals":"In Progress"}}}' },
        expectedOutput: 'Returns matching pages under `{{$json.data.results}}`.',
      },
    },
    create_page: {
      description: 'Legacy create_page override. The current runtime uses resource page with operation create and creates either a database row with databaseId/properties or a child page with parentPageId/children/content.',
      outputExample: { success: true, data: { id: 'new_page_xyz', url: 'https://notion.so/new_page_xyz', properties: { Name: { title: [{ plain_text: 'New Task' }] } } } },
      outputDescription: 'The created Notion page is returned under data. Use data.id and data.url in downstream nodes.',
      usageExample: {
        scenario: 'Create a Notion task for each incoming Jira issue',
        inputValues: { resource: 'page', operation: 'create', databaseId: '{{$json.databaseId}}', properties: '{"Name":{"title":[{"text":{"content":"{{$json.issueSummary}}"}}]},"Status":{"select":{"name":"Backlog"}}}' },
        expectedOutput: 'Task is created in Notion. Share `{{$json.data.url}}` with your team.',
      },
    },
    get_page: {
      description: 'Get the properties and metadata of a Notion page by its ID.',
      outputExample: { success: true, data: { id: 'page_abc', url: 'https://notion.so/page_abc', properties: { Name: { title: [{ plain_text: 'Meeting Notes' }] } } } },
      outputDescription: 'Page metadata and properties are returned under data. The runtime also preserves incoming fields and adds success true.',
      usageExample: { scenario: 'Read a Notion page\'s properties before deciding to update it', inputValues: { resource: 'page', operation: 'get', pageId: '{{$json.pageId}}' }, expectedOutput: 'Returns page properties under `{{$json.data.properties}}`.' },
    },
    update_page: {
      description: 'Update the properties of an existing Notion page.',
      outputExample: { success: true, data: { id: 'page_abc', properties: { Status: { select: { name: 'Done' } }, 'Completed At': { date: { start: '2025-01-15' } } } } },
      outputDescription: 'Updated page data is returned under data. Missing pageId or properties returns _error.',
      usageExample: {
        scenario: 'Mark a Notion task as Done when a Jira issue is resolved',
        inputValues: { resource: 'page', operation: 'update', pageId: '{{$json.pageId}}', properties: '{"Status":{"select":{"name":"Done"}},"Completed At":{"date":{"start":"{{$now}}"}}}' },
        expectedOutput: 'Page properties are updated under `{{$json.data.properties}}`.',
      },
    },
  },

  hubspot: {
    get: {
      description: 'Fetches one existing HubSpot CRM record by its numeric ID via GET /crm/v3/objects/{resource}/{id}.',
      outputExample: { success: true, id: '12345678', record: { id: '12345678', properties: { firstname: 'Alice', lastname: 'Smith', email: 'alice@example.com' } }, properties: { firstname: 'Alice', lastname: 'Smith', email: 'alice@example.com' } },
      outputDescription: 'success: true when HubSpot accepted the request. id: the fetched record ID. record: the full raw HubSpot object. properties: the same properties duplicated at the top level for convenience.',
      usageExample: { scenario: 'Look up a HubSpot contact before updating their properties', inputValues: { resource: 'contact', operation: 'get', id: '{{$json.contactId}}' }, expectedOutput: 'Returns the full contact record as {{$json.record}}.' },
    },
    getMany: {
      description: 'Fetches a page of existing HubSpot CRM records via GET /crm/v3/objects/{resource}, using cursor-based pagination.',
      outputExample: { success: true, results: [{ id: '12345678', properties: { email: 'alice@example.com' } }], total: 245, paging: { next: { after: 'NTI1MjQ5NjM1Mg' } } },
      outputDescription: 'success: true when HubSpot accepted the request. results: the array of records for this page. total: the total matching record count across all pages. paging: present when more pages remain - map paging.next.after into a follow-up run\'s After field.',
      usageExample: { scenario: 'Pull the current page of HubSpot contacts for a CRM health report', inputValues: { resource: 'contact', operation: 'getMany', limit: '100' }, expectedOutput: 'Returns up to 100 records as {{$json.results}}.' },
    },
    create: {
      description: 'Creates a new contact, company, deal, or ticket in HubSpot via POST /crm/v3/objects/{resource}.',
      outputExample: { success: true, id: 'new_12345', record: { id: 'new_12345', properties: { firstname: 'Bob', email: 'bob@example.com' } }, properties: { firstname: 'Bob', email: 'bob@example.com' }, createdAt: '2026-07-19T00:00:00Z', updatedAt: '2026-07-19T00:00:00Z' },
      outputDescription: 'success: true when HubSpot accepted the request. id: the new HubSpot record ID. record: the full raw created object. properties/createdAt/updatedAt: duplicated at the top level for convenience.',
      usageExample: {
        scenario: 'Create a HubSpot contact when a new user signs up via a website form',
        inputValues: { resource: 'contact', operation: 'create', properties: '{"firstname": "{{$json.firstName}}", "lastname": "{{$json.lastName}}", "email": "{{$json.email}}"}' },
        expectedOutput: 'Contact is created. `{{$json.id}}` is the HubSpot contact ID.',
      },
    },
    update: {
      description: 'Updates properties on an existing HubSpot contact, company, deal, or ticket via PATCH /crm/v3/objects/{resource}/{id}.',
      outputExample: { success: true, id: '12345678', record: { id: '12345678', properties: { lifecyclestage: 'customer', dealstage: 'closedwon' } }, properties: { lifecyclestage: 'customer', dealstage: 'closedwon' } },
      outputDescription: 'success: true when HubSpot accepted the request. id: the updated record ID. record: the full raw object after the update. properties: duplicated at the top level for convenience.',
      usageExample: {
        scenario: 'Move a HubSpot deal to "Closed Won" when a Stripe payment succeeds',
        inputValues: { resource: 'deal', operation: 'update', id: '{{$json.dealId}}', properties: '{"dealstage": "closedwon"}' },
        expectedOutput: 'Deal stage is updated in HubSpot. Confirm with {{$json.record.properties.dealstage}}.',
      },
    },
    delete: {
      description: 'Permanently deletes (archives) an existing HubSpot record via DELETE /crm/v3/objects/{resource}/{id}. HubSpot returns no body, so this node reports a synthetic confirmation.',
      outputExample: { success: true, id: '12345678', deleted: true },
      outputDescription: 'success: true when HubSpot accepted the request. id: the deleted record ID, echoed back. deleted: always true on success - there is no record field since HubSpot returns no body.',
      usageExample: { scenario: 'Remove a duplicate test contact created during an integration test run', inputValues: { resource: 'contact', operation: 'delete', id: '{{$json.contactId}}' }, expectedOutput: 'HubSpot confirms removal as {{$json.deleted}}.' },
    },
    search: {
      description: 'Finds HubSpot CRM records matching a query via POST /crm/v3/objects/{resource}/search, using HubSpot CRM search syntax.',
      outputExample: { success: true, results: [{ id: '12345678', properties: { email: 'alice@example.com' } }], total: 1 },
      outputDescription: 'success: true when HubSpot accepted the request. results: matching records (empty array, not an error, when nothing matches). total: the number of matches HubSpot reports.',
      usageExample: { scenario: 'Look up the exact HubSpot contact by email before updating their ticket status', inputValues: { resource: 'contact', operation: 'search', searchQuery: 'email:alice@example.com' }, expectedOutput: 'Returns matching records as {{$json.results}}.' },
    },
    batchCreate: {
      description: 'Bulk-creates several HubSpot records in one request via POST /crm/v3/objects/{resource}/batch/create using the Records field.',
      outputExample: { success: true, status: 'COMPLETE', results: [{ id: '12345678', properties: { email: 'a@example.com' } }, { id: '12345679', properties: { email: 'b@example.com' } }] },
      outputDescription: 'success: true when HubSpot accepted the request. status: HubSpot\'s batch job status. results: one created record per entry in Records.',
      usageExample: { scenario: 'Bulk-create every row from a freshly uploaded CSV of new leads', inputValues: { resource: 'contact', operation: 'batchCreate', records: '[{"email":"a@example.com"},{"email":"b@example.com"}]' }, expectedOutput: 'Returns the created records as {{$json.results}}.' },
    },
  },

  intercom: {
    list: {
      description: 'Fetch a page of Intercom conversations via GET /conversations, using cursor-based pagination.',
      outputExample: { operation: 'list', data: { type: 'conversation.list', conversations: [{ type: 'conversation', id: '123456789' }], total_count: 245, pages: { next: { starting_after: 'abcdef123456' } } } },
      outputDescription: 'operation: echoes back "list". data: Intercom\'s raw conversation-list response, including conversations, total_count, and a pages cursor.',
      usageExample: { scenario: 'Pull the newest Intercom conversations every hour for a support backlog view', inputValues: { operation: 'list', perPage: '20' }, expectedOutput: 'Returns conversations as {{$json.data.conversations}}.' },
    },
    get: {
      description: 'Fetch one existing Intercom conversation by ID via GET /conversations/{conversationId}.',
      outputExample: { operation: 'get', data: { type: 'conversation', id: '123456789', conversation_message: { body: 'Hi, I need help with my order.' } } },
      outputDescription: 'operation: echoes back "get". data: Intercom\'s full raw conversation object.',
      usageExample: { scenario: 'Fetch the full details of one Intercom conversation before summarizing it with an AI Agent', inputValues: { operation: 'get', conversationId: '{{$json.conversationId}}' }, expectedOutput: 'Returns the conversation as {{$json.data}}.' },
    },
    send: {
      description: 'Post a reply into an existing Intercom conversation via POST /conversations/{conversationId}/reply. Note: not selectable from the visual Operation dropdown today - set via workflow JSON or AI generation.',
      outputExample: { operation: 'send', data: { type: 'conversation', id: '123456789', conversation_parts: { conversation_parts: [{ body: 'Thanks for reaching out!' }] } } },
      outputDescription: 'operation: echoes back "send". data: the updated Intercom conversation including the new reply under conversation_parts.',
      usageExample: { scenario: 'Post an AI-drafted reply into the original Intercom conversation', inputValues: { operation: 'send', conversationId: '{{$json.conversationId}}' }, expectedOutput: 'Returns the updated conversation as {{$json.data}}, confirming the reply was posted.' },
    },
  },

  intuit_smes: {
    getCustomers: {
      description: 'Mock/demo operation. Returns two fixed hardcoded demo customer records - does not query your real Intuit/QuickBooks account.',
      outputExample: { success: true, data: [{ id: '1', name: 'SME Customer 1', email: 'customer1@example.com' }, { id: '2', name: 'SME Customer 2', email: 'customer2@example.com' }], message: 'Successfully retrieved customers', error: null },
      outputDescription: 'success: true whenever the credential presence check passes. data: a fixed array of two demo customer records, always the same. message: a fixed status string. error: always null on success.',
      usageExample: { scenario: 'Prototype a workflow shape that will eventually list real Intuit customers, using fixed demo data as a placeholder', inputValues: { operation: 'getCustomers', apiKey: 'test-key' }, expectedOutput: 'Returns the same two demo customers every time as {{$json.data}}.' },
    },
    createCustomer: {
      description: 'Mock/demo operation. Builds a fabricated confirmation object from the Customer Name/Email you typed in - does not create a real Intuit/QuickBooks customer.',
      outputExample: { success: true, data: { customerId: 'CUST-1752940800000', name: 'Acme Corp', email: 'contact@acme.com', createdAt: '2026-07-19T00:00:00.000Z' }, message: 'Successfully created customer', error: null },
      outputDescription: 'success: true whenever the credential presence check passes. data: a fabricated customer object - customerId is a locally-generated placeholder, not a real Intuit ID. message: a fixed status string. error: always null on success.',
      usageExample: { scenario: 'Prototype the "create a customer" step before a real Intuit/QuickBooks integration exists', inputValues: { operation: 'createCustomer', apiKey: 'test-key', name: 'Acme Corp', email: 'contact@acme.com' }, expectedOutput: 'Returns a fabricated {{$json.data.customerId}} - no real customer exists in Intuit.' },
    },
    updateCustomer: {
      description: 'Mock/demo operation. Builds a fabricated confirmation object from the Customer Id you typed in - does not update a real Intuit/QuickBooks customer, and does not check whether the customer exists.',
      outputExample: { success: true, data: { customerId: 'CUST-123', updated: true, updatedAt: '2026-07-19T00:00:00.000Z' }, message: 'Successfully updated customer', error: null },
      outputDescription: 'success: true whenever the credential presence check passes. data: a fabricated confirmation object - updated is always true regardless of whether the customer exists. message: a fixed status string. error: always null on success.',
      usageExample: { scenario: 'Prototype the "update a customer" step before a real Intuit/QuickBooks integration exists', inputValues: { operation: 'updateCustomer', apiKey: 'test-key', customerId: 'CUST-123' }, expectedOutput: '{{$json.data.updated}} is always true - this confirms nothing about a real record.' },
    },
    getInvoices: {
      description: 'Mock/demo operation. Returns two fixed hardcoded demo invoice records - does not query your real Intuit/QuickBooks account.',
      outputExample: { success: true, data: [{ invoiceId: 'INV-001', customerId: '1', amount: 1000, status: 'paid' }, { invoiceId: 'INV-002', customerId: '2', amount: 2500, status: 'pending' }], message: 'Successfully retrieved invoices', error: null },
      outputDescription: 'success: true whenever the credential presence check passes. data: a fixed array of two demo invoice records, always the same. message: a fixed status string. error: always null on success.',
      usageExample: { scenario: 'Prototype a workflow shape that will eventually list real Intuit invoices, using fixed demo data as a placeholder', inputValues: { operation: 'getInvoices', apiKey: 'test-key' }, expectedOutput: 'Returns the same two demo invoices every time as {{$json.data}}.' },
    },
    createInvoice: {
      description: 'Mock/demo operation. Builds a fabricated confirmation object from the Customer Id/Invoice Amount you typed in - does not create a real Intuit/QuickBooks invoice and does not bill any customer.',
      outputExample: { success: true, data: { invoiceId: 'INV-1752940800000', customerId: 'CUST-123', amount: 1000, status: 'created', createdAt: '2026-07-19T00:00:00.000Z' }, message: 'Successfully created invoice', error: null },
      outputDescription: 'success: true whenever the credential presence check passes. data: a fabricated invoice object - invoiceId is a locally-generated placeholder, not a real Intuit invoice number. message: a fixed status string. error: always null on success.',
      usageExample: { scenario: 'Prototype the "create an invoice" step before a real Intuit/QuickBooks integration exists', inputValues: { operation: 'createInvoice', apiKey: 'test-key', customerId: 'CUST-123', amount: '1000' }, expectedOutput: 'Returns a fabricated {{$json.data.invoiceId}} - no real invoice exists in Intuit and no customer is billed.' },
    },
  },

  mailchimp: {
    subscribe: {
      description: 'Adds or updates a Mailchimp list member via PUT /lists/{listId}/members/{md5(email)} - Mailchimp identifies the member by an MD5 hash of the lowercased email.',
      outputExample: { operation: 'subscribe', data: { id: 'a1b2c3d4e5f6', email_address: 'alice@example.com', status: 'subscribed', merge_fields: { FNAME: 'Alice' } } },
      outputDescription: 'operation: echoes back "subscribe". data: the full raw Mailchimp member object after the change.',
      usageExample: { scenario: 'Add a new visitor to the newsletter audience as soon as they submit a signup form', inputValues: { operation: 'subscribe', listId: '{{$json.listId}}' }, expectedOutput: 'Returns the member record as {{$json.data}}.' },
    },
    unsubscribe: {
      description: 'Marks an existing list member as unsubscribed via PATCH /lists/{listId}/members/{md5(email)}.',
      outputExample: { operation: 'unsubscribe', data: { id: 'a1b2c3d4e5f6', email_address: 'alice@example.com', status: 'unsubscribed' } },
      outputDescription: 'operation: echoes back "unsubscribe". data: the full raw Mailchimp member object with status now unsubscribed.',
      usageExample: { scenario: 'Remove a customer from the marketing list when they click an unsubscribe link', inputValues: { operation: 'unsubscribe', listId: '{{$json.listId}}' }, expectedOutput: 'Returns the updated member as {{$json.data}} with status unsubscribed.' },
    },
    send: {
      description: 'Triggers sending an already-created Mailchimp campaign via POST /campaigns/{campaignId}/actions/send. Mailchimp returns HTTP 204 with no body, so data is always null on success.',
      outputExample: { operation: 'send', data: null },
      outputDescription: 'operation: echoes back "send". data: always null on success - Mailchimp\'s send endpoint returns no body; absence of _error confirms it worked.',
      usageExample: { scenario: 'Trigger a pre-built Mailchimp campaign to send at a precise time decided by an internal scheduler', inputValues: { operation: 'send', campaignId: '{{$json.campaignId}}' }, expectedOutput: '{{$json.data}} is null; no {{$json._error}} confirms the send succeeded.' },
    },
  },

  microsoft_dynamics: {
    getRecords: {
      description: 'Fetch multiple Dynamics 365 records via GET /api/data/v9.2/{entity}, optionally narrowed with $select/$filter/$top.',
      outputExample: { success: true, data: [{ contactid: '00000000-0000-0000-0000-000000000000', fullname: 'Alice Chen', emailaddress1: 'alice@example.com' }], count: 1 },
      outputDescription: 'success: true when Dynamics accepted the request. data: the array of raw records. count: number of records returned.',
      usageExample: { scenario: 'Pull every active contact matching a filter for a weekly outreach list', inputValues: { resource: 'contacts', operation: 'getRecords', filter: "statecode eq 0" }, expectedOutput: 'Returns matching records as {{$json.data}}.' },
    },
    getRecord: {
      description: 'Fetch one existing Dynamics 365 record by GUID via GET /api/data/v9.2/{entity}({id}).',
      outputExample: { success: true, data: { contactid: '00000000-0000-0000-0000-000000000000', fullname: 'Alice Chen', emailaddress1: 'alice@example.com' } },
      outputDescription: 'success: true when Dynamics accepted the request. data: the full raw record.',
      usageExample: { scenario: 'Fetch the full details of one contact before drafting a personalized reply', inputValues: { resource: 'contacts', operation: 'getRecord', id: '{{$json.contactId}}' }, expectedOutput: 'Returns the contact as {{$json.data}}.' },
    },
    createRecord: {
      description: 'Create a new Dynamics 365 record via POST /api/data/v9.2/{entity}. Only the new ID is returned, not the created field values.',
      outputExample: { success: true, id: '00000000-0000-0000-0000-000000000000', entityId: 'https://yourorg.crm.dynamics.com/api/data/v9.2/contacts(00000000-0000-0000-0000-000000000000)' },
      outputDescription: 'success: true when Dynamics accepted the create request. id: the new record\'s GUID. entityId: the raw OData-EntityId header the id was extracted from.',
      usageExample: { scenario: 'Create a new Dynamics 365 contact for every visitor who submits a signup form', inputValues: { resource: 'contacts', operation: 'createRecord', fields: '{"firstname":"Alice","emailaddress1":"alice@example.com"}' }, expectedOutput: 'Returns the new record\'s ID as {{$json.id}}.' },
    },
    updateRecord: {
      description: 'Update an existing Dynamics 365 record via PATCH /api/data/v9.2/{entity}({id}). No updated field data is returned, only the same ID.',
      outputExample: { success: true, id: '00000000-0000-0000-0000-000000000000' },
      outputDescription: 'success: true when Dynamics accepted the update request. id: echoes back the record ID that was changed.',
      usageExample: { scenario: 'Update a case status after an agent resolves it in an external ticketing tool', inputValues: { resource: 'incidents', operation: 'updateRecord', id: '{{$json.caseId}}', fields: '{"statuscode":5}' }, expectedOutput: 'Confirms the update with {{$json.id}}.' },
    },
    deleteRecord: {
      description: 'Permanently delete an existing Dynamics 365 record via DELETE /api/data/v9.2/{entity}({id}).',
      outputExample: { success: true, id: '00000000-0000-0000-0000-000000000000', deleted: true },
      outputDescription: 'success: true when Dynamics accepted the delete request. id: the deleted record\'s ID, echoed back. deleted: always true on success.',
      usageExample: { scenario: 'Remove duplicate test leads created accidentally during an integration test run', inputValues: { resource: 'leads', operation: 'deleteRecord', id: '{{$json.leadId}}' }, expectedOutput: 'Confirms removal as {{$json.deleted}}.' },
    },
    fetchXml: {
      description: 'Run an advanced FetchXML query via GET /api/data/v9.2/{entity}?fetchXml={query}, for filtering/sorting/joins beyond plain OData.',
      outputExample: { success: true, data: [{ contactid: '00000000-0000-0000-0000-000000000000', fullname: 'Alice Chen' }], count: 1 },
      outputDescription: 'success: true when Dynamics accepted the query. data: the array of matching records. count: number of records returned.',
      usageExample: { scenario: 'Re-use a saved Dynamics 365 Advanced Find view exported as FetchXML for a daily contact pull', inputValues: { resource: 'contacts', operation: 'fetchXml', fetchXml: '<fetch><entity name="contact"><attribute name="fullname"/></entity></fetch>' }, expectedOutput: 'Returns matching records as {{$json.data}}.' },
    },
  },

  odoo: {
    getRecords: {
      description: 'Search and read records from an Odoo model via the search_read JSON-RPC method.',
      outputExample: { success: true, operation: 'getRecords', model: 'res.partner', data: [{ id: 42, name: 'Acme Corp', email: 'info@acme.com' }], error: null },
      outputDescription: 'success: true when Odoo accepted the request. operation/model: echoed back. data: the array of matching records. error: always null on success.',
      usageExample: { scenario: 'Pull every active customer contact matching a filter for a weekly outreach list', inputValues: { model: 'res.partner', operation: 'getRecords', domain: '[["customer_rank",">",0]]' }, expectedOutput: 'Returns matching records as {{$json.data}}.' },
    },
    createRecord: {
      description: 'Create a new record via the create JSON-RPC method. Only the new numeric ID is returned, not the saved field values.',
      outputExample: { success: true, operation: 'createRecord', model: 'res.partner', data: 44, error: null },
      outputDescription: 'success: true when Odoo accepted the create request. operation/model: echoed back. data: the new record\'s numeric ID. error: always null on success.',
      usageExample: { scenario: 'Create a new Odoo contact for every visitor who submits a signup form', inputValues: { model: 'res.partner', operation: 'createRecord', values: '{"name":"Acme Corp","email":"info@acme.com"}' }, expectedOutput: 'Returns the new record\'s ID as {{$json.data}}.' },
    },
    updateRecord: {
      description: 'Update an existing record via the write JSON-RPC method. Returns only a boolean confirmation, not the updated field values.',
      outputExample: { success: true, operation: 'updateRecord', model: 'res.partner', data: true, error: null },
      outputDescription: 'success: true when Odoo accepted the update request. operation/model: echoed back. data: a plain boolean (true) confirming the write succeeded.',
      usageExample: { scenario: 'Update a customer contact\'s email after they change it in an external system', inputValues: { model: 'res.partner', operation: 'updateRecord', recordId: '42', values: '{"email":"new@acme.com"}' }, expectedOutput: 'Confirms the update with {{$json.data}} = true.' },
    },
    deleteRecord: {
      description: 'Permanently delete an existing record via the unlink JSON-RPC method.',
      outputExample: { success: true, operation: 'deleteRecord', model: 'res.partner', data: true, error: null },
      outputDescription: 'success: true when Odoo accepted the delete request. operation/model: echoed back. data: a plain boolean (true) confirming the deletion.',
      usageExample: { scenario: 'Remove duplicate test contacts created during an integration test run', inputValues: { model: 'res.partner', operation: 'deleteRecord', recordId: '42' }, expectedOutput: 'Confirms removal as {{$json.data}} = true.' },
    },
    executeMethod: {
      description: 'Call any method Odoo exposes on the model directly via JSON-RPC, for actions beyond basic CRUD such as confirming a sale order.',
      outputExample: { success: true, operation: 'executeMethod', model: 'sale.order', data: true, error: null },
      outputDescription: 'success: true when Odoo accepted the method call. operation/model: echoed back. data: whatever the called method itself returns.',
      usageExample: { scenario: 'Confirm a draft sales quotation as soon as a customer accepts a proposal in an external e-signature tool', inputValues: { model: 'sale.order', operation: 'executeMethod', method: 'action_confirm', methodArgs: '[[123]]' }, expectedOutput: 'Runs the method and returns its result as {{$json.data}}.' },
    },
  },

  pipedrive: {
    get: {
      description: 'Fetch one existing Pipedrive record by its resource-specific ID (e.g. personId for Person, dealId for Deal).',
      outputExample: { success: true, data: { id: 1, name: 'Alice Chen', email: [{ value: 'alice@example.com', primary: true }] } },
      outputDescription: 'success: true when Pipedrive accepted the request. data: the full raw record for the requested resource and ID.',
      usageExample: { scenario: 'Fetch the full details of one Pipedrive contact before drafting a follow-up', inputValues: { resource: 'person', operation: 'get' }, expectedOutput: 'Returns the contact as {{$json.data}}.' },
    },
    list: {
      description: 'Fetch multiple records of the chosen resource. The real operation value is "list" - the visual "Get Many" dropdown label does not match it.',
      outputExample: { success: true, data: [{ id: 1, name: 'Alice Chen' }, { id: 2, name: 'Bob Smith' }] },
      outputDescription: 'success: true when Pipedrive accepted the request. data: the array of matching records for this page.',
      usageExample: { scenario: 'Pull a batch of Pipedrive deals every hour for a pipeline summary', inputValues: { resource: 'deal', operation: 'list', limit: '100' }, expectedOutput: 'Returns matching records as {{$json.data}}.' },
    },
    create: {
      description: 'Create a new record on the chosen resource using that resource\'s own individually-named fields (e.g. personName/personEmail for Person).',
      outputExample: { success: true, data: { id: 3, name: 'Acme Corp', add_time: '2026-07-19 00:00:00' } },
      outputDescription: 'success: true when Pipedrive accepted the create request. data: the full raw created record, including its new id.',
      usageExample: { scenario: 'Create a new Pipedrive contact for every visitor who submits a signup form', inputValues: { resource: 'person', operation: 'create' }, expectedOutput: 'Returns the new contact as {{$json.data}}, including {{$json.data.id}}.' },
    },
    update: {
      description: 'Update an existing record identified by its resource-specific ID, using that resource\'s own individually-named fields.',
      outputExample: { success: true, data: { id: 3, name: 'Acme Corp Updated' } },
      outputDescription: 'success: true when Pipedrive accepted the update request. data: the full raw record after the change.',
      usageExample: { scenario: 'Update a deal\'s stage after a payment is confirmed in an external system', inputValues: { resource: 'deal', operation: 'update' }, expectedOutput: 'Returns the changed record as {{$json.data}}.' },
    },
    delete: {
      description: 'Permanently delete an existing record identified by its resource-specific ID. Not supported for the Pipeline resource.',
      outputExample: { success: true, data: { id: 3 } },
      outputDescription: 'success: true when Pipedrive accepted the delete request. data: Pipedrive\'s own delete confirmation.',
      usageExample: { scenario: 'Remove duplicate test contacts created during an integration test run', inputValues: { resource: 'person', operation: 'delete' }, expectedOutput: 'Confirms removal, echoed as {{$json.data.id}}.' },
    },
    search: {
      description: 'Find records matching a text term, using searchTerm/searchFields/exactMatch rather than this node\'s generic Search Term/Fields inputs.',
      outputExample: { success: true, data: { items: [{ item: { id: 1, name: 'Alice Chen' } }] } },
      outputDescription: 'success: true when Pipedrive accepted the search request. data: Pipedrive\'s own search response, typically an items array of matches.',
      usageExample: { scenario: 'Look up the exact Pipedrive contact by email before creating a related activity', inputValues: { resource: 'person', operation: 'search' }, expectedOutput: 'Returns matching records inside {{$json.data.items}}.' },
    },
  },

  salesforce: {
    query: {
      description: 'Run a SOQL query to retrieve Salesforce records via GET /services/data/v59.0/query.',
      outputExample: { operation: 'query', resource: '', data: { totalSize: 2, done: true, records: [{ Id: '001Xx...', Name: 'Acme Corp', AnnualRevenue: 5000000 }] } },
      outputDescription: 'operation/resource: echoed back from your configuration. data: Salesforce\'s raw query response - totalSize, done, and the records array.',
      usageExample: { scenario: 'Fetch all high-value Salesforce accounts', inputValues: { operation: 'query', soql: 'SELECT Id, Name, AnnualRevenue FROM Account WHERE AnnualRevenue > 1000000 ORDER BY AnnualRevenue DESC LIMIT 100' }, expectedOutput: 'Returns matching records inside {{$json.data.records}}.' },
    },
    search: {
      description: 'Run a SOSL full-text search across one or more Salesforce object types via GET /services/data/v59.0/search.',
      outputExample: { operation: 'search', resource: '', data: { searchRecords: [{ Id: '003xx000004TmiQAAS', Name: 'Alice Chen' }] } },
      outputDescription: 'operation/resource: echoed back. data: Salesforce\'s raw search response - a searchRecords array.',
      usageExample: { scenario: 'Search across Contacts and Leads for a customer\'s email', inputValues: { operation: 'search', sosl: 'FIND {alice@example.com} IN EMAIL FIELDS RETURNING Contact(Id, Name), Lead(Id, Name)' }, expectedOutput: 'Returns matches inside {{$json.data.searchRecords}}.' },
    },
    get: {
      description: 'Fetch one existing Salesforce record by ID via GET /services/data/v59.0/sobjects/{resource}/{id}.',
      outputExample: { operation: 'get', resource: 'Contact', data: { Id: '003xx000004TmiQAAS', Name: 'Alice Chen', Email: 'alice@example.com' } },
      outputDescription: 'operation/resource: echoed back. data: the full raw Salesforce record.',
      usageExample: { scenario: 'Fetch the full details of one Salesforce contact before drafting a reply', inputValues: { operation: 'get', resource: 'Contact' }, expectedOutput: 'Returns the contact as {{$json.data}}.' },
    },
    create: {
      description: 'Create a new Salesforce record (Account, Contact, Lead, Opportunity, etc.) via POST /services/data/v59.0/sobjects/{resource}. Only the new ID is returned, not the saved field values.',
      outputExample: { operation: 'create', resource: 'Lead', data: { id: '00Qxx0000004abcAAA', success: true, errors: [] } },
      outputDescription: 'operation/resource: echoed back. data: id/success/errors - not the saved field values; run a follow-up Get to see them.',
      usageExample: {
        scenario: 'Create a Salesforce Lead when someone fills in a website enquiry form',
        inputValues: { operation: 'create', resource: 'Lead', fields: '{"FirstName": "{{$json.firstName}}", "LastName": "{{$json.lastName}}", "Email": "{{$json.email}}", "Company": "{{$json.company}}", "LeadSource": "Website"}' },
        expectedOutput: 'Lead is created. `{{$json.data.id}}` is the Salesforce Lead ID.',
      },
    },
    update: {
      description: 'Update fields on an existing Salesforce record via PATCH /services/data/v59.0/sobjects/{resource}/{id}. Returns HTTP 204 with no body on success.',
      outputExample: { operation: 'update', resource: 'Opportunity', data: null },
      outputDescription: 'operation/resource: echoed back. data: always null on success - Salesforce returns no body for updates; the absence of `_error` confirms it worked.',
      usageExample: { scenario: 'Update Salesforce Opportunity stage when a deal progresses', inputValues: { operation: 'update', resource: 'Opportunity', fields: '{"StageName": "Closed Won", "CloseDate": "{{$now}}"}' }, expectedOutput: '`{{$json.data}}` is null; absence of `{{$json._error}}` confirms the update.' },
    },
    delete: {
      description: 'Permanently delete an existing Salesforce record via DELETE /services/data/v59.0/sobjects/{resource}/{id}.',
      outputExample: { operation: 'delete', resource: 'Contact', data: { deleted: true, id: '003xx000004TmiQAAS' } },
      outputDescription: 'operation/resource: echoed back. data: a synthetic {deleted, id} confirmation built by this node, since Salesforce itself returns no body.',
      usageExample: { scenario: 'Remove duplicate test contacts created during an integration test run', inputValues: { operation: 'delete', resource: 'Contact' }, expectedOutput: 'Confirms removal as {{$json.data.deleted}}.' },
    },
    upsert: {
      description: 'Insert or update a record matched by an External ID field rather than Salesforce\'s own record ID, via PATCH /services/data/v59.0/sobjects/{resource}/{externalIdField}/{externalIdValue}.',
      outputExample: { operation: 'upsert', resource: 'Contact', data: { id: '003xx000004TmiQAAS', success: true, errors: [] } },
      outputDescription: 'operation/resource: echoed back. data: an {id, success, errors} object when a new record is created, or null when an existing record is matched and updated (Salesforce returns no body for that case).',
      usageExample: { scenario: 'Sync customer records from an external database using its own primary key as the External ID field', inputValues: { operation: 'upsert', resource: 'Contact', externalIdField: 'CustomId__c', externalIdValue: '{{$json.customerId}}' }, expectedOutput: '{{$json.data.id}} on create, or null on update.' },
    },
    bulkCreate: {
      description: 'Create up to 200 new records in one request via POST /services/data/v59.0/composite/sobjects (Salesforce\'s real Composite sObject Collections API).',
      outputExample: { operation: 'bulkCreate', resource: 'Contact', data: [{ id: '003xx000004TmiQAAS', success: true, errors: [] }] },
      outputDescription: 'operation/resource: echoed back. data: one {id, success, errors} result per submitted record, in order.',
      usageExample: { scenario: 'Bulk-create every row from a freshly uploaded CSV of new leads', inputValues: { operation: 'bulkCreate', resource: 'Contact', records: '[{"LastName":"Chen","Email":"a@x.com"}]' }, expectedOutput: 'Returns one result per record as {{$json.data}}.' },
    },
  },

  sap: {
    get: {
      description: 'Reads data from a SAP OData/REST endpoint via an HTTP GET request. OData v2 list responses are automatically unwrapped from the {d: {results}} envelope so data is a plain array.',
      outputExample: { success: true, data: [{ SalesOrder: '0000012345', SoldToParty: '0000100001', TotalNetAmount: '15000.00' }], count: 1, statusCode: 200 },
      outputDescription: 'success: true when SAP accepted the request. data: the normalized response, unwrapped from any OData v2 envelope. count: present only when data is an array. statusCode: the raw HTTP status code. No _errorDetails key is ever provided by this node.',
      usageExample: { scenario: 'Fetch open SAP sales orders for a daily backlog report', inputValues: { operation: 'get', endpoint: '/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder' }, expectedOutput: 'Returns matching sales orders inside {{$json.data}}.' },
    },
    post: {
      description: 'Creates a new SAP business object via an HTTP POST request, sending the Request Body (JSON) payload. Most SAP OData v2 write services require a valid X-CSRF-Token.',
      outputExample: { success: true, data: { SalesOrder: '0000012346', SoldToParty: '0000100001' }, statusCode: 201 },
      outputDescription: 'success: true when SAP accepted the create request. data: SAP\'s response body for the newly created entity, unwrapped the same way as GET. statusCode: typically 201. No _errorDetails key is ever provided.',
      usageExample: { scenario: 'Create a SAP sales order right after a customer completes checkout', inputValues: { operation: 'post', endpoint: '/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder', payload: '{"SalesOrderType":"OR","SoldToParty":"0000100001"}' }, expectedOutput: 'Returns the created sales order inside {{$json.data}}.' },
    },
    put: {
      description: 'Fully replaces an existing SAP business object via an HTTP PUT request, sending the complete new representation. Most SAP OData v2 write services require a valid X-CSRF-Token.',
      outputExample: { success: true, data: { SalesOrder: '0000012345', SoldToParty: '0000100002' }, statusCode: 200 },
      outputDescription: 'success: true when SAP accepted the replace request. data: SAP\'s response body if the service returns one - some services return no body for PUT. statusCode: the raw HTTP status code. No _errorDetails key is ever provided.',
      usageExample: { scenario: 'Fully replace a SAP business partner record with corrected data from a legacy system', inputValues: { operation: 'put', endpoint: "/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner('0000100001')", payload: '{"BusinessPartnerFullName":"Acme Corp"}' }, expectedOutput: 'Confirms the replacement via {{$json.statusCode}} and the absence of {{$json._error}}.' },
    },
    patch: {
      description: 'Partially updates an existing SAP business object via an HTTP PATCH request, sending only the changed fields. Most SAP OData v2 write services require a valid X-CSRF-Token.',
      outputExample: { success: true, data: '', statusCode: 204 },
      outputDescription: 'success: true when SAP accepted the update request. data: many SAP OData services return HTTP 204 with no body for PATCH, so this may be an empty string rather than an object. statusCode: typically 204 or 200. No _errorDetails key is ever provided.',
      usageExample: { scenario: 'Clear a SAP sales order\'s delivery block after a payment issue is resolved', inputValues: { operation: 'patch', endpoint: "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder('0000012345')", payload: '{"DeliveryBlockReason":""}' }, expectedOutput: 'Confirms the update; the absence of {{$json._error}} confirms success even if {{$json.data}} is empty.' },
    },
    delete: {
      description: 'Permanently deletes an existing SAP business object via an HTTP DELETE request. SAP returns HTTP 204 with no body on success, so this node reports a synthetic {deleted: true} confirmation instead of data/count.',
      outputExample: { success: true, statusCode: 204, deleted: true },
      outputDescription: 'success: true when SAP accepted the delete request. statusCode: typically 204. deleted: always true on success - there is no data or count key at all for this operation. On failure, _error includes up to 500 characters of SAP\'s raw error text; no _errorDetails key is ever provided.',
      usageExample: { scenario: 'Remove a duplicate test sales order created during an integration test run', inputValues: { operation: 'delete', endpoint: "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder('0000099999')" }, expectedOutput: 'Confirms removal as {{$json.deleted}}.' },
    },
  },

  // ─── AI NODES ─────────────────────────────────────────────────────────────

  ai_agent: {
    default: {
      description: 'Extracts one user message from User Input or upstream message-like fields, applies the System Prompt, infers the provider from Model, calls the LLM adapter with timeout/retry handling, and packages the result.',
      outputExample: { response_text: '{"category":"billing","priority":"medium"}', response_json: { category: 'billing', priority: 'medium' }, confidence_score: 0.8, used_tools: [], memory_written: false, error_flag: false, error_message: null, reasoning: { steps: 1, provider: 'gemini', model: 'gemini-3.5-flash' } },
      outputDescription: 'response_text contains the model answer. response_json is parsed JSON/key-value output or null. response_markdown appears only for markdown mode. confidence_score is fixed at 0.8, used_tools is currently [], and memory_written is false. Provider credential problems may return _error or throw after retries.',
      usageExample: {
        scenario: 'Classify a support message before routing it to the right queue',
        inputValues: { userInput: '{{$json.message}}', model: 'gemini-3.5-flash', systemPrompt: 'Classify the support request and return JSON with category and priority.', outputFormat: 'json', temperature: '0.2' },
        expectedOutput: 'Route with {{$json.response_json.category}} and log {{$json.response_text}}.',
      },
    },
    chat: {
      description: 'Legacy alias for the current AI Agent runtime: it still extracts a user message, calls the selected provider, and returns response_text/response_json rather than tool-call transcripts.',
      outputExample: { response_text: 'The ticket is billing related.', response_json: { category: 'billing' }, confidence_score: 0.8, used_tools: [], memory_written: false, error_flag: false, error_message: null },
      outputDescription: 'response_text contains the model answer. response_json is filled for JSON/key-value output. used_tools is currently always an empty array and memory_written is false.',
      usageExample: {
        scenario: 'Classify a support message before a downstream CRM or notification step',
        inputValues: { userInput: '{{$json.message}}', systemPrompt: 'Classify the message and return JSON.' },
        expectedOutput: 'Map {{$json.response_text}} or {{$json.response_json.category}} downstream.',
      },
    },
  },

  ai_chat_model: {
    default: {
      description: 'Calls the platform Gemini chat path with Prompt/System Prompt and returns response plus model while preserving incoming fields. The executor currently hardcodes Gemini 3.5 Flash regardless of the visible model field.',
      outputExample: { customerId: '1048', response: { summary: 'Customer asked about billing.', urgency: 'medium' }, model: 'gemini-3.5-flash' },
      outputDescription: 'response contains raw text or parsed JSON when Response Format is json and parsing succeeds. model contains the adapter model. Incoming fields are preserved. Prompt or Gemini credential failures return _error.',
      usageExample: {
        scenario: 'Summarize a customer email while keeping the customerId for a later CRM update',
        inputValues: { prompt: 'Summarize this email as JSON: {{$json.emailBody}}', systemPrompt: 'Return only JSON with summary and urgency.', responseFormat: 'json', temperature: '0.2' },
        expectedOutput: 'Use {{$json.response.summary}} for the note and {{$json.customerId}} from the preserved input.',
      },
    },
  },

  openai_gpt: {
    default: {
      description: 'Send Prompt, or joined Messages when Prompt is blank, to OpenAI through the legacy LLM adapter.',
      outputExample: { response: 'The report shows a 23% increase in Q4 revenue driven by enterprise subscriptions.', model: 'gpt-4o', usage: { prompt_tokens: 150, completion_tokens: 45, total_tokens: 195 }, finishReason: 'stop' },
      outputDescription: 'response contains the GPT response text. model contains the adapter model. usage and finishReason contain provider metadata when returned. OpenAI credential resolver failures return success=false with error. Successful output does not spread incoming fields; there is no content output key.',
      usageExample: {
        scenario: 'Summarise a long customer feedback email into 3 bullet points',
        inputValues: { apiKey: '{{$credentials.openai.apiKey}}', prompt: 'Summarise the following feedback in 3 bullet points:\n\n{{$json.emailBody}}', model: 'gpt-4o', temperature: '0.7', memory: '10' },
        expectedOutput: 'Returns the summary in {{$json.response}}. Preserve needed upstream IDs before this node because successful output only contains response/model/usage/finishReason.',
      },
    },
  },

  anthropic_claude: {
    default: {
      description: 'Sends Prompt, or joined Messages when Prompt is blank, to the selected Claude model using an Anthropic API key from config or vault. Temperature and Memory are visible but ignored today.',
      outputExample: { response: 'The contract risk is mainly the 30-day termination clause.', model: 'claude-3-5-sonnet', usage: { inputTokens: 920, outputTokens: 64 }, finishReason: 'end_turn' },
      outputDescription: 'response contains Claude text. model contains the adapter model. usage and finishReason contain provider metadata when returned. Successful output does not spread incoming fields; failures may include success false with error or throw provider errors.',
      usageExample: {
        scenario: 'Analyze a contract paragraph before a human legal approval step',
        inputValues: { model: 'claude-3-5-sonnet', prompt: 'List the top risks in {{$json.contractText}}', apiKey: '{{$credentials.anthropic.apiKey}}' },
        expectedOutput: 'Use {{$json.response}} as the review summary and {{$json.usage}} for audit logging.',
      },
    },
    complete: {
      description: 'Legacy complete alias for the current Claude executor: send Prompt or fallback Messages and return response/model/usage/finishReason.',
      outputExample: { response: 'Based on the data provided, retention dropped among users who did not complete onboarding.', model: 'claude-3-5-sonnet', usage: { inputTokens: 200, outputTokens: 60 }, finishReason: 'end_turn' },
      outputDescription: 'response is Claude text. model, usage, and finishReason are metadata. There is no content output key and successful output does not preserve incoming fields.',
      usageExample: {
        scenario: 'Analyse user data and generate actionable insights for a weekly report',
        inputValues: { prompt: 'Analyse the following user retention data and list the top 3 actionable insights:\n\n{{$json.data}}', model: 'claude-3-5-sonnet' },
        expectedOutput: 'Returns analysis in {{$json.response}}. Feed into a Google Doc or email report.',
      },
    },
  },

  chat_model: {
    default: {
      description: 'Returns a legacy/internal Gemini chat model config object. It reads Temperature, ignores Provider/API Key/Model/Prompt, and does not call an AI provider.',
      outputExample: { orderId: 'A100', provider: 'gemini', model: 'gemini-3.5-flash', temperature: 0.7, _chat_model_config: true },
      outputDescription: 'provider is always gemini. model is always gemini-3.5-flash. temperature is parsed from config or defaults to 0.7. _chat_model_config is true. Incoming fields are preserved. No response text is generated.',
      usageExample: {
        scenario: 'Preserve a legacy agent-support config while moving real prompting to AI Agent',
        inputValues: { provider: 'gemini', model: 'gemini-3.5-flash', prompt: 'You are a helpful assistant.', temperature: '0.7' },
        expectedOutput: 'Use {{$json._chat_model_config}} only when a downstream legacy step expects this config object.',
      },
    },
  },

  cohere: {
    default: {
      description: 'Calls Cohere /v1/chat with model, prompt/message, optional preamble, temperature, and max_tokens. Runtime reads apiKey directly and reports failures with success=false and error.',
      outputExample: { success: true, response: 'The customer is asking for a refund because delivery was late.', model: 'command-r-08-2024', finishReason: 'COMPLETE', inputTokens: 87, outputTokens: 19, error: null },
      outputDescription: 'success is true on a successful Cohere response and false on validation/API failures. response contains generated text. model echoes the configured model. finishReason, inputTokens, and outputTokens come from Cohere when available. error is null on success or a plain error string on failure; this node does not use _error.',
      usageExample: {
        scenario: 'Summarize a support ticket with Cohere before adding a CRM note',
        inputValues: { apiKey: '{{$credentials.cohere.apiKey}}', model: 'command-r-08-2024', prompt: 'Summarize this ticket: {{$json.ticketBody}}', preamble: 'Be concise and factual.', temperature: '0.2', maxTokens: '512' },
        expectedOutput: 'Use {{$json.response}} as the CRM note and branch on {{$json.success}} or {{$json.error}}.',
      },
    },
  },

  google_gemini: {
    default: {
      description: 'Calls Gemini with Prompt/upstream text and returns response, model, usage, and finishReason. Temperature and Memory are visible legacy fields ignored by the current executor.',
      outputExample: { response: 'The customer is asking for a billing refund because the package arrived late.', model: 'gemini-3.5-flash', usage: { inputTokens: 120, outputTokens: 18 }, finishReason: 'STOP' },
      outputDescription: 'response contains Gemini text. model, usage, and finishReason come from the adapter/provider when available. Successful output does not preserve incoming fields; credential failures return success=false with error and wallet failures may include code.',
      usageExample: { scenario: 'Classify incoming support emails into categories', inputValues: { prompt: 'Classify this email into one of: billing, technical, general. Email: {{$json.emailBody}}\nReturn only the category name.', model: 'gemini-3.5-flash' }, expectedOutput: 'Use {{$json.response}} for the category and keep needed upstream IDs before this node because they are not spread into Gemini success output.' },
    },
  },

  huggingface: {
    default: {
      description: 'Calls the Hugging Face inference router with Prompt as inputs. Task and Parameters are visible hints only; runtime sends maxTokens and temperature on the first request.',
      outputExample: { customerId: 'C-1048', success: true, model: 'facebook/bart-large-cnn', response: 'Customer reports a duplicate billing charge and requests a refund.', output: [{ summary_text: 'Customer reports a duplicate billing charge and requests a refund.' }] },
      outputDescription: 'Successful output preserves incoming fields and adds success, model, response, and output. Failures preserve incoming fields and add success=false plus error.',
      usageExample: { scenario: 'Summarize customer review text with an open-source model', inputValues: { apiKey: '{{$credentials.huggingface.apiKey}}', model: 'facebook/bart-large-cnn', prompt: 'Summarize {{$json.reviewText}}.', maxTokens: '256', temperature: '0.2' }, expectedOutput: 'Use {{$json.response}} as the summary and {{$json.output}} for raw provider data.' },
    },
  },

  langchain: {
    run_chain: {
      description: 'Sends Prompt to OpenAI or Anthropic through the LangChain facade. OpenAI uses gpt-4o-mini; Anthropic uses claude-3-5-sonnet-20241022.',
      outputExample: { success: true, operation: 'run_chain', response: 'The ticket is about duplicate billing. Verify invoice INV-1048 and refund if duplicated.', steps: [], error: null },
      outputDescription: 'success, operation, response, steps, and error are returned. Successful output does not preserve incoming fields. Memory is ignored by the current executor.',
      usageExample: { scenario: 'Summarize a support ticket before creating a CRM note', inputValues: { operation: 'run_chain', provider: 'openai', apiKey: '{{$credentials.openai.apiKey}}', prompt: 'Summarize {{$json.ticketBody}}' }, expectedOutput: 'Use {{$json.response}} as the note text and {{$json.error.message}} when success is false.' },
    },
    run_agent: {
      description: 'For OpenAI only, sends Tools as function definitions and returns tool calls in steps. Anthropic run_agent behaves like a normal prompt call in the current executor.',
      outputExample: { success: true, operation: 'run_agent', response: '', steps: [{ id: 'call_123', type: 'function', function: { name: 'lookup_order', arguments: '{"orderId":"ORD-1048"}' } }], error: null },
      outputDescription: 'steps contains OpenAI tool calls only when provider=openai and operation=run_agent. response contains assistant text when present. error is null on success or an object on failure.',
      usageExample: { scenario: 'Ask OpenAI to choose an order lookup tool', inputValues: { operation: 'run_agent', provider: 'openai', apiKey: '{{$credentials.openai.apiKey}}', tools: '[{"name":"lookup_order","description":"Find order details","parameters":{"type":"object","properties":{"orderId":{"type":"string"}}}}]', prompt: 'Use a tool if needed: {{$json.customerQuestion}}' }, expectedOutput: 'Inspect {{$json.steps}} and route tool calls to the matching service node.' },
    },
  },

  memory: {
    default: {
      description: 'Passes sessionId, context, and incoming messages forward. Store/Retrieve/Clear/Search, memoryType, ttl, and maxMessages are visible legacy controls ignored by the current executor.',
      outputExample: { sessionId: 'ticket-1048', context: 'Customer has an open billing dispute for invoice INV-1048.', messages: [{ role: 'user', content: 'Why was I charged twice?' }] },
      outputDescription: 'sessionId is configured or mem_<node id>, context is configured/incoming/null, and messages is incoming messages or an empty array. No persistent memory, searchResults, ttl, deleted, or count fields are produced.',
      usageExample: { scenario: 'Pass customer context into a later AI step', inputValues: { operation: 'store', sessionId: 'ticket-{{$json.ticketId}}', context: '{{$json.customerContext}}' }, expectedOutput: 'Use {{$json.sessionId}} and {{$json.context}} downstream; do not expect storage or retrieval.' },
    },
  },

  mistral: {
    default: {
      description: 'Calls Mistral chat completions with optional systemPrompt and required prompt, preserving incoming fields on success and failure.',
      outputExample: { ticketId: 'TCK-1048', success: true, model: 'mistral-small-latest', response: 'The customer is requesting a refund for a duplicate invoice charge.', inputTokens: 96, outputTokens: 15 },
      outputDescription: 'Successful output spreads incoming fields and adds success, model, response, inputTokens, and outputTokens. Failures spread incoming fields and add success=false plus error.',
      usageExample: { scenario: 'Summarize a ticket with Mistral before routing', inputValues: { apiKey: '{{$credentials.mistral.apiKey}}', model: 'mistral-small-latest', prompt: 'Summarize {{$json.ticketBody}}', temperature: '0.2', maxTokens: '256' }, expectedOutput: 'Use {{$json.response}} for the summary while still retaining upstream fields such as {{$json.ticketId}}.' },
    },
  },

  ollama: {
    default: {
      description: 'Legacy Ollama slug that rewrites to ai_chat_model and calls Gemini 3.5 Flash. It is not a local Ollama server call.',
      outputExample: { customerId: 'C-1048', response: 'To reset your password, go to Settings > Security > Change Password.', model: 'gemini-3.5-flash' },
      outputDescription: 'response contains Gemini text from the delegated AI Chat Model. model contains gemini-3.5-flash. _error appears on blank prompt, Gemini credential failure, or wallet failure; wallet failures may include code. Incoming fields are preserved.',
      usageExample: { scenario: 'Answer a customer question while keeping the customer id', inputValues: { prompt: 'Answer this customer question concisely: {{$json.question}}', temperature: '0.2' }, expectedOutput: 'Use {{$json.response}} for the answer and {{$json.customerId}} from the preserved input later.' },
    },
  },

  text_summarizer: {
    default: {
      description: 'Builds a Gemini summarization prompt from text and optional maxLength, then delegates to ai_chat_model.',
      outputExample: { ticketId: 'TCK-1048', response: 'The customer reports duplicate billing and asks for a refund.', model: 'gemini-3.5-flash' },
      outputDescription: 'response contains the summary text. model contains the delegated Gemini model. _error appears for Gemini credential or prompt failures. Incoming fields are preserved. There is no summary, wordCount, or originalLength output key.',
      usageExample: { scenario: 'Summarise customer feedback before inserting into a CRM note', inputValues: { text: '{{$json.feedback}}', maxLength: '100', temperature: '0.2' }, expectedOutput: 'Use the short summary in {{$json.response}} and keep {{$json.ticketId}} from the preserved input.' },
    },
  },

  sentiment_analyzer: {
    default: {
      description: 'Builds a Gemini sentiment prompt asking for JSON with sentiment, score, and summary, then delegates to ai_chat_model.',
      outputExample: { reviewId: 'REV-1048', response: { sentiment: 'positive', score: 0.87, summary: 'Customer praises ease of use.' }, model: 'gemini-3.5-flash' },
      outputDescription: 'response contains parsed JSON with sentiment, score, and summary when parsing succeeds; invalid JSON falls back to raw response text. model contains the delegated Gemini model. _error appears for Gemini credential or prompt failures. Incoming fields are preserved. There are no top-level sentiment, score, confidence, or label keys.',
      usageExample: { scenario: 'Route negative customer feedback to a priority queue', inputValues: { text: '{{$json.reviewText}}', temperature: '0.2' }, expectedOutput: 'Use {{$json.response.sentiment}} in an If/Else node and keep {{$json.reviewId}} from the preserved input.' },
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
      },
      outputDescription: 'The output is one combined payload with no extra wrapper keys added. overwrite (the default) combines object fields with later branch values winning, append replaces the output entirely with {{$json.items}} (each branch\'s full output object), and deep_merge recursively combines nested objects while replacing arrays and mismatched types instead of merging them.',
      usageExample: {
        scenario: 'Rejoin approval and customer-enrichment branches before sending one summary email',
        inputValues: { mode: 'deep_merge' },
        expectedOutput: 'The next node can use {{$json.customer.email}} and {{$json.approval.status}} from the merged payload.',
      },
    },
  },

  merge_data: {
    default: {
      description: 'Combine data arriving from multiple workflow branches into one output. Runs the exact same code as the Merge node in the Logic category.',
      outputExample: {
        ticketId: 'TCK-2048',
        customer: { email: 'customer@example.com', tier: 'VIP' },
        status: 'reviewed',
      },
      outputDescription: 'The output shape depends on Mode, with no extra wrapper keys added. overwrite (the default) passes through the already-combined object with later branch values winning on collision. append replaces the output entirely with {{$json.items}} (each branch\'s full output object). deep_merge recursively combines nested objects while replacing arrays and mismatched types instead of merging them.',
      usageExample: {
        scenario: 'Rejoin approval and customer-enrichment branches before sending one summary email',
        inputValues: { mode: 'deep_merge' },
        expectedOutput: 'The next node can use {{$json.customer.email}} and {{$json.approval.status}} from the merged payload.',
      },
    },
  },

  rename_keys: {
    default: {
      description: 'Rename one or more fields on the current item using an old-name-to-new-name JSON mapping.',
      outputExample: { name: 'Alice', email: 'alice@example.com', status: 'active' },
      outputDescription: 'The item with every successfully-mapped field renamed (value moved to the new name, old name deleted). Fields not listed in Key Mappings, such as status above, pass through unchanged. A mapping whose current name is not found on the item is silently skipped.',
      usageExample: {
        scenario: 'Normalize inconsistent field names from an import feed before loading data into another system',
        inputValues: { mappings: '{"oldEmail":"email"}' },
        expectedOutput: 'The value at {{$json.oldEmail}} is now available as {{$json.email}}.',
      },
    },
  },

  function: {
    default: {
      description: 'Run custom JavaScript once with input, data, $json, and json bound to the incoming object.',
      outputExample: { orderId: 'ord_1042', processed: true, highValue: true },
      outputDescription: 'The node returns exactly the JavaScript return value. If code assigns result and does not return first, result is returned. If neither return nor result is used, the original input object is returned. Missing code, disabled JavaScript execution, timeout, or thrown script errors return _error.',
      usageExample: {
        scenario: 'Add a high-value review flag before routing an order',
        inputValues: { code: 'const total = Number($json.orderTotal || 0); return { ...$json, highValue: total > 5000 };', timeout: '10000' },
        expectedOutput: 'The next node can branch on {{$json.highValue}} while preserving fields such as {{$json.orderId}}.',
      },
    },
  },

  function_item: {
    default: {
      description: 'Run custom JavaScript once for each element in input.items and replace items with the mapped array.',
      outputExample: { batchId: 'batch_1042', items: [{ id: 'inv_1', total: 1200, overdue: true }] },
      outputDescription: 'Incoming top-level fields pass through and items is replaced with the mapped array. The current item is available as item, input, data, $json, and json. Runtime does not provide an index variable today. Missing code, disabled JavaScript execution, or thrown item-mapping errors return _error.',
      usageExample: {
        scenario: 'Normalize every contact email in an imported list',
        inputValues: { code: 'return { ...item, email: String(item.email || "").trim().toLowerCase() };', timeout: '10000' },
        expectedOutput: 'The next node can read the transformed array at {{$json.items}}.',
      },
    },
  },

  error_handler: {
    default: {
      description: 'Mark an incoming `_error` payload as handled and optionally emit a fallback value.',
      outputExample: { _error: 'Connection timeout', handled: true, value: { status: 'error_handled' } },
      outputDescription: 'Incoming fields pass through. handled is true only when `_error` exists and fallbackValue is configured; otherwise handled is false. value contains the configured fallbackValue only when `_error` exists and fallbackValue is not undefined. Retries and backoff are handled by the execution engine, not this node.',
      usageExample: { scenario: 'Convert an upstream error payload into a handled fallback object', inputValues: { fallbackValue: '{"status": "unavailable"}' }, expectedOutput: 'On error, `{{$json.value}}` contains the configured fallback value.' },
    },
  },

  xero: {
    default: {
      description: 'Call the Xero Accounting API for contacts, invoices, items, payments, or accounts using a resolved access token and tenant ID.',
      outputExample: { success: true, resource: 'invoices', operation: 'get_many', tenantId: 'tenant-guid', record: null, records: [{ InvoiceID: 'inv_1042', Status: 'AUTHORISED' }], count: 1, pagination: { page: 1, pageSize: 1, hasMore: false }, meta: { endpoint: 'https://api.xero.com/api.xro/2.0/Invoices', rateLimitRemaining: -1 }, error: null },
      outputDescription: 'success, resource, operation, tenantId, record, records, count, pagination, meta, and error are returned for completed Xero HTTP responses. Xero non-2xx responses return success: false with error details. Missing required config, unsupported resource or operation, and unexpected request failures return _error.',
      usageExample: {
        scenario: 'Fetch authorised Xero invoices before sending unpaid-invoice reminders',
        inputValues: { accessToken: '{{$json.xeroAccessToken}}', tenantId: '{{$json.xeroTenantId}}', resource: 'invoices', operation: 'get_many', where: 'Status=="AUTHORISED"', order: 'Date DESC', page: '1' },
        expectedOutput: 'The next node can iterate {{$json.records}} and check {{$json.success}} or {{$json.error.message}}.',
      },
    },
  },

  workday: {
    default: {
      description: 'Call Workday REST API paths for workers, jobs, organizations, supervisory organizations, and positions.',
      outputExample: { success: true, resource: 'workers', operation: 'get_many', tenant: 'mytenant', records: [{ id: 'worker_1042', descriptor: 'Asha Rao' }], count: 1, pagination: { limit: 50, offset: 0, total: 1 }, meta: { total: 1 } },
      outputDescription: 'success, resource, operation, tenant, records, count, pagination, and meta are returned for successful calls. Single-record operations return record with the parsed Workday response. Workday API failures return success: false with an error string and records: []. The executor does not pre-validate blank auth fields.',
      usageExample: {
        scenario: 'Fetch a page of Workday workers before provisioning downstream accounts',
        inputValues: { baseUrl: 'https://wd2-impl-services1.workday.com/ccx/api/v1/mytenant', tenant: 'mytenant', authType: 'oauth2', accessToken: '{{$json.workdayAccessToken}}', resource: 'workers', operation: 'get_many', limit: '50', offset: '0' },
        expectedOutput: 'The next node can iterate {{$json.records}} and branch on {{$json.success}} if Workday returns an error.',
      },
    },
  },

  delay: {
    default: {
      description: 'Pause workflow execution for a fixed number of milliseconds, then return a structured Delay result. Unlike Wait, Delay does not pass the input through unchanged at the top level.',
      outputExample: { success: true, waitedMs: 5000, originalInput: { ticketId: 'SUP-1042', status: 'export_started' } },
      outputDescription: 'success: true when the pause completed. waitedMs: actual pause duration in milliseconds after parsing and the ten-minute cap. originalInput: the incoming payload nested for downstream access.',
      usageExample: { scenario: 'Wait 5 seconds after starting an export before polling for the generated file', inputValues: { duration: '5000' }, expectedOutput: 'Downstream nodes can read {{$json.waitedMs}} and {{$json.originalInput.ticketId}}.' },
    },
  },

  wait: {
    default: {
      description: 'Pause for a fixed duration, then pass the incoming object forward unchanged.',
      outputExample: { orderId: 'ORD-1042', customerEmail: 'buyer@example.com', status: 'created' },
      outputDescription: 'The Wait node returns the original input object unchanged after the delay. It does not return resumed, reason, or waitedMs. Visible Duration is milliseconds and the wait is capped at 5 minutes.',
      usageExample: { scenario: 'Wait 5 seconds after creating a ticket before sending the same ticket data to the next step', inputValues: { duration: '5000', unit: 'milliseconds' }, expectedOutput: 'After the pause, downstream nodes can still read {{$json.orderId}} and {{$json.customerEmail}} from the original input.' },
    },
  },

  parallel: {
    default: {
      description: 'Record the parallel orchestration mode and pass object input forward. Branch fan-out, fan-in, and real result collection are handled by workflow wiring and merge nodes.',
      outputExample: { orderId: 'ord_1042', customerEmail: 'buyer@example.com', mode: 'all', results: [] },
      outputDescription: 'Object input fields are preserved, mode is all or race, and results is an empty placeholder. Registry metadata can include parallelMode; the node itself does not collect real branch outputs.',
      usageExample: { scenario: 'Mark where notification and fulfillment branches should run independently before a later merge', inputValues: { mode: 'all' }, expectedOutput: 'The next connected step can read {{$json.orderId}}, {{$json.mode}}, and {{$json.results}} while branch wiring controls the actual paths.' },
    },
  },

  timeout: {
    default: {
      description: 'Compare elapsed workflow time with Limit and route to success or timeout.',
      outputExample: { elapsedMs: 42150, limitMs: 30000, timedOut: true, originalInput: { ticketId: 'SUP-2001' }, __routing: { branch: 'timeout' } },
      outputDescription: 'elapsedMs is time since workflow start, limitMs is the configured threshold, timedOut controls routing, originalInput preserves incoming data, and __routing.branch is success or timeout.',
      usageExample: { scenario: 'Route urgent tickets to fallback handling when enrichment already exceeded 30 seconds', inputValues: { limit: '30000' }, expectedOutput: 'The fallback path can read {{$json.timedOut}}, {{$json.elapsedMs}}, {{$json.limitMs}}, and {{$json.__routing.branch}}.' },
    },
  },

  return: {
    default: {
      description: 'Stop the current workflow path and return a payload under returnedValue.',
      outputExample: { success: true, __return: true, returnedValue: { success: true, orderId: 'ord_123' } },
      outputDescription: 'success is true, __return marks workflow termination, and returnedValue contains the configured Value, the full input when includeInput is true, or null.',
      usageExample: { scenario: 'Return a success response from a sub-workflow to the parent workflow', inputValues: { value: '{"success": true, "recordId": "{{$json.id}}"}', includeInput: 'false' }, expectedOutput: 'The parent workflow receives {{$json.returnedValue}} from the Return node.' },
    },
  },

  execute_workflow: {
    default: {
      description: 'Call a confirmed or active child workflow inline, skip its trigger node, and return the child final result to the parent workflow.',
      outputExample: { success: true, result: { notificationSent: true, ticketId: 'SUP-1042' }, workflowId: '123e4567-e89b-12d3-a456-426614174000' },
      outputDescription: 'success: true when the child workflow completes, false when lookup/config validation fails. result: The final output from the called workflow, or a Return node returnedValue when the child emits __return. workflowId: The called child workflow ID. error: Failure text such as Workflow ID is required, Sub-workflow not found, not confirmed/active, missing trigger node, or Failed to execute sub-workflow.',
      usageExample: { scenario: 'Call a reusable escalation notification child workflow from multiple parent workflows', inputValues: { workflowId: '{{$json.escalationWorkflowId}}', input: '{"ticketId":"{{$json.ticketId}}","customerEmail":"{{$json.customerEmail}}"}', inputData: '' }, expectedOutput: 'The parent workflow reads {{$json.success}}, {{$json.result.notificationSent}}, {{$json.result.ticketId}}, {{$json.workflowId}}, or {{$json.error}}.' },
    },
  },

  try_catch: {
    default: {
      description: 'Mark try/catch routing and preserve input; connected try-branch service nodes perform the protected work.',
      outputExample: { ticketId: 'SUP-3001', customerEmail: 'buyer@example.com', __routing: { branch: 'try' } },
      outputDescription: 'On normal execution, input fields are preserved and __routing.branch is try. Metadata includes branch try, tryCatchNodeId, and errorHandling. Catch routing can provide error, errorType, and TRY_CATCH_ERROR details.',
      usageExample: { scenario: 'Try a CRM ticket update and route failures to a Slack fallback branch', inputValues: {}, expectedOutput: 'The try branch can read {{$json.ticketId}} and {{$json.__routing.branch}}; the catch branch can use {{$json.error}} when routed by the engine.' },
    },
  },

  retry: {
    default: {
      description: 'Attach retry settings to workflow data and metadata. Actual branch replay is handled by orchestration, not this node body.',
      outputExample: { ticketId: 'SUP-1008', attempts: 0, maxAttempts: 3, delayBetween: 1000, backoff: 'exponential' },
      outputDescription: 'Object input fields are preserved, attempts is 0 in this legacy block, and maxAttempts, delayBetween, and backoff are echoed. Metadata includes branch success and retryConfig.',
      usageExample: { scenario: 'Attach retry policy before a partner enrichment API call', inputValues: { maxAttempts: '3', delayBetween: '1000', backoff: 'exponential' }, expectedOutput: 'The next step can read {{$json.attempts}}, {{$json.maxAttempts}}, {{$json.delayBetween}}, and {{$json.backoff}}.' },
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
      description: 'Create exactly one named output value for later workflow steps. The Values and Keep Source fields shown in the panel have no effect.',
      outputExample: { userEmail: 'alice@example.com' },
      outputDescription: 'The output is always a single field — the one named in Variable Name. Every other field the item had before this node, including anything from Values or Keep Source, is discarded, since neither field is read by this node\'s code.',
      usageExample: { scenario: 'Store the current user\'s email early in the workflow to use in later nodes', inputValues: { name: 'userEmail', value: '{{$json.email}}' }, expectedOutput: 'Reference this value later as `{{$json.userEmail}}`. Other fields the item had before this node are gone.' },
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
      description: 'Parses a JSON string into a structured object and optionally copies top-level fields to the output for easy access. Essential for processing API responses, webhook payloads, and JSON data files.',
      outputExample: { parsed: { userId: 123, email: 'alice@example.com', plan: 'premium' }, userId: 123, email: 'alice@example.com' },
      outputDescription: 'parsed: The full parsed JSON object as a JavaScript object. When extractFields is specified, the requested fields are also copied directly onto the output object at the top level. All incoming fields from previous steps are preserved.',
      usageExample: { scenario: 'Parse a JSON payload received from a webhook', inputValues: { json: '{{$json.rawBody}}', extractFields: '["email","plan"]' }, expectedOutput: 'The parsed object is available as {{$json.parsed}}. The email and plan fields are also copied directly to {{$json.email}} and {{$json.plan}} for easy reference in downstream nodes.' },
    },
  },

  date_time: {
    now: {
      description: 'Returns the current date/time, optionally formatted in a specific timezone. Useful for timestamps, record creation times, and scheduling.',
      outputExample: { datetime: '2026-07-12T09:00:00.000Z', timestamp: 1783855800000 },
      outputDescription: 'datetime: Current date/time as ISO string (or timezone-formatted if timezone is specified). timestamp: Unix time in milliseconds since epoch (January 1, 1970 UTC).',
      usageExample: { scenario: 'Stamp a record with the workflow execution timestamp', inputValues: { timezone: 'UTC' }, expectedOutput: 'Returns the current UTC time. Use {{$json.datetime}} for the ISO string or {{$json.timestamp}} for the numeric millisecond timestamp.' },
    },
    format: {
      description: 'Formats a date/time as ISO string, Unix timestamp, locale-specific text, or a custom pattern. Essential for displaying dates in user-friendly formats.',
      outputExample: { datetime: '2026-07-12T09:00:00.000Z' },
      outputDescription: 'datetime: The formatted date/time string according to the selected format. For TIMESTAMP format, this is a string representation of the numeric timestamp.',
      usageExample: { scenario: 'Format a database timestamp for display in an email notification', inputValues: { date: '{{$json.createdAt}}', format: 'LOCALE', locale: 'en-US', timezone: 'America/New_York' }, expectedOutput: 'Returns a human-readable date like "July 12, 2026, 9:00 AM EDT". Use {{$json.datetime}} in the email body.' },
    },
    add: {
      description: 'Adds a duration to a date. Useful for calculating due dates, renewal dates, expiration times, and future scheduling.',
      outputExample: { datetime: '2026-07-19T09:00:00.000Z' },
      outputDescription: 'datetime: The resulting date/time after adding the duration, as an ISO string.',
      usageExample: { scenario: 'Calculate a subscription renewal date 30 days from signup', inputValues: { date: '{{$json.signupDate}}', value: '30', unit: 'days' }, expectedOutput: 'Returns the date 30 days after signup. Use {{$json.datetime}} to store the renewal date in a database or send it in a reminder email.' },
    },
    subtract: {
      description: 'Subtracts a duration from a date. Useful for calculating lookback windows, start dates from end dates, and past scheduling.',
      outputExample: { datetime: '2026-07-05T09:00:00.000Z' },
      outputDescription: 'datetime: The resulting date/time after subtracting the duration, as an ISO string.',
      usageExample: { scenario: 'Find the start date of a 7-day lookback window from today', inputValues: { date: '{{$now}}', value: '7', unit: 'days' }, expectedOutput: 'Returns the date 7 days ago. Use {{$json.datetime}} as the start date in a database query to filter records from the past week.' },
    },
    diff: {
      description: 'Calculates the difference between two dates in the specified unit. Useful for measuring duration, elapsed time, and age calculations.',
      outputExample: { diff: 1440, diffMs: 86400000, unit: 'minutes' },
      outputDescription: 'diff: The difference in the specified unit (rounded to 3 decimal places). diffMs: The exact difference in milliseconds. unit: The unit used for the diff value.',
      usageExample: { scenario: 'Measure task fulfillment time in minutes', inputValues: { date: '{{$json.createdAt}}', endDate: '{{$json.completedAt}}', unit: 'minutes' }, expectedOutput: 'Returns the number of minutes between creation and completion. Use {{$json.diff}} for the rounded value or {{$json.diffMs}} for exact milliseconds.' },
    },
    convertTimezone: {
      description: 'Renders a date/time in a target timezone. Essential for displaying times in user-local timezones or coordinating across regions.',
      outputExample: { datetime: '2026-07-12T14:30:00', timezone: 'Asia/Kolkata' },
      outputDescription: 'datetime: The date/time rendered in the target timezone (ISO-like format without timezone suffix). timezone: The target timezone used for conversion.',
      usageExample: { scenario: 'Convert a UTC event time to India Standard Time for a customer', inputValues: { date: '{{$json.eventTimeUTC}}', timezone: 'Asia/Kolkata' }, expectedOutput: 'Returns the event time in IST. Use {{$json.datetime}} to display the local time in notifications or calendar invitations.' },
    },
    getTimezoneInfo: {
      description: 'Returns timezone metadata including offset, display name, and the base date. Useful for displaying timezone information to users.',
      outputExample: { timezone: 'Asia/Kolkata', offset: '+05:30', longName: 'India Standard Time', isoDate: '2026-07-12T09:00:00.000Z' },
      outputDescription: 'timezone: The IANA timezone identifier. offset: The GMT offset (e.g., +05:30, -08:00). longName: The human-readable timezone name (e.g., "India Standard Time"). isoDate: The input date as an ISO string.',
      usageExample: { scenario: 'Add timezone details to a meeting confirmation email', inputValues: { date: '{{$json.meetingTime}}', timezone: 'Asia/Kolkata' }, expectedOutput: 'Returns timezone metadata. Use {{$json.offset}} and {{$json.longName}} to display "India Standard Time (GMT+5:30)" in the email.' },
    },
  },

  text_formatter: {
    default: {
      description: 'Render text from a template and current workflow data. The resolved text is returned directly, not wrapped in a formatted field.',
      outputExample: { '(entire output)': 'Order #12345 - Total: 49.99' },
      outputDescription: 'When a template is provided, the node returns the resolved text directly as its entire output — read it as {{$json}}, not {{$json.formatted}}. If the template is empty, it instead returns a real object with data and formatted fields, both holding the whole incoming item converted to one JSON string.',
      usageExample: { scenario: 'Create a notification message from order data', inputValues: { template: 'Order #{{$json.orderId}} - Total: {{$json.total}}' }, expectedOutput: 'The resolved text is the entire node output — reference it as {{$json}} in the next node.' },
    },
  },

  math: {
    default: {
      description: 'Performs mathematical operations including arithmetic, rounding, and list calculations. Supports binary operations (two values), unary operations (single value), and list operations (arrays). Essential for calculations, data transformations, and numeric processing.',
      outputExample: { result: 15, operation: 'sum' },
      outputDescription: 'result: The calculated numeric result with the specified precision applied. operation: The operation that was performed. All incoming fields from previous steps are preserved unchanged.',
      usageExample: { scenario: 'Calculate the total of multiple invoice amounts', inputValues: { operation: 'sum', value1: '{{$json.amounts}}', precision: '2' }, expectedOutput: 'Returns the sum of all amounts in {{$json.result}} with 2 decimal places. Use {{$json.result}} for display, storage, or further calculations.' },
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
    sum: {
      description: 'Adds all numeric values from the items array. Returns the total sum. If Field is specified, aggregates that field; otherwise aggregates items directly.',
      outputExample: { aggregate: 4500, operation: 'sum', field: 'amount' },
      outputDescription: 'aggregate: The computed sum of all values. operation: echoes back "sum". field: the field path used (if specified). If no numeric values are found, aggregate returns 0 and a _warning is included.',
      usageExample: { scenario: 'Calculate total sales revenue from an array of order items', inputValues: { operation: 'sum', field: 'amount' }, expectedOutput: 'Returns the total of all amount fields. Use {{$json.aggregate}} in a later step to store the total in a database or send it in a notification email.' },
    },
    avg: {
      description: 'Calculates the arithmetic mean of numeric values from the items array. Returns the average. If Field is specified, averages that field; otherwise averages items directly.',
      outputExample: { aggregate: 75.5, operation: 'avg', field: 'score' },
      outputDescription: 'aggregate: The computed average (mean) of all values. operation: echoes back "avg". field: the field path used (if specified). If no numeric values are found, aggregate returns 0 and a _warning is included.',
      usageExample: { scenario: 'Calculate the average customer satisfaction score from survey responses', inputValues: { operation: 'avg', field: 'score' }, expectedOutput: 'Returns the mean of all score values. Use {{$json.aggregate}} to display the average in a dashboard or trigger an alert if it falls below a threshold.' },
    },
    count: {
      description: 'Counts the number of items in the array. Returns the total count regardless of field values. If Field is specified, only counts items where that field exists and is not null/undefined.',
      outputExample: { aggregate: 25, operation: 'count', field: 'status' },
      outputDescription: 'aggregate: The count of items (or items with the specified field). operation: echoes back "count". field: the field path used (if specified). If no items exist, aggregate returns 0.',
      usageExample: { scenario: 'Count the number of orders in a batch processing workflow', inputValues: { operation: 'count' }, expectedOutput: 'Returns the total number of items. Use {{$json.aggregate}} to log the batch size or conditionally branch based on whether there are any items to process.' },
    },
    min: {
      description: 'Finds the minimum numeric value from the items array. Returns the smallest value. If Field is specified, finds minimum of that field; otherwise finds minimum of items directly.',
      outputExample: { aggregate: 10, operation: 'min', field: 'price' },
      outputDescription: 'aggregate: The minimum value found. operation: echoes back "min". field: the field path used (if specified). If no numeric values are found, aggregate returns 0 and a _warning is included.',
      usageExample: { scenario: 'Find the lowest price from a list of products', inputValues: { operation: 'min', field: 'price' }, expectedOutput: 'Returns the smallest price value. Use {{$json.aggregate}} to display the lowest price or filter for products matching this price.' },
    },
    max: {
      description: 'Finds the maximum numeric value from the items array. Returns the largest value. If Field is specified, finds maximum of that field; otherwise finds maximum of items directly.',
      outputExample: { aggregate: 500, operation: 'max', field: 'price' },
      outputDescription: 'aggregate: The maximum value found. operation: echoes back "max". field: the field path used (if specified). If no numeric values are found, aggregate returns 0 and a _warning is included.',
      usageExample: { scenario: 'Find the highest score from a list of test results', inputValues: { operation: 'max', field: 'score' }, expectedOutput: 'Returns the largest score value. Use {{$json.aggregate}} to identify the top performer or set a benchmark for comparison.' },
    },
    join: {
      description: 'Joins item values into a single text string using a delimiter. Converts values to strings and combines them. If Field is specified, joins that field; otherwise joins items directly.',
      outputExample: { aggregate: 'Alice\nBob\nCharlie', text: 'Alice\nBob\nCharlie', operation: 'join', delimiter: '\n', field: 'name' },
      outputDescription: 'aggregate: The joined text string. text: an alias for aggregate (same value). operation: echoes back "join". delimiter: the delimiter used. field: the field path used (if specified). If no items exist, aggregate returns an empty string.',
      usageExample: { scenario: 'Create a comma-separated list of email addresses from user records', inputValues: { operation: 'join', field: 'email', delimiter: ', ' }, expectedOutput: 'Returns a string like "alice@example.com, bob@example.com, charlie@example.com". Use {{$json.aggregate}} in an Email node as the BCC field or in a Google Sheets cell.' },
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
      description: 'Restricts an array to the first N items. Perfect for pagination, processing subsets of data, or preventing rate limits by limiting batch sizes.',
      outputExample: { items: [{ id: 1 }, { id: 2 }, { id: 3 }] },
      outputDescription: 'items: The limited array (first N items) — there is no separate array output key; the result always replaces items only. All other fields from the input are preserved unchanged. If the input array is empty, has fewer items than the limit, or Limit is invalid, this node never errors — it silently returns the input unchanged instead.',
      usageExample: { scenario: 'Take the top 5 search results from a large dataset', inputValues: { array: '{{$json.results}}', limit: '5' }, expectedOutput: 'Returns the first 5 items from the results array. Use {{$json.items}} to access the limited dataset for further processing.' },
    },
  },

  csv: {
    parse: {
      description: 'Parses CSV text into an array of row objects. Handles quoted values, escaped quotes, and custom delimiters. Returns items, rows, and headers for downstream processing.',
      outputExample: { items: [{ Name: 'Alice', Email: 'alice@example.com', Plan: 'Pro' }, { Name: 'Bob', Email: 'bob@example.com', Plan: 'Free' }], rows: [{ Name: 'Alice', Email: 'alice@example.com', Plan: 'Pro' }, { Name: 'Bob', Email: 'bob@example.com', Plan: 'Free' }], headers: ['Name', 'Email', 'Plan'] },
      outputDescription: 'items: Array of parsed row objects where keys are header names (or column indices if no header). rows: Alias for items (same array). headers: Array of header names from the first row (if hasHeader is true). If CSV is empty, all arrays are empty.',
      usageExample: { scenario: 'Parse a CSV file downloaded from Google Drive to process user records', inputValues: { csv: '{{$json.content}}', delimiter: ',', hasHeader: 'true' }, expectedOutput: 'Each CSV row becomes an object in {{$json.items}}. Use {{$json.items}} in a Loop node to process each record, or use {{$json.headers}} to check which columns are available.' },
    },
    generate: {
      description: 'Generates CSV text from an array of objects. Automatically quotes values containing delimiters, quotes, or newlines. Returns the CSV string for file upload or email attachment.',
      outputExample: { csv: 'Name,Email,Status\nAlice,alice@example.com,Active\nBob,bob@example.com,Inactive' },
      outputDescription: 'csv: The generated CSV string including header row and data rows. Values containing the delimiter, quotes, or newlines are automatically quoted. Quotes within values are escaped by doubling (""). If data is empty, returns only the header row (if keys exist) or an empty string.',
      usageExample: { scenario: 'Export database query results as CSV before uploading to Google Drive', inputValues: { data: '{{$json.queryResults}}', delimiter: ',' }, expectedOutput: 'CSV text is available in {{$json.csv}}. Use {{$json.csv}} in a Google Drive Upload node to save as a .csv file, or in an Email node as an attachment.' },
    },
  },

  html: {
    parse: {
      description: 'Parses an HTML document and extracts the page title, meta tags, and body HTML. Useful for analyzing page metadata and structure.',
      outputExample: { title: 'Example Domain', meta: { description: 'Example page', keywords: 'example, domain' }, body: '<h1>Example Domain</h1><p>This domain is for use in illustrative examples.</p>', success: true },
      outputDescription: 'title: The text content of the <title> tag. meta: An object with meta tag values keyed by their name or property attributes (e.g., description, keywords, og:title). body: The inner HTML of the <body> tag. success: true if parsing succeeded.',
      usageExample: { scenario: 'Read page title and metadata from a fetched web page', inputValues: { html: '{{$json.pageContent}}' }, expectedOutput: 'Returns the page title in {{$json.title}}, all meta tags in {{$json.meta}}, and body content in {{$json.body}}. Use {{$json.meta.description}} for SEO analysis or {{$json.title}} for logging.' },
    },
    extract: {
      description: 'Extracts text content from HTML elements matching a CSS selector. Ideal for web scraping and targeted data extraction.',
      outputExample: { results: ['$42.00', '$35.99', '$50.00'], count: 3, success: true },
      outputDescription: 'results: An array of text strings from each matched element (trimmed of whitespace). count: The number of elements that matched the selector. success: true if extraction succeeded.',
      usageExample: { scenario: 'Scrape product prices from an e-commerce page', inputValues: { html: '{{$json.pageContent}}', selector: '.price' }, expectedOutput: 'Returns an array of all prices in {{$json.results}}. Use {{$json.count}} to verify how many prices were found, or use {{$json.results[0]}} for the first price.' },
    },
    toText: {
      description: 'Converts HTML body content to plain text by removing all HTML tags. Useful for preparing content for AI processing or text analysis.',
      outputExample: { text: 'Example Domain This domain is for use in illustrative examples in documents.', success: true },
      outputDescription: 'text: The plain text content extracted from the <body> tag, with all HTML tags removed. success: true if conversion succeeded.',
      usageExample: { scenario: 'Convert a downloaded web page to plain text for AI analysis', inputValues: { html: '{{$json.pageContent}}' }, expectedOutput: 'Returns the readable text content in {{$json.text}}. Use {{$json.text}} as input for an AI Chat Model node or for text processing operations.' },
    },
  },

  xml: {
    default: {
      description: 'Parse, extract from, or validate XML content.',
      outputExample: { data: { root: { order: { id: '123', customer: 'Alice' } } }, success: true },
      outputDescription: 'Parse returns data/success. Extract returns result/xpath/data/success — a non-matching XPath silently returns result: null and success: false with no error raised. Validate returns valid/errors; invalid XML during Validate is a normal successful result, not an error.',
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
      description: 'Send workflow data to an external endpoint by rewriting to HTTP Request with method POST.',
      outputExample: { status: 201, statusText: 'Created', headers: { location: '/api/items/new_item_123' }, body: { id: 'new_item_123', created: true }, data: { id: 'new_item_123', created: true }, url: 'https://api.example.com/submissions', method: 'POST', responseTime: 92 },
      outputDescription: 'status: HTTP response code. statusText: HTTP status message. headers: Response headers. body: Parsed response body or raw text. data: Alias for body. url: Final request URL. method: POST. responseTime: Request duration. _error: Present on request failure.',
      usageExample: { scenario: 'Submit form data to an external API', inputValues: { url: 'https://api.example.com/submissions', body: '{"name": "{{$json.name}}", "email": "{{$json.email}}"}', headers: '{"Content-Type": "application/json", "Authorization": "Bearer {{$json.accessToken}}"}' }, expectedOutput: 'Created resource data is in {{$json.body}} and {{$json.data}}. Use {{$json.body.id}} to reference it.' },
    },
  },

  graphql: {
    default: {
      description: 'Send a GraphQL query or mutation as an HTTP POST request through the HTTP Request runtime.',
      outputExample: { status: 200, statusText: 'OK', headers: { 'content-type': 'application/json' }, body: { data: { customer: { id: 'cus_1042', email: 'asha.rao@example.com' } } }, data: { data: { customer: { id: 'cus_1042', email: 'asha.rao@example.com' } } }, url: 'https://api.example.com/graphql', method: 'POST', responseTime: 184 },
      outputDescription: 'status: HTTP response code. statusText: HTTP status message. headers: Response headers. body: Parsed GraphQL response; data is alias for body. url: Final endpoint. method: POST. responseTime: Duration. _error: Present on HTTP/network failure. GraphQL errors are inside body.errors, not a top-level errors field.',
      usageExample: { scenario: 'Fetch a customer by ID from a GraphQL API', inputValues: { url: 'https://api.example.com/graphql', query: 'query GetCustomer($id: ID!) { customer(id: $id) { id email } }', operationName: 'GetCustomer', variables: '{"id":"{{$json.customerId}}"}', headers: '{"Authorization":"Bearer {{$json.accessToken}}"}', timeout: '30000' }, expectedOutput: 'Use {{$json.body.data.customer.email}} for the next step or {{$json.body.errors}} when the GraphQL server reports schema errors.' },
    },
  },

  respond_to_webhook: {
    default: {
      description: 'Normalize the statusCode, headers, and body intended for the caller of a webhook workflow.',
      outputExample: { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: { received: true, orderId: 'ord_1042' } },
      outputDescription: 'statusCode: The HTTP status code returned by the node. headers: Response headers object. body: Response payload chosen from body, responseBody, incoming body, or input. No sent flag is returned.',
      usageExample: { scenario: 'Acknowledge a webhook after storing the event', inputValues: { statusCode: '200', responseBody: '{"received": true, "orderId": "{{$json.orderId}}"}', body: '{"received": true, "orderId": "{{$json.orderId}}"}', headers: '{"Content-Type": "application/json"}' }, expectedOutput: 'Use {{$json.statusCode}}, {{$json.headers}}, and {{$json.body.orderId}} in later steps if the workflow continues.' },
    },
  },

  schedulewise: {
    getSchedules: {
      description: 'Retrieve ScheduleWise appointments with optional date, patient, staff, and limit filters through the saved schedulewise credential.',
      outputExample: { success: true, operation: 'getSchedules', data: { schedules: [{ id: 'mock_sched_001', patientId: 'patient_123', staffId: 'staff_456' }], totalCount: 1, nextPageToken: null }, executionTimeMs: 41 },
      outputDescription: 'success: Whether the operation succeeded. operation: Runtime operation value. data: Provider or mock response. executionTimeMs: Duration. error: Present on INVALID_OPERATION, NO_CREDENTIALS, PARSE_ERROR, TIMEOUT, NETWORK_ERROR, or HTTP_ERROR.',
      usageExample: { scenario: 'List today appointments for staff scheduling', inputValues: { operation: 'getSchedules', dateFrom: '{{$json.dateFrom}}', dateTo: '{{$json.dateTo}}', staffId: '{{$json.staffId}}', limit: '50', mockMode: 'false' }, expectedOutput: 'Use {{$json.data.schedules}} in mock mode or provider {{$json.data}} in live mode.' },
    },
    createAppointment: {
      description: 'Create a ScheduleWise appointment by POSTing patientId, staffId, startDateTime, endDateTime, serviceType, and notes.',
      outputExample: { success: true, operation: 'createAppointment', data: { appointment: { id: 'mock_appt_1042', patientId: 'patient_123', staffId: 'staff_456' } }, executionTimeMs: 58 },
      outputDescription: 'success: Whether the operation succeeded. operation: createAppointment. data: Created provider appointment. executionTimeMs: Duration. error: Present on credential, HTTP, timeout, network, parse, or validation failures.',
      usageExample: { scenario: 'Book a patient appointment from an intake form', inputValues: { operation: 'createAppointment', patientId: '{{$json.patientId}}', staffId: '{{$json.staffId}}', startDateTime: '{{$json.startDateTime}}', endDateTime: '{{$json.endDateTime}}', serviceType: 'consultation' }, expectedOutput: 'Use {{$json.data.appointment.id}} for confirmation messages.' },
    },
    updateAppointment: {
      description: 'Update an existing appointment by PUTting changed fields to /appointments/{appointmentId}.',
      outputExample: { success: true, operation: 'updateAppointment', data: { appointment: { id: 'appt_789', status: 'confirmed' } }, executionTimeMs: 63 },
      outputDescription: 'success: Whether the operation succeeded. operation: updateAppointment. data: Updated provider appointment. executionTimeMs: Duration. error: Present on failure.',
      usageExample: { scenario: 'Confirm an appointment after patient reply', inputValues: { operation: 'updateAppointment', appointmentId: '{{$json.appointmentId}}', status: 'confirmed', notes: 'Patient confirmed by SMS' }, expectedOutput: 'Use {{$json.data.appointment.status}} to verify the update.' },
    },
    deleteAppointment: {
      description: 'Delete an appointment by DELETE /appointments/{appointmentId}; hardDelete appends ?hardDelete=true.',
      outputExample: { success: true, operation: 'deleteAppointment', data: { deletedId: 'appt_789', permanent: false }, executionTimeMs: 36 },
      outputDescription: 'success: Whether the operation succeeded. operation: deleteAppointment. data: Delete result. executionTimeMs: Duration. error: Present on failure.',
      usageExample: { scenario: 'Remove a duplicate appointment after approval', inputValues: { operation: 'deleteAppointment', appointmentId: '{{$json.appointmentId}}', hardDelete: 'false' }, expectedOutput: 'Use {{$json.data.deletedId}} and {{$json.data.permanent}} for audit logging.' },
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
    get: {
      description: 'Get one Shopify resource when an ID is present, or list resources when no ID is supplied. Runtime expects resource plus generic operation, not get_product/get_order aliases.',
      outputExample: { success: true, item: { product: { id: 123, title: 'Blue T-Shirt' } } },
      outputDescription: 'success: true when Shopify returns data. item: raw response for one record. items: extracted array for list/no-ID runs. _error/_errorDetails: returned on API failure.',
      usageExample: { scenario: 'Fetch product details when a fulfillment workflow receives a product ID', inputValues: { resource: 'product', operation: 'get', productId: '{{$json.productId}}' }, expectedOutput: 'Use {{$json.item.product.title}} or {{$json.items}} in the next step.' },
    },
    create: {
      description: 'Create a Shopify resource using Data JSON. The runtime wraps the payload under product/order/customer automatically.',
      outputExample: { success: true, item: { product: { id: 124, title: 'New product' } } },
      outputDescription: 'success: true when Shopify creates the record. item: raw create response. _error/_errorDetails: returned when data, token, scope, or resource path is invalid.',
      usageExample: { scenario: 'Create a Shopify product from an approved merchandising form', inputValues: { resource: 'product', operation: 'create', data: '{"title":"New product"}' }, expectedOutput: 'Use {{$json.item.product.id}} in downstream inventory or notification steps.' },
    },
  },

  stripe: {
    paymentintent: {
      description: 'Create a Stripe PaymentIntent or legacy charge. The visible create_payment/create_payment_intent aliases are not translated by the runtime today.',
      outputExample: { success: true, paymentIntent: { id: 'pi_abc123', amount: 5000, currency: 'usd', status: 'requires_payment_method' } },
      outputDescription: 'success: true when Stripe accepts the request. paymentIntent: raw PaymentIntent for modern flows. charge: raw charge for legacy source-token flows. _error/_errorDetails: returned on failure.',
      usageExample: { scenario: 'Create a PaymentIntent from checkout form data', inputValues: { operation: 'paymentintent', amount: '{{$json.amountCents}}', currency: 'usd' }, expectedOutput: 'Use {{$json.paymentIntent.id}} and {{$json.paymentIntent.status}} downstream.' },
    },
    create_customer: {
      description: 'Create a Stripe customer with email, name, and optional description.',
      outputExample: { success: true, customer: { id: 'cus_abc123', email: 'customer@example.com', name: 'Alice Smith' } },
      outputDescription: 'success: true when Stripe creates the customer. customer: raw Stripe customer object. _error/_errorDetails: returned on failure.',
      usageExample: { scenario: 'Create a Stripe customer from a signup form', inputValues: { operation: 'create_customer', email: '{{$json.email}}', name: '{{$json.name}}' }, expectedOutput: 'Use {{$json.customer.id}} when creating subscriptions or invoices.' },
    },
  },

  paypal: {
    charge: {
      description: 'Create a PayPal Checkout order and return the raw order object with approval links. Capture is not implemented by this node today.',
      outputExample: { success: true, order: { id: '5O190127TN364715T', status: 'CREATED', links: [{ rel: 'approve', href: 'https://www.paypal.com/checkoutnow?token=5O190127TN364715T' }] } },
      outputDescription: 'success: true when PayPal creates the order. order: raw PayPal order response. _error/_errorDetails: returned on failed API calls.',
      usageExample: { scenario: 'Create a PayPal approval order from checkout form data', inputValues: { operation: 'charge', amount: '{{$json.total}}', currency: 'USD' }, expectedOutput: 'Use {{$json.order.id}} and {{$json.order.links}} downstream.' },
    },
    refund: {
      description: 'Refund a PayPal capture by paymentId/captureId, with optional partial amount.',
      outputExample: { success: true, refund: { id: '1JU08902781691411', status: 'COMPLETED' } },
      outputDescription: 'success: true when PayPal accepts the refund. refund: raw PayPal refund response. _error/_errorDetails: returned on failure.',
      usageExample: { scenario: 'Refund an approved support case from a saved capture ID', inputValues: { operation: 'refund', paymentId: '{{$json.captureId}}', amount: '{{$json.refundAmount}}' }, expectedOutput: 'Use {{$json.refund.id}} and {{$json.refund.status}} for audit logging.' },
    },
  },

  woocommerce: {
    get: {
      description: 'Get one WooCommerce resource by generic id, or list records when id is blank. Visible productId/orderId/customerId fields are not read directly today.',
      outputExample: { success: true, item: { id: 123, name: 'Blue T-Shirt', price: '29.99' } },
      outputDescription: 'success: true when WooCommerce returns data. item: raw response for one record. items: array for list/no-ID runs. _error/_errorDetails: returned on failure.',
      usageExample: { scenario: 'Fetch WooCommerce order details before sending support context', inputValues: { resource: 'order', operation: 'get', id: '{{$json.orderId}}' }, expectedOutput: 'Use {{$json.item}} or {{$json.items}} in the next step.' },
    },
    create: {
      description: 'Create a WooCommerce resource using Data JSON as the request body.',
      outputExample: { success: true, item: { id: 124, name: 'New product' } },
      outputDescription: 'success: true when WooCommerce creates the record. item: raw WooCommerce response. _error/_errorDetails: returned on API failure.',
      usageExample: { scenario: 'Create a WooCommerce product from approved catalog data', inputValues: { resource: 'product', operation: 'create', data: '{"name":"New product","regular_price":"29.99"}' }, expectedOutput: 'Use {{$json.item.id}} in downstream inventory records.' },
    },
  },

  clickup: {
    create_task: {
      description: 'Create a ClickUp task in a list. Runtime returns raw ClickUp task data directly; an invalid status may be skipped after a retry.',
      outputExample: { id: '86d31vafd', name: 'Follow up with Acme trial signup', status: { status: 'to do' }, url: 'https://app.clickup.com/t/86d31vafd', _statusSkipped: true },
      outputDescription: 'Returned fields come from the ClickUp API at the top level. _statusSkipped/_statusNote appear only when status was rejected and the retry without status succeeded. Failures surface through _error.',
      usageExample: { scenario: 'Create a ClickUp onboarding task from a form submission', inputValues: { operation: 'create_task', listId: '901614760992', name: 'Follow up with {{$json.company}}' }, expectedOutput: 'Use {{$json.id}} as taskId in a later update/comment step.' },
    },
    list_tasks: {
      description: 'List ClickUp tasks from a listId or spaceId. includeClosed controls whether closed/completed tasks are requested.',
      outputExample: { tasks: [{ id: '86d31vafd', name: 'Follow up with Acme trial signup' }] },
      outputDescription: 'The raw ClickUp task-list response is returned directly. It can include task arrays and task fields depending on the API response.',
      usageExample: { scenario: 'List open tasks before sending a weekly digest', inputValues: { operation: 'list_tasks', listId: '901614760992', includeClosed: 'false' }, expectedOutput: 'Map task fields from {{$json.tasks}} if ClickUp returns a tasks array.' },
    },
  },

  contentful: {
    get_entries: {
      description: 'List Contentful entries from a space/environment, optionally filtered by contentType.',
      outputExample: { success: true, data: { items: [{ sys: { id: 'entry123' }, fields: { title: { 'en-US': 'July launch' } } }] }, error: {} },
      outputDescription: 'success is true for 2xx responses. data contains the Contentful response body. error is {} on success or { message, status } on failure. Incoming fields are not preserved.',
      usageExample: { scenario: 'Load CMS entries for a publishing report', inputValues: { operation: 'get_entries', spaceId: 'abc123xyz', accessToken: '{{$credentials.contentful.accessToken}}' }, expectedOutput: 'Use {{$json.data.items}} in the next step.' },
    },
    create_entry: {
      description: 'Create a Contentful entry with contentType and valid Fields JSON.',
      outputExample: { success: true, data: { sys: { id: 'entry123', version: 1 }, fields: { title: { 'en-US': 'July launch' } } }, error: {} },
      outputDescription: 'data is the Contentful CMA response. Invalid JSON returns success false, data {}, and error.message Invalid JSON in fields.',
      usageExample: { scenario: 'Create a Contentful draft after editor approval', inputValues: { operation: 'create_entry', spaceId: 'abc123xyz', accessToken: '{{$credentials.contentful.accessToken}}', contentType: 'blogPost', fields: '{"title":{"en-US":"July launch"}}' }, expectedOutput: 'Use {{$json.data.sys.id}} for later update/delete steps.' },
    },
  },

  wordpress: {
    create_post: {
      description: 'Create a WordPress post through /wp-json/wp/v2/posts using Application Password Basic Auth.',
      outputExample: { success: true, data: { id: 1842, status: 'draft', link: 'https://blog.acme.com/july-release-notes/' }, error: {} },
      outputDescription: 'success/data/error wrapper from the WordPress REST API. Incoming fields are not preserved.',
      usageExample: { scenario: 'Publish an approved article draft', inputValues: { operation: 'create_post', siteUrl: 'https://blog.acme.com', username: 'editor.bot', password: '{{$credentials.wordpress.password}}', title: 'July Release Notes', status: 'draft' }, expectedOutput: 'Use {{$json.data.id}} or {{$json.data.link}} downstream.' },
    },
    update_post: {
      description: 'Update an existing WordPress post by postId. Current runtime sends only non-empty title and content, not status.',
      outputExample: { success: true, data: { id: 1842, status: 'draft', link: 'https://blog.acme.com/july-release-notes/' }, error: {} },
      outputDescription: 'data contains the WordPress response. Status changes are not sent by this worker path during update_post.',
      usageExample: { scenario: 'Correct a draft post body after review', inputValues: { operation: 'update_post', siteUrl: 'https://blog.acme.com', username: 'editor.bot', password: '{{$credentials.wordpress.password}}', postId: '1842', content: '{{$json.finalHtml}}' }, expectedOutput: 'Use {{$json.data.id}} and {{$json.data.link}} after the update.' },
    },
  },

  bitbucket: {
    read: {
      description: 'Read one Bitbucket repository when repoSlug is filled, or list workspace repositories when repoSlug is blank.',
      outputExample: { success: true, output: { operation: 'read', data: { slug: 'api-service', full_name: 'acme-platform/api-service' } } },
      outputDescription: 'success plus output.operation/output.data on success. Failures return success false and error.code BITBUCKET_FAILED with error.message.',
      usageExample: { scenario: 'Read repository metadata before opening a DevOps ticket', inputValues: { operation: 'read', workspace: 'acme-platform', repoSlug: 'api-service' }, expectedOutput: 'Use {{$json.output.data.full_name}} downstream.' },
    },
    create: {
      description: 'Create a Bitbucket repository. With Data blank, runtime sends scm git, is_private, and description.',
      outputExample: { success: true, output: { operation: 'create', data: { slug: 'api-service', full_name: 'acme-platform/api-service' } } },
      outputDescription: 'output.data is the Bitbucket repository API response. Data JSON replaces the default payload when provided.',
      usageExample: { scenario: 'Provision a new private repository for a customer project', inputValues: { operation: 'create', workspace: 'acme-platform', repoSlug: 'customer-portal-api', isPrivate: 'true' }, expectedOutput: 'Use {{$json.output.data.full_name}} in onboarding messages.' },
    },
  },

  github: {
    create_issue: {
      description: 'Create a GitHub issue through the connected GitHub account. The runtime social dispatcher preserves incoming fields, adds success/provider/action, and spreads GitHub response fields at the top level.',
      outputExample: { success: true, provider: 'github', action: 'issues.create', id: 123456, number: 42, title: 'Bug: Login fails for SSO users', state: 'open', url: 'https://github.com/org/repo/issues/42' },
      outputDescription: 'success/provider/action are added by the GitHub node. Issue fields such as id, number, title, body, state, url/html_url, and created_at are top-level fields, not nested under data. Failure returns _error, for example github node: No github token found.',
      usageExample: { scenario: 'Create a GitHub issue when a critical error is logged', inputValues: { operation: 'create_issue', owner: '{{$env.GH_OWNER}}', repo: '{{$env.GH_REPO}}', title: '[ERROR] {{$json.errorMessage}}', body: '**Workflow:** {{$json.workflowId}}\n**Time:** {{$now}}\n\n```\n{{$json.stack}}\n```' }, expectedOutput: 'Issue is created. Share {{$json.html_url}} or {{$json.url}} in a Slack alert and use {{$json.number}} for follow-up comments.' },
    },
    get_repo: {
      description: 'Get details about a GitHub repository using the token from the connected GitHub account.',
      outputExample: { success: true, provider: 'github', action: 'repository.getRepo', id: 123456, name: 'my-app', full_name: 'org/my-app', stargazers_count: 128, open_issues_count: 5 },
      outputDescription: 'success/provider/action are added, and repository fields are spread at the top level. Use {{$json.full_name}}, {{$json.stargazers_count}}, or {{$json.open_issues_count}} directly.',
      usageExample: { scenario: 'Fetch repo stats for a weekly report', inputValues: { operation: 'get_repo', owner: 'myorg', repo: 'my-app' }, expectedOutput: 'Repo stats are available in {{$json.stargazers_count}} and {{$json.open_issues_count}}.' },
    },
  },

  gitlab: {
    read: {
      description: 'Read GitLab issues. With issueIid blank, runtime lists project issues; with issueIid filled, it reads that single project issue.',
      outputExample: { success: true, items: [{ iid: 42, title: 'Login error', state: 'opened', web_url: 'https://gitlab.com/acme/api/-/issues/42' }] },
      outputDescription: 'Runtime preserves incoming fields and adds success plus items for list mode or issue for single-issue mode. Failures preserve incoming fields and add _error/_errorDetails.',
      usageExample: { scenario: 'Check open GitLab issues before creating a duplicate ticket', inputValues: { operation: 'read', projectId: '12345', accessToken: '{{$credentials.gitlab.accessToken}}' }, expectedOutput: 'Use {{$json.items}} for the issue list, or {{$json.issue.iid}} when Issue IID was supplied.' },
    },
    create: {
      description: 'Create a GitLab issue with title and optional descriptionText.',
      outputExample: { success: true, created: { iid: 43, title: 'Export button missing', state: 'opened', web_url: 'https://gitlab.com/acme/api/-/issues/43' } },
      outputDescription: 'Runtime preserves incoming fields and adds success plus created, which is the raw GitLab issue response. Missing title returns _error: GitLab create issue: title is required.',
      usageExample: { scenario: 'Open a GitLab issue from a failed QA workflow', inputValues: { operation: 'create', projectId: '12345', title: '[QA] {{$json.testName}} failed', descriptionText: '{{$json.failureSummary}}' }, expectedOutput: 'Use {{$json.created.iid}} or {{$json.created.web_url}} in a Slack or Jira follow-up.' },
    },
  },

  jenkins: {
    build: {
      description: 'Trigger a Jenkins job. Parameters are sent to /buildWithParameters when a JSON object is provided; otherwise runtime calls /build.',
      outputExample: { success: true, output: { operation: 'build', jobName: 'deploy-api', data: { queued: true, location: 'https://jenkins.example.com/queue/item/123/' } } },
      outputDescription: 'Success returns success true with output.operation, output.jobName, and output.data. Failures return success false with error.code JENKINS_FAILED and error.message.',
      usageExample: { scenario: 'Start a deployment after a release tag is approved', inputValues: { operation: 'build', baseUrl: 'https://jenkins.example.com', jobName: 'deploy-api', parameters: '{"BRANCH":"main"}' }, expectedOutput: 'Use {{$json.output.data.location}} to track the queued Jenkins build when Jenkins returns a queue URL.' },
    },
    status: {
      description: 'Read Jenkins build status for a specific buildNumber, or lastBuild when buildNumber is blank.',
      outputExample: { success: true, output: { operation: 'status', jobName: 'deploy-api', data: { number: 105, building: false, result: 'SUCCESS' } } },
      outputDescription: 'Success returns Jenkins build JSON in output.data. Runtime keeps the response wrapped under output, not under a top-level buildStatus field.',
      usageExample: { scenario: 'Check the latest deployment job before notifying a release channel', inputValues: { operation: 'status', baseUrl: 'https://jenkins.example.com', jobName: 'deploy-api', buildNumber: '' }, expectedOutput: 'Use {{$json.output.data.result}} for SUCCESS/FAILURE and {{$json.output.data.number}} for the build number.' },
    },
    cancel: {
      description: 'Stop a Jenkins build by jobName and buildNumber.',
      outputExample: { success: true, output: { operation: 'cancel', jobName: 'deploy-api', data: { stopped: true, buildNumber: '105' } } },
      outputDescription: 'Cancel requires buildNumber. Missing required fields return JENKINS_FAILED; successful cancel returns output.data with a stopped confirmation.',
      usageExample: { scenario: 'Cancel a deployment when an approval step is rejected', inputValues: { operation: 'cancel', baseUrl: 'https://jenkins.example.com', jobName: 'deploy-api', buildNumber: '105' }, expectedOutput: 'Use {{$json.output.data.stopped}} to confirm the stop request was sent.' },
    },
  },

  jira: {
    create_issue: {
      description: 'Create a Jira Cloud issue. Runtime converts description text to Atlassian Document Format and preserves incoming fields.',
      outputExample: { success: true, issueKey: 'PROJ-42', issueId: '10001', issue: { id: '10001', key: 'PROJ-42', self: 'https://yourcompany.atlassian.net/rest/api/3/issue/10001' }, created: true },
      outputDescription: 'success is true, issueKey and issueId are top-level convenience fields, issue is the raw Jira create response, and created is true.',
      usageExample: { scenario: 'Create a Jira bug ticket when an error is detected', inputValues: { operation: 'create_issue', domain: 'yourcompany.atlassian.net', projectKey: 'PROJ', summary: '{{$json.errorTitle}}', description: '{{$json.errorDetails}}', issueType: 'Bug', priority: 'High' }, expectedOutput: 'Use {{$json.issueKey}} as the Jira issue key for comments, transitions, and alerts.' },
    },
    get_issue: {
      description: 'Get details of a Jira issue by issueKey.',
      outputExample: { success: true, issue: { id: '10001', key: 'PROJ-42', fields: { summary: 'Login fails for SSO users', status: { name: 'In Progress' } } } },
      outputDescription: 'success is true and issue contains the Jira API issue object. The issue fields stay nested under issue.fields.',
      usageExample: { scenario: 'Read a Jira issue to check status before sending a reminder', inputValues: { operation: 'get_issue', domain: 'yourcompany.atlassian.net', issueKey: '{{$json.issueKey}}' }, expectedOutput: 'Use {{$json.issue.fields.status.name}} for the current Jira status.' },
    },
    update_issue: {
      description: 'Update summary, description, priority, assignee, or labels on an existing Jira issue.',
      outputExample: { success: true, issueKey: 'PROJ-42', updated: true },
      outputDescription: 'Runtime returns success true, issueKey, and updated true after Jira accepts the update.',
      usageExample: { scenario: 'Escalate priority after a customer reports a blocker', inputValues: { operation: 'update_issue', domain: 'yourcompany.atlassian.net', issueKey: 'PROJ-42', priority: 'High' }, expectedOutput: 'Use {{$json.updated}} to confirm Jira accepted the issue update.' },
    },
    delete_issue: {
      description: 'Delete an existing Jira issue by issueKey.',
      outputExample: { success: true, issueKey: 'PROJ-42', deleted: true },
      outputDescription: 'Runtime returns success true, issueKey, and deleted true. Jira may reject deletion based on project permissions.',
      usageExample: { scenario: 'Remove a duplicate Jira issue created by an automation retry', inputValues: { operation: 'delete_issue', domain: 'yourcompany.atlassian.net', issueKey: '{{$json.duplicateIssueKey}}' }, expectedOutput: 'Use {{$json.deleted}} to confirm the delete request succeeded.' },
    },
    search_issues: {
      description: 'Search Jira issues with JQL through the Jira Cloud /rest/api/3/search/jql endpoint.',
      outputExample: { success: true, issues: [{ key: 'PROJ-42', fields: { summary: 'Login fails for SSO users' } }], total: 1 },
      outputDescription: 'Runtime returns success true, issues array, and total. JQL is required.',
      usageExample: { scenario: 'Find all open urgent bugs before a release meeting', inputValues: { operation: 'search_issues', domain: 'yourcompany.atlassian.net', jql: 'project = PROJ AND priority = High AND status != Done', maxResults: '25' }, expectedOutput: 'Loop over {{$json.issues}} or use {{$json.total}} in a summary.' },
    },
    add_comment: {
      description: 'Add a comment to a Jira issue. Runtime converts commentBody to Atlassian Document Format.',
      outputExample: { success: true, issueKey: 'PROJ-42', commentId: '10088', comment: { id: '10088', body: {} } },
      outputDescription: 'Runtime returns success true, issueKey, commentId, and the raw Jira comment response.',
      usageExample: { scenario: 'Add QA evidence to an existing issue after a failed test run', inputValues: { operation: 'add_comment', domain: 'yourcompany.atlassian.net', issueKey: 'PROJ-42', commentBody: 'Failed in {{$json.environment}}: {{$json.failureSummary}}' }, expectedOutput: 'Use {{$json.commentId}} if a later step needs to reference the Jira comment.' },
    },
    transition_issue: {
      description: 'Move a Jira issue through a workflow transition by transitionId.',
      outputExample: { success: true, issueKey: 'PROJ-42', transitioned: true },
      outputDescription: 'Runtime returns success true, issueKey, and transitioned true after Jira accepts the transition.',
      usageExample: { scenario: 'Move a ticket to Done after deployment succeeds', inputValues: { operation: 'transition_issue', domain: 'yourcompany.atlassian.net', issueKey: 'PROJ-42', transitionId: '31' }, expectedOutput: 'Use {{$json.transitioned}} to confirm the transition request succeeded.' },
    },
    get_projects: {
      description: 'List visible Jira Cloud projects.',
      outputExample: { success: true, projects: [{ key: 'PROJ', id: '10000', name: 'Product Team', type: 'software' }] },
      outputDescription: 'Runtime maps Jira projects to key, id, name, and type. It preserves incoming fields and adds projects.',
      usageExample: { scenario: 'Let a workflow pick the right Jira project before creating a ticket', inputValues: { operation: 'get_projects', domain: 'yourcompany.atlassian.net' }, expectedOutput: 'Use {{$json.projects}} to find available project keys.' },
    },
  },

  netlify: {
    list_sites: {
      description: 'List Netlify sites available to the token.',
      outputExample: { success: true, resource: 'sites', operation: 'list_sites', records: [{ id: 'site_123', name: 'marketing-site' }], count: 1 },
      outputDescription: 'Runtime returns success, resource, operation, records, and count. Failures return success false with records empty, count 0, and error.',
      usageExample: { scenario: 'Find the Netlify site ID before creating a deploy', inputValues: { operation: 'list_sites', accessToken: '{{$credentials.netlify.accessToken}}' }, expectedOutput: 'Use {{$json.records[0].id}} as Site ID for later deploy operations.' },
    },
    get_site: {
      description: 'Read one Netlify site by siteId.',
      outputExample: { success: true, resource: 'sites', operation: 'get_site', record: { id: 'site_123', name: 'marketing-site' }, count: 1 },
      outputDescription: 'Runtime returns one site under record, plus count 1. Missing or invalid tokens produce an error field.',
      usageExample: { scenario: 'Confirm a site exists before announcing a deploy URL', inputValues: { operation: 'get_site', accessToken: '{{$credentials.netlify.accessToken}}', siteId: 'site_123' }, expectedOutput: 'Use {{$json.record.name}} or {{$json.record.url}} downstream.' },
    },
    create_deploy: {
      description: 'Create a Netlify deploy for a site using a JSON payload.',
      outputExample: { success: true, resource: 'deploys', operation: 'create_deploy', record: { id: 'deploy_123', state: 'new' }, count: 1 },
      outputDescription: 'Runtime returns the Netlify deploy response in record. Payload must be a JSON object.',
      usageExample: { scenario: 'Create a deploy after a build artifact is prepared', inputValues: { operation: 'create_deploy', accessToken: '{{$credentials.netlify.accessToken}}', siteId: 'site_123', payload: '{"draft":true}' }, expectedOutput: 'Use {{$json.record.id}} to inspect the deploy later.' },
    },
    list_deploys: {
      description: 'List deploys for one Netlify site.',
      outputExample: { success: true, resource: 'deploys', operation: 'list_deploys', records: [{ id: 'deploy_123', state: 'ready' }], count: 1 },
      outputDescription: 'Runtime returns deploys in records and count. siteId is required.',
      usageExample: { scenario: 'Check the latest production deploy before sending a status update', inputValues: { operation: 'list_deploys', accessToken: '{{$credentials.netlify.accessToken}}', siteId: 'site_123', limit: '10' }, expectedOutput: 'Use {{$json.records[0].state}} for the latest deploy state.' },
    },
    get_deploy: {
      description: 'Read one Netlify deploy by deployId.',
      outputExample: { success: true, resource: 'deploys', operation: 'get_deploy', record: { id: 'deploy_123', state: 'ready' }, count: 1 },
      outputDescription: 'Runtime returns one deploy under record. deployId is required.',
      usageExample: { scenario: 'Inspect a deploy before posting the deploy URL', inputValues: { operation: 'get_deploy', accessToken: '{{$credentials.netlify.accessToken}}', deployId: 'deploy_123' }, expectedOutput: 'Use {{$json.record.deploy_ssl_url}} or {{$json.record.state}} downstream.' },
    },
  },

  vercel: {
    deploy: {
      description: 'Create a Vercel deployment for a project.',
      outputExample: { success: true, data: { deploymentId: 'dpl_123', projectName: 'marketing-site', url: 'marketing-site.vercel.app', status: 'READY', createdAt: '2026-07-20T10:30:00.000Z' }, error: null },
      outputDescription: 'Success returns success true, data.deploymentId, data.projectName, data.url, data.status, data.createdAt, and error null. Incoming fields are not preserved.',
      usageExample: { scenario: 'Deploy a marketing site after content approval', inputValues: { operation: 'deploy', projectName: 'marketing-site', token: '{{$credentials.vercel.token}}' }, expectedOutput: 'Use {{$json.data.url}} in a release notification.' },
    },
    list_deployments: {
      description: 'List deployments visible to the Vercel token.',
      outputExample: { success: true, data: { deployments: [{ uid: 'dpl_123', url: 'marketing-site.vercel.app', state: 'READY' }], total: 1 }, error: null },
      outputDescription: 'Success returns data.deployments and data.total with error null. Validation or API failures return success false with error.code and error.message.',
      usageExample: { scenario: 'Check recent deployments before deciding whether to deploy again', inputValues: { operation: 'list_deployments', token: '{{$credentials.vercel.token}}' }, expectedOutput: 'Use {{$json.data.deployments}} for recent deployment records.' },
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
      description: 'Stop the workflow intentionally by throwing an error in the format ERROR_CODE: message.',
      outputExample: { error: 'VALIDATION_FAILED: Customer email is missing. Cannot send confirmation.' },
      outputDescription: 'The node throws and stops normal execution. There is no structured success output, no stopped flag, and no stoppedAt field for downstream nodes. The run log/error path receives text like VALIDATION_FAILED: Customer email is missing.',
      usageExample: {
        scenario: 'Stop an order workflow when the required customer email is missing',
        inputValues: { errorMessage: 'Customer email is missing. Cannot send confirmation.', errorCode: 'VALIDATION_FAILED' },
        expectedOutput: 'The workflow stops before later normal nodes run; they cannot read {{$json.errorMessage}} because the node throws.',
      },
    },
  },

  webhook_response: {
    default: {
      description: 'Return the statusCode, headers, and body intended for the app or service that called the webhook.',
      outputExample: { statusCode: 200, body: { ok: true, orderId: 'ord_123' }, headers: { 'Content-Type': 'application/json' } },
      outputDescription: 'statusCode: HTTP status returned to the caller. body: Response payload chosen by runtime. headers: Response headers. No sent flag or top-level responseCode is returned.',
      usageExample: {
        scenario: 'Return a success message to a checkout form after creating an order',
        inputValues: { statusCode: '200', body: '{"ok":true,"orderId":"{{$json.orderId}}"}' },
        expectedOutput: 'Use {{$json.body.orderId}}, {{$json.statusCode}}, and {{$json.headers}} if later steps inspect the normalized response.',
      },
    },
  },

  mysql: {
    executeQuery: {
      description: 'Runs raw MySQL SQL with ? placeholders and Parameters. Returns mysql2 rows plus rowsAffected from SELECT ROW_COUNT().',
      outputExample: { rows: [{ id: 101, email: 'alex@example.com', status: 'active' }], rowsAffected: 0 },
      outputDescription: 'rows: result rows returned by mysql2. rowsAffected: value from SELECT ROW_COUNT(); SELECT queries often return 0 here even when rows are present. _error appears for validation or driver failures.',
      usageExample: { scenario: 'Fetch active customers from MySQL before sending renewal reminders', inputValues: { operation: 'executeQuery', query: 'SELECT id, email FROM customers WHERE status = ? LIMIT 50', parameters: '["active"]' }, expectedOutput: 'Rows are available as {{$json.rows}} and customer emails as {{$json.rows[0].email}}.' },
    },
    insert: {
      description: 'Inserts one or more rows into a MySQL table using Data object keys as column names.',
      outputExample: { inserted: [{ insertId: 321, email: 'alex@example.com' }], count: 1 },
      outputDescription: 'inserted: inserted records with insertId plus submitted values. count: number of inserted rows. _error appears on table/data/credential/driver failure.',
      usageExample: { scenario: 'Save a web form lead into MySQL', inputValues: { operation: 'insert', table: 'leads', data: '{"email":"{{$json.email}}"}' }, expectedOutput: 'The new ID is available as {{$json.inserted[0].insertId}}.' },
    },
    update: {
      description: 'Updates MySQL rows in Table matching Where. The runtime requires Data and Where.',
      outputExample: { rowsAffected: 1 },
      outputDescription: 'rowsAffected: number of rows updated. _error appears when table, data, or where is missing or MySQL rejects the statement.',
      usageExample: { scenario: 'Mark a customer as contacted', inputValues: { operation: 'update', table: 'customers', data: '{"contacted":true}', where: '{"id":"{{$json.customerId}}"}' }, expectedOutput: 'Use {{$json.rowsAffected}} to confirm one row changed.' },
    },
    delete: {
      description: 'Deletes MySQL rows in Table matching Where. The runtime requires Where to avoid broad deletes.',
      outputExample: { rowsAffected: 1 },
      outputDescription: 'rowsAffected: number of rows deleted. _error appears when table or where is missing or MySQL rejects the statement.',
      usageExample: { scenario: 'Remove an expired session by ID', inputValues: { operation: 'delete', table: 'sessions', where: '{"id":"{{$json.sessionId}}"}' }, expectedOutput: 'Use {{$json.rowsAffected}} to log the deletion count.' },
    },
  },

  postgresql: {
    executeQuery: {
      description: 'Runs raw PostgreSQL SQL with $1, $2 placeholders and Parameters. The worker accepts Parameters as the params array.',
      outputExample: { rows: [{ id: 42, email: 'alex@example.com' }], rowsAffected: 1 },
      outputDescription: 'rows: result rows from pg. rowsAffected: PostgreSQL rowCount. _error appears for validation or driver failures.',
      usageExample: { scenario: 'Fetch recently created customers for a daily summary', inputValues: { operation: 'executeQuery', query: "SELECT id, email FROM customers WHERE created_at >= NOW() - INTERVAL '1 day'", parameters: '[]' }, expectedOutput: 'Rows are available as {{$json.rows}} and count as {{$json.rowsAffected}}.' },
    },
    insert: {
      description: 'Inserts PostgreSQL rows and returns INSERT ... RETURNING * rows.',
      outputExample: { inserted: [{ id: 101, email: 'alex@example.com' }], count: 1 },
      outputDescription: 'inserted: rows returned by INSERT ... RETURNING *. count: number inserted. _error appears on table/data/credential/driver failure.',
      usageExample: { scenario: 'Save a support form submission into PostgreSQL', inputValues: { operation: 'insert', table: 'intake_requests', data: '{"email":"{{$json.email}}"}' }, expectedOutput: 'Use {{$json.inserted[0].id}} in a notification step.' },
    },
    update: {
      description: 'Updates PostgreSQL rows matching Where and returns UPDATE ... RETURNING * rows.',
      outputExample: { rows: [{ id: 101, status: 'processed' }], rowsAffected: 1 },
      outputDescription: 'rows: changed rows. rowsAffected: number updated. _error appears when table/data/where is missing or PostgreSQL rejects the statement.',
      usageExample: { scenario: 'Mark an order as processed', inputValues: { operation: 'update', table: 'orders', data: '{"status":"processed"}', where: '{"id":"{{$json.orderId}}"}' }, expectedOutput: 'Use {{$json.rows[0].status}} to confirm the new status.' },
    },
    delete: {
      description: 'Deletes PostgreSQL rows matching Where and returns DELETE ... RETURNING * rows.',
      outputExample: { rows: [{ id: 'session_123' }], rowsAffected: 1 },
      outputDescription: 'rows: deleted rows. rowsAffected: number deleted. _error appears when table/where is missing or execution fails.',
      usageExample: { scenario: 'Delete an expired login token', inputValues: { operation: 'delete', table: 'login_tokens', where: '{"id":"{{$json.tokenId}}"}' }, expectedOutput: 'Use {{$json.rowsAffected}} to log whether a row was removed.' },
    },
  },

  oracle_database: {
    select: {
      description: 'Reads Oracle rows from Schema.Table with optional Row Filters, Sort, Limit, and number formatting.',
      outputExample: { success: true, operation: 'select', schema: 'HR', table: 'EMPLOYEES', rows: [{ EMPLOYEE_ID: 101 }], rowsAffected: 1, meta: { returnedAll: false, limit: 50 }, warning: null, error: null },
      outputDescription: 'success/operation/schema/table identify the run. rows contains selected rows. rowsAffected equals returned rows for select. meta includes returnedAll and limit. error is null on success.',
      usageExample: { scenario: 'Read active employees for an HR audit', inputValues: { operation: 'select', schema: 'HR', table: 'EMPLOYEES', selectRows: '[{"column":"STATUS","operator":"=","value":"ACTIVE"}]' }, expectedOutput: 'Rows are available as {{$json.rows}}.' },
    },
    execute_sql: {
      description: 'Runs custom Oracle SQL or PL/SQL with bind variables. Statements ending in a semicolon are rejected before execution.',
      outputExample: { success: true, operation: 'execute_sql', rows: [{ EMPLOYEE_ID: 101 }], rowsAffected: 0, meta: { statementType: 'SELECT' }, error: null },
      outputDescription: 'rows contains returned rows for SELECT. rowsAffected reflects write statements. meta.statementType is the first SQL keyword. error is null on success.',
      usageExample: { scenario: 'Run a DBA-approved lookup statement', inputValues: { operation: 'execute_sql', statement: 'SELECT * FROM HR.EMPLOYEES WHERE EMPLOYEE_ID = :id', bindParams: '{"id":"{{$json.employeeId}}"}' }, expectedOutput: 'Use {{$json.rows[0].EMPLOYEE_ID}} in a later condition.' },
    },
  },

  pinecone: {
    query: {
      description: 'Searches Pinecone for nearest-neighbor vectors and returns matches with metadata.',
      outputExample: { success: true, operation: 'query', matches: [{ id: 'kb-returns-policy-0003', score: 0.92, metadata: { title: 'Returns Policy' } }], upsertedCount: 0 },
      outputDescription: 'matches contains id, score, and metadata. upsertedCount is 0 for query. error appears on API/runtime failure.',
      usageExample: { scenario: 'Find help-center chunks similar to a support ticket', inputValues: { operation: 'query', vector: '{{$json.embedding}}', topK: '5' }, expectedOutput: 'Use {{$json.matches}} as retrieval context for an AI answer.' },
    },
    upsert: {
      description: 'Stores or replaces one Pinecone vector by ID with optional metadata.',
      outputExample: { success: true, operation: 'upsert', matches: [], upsertedCount: 1 },
      outputDescription: 'upsertedCount is Pinecone upsertedCount or 1 fallback. matches is empty. error appears on API/runtime failure.',
      usageExample: { scenario: 'Index one knowledge-base chunk', inputValues: { operation: 'upsert', id: 'kb-returns-policy-0003', vector: '{{$json.embedding}}', metadata: '{"title":"Returns Policy"}' }, expectedOutput: 'Use {{$json.upsertedCount}} to confirm indexing.' },
    },
    delete: {
      description: 'Deletes one Pinecone vector ID from the selected namespace.',
      outputExample: { success: true, operation: 'delete', matches: [], upsertedCount: 0 },
      outputDescription: 'delete returns success with empty matches and upsertedCount 0. error appears on API/runtime failure.',
      usageExample: { scenario: 'Remove a retracted document chunk from Pinecone', inputValues: { operation: 'delete', id: 'kb-returns-policy-0003' }, expectedOutput: 'Use {{$json.operation}} and absence of _error to log success.' },
    },
  },

  qdrant: {
    query: {
      description: 'Searches Qdrant for similar vectors. This is the runtime value behind the UI label Query/Search.',
      outputExample: { success: true, operation: 'query', matches: [{ id: 'kb-returns-policy-0003', score: 0.91, payload: { title: 'Returns Policy' } }], upsertedCount: 0 },
      outputDescription: 'matches contains Qdrant result points. upsertedCount is 0 for query. error appears on API/runtime failure.',
      usageExample: { scenario: 'Find policy chunks similar to a support ticket', inputValues: { operation: 'query', vector: '{{$json.embedding}}', limit: '5' }, expectedOutput: 'Use {{$json.matches}} as retrieval context.' },
    },
    upsert: {
      description: 'Stores or replaces one Qdrant point and may auto-create a missing collection with Cosine distance when Vector is supplied.',
      outputExample: { success: true, operation: 'upsert', matches: [], upsertedCount: 1 },
      outputDescription: 'upsertedCount is 1 in the current runtime. matches is empty. error appears on API/runtime failure.',
      usageExample: { scenario: 'Index one document chunk in Qdrant', inputValues: { operation: 'upsert', id: 'kb-returns-policy-0003', vector: '{{$json.embedding}}', payload: '{"title":"Returns Policy"}' }, expectedOutput: 'Use {{$json.upsertedCount}} to confirm indexing.' },
    },
    delete: {
      description: 'Deletes one Qdrant point by ID.',
      outputExample: { success: true, operation: 'delete', matches: [], upsertedCount: 0 },
      outputDescription: 'delete returns success with empty matches and upsertedCount 0. error appears on API/runtime failure.',
      usageExample: { scenario: 'Remove a stale vector point', inputValues: { operation: 'delete', id: 'kb-returns-policy-0003' }, expectedOutput: 'Use {{$json.operation}} and absence of _error to log success.' },
    },
  },

  redis: {
    get: {
      description: 'Reads one Redis string key and returns key plus value. Missing keys return value null rather than throwing.',
      outputExample: { key: 'user:1048', value: '{"plan":"Pro"}' },
      outputDescription: 'key: Redis key read. value: stored string or null. _error appears on connection, credential, operation, or key failure.',
      usageExample: { scenario: 'Read cached customer context before calling a CRM', inputValues: { operation: 'get', key: 'user:{{$json.userId}}' }, expectedOutput: 'Use {{$json.value}} as cached context or branch when it is null.' },
    },
    set: {
      description: 'Stores one Redis key as text, optionally with TTL seconds.',
      outputExample: { key: 'user:1048', value: '{"plan":"Pro"}', result: 'OK' },
      outputDescription: 'key/value identify what was written. result is OK on success. _error appears when key, value, or connection data is invalid.',
      usageExample: { scenario: 'Cache a CRM lookup for one hour', inputValues: { operation: 'set', key: 'user:{{$json.userId}}', value: '{{$json.cachePayload}}', ttl: '3600' }, expectedOutput: 'Use {{$json.result}} to confirm Redis accepted the write.' },
    },
    delete: {
      description: 'Deletes one Redis key and returns whether Redis removed anything.',
      outputExample: { key: 'user:1048', deleted: true, count: 1 },
      outputDescription: 'deleted is true when at least one key was removed. count is the Redis deletion count. _error appears on connection or key failure.',
      usageExample: { scenario: 'Invalidate cached customer context after an update', inputValues: { operation: 'delete', key: 'user:{{$json.userId}}' }, expectedOutput: 'Use {{$json.deleted}} and {{$json.count}} for audit logging.' },
    },
  },

  sql_server: {
    executeQuery: {
      description: 'Runs raw T-SQL with named @parameters. If Query is blank and Table is provided, the runtime can generate a SELECT TOP query.',
      outputExample: { rows: [{ id: 1048, email: 'alex@example.com' }], rowsAffected: 1 },
      outputDescription: 'rows is the SQL Server recordset. rowsAffected is the first mssql rowsAffected count. _error appears on validation, credential, certificate, parameter, or SQL failure.',
      usageExample: { scenario: 'Fetch active SQL Server customers before a renewal email', inputValues: { operation: 'executeQuery', query: 'SELECT TOP 100 id, email FROM dbo.Customers WHERE status = @status', params: '{"status":"active"}' }, expectedOutput: 'Use {{$json.rows}} and {{$json.rowsAffected}} downstream.' },
    },
    storedProcedure: {
      description: 'Executes an existing SQL Server stored procedure with optional Params JSON.',
      outputExample: { records: [{ customerId: 1048, score: 82 }], returnValue: 0 },
      outputDescription: 'records is the first returned recordset. returnValue is the stored procedure return value. _error appears on missing procedureName or execution failure.',
      usageExample: { scenario: 'Run a customer scoring procedure after a profile update', inputValues: { operation: 'storedProcedure', procedureName: 'dbo.RecalculateCustomerScore', params: '{"customerId":"{{$json.customerId}}"}' }, expectedOutput: 'Use {{$json.records}} or {{$json.returnValue}} in the next step.' },
    },
  },

  timescaledb: {
    executeQuery: {
      description: 'Runs raw PostgreSQL/Timescale SQL with ordered $1, $2 Params. Use this for advanced time windows and aggregates.',
      outputExample: { rows: [{ bucket: '2026-07-20T09:00:00.000Z', avg: 42.7 }], rowsAffected: 1 },
      outputDescription: 'rows contains PostgreSQL result rows. rowsAffected is rowCount. _error appears on connection, SSL, parameter, or SQL failure.',
      usageExample: { scenario: 'Build hourly average metrics', inputValues: { operation: 'executeQuery', query: "SELECT time_bucket('1 hour', time) AS bucket, AVG(value) FROM metrics WHERE device_id = $1 GROUP BY bucket", params: '["pump-22"]' }, expectedOutput: 'Use {{$json.rows}} as chart or report input.' },
    },
    timeBucket: {
      description: 'Runs a generated time_bucket count query grouped by Bucket Interval and Group Column.',
      outputExample: { rows: [{ bucket: '2026-07-20T09:00:00.000Z', device_id: 'pump-22', count: '42' }], count: 1 },
      outputDescription: 'rows contains bucketed counts. count is the number of groups returned. _error appears when table/timeColumn/interval/bucketColumn is missing or SQL fails.',
      usageExample: { scenario: 'Count readings per device per hour', inputValues: { operation: 'timeBucket', table: 'metrics', timeColumn: 'time', interval: '1 hour', bucketColumn: 'device_id' }, expectedOutput: 'Use {{$json.rows}} for summaries or alerts.' },
    },
  },

  aws_s3: {
    get: {
      description: 'Downloads one S3 object. The runtime normalizes UI value get to download.',
      outputExample: { bucket: 'acme-customer-uploads-prod', key: 'invoices/INV-1048.pdf', dataBase64: 'JVBERi0x...', sizeBytes: 24512, contentType: 'application/pdf', etag: '"abc123"' },
      outputDescription: 'dataBase64 contains downloaded bytes. sizeBytes/contentType/etag describe the S3 object. _error appears for missing bucket/key or AWS failures.',
      usageExample: { scenario: 'Download an invoice PDF before emailing it', inputValues: { operation: 'get', bucket: 'acme-customer-uploads-prod', key: 'invoices/{{$json.invoiceId}}.pdf' }, expectedOutput: 'Use {{$json.dataBase64}} as file content downstream.' },
    },
    put: {
      description: 'Uploads content to one S3 object. The runtime normalizes UI value put to upload and accepts dataBase64, data, or content.',
      outputExample: { bucket: 'acme-customer-uploads-prod', key: 'exports/orders.csv', sizeBytes: 4096, etag: '"def456"', uploaded: true },
      outputDescription: 'uploaded true confirms the write. key/bucket identify the object. sizeBytes is uploaded byte length. _error appears when key/body/credentials fail.',
      usageExample: { scenario: 'Upload a generated CSV report', inputValues: { operation: 'put', bucket: 'acme-customer-uploads-prod', key: 'exports/{{$json.reportDate}}/orders.csv', content: '{{$json.csvReport}}' }, expectedOutput: 'Use {{$json.uploaded}} and {{$json.key}} for notification or audit.' },
    },
  },

  dropbox: {
    read: {
      description: 'Downloads one Dropbox file. The runtime normalizes UI value read to download.',
      outputExample: { success: true, path: '/Customer Uploads/1048/contract.pdf', dataBase64: 'JVBERi0x...', sizeBytes: 24512, metadata: { name: 'contract.pdf' } },
      outputDescription: 'success true confirms download. dataBase64 contains file bytes. metadata is parsed Dropbox metadata. _error/_errorDetails appear on token, path, or API failure.',
      usageExample: { scenario: 'Download a customer contract before attaching it to a CRM record', inputValues: { operation: 'read', path: '/Customer Uploads/{{$json.customerId}}/contract.pdf' }, expectedOutput: 'Use {{$json.dataBase64}} or {{$json.metadata}} in the next step.' },
    },
    upload: {
      description: 'Uploads content to Dropbox at Path, overwriting the existing file. Runtime accepts dataBase64, data, or content.',
      outputExample: { success: true, path: '/Reports/orders.csv', sizeBytes: 4096, metadata: { name: 'orders.csv' } },
      outputDescription: 'success true confirms upload. sizeBytes is uploaded bytes. metadata is Dropbox upload metadata. _error/_errorDetails appear on missing path/body, token, or API failure.',
      usageExample: { scenario: 'Upload a generated report into a shared Dropbox folder', inputValues: { operation: 'upload', path: '/Reports/{{$json.reportDate}}/orders.csv', content: '{{$json.csvReport}}' }, expectedOutput: 'Use {{$json.metadata}} and {{$json.path}} in a notification.' },
    },
  },

  read_binary_file: {
    configure: {
      description: 'Reads a workflow file asset or safe server storage path and returns base64 bytes plus file metadata.',
      outputExample: { success: true, assetId: 'asset-id', fileName: 'report.pdf', mimeType: 'application/pdf', sizeBytes: 2048, checksumSha256: 'abc123...', storageProvider: 'local', storageKey: 'reports/report.pdf', dataBase64: 'JVBERi0x...' },
      outputDescription: 'dataBase64 contains the file bytes. fileName, mimeType, sizeBytes, checksumSha256, storageProvider, storageKey, and filePath describe the resolved file. _error appears on lookup, path, size, or read failure.',
      usageExample: { scenario: 'Attach a generated PDF asset to an email', inputValues: { sourceType: 'assetId', assetId: '{{$json.assetId}}' }, expectedOutput: 'Use {{$json.dataBase64}} as the attachment body.' },
    },
  },

  write_binary_file: {
    configure: {
      description: 'Writes base64, data URL, or plain text into one managed workflow file asset under the binary storage root.',
      outputExample: { success: true, written: true, assetId: 'asset-id', fileName: 'invoice.pdf', mimeType: 'application/pdf', sizeBytes: 24512, checksumSha256: 'abc123...', storageProvider: 'local', storageKey: 'invoices/invoice.pdf', dataBase64: 'JVBERi0x...', metadataPersisted: true },
      outputDescription: 'assetId identifies the managed file when metadata persists. dataBase64 is the normalized file body. metadataPersisted or metadataError explains whether database asset metadata was saved. _error appears on payload, path, size, or write failure.',
      usageExample: { scenario: 'Stage an invoice PDF before uploading it', inputValues: { fileName: 'invoice-{{$json.invoiceId}}.pdf', dataBase64: '{{$json.dataBase64}}', persist: 'true' }, expectedOutput: 'Use {{$json.assetId}} for a later Read Binary File step.' },
    },
  },

  ftp: {
    get: {
      description: 'Downloads one file from an FTP server. The patched registry path also accepts legacy download as an alias.',
      outputExample: { success: true, output: { operation: 'get', data: { path: '/incoming/orders.csv', size: 4096, dataBase64: 'T3JkZXJJZA==' } } },
      outputDescription: 'output.operation is get and output.data contains downloaded file data. Legacy execution may return dataBase64 and sizeBytes at the top level. _error appears on validation, login, path, or FTP failure.',
      usageExample: { scenario: 'Download a partner order feed', inputValues: { operation: 'get', host: 'ftp.fulfillment-partner.com', remotePath: '/incoming/orders.csv' }, expectedOutput: 'Use {{$json.output.data.dataBase64}} or {{$json.dataBase64}} in the next parser.' },
    },
    put: {
      description: 'Uploads one payload to an FTP path. The patched registry path also accepts legacy upload as an alias.',
      outputExample: { success: true, output: { operation: 'put', data: { path: '/outbox/report.csv', size: 4096, uploaded: true } } },
      outputDescription: 'output.operation is put and output.data confirms uploaded path and size. Legacy execution may return path, sizeBytes, and uploaded at the top level. _error appears when body, credentials, path, or server permissions fail.',
      usageExample: { scenario: 'Upload a generated CSV to a partner', inputValues: { operation: 'put', host: 'ftp.fulfillment-partner.com', remotePath: '/outbox/report.csv', content: '{{$json.csvReport}}' }, expectedOutput: 'Use uploaded/path/size to log the transfer.' },
    },
  },

  sftp: {
    get: {
      description: 'Downloads one file over SFTP/SSH. The patched registry path also accepts legacy download as an alias.',
      outputExample: { success: true, output: { operation: 'get', data: { path: '/daily/transactions.csv', size: 4096, dataBase64: 'VHJhbnNhY3Rpb25JZA==' } } },
      outputDescription: 'output.operation is get and output.data contains downloaded file data. Legacy execution may return dataBase64 and sizeBytes at the top level. _error appears on validation, authentication, path, or SFTP failure.',
      usageExample: { scenario: 'Download a bank transactions file', inputValues: { operation: 'get', host: 'sftp.payroll-vendor.com', remotePath: '/daily/transactions.csv' }, expectedOutput: 'Use downloaded dataBase64 as file content downstream.' },
    },
    put: {
      description: 'Uploads one payload to an SFTP path using password or private-key authentication. The patched registry path also accepts legacy upload as an alias.',
      outputExample: { success: true, output: { operation: 'put', data: { path: '/inbound/report.csv', size: 4096, uploaded: true } } },
      outputDescription: 'output.operation is put and output.data confirms uploaded path and size. Legacy execution may return path, sizeBytes, and uploaded at the top level. _error appears when body, credentials, path, key, or permissions fail.',
      usageExample: { scenario: 'Upload a payroll report', inputValues: { operation: 'put', host: 'sftp.payroll-vendor.com', remotePath: '/inbound/report.csv', content: '{{$json.csvReport}}' }, expectedOutput: 'Use uploaded/path/size to confirm handoff.' },
    },
  },

  onedrive: {
    read: {
      description: 'Downloads one OneDrive file by path. The runtime normalizes read to download internally.',
      outputExample: { success: true, path: '/Contracts/contract-1048.pdf', dataBase64: 'JVBERi0x...', sizeBytes: 24512 },
      outputDescription: 'success true confirms download. dataBase64 contains file bytes. path and sizeBytes describe the file. _error/_errorDetails appear on token, path, permission, or Graph failure.',
      usageExample: { scenario: 'Download a customer contract before emailing it', inputValues: { operation: 'read', path: '/Contracts/{{$json.customerId}}.pdf' }, expectedOutput: 'Use {{$json.dataBase64}} as the attachment body.' },
    },
    upload: {
      description: 'Uploads content to a OneDrive path using dataBase64, data, or content. The current runtime does not read fileName directly.',
      outputExample: { success: true, path: '/Reports/month-end.xlsx', sizeBytes: 4096, metadata: { id: '01ABC123', name: 'month-end.xlsx' } },
      outputDescription: 'success true confirms upload. path and sizeBytes identify the uploaded file, and metadata contains Microsoft Graph item data. _error/_errorDetails appear on token, path, body, permission, or Graph failure.',
      usageExample: { scenario: 'Upload a generated report to OneDrive', inputValues: { operation: 'upload', path: '/Reports/{{$json.reportDate}}.xlsx', content: '{{$json.dataBase64}}' }, expectedOutput: 'Use {{$json.metadata.id}} or {{$json.path}} in a notification.' },
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
