import type { DocsSearchIndexItem } from '../search-index';

export const memorySearchIndex = [
  { type: 'node', title: 'Memory', slug: 'memory', category: 'AI', href: '/docs/nodes/memory', text: 'Memory passthrough sessionId context messages no persistence no retrieve clear search Redis vector ttl ignored' },
  { type: 'operation', title: 'Memory: Pass Context', slug: 'memory', category: 'AI', href: '/docs/nodes/memory#operation-default', text: 'Pass Context returns sessionId context messages operation memoryType ttl maxMessages ignored' },
  { type: 'field', title: 'Memory: Session ID', slug: 'memory', category: 'AI', href: '/docs/nodes/memory#operation-default', text: 'sessionId session_id mem node id downstream AI context ticket customer chat' },
  { type: 'field', title: 'Memory: Context', slug: 'memory', category: 'AI', href: '/docs/nodes/memory#operation-default', text: 'context text passthrough incoming context null downstream AI Agent prompt' },
  { type: 'field', title: 'Memory: Legacy Controls', slug: 'memory', category: 'AI', href: '/docs/nodes/memory#operation-default', text: 'operation store retrieve clear search memoryType ttl maxMessages visible legacy ignored no error' },
] satisfies DocsSearchIndexItem[];
