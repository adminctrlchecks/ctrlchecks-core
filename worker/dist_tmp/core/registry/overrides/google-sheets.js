"use strict";
/**
 * ✅ GOOGLE SHEETS NODE - Migrated to Registry
 *
 * Google Sheets integration for reading/writing data.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideGoogleSheets = overrideGoogleSheets;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideGoogleSheets(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            // Use legacy executor for now (complex Google Sheets API integration)
            // TODO: Port full Google Sheets logic to registry when time permits
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
