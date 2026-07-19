import type { DocsSearchIndexItem } from '../search-index';

export const setSearchIndex = [
  {
    type: 'node',
    title: 'Set',
    slug: 'set',
    category: 'Data',
    href: '/docs/nodes/set',
    text: 'Set add fields overwrite fields normalize workflow data map form webhook sheet CRM API values no credentials connect output to next action',
  },
  {
    type: 'operation',
    title: 'Set: Set Fields',
    slug: 'set',
    category: 'Data',
    href: '/docs/nodes/set#operation-default',
    text: 'Set Fields creates new output fields or replaces existing fields using a JSON object. Use for customerEmail fullName leadSource status lifecycleStage readyForSales and other predictable field names.',
  },
  {
    type: 'field',
    title: 'Set: Fields (JSON)',
    slug: 'set',
    category: 'Data',
    href: '/docs/nodes/set#operation-default',
    text: 'fields required JSON object with field names and values. Values can be fixed text numbers booleans nested objects or expressions such as {{$json.email}} and {{$json.firstName}}. Matching names overwrite incoming values.',
  },
  {
    type: 'guide',
    title: 'Set: Connection Guidance',
    slug: 'set',
    category: 'Data',
    href: '/docs/nodes/set#connection',
    text: 'Set has no credentials and no third-party account. Connect incoming data into Set, connect Set output to the next node, and connect accounts on downstream Gmail Slack CRM sheet database or storage nodes.',
  },
] satisfies DocsSearchIndexItem[];
