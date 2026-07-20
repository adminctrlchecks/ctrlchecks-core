import type { DocsSearchIndexItem } from '../search-index';

export const graphqlSearchIndex = [
  { type: 'node', title: 'GraphQL', slug: 'graphql', category: 'HTTP & API', href: '/docs/nodes/graphql', text: 'GraphQL sends queries and mutations as HTTP POST requests with url query operationName variables headers and timeout. Output follows HTTP Request: status statusText headers body data url method responseTime or _error.' },
  { type: 'operation', title: 'GraphQL: Execute GraphQL POST', slug: 'graphql', category: 'HTTP & API', href: '/docs/nodes/graphql#operation-default', text: 'Execute a GraphQL query or mutation by posting query variables and operationName to the endpoint. GraphQL data is inside body.data and GraphQL errors are inside body.errors.' },
  { type: 'field', title: 'GraphQL: URL', slug: 'graphql', category: 'HTTP & API', href: '/docs/nodes/graphql#operation-default', text: 'url is the full GraphQL endpoint such as https://api.example.com/graphql and may be mapped from {{$json.endpoint}}.' },
  { type: 'field', title: 'GraphQL: Query', slug: 'graphql', category: 'HTTP & API', href: '/docs/nodes/graphql#operation-default', text: 'query is GraphQL document text. Use variables such as $id and map actual values in the variables object.' },
  { type: 'field', title: 'GraphQL: Operation Name', slug: 'graphql', category: 'HTTP & API', href: '/docs/nodes/graphql#operation-default', text: 'operationName selects the exact named query or mutation when the GraphQL document contains multiple operations.' },
  { type: 'field', title: 'GraphQL: Variables', slug: 'graphql', category: 'HTTP & API', href: '/docs/nodes/graphql#operation-default', text: 'variables is a JSON object. Invalid JSON or unparseable templates silently fall back to {} at runtime.' },
  { type: 'field', title: 'GraphQL: Headers', slug: 'graphql', category: 'HTTP & API', href: '/docs/nodes/graphql#operation-default', text: 'headers is a JSON object for Authorization Content-Type tenant or other HTTP headers. Prefer secure secret references for tokens.' },
  { type: 'field', title: 'GraphQL: Timeout', slug: 'graphql', category: 'HTTP & API', href: '/docs/nodes/graphql#operation-default', text: 'timeout is milliseconds passed to HTTP Request. Use 30000 for 30 seconds.' },
] satisfies DocsSearchIndexItem[];
