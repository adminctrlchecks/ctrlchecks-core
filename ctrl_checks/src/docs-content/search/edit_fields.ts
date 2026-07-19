import type { DocsSearchIndexItem } from '../search-index';

export const editFieldsSearchIndex = [
  {
    type: 'node',
    title: 'Edit Fields',
    slug: 'edit_fields',
    category: 'Data',
    href: '/docs/nodes/edit_fields',
    text: 'Edit Fields add overwrite normalize key-value mappings fields current workflow item no credentials connect output to next service node',
  },
  {
    type: 'operation',
    title: 'Edit Fields: Execute',
    slug: 'edit_fields',
    category: 'Data',
    href: '/docs/nodes/edit_fields#operation-default',
    text: 'Execute adds configured field values to incoming data and overwrites matching keys. Use for customerEmail fullName priorityLabel needsManagerReview status and simple data preparation.',
  },
  {
    type: 'field',
    title: 'Edit Fields: Fields',
    slug: 'edit_fields',
    category: 'Data',
    href: '/docs/nodes/edit_fields#operation-default',
    text: 'fields optional key-value rows or JSON object. Values can be fixed text numbers booleans objects or expressions such as {{$json.email}} {{$json.fname}} {{$json.lname}}. Empty fields pass data through unchanged.',
  },
  {
    type: 'guide',
    title: 'Edit Fields: Connection Guidance',
    slug: 'edit_fields',
    category: 'Data',
    href: '/docs/nodes/edit_fields#connection',
    text: 'Edit Fields has no credentials and no third-party account. Connect incoming data into Edit Fields, connect output to the next action, and connect accounts on downstream Gmail Slack CRM sheet database or storage nodes.',
  },
] satisfies DocsSearchIndexItem[];
