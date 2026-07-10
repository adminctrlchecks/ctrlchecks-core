"use strict";
/**
 * ✅ SPLIT IN BATCHES NODE - Migrated to Registry
 *
 * Splits array into batches.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideSplitInBatches = overrideSplitInBatches;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideSplitInBatches(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
