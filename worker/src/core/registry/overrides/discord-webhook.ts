/**
 * Discord Webhook node metadata override.
 *
 * The webhook URL is a credential/connection value, not a normal node input.
 */

import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';
import { executeViaLegacyExecutor } from '../unified-node-registry-legacy-adapter';

export function overrideDiscordWebhook(
  def: UnifiedNodeDefinition,
  schema: NodeSchema
): UnifiedNodeDefinition {
  return {
    ...def,
    description: 'Send messages to a Discord channel via an incoming webhook URL',
    requiredInputs: ['message'],
    operationContracts: [{
      operation: 'default',
      label: 'Send Webhook Message',
      requiredFields: ['message'],
      optionalFields: ['username', 'avatarUrl'],
      credentialProviders: ['discord_webhook'],
      outputFields: ['success', 'sent', 'message', 'discord_webhook'],
      status: 'implemented',
    }],
    credentialSchema: {
      requirements: [{
        provider: 'discord_webhook',
        category: 'credential',
        required: true,
        description: 'Discord incoming webhook URL',
        credentialTypeId: 'discord_webhook',
        credentialTypeIds: ['discord_webhook'],
        authType: 'api_key' as const,
        label: 'Discord Webhook URL',
        testable: false,
      }],
      credentialFields: ['webhookUrl', 'headerName'],
    },
    execute: async (context) => {
      return await executeViaLegacyExecutor({ context, schema });
    },
  };
}
