import type { DocsSearchIndexItem } from '../search-index';

export const shopifyTriggerSearchIndex = [
  {
    type: 'node',
    title: 'Shopify Trigger',
    slug: 'shopify_trigger',
    category: 'Triggers',
    href: '/docs/nodes/shopify_trigger',
    text: 'Shopify Trigger starts workflows from signed Shopify webhook events for orders, customers, products, checkouts, refunds, and app uninstall events. Webhook subscriptions are created automatically and validated with X-Shopify-Hmac-Sha256.',
  },
  {
    type: 'operation',
    title: 'Shopify Trigger: Store Events',
    slug: 'shopify_trigger',
    category: 'Triggers',
    href: '/docs/nodes/shopify_trigger#operation-store_events',
    text: 'Store Events validates the X-Shopify-Hmac-Sha256 signature, filters topics shopDomain financialStatus fulfillmentStatus customerId productId minTotalPrice currency query, normalizes order/customer/product/checkout/refund payloads, and starts workflow executions.',
  },
  {
    type: 'field',
    title: 'Shopify Trigger fields',
    slug: 'shopify_trigger',
    category: 'Triggers',
    href: '/docs/nodes/shopify_trigger#operation-store_events',
    text: 'Fields include connectionId, shopDomain, topics orders/create orders/paid customers/create products/update refunds/create checkouts/update app/uninstalled, financialStatus, fulfillmentStatus, customerId, productId, minTotalPrice, currency, and query.',
  },
  {
    type: 'field',
    title: 'Shopify Trigger outputs',
    slug: 'shopify_trigger',
    category: 'Triggers',
    href: '/docs/nodes/shopify_trigger#operation-store_events',
    text: 'Outputs eventId eventType source userId username text timestamp topic shopDomain webhookId apiVersion objectId adminGraphqlApiId orderId orderName orderNumber financialStatus fulfillmentStatus totalPrice subtotalPrice totalTax currency customerId customerEmail customerName productId productTitle variantId inventoryItemId checkoutId cartToken refundId lineItems raw trigger workflow_id node_id sessionId _shopify.',
  },
  {
    type: 'field',
    title: 'Shopify Trigger connection setup',
    slug: 'shopify_trigger',
    category: 'Triggers',
    href: '/docs/nodes/shopify_trigger#connection-setup',
    text: 'Connect a Shopify Admin API custom app (Store URL, Admin API access token, App Client Secret / Webhook Signing Secret) in Connections. CtrlChecks automatically creates one webhook per topic and validates deliveries with X-Shopify-Hmac-Sha256.',
  },
] satisfies DocsSearchIndexItem[];
