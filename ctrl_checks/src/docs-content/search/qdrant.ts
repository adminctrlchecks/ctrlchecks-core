import type { DocsSearchIndexItem } from '../search-index';

export const qdrantSearchIndex = [
  {
    type: 'node',
    title: 'Qdrant',
    slug: 'qdrant',
    category: 'Data',
    href: '/docs/nodes/qdrant',
    text: 'Qdrant Search store and delete vectors in Qdrant collections for semantic search retrieval augmented generation recommendation AI memory query upsert delete vector payload collection url api key.',
  },
  {
    type: 'operation',
    title: 'Qdrant: Query/Search',
    slug: 'qdrant',
    category: 'Data',
    href: '/docs/nodes/qdrant#operation-query',
    text: 'Qdrant Query Search vector similarity search operation returns matches payload score withPayload limit collection url apiKey.',
  },
  {
    type: 'operation',
    title: 'Qdrant: Upsert',
    slug: 'qdrant',
    category: 'Data',
    href: '/docs/nodes/qdrant#operation-upsert',
    text: 'Qdrant Upsert store update vector point id payload collection url apiKey embedding.',
  },
  {
    type: 'operation',
    title: 'Qdrant: Delete',
    slug: 'qdrant',
    category: 'Data',
    href: '/docs/nodes/qdrant#operation-delete',
    text: 'Qdrant Delete remove point id from vector collection url apiKey.',
  },
  ...['operation', 'url', 'collection', 'apiKey', 'vector', 'limit', 'withPayload', 'id', 'payload'].map((field) => ({
    type: 'field' as const,
    title: `Qdrant: ${field}`,
    slug: 'qdrant',
    category: 'Data',
    href: '/docs/nodes/qdrant',
    text: `Qdrant field ${field} query upsert delete vector collection payload semantic search.`,
  })),
] satisfies DocsSearchIndexItem[];
