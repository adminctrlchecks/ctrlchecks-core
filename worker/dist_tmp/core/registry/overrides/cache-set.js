"use strict";
/**
 * ✅ CACHE SET NODE - Migrated to Registry
 *
 * Sets value in cache.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideCacheSet = overrideCacheSet;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideCacheSet(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
