"use strict";
/**
 * ✅ AIRTABLE NODE - Migrated to Registry
 *
 * Airtable integration for reading/writing records.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideAirtable = overrideAirtable;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideAirtable(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            // Use legacy executor for now (complex Airtable API integration)
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
