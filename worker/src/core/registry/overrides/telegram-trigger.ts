import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';

export function overrideTelegramTrigger(
  def: UnifiedNodeDefinition,
  _schema: NodeSchema,
): UnifiedNodeDefinition {
  return {
    ...def,
    type: 'telegram_trigger',
    label: 'Telegram Trigger',
    category: 'triggers',
    description: 'Start workflows from Telegram Bot API webhook updates.',
    icon: 'Send',
    version: '1.0.0',
    isBranching: false,
    incomingPorts: [],
    outgoingPorts: ['default'],
    inputSchema: {
      updateTypes: {
        type: 'array',
        description: 'Telegram update types to receive.',
        required: false,
        default: ['message'],
      },
      allowedChatIds: {
        type: 'string',
        description: 'Optional comma-separated Telegram chat IDs allowed to trigger this workflow.',
        required: false,
      },
      commandFilter: {
        type: 'string',
        description: 'Optional slash command filter, for example /start.',
        required: false,
      },
      secretToken: {
        type: 'string',
        description: 'Optional Telegram webhook secret token.',
        required: false,
      },
    },
    outputSchema: {
      default: {
        name: 'default',
        description: 'Normalized Telegram update payload.',
        schema: {
          type: 'object',
          properties: {
            chatId: { type: 'string' },
            messageId: { type: 'number' },
            text: { type: 'string' },
            username: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            userId: { type: 'string' },
            updateType: { type: 'string' },
            raw: { type: 'object' },
          },
        },
      },
    },
    requiredInputs: [],
    defaultConfig: () => ({
      updateTypes: ['message'],
      allowedChatIds: '',
      commandFilter: '',
      secretToken: '',
    }),
    validateConfig: () => ({ valid: true, errors: [] }),
    execute: async (context) => ({
      success: true,
      output: context.input || {},
    }),
  };
}
