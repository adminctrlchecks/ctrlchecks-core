import type { DocsSearchIndexItem } from '../search-index';

export const loopSearchIndex = [
  {
    type: 'node',
    title: 'Loop',
    slug: 'loop',
    category: 'Logic',
    href: '/docs/nodes/loop',
    text: 'Loop expose array downstream items maxIterations loop metadata truncated warning no credentials DAG runtime does not run branch once per item',
  },
  {
    type: 'operation',
    title: 'Loop: Configure',
    slug: 'loop',
    category: 'Logic',
    href: '/docs/nodes/loop#operation-default',
    text: 'Configure reads array from expression or input.items, caps it at Max Iterations, writes selected records to items, and adds loop.maxIterations loop.iterations loop.truncated metadata.',
  },
  {
    type: 'field',
    title: 'Loop: Array Expression',
    slug: 'loop',
    category: 'Logic',
    href: '/docs/nodes/loop#operation-default',
    text: 'array optional expression path that resolves to a list such as {{$json.rows}} {{$json.contacts}} {{$json.orders}} {{$json.data.records}}. Leave empty to use input.items.',
  },
  {
    type: 'field',
    title: 'Loop: Max Iterations',
    slug: 'loop',
    category: 'Logic',
    href: '/docs/nodes/loop#operation-default',
    text: 'maxIterations positive number cap for how many list records are exposed downstream. Defaults to 100, sets loop.truncated true when original list is longer.',
  },
  {
    type: 'guide',
    title: 'Loop: Connection Guidance',
    slug: 'loop',
    category: 'Logic',
    href: '/docs/nodes/loop#connection',
    text: 'Loop has no credentials. Connect previous array output into Loop and connect Loop output to next node. Downstream service nodes still need their own account connection and permissions.',
  },
] satisfies DocsSearchIndexItem[];
