"use strict";
/**
 * Qdrant Node — Registry Override
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideQdrant = overrideQdrant;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideQdrant(def, schema) {
    return {
        ...def,
        tags: Array.from(new Set([...(def.tags || []), 'qdrant', 'vector', 'database', 'embeddings', 'ai'])),
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
