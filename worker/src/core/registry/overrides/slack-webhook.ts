/**
 * Slack Webhook node metadata override.
 *
 * The incoming webhook URL is a credential/connection value, not a normal node
 * input. The node itself only needs the message body.
 */

import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';
import { executeViaLegacyExecutor } from '../unified-node-registry-legacy-adapter';

export function overrideSlackWebhook(
  def: UnifiedNodeDefinition,
  schema: NodeSchema
): UnifiedNodeDefinition {
  return {
    ...def,
    description: 'Send simple messages through a Slack Incoming Webhook.',
    requiredInputs: ['message'],
    operationContracts: [{
      operation: 'default',
      label: 'Send Incoming Webhook Message',
      requiredFields: ['message'],
      optionalFields: [],
      credentialProviders: ['slack_webhook'],
      outputFields: ['id', 'status', 'provider', 'message', 'error'],
      status: 'implemented',
      forbiddenFields: ['webhookUrl', 'botToken', 'accessToken', 'access_token', 'token'],
      legacyAliases: ['text->message'],
    }],
    credentialSchema: {
      requirements: [{
        provider: 'slack_webhook',
        category: 'webhook',
        required: true,
        description: 'Slack Incoming Webhook URL.',
        credentialTypeId: 'slack_webhook',
        credentialTypeIds: ['slack_webhook'],
        authType: 'api_key' as const,
        label: 'Slack Incoming Webhook',
        testable: false,
      }],
      credentialFields: ['webhookUrl', 'webhook_url', 'url'],
    },
    execute: async (context) => {
      return await executeViaLegacyExecutor({ context, schema });
    },
  };
}
