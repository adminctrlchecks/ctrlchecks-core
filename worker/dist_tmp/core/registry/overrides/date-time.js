"use strict";
/**
 * ✅ DATE TIME NODE - Migrated to Registry
 *
 * Date/time operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideDateTime = overrideDateTime;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideDateTime(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
