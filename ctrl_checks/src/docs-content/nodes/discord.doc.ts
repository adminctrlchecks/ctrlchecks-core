import type { NodeDoc } from '../types';

const channelIdHelpText = `What this field means: Channel ID is the Discord text channel where the bot should post this message.

Why it matters: The Discord Bot API needs the exact channel ID to know where to deliver the message when sending as a normal channel post.

When to fill it: Fill it whenever the bot is posting into a server channel. Leave it blank only when replying to a slash command or component using Interaction Token plus Application ID instead.

What to enter: A numeric Discord channel ID, or map {{$json.channelId}} from a Discord Trigger event so the reply lands in the same channel.

Where the value comes from: Enable Developer Mode in Discord (User Settings -> Advanced -> Developer Mode), then right-click the target channel and choose Copy Channel ID.

How to use it later: Runtime does not echo channelId as its own top-level output field, but the sent message object returned at {{$json.discord}} includes channel_id from Discord's API response.

Accepted format: A 17-19 digit numeric string.

Real workplace example: Post automated build status into a fixed #ci-notifications channel, or reply into {{$json.channelId}} after a Discord Trigger event.

If it is empty or wrong: With no Channel ID and no Interaction Token/Application ID pair, runtime returns "Discord: channelId is required when using Bot API. Add your Discord channel ID in the Properties Panel." A wrong ID makes Discord's API reject the send.

Common mistake: Pasting a server (guild) ID or a message ID here instead of the channel ID.`;

const messageHelpText = `What this field means: Message is the text content the Discord bot will post, on either the channel path or the interaction-reply path.

Why it matters: This is the only field runtime requires no matter which Discord send path is used.

When to fill it: Always required.

What to enter: Type plain text or Discord markdown, or map content from an earlier step such as {{$json.response}} or {{$json.text}}.

Where the value comes from: Use AI Agent output, form submissions, monitoring alerts, or any prior workflow step's text output.

How to use it later: Discord's own message object is returned at {{$json.discord}} (with content, id, and timestamp), and success is available at {{$json.success}}.

Accepted format: Plain text supporting Discord markdown (**bold**, *italic*, \`code\`, ||spoiler||) up to Discord's 2000-character message limit.

Real workplace example: "New high-priority ticket {{$json.ticketId}} from {{$json.customerEmail}} needs review."

If it is empty or wrong: Runtime returns "Discord: message is required" before attempting any Discord API call.

Common mistake: Leaving Message blank while only filling Channel ID, expecting the node to send a placeholder notification.`;

const interactionTokenHelpText = `What this field means: Interaction Token is the short-lived token Discord issues for one specific slash command or component interaction, letting the bot reply to that exact interaction instead of posting a brand-new channel message.

Why it matters: When both Interaction Token and Application ID are present, runtime skips the Bot API channel path entirely and calls Discord's interaction follow-up webhook instead, so no bot token or channel ID is needed for that path.

When to fill it: Fill it only when replying to a Discord Trigger event that came from a slash command, button, or modal interaction.

What to enter: Map {{$json.interactionToken}} from the Discord Trigger node's output. Do not type this by hand, since Discord generates it per interaction and it expires after 15 minutes.

Where the value comes from: Discord Trigger normalizes the incoming interaction payload and exposes interactionToken in its output.

How to use it later: A successful interaction reply sets {{$json.interactionReply}} to true and returns Discord's response body at {{$json.discord}}.

Accepted format: The raw token string Discord sends with the interaction payload.

Real workplace example: A support bot receives a /support slash command via Discord Trigger, then this node replies using {{$json.interactionToken}} and {{$json.applicationId}} without needing a stored bot token.

If it is empty or wrong: Leaving it blank makes runtime fall back to the Bot API channel path (Channel ID plus Bot Token). An expired or wrong token makes Discord return "Discord interaction reply failed", with the API status code recorded in {{$json._errorDetails}}.

Common mistake: Trying to reuse an interaction token after Discord's 15-minute expiry window, or pairing it with the wrong Application ID from a different bot.`;

