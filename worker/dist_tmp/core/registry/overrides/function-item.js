"use strict";
/**
 * ✅ FUNCTION ITEM NODE - Migrated to Registry
 *
 * Function item execution (per-item processing).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideFunctionItem = overrideFunctionItem;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideFunctionItem(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
