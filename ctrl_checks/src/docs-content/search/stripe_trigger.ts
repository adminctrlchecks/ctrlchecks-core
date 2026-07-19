import type { DocsSearchIndexItem } from '../search-index';

export const stripeTriggerSearchIndex = [
  { type: 'node', title: 'Stripe Trigger', slug: 'stripe_trigger', category: 'Triggers', href: '/docs/nodes/stripe_trigger', text: 'Stripe Trigger webhook payment checkout invoice subscription customer refund signed Stripe-Signature' },
  { type: 'operation', title: 'Stripe Trigger: Payment Events', slug: 'stripe_trigger', category: 'Triggers', href: '/docs/nodes/stripe_trigger#operation-payment_billing_events', text: 'Stripe payment_intent.succeeded payment_intent.payment_failed checkout.session.completed charge.refunded amount currency customerId paymentIntentId' },
  { type: 'operation', title: 'Stripe Trigger: Billing Events', slug: 'stripe_trigger', category: 'Triggers', href: '/docs/nodes/stripe_trigger#operation-payment_billing_events', text: 'Stripe invoice.payment_succeeded customer.subscription.created customer.subscription.updated customer.subscription.deleted invoiceId subscriptionId status' },
] satisfies DocsSearchIndexItem[];
