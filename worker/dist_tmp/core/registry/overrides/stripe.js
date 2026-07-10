"use strict";
/**
 * ✅ STRIPE NODE - Migrated to Registry
 *
 * Stripe payment integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideStripe = overrideStripe;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideStripe(def, schema) {
    return {
        ...def,
        credentialSchema: {
            requirements: [{
                    provider: 'stripe',
                    category: 'api_key',
                    required: true,
                    description: 'Stripe Secret Key',
                    credentialTypeId: 'stripe_api_key',
                    authType: 'bearer_token',
                    label: 'Stripe API Key',
                }],
            credentialFields: ['secretKey', 'apiKey'],
        },
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
