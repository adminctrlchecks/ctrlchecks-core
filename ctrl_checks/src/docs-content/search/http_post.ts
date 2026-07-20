import type { DocsSearchIndexItem } from '../search-index';

export const httpPostSearchIndex = [
  { type: 'node', title: 'HTTP POST', slug: 'http_post', category: 'HTTP & API', href: '/docs/nodes/http_post', text: 'HTTP POST sends body data to an external URL by rewriting to HTTP Request with method POST. Output includes status statusText headers body data url method responseTime and _error on failures.' },
  { type: 'operation', title: 'HTTP POST: Send POST Request', slug: 'http_post', category: 'HTTP & API', href: '/docs/nodes/http_post#operation-default', text: 'Send a POST request to create records submit webhooks trigger APIs or hand off workflow data.' },
  { type: 'field', title: 'HTTP POST: URL', slug: 'http_post', category: 'HTTP & API', href: '/docs/nodes/http_post#operation-default', text: 'url is the full destination endpoint including https://. Map dynamic pieces with {{$json.field}}.' },
  { type: 'field', title: 'HTTP POST: Headers', slug: 'http_post', category: 'HTTP & API', href: '/docs/nodes/http_post#operation-default', text: 'headers is optional JSON for Content-Type Authorization idempotency keys or other API headers. Prefer secure references for tokens.' },
  { type: 'field', title: 'HTTP POST: Body', slug: 'http_post', category: 'HTTP & API', href: '/docs/nodes/http_post#operation-default', text: 'body is required JSON or a mapped value sent in the POST payload. Use {{$json.email}} style mappings.' },
] satisfies DocsSearchIndexItem[];
