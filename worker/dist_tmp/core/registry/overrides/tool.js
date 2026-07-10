"use strict";
/**
 * ✅ TOOL NODE - Migrated to Registry
 *
 * Tool definition for AI agents.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideTool = overrideTool;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideTool(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