const applicationIdHelpText = `What this field means: Application ID identifies which Discord application (bot) owns the interaction being replied to.

Why it matters: Discord's interaction follow-up endpoint URL requires both Application ID and Interaction Token together; the reply path only activates when both are present.

When to fill it: Fill it together with Interaction Token, only for slash command or component follow-up replies.

What to enter: Map {{$json.applicationId}} from Discord Trigger, or paste the fixed Application ID shown in the Discord Developer Portal General Information page.

Where the value comes from: Discord Trigger output, or discord.com/developers/applications -> your app -> General Information -> Application ID.

How to use it later: This value is not echoed back in the node's own output, but a successful reply is confirmed by {{$json.success}} and {{$json.interactionReply}}.

Accepted format: A numeric Discord application (snowflake) ID.

Real workplace example: An AI Agent drafts a reply, then this node uses {{$json.applicationId}} and {{$json.interactionToken}} from the same Discord Trigger event to post back to that interaction.

If it is empty or wrong: If Application ID is missing while Interaction Token is filled, or the reverse, runtime does not use the interaction-reply path at all and instead falls through to the Bot API channel path, which then needs Channel ID and a Bot Token.

Common mistake: Filling Application ID alone without Interaction Token, or the reverse. Both are required together for the reply path to activate.`;

const replyToMessageIdHelpText = `What this field means: Reply To Message ID tells Discord which existing channel message this new bot message should visually reply to, when sending through the Channel ID plus Bot Token path.

Why it matters: It keeps a bot's answer attached to the original message in the channel instead of appearing as an unrelated new message.

When to fill it: Optional. Fill it only when sending via Channel ID plus Bot Token and the message should reply to a specific earlier message.

What to enter: Map {{$json.messageId}} from a Discord Trigger event or the id field of a previous Discord send's output.

Where the value comes from: Discord Trigger output, or the id field inside a previous Discord node's {{$json.discord}} output.

How to use it later: This only changes how the message displays in Discord; check {{$json.discord}} on this node's own run for the new message's id.

Accepted format: A numeric Discord message (snowflake) ID.

Real workplace example: A bot answers a customer question and replies directly to the customer's original message using {{$json.messageId}}.

If it is empty or wrong: Leaving it empty sends a normal, non-reply message. This field is silently ignored on the interaction-reply path; it only applies to the Bot API channel path.

Common mistake: Setting this field while also using Interaction Token and Application ID, expecting it to affect the interaction reply. It only works on the Channel ID plus Bot Token path.`;

