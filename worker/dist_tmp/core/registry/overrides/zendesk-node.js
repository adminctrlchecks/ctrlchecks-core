"use strict";
/**
 * ✅ ZENDESK NODE - Migrated to Registry
 *
 * Zendesk REST API integration — tickets, users, support operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideZendesk = overrideZendesk;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
const requiredTags = ['zendesk', 'support', 'helpdesk', 'tickets', 'crm', 'api'];
function overrideZendesk(def, schema) {
    return {
        ...def,
        tags: Array.from(new Set([...(def.tags || []), ...requiredTags])),
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
