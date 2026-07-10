"use strict";
/**
 * ✅ PIPEDRIVE NODE - Migrated to Registry
 *
 * Pipedrive CRM integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overridePipedrive = overridePipedrive;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overridePipedrive(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            // Use legacy executor for now (complex Pipedrive API integration)
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
