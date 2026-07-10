"use strict";
/**
 * ✅ CALENDLY NODE - Migrated to Registry
 *
 * Calendly scheduling API integration — events, event types, scheduled meetings, user info.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideCalendly = overrideCalendly;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideCalendly(def, schema) {
    return {
        ...def,
        tags: Array.from(new Set([...(def.tags || []), 'calendly', 'scheduling', 'meetings', 'calendar', 'api'])),
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
