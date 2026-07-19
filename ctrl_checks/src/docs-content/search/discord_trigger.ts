import type { DocsSearchIndexItem } from '../search-index';

export const discordTriggerSearchIndex = [
  {
    slug: 'discord_trigger',
    title: 'Discord Trigger',
    type: 'node' as const,
    category: 'Triggers',
    href: '/docs/nodes/discord_trigger',
    text: 'Discord Trigger starts workflows from Discord slash commands, component interactions, modal submissions, autocomplete, message-like events, and supported Discord Webhook Events. It validates X-Signature-Ed25519 and X-Signature-Timestamp, filters by eventTypes, guildIds, channelIds, allowedUserIds, commandFilter, and applicationId, then outputs normalized Discord fields.',
  },
  {
    slug: 'discord_trigger',
    title: 'Discord Trigger: Receive Discord Event',
    type: 'operation' as const,
    category: 'Triggers',
    href: '/docs/nodes/discord_trigger#operation-receive',
    text: 'Receive Discord Event starts one workflow execution per accepted Discord event. Fields include eventTypes, guildIds, channelIds, allowedUserIds, commandFilter, applicationId, publicKey, and validateSignature. Outputs include eventId, eventType, text, userId, username, guildId, channelId, command, interactionToken, responseUrl, rawEventType, raw, sessionId, and _discord.',
  },
  {
    slug: 'discord_trigger',
    title: 'Discord Trigger Fields',
    type: 'field' as const,
    category: 'Triggers',
    href: '/docs/nodes/discord_trigger#fields',
    text: 'Event Types accepts slash_command, interaction, webhook_event, message, and aliases like command, component, button, modal, webhook, and message_create. Allowed Guild IDs, Allowed Channel IDs, and Allowed User IDs are numeric Discord snowflake allowlists. Command Filter uses a value like /support. Application ID filters one Discord app. Public Key Fallback is a 64 character Ed25519 public key fallback. Validate Signature should stay enabled in production.',
  },
  {
    slug: 'discord_trigger',
    title: 'Discord Trigger Connection',
    type: 'field' as const,
    category: 'Triggers',
    href: '/docs/nodes/discord_trigger#credentials',
    text: 'Discord Trigger uses a Discord Bot Token connection with bot token, Application ID, and Public Key stored in Connections and the credential vault. Test request calls https://discord.com/api/v10/users/@me. Use the generated CtrlChecks URL as the Discord Interactions Endpoint URL and optionally the Webhook Events endpoint. Do not put bot tokens, client secrets, passwords, or private credentials in normal workflow fields.',
  },
] satisfies DocsSearchIndexItem[];
