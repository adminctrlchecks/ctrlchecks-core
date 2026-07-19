import type { DocsSearchIndexItem } from '../search-index';

export const slackTriggerSearchIndex = [
  {
    type: 'node',
    title: 'Slack Trigger',
    slug: 'slack_trigger',
    category: 'Triggers',
    href: '/docs/nodes/slack_trigger',
    text: 'Slack Trigger real-time Events API app mention message slash command interaction webhook',
  },
  {
    type: 'operation',
    title: 'Slack Trigger: Receive event',
    slug: 'slack_trigger',
    category: 'Triggers',
    href: '/docs/nodes/slack_trigger#operation-receive',
    text: 'Receive Slack app_mention message slash_command interaction webhook event',
  },
  {
    type: 'field',
    title: 'Slack Trigger: Event Types',
    slug: 'slack_trigger',
    category: 'Triggers',
    href: '/docs/nodes/slack_trigger#operation-receive',
    text: 'eventTypes app_mention message slash_command interaction',
  },
  {
    type: 'field',
    title: 'Slack Trigger: Validate Slack Signature',
    slug: 'slack_trigger',
    category: 'Triggers',
    href: '/docs/nodes/slack_trigger#operation-receive',
    text: 'validateSignature X-Slack-Signature signing secret timestamp',
  },
] satisfies DocsSearchIndexItem[];
