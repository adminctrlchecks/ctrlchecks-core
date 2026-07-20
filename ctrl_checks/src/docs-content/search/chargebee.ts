import type { DocsSearchIndexItem } from '../search-index';

export const chargebeeSearchIndex = [
  { type: 'node', title: 'Chargebee', slug: 'chargebee', category: 'Payment', href: '/docs/nodes/chargebee', text: 'Chargebee billing node creates customers, creates subscriptions, retrieves customers, and cancels subscriptions. Failures return success false and error, not _error.' },
  { type: 'operation', title: 'Chargebee: Create Customer', slug: 'chargebee', category: 'Payment', href: '/docs/nodes/chargebee#operation-create_customer', text: 'Create a customer with apiKey site and email. Output customer and customerId.' },
  { type: 'operation', title: 'Chargebee: Subscriptions and Get Customer', slug: 'chargebee', category: 'Payment', href: '/docs/nodes/chargebee#operation-create_subscription', text: 'create_subscription uses customerId and planId. get_customer uses customerId. cancel_subscription uses subscriptionId. Output subscription customerId subscriptionId error.' },
  { type: 'field', title: 'Chargebee: Fields', slug: 'chargebee', category: 'Payment', href: '/docs/nodes/chargebee#operation-create_customer', text: 'operation apiKey site customerId email planId subscriptionId. Site is subdomain only, such as acme for acme.chargebee.com.' },
  { type: 'field', title: 'Chargebee: Connection', slug: 'chargebee', category: 'Payment', href: '/docs/nodes/chargebee#operation-create_customer', text: 'Store Chargebee API key in Connections/credential vault where possible. API key is HTTP Basic Auth username.' },
] satisfies DocsSearchIndexItem[];
