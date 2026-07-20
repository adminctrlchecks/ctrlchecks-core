/**
 * Discord Trigger node registry override.
 *
 * Real-time starts are created by worker/src/api/discord-trigger.ts after
 * Discord Ed25519 request signing checks. The node itself is passive during
 * workflow execution.
 */

import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';

export function overrideDiscordTrigger(
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
    type: 'discord_trigger',
    label: 'Discord Trigger',
    category: 'triggers',
    description: 'Trigger workflows on Discord interactions, slash commands, and HTTP webhook events',
    icon: 'MessageCircle',
    version: '1.0.0',
    isBranching: false,
    incomingPorts: [],
    outgoingPorts: ['default'],
    inputSchema: {
      connectionId: {
        type: 'string',
        description: 'Optional saved Discord Bot Token connection ID. If blank, the active Discord connection is used.',
        required: false,
        ownership: 'credential',
        role: 'id',
        fillMode: manualStatic,
      },
      eventTypes: {
        type: 'array',
        description: 'Discord event types that can start this workflow.',
        required: false,
        default: ['message', 'slash_command', 'interaction'],
        examples: ['message', 'slash_command', 'interaction', 'webhook_event'],
        ownership: 'structural',
        role: 'config',
        fillMode: structuralBuildtime,
      },
      guildIds: {
        type: 'string',
        description: 'Optional comma-separated Discord guild/server IDs allowed to trigger this workflow.',
        required: false,
        ownership: 'value',
        role: 'config',
        fillMode: manualStatic,
      },
      channelIds: {
        type: 'string',
        description: 'Optional comma-separated channel IDs allowed to trigger this workflow.',
        required: false,
        ownership: 'value',
        role: 'config',
        fillMode: manualStatic,
      },
      allowedUserIds: {
        type: 'string',
        description: 'Optional comma-separated Discord user IDs allowed to trigger this workflow.',
        required: false,
        ownership: 'value',
        role: 'config',
        fillMode: manualStatic,
      },
      commandFilter: {
        type: 'string',
        description: 'Optional slash command filter, such as /support.',
        required: false,
        ownership: 'value',
        role: 'config',
        fillMode: manualStatic,
      },
      applicationId: {
        type: 'string',
        description: 'Optional Discord application ID filter.',
        required: false,
        ownership: 'value',
        role: 'id',
        fillMode: manualStatic,
      },
      publicKey: {
        type: 'string',
        description: 'Optional Discord application public key fallback. Prefer storing it on the Discord connection or worker env.',
        required: false,
        ownership: 'credential',
        role: 'value',
        fillMode: manualStatic,
      },
      validateSignature: {
        type: 'boolean',
        description: 'Validate X-Signature-Ed25519 and X-Signature-Timestamp.',
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
        description: 'Normalized Discord real-time event payload',
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
            applicationId: { type: 'string' },
            guildId: { type: 'string' },
            channelId: { type: 'string' },
            threadId: { type: 'string' },
            chatId: { type: 'string' },
            messageId: { type: 'string' },
            command: { type: 'string' },
            customId: { type: 'string' },
            interactionId: { type: 'string' },
            interactionToken: { type: 'string' },
            responseUrl: { type: 'string' },
            rawEventType: { type: 'string' },
            raw: { type: 'object' },
          },
        },
      },
    },
    requiredInputs: [],
    defaultConfig: () => ({
      eventTypes: ['message', 'slash_command', 'interaction'],
      validateSignature: true,
    }),
    validateConfig: () => ({ valid: true, errors: [] }),
    execute: async () => ({
      success: true,
      output: { triggered: false },
    }),
  };
}
