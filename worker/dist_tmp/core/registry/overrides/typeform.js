"use strict";
/**
 * ✅ TYPEFORM NODE - Migrated to Registry
 *
 * Typeform API integration — get responses, create forms, get form definitions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideTypeform = overrideTypeform;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideTypeform(def, schema) {
    return {
        ...def,
        tags: Array.from(new Set([...(def.tags || []), 'typeform', 'forms', 'survey', 'productivity', 'api'])),
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
