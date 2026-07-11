import type { DocsSearchIndexItem } from '../search-index';

export const slackMessageSearchIndex = [
  {
    type: 'node',
    title: 'Slack',
    slug: 'slack_message',
    category: 'Communication',
    href: '/docs/nodes/slack_message',
    text: 'Slack Send messages using a Slack OAuth app or bot connection with chat.postMessage.',
  },
  {
    type: 'operation',
    title: 'Slack: Send Slack Message',
    slug: 'slack_message',
    category: 'Communication',
    href: '/docs/nodes/slack_message#operation-configure',
    text: 'Send a Slack message to a channel or direct message using the selected Slack OAuth2 connection.',
  },
  {
    type: 'field',
    title: 'Slack: Channel',
    slug: 'slack_message',
    category: 'Communication',
    href: '/docs/nodes/slack_message#operation-configure',
    text: 'Channel channel Slack channel name, channel ID, or user ID for chat.postMessage.',
  },
  {
    type: 'field',
    title: 'Slack: Message',
    slug: 'slack_message',
    category: 'Communication',
    href: '/docs/nodes/slack_message#operation-configure',
    text: 'Message message Text to send to Slack.',
  },
  {
    type: 'field',
    title: 'Slack: Blocks',
    slug: 'slack_message',
    category: 'Communication',
    href: '/docs/nodes/slack_message#operation-configure',
    text: 'Blocks blocks Optional Slack Block Kit JSON array.',
  },
] satisfies DocsSearchIndexItem[];
