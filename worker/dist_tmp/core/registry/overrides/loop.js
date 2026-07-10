"use strict";
/**
 * ✅ LOOP NODE - Migrated to Registry
 *
 * Iterates over array items.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideLoop = overrideLoop;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideLoop(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
