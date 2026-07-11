/**
 * ✅ WHATSAPP CLOUD NODE - Deprecated alias for `whatsapp`
 *
 * `whatsapp_cloud` and `whatsapp` both send messages through the WhatsApp
 * Business Cloud API using the same Facebook OAuth token
 * (see `overrides/whatsapp.ts` and `shared/whatsapp-token-manager.ts`) — there
 * is no separate manual-API-key auth path in practice. This override reuses
 * the `whatsapp` node's execution/credential logic verbatim so `whatsapp_cloud`
 * keeps working for existing saved workflows, while new workflows should be
 * generated with `whatsapp` instead (see node-library.ts createWhatsappCloudSchema).
 */

import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';
import { overrideWhatsapp } from './whatsapp';

export function overrideWhatsappCloud(
  def: UnifiedNodeDefinition,
  schema: NodeSchema
): UnifiedNodeDefinition {
  const whatsapp = overrideWhatsapp(def, schema);
  return {
    ...whatsapp,
    type: 'whatsapp_cloud',
    label: 'WhatsApp Cloud (deprecated)',
    description: 'Deprecated — use the WhatsApp node instead. Kept only for backward compatibility with existing workflows.',
  };
}
