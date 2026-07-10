"use strict";
/**
 * ✅ ORACLE DATABASE NODE - Migrated to Registry
 *
 * Oracle Database operations: select, insert, update, insert_or_update, delete, execute_sql.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideOracleDatabase = overrideOracleDatabase;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideOracleDatabase(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
