import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';

export function overrideTrelloTrigger(
  def: UnifiedNodeDefinition,
  _schema: NodeSchema,
): UnifiedNodeDefinition {
  const manualStatic = {
    default: 'manual_static' as const,
    supportsRuntimeAI: false,
    supportsBuildtimeAI: false,
  };

  return {
    ...def,
    type: 'trello_trigger',
    label: 'Trello Trigger',
    category: 'triggers',
    description: 'Trigger workflows on Trello card, list, board, comment, member, and checklist activity',
    icon: 'Layers',
    version: '1.0.0',
    isBranching: false,
    incomingPorts: [],
    outgoingPorts: ['default'],
    inputSchema: {
      connectionId: {
        type: 'string',
        description: 'Optional saved Trello connection ID (API key, token, app secret).',
        required: false,
        ownership: 'credential',
        role: 'id',
        fillMode: manualStatic,
      },
      modelId: {
        type: 'string',
        description: 'Trello model ID to watch. Use a board ID for board/list/card activity, or a card/member ID for narrower events.',
        required: true,
        ownership: 'value',
        role: 'id',
        fillMode: manualStatic,
      },
      eventTypes: {
        type: 'string',
        description: 'Comma-separated event types to listen for, such as card_created, card_updated, card_moved, card_commented, list_activity, checklist_activity.',
        required: false,
        ownership: 'value',
        role: 'config',
        fillMode: manualStatic,
      },
      boardId: {
        type: 'string',
        description: 'Optional board ID filter.',
        required: false,
        ownership: 'value',
        role: 'id',
        fillMode: manualStatic,
      },
      listId: {
        type: 'string',
        description: 'Optional list ID filter. For moved cards, either before or after list can match.',
        required: false,
        ownership: 'value',
        role: 'id',
        fillMode: manualStatic,
      },
      cardId: {
        type: 'string',
        description: 'Optional card ID filter.',
        required: false,
        ownership: 'value',
        role: 'id',
        fillMode: manualStatic,
      },
      memberId: {
        type: 'string',
        description: 'Optional Trello member ID filter.',
        required: false,
        ownership: 'value',
        role: 'id',
        fillMode: manualStatic,
      },
      query: {
        type: 'string',
        description: 'Optional keyword filter matched against card names and comment text.',
        required: false,
        ownership: 'value',
        role: 'config',
        fillMode: manualStatic,
      },
    },
    outputSchema: {
      default: {
        name: 'default',
        description: 'Normalized Trello webhook event payload',
        schema: {
          type: 'object',
          properties: {
            eventId: { type: 'string' },
            eventType: { type: 'string' },
            source: { type: 'string' },
            timestamp: { type: 'string' },
            actionId: { type: 'string' },
            actionType: { type: 'string' },
            boardId: { type: 'string' },
            boardName: { type: 'string' },
            boardUrl: { type: 'string' },
            listId: { type: 'string' },
            listName: { type: 'string' },
            listBeforeId: { type: 'string' },
            listBeforeName: { type: 'string' },
            listAfterId: { type: 'string' },
            listAfterName: { type: 'string' },
            cardId: { type: 'string' },
            cardName: { type: 'string' },
            cardUrl: { type: 'string' },
            cardShortLink: { type: 'string' },
            commentText: { type: 'string' },
            checklistId: { type: 'string' },
            checklistName: { type: 'string' },
            checkItemId: { type: 'string' },
            checkItemName: { type: 'string' },
            memberId: { type: 'string' },
            memberName: { type: 'string' },
            userId: { type: 'string' },
            username: { type: 'string' },
            raw: { type: 'object' },
          },
        },
      },
    },
    requiredInputs: ['modelId'],
    defaultConfig: () => ({ eventTypes: 'card_created, card_updated, card_moved, card_commented' }),
    validateConfig: (config: Record<string, unknown>) => {
      const errors: string[] = [];
      if (!String(config.modelId || config.boardId || '').trim()) {
        errors.push('Trello Trigger requires a modelId (or boardId) so CtrlChecks can register the webhook.');
      }
      return { valid: errors.length === 0, errors };
    },
    execute: async () => ({
      success: true,
      output: { triggered: false },
    }),
  };
}
