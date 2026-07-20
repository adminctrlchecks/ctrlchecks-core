import type { FieldDoc, NodeDoc, OperationDoc } from '../types';
import { richFieldHelp } from './_sharedFieldHelp';

const operationHelp = richFieldHelp({
  what: 'The Trello action this node will run.',
  why: 'Each option calls a different Trello REST endpoint and changes which board, list, card, label, member, or checklist fields matter.',
  when: 'Required for every Trello node.',
  enter: 'Choose create_card, update_card, get_card, delete_card, list_cards, move_card, add_label, add_checklist, get_boards, or get_lists.',
  source: 'Select the action in the node panel. Runtime also accepts older camelCase aliases such as createCard and getBoards.',
  later: 'The output includes {{$json.operation}}, {{$json.data}}, and normalized fields such as card, cards, boards, lists, labels, and count when applicable.',
  format: 'One supported Trello operation value from the dropdown.',
  example: 'Run get_boards, then get_lists with {{$json.boards[0].id}}, then create_card with {{$json.lists[0].id}}.',
  empty: 'Runtime defaults to list_cards or returns success false for unsupported operation values.',
  mistake: 'Trying to use Trello card URLs where the node needs IDs returned by Trello API responses.',
});

const apiKeyHelp = richFieldHelp({
  what: 'An optional Trello API Key fallback for this one node.',
  why: 'Trello requests require both an API key and token, either from Connections or from node fallback fields.',
  when: 'Leave blank when a Trello connection is saved. Fill only for legacy workflows or quick tests.',
  enter: 'The API key from trello.com/app-key.',
  source: 'Prefer CtrlChecks Connections, which stores the API key in the credential vault; Trello shows the key at trello.com/app-key.',
  later: 'Do not map this secret as {{$json.apiKey}}. Reuse the saved Trello service node account connection.',
  format: 'Trello API key string.',
  example: 'Save the project management Trello key in Connections and leave this field empty.',
  empty: 'Runtime looks for saved trello or trello_api_key credentials. Without both key and token it returns success false.',
  mistake: 'Saving only the API key. Trello also requires the matching Token.',
});

const tokenHelp = richFieldHelp({
  what: 'An optional Trello user token fallback for this one node.',
  why: 'The token authorizes access to boards, lists, cards, labels, and checklist actions for the connected Trello account.',
  when: 'Leave blank when a Trello connection is saved. Fill only with the matching token for the API key fallback.',
  enter: 'A Trello token generated from the Token link on trello.com/app-key with read/write access.',
  source: 'Prefer CtrlChecks Connections and the credential vault. Trello generates the token after you approve the app-key authorization link.',
  later: 'Do not pass this token downstream. Later Trello nodes should use Connections rather than {{$json.token}}.',
  format: 'Trello token string.',
  example: 'Use a saved token for the operations board account.',
  empty: 'Runtime fails with Trello connection required if no saved connection provides a token.',
  mistake: 'Using an expired or read-only token for create, update, move, label, or checklist operations.',
});

const boardIdHelp = richFieldHelp({
  what: 'The Trello board ID.',
  why: 'get_lists needs a board ID, and list_cards can list all cards on a board when no List ID is provided.',
  when: 'Required for get_lists. Required for list_cards when List ID is blank.',
  enter: 'A board id from get_boards output or the board URL short id when accepted by Trello.',
  source: 'Run get_boards and map {{$json.boards[0].id}}, or copy the board id from Trello API data.',
  later: 'Use {{$json.boards[0].id}} in a follow-up get_lists step.',
  format: 'Trello board ID string.',
  example: 'List cards from the Customer Success board with boardId {{$json.boards[0].id}}.',
  empty: 'get_lists returns success false. list_cards needs either boardId or listId.',
  mistake: 'Using the board name instead of the board ID.',
});

const listIdHelp = richFieldHelp({
  what: 'The Trello list ID.',
  why: 'create_card needs a destination list, and list_cards can use List ID to return only cards in one column.',
  when: 'Required for create_card. Required for list_cards when Board ID is blank. Optional for update_card as a destination list.',
  enter: 'A list id returned by get_lists or another Trello API response.',
  source: 'Run get_lists with a board ID, then map {{$json.lists[0].id}}.',
  later: 'Use list IDs to create or move cards into specific workflow columns.',
  format: 'Trello list ID string.',
  example: 'Create new support cards in the Triage list with listId {{$json.triageListId}}.',
  empty: 'create_card returns success false saying listId and cardName are required.',
  mistake: 'Typing the list title such as "Done" instead of using the list id.',
});

