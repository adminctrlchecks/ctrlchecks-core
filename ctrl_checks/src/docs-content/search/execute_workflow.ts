import type { DocsSearchIndexItem } from '../search-index';

export const executeWorkflowSearchIndex = [
  {
    "type": "node",
    "title": "Execute Workflow",
    "slug": "execute_workflow",
    "category": "Logic",
    "href": "/docs/nodes/execute_workflow",
    "text": "Execute Workflow Executes another confirmed or active workflow and returns its result. Logic"
  },
  {
    "type": "operation",
    "title": "Execute Workflow: Configure",
    "slug": "execute_workflow",
    "category": "Logic",
    "href": "/docs/nodes/execute_workflow#operation-configure",
    "text": "Execute Workflow Configuration Configure Call another workflow and return its final result."
  },
  {
    "type": "field",
    "title": "Execute Workflow: Workflow Id",
    "slug": "execute_workflow",
    "category": "Logic",
    "href": "/docs/nodes/execute_workflow#operation-configure",
    "text": "Execute Workflow Configuration Configure Workflow Id workflowId ID of the workflow to execute"
  },
  {
    "type": "field",
    "title": "Execute Workflow: Input",
    "slug": "execute_workflow",
    "category": "Logic",
    "href": "/docs/nodes/execute_workflow#operation-configure",
    "text": "Execute Workflow Configuration Configure Input input Input data to pass to the sub-workflow"
  }
] satisfies DocsSearchIndexItem[];
