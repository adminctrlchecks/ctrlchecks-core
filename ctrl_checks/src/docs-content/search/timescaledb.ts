import type { DocsSearchIndexItem } from '../search-index';

const fields = ['host', 'port', 'database', 'username', 'password', 'ssl', 'operation', 'query', 'params', 'table', 'data', 'where', 'timeColumn', 'interval', 'bucketColumn', 'valueColumn'];
const operations = ['executeQuery', 'insert', 'update', 'delete', 'timeBucket', 'first', 'last'];

export const timescaledbSearchIndex = [
  {
    type: 'node',
    title: 'TimescaleDB',
    slug: 'timescaledb',
    category: 'Data',
    href: '/docs/nodes/timescaledb',
    text: 'TimescaleDB PostgreSQL time-series executeQuery insert update delete timeBucket first last hypertable rows rowsAffected count SSL connection.',
  },
  ...operations.map((operation) => ({
    type: 'operation' as const,
    title: `TimescaleDB: ${operation}`,
    slug: 'timescaledb',
    category: 'Data',
    href: `/docs/nodes/timescaledb#operation-${operation}`,
    text: `TimescaleDB ${operation} time bucket first last query table data where params rows count _error.`,
  })),
  ...fields.map((field) => ({
    type: 'field' as const,
    title: `TimescaleDB: ${field}`,
    slug: 'timescaledb',
    category: 'Data',
    href: '/docs/nodes/timescaledb',
    text: `TimescaleDB field ${field} PostgreSQL hypertable time-series connection credential workflow.`,
  })),
] satisfies DocsSearchIndexItem[];
