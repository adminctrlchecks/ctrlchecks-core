"use strict";
/**
 * ✅ TELEGRAM NODE - Migrated to Registry
 *
 * Telegram messaging integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideTelegram = overrideTelegram;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideTelegram(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            // Use legacy executor for now (complex Telegram API integration)
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
