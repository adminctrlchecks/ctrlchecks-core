import type { DocsSearchIndexItem } from '../search-index';

export const noopSearchIndex = [
  {
    type: 'node',
    title: 'NoOp',
    slug: 'noop',
    category: 'Logic',
    href: '/docs/nodes/noop',
    text: 'NoOp pass-through logic node that returns the incoming workflow object unchanged with no fields, no credentials, and no extra output wrapper.',
  },
  {
    type: 'operation',
    title: 'NoOp: Pass Through',
    slug: 'noop',
    category: 'Logic',
    href: '/docs/nodes/noop#operation-passthrough',
    text: 'Pass Through preserves fields such as orderId, status, and customerEmail exactly as received for downstream {{$json.field}} mapping.',
  },
] satisfies DocsSearchIndexItem[];
