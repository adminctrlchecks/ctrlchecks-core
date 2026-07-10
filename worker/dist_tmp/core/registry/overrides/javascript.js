"use strict";
/**
 * ✅ JAVASCRIPT NODE - Migrated to Registry
 *
 * Custom JavaScript code execution.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideJavascript = overrideJavascript;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideJavascript(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            // Use legacy executor for now (complex JavaScript sandboxing logic)
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
