"use strict";
/**
 * ✅ MATH NODE - Migrated to Registry
 *
 * Performs mathematical operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideMath = overrideMath;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideMath(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            // Use legacy executor for now (complex math operations with type resolution)
            // TODO: Port full math logic to registry when time permits
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
