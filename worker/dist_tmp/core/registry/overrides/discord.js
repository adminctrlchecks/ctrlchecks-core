"use strict";
/**
 * ✅ DISCORD NODE - Migrated to Registry
 *
 * Discord messaging integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideDiscord = overrideDiscord;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideDiscord(def, schema) {
    return {
        ...def,
        credentialSchema: {
            requirements: [{
                    provider: 'discord',
                    category: 'api_key',
                    required: true,
                    description: 'Discord Bot Token',
                    credentialTypeId: 'discord_bot_token',
                    authType: 'bearer_token',
                    label: 'Discord Bot Token',
                }],
            credentialFields: ['botToken', 'token'],
        },
        execute: async (context) => {
            // Use legacy executor for now (complex Discord API integration)
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
