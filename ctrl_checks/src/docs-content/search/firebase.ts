import type { DocsSearchIndexItem } from '../search-index';

export const firebaseSearchIndex = [
  { type: 'node', title: 'Firebase', slug: 'firebase', category: 'Database', href: '/docs/nodes/firebase', text: 'Firebase Admin SDK node for Firestore get add update delete query and Realtime Database get set.' },
  { type: 'operation', title: 'Firebase: Firestore Documents', slug: 'firebase', category: 'Database', href: '/docs/nodes/firebase#operation-get', text: 'get add update delete Firestore documents. Object data can be flattened to top-level output by the wrapper.' },
  { type: 'operation', title: 'Firebase: Query and Realtime Database', slug: 'firebase', category: 'Database', href: '/docs/nodes/firebase#operation-query', text: 'query collection with equality filters and limit. realtime_get and realtime_set use collection as path and require databaseUrl.' },
  { type: 'field', title: 'Firebase: Fields', slug: 'firebase', category: 'Database', href: '/docs/nodes/firebase#operation-get', text: 'operation projectId clientEmail privateKey collection documentId data filter limit databaseUrl. Uses service account credentials, not Firebase web API key.' },
  { type: 'field', title: 'Firebase: Connection', slug: 'firebase', category: 'Database', href: '/docs/nodes/firebase#operation-get', text: 'Store Firebase service account projectId clientEmail privateKey in Connections credential vault. Realtime operations also require databaseUrl.' },
] satisfies DocsSearchIndexItem[];
