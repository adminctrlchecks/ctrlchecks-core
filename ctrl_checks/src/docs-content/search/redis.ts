import type { DocsSearchIndexItem } from '../search-index';

const fields = ['operation', 'host', 'port', 'password', 'db', 'tls', 'key', 'value', 'ttl', 'hash', 'field', 'command', 'args'];
const operations = ['get', 'set', 'delete', 'incr', 'hget', 'hset', 'lpush', 'rpop', 'command'];

export const redisSearchIndex = [
  {
    type: 'node',
    title: 'Redis',
    slug: 'redis',
    category: 'Data',
    href: '/docs/nodes/redis',
    text: 'Redis cache key value get set delete incr hget hset lpush rpop command host port password db tls ttl value result deleted count length credential connection.',
  },
  ...operations.map((operation) => ({
    type: 'operation' as const,
    title: `Redis: ${operation}`,
    slug: 'redis',
    category: 'Data',
    href: `/docs/nodes/redis#operation-${operation}`,
    text: `Redis ${operation} operation runtime output value result deleted count length hash field command args _error.`,
  })),
  ...fields.map((field) => ({
    type: 'field' as const,
    title: `Redis: ${field}`,
    slug: 'redis',
    category: 'Data',
    href: '/docs/nodes/redis',
    text: `Redis field ${field} connection cache operation mapping TTL TLS credential workflow.`,
  })),
] satisfies DocsSearchIndexItem[];
