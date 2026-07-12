import type { DocsSearchIndexItem } from '../search-index';

export const functionSearchIndex = [
  {
    "type": "node",
    "title": "Function",
    "slug": "function",
    "category": "Logic",
    "href": "/docs/nodes/function",
    "text": "Function Execute custom JavaScript once against the incoming object. Logic"
  },
  {
    "type": "operation",
    "title": "Function: Configure",
    "slug": "function",
    "category": "Logic",
    "href": "/docs/nodes/function#operation-configure",
    "text": "Function Configuration Configure Run code with input, data, $json, and json bound to the incoming object."
  },
  {
    "type": "field",
    "title": "Function: Code",
    "slug": "function",
    "category": "Logic",
    "href": "/docs/nodes/function#operation-configure",
    "text": "Function Configuration Configure Code code Required JavaScript body to run once"
  },
  {
    "type": "field",
    "title": "Function: Timeout",
    "slug": "function",
    "category": "Logic",
    "href": "/docs/nodes/function#operation-configure",
    "text": "Function Configuration Configure Timeout timeout Execution timeout in milliseconds max 30000"
  }
] satisfies DocsSearchIndexItem[];
