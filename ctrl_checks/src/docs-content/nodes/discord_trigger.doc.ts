import type { FieldDoc, NodeDoc, OperationDoc } from '../types';

const discordDocs = 'https://docs.discord.com/developers/interactions/overview';

const fieldHelp = {
  eventTypes: `What this field means: Event Types tells the trigger which kinds of Discord events are allowed to start the workflow.

Why it matters: One Discord endpoint can receive slash commands, component interactions, modal submits, webhook events, and message-like events. This field prevents unrelated Discord traffic from starting the wrong workflow.

When to fill it: Fill it when this trigger should listen to only certain Discord event types. Leave the default when you want slash commands and common interactions during setup.

What to enter: Use a comma-separated list such as slash_command, interaction, webhook_event, or message. The runtime also understands aliases like command, component, button, modal, webhook, and message_create.

Where the value comes from: Choose it from the Discord feature you configured in the Developer Portal, such as an Interactions Endpoint, a slash command, a button, or Discord Webhook Events.

How to use it later: The trigger output includes {{$json.eventType}} and {{$json.rawEventType}}, so later If/Else or Switch nodes can route slash commands, button clicks, and webhook events differently.

Accepted format: Comma-separated text or an array in workflow JSON.

Real workplace example: slash_command, interaction for a support bot that handles /support and button clicks.

If it is empty or wrong: Runtime falls back to message, slash_command, and interaction. Unknown or mismatched values make incoming events look ignored.

Common mistake: Expecting normal channel messages to arrive just because message is listed; Discord must actually deliver those events through Gateway-like delivery or supported Webhook Events.`,
  guildIds: `What this field means: Allowed Guild IDs is an optional allowlist of Discord server IDs.

Why it matters: The same Discord application can be installed in several servers. This field keeps one workflow from responding to events from the wrong community, customer workspace, or internal test server.

When to fill it: Fill it when the endpoint receives events from more than one server and this workflow should handle only specific servers.

What to enter: One or more Discord guild/server IDs separated by commas or new lines.

Where the value comes from: In Discord, enable Developer Mode, right-click the server name, and copy the Server ID. Admins can also store it in a setup document or CRM account record.

How to use it later: Accepted events include {{$json.guildId}}, so logs, filters, and downstream Discord replies can show which server triggered the workflow.

Accepted format: Discord snowflake ID text, usually 17 to 20 digits. Use commas or new lines for several IDs.

Real workplace example: 222222222222222222 for the Acme customer community server.

If it is empty or wrong: Empty accepts any delivered guild. A wrong ID makes valid events return no matching workflow trigger.

Common mistake: Copying a channel ID or role ID into the guild allowlist.`,
  channelIds: `What this field means: Allowed Channel IDs is an optional allowlist of Discord channels that may start this workflow.

Why it matters: A support bot may be installed across many channels, but one workflow might be intended only for #support, #incidents, or a customer-specific channel.

When to fill it: Fill it when this workflow should ignore events from other channels in the same server.

What to enter: One or more Discord channel IDs separated by commas or new lines.

Where the value comes from: Enable Discord Developer Mode, right-click the target channel, and copy the Channel ID.

How to use it later: Accepted trigger events include {{$json.channelId}} and {{$json.chatId}}; use those fields in a Discord action node to reply in the same place.

Accepted format: Discord snowflake ID text, usually 17 to 20 digits. Use commas or new lines for several channels.

Real workplace example: 333333333333333333 for the #support-triage channel.

If it is empty or wrong: Empty accepts any delivered channel. A wrong channel ID silently filters out matching commands or interactions.

Common mistake: Typing a channel name like #support instead of the numeric channel ID.`,
  allowedUserIds: `What this field means: Allowed User IDs is an optional allowlist of Discord users who may start this workflow.

Why it matters: Some commands perform sensitive work, such as creating tickets, escalating incidents, or changing records. A user allowlist keeps general members from triggering those flows.

When to fill it: Fill it for admin-only, moderator-only, employee-only, or pilot workflows. Leave it empty when any server member may use the command.

What to enter: One or more Discord user IDs separated by commas or new lines.

Where the value comes from: Enable Discord Developer Mode, right-click the user, and copy User ID. For teams, store approved IDs in an admin checklist.

How to use it later: Accepted events include {{$json.userId}} and {{$json.username}}, so downstream steps can record who started the workflow.

Accepted format: Discord snowflake ID text, usually 17 to 20 digits. Use commas or new lines for several users.

Real workplace example: 111111111111111111 for the support operations lead.

If it is empty or wrong: Empty allows any delivered user. A wrong ID filters out the user even if the command and channel match.

Common mistake: Using the visible username instead of the numeric Discord user ID.`,
  commandFilter: `What this field means: Command Filter limits the trigger to one slash command name.

Why it matters: Several Discord commands can point to the same application endpoint. This field lets one workflow handle /support while another handles /refund or /status.

When to fill it: Fill it when this workflow should respond to one command only. Leave it empty when the workflow should accept all configured commands and route them later.

What to enter: The slash command name with the slash, such as /support.

Where the value comes from: Use the command name you created in the Discord Developer Portal or registered for your application.

How to use it later: Accepted events include {{$json.command}}, so downstream Switch nodes can branch on the command when this field is left blank.

Accepted format: Plain command text beginning with /.

Real workplace example: /support for an AI support triage workflow.

If it is empty or wrong: Empty accepts all configured commands. A mismatch returns a no-matching-trigger response for interactions.

Common mistake: Typing command options here, such as /support urgent, instead of only the command name.`,
  applicationId: `What this field means: Application ID identifies the Discord application whose events this workflow should accept.

Why it matters: It prevents another Discord app or an old copied endpoint from starting this workflow. It is also useful for interaction follow-up replies.

When to fill it: Fill it when you run more than one Discord app, or when you want a strict application allowlist. Prefer saving it on the Discord Bot Token connection when possible.

What to enter: The numeric Application ID from the Discord Developer Portal.

Where the value comes from: Open discord.com/developers/applications, choose the app, then copy Application ID from General Information.

How to use it later: The trigger output includes {{$json.applicationId}}, and Discord action nodes can use it with {{$json.interactionToken}} for interaction follow-up replies.

Accepted format: Discord application snowflake ID text, usually 17 to 20 digits.

Real workplace example: 999999999999999999 for the CtrlChecks Support Bot application.

If it is empty or wrong: Empty does not filter by application. A wrong value filters out otherwise valid events.

Common mistake: Using the bot user ID or client secret instead of the Application ID.`,
  publicKey: `What this field means: Public Key Fallback is the Discord application public key used to verify signed interaction and webhook requests when it is not available from the saved connection or worker environment.

Why it matters: Discord signs requests with Ed25519. Signature validation proves the request really came from Discord and is less than five minutes old.

When to fill it: Use this only when the Discord Bot Token connection does not store the public key and the worker does not have DISCORD_PUBLIC_KEY set. Prefer storing it in Connections.

What to enter: The 32-byte hex public key from the Discord Developer Portal. This is not the bot token and not a password, but it is still setup-sensitive.

Where the value comes from: Open discord.com/developers/applications, choose the app, then copy Public Key from General Information.

How to use it later: It is used before the workflow starts; successful trigger output does not include this key. Later nodes use {{$json.channelId}}, {{$json.interactionToken}}, and {{$json.applicationId}} instead.

Accepted format: 64 hexadecimal characters, with no spaces.

Real workplace example: Store the public key on the Discord connection for the Support Bot so all Discord Trigger nodes can validate requests.

If it is empty or wrong: With Validate Signature enabled, requests fail with Invalid Discord request signature.

Common mistake: Pasting the bot token, client secret, or interactions endpoint URL into this field.`,
  validateSignature: `What this field means: Validate Signature controls whether CtrlChecks checks Discord's X-Signature-Ed25519 and X-Signature-Timestamp headers.

Why it matters: Keeping this enabled blocks forged requests and old replayed requests from starting workflows.

When to fill it: Keep it enabled for production. Turn it off only for controlled local simulations where you cannot generate Discord signatures.

What to enter: On/true for production, off/false only for local testing.

Where the value comes from: This is a security choice made by the workflow builder or workspace admin.

How to use it later: When validation passes, the workflow starts with normalized fields such as {{$json.eventType}}, {{$json.channelId}}, and {{$json.interactionToken}}.

Accepted format: Boolean checkbox.

Real workplace example: Enabled for a public /support command used by customers in a Discord community.

If it is empty or wrong: Default behavior is enabled. Turning it off can allow non-Discord callers to hit the endpoint if they know the URL.

Common mistake: Disabling signature validation to fix a bad public key instead of saving the correct Discord application public key.`,
};

