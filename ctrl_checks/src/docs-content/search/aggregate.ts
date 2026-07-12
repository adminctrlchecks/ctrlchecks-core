import type { DocsSearchIndexItem } from '../search-index';

export const aggregateSearchIndex = [
  { type: 'node', title: 'Aggregate', slug: 'aggregate', category: 'Data', href: '/docs/nodes/aggregate', text: 'Aggregate sum average count min max join input.items field delimiter' },
  ...['sum', 'avg', 'count', 'min', 'max', 'join'].map((operation) => ({
    type: 'operation' as const,
    title: `Aggregate: ${operation === 'avg' ? 'Average' : operation.charAt(0).toUpperCase() + operation.slice(1)}`,
    slug: 'aggregate',
    category: 'Data',
    href: `/docs/nodes/aggregate#operation-${operation}`,
    text: `Aggregate ${operation} operation over input.items using optional field path${operation === 'join' ? ' and delimiter' : ''}`,
  })),
  { type: 'field', title: 'Aggregate: Field', slug: 'aggregate', category: 'Data', href: '/docs/nodes/aggregate#operation-sum', text: 'Aggregate field optional nested path amount order.total' },
  { type: 'field', title: 'Aggregate: Delimiter', slug: 'aggregate', category: 'Data', href: '/docs/nodes/aggregate#operation-join', text: 'Aggregate join delimiter newline tab comma pipe' },
] satisfies DocsSearchIndexItem[];
