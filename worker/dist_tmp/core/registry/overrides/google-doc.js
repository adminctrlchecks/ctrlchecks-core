"use strict";
/**
 * ✅ GOOGLE DOC NODE - Migrated to Registry
 *
 * Google Docs integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideGoogleDoc = overrideGoogleDoc;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideGoogleDoc(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
