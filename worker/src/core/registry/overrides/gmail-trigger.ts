import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';

export function overrideGmailTrigger(
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
    type: 'gmail_trigger',
    label: 'Gmail Trigger',
    category: 'triggers',
    description: 'Trigger workflows on new Gmail messages or label changes via Google Cloud Pub/Sub push notifications',
    icon: 'Mail',
    version: '1.0.0',
    isBranching: false,
    incomingPorts: [],
    outgoingPorts: ['default'],
    inputSchema: {
      connectionId: {
        type: 'string',
        description: 'Optional saved Google OAuth connection ID.',
        required: false,
        ownership: 'credential',
        role: 'id',
        fillMode: manualStatic,
      },
      pubsubTopic: {
        type: 'string',
        description: 'Google Cloud Pub/Sub topic name (projects/PROJECT_ID/topics/TOPIC) that this mailbox will publish new-message notifications to.',
        required: true,
        ownership: 'value',
        role: 'id',
        fillMode: manualStatic,
      },
      eventTypes: {
        type: 'array',
        description: 'Gmail history event types that can start this workflow.',
        required: false,
        default: ['message_added'],
        examples: ['message_added', 'label_added', 'label_removed'],
        ownership: 'structural',
        role: 'config',
        fillMode: structuralBuildtime,
      },
      labelIds: {
        type: 'string',
        description: 'Optional comma-separated Gmail label IDs to filter on (e.g. INBOX, IMPORTANT).',
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
      validateAuth: {
        type: 'boolean',
        description: 'Validate Google-signed Pub/Sub push OIDC tokens or a configured shared secret.',
        required: false,
        default: true,
        ownership: 'structural',
        role: 'config',
        fillMode: manualStatic,
      },
      audience: {
        type: 'string',
        description: 'Optional expected audience for the Pub/Sub push OIDC token. Defaults to the webhook URL.',
        required: false,
        ownership: 'value',
        role: 'value',
        fillMode: manualStatic,
      },
      validationSecret: {
        type: 'string',
        description: 'Optional shared secret for simulations, checked via a token query parameter.',
        required: false,
        ownership: 'credential',
        role: 'value',
        fillMode: manualStatic,
      },
    },
    outputSchema: {
      default: {
        name: 'default',
        description: 'Normalized Gmail message/label event payload',
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
            emailAddress: { type: 'string' },
            historyId: { type: 'string' },
            messageId: { type: 'string' },
            threadId: { type: 'string' },
            subject: { type: 'string' },
            from: { type: 'string' },
            to: { type: 'string' },
            snippet: { type: 'string' },
            labelIds: { type: 'array' },
            raw: { type: 'object' },
          },
        },
      },
    },
    requiredInputs: ['pubsubTopic'],
    defaultConfig: () => ({
      eventTypes: ['message_added'],
      validateAuth: true,
    }),
    validateConfig: (config: Record<string, unknown>) => {
      const errors: string[] = [];
      if (!String(config?.pubsubTopic || '').trim()) {
        errors.push('A Google Cloud Pub/Sub topic name is required.');
      }
      return { valid: errors.length === 0, errors };
    },
    execute: async () => ({
      success: true,
      output: { triggered: false },
    }),
  };
}
