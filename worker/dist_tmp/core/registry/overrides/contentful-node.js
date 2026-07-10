"use strict";
/**
 * ✅ CONTENTFUL NODE - Migrated to Registry
 *
 * Contentful Content Management API integration — entries, spaces, content types.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideContentful = overrideContentful;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideContentful(def, schema) {
    return {
        ...def,
        tags: Array.from(new Set([...(def.tags ?? []), 'contentful', 'cms', 'headless', 'entries', 'api'])),
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
