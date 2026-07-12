import type { DocsSearchIndexItem } from '../search-index';

export const jsonParserSearchIndex = [
  {
    type: 'node',
    title: 'JSON Parser',
    slug: 'json_parser',
    category: 'Data',
    href: '/docs/nodes/json_parser',
    text: 'JSON Parser Parse a JSON string into workflow data. Fields: json and extractFields.'
  },
  {
    type: 'operation',
    title: 'JSON Parser: Parse',
    slug: 'json_parser',
    category: 'Data',
    href: '/docs/nodes/json_parser#operation-default',
    text: 'Parse JSON and optionally copy top-level extractFields.'
  },
  {
    type: 'field',
    title: 'JSON Parser: JSON',
    slug: 'json_parser',
    category: 'Data',
    href: '/docs/nodes/json_parser#operation-default',
    text: 'json JSON string or template expression to parse'
  },
  {
    type: 'field',
    title: 'JSON Parser: Extract Fields',
    slug: 'json_parser',
    category: 'Data',
    href: '/docs/nodes/json_parser#operation-default',
    text: 'extractFields Optional array of top-level field names'
  }
] satisfies DocsSearchIndexItem[];
