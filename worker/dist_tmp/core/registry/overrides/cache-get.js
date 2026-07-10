"use strict";
/**
 * ✅ CACHE GET NODE - Migrated to Registry
 *
 * Gets value from cache.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideCacheGet = overrideCacheGet;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideCacheGet(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
