"use strict";
/**
 * ✅ MEMORY NODE - Migrated to Registry
 *
 * Memory storage for AI agents.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideMemory = overrideMemory;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideMemory(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
