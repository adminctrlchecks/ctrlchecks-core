import type { DocsSearchIndexItem } from '../search-index';

export const slackWebhookSearchIndex = [
  {
    type: 'node',
    title: 'Slack Webhook',
    slug: 'slack_webhook',
    category: 'Communication',
    href: '/docs/nodes/slack_webhook',
    text: 'Slack Webhook Send simple messages through a saved Slack Incoming Webhook connection.',
  },
  {
    type: 'operation',
    title: 'Slack Webhook: Send Incoming Webhook Message',
    slug: 'slack_webhook',
    category: 'Communication',
    href: '/docs/nodes/slack_webhook#operation-configure',
    text: 'Send a simple text payload to the channel configured by the selected Slack Incoming Webhook connection.',
  },
  {
    type: 'field',
    title: 'Slack Webhook: Message',
    slug: 'slack_webhook',
    category: 'Communication',
    href: '/docs/nodes/slack_webhook#operation-configure',
    text: 'Message message Text sent through the selected Slack Incoming Webhook connection.',
  },
] satisfies DocsSearchIndexItem[];
