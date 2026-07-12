import type { DocsSearchIndexItem } from '../search-index';

export const editFieldsSearchIndex = [
  { type: 'node', title: 'Edit Fields', slug: 'edit_fields', category: 'Data', href: '/docs/nodes/edit_fields', text: 'Edit Fields add overwrite fields object mapping expressions' },
  { type: 'operation', title: 'Edit Fields: Execute', slug: 'edit_fields', category: 'Data', href: '/docs/nodes/edit_fields#operation-default', text: 'Edit Fields execute add configured fields to object' },
  { type: 'field', title: 'Edit Fields: Fields', slug: 'edit_fields', category: 'Data', href: '/docs/nodes/edit_fields#operation-default', text: 'Fields object mapping output field names to values expressions' },
] satisfies DocsSearchIndexItem[];
