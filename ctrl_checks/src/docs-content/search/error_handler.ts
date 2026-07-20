import type { DocsSearchIndexItem } from '../search-index';

export const errorHandlerSearchIndex = [
  {
    type: 'node',
    title: 'Error Handler',
    slug: 'error_handler',
    category: 'Logic',
    href: '/docs/nodes/error_handler',
    text: 'Error Handler Inspect incoming _error set handled and optionally emit fallback value. Logic no retry no backoff',
  },
  {
    type: 'operation',
    title: 'Error Handler: Handle Error Payload',
    slug: 'error_handler',
    category: 'Logic',
    href: '/docs/nodes/error_handler#operation-default',
    text: 'Error Handler Fallback Handling Handle Error Payload checks _error preserves input sets handled and adds value only when fallbackValue is configured.',
  },
  {
    type: 'field',
    title: 'Error Handler: Fallback Value',
    slug: 'error_handler',
    category: 'Logic',
    href: '/docs/nodes/error_handler#operation-default',
    text: 'Error Handler Fallback Value fallbackValue Optional JSON value returned as output.value when incoming payload contains _error.',
  },
] satisfies DocsSearchIndexItem[];
