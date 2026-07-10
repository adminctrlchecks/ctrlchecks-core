"use strict";
/**
 * ✅ WRITE BINARY FILE NODE - Migrated to Registry
 *
 * Writes binary files.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideWriteBinaryFile = overrideWriteBinaryFile;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideWriteBinaryFile(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
