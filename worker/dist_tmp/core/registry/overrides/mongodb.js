"use strict";
/**
 * ✅ MONGODB NODE - Migrated to Registry
 *
 * MongoDB database operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideMongodb = overrideMongodb;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideMongodb(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
