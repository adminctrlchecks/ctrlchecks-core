import type { DocsSearchIndexItem } from '../search-index';

const fields = ['operation', 'user', 'password', 'connectionString', 'schema', 'table', 'mappingColumnMode', 'columnMappings', 'selectRows', 'combineConditions', 'sort', 'returnAll', 'limit', 'deleteCommand', 'statement', 'bindParams', 'statementBatching', 'autoCommit', 'outputColumns', 'outputNumbersAsString', 'fetchArraySize', 'prefetchRows'];

export const oracleDatabaseSearchIndex = [
  {
    type: 'node',
    title: 'Oracle Database',
    slug: 'oracle_database',
    category: 'Data',
    href: '/docs/nodes/oracle_database',
    text: 'Oracle Database select insert update insert_or_update delete execute_sql schema table SQL PL/SQL bindParams columnMappings selectRows rows rowsAffected meta error.',
  },
  ...['select', 'insert', 'update', 'insert_or_update', 'delete', 'execute_sql'].map((operation) => ({
    type: 'operation' as const,
    title: `Oracle Database: ${operation}`,
    slug: 'oracle_database',
    category: 'Data',
    href: `/docs/nodes/oracle_database#operation-${operation}`,
    text: `Oracle Database operation ${operation} schema table statement bind parameters rows rowsAffected meta.`,
  })),
  ...fields.map((field) => ({
    type: 'field' as const,
    title: `Oracle Database: ${field}`,
    slug: 'oracle_database',
    category: 'Data',
    href: '/docs/nodes/oracle_database',
    text: `Oracle Database field ${field} select insert update upsert delete execute SQL.`,
  })),
] satisfies DocsSearchIndexItem[];
