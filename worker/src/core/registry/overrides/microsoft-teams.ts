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
      credentialProviders: [],
      outputFields: ['success', 'teams'],
      status: 'implemented',
    }],
    credentialSchema: {
      requirements: [],
      credentialFields: [],
    },
    execute: async (context) => {
      return await executeViaLegacyExecutor({ context, schema });
    },
  };
}
