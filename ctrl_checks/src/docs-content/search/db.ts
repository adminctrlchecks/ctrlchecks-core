import type { DocsSearchIndexItem } from '../search-index';

export const dbSearchIndex = [
  { type: 'node', title: 'Supabase', slug: 'db', category: 'Database', href: '/docs/nodes/db', text: 'Canonical db node for Supabase. Supports select insert update delete rpc through supabase-js and does not execute raw SQL query operation.' },
  { type: 'operation', title: 'Supabase: Select Insert Update Delete RPC', slug: 'db', category: 'Database', href: '/docs/nodes/db#operation-select', text: 'select returns rows count. insert returns inserted count. update delete return rows count. rpc returns result.' },
  { type: 'field', title: 'Supabase: Runtime Fields', slug: 'db', category: 'Database', href: '/docs/nodes/db#operation-select', text: 'url anonKey serviceRoleKey schema operation table columns filters filter limit order data functionName params. Frontend query orderBy ascending are stale and not read.' },
  { type: 'field', title: 'Supabase: Connection', slug: 'db', category: 'Database', href: '/docs/nodes/db#operation-select', text: 'Store Supabase Project URL and anon or service role key in Connections credential vault. Service role bypasses Row Level Security.' },
] satisfies DocsSearchIndexItem[];
