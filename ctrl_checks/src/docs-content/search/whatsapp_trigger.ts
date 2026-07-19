import type { DocsSearchIndexItem } from '../search-index';

export const whatsappTriggerSearchIndex = [
  {
    type: 'node',
    title: 'WhatsApp Trigger',
    slug: 'whatsapp_trigger',
    category: 'Triggers',
    href: '/docs/nodes/whatsapp_trigger',
    text: 'WhatsApp Trigger starts workflows in real time from Meta WhatsApp Cloud incoming messages and status webhooks.',
  },
  {
    type: 'operation',
    title: 'WhatsApp Trigger: Receive Event',
    slug: 'whatsapp_trigger',
    category: 'Triggers',
    href: '/docs/nodes/whatsapp_trigger#operation-receive_event',
    text: 'Receive WhatsApp Cloud webhook events and normalize chatId from waId text messageId phoneNumberId eventType status timestamp raw.',
  },
  {
    type: 'field',
    title: 'WhatsApp Trigger: Verify Token',
    slug: 'whatsapp_trigger',
    category: 'Triggers',
    href: '/docs/nodes/whatsapp_trigger#operation-receive_event',
    text: 'Verify Token validates Meta webhook subscription challenge requests.',
  },
  {
    type: 'field',
    title: 'WhatsApp Trigger: Signature Validation',
    slug: 'whatsapp_trigger',
    category: 'Triggers',
    href: '/docs/nodes/whatsapp_trigger#operation-receive_event',
    text: 'Validate X-Hub-Signature-256 with META_APP_SECRET FACEBOOK_APP_SECRET or WHATSAPP_APP_SECRET.',
  },
] satisfies DocsSearchIndexItem[];
