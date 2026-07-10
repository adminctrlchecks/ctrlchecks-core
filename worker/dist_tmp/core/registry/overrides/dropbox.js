"use strict";
/**
 * ✅ DROPBOX NODE - Migrated to Registry
 *
 * Dropbox storage operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideDropbox = overrideDropbox;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideDropbox(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
