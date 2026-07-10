"use strict";
/**
 * ✅ SENDGRID NODE - Migrated to Registry
 *
 * SendGrid transactional email integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideSendgrid = overrideSendgrid;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideSendgrid(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
