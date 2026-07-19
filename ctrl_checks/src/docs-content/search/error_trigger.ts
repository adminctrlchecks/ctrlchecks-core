import type { DocsSearchIndexItem } from '../search-index';

export const errorTriggerSearchIndex = [
  {
    type: 'node',
    title: 'Error Trigger',
    slug: 'error_trigger',
    category: 'Triggers',
    href: '/docs/nodes/error_trigger',
    text: 'Error Trigger starts an error-handling path when another node in the same workflow fails. Use it for logging, Slack or email alerts, incident tickets, and recovery workflows.',
  },
  {
    type: 'operation',
    title: 'Error Trigger: Catch workflow error',
    slug: 'error_trigger',
    category: 'Triggers',
    href: '/docs/nodes/error_trigger#operation-default',
    text: 'Catch workflow error is invoked out-of-band by the failure handler. It is skipped during successful runs and outputs failed_node error_message error_type plus optional error_stack and node_output diagnostics.',
  },
  {
    type: 'field',
    title: 'Error Trigger outputs',
    slug: 'error_trigger',
    category: 'Triggers',
    href: '/docs/nodes/error_trigger#operation-default',
    text: 'Map {{$json.error_message}} for the alert body, {{$json.failed_node}} for the failing step, and {{$json.error_type}} for routing. Do not use old fields like error.message failedWorkflowId or failedNodeId.',
  },
] satisfies DocsSearchIndexItem[];
