"use strict";
/**
 * ✅ XERO NODE - Migrated to Registry
 *
 * Xero Accounting API integration — contacts, invoices, items, payments, accounts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideXero = overrideXero;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideXero(def, schema) {
    return {
        ...def,
        tags: Array.from(new Set([...(def.tags || []), 'xero', 'accounting', 'finance', 'api'])),
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
