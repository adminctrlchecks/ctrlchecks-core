"use strict";
/**
 * ✅ INTUIT SME NODE - Migrated to Registry
 *
 * Intuit SME integration for customer and financial operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideIntuitSmes = overrideIntuitSmes;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideIntuitSmes(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            // Use legacy executor for now (complex Intuit API integration)
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
