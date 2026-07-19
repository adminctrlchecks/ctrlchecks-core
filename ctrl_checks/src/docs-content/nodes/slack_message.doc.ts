import type { NodeDoc } from '../types';

const channelHelpText = `What this field means: Channel is the Slack destination where the bot should post the message.

Why it matters: Slack needs a real channel ID, channel name, or user ID before chat.postMessage can deliver through an OAuth bot token.

When to fill it: Fill it for normal Slack OAuth bot sends. Runtime returns an error when using a Slack OAuth bot token without a channel.

What to enter: Enter a public channel name such as #alerts, a stable channel ID such as C01234ABCDE, or a user ID for a direct message when your Slack app permissions allow it.

Where the value comes from: Copy channel IDs from Slack channel details, map {{$json.channelId}} from a Slack Trigger, or use a fixed channel chosen by your operations, support, sales, finance, or engineering team.

How to use it later: Successful OAuth sends return the channel as {{$json.channel}}. Use it in logs, follow-up Slack messages, or support notes to show where the notification went.

Accepted format: Slack channel name with #, Slack channel ID starting with C, G, or D, or a mapped expression such as {{$json.channelId}}.

Real workplace example: A Slack Trigger receives an app mention in channel C07OPS123. Set Channel to {{$json.channelId}} so the workflow replies in the same channel.

If it is empty or wrong: Runtime can return "Slack Message node: channel is required when using Slack OAuth bot token" or Slack can return channel_not_found, not_in_channel, or invalid_channel.

Common mistake: Using a private channel name before inviting the bot. In private channels, invite the connected Slack bot first with /invite @YourBotName or use the stable channel ID.`;

const messageHelpText = `What this field means: Message is the Slack text sent as the main message or fallback notification text.

Why it matters: People see this text in Slack notifications, mobile previews, search results, and as the fallback when Blocks are used.

When to fill it: Fill it for every Slack Message node. Backend requires message, and even Block Kit messages should include readable fallback text.

What to enter: Write the short workplace notification, summary, alert, reply, or report text. Include mapped values from earlier steps when useful, such as order ID, customer email, ticket status, deployment version, or approval link.

Where the value comes from: Combine fixed wording with workflow data from triggers, forms, CRMs, databases, API calls, AI summaries, error handlers, or Slack Trigger payloads.

How to use it later: Runtime returns the sent message text as {{$json.message}} on successful OAuth sends, plus identifiers such as {{$json.ts}} and {{$json.id}}.

Accepted format: Plain text with Slack mrkdwn formatting such as *bold*, _italic_, \`code\`, links, line breaks, and workflow expressions such as {{$json.customerEmail}}.

Real workplace example: "New urgent ticket {{$json.ticketId}} from {{$json.customerEmail}}: {{$json.summary}}" sent to #support-alerts.

If it is empty or wrong: The backend-required field is missing. Runtime may fall back to a generic message only in some paths, which makes Slack alerts hard to understand.

Common mistake: Putting all important content only inside Blocks and leaving Message blank. Keep Message meaningful so notifications, accessibility tools, and fallback views still work.`;

const threadTsHelpText = `What this field means: Thread Timestamp tells Slack which existing message thread should receive this reply.

Why it matters: Threaded replies keep workflow responses attached to the original question, alert, approval, or incident message instead of creating noisy new channel posts.

When to fill it: Fill it when responding to a Slack Trigger event, app mention, slash command, or earlier Slack message that includes a thread timestamp or message timestamp.

What to enter: Enter the Slack thread timestamp, usually from {{$json.threadTs}}, {{$json.thread_ts}}, or {{$json.messageTs}} depending on the trigger output.

Where the value comes from: Use the output of Slack Trigger or a previous Slack Message step. For a new top-level post, leave this field empty.

How to use it later: OAuth sends return the thread timestamp as {{$json.threadTs}} when supplied, so later messages can continue the same thread.

Accepted format: Slack timestamp string such as 1704067200.123456, or a workflow expression resolving to that string.

Real workplace example: A Slack app mention asks "summarize this ticket". Set Channel to {{$json.channelId}} and Thread Timestamp to {{$json.threadTs}} so the AI summary appears in the original thread.

If it is empty or wrong: Empty posts a new top-level message. A wrong timestamp can fail or post somewhere unexpected depending on Slack API behavior.

Common mistake: Using a human date or message permalink instead of Slack's timestamp value. Use the timestamp field from Slack Trigger output.`;

