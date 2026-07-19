import type { DocsSearchIndexItem } from '../search-index';

export const discordWebhookSearchIndex = [
  {
    type: 'node',
    title: 'Discord Webhook',
    slug: 'discord_webhook',
    category: 'Communication',
    href: '/docs/nodes/discord_webhook',
    text: 'Discord Webhook Send messages to a Discord channel via a saved incoming webhook URL, no bot setup required. Communication',
  },
  {
    type: 'operation',
    title: 'Discord Webhook: Send Webhook Message',
    slug: 'discord_webhook',
    category: 'Communication',
    href: '/docs/nodes/discord_webhook#operation-default',
    text: 'Discord Webhook Configuration Send Webhook Message. Posts to Discord through a saved incoming webhook URL.',
  },
  {
    type: 'field',
    title: 'Discord Webhook: Message',
    slug: 'discord_webhook',
    category: 'Communication',
    href: '/docs/nodes/discord_webhook#operation-default',
    text: 'Discord Webhook Message message text to post. Required. Supports Discord markdown.',
  },
  {
    type: 'field',
    title: 'Discord Webhook: Username',
    slug: 'discord_webhook',
    category: 'Communication',
    href: '/docs/nodes/discord_webhook#operation-default',
    text: 'Discord Webhook Username username optional sender name override for this message only.',
  },
  {
    type: 'field',
    title: 'Discord Webhook: Avatar Url',
    slug: 'discord_webhook',
    category: 'Communication',
    href: '/docs/nodes/discord_webhook#operation-default',
    text: 'Discord Webhook Avatar Url avatarUrl optional sender avatar image URL override for this message only.',
  },
] satisfies DocsSearchIndexItem[];
