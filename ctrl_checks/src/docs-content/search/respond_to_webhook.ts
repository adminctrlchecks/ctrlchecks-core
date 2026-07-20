import type { DocsSearchIndexItem } from '../search-index';

export const respondToWebhookSearchIndex = [
  { type: 'node', title: 'Respond to Webhook', slug: 'respond_to_webhook', category: 'HTTP & API', href: '/docs/nodes/respond_to_webhook', text: 'Respond to Webhook normalizes statusCode headers and body for a webhook caller. Runtime returns statusCode headers body and no sent flag.' },
  { type: 'operation', title: 'Respond to Webhook: Return Webhook Response', slug: 'respond_to_webhook', category: 'HTTP & API', href: '/docs/nodes/respond_to_webhook#operation-default', text: 'Return the intended webhook response object. API layer sends it; runtime output is statusCode headers body.' },
  { type: 'field', title: 'Respond to Webhook: Status Code', slug: 'respond_to_webhook', category: 'HTTP & API', href: '/docs/nodes/respond_to_webhook#operation-default', text: 'statusCode is the visible HTTP status field. responseCode and status are compatibility aliases only.' },
  { type: 'field', title: 'Respond to Webhook: Response Body', slug: 'respond_to_webhook', category: 'HTTP & API', href: '/docs/nodes/respond_to_webhook#operation-default', text: 'responseBody is the visible body field and runtime normalizes it to body unless backend body is set.' },
  { type: 'field', title: 'Respond to Webhook: Headers', slug: 'respond_to_webhook', category: 'HTTP & API', href: '/docs/nodes/respond_to_webhook#operation-default', text: 'headers is optional JSON for response headers such as Content-Type or CORS. These are not request authentication headers.' },
  { type: 'field', title: 'Respond to Webhook: Body Alias', slug: 'respond_to_webhook', category: 'HTTP & API', href: '/docs/nodes/respond_to_webhook#operation-default', text: 'body is a backend alias accepted by runtime and wins over responseBody when both are set.' },
] satisfies DocsSearchIndexItem[];
