import type { DocsSearchIndexItem } from '../search-index';

export const logOutputSearchIndex = [
  {
    "type": "node",
    "title": "Log Output",
    "slug": "log_output",
    "category": "Utility",
    "href": "/docs/nodes/log_output",
    "text": "Log Output Write a labeled checkpoint message to the workflow execution log for debugging, monitoring, and audit trails. This is always a terminal node — it cannot have an outgoing connection to any other node. Utility"
  },
  {
    "type": "operation",
    "title": "Log Output: Write Log Entry",
    "slug": "log_output",
    "category": "Utility",
    "href": "/docs/nodes/log_output#operation-default",
    "text": "Log Output Configuration Write Log Entry Resolves Message against the data from the connected upstream node, writes it to the CtrlChecks execution log under the chosen Level, and returns that resolved text as this node's own output. default"
  },
  {
    "type": "field",
    "title": "Log Output: Level",
    "slug": "log_output",
    "category": "Utility",
    "href": "/docs/nodes/log_output#operation-default",
    "text": "Log Output Configuration Write Log Entry Level level Log severity label used only for filtering and display in the execution log"
  },
  {
    "type": "field",
    "title": "Log Output: Message",
    "slug": "log_output",
    "category": "Utility",
    "href": "/docs/nodes/log_output#operation-default",
    "text": "Log Output Configuration Write Log Entry Message message The text written to the execution log, and this node's entire output value"
  }
] satisfies DocsSearchIndexItem[];
