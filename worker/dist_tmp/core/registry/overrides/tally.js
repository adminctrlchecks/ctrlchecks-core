"use strict";
/**
 * ✅ TALLY SOLUTIONS NODE - Migrated to Registry
 *
 * Tally ERP / TallyPrime integration via XML API.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideTally = overrideTally;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideTally(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            // Delegate to legacy executor which handles the case 'tally' branch
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
