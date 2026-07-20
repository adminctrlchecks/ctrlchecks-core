import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';

export function overrideWhatsappTrigger(
  def: UnifiedNodeDefinition,
  _schema: NodeSchema,
): UnifiedNodeDefinition {
  const structuralBuildtime = {
    default: 'buildtime_ai_once' as const,
    supportsRuntimeAI: false,
    supportsBuildtimeAI: true,
  };
  const manualStatic = {
    default: 'manual_static' as const,
    supportsRuntimeAI: false,
    supportsBuildtimeAI: false,
  };

  return {
    ...def,
    type: 'whatsapp_trigger',
    label: 'WhatsApp Trigger',
    category: 'triggers',
    description: 'Start workflows from WhatsApp Cloud API messages and delivery status events.',
    icon: 'MessageCircle',
    version: '1.0.0',
    isBranching: false,
    incomingPorts: [],
    outgoingPorts: ['default'],
    inputSchema: {
      eventTypes: {
        type: 'string',
        description: 'WhatsApp event types to listen for',
        required: false,
        default: 'message',
        examples: ['message', 'message.text', 'message.media', 'status.delivered', 'status.read'],
        ownership: 'structural',
        role: 'config',
        fillMode: structuralBuildtime,
      },
      phoneNumberId: {
        type: 'string',
        description: 'Optional WhatsApp Phone Number ID to listen on',
        required: false,
        ownership: 'value',
        role: 'id',
        fillMode: manualStatic,
      },
      allowedWaIds: {
        type: 'string',
        description: 'Optional comma-separated sender WhatsApp IDs allowed to trigger this workflow',
        required: false,
        ownership: 'value',
        role: 'id',
        fillMode: manualStatic,
      },
      verifyToken: {
        type: 'string',
        description: 'Meta webhook verify token',
        required: false,
        ownership: 'value',
        role: 'config',
        fillMode: manualStatic,
      },
      validateSignature: {
        type: 'boolean',
        description: 'Validate Meta X-Hub-Signature-256 using the configured app secret',
        required: false,
        default: true,
        ownership: 'structural',
        role: 'config',
        fillMode: structuralBuildtime,
      },
    },
    outputSchema: {
      default: {
        name: 'default',
        description: 'Normalized WhatsApp Cloud webhook payload',
        schema: {
          type: 'object',
          properties: {
            eventId: { type: 'string' },
            eventType: { type: 'string' },
            source: { type: 'string' },
            userId: { type: 'string' },
            username: { type: 'string' },
            chatId: { type: 'string' },
            messageId: { type: 'string' },
            from: { type: 'string' },
            waId: { type: 'string' },
            timestamp: { type: 'string' },
            text: { type: 'string' },
            phoneNumberId: { type: 'string' },
            displayPhoneNumber: { type: 'string' },
            messageType: { type: 'string' },
            mediaId: { type: 'string' },
            status: { type: 'string' },
            raw: { type: 'object' },
          },
        },
      },
    },
    requiredInputs: [],
    defaultConfig: () => ({
      eventTypes: ['message'],
      validateSignature: true,
    }),
    validateConfig: () => ({ valid: true, errors: [] }),
    execute: async () => ({
      success: true,
      output: { triggered: false },
    }),
  };
}