const blocksHelpText = `What this field means: Blocks is an optional Slack Block Kit JSON array for rich message layout.

Why it matters: Blocks let you create structured Slack messages with sections, fields, dividers, buttons, context, and clear status summaries.

When to fill it: Fill it when the message needs richer formatting than plain text, such as incident summaries, approval cards, deployment reports, or ticket details. Leave it empty for simple alerts.

What to enter: Enter a JSON array copied from Slack Block Kit Builder or generated by a previous trusted step. Keep Message filled as fallback text.

Where the value comes from: Design it in app.slack.com/block-kit-builder, copy the JSON array, and map workflow values into text fields such as {{$json.ticketId}} or {{$json.approvalUrl}}.

How to use it later: Blocks are sent to Slack and are not returned in the runtime output. Track the sent message with {{$json.id}}, {{$json.ts}}, {{$json.channel}}, and {{$json.status}}.

Accepted format: Valid Slack Block Kit JSON array, such as [{"type":"section","text":{"type":"mrkdwn","text":"New ticket"}}]. The top level must be an array.

Real workplace example: An incident workflow sends a section with severity, owner, affected service, and a button linking to the incident record.

If it is empty or wrong: Empty is fine for plain messages. Invalid JSON is ignored by runtime and Slack may return invalid_blocks when malformed blocks reach the API.

Common mistake: Pasting a full JSON object with a blocks property instead of the array itself. Paste only the array that Slack expects in the blocks field.`;

const usernameHelpText = `What this field means: Bot Name is an optional display name override for the Slack message sender.

Why it matters: A clear sender name can help teams recognize whether a message came from Operations Bot, Deploy Bot, Support Bot, or another workflow purpose.

When to fill it: Fill it only when your Slack app is allowed to customize bot message appearance. Leave it empty or use the default bot identity when workspace policy controls bot names.

What to enter: Enter a short sender name such as Operations Bot, Deploy Bot, Support Alerts, or CtrlChecks Bot.

Where the value comes from: Use the naming convention approved by your Slack workspace admins or operations team.

How to use it later: The display name affects the Slack message appearance but is not the main tracking output. Use {{$json.ts}}, {{$json.id}}, and {{$json.channel}} to track the sent message.

Accepted format: Plain text display name. Avoid long names, impersonation, or names that look like a real person unless your policy allows it.

Real workplace example: Use Deploy Bot for release notifications and Support Alerts for urgent customer tickets.

If it is empty or wrong: Slack uses the connected app's default bot name, or ignores the override if the app lacks permission.

Common mistake: Expecting this field to change the Slack account connection. It only affects appearance when Slack allows it; the OAuth connection still controls the actual sender.`;

const iconEmojiHelpText = `What this field means: Icon Emoji is an optional emoji shown as the bot avatar for this Slack message.

Why it matters: A consistent emoji can help people scan Slack quickly, especially for alerts, approvals, deployments, and reports.

When to fill it: Fill it only when your Slack app allows bot icon customization. Leave it empty to use the connected app's default icon.

What to enter: Enter a Slack emoji shortcode such as :rotating_light:, :white_check_mark:, :bar_chart:, :memo:, or :rocket:.

Where the value comes from: Use a standard emoji from your workspace or one approved by the team that owns the workflow.

How to use it later: Icon Emoji changes Slack appearance only. Use message outputs such as {{$json.id}}, {{$json.ts}}, and {{$json.status}} for workflow logic.

Accepted format: Slack emoji shortcode with colons at both ends, such as :rocket:.

Real workplace example: Use :rotating_light: for incident alerts, :white_check_mark: for successful deployments, and :bar_chart: for daily reports.

If it is empty or wrong: Slack uses the default bot icon, or ignores invalid/custom emoji it cannot resolve.

Common mistake: Typing an emoji image URL or plain word instead of a Slack emoji shortcode.`;

