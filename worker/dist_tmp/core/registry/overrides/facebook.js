"use strict";
/**
 * ✅ FACEBOOK NODE - Migrated to Registry
 *
 * Facebook integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideFacebook = overrideFacebook;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideFacebook(def, schema) {
    return {
        ...def,
        credentialSchema: {
            requirements: [{
                    provider: 'facebook',
                    category: 'oauth',
                    required: true,
                    description: 'Facebook OAuth connection',
                    credentialTypeId: 'facebook_oauth2',
                    authType: 'oauth2',
                    label: 'Facebook Account',
                }],
            credentialFields: ['accessToken'],
        },
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
