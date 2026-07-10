"use strict";
/**
 * ✅ MAILGUN NODE - Migrated to Registry
 *
 * Mailgun transactional email integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideMailgun = overrideMailgun;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideMailgun(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
