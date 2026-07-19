import type { NodeDoc } from '../types';

const commonFields = [
  { name: 'API Key', internalKey: 'apiKey', type: 'password' as const, required: false, description: 'Optional Trello API key fallback. Prefer a saved Trello connection.', placeholder: 'Optional if saved in Connections' },
  { name: 'Token', internalKey: 'token', type: 'password' as const, required: false, description: 'Optional Trello token fallback. Prefer a saved Trello connection.', placeholder: 'Optional if saved in Connections' },
  { name: 'Board ID', internalKey: 'boardId', type: 'string' as const, required: false, description: 'Trello board id for list and card operations.', placeholder: 'board id' },
  { name: 'List ID', internalKey: 'listId', type: 'string' as const, required: false, description: 'Trello list id for creating or listing cards.', placeholder: 'list id' },
  { name: 'Card ID', internalKey: 'cardId', type: 'string' as const, required: false, description: 'Trello card id for get, update, move, delete, label, and checklist operations.', placeholder: 'card id' },
  { name: 'Card Name', internalKey: 'cardName', type: 'string' as const, required: false, description: 'Card title for create/update.', placeholder: 'Follow up with customer' },
  { name: 'Card Description', internalKey: 'cardDesc', type: 'textarea' as const, required: false, description: 'Markdown card description.', placeholder: 'Details...' },
];

export const trelloDoc: NodeDoc = {
  slug: 'trello',
  displayName: 'Trello',
  category: 'Productivity',
  logoUrl: '/icons/nodes/trello.svg',
  description: 'Manage Trello boards, lists, cards, labels, movement, and checklists.',
  credentialType: 'Trello API Key & Token',
  credentialSetupSteps: [
    'Open trello.com/app-key while signed in.',
    'Copy the API Key.',
    'Use the Token link on that page to authorize read/write access and copy the token.',
    'In CtrlChecks, open Connections -> Add Connection -> Trello and save both values.',
  ],
  credentialDocsUrl: 'https://developer.atlassian.com/cloud/trello/rest/',
  resources: [
    {
      name: 'Operations',
      description: 'Use Trello to read and write boards, lists, and cards.',
      operations: ['get_boards', 'get_lists', 'list_cards', 'get_card', 'create_card', 'update_card', 'move_card', 'delete_card', 'add_label', 'add_checklist'].map((value) => ({
        name: value.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
        value,
        description: `Run ${value} against Trello.`,
        fields: commonFields,
        outputExample: { success: true, operation: value, card: { id: 'card_id', name: 'Follow up' }, cards: [], boards: [], lists: [] },
        outputDescription: 'success, operation, data, plus normalized card/cards/boards/lists/count fields when applicable.',
        usageExample: {
          scenario: 'Create a Trello card from a Typeform response',
          inputValues: { operation: 'create_card', listId: 'list id', cardName: '{{$json.form_response.definition.title}}', cardDesc: '{{$json.form_response.answers}}' },
          expectedOutput: 'A Trello card object with id, name, url, and list id.',
        },
        externalDocsUrl: 'https://developer.atlassian.com/cloud/trello/rest/',
      })),
    },
  ],
  commonErrors: [
    { error: 'Connection required', cause: 'No Trello API key/token is saved or provided.', fix: 'Save Trello in Connections, then rerun the workflow.' },
    { error: 'listId and cardName are required', cause: 'Create Card needs a destination list and title.', fix: 'Run Get Boards then Get Lists, and map the desired list id.' },
    { error: 'cardId is required', cause: 'Card-specific operations need a card id.', fix: 'Use List Cards or Create Card output.' },
  ],
  relatedNodes: ['linear', 'jira', 'clickup', 'typeform'],
};
