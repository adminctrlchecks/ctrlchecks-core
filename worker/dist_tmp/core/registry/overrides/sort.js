"use strict";
/**
 * ✅ SORT NODE - Migrated to Registry
 *
 * Sorts arrays by specified field.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideSort = overrideSort;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideSort(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            // Use legacy executor for now (complex sorting logic with template resolution)
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
