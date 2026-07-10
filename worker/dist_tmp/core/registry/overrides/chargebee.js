"use strict";
/**
 * ✅ CHARGEBEE NODE - Migrated to Registry
 *
 * Chargebee subscription billing API — customers, subscriptions, payments.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideChargebee = overrideChargebee;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideChargebee(def, schema) {
    const requiredTags = ['chargebee', 'billing', 'subscription', 'payment', 'api'];
    return {
        ...def,
        tags: Array.from(new Set([...(def.tags || []), ...requiredTags])),
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
