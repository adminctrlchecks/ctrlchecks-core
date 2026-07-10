"use strict";
/**
 * ✅ RETURN NODE - Migrated to Registry
 *
 * Early return from workflow.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideReturn = overrideReturn;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideReturn(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            // Use legacy executor for now (requires workflow control logic)
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
