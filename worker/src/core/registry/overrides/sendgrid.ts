/**
 * ✅ SENDGRID NODE - Migrated to Registry
 *
 * SendGrid transactional email integration.
 */

import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';
import { executeViaLegacyExecutor } from '../unified-node-registry-legacy-adapter';

export function overrideSendgrid(
  def: UnifiedNodeDefinition,
  schema: NodeSchema
): UnifiedNodeDefinition {
  return {
    ...def,
    credentialSchema: {
      requirements: [{
        provider: 'sendgrid',
        category: 'api_key',
        required: true,
        description: 'SendGrid API Key with Mail Send permission',
        credentialTypeId: 'sendgrid_api_key',
        credentialTypeIds: ['sendgrid_api_key'],
        authType: 'bearer_token' as const,
        label: 'SendGrid API Key',
      }],
      credentialFields: [],
    },
    execute: async (context) => {
      return await executeViaLegacyExecutor({ context, schema });
    },
  };
}
