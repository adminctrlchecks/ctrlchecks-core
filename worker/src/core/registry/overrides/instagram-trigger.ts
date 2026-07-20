/**
 * Instagram Trigger node registry override.
 *
 * Trigger nodes are passive during normal workflow execution. Real-time starts
 * are created by worker/src/api/instagram-trigger.ts after Meta webhook checks.
 */

import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';

export function overrideInstagramTrigger(
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
    type: 'instagram_trigger',
    label: 'Instagram Trigger',
    category: 'triggers',
    description: 'Trigger workflows on real-time Instagram events: DM, comment, mention, story reply, or postback',
    icon: 'Instagram',
    version: '1.0.0',
    isBranching: false,
    incomingPorts: [],
    outgoingPorts: ['default'],
    inputSchema: {
      connectionId: {
        type: 'string',
        description: 'Optional saved Instagram connection ID. If blank, the active Instagram connection is used.',
        required: false,
        ownership: 'credential',
        role: 'id',
        fillMode: manualStatic,
      },
      eventTypes: {
        type: 'array',
        description: 'Instagram event types that can start this workflow.',
        required: false,
        default: ['message', 'comment', 'mention', 'message.story_reply'],
        examples: ['message', 'comment', 'mention', 'message.story_reply', 'postback'],
        ownership: 'structural',
        role: 'config',
        fillMode: structuralBuildtime,
      },
      instagramBusinessAccountId: {
        type: 'string',
        description: 'Optional Instagram Business Account ID filter.',
        required: false,
        ownership: 'value',
        role: 'id',
        fillMode: manualStatic,
      },
      allowedSenderIds: {
        type: 'string',
        description: 'Optional comma-separated Instagram sender IDs allowed to trigger this workflow.',
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
        description: 'Normalized Instagram webhook event payload',
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
            instagramBusinessAccountId: { type: 'string' },
            pageId: { type: 'string' },
            messageId: { type: 'string' },
            messageType: { type: 'string' },
            commentId: { type: 'string' },
            mediaId: { type: 'string' },
            mentionId: { type: 'string' },
            postbackPayload: { type: 'string' },
            isStoryReply: { type: 'boolean' },
            raw: { type: 'object' },
          },
        },
      },
    },
    requiredInputs: [],
    defaultConfig: () => ({
      eventTypes: ['message', 'comment', 'mention', 'message.story_reply'],
      validateSignature: true,
    }),
    validateConfig: () => ({ valid: true, errors: [] }),
    execute: async () => ({
      success: true,
      output: { triggered: false },
    }),
  };
}
