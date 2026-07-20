import type { DocsSearchIndexItem } from '../search-index';

export const shopifySearchIndex = [
  { type: 'node', title: 'Shopify', slug: 'shopify', category: 'Ecommerce', href: '/docs/nodes/shopify', text: 'Shopify Admin API node for get list create update delete across product order customer resources. Runtime expects resource plus generic operation.' },
  { type: 'operation', title: 'Shopify: Get or List', slug: 'shopify', category: 'Ecommerce', href: '/docs/nodes/shopify#operation-get', text: 'Get one Shopify item when id/productId/orderId/customerId is present, or list items when no ID is present. Output item or items.' },
  { type: 'operation', title: 'Shopify: Create Update Delete', slug: 'shopify', category: 'Ecommerce', href: '/docs/nodes/shopify#operation-create', text: 'Create/update uses data JSON wrapped under the selected resource. Delete returns success deleted id.' },
  { type: 'field', title: 'Shopify: Resource Operation', slug: 'shopify', category: 'Ecommerce', href: '/docs/nodes/shopify#operation-get', text: 'resource product order customer. operation get list create update delete. Visible aliases get_product list_products create_order get_customer are unsupported by runtime today.' },
  { type: 'field', title: 'Shopify: Store and Token', slug: 'shopify', category: 'Ecommerce', href: '/docs/nodes/shopify#operation-get', text: 'shopDomain is my-store.myshopify.com. apiKey is Admin API access token fallback; prefer Shopify Connections/credential vault.' },
  { type: 'field', title: 'Shopify: IDs Data Limit', slug: 'shopify', category: 'Ecommerce', href: '/docs/nodes/shopify#operation-update', text: 'id productId orderId customerId identify records. data is JSON object for create/update. limit controls list size.' },
] satisfies DocsSearchIndexItem[];
