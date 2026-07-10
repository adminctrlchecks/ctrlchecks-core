"use strict";
/**
 * Cohere Node — Registry Override
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideCohere = overrideCohere;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideCohere(def, schema) {
    return {
        ...def,
        tags: Array.from(new Set([...(def.tags || []), 'cohere', 'ai', 'llm', 'text-generation', 'command'])),
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
