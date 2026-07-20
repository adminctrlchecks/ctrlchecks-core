import type { DocsSearchIndexItem } from '../search-index';

const fields = ['host', 'port', 'database', 'username', 'password', 'encrypt', 'trustServerCertificate', 'operation', 'query', 'table', 'data', 'where', 'procedureName', 'params', 'parameters', 'filters', 'limit'];
const operations = ['executeQuery', 'insert', 'update', 'delete', 'storedProcedure'];

export const sqlServerSearchIndex = [
  {
    type: 'node',
    title: 'SQL Server',
    slug: 'sql_server',
    category: 'Data',
    href: '/docs/nodes/sql_server',
    text: 'SQL Server Azure SQL T-SQL executeQuery insert update delete storedProcedure rows rowsAffected inserted records returnValue host port database username password encrypt trust certificate.',
  },
  ...operations.map((operation) => ({
    type: 'operation' as const,
    title: `SQL Server: ${operation}`,
    slug: 'sql_server',
    category: 'Data',
    href: `/docs/nodes/sql_server#operation-${operation}`,
    text: `SQL Server ${operation} T-SQL table data where params parameters rowsAffected stored procedure _error.`,
  })),
  ...fields.map((field) => ({
    type: 'field' as const,
    title: `SQL Server: ${field}`,
    slug: 'sql_server',
    category: 'Data',
    href: '/docs/nodes/sql_server',
    text: `SQL Server field ${field} database connection query table data where parameter credential workflow.`,
  })),
] satisfies DocsSearchIndexItem[];
