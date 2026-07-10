"use strict";
/**
 * ✅ EMAIL NODE - Migrated to Registry
 *
 * Generic email (SMTP) integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideEmail = overrideEmail;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideEmail(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            // Use legacy executor for now (complex SMTP email logic)
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
