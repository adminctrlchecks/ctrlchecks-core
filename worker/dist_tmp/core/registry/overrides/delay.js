"use strict";
/**
 * ✅ DELAY NODE - Migrated to Registry
 *
 * Delays execution (alias for wait).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideDelay = overrideDelay;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideDelay(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            // Use legacy executor for now (same as wait)
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
