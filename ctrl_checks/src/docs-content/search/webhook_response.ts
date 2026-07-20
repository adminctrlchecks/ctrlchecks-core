import type { DocsSearchIndexItem } from '../search-index';

export const webhookResponseSearchIndex = [
  { type: 'node', title: 'Webhook Response', slug: 'webhook_response', category: 'HTTP & API', href: '/docs/nodes/webhook_response', text: 'Webhook Response returns statusCode headers and body for the webhook caller. It does not return sent or top-level responseCode.' },
  { type: 'operation', title: 'Webhook Response: Return HTTP Response', slug: 'webhook_response', category: 'HTTP & API', href: '/docs/nodes/webhook_response#operation-default', text: 'Configure the response status body and headers for an incoming webhook workflow.' },
  { type: 'field', title: 'Webhook Response: Status Code', slug: 'webhook_response', category: 'HTTP & API', href: '/docs/nodes/webhook_response#operation-default', text: 'statusCode is the HTTP status returned by runtime. responseCode is only a compatibility alias.' },
  { type: 'field', title: 'Webhook Response: Body', slug: 'webhook_response', category: 'HTTP & API', href: '/docs/nodes/webhook_response#operation-default', text: 'body is JSON plain text or mapped output returned to the caller and appears as {{$json.body}}.' },
  { type: 'field', title: 'Webhook Response: Headers', slug: 'webhook_response', category: 'HTTP & API', href: '/docs/nodes/webhook_response#operation-default', text: 'headers are optional response headers such as Content-Type CORS or Cache-Control.' },
] satisfies DocsSearchIndexItem[];
