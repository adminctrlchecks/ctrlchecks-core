import type { DocsSearchIndexItem } from '../search-index';

export const typeformTriggerSearchIndex = [
  {
    type: 'node',
    title: 'Typeform Trigger',
    slug: 'typeform_trigger',
    category: 'Triggers',
    href: '/docs/nodes/typeform_trigger',
    text: 'Typeform Trigger starts workflows from new Typeform form responses, delivered through a signed Typeform webhook that CtrlChecks registers automatically.',
  },
  {
    type: 'operation',
    title: 'Typeform Trigger: Receive response',
    slug: 'typeform_trigger',
    category: 'Triggers',
    href: '/docs/nodes/typeform_trigger#operation-receive',
    text: 'Receive response validates the Typeform-Signature header, filters formId query, normalizes the response answers, and starts workflow executions.',
  },
  {
    type: 'field',
    title: 'Typeform Trigger fields',
    slug: 'typeform_trigger',
    category: 'Triggers',
    href: '/docs/nodes/typeform_trigger#operation-receive',
    text: 'Fields include connectionId, formId (form URL typeform.com/to/{formId}), and query (Keyword Filter).',
  },
  {
    type: 'field',
    title: 'Typeform Trigger outputs',
    slug: 'typeform_trigger',
    category: 'Triggers',
    href: '/docs/nodes/typeform_trigger#operation-receive',
    text: 'Outputs eventId eventType source userId username text timestamp formId responseId answers hidden raw trigger workflow_id node_id sessionId _typeform. userId and username are always null/empty for Typeform.',
  },
  {
    type: 'field',
    title: 'Typeform Trigger connection setup',
    slug: 'typeform_trigger',
    category: 'Triggers',
    href: '/docs/nodes/typeform_trigger#connection-setup',
    text: 'Connect a Typeform Personal Access Token from admin.typeform.com/account#/section/tokens in Connections. CtrlChecks automatically registers the form webhook via the Typeform API and validates deliveries with Typeform-Signature.',
  },
] satisfies DocsSearchIndexItem[];
