import type { DocsSearchIndexItem } from '../search-index';

export const splitInBatchesSearchIndex = [
  {
    type: 'node',
    title: 'Split In Batches',
    slug: 'split_in_batches',
    category: 'Logic',
    href: '/docs/nodes/split_in_batches',
    text: 'Split In Batches divide array into smaller groups batches batchSize totalBatches items warning no credentials DAG runtime does not run branch once per batch',
  },
  {
    type: 'operation',
    title: 'Split In Batches: Execute',
    slug: 'split_in_batches',
    category: 'Logic',
    href: '/docs/nodes/split_in_batches#operation-default',
    text: 'Execute reads array from expression or input.items, splits it into batches, exposes first batch as items, returns all groups in batches, and includes batchSize totalBatches _warning metadata.',
  },
  {
    type: 'field',
    title: 'Split In Batches: Array Expression',
    slug: 'split_in_batches',
    category: 'Logic',
    href: '/docs/nodes/split_in_batches#operation-default',
    text: 'array optional expression path that resolves to a list such as {{$json.items}} {{$json.rows}} {{$json.contacts}} {{$json.orders}} {{$json.data.records}}. Leave empty to use input.items.',
  },
  {
    type: 'field',
    title: 'Split In Batches: Batch Size',
    slug: 'split_in_batches',
    category: 'Logic',
    href: '/docs/nodes/split_in_batches#operation-default',
    text: 'batchSize required positive number records per batch. Defaults to 10 when blank or invalid. Use 10 25 50 100 depending on downstream service limits.',
  },
  {
    type: 'guide',
    title: 'Split In Batches: Connection Guidance',
    slug: 'split_in_batches',
    category: 'Logic',
    href: '/docs/nodes/split_in_batches#connection',
    text: 'Split In Batches has no credentials. Connect previous array output into Split In Batches and connect output to next node. Downstream service nodes still need their own account connection and permissions.',
  },
] satisfies DocsSearchIndexItem[];
