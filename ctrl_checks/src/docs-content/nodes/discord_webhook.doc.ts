import type { NodeDoc } from '../types';

const messageHelpText = `What this field means: Message is the text content posted to the Discord channel through the saved webhook.

Why it matters: It is the only required field; Discord webhooks reject the request without message content.

When to fill it: Always required.

What to enter: Type fixed text or map content from a previous step, such as {{$json.message}} or {{$json.summary}}.

Where the value comes from: Use trigger data, AI Agent output, monitoring alerts, or CI/CD pipeline results from earlier workflow steps.

How to use it later: The sent text is echoed back at {{$json.message}}, and delivery status is available at {{$json.discord_webhook.status}} and {{$json.sent}}.

Accepted format: Plain text with Discord markdown (**bold**, *italic*, \`code\`, ||spoiler||), up to Discord's 2000-character message limit.

Real workplace example: "New commit by {{$json.author}}: {{$json.commitMessage}}"

If it is empty or wrong: Runtime returns "Discord Webhook: webhookUrl and message are required" before calling Discord.

Common mistake: Leaving Message blank while expecting Username or Avatar URL alone to produce a visible notification.`;

const usernameHelpText = `What this field means: Username lets this one webhook message display a different sender name than the webhook's saved default name.

Why it matters: It helps teammates tell which system or workflow sent a given alert when one webhook URL is shared across several automations.

When to fill it: Optional. Fill it when this message should show a sender name different from the webhook's configured default.

What to enter: A short display name such as "CI Bot" or "CtrlChecks Alerts".

Where the value comes from: This is usually a fixed workflow design choice, or map a dynamic label such as {{$json.sourceSystem}}.

How to use it later: This only changes how the message appears in Discord; it is not echoed back in the node's own output fields.

Accepted format: Plain text, no Discord markdown.

Real workplace example: Use "Build Bot" for CI alerts and "Support Bot" for customer alerts through the same shared webhook URL.

If it is empty or wrong: If left empty, Discord uses the webhook's saved default name instead.

Common mistake: Expecting this to rename the webhook permanently. It only overrides the display name for this one message.`;

const avatarUrlHelpText = `What this field means: Avatar URL overrides the sender's profile picture for this one webhook message.

Why it matters: It gives a message a distinct visual identity, similar to Username, which helps when several automations share one webhook.

When to fill it: Optional. Fill it only when this message should show a different avatar than the webhook's saved default.

What to enter: A direct public image URL (JPG, PNG, or GIF), such as https://example.com/bot-avatar.png.

Where the value comes from: Use a hosted logo, CDN asset, or company brand image URL.

How to use it later: This only changes message appearance in Discord; it is not echoed back in the node's own output fields.

Accepted format: A public HTTPS URL that points directly to an image file, not a webpage.

Real workplace example: Show a warning icon avatar for outage alerts and a checkmark avatar for successful deploy notifications from the same webhook.

If it is empty or wrong: If left empty or invalid, Discord falls back to the webhook's saved default avatar.

Common mistake: Using a page URL such as a Google Drive share link instead of a direct image file URL. Discord cannot render a preview page as an avatar.`;

