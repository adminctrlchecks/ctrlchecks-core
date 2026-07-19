import type { DocsSearchIndexItem } from '../search-index';

export const workflowTriggerSearchIndex = [
  {
    type: 'node',
    title: 'Workflow Trigger',
    slug: 'workflow_trigger',
    category: 'Triggers',
    href: '/docs/nodes/workflow_trigger',
    text: 'Workflow Trigger starts a reusable child workflow when an allowed parent workflow calls it with an Execute Workflow node.',
  },
  {
    type: 'operation',
    title: 'Workflow Trigger: Execute',
    slug: 'workflow_trigger',
    category: 'Triggers',
    href: '/docs/nodes/workflow_trigger#operation-default',
    text: 'Execute accepts the payload from the parent Execute Workflow node and passes it to the first action or logic node in the child workflow.',
  },
  {
    type: 'field',
    title: 'Workflow Trigger: Source Workflow ID',
    slug: 'workflow_trigger',
    category: 'Triggers',
    href: '/docs/nodes/workflow_trigger#operation-default',
    text: 'Source Workflow ID is the parent workflow ID allowed to call this child workflow. Copy it from the parent workflow URL or details panel, not from the child workflow.',
  },
  {
    type: 'field',
    title: 'Workflow Trigger: Payload Mapping',
    slug: 'workflow_trigger',
    category: 'Triggers',
    href: '/docs/nodes/workflow_trigger#operation-default',
    text: 'The child workflow can use top-level payload fields like {{$json.customerEmail}} or wrapped fields like {{$json.inputData.customerEmail}}, depending on what the parent sends.',
  },
] satisfies DocsSearchIndexItem[];
