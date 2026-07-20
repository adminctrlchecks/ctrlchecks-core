import type { DocsSearchIndexItem } from '../search-index';

export const intervalSearchIndex = [
  {
    type: 'node',
    title: 'Interval Trigger',
    slug: 'interval',
    category: 'Triggers',
    href: '/docs/nodes/interval',
    text: 'Interval Trigger starts a workflow automatically on a repeating timer such as every 5 minutes or every 6 hours. No account connection needed.',
  },
  {
    type: 'operation',
    title: 'Interval Trigger: Run on interval',
    slug: 'interval',
    category: 'Triggers',
    href: '/docs/nodes/interval#operation-default',
    text: 'Run on interval waits the configured Interval/Unit between each automatic run once the workflow is saved and active, then passes through with an executed_at timestamp.',
  },
  {
    type: 'field',
    title: 'Interval Trigger fields',
    slug: 'interval',
    category: 'Triggers',
    href: '/docs/nodes/interval#operation-default',
    text: 'Fields include Interval (a number) and Unit (minutes 1-59 or hours 1-23). Seconds are not supported.',
  },
  {
    type: 'field',
    title: 'Interval Trigger outputs',
    slug: 'interval',
    category: 'Triggers',
    href: '/docs/nodes/interval#operation-default',
    text: 'Outputs executed_at plus internal _scheduled and _trigger marker fields added by the browser-based scheduler.',
  },
  {
    type: 'field',
    title: 'Interval Trigger connection setup',
    slug: 'interval',
    category: 'Triggers',
    href: '/docs/nodes/interval#connection-setup',
    text: 'No account connection needed. Save and activate the workflow, then keep a CtrlChecks browser tab open so the recurring browser-based scheduler keeps firing the workflow.',
  },
] satisfies DocsSearchIndexItem[];
