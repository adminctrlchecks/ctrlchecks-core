import type { DocsSearchIndexItem } from '../search-index';

export const woocommerceSearchIndex = [
  { type: 'node', title: 'WooCommerce', slug: 'woocommerce', category: 'Ecommerce', href: '/docs/nodes/woocommerce', text: 'WooCommerce REST API node for get list create update delete products orders customers and advanced resources. Runtime expects apiKey apiSecret id resource operation.' },
  { type: 'operation', title: 'WooCommerce: Get or List', slug: 'woocommerce', category: 'Ecommerce', href: '/docs/nodes/woocommerce#operation-get', text: 'Get one WooCommerce item when id is present, or list records with perPage when no id is present. Output item or items.' },
  { type: 'operation', title: 'WooCommerce: Create Update Delete', slug: 'woocommerce', category: 'Ecommerce', href: '/docs/nodes/woocommerce#operation-create', text: 'Create/update sends data JSON. Delete uses force=true and returns success deleted item.' },
  { type: 'field', title: 'WooCommerce: Runtime Fields', slug: 'woocommerce', category: 'Ecommerce', href: '/docs/nodes/woocommerce#operation-get', text: 'storeUrl apiKey apiSecret resource operation id data perPage are runtime fields. consumerKey consumerSecret productId orderId customerId are visible but not read directly today.' },
  { type: 'field', title: 'WooCommerce: Credentials', slug: 'woocommerce', category: 'Ecommerce', href: '/docs/nodes/woocommerce#operation-get', text: 'WooCommerce API key and secret should be stored in Connections/credential vault. Runtime reads apiKey/apiSecret or saved woocommerce credential.' },
] satisfies DocsSearchIndexItem[];
