import type { NodeDoc } from '../types';

export const trelloTriggerDoc: NodeDoc = {
  slug: 'trello_trigger',
  displayName: 'Trello Trigger',
  category: 'Triggers',
  logoUrl: '/icons/nodes/trello.svg',
  description: 'Start a workflow from signed Trello webhook events for cards, lists, comments, members, and checklists.',
  credentialType: 'Trello API Key & Token',
  credentialSetupSteps: [
    'Open trello.com/app-key while signed in.',
    'Copy the API Key, token, and app secret.',
    'In CtrlChecks, open Connections -> Add Connection -> Trello and save all three values.',
    'Set Model ID to the Trello board ID you want to watch, then activate the workflow so CtrlChecks can register the webhook.',
  ],
  credentialDocsUrl: 'https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/',
  resources: [
    {
      name: 'Webhook Events',
      description: 'Receive Trello webhook deliveries after Trello validates the callback URL with HEAD and signs POST bodies with X-Trello-Webhook.',
      operations: [
        {
          name: 'Card Activity',
          value: 'card_events',
          description: 'Trigger on card created, updated, moved, commented, member, label, and checklist activity.',
          fields: [
            { name: 'Model ID', internalKey: 'modelId', type: 'string', required: true, description: 'Board/card/member model ID Trello should watch.', placeholder: 'board id' },
            { name: 'Event Types', internalKey: 'eventTypes', type: 'string', required: false, description: 'Comma-separated event filters.', placeholder: 'card_created, card_moved, card_commented' },
            { name: 'Board ID', internalKey: 'boardId', type: 'string', required: false, description: 'Optional board filter.', placeholder: 'board id' },
            { name: 'List ID', internalKey: 'listId', type: 'string', required: false, description: 'Optional list filter.', placeholder: 'list id' },
            { name: 'Card ID', internalKey: 'cardId', type: 'string', required: false, description: 'Optional card filter.', placeholder: 'card id' },
          ],
          outputExample: { eventType: 'card_moved', cardId: 'card_id', cardName: 'Follow up', listBeforeId: 'todo', listAfterId: 'done', raw: {} },
          outputDescription: 'Normalized fields include eventId, eventType, boardId, listId, cardId, commentText, checklist fields, member fields, timestamp, and raw.',
          usageExample: {
            scenario: 'Create a follow-up task when a Trello card is moved',
            inputValues: { modelId: 'board id', eventTypes: 'card_moved' },
            expectedOutput: 'A normalized Trello card movement payload available as {{$json.cardId}}, {{$json.listAfterId}}, and {{$json.cardName}}.',
          },
          externalDocsUrl: 'https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/',
        },
      ],
    },
  ],
  commonErrors: [
    { error: 'App secret required', cause: 'Webhook signature validation needs the Trello app secret.', fix: 'Edit the Trello connection and add the App Secret from the Trello API key page.' },
    { error: 'Model ID is required', cause: 'Trello must know which board/card/member model to watch.', fix: 'Use a Trello board ID for broad board activity.' },
    { error: 'Webhook creation failed', cause: 'Trello could not validate the callback URL with HEAD or credentials cannot access the model.', fix: 'Confirm PUBLIC_BASE_URL is reachable and the token can access the board/card.' },
  ],
  relatedNodes: ['trello', 'jira_trigger', 'linear'],
};
