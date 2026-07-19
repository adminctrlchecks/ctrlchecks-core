import type { NodeDoc } from '../types';

export const stripeTriggerDoc: NodeDoc = {
  slug: 'stripe_trigger',
  displayName: 'Stripe Trigger',
  category: 'Triggers',
  logoUrl: '/integrations-logos/Stripe.svg',
  description: 'Start a workflow from signed Stripe webhook events for Checkout, payments, invoices, subscriptions, customers, and refunds.',
  credentialType: 'Stripe Secret Key',
  credentialSetupSteps: [
    'Open Stripe Dashboard -> Developers -> API keys.',
    'Copy a Secret key. Use a test key while building and a live key only for real payment workflows.',
    'In CtrlChecks, open Connections -> Add Connection -> Stripe and save the key.',
    'Choose the Stripe event types this workflow should receive, then save and activate the workflow.',
    'CtrlChecks creates the Stripe webhook endpoint automatically and stores the returned signing secret for Stripe-Signature validation.',
  ],
  credentialDocsUrl: 'https://docs.stripe.com/webhooks',
  resources: [
    {
      name: 'Webhook Events',
      description: 'Receive Stripe webhook deliveries signed with Stripe-Signature.',
      operations: [
        {
          name: 'Payment And Billing Events',
          value: 'payment_billing_events',
          description: 'Trigger on Stripe Checkout, PaymentIntent, invoice, subscription, customer, and refund events.',
          fields: [
            { name: 'Event Types', internalKey: 'eventTypes', type: 'string', required: false, description: 'Comma-separated Stripe event type names.', placeholder: 'checkout.session.completed, payment_intent.succeeded' },
            { name: 'Stripe Connect Events', internalKey: 'connect', type: 'boolean', required: false, description: 'Receive events for connected accounts in a Stripe Connect platform.' },
            { name: 'Live Mode Only', internalKey: 'livemode', type: 'boolean', required: false, description: 'Optional filter for live-mode or test-mode events.' },
            { name: 'Customer ID', internalKey: 'customerId', type: 'string', required: false, description: 'Optional Stripe customer ID filter.', placeholder: 'cus_...' },
            { name: 'Currency', internalKey: 'currency', type: 'string', required: false, description: 'Optional ISO currency filter.', placeholder: 'usd' },
            { name: 'Minimum Amount', internalKey: 'minAmount', type: 'number', required: false, description: 'Optional minimum amount in the smallest currency unit.', placeholder: '1000' },
            { name: 'Keyword Filter', internalKey: 'query', type: 'string', required: false, description: 'Optional keyword filter for customer email, object ID, description, and status.' },
          ],
          outputExample: { eventType: 'payment_intent.succeeded', paymentIntentId: 'pi_123', customerId: 'cus_123', amount: 2500, currency: 'usd', status: 'succeeded', raw: {} },
          outputDescription: 'Normalized fields include eventId, eventType, object fields, customer fields, payment/invoice/subscription IDs, amount fields, status, metadata, timestamp, and raw.',
          usageExample: {
            scenario: 'Fulfill a paid Stripe Checkout order',
            inputValues: { eventTypes: 'checkout.session.completed, payment_intent.succeeded', currency: 'usd' },
            expectedOutput: 'A normalized Stripe event payload available as {{$json.eventType}}, {{$json.customerId}}, {{$json.amount}}, and {{$json.paymentIntentId}}.',
          },
          externalDocsUrl: 'https://docs.stripe.com/webhooks',
        },
      ],
    },
  ],
  commonErrors: [
    { error: 'Connection required', cause: 'No Stripe Secret Key is saved.', fix: 'Save Stripe in Connections, then activate the workflow again.' },
    { error: 'Webhook creation failed', cause: 'The Stripe key is invalid, restricted from managing webhook endpoints, or the callback URL is not reachable.', fix: 'Use a valid Stripe secret key and confirm PUBLIC_BASE_URL points to the worker.' },
    { error: 'Invalid signature', cause: 'The stored webhook signing secret does not match Stripe, or the raw body was changed before validation.', fix: 'Re-register the webhook by saving the active workflow again.' },
  ],
  relatedNodes: ['stripe', 'shopify', 'webhook'],
};
