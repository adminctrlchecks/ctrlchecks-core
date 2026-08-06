/**
 * ✅ SHOPIFY NODE - Migrated to Registry
 * 
 * Shopify e-commerce integration.
 */

import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';
import { executeViaLegacyExecutor } from '../unified-node-registry-legacy-adapter';

const manualStatic = {
  default: 'manual_static' as const,
  supportsRuntimeAI: false,
  supportsBuildtimeAI: true,
};

const runtimeValue = {
  default: 'runtime_ai' as const,
  supportsRuntimeAI: true,
  supportsBuildtimeAI: true,
};

export function overrideShopify(
  def: UnifiedNodeDefinition,
  schema: NodeSchema
): UnifiedNodeDefinition {
  return {
    ...def,
    inputSchema: {
      ...def.inputSchema,
      resource: {
        ...def.inputSchema.resource,
        type: def.inputSchema.resource?.type || 'string',
        description: def.inputSchema.resource?.description || 'Shopify resource type',
        required: true,
        role: 'operation_selector',
        ownership: 'structural',
        fillMode: manualStatic,
      },
      operation: {
        ...def.inputSchema.operation,
        type: def.inputSchema.operation?.type || 'string',
        description: def.inputSchema.operation?.description || 'Shopify operation',
        required: true,
        role: 'operation_selector',
        ownership: 'structural',
        fillMode: manualStatic,
      },
      shopDomain: {
        ...def.inputSchema.shopDomain,
        type: def.inputSchema.shopDomain?.type || 'string',
        description: def.inputSchema.shopDomain?.description || 'Shopify shop domain',
        required: false,
        role: 'config',
        ownership: 'value',
        fillMode: manualStatic,
      },
      id: {
        ...def.inputSchema.id,
        type: def.inputSchema.id?.type || 'string',
        description: def.inputSchema.id?.description || 'Shopify resource ID',
        required: false,
        role: 'id',
        ownership: 'value',
        fillMode: runtimeValue,
      },
      productId: {
        ...def.inputSchema.productId,
        type: def.inputSchema.productId?.type || 'string',
        description: def.inputSchema.productId?.description || 'Shopify product ID',
        required: false,
        role: 'id',
        ownership: 'value',
        fillMode: runtimeValue,
      },
      orderId: {
        ...def.inputSchema.orderId,
        type: def.inputSchema.orderId?.type || 'string',
        description: def.inputSchema.orderId?.description || 'Shopify order ID',
        required: false,
        role: 'id',
        ownership: 'value',
        fillMode: runtimeValue,
      },
      customerId: {
        ...def.inputSchema.customerId,
        type: def.inputSchema.customerId?.type || 'string',
        description: def.inputSchema.customerId?.description || 'Shopify customer ID',
        required: false,
        role: 'id',
        ownership: 'value',
        fillMode: runtimeValue,
      },
      data: {
        ...def.inputSchema.data,
        type: def.inputSchema.data?.type || 'object',
        description: def.inputSchema.data?.description || 'Payload for Shopify create/update operations',
        required: false,
        role: 'raw_json',
        ownership: 'value',
        fillMode: runtimeValue,
      },
      limit: {
        ...def.inputSchema.limit,
        type: def.inputSchema.limit?.type || 'number',
        description: def.inputSchema.limit?.description || 'Maximum number of Shopify records to return',
        required: false,
        role: 'config',
        ownership: 'value',
        fillMode: manualStatic,
      },
    },
    credentialSchema: {
      requirements: [{
        provider: 'shopify',
        category: 'api_key',
        required: true,
        description: 'Shopify Admin API access token',
        credentialTypeId: 'shopify_api_key',
        authType: 'api_key' as const,
        label: 'Shopify API Key',
      }],
      credentialFields: ['storeUrl', 'shopDomain', 'token', 'accessToken', 'apiKey'],
    },
    execute: async (context) => {
      return await executeViaLegacyExecutor({ context, schema });
    },
  };
}