export const discordDoc: NodeDoc = {
  slug: 'discord',
  displayName: 'Discord',
  category: 'Communication',
  logoUrl: '/integrations-logos/Discord.svg',
  description: 'Send messages to Discord channels via a Discord bot token, or reply to a Discord slash command / component interaction using an interaction token.',
  credentialType: 'Discord Bot Token - saved in Connections and used for Discord Bot API calls',
  credentialSetupSteps: [
    'Create or open a Discord application at discord.com/developers/applications, add a Bot, and copy the Bot Token from the Bot page; save it in Connections as a Discord Bot Token.',
    'The bot token is stored in the credential system. Do not paste botToken, apiKey, or token into normal Discord workflow fields.',
    'Invite the bot to your server using OAuth2 -> URL Generator with the bot scope and Send Messages permission, then authorize it for the target server.',
    'Enable Developer Mode in Discord (User Settings -> Advanced -> Developer Mode), then right-click a channel to copy its Channel ID for the Channel ID field.',
    'For slash-command or component replies via Discord Trigger, also save Application ID and Public Key on the same Discord connection so signature validation and interaction replies work.',
    'Connect the Discord output to a logging, If/Else, error-handling, or follow-up node when later steps should inspect {{$json.success}}, {{$json.discord}}, {{$json.interactionReply}}, or {{$json._error}}.',
    'Downstream service node account connection setup is still required for nodes after Discord; the Discord Bot Token only authorizes Discord sends.',
  ],
  credentialDocsUrl: 'https://discord.com/developers/docs/getting-started',
  resources: [
    {
      name: 'Configuration',
      description: 'Send a Discord message either as a bot post into a channel, or as a follow-up reply to a slash command / component interaction.',
      operations: [
        {
          name: 'Send Bot Message',
          value: 'default',
          description: 'Sends a message to Discord. If Interaction Token and Application ID are both filled, runtime replies to that Discord interaction directly (no bot token or channel ID needed). Otherwise runtime posts the message to Channel ID using the saved Discord Bot Token, optionally as a reply to Reply To Message ID.',
          fields: [
            { name: 'Channel Id', internalKey: 'channelId', type: 'string', required: false, description: 'Discord channel ID where the bot should post the message.', helpText: channelIdHelpText, placeholder: '{{$json.channelId}}', example: '123456789012345678' },
            { name: 'Message', internalKey: 'message', type: 'textarea', required: true, description: 'Message text to send.', helpText: messageHelpText, placeholder: '{{$json.response || $json.text}}', example: 'Hello from workflow!' },
            { name: 'Interaction Token', internalKey: 'interactionToken', type: 'string', required: false, description: 'Discord interaction token for slash command/component follow-up replies.', helpText: interactionTokenHelpText, placeholder: '{{$json.interactionToken}}', example: '{{$json.interactionToken}}' },
            { name: 'Application Id', internalKey: 'applicationId', type: 'string', required: false, description: 'Discord application ID for interaction follow-up replies.', helpText: applicationIdHelpText, placeholder: '{{$json.applicationId}}', example: '{{$json.applicationId}}' },
            { name: 'Reply To Message Id', internalKey: 'replyToMessageId', type: 'string', required: false, description: 'Optional Discord message ID to reply to when using the Bot API channel path.', helpText: replyToMessageIdHelpText, placeholder: '{{$json.messageId}}', example: '{{$json.messageId}}' },
          ],
          outputExample: {
            success: true,
            discord: {
              id: '1234567890123456789',
              type: 0,
              content: 'Build #42 passed',
              channel_id: '987654321098765432',
              author: { id: '111122223333444455', username: 'CtrlChecks Bot', bot: true },
              timestamp: '2025-01-15T11:00:00.000000+00:00',
              mentions: [],
              attachments: [],
              embeds: [],
            },
          },
          outputDescription: 'success: true when Discord accepted the message. discord: the raw Discord API message object, including discord.id (the new message ID), discord.channel_id, discord.content, discord.author, and discord.timestamp. When Interaction Token and Application ID were used instead of Channel ID, runtime also adds interactionReply: true and discord contains Discord\'s interaction follow-up response body. Failures keep incoming data and add _error, with _errorDetails containing the Discord API error body.',
          usageExample: {
            scenario: 'Post CI/CD build status to a #ci-notifications Discord channel using the bot',
            inputValues: {
              channelId: '{{$json.channelId}}',
              message: '{{$json.status === "pass" ? "Build passed" : "Build failed"}} - Build #{{$json.buildNumber}}',
              interactionToken: '',
              applicationId: '',
              replyToMessageId: '',
            },
            expectedOutput: 'The message appears in the Discord channel. Use {{$json.discord.id}} to reference or reply to this message from a later step, and {{$json.success}} to confirm delivery.',
          },
          externalDocsUrl: 'https://discord.com/developers/docs/resources/message',
        },
      ],
    },
  ],
  commonErrors: [
    { error: 'Discord: message is required', cause: 'Message resolved to an empty string before runtime attempted any Discord API call.', fix: 'Fill Message or map {{$json.response}}, {{$json.text}}, or another upstream text field.' },
    { error: 'Discord: Connect a Discord Bot Token credential, then select it in the Properties Panel.', cause: 'No Discord Bot Token connection was found and Interaction Token/Application ID were not both provided.', fix: 'Create or reconnect Discord in Connections, save the Bot Token from the Discord Developer Portal, and select that connection on the Discord node.' },
    { error: 'Discord: channelId is required when using Bot API. Add your Discord channel ID in the Properties Panel.', cause: 'A Bot Token was found but Channel ID is blank and Interaction Token/Application ID were not both provided.', fix: 'Enable Developer Mode in Discord, right-click the target channel, choose Copy Channel ID, and paste it into Channel ID, or map {{$json.channelId}} from Discord Trigger.' },
    { error: 'Discord send failed', cause: 'Discord\'s Bot API rejected the channel message, commonly because the bot is missing Send Messages permission, is not a member of the server, or the channel ID is wrong.', fix: 'Check _errorDetails for the Discord API status code, confirm the bot was invited with Send Messages permission, and verify Channel ID.' },
    { error: 'Discord interaction reply failed', cause: 'The interaction follow-up request was rejected, commonly because Interaction Token expired (15-minute limit) or Application ID does not match the token.', fix: 'Reply sooner after the triggering interaction, and confirm Application ID matches the same Discord app that issued the Interaction Token.' },
    { error: 'Discord error', cause: 'The request could not be sent because of network, DNS, TLS, or Discord API availability issues.', fix: 'Retry later and verify the worker has outbound network access to discord.com.' },
    { error: 'Next node cannot find Discord message', cause: 'The downstream node is reading a field that does not exist instead of the normalized output.', fix: 'Use {{$json.discord.id}}, {{$json.discord.content}}, or {{$json.discord.channel_id}} from the Discord API message object, and {{$json.success}} to confirm delivery.' },
    { error: 'Permission denied after Discord', cause: 'The Discord Bot Token only authorizes Discord sends; downstream service nodes still need their own account connections and permissions.', fix: 'Connect the required account on the downstream service node and confirm that provider permission separately from Discord.' },
  ],
  relatedNodes: ['discord_trigger', 'discord_webhook', 'ai_agent', 'slack_message', 'telegram'],
};
