"use strict";
/**
 * ✅ WAIT NODE - Migrated to Registry
 *
 * Delays execution for specified duration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideWait = overrideWait;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideWait(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            // Use legacy executor for now (requires async delay logic)
            // TODO: Port full wait logic to registry when time permits
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
