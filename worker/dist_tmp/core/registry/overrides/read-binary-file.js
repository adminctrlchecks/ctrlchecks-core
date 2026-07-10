"use strict";
/**
 * ✅ READ BINARY FILE NODE - Migrated to Registry
 *
 * Reads binary files.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideReadBinaryFile = overrideReadBinaryFile;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideReadBinaryFile(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
