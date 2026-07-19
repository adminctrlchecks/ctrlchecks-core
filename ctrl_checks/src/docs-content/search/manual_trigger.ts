import type { DocsSearchIndexItem } from '../search-index';

export const manualTriggerSearchIndex = [
  {
    "type": "node",
    "title": "Manual Trigger",
    "slug": "manual_trigger",
    "category": "Triggers",
    "href": "/docs/nodes/manual_trigger",
    "text": "Manual Trigger Start a workflow only when a person clicks Run. Use it for testing, approvals, one-off operations, month-end work, and internal workflows that should not run automatically. Triggers"
  },
  {
    "type": "operation",
    "title": "Manual Trigger: Execute",
    "slug": "manual_trigger",
    "category": "Triggers",
    "href": "/docs/nodes/manual_trigger#operation-default",
    "text": "Manual Trigger Execute Starts the workflow when you click Run. Choose this for testing a workflow, running an approved report, reprocessing a record, or starting an on-demand internal task."
  },
  {
    "type": "field",
    "title": "Manual Trigger: Input Data",
    "slug": "manual_trigger",
    "category": "Triggers",
    "href": "/docs/nodes/manual_trigger#operation-default",
    "text": "Manual Trigger Input Data inputData Optional JSON sample data passed to the next node. Use workplace values like ticketId, customerEmail, reportDate, department, or requestedBy."
  }
] satisfies DocsSearchIndexItem[];
