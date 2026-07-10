"use strict";
/**
 * ✅ FILTER NODE - Migrated to Registry
 *
 * Filters array items based on conditions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideFilter = overrideFilter;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideFilter(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
