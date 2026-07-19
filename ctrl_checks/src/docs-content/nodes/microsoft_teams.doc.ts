import type { NodeDoc } from '../types';

const webhookUrlHelpText = `What this field means: Webhook URL is the Microsoft Teams Incoming Webhook address for the channel that should receive this notification.

Why it matters: Teams uses this URL as the delivery address for simple channel posts. The URL is tied to one team/channel connector.

When to fill it: Fill it for normal Teams channel notifications. Leave it blank only when replying to a Microsoft Teams Trigger by using Service URL, Conversation ID, and a saved Microsoft Teams Bot connection.

What to enter: Enter the complete Incoming Webhook URL, or map a saved value such as {{$json.teamsWebhookUrl}} if your workflow receives it from a secure approved source.

Where the value comes from: Create or select an Incoming Webhook connector in the target Teams channel, or store the URL in Connections under Microsoft Teams and let the runtime retrieve it.

How to use it later: The URL itself is not useful downstream. On success, later nodes should use {{$json.success}}, {{$json.teams.status}}, and {{$json.teams.response}}.

Accepted format: Full HTTPS URL from Microsoft Teams, commonly starting with https://outlook.office.com/webhook/ or the current Teams webhook host used by your tenant.

Real workplace example: A deployment workflow posts release notes to the Engineering Updates channel by using that channel's saved Teams webhook connection.

If it is empty or wrong: Runtime can return "Teams: provide webhookUrl, or use serviceUrl/conversationId plus a Microsoft Teams Bot connection for trigger replies." Teams can also reject old, incomplete, revoked, or copied-partial URLs.

Common mistake: Treating one channel webhook as a reusable tenant-wide credential. Each Incoming Webhook posts to the channel where it was created.`;

const messageHelpText = `What this field means: Message is the text Microsoft Teams receives and displays.

Why it matters: This is what teammates read in the channel or bot conversation, so it should include the decision, status, owner, IDs, and next action.

When to fill it: Fill it every time. Runtime returns "Teams: message is required" when Message is blank after expressions resolve.

What to enter: Write a short workplace update, alert, summary, approval prompt, or reply. Combine fixed wording with mapped fields such as {{$json.ticketId}}, {{$json.customerEmail}}, {{$json.sprintName}}, or {{$json.response}}.

Where the value comes from: Use form answers, webhook payloads, CRM data, database records, AI Agent responses, error-handler details, or Microsoft Teams Trigger text.

How to use it later: The message text remains in the workflow input, while the node adds send result fields such as {{$json.success}}, {{$json.teams}}, {{$json.botReply}}, or {{$json._error}}.

Accepted format: Plain text with Teams-supported basic formatting and line breaks. Keep the content concise enough for a busy channel.

Real workplace example: "Priority ticket {{$json.ticketId}} from {{$json.customerEmail}} needs manager review before 4 PM."

If it is empty or wrong: The node stops with a message-required error, or teammates receive an unclear alert that cannot be acted on.

Common mistake: Sending only "Workflow failed" without workflow name, record ID, error summary, or the team that owns the next step.`;

const serviceUrlHelpText = `What this field means: Service URL is the Bot Framework endpoint URL from a Microsoft Teams Trigger activity.

Why it matters: Bot Framework replies must be sent back to the service URL that delivered the original Teams activity.

When to fill it: Fill it when this node should reply to a Teams Trigger message or adaptive-card activity. Leave it blank for Incoming Webhook channel notifications.

What to enter: Usually map {{$json.serviceUrl}} from the Microsoft Teams Trigger output.

Where the value comes from: The Microsoft Teams Trigger normalizes incoming Bot Framework activities and exposes serviceUrl in the workflow data.

How to use it later: It is routing information for this reply only. Later nodes should inspect {{$json.success}}, {{$json.botReply}}, {{$json.teams}}, or {{$json._error}}.

Accepted format: HTTPS Bot Framework service URL. Runtime rejects values that are not HTTPS service URLs.

Real workplace example: A Teams support bot receives "summarize ticket TCK-1042" and this node maps {{$json.serviceUrl}} so the answer goes back through the same Bot Framework service.

If it is empty or wrong: The node falls back to Webhook URL if one is available, or returns the provide-webhook-or-serviceUrl error when neither send path is complete.

Common mistake: Typing your Teams channel URL or browser address here. Use the serviceUrl field from Microsoft Teams Trigger, not a human Teams link.`;

const conversationIdHelpText = `What this field means: Conversation ID identifies the Teams chat, personal conversation, channel thread, or activity conversation that should receive the Bot Framework reply.

Why it matters: Service URL tells the node where to call, while Conversation ID tells Teams which conversation to post into.

When to fill it: Fill it with Service URL when replying to a Microsoft Teams Trigger through a saved Microsoft Teams Bot connection. Leave it blank for webhook sends.

What to enter: Usually map {{$json.conversationId}} from Microsoft Teams Trigger.

Where the value comes from: Microsoft Teams Trigger output includes conversationId from the incoming Bot Framework activity.

How to use it later: The value is used to post the reply. Later nodes should use {{$json.teams}}, {{$json.botReply}}, and {{$json.success}} to confirm what happened.

Accepted format: Teams/Bot Framework conversation ID string, often beginning with 19: for channel or chat conversations.

Real workplace example: A helpdesk bot replies in the same personal Teams conversation by using {{$json.conversationId}} from the trigger.

If it is empty or wrong: The bot reply path cannot be used, or Teams can return a conversation-not-found or bot reply failed error.

Common mistake: Using a Team ID or Channel ID as the Conversation ID. For replies, use the trigger's conversationId exactly.`;

