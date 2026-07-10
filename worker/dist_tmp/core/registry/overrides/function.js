"use strict";
/**
 * ✅ FUNCTION NODE - Migrated to Registry
 *
 * Function execution.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideFunction = overrideFunction;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideFunction(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
