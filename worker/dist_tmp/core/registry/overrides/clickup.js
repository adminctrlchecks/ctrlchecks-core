"use strict";
/**
 * ✅ CLICKUP NODE - Migrated to Registry
 *
 * ClickUp integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideClickup = overrideClickup;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideClickup(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
