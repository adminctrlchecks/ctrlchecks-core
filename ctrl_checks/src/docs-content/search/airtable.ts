import type { DocsSearchIndexItem } from '../search-index';

export const airtableSearchIndex = [
  { type: 'node', title: 'Airtable', slug: 'airtable', category: 'Database', href: '/docs/nodes/airtable', text: 'Airtable records node supports list get create update upsert delete. Uses apiKey accessToken token or saved credential vault.' },
  { type: 'operation', title: 'Airtable: List and Get Records', slug: 'airtable', category: 'Database', href: '/docs/nodes/airtable#operation-list', text: 'list/read returns records and count. get returns id createdTime fields. Fields projection for get is parsed but not passed to table.find.' },
  { type: 'operation', title: 'Airtable: Create Update Upsert Delete', slug: 'airtable', category: 'Database', href: '/docs/nodes/airtable#operation-create', text: 'create update upsert return records count. upsert also returns created updated. delete returns deletedRecords count, not top level deleted true.' },
  { type: 'field', title: 'Airtable: Fields', slug: 'airtable', category: 'Database', href: '/docs/nodes/airtable#operation-list', text: 'apiKey accessToken credentialId baseId table tableId resource operation recordId recordIds records fields matchField filterByFormula view maxRecords pageSize sort typecast.' },
  { type: 'field', title: 'Airtable: Connection', slug: 'airtable', category: 'Database', href: '/docs/nodes/airtable#operation-list', text: 'Store Airtable Personal Access Token in Connections or credential vault. Token scopes should include data.records read and write for selected bases.' },
] satisfies DocsSearchIndexItem[];
