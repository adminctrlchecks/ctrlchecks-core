import type { DocsSearchIndexItem } from '../search-index';

const fields = ['operation', 'index', 'apiKey', 'vector', 'topK', 'id', 'metadata', 'namespace'];

export const pineconeSearchIndex = [
  {
    type: 'node',
    title: 'Pinecone',
    slug: 'pinecone',
    category: 'Data',
    href: '/docs/nodes/pinecone',
    text: 'Pinecone vector database query upsert delete embeddings semantic search RAG index host API key vector topK id metadata namespace matches upsertedCount.',
  },
  {
    type: 'operation',
    title: 'Pinecone: Query',
    slug: 'pinecone',
    category: 'Data',
    href: '/docs/nodes/pinecone#operation-query',
    text: 'Pinecone Query nearest neighbor semantic search vector topK namespace returns matches score metadata.',
  },
  {
    type: 'operation',
    title: 'Pinecone: Upsert',
    slug: 'pinecone',
    category: 'Data',
    href: '/docs/nodes/pinecone#operation-upsert',
    text: 'Pinecone Upsert store replace vector id values metadata namespace returns upsertedCount.',
  },
  {
    type: 'operation',
    title: 'Pinecone: Delete',
    slug: 'pinecone',
    category: 'Data',
    href: '/docs/nodes/pinecone#operation-delete',
    text: 'Pinecone Delete remove vector by id namespace.',
  },
  ...fields.map((field) => ({
    type: 'field' as const,
    title: `Pinecone: ${field}`,
    slug: 'pinecone',
    category: 'Data',
    href: '/docs/nodes/pinecone',
    text: `Pinecone field ${field} query upsert delete vector index semantic search.`,
  })),
] satisfies DocsSearchIndexItem[];
