import type { DocsSearchIndexItem } from '../search-index';

export const executeWorkflowSearchIndex = [
  {
    type: 'node',
    title: 'Execute Workflow',
    slug: 'execute_workflow',
    category: 'Workflow',
    href: '/docs/nodes/execute_workflow',
    text: 'Execute Workflow calls a reusable confirmed or active child workflow, skips the child trigger, passes input or inputData, and returns success, result, workflowId, or error.',
  },
  {
    type: 'operation',
    title: 'Execute Workflow: Execute Child Workflow',
    slug: 'execute_workflow',
    category: 'Workflow',
    href: '/docs/nodes/execute_workflow#operation-default',
    text: 'Run a child workflow inline by workflowId. The child must be confirmed or active, have a trigger node, and returns the last child output or Return node returnedValue under result.',
  },
  {
    type: 'field',
    title: 'Execute Workflow: Workflow ID',
    slug: 'execute_workflow',
    category: 'Workflow',
    href: '/docs/nodes/execute_workflow#operation-default',
    text: 'workflowId is the required saved child workflow ID. Blank returns Workflow ID is required; an unknown ID returns Sub-workflow not found.',
  },
  {
    type: 'field',
    title: 'Execute Workflow: Input',
    slug: 'execute_workflow',
    category: 'Workflow',
    href: '/docs/nodes/execute_workflow#operation-default',
    text: 'input is the preferred JSON payload passed to the child workflow. Leave blank to pass current input; input wins over legacy inputData.',
  },
  {
    type: 'field',
    title: 'Execute Workflow: Input Data',
    slug: 'execute_workflow',
    category: 'Workflow',
    href: '/docs/nodes/execute_workflow#operation-default',
    text: 'inputData is a backend-supported legacy alias used only when input is not set. It is not merged with input.',
  },
  {
    type: 'output',
    title: 'Execute Workflow: Output',
    slug: 'execute_workflow',
    category: 'Workflow',
    href: '/docs/nodes/execute_workflow#operation-default',
    text: 'Outputs success, result, workflowId, and error on failure. Map parent fields from result.fieldName after the child completes.',
  },
] satisfies DocsSearchIndexItem[];