const cardIdHelp = richFieldHelp({
  what: 'The Trello card ID.',
  why: 'Card-specific operations need the exact card to get, update, move, delete, label, or add a checklist to.',
  when: 'Required for get_card, update_card, delete_card, move_card, add_label, and add_checklist.',
  enter: 'A card id returned by create_card, list_cards, or get_card.',
  source: 'Map {{$json.card.id}} after create_card, or {{$json.cards[0].id}} after list_cards.',
  later: 'Use {{$json.card.id}} to update or move the same card in a later Trello node.',
  format: 'Trello card ID string.',
  example: 'Move the card created earlier with cardId {{$json.card.id}}.',
  empty: 'Runtime returns success false with cardId is required for the selected card operation.',
  mistake: 'Using a card short link or URL where the operation expects card id.',
});

const cardNameHelp = richFieldHelp({
  what: 'The Trello card title.',
  why: 'create_card requires a name, and update_card can rename the card.',
  when: 'Required for create_card. Optional for update_card.',
  enter: 'Short task title typed directly or mapped from previous workflow data.',
  source: 'Map {{$json.title}}, {{$json.subject}}, or {{$json.issueTitle}} from an upstream form, ticket, or issue.',
  later: 'Trello returns the card under {{$json.card}} or {{$json.data}}, including the card name.',
  format: 'Plain text string.',
  example: 'Follow up with {{$json.customerName}} about renewal.',
  empty: 'create_card returns success false because listId and cardName are required.',
  mistake: 'Putting the full card body in Card Name instead of Card Description.',
});

const cardDescHelp = richFieldHelp({
  what: 'The Trello card description.',
  why: 'It gives the assignee context, links, checklist details, or customer notes.',
  when: 'Optional for create_card and update_card.',
  enter: 'Markdown/plain text description.',
  source: 'Type a template or map {{$json.description}}, {{$json.summary}}, or {{$json.answers}}.',
  later: 'Trello returns the updated card object in {{$json.card}} or raw data in {{$json.data}}.',
  format: 'Markdown/plain text string.',
  example: 'Customer: {{$json.email}}. Request: {{$json.requestSummary}}.',
  empty: 'The card is created or updated without body details.',
  mistake: 'Expecting the node to upload attachments from this field; it only sends Trello desc text.',
});

const dueDateHelp = richFieldHelp({
  what: 'Optional due date for the card.',
  why: 'Trello uses it to show card deadlines on boards and calendars.',
  when: 'Optional for create_card and update_card.',
  enter: 'An ISO 8601 date/time string.',
  source: 'Map a normalized date from a previous step such as {{$json.dueDate}}.',
  later: 'Trello returns due date information in the raw card data when accepted.',
  format: 'ISO 8601, for example 2026-07-31T17:00:00Z.',
  example: 'Set the due date from a contract renewal deadline using {{$json.renewalDueAt}}.',
  empty: 'The card has no due date or keeps its existing due date.',
  mistake: 'Using local date text like tomorrow instead of a precise ISO timestamp.',
});

const idLabelsHelp = richFieldHelp({
  what: 'Comma-separated Trello label IDs.',
  why: 'create_card and update_card can set labels, and add_label attaches one or more labels to an existing card.',
  when: 'Required for add_label. Optional for create_card and update_card.',
  enter: 'One or more Trello label IDs separated by commas.',
  source: 'Copy label IDs from Trello API data or map a prepared value such as {{$json.labelIds}}.',
  later: 'add_label returns {{$json.labels}} with each label result and keeps {{$json.cardId}}.',
  format: 'Comma-separated IDs such as label1,label2.',
  example: 'Tag urgent support cards with {{$json.urgentLabelId}}.',
  empty: 'add_label returns success false saying cardId and idLabels are required.',
  mistake: 'Typing label names or colors instead of label IDs.',
});

const idMembersHelp = richFieldHelp({
  what: 'Comma-separated Trello member IDs to assign to a card.',
  why: 'Trello uses member IDs, not names or emails, when assigning card members through the API.',
  when: 'Optional for create_card and update_card.',
  enter: 'One or more Trello member IDs separated by commas.',
  source: 'Copy from Trello API data or map a prepared assignment list such as {{$json.memberIds}}.',
  later: 'The returned card data can be inspected for assigned member IDs.',
  format: 'Comma-separated IDs.',
  example: 'Assign the on-call owner with idMembers {{$json.onCallTrelloMemberId}}.',
  empty: 'The card is created or updated without changing members.',
  mistake: 'Entering a person name or email address instead of a Trello member id.',
});