const fields: FieldDoc[] = [
  {
    name: 'Event Types',
    internalKey: 'eventTypes',
    type: 'string',
    required: false,
    description: 'Discord event types to accept before starting the workflow.',
    helpText: fieldHelp.eventTypes,
    placeholder: 'message, slash_command, interaction',
    example: 'slash_command, interaction',
  },
  {
    name: 'Allowed Guild IDs',
    internalKey: 'guildIds',
    type: 'textarea',
    required: false,
    description: 'Optional allowlist of Discord server IDs.',
    helpText: fieldHelp.guildIds,
    placeholder: '222222222222222222',
    example: '222222222222222222',
  },
  {
    name: 'Allowed Channel IDs',
    internalKey: 'channelIds',
    type: 'textarea',
    required: false,
    description: 'Optional allowlist of Discord channel IDs.',
    helpText: fieldHelp.channelIds,
    placeholder: '333333333333333333',
    example: '333333333333333333',
  },
  {
    name: 'Allowed User IDs',
    internalKey: 'allowedUserIds',
    type: 'textarea',
    required: false,
    description: 'Optional allowlist of Discord user IDs.',
    helpText: fieldHelp.allowedUserIds,
    placeholder: '111111111111111111',
    example: '111111111111111111',
  },
  {
    name: 'Command Filter',
    internalKey: 'commandFilter',
    type: 'string',
    required: false,
    description: 'Optional slash command name that must match before the workflow starts.',
    helpText: fieldHelp.commandFilter,
    placeholder: '/support',
    example: '/support',
  },
  {
    name: 'Application ID',
    internalKey: 'applicationId',
    type: 'string',
    required: false,
    description: 'Optional Discord application ID filter.',
    helpText: fieldHelp.applicationId,
    placeholder: '999999999999999999',
    example: '999999999999999999',
  },
  {
    name: 'Public Key Fallback',
    internalKey: 'publicKey',
    type: 'password',
    required: false,
    description: 'Optional Discord application public key fallback for signature validation.',
    helpText: fieldHelp.publicKey,
    placeholder: '32-byte hex public key',
    example: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  },
  {
    name: 'Validate Signature',
    internalKey: 'validateSignature',
    type: 'boolean',
    required: false,
    description: 'Checks Discord Ed25519 signature headers before accepting the event.',
    helpText: fieldHelp.validateSignature,
    defaultValue: 'true',
    example: 'true',
  },
];

