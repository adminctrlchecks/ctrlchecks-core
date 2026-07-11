import type { NodeDoc } from '../types';

export const slackWebhookDoc: NodeDoc = {
  slug: 'slack_webhook',
  displayName: 'Slack Webhook',
  category: 'Communication',
  logoUrl: '/icons/nodes/slack_webhook.svg',
  description: 'Send simple messages through a Slack Incoming Webhook.',
  credentialType: 'Slack Incoming Webhook',
  credentialSetupSteps: [
    'What this is: A Slack Incoming Webhook connection stores the webhook URL securely outside normal workflow fields.',
    'Where to start: Open api.slack.com/apps, select or create an app, then open Incoming Webhooks.',
    'Turn Activate Incoming Webhooks on, click Add New Webhook to Workspace, choose the target channel, and click Allow.',
    'Copy the URL that starts with https://hooks.slack.com/services/ and save it in CtrlChecks -> Connections -> Add Connection -> Slack Incoming Webhook.',
    'Use Slack Webhook for simple channel-bound notifications. Use Slack for OAuth bot messages, channel targeting, and Block Kit payloads.',
  ],
  credentialDocsUrl: 'https://api.slack.com/messaging/webhooks',
  resources: [
    {
      name: 'Configuration',
      description: 'Slack Webhook sends through the selected Slack Incoming Webhook connection.',
      operations: [
        {
          name: 'Execute',
          value: 'default',
          description: 'Send a simple text payload to the channel configured by the saved webhook.',
          fields: [
            {
              name: 'Message',
              internalKey: 'message',
              type: 'textarea',
              required: true,
              description: 'Message text to send through the selected Incoming Webhook.',
              helpText: 'Type the message text or use values from earlier workflow steps. Slack markdown such as *bold* and `code` is supported.',
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
          outputDescription: 'status is sent or failed. id is Slack webhook response text when available. message is the resolved text sent to Slack.',
          usageExample: {
            scenario: 'Post a quick alert to a fixed Slack channel',
            inputValues: {
              message: 'New sign-up: {{$json.email}} at {{$now}}',
            },
            expectedOutput: 'The message appears in the Slack channel selected when the Incoming Webhook was created.',
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
      error: 'invalid_payload',
      cause: 'The message resolved to an invalid or empty Slack webhook payload.',
      fix: 'Fill the Message field and verify any template variables resolve to text.',
    },
    {
      error: 'wrong channel',
      cause: 'Incoming Webhooks are bound to the channel selected during Slack setup.',
      fix: 'Create and select a different Slack Incoming Webhook connection for the desired channel.',
    },
  ],
  relatedNodes: ['slack_message'],
};