export const discordWebhookDoc: NodeDoc = {
  slug: 'discord_webhook',
  displayName: 'Discord Webhook',
  category: 'Communication',
  logoUrl: '/integrations-logos/Discord.svg',
  description: 'Send messages to a Discord channel via a saved incoming webhook URL, with no bot setup required.',
  credentialType: 'Discord Webhook URL - saved in Connections and used to post to one Discord channel',
  credentialSetupSteps: [
    'In Discord, right-click the target channel -> Edit Channel -> Integrations -> Webhooks -> New Webhook, then copy the Webhook URL and save it in Connections as a Discord Webhook URL.',
    'The webhook URL is stored in the credential system. Do not paste the webhook URL into normal Discord workflow fields; anyone with the URL can post to that channel.',
    'Creating or editing a webhook requires the Manage Webhooks permission in that Discord server, or server ownership.',
    'Use Username and Avatar URL only to override the display name or avatar for a single message; leave them blank to use the webhook\'s saved defaults.',
    'Connect the Discord Webhook output to a logging, If/Else, or follow-up node when later steps should inspect {{$json.success}}, {{$json.sent}}, {{$json.discord_webhook}}, or {{$json._error}}.',
    'Downstream service node account connection setup is still required for nodes after Discord Webhook; the saved webhook URL only authorizes posting to that one Discord channel.',
  ],
  credentialDocsUrl: 'https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks',
  resources: [
    {
      name: 'Configuration',
      description: 'Discord Webhook uses a saved webhook URL connection plus message fields; no bot token or channel ID is needed.',
      operations: [
        {
          name: 'Send Webhook Message',
          value: 'default',
          description: 'Posts a message to Discord through a saved incoming webhook URL. Discord returns HTTP 204 with an empty body on success, so runtime reports delivery through success and status fields instead of a message object.',
          fields: [
            { name: 'Message', internalKey: 'message', type: 'textarea', required: true, description: 'Message text.', helpText: messageHelpText, placeholder: '{{$json.message}}', example: 'Hello from CtrlChecks!' },
            { name: 'Username', internalKey: 'username', type: 'string', required: false, description: 'Optional sender name override for this webhook message.', helpText: usernameHelpText, placeholder: 'CtrlChecks Bot', example: 'CtrlChecks Bot' },
            { name: 'Avatar Url', internalKey: 'avatarUrl', type: 'url', required: false, description: 'Optional sender avatar URL override for this webhook message.', helpText: avatarUrlHelpText, placeholder: 'https://example.com/avatar.png', example: 'https://example.com/avatar.png' },
          ],
          outputExample: {
            success: true,
            sent: true,
            message: 'New commit by dev-alex: Fix login redirect bug',
            discord_webhook: { status: 204, delivered: true },
          },
          outputDescription: 'success: true when the webhook call completed without error. sent: true confirms the message was dispatched. message: the exact text that was sent, echoed back for confirmation. discord_webhook.status: the HTTP status Discord returned (204 means accepted with no body, by Discord\'s webhook design). discord_webhook.delivered: true once Discord accepts the payload. Failures keep incoming data and add _error, with _errorDetails containing the raw Discord response text.',
          usageExample: {
            scenario: 'Post GitHub commit notifications to a #dev-activity Discord channel',
            inputValues: {
              message: 'New commit by {{$json.author}}: {{$json.commitMessage}}',
              username: 'GitHub Bot',
              avatarUrl: 'https://cdn.example.com/github-icon.png',
            },
            expectedOutput: 'The message appears in the Discord channel under the "GitHub Bot" name. Use {{$json.success}} and {{$json.discord_webhook.status}} to confirm delivery in a later node.',
          },
          externalDocsUrl: 'https://discord.com/developers/docs/resources/webhook',
        },
      ],
    },
  ],
  commonErrors: [
    { error: 'Discord Webhook: webhookUrl and message are required', cause: 'No webhook URL was found in the saved connection and Message resolved to empty.', fix: 'Save a Discord Webhook URL connection, select it on the node, and fill Message.' },
    { error: 'Discord webhook failed', cause: 'Discord rejected the webhook request, commonly a 404 for a deleted webhook, 401 for an invalid URL, or 429 for rate limiting.', fix: 'Check _errorDetails for the Discord response, recreate the webhook if it was deleted, and slow down high-volume sends.' },
    { error: 'Discord webhook error', cause: 'The request could not be sent because of network, DNS, TLS, or Discord API availability issues.', fix: 'Retry later and verify the worker has outbound network access to discord.com.' },
    { error: 'Next node cannot find webhook delivery status', cause: 'The downstream node is reading a field that does not exist instead of the normalized output.', fix: 'Use {{$json.success}}, {{$json.sent}}, and {{$json.discord_webhook.status}} rather than expecting a Discord message object.' },
    { error: 'Permission denied after Discord Webhook', cause: 'The saved webhook URL only authorizes posting to its one Discord channel; downstream service nodes still need their own account connections and permissions.', fix: 'Connect the required account on the downstream service node and confirm that provider permission separately from Discord Webhook.' },
  ],
  relatedNodes: ['discord', 'discord_trigger', 'slack_message', 'telegram', 'http_request'],
};
