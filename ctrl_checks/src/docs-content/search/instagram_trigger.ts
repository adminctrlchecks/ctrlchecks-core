import type { DocsSearchIndexItem } from '../search-index';

export const instagramTriggerSearchIndex = [
  {
    type: 'node',
    title: 'Instagram Trigger',
    slug: 'instagram_trigger',
    category: 'Triggers',
    href: '/docs/nodes/instagram_trigger',
    text: 'Instagram Trigger receives real-time Instagram DMs, comments, mentions, story replies, and postbacks through Meta webhooks.',
  },
  {
    type: 'operation',
    title: 'Instagram Trigger: Receive Instagram Event',
    slug: 'instagram_trigger',
    category: 'Triggers',
    href: '/docs/nodes/instagram_trigger#operation-receive-instagram-event',
    text: 'Receive Instagram Event validates Meta challenge and signature, normalizes the payload, creates an execution, and starts the workflow.',
  },
  {
    type: 'field',
    title: 'Instagram Trigger: Event Types',
    slug: 'instagram_trigger',
    category: 'Triggers',
    href: '/docs/nodes/instagram_trigger#operation-receive-instagram-event',
    text: 'eventTypes supports message, comment, mention, message.story_reply, and postback filters.',
  },
  {
    type: 'field',
    title: 'Instagram Trigger: Verify Token',
    slug: 'instagram_trigger',
    category: 'Triggers',
    href: '/docs/nodes/instagram_trigger#operation-receive-instagram-event',
    text: 'verifyToken must match the Meta Webhooks callback verification token.',
  },
  {
    type: 'field',
    title: 'Instagram Trigger: Validate Signature',
    slug: 'instagram_trigger',
    category: 'Triggers',
    href: '/docs/nodes/instagram_trigger#operation-receive-instagram-event',
    text: 'validateSignature checks Meta X-Hub-Signature-256 with META_APP_SECRET, INSTAGRAM_APP_SECRET, or FACEBOOK_APP_SECRET.',
  },
] satisfies DocsSearchIndexItem[];
