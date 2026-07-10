"use strict";
/**
 * ✅ PAYPAL NODE - Migrated to Registry
 *
 * PayPal payment integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overridePaypal = overridePaypal;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overridePaypal(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
