import type { DocsSearchIndexItem } from '../search-index';

export const mongodbSearchIndex = [
  { type: 'node', title: 'MongoDB', slug: 'mongodb', category: 'Database', href: '/docs/nodes/mongodb', text: 'MongoDB driver node supports find insertOne insertMany updateOne updateMany deleteOne deleteMany aggregate. Uses connectionString or host database username password authSource ssl.' },
  { type: 'operation', title: 'MongoDB: Find and Aggregate', slug: 'mongodb', category: 'Database', href: '/docs/nodes/mongodb#operation-find', text: 'find returns documents count with optional filter projection sort skip limit. aggregate returns documents count from pipeline options.' },
  { type: 'operation', title: 'MongoDB: Insert Update Delete', slug: 'mongodb', category: 'Database', href: '/docs/nodes/mongodb#operation-insertone', text: 'insertOne returns insertedId acknowledged. insertMany returns insertedIds insertedCount acknowledged. update returns matchedCount modifiedCount upsertedCount upsertedId acknowledged. delete returns deletedCount acknowledged.' },
  { type: 'field', title: 'MongoDB: Runtime Fields', slug: 'mongodb', category: 'Database', href: '/docs/nodes/mongodb#operation-find', text: 'connectionString host port username password database authSource ssl operation collection filter projection limit skip sort document documents update pipeline options. Runtime does not read legacy query.' },
  { type: 'field', title: 'MongoDB: Connection', slug: 'mongodb', category: 'Database', href: '/docs/nodes/mongodb#operation-find', text: 'Store MongoDB Connection String in Connections credential vault. Saved mongodb_connection can inject full URI through username and database override through password.' },
] satisfies DocsSearchIndexItem[];
