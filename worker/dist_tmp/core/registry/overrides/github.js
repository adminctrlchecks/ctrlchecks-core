"use strict";
/**
 * ✅ GITHUB NODE - Migrated to Registry
 *
 * GitHub integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideGithub = overrideGithub;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideGithub(def, schema) {
    return {
        ...def,
        credentialSchema: {
            requirements: [{
                    provider: 'github',
                    category: 'api_key',
                    required: true,
                    description: 'GitHub Personal Access Token',
                    credentialTypeId: 'github_pat',
                    authType: 'bearer_token',
                    label: 'GitHub Personal Token',
                }],
            credentialFields: ['token', 'apiKey'],
        },
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
