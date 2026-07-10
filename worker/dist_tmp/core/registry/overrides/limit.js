"use strict";
/**
 * ✅ LIMIT NODE - Migrated to Registry
 *
 * Limits array items to specified count.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideLimit = overrideLimit;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideLimit(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            // Use legacy executor for now (array manipulation logic)
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
