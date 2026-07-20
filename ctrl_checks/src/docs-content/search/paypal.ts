import type { DocsSearchIndexItem } from '../search-index';

export const paypalSearchIndex = [
  { type: 'node', title: 'PayPal', slug: 'paypal', category: 'Ecommerce', href: '/docs/nodes/paypal', text: 'PayPal creates Checkout orders and refunds captures. Runtime-supported operations are charge/createorder/order and refund; visible panel aliases are currently unsupported.' },
  { type: 'operation', title: 'PayPal: Create Checkout Order', slug: 'paypal', category: 'Ecommerce', href: '/docs/nodes/paypal#operation-charge', text: 'Create a PayPal Checkout order with amount, currency, description, environment, and a saved PayPal OAuth connection or accessToken. Output is success and order.' },
  { type: 'operation', title: 'PayPal: Refund Capture', slug: 'paypal', category: 'Ecommerce', href: '/docs/nodes/paypal#operation-refund', text: 'Refund a PayPal capture using paymentId as the capture ID, optional amount, currency, environment, and PayPal OAuth connection. Output is success and refund.' },
  { type: 'field', title: 'PayPal: Operation', slug: 'paypal', category: 'Ecommerce', href: '/docs/nodes/paypal#operation-charge', text: 'operation supports charge createorder order refund. create_order get_order capture_order create_refund get_access_token are visible but unsupported today.' },
  { type: 'field', title: 'PayPal: Access Token', slug: 'paypal', category: 'Ecommerce', href: '/docs/nodes/paypal#operation-charge', text: 'accessToken is an optional direct OAuth token fallback. Prefer PayPal Connections and credential vault.' },
  { type: 'field', title: 'PayPal: Amount Currency Description', slug: 'paypal', category: 'Ecommerce', href: '/docs/nodes/paypal#operation-charge', text: 'amount is a decimal value, currency is a three-letter code, description is the PayPal order purchase unit note.' },
  { type: 'field', title: 'PayPal: Payment ID', slug: 'paypal', category: 'Ecommerce', href: '/docs/nodes/paypal#operation-refund', text: 'paymentId is the PayPal capture ID required for refund. It is not the orderId.' },
] satisfies DocsSearchIndexItem[];