const replyToIdHelpText = `What this field means: Reply To Activity ID is the Teams activity ID to reply beneath or update in the original Bot Framework conversation.

Why it matters: It can keep bot responses attached to the user's original message instead of sending a separate message into the conversation.

When to fill it: Fill it when Microsoft Teams Trigger provides replyToId or activityId and the response should attach to that activity. Leave it blank to send a new bot message into the conversation.

What to enter: Map {{$json.replyToId}} from the trigger, or {{$json.activityId}} if that is the field available in your workflow output.

Where the value comes from: Microsoft Teams Trigger exposes replyToId and activityId from the incoming Teams activity.

How to use it later: Runtime uses it in the Bot Framework reply URL. Later workflow steps should inspect {{$json.botReply}}, {{$json.teams}}, and {{$json._error}} instead of reusing this value.

Accepted format: Bot Framework activity ID string from the Teams trigger.

Real workplace example: An AI Agent drafts an answer to a Teams question and this node uses {{$json.replyToId}} so the answer appears as a direct reply to the question.

If it is empty or wrong: Empty is valid and sends a new message into the conversation. A wrong value can return a bot reply failed error.

Common mistake: Pasting a Teams message permalink. Use the activity ID field from Microsoft Teams Trigger.`;

export const microsoftTeamsDoc: NodeDoc = {
  slug: 'microsoft_teams',
  displayName: 'Microsoft Teams',
  category: 'Communication',
  logoUrl: '/integrations-logos/Microsoft-Teams.svg',
  description: 'Send Microsoft Teams channel notifications through an Incoming Webhook or reply to Microsoft Teams Trigger messages through Bot Framework.',
  credentialType: 'Microsoft Teams Incoming Webhook URL or Microsoft Teams Bot connection',
  credentialSetupSteps: [
    'For simple channel notifications, create or select an Incoming Webhook for the exact Teams channel and save the webhook URL in Connections under Microsoft Teams when possible.',
    'Webhook URL can also be entered in the node field when your workspace policy allows it, but do not share it publicly because anyone with the URL can post to that channel.',
    'For replies to Microsoft Teams Trigger messages, save a Microsoft Teams Bot connection with Microsoft App ID and Microsoft App Password / client secret from the Azure Bot or app registration.',
    'Bot replies need Service URL and Conversation ID from the Microsoft Teams Trigger output. Reply To Activity ID is optional and keeps the reply attached to the original activity.',
    'The node does not use Microsoft Graph team or channel IDs for sending. Choose webhook fields for channel alerts, or Bot Framework fields for trigger replies.',
    'Connect the Microsoft Teams output to a logging, If/Else, error-handling, or follow-up node when later steps should inspect {{$json.success}}, {{$json.teams}}, {{$json.botReply}}, {{$json._error}}, or {{$json._errorDetails}}.',
    'Downstream service node account connection setup is still required for nodes after Microsoft Teams; the Teams webhook or bot connection only authorizes the Teams send.',
  ],
  credentialDocsUrl: 'https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/connectors-using',
  resources: [
    {
      name: 'Configuration',
      description: 'Choose either the Incoming Webhook path for a channel notification or the Bot Framework reply path for a Microsoft Teams Trigger response.',
      operations: [
        {
          name: 'Send Message',
          value: 'default',
          description: 'Sends one Microsoft Teams message. Use Webhook URL for simple channel alerts such as deployments, reports, escalations, and status notifications. Use Service URL plus Conversation ID with a Microsoft Teams Bot connection when the workflow is replying to a Teams Trigger activity.',
          fields: [
            {
              name: 'Webhook URL',
              internalKey: 'webhookUrl',
              type: 'url',
              required: false,
              description: 'Incoming Webhook URL for the Teams channel notification path.',
              helpText: webhookUrlHelpText,
              placeholder: 'https://outlook.office.com/webhook/...',
              example: '{{$json.teamsWebhookUrl}}',
              notes: 'Optional when using Service URL and Conversation ID for a Bot Framework reply. Prefer saving the URL in Connections.',
            },
            {
              name: 'Message',
              internalKey: 'message',
              type: 'textarea',
              required: true,
              description: 'Text to send to Microsoft Teams.',
              helpText: messageHelpText,
              placeholder: '{{$json.response || $json.text}}',
              example: 'Priority ticket {{$json.ticketId}} from {{$json.customerEmail}} needs manager review.',
              notes: 'Required for both webhook sends and bot replies.',
            },
            {
              name: 'Service URL',
              internalKey: 'serviceUrl',
              type: 'string',
              required: false,
              description: 'Bot Framework service URL from Microsoft Teams Trigger.',
              helpText: serviceUrlHelpText,
              placeholder: '{{$json.serviceUrl}}',
              example: '{{$json.serviceUrl}}',
              notes: 'Use with Conversation ID and a saved Microsoft Teams Bot connection for trigger replies.',
            },
            {
              name: 'Conversation ID',
              internalKey: 'conversationId',
              type: 'string',
              required: false,
              description: 'Teams conversation ID from Microsoft Teams Trigger.',
              helpText: conversationIdHelpText,
              placeholder: '{{$json.conversationId}}',
              example: '{{$json.conversationId}}',
              notes: 'Use the trigger output conversationId exactly; this is not the same as a Team ID or Channel ID.',
            },
            {
              name: 'Reply To Activity ID',
              internalKey: 'replyToId',
              type: 'string',
              required: false,
              description: 'Optional Teams activity ID for a direct Bot Framework reply.',
              helpText: replyToIdHelpText,
              placeholder: '{{$json.replyToId}}',
              example: '{{$json.replyToId}}',
              notes: 'Leave blank to post a new bot message in the conversation.',
            },
          ],
          outputExample: {
            ticketId: 'TCK-1042',
            customerEmail: 'asha.rao@example.com',
            success: true,
            teams: {
              id: '1784369000000',
              status: 200,
              response: '1',
            },
            botReply: true,
          },
          outputDescription: 'Webhook success keeps the incoming data and adds success: true plus teams.status and teams.response. Bot Framework reply success keeps the incoming data and adds success: true, teams with the Bot Framework response body, and botReply: true. Failures keep incoming data and add _error, and some failures add _errorDetails. Later nodes can use {{$json.success}}, {{$json.teams.status}}, {{$json.teams.response}}, {{$json.teams.id}}, {{$json.botReply}}, {{$json._error}}, or {{$json._errorDetails}}.',
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
          externalDocsUrl: 'https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Teams: message is required',
      cause: 'Message is blank after expressions resolve.',
      fix: 'Fill Message with clear text and confirm mapped fields such as {{$json.response}} or {{$json.text}} exist in the previous node output.',
    },
    {
      error: 'Teams: provide webhookUrl, or use serviceUrl/conversationId plus a Microsoft Teams Bot connection for trigger replies.',
      cause: 'The node does not have a complete webhook path or a complete Bot Framework reply path.',
      fix: 'For a channel alert, provide or save Webhook URL. For a trigger reply, map {{$json.serviceUrl}} and {{$json.conversationId}} and select a Microsoft Teams Bot connection.',
    },
    {
      error: 'Teams bot token failed',
      cause: 'The Microsoft Teams Bot connection has a missing, expired, or wrong Microsoft App ID or App Password / client secret.',
      fix: 'Open Connections, update the Microsoft Teams Bot connection, and confirm the Azure Bot or app registration credentials.',
    },
    {
      error: 'Teams: serviceUrl must be an HTTPS Bot Framework service URL.',
      cause: 'Service URL is blank, copied from a browser Teams link, or not an HTTPS Bot Framework endpoint.',
      fix: 'Map {{$json.serviceUrl}} directly from Microsoft Teams Trigger.',
    },
    {
      error: 'Teams bot reply failed',
      cause: 'Teams rejected the Bot Framework reply because the conversation ID, reply activity ID, app credentials, or bot installation is wrong.',
      fix: 'Use {{$json.conversationId}} and {{$json.replyToId}} from the trigger, confirm the bot is installed in the chat or team, and check _errorDetails.',
    },
    {
      error: 'Teams webhook failed',
      cause: 'Microsoft Teams rejected the Incoming Webhook request or the webhook URL is invalid, revoked, incomplete, or for the wrong channel.',
      fix: 'Create a fresh Incoming Webhook URL for the target channel, save it in Connections or paste the complete URL, and run a short test message.',
    },
    {
      error: 'Teams error',
      cause: 'The request could not be sent to Microsoft Teams because of network, DNS, TLS, or tenant connector problems.',
      fix: 'Check the webhook URL, network access, tenant connector policy, and whether Teams webhooks are still enabled for the channel.',
    },
    {
      error: 'Next node cannot find Teams send result',
      cause: 'The downstream node is reading old fields instead of the runtime output.',
      fix: 'Use {{$json.success}} for send state, {{$json.teams.status}} or {{$json.teams.response}} for webhook responses, {{$json.botReply}} for trigger replies, and {{$json._error}} for failures.',
    },
    {
      error: 'Permission denied after Microsoft Teams',
      cause: 'Microsoft Teams credentials only authorize the Teams send; a downstream CRM, email, database, file, or ticket node still needs its own account connection and permission.',
      fix: 'Connect the required account on the downstream service node and confirm that provider permission separately from the Teams webhook or bot connection.',
    },
  ],
  relatedNodes: ['microsoft_teams_trigger', 'slack_message', 'email', 'discord', 'http_request'],
};