const newListIdHelp = richFieldHelp({
  what: 'The destination Trello list ID for moving a card.',
  why: 'move_card needs to know the exact list/column where the card should land.',
  when: 'Required for move_card. Also accepted by update_card as an idList alias when List ID is blank.',
  enter: 'A list id returned by get_lists.',
  source: 'Run get_lists and map the chosen destination such as {{$json.doneListId}}.',
  later: 'After moving, the returned card data shows the new list id in {{$json.card.idList}} or {{$json.data.idList}}.',
  format: 'Trello list ID string.',
  example: 'Move completed requests to Done with newListId {{$json.doneListId}}.',
  empty: 'move_card returns success false saying cardId and newListId are required.',
  mistake: 'Using the current list ID instead of the destination list ID.',
});

const checklistNameHelp = richFieldHelp({
  what: 'The name for a checklist to add to a Trello card.',
  why: 'add_checklist creates a checklist object on the card using this name.',
  when: 'Optional for add_checklist; runtime defaults to Checklist when blank.',
  enter: 'A short checklist title.',
  source: 'Type a fixed checklist name or map {{$json.checklistName}} from a process template.',
  later: 'The returned Trello data is available in {{$json.data}} for downstream inspection.',
  format: 'Plain text string.',
  example: 'QA handoff steps.',
  empty: 'Runtime uses Checklist as the default name.',
  mistake: 'Expecting this field to create checklist items. It creates the checklist container only.',
});

