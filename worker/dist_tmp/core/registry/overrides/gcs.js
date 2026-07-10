"use strict";
/**
 * ✅ GOOGLE CLOUD STORAGE NODE - Migrated to Registry
 *
 * Google Cloud Storage object storage operations (upload, download, delete, list).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideGCS = overrideGCS;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideGCS(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
