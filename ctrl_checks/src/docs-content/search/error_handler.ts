import type { DocsSearchIndexItem } from '../search-index';

export const errorHandlerSearchIndex = [
  {
    "type": "node",
    "title": "Error Handler",
    "slug": "error_handler",
    "category": "Logic",
    "href": "/docs/nodes/error_handler",
    "text": "Error Handler Mark an upstream error as handled and optionally emit a fallback value. Logic"
  },
  {
    "type": "operation",
    "title": "Error Handler: Configure",
    "slug": "error_handler",
    "category": "Logic",
    "href": "/docs/nodes/error_handler#operation-configure",
    "text": "Error Handler Configuration Configure Inspect _error, set handled, and optionally return fallbackValue."
  },
  {
    "type": "field",
    "title": "Error Handler: Fallback Value",
    "slug": "error_handler",
    "category": "Logic",
    "href": "/docs/nodes/error_handler#operation-configure",
    "text": "Error Handler Configuration Configure Fallback Value fallbackValue Optional value emitted as value when the incoming payload contains _error"
  }
] satisfies DocsSearchIndexItem[];
