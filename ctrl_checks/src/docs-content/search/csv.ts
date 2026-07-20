import type { DocsSearchIndexItem } from '../search-index';

export const csvSearchIndex = [
  { type: 'node', title: 'CSV', slug: 'csv', category: 'Data', href: '/docs/nodes/csv', text: 'CSV parse generate delimiter hasHeader rows items headers csv text data array' },
  { type: 'operation', title: 'CSV: Parse', slug: 'csv', category: 'Data', href: '/docs/nodes/csv#operation-parse', text: 'Parse CSV text into items rows headers with delimiter and hasHeader' },
  { type: 'field', title: 'CSV: Operation', slug: 'csv', category: 'Data', href: '/docs/nodes/csv#operation-parse', text: 'CSV operation dropdown parse generate' },
  { type: 'field', title: 'CSV: CSV', slug: 'csv', category: 'Data', href: '/docs/nodes/csv#operation-parse', text: 'CSV content to parse' },
  { type: 'field', title: 'CSV: Delimiter', slug: 'csv', category: 'Data', href: '/docs/nodes/csv#operation-parse', text: 'CSV delimiter comma semicolon tab pipe' },
  { type: 'field', title: 'CSV: Has Header', slug: 'csv', category: 'Data', href: '/docs/nodes/csv#operation-parse', text: 'CSV hasHeader first row column names' },
  { type: 'operation', title: 'CSV: Generate', slug: 'csv', category: 'Data', href: '/docs/nodes/csv#operation-generate', text: 'Generate CSV text from data array or input.items' },
  { type: 'field', title: 'CSV: Data', slug: 'csv', category: 'Data', href: '/docs/nodes/csv#operation-generate', text: 'CSV data array for generate optional uses input.items' },
] satisfies DocsSearchIndexItem[];
