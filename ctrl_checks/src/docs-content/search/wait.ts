import type { DocsSearchIndexItem } from '../search-index';

export const waitSearchIndex = [
  {
    type: 'node',
    title: 'Wait',
    slug: 'wait',
    category: 'Logic',
    href: '/docs/nodes/wait',
    text: 'Wait pauses for a fixed duration, caps the visible wait at 5 minutes, and passes the incoming object through unchanged.',
  },
  {
    type: 'operation',
    title: 'Wait: Wait',
    slug: 'wait',
    category: 'Logic',
    href: '/docs/nodes/wait#operation-default',
    text: 'Wait sleeps for duration milliseconds or optional backend unit conversion, then returns the original input without resumed, reason, or waitedMs fields.',
  },
  {
    type: 'field',
    title: 'Wait: Duration',
    slug: 'wait',
    category: 'Logic',
    href: '/docs/nodes/wait#operation-default',
    text: 'Duration is the visible milliseconds field: 1000 is one second, 5000 is five seconds, and 300000 is the 5 minute cap.',
  },
  {
    type: 'field',
    title: 'Wait: Unit',
    slug: 'wait',
    category: 'Logic',
    href: '/docs/nodes/wait#operation-default',
    text: 'Unit is a backend-supported field for imported configs: milliseconds, seconds, minutes, or hours.',
  },
] satisfies DocsSearchIndexItem[];