const receiveOperation: OperationDoc = {
  name: 'Receive Discord Event',
  value: 'receive',
  description: 'Start the workflow when an accepted Discord interaction, slash command, message-like event, or supported webhook event reaches the generated CtrlChecks Discord endpoint and passes signature and filter checks.',
  fields,
  outputExample: {
    eventId: '123456789012345678',
    eventType: 'slash_command',
    source: 'discord',
    userId: '111111111111111111',
    username: 'alice',
    text: 'priority:urgent',
    timestamp: '2026-05-01T10:00:00.000Z',
    applicationId: '999999999999999999',
    guildId: '222222222222222222',
    channelId: '333333333333333333',
    threadId: '333333333333333333',
    chatId: '333333333333333333',
    messageId: null,
    command: '/support',
    customId: '',
    interactionId: '123456789012345678',
    interactionToken: 'interaction-token',
    responseUrl: 'https://discord.com/api/v10/webhooks/999999999999999999/interaction-token',
    rawEventType: 'slash_command',
    trigger: 'discord',
    sessionId: 'discord_workflow_server_thread',
    _discord: true,
    raw: {},
  },
  outputDescription: 'Outputs normalized top-level fields: eventId, eventType, source, userId, username, text, timestamp, applicationId, guildId, channelId, threadId, chatId, messageId, command, customId, interactionId, interactionToken, responseUrl, rawEventType, raw, plus trigger, workflow_id, node_id, sessionId, and _discord added to the execution input.',
  usageExample: {
    scenario: 'A support team uses /support in Discord, the workflow classifies the request with AI, then replies in the same channel or sends an interaction follow-up.',
    inputValues: {
      eventTypes: 'slash_command, interaction',
      guildIds: '222222222222222222',
      channelIds: '333333333333333333',
      allowedUserIds: '',
      commandFilter: '/support',
      applicationId: '999999999999999999',
      publicKey: '',
      validateSignature: 'true',
    },
    expectedOutput: 'Use {{$json.text}} as the request, {{$json.channelId}} for same-channel replies, {{$json.interactionToken}} with {{$json.applicationId}} for interaction follow-ups, and {{$json.userId}} for audit logs.',
  },
  externalDocsUrl: 'https://docs.discord.com/developers/interactions/receiving-and-responding',
};

