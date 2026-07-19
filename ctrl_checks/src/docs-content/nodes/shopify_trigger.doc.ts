import type { NodeDoc } from '../types';

export const shopifyTriggerDoc: NodeDoc = {
  slug: 'shopify_trigger',
  displayName: 'Shopify Trigger',
  category: 'Triggers',
  logoUrl: '/integrations-logos/Shopify.svg',
  description: 'Start a workflow from signed Shopify webhook events for orders, customers, products, checkouts, refunds, and app uninstall events.',
  credentialType: 'Shopify Admin API',
  credentialSetupSteps: [
    'In Shopify Admin, create or open a custom app with Admin API access.',
    'Grant the app access to the topics you want to subscribe to, such as orders, customers, products, refunds, and checkouts.',
    'Copy the Store URL, Admin API access token, and app client secret/webhook signing secret.',
    'In CtrlChecks, open Connections -> Add Connection -> Shopify and save those values.',
    'Choose the Shopify webhook topics this workflow should receive, then save and activate the workflow.',
    'CtrlChecks creates the Shopify webhook subscriptions automatically and validates deliveries with X-Shopify-Hmac-Sha256.',
  ],
  credentialDocsUrl: 'https://shopify.dev/docs/apps/build/webhooks/verify-deliveries',
  resources: [
    {
      name: 'Webhook Events',
      description: 'Receive Shopify webhook deliveries signed with X-Shopify-Hmac-Sha256.',
      operations: [
        {
          name: 'Store Events',
          value: 'store_events',
          description: 'Trigger on Shopify order, customer, product, refund, checkout, and app uninstall webhook topics.',
          fields: [
            { name: 'Shop Domain Filter', internalKey: 'shopDomain', type: 'string', required: false, description: 'Optional myshopify.com shop-domain filter. The saved connection Store URL is used when omitted.', placeholder: 'my-store.myshopify.com' },
            { name: 'Webhook Topics', internalKey: 'topics', type: 'string', required: false, description: 'Comma-separated Shopify webhook topics.', placeholder: 'orders/create, orders/paid, customers/create' },
            { name: 'Financial Status', internalKey: 'financialStatus', type: 'string', required: false, description: 'Optional order financial status filter.', placeholder: 'paid' },
            { name: 'Fulfillment Status', internalKey: 'fulfillmentStatus', type: 'string', required: false, description: 'Optional order fulfillment status filter.', placeholder: 'fulfilled' },
            { name: 'Customer ID', internalKey: 'customerId', type: 'string', required: false, description: 'Optional Shopify customer ID filter.', placeholder: '1234567890' },
            { name: 'Product ID', internalKey: 'productId', type: 'string', required: false, description: 'Optional Shopify product ID filter.', placeholder: '1234567890' },
            { name: 'Minimum Total Price', internalKey: 'minTotalPrice', type: 'number', required: false, description: 'Optional minimum order total filter.', placeholder: '100' },
            { name: 'Currency', internalKey: 'currency', type: 'string', required: false, description: 'Optional ISO currency filter.', placeholder: 'usd' },
            { name: 'Keyword Filter', internalKey: 'query', type: 'string', required: false, description: 'Optional keyword filter for order, customer, product, ID, and status fields.' },
          ],
          outputExample: { eventType: 'orders_paid', topic: 'orders/paid', orderId: '1234567890', orderName: '#1001', customerEmail: 'buyer@example.com', totalPrice: 125.5, currency: 'usd', raw: {} },
          outputDescription: 'Normalized fields include eventId, eventType, topic, shopDomain, order/customer/product/checkout/refund IDs, status fields, totals, currency, lineItems, timestamp, and raw.',
          usageExample: {
            scenario: 'Route a paid Shopify order to fulfillment',
            inputValues: { topics: 'orders/paid', financialStatus: 'paid' },
            expectedOutput: 'A normalized Shopify order payload available as {{$json.orderId}}, {{$json.customerEmail}}, {{$json.totalPrice}}, and {{$json.lineItems}}.',
          },
          externalDocsUrl: 'https://shopify.dev/docs/api/admin-rest/latest/resources/webhook',
        },
      ],
    },
  ],
  commonErrors: [
    { error: 'Connection required', cause: 'No Shopify Admin API connection is saved.', fix: 'Save Shopify in Connections, then activate the workflow again.' },
    { error: 'Webhook secret required', cause: 'The Shopify connection is missing the app client secret/webhook signing secret needed for HMAC validation.', fix: 'Add the Shopify app client secret to the saved connection and save the active workflow again.' },
    { error: 'Webhook creation failed', cause: 'The Admin API token is invalid, lacks webhook/topic permissions, or the callback URL is not reachable.', fix: 'Confirm the token scopes, shop domain, and PUBLIC_BASE_URL, then re-register.' },
    { error: 'Invalid signature', cause: 'The stored app client secret does not match Shopify, or the raw body was changed before validation.', fix: 'Update the connection secret and re-register the webhook subscriptions.' },
  ],
  relatedNodes: ['shopify', 'stripe_trigger', 'webhook'],
};
