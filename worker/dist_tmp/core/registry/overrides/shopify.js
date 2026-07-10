"use strict";
/**
 * ✅ SHOPIFY NODE - Migrated to Registry
 *
 * Shopify e-commerce integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideShopify = overrideShopify;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideShopify(def, schema) {
    return {
        ...def,
        credentialSchema: {
            requirements: [{
                    provider: 'shopify',
                    category: 'api_key',
                    required: true,
                    description: 'Shopify Admin API access token',
                    credentialTypeId: 'shopify_api_key',
                    authType: 'api_key',
                    label: 'Shopify API Key',
                }],
            credentialFields: ['accessToken', 'apiKey'],
        },
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
