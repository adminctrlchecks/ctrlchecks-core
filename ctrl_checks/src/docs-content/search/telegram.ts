import type { DocsSearchIndexItem } from '../search-index';

export const telegramSearchIndex = [
  {
    "type": "node",
    "title": "Telegram",
    "slug": "telegram",
    "category": "Communication",
    "href": "/docs/nodes/telegram",
    "text": "Telegram Send messages to Telegram chats, groups, or channels using a bot connection. Use this node when a workflow needs telegram behavior with schema-driven inputs from the CtrlChecks node registry. Communication"
  },
  {
    "type": "operation",
    "title": "Telegram: Configure",
    "slug": "telegram",
    "category": "Communication",
    "href": "/docs/nodes/telegram#operation-configure",
    "text": "Telegram Configuration Configure Configure with the Telegram node using the configured input fields. configure"
  },
  {
    "type": "field",
    "title": "Telegram: Chat Id",
    "slug": "telegram",
    "category": "Communication",
    "href": "/docs/nodes/telegram#operation-configure",
    "text": "Telegram Configuration Configure Chat Id chatId Target chat or channel ID (numeric, can be negative for channels)"
  },
  {
    "type": "field",
    "title": "Telegram: Message Type",
    "slug": "telegram",
    "category": "Communication",
    "href": "/docs/nodes/telegram#operation-configure",
    "text": "Telegram Configuration Configure Message Type messageType Telegram message type"
  },
  {
    "type": "field",
    "title": "Telegram: Message",
    "slug": "telegram",
    "category": "Communication",
    "href": "/docs/nodes/telegram#operation-configure",
    "text": "Telegram Configuration Configure Message message Message text (required when messageType is \"text\")"
  },
  {
    "type": "field",
    "title": "Telegram: Parse Mode",
    "slug": "telegram",
    "category": "Communication",
    "href": "/docs/nodes/telegram#operation-configure",
    "text": "Telegram Configuration Configure Parse Mode parseMode Text formatting mode: none, HTML, Markdown, MarkdownV2"
  },
  {
    "type": "field",
    "title": "Telegram: Disable Web Page Preview",
    "slug": "telegram",
    "category": "Communication",
    "href": "/docs/nodes/telegram#operation-configure",
    "text": "Telegram Configuration Configure Disable Web Page Preview disableWebPagePreview Disable automatic link previews"
  },
  {
    "type": "field",
    "title": "Telegram: Media Url",
    "slug": "telegram",
    "category": "Communication",
    "href": "/docs/nodes/telegram#operation-configure",
    "text": "Telegram Configuration Configure Media Url mediaUrl Media URL for photo/video/document/audio/animation message types"
  },
  {
    "type": "field",
    "title": "Telegram: Caption",
    "slug": "telegram",
    "category": "Communication",
    "href": "/docs/nodes/telegram#operation-configure",
    "text": "Telegram Configuration Configure Caption caption Caption for media messages"
  },
  {
    "type": "field",
    "title": "Telegram: Reply To Message Id",
    "slug": "telegram",
    "category": "Communication",
    "href": "/docs/nodes/telegram#operation-configure",
    "text": "Telegram Configuration Configure Reply To Message Id replyToMessageId Message ID to reply to"
  },
  {
    "type": "field",
    "title": "Telegram: Reply Markup",
    "slug": "telegram",
    "category": "Communication",
    "href": "/docs/nodes/telegram#operation-configure",
    "text": "Telegram Configuration Configure Reply Markup replyMarkup Reply markup JSON (inline keyboard, reply keyboard, etc.)"
  },
  {
    "type": "field",
    "title": "Telegram: Disable Notification",
    "slug": "telegram",
    "category": "Communication",
    "href": "/docs/nodes/telegram#operation-configure",
    "text": "Telegram Configuration Configure Disable Notification disableNotification Send message silently without notification"
  },
  {
    "type": "field",
    "title": "Telegram: Protect Content",
    "slug": "telegram",
    "category": "Communication",
    "href": "/docs/nodes/telegram#operation-configure",
    "text": "Telegram Configuration Configure Protect Content protectContent Protect content from being forwarded or saved"
  },
  {
    "type": "field",
    "title": "Telegram: Allow Sending Without Reply",
    "slug": "telegram",
    "category": "Communication",
    "href": "/docs/nodes/telegram#operation-configure",
    "text": "Telegram Configuration Configure Allow Sending Without Reply allowSendingWithoutReply Allow sending even if replied-to message is missing"
  }
] satisfies DocsSearchIndexItem[];
