/**
 * Slack Trigger node registry override.
 *
 * Real-time starts are created by worker/src/api/slack-trigger.ts after Slack
 * request signing checks. The node itself is passive during workflow execution.
 */

import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';

export function overrideSlackTrigger(
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
    type: 'slack_trigger',
    label: 'Slack Trigger',
    category: 'triggers',
    description: 'Trigger workflows on real-time Slack events: app mentions, messages, slash commands, and interactions',
    icon: 'Slack',
    version: '1.0.0',
    isBranching: false,
    incomingPorts: [],
    outgoingPorts: ['default'],
    inputSchema: {
      connectionId: {
        type: 'string',
        description: 'Optional saved Slack OAuth connection ID. If blank, the active Slack connection is used.',
        required: false,
        ownership: 'credential',
        role: 'id',
        fillMode: manualStatic,
      },
      eventTypes: {
        type: 'array',
        description: 'Slack event types that can start this workflow.',
        required: false,
        default: ['app_mention', 'message', 'slash_command', 'interaction'],
        examples: ['app_mention', 'message', 'slash_command', 'interaction'],
        ownership: 'structural',
        role: 'config',
        fillMode: structuralBuildtime,
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
        description: 'Optional comma-separated Slack user IDs allowed to trigger this workflow.',
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
      teamId: {
        type: 'string',
        description: 'Optional Slack workspace/team ID filter.',
        required: false,
        ownership: 'value',
        role: 'id',
        fillMode: manualStatic,
      },
      signingSecret: {
        type: 'string',
        description: 'Optional Slack app signing secret fallback. Prefer storing it on the Slack connection or worker env.',
        required: false,
        ownership: 'credential',
        role: 'value',
        fillMode: manualStatic,
      },
      validateSignature: {
        type: 'boolean',
        description: 'Validate Slack X-Slack-Signature and X-Slack-Request-Timestamp.',
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
        description: 'Normalized Slack webhook event payload',
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
            teamId: { type: 'string' },
            enterpriseId: { type: 'string' },
            channelId: { type: 'string' },
            channelName: { type: 'string' },
            chatId: { type: 'string' },
            threadTs: { type: 'string' },
            messageTs: { type: 'string' },
            command: { type: 'string' },
            triggerId: { type: 'string' },
            responseUrl: { type: 'string' },
            callbackId: { type: 'string' },
            actionId: { type: 'string' },
            interactionType: { type: 'string' },
            raw: { type: 'object' },
          },
        },
      },
    },
    requiredInputs: [],
    defaultConfig: () => ({
      eventTypes: ['app_mention', 'message', 'slash_command', 'interaction'],
      validateSignature: true,
    }),
    validateConfig: () => ({ valid: true, errors: [] }),
    execute: async () => ({
      success: true,
      output: { triggered: false },
    }),
  };
}
