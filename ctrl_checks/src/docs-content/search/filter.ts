import type { DocsSearchIndexItem } from '../search-index';

export const filterSearchIndex = [
  {
    "type": "node",
    "title": "Filter",
    "slug": "filter",
    "category": "Logic",
    "href": "/docs/nodes/filter",
    "text": "Filter Filters input.items or a configured array with a JavaScript condition that uses item. Logic"
  },
  {
    "type": "operation",
    "title": "Filter: Configure",
    "slug": "filter",
    "category": "Logic",
    "href": "/docs/nodes/filter#operation-configure",
    "text": "Filter Configuration Configure Keep only items whose condition evaluates to true."
  },
  {
    "type": "field",
    "title": "Filter: Array",
    "slug": "filter",
    "category": "Logic",
    "href": "/docs/nodes/filter#operation-configure",
    "text": "Filter Configuration Configure Array array Optional expression that resolves to the array to filter; defaults to input.items"
  },
  {
    "type": "field",
    "title": "Filter: Condition",
    "slug": "filter",
    "category": "Logic",
    "href": "/docs/nodes/filter#operation-configure",
    "text": "Filter Configuration Configure Condition condition JavaScript expression evaluated for each item, such as item.age >= 18"
  }
] satisfies DocsSearchIndexItem[];
