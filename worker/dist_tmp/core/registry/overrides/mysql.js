"use strict";
/**
 * ✅ MYSQL NODE - Migrated to Registry
 *
 * MySQL database operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideMysql = overrideMysql;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideMysql(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
