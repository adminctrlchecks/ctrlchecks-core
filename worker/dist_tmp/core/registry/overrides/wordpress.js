"use strict";
/**
 * ✅ WORDPRESS NODE - Migrated to Registry
 *
 * WordPress REST API integration — create, read, update, and delete posts via Application Passwords.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideWordPress = overrideWordPress;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideWordPress(def, schema) {
    const requiredTags = ['wordpress', 'cms', 'blog', 'posts', 'api'];
    return {
        ...def,
        tags: Array.from(new Set([...(def.tags ?? []), ...requiredTags])),
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
