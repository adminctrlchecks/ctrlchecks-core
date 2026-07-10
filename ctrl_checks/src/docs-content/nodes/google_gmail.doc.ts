import type { NodeDoc } from '../types';

export const googleGmailDoc: NodeDoc = {
  "slug": "google_gmail",
  "displayName": "Gmail",
  "category": "Communication",
  "logoUrl": "/integrations-logos/Gmail.svg",
  "description": "Send, list, get, and search Gmail messages via Google OAuth.",
  "credentialType": "Gmail OAuth",
  "credentialSetupSteps": [
    "What this is: The Gmail connection lets CtrlChecks access your Gmail account safely without putting secrets in workflow fields.",
    "Where to start: In CtrlChecks, open Connections -> Add Connection -> Google.",
    "How to connect: Sign in with Google and grant the Gmail permissions requested for sending and reading messages.",
    "Scopes used: Gmail send is required for Send Email. Gmail readonly is required for List, Get, and Search.",
    "Important: OAuth tokens are stored in Connections and are not workflow fields. Do not paste Google tokens, client secrets, or passwords into the node.",
    "Test it: Save the connection, run a simple Gmail List or Send step, and confirm CtrlChecks can reach the account."
  ],
  "credentialDocsUrl": "https://developers.google.com/gmail/api/auth/scopes",
  "resources": [
    {
      "name": "Operations",
      "description": "Gmail exposes operation choices directly.",
      "operations": [
        {
          "name": "Send",
          "value": "send",
          "description": "Send an email to one or more recipients via Gmail.",
          "fields": [
            {
              "name": "Recipient Emails",
              "internalKey": "recipientEmails",
              "type": "email",
              "required": true,
              "description": "Recipient email address(es), comma- or newline-separated (e.g. a@x.com, b@y.com). Active when Recipient source is Manual entry. If Extract from sheet is selected, this field is optional — the workflow supplies emails from upstream nodes.",
              "helpText": "What this field is: The email address(es) of who will receive this email.\nHow to fill it: Type one email address. For multiple recipients, separate with commas.\nExample (one): alice@example.com\nExample (multiple): alice@example.com, bob@example.com, carol@example.com\nTip: Use {{$json.email}} to pull the email address from a previous step (like a form or database node).",
              "placeholder": "john@example.com",
              "example": "john@example.com"
            },
            {
              "name": "Subject",
              "internalKey": "subject",
              "type": "string",
              "required": true,
              "description": "Email subject (required for send operation)",
              "helpText": "What this field is: The subject line — the bold text the recipient sees in their inbox before opening the email.\nHow to fill it: Write a short, clear subject.\nExample: Your order #12345 has shipped!\nTip: Use {{$json.orderNumber}} to include data from an earlier step. Example: Your order #{{$json.orderId}} has been confirmed.",
              "placeholder": "Hello",
              "example": "Hello"
            },
            {
              "name": "Body",
              "internalKey": "body",
              "type": "textarea",
              "required": true,
              "description": "Email body content (required for send operation)",
              "helpText": "What this field is: The full email content the recipient reads after opening the message.\nHow to fill it: Type plain text. Line breaks are kept.\nExample: Hi {{$json.name}}, thank you for your purchase. Your order will arrive in 3 to 5 business days.\nTip: Use values like {{$json.name}} from an earlier step to personalize the email.",
              "placeholder": "Email content",
              "example": "Email content"
            },
            {
              "name": "CC",
              "internalKey": "cc",
              "type": "email",
              "required": false,
              "description": "Optional CC recipient email address(es), comma- or newline-separated.",
              "helpText": "What this field is: Extra visible recipients copied on the email.\nHow to fill it: Type one email address, or multiple separated with commas.\nExample: manager@example.com, audit@example.com\nLeave blank if no CC recipients are needed.",
              "placeholder": "manager@example.com",
              "example": "manager@example.com"
            },
            {
              "name": "BCC",
              "internalKey": "bcc",
              "type": "email",
              "required": false,
              "description": "Optional BCC recipient email address(es), comma- or newline-separated.",
              "helpText": "What this field is: Hidden copy recipients. Other recipients will not see these addresses.\nHow to fill it: Type one email address, or multiple separated with commas.\nExample: archive@example.com\nLeave blank if no BCC recipients are needed.",
              "placeholder": "archive@example.com",
              "example": "archive@example.com"
            },
            {
              "name": "From",
              "internalKey": "from",
              "type": "string",
              "required": false,
              "description": "Optional sender address or configured Gmail alias. Leave blank to use the connected Google account.",
              "helpText": "What this field is: The email address that will appear as the sender.\nHow to fill it: Use your Gmail address or a Gmail alias you have set up.\nExample: alice@gmail.com or orders@yourcompany.com\nLeave blank to use your primary Gmail address automatically.",
              "placeholder": "your-email@gmail.com",
              "example": "your-email@gmail.com"
            }
          ],
          "outputExample": {
            "messageId": "18abc123def456",
            "threadId": "18abc123def456",
            "labelIds": [
              "SENT"
            ]
          },
          "outputDescription": "messageId: Unique Gmail message ID — use this to reference the sent message. threadId: The email thread ID. labelIds: Gmail labels applied to the sent message.",
          "usageExample": {
            "scenario": "Send a personalised welcome email to a new user after form sign-up",
            "inputValues": {
              "recipientEmails": "{{$json.email}}",
              "subject": "Welcome to CtrlChecks, {{$json.name}}!",
              "body": "Hi {{$json.name}},\n\nYour account is ready. Visit your dashboard to get started.\n\nCheers,\nThe CtrlChecks Team"
            },
            "expectedOutput": "The email is delivered to the recipient. `{{$json.messageId}}` is available for logging or referencing in a downstream database write."
          },
          "externalDocsUrl": "https://developers.google.com/gmail/api/reference/rest"
        },
        {
          "name": "List",
          "value": "list",
          "description": "List email messages from the connected Gmail inbox, optionally filtered by a query.",
          "fields": [
            {
              "name": "Max Results",
              "internalKey": "maxResults",
              "type": "number",
              "required": false,
              "description": "Maximum number of results (for list/search)",
              "helpText": "What this field is: The number used for Maximum number of results.\nHow to fill it: Type digits only. Do not add words unless this field says they are allowed.\nExample: 10.\nTip: Use {{$json.maxResults}} when the number comes from an earlier step.",
              "placeholder": "10",
              "example": "10",
              "defaultValue": "10"
            }
          ],
          "outputExample": {
            "messages": [
              {
                "id": "18abc1",
                "threadId": "18abc1",
                "snippet": "Hi, I have a question about..."
              },
              {
                "id": "18abc2",
                "threadId": "18abc2",
                "snippet": "Your invoice for January..."
              }
            ],
            "resultSizeEstimate": 2
          },
          "outputDescription": "messages: Array of message objects. Each has id, threadId, and snippet. resultSizeEstimate: Approximate total number of matching messages.",
          "usageExample": {
            "scenario": "Fetch unread support emails and create Jira tickets for each",
            "inputValues": {
              "query": "is:unread label:support",
              "maxResults": "10"
            },
            "expectedOutput": "Returns up to 10 unread emails. Loop over `{{$json.messages}}` and use each message id in a Gmail Get node to fetch the full content."
          },
          "externalDocsUrl": "https://developers.google.com/gmail/api/reference/rest"
        },
        {
          "name": "Get",
          "value": "get",
          "description": "Fetch the full content of a specific Gmail message by its ID.",
          "fields": [
            {
              "name": "Message Id",
              "internalKey": "messageId",
              "type": "string",
              "required": true,
              "description": "Gmail message ID (required ONLY for get operation, not for send)",
              "helpText": "What this field is: The unique ID of a specific Gmail email you want to fetch.\nWhere to find it: First run a Gmail List or Search operation — the output will include a messageId field for each email. Copy that value.\nExample: 18abc123def456\nTip: Use {{$json.messageId}} to pass it automatically from the previous List or Search step.",
              "placeholder": "abc123def456",
              "example": "abc123def456"
            }
          ],
          "outputExample": {
            "id": "18abc123",
            "subject": "Invoice #1234",
            "from": "billing@vendor.com",
            "to": "me@company.com",
            "body": "Please find attached your invoice for January.",
            "date": "2025-01-15T08:00:00Z"
          },
          "outputDescription": "id: The Gmail message ID. subject: Email subject. from: Sender address. to: Recipient address. body: Full email body text. date: When the email was received.",
          "usageExample": {
            "scenario": "Read the full body of each email returned by a Gmail List node",
            "inputValues": {
              "messageId": "{{$json.id}}"
            },
            "expectedOutput": "Returns the full message with body text. Use `{{$json.body}}` in a downstream AI or text processing node."
          },
          "externalDocsUrl": "https://developers.google.com/gmail/api/reference/rest"
        },
        {
          "name": "Search",
          "value": "search",
          "description": "Search Gmail messages using Gmail search syntax (same as the Gmail search bar).",
          "fields": [
            {
              "name": "Query",
              "internalKey": "query",
              "type": "textarea",
              "required": true,
              "description": "Gmail search query (for list/search operations)",
              "helpText": "What this field is: A search filter to find specific emails.\nHow to fill it: Use Gmail search syntax.\nExamples: from:billing@stripe.com or subject:\"payment failed\" or is:unread after:2025/01/01",
              "placeholder": "from:example@gmail.com",
              "example": "from:example@gmail.com"
            },
            {
              "name": "Max Results",
              "internalKey": "maxResults",
              "type": "number",
              "required": false,
              "description": "Maximum number of results (for list/search)",
              "helpText": "What this field is: The number used for Maximum number of results.\nHow to fill it: Type digits only. Do not add words unless this field says they are allowed.\nExample: 10.\nTip: Use {{$json.maxResults}} when the number comes from an earlier step.",
              "placeholder": "10",
              "example": "10",
              "defaultValue": "10"
            }
          ],
          "outputExample": {
            "messages": [
              {
                "id": "18abc9",
                "threadId": "18abc9",
                "snippet": "Your order has shipped..."
              }
            ],
            "resultSizeEstimate": 1
          },
          "outputDescription": "messages: Array of messages matching the search query. resultSizeEstimate: Approximate total matches.",
          "usageExample": {
            "scenario": "Find all emails from a specific sender in the last 7 days",
            "inputValues": {
              "query": "from:vendor@example.com newer_than:7d",
              "maxResults": "25"
            },
            "expectedOutput": "Returns messages matching the query. Process each result with a Gmail Get node to access the full email content."
          },
          "externalDocsUrl": "https://developers.google.com/gmail/api/reference/rest"
        }
      ]
    }
  ],
  "commonErrors": [
    {
      "error": "Authentication failed",
      "cause": "The saved credential, token, API key, or OAuth grant is missing, expired, or lacks the required scope.",
      "fix": "Reconnect the service in CtrlChecks → Connections, then re-run the Gmail node."
    },
    {
      "error": "Required field missing",
      "cause": "A required input is empty or an upstream expression resolved to an empty value.",
      "fix": "Open the node, fill every required field, and verify the upstream node output before running."
    },
    {
      "error": "Invalid input format",
      "cause": "A field value does not match the format expected by the node or service API.",
      "fix": "Check JSON, date, URL, email, and ID fields against the examples shown in the node documentation."
    }
  ],
  "relatedNodes": []
};
