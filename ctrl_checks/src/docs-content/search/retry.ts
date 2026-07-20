import type { DocsSearchIndexItem } from '../search-index';

export const retrySearchIndex = [
  {
    type: 'node',
    title: 'Retry',
    slug: 'retry',
    category: 'Flow',
    href: '/docs/nodes/retry',
    text: 'Retry passes input through while attaching maxAttempts delayBetween backoff and attempts 0 for engine-level retry orchestration.'
  },
  {
    type: 'operation',
    title: 'Retry: Configure',
    slug: 'retry',
    category: 'Flow',
    href: '/docs/nodes/retry#operation-configure',
    text: 'Configure retry policy; node does not rerun the previous node by itself and does not output lastError.'
  },
  {
    type: 'field',
    title: 'Retry: Max Attempts',
    slug: 'retry',
    category: 'Flow',
    href: '/docs/nodes/retry#operation-configure',
    text: 'Max Attempts positive number retry count maxAttempts output metadata retryConfig.'
  },
  {
    type: 'field',
    title: 'Retry: Delay Between',
    slug: 'retry',
    category: 'Flow',
    href: '/docs/nodes/retry#operation-configure',
    text: 'Delay Between delayBetween milliseconds; old delay field has no runtime effect.'
  },
  {
    type: 'field',
    title: 'Retry: Backoff',
    slug: 'retry',
    category: 'Flow',
    href: '/docs/nodes/retry#operation-configure',
    text: 'Backoff dropdown None Linear Exponential values none linear exponential; old Backoff Multiplier has no runtime effect.'
  }
] satisfies DocsSearchIndexItem[];
