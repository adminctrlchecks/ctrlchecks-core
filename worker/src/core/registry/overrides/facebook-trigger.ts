/**
 * Facebook Page/Messenger Trigger node registry override.
 *
 * Trigger nodes are passive during normal workflow execution. Real-time starts
 * are created by worker/src/api/facebook-trigger.ts after Meta webhook checks.
 */

import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';

export function overrideFacebookTrigger(
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
    type: 'facebook_trigger',
    label: 'Facebook Page/Messenger Trigger',
    category: 'triggers',
    description: 'Trigger workflows on real-time Facebook Page and Messenger events: messages, comments, mentions, postbacks, leads, and feed updates',
    icon: 'Facebook',
    version: '1.0.0',
    isBranching: false,
    incomingPorts: [],
    outgoingPorts: ['default'],
    inputSchema: {
      connectionId: {
        type: 'string',
        description: 'Optional saved Facebook connection ID. If blank, the active Facebook connection is used.',
        required: false,
        ownership: 'credential',
        role: 'id',
        fillMode: manualStatic,
      },
      eventTypes: {
        type: 'array',
        description: 'Facebook event types that can start this workflow.',
        required: false,
        default: ['message', 'comment', 'mention', 'postback', 'leadgen', 'feed'],
        examples: ['message', 'comment', 'mention', 'postback', 'leadgen', 'feed'],
        ownership: 'structural',
        role: 'config',
        fillMode: structuralBuildtime,
      },
      pageId: {
        type: 'string',
        description: 'Optional Facebook Page ID filter.',
        required: false,
        ownership: 'value',
        role: 'id',
        fillMode: manualStatic,
      },
      allowedSenderIds: {
        type: 'string',
        description: 'Optional comma-separated Facebook PSIDs/user IDs allowed to trigger this workflow.',
        required: false,
        ownership: 'value',
        role: 'config',
        fillMode: manualStatic,
      },
      verifyToken: {
        type: 'string',
        description: 'Meta webhook verify token. Must match the value entered in Meta for Developers.',
        required: false,
        ownership: 'value',
        role: 'config',
        fillMode: manualStatic,
      },
      validateSignature: {
        type: 'boolean',
        description: 'Validate Meta X-Hub-Signature-256 using the worker Meta app secret.',
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
        description: 'Normalized Facebook webhook event payload',
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
            chatId: { type: 'string' },
            senderId: { type: 'string' },
            recipientId: { type: 'string' },
            pageId: { type: 'string' },
            messageId: { type: 'string' },
            messageType: { type: 'string' },
            commentId: { type: 'string' },
            postId: { type: 'string' },
            parentId: { type: 'string' },
            leadgenId: { type: 'string' },
            formId: { type: 'string' },
            postbackPayload: { type: 'string' },
            field: { type: 'string' },
            verb: { type: 'string' },
            item: { type: 'string' },
            raw: { type: 'object' },
          },
        },
      },
    },
    requiredInputs: [],
    defaultConfig: () => ({
      eventTypes: ['message', 'comment', 'mention', 'postback', 'leadgen', 'feed'],
      validateSignature: true,
    }),
    validateConfig: () => ({ valid: true, errors: [] }),
    execute: async () => ({
      success: true,
      output: { triggered: false },
    }),
  };
}
