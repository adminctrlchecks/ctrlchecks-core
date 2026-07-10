"use strict";
/**
 * ✅ NETLIFY NODE - Migrated to Registry
 *
 * Netlify API integration — sites, deploys, forms.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideNetlify = overrideNetlify;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideNetlify(def, schema) {
    return {
        ...def,
        tags: Array.from(new Set([...(def.tags || []), 'netlify', 'devops', 'deploy', 'api'])),
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