export const discordTriggerDoc: NodeDoc = {
  slug: 'discord_trigger',
  displayName: 'Discord Trigger',
  category: 'Triggers',
  logoUrl: '/integrations-logos/Discord.svg',
  description: 'Start workflows from Discord slash commands, component interactions, modal submissions, message-like events, and supported Discord Webhook Events.',
  credentialType: 'Discord Bot Token connection with Application ID and Public Key stored in Connections and the credential vault',
  credentialSetupSteps: [
    'Create or open your Discord application at discord.com/developers/applications. The trigger uses the application, not a personal Discord password.',
    'Copy the Application ID from General Information and save it on the Discord Bot Token connection. This value can also be used as the Application ID filter on the node.',
    'Copy the Public Key from General Information and save it on the Discord Bot Token connection, or set DISCORD_PUBLIC_KEY on the worker. This key is used to validate Discord request signatures.',
    'Create or reset the bot token under Bot and save it as the Discord Bot Token connection. CtrlChecks stores the bot token in Connections and the credential vault; do not put bot tokens, client secrets, passwords, or private credentials in Event Types, filters, Public Key Fallback, or input data.',
    'Use the generated CtrlChecks URL from the Discord Trigger as the Discord Interactions Endpoint URL for slash commands, buttons, select menus, modals, and autocomplete interactions.',
    'For Discord Webhook Events, use the same generated URL as the Webhook Events endpoint and select the supported event types in the Discord application dashboard.',
    'Test the Discord Bot Token connection. The worker checks https://discord.com/api/v10/users/@me with Bot authorization to confirm the token is valid.',
    'Save and activate the workflow, then connect this trigger to its outgoing line. Downstream service nodes still need their own account connection, for example the Discord action node needs a Discord Bot Token connection to reply.',
  ],
  credentialDocsUrl: discordDocs,
  resources: [
    {
      name: 'Discord Events',
      description: 'Receives signed Discord callbacks, filters them by event type and optional allowlists, and starts one workflow execution per accepted event.',
      operations: [receiveOperation],
    },
  ],
  commonErrors: [
    {
      error: 'Invalid Discord request signature.',
      cause: 'Validate Signature is enabled but the public key is missing, wrong, not 64 hex characters, or the Discord timestamp is older than five minutes.',
      fix: 'Save the correct Public Key on the Discord Bot Token connection or set DISCORD_PUBLIC_KEY on the worker. Keep Validate Signature enabled for production.',
    },
    {
      error: 'No matching CtrlChecks workflow trigger is active for this Discord event.',
      cause: 'The event type, guild ID, channel ID, user allowlist, application ID, or command filter rejected the incoming Discord event.',
      fix: 'Temporarily use Event Types slash_command, interaction, webhook_event and clear filters while testing, then add each allowlist back one at a time.',
    },
    {
      error: 'Workflow is not active.',
      cause: 'Discord reached the endpoint, but the saved workflow is not active.',
      fix: 'Save and activate the workflow before testing the Discord command, interaction, or webhook event again.',
    },
    {
      error: 'PUBLIC_BASE_URL is required to execute Discord-triggered workflows.',
      cause: 'The worker does not know its public base URL, so it cannot hand the accepted Discord event to the workflow execution API.',
      fix: 'Set PUBLIC_BASE_URL for the worker and redeploy before testing production Discord triggers.',
    },
    {
      error: 'No active Discord connection found. Create one in Connections first.',
      cause: 'Registration or signature lookup could not find a Discord Bot Token connection for the workflow owner.',
      fix: 'Create a Discord Bot Token connection with bot token, public key, and application ID, then select or re-register it for the trigger.',
    },
    {
      error: 'Selected connection is not a Discord Bot Token connection.',
      cause: 'A Discord Webhook URL or unrelated connection was selected where the trigger expected a Discord Bot Token connection.',
      fix: 'Use Discord Bot Token for triggers and bot replies. Use Discord Webhook only for simple outgoing webhook messages.',
    },
    {
      error: 'Next node cannot find Discord trigger fields',
      cause: 'A downstream node mapped the wrong field name, or expected raw Discord payload fields instead of normalized top-level fields.',
      fix: 'Use normalized fields such as {{$json.text}}, {{$json.channelId}}, {{$json.command}}, {{$json.interactionToken}}, {{$json.applicationId}}, and {{$json.raw}}.',
    },
    {
      error: 'Permission denied after Discord Trigger',
      cause: 'The trigger started successfully, but a downstream service node lacks its own account connection or Discord bot permissions.',
      fix: 'Connect each downstream service node separately. For Discord replies, install the bot in the server and grant Send Messages or interaction permissions.',
    },
  ],
  relatedNodes: ['discord', 'ai_agent', 'switch', 'filter'],
};
