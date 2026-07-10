"use strict";
/**
 * ✅ PINECONE NODE - Migrated to Registry
 *
 * Pinecone vector database integration — upsert, query, and delete vectors.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overridePinecone = overridePinecone;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overridePinecone(def, schema) {
    return {
        ...def,
        tags: Array.from(new Set([...(def.tags || []), 'pinecone', 'vector', 'database', 'embeddings', 'ai'])),
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
