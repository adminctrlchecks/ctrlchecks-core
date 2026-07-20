import type { DocsSearchIndexItem } from '../search-index';

const fields = ['operation', 'host', 'port', 'database', 'username', 'password', 'ssl', 'query', 'parameters', 'table', 'data', 'where'];

export const mysqlSearchIndex = [
  {
    type: 'node',
    title: 'MySQL',
    slug: 'mysql',
    category: 'Data',
    href: '/docs/nodes/mysql',
    text: 'MySQL executeQuery insert update delete SQL query parameters host port database username password ssl table data where rowsAffected inserted count database connection.',
  },
  {
    type: 'operation',
    title: 'MySQL: Execute Query',
    slug: 'mysql',
    category: 'Data',
    href: '/docs/nodes/mysql#operation-executeQuery',
    text: 'MySQL Execute Query raw SQL with question mark placeholders and Parameters returns rows and rowsAffected.',
  },
  {
    type: 'operation',
    title: 'MySQL: Insert',
    slug: 'mysql',
    category: 'Data',
    href: '/docs/nodes/mysql#operation-insert',
    text: 'MySQL Insert table data JSON writes rows returns inserted insertId count.',
  },
  {
    type: 'operation',
    title: 'MySQL: Update',
    slug: 'mysql',
    category: 'Data',
    href: '/docs/nodes/mysql#operation-update',
    text: 'MySQL Update table data where exact match rowsAffected.',
  },
  {
    type: 'operation',
    title: 'MySQL: Delete',
    slug: 'mysql',
    category: 'Data',
    href: '/docs/nodes/mysql#operation-delete',
    text: 'MySQL Delete table where exact match rowsAffected.',
  },
  ...fields.map((field) => ({
    type: 'field' as const,
    title: `MySQL: ${field}`,
    slug: 'mysql',
    category: 'Data',
    href: '/docs/nodes/mysql',
    text: `MySQL field ${field} executeQuery insert update delete SQL table connection.`,
  })),
] satisfies DocsSearchIndexItem[];
