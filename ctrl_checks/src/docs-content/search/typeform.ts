import type { DocsSearchIndexItem } from '../search-index';

export const typeformSearchIndex: DocsSearchIndexItem[] = [
  { type: 'node', title: 'Typeform', slug: 'typeform', category: 'Productivity', href: '/docs/nodes/typeform', text: 'Typeform Personal Access Token Connections get_responses create_form get_form responses form definitions api.typeform.com' },
  { type: 'operation', title: 'Typeform: Get Responses', slug: 'typeform', category: 'Productivity', href: '/docs/nodes/typeform#operation-get_responses', text: 'Retrieve Typeform submissions for formId output data items totalItems formId' },
  { type: 'operation', title: 'Typeform: Create Form', slug: 'typeform', category: 'Productivity', href: '/docs/nodes/typeform#operation-create_form', text: 'Create basic Typeform form requires title output data formId runtime sends title only' },
  { type: 'operation', title: 'Typeform: Get Form', slug: 'typeform', category: 'Productivity', href: '/docs/nodes/typeform#operation-get_form', text: 'Fetch Typeform form definition by formId output data fields settings formId' },
];
