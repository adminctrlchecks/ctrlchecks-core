/**
 * Slack Message node metadata override.
 *
 * Slack Message is the OAuth/bot sender. Incoming webhook URLs are handled by
 * slack_webhook, but the legacy executor still accepts old saved webhookUrl
 * configs for backward compatibility.
 */

import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';
import { executeViaLegacyExecutor } from '../unified-node-registry-legacy-adapter';

export function overrideSlackMessage(
  def: UnifiedNodeDefinition,
  schema: NodeSchema
): UnifiedNodeDefinition {
  const inputSchema = {
    ...def.inputSchema,
    channel: def.inputSchema.channel
      ? {
          ...def.inputSchema.channel,
          ownership: 'structural' as const,
          fillMode: {
            default: 'buildtime_ai_once' as const,
            supportsRuntimeAI: true,
            supportsBuildtimeAI: true,
          },
        }
      : def.inputSchema.channel,
    message: def.inputSchema.message
      ? {
          ...def.inputSchema.message,
          ownership: 'value' as const,
          fillMode: {
            default: 'buildtime_ai_once' as const,
            supportsRuntimeAI: true,
            supportsBuildtimeAI: true,
          },
          role: 'long_body' as const,
          essentialForExecution: true,
        }
      : def.inputSchema.message,
    blocks: def.inputSchema.blocks
      ? {
          ...def.inputSchema.blocks,
          ownership: 'structural' as const,
          fillMode: {
            default: 'manual_static' as const,
            supportsRuntimeAI: false,
            supportsBuildtimeAI: true,
          },
          role: 'raw_json' as const,
        }
      : def.inputSchema.blocks,
    username: def.inputSchema.username
      ? {
          ...def.inputSchema.username,
          ownership: 'value' as const,
          fillMode: {
            default: 'buildtime_ai_once' as const,
            supportsRuntimeAI: false,
            supportsBuildtimeAI: true,
          },
        }
      : def.inputSchema.username,
    iconEmoji: def.inputSchema.iconEmoji
      ? {
          ...def.inputSchema.iconEmoji,
          ownership: 'value' as const,
          fillMode: {
            default: 'manual_static' as const,
            supportsRuntimeAI: false,
            supportsBuildtimeAI: true,
          },
        }
      : def.inputSchema.iconEmoji,
    threadTs: {
      type: 'string' as const,
      description: 'Optional Slack thread timestamp. Use {{$json.threadTs}} or {{$json.messageTs}} to reply in the triggering thread.',
      required: false,
      ownership: 'value' as const,
      role: 'id' as const,
      fillMode: {
        default: 'buildtime_ai_once' as const,
        supportsRuntimeAI: true,
        supportsBuildtimeAI: true,
      },
    },
  };

  return {
    ...def,
    description: 'Send messages using a Slack app/bot connection.',
    inputSchema,
    requiredInputs: ['message'],
    operationContracts: [{
      operation: 'default',
      label: 'Send Slack Message',
      requiredFields: ['message'],
      optionalFields: ['channel', 'threadTs', 'blocks', 'username', 'iconEmoji'],
      conditionallyRequiredFields: [{ field: 'channel', when: { auth: 'slack_oauth2' } }],
      credentialProviders: ['slack'],
      outputFields: ['id', 'status', 'provider', 'ok', 'channel', 'ts', 'threadTs', 'message', 'error'],
      status: 'implemented',
      forbiddenFields: ['webhookUrl', 'botToken', 'accessToken', 'access_token', 'token'],
    }],
    credentialSchema: {
      requirements: [
        {
          provider: 'slack',
          category: 'oauth',
          required: false,
          description: 'Slack OAuth bot token for chat.postMessage.',
          credentialTypeId: 'slack_oauth2',
          credentialTypeIds: ['slack_oauth2'],
          authType: 'oauth2' as const,
          label: 'Slack OAuth2',
          testable: true,
        },
      ],
      credentialFields: ['accessToken', 'access_token', 'botToken', 'bot_token', 'token'],
    },
    tags: Array.from(
      new Set([...(def.tags || []), 'communication', 'output', 'slack'])
    ),
    execute: async (context) => {
      return await executeViaLegacyExecutor({ context, schema });
    },
  };
}
