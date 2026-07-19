import type { DocsSearchIndexItem } from '../search-index';

export const javascriptSearchIndex = [
  {
    type: 'node',
    title: 'JavaScript',
    slug: 'javascript',
    category: 'Data',
    href: '/docs/nodes/javascript',
    text: 'JavaScript runs sandboxed JavaScript once against incoming workflow data. Use input, $json, or json, return the value downstream nodes should receive, and avoid storing secrets in code. Fields: code, timeout, outputSchema. No credentials; downstream service nodes still need their own account connection.',
  },
  {
    type: 'operation',
    title: 'JavaScript: Execute',
    slug: 'javascript',
    category: 'Data',
    href: '/docs/nodes/javascript#operation-default',
    text: 'Run custom JavaScript for scoring, nested response shaping, advanced validation, or calculations, then return the script result as downstream {{$json}} data.',
  },
  {
    type: 'field',
    title: 'JavaScript: Code',
    slug: 'javascript',
    category: 'Data',
    href: '/docs/nodes/javascript#operation-default',
    text: 'code required JavaScript body. Read incoming data through input, $json, or json. Return an object for named fields such as customerEmail and riskScore, or return an array when the next node expects a list.',
  },
  {
    type: 'field',
    title: 'JavaScript: Timeout',
    slug: 'javascript',
    category: 'Data',
    href: '/docs/nodes/javascript#operation-default',
    text: 'timeout optional milliseconds. Default 5000, runtime cap 30000. Use higher values only for real data processing that needs more time.',
  },
  {
    type: 'field',
    title: 'JavaScript: Output Schema',
    slug: 'javascript',
    category: 'Data',
    href: '/docs/nodes/javascript#operation-default',
    text: 'outputSchema optional JSON schema hint such as {"type":"object"} or {"type":"array"}. Runtime checks top-level return type and logs a warning on mismatch.',
  },
] satisfies DocsSearchIndexItem[];
