import type { DocsSearchIndexItem } from '../search-index';

export const trelloSearchIndex: DocsSearchIndexItem[] = [
  { type: 'node', title: 'Trello', slug: 'trello', category: 'Productivity', href: '/docs/nodes/trello', text: 'Trello API Key Token Connections boards lists cards labels checklists create_card update_card move_card add_label' },
  { type: 'operation', title: 'Trello: Get Boards', slug: 'trello', category: 'Productivity', href: '/docs/nodes/trello#operation-get_boards', text: 'List Trello boards output boards count map {{$json.boards[0].id}}' },
  { type: 'operation', title: 'Trello: Get Lists', slug: 'trello', category: 'Productivity', href: '/docs/nodes/trello#operation-get_lists', text: 'List Trello lists requires boardId output lists count map {{$json.lists[0].id}}' },
  { type: 'operation', title: 'Trello: List Cards', slug: 'trello', category: 'Productivity', href: '/docs/nodes/trello#operation-list_cards', text: 'List Trello cards by boardId or listId output cards count' },
  { type: 'operation', title: 'Trello: Create Card', slug: 'trello', category: 'Productivity', href: '/docs/nodes/trello#operation-create_card', text: 'Create Trello card requires listId cardName optional cardDesc dueDate idLabels idMembers output card' },
  { type: 'operation', title: 'Trello: Move Card', slug: 'trello', category: 'Productivity', href: '/docs/nodes/trello#operation-move_card', text: 'Move Trello card requires cardId newListId output card idList' },
];
