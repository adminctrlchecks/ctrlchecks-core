import type { DocsSearchIndexItem } from '../search-index';

const fields = ['accessToken', 'operation', 'path', 'content', 'dataBase64', 'data', 'recursive'];
const operations = ['read', 'upload', 'list', 'delete'];

export const dropboxSearchIndex = [
  {
    type: 'node',
    title: 'Dropbox',
    slug: 'dropbox',
    category: 'File',
    href: '/docs/nodes/dropbox',
    text: 'Dropbox OAuth2 read download upload list delete path content dataBase64 recursive items cursor metadata sizeBytes deleted connection credential.',
  },
  ...operations.map((operation) => ({
    type: 'operation' as const,
    title: `Dropbox: ${operation}`,
    slug: 'dropbox',
    category: 'File',
    href: `/docs/nodes/dropbox#operation-${operation}`,
    text: `Dropbox ${operation} file folder path metadata dataBase64 items cursor deleted _error.`,
  })),
  ...fields.map((field) => ({
    type: 'field' as const,
    title: `Dropbox: ${field}`,
    slug: 'dropbox',
    category: 'File',
    href: '/docs/nodes/dropbox',
    text: `Dropbox field ${field} OAuth file path upload download list delete credential workflow.`,
  })),
] satisfies DocsSearchIndexItem[];
