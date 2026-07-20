import type { DocsSearchIndexItem } from '../search-index';

export const stopAndErrorSearchIndex = [
  {
    type: 'node',
    title: 'Stop And Error',
    slug: 'stop_and_error',
    category: 'Logic',
    href: '/docs/nodes/stop_and_error',
    text: 'Stop And Error intentionally fails the workflow by throwing ERROR_CODE: message with no structured success output.',
  },
  {
    type: 'operation',
    title: 'Stop And Error: Stop Workflow',
    slug: 'stop_and_error',
    category: 'Logic',
    href: '/docs/nodes/stop_and_error#operation-default',
    text: 'Stop Workflow throws the configured errorCode and errorMessage, stops normal downstream nodes, and records the reason in logs.',
  },
  {
    type: 'field',
    title: 'Stop And Error: Error Message',
    slug: 'stop_and_error',
    category: 'Logic',
    href: '/docs/nodes/stop_and_error#operation-default',
    text: 'Error Message is the business reason included in the thrown workflow error; use clear validation or approval failure text.',
  },
  {
    type: 'field',
    title: 'Stop And Error: Error Code',
    slug: 'stop_and_error',
    category: 'Logic',
    href: '/docs/nodes/stop_and_error#operation-default',
    text: 'Error Code defaults to STOPPED and should use uppercase labels such as VALIDATION_FAILED or PERMISSION_DENIED.',
  },
] satisfies DocsSearchIndexItem[];
