"use strict";
/**
 * ✅ API KEY AUTH NODE - Migrated to Registry
 *
 * API key authentication.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideApiKeyAuth = overrideApiKeyAuth;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideApiKeyAuth(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
