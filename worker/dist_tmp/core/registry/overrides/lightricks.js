"use strict";
/**
 * ✅ LIGHTRICKS NODE - Migrated to Registry
 *
 * Lightricks LTX-2 AI video generation — text-to-video, image-to-video, and more.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideLightricks = overrideLightricks;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideLightricks(def, schema) {
    return {
        ...def,
        tags: Array.from(new Set([...(def.tags || []), 'lightricks', 'ltx', 'video', 'ai', 'generation', 'media'])),
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
