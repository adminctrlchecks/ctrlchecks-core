"use strict";
/**
 * ✅ SUPABASE NODE - Migrated to Registry
 *
 * Supabase database operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideSupabase = overrideSupabase;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideSupabase(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
