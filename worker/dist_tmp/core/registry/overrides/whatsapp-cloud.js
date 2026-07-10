"use strict";
/**
 * ✅ WHATSAPP CLOUD NODE - Migrated to Registry
 *
 * WhatsApp Cloud API messaging integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideWhatsappCloud = overrideWhatsappCloud;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideWhatsappCloud(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
