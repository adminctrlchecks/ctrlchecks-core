import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';

export function overrideOutlookTrigger(
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
    type: 'outlook_trigger',
    label: 'Outlook Trigger',
    category: 'triggers',
    description: 'Trigger workflows on new Outlook email or calendar events via Microsoft Graph change notifications',
    icon: 'Mail',
    version: '1.0.0',
    isBranching: false,
    incomingPorts: [],
    outgoingPorts: ['default'],
    inputSchema: {
      connectionId: {
        type: 'string',
        description: 'Optional saved Microsoft OAuth connection ID.',
        required: false,
        ownership: 'credential',
        role: 'id',
        fillMode: manualStatic,
      },
      resource: {
        type: 'string',
        description: 'Which Outlook resource to watch: mail or calendar.',
        required: false,
        default: 'mail',
        examples: ['mail', 'calendar'],
        ownership: 'structural',
        role: 'config',
        fillMode: structuralBuildtime,
      },
      changeTypes: {
        type: 'array',
        description: 'Graph change types that can start this workflow.',
        required: false,
        default: ['created'],
        examples: ['created', 'updated'],
        ownership: 'structural',
        role: 'config',
        fillMode: structuralBuildtime,
      },
      folderName: {
        type: 'string',
        description: 'Mail folder to watch (mail resource only). Defaults to Inbox.',
        required: false,
        ownership: 'value',
        role: 'config',
        fillMode: manualStatic,
      },
      query: {
        type: 'string',
        description: 'Optional keyword filter matched against the subject, sender, and snippet.',
        required: false,
        ownership: 'value',
        role: 'config',
        fillMode: manualStatic,
      },
    },
    outputSchema: {
      default: {
        name: 'default',
        description: 'Normalized Outlook message/event payload',
        schema: {
          type: 'object',
          properties: {
            eventId: { type: 'string' },
            eventType: { type: 'string' },
            source: { type: 'string' },
            userId: { type: 'string' },
            username: { type: 'string' },
            text: { type: 'string' },
            timestamp: { type: 'string' },
            resourceId: { type: 'string' },
            subject: { type: 'string' },
            from: { type: 'string' },
            to: { type: 'string' },
            snippet: { type: 'string' },
            conversationId: { type: 'string' },
            start: { type: 'string' },
            end: { type: 'string' },
            attendees: { type: 'array' },
            raw: { type: 'object' },
          },
        },
      },
    },
    requiredInputs: [],
    defaultConfig: () => ({
      resource: 'mail',
      changeTypes: ['created'],
    }),
    validateConfig: () => ({ valid: true, errors: [] }),
    execute: async () => ({
      success: true,
      output: { triggered: false },
    }),
  };
}
