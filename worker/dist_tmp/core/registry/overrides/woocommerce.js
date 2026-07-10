"use strict";
/**
 * ✅ WOOCOMMERCE NODE - Migrated to Registry
 *
 * WooCommerce e-commerce integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideWoocommerce = overrideWoocommerce;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideWoocommerce(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
