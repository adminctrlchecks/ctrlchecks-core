import type { DocsSearchIndexItem } from '../search-index';

export const telegramTriggerSearchIndex = [
  {
    type: 'node',
    title: 'Telegram Trigger',
    slug: 'telegram_trigger',
    category: 'Triggers',
    href: '/docs/nodes/telegram_trigger',
    text: 'Telegram Trigger starts workflows in real time when someone messages a Telegram bot. Use it for Telegram chatbot workflows.',
  },
  {
    type: 'operation',
    title: 'Telegram Trigger: Receive Update',
    slug: 'telegram_trigger',
    category: 'Triggers',
    href: '/docs/nodes/telegram_trigger#operation-receive-update',
    text: 'Receive Telegram Bot API webhook updates and normalize chatId messageId text username firstName lastName userId updateType raw.',
  },
  {
    type: 'field',
    title: 'Telegram Trigger: Allowed Chat IDs',
    slug: 'telegram_trigger',
    category: 'Triggers',
    href: '/docs/nodes/telegram_trigger#operation-receive-update',
    text: 'Allowed Chat IDs optional comma-separated chat allowlist for Telegram Trigger.',
  },
  {
    type: 'field',
    title: 'Telegram Trigger: Secret Token',
    slug: 'telegram_trigger',
    category: 'Triggers',
    href: '/docs/nodes/telegram_trigger#operation-receive-update',
    text: 'Secret Token validates X-Telegram-Bot-Api-Secret-Token on incoming Telegram webhooks.',
  },
] satisfies DocsSearchIndexItem[];
