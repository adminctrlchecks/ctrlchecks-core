import type { DocsSearchIndexItem } from '../search-index';

export const trelloSearchIndex: DocsSearchIndexItem[] = [
  { type: 'node', title: 'Trello', slug: 'trello', category: 'Productivity', href: '/docs/nodes/trello', text: 'Trello Manage boards lists cards labels movement and checklists' },
  { type: 'operation', title: 'Trello: Create Card', slug: 'trello', category: 'Productivity', href: '/docs/nodes/trello#operation-create_card', text: 'Trello create_card listId cardName cardDesc dueDate labels members' },
  { type: 'operation', title: 'Trello: List Cards', slug: 'trello', category: 'Productivity', href: '/docs/nodes/trello#operation-list_cards', text: 'Trello list_cards boardId listId cards kanban' },
  { type: 'operation', title: 'Trello: Get Boards', slug: 'trello', category: 'Productivity', href: '/docs/nodes/trello#operation-get_boards', text: 'Trello get_boards boards ids lists' },
];
