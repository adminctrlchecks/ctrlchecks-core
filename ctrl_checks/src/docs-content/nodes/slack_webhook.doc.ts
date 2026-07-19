import type { NodeDoc } from '../types';

const messageHelpText = `What this field means: Message is the plain text posted to Slack through the saved Incoming Webhook.

Why it matters: It is the only field this node has — Slack rejects the webhook call without message content.

When to fill it: Always required.

What to enter: Type fixed text or map content from a previous step, such as {{$json.message}} or an alert summary.

Where the value comes from: Use trigger data, monitoring alerts, form submissions, or any prior workflow step's text output.

How to use it later: Important limitation: unlike most other nodes, Slack Webhook does not carry forward the data that was flowing into it — its output replaces {{$json}} entirely with {{$json.id}}, {{$json.status}}, {{$json.provider}}, and {{$json.message}} (the text that was sent). Fields such as {{$json.customerEmail}} that existed before this node will not exist after it.

Accepted format: Plain text with Slack markdown (*bold*, _italic_, \`code\`), up to Slack's message size limits.

Real workplace example: "New sign-up: {{$json.email}} at {{$now}}"

If it is empty or wrong: Runtime returns "Slack Webhook node: Message text is required" before calling Slack.

Common mistake: Adding a node after Slack Webhook that expects earlier upstream fields (like {{$json.orderId}}) to still be present — capture anything needed later in a Set/Edit Fields node before this one, since Slack Webhook's output does not include them.`;

export const slackWebhookDoc: NodeDoc = {
  slug: 'slack_webhook',
  displayName: 'Slack Webhook',
  category: 'Communication',
  logoUrl: '/icons/nodes/slack_webhook.svg',
  description: 'Send a simple text message to a fixed Slack channel through a saved Incoming Webhook URL, with no bot setup required.',
  credentialType: 'Slack Incoming Webhook',
  credentialSetupSteps: [
    'What this is: A Slack Incoming Webhook connection stores the webhook URL securely outside normal workflow fields.',
    'Where to start: Open api.slack.com/apps, select or create an app, then open Incoming Webhooks.',
    'Turn Activate Incoming Webhooks on, click Add New Webhook to Workspace, choose the target channel, and click Allow.',
    'Copy the URL that starts with https://hooks.slack.com/services/ and save it in CtrlChecks -> Connections -> Add Connection -> Slack Incoming Webhook. Do not paste the webhook URL into normal workflow fields; anyone with the URL can post to that channel.',
    'Use Slack Webhook for simple, fixed-channel notifications. Use Slack Message for OAuth bot messages, dynamic channel targeting, thread replies, and Block Kit payloads.',
    'Connect the Slack Webhook output to a logging, If/Else, or follow-up node when later steps should inspect {{$json.status}} or {{$json.error}} — remember its output replaces $json entirely rather than adding to it.',
    'Downstream service node account connection setup is still required for nodes after Slack Webhook; the saved webhook URL only authorizes posting to that one Slack channel.',
  ],
  credentialDocsUrl: 'https://api.slack.com/messaging/webhooks',
  resources: [
    {
      name: 'Configuration',
      description: 'Slack Webhook sends a single text message through the selected Slack Incoming Webhook connection; no bot token, channel selection, or Block Kit payload is supported by this node.',
      operations: [
        {
          name: 'Execute',
          value: 'default',
          description: 'Sends Message as plain text to the channel configured by the saved Slack Incoming Webhook. Note that on both success and failure, this node replaces $json entirely rather than adding fields to the existing data.',
          fields: [
            {
              name: 'Message',
              internalKey: 'message',
              type: 'textarea',
              required: true,
              description: 'Message text to send through the selected Incoming Webhook.',
              helpText: messageHelpText,
              placeholder: 'New sign-up: {{$json.email}}',
              example: 'New sign-up: {{$json.email}}',
            },
          ],
          outputExample: {
            id: 'ok',
            status: 'sent',
            provider: 'slack_webhook',
            message: 'New sign-up: customer@example.com',
          },
          outputDescription: 'id: Slack\'s literal webhook response body, "ok" on success. status: sent on success, failed on failure — there is no _error field with an underscore prefix like most other nodes use; a failure instead sets status to failed and adds a plain error field (no underscore) with the failure message. provider: always "slack_webhook". message: the exact text that was sent. This node\'s output completely replaces incoming $json data; no upstream fields survive past this node.',
          usageExample: {
            scenario: 'Post a quick alert to a fixed Slack channel',
            inputValues: {
              message: 'New sign-up: {{$json.email}} at {{$now}}',
            },
            expectedOutput: 'The message appears in the Slack channel selected when the Incoming Webhook was created. Use {{$json.status}} to confirm delivery in the very next node, since {{$json.email}} and other prior fields are gone after this node.',
          },
          externalDocsUrl: 'https://api.slack.com/messaging/webhooks',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Slack Webhook node: Webhook URL is required',
      cause: 'No Slack Incoming Webhook connection was selected or available for the node.',
      fix: 'Create a Slack Incoming Webhook connection in CtrlChecks Connections, then select it on the node.',
    },
    {
      error: 'Slack Webhook node: Message text is required',
      cause: 'Message resolved to an empty string before runtime attempted to call Slack.',
      fix: 'Fill Message or map {{$json.message}} or another upstream text field.',
    },
    {
      error: 'Slack API error: <status> <statusText> - <body>',
      cause: 'Slack rejected the webhook request — commonly a 404 for a deleted/regenerated webhook, or a malformed payload.',
      fix: 'Recreate the Incoming Webhook in Slack if it was deleted, and confirm Message resolves to non-empty text.',
    },
    {
      error: 'Next node cannot find fields that existed before Slack Webhook',
      cause: 'This node\'s output is {id, status, provider, message} only — it does not spread the incoming data through like almost every other node in this product.',
      fix: 'Capture any fields you need later (like {{$json.customerEmail}}) in a Set/Edit Fields node before this one, or branch with Merge to keep the original data alongside the Slack result.',
    },
    {
      error: 'Downstream node checks {{$json._error}} and finds nothing on failure',
      cause: 'Slack Webhook uses a plain error field (no underscore) on failure, unlike most nodes\' _error convention.',
      fix: 'Check {{$json.status}} === "failed" and {{$json.error}} (no underscore) instead of {{$json._error}}.',
    },
    {
      error: 'Permission denied after Slack Webhook',
      cause: 'The saved webhook URL only authorizes posting to its one Slack channel; downstream service nodes still need their own account connections and permissions.',
      fix: 'Connect the required account on the downstream service node and confirm that provider permission separately from Slack Webhook.',
    },
  ],
  relatedNodes: ['slack_message', 'discord_webhook', 'microsoft_teams'],
};
