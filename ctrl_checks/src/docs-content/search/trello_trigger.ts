import type { DocsSearchIndexItem } from '../search-index';

export const trelloTriggerSearchIndex: DocsSearchIndexItem[] = [
  { type: 'node', title: 'Trello Trigger', slug: 'trello_trigger', category: 'Triggers', href: '/docs/nodes/trello_trigger', text: 'Trello Trigger webhook card created updated moved commented list board checklist member' },
  { type: 'operation', title: 'Trello Trigger: Card Moved', slug: 'trello_trigger', category: 'Triggers', href: '/docs/nodes/trello_trigger#operation-card_events', text: 'Trello card_moved listBeforeId listAfterId cardId boardId' },
  { type: 'operation', title: 'Trello Trigger: Comment Added', slug: 'trello_trigger', category: 'Triggers', href: '/docs/nodes/trello_trigger#operation-card_events', text: 'Trello card_commented commentCard commentText cardId member' },
];
