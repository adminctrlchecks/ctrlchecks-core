"use strict";
/**
 * ✅ OUTLOOK NODE - Migrated to Registry
 *
 * Outlook email integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideOutlook = overrideOutlook;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideOutlook(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
