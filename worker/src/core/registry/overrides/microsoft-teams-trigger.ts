import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';

export function overrideMicrosoftTeamsTrigger(
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
    type: 'microsoft_teams_trigger',
    label: 'Microsoft Teams Trigger',
    category: 'triggers',
    description: 'Trigger workflows on Microsoft Teams Bot Framework activities',
    icon: 'MessageSquare',
    version: '1.0.0',
    isBranching: false,
    incomingPorts: [],
    outgoingPorts: ['default'],
    inputSchema: {
      connectionId: {
        type: 'string',
        description: 'Optional saved Microsoft Teams Bot connection ID.',
        required: false,
        ownership: 'credential',
        role: 'id',
        fillMode: manualStatic,
      },
      eventTypes: {
        type: 'array',
        description: 'Teams activity types that can start this workflow.',
        required: false,
        default: ['message', 'conversation_update', 'invoke'],
        examples: ['message', 'conversation_update', 'invoke'],
        ownership: 'structural',
        role: 'config',
        fillMode: structuralBuildtime,
      },
      teamIds: {
        type: 'string',
        description: 'Optional comma-separated Teams team IDs allowed to trigger this workflow.',
        required: false,
        ownership: 'value',
        role: 'config',
        fillMode: manualStatic,
      },
      channelIds: {
        type: 'string',
        description: 'Optional comma-separated Teams channel IDs allowed to trigger this workflow.',
        required: false,
        ownership: 'value',
        role: 'config',
        fillMode: manualStatic,
      },
      allowedUserIds: {
        type: 'string',
        description: 'Optional comma-separated Teams/AAD user IDs allowed to trigger this workflow.',
        required: false,
        ownership: 'value',
        role: 'config',
        fillMode: manualStatic,
      },
      tenantId: {
        type: 'string',
        description: 'Optional Microsoft tenant ID filter.',
        required: false,
        ownership: 'value',
        role: 'id',
        fillMode: manualStatic,
      },
      appId: {
        type: 'string',
        description: 'Optional Microsoft App ID override. Prefer storing it on the Teams Bot connection.',
        required: false,
        ownership: 'credential',
        role: 'id',
        fillMode: manualStatic,
      },
      validationSecret: {
        type: 'string',
        description: 'Optional shared secret for simulations. Production Bot Framework requests should use JWT validation.',
        required: false,
        ownership: 'credential',
        role: 'value',
        fillMode: manualStatic,
      },
      validateJwt: {
        type: 'boolean',
        description: 'Validate Bot Framework bearer JWT or configured shared secret.',
        required: false,
        default: true,
        ownership: 'structural',
        role: 'config',
        fillMode: manualStatic,
      },
    },
    outputSchema: {
      default: {
        name: 'default',
        description: 'Normalized Microsoft Teams Bot Framework activity payload',
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
            tenantId: { type: 'string' },
            teamId: { type: 'string' },
            channelId: { type: 'string' },
            chatId: { type: 'string' },
            conversationId: { type: 'string' },
            serviceUrl: { type: 'string' },
            activityId: { type: 'string' },
            replyToId: { type: 'string' },
            locale: { type: 'string' },
            channelData: { type: 'object' },
            raw: { type: 'object' },
          },
        },
      },
    },
    requiredInputs: [],
    defaultConfig: () => ({
      eventTypes: ['message', 'conversation_update', 'invoke'],
      validateJwt: true,
    }),
    validateConfig: () => ({ valid: true, errors: [] }),
    execute: async () => ({
      success: true,
      output: { triggered: false },
    }),
  };
}
