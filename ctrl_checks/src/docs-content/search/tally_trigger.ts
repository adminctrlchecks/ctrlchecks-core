import type { DocsSearchIndexItem } from '../search-index';

export const tallyTriggerSearchIndex = [
  {
    type: 'node',
    title: 'Tally Trigger',
    slug: 'tally_trigger',
    category: 'Triggers',
    href: '/docs/nodes/tally_trigger',
    text: 'Tally Trigger starts workflows from new Tally (tally.so) form submissions, delivered through a signed Tally webhook that CtrlChecks registers automatically.',
  },
  {
    type: 'operation',
    title: 'Tally Trigger: Receive submission',
    slug: 'tally_trigger',
    category: 'Triggers',
    href: '/docs/nodes/tally_trigger#operation-receive',
    text: 'Receive submission validates the Tally-Signature header, filters formId query, normalizes the submission answers, and starts workflow executions.',
  },
  {
    type: 'field',
    title: 'Tally Trigger fields',
    slug: 'tally_trigger',
    category: 'Triggers',
    href: '/docs/nodes/tally_trigger#operation-receive',
    text: 'Fields include connectionId, formId (form URL tally.so/forms/{formId}), and query (Keyword Filter).',
  },
  {
    type: 'field',
    title: 'Tally Trigger outputs',
    slug: 'tally_trigger',
    category: 'Triggers',
    href: '/docs/nodes/tally_trigger#operation-receive',
    text: 'Outputs eventId eventType source userId username text timestamp formId formName responseId answers raw trigger workflow_id node_id sessionId _tally.',
  },
  {
    type: 'field',
    title: 'Tally Trigger connection setup',
    slug: 'tally_trigger',
    category: 'Triggers',
    href: '/docs/nodes/tally_trigger#connection-setup',
    text: 'Connect a Tally Personal Access Token from tally.so/settings/api in Connections. CtrlChecks automatically registers the form webhook via the Tally API and validates deliveries with Tally-Signature.',
  },
] satisfies DocsSearchIndexItem[];
