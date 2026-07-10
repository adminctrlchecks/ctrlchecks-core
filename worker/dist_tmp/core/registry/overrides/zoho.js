"use strict";
/**
 * ✅ ZOHO NODE - Migrated to Registry
 *
 * Zoho CRM integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideZoho = overrideZoho;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideZoho(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
