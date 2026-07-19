import type { DocsSearchIndexItem } from '../search-index';

export const whatsappCloudSearchIndex = [
  {
    "type": "node",
    "title": "WhatsApp Cloud (Deprecated)",
    "slug": "whatsapp_cloud",
    "category": "Communication",
    "href": "/docs/nodes/whatsapp_cloud",
    "text": "WhatsApp Cloud Deprecated — sends a plain WhatsApp text message. Kept only so existing saved workflows that already reference this node type keep working. Use the WhatsApp node instead. Communication"
  },
  {
    "type": "operation",
    "title": "WhatsApp Cloud: Send Text",
    "slug": "whatsapp_cloud",
    "category": "Communication",
    "href": "/docs/nodes/whatsapp_cloud#operation-sendText",
    "text": "WhatsApp Cloud Message Send Text Sends one free-form WhatsApp text message to a recipient, using the identical execution path and credential resolution as the WhatsApp node's Send Text operation. sendText"
  },
  {
    "type": "field",
    "title": "WhatsApp Cloud: To (phone number)",
    "slug": "whatsapp_cloud",
    "category": "Communication",
    "href": "/docs/nodes/whatsapp_cloud#operation-sendText",
    "text": "WhatsApp Cloud Message Send Text To (phone number) to Recipient phone number, E.164 format"
  },
  {
    "type": "field",
    "title": "WhatsApp Cloud: Message",
    "slug": "whatsapp_cloud",
    "category": "Communication",
    "href": "/docs/nodes/whatsapp_cloud#operation-sendText",
    "text": "WhatsApp Cloud Message Send Text Message text The free-form text message to send"
  },
  {
    "type": "field",
    "title": "WhatsApp Cloud: Message Type",
    "slug": "whatsapp_cloud",
    "category": "Communication",
    "href": "/docs/nodes/whatsapp_cloud#operation-sendText",
    "text": "WhatsApp Cloud Message Send Text Message Type messageType Inert leftover field with no effect on the actual send"
  },
  {
    "type": "field",
    "title": "WhatsApp Cloud: Resource",
    "slug": "whatsapp_cloud",
    "category": "Communication",
    "href": "/docs/nodes/whatsapp_cloud#operation-sendText",
    "text": "WhatsApp Cloud Message Send Text Resource resource Fixed to message internally, not exposed in this deprecated panel"
  },
  {
    "type": "field",
    "title": "WhatsApp Cloud: Operation",
    "slug": "whatsapp_cloud",
    "category": "Communication",
    "href": "/docs/nodes/whatsapp_cloud#operation-sendText",
    "text": "WhatsApp Cloud Message Send Text Operation operation Fixed to sendText internally, not exposed in this deprecated panel"
  },
  {
    "type": "field",
    "title": "WhatsApp Cloud: Phone Number Id",
    "slug": "whatsapp_cloud",
    "category": "Communication",
    "href": "/docs/nodes/whatsapp_cloud#operation-sendText",
    "text": "WhatsApp Cloud Message Send Text Phone Number Id phoneNumberId Backend-declared field, not exposed in this deprecated panel"
  },
  {
    "type": "field",
    "title": "WhatsApp Cloud: Media Url",
    "slug": "whatsapp_cloud",
    "category": "Communication",
    "href": "/docs/nodes/whatsapp_cloud#operation-sendText",
    "text": "WhatsApp Cloud Message Send Text Media Url mediaUrl Backend-declared field for sendMedia, not exposed in this deprecated panel"
  }
] satisfies DocsSearchIndexItem[];