const fields: FieldDoc[] = [
  { name: 'API Key', internalKey: 'apiKey', type: 'password', required: false, description: 'Optional Trello API key fallback; prefer a saved connection.', helpText: apiKeyHelp, placeholder: 'Optional if saved in Connections', example: 'Stored in Connections' },
  { name: 'Token', internalKey: 'token', type: 'password', required: false, description: 'Optional Trello token fallback; prefer a saved connection.', helpText: tokenHelp, placeholder: 'Optional if saved in Connections', example: 'Stored in Connections' },
  { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Choose the Trello action to run.', helpText: operationHelp, options: ['create_card', 'update_card', 'get_card', 'delete_card', 'list_cards', 'move_card', 'add_label', 'add_checklist', 'get_boards', 'get_lists'], defaultValue: 'create_card', example: 'create_card' },
  { name: 'Board ID', internalKey: 'boardId', type: 'string', required: false, description: 'Trello board ID.', helpText: boardIdHelp, placeholder: 'board id', example: '{{$json.boards[0].id}}' },
  { name: 'List ID', internalKey: 'listId', type: 'string', required: false, description: 'Trello list ID.', helpText: listIdHelp, placeholder: 'list id', example: '{{$json.lists[0].id}}' },
  { name: 'Card ID', internalKey: 'cardId', type: 'string', required: false, description: 'Trello card ID.', helpText: cardIdHelp, placeholder: 'card id', example: '{{$json.card.id}}' },
  { name: 'Card Name', internalKey: 'cardName', type: 'string', required: false, description: 'Trello card title.', helpText: cardNameHelp, placeholder: 'Follow up with customer', example: '{{$json.title}}' },
  { name: 'Card Description', internalKey: 'cardDesc', type: 'textarea', required: false, description: 'Trello card description.', helpText: cardDescHelp, placeholder: 'Details...', example: '{{$json.description}}' },
  { name: 'Due Date', internalKey: 'dueDate', type: 'string', required: false, description: 'Optional ISO due date.', helpText: dueDateHelp, placeholder: '2026-07-31T17:00:00Z', example: '{{$json.dueDate}}' },
  { name: 'Label IDs', internalKey: 'idLabels', type: 'string', required: false, description: 'Comma-separated Trello label IDs.', helpText: idLabelsHelp, placeholder: 'label-id-1,label-id-2', example: '{{$json.labelIds}}' },
  { name: 'Member IDs', internalKey: 'idMembers', type: 'string', required: false, description: 'Comma-separated Trello member IDs.', helpText: idMembersHelp, placeholder: 'member-id-1,member-id-2', example: '{{$json.memberIds}}' },
  { name: 'New List ID', internalKey: 'newListId', type: 'string', required: false, description: 'Destination list ID for move_card.', helpText: newListIdHelp, placeholder: 'new list id', example: '{{$json.doneListId}}' },
  { name: 'Checklist Name', internalKey: 'checklistName', type: 'string', required: false, description: 'Checklist name for add_checklist.', helpText: checklistNameHelp, placeholder: 'Checklist', example: 'QA handoff steps' },
];

const outputDescription = 'On success, runtime preserves incoming fields and adds success, operation, data, and when applicable cards, boards, lists, card, labels, cardId, and count. Failures preserve incoming fields and return success false with error.';

const makeOperation = (operation: {
  name: string;
  value: string;
  description: string;
  inputValues: Record<string, string>;
  outputExample: Record<string, unknown>;
  scenario: string;
  expectedOutput: string;
}): OperationDoc => ({
  name: operation.name,
  value: operation.value,
  description: operation.description,
  fields,
  outputExample: operation.outputExample,
  outputDescription,
  usageExample: {
    scenario: operation.scenario,
    inputValues: operation.inputValues,
    expectedOutput: operation.expectedOutput,
  },
  externalDocsUrl: 'https://developer.atlassian.com/cloud/trello/rest/',
});

export const trelloDoc: NodeDoc = {
  slug: 'trello',
  displayName: 'Trello',
  category: 'Productivity',
  logoUrl: '/integrations-logos/Trello.svg',
  description: 'Manage Trello boards, lists, cards, labels, movement, and card checklists through the Trello REST API.',
  credentialType: 'Trello API Key and Token Connection',
  credentialSetupSteps: [
    'What this is: The Trello node uses a saved Trello API Key and Token connection so CtrlChecks can call Trello without exposing secrets in workflow fields.',
    'Where to start: Open trello.com/app-key while signed in, copy the API Key, then use the Token link to authorize read/write access.',
    'How to connect: In CtrlChecks, open Connections, choose Add Connection, select Trello, and save both the API Key and Token in the credential vault.',
    'What is stored: CtrlChecks stores the key and token in Connections. The visible API Key and Token fields are optional fallbacks only.',
    'What not to store: Do not paste Trello keys or tokens into normal workflow fields, examples, screenshots, comments, or downstream nodes.',
    'Test it: Run Get Boards. A healthy connection returns boards and count; then run Get Lists with {{$json.boards[0].id}}.',
    'Connect the output or outgoing line to the next node that should use returned Trello data such as boards, lists, card, cards, labels, or count.',
    'Every downstream service node still needs its own account connection; the Trello service node account connection does not authenticate Linear, Slack, email, or Notion nodes.',
  ],
  credentialDocsUrl: 'https://developer.atlassian.com/cloud/trello/rest/',
  resources: [
    {
      name: 'Boards, lists, and cards',
      description: 'Use Trello operations to discover boards and lists, create and manage cards, move cards between lists, add labels, and create checklists.',
      operations: [
        makeOperation({ name: 'Get Boards', value: 'get_boards', description: 'List boards available to the connected Trello account. Use this as the first discovery step when you need a board ID before listing cards or lists.', inputValues: { apiKey: 'Use saved Trello connection', token: 'Use saved Trello connection', operation: 'get_boards', boardId: '', listId: '', cardId: '', cardName: '', cardDesc: '', dueDate: '', idLabels: '', idMembers: '', newListId: '', checklistName: '' }, outputExample: { success: true, operation: 'get_boards', boards: [{ id: 'board123', name: 'Customer Success', url: 'https://trello.com/b/abc' }], count: 1 }, scenario: 'Find the Customer Success board before creating cards from new support requests.', expectedOutput: 'The next Trello step can use {{$json.boards[0].id}} as Board ID.' }),
        makeOperation({ name: 'Get Lists', value: 'get_lists', description: 'List lists/columns on a Trello board. Use this after Get Boards so card creation and card movement can target the correct list ID.', inputValues: { apiKey: 'Use saved Trello connection', token: 'Use saved Trello connection', operation: 'get_lists', boardId: '{{$json.boards[0].id}}', listId: '', cardId: '', cardName: '', cardDesc: '', dueDate: '', idLabels: '', idMembers: '', newListId: '', checklistName: '' }, outputExample: { success: true, operation: 'get_lists', lists: [{ id: 'list456', name: 'Triage' }], count: 1 }, scenario: 'Find the Triage list before creating new intake cards.', expectedOutput: 'Create Card can map {{$json.lists[0].id}} into List ID.' }),
        makeOperation({ name: 'List Cards', value: 'list_cards', description: 'List cards from a specific list or from a whole board. If List ID is present it wins; otherwise the runtime lists cards for Board ID.', inputValues: { apiKey: 'Use saved Trello connection', token: 'Use saved Trello connection', operation: 'list_cards', boardId: '{{$json.boardId}}', listId: '{{$json.listId}}', cardId: '', cardName: '', cardDesc: '', dueDate: '', idLabels: '', idMembers: '', newListId: '', checklistName: '' }, outputExample: { success: true, operation: 'list_cards', cards: [{ id: 'card789', name: 'Follow up with Acme' }], count: 1 }, scenario: 'List cards in the Done column before sending a weekly completion report.', expectedOutput: 'Downstream nodes can loop over {{$json.cards}} and count {{$json.count}}.' }),
        makeOperation({ name: 'Get Card', value: 'get_card', description: 'Fetch one Trello card by card ID. Use this before updating or notifying about a card when the workflow needs the current Trello card data.', inputValues: { apiKey: 'Use saved Trello connection', token: 'Use saved Trello connection', operation: 'get_card', boardId: '', listId: '', cardId: '{{$json.card.id}}', cardName: '', cardDesc: '', dueDate: '', idLabels: '', idMembers: '', newListId: '', checklistName: '' }, outputExample: { success: true, operation: 'get_card', card: { id: 'card789', name: 'Follow up with Acme', idList: 'list456' } }, scenario: 'Read the latest card data before deciding whether to move it.', expectedOutput: 'A later condition can check {{$json.card.name}} or {{$json.card.idList}}.' }),
        makeOperation({ name: 'Create Card', value: 'create_card', description: 'Create a new card in a Trello list. Runtime requires List ID and Card Name, and can also send description, due date, label IDs, and member IDs.', inputValues: { apiKey: 'Use saved Trello connection', token: 'Use saved Trello connection', operation: 'create_card', boardId: '', listId: '{{$json.listId}}', cardId: '', cardName: '{{$json.title}}', cardDesc: '{{$json.description}}', dueDate: '{{$json.dueDate}}', idLabels: '{{$json.labelIds}}', idMembers: '{{$json.memberIds}}', newListId: '', checklistName: '' }, outputExample: { success: true, operation: 'create_card', card: { id: 'card789', name: 'Follow up with Acme', url: 'https://trello.com/c/card789' }, data: { id: 'card789' } }, scenario: 'Create a Trello card from a Typeform customer intake response.', expectedOutput: 'The created card is available as {{$json.card}}, including {{$json.card.id}} for later updates.' }),
        makeOperation({ name: 'Update Card', value: 'update_card', description: 'Update an existing card by card ID. Use it to change card title, description, list, due date, labels, or members without creating a duplicate card.', inputValues: { apiKey: 'Use saved Trello connection', token: 'Use saved Trello connection', operation: 'update_card', boardId: '', listId: '{{$json.newListId}}', cardId: '{{$json.card.id}}', cardName: '{{$json.updatedTitle}}', cardDesc: '{{$json.updatedDescription}}', dueDate: '{{$json.dueDate}}', idLabels: '{{$json.labelIds}}', idMembers: '{{$json.memberIds}}', newListId: '', checklistName: '' }, outputExample: { success: true, operation: 'update_card', card: { id: 'card789', name: 'Updated follow up', idList: 'list999' } }, scenario: 'Update a card after a CRM deal changes stage.', expectedOutput: 'Downstream nodes can read the changed Trello card as {{$json.card}}.' }),
        makeOperation({ name: 'Move Card', value: 'move_card', description: 'Move an existing Trello card to another list. Runtime requires Card ID and New List ID and sends a Trello card update with idList.', inputValues: { apiKey: 'Use saved Trello connection', token: 'Use saved Trello connection', operation: 'move_card', boardId: '', listId: '', cardId: '{{$json.card.id}}', cardName: '', cardDesc: '', dueDate: '', idLabels: '', idMembers: '', newListId: '{{$json.doneListId}}', checklistName: '' }, outputExample: { success: true, operation: 'move_card', card: { id: 'card789', idList: 'doneListId', name: 'Follow up with Acme' } }, scenario: 'Move a card to Done when an upstream approval is completed.', expectedOutput: 'The moved card is returned as {{$json.card}} and the destination is visible in {{$json.card.idList}}.' }),
        makeOperation({ name: 'Delete Card', value: 'delete_card', description: 'Delete a Trello card by card ID. Use it only for cleanup or duplicate removal workflows, because Trello removes the card from the board.', inputValues: { apiKey: 'Use saved Trello connection', token: 'Use saved Trello connection', operation: 'delete_card', boardId: '', listId: '', cardId: '{{$json.card.id}}', cardName: '', cardDesc: '', dueDate: '', idLabels: '', idMembers: '', newListId: '', checklistName: '' }, outputExample: { success: true, operation: 'delete_card', data: {}, card: {}, count: undefined }, scenario: 'Delete duplicate test cards created during an integration test run.', expectedOutput: 'A following step can branch on {{$json.success}} after the delete call is accepted.' }),
        makeOperation({ name: 'Add Label', value: 'add_label', description: 'Attach one or more labels to an existing Trello card. Runtime splits Label IDs by comma and posts each label id to the card.', inputValues: { apiKey: 'Use saved Trello connection', token: 'Use saved Trello connection', operation: 'add_label', boardId: '', listId: '', cardId: '{{$json.card.id}}', cardName: '', cardDesc: '', dueDate: '', idLabels: '{{$json.labelIds}}', idMembers: '', newListId: '', checklistName: '' }, outputExample: { success: true, operation: 'add_label', cardId: 'card789', labels: [{ id: 'label123' }], data: [{ id: 'label123' }] }, scenario: 'Mark high-risk customer requests with an urgent label after AI classification.', expectedOutput: 'The labels added are available as {{$json.labels}} and the target card is {{$json.cardId}}.' }),
        makeOperation({ name: 'Add Checklist', value: 'add_checklist', description: 'Create a checklist on an existing Trello card. Runtime requires Card ID and uses Checklist Name, defaulting to Checklist when the name is blank.', inputValues: { apiKey: 'Use saved Trello connection', token: 'Use saved Trello connection', operation: 'add_checklist', boardId: '', listId: '', cardId: '{{$json.card.id}}', cardName: '', cardDesc: '', dueDate: '', idLabels: '', idMembers: '', newListId: '', checklistName: 'QA handoff steps' }, outputExample: { success: true, operation: 'add_checklist', data: { id: 'checklist123', name: 'QA handoff steps', idCard: 'card789' } }, scenario: 'Add a standard QA checklist to cards created from bug reports.', expectedOutput: 'The created checklist response is available as {{$json.data}} for downstream logging.' }),
      ],
    },
  ],
  commonErrors: [
    { error: 'Trello connection required', cause: 'No saved Trello credential was found and apiKey/token fields were empty.', fix: 'Save Trello API Key and Token in Connections, then run Get Boards to test access.' },
    { error: 'boardId is required for get_lists', cause: 'Get Lists was selected without a board ID.', fix: 'Run Get Boards first and map {{$json.boards[0].id}} into Board ID.' },
    { error: 'boardId or listId is required for list_cards', cause: 'List Cards needs either a board or list target.', fix: 'Map Board ID from Get Boards or List ID from Get Lists.' },
    { error: 'listId and cardName are required for create_card', cause: 'Create Card was selected without a destination list or title.', fix: 'Map {{$json.lists[0].id}} into List ID and provide a non-empty Card Name.' },
    { error: 'cardId is required for get_card, update_card, delete_card, or add_checklist', cause: 'A card-specific operation was selected without Card ID.', fix: 'Use {{$json.card.id}} from Create Card or {{$json.cards[0].id}} from List Cards.' },
    { error: 'cardId and newListId are required for move_card', cause: 'Move Card needs both the card and destination list.', fix: 'Map Card ID and New List ID from earlier Trello steps.' },
    { error: 'cardId and idLabels are required for add_label', cause: 'Add Label was selected without a target card or label IDs.', fix: 'Map the card id and one or more comma-separated label IDs.' },
    { error: 'Unsupported Trello operation', cause: 'The operation value is not one of the supported Trello operations or aliases.', fix: 'Choose a visible dropdown option and update imported workflow JSON.' },
    { error: 'Trello API error', cause: 'Trello rejected the token, permissions, object id, date format, or request body.', fix: 'Reconnect Trello and confirm IDs came from Trello API output.' },
  ],
  relatedNodes: ['trello_trigger', 'linear', 'jira', 'clickup', 'typeform'],
};
