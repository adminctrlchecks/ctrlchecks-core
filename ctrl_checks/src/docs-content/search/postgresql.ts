import type { DocsSearchIndexItem } from '../search-index';

const fields = ['operation', 'connectionString', 'host', 'port', 'database', 'username', 'password', 'ssl', 'query', 'parameters', 'table', 'data', 'where'];

export const postgresqlSearchIndex = [
  {
    type: 'node',
    title: 'PostgreSQL',
    slug: 'postgresql',
    category: 'Data',
    href: '/docs/nodes/postgresql',
    text: 'PostgreSQL executeQuery insert update delete SQL query parameters connectionString host port database username password ssl table data where rows rowsAffected inserted count.',
  },
  {
    type: 'operation',
    title: 'PostgreSQL: Execute Query',
    slug: 'postgresql',
    category: 'Data',
    href: '/docs/nodes/postgresql#operation-executeQuery',
    text: 'PostgreSQL Execute Query raw SQL with $1 parameters returns rows rowsAffected.',
  },
  {
    type: 'operation',
    title: 'PostgreSQL: Insert',
    slug: 'postgresql',
    category: 'Data',
    href: '/docs/nodes/postgresql#operation-insert',
    text: 'PostgreSQL Insert table data JSON returning inserted count.',
  },
  {
    type: 'operation',
    title: 'PostgreSQL: Update',
    slug: 'postgresql',
    category: 'Data',
    href: '/docs/nodes/postgresql#operation-update',
    text: 'PostgreSQL Update table data where returning rows rowsAffected.',
  },
  {
    type: 'operation',
    title: 'PostgreSQL: Delete',
    slug: 'postgresql',
    category: 'Data',
    href: '/docs/nodes/postgresql#operation-delete',
    text: 'PostgreSQL Delete table where returning rows rowsAffected.',
  },
  ...fields.map((field) => ({
    type: 'field' as const,
    title: `PostgreSQL: ${field}`,
    slug: 'postgresql',
    category: 'Data',
    href: '/docs/nodes/postgresql',
    text: `PostgreSQL field ${field} executeQuery insert update delete SQL table connection.`,
  })),
] satisfies DocsSearchIndexItem[];