export const slackMessageDoc: NodeDoc = {
  slug: 'slack_message',
  displayName: 'Slack Message',
  category: 'Communication',
  logoUrl: '/icons/nodes/slack_message.svg',
  description: 'Send Slack bot messages to channels, users, or threads through a saved Slack OAuth2 connection.',
  credentialType: 'Slack OAuth2 - Slack Message requires a saved Slack workspace connection with a bot token that can call chat.postMessage.',
  credentialSetupSteps: [
    'Create or select a Slack OAuth2 connection in Connections. This stores the Slack OAuth access token in the credential system instead of ordinary workflow fields.',
    'The Slack app needs chat:write to send messages. Channel lookup and some workflows may also use channels:read or users:read, and Slack Trigger workflows may use app mention, history, or command scopes.',
    'Install the Slack app to the correct workspace and select that Slack connection on the Slack Message node.',
    'Invite the connected bot to every private channel it should post in by typing /invite @YourBotName inside Slack.',
    'Use Channel for the destination, Message for readable fallback text, Blocks for optional Block Kit layout, and Thread Timestamp only when replying inside an existing Slack thread.',
    'Do not paste Slack bot tokens, signing secrets, client secrets, or webhook URLs into message fields. Use Connections or the credential vault for Slack access.',
    'Connect the Slack Message output to a logging, If/Else, error-handling, or follow-up node if later steps should inspect {{$json.status}}, {{$json.id}}, {{$json.ts}}, {{$json.channel}}, {{$json.threadTs}}, or {{$json.error}}.',
    'Downstream service node account connection setup is still required for nodes after Slack Message; the Slack OAuth2 connection only authorizes Slack posting.',
  ],
  credentialDocsUrl: 'https://api.slack.com/authentication',
  resources: [
    {
      name: 'Configuration',
      description: 'Use this resource to choose the Slack destination, write the message, optionally reply in a thread, and optionally add Block Kit or bot appearance overrides.',
      operations: [
        {
          name: 'Send Message',
          value: 'default',
          description: 'Sends one Slack message through chat.postMessage when using the Slack OAuth bot connection. Choose this operation for team alerts, incident updates, support notifications, deployment notes, approval prompts, report summaries, and threaded replies from Slack-triggered workflows.',
          fields: [
            {
              name: 'Channel',
              internalKey: 'channel',
              type: 'string',
              required: true,
              description: 'Slack channel name, channel ID, or user ID where the message should be sent.',
              helpText: channelHelpText,
              placeholder: '{{$json.channelId}}',
              example: '{{$json.channelId}}',
              notes: 'Required at runtime when sending through Slack OAuth bot token. Use channel IDs for stability and invite the bot to private channels.',
            },
            {
              name: 'Message',
              internalKey: 'message',
              type: 'textarea',
              required: true,
              description: 'Readable Slack message text and fallback text for Block Kit messages.',
              helpText: messageHelpText,
              placeholder: 'New urgent ticket {{$json.ticketId}} from {{$json.customerEmail}}',
              example: 'New urgent ticket {{$json.ticketId}} from {{$json.customerEmail}}: {{$json.summary}}',
              notes: 'Backend requires message. Keep it useful even when Blocks are present.',
            },
            {
              name: 'Thread Timestamp',
              internalKey: 'threadTs',
              type: 'string',
              required: false,
              description: 'Slack thread timestamp to reply inside an existing thread.',
              helpText: threadTsHelpText,
              placeholder: '{{$json.threadTs}}',
              example: '{{$json.threadTs}}',
              notes: 'Leave empty for a new top-level message. Use Slack Trigger threadTs or messageTs when replying.',
            },
            {
              name: 'Blocks (JSON)',
              internalKey: 'blocks',
              type: 'json',
              required: false,
              description: 'Optional Slack Block Kit JSON array for rich message layout.',
              helpText: blocksHelpText,
              placeholder: '[{"type":"section","text":{"type":"mrkdwn","text":"New urgent ticket"}}]',
              example: '[{"type":"section","text":{"type":"mrkdwn","text":"*Urgent ticket* {{$json.ticketId}} from {{$json.customerEmail}}"}}]',
              notes: 'Paste the Block Kit array, not an outer object. Message remains the fallback text.',
            },
            {
              name: 'Bot Name',
              internalKey: 'username',
              type: 'string',
              required: false,
              description: 'Optional sender display name override, if the Slack app allows it.',
              helpText: usernameHelpText,
              placeholder: 'Support Alerts',
              example: 'Support Alerts',
              notes: 'Slack may ignore this field if the app or workspace does not allow customized bot names.',
            },
            {
              name: 'Icon Emoji',
              internalKey: 'iconEmoji',
              type: 'string',
              required: false,
              description: 'Optional Slack emoji avatar override, if the Slack app allows it.',
              helpText: iconEmojiHelpText,
              placeholder: ':rotating_light:',
              example: ':rotating_light:',
              notes: 'Use a Slack emoji shortcode with colons. Slack may ignore invalid or unauthorized icon overrides.',
            },
          ],
          outputExample: {
            id: '1704067200.123456',
            status: 'sent',
            provider: 'slack',
            ok: true,
            channel: 'C07SUPPORT',
            ts: '1704067200.123456',
            threadTs: '1704067000.111111',
            message: 'New urgent ticket TCK-1042 from asha.rao@example.com: Login failing for finance users',
          },
          outputDescription: 'id: Slack message timestamp or response identifier. status: sent or failed. provider: slack. ok: true for successful OAuth chat.postMessage sends. channel: Slack channel returned by the API or configured channel. ts: Slack message timestamp, useful as a message ID. threadTs: Thread timestamp used for replies when supplied. message: Resolved fallback text that was sent. On failure, runtime returns status failed, provider slack, and error. Later nodes can use {{$json.id}}, {{$json.status}}, {{$json.channel}}, {{$json.ts}}, {{$json.threadTs}}, {{$json.message}}, or {{$json.error}}.',
          usageExample: {
            scenario: 'Reply in the original Slack incident thread after an AI Agent summarizes a support ticket',
            inputValues: {
              channel: '{{$json.channelId}}',
              message: 'New urgent ticket {{$json.ticketId}} from {{$json.customerEmail}}: {{$json.summary}}',
              threadTs: '{{$json.threadTs}}',
              blocks: '[{"type":"section","text":{"type":"mrkdwn","text":"*Urgent ticket* {{$json.ticketId}} from {{$json.customerEmail}}"}}]',
              username: 'Support Alerts',
              iconEmoji: ':rotating_light:',
            },
            expectedOutput: 'The next logging, If/Else, or follow-up Slack node can use {{$json.status}}, {{$json.ts}}, {{$json.channel}}, {{$json.threadTs}}, and {{$json.error}} to confirm or route the send result.',
          },
          externalDocsUrl: 'https://api.slack.com/methods/chat.postMessage',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Slack Message node: Slack OAuth bot token is required',
      cause: 'No Slack OAuth2 connection is selected, the credential was not injected, or the saved Slack connection has no usable bot token.',
      fix: 'Open Connections, connect Slack OAuth2, grant chat:write, select that connection on the Slack Message node, and run the workflow again.',
    },
    {
      error: 'Slack Message node: channel is required when using Slack OAuth bot token',
      cause: 'Channel is blank after expressions resolve, but OAuth chat.postMessage needs a destination.',
      fix: 'Enter a fixed channel such as #alerts or map {{$json.channelId}} from Slack Trigger or another previous step.',
    },
    {
      error: 'Slack Message node: Message or Blocks is required',
      cause: 'The workflow tried to send without readable text or a valid blocks payload.',
      fix: 'Fill Message with clear fallback text and add Blocks only when a rich layout is needed.',
    },
    {
      error: 'channel_not_found or not_in_channel',
      cause: 'The channel value is wrong, the channel was renamed, or the bot has not been invited to a private channel.',
      fix: 'Use the stable channel ID from Slack channel details and invite the bot with /invite @YourBotName.',
    },
    {
      error: 'invalid_auth, not_authed, or missing_scope',
      cause: 'The Slack OAuth token is missing, expired, revoked, or lacks chat:write or a needed Slack permission.',
      fix: 'Reconnect Slack in Connections, confirm the workspace is correct, and grant the required Slack app scopes.',
    },
    {
      error: 'invalid_blocks',
      cause: 'Blocks is not a valid Slack Block Kit JSON array or contains a field Slack does not accept.',
      fix: 'Validate the array in Slack Block Kit Builder, paste only the array, and keep Message filled as fallback text.',
    },
    {
      error: 'Next node cannot find Slack message ID',
      cause: 'The downstream node is looking for old or provider-specific field names instead of the runtime output.',
      fix: 'Use {{$json.ts}} or {{$json.id}} for the Slack message identifier, {{$json.channel}} for the destination, and {{$json.status}} for send state.',
    },
    {
      error: 'Permission denied after Slack Message',
      cause: 'Slack Message uses Slack OAuth2 only for posting to Slack, but a downstream service node may still need its own connected account or permission to create, update, send, upload, or write data.',
      fix: 'Connect the required account on the downstream service node and confirm that provider permission separately from the Slack connection.',
    },
  ],
  relatedNodes: ['slack_trigger', 'slack_webhook', 'microsoft_teams', 'discord', 'email'],
};
