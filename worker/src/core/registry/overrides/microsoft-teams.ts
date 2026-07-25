/**
 * ✅ MICROSOFT TEAMS NODE - Migrated to Registry
 * 
 * Microsoft Teams messaging integration.
 */

import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';
import { executeViaLegacyExecutor } from '../unified-node-registry-legacy-adapter';

export function overrideMicrosoftTeams(
  def: UnifiedNodeDefinition,
  schema: NodeSchema
): UnifiedNodeDefinition {
  return {
    ...def,
    description: 'Send messages to Microsoft Teams through an incoming webhook URL',
    requiredInputs: ['webhookUrl', 'message'],
    operationContracts: [{
      operation: 'default',
      label: 'Send Webhook Message',
      requiredFields: ['webhookUrl', 'message'],
      optionalFields: [],
      credentialProviders: ['microsoft_teams'],
      outputFields: ['success', 'teams'],
      status: 'implemented',
    }],
    credentialSchema: {
      requirements: [{
        credentialTypeId: 'microsoft_teams_webhook',
        provider: 'microsoft_teams',
        category: 'credential',
        required: true,
        description: 'Microsoft Teams incoming webhook URL',
      }],
      credentialFields: ['connectionId', 'webhookUrl'],
    },
    execute: async (context) => {
      return await executeViaLegacyExecutor({ context, schema });
    },
  };
}
